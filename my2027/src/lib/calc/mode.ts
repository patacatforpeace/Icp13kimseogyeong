import type { Profile } from '@/data/types';
import { diffDays } from '../date';

export type AppMode = 'pre' | 'beta' | 'execution';

export function appMode(today: string, p: Profile): { mode: AppMode; label: string; detail: string } {
  if (today >= p.executionStart) {
    const day = diffDays(today, p.executionStart) + 1;
    return { mode: 'execution', label: 'EXECUTION', detail: `실행 ${day}일째` };
  }
  if (today >= p.betaStart) {
    const day = diffDays(today, p.betaStart) + 1;
    const left = diffDays(p.executionStart, today);
    return { mode: 'beta', label: 'BETA TEST', detail: `베타 ${day}일째 · 정식 실행까지 ${left}일` };
  }
  return { mode: 'pre', label: 'BETA TEST', detail: `베타 시작까지 ${diffDays(p.betaStart, today)}일` };
}
