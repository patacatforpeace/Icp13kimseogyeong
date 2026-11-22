// Domain model for MY 2027.
// Every date is stored as an ISO calendar date string (YYYY-MM-DD) in Asia/Seoul time.
// Every amount of money is an integer number of KRW.

export type ISODate = string;
export type YearMonth = string; // YYYY-MM
export type ID = string;

export type ThemePref = 'system' | 'light' | 'dark';

export interface Profile {
  name: string;
  todayFocus: string;
  contractEnd: ISODate;
  betaStart: ISODate;
  executionStart: ISODate;
}

export interface Settings {
  theme: ThemePref;
}

// ── Goals ────────────────────────────────────────────────────────────────
export type GoalArea = 'health' | 'emotion' | 'career' | 'finance' | 'learning' | 'relationships';

export interface GoalItem {
  id: ID;
  text: string;
  done: boolean;
  doneAt?: ISODate;
  /** Quarter this item belongs to (1-4); 0 means the whole year. */
  quarter: number;
}

export interface QuarterPlan {
  plan: string;
  result: string;
}

export interface Goal {
  id: ID;
  area: GoalArea;
  title: string;
  yearGoal: string;
  description: string;
  start: ISODate;
  end: ISODate;
  items: GoalItem[];
  quarters: [QuarterPlan, QuarterPlan, QuarterPlan, QuarterPlan];
  memo: string;
}

// ── Calendar ─────────────────────────────────────────────────────────────
export type EventCategory = 'work' | 'exercise' | 'english' | 'finance' | 'personal' | 'rest' | 'event';
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: ID;
  title: string;
  date: ISODate;
  time?: string; // HH:mm
  category: EventCategory;
  repeat: Repeat;
  repeatUntil?: ISODate;
  note: string;
  /** Occurrence dates marked complete. For one-off events this holds at most the event date. */
  completed: ISODate[];
  /** Occurrence dates removed from a repeating series. */
  skipped: ISODate[];
  /** Part of the default weekly routine (editable from Settings). */
  routine?: boolean;
}

// ── Habits ───────────────────────────────────────────────────────────────
export interface Habit {
  id: ID;
  name: string;
  /** Target days per week (1-7). */
  targetPerWeek: number;
  active: boolean;
  createdAt: ISODate;
}

/** habitId → { date → true } */
export type HabitLogs = Record<ID, Record<ISODate, true>>;

// ── Health ───────────────────────────────────────────────────────────────
export interface WeightEntry {
  id: ID;
  date: ISODate;
  kg: number;
  note: string;
}

export type WorkoutType = 'strength' | 'running' | 'yoga' | 'walking' | 'other';

export interface StrengthSet {
  id: ID;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface Workout {
  id: ID;
  date: ISODate;
  type: WorkoutType;
  minutes: number;
  distanceKm?: number;
  exercises: StrengthSet[];
  intensity: number; // 1-5
  condition: number; // 1-5
  memo: string;
}

export interface HealthSettings {
  startWeight: number;
  targetWeight: number;
  startDate: ISODate;
  strengthPerWeek: number;
  cardioPerWeek: number;
}

// ── Finance ──────────────────────────────────────────────────────────────
export interface BudgetLine {
  id: ID;
  name: string;
  amount: number;
}

export type IncomeCategory = 'salary' | 'freelance' | 'other';

export interface Income {
  id: ID;
  date: ISODate;
  amount: number;
  category: IncomeCategory;
  memo: string;
}

export type ExpenseKind = 'fixed' | 'variable';

export interface Expense {
  id: ID;
  date: ISODate;
  amount: number;
  kind: ExpenseKind;
  category: string;
  memo: string;
}

export type DebtGroup = 'family' | 'rehab' | 'other';

export interface Debt {
  id: ID;
  name: string;
  creditor: string;
  group: DebtGroup;
  /** Original principal, for reference only. */
  principal: number;
  /** Balance at the moment tracking started. The current balance is this minus recorded payments. */
  openingBalance: number;
  monthlyPayment: number;
  /** Day of month the payment is due (1-31), optional. */
  dueDay?: number;
  /** Remaining number of installments at tracking start (rehab plans), optional. */
  installments?: number;
  /** When the user plans to repay (e.g. deposit return). Free text month YYYY-MM. */
  plannedMonth?: YearMonth;
  /** Where the money will come from (e.g. deposit return). Free text. */
  fundingSource?: string;
  note: string;
  closed?: boolean;
}

export interface DebtPayment {
  id: ID;
  debtId: ID;
  date: ISODate;
  amount: number;
  memo: string;
}

export interface SavingsGoal {
  id: ID;
  name: string;
  kind: 'emergency' | 'saving';
  target: number;
}

export interface SavingsTxn {
  id: ID;
  goalId: ID;
  date: ISODate;
  /** Positive = deposit, negative = withdrawal. */
  amount: number;
  memo: string;
}

export interface FinancePlan {
  monthlyNetIncome: number;
  livingBudget: BudgetLine[];
  familyMonthlyTarget: number;
  familyDeadline: YearMonth;
  monthlySavingsTarget: number;
  /** Expected monthly income after the contract ends. Defaults to 0: nothing is assumed. */
  postContractIncome: number;
  /** Cash on hand at tracking start. */
  openingCash: number;
}

export interface FinanceState {
  plan: FinancePlan;
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  payments: DebtPayment[];
  savingsGoals: SavingsGoal[];
  savingsTxns: SavingsTxn[];
}

// ── English ──────────────────────────────────────────────────────────────
export type StudyKind = 'grammar' | 'speaking' | 'expression' | 'listening' | 'other';

export interface StudyLog {
  id: ID;
  date: ISODate;
  kind: StudyKind;
  minutes: number;
  content: string;
}

export interface Expression {
  id: ID;
  date: ISODate;
  phrase: string;
  meaning: string;
  example: string;
}

export interface EnglishState {
  challengeName: string;
  start: ISODate;
  days: number;
  refundNote: string;
  attendance: Record<ISODate, true>;
  logs: StudyLog[];
  expressions: Expression[];
}

// ── Journal ──────────────────────────────────────────────────────────────
export type ImpulseOutcome = 'stopped' | 'partly' | 'acted';

export interface JournalEntry {
  id: ID;
  date: ISODate;
  mood: number; // 1-5
  intensity: number; // 1-10
  selfBlame: boolean;
  selfBlameNote: string;
  impulse: boolean;
  impulseOutcome?: ImpulseOutcome;
  impulseNote: string;
  wins: string;
  gratitude: string;
  memo: string;
}

// ── Review ───────────────────────────────────────────────────────────────
export interface WeeklyReview {
  id: ID;
  weekStart: ISODate; // Monday
  kept: string;
  brokeWhy: string;
  best: string;
  improve: string;
  nextFocus: string;
}

export interface MonthlyReview {
  id: ID;
  month: YearMonth;
  achievements: string;
  improvements: string;
  note: string;
}

export interface QuarterlyReview {
  id: ID;
  quarter: number; // 1-4 (of 2027)
  summary: string;
  nextActions: string;
}

export interface ReviewState {
  weekly: WeeklyReview[];
  monthly: MonthlyReview[];
  quarterly: QuarterlyReview[];
}

// ── Root ─────────────────────────────────────────────────────────────────
export interface AppState {
  version: 1;
  updatedAt: number;
  profile: Profile;
  settings: Settings;
  goals: Goal[];
  events: CalendarEvent[];
  habits: Habit[];
  habitLogs: HabitLogs;
  health: HealthSettings;
  weights: WeightEntry[];
  workouts: Workout[];
  finance: FinanceState;
  english: EnglishState;
  journal: JournalEntry[];
  reviews: ReviewState;
}

export type SliceKey = Exclude<keyof AppState, 'version' | 'updatedAt'>;

export const SLICE_KEYS: SliceKey[] = [
  'profile',
  'settings',
  'goals',
  'events',
  'habits',
  'habitLogs',
  'health',
  'weights',
  'workouts',
  'finance',
  'english',
  'journal',
  'reviews',
];
