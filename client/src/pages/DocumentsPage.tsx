import { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Plus, Paperclip, FileWarning } from 'lucide-react';
import { api, apiError, uploadFile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FileUpload,
  Input,
  Meter,
  PageHeader,
  Select,
  TableSkeleton,
  Textarea,
} from '../components/ui';
import { Modal } from '../components/Modal';
import { formatDate, daysUntil, humanize, fileUrl } from '../utils';
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
      .catch((err) => push(apiError(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isInstitution = user?.role === 'INSTITUTION';
  const canVerify = ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(user?.role ?? '');
  const expiring = docs.filter((d) => d.status === 'EXPIRING_SOON').length;
  const expired = docs.filter((d) => d.status === 'EXPIRED').length;

  return (
    <div>
      <PageHeader
        eyebrow="Validity"
        title={
          <>
            Documents &amp; <em>lease validity</em>
          </>
        }
        subtitle="Track expiry of lease deeds and prescribed documents with advance alerts."
        actions={
          isInstitution && (
            <Button variant="primary" icon={<Plus size={12} />} onClick={() => setShowNew(true)}>
              Add document
            </Button>
          )
        }
      />

      {!loading && docs.length > 0 && (
        <div className="mb-6 grid gap-6 border-b border-gray-100 pb-5 sm:grid-cols-3">
          <div>
            <p className="label text-muted">Tracked</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
              {String(docs.length).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="label text-muted">Expiring soon</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
              {String(expiring).padStart(2, '0')}
            </p>
          </div>
          <div>
            <p className="label text-muted">Expired</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tracking-[-0.05em] text-value">
              {String(expired).padStart(2, '0')}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={7} cols={6} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileWarning size={24} />}
          message="No documents tracked"
          hint="Lease deeds and prescribed documents will appear here."
        />
      ) : (
        <div className="border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-ground-tint">
                  {['Document', 'Type', 'Institution', 'Valid until', 'Status', 'Action'].map((h) => (
                    <th key={h} className="label px-4 py-3 text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const days = d.daysToExpiry ?? daysUntil(d.validUntil);
                  const late = days !== null && days < 0;
                  return (
                    <tr key={d.id} className="border-b border-gray-100 last:border-b-0 hover:bg-white/5">
                      <td className="px-4 py-3.5">
                        <p className="text-[11.5px] font-medium text-ink">{d.title}</p>
                        {d.filePath && (
                          <a
                            href={fileUrl(d.filePath)}
                            target="_blank"
                            rel="noreferrer"
                            className="link-underline mt-0.5 inline-flex items-center gap-1 label-sm text-pigment"
                          >
                            <Paperclip size={10} /> View file
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[10.5px] text-ink-2">{humanize(d.type)}</td>
                      <td className="px-4 py-3.5 text-[10.5px] text-ink-2">{d.institution?.name ?? '—'}</td>
                      <td className="w-[170px] px-4 py-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[10.5px] text-ink-2">{formatDate(d.validUntil)}</span>
                          <span className={`label-sm ${late ? 'text-pigment' : 'text-muted'}`}>
                            {days === null ? '—' : late ? 'expired' : `${days}d`}
                          </span>
                        </div>
                        <Meter
                          className="mt-1.5"
                          value={late ? 100 : Math.max(4, 100 - (days ?? 100) * 1.4)}
                          tone={late ? 'pigment' : days !== null && days <= 30 ? 'ink' : 'muted'}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge value={d.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {isInstitution && ['VALID', 'EXPIRING_SOON', 'EXPIRED'].includes(d.status) && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<RefreshCw size={11} />}
                            onClick={() => setRenewFor(d)}
                          >
                            Submit renewal
                          </Button>
                        )}
                        {canVerify && d.status === 'RENEWAL_SUBMITTED' && (
                          <Button
                            size="sm"
                            icon={<ShieldCheck size={11} />}
                            onClick={() => setVerifyFor(d)}
                          >
                            Verify renewal
                          </Button>
                        )}
                        {!isInstitution && !canVerify && <span className="label-sm text-muted">—</span>}
                        {isInstitution && !['VALID', 'EXPIRING_SOON', 'EXPIRED'].includes(d.status) && (
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

      {renewFor && (
        <RenewModal
          doc={renewFor}
          onClose={() => setRenewFor(null)}
          onSaved={() => {
            setRenewFor(null);
            push('Renewal submitted');
            load();
          }}
        />
      )}
      {verifyFor && (
        <VerifyRenewalModal
          doc={verifyFor}
          onClose={() => setVerifyFor(null)}
          onSaved={() => {
            setVerifyFor(null);
            push('Renewal verified');
            load();
          }}
        />
      )}
      {showNew && (
        <NewDocumentModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            push('Document recorded');
            load();
          }}
        />
      )}
    </div>
  );
}

function DocumentSummary({ doc, mode }: { doc: DocumentRecord; mode: 'renew' | 'verify' }) {
  const days = doc.daysToExpiry ?? daysUntil(doc.validUntil);
  const overdue = days !== null && days < 0;
  const dayLabel =
    days === null
      ? 'Not recorded'
      : days === 0
        ? 'Expires today'
        : days < 0
          ? `${Math.abs(days)} days overdue`
          : `${days} days remaining`;

  return (
    <div className="overflow-hidden rounded-[5px] border border-line bg-ground">
      <div className="flex items-start justify-between gap-4 px-4 py-3.5">
        <div className="min-w-0">
          <p className="label text-ink-muted">Document</p>
          <p className="mt-1.5 text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-ink">{doc.title}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{humanize(doc.type)}</p>
        </div>
        <Badge value={doc.status} />
      </div>
      <dl className="grid grid-cols-2 gap-px border-t border-line bg-line">
        <div className="bg-ground px-4 py-3">
          <dt className="label-sm text-muted">Current validity</dt>
          <dd className="mt-1 font-mono text-[12px] text-value">{formatDate(doc.validUntil)}</dd>
        </div>
        <div className="bg-ground px-4 py-3">
          <dt className="label-sm text-muted">{mode === 'verify' ? 'Renewed until' : 'Days remaining'}</dt>
          <dd
            className={`mt-1 font-mono text-[12px] ${
              mode === 'verify' ? 'text-value' : overdue ? 'text-[#ff9b8d]' : 'text-value'
            }`}
          >
            {mode === 'verify' ? formatDate(doc.renewedUntil) : dayLabel}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RenewModal({ doc, onClose, onSaved }: { doc: DocumentRecord; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [renewedUntil, setRenewedUntil] = useState('');
  const [filePath, setFilePath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fileName, setFileName] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      setFilePath(await uploadFile(file));
      push('File uploaded');
    } catch (err) {
      setFileName('');
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
    <Modal title="Submit renewal" eyebrow="Validity" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <DocumentSummary doc={doc} mode="renew" />
        <Field label="New validity until" hint="Expiry date recorded on the renewed document.">
          <Input type="date" value={renewedUntil} onChange={(e) => setRenewedUntil(e.target.value)} required />
        </Field>
        <Field label="Renewed document">
          <FileUpload fileName={fileName} uploading={uploading} onChange={handleFile} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving || uploading}>
            {saving ? 'Submitting' : 'Submit renewal'}
          </Button>
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
    <Modal title="Verify renewal" eyebrow="Review" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <DocumentSummary doc={doc} mode="verify" />
        <Field label="Decision">
          <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </Field>
        <Field label="Remarks">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? 'Recording' : 'Record'}
          </Button>
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
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setFilePath(url);
      push('File uploaded');
    } catch (err) {
      setFileName('');
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
    <Modal title="Add document" eyebrow="Register" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {['LEASE_DEED', 'BUILDING_APPROVAL', 'FIRE_SAFETY', 'LAND_USE', 'AFFILIATION', 'ACCREDITATION', 'OTHER'].map((t) => (
                <option key={t} value={t}>
                  {humanize(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valid until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
          </Field>
        </div>
        <Field label="Attachment">
          <FileUpload fileName={fileName} uploading={uploading} onChange={handleFile} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving || uploading}>
            {saving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
