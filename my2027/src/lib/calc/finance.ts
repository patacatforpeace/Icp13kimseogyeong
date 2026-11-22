import type { Debt, DebtPayment, FinanceState, ISODate, YearMonth } from '@/data/types';
import { addMonthsYM, monthEndISO, monthOf, monthsBetween } from '../date';
import { sum } from '../format';

export const DEBT_GROUP_LABEL = { family: '가족 부채', rehab: '개인회생', other: '기타 부채' } as const;

export const livingTotal = (f: FinanceState) => sum(f.plan.livingBudget.map((b) => b.amount));

export function paidOn(debt: Debt, payments: DebtPayment[], until?: ISODate) {
  return sum(payments.filter((p) => p.debtId === debt.id && (!until || p.date <= until)).map((p) => p.amount));
}

/** Current balance = opening balance − recorded payments (never below 0). */
export function debtBalance(debt: Debt, payments: DebtPayment[], until?: ISODate) {
  return Math.max(0, debt.openingBalance - paidOn(debt, payments, until));
}

export function debtTotals(f: FinanceState, until?: ISODate) {
  const by = { family: 0, rehab: 0, other: 0 };
  let opening = 0;
  for (const d of f.debts) {
    by[d.group] += debtBalance(d, f.payments, until);
    opening += d.openingBalance;
  }
  const total = by.family + by.rehab + by.other;
  return { ...by, total, opening, repaid: opening - total, ratio: opening ? (opening - total) / opening : 0 };
}

export function familyTotals(f: FinanceState) {
  const fam = f.debts.filter((d) => d.group === 'family');
  const opening = sum(fam.map((d) => d.openingBalance));
  const balance = sum(fam.map((d) => debtBalance(d, f.payments)));
  return { opening, balance, repaid: opening - balance, ratio: opening ? (opening - balance) / opening : 0 };
}

export function savingsBalance(f: FinanceState, goalId?: string, until?: ISODate) {
  return sum(f.savingsTxns.filter((t) => (!goalId || t.goalId === goalId) && (!until || t.date <= until)).map((t) => t.amount));
}

export function emergencyGoal(f: FinanceState) {
  return f.savingsGoals.find((g) => g.kind === 'emergency') ?? f.savingsGoals[0];
}

/** Recorded money movements for one month. */
export function monthFlow(f: FinanceState, m: YearMonth) {
  const inM = (d: string) => monthOf(d) === m;
  const income = sum(f.incomes.filter((x) => inM(x.date)).map((x) => x.amount));
  const fixed = sum(f.expenses.filter((x) => inM(x.date) && x.kind === 'fixed').map((x) => x.amount));
  const variable = sum(f.expenses.filter((x) => inM(x.date) && x.kind === 'variable').map((x) => x.amount));
  const debt = sum(f.payments.filter((x) => inM(x.date)).map((x) => x.amount));
  const saved = sum(f.savingsTxns.filter((x) => inM(x.date)).map((x) => x.amount));
  const expense = fixed + variable;
  return { month: m, income, expense, fixed, variable, debt, saved, net: income - expense - debt - saved };
}

/** Months from the first record (or `from`) through `to`. */
export function flowMonths(f: FinanceState, from: YearMonth, to: YearMonth) {
  const dates = [...f.incomes, ...f.expenses, ...f.payments, ...f.savingsTxns].map((x) => monthOf(x.date));
  const first = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : from;
  return monthsBetween(first < from ? first : from, to);
}

export function debtHistory(f: FinanceState, months: YearMonth[]) {
  return months.map((m) => {
    const t = debtTotals(f, monthEndISO(m));
    return { month: m, total: t.total, family: t.family };
  });
}

export function cashOnHand(f: FinanceState) {
  const t = monthFlowAll(f);
  return f.plan.openingCash + t.income - t.expense - t.debt - t.saved;
}

function monthFlowAll(f: FinanceState) {
  return {
    income: sum(f.incomes.map((x) => x.amount)),
    expense: sum(f.expenses.map((x) => x.amount)),
    debt: sum(f.payments.map((x) => x.amount)),
    saved: sum(f.savingsTxns.map((x) => x.amount)),
  };
}

// ── Plan & simulation ───────────────────────────────────────────────────

export function planSummary(f: FinanceState) {
  const living = livingTotal(f);
  const rehab = sum(f.debts.filter((d) => d.group === 'rehab' && debtBalance(d, f.payments) > 0).map((d) => d.monthlyPayment));
  const other = sum(f.debts.filter((d) => d.group === 'other' && debtBalance(d, f.payments) > 0).map((d) => d.monthlyPayment));
  const afterFixed = f.plan.monthlyNetIncome - living - rehab - other;
  const afterFamily = afterFixed - f.plan.familyMonthlyTarget;
  const leftover = afterFamily - f.plan.monthlySavingsTarget;
  return { income: f.plan.monthlyNetIncome, living, rehab, other, afterFixed, family: f.plan.familyMonthlyTarget, afterFamily, savings: f.plan.monthlySavingsTarget, leftover };
}

export interface SimRow {
  month: YearMonth;
  income: number;
  living: number;
  rehab: number;
  family: number;
  other: number;
  savings: number;
  cash: number;
  savingsBalance: number;
  familyBalance: number;
  totalDebt: number;
  shortfall: boolean;
}

export interface SimInput {
  startMonth: YearMonth;
  endMonth: YearMonth;
  contractEnd: ISODate;
}

/**
 * Month-by-month projection from today's balances using the plan values.
 * Assumptions (shown in the UI): salary is received through the month the contract ends;
 * after that only `postContractIncome` (default 0) is counted. Unconfirmed income is never added.
 * Family repayments go to family debts in list order; a payment never exceeds the balance.
 */
export function simulate(f: FinanceState, input: SimInput) {
  const balances = new Map(f.debts.map((d) => [d.id, debtBalance(d, f.payments)]));
  const living = livingTotal(f);
  const lastSalaryMonth = monthOf(input.contractEnd);
  let cash = cashOnHand(f);
  let saved = savingsBalance(f);
  const rows: SimRow[] = [];

  // Money already recorded in the first month counts toward that month's plan, so only the remainder is projected.
  const first = input.startMonth;
  const rec = monthFlow(f, first);
  const paidInFirst = (d: Debt) => sum(f.payments.filter((p) => p.debtId === d.id && monthOf(p.date) === first).map((p) => p.amount));
  const famPaidFirst = sum(f.debts.filter((d) => d.group === 'family').map(paidInFirst));

  for (const m of monthsBetween(input.startMonth, input.endMonth)) {
    const isFirst = m === first;
    const planned = m <= lastSalaryMonth ? f.plan.monthlyNetIncome : f.plan.postContractIncome;
    const income = isFirst ? Math.max(0, planned - rec.income) : planned;
    const pay = (group: Debt['group'], budgetFn: (d: Debt) => number) => {
      let total = 0;
      for (const d of f.debts.filter((x) => x.group === group)) {
        const bal = balances.get(d.id) ?? 0;
        const amt = Math.min(bal, budgetFn(d));
        if (amt > 0) {
          balances.set(d.id, bal - amt);
          total += amt;
        }
      }
      return total;
    };
    const due = (d: Debt) => (isFirst ? Math.max(0, d.monthlyPayment - paidInFirst(d)) : d.monthlyPayment);
    const rehab = pay('rehab', due);
    const other = pay('other', due);
    let famBudget = isFirst ? Math.max(0, f.plan.familyMonthlyTarget - famPaidFirst) : f.plan.familyMonthlyTarget;
    const family = pay('family', (d) => {
      const bal = balances.get(d.id) ?? 0;
      const amt = Math.min(bal, famBudget);
      famBudget -= amt;
      return amt;
    });
    const savings = isFirst ? Math.max(0, f.plan.monthlySavingsTarget - Math.max(0, rec.saved)) : f.plan.monthlySavingsTarget;
    const spend = isFirst ? Math.max(0, living - rec.expense) : living;
    cash += income - spend - rehab - other - family - savings;
    saved += savings;
    const familyBalance = sum(f.debts.filter((d) => d.group === 'family').map((d) => balances.get(d.id) ?? 0));
    const totalDebt = sum([...balances.values()]);
    rows.push({ month: m, income, living: spend, rehab, family, other, savings, cash, savingsBalance: saved, familyBalance, totalDebt, shortfall: cash < 0 });
  }
  return rows;
}

export interface Warning {
  level: 'danger' | 'warning' | 'info';
  text: string;
}

export function financeWarnings(f: FinanceState, rows: SimRow[], contractEnd: ISODate): Warning[] {
  const out: Warning[] = [];
  const plan = planSummary(f);
  const fam = familyTotals(f);

  if (plan.leftover < 0) {
    out.push({ level: 'danger', text: `계획대로면 매달 ${Math.abs(plan.leftover).toLocaleString('ko-KR')}원이 부족합니다. 상환 목표나 저축 목표를 줄여야 합니다.` });
  } else if (plan.leftover < 300_000) {
    out.push({ level: 'warning', text: `모든 상환·저축 후 남는 돈이 월 ${plan.leftover.toLocaleString('ko-KR')}원입니다. 예상 밖 지출이 생기면 바로 부족해질 수 있습니다.` });
  }

  const clearRow = rows.find((r) => r.familyBalance <= 0);
  if (fam.balance > 0) {
    if (!clearRow) {
      out.push({ level: 'danger', text: `현재 계획으로는 ${rows.at(-1)?.month.replace('-', '.')}까지 가족 부채를 모두 갚지 못합니다.` });
    } else if (clearRow.month > f.plan.familyDeadline) {
      out.push({ level: 'warning', text: `가족 부채 완납 예상은 ${clearRow.month.replace('-', '.')}로, 목표(${f.plan.familyDeadline.replace('-', '.')})보다 늦습니다.` });
    } else {
      out.push({ level: 'info', text: `가족 부채 완납 예상: ${clearRow.month.replace('-', '.')} (목표 ${f.plan.familyDeadline.replace('-', '.')})` });
    }
    const start = rows[0]?.month;
    if (start && start <= f.plan.familyDeadline) {
      const n = monthsBetween(start, f.plan.familyDeadline).length;
      const need = Math.ceil(fam.balance / n / 10_000) * 10_000;
      if (need > f.plan.familyMonthlyTarget) {
        out.push({ level: 'info', text: `목표 기한까지 갚으려면 월 약 ${need.toLocaleString('ko-KR')}원이 필요합니다 (${n}개월).` });
      }
    }
  }

  const neg = rows.filter((r) => r.shortfall);
  if (neg.length) out.push({ level: 'danger', text: `${neg[0].month.replace('-', '.')}부터 보유 현금이 마이너스가 됩니다.` });

  const endM = monthOf(contractEnd);
  const atEnd = rows.find((r) => r.month === endM);
  if (atEnd) {
    const monthlyNeed = plan.living + plan.rehab;
    const buffer = atEnd.cash + atEnd.savingsBalance;
    const months = monthlyNeed > 0 ? buffer / monthlyNeed : 0;
    const txt = `계약 종료(${contractEnd.replaceAll('-', '.')}) 시점 예상 현금+저축 ${Math.round(buffer).toLocaleString('ko-KR')}원 — 생활비+변제금 기준 약 ${Math.max(0, months).toFixed(1)}개월분입니다.`;
    out.push({ level: months < 3 ? 'warning' : 'info', text: txt });
  }
  if (f.plan.postContractIncome === 0) {
    out.push({ level: 'info', text: '계약 종료 이후 수입은 0원으로 계산합니다. 확정된 수입이 생기면 계획에 입력하세요.' });
  }
  for (const d of f.debts) {
    if (d.group !== 'family' && debtBalance(d, f.payments) > 0 && d.monthlyPayment === 0) {
      out.push({ level: 'warning', text: `'${d.name}'의 월 납부액이 입력되지 않아 시뮬레이션에서 상환되지 않습니다.` });
    }
  }
  const deposit = f.debts.find((d) => d.group === 'family' && /보증금/.test(d.name) && debtBalance(d, f.payments) > 0);
  if (deposit && (!deposit.plannedMonth || !deposit.fundingSource)) {
    out.push({ level: 'info', text: `'${deposit.name}'의 반환 시점·재원이 아직 비어 있습니다. 부채 항목에서 입력할 수 있습니다.` });
  }
  return out;
}

export function defaultSimRange(today: ISODate): SimInput & { contractEnd: ISODate } {
  const cur = monthOf(today);
  const start = cur < '2026-12' ? '2026-12' : addMonthsYM(cur, 0);
  return { startMonth: start, endMonth: start > '2027-12' ? addMonthsYM(start, 11) : '2027-12', contractEnd: '2027-08-10' };
}
