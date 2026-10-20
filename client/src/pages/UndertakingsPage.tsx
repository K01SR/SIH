import { useEffect, useState } from 'react';
import { ClipboardCheck, Upload, AlertTriangle } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, PageHeader, Spinner, EmptyState } from '../components/ui';
import { Modal, Field } from './ApplicationsPage';
import { formatDate, daysUntil, humanize } from '../utils';
import type { Undertaking } from '../types';

export function UndertakingsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<Undertaking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitFor, setSubmitFor] = useState<Undertaking | null>(null);
  const [verifyFor, setVerifyFor] = useState<Undertaking | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/undertakings')
      .then((res) => setItems(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isInstitution = user?.role === 'INSTITUTION';
  const canVerify = ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(user?.role ?? '');

  return (
    <div>
      <PageHeader title="Time-Bound Undertakings & Compliance" subtitle="Track conditions, due dates, evidence submission and verification" />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState message="No undertakings recorded" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Undertaking</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const d = daysUntil(u.dueDate);
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{u.title}</p>
                      <p className="text-xs text-slate-500">{u.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.application?.applicationNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${d !== null && d < 0 ? 'text-red-600' : d !== null && d <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {formatDate(u.dueDate)}
                        {d !== null && <span className="ml-1">({d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`})</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={u.status} />
                      {u.escalated && <AlertTriangle size={12} className="ml-2 inline text-red-500" />}
                    </td>
                    <td className="px-4 py-3">
                      {isInstitution && ['PENDING', 'ESCALATED'].includes(u.status) && (
                        <button onClick={() => setSubmitFor(u)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                          <Upload size={12} /> Submit Evidence
                        </button>
                      )}
                      {canVerify && u.status === 'SUBMITTED' && (
                        <button onClick={() => setVerifyFor(u)} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
                          <ClipboardCheck size={12} /> Verify
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {submitFor && (
        <SubmitModal
          undertaking={submitFor}
          onClose={() => setSubmitFor(null)}
          onSaved={() => {
            setSubmitFor(null);
            push('Compliance evidence submitted');
            load();
          }}
        />
      )}
      {verifyFor && (
        <VerifyModal
          undertaking={verifyFor}
          onClose={() => setVerifyFor(null)}
          onSaved={() => {
            setVerifyFor(null);
            push('Verification recorded');
            load();
          }}
        />
      )}
    </div>
  );
}

function SubmitModal({ undertaking, onClose, onSaved }: { undertaking: Undertaking; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [filePath, setFilePath] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/undertakings/${undertaking.id}/submit`, { evidencePath: filePath });
      onSaved();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Submit Evidence · ${undertaking.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Supporting Document (reference)">
          <input value={filePath} onChange={(e) => setFilePath(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. fire-safety-certificate.pdf" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VerifyModal({ undertaking, onClose, onSaved }: { undertaking: Undertaking; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [decision, setDecision] = useState('COMPLIANT');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/undertakings/${undertaking.id}/verify`, { decision, remarks });
      onSaved();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Verify Compliance · ${undertaking.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {undertaking.evidencePath && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Evidence submitted: <span className="font-mono">{undertaking.evidencePath}</span>
          </p>
        )}
        <Field label="Decision">
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="COMPLIANT">{humanize('COMPLIANT')}</option>
            <option value="NON_COMPLIANT">{humanize('NON_COMPLIANT')}</option>
          </select>
        </Field>
        <Field label="Remarks">
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Recording…' : 'Record Verification'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
