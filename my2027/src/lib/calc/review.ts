import type { AppState, ISODate } from '@/data/types';
import { periodRate, isDone } from './habits';
import { occurrencesInRange } from './calendar';
import { sortedWeights } from './health';
import { summarize } from './journal';
import { debtTotals } from './finance';
import { addDaysISO, diffDays, rangeDays } from '../date';
import { avg, sum } from '../format';

/** Everything recorded between two dates, in one object. Used by weekly/monthly/quarterly/annual reviews. */
export function periodMetrics(s: AppState, from: ISODate, to: ISODate, today: ISODate) {
  const end = to < today ? to : today;
  const inP = (d: string) => d >= from && d <= to;

  const habits = periodRate(s.habits, s.habitLogs, from, to, today);
  const habitRows = s.habits
    .filter((h) => h.active)
    .map((h) => {
      const days = end >= from ? rangeDays(from, end) : [];
      const done = days.filter((d) => isDone(s.habitLogs, h.id, d)).length;
      const expected = (h.targetPerWeek / 7) * days.length;
      return { name: h.name, done, expected, ratio: expected ? Math.min(1, done / expected) : 0 };
    });

  const workouts = s.workouts.filter((w) => inP(w.date));
  const ws = sortedWeights(s.weights.filter((w) => inP(w.date)));
  const before = sortedWeights(s.weights.filter((w) => w.date < from)).at(-1);
  const firstW = before ?? ws[0];
  const lastW = ws.at(-1);

  const eng = s.english;
  const engEnd = addDaysISO(eng.start, eng.days - 1);
  const cFrom = from > eng.start ? from : eng.start;
  const cTo = end < engEnd ? end : engEnd;
  const engDays = cTo >= cFrom ? diffDays(cTo, cFrom) + 1 : 0;
  const engAttended = Object.keys(eng.attendance).filter((d) => d >= cFrom && d <= cTo).length;

  const occ = end >= from ? occurrencesInRange(s.events, from, end) : [];
  const f = s.finance;
  const income = sum(f.incomes.filter((x) => inP(x.date)).map((x) => x.amount));
  const expense = sum(f.expenses.filter((x) => inP(x.date)).map((x) => x.amount));
  const debtPaid = sum(f.payments.filter((x) => inP(x.date)).map((x) => x.amount));
  const saved = sum(f.savingsTxns.filter((x) => inP(x.date)).map((x) => x.amount));
  const goalItemsDone = s.goals.flatMap((g) => g.items.filter((i) => i.done && i.doneAt && inP(i.doneAt)).map((i) => ({ goal: g.title, text: i.text })));

  return {
    habits,
    habitRows,
    workouts: {
      count: workouts.length,
      strength: workouts.filter((w) => w.type === 'strength').length,
      cardio: workouts.filter((w) => w.type === 'running' || w.type === 'walking').length,
      minutes: sum(workouts.map((w) => w.minutes)),
      runKm: sum(workouts.filter((w) => w.type === 'running').map((w) => w.distanceKm ?? 0)),
    },
    weight: {
      start: firstW?.kg,
      end: lastW?.kg,
      change: firstW && lastW ? lastW.kg - firstW.kg : undefined,
      avg: ws.length ? avg(ws.map((w) => w.kg)) : undefined,
      n: ws.length,
    },
    english: { days: engDays, attended: engAttended, ratio: engDays ? engAttended / engDays : 0, minutes: sum(eng.logs.filter((l) => inP(l.date)).map((l) => l.minutes)) },
    events: { total: occ.length, done: occ.filter((o) => o.done).length },
    money: { income, expense, debtPaid, saved, debtEnd: debtTotals(f, to).total },
    journal: summarize(s.journal.filter((j) => inP(j.date))),
    goalItemsDone,
  };
}

export type PeriodMetrics = ReturnType<typeof periodMetrics>;

/** Neutral, data-based notes for the auto-generated weekly summary. Never judgmental. */
export function weeklyNotes(m: PeriodMetrics): { good: string[]; next: string[] } {
  const good: string[] = [];
  const next: string[] = [];
  const strong = m.habitRows.filter((h) => h.ratio >= 0.99);
  if (strong.length) good.push(`주간 목표를 채운 습관: ${strong.map((h) => h.name).join(', ')}`);
  if (m.workouts.count) good.push(`운동 ${m.workouts.count}회 (근력 ${m.workouts.strength} · 유산소 ${m.workouts.cardio}), ${m.workouts.minutes}분`);
  if (m.english.attended) good.push(`영어 출석 ${m.english.attended}/${m.english.days}일`);
  if (m.journal.stopped + m.journal.partly) good.push(`충동을 조절한 순간 ${m.journal.stopped + m.journal.partly}번`);
  if (m.events.done) good.push(`일정 ${m.events.done}/${m.events.total}개 완료`);
  if (m.goalItemsDone.length) good.push(`목표 항목 완료: ${m.goalItemsDone.map((g) => g.text).join(', ')}`);

  const low = [...m.habitRows].filter((h) => h.expected > 0 && h.ratio < 0.6).sort((a, b) => a.ratio - b.ratio)[0];
  if (low) next.push(`'${low.name}'을(를) 다음 주에 한 번만 더 챙겨보기 (이번 주 ${low.done}회)`);
  if (m.workouts.strength < 3) next.push(`근력운동은 이번 주 ${m.workouts.strength}회 — 다음 주 일정에 시간을 먼저 잡아두기`);
  if (m.weight.n === 0) next.push('체중을 주 2–3회만 기록해도 추세를 볼 수 있어요');
  if (m.journal.count < 3) next.push('짧게라도 감정 기록 3번 남겨보기');
  return { good, next: next.slice(0, 3) };
}
