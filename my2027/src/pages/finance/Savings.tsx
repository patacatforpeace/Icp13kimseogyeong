import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Empty, Field, Input, Modal, Progress, Segmented, Select, useConfirm, useToast } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { GroupBars } from '@/components/charts';
import { savingsBalance } from '@/lib/calc/finance';
import { addMonthsYM, fmtDate, isValidISO, monthOf, monthsBetween } from '@/lib/date';
import { pct, sum, uid, won } from '@/lib/format';
import type { SavingsGoal, SavingsTxn } from '@/data/types';

export default function Savings() {
  const { state, update, today } = useStore();
  const f = state.finance;
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [txn, setTxn] = useState<SavingsTxn | null>(null);
  const { ask, dialog } = useConfirm();
  const cur = monthOf(today);
  const months = monthsBetween(addMonthsYM(cur, -5), cur);
  const monthly = months.map((m) => ({ month: m, saved: sum(f.savingsTxns.filter((t) => monthOf(t.date) === m).map((t) => t.amount)) }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => setGoal({ id: uid(), name: '', kind: 'saving', target: 0 })}>
          <Plus size={15} /> 저축 목표 추가
        </Button>
        <Button variant="primary" disabled={!f.savingsGoals.length} onClick={() => setTxn({ id: uid(), goalId: f.savingsGoals[0].id, date: today, amount: 0, memo: '' })}>
          <Plus size={15} /> 입금·출금 기록
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {f.savingsGoals.map((g) => {
          const bal = savingsBalance(f, g.id);
          return (
            <div key={g.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">{g.kind === 'emergency' ? '비상금' : '저축'}</p>
                  <p className="font-semibold">{g.name}</p>
                </div>
                <div className="flex">
                  <button className="btn-icon" aria-label={`${g.name} 수정`} onClick={() => setGoal(g)}>
                    <Pencil size={15} />
                  </button>
                  <button
                    className="btn-icon"
                    aria-label={`${g.name} 삭제`}
                    onClick={() =>
                      ask('저축 목표 삭제', `'${g.name}'과 입출금 기록을 삭제할까요?`, () =>
                        update((s) => {
                          s.finance.savingsGoals = s.finance.savingsGoals.filter((x) => x.id !== g.id);
                          s.finance.savingsTxns = s.finance.savingsTxns.filter((x) => x.goalId !== g.id);
                        }),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="num mt-3 text-2xl font-semibold">{won(bal)}</p>
              <p className="num text-xs text-muted">
                목표 {won(g.target)} · {g.target ? pct(bal / g.target) : '—'}
              </p>
              <div className="mt-3">
                <Progress value={g.target ? bal / g.target : 0} label={`${g.name} 진행률`} />
              </div>
              <Button className="mt-4 w-full" onClick={() => setTxn({ id: uid(), goalId: g.id, date: today, amount: 0, memo: '' })}>
                입금·출금
              </Button>
            </div>
          );
        })}
        {f.savingsGoals.length === 0 && <Empty title="저축 목표가 없어요" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="월별 저축액" subtitle="입금 − 출금, 최근 6개월">
          <GroupBars data={monthly} xKey="month" xFmt={(v) => `${Number(String(v).slice(5))}월`} height={220} series={[{ key: 'saved', name: '순저축', color: 'ink' }]} />
        </Card>
        <Card title="입출금 기록" bodyClass="overflow-x-auto">
          {f.savingsTxns.length === 0 ? (
            <Empty title="아직 기록이 없어요" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>목표</th>
                  <th className="text-right">금액</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...f.savingsTxns]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((t) => (
                    <tr key={t.id}>
                      <td className="num">{fmtDate(t.date)}</td>
                      <td>
                        {f.savingsGoals.find((g) => g.id === t.goalId)?.name}
                        {t.memo && <span className="ml-1 text-xs text-muted">{t.memo}</span>}
                      </td>
                      <td className="num text-right font-medium">
                        {t.amount > 0 ? '+' : '−'}
                        {won(Math.abs(t.amount))}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn-icon" aria-label="기록 수정" onClick={() => setTxn(t)}>
                          <Pencil size={15} />
                        </button>
                        <button className="btn-icon" aria-label="기록 삭제" onClick={() => ask('기록 삭제', `${fmtDate(t.date)} ${won(t.amount)} 기록을 삭제할까요?`, () => update((s) => void (s.finance.savingsTxns = s.finance.savingsTxns.filter((x) => x.id !== t.id))))}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {goal && <GoalModal goal={goal} onClose={() => setGoal(null)} />}
      {txn && <TxnModal txn={txn} onClose={() => setTxn(null)} />}
      {dialog}
    </div>
  );
}

function GoalModal({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const { update } = useStore();
  const [g, setG] = useState(goal);
  const [err, setErr] = useState('');
  const save = () => {
    if (!g.name.trim()) return setErr('이름을 입력하세요');
    update((s) => {
      const i = s.finance.savingsGoals.findIndex((x) => x.id === g.id);
      if (i >= 0) s.finance.savingsGoals[i] = g;
      else s.finance.savingsGoals.push(g);
    });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="저축 목표" footer={<><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={save}>저장</Button></>}>
      <div className="grid gap-4">
        <Field label="이름" error={err}>{(id) => <Input id={id} value={g.name} maxLength={30} onChange={(e) => setG({ ...g, name: e.target.value })} />}</Field>
        <Field label="종류">
          {(id) => (
            <Select id={id} value={g.kind} onChange={(e) => setG({ ...g, kind: e.target.value as SavingsGoal['kind'] })}>
              <option value="emergency">비상금</option>
              <option value="saving">저축</option>
            </Select>
          )}
        </Field>
        <Field label="목표 금액">{(id) => <MoneyInput id={id} value={g.target} onChange={(v) => setG({ ...g, target: v ?? 0 })} />}</Field>
      </div>
    </Modal>
  );
}

function TxnModal({ txn, onClose }: { txn: SavingsTxn; onClose: () => void }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [t, setT] = useState(txn);
  const [dir, setDir] = useState<'in' | 'out'>(txn.amount < 0 ? 'out' : 'in');
  const [err, setErr] = useState<Record<string, string>>({});
  const amt = Math.abs(t.amount);
  const save = () => {
    const e: Record<string, string> = {};
    if (!isValidISO(t.date)) e.date = '날짜를 확인하세요';
    if (!(amt > 0)) e.amount = '금액을 입력하세요';
    const bal = savingsBalance({ ...state.finance, savingsTxns: state.finance.savingsTxns.filter((x) => x.id !== t.id) }, t.goalId);
    if (dir === 'out' && amt > bal) e.amount = `잔액(${won(bal)})보다 많이 출금할 수 없어요`;
    setErr(e);
    if (Object.keys(e).length) return;
    const clean = { ...t, amount: dir === 'in' ? amt : -amt };
    update((s) => {
      const i = s.finance.savingsTxns.findIndex((x) => x.id === clean.id);
      if (i >= 0) s.finance.savingsTxns[i] = clean;
      else s.finance.savingsTxns.push(clean);
    });
    toast('저축 기록을 저장했어요');
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="입금·출금 기록" footer={<><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={save}>저장</Button></>}>
      <div className="grid gap-4">
        <Segmented label="입출금" value={dir} onChange={setDir} options={[{ value: 'in', label: '입금' }, { value: 'out', label: '출금' }]} />
        <Field label="저축 목표">
          {(id) => (
            <Select id={id} value={t.goalId} onChange={(e) => setT({ ...t, goalId: e.target.value })}>
              {state.finance.savingsGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="날짜" error={err.date}>{(id) => <Input id={id} type="date" value={t.date} onChange={(e) => setT({ ...t, date: e.target.value })} />}</Field>
          <Field label="금액" error={err.amount}>{(id) => <MoneyInput id={id} value={amt || null} onChange={(v) => setT({ ...t, amount: v ?? 0 })} />}</Field>
        </div>
        <Field label="메모">{(id) => <Input id={id} value={t.memo} maxLength={60} onChange={(e) => setT({ ...t, memo: e.target.value })} />}</Field>
      </div>
    </Modal>
  );
}
