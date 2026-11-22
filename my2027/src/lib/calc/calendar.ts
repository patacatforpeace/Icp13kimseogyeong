import type { CalendarEvent, ISODate } from '@/data/types';
import { addDaysISO, diffDays, toDate } from '../date';
import { getDate, getDay } from 'date-fns';

export interface Occurrence {
  event: CalendarEvent;
  date: ISODate;
  done: boolean;
}

export function occursOn(e: CalendarEvent, d: ISODate): boolean {
  if (d < e.date) return false;
  if (e.repeatUntil && d > e.repeatUntil) return false;
  if (e.skipped.includes(d)) return false;
  switch (e.repeat) {
    case 'none':
      return d === e.date;
    case 'daily':
      return true;
    case 'weekly':
      return getDay(toDate(d)) === getDay(toDate(e.date));
    case 'monthly':
      return getDate(toDate(d)) === getDate(toDate(e.date));
  }
}

export function occurrencesInRange(events: CalendarEvent[], from: ISODate, to: ISODate): Occurrence[] {
  const out: Occurrence[] = [];
  const n = diffDays(to, from);
  for (let i = 0; i <= n; i++) {
    const d = addDaysISO(from, i);
    for (const e of events) if (occursOn(e, d)) out.push({ event: e, date: d, done: e.completed.includes(d) });
  }
  return out.sort((a, b) => (a.date === b.date ? (a.event.time ?? '99').localeCompare(b.event.time ?? '99') : a.date.localeCompare(b.date)));
}
