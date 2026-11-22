import { BookOpen, CalendarDays, CheckSquare, ClipboardList, HeartPulse, Languages, LayoutDashboard, Settings, Target, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  /** Hash used in the address bar. Plain names only (artifact hosting passes #name, not #/path). */
  hash: string;
  label: string;
  ko: string;
  icon: LucideIcon;
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { path: '/', hash: 'dashboard', label: 'Dashboard', ko: '대시보드', icon: LayoutDashboard, mobile: true },
  { path: '/goals', hash: 'goals', label: 'Goals', ko: '연간 목표', icon: Target },
  { path: '/calendar', hash: 'calendar', label: 'Calendar', ko: '일정', icon: CalendarDays, mobile: true },
  { path: '/habits', hash: 'habits', label: 'Habits', ko: '습관', icon: CheckSquare, mobile: true },
  { path: '/health', hash: 'health', label: 'Health & Fitness', ko: '건강·운동', icon: HeartPulse },
  { path: '/finance', hash: 'finance', label: 'Finance', ko: '재정', icon: Wallet, mobile: true },
  { path: '/english', hash: 'english', label: 'English', ko: '영어', icon: Languages },
  { path: '/journal', hash: 'journal', label: 'Journal', ko: '기록', icon: BookOpen },
  { path: '/review', hash: 'review', label: 'Review', ko: '회고', icon: ClipboardList },
  { path: '/settings', hash: 'preferences', label: 'Settings', ko: '설정', icon: Settings },
];

export const pathFromHash = (h: string) => NAV.find((n) => n.hash === h.replace(/^#\/?/, ''))?.path ?? '/';
export const hashFromPath = (p: string) => NAV.find((n) => n.path === p)?.hash ?? 'dashboard';
