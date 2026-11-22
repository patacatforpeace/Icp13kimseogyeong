const krw = new Intl.NumberFormat('ko-KR');

export const won = (n: number) => `${krw.format(Math.round(n))}원`;
export const num = (n: number, digits = 0) =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

/** Compact won for chart axes: 1,234만 / 1.2억 */
export function wonShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 100_000_000) return `${sign}${num(a / 100_000_000, 1)}억`;
  if (a >= 10_000) return `${sign}${num(Math.round(a / 10_000))}만`;
  return `${sign}${num(a)}`;
}

export const pct = (ratio: number) => `${Math.round(clamp(ratio, 0, 1) * 100)}%`;
export const kg = (n: number) => `${num(n, 1)}kg`;

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

/** Parse a user-typed amount ("1,400,000" or "140만") into an integer, or null. */
export function parseAmount(raw: string): number | null {
  const s = raw.replace(/[,\s원]/g, '');
  if (!s) return null;
  const man = s.match(/^(-?\d+(?:\.\d+)?)만$/);
  if (man) return Math.round(Number(man[1]) * 10_000);
  if (!/^-?\d+$/.test(s)) return null;
  return Number(s);
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
