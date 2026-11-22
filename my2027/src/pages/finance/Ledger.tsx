import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Empty, Field, Input, Modal, Progress, Select, cx, useConfirm, useToast } from '@/components/ui';
import { MoneyInput } from '@/components/MoneyInput';
import { monthFlow } from '@/lib/calc/finance';
import { addMonthsYM, fmtDate, fmtMonth, isValidISO, monthOf } from '@/lib/date';
import { sum, uid, won } from '@/lib/format';
import type { Expense, ExpenseKind, Income, IncomeCategory } from '@/data/types';

const INCOME_CAT: Record<IncomeCategory, string> = { salary: '월급', freelance: '프리랜서', other: '기타 수입' };

type Draft = { type: 'income'; v: Income } | { type: 'expense'; v: Expense };

export default function Ledger() {
  const { state, update, today } = useStore();
  const f = state.finance;
  const [month, setMonth] = useState(monthOf(today));
  const [draft, setDraft] = useState<Draft | null>(null);
  const { ask, dialog } = useConfirm();
  const flow = monthFlow(f, month);
  const inM = (d: string) => monthOf(d) === month;
  const incomes = f.incomes.filter((x) => inM(x.date)).sort((a, b) => b.date.localeCompare(a.date));
  const expenses = f.expenses.filter((x) => inM(x.date)).sort((a, b) => b.date.localeCompare(a.date));
  const defDate = month === monthOf(today) ? today : `${month}-01`;
  const categories = [...f.plan.livingBudget.map((b) => b.name), '기타'];

  const byCat = categories.map((c) => ({
    name: c,
    budget: f.plan.livingBudget.find((b) => b.name === c)?.amount ?? 0,
    spent: sum(expenses.filter((e) => e.category === c).map((e) => e.amount)),
  }));
  const uncategorised = sum(expenses.filter((e) => !categories.includes(e.category)).map((e) => e.amount));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button className="btn-icon" onClick={() => setMonth(addMonthsYM(month, -1))} aria-label="이전 달">
            <ChevronLeft size={18} />
          </button>
          <h2 className="num text-lg font-semibold">{fmtMonth(month)}</h2>
          <button className="btn-icon" onClick={() => setMonth(addMonthsYM(month, 1))} aria-label="다음 달">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setDraft({ type: 'income', v: { id: uid(), date: defDate, amount: 0, category: 'salary', memo: '' } })}>+ 수입</Button>
          <Button variant="primary" onClick={() => setDraft({ type: 'expense', v: { id: uid(), date: defDate, amount: 0, kind: 'variable', category: '식비', memo: '' } })}>
            + 지출
          </Button>
        </div>
      </div>

      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        {[
          ['수입', flow.income],
          ['지출', flow.expense],
          ['부채 상환', flow.debt],
          ['남은 돈', flow.net],
        ].map(([k, v]) => (
          <div key={k as string} className="p-4">
            <p className="text-xs text-muted">{k}</p>
            <p className={cx('num mt-1 text-xl font-semibold', k === '남은 돈' && (v as number) < 0 && 'text-danger')}>{won(v as number)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card title="예산 대비 지출" subtitle="계획의 생활비 항목 기준">
          <ul className="space-y-3">
            {byCat.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="num text-muted">
                    <span className={cx('font-medium', c.budget && c.spent > c.budget ? 'text-warning' : 'text-ink')}>{won(c.spent)}</span>
                    {c.budget ? ` / ${won(c.budget)}` : ''}
                  </span>
                </div>
                {c.budget > 0 && (
                  <div className="mt-1">
                    <Progress value={c.spent / c.budget} tone={c.spent > c.budget ? 'warning' : 'ink'} label={`${c.name} 예산 사용률`} />
                  </div>
                )}
              </li>
            ))}
            {uncategorised > 0 && <li className="text-xs text-muted">그 외 카테고리 {won(uncategorised)}</li>}
          </ul>
        </Card>

        <Card title="기록" bodyClass="overflow-x-auto">
          {incomes.length + expenses.length === 0 ? (
            <Empty title={`${fmtMonth(month)} 기록이 없어요`}>월급이 들어오면 수입으로, 쓴 돈은 지출로 기록하세요. 부채 상환은 '부채' 탭에서 기록합니다.</Empty>
          ) : (
            <table className="tbl min-w-[520px]">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>구분</th>
                  <th>내용</th>
                  <th className="text-right">금액</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...incomes.map((v) => ({ type: 'income' as const, v })), ...expenses.map((v) => ({ type: 'expense' as const, v }))]
                  .sort((a, b) => b.v.date.localeCompare(a.v.date))
                  .map((r) => (
                    <tr key={r.v.id}>
                      <td className="num">{fmtDate(r.v.date)}</td>
                      <td>
                        <span className="chip">{r.type === 'income' ? INCOME_CAT[r.v.category as IncomeCategory] : `${(r.v as Expense).kind === 'fixed' ? '고정' : '변동'} · ${r.v.category}`}</span>
                      </td>
                      <td className="text-muted">{r.v.memo}</td>
                      <td className={cx('num text-right font-medium', r.type === 'income' && 'text-success')}>
                        {r.type === 'income' ? '+' : '−'}
                        {won(r.v.amount)}
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <button className="btn-icon" aria-label="수정" onClick={() => setDraft(r as Draft)}>
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          aria-label="삭제"
                          onClick={() =>
                            ask('기록 삭제', `${fmtDate(r.v.date)} ${won(r.v.amount)} 기록을 삭제할까요?`, () =>
                              update((s) => {
                                if (r.type === 'income') s.finance.incomes = s.finance.incomes.filter((x) => x.id !== r.v.id);
                                else s.finance.expenses = s.finance.expenses.filter((x) => x.id !== r.v.id);
                              }),
                            )
                          }
                        >
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
      {draft && <EntryModal draft={draft} categories={categories} onClose={() => setDraft(null)} />}
      {dialog}
    </div>
  );
}

function EntryModal({ draft, categories, onClose }: { draft: Draft; categories: string[]; onClose: () => void }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [d, setD] = useState<Draft>(draft);
  const [err, setErr] = useState<Record<string, string>>({});
  const isNew = d.type === 'income' ? !state.finance.incomes.some((x) => x.id === d.v.id) : !state.finance.expenses.some((x) => x.id === d.v.id);
  const patch = (p: Partial<Omit<Income, "category"> & Omit<Expense, "category"> & { category: string }>) => setD({ ...d, v: { ...d.v, ...p } } as Draft);

  const save = () => {
    const e: Record<string, string> = {};
    if (!isValidISO(d.v.date)) e.date = '날짜를 확인하세요';
    if (!(d.v.amount > 0)) e.amount = '0보다 큰 금액을 입력하세요';
    if (d.type === 'expense' && !d.v.category.trim()) e.category = '카테고리를 입력하세요';
    setErr(e);
    if (Object.keys(e).length) return;
    update((s) => {
      const list = (d.type === 'income' ? s.finance.incomes : s.finance.expenses) as (Income | Expense)[];
      const i = list.findIndex((x) => x.id === d.v.id);
      if (i >= 0) list[i] = d.v;
      else list.push(d.v);
    });
    toast(d.type === 'income' ? '수입을 저장했어요' : '지출을 저장했어요');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${d.type === 'income' ? '수입' : '지출'} ${isNew ? '추가' : '수정'}`}
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
        <Field label="날짜" error={err.date}>{(id) => <Input id={id} type="date" value={d.v.date} onChange={(e) => patch({ date: e.target.value })} />}</Field>
        <Field label="금액" error={err.amount}>{(id) => <MoneyInput id={id} value={d.v.amount || null} onChange={(v) => patch({ amount: v ?? 0 })} />}</Field>
        {d.type === 'income' ? (
          <Field label="카테고리" className="sm:col-span-2">
            {(id) => (
              <Select id={id} value={d.v.category} onChange={(e) => patch({ category: e.target.value as IncomeCategory })}>
                {Object.entries(INCOME_CAT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <>
            <Field label="구분">
              {(id) => (
                <Select id={id} value={d.v.kind} onChange={(e) => patch({ kind: e.target.value as ExpenseKind })}>
                  <option value="fixed">고정 지출</option>
                  <option value="variable">변동 지출</option>
                </Select>
              )}
            </Field>
            <Field label="카테고리" error={err.category}>
              {(id) => (
                <>
                  <Input id={id} list="exp-cats" value={d.v.category} maxLength={30} onChange={(e) => patch({ category: e.target.value })} />
                  <datalist id="exp-cats">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          </>
        )}
        <Field label="메모" className="sm:col-span-2">{(id) => <Input id={id} value={d.v.memo} maxLength={80} onChange={(e) => patch({ memo: e.target.value })} />}</Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
