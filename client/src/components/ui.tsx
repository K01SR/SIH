import type { ComponentProps, ReactNode } from 'react';
import { Paperclip, Upload } from 'lucide-react';
import { cn } from '../utils';

/* ------------------------------------------------------------------ *
 *  Surfaces
 * ------------------------------------------------------------------ */
export function Card({
  children,
  className = '',
  flush = false,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[5px] border border-line bg-panel',
        !flush && 'p-5',
        interactive &&
          'transition-colors duration-150 hover:border-[rgba(255,149,31,0.55)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  label,
  title,
  action,
  className = '',
}: {
  label?: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line pb-3.5', className)}>
      <div className="min-w-0">
        {label && <p className="label text-ink-muted">{label}</p>}
        <h3 className="mt-1.5 text-[15px] font-medium leading-snug tracking-[-0.02em] text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Badge / status
 * ------------------------------------------------------------------ */
const DANGER_STATUS = new Set([
  'REJECTED',
  'NON_COMPLIANT',
  'EXPIRED',
  'ESCALATED',
  'CRITICAL',
  'SLA_BREACHED',
  'RETURNED_TO_INSTITUTION',
  'DELAYED',
  'RENEWAL_REJECTED',
]);

const SUCCESS_STATUS = new Set([
  'APPROVED',
  'COMPLETED',
  'COMPLIANT',
  'VALID',
  'ACTIVE',
  'SUCCESS',
  'REALISED',
]);

const WARNING_STATUS = new Set([
  'PENDING',
  'WARNING',
  'DUE_SOON',
  'UNDER_REVIEW',
  'AWAITING_RESPONSE',
  'IN_PROGRESS',
  'OPEN',
  'SUBMITTED',
  'DRAFT',
  'PARTIAL',
]);

const INFO_STATUS = new Set(['INFO', 'SCHEDULED', 'ASSIGNED', 'RESUBMITTED', 'NOT_STARTED']);

export function Badge({
  value,
  className = '',
  marker = true,
}: {
  value?: string | null;
  className?: string;
  marker?: boolean;
}) {
  const key = (value ?? '').toUpperCase();
  const label = value ? value.replace(/_/g, ' ') : '—';
  const tone = DANGER_STATUS.has(key)
    ? 'bg-[rgba(255,138,122,0.10)] text-[#ff9b8d] ring-[rgba(255,138,122,0.28)]'
    : SUCCESS_STATUS.has(key)
      ? 'bg-[rgba(123,216,166,0.10)] text-[#8ce3b5] ring-[rgba(123,216,166,0.28)]'
      : WARNING_STATUS.has(key)
        ? 'bg-[rgba(237,205,140,0.10)] text-value ring-[rgba(237,205,140,0.28)]'
        : INFO_STATUS.has(key)
          ? 'bg-[rgba(255,149,31,0.10)] text-accent ring-[rgba(255,149,31,0.3)]'
          : 'bg-white/5 text-ink-muted ring-line';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] ring-1 ring-inset',
        tone,
        className
      )}
    >
      {marker && <span aria-hidden="true" className="h-1 w-1 rounded-[1px] bg-current" />}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  Stats — ruled data, not floating cards
 * ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  icon,
  sub,
  accent = false,
  className = '',
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  sub?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[5px] border border-line bg-panel p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="label text-ink-muted">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-line bg-white/5 text-ink-muted">
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          'mt-5 font-mono text-[34px] font-medium leading-none tracking-[-0.05em] tabular-nums sm:text-[38px]',
          accent ? 'text-accent' : 'text-value'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-3.5 text-[12px] leading-relaxed text-ink-muted">{sub}</p>}
    </div>
  );
}

export function Meter({
  value,
  max = 100,
  tone = 'ink',
  className = '',
}: {
  value: number;
  max?: number;
  tone?: 'ink' | 'pigment' | 'muted';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = tone === 'pigment' ? 'bg-accent' : tone === 'muted' ? 'bg-[#6c7280]' : 'bg-value';
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-white/5', className)}>
      <div
        className={cn('h-1 rounded-full transition-[width] duration-500 ease-out', bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Buttons
 * ------------------------------------------------------------------ */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  ...props
}: ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'btn focus-ring',
        variant === 'primary' && 'btn-primary',
        variant === 'ghost' && 'btn-ghost',
        variant === 'danger' && 'btn-danger',
        size === 'sm' && 'btn-sm',
        className
      )}
    >
      {loading ? <span className="animate-pulse-soft">···</span> : icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  Form controls
 * ------------------------------------------------------------------ */
export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label mb-2 block text-ink-muted">{label}</label>
      {children}
      {hint && <p className="mt-1.5 font-mono text-[10.5px] text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cn('input focus-ring', className)} />;
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={cn('input focus-ring', className)} />;
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select {...props} className={cn('input focus-ring', className)} />;
}

export function FileUpload({
  fileName,
  uploading = false,
  accept = '.pdf,application/pdf,image/*',
  title = 'Choose a document',
  attachedTitle = 'Document attached',
  hint = 'PDF or image',
  onChange,
  className = '',
}: {
  fileName?: string;
  uploading?: boolean;
  accept?: string;
  title?: string;
  attachedTitle?: string;
  hint?: string;
  onChange: (file?: File) => void;
  className?: string;
}) {
  const attached = Boolean(fileName);
  return (
    <label className={cn('upload-card', className)}>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-line bg-panel',
          attached ? 'text-value' : 'text-muted'
        )}
      >
        {attached ? <Paperclip size={15} /> : <Upload size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium leading-snug text-ink">
          {uploading ? 'Uploading document…' : attached ? attachedTitle : title}
        </span>
        <span
          className={cn(
            'mt-1 block truncate font-mono text-muted',
            attached
              ? 'text-[10.5px] tracking-[0.02em]'
              : 'text-[10px] uppercase tracking-[0.1em]'
          )}
        >
          {uploading ? 'Please wait' : attached ? fileName : hint}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-accent max-[359px]:hidden">
        {uploading ? 'Uploading' : attached ? 'Replace' : 'Browse'}
      </span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ *
 *  Tabs
 * ------------------------------------------------------------------ */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className = '',
}: {
  items: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1 border-b border-line', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative -mb-px flex items-center gap-2 border-b-2 px-1 pb-2.5 pt-1 text-[13px] font-medium transition-colors duration-150',
              active
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] font-medium',
                  active ? 'bg-accent/10 text-accent' : 'bg-white/5 text-ink-muted'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Loading / empty
 * ------------------------------------------------------------------ */
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-16 text-ink-muted">
      <span className="flex items-end gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-[1px] bg-accent [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-[1px] bg-accent [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-[1px] bg-accent [animation-delay:300ms]" />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em]">{label}…</span>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse-soft rounded-[3px] bg-white/5', className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-[5px] border border-line bg-panel">
      <div className="flex gap-4 border-b border-line bg-ground-tint px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line px-4 py-4 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-2.5 flex-1', c === 0 && 'max-w-[120px]')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  message,
  hint,
  icon,
  action,
  className = '',
}: {
  message: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[5px] border border-dashed border-line bg-ground-tint px-6 py-16 text-center',
        className
      )}
    >
      {icon && <div className="mb-4 text-ink-muted">{icon}</div>}
      <p className="text-[14px] font-medium text-ink">{message}</p>
      {hint && <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-ink-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Page header
 * ------------------------------------------------------------------ */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-7 border-b border-line pb-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          {eyebrow && <p className="label text-accent">{eyebrow}</p>}
          <h1 className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-ink sm:text-[34px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-muted">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
