import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Card, PageHeader, Spinner, EmptyState } from '../components/ui';
import { formatDate, humanize, daysUntil } from '../utils';
import type { Application, Institution } from '../types';
import { useToast } from '../context/ToastContext';

export function ApplicationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const load = () => {
    setLoading(true);
    api
      .get('/applications')
      .then((res) => setApps(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (user?.role !== 'INSTITUTION') {
      api.get('/institutions').then((res) => setInstitutions(res.data.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = apps.filter((a) => {
    const matchesQuery =
      !query ||
      a.applicationNumber.toLowerCase().includes(query.toLowerCase()) ||
      a.institution?.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || a.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const isInstitution = user?.role === 'INSTITUTION';

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle={isInstitution ? 'Your applications and their current status' : 'All applications across your scope'}
        actions={
          isInstitution && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} /> New Application
            </button>
          )
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by application number or institution"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All statuses</option>
            {['SUBMITTED', 'UNDER_SCRUTINY', 'EVC_QUEUED', 'EVC_SCHEDULED', 'UNDER_SAC_SHC', 'PENDING_DECISION', 'APPROVED', 'APPROVED_WITH_UNDERTAKING', 'REJECTED'].map((s) => (
              <option key={s} value={s}>{humanize(s)}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState message="No applications found" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const d = daysUntil(a.slaDueAt);
                return (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/applications/${a.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{a.applicationNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{a.institution?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{humanize(a.assignedRegion)}</td>
                    <td className="px-4 py-3 text-slate-600">{humanize(a.currentStage)}</td>
                    <td className="px-4 py-3">
                      <Badge value={a.status} />
                      {a.isBreached && <span className="ml-2 text-xs font-semibold text-red-600">BREACHED</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${d !== null && d < 0 ? 'text-red-600' : d !== null && d <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {formatDate(a.slaDueAt)}
                        {d !== null && <span className="ml-1">({d < 0 ? `${Math.abs(d)}d over` : `${d}d left`})</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
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
    <Modal title="Submit New Application" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {user?.role !== 'INSTITUTION' && (
          <Field label="Institution">
            <select
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select institution</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Academic Year">
          <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
        </Field>
        <Field label="Program Type">
          <select value={programType} onChange={(e) => setProgramType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {['ENGINEERING', 'MANAGEMENT', 'PHARMACY', 'ARCHITECTURE', 'POLYTECHNIC', 'UNIVERSITY'].map((t) => (
              <option key={t} value={t}>{humanize(t)}</option>
            ))}
          </select>
        </Field>
        <Field label="Processing Route (per APH)">
          <select value={routeType} onChange={(e) => setRouteType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="SCRUTINY_EVC">Scrutiny + EVC</option>
            <option value="ONLY_SCRUTINY">Only Scrutiny</option>
            <option value="ONLY_EVC">Only EVC</option>
            <option value="EVC_SAC_SHC">EVC + SAC/SHC</option>
            <option value="SCRUTINY_SAC_SHC">Scrutiny + SAC/SHC</option>
            <option value="NEW_INSTITUTION">New Institution (full)</option>
          </select>
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({ title, children, onClose, maxWidth = 'max-w-lg' }: { title: string; children: React.ReactNode; onClose: () => void; maxWidth?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className={`w-full ${maxWidth} rounded-xl bg-white p-6 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
