import { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Check, Field, Input, PageHeader, Progress, Select, Textarea, cx, useConfirm, useToast } from '@/components/ui';
import { GOAL_AREAS, QUARTER_THEMES } from '@/data/seed';
import { goalProgress, overallGoalProgress } from '@/lib/calc/goals';
import { fmtDate, isValidISO } from '@/lib/date';
import { pct, uid } from '@/lib/format';
import type { Goal, GoalArea } from '@/data/types';

export default function Goals() {
  const { state, update, today } = useStore();
  const [open, setOpen] = useState<string | null>(state.goals[0]?.id ?? null);
  const overall = overallGoalProgress(state.goals);
  const toast = useToast();

  const addGoal = () => {
    const g: Goal = {
      id: uid(),
      area: 'health',
      title: '새 목표',
      yearGoal: '',
      description: '',
      start: '2027-01-01',
      end: '2027-12-31',
      items: [],
      quarters: [0, 1, 2, 3].map(() => ({ plan: '', result: '' })) as Goal['quarters'],
      memo: '',
    };
    update((s) => void s.goals.push(g));
    setOpen(g.id);
    toast('목표를 추가했어요');
  };

  return (
    <div>
      <PageHeader
        title="Goals"
        description="2027년 6개 영역의 연간 목표. 달성률은 완료한 세부 항목 수로 계산합니다."
        action={
          <Button variant="primary" onClick={addGoal}>
            <Plus size={16} /> 목표 추가
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted">연간 목표 달성률</p>
            <p className="num text-3xl font-semibold">{pct(overall.ratio)}</p>
          </div>
          <p className="num text-sm text-muted">
            세부 항목 {overall.done} / {overall.total} 완료
          </p>
        </div>
        <div className="mt-3">
          <Progress value={overall.ratio} label="연간 목표 달성률" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          {state.goals.map((g) => {
            const p = goalProgress(g);
            return (
              <button key={g.id} onClick={() => setOpen(g.id)} className="text-left">
                <p className="truncate text-xs text-muted">{g.title}</p>
                <p className="num text-sm font-semibold">{pct(p.ratio)}</p>
                <div className="mt-1">
                  <Progress value={p.ratio} tone="accent" label={`${g.title} 진행률`} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-3">
        {state.goals.map((g) => (
          <GoalCard key={g.id} goal={g} open={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)} today={today} update={update} />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ goal, open, onToggle, today, update }: { goal: Goal; open: boolean; onToggle: () => void; today: string; update: ReturnType<typeof useStore>['update'] }) {
  const p = goalProgress(goal);
  const area = GOAL_AREAS.find((a) => a.area === goal.area);
  const [newItem, setNewItem] = useState('');
  const [newQ, setNewQ] = useState(1);
  const { ask, dialog } = useConfirm();
  const edit = (fn: (g: Goal) => void) =>
    update((s) => {
      const g = s.goals.find((x) => x.id === goal.id);
      if (g) fn(g);
    });

  const dateErr = !isValidISO(goal.start) || !isValidISO(goal.end) ? '날짜 형식이 올바르지 않습니다' : goal.end < goal.start ? '종료일이 시작일보다 빠릅니다' : undefined;

  return (
    <section className="card">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-4 text-left">
        <span className="num text-xs font-semibold text-muted">{area?.no}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{goal.title}</p>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted">{goal.yearGoal || '연말 목표를 입력하세요'}</p>
        </div>
        <div className="hidden w-40 sm:block">
          <Progress value={p.ratio} label={`${goal.title} 진행률`} />
        </div>
        <span className="num w-12 text-right text-sm font-semibold">{pct(p.ratio)}</span>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="space-y-6 border-t border-line px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="목표 이름">{(id) => <Input id={id} value={goal.title} maxLength={60} onChange={(e) => edit((g) => void (g.title = e.target.value))} />}</Field>
            <Field label="영역">
              {(id) => (
                <Select id={id} value={goal.area} onChange={(e) => edit((g) => void (g.area = e.target.value as GoalArea))}>
                  {GOAL_AREAS.map((a) => (
                    <option key={a.area} value={a.area}>
                      {a.no}. {a.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="연말 목표" className="md:col-span-2">{(id) => <Textarea id={id} rows={2} value={goal.yearGoal} onChange={(e) => edit((g) => void (g.yearGoal = e.target.value))} />}</Field>
            <Field label="설명" className="md:col-span-2">{(id) => <Textarea id={id} rows={2} value={goal.description} onChange={(e) => edit((g) => void (g.description = e.target.value))} />}</Field>
            <Field label="시작일" error={dateErr}>{(id) => <Input id={id} type="date" value={goal.start} onChange={(e) => edit((g) => void (g.start = e.target.value))} />}</Field>
            <Field label="종료일">{(id) => <Input id={id} type="date" value={goal.end} onChange={(e) => edit((g) => void (g.end = e.target.value))} />}</Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">세부 실행 항목</h3>
              <span className="num text-xs text-muted">
                {p.done}/{p.total} 완료
              </span>
            </div>
            {goal.items.length === 0 && <p className="py-3 text-sm text-muted">아직 항목이 없어요. 아래에서 추가하세요.</p>}
            <ul className="divide-y divide-line">
              {goal.items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Check
                    checked={it.done}
                    label={`${it.text} 완료`}
                    onChange={(v) =>
                      edit((g) => {
                        const x = g.items.find((y) => y.id === it.id)!;
                        x.done = v;
                        x.doneAt = v ? today : undefined;
                      })
                    }
                  />
                  <input
                    aria-label="항목 내용"
                    className={cx('min-h-[36px] min-w-0 flex-1 rounded-md bg-transparent px-1 text-sm focus:bg-subtle focus:outline-none', it.done && 'text-muted line-through')}
                    value={it.text}
                    onChange={(e) => edit((g) => void (g.items.find((y) => y.id === it.id)!.text = e.target.value))}
                  />
                  {it.doneAt && <span className="num text-[11px] text-muted">{fmtDate(it.doneAt)}</span>}
                  <select
                    aria-label="분기"
                    className="min-h-[34px] rounded-md border border-line bg-surface px-2 text-xs"
                    value={it.quarter}
                    onChange={(e) => edit((g) => void (g.items.find((y) => y.id === it.id)!.quarter = Number(e.target.value)))}
                  >
                    <option value={0}>연중</option>
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={q}>
                        {q}분기
                      </option>
                    ))}
                  </select>
                  <button className="btn-icon" aria-label={`${it.text} 삭제`} onClick={() => ask('항목 삭제', `'${it.text}' 항목을 삭제할까요?`, () => edit((g) => void (g.items = g.items.filter((y) => y.id !== it.id))))}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = newItem.trim();
                if (!t) return;
                edit((g) => void g.items.push({ id: uid(), text: t, done: false, quarter: newQ }));
                setNewItem('');
              }}
            >
              <Input aria-label="새 세부 항목" placeholder="새 세부 항목" className="min-w-0 flex-1" value={newItem} maxLength={100} onChange={(e) => setNewItem(e.target.value)} />
              <Select aria-label="새 항목 분기" className="w-28" value={newQ} onChange={(e) => setNewQ(Number(e.target.value))}>
                <option value={0}>연중</option>
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    {q}분기
                  </option>
                ))}
              </Select>
              <Button type="submit" disabled={!newItem.trim()}>
                <Plus size={16} /> 추가
              </Button>
            </form>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">분기별 목표</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {goal.quarters.map((qp, i) => {
                const qi = goal.items.filter((x) => x.quarter === i + 1);
                return (
                  <div key={i} className="rounded-xl border border-line p-3">
                    <p className="text-xs font-semibold">
                      {i + 1}분기 <span className="font-normal text-muted">· {QUARTER_THEMES[i]}</span>
                    </p>
                    <p className="num mt-0.5 text-[11px] text-muted">
                      항목 {qi.filter((x) => x.done).length}/{qi.length} 완료
                    </p>
                    <label className="label mt-2">계획</label>
                    <Textarea rows={2} aria-label={`${i + 1}분기 계획`} value={qp.plan} onChange={(e) => edit((g) => void (g.quarters[i].plan = e.target.value))} />
                    <label className="label mt-2">실제 성과</label>
                    <Textarea rows={2} aria-label={`${i + 1}분기 실제 성과`} value={qp.result} onChange={(e) => edit((g) => void (g.quarters[i].result = e.target.value))} />
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="메모">{(id) => <Textarea id={id} value={goal.memo} onChange={(e) => edit((g) => void (g.memo = e.target.value))} />}</Field>

          <div className="flex justify-end">
            <Button variant="danger" onClick={() => ask('목표 삭제', `'${goal.title}' 목표와 세부 항목을 모두 삭제할까요? 되돌릴 수 없습니다.`, () => update((s) => void (s.goals = s.goals.filter((x) => x.id !== goal.id))))}>
              <Trash2 size={15} /> 목표 삭제
            </Button>
          </div>
        </div>
      )}
      {dialog}
    </section>
  );
}
