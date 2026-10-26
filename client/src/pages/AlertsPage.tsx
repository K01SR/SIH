import { useEffect, useMemo, useState } from 'react';
import { BellRing, ArrowUpRight, CheckCheck, Send } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Tabs,
  Textarea,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { formatDateTime, humanize } from '../utils';
import type { Alert, Escalation } from '../types';

const ROLES = [
  'INSTITUTION',
  'REGIONAL_OFFICER',
  'BUREAU_OFFICER',
  'EVC_MEMBER',
  'COMMITTEE_MEMBER',
  'COMPETENT_AUTHORITY',
  'ADMIN',
];

function BulkNotifyModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { push } = useToast();
  const [roles, setRoles] = useState<string[]>(['INSTITUTION']);
  const [channel, setChannel] = useState('IN_APP');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const toggleRole = (role: string) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const send = async () => {
    setSending(true);
    try {
      const res = await api.post('/alerts/bulk-notify', { roles, subject, body, channel });
      push(res.data.message, 'success');
      onSent();
      onClose();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Send bulk notification" eyebrow="Broadcast" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        <Field label="Recipient roles">
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => {
              const active = roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`label-sm border px-2 py-1 transition-colors ${
                    active
                      ? 'border-pigment text-pigment'
                      : 'border-hairline text-muted hover:border-gray-300 hover:text-ink'
                  }`}
                >
                  {humanize(r)}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Channel">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="IN_APP">In app</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </Select>
        </Field>
        <Field label="Subject">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Deadline reminder"
          />
        </Field>
        <Field label="Message">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            icon={<Send size={12} />}
            onClick={send}
            loading={sending}
            disabled={!subject || !body || roles.length === 0}
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AlertsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'alerts' | 'escalations'>('alerts');
  const [severity, setSeverity] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/alerts'), api.get('/alerts/escalations')])
      .then(([a, e]) => {
        setAlerts(a.data.data);
        setEscalations(e.data.data);
      })
      .catch((err) => push(apiError(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const onAlert = () => load();
    window.addEventListener('aicte:alert', onAlert);
    return () => window.removeEventListener('aicte:alert', onAlert);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    } catch (err) {
      push(apiError(err), 'error');
    }
  };

  const canSweep = ['ADMIN'].includes(user?.role ?? '');
  const canBroadcast = ['ADMIN', 'COMPETENT_AUTHORITY', 'BUREAU_OFFICER'].includes(user?.role ?? '');

  const unread = alerts.filter((a) => !a.isRead).length;
  const critical = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !severity || a.severity === severity),
    [alerts, severity]
  );

  return (
    <div>
      {showBulk && <BulkNotifyModal onClose={() => setShowBulk(false)} onSent={load} />}

      <PageHeader
        eyebrow="Signal"
        title={
          <>
            Alerts &amp; <em>escalation</em>
          </>
        }
        subtitle="Automated alerts for SLA, EVC, undertakings and document expiry, scoped to your role."
        actions={
          <>
            {canSweep && (
              <Button
                onClick={async () => {
                  await api.post('/alerts/sweep');
                  load();
                }}
              >
                Run escalation sweep
              </Button>
            )}
            {canBroadcast && (
              <Button variant="primary" icon={<Send size={12} />} onClick={() => setShowBulk(true)}>
                Bulk notify
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-6 border-b border-gray-100 pb-5 sm:grid-cols-3">
        <div>
          <p className="label text-muted">Unread</p>
          <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
            {String(unread).padStart(2, '0')}
          </p>
        </div>
        <div>
          <p className="label text-muted">Critical</p>
          <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
            {String(critical).padStart(2, '0')}
          </p>
        </div>
        <div>
          <p className="label text-muted">Escalations</p>
          <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
            {String(escalations.length).padStart(2, '0')}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'alerts', label: 'Alerts', count: alerts.length },
            { value: 'escalations', label: 'Escalations', count: escalations.length },
          ]}
          className="flex-1"
        />
        {tab === 'alerts' && (
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            aria-label="Filter alerts by severity"
            className="w-[170px]"
          >
            <option value="">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : tab === 'alerts' ? (
        visibleAlerts.length === 0 ? (
          <EmptyState
            icon={<BellRing size={24} />}
            message="No alerts"
            hint="Automated SLA and compliance alerts will appear here."
          />
        ) : (
          <div className="border-t border-gray-100">
            {visibleAlerts.map((a, i) => (
              <div
                key={a.id}
                className={`animate-fade-up flex items-start gap-4 border-b border-gray-100 py-4 ${
                  !a.isRead ? 'border-l-2 border-l-pigment pl-4' : ''
                }`}
                style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border ${
                    a.severity === 'CRITICAL'
                      ? 'border-pigment/60 text-pigment'
                      : 'border-hairline text-ink-2'
                  }`}
                >
                  <BellRing size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-[12px] ${a.isRead ? 'text-ink-2' : 'font-medium text-ink'}`}>
                      {a.title}
                    </p>
                    <Badge value={a.severity} marker={false} />
                    <span className="label-sm text-muted">{humanize(a.type)}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-2">{a.message}</p>
                  <p className="mt-1.5 label-sm text-muted">{formatDateTime(a.createdAt)}</p>
                </div>
                {!a.isRead && (
                  <button
                    onClick={() => markRead(a.id)}
                    title="Mark as read"
                    aria-label="Mark alert as read"
                    className="focus-ring shrink-0 border border-transparent p-1.5 text-muted transition-colors hover:border-gray-300 hover:text-ink"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : escalations.length === 0 ? (
        <EmptyState
          icon={<ArrowUpRight size={24} />}
          message="No escalations"
          hint="Cases that cross an escalation threshold will be recorded here."
        />
      ) : (
        <div className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-ground-tint">
                  {['Entity', 'Reason', 'Escalated to', 'Level', 'When'].map((h) => (
                    <th key={h} className="label px-4 py-3 text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {escalations.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink">
                        <ArrowUpRight size={12} className="text-pigment" /> {humanize(e.entityType)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-ink-2">{e.reason}</td>
                    <td className="px-4 py-3.5 text-[11px] text-ink-2">{humanize(e.toRole)}</td>
                    <td className="px-4 py-3.5 label-sm text-muted">L{String(e.level).padStart(2, '0')}</td>
                    <td className="px-4 py-3.5 text-[10.5px] text-muted">{formatDateTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
