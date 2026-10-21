import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Formats the calendar day of an instant in UTC. Dates on the server (SLA
 * deadlines, document validity, undertaking due dates) are UTC-based, so
 * rendering them in UTC keeps the displayed day consistent with the countdown.
 */
export function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Whole calendar days from today (UTC) to the target date; negative when overdue. */
export function daysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((targetUtc - todayUtc) / DAY_MS);
}

export function humanize(value?: string | null) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_SCRUTINY: 'bg-amber-100 text-amber-700',
  RETURNED_TO_INSTITUTION: 'bg-rose-100 text-rose-700',
  EVC_QUEUED: 'bg-purple-100 text-purple-700',
  EVC_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  EVC_COMPLETED: 'bg-teal-100 text-teal-700',
  UNDER_SAC_SHC: 'bg-cyan-100 text-cyan-700',
  PENDING_DECISION: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  APPROVED_WITH_UNDERTAKING: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
  COMPLIANT: 'bg-green-100 text-green-700',
  NON_COMPLIANT: 'bg-red-100 text-red-700',
  PENDING: 'bg-amber-100 text-amber-700',
  ESCALATED: 'bg-red-100 text-red-700',
  VALID: 'bg-green-100 text-green-700',
  EXPIRING_SOON: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-red-100 text-red-700',
  RENEWAL_SUBMITTED: 'bg-blue-100 text-blue-700',
  RENEWAL_VERIFIED: 'bg-green-100 text-green-700',
  RENEWAL_REJECTED: 'bg-red-100 text-red-700',
  QUEUED: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELAYED: 'bg-red-100 text-red-700',
  INFO: 'bg-blue-100 text-blue-700',
  WARNING: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export const STAGES = ['SUBMISSION', 'SCRUTINY', 'EVC', 'SAC_SHC', 'DECISION', 'COMPLETED'];

/**
 * Resolves a stored file path into a URL the browser can fetch.
 * Stored paths are server-relative (e.g. "uploads/x.pdf" or "/uploads/x.pdf");
 * absolute URLs are returned untouched.
 */
export function fileUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `/${path.replace(/^\/+/, '')}`;
}
