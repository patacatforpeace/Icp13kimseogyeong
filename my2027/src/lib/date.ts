import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { ISODate, YearMonth } from '@/data/types';

export const TIME_ZONE = 'Asia/Seoul';

const seoulParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

/** Allows tests (and the ?today= debug hook) to pin "today". */
let fixedToday: ISODate | null = null;
export function setFixedToday(d: ISODate | null) {
  fixedToday = d;
}

/** Today's calendar date in Asia/Seoul, whatever the device's time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  if (fixedToday) return fixedToday;
  const p = Object.fromEntries(seoulParts.formatToParts(now).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function seoulHour(now: Date = new Date()): number {
  const p = Object.fromEntries(seoulParts.formatToParts(now).map((x) => [x.type, x.value]));
  return Number(p.hour);
}

export const toDate = (d: ISODate) => parseISO(d);
export const toISO = (d: Date): ISODate => format(d, 'yyyy-MM-dd');

export const fmtDate = (d: ISODate) => d.replaceAll('-', '.');
export const fmtShort = (d: ISODate) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;
export const fmtMonth = (m: YearMonth) => `${m.slice(0, 4)}.${m.slice(5, 7)}`;
export const monthLabel = (m: YearMonth) => `${Number(m.slice(5, 7))}월`;

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
export const weekdayKo = (d: ISODate) => WEEKDAYS_KO[getDay(toDate(d))];

export function fmtDateLong(d: ISODate) {
  return `${fmtDate(d)} (${weekdayKo(d)})`;
}

export const addDaysISO = (d: ISODate, n: number) => toISO(addDays(toDate(d), n));
export const diffDays = (a: ISODate, b: ISODate) => differenceInCalendarDays(toDate(a), toDate(b));
export const monthOf = (d: ISODate): YearMonth => d.slice(0, 7);
export const addMonthsYM = (m: YearMonth, n: number): YearMonth =>
  format(addMonths(parseISO(`${m}-01`), n), 'yyyy-MM');

/** Monday-start week. */
export const weekStartISO = (d: ISODate) => toISO(startOfWeek(toDate(d), { weekStartsOn: 1 }));
export const monthStartISO = (m: YearMonth) => `${m}-01`;
export const monthEndISO = (m: YearMonth) => toISO(endOfMonth(parseISO(`${m}-01`)));

export function rangeDays(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
  }
  return out;
}

export function monthsBetween(from: YearMonth, to: YearMonth): YearMonth[] {
  const out: YearMonth[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addMonthsYM(cur, 1);
  }
  return out;
}

/** 6x7 grid of dates covering a month (Monday start). */
export function monthGrid(m: YearMonth): ISODate[] {
  const first = startOfMonth(parseISO(`${m}-01`));
  const start = startOfWeek(first, { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => toISO(addDays(start, i)));
}

export function quarterOf(d: ISODate): number {
  return Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1;
}

export function quarterRange(year: number, q: number): [ISODate, ISODate] {
  const sm = (q - 1) * 3 + 1;
  const start = `${year}-${String(sm).padStart(2, '0')}-01`;
  const end = monthEndISO(`${year}-${String(sm + 2).padStart(2, '0')}`);
  return [start, end];
}

export const inRange = (d: ISODate, from: ISODate, to: ISODate) => d >= from && d <= to;

export function isValidISO(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = parseISO(d);
  return !Number.isNaN(t.getTime()) && toISO(t) === d;
}
