import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, FileDown, FileQuestion, History } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Field, PageHeader, Select, Spinner, Textarea } from '../components/ui';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { Modal } from '../components/Modal';
import { formatDateTime, humanize, daysUntil, formatDate } from '../utils';
import type { Application, WorkflowAction } from '../types';

interface ActionDef {
  action: string;
  label: string;
  gated: boolean;
  reasonRequired?: boolean;
  tone?: 'primary' | 'danger';
}

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ActionDef | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [officers, setOfficers] = useState<{ id: string; fullName: string; role: string }[]>([]);
  const [assigning, setAssigning] = useState(false);

  const canAssign = ['BUREAU_OFFICER', 'COMPETENT_AUTHORITY', 'ADMIN'].includes(user?.role ?? '');

  const load = () => {
    api
      .get(`/applications/${id}`)
      .then((res) => setApp(res.data.data))
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!canAssign) return;
    api
      .get('/users')
      .then((res) =>
        setOfficers(
          (res.data.data as { id: string; fullName: string; role: string }[]).filter((u) =>
            ['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(u.role)
          )
        )
      )
      .catch(() => setOfficers([]));
  }, [canAssign]);

  const assignOfficer = async (officerId: string) => {
    setAssigning(true);
    try {
      await api.post(`/applications/${id}/assign`, { officerId: officerId || null });
      push(officerId ? 'Officer assigned' : 'Officer unassigned');
      load();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <Spinner label="Opening case file" />;
  if (!app) {
    return (
      <div>
        <button
          onClick={() => navigate('/applications')}
          className="link-underline mb-6 inline-flex items-center gap-1.5 label text-muted"
        >
          <ArrowLeft size={13} /> Back to register
        </button>
        <div className="flex flex-col items-center justify-center border border-gray-200 px-6 py-16 text-center">
          <FileQuestion className="mb-4 text-muted" size={28} />
          <p className="label text-ink-2">Case file unavailable</p>
          <p className="mt-2 max-w-sm text-[11px] text-muted">
            This application could not be found or is outside your scope.
          </p>
          <Button className="mt-5" onClick={() => navigate('/applications')}>
            View all applications
          </Button>
        </div>
      </div>
    );
  }

  const role = user?.role;
  const stage = app.currentStage;
  const status = app.status;
  const actions: ActionDef[] = [];
  const isClosed = ['APPROVED', 'APPROVED_WITH_UNDERTAKING', 'REJECTED', 'WITHDRAWN'].includes(status);
  const d = daysUntil(app.slaDueAt);

  if (!isClosed) {
    const inScrutiny = ['SUBMISSION', 'SCRUTINY', 'RESCRUTINY'].includes(stage);
    if (inScrutiny) {
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'SCRUTINY_PASS', label: 'Pass Scrutiny / Advance Stage', gated: false, tone: 'primary' });
      }
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'RETURN', label: 'Return for Deficiencies', gated: false, reasonRequired: true });
      }
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER'].includes(role ?? '')) {
        actions.push({ action: 'ROUTE_TO_EVC', label: 'Route to EVC', gated: false });
      }
    } else if (['EVC', 'SAC_SHC'].includes(stage)) {
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'AUTO_ADVANCE', label: 'Advance Stage', gated: false, tone: 'primary' });
        actions.push({ action: 'RETURN', label: 'Return for Deficiencies', gated: false, reasonRequired: true });
      }
    } else if (stage === 'DECISION') {
      if (['COMPETENT_AUTHORITY', 'BUREAU_OFFICER'].includes(role ?? '')) {
        actions.push({ action: 'APPROVE', label: 'Approve (Statutory)', gated: true, tone: 'primary' });
        actions.push({ action: 'REJECT', label: 'Reject (Statutory)', gated: true, tone: 'danger' });
      }
      if (['COMMITTEE_MEMBER', 'EVC_MEMBER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'PROPOSE_DECISION', label: 'Propose Recommendation', gated: true });
      }
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'RETURN', label: 'Return for Deficiencies', gated: false, reasonRequired: true });
      }
    }
  }

  const submit = async () => {
    if (!modal) return;
    if ((modal.gated || modal.reasonRequired) && !reason.trim()) {
      push('A recorded reason is mandatory (human oversight)', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (modal.action === 'ROUTE_TO_EVC') {
        await api.post(`/applications/${id}/route-evc`);
      } else {
        await api.post(`/applications/${id}/transition`, { actionType: modal.action, reason });
      }
      push(`Action "${modal.label}" applied`);
      setModal(null);
      setReason('');
      load();
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCaseFile = async () => {
    setExporting(true);
    try {
      const { downloadCaseFilePdf } = await import('../pdf/caseFilePdf');
      const generatedBy = user ? `${user.fullName} (${humanize(user.role)})` : 'Authorised user';
      downloadCaseFilePdf(app, generatedBy);
      push('Case file exported');
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="link-underline mb-6 inline-flex items-center gap-1.5 label text-muted"
      >
        <ArrowLeft size={13} /> Back
      </button>

      <PageHeader
        eyebrow="Case file"
        title={app.applicationNumber}
        subtitle={`${app.institution?.name ?? '—'} · ${humanize(app.assignedRegion)} Region · ${humanize(app.programType)}`}
        actions={
          <Button icon={<FileDown size={13} />} onClick={downloadCaseFile} loading={exporting}>
            {exporting ? 'Generating' : 'Export Case File'}
          </Button>
        }
      />

      <section className="mb-6 rounded-[5px] border border-line bg-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
          <Badge value={app.status} />
          {app.isBreached && (
            <span className="label-sm border border-pigment/50 px-1.5 py-0.5 text-pigment">
              SLA Breached
            </span>
          )}
          {app.isHumanVerified && (
            <span className="label-sm inline-flex items-center gap-1 border border-hairline-strong px-1.5 py-0.5 text-ink">
              <ShieldAlert size={10} /> Human Verified
            </span>
          )}
          <span className="ml-auto label-sm text-muted">
            {d === null
              ? 'SLA —'
              : d < 0
                ? `${Math.abs(d)} days overdue`
                : `${d} days remaining`}
            {' · due '}
            {formatDate(app.slaDueAt)}
          </span>
        </div>
        <div className="overflow-x-auto px-5 py-5">
          <WorkflowStepper currentStage={app.currentStage} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-[5px] border border-line bg-panel">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="label text-pigment">Record</p>
              <h2 className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">Application details</h2>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2">
              {[
                ['Academic year', app.academicYear],
                ['Program type', humanize(app.programType)],
                ['Processing route', humanize(app.routeType)],
                ['Assigned officer', app.assignedOfficer?.fullName ?? 'Unassigned'],
                ['Submitted', formatDateTime(app.submittedAt)],
                ['SLA due', formatDateTime(app.slaDueAt)],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className={`px-5 py-4 ${i % 2 === 0 ? 'sm:border-r' : ''} ${
                    i < 2 ? 'border-b' : i % 2 === 0 ? 'sm:border-b' : ''
                  } border-hairline`}
                >
                  <dt className="label-sm text-muted">{label}</dt>
                  <dd className="mt-1 text-[12px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {app.remarks && (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="label-sm text-pigment">Remarks</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">{app.remarks}</p>
              </div>
            )}
            {canAssign && (
              <div className="border-t border-gray-100 px-5 py-4">
                <Field label="Assign officer" hint="Only regional, bureau and competent-authority officers are listed.">
                  <Select
                    value={app.assignedOfficerId ?? ''}
                    onChange={(e) => assignOfficer(e.target.value)}
                    disabled={assigning}
                  >
                    <option value="">Unassigned</option>
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName} ({humanize(o.role)})
                      </option>
                    ))}
                  </Select>
                </Field>
                {assigning && <p className="mt-1 label-sm text-muted">Saving assignment…</p>}
              </div>
            )}
          </div>
        </section>

        <aside>
          <div className="rounded-[5px] border border-line bg-panel">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="label text-pigment">Actions</p>
              <h2 className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">Available to you</h2>
            </div>
            <div className="p-5">
              {actions.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-muted">
                  No actions are available for your role at this stage.
                </p>
              ) : (
                <div className="space-y-2">
                  {actions.map((a) => (
                    <Button
                      key={a.action}
                      variant={a.tone === 'danger' ? 'danger' : a.tone === 'primary' ? 'primary' : 'secondary'}
                      className="w-full justify-start"
                      icon={a.gated ? <ShieldAlert size={12} /> : undefined}
                      onClick={() => {
                        setModal(a);
                        setReason('');
                      }}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              )}
              <p className="mt-5 border-t border-gray-100 pt-4 text-[10px] leading-relaxed text-muted">
                Statutory decisions require a recorded reason and are written to the immutable audit trail.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-6 rounded-[5px] border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <p className="label text-pigment">Chronology</p>
            <h2 className="mt-1 text-[16px] font-medium leading-snug tracking-[-0.02em] text-ink">Workflow &amp; audit timeline</h2>
          </div>
          <History size={16} className="text-muted" />
        </div>
        <div className="px-5 py-5">
          {(app.actions ?? []).length === 0 && (
            <p className="text-[11px] text-muted">No history recorded yet.</p>
          )}
          <ol className="relative">
            {(app.actions ?? []).map((a: WorkflowAction, i) => (
              <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-2 w-2 shrink-0 ${
                      a.isAutomated ? 'bg-pigment' : 'bg-ink'
                    }`}
                  />
                  {i < (app.actions ?? []).length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-gray-200" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-[12px] font-medium text-ink">{humanize(a.actionType)}</p>
                    {a.isAutomated && <span className="label-sm text-pigment">Automated</span>}
                    <span className="label-sm text-muted">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted">
                    {humanize(a.fromStage ?? '')} → {humanize(a.toStage ?? '')} · {a.actor?.fullName ?? 'System'}
                  </p>
                  {a.reason && (
                    <p className="mt-1.5 border-l border-pigment pl-2 text-[11px] leading-relaxed text-ink-2">
                      {a.reason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {modal && (
        <Modal
          title={modal.gated ? 'Human oversight required' : 'Confirm action'}
          eyebrow={modal.gated ? 'Statutory step' : 'Workflow step'}
          onClose={() => setModal(null)}
        >
          {modal.gated && (
            <div className="mb-4 flex items-start gap-2 border-l-2 border-accent bg-ground-tint px-3 py-2.5 text-[11px] leading-relaxed text-ink-2">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-pigment" />
              <p>
                This is a statutory action. The system supports but does not replace the decision of the
                competent authority. A recorded reason is mandatory and will be added to the audit trail.
              </p>
            </div>
          )}
          <p className="mb-4 text-[11.5px] leading-relaxed text-ink-2">
            You are about to <span className="font-semibold text-ink">{modal.label}</span> for application{' '}
            <span className="font-semibold text-ink">{app.applicationNumber}</span>.
          </p>
          <Field
            label={modal.gated || modal.reasonRequired ? 'Reason (mandatory)' : 'Reason (optional)'}
            hint="This text is stored verbatim in the audit trail."
          >
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Record observations or the basis for this decision"
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button variant={modal.tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={submitting}>
              {submitting ? 'Applying' : 'Confirm'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
