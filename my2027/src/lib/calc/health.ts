import type { HealthSettings, ISODate, WeightEntry, Workout } from '@/data/types';
import { addDaysISO, monthOf, weekStartISO } from '../date';
import { avg, sum } from '../format';

export const sortedWeights = (ws: WeightEntry[]) => [...ws].sort((a, b) => a.date.localeCompare(b.date));

export function weightSummary(ws: WeightEntry[], h: HealthSettings) {
  const s = sortedWeights(ws);
  const latest = s.at(-1);
  const current = latest?.kg ?? h.startWeight;
  const totalToLose = h.startWeight - h.targetWeight;
  const lost = h.startWeight - current;
  return {
    latest,
    current,
    remaining: Math.max(0, current - h.targetWeight),
    lost,
    ratio: totalToLose > 0 ? Math.max(0, Math.min(1, lost / totalToLose)) : 0,
  };
}

export function weeklyAverages(ws: WeightEntry[]) {
  const map = new Map<ISODate, number[]>();
  for (const w of ws) {
    const k = weekStartISO(w.date);
    map.set(k, [...(map.get(k) ?? []), w.kg]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, xs]) => ({ week, avg: avg(xs), n: xs.length }));
}

export function monthlyAverages(ws: WeightEntry[]) {
  const map = new Map<string, number[]>();
  for (const w of ws) map.set(monthOf(w.date), [...(map.get(monthOf(w.date)) ?? []), w.kg]);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, xs]) => ({ month, avg: avg(xs), n: xs.length }));
}

/** Daily series with a 7-day trailing average for charting. */
export function weightSeries(ws: WeightEntry[]) {
  const s = sortedWeights(ws);
  return s.map((w) => {
    const from = addDaysISO(w.date, -6);
    const win = s.filter((x) => x.date >= from && x.date <= w.date).map((x) => x.kg);
    return { date: w.date, kg: w.kg, avg7: Math.round(avg(win) * 10) / 10 };
  });
}

export const isCardio = (w: Workout) => w.type === 'running' || w.type === 'walking';

export function workoutWeek(ws: Workout[], today: ISODate) {
  const start = weekStartISO(today);
  const end = addDaysISO(start, 6);
  const wk = ws.filter((w) => w.date >= start && w.date <= end);
  return {
    count: wk.length,
    strength: wk.filter((w) => w.type === 'strength').length,
    cardio: wk.filter(isCardio).length,
    runKm: sum(wk.filter((w) => w.type === 'running').map((w) => w.distanceKm ?? 0)),
    minutes: sum(wk.map((w) => w.minutes)),
  };
}

export function workoutMonth(ws: Workout[], month: string) {
  const m = ws.filter((w) => monthOf(w.date) === month);
  return {
    count: m.length,
    minutes: sum(m.map((w) => w.minutes)),
    runKm: sum(m.filter((w) => w.type === 'running').map((w) => w.distanceKm ?? 0)),
  };
}

/** Workouts per week for the last n weeks, split by kind. */
export function workoutWeeks(ws: Workout[], today: ISODate, n: number) {
  const cur = weekStartISO(today);
  return Array.from({ length: n }, (_, i) => {
    const start = addDaysISO(cur, -7 * (n - 1 - i));
    const end = addDaysISO(start, 6);
    const wk = ws.filter((w) => w.date >= start && w.date <= end);
    return {
      week: start,
      strength: wk.filter((w) => w.type === 'strength').length,
      cardio: wk.filter(isCardio).length,
      other: wk.filter((w) => w.type !== 'strength' && !isCardio(w)).length,
      minutes: sum(wk.map((w) => w.minutes)),
    };
  });
}
