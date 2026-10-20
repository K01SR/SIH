import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Plus, Upload, Paperclip } from 'lucide-react';
import { api, apiError, uploadFile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, PageHeader, Spinner, EmptyState } from '../components/ui';
import { Modal, Field } from './ApplicationsPage';
import { formatDate, daysUntil, humanize } from '../utils';
import type { DocumentRecord } from '../types';

export function DocumentsPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewFor, setRenewFor] = useState<DocumentRecord | null>(null);
  const [verifyFor, setVerifyFor] = useState<DocumentRecord | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/documents')
      .then((res) => setDocs(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isInstitution = user?.role === 'INSTITUTION';
  const canVerify = ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(user?.role ?? '');

  return (
    <div>
      <PageHeader
        title="Documents & Lease Validity"
        subtitle="Track expiry of lease deeds and prescribed documents with advance alerts"
        actions={
          isInstitution && (
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus size={16} /> Add Document
            </button>
          )
        }
      />

      {loading ? (
        <Spinner />
      ) : docs.length === 0 ? (
        <EmptyState message="No documents tracked" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const days = d.daysToExpiry ?? daysUntil(d.validUntil);
                return (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {d.title}
                      {d.filePath && (
                        <a
                          href={d.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                        >
                          <Paperclip size={12} /> View
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{humanize(d.type)}</td>
                    <td className="px-4 py-3 text-slate-600">{d.institution?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${days !== null && days < 0 ? 'text-red-600' : days !== null && days <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {formatDate(d.validUntil)}
                        {days !== null && <span className="ml-1">({days < 0 ? 'expired' : `${days}d left`})</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge value={d.status} /></td>
                    <td className="px-4 py-3">
                      {isInstitution && ['VALID', 'EXPIRING_SOON', 'EXPIRED'].includes(d.status) && (
                        <button onClick={() => setRenewFor(d)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                          <RefreshCw size={12} /> Submit Renewal
                        </button>
                      )}
                      {canVerify && d.status === 'RENEWAL_SUBMITTED' && (
                        <button onClick={() => setVerifyFor(d)} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
                          <ShieldCheck size={12} /> Verify Renewal
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

      {renewFor && (
        <RenewModal doc={renewFor} onClose={() => setRenewFor(null)} onSaved={() => { setRenewFor(null); push('Renewal submitted'); load(); }} />
      )}
      {verifyFor && (
        <VerifyRenewalModal doc={verifyFor} onClose={() => setVerifyFor(null)} onSaved={() => { setVerifyFor(null); push('Renewal verified'); load(); }} />
      )}
      {showNew && <NewDocumentModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); push('Document recorded'); load(); }} />}
    </div>
  );
}

function RenewModal({ doc, onClose, onSaved }: { doc: DocumentRecord; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [renewedUntil, setRenewedUntil] = useState('');
  const [filePath, setFilePath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      setFilePath(await uploadFile(file));
      push('File uploaded');
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/documents/${doc.id}/renewal`, { renewedUntil, filePath: filePath || undefined });
      onSaved();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={`Submit Renewal · ${doc.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New Validity Until">
          <input type="date" value={renewedUntil} onChange={(e) => setRenewedUntil(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Renewed Document (PDF/image)">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            <Upload size={14} />
            {uploading ? 'Uploading…' : filePath ? 'File attached' : 'Choose file'}
            <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Submitting…' : 'Submit Renewal'}</button>
        </div>
      </form>
    </Modal>
  );
}

function VerifyRenewalModal({ doc, onClose, onSaved }: { doc: DocumentRecord; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [decision, setDecision] = useState('APPROVED');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/documents/${doc.id}/verify-renewal`, { decision, remarks });
      onSaved();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={`Verify Renewal · ${doc.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Decision">
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </Field>
        <Field label="Remarks">
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Recording…' : 'Record'}</button>
        </div>
      </form>
    </Modal>
  );
}

function NewDocumentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [type, setType] = useState('LEASE_DEED');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [filePath, setFilePath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFilePath(url);
      push('File uploaded');
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/documents', { type, title, validUntil, filePath });
      onSaved();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title="Add Document" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {['LEASE_DEED', 'BUILDING_APPROVAL', 'FIRE_SAFETY', 'LAND_USE', 'AFFILIATION', 'ACCREDITATION', 'OTHER'].map((t) => (
              <option key={t} value={t}>{humanize(t)}</option>
            ))}
          </select>
        </Field>
        <Field label="Valid Until">
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Attachment (PDF/image)">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            <Upload size={14} />
            {uploading ? 'Uploading…' : filePath ? 'File attached' : 'Choose file'}
            <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
