import type { Habit, HabitLogs, ISODate } from '@/data/types';
import { addDaysISO, diffDays, rangeDays, weekStartISO } from '../date';

export const isDone = (logs: HabitLogs, habitId: string, d: ISODate) => Boolean(logs[habitId]?.[d]);

/**
 * Completion rate for a period. Each habit's expected count is its weekly target scaled
 * to the number of days elapsed in the period (never counting days before it existed),
 * and completions above the target are not counted, so one habit cannot hide another.
 */
export function periodRate(habits: Habit[], logs: HabitLogs, from: ISODate, to: ISODate, today: ISODate) {
  const end = to < today ? to : today;
  let expected = 0;
  let done = 0;
  for (const h of habits.filter((x) => x.active)) {
    const start = from > h.createdAt ? from : h.createdAt;
    if (start > end) continue;
    const days = diffDays(end, start) + 1;
    const exp = (h.targetPerWeek / 7) * days;
    const got = rangeDays(start, end).filter((d) => isDone(logs, h.id, d)).length;
    expected += exp;
    done += Math.min(got, exp);
  }
  return { expected, done, ratio: expected > 0 ? Math.min(1, done / expected) : 0 };
}

export function weekRate(habits: Habit[], logs: HabitLogs, today: ISODate) {
  const ws = weekStartISO(today);
  // A week's target is fixed (targetPerWeek), compare against it, capped.
  let target = 0;
  let done = 0;
  for (const h of habits.filter((x) => x.active)) {
    const got = rangeDays(ws, addDaysISO(ws, 6)).filter((d) => d <= today && isDone(logs, h.id, d)).length;
    target += h.targetPerWeek;
    done += Math.min(got, h.targetPerWeek);
  }
  return { target, done, ratio: target ? done / target : 0 };
}

/** Days in a row up to today. If today is not checked yet, the run ending yesterday still counts. */
export function currentStreak(logs: HabitLogs, habitId: string, today: ISODate): number {
  let d = isDone(logs, habitId, today) ? today : addDaysISO(today, -1);
  let n = 0;
  while (isDone(logs, habitId, d)) {
    n++;
    d = addDaysISO(d, -1);
  }
  return n;
}

export function bestStreak(logs: HabitLogs, habitId: string): number {
  const days = Object.keys(logs[habitId] ?? {}).sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of days) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export const totalDone = (logs: HabitLogs, habitId: string) => Object.keys(logs[habitId] ?? {}).length;

/** Weekly completion rates for the last n weeks (oldest first). */
export function weeklyHistory(habits: Habit[], logs: HabitLogs, today: ISODate, n: number) {
  const ws = weekStartISO(today);
  return Array.from({ length: n }, (_, i) => {
    const start = addDaysISO(ws, -7 * (n - 1 - i));
    const end = addDaysISO(start, 6);
    let target = 0;
    let done = 0;
    for (const h of habits.filter((x) => x.active && x.createdAt <= end)) {
      const got = rangeDays(start, end).filter((d) => d <= today && isDone(logs, h.id, d)).length;
      target += h.targetPerWeek;
      done += Math.min(got, h.targetPerWeek);
    }
    return { weekStart: start, ratio: target ? done / target : 0 };
  });
}
