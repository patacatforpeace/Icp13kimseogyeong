import { describe, expect, it } from 'vitest';
import { createSeedState } from '@/data/seed';
import { normalizeState } from '@/data/normalize';
import { planSummary, simulate, debtTotals, financeWarnings, familyTotals } from '@/lib/calc/finance';
import { challengeInfo, canCheck } from '@/lib/calc/english';
import { currentStreak, weekRate } from '@/lib/calc/habits';
import { occurrencesInRange } from '@/lib/calc/calendar';
import { appMode } from '@/lib/calc/mode';
import { setFixedToday } from '@/lib/date';

setFixedToday('2026-11-22');
const s = createSeedState();

describe('finance', () => {
  it('matches the numbers in the brief', () => {
    const p = planSummary(s.finance);
    expect(p.living).toBe(1_500_000);
    expect(p.afterFixed).toBe(1_520_000); // 3,250,000 - 1,500,000 - 230,000 (저축은행 월 납부액 미입력)
    expect(p.afterFamily).toBe(120_000);
    expect(debtTotals(s.finance).total).toBe(5_130_000 + 5_760_000 + 3_840_000 + 4_000_000 + 760_000);
    expect(familyTotals(s.finance).balance).toBe(13_600_000);
  });
  it('simulates without double counting and flags the deadline', () => {
    const rows = simulate(s.finance, { startMonth: '2026-12', endMonth: '2027-12', contractEnd: '2027-08-10' });
    expect(rows[0].family).toBe(1_400_000);
    const clear = rows.find((r) => r.familyBalance === 0)!;
    expect(clear.month).toBe('2027-09'); // 13.6M / 1.4M → 10 months
    expect(rows.find((r) => r.month === '2027-09')!.income).toBe(0);
    const w = financeWarnings(s.finance, rows, '2027-08-10').map((x) => x.text).join('\n');
    expect(w).toContain('목표(2027.06)보다 늦습니다');
  });
});

describe('english', () => {
  it('ends on 2027-03-10 and only allows today', () => {
    expect(challengeInfo(s.english, '2026-12-01').end).toBe('2027-03-10');
    expect(canCheck(s.english, '2026-12-05', '2026-12-05')).toBe(true);
    expect(canCheck(s.english, '2026-12-06', '2026-12-05')).toBe(false);
    expect(canCheck(s.english, '2026-12-04', '2026-12-05')).toBe(false);
    expect(canCheck(s.english, '2026-11-30', '2026-11-30')).toBe(false);
  });
});

describe('habits & calendar & mode', () => {
  it('counts streaks forgivingly', () => {
    const id = s.habits[0].id;
    const logs = { [id]: { '2026-12-01': true, '2026-12-02': true } as Record<string, true> };
    expect(currentStreak(logs, id, '2026-12-03')).toBe(2);
    expect(weekRate([{ ...s.habits[0] }], logs, '2026-12-03').done).toBe(2);
  });
  it('expands the weekly routine', () => {
    const occ = occurrencesInRange(s.events, '2026-12-07', '2026-12-13');
    expect(occ.filter((o) => o.event.routine).length).toBe(7);
  });
  it('switches modes', () => {
    expect(appMode('2026-12-15', s.profile).mode).toBe('beta');
    expect(appMode('2027-01-01', s.profile).mode).toBe('execution');
  });
  it('round-trips backups', () => {
    expect(normalizeState({ state: s }).finance.debts.length).toBe(5);
    expect(() => normalizeState({ foo: 1 })).toThrow();
  });
});

describe('simulation with records in the first month', () => {
  it('does not double count a payment already made this month', () => {
    const st = createSeedState();
    const mom = st.finance.debts.find((d) => d.name.includes('어머니'))!;
    st.finance.payments.push({ id: 'p1', debtId: mom.id, date: '2026-12-05', amount: 1_400_000, memo: '' });
    st.finance.incomes.push({ id: 'i1', date: '2026-12-01', amount: 3_250_000, category: 'salary', memo: '' });
    const rows = simulate(st.finance, { startMonth: '2026-12', endMonth: '2027-12', contractEnd: '2027-08-10' });
    expect(rows[0].family).toBe(0);
    expect(rows[0].income).toBe(0);
    expect(rows[0].cash).toBe(3_250_000 - 1_400_000 - 1_500_000 - 230_000);
    expect(rows.find((r) => r.familyBalance === 0)!.month).toBe('2027-09');
  });
});
