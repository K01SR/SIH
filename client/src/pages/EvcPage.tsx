import { useEffect, useState } from 'react';
import { CalendarPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, PageHeader, Spinner, EmptyState } from '../components/ui';
import { Modal, Field } from './ApplicationsPage';
import { formatDate, daysUntil, humanize } from '../utils';
import type { EvcSchedule, User } from '../types';

export function EvcPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [evcs, setEvcs] = useState<EvcSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleFor, setScheduleFor] = useState<EvcSchedule | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/evc')
      .then((res) => setEvcs(res.data.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // The server returns a staff-only directory; committee members are filtered below.
    api
      .get('/users')
      .then((res) => setMembers(res.data.data))
      .catch(() => setMembers([]));
  }, []);

  const canSchedule = ['ADMIN', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(user?.role ?? '');
  const canComplete = ['ADMIN', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'EVC_MEMBER', 'COMMITTEE_MEMBER'].includes(
    user?.role ?? ''
  );

  const completeEvc = async (evc: EvcSchedule) => {
    setCompleting(evc.id);
    try {
      await api.post(`/evc/${evc.id}/complete`);
      push('EVC marked as completed — application advanced');
      load();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div>
      <PageHeader title="EVC Scheduling" subtitle="Queue, schedule and track Expert Visit Committees with conflict detection" />

      {loading ? (
        <Spinner />
      ) : error ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <AlertTriangle className="text-red-500" size={32} />
          <p className="text-sm text-slate-600">{error}</p>
          <button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Retry
          </button>
        </Card>
      ) : evcs.length === 0 ? (
        <EmptyState message="No EVCs in the queue" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {evcs.map((e) => {
            const d = daysUntil(e.dueAt);
            return (
              <Card key={e.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{e.application?.applicationNumber}</p>
                    <p className="text-xs text-slate-500">{e.application?.institution?.name}</p>
                  </div>
                  <Badge value={e.status} />
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>Region: {humanize(e.application?.assignedRegion)}</p>
                  <p>Scheduled: {formatDate(e.scheduledDate)}</p>
                  <p>
                    Due: {formatDate(e.dueAt)}{' '}
                    {d !== null && (
                      <span className={d < 0 ? 'font-semibold text-red-600' : 'text-slate-500'}>
                        ({d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`})
                      </span>
                    )}
                  </p>
                  {e.venue && <p>Venue: {e.venue}</p>}
                  {e.members && e.members.length > 0 && (
                    <p>Members: {e.members.map((m) => m.user?.fullName).join(', ')}</p>
                  )}
                </div>
                {e.isBreached && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                    <AlertTriangle size={12} /> Delayed — escalated
                  </p>
                )}
                {canSchedule && e.status !== 'COMPLETED' && (
                  <button
                    onClick={() => setScheduleFor(e)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <CalendarPlus size={15} /> {e.status === 'SCHEDULED' ? 'Reschedule EVC' : 'Schedule EVC'}
                  </button>
                )}
                {canComplete && e.status === 'SCHEDULED' && (
                  <button
                    onClick={() => completeEvc(e)}
                    disabled={completing === e.id}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                  >
                    <CheckCircle2 size={15} /> {completing === e.id ? 'Completing…' : 'Mark EVC Completed'}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {scheduleFor && (
        <ScheduleEvcModal
          evc={scheduleFor}
          members={members}
          onClose={() => setScheduleFor(null)}
          onSaved={() => {
            setScheduleFor(null);
            push('EVC scheduled');
            load();
          }}
        />
      )}
    </div>
  );
}

function ScheduleEvcModal({
  evc,
  members,
  onClose,
  onSaved,
}: {
  evc: EvcSchedule;
  members: User[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState(evc.venue ?? '');
  const [selected, setSelected] = useState<string[]>(evc.members?.map((m) => m.userId) ?? []);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setConflicts([]);
    try {
      await api.post(`/evc/${evc.id}/schedule`, {
        scheduledDate: date,
        venue,
        memberIds: selected,
      });
      onSaved();
    } catch (err) {
      const message = apiError(err);
      push(message, 'error');
      setConflicts([message]);
    } finally {
      setSaving(false);
    }
  };

  const committeeMembers = members.filter((m) => ['EVC_MEMBER', 'COMMITTEE_MEMBER'].includes(m.role));

  return (
    <Modal title={`Schedule EVC · ${evc.application?.applicationNumber}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Scheduled Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Venue">
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. AICTE Regional Office"
          />
        </Field>
        <Field label="Committee Members (conflict detection enabled)">
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {committeeMembers.length === 0 && <p className="p-2 text-xs text-slate-400">No committee members found</p>}
            {committeeMembers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                <span>{m.fullName}</span>
                <span className="ml-auto text-xs text-slate-400">{humanize(m.role)}</span>
              </label>
            ))}
          </div>
        </Field>
        {conflicts.map((c) => (
          <p key={c} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{c}</p>
        ))}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
