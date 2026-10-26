import { useEffect, useState } from 'react';
import { CalendarPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Meter,
  PageHeader,
  Skeleton,
} from '../components/ui';
import { Modal } from '../components/Modal';
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
      <PageHeader
        eyebrow="Committee"
        title={
          <>
            EVC <em>scheduling</em>
          </>
        }
        subtitle="Queue, schedule and track Expert Visit Committees with conflict detection."
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle size={24} />}
          message="Unable to load EVC queue"
          hint={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : evcs.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus size={24} />}
          message="No EVCs in the queue"
          hint="Cases routed for an expert visit will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {evcs.map((e, i) => {
            const d = daysUntil(e.dueAt);
            const overdue = d !== null && d < 0;
            return (
              <article
                key={e.id}
                className="animate-fade-up flex min-w-0 flex-col rounded-[5px] border border-line bg-panel"
                style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[18px] font-medium leading-none tracking-[-0.04em] text-value">
                      {e.application?.applicationNumber}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-muted">
                      {e.application?.institution?.name}
                    </p>
                  </div>
                  <Badge value={e.status} />
                </div>

                <dl className="flex-1 px-4 py-3 text-[10.5px]">
                  {[
                    ['Region', humanize(e.application?.assignedRegion)],
                    ['Scheduled', formatDate(e.scheduledDate)],
                    ['Venue', e.venue ?? '—'],
                    [
                      'Members',
                      e.members && e.members.length > 0
                        ? e.members.map((m) => m.user?.fullName).join(', ')
                        : '—',
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b border-gray-100 py-1.5 last:border-b-0">
                      <dt className="label-sm text-muted">{label}</dt>
                      <dd className="min-w-0 truncate text-right text-ink-2">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="px-4 pb-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="label-sm text-muted">Due {formatDate(e.dueAt)}</span>
                    <span className={`label-sm ${overdue ? 'text-pigment' : 'text-muted'}`}>
                      {d === null ? '—' : overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
                    </span>
                  </div>
                  <Meter
                    className="mt-1.5"
                    value={overdue ? 100 : Math.max(4, 100 - (d ?? 100) * 2)}
                    tone={overdue ? 'pigment' : 'ink'}
                  />
                  {e.isBreached && (
                    <p className="mt-2 flex items-center gap-1 label-sm text-pigment">
                      <AlertTriangle size={10} /> Delayed — escalated
                    </p>
                  )}
                </div>

                {(canSchedule || canComplete) && (
                  <div className="mt-auto space-y-2 border-t border-gray-100 px-4 py-3">
                    {canSchedule && e.status !== 'COMPLETED' && (
                      <Button
                        variant="primary"
                        className="w-full"
                        icon={<CalendarPlus size={12} />}
                        onClick={() => setScheduleFor(e)}
                      >
                        {e.status === 'SCHEDULED' ? 'Reschedule EVC' : 'Schedule EVC'}
                      </Button>
                    )}
                    {canComplete && e.status === 'SCHEDULED' && (
                      <Button
                        className="w-full"
                        icon={<CheckCircle2 size={12} />}
                        loading={completing === e.id}
                        onClick={() => completeEvc(e)}
                      >
                        {completing === e.id ? 'Completing' : 'Mark EVC Completed'}
                      </Button>
                    )}
                  </div>
                )}
              </article>
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
    <Modal
      title={`Schedule EVC · ${evc.application?.applicationNumber}`}
      eyebrow="Committee"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Scheduled date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Venue">
          <Input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
            placeholder="e.g. AICTE Regional Office"
          />
        </Field>
        <Field label="Committee members" hint="Conflict detection is applied on the server.">
          <div className="max-h-44 overflow-y-auto border border-gray-200">
            {committeeMembers.length === 0 && (
              <p className="p-3 text-[10.5px] text-muted">No committee members found</p>
            )}
            {committeeMembers.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-[11px] last:border-b-0 hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggle(m.id)}
                  className="accent-[#ff951f]"
                />
                <span className="text-ink">{m.fullName}</span>
                <span className="ml-auto label-sm text-muted">{humanize(m.role)}</span>
              </label>
            ))}
          </div>
        </Field>
        {conflicts.map((c) => (
          <p key={c} className="border-l-2 border-accent bg-ground-tint px-3 py-2 text-[11px] text-pigment">
            {c}
          </p>
        ))}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Saving' : 'Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
