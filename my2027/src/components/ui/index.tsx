import { AlertTriangle, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { clamp } from '@/lib/format';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

// ── Layout primitives ───────────────────────────────────────────────────
export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-2 px-5 pt-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx('px-5 pb-5', title || action ? 'pt-3' : 'pt-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, children }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card flex flex-col p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="num mt-1.5 whitespace-nowrap text-[clamp(20px,2.2vw,24px)] font-semibold tracking-tight">{value}</p>
      {sub && <p className="num mt-1 text-xs text-muted">{sub}</p>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

export function Progress({ value, tone = 'ink', label }: { value: number; tone?: 'ink' | 'success' | 'warning' | 'danger' | 'accent'; label?: string }) {
  const v = clamp(value, 0, 1);
  const color = { ink: 'bg-ink', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', accent: 'bg-accent' }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ink' | 'success' | 'warning' | 'danger' }) {
  const cls = {
    neutral: 'border-line text-muted',
    ink: 'border-ink bg-ink text-surface',
    success: 'border-success/30 text-success',
    warning: 'border-warning/40 text-warning',
    danger: 'border-danger/30 text-danger',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide', cls)}>{children}</span>;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ level, children }: { level: 'danger' | 'warning' | 'info'; children: ReactNode }) {
  const Icon = level === 'danger' ? XCircle : level === 'warning' ? AlertTriangle : Info;
  const cls = { danger: 'text-danger', warning: 'text-warning', info: 'text-muted' }[level];
  return (
    <div className="flex gap-2.5 py-2 text-sm">
      <Icon size={16} className={cx('mt-0.5 shrink-0', cls)} aria-hidden />
      <span className="sr-only">{level === 'danger' ? '위험' : level === 'warning' ? '주의' : '참고'}:</span>
      <p>{children}</p>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-line bg-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-[34px] rounded-md px-3 text-sm font-medium', value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Form controls ───────────────────────────────────────────────────────
export function Button({ variant = 'secondary', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button type="button" className={cx('btn', `btn-${variant}`, className)} {...rest} />;
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx('input', p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx('input', p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cx('input min-h-[84px] py-2', p.className)} />;

export function Check({ checked, onChange, label, size = 22 }: { checked: boolean; onChange: (v: boolean) => void; label: string; size?: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex shrink-0 items-center justify-center rounded-md p-[9px] -m-[9px]"
    >
      <span
        className={cx('flex items-center justify-center rounded-md border transition-colors', checked ? 'border-ink bg-ink text-surface' : 'border-line bg-surface hover:border-muted')}
        style={{ width: size, height: size }}
      >
        {checked && (
          <svg viewBox="0 0 16 16" width={size * 0.6} height={size * 0.6} aria-hidden>
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function Scale({ value, onChange, min, max, label, labels }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string; labels?: string[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          title={labels?.[v - min]}
          onClick={() => onChange(v)}
          className={cx('num h-10 min-w-10 rounded-lg border px-2 text-sm', value === v ? 'border-ink bg-ink text-surface' : 'border-line hover:bg-subtle')}
        >
          {labels ? labels[v - min] : v}
        </button>
      ))}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface sm:rounded-2xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button data-close className="btn-icon" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = '삭제', onConfirm, onClose }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-muted">{message}</div>
    </Modal>
  );
}

/** Small helper: confirm-before-delete state. */
export function useConfirm() {
  const [pending, setPending] = useState<{ title: string; message: ReactNode; run: () => void } | null>(null);
  const ask = useCallback((title: string, message: ReactNode, run: () => void) => setPending({ title, message, run }), []);
  const dialog = <ConfirmDialog open={!!pending} title={pending?.title ?? ''} message={pending?.message} onConfirm={() => pending?.run()} onClose={() => setPending(null)} />;
  return { ask, dialog };
}

// ── Toast ───────────────────────────────────────────────────────────────
const ToastCtx = createContext<(msg: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 lg:bottom-6">
        {msg && <div className="rounded-lg bg-ink px-4 py-2.5 text-sm text-surface shadow-lg">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}
