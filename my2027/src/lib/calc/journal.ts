import type { JournalEntry } from '@/data/types';
import { monthOf } from '../date';
import { avg } from '../format';

export const MOODS = [
  { v: 1, label: '많이 힘듦' },
  { v: 2, label: '힘듦' },
  { v: 3, label: '보통' },
  { v: 4, label: '좋음' },
  { v: 5, label: '아주 좋음' },
];

export function journalMonthly(entries: JournalEntry[]) {
  const map = new Map<string, JournalEntry[]>();
  for (const e of entries) map.set(monthOf(e.date), [...(map.get(monthOf(e.date)) ?? []), e]);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, es]) => summarize(es, month));
}

export function summarize(es: JournalEntry[], month = '') {
  const impulses = es.filter((e) => e.impulse);
  return {
    month,
    count: es.length,
    moodAvg: avg(es.map((e) => e.mood)),
    intensityAvg: avg(es.map((e) => e.intensity)),
    selfBlame: es.filter((e) => e.selfBlame).length,
    impulse: impulses.length,
    stopped: impulses.filter((e) => e.impulseOutcome === 'stopped').length,
    partly: impulses.filter((e) => e.impulseOutcome === 'partly').length,
  };
}
