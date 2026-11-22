import { useStore } from '@/data/store';
import { Button, Card, Notice, Progress, Stat } from '@/components/ui';
import { DebtChart, GroupBars } from '@/components/charts';
import { cashOnHand, debtHistory, debtTotals, defaultSimRange, emergencyGoal, familyTotals, financeWarnings, flowMonths, monthFlow, savingsBalance, simulate } from '@/lib/calc/finance';
import { addMonthsYM, monthOf } from '@/lib/date';
import { pct, won } from '@/lib/format';

export default function Overview({ go }: { go: (t: 'ledger' | 'debts' | 'savings' | 'plan') => void }) {
  const { state, today } = useStore();
  const f = state.finance;
  const m = monthOf(today);
  const flow = monthFlow(f, m);
  const debt = debtTotals(f);
  const fam = familyTotals(f);
  const eg = emergencyGoal(f);
  const egBal = eg ? savingsBalance(f, eg.id) : 0;

  const range = { ...defaultSimRange(today), contractEnd: state.profile.contractEnd };
  const sim = simulate(f, range);
  const warnings = financeWarnings(f, sim, state.profile.contractEnd);

  const to = m < '2026-12' ? '2026-12' : m;
  const months = flowMonths(f, addMonthsYM(to, -5), to);
  const flows = months.map((x) => monthFlow(f, x)).map((x) => ({ month: x.month, income: x.income, out: x.expense, debt: x.debt }));

  // Actual balances (past months) joined with the plan (future months).
  const hist = debtHistory(f, flowMonths(f, '2026-11', m < '2026-11' ? '2026-11' : m));
  const chart = [
    ...hist.map((h) => ({ month: h.month, total: h.total, plan: undefined as number | undefined })),
    ...sim.filter((r) => r.month > (hist.at(-1)?.month ?? '')).map((r) => ({ month: r.month, total: undefined as number | undefined, plan: r.totalDebt })),
  ];
  if (hist.length && chart[hist.length]) chart[hist.length - 1].plan = hist.at(-1)!.total;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <Stat label="이번 달 수입" value={won(flow.income)} sub="기록 기준" />
        <Stat label="이번 달 지출" value={won(flow.expense)} sub={`고정 ${won(flow.fixed)} · 변동 ${won(flow.variable)}`} />
        <Stat label="이번 달 잔액" value={won(flow.net)} sub={`상환 ${won(flow.debt)} · 저축 ${won(flow.saved)} 차감`} />
        <Stat label="전체 부채" value={won(debt.total)} sub={`상환 ${pct(debt.ratio)}`}>
          <Progress value={debt.ratio} label="전체 부채 상환률" />
        </Stat>
        <Stat label="가족 부채" value={won(fam.balance)} sub={`목표 ${state.finance.plan.familyDeadline.replace('-', '.')} · ${pct(fam.ratio)} 상환`}>
          <Progress value={fam.ratio} label="가족 부채 상환률" />
        </Stat>
        <Stat label="비상금" value={won(egBal)} sub={eg ? `목표 ${won(eg.target)}` : '목표 없음'}>
          <Progress value={eg && eg.target ? egBal / eg.target : 0} label="비상금 진행률" />
        </Stat>
      </div>

      <Card title="현금 흐름 점검" subtitle="계획값과 현재 잔액으로 계산한 주의 사항" action={<Button className="min-h-[32px] text-xs" onClick={() => go('plan')}>계획 보기</Button>}>
        <div className="divide-y divide-line">
          {warnings.map((w, i) => (
            <Notice key={i} level={w.level}>
              {w.text}
            </Notice>
          ))}
        </div>
        <p className="num mt-2 text-xs text-muted">기록상 보유 현금: {won(cashOnHand(f))} (시작 현금 + 수입 − 지출 − 상환 − 저축)</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="월별 현금 흐름" subtitle="최근 6개월 기록">
          <GroupBars
            data={flows}
            xKey="month"
            xFmt={(v) => `${Number(String(v).slice(5))}월`}
            height={240}
            series={[
              { key: 'income', name: '수입', color: 'ink' },
              { key: 'out', name: '지출', color: 'accent' },
              { key: 'debt', name: '상환', color: 'soft' },
            ]}
          />
        </Card>
        <Card title="부채 감소" subtitle="실선 = 기록한 실제 잔액, 점선 = 현재 계획대로 갔을 때">
          <DebtChart data={chart} height={240} plan />
        </Card>
      </div>
    </div>
  );
}
