import { useEffect, useState } from 'react';
import { BellRing, ArrowUpRight, CheckCheck, Send, X } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, PageHeader, Spinner, EmptyState } from '../components/ui';
import { formatDateTime, humanize } from '../utils';
import type { Alert, Escalation } from '../types';

const ROLES = ['INSTITUTION', 'REGIONAL_OFFICER', 'BUREAU_OFFICER', 'EVC_MEMBER', 'COMMITTEE_MEMBER', 'COMPETENT_AUTHORITY'];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Send Bulk Notification</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Recipient Roles</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    roles.includes(r) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {humanize(r)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="IN_APP">In App</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Deadline reminder"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={send}
              disabled={sending || !subject || !body || roles.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={16} /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'alerts' | 'escalations'>('alerts');
  const [showBulk, setShowBulk] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/alerts'), api.get('/alerts/escalations')])
      .then(([a, e]) => {
        setAlerts(a.data.data);
        setEscalations(e.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const onAlert = () => load();
    window.addEventListener('aicte:alert', onAlert);
    return () => window.removeEventListener('aicte:alert', onAlert);
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/alerts/${id}/read`);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  };

  const canSweep = ['ADMIN'].includes(user?.role ?? '');
  const canBroadcast = ['ADMIN', 'COMPETENT_AUTHORITY', 'BUREAU_OFFICER'].includes(user?.role ?? '');

  return (
    <div>
      {showBulk && <BulkNotifyModal onClose={() => setShowBulk(false)} onSent={load} />}
      <PageHeader
        title="Alerts & Escalation"
        subtitle="Automated alerts for SLA, EVC, undertakings and document expiry"
        actions={
          <div className="flex gap-2">
            {canBroadcast && (
              <button
                onClick={() => setShowBulk(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Send size={16} /> Bulk Notify
              </button>
            )}
            {canSweep && (
              <button
                onClick={async () => {
                  await api.post('/alerts/sweep');
                  load();
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Run Escalation Sweep
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab('alerts')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'alerts' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
        >
          Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setTab('escalations')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'escalations' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
        >
          Escalations ({escalations.length})
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'alerts' ? (
        alerts.length === 0 ? (
          <EmptyState message="No alerts" />
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <Card key={a.id} className={`flex items-start gap-3 ${!a.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                <div className={`mt-0.5 rounded-lg p-2 ${a.severity === 'CRITICAL' ? 'bg-red-50 text-red-600' : a.severity === 'WARNING' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  <BellRing size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <Badge value={a.severity} />
                    <span className="text-xs text-slate-400">{humanize(a.type)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(a.createdAt)}</p>
                </div>
                {!a.isRead && (
                  <button onClick={() => markRead(a.id)} title="Mark read" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-green-600">
                    <CheckCheck size={16} />
                  </button>
                )}
              </Card>
            ))}
          </div>
        )
      ) : escalations.length === 0 ? (
        <EmptyState message="No escalations" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Escalated To</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {escalations.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                      <ArrowUpRight size={14} className="text-red-500" /> {humanize(e.entityType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.reason}</td>
                  <td className="px-4 py-3 text-slate-600">{humanize(e.toRole)}</td>
                  <td className="px-4 py-3 text-slate-600">L{e.level}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
