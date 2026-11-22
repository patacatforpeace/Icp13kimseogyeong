import { useEffect, useState } from 'react';
import { Input } from './ui';
import { parseAmount } from '@/lib/format';

/** KRW input: shows thousands separators, accepts "140만", reports integers (or null when empty/invalid). */
export function MoneyInput({ value, onChange, id, allowNegative, ...rest }: { value: number | null; onChange: (v: number | null) => void; id?: string; allowNegative?: boolean; placeholder?: string; 'aria-label'?: string; className?: string }) {
  const fmt = (v: number | null) => (v === null || Number.isNaN(v) ? '' : v.toLocaleString('ko-KR'));
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    if (parseAmount(text) !== value) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="relative">
      <Input
        {...rest}
        id={id}
        inputMode="numeric"
        className={`num pr-8 text-right ${rest.className ?? ''}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseAmount(e.target.value);
          onChange(n !== null && (allowNegative || n >= 0) ? n : null);
        }}
        onBlur={() => setText(fmt(parseAmount(text)))}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">원</span>
    </div>
  );
}
