import { challengeDates } from '@/lib/calc/english';
import type { EnglishState } from '@/data/types';
import { fmtDate } from '@/lib/date';
import { cx } from './ui';

export function EnglishGrid({ e, today, compact }: { e: EnglishState; today: string; compact?: boolean }) {
  const dates = challengeDates(e);
  return (
    <div>
      <ol className={cx('grid gap-1', compact ? 'grid-cols-[repeat(20,minmax(0,1fr))]' : 'grid-cols-10')} aria-label="100일 출석 그리드">
        {dates.map((d, i) => {
          const done = !!e.attendance[d];
          const isToday = d === today;
          const past = d < today;
          return (
            <li
              key={d}
              title={`${i + 1}일차 · ${fmtDate(d)}${done ? ' · 출석' : ''}`}
              aria-label={`${i + 1}일차 ${fmtDate(d)} ${done ? '출석' : past ? '기록 없음' : '예정'}`}
              className={cx(
                'num flex aspect-square items-center justify-center rounded-[4px] text-[10px]',
                done ? 'bg-ink text-surface' : past ? 'bg-subtle text-muted/60' : 'border border-line text-muted/60',
                isToday && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
              )}
            >
              {!compact && i + 1}
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-ink" />출석</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-subtle" />지난 날</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm border border-line" />남은 날</span>
      </div>
    </div>
  );
}
