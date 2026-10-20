import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysUntil(value?: string | null) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
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
