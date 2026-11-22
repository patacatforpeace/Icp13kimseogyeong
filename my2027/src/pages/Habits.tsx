import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/data/store';
import { Button, Card, Check, Empty, Field, Input, Modal, PageHeader, Select, Stat, cx, useConfirm, useToast } from '@/components/ui';
import { RateBars } from '@/components/charts';
import { bestStreak, currentStreak, isDone, periodRate, weekRate, weeklyHistory } from '@/lib/calc/habits';
import { addDaysISO, fmtDate, fmtShort, monthEndISO, monthOf, weekStartISO, weekdayKo } from '@/lib/date';
import { pct, uid } from '@/lib/format';
import { toggleHabit } from '@/data/actions';
import type { Habit } from '@/data/types';

export default function Habits() {
  const { state, update, today } = useStore();
  const [ws, setWs] = useState(weekStartISO(today));
  const [edit, setEdit] = useState<Habit | null>(null);
  const { ask, dialog } = useConfirm();
  const toast = useToast();
  const habits = state.habits.filter((h) => h.active);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i));

  const wk = weekRate(state.habits, state.habitLogs, today);
  const m = monthOf(today);
  const mo = periodRate(state.habits, state.habitLogs, `${m}-01`, monthEndISO(m), today);
  const hist = weeklyHistory(state.habits, state.habitLogs, today, 12).map((x) => ({ ...x, pct: Math.round(x.ratio * 100) }));
  const doneToday = habits.filter((h) => isDone(state.habitLogs, h.id, today)).length;
  const last30 = Array.from({ length: 30 }, (_, i) => addDaysISO(today, i - 29));

  return (
    <div>
      <PageHeader
        title="Habits"
        description="매일의 작은 실행을 기록합니다. 빠진 날이 있어도 괜찮아요 — 다시 체크하면 됩니다."
        action={
          <Button variant="primary" onClick={() => setEdit({ id: uid(), name: '', targetPerWeek: 7, active: true, createdAt: today })}>
            <Plus size={16} /> 습관 추가
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="오늘" value={`${doneToday}/${habits.length}`} sub="체크한 습관" />
        <Stat label="이번 주 달성률" value={pct(wk.ratio)} sub={`${wk.done}/${wk.target}회 (목표 빈도 기준)`} />
        <Stat label="이번 달 달성률" value={pct(mo.ratio)} sub="오늘까지 기준" />
        <Stat label="가장 긴 연속 기록" value={`${Math.max(0, ...habits.map((h) => bestStreak(state.habitLogs, h.id)))}일`} sub="모든 습관 중" />
      </div>

      <Card
        title="주간 체크"
        action={
          <div className="flex items-center gap-1">
            <button className="btn-icon" onClick={() => setWs(addDaysISO(ws, -7))} aria-label="이전 주">
              <ChevronLeft size={18} />
            </button>
            <span className="num text-sm">{fmtDate(ws)} 주</span>
            <button className="btn-icon" onClick={() => setWs(addDaysISO(ws, 7))} aria-label="다음 주" disabled={addDaysISO(ws, 7) > today}>
              <ChevronRight size={18} />
            </button>
          </div>
        }
        bodyClass="overflow-x-auto"
      >
        {habits.length === 0 ? (
          <Empty title="활성화된 습관이 없어요" action={<Button onClick={() => setEdit({ id: uid(), name: '', targetPerWeek: 7, active: true, createdAt: today })}>습관 추가</Button>} />
        ) : (
          <table className="tbl min-w-[560px]">
            <thead>
              <tr>
                <th className="w-44">습관</th>
                {days.map((d) => (
                  <th key={d} className={cx('text-center', d === today && 'text-ink')}>
                    <span className="num">
                      {weekdayKo(d)}
                      <br />
                      {fmtShort(d)}
                    </span>
                  </th>
                ))}
                <th className="text-right">이번 주</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const cnt = days.filter((d) => isDone(state.habitLogs, h.id, d)).length;
                return (
                  <tr key={h.id}>
                    <td>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-[11px] text-muted">주 {h.targetPerWeek}회 목표</p>
                    </td>
                    {days.map((d) => (
                      <td key={d} className="text-center">
                        {d > today ? (
                          <span className="inline-block h-[22px] w-[22px] rounded-md border border-dashed border-line" aria-hidden />
                        ) : (
                          <Check checked={isDone(state.habitLogs, h.id, d)} onChange={() => update((s) => toggleHabit(s, h.id, d))} label={`${fmtDate(d)} ${h.name}`} />
                        )}
                      </td>
                    ))}
                    <td className="num text-right text-sm">
                      {cnt}/{h.targetPerWeek}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="주간 달성률 추이" subtitle="최근 12주">
          <RateBars data={hist} xKey="weekStart" xFmt={fmtShort} height={220} />
        </Card>
        <Card title="습관별 통계" bodyClass="overflow-x-auto">
          <table className="tbl min-w-[520px]">
            <thead>
              <tr>
                <th>습관</th>
                <th>최근 30일</th>
                <th className="text-right">연속</th>
                <th className="text-right">최장</th>
                <th className="text-right">이번 달</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.habits.map((h) => {
                const mr = periodRate([{ ...h, active: true }], state.habitLogs, `${m}-01`, monthEndISO(m), today);
                const streak = currentStreak(state.habitLogs, h.id, today);
                return (
                  <tr key={h.id} className={cx(!h.active && 'opacity-50')}>
                    <td className="font-medium">
                      {h.name}
                      {!h.active && <span className="ml-1 text-[11px] text-muted">(쉬는 중)</span>}
                    </td>
                    <td>
                      <div className="flex gap-[2px]" aria-label={`최근 30일 중 ${last30.filter((d) => isDone(state.habitLogs, h.id, d)).length}일`}>
                        {last30.map((d) => (
                          <i key={d} title={fmtDate(d)} className={cx('h-4 w-[5px] rounded-sm', isDone(state.habitLogs, h.id, d) ? 'bg-ink' : 'bg-subtle')} />
                        ))}
                      </div>
                    </td>
                    <td className="num text-right">{streak > 0 ? `${streak}일` : '—'}</td>
                    <td className="num text-right">{bestStreak(state.habitLogs, h.id)}일</td>
                    <td className="num text-right">{pct(mr.ratio)}</td>
                    <td className="whitespace-nowrap text-right">
                      <button className="btn-icon" aria-label={`${h.name} 수정`} onClick={() => setEdit(h)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        aria-label={`${h.name} 삭제`}
                        onClick={() =>
                          ask('습관 삭제', `'${h.name}' 습관과 모든 체크 기록을 삭제할까요? 기록을 남기려면 수정에서 '쉬기'를 선택하세요.`, () =>
                            update((s) => {
                              s.habits = s.habits.filter((x) => x.id !== h.id);
                              delete s.habitLogs[h.id];
                            }),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">연속 기록은 오늘 아직 체크하지 않았어도 어제까지의 기록을 이어서 셉니다.</p>
        </Card>
      </div>

      {edit && (
        <HabitModal
          habit={edit}
          isNew={!state.habits.some((h) => h.id === edit.id)}
          onClose={() => setEdit(null)}
          onSave={(h) => {
            update((s) => {
              const i = s.habits.findIndex((x) => x.id === h.id);
              if (i >= 0) s.habits[i] = h;
              else s.habits.push(h);
            });
            toast('습관을 저장했어요');
            setEdit(null);
          }}
        />
      )}
      {dialog}
    </div>
  );
}

function HabitModal({ habit, isNew, onClose, onSave }: { habit: Habit; isNew: boolean; onClose: () => void; onSave: (h: Habit) => void }) {
  const [f, setF] = useState(habit);
  const [err, setErr] = useState('');
  const submit = () => {
    if (!f.name.trim()) return setErr('이름을 입력하세요');
    onSave({ ...f, name: f.name.trim() });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? '습관 추가' : '습관 수정'}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" onClick={submit}>
            저장
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="습관 이름" error={err}>{(id) => <Input id={id} value={f.name} maxLength={40} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="목표 빈도" hint="달성률은 이 빈도를 기준으로 계산합니다">
          {(id) => (
            <Select id={id} value={f.targetPerWeek} onChange={(e) => setF({ ...f, targetPerWeek: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n === 7 ? '매일' : `주 ${n}회`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {!isNew && (
          <Field label="상태" hint="쉬는 습관은 달성률에 포함되지 않고, 기록은 보존됩니다">
            {(id) => (
              <Select id={id} value={f.active ? 'on' : 'off'} onChange={(e) => setF({ ...f, active: e.target.value === 'on' })}>
                <option value="on">진행 중</option>
                <option value="off">쉬기</option>
              </Select>
            )}
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
