import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Badge, Button, Card, Empty, Field, Input, Modal, Progress, Select, Textarea, useConfirm, useToast } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { DEBT_GROUP_LABEL, debtBalance, debtTotals, paidOn } from '@/lib/calc/finance';
import { fmtDate, isValidISO } from '@/lib/date';
import { pct, uid, won } from '@/lib/format';
import type { Debt, DebtGroup, DebtPayment } from '@/data/types';

export default function Debts() {
  const { state, update, today } = useStore();
  const f = state.finance;
  const [edit, setEdit] = useState<Debt | null>(null);
  const [pay, setPay] = useState<DebtPayment | null>(null);
  const { ask, dialog } = useConfirm();
  const t = debtTotals(f);
  const groups: DebtGroup[] = ['family', 'rehab', 'other'];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted">전체 남은 부채</p>
          <p className="num mt-1 text-2xl font-semibold">{won(t.total)}</p>
          <p className="num mt-1 text-xs text-muted">시작 {won(t.opening)} · 상환 {pct(t.ratio)}</p>
        </div>
        {groups.map((g) => (
          <div key={g} className="card p-4">
            <p className="text-xs text-muted">{DEBT_GROUP_LABEL[g]}</p>
            <p className="num mt-1 text-xl font-semibold">{won(t[g])}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          onClick={() =>
            setEdit({ id: uid(), name: '', creditor: '', group: 'family', principal: 0, openingBalance: 0, monthlyPayment: 0, note: '' })
          }
        >
          <Plus size={15} /> 부채 항목 추가
        </Button>
        <Button variant="primary" disabled={!f.debts.length} onClick={() => setPay({ id: uid(), debtId: f.debts[0].id, date: today, amount: 0, memo: '' })}>
          <Plus size={15} /> 상환 기록
        </Button>
      </div>

      {groups.map((g) => {
        const ds = f.debts.filter((d) => d.group === g);
        if (!ds.length) return null;
        return (
          <Card key={g} title={DEBT_GROUP_LABEL[g]} subtitle={g === 'family' ? `월 상환 목표 ${won(f.plan.familyMonthlyTarget)} · ${f.plan.familyDeadline.replace('-', '.')}까지` : undefined}>
            <ul className="divide-y divide-line">
              {ds.map((d) => {
                const bal = debtBalance(d, f.payments);
                const paid = paidOn(d, f.payments);
                const ratio = d.openingBalance ? paid / d.openingBalance : 0;
                const count = f.payments.filter((p) => p.debtId === d.id).length;
                return (
                  <li key={d.id} className="py-4 first:pt-1">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{d.name}</p>
                          {bal === 0 && <Badge tone="success">상환 완료</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          채권자 {d.creditor || '—'} · 월 납부 {d.monthlyPayment ? won(d.monthlyPayment) : '미입력'}
                          {d.dueDay ? ` · 매월 ${d.dueDay}일` : ''}
                          {d.installments ? ` · 잔여 ${Math.max(0, d.installments - count)}회` : ''}
                        </p>
                        {(d.plannedMonth || d.fundingSource || /보증금/.test(d.name)) && (
                          <p className="mt-0.5 text-xs text-muted">
                            반환 시점 {d.plannedMonth ? d.plannedMonth.replace('-', '.') : '미정'} · 재원 {d.fundingSource || '미정'}
                          </p>
                        )}
                        {d.note && <p className="mt-1 text-xs text-muted">{d.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="num text-lg font-semibold">{won(bal)}</p>
                        <p className="num text-xs text-muted">
                          {won(paid)} 상환 / 시작 {won(d.openingBalance)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1">
                        <Progress value={ratio} tone={bal === 0 ? 'success' : 'ink'} label={`${d.name} 상환률`} />
                      </div>
                      <span className="num w-10 text-right text-xs">{pct(ratio)}</span>
                      <Button className="min-h-[32px] px-2.5 text-xs" disabled={bal === 0} onClick={() => setPay({ id: uid(), debtId: d.id, date: today, amount: Math.min(bal, d.monthlyPayment || 0), memo: '' })}>
                        상환
                      </Button>
                      <button className="btn-icon" aria-label={`${d.name} 수정`} onClick={() => setEdit(d)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        aria-label={`${d.name} 삭제`}
                        onClick={() =>
                          ask('부채 항목 삭제', `'${d.name}' 항목과 상환 기록 ${count}건을 삭제할까요?`, () =>
                            update((s) => {
                              s.finance.debts = s.finance.debts.filter((x) => x.id !== d.id);
                              s.finance.payments = s.finance.payments.filter((x) => x.debtId !== d.id);
                            }),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <Card title="상환 기록" bodyClass="overflow-x-auto">
        {f.payments.length === 0 ? (
          <Empty title="아직 상환 기록이 없어요">상환할 때마다 기록하면 잔액과 그래프가 자동으로 바뀝니다.</Empty>
        ) : (
          <table className="tbl min-w-[480px]">
            <thead>
              <tr>
                <th>날짜</th>
                <th>항목</th>
                <th>메모</th>
                <th className="text-right">금액</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...f.payments]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((p) => (
                  <tr key={p.id}>
                    <td className="num">{fmtDate(p.date)}</td>
                    <td>{f.debts.find((d) => d.id === p.debtId)?.name ?? '삭제된 항목'}</td>
                    <td className="text-muted">{p.memo}</td>
                    <td className="num text-right font-medium">{won(p.amount)}</td>
                    <td className="whitespace-nowrap text-right">
                      <button className="btn-icon" aria-label="상환 기록 수정" onClick={() => setPay(p)}>
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon" aria-label="상환 기록 삭제" onClick={() => ask('상환 기록 삭제', `${fmtDate(p.date)} ${won(p.amount)} 상환 기록을 삭제할까요? 잔액이 다시 늘어납니다.`, () => update((s) => void (s.finance.payments = s.finance.payments.filter((x) => x.id !== p.id))))}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Card>

      {edit && <DebtModal debt={edit} onClose={() => setEdit(null)} />}
      {pay && <PaymentModal payment={pay} onClose={() => setPay(null)} />}
      {dialog}
    </div>
  );
}

function DebtModal({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [d, setD] = useState(debt);
  const [err, setErr] = useState<Record<string, string>>({});
  const isNew = !state.finance.debts.some((x) => x.id === debt.id);
  const paid = paidOn(debt, state.finance.payments);
  const set = (p: Partial<Debt>) => setD({ ...d, ...p });

  const save = () => {
    const e: Record<string, string> = {};
    if (!d.name.trim()) e.name = '이름을 입력하세요';
    if (!(d.openingBalance >= 0)) e.opening = '금액을 확인하세요';
    if (d.openingBalance < paid) e.opening = `이미 ${won(paid)}을 상환했습니다. 그보다 작게 설정할 수 없어요.`;
    if (d.dueDay !== undefined && (d.dueDay < 1 || d.dueDay > 31)) e.dueDay = '1–31 사이로 입력하세요';
    if (d.plannedMonth && !/^\d{4}-\d{2}$/.test(d.plannedMonth)) e.planned = 'YYYY-MM 형식';
    setErr(e);
    if (Object.keys(e).length) return;
    update((s) => {
      const i = s.finance.debts.findIndex((x) => x.id === d.id);
      const clean = { ...d, name: d.name.trim(), principal: d.principal || d.openingBalance };
      if (i >= 0) s.finance.debts[i] = clean;
      else s.finance.debts.push(clean);
    });
    toast('부채 항목을 저장했어요');
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={isNew ? '부채 항목 추가' : '부채 항목 수정'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={save}>
            저장
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="이름" error={err.name}>{(id) => <Input id={id} value={d.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} />}</Field>
        <Field label="채권자">{(id) => <Input id={id} value={d.creditor} maxLength={40} onChange={(e) => set({ creditor: e.target.value })} />}</Field>
        <Field label="구분">
          {(id) => (
            <Select id={id} value={d.group} onChange={(e) => set({ group: e.target.value as DebtGroup })}>
              {Object.entries(DEBT_GROUP_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="최초 원금">{(id) => <MoneyInput id={id} value={d.principal || null} onChange={(v) => set({ principal: v ?? 0 })} />}</Field>
        <Field label="기록 시작 시점 잔액" error={err.opening} hint="현재 잔액 = 이 금액 − 기록한 상환액">
          {(id) => <MoneyInput id={id} value={d.openingBalance} onChange={(v) => set({ openingBalance: v ?? 0 })} />}
        </Field>
        <Field label="월 납부액" hint={d.group === 'family' ? '가족 부채는 계획의 월 상환 목표로 시뮬레이션합니다' : undefined}>
          {(id) => <MoneyInput id={id} value={d.monthlyPayment} onChange={(v) => set({ monthlyPayment: v ?? 0 })} />}
        </Field>
        <Field label="납부일 (매월, 선택)" error={err.dueDay}>{(id) => <Input id={id} type="number" min={1} max={31} value={d.dueDay ?? ''} onChange={(e) => set({ dueDay: e.target.value ? Number(e.target.value) : undefined })} />}</Field>
        <Field label="잔여 회차 (선택)">{(id) => <Input id={id} type="number" min={0} value={d.installments ?? ''} onChange={(e) => set({ installments: e.target.value ? Number(e.target.value) : undefined })} />}</Field>
        <Field label="상환·반환 예정 월 (선택)" error={err.planned}>{(id) => <Input id={id} type="month" value={d.plannedMonth ?? ''} onChange={(e) => set({ plannedMonth: e.target.value })} />}</Field>
        <Field label="상환 재원 (선택)" hint="예: 월급, 보증금 반환금">{(id) => <Input id={id} value={d.fundingSource ?? ''} maxLength={60} onChange={(e) => set({ fundingSource: e.target.value })} />}</Field>
        <Field label="메모" className="sm:col-span-2">{(id) => <Textarea id={id} value={d.note} onChange={(e) => set({ note: e.target.value })} />}</Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function PaymentModal({ payment, onClose }: { payment: DebtPayment; onClose: () => void }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [p, setP] = useState(payment);
  const [err, setErr] = useState<Record<string, string>>({});
  const isNew = !state.finance.payments.some((x) => x.id === payment.id);
  const debt = state.finance.debts.find((d) => d.id === p.debtId);
  const others = state.finance.payments.filter((x) => x.id !== p.id);
  const maxAmt = debt ? debtBalance(debt, others) : 0;

  const save = () => {
    const e: Record<string, string> = {};
    if (!isValidISO(p.date)) e.date = '날짜를 확인하세요';
    if (!(p.amount > 0)) e.amount = '0보다 큰 금액을 입력하세요';
    else if (p.amount > maxAmt) e.amount = `남은 잔액(${won(maxAmt)})보다 많습니다`;
    setErr(e);
    if (Object.keys(e).length) return;
    update((s) => {
      const i = s.finance.payments.findIndex((x) => x.id === p.id);
      if (i >= 0) s.finance.payments[i] = p;
      else s.finance.payments.push(p);
    });
    toast('상환을 기록했어요');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? '상환 기록' : '상환 기록 수정'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={save}>
            저장
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="부채 항목">
          {(id) => (
            <Select id={id} value={p.debtId} onChange={(e) => setP({ ...p, debtId: e.target.value })}>
              {state.finance.debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (잔액 {won(debtBalance(d, others))})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="날짜" error={err.date}>{(id) => <Input id={id} type="date" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} />}</Field>
          <Field label="금액" error={err.amount}>{(id) => <MoneyInput id={id} value={p.amount || null} onChange={(v) => setP({ ...p, amount: v ?? 0 })} />}</Field>
        </div>
        <Field label="메모">{(id) => <Input id={id} value={p.memo} maxLength={80} onChange={(e) => setP({ ...p, memo: e.target.value })} />}</Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
