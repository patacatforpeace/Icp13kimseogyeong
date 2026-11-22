import type { AppState, ISODate } from './types';

/** Small, reusable state mutations. Each receives a draft (deep copy) from store.update. */

export function toggleOccurrence(s: AppState, eventId: string, date: ISODate) {
  const e = s.events.find((x) => x.id === eventId);
  if (!e) return;
  e.completed = e.completed.includes(date) ? e.completed.filter((d) => d !== date) : [...e.completed, date];
}

export function toggleHabit(s: AppState, habitId: string, date: ISODate) {
  const log = (s.habitLogs[habitId] ??= {});
  if (log[date]) delete log[date];
  else log[date] = true;
}

export function toggleAttendance(s: AppState, date: ISODate) {
  if (s.english.attendance[date]) delete s.english.attendance[date];
  else s.english.attendance[date] = true;
}

export function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
}

export function remove<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}
