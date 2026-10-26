import { useEffect, useState } from 'react';
import { ClipboardCheck, Upload, AlertTriangle, FileCheck2 } from 'lucide-react';
import { api, apiError, uploadFile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FileUpload,
  Meter,
  PageHeader,
  Select,
  TableSkeleton,
  Textarea,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { formatDate, daysUntil, humanize, fileUrl } from '../utils';
import type { Undertaking } from '../types';

export function UndertakingsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<Undertaking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitFor, setSubmitFor] = useState<Undertaking | null>(null);
  const [verifyFor, setVerifyFor] = useState<Undertaking | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/undertakings')
      .then((res) => setItems(res.data.data))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isInstitution = user?.role === 'INSTITUTION';
  const canVerify = ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(user?.role ?? '');
  const overdue = items.filter((u) => {
    const d = daysUntil(u.dueDate);
    return d !== null && d < 0 && u.status !== 'COMPLIANT';
  }).length;

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title={
          <>
            Time-bound <em>undertakings</em>
          </>
        }
        subtitle="Track conditions, due dates, evidence submission and verification."
      />

      {!loading && !error && items.length > 0 && (
        <div className="mb-6 grid gap-6 border-b border-gray-100 pb-5 sm:grid-cols-3">
          <div>
            <p className="label text-muted">Undertakings</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
              {String(items.length).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="label text-muted">Awaiting evidence</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
              {String(items.filter((u) => u.status === 'PENDING').length).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="label text-muted">Overdue</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
              {String(overdue).padStart(2, '0')}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={7} cols={5} />
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle size={24} />}
          message="Unable to load undertakings"
          hint={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 size={24} />}
          message="No undertakings recorded"
          hint="Conditions attached to approvals will be tracked here."
        />
      ) : (
        <div className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-ground-tint">
                  {['Undertaking', 'Application', 'Due date', 'Status', 'Action'].map((h) => (
                    <th key={h} className="label px-4 py-3 text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const d = daysUntil(u.dueDate);
                  const late = d !== null && d < 0;
                  return (
                    <tr key={u.id} className="border-b border-gray-100 last:border-b-0 hover:bg-white/5">
                      <td className="max-w-[300px] px-4 py-3.5">
                        <p className="text-[11.5px] font-medium text-ink">{u.title}</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{u.description}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[10.5px] text-ink-2">
                        {u.application?.applicationNumber}
                      </td>
                      <td className="w-[170px] px-4 py-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10.5px] text-ink-2">{formatDate(u.dueDate)}</span>
                          <span className={`label-sm ${late ? 'text-pigment' : 'text-muted'}`}>
                            {d === null ? '—' : late ? `${Math.abs(d)}d over` : `${d}d`}
                          </span>
                        </div>
                        <Meter
                          className="mt-1.5"
                          value={late ? 100 : Math.max(4, 100 - (d ?? 100) * 3)}
                          tone={late ? 'pigment' : 'ink'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Badge value={u.status} />
                          {u.escalated && <AlertTriangle size={11} className="text-pigment" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isInstitution && ['PENDING', 'ESCALATED'].includes(u.status) && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<Upload size={11} />}
                            onClick={() => setSubmitFor(u)}
                          >
                            Submit evidence
                          </Button>
                        )}
                        {canVerify && u.status === 'SUBMITTED' && (
                          <Button
                            size="sm"
                            icon={<ClipboardCheck size={11} />}
                            onClick={() => setVerifyFor(u)}
                          >
                            Verify
                          </Button>
                        )}
                        {!isInstitution && !canVerify && (
                          <span className="label-sm text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      push('Please attach the supporting document', 'error');
      return;
    }
    setSaving(true);
    try {
      setUploading(true);
      const evidencePath = await uploadFile(file);
      setUploading(false);
      await api.post(`/undertakings/${undertaking.id}/submit`, { evidencePath });
      onSaved();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  return (
    <Modal title={`Submit evidence · ${undertaking.title}`} eyebrow="Compliance" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Supporting document">
          <FileUpload
            fileName={file?.name}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            title="Choose supporting document"
            attachedTitle="Supporting document attached"
            hint="PDF or image · 15 MB max"
            onChange={(f) => setFile(f ?? null)}
          />
        </Field>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving || uploading} disabled={!file}>
            {uploading ? 'Uploading' : saving ? 'Submitting' : 'Submit'}
          </Button>
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
    <Modal title={`Verify compliance · ${undertaking.title}`} eyebrow="Review" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {undertaking.evidencePath && (
          <p className="rounded-[5px] border border-line bg-panel px-3 py-2 text-[10.5px] text-ink-2">
            Evidence submitted:{' '}
            <a
              href={fileUrl(undertaking.evidencePath)}
              target="_blank"
              rel="noreferrer"
              className="link-underline font-mono text-pigment"
            >
              {undertaking.evidencePath}
            </a>
          </p>
        )}
        <Field label="Decision">
          <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="COMPLIANT">{humanize('COMPLIANT')}</option>
            <option value="NON_COMPLIANT">{humanize('NON_COMPLIANT')}</option>
          </Select>
        </Field>
        <Field label="Remarks">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Recording' : 'Record verification'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
