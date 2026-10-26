import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Field,
  Input,
  PageHeader,
  Select,
  TableSkeleton,
  EmptyState,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { formatDate, humanize, daysUntil } from '../utils';
import type { Application, Institution } from '../types';
import { useToast } from '../context/ToastContext';

const STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_SCRUTINY',
  'RETURNED_TO_INSTITUTION',
  'EVC_QUEUED',
  'EVC_SCHEDULED',
  'EVC_COMPLETED',
  'UNDER_SAC_SHC',
  'PENDING_DECISION',
  'APPROVED',
  'APPROVED_WITH_UNDERTAKING',
  'REJECTED',
  'WITHDRAWN',
];

function daysTone(d: number | null) {
  if (d === null) return 'bg-gray-300';
  if (d < 0) return 'bg-red-500';
  if (d <= 3) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function ApplicationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<'newest' | 'sla'>('newest');
  const [showNew, setShowNew] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const load = () => {
    setLoading(true);
    api
      .get('/applications')
      .then((res) => setApps(res.data.data))
      .catch((err) => push(apiError(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (user?.role !== 'INSTITUTION') {
      api.get('/institutions').then((res) => setInstitutions(res.data.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const list = apps.filter((a) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !query ||
        a.applicationNumber.toLowerCase().includes(q) ||
        a.institution?.name.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
    return list.sort((a, b) => {
      if (sort === 'sla') {
        return (daysUntil(a.slaDueAt) ?? 9999) - (daysUntil(b.slaDueAt) ?? 9999);
      }
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  }, [apps, query, statusFilter, sort]);

  const isInstitution = user?.role === 'INSTITUTION';
  const breached = apps.filter((a) => a.isBreached).length;
  const pending = apps.filter((a) => !['APPROVED', 'APPROVED_WITH_UNDERTAKING', 'REJECTED', 'WITHDRAWN'].includes(a.status)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Register"
        title="Applications"
        subtitle={
          isInstitution
            ? 'Your applications and their current position in the approval chain.'
            : 'Every application in your scope, ordered against its statutory SLA.'
        }
        actions={
          isInstitution && (
            <Button variant="primary" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>
              New Application
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[5px] border border-line bg-panel p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-gray-500">In register</p>
          <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight text-gray-900">{apps.length}</p>
        </div>
        <div className="rounded-[5px] border border-line bg-panel p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-gray-500">In progress</p>
          <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight text-gray-900">{pending}</p>
        </div>
        <div className="rounded-[5px] border border-line bg-panel p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-gray-500">SLA breached</p>
          <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight text-red-600">{breached}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search application number or institution"
            className="pl-9"
            aria-label="Search applications"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-gray-400" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="min-w-[180px]"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'sla')}
          aria-label="Sort applications"
          className="min-w-[150px]"
        >
          <option value="newest">Newest first</option>
          <option value="sla">SLA due first</option>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={apps.length === 0 ? 'No applications registered' : 'No matching applications'}
          hint={
            apps.length === 0
              ? ' Applications submitted by institutions will appear here.'
              : 'Adjust the search or status filter to widen the result.'
          }
          action={
            (query || statusFilter) && (
              <Button
                size="sm"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[5px] border border-line bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Application', 'Institution', 'Stage', 'Status', 'SLA'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-gray-500 ${i === 1 ? 'hidden md:table-cell' : ''} ${
                        i === 2 ? 'hidden lg:table-cell' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-10 px-2" aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const d = daysUntil(a.slaDueAt);
                  const urgent = d !== null && d <= 3;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigate(`/applications/${a.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/applications/${a.id}`);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open application ${a.applicationNumber}`}
                      className="group cursor-pointer border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-[12.5px] font-semibold text-gray-900">{a.applicationNumber}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {humanize(a.assignedRegion)} · {humanize(a.programType)}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3.5 text-[12.5px] text-gray-600 md:table-cell">
                        {a.institution?.name ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3.5 text-[12.5px] text-gray-600 lg:table-cell">
                        {humanize(a.currentStage)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge value={a.status} />
                          {a.isBreached && <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Breached</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`text-[12.5px] ${urgent ? 'font-medium text-red-600' : 'text-gray-600'}`}>
                          {formatDate(a.slaDueAt)}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`h-1.5 w-12 rounded-full ${daysTone(d)}`} />
                          <span className="text-[10.5px] text-gray-500">
                            {d === null
                              ? '—'
                              : d < 0
                                ? `${Math.abs(d)}d overdue`
                                : `${d}d left`}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3.5">
                        <ArrowUpRight
                          size={14}
                          className="text-gray-300 transition-colors group-hover:text-blue-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-[11px] font-medium text-gray-500">Showing {filtered.length} of {apps.length}</p>
            <p className="text-[11px] text-gray-400">Sorted by {sort === 'sla' ? 'SLA due' : 'recency'}</p>
          </div>
        </div>
      )}

      {showNew && (
        <NewApplicationModal
          institutions={institutions}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            push('Application submitted');
            load();
          }}
        />
      )}
    </div>
  );
}

function NewApplicationModal({
  institutions,
  onClose,
  onCreated,
}: {
  institutions: Institution[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [programType, setProgramType] = useState('ENGINEERING');
  const [routeType, setRouteType] = useState('SCRUTINY_EVC');
  const [institutionId, setInstitutionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/applications', {
        academicYear,
        programType,
        routeType,
        institutionId: user?.role === 'INSTITUTION' ? undefined : institutionId,
      });
      onCreated();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Submit New Application" eyebrow="Register" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {user?.role !== 'INSTITUTION' && (
          <Field label="Institution">
            <Select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required>
              <option value="">Select institution</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Academic Year">
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} required />
        </Field>
        <Field label="Program Type">
          <Select value={programType} onChange={(e) => setProgramType(e.target.value)}>
            {['ENGINEERING', 'MANAGEMENT', 'PHARMACY', 'ARCHITECTURE', 'POLYTECHNIC', 'UNIVERSITY'].map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Processing Route (per APH)">
          <Select value={routeType} onChange={(e) => setRouteType(e.target.value)}>
            <option value="SCRUTINY_EVC">Scrutiny + EVC</option>
            <option value="ONLY_SCRUTINY">Only Scrutiny</option>
            <option value="ONLY_EVC">Only EVC</option>
            <option value="EVC_SAC_SHC">EVC + SAC/SHC</option>
            <option value="SCRUTINY_SAC_SHC">Scrutiny + SAC/SHC</option>
            <option value="NEW_INSTITUTION">New Institution (full)</option>
          </Select>
        </Field>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Submitting' : 'Submit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
