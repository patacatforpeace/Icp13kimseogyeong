import type { Goal } from '@/data/types';

export function goalProgress(g: Goal) {
  const total = g.items.length;
  const done = g.items.filter((i) => i.done).length;
  return { total, done, ratio: total ? done / total : 0 };
}

export function overallGoalProgress(goals: Goal[]) {
  const total = goals.reduce((a, g) => a + g.items.length, 0);
  const done = goals.reduce((a, g) => a + g.items.filter((i) => i.done).length, 0);
  return { total, done, ratio: total ? done / total : 0 };
}

/** Items planned for a given quarter (1-4) across all goals. */
export function quarterItems(goals: Goal[], q: number) {
  return goals.flatMap((g) => g.items.filter((i) => i.quarter === q).map((i) => ({ goal: g, item: i })));
}
