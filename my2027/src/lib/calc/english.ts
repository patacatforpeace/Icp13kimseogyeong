import type { EnglishState, ISODate } from '@/data/types';
import { addDaysISO, diffDays } from '../date';

export function challengeInfo(e: EnglishState, today: ISODate) {
  const end = addDaysISO(e.start, e.days - 1);
  const attended = Object.keys(e.attendance).filter((d) => d >= e.start && d <= end).length;
  const dayNo = today < e.start ? 0 : Math.min(e.days, diffDays(today, e.start) + 1);
  const elapsed = today < e.start ? 0 : Math.min(e.days, diffDays(today, e.start) + (e.attendance[today] ? 1 : 0));
  return {
    end,
    attended,
    dayNo,
    started: today >= e.start,
    finished: today > end,
    remainingDays: today > end ? 0 : today < e.start ? e.days : diffDays(end, today) + 1,
    ratio: attended / e.days,
    /** Days already passed in the challenge (yesterday and before, plus today once checked). */
    elapsed,
    streak: attendanceStreak(e, today),
  };
}

export function attendanceStreak(e: EnglishState, today: ISODate) {
  let d = e.attendance[today] ? today : addDaysISO(today, -1);
  let n = 0;
  while (e.attendance[d] && d >= e.start) {
    n++;
    d = addDaysISO(d, -1);
  }
  return n;
}

/** Attendance can only be checked for today, inside the challenge window. */
export function canCheck(e: EnglishState, date: ISODate, today: ISODate) {
  const end = addDaysISO(e.start, e.days - 1);
  return date === today && date >= e.start && date <= end;
}

export function challengeDates(e: EnglishState): ISODate[] {
  return Array.from({ length: e.days }, (_, i) => addDaysISO(e.start, i));
}
