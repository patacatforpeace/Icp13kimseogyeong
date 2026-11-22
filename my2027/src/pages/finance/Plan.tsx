import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Field, Input, Notice, cx } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { defaultSimRange, financeWarnings, planSummary, simulate } from '@/lib/calc/finance';
import { fmtMonth, monthOf } from '@/lib/date';
import { uid, won } from '@/lib/format';
import type { FinancePlan } from '@/data/types';

export default function Plan() {
  const { state, update, today } = useStore();
  const f = state.finance;
  const p = planSummary(f);
  const range = { ...defaultSimRange(today), contractEnd: state.profile.contractEnd };
  const rows = simulate(f, range);
  const warnings = financeWarnings(f, rows, state.profile.contractEnd);
  const setPlan = (patch: Partial<FinancePlan>) => update((s) => void Object.assign(s.finance.plan, patch));
  const endM = monthOf(state.profile.contractEnd);

  const steps: [string, number, boolean?][] = [
    ['월 실수령 수입', p.income],
    ['생활비', -p.living],
    ['개인회생 변제', -p.rehab],
    ...(p.other ? ([['기타 부채 납부', -p.other]] as [string, number][]) : []),
    ['고정 지출 후 남는 돈', p.afterFixed, true],
    ['가족 부채 상환', -p.family],
    ...(p.savings ? ([['저축', -p.savings]] as [string, number][]) : []),
    ['최종 여유 자금', p.leftover, true],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="월 계획" subtitle="값을 바꾸면 아래 시뮬레이션이 바로 다시 계산됩니다">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="월 실수령 수입">{(id) => <MoneyInput id={id} value={f.plan.monthlyNetIncome} onChange={(v) => setPlan({ monthlyNetIncome: v ?? 0 })} />}</Field>
            <Field label="가족 부채 월 상환 목표">{(id) => <MoneyInput id={id} value={f.plan.familyMonthlyTarget} onChange={(v) => setPlan({ familyMonthlyTarget: v ?? 0 })} />}</Field>
            <Field label="가족 부채 상환 목표 월">{(id) => <Input id={id} type="month" value={f.plan.familyDeadline} onChange={(e) => e.target.value && setPlan({ familyDeadline: e.target.value })} />}</Field>
            <Field label="월 저축 목표">{(id) => <MoneyInput id={id} value={f.plan.monthlySavingsTarget} onChange={(v) => setPlan({ monthlySavingsTarget: v ?? 0 })} />}</Field>
            <Field label="계약 종료 후 월 수입" hint="확정된 금액만 입력하세요. 기본 0원">{(id) => <MoneyInput id={id} value={f.plan.postContractIncome} onChange={(v) => setPlan({ postContractIncome: v ?? 0 })} />}</Field>
            <Field label="기록 시작 시 보유 현금">{(id) => <MoneyInput id={id} value={f.plan.openingCash} onChange={(v) => setPlan({ openingCash: v ?? 0 })} />}</Field>
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold">생활비 예산</h3>
          <ul className="space-y-2">
            {f.plan.livingBudget.map((b) => (
              <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,150px)_36px] items-center gap-2">
                <Input aria-label="항목 이름" value={b.name} maxLength={30} onChange={(e) => update((s) => void (s.finance.plan.livingBudget.find((x) => x.id === b.id)!.name = e.target.value))} />
                <MoneyInput aria-label={`${b.name} 금액`} value={b.amount} onChange={(v) => update((s) => void (s.finance.plan.livingBudget.find((x) => x.id === b.id)!.amount = v ?? 0))} />
                <button className="btn-icon" aria-label={`${b.name} 삭제`} onClick={() => update((s) => void (s.finance.plan.livingBudget = s.finance.plan.livingBudget.filter((x) => x.id !== b.id)))}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between">
            <Button className="min-h-[34px] text-xs" onClick={() => update((s) => void s.finance.plan.livingBudget.push({ id: uid(), name: '새 항목', amount: 0 }))}>
              <Plus size={14} /> 항목 추가
            </Button>
            <p className="num text-sm">
              합계 <span className="font-semibold">{won(p.living)}</span>
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="한 달 돈의 흐름" subtitle="계획값 기준">
            <ul>
              {steps.map(([k, v, total]) => (
                <li key={k} className={cx('flex justify-between py-1.5 text-sm', total && 'border-t border-line pt-2 font-semibold')}>
                  <span className={total ? '' : 'text-muted'}>{k}</span>
                  <span className={cx('num', total && v < 0 && 'text-danger', total && v >= 0 && v < 300_000 && 'text-warning')}>
                    {v < 0 && !total ? '−' : ''}
                    {won(Math.abs(v) * (total && v < 0 ? -1 : 1))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="경고와 참고">
            <div className="divide-y divide-line">
              {warnings.map((w, i) => (
                <Notice key={i} level={w.level}>
                  {w.text}
                </Notice>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card title="월별 시뮬레이션" subtitle={`${fmtMonth(range.startMonth)} – ${fmtMonth(range.endMonth)} · 현재 잔액에서 출발 · 계약 종료 월(${fmtMonth(endM)})까지 월급 포함, 이후는 '계약 종료 후 월 수입'만 반영`} bodyClass="overflow-x-auto">
        <table className="tbl min-w-[880px]">
          <thead>
            <tr>
              <th>월</th>
              <th className="text-right">수입</th>
              <th className="text-right">생활비</th>
              <th className="text-right">개인회생</th>
              <th className="text-right">가족 상환</th>
              <th className="text-right">기타 상환</th>
              <th className="text-right">저축</th>
              <th className="text-right">누적 현금</th>
              <th className="text-right">가족 부채 잔액</th>
              <th className="text-right">전체 부채</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className={cx(r.month === endM && 'bg-subtle', r.month === f.plan.familyDeadline && 'outline outline-1 -outline-offset-1 outline-line')}>
                <td className="num whitespace-nowrap">
                  {fmtMonth(r.month)}
                  {r.month === endM && <span className="ml-1 text-[11px] text-muted">계약 종료</span>}
                  {r.month === f.plan.familyDeadline && <span className="ml-1 text-[11px] text-muted">상환 목표</span>}
                </td>
                <td className="num text-right">{won(r.income)}</td>
                <td className="num text-right text-muted">{won(r.living)}</td>
                <td className="num text-right text-muted">{won(r.rehab)}</td>
                <td className="num text-right text-muted">{won(r.family)}</td>
                <td className="num text-right text-muted">{won(r.other)}</td>
                <td className="num text-right text-muted">{won(r.savings)}</td>
                <td className={cx('num text-right font-medium', r.cash < 0 && 'text-danger')}>{won(r.cash)}</td>
                <td className={cx('num text-right', r.familyBalance === 0 && 'text-success')}>{won(r.familyBalance)}</td>
                <td className="num text-right">{won(r.totalDebt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">프리랜서 수입·실업급여 등 확정되지 않은 수입은 포함하지 않습니다. 보증금 반환 채무는 수입이나 자산으로 계산하지 않고 가족 부채 잔액에만 포함합니다.</p>
      </Card>
    </div>
  );
}
