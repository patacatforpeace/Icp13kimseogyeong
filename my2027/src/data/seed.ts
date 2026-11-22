import type {
  AppState,
  CalendarEvent,
  EventCategory,
  Goal,
  GoalArea,
  GoalItem,
  Habit,
  QuarterPlan,
} from './types';
import { todayISO } from '@/lib/date';
import { uid } from '@/lib/format';

export const GOAL_AREAS: { area: GoalArea; no: string; label: string; short: string }[] = [
  { area: 'health', no: '01', label: 'Health & Body', short: '건강' },
  { area: 'emotion', no: '02', label: 'Emotion & Lifestyle', short: '감정·생활' },
  { area: 'career', no: '03', label: 'Career & Work', short: '커리어' },
  { area: 'finance', no: '04', label: 'Finance & Economy', short: '재정' },
  { area: 'learning', no: '05', label: 'Learning & Development', short: '학습' },
  { area: 'relationships', no: '06', label: 'Relationships', short: '관계' },
];

export const QUARTER_THEMES = ['기반 구축', '성과 만들기', '계약 종료 및 전환 준비', '안정과 정착'];

export const EVENT_CATEGORIES: { key: EventCategory; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'english', label: 'English' },
  { key: 'finance', label: 'Finance' },
  { key: 'personal', label: 'Personal' },
  { key: 'rest', label: 'Rest' },
  { key: 'event', label: 'Event' },
];

const q = (plan = ''): QuarterPlan => ({ plan, result: '' });
const items = (rows: [string, number][]): GoalItem[] =>
  rows.map(([text, quarter]) => ({ id: uid(), text, done: false, quarter }));

function goal(
  area: GoalArea,
  title: string,
  yearGoal: string,
  rows: [string, number][],
  quarters: [string, string, string, string],
  description = '',
): Goal {
  return {
    id: uid(),
    area,
    title,
    yearGoal,
    description,
    start: '2027-01-01',
    end: '2027-12-31',
    items: items(rows),
    quarters: [q(quarters[0]), q(quarters[1]), q(quarters[2]), q(quarters[3])],
    memo: '',
  };
}

export function seedGoals(): Goal[] {
  return [
    goal(
      'health',
      'Health & Body',
      '건강한 체중과 체형을 만들고 근력 및 러닝 능력을 향상한다.',
      [
        ['근력운동 주 3회 루틴 정착', 1],
        ['유산소 운동 주 2회 루틴 정착', 1],
        ['체중 53kg 도달', 2],
        ['10km 러닝 기록 측정 및 유지', 2],
        ['체중 50kg 도달', 3],
        ['둔근 운동 중량 단계적 증가', 3],
        ['목표 체중 47kg 도달', 4],
        ['10km 러닝 개인 기록 갱신', 4],
      ],
      ['주 5회 운동 루틴 고정', '체중 감량 속도 유지', '러닝 거리 유지', '목표 체중 근접 및 유지'],
      '현재 체중 56.5kg → 목표 47kg. 근력운동 주 3회, 유산소 주 2회, 10km 러닝 능력 유지·향상, 둔근 발달.',
    ),
    goal(
      'emotion',
      'Emotion & Lifestyle',
      '자기비난을 줄이고 자존감을 높이며, 규칙적인 생활과 충동 조절을 통해 통제감과 자기효능감을 느낀다.',
      [
        ['매일 감정 기록 습관 만들기', 1],
        ['자기비난 순간 기록하고 다르게 말해보기', 1],
        ['취침·기상 시간 일정하게 유지', 1],
        ['충동 조절 성공 사례 30개 기록', 2],
        ['주간 리뷰 12주 연속 작성', 2],
        ['계약 종료 전후 생활 리듬 유지', 3],
        ['한 해 동안 잘 해낸 일 목록 정리', 4],
      ],
      ['기록 습관 만들기', '패턴 관찰', '전환기 생활 리듬 지키기', '자기효능감 돌아보기'],
      '자기비난 감소, 자존감 향상, 규칙적인 생활, 충동적인 행동 줄이기, 자기효능감 향상.',
    ),
    goal(
      'career',
      'Career & Work',
      'WYD에서의 실무 경험을 확실한 경력으로 만들고, 계약 종료 이후에도 안정적인 수입을 확보할 수 있는 직업적 기반을 갖춘다.',
      [
        ['월별 실무 성과 기록 시작', 1],
        ['봉사자 관리 프로세스 정리', 1],
        ['행사 운영 사례 정리', 2],
        ['이력서 업데이트', 2],
        ['포트폴리오 정리', 2],
        ['다음 직업 방향 결정 및 지원 시작', 3],
        ['계약 종료(8.10) 인수인계 완료', 3],
        ['새 직장 또는 안정적인 수입원 확보', 4],
      ],
      ['성과 기록 체계 만들기', '이력서·포트폴리오 완성', '전환 준비 및 지원', '새 자리에서 안정'],
      '업무 역량 강화, 실무 성과 기록, 봉사자 관리 및 행사 운영 역량 강화, 이력서와 포트폴리오, 다음 직업 준비. 계약 종료일 2027.08.10.',
    ),
    goal(
      'finance',
      'Finance & Economy',
      '가족 부채를 정리하고 비상금을 확보해 경제적으로 안정된다.',
      [
        ['월별 예산 관리 시작', 1],
        ['어머니 차용금 상환 완료', 1],
        ['여동생 차용금 상환 완료', 2],
        ['여동생 보증금 반환 계획 확정', 2],
        ['계약 종료 대비 비상금 마련', 3],
        ['개인회생 변제 매월 납부 유지', 0],
        ['저축은행 잔액 상환', 4],
      ],
      ['예산과 상환 시작', '가족 부채 집중 상환', '비상금 확보', '안정적 현금 흐름'],
      '가족 부채 상환, 개인회생 변제 지속, 비상금 마련, 월별 예산 관리, 추가 수입 관리. 가족 부채 2027년 6월까지 상환 목표.',
    ),
    goal(
      'learning',
      'Learning & Development',
      '영어 문법과 표현력을 개선하고 일상 및 업무에서 자연스럽고 정확하게 영어를 사용한다.',
      [
        ['해커스톡 100일 출석 챌린지 완주 (2027.03.10)', 1],
        ['기초 문법 한 권 끝내기', 2],
        ['업무 영어 표현 100개 정리', 2],
        ['영어 회화 주 1회 이상 연습', 3],
        ['업무에서 영어 이메일 스스로 작성', 4],
      ],
      ['100일 챌린지 완주', '문법·표현 쌓기', '회화 연습', '실전 사용'],
      '해커스톡 100일 출석, 문법, 회화, 실생활 및 업무 영어 표현 축적.',
    ),
    goal(
      'relationships',
      'Relationships',
      '가족 및 친구들과 좋은 관계를 유지하고 소중한 사람들에게 관심과 애정을 표현한다.',
      [
        ['친구 생일과 기념일 캘린더에 등록', 1],
        ['가족과 월 1회 이상 시간 보내기', 0],
        ['친구에게 먼저 연락하기 (월 2회)', 0],
        ['감사 표현 편지 쓰기', 4],
      ],
      ['기념일 정리', '먼저 연락하기', '바쁜 시기에도 안부 묻기', '한 해 고마움 전하기'],
      '친구 생일 챙기기, 중요한 기념일 관리, 가족과 시간 보내기, 친구들에게 먼저 연락하기.',
    ),
  ];
}

export function seedHabits(today: string): Habit[] {
  const rows: [string, number][] = [
    ['영어 공부', 7],
    ['운동', 5],
    ['물 마시기', 7],
    ['자기비난 기록', 7],
    ['충동 조절', 7],
    ['일기 작성', 7],
    ['규칙적인 취침', 7],
  ];
  return rows.map(([name, targetPerWeek]) => ({ id: uid(), name, targetPerWeek, active: true, createdAt: today }));
}

/** Default weekly routine, starting with the first matching weekday of the beta period. */
export function seedRoutine(): CalendarEvent[] {
  // 2026-12-07 is a Monday.
  const rows: [string, string, EventCategory][] = [
    ['2026-12-07', '하체·둔근 근력운동', 'exercise'],
    ['2026-12-01', '러닝', 'exercise'],
    ['2026-12-02', '상체·코어 근력운동', 'exercise'],
    ['2026-12-03', '러닝', 'exercise'],
    ['2026-12-04', '자유시간 및 휴식', 'rest'],
    ['2026-12-05', '하체·둔근 근력운동 및 자유시간', 'exercise'],
    ['2026-12-06', '요가, 집안일, 주간 리뷰', 'personal'],
  ];
  return rows.map(([date, title, category]) => ({
    id: uid(),
    title,
    date,
    category,
    repeat: 'weekly',
    note: '기본 주간 패턴',
    completed: [],
    skipped: [],
    routine: true,
  }));
}

function oneOff(date: string, title: string, category: EventCategory, note = ''): CalendarEvent {
  return { id: uid(), title, date, category, repeat: 'none', note, completed: [], skipped: [] };
}

export function createSeedState(): AppState {
  const today = todayISO();
  return {
    version: 1,
    updatedAt: Date.now(),
    profile: {
      name: '',
      todayFocus: '오늘 할 수 있는 만큼만, 꾸준히.',
      contractEnd: '2027-08-10',
      betaStart: '2026-12-01',
      executionStart: '2027-01-01',
    },
    settings: { theme: 'system' },
    goals: seedGoals(),
    events: [
      ...seedRoutine(),
      oneOff('2026-12-01', 'BETA TEST 시작 · 영어 100일 챌린지 1일차', 'event'),
      oneOff('2027-01-01', 'EXECUTION 시작', 'event'),
      oneOff('2027-03-10', '영어 100일 챌린지 100일째', 'english'),
      oneOff('2027-08-10', 'WYD 계약 종료일', 'work'),
    ],
    habits: seedHabits(today),
    habitLogs: {},
    health: {
      startWeight: 56.5,
      targetWeight: 47,
      startDate: today,
      strengthPerWeek: 3,
      cardioPerWeek: 2,
    },
    weights: [{ id: uid(), date: today, kg: 56.5, note: '초기 입력값' }],
    workouts: [],
    finance: {
      plan: {
        monthlyNetIncome: 3_250_000,
        livingBudget: [
          { id: uid(), name: '월세', amount: 650_000 },
          { id: uid(), name: '공과금 및 통신비', amount: 200_000 },
          { id: uid(), name: '보험', amount: 150_000 },
          { id: uid(), name: '교통비', amount: 70_000 },
          { id: uid(), name: '식비', amount: 300_000 },
          { id: uid(), name: '기타 생활비', amount: 130_000 },
        ],
        familyMonthlyTarget: 1_400_000,
        familyDeadline: '2027-06',
        monthlySavingsTarget: 0,
        postContractIncome: 0,
        openingCash: 0,
      },
      incomes: [],
      expenses: [],
      debts: [
        {
          id: uid(),
          name: '개인회생 변제금',
          creditor: '개인회생',
          group: 'rehab',
          principal: 5_130_000,
          openingBalance: 5_130_000,
          monthlyPayment: 230_000,
          installments: 23,
          note: '잔여 약 23회 (대략적인 수치, 실제 잔액으로 수정하세요)',
        },
        {
          id: uid(),
          name: '여동생 차용금',
          creditor: '여동생',
          group: 'family',
          principal: 5_760_000,
          openingBalance: 5_760_000,
          monthlyPayment: 0,
          note: '대략적인 수치',
        },
        {
          id: uid(),
          name: '여동생 보증금 반환',
          creditor: '여동생',
          group: 'family',
          principal: 3_840_000,
          openingBalance: 3_840_000,
          monthlyPayment: 0,
          plannedMonth: '',
          fundingSource: '',
          note: '여동생에게 돌려줘야 하는 채무. 반환 재원과 시점을 직접 입력하세요.',
        },
        {
          id: uid(),
          name: '어머니 차용금',
          creditor: '어머니',
          group: 'family',
          principal: 4_000_000,
          openingBalance: 4_000_000,
          monthlyPayment: 0,
          note: '대략적인 수치',
        },
        {
          id: uid(),
          name: '저축은행',
          creditor: '저축은행',
          group: 'other',
          principal: 760_000,
          openingBalance: 760_000,
          monthlyPayment: 0,
          note: '월 납부액을 입력하세요',
        },
      ],
      payments: [],
      savingsGoals: [{ id: uid(), name: '비상금', kind: 'emergency', target: 4_500_000 }],
      savingsTxns: [],
    },
    english: {
      challengeName: '해커스톡 100일 출석 챌린지',
      start: '2026-12-01',
      days: 100,
      refundNote: '',
      attendance: {},
      logs: [],
      expressions: [],
    },
    journal: [],
    reviews: { weekly: [], monthly: [], quarterly: [] },
  };
}
