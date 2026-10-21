import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, History, FileDown, FileQuestion } from 'lucide-react';
import { api, apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Card, PageHeader, Spinner } from '../components/ui';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { Modal, Field } from './ApplicationsPage';
import { formatDateTime, humanize } from '../utils';
import type { Application, WorkflowAction } from '../types';

interface ActionDef {
  action: string;
  label: string;
  style: string;
  gated: boolean;
  reasonRequired?: boolean;
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

  if (loading) return <Spinner />;
  if (!app) {
    return (
      <div>
        <button
          onClick={() => navigate('/applications')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Back to Applications
        </button>
        <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <FileQuestion className="text-slate-400" size={32} />
          <p className="text-sm text-slate-600">This application could not be found or is no longer available.</p>
          <button
            onClick={() => navigate('/applications')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            View all applications
          </button>
        </Card>
      </div>
    );
  }

  const role = user?.role;
  const stage = app.currentStage;
  const status = app.status;
  const actions: ActionDef[] = [];

  // A closed case cannot be actioned further.
  const isClosed = ['APPROVED', 'APPROVED_WITH_UNDERTAKING', 'REJECTED', 'WITHDRAWN'].includes(status);

  if (!isClosed) {
    // Scrutiny actions are only meaningful before the decision stage.
    const inScrutiny = ['SUBMISSION', 'SCRUTINY', 'RESCRUTINY'].includes(stage);
    if (inScrutiny) {
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'SCRUTINY_PASS', label: 'Pass Scrutiny / Advance Stage', style: 'bg-blue-600', gated: false });
      }
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'RETURN', label: 'Return for Deficiencies', style: 'bg-amber-600', gated: false, reasonRequired: true });
      }
      // Routing to EVC is restricted to regional/bureau officers by the server.
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER'].includes(role ?? '')) {
        actions.push({ action: 'ROUTE_TO_EVC', label: 'Route to EVC', style: 'bg-purple-600', gated: false });
      }
    } else if (['EVC', 'SAC_SHC'].includes(stage)) {
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'AUTO_ADVANCE', label: 'Advance Stage', style: 'bg-blue-600', gated: false });
        actions.push({ action: 'RETURN', label: 'Return for Deficiencies', style: 'bg-amber-600', gated: false, reasonRequired: true });
      }
    } else if (stage === 'DECISION') {
      if (['COMPETENT_AUTHORITY', 'BUREAU_OFFICER'].includes(role ?? '')) {
        actions.push({ action: 'APPROVE', label: 'Approve (Statutory)', style: 'bg-green-600', gated: true });
        actions.push({ action: 'REJECT', label: 'Reject (Statutory)', style: 'bg-red-600', gated: true });
      }
      // Committee and EVC members may recommend an outcome but never take it.
      if (['COMMITTEE_MEMBER', 'EVC_MEMBER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'PROPOSE_DECISION', label: 'Propose Recommendation', style: 'bg-indigo-600', gated: true });
      }
      if (['REGIONAL_OFFICER', 'BUREAU_OFFICER', 'COMPETENT_AUTHORITY'].includes(role ?? '')) {
        actions.push({ action: 'RETURN', label: 'Return for Deficiencies', style: 'bg-amber-600', gated: false, reasonRequired: true });
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
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(16);
      doc.text('AICTE - Case File Summary', 14, y);
      y += 10;
      doc.setFontSize(11);
      const line = (label: string, value: string) => {
        doc.text(`${label}: ${value}`, 14, y);
        y += 7;
      };
      line('Application No', app.applicationNumber);
      line('Institution', app.institution?.name ?? '—');
      line('Region', humanize(app.assignedRegion));
      line('Program', humanize(app.programType));
      line('Status', humanize(app.status));
      line('Current Stage', humanize(app.currentStage));
      line('Route', humanize(app.routeType));
      line('SLA Due', formatDateTime(app.slaDueAt));
      y += 4;
      doc.setFontSize(13);
      doc.text('Workflow History', 14, y);
      y += 8;
      doc.setFontSize(10);
      (app.actions ?? []).forEach((a) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(
          `${formatDateTime(a.createdAt)} - ${humanize(a.actionType)} (${humanize(a.fromStage ?? '')} -> ${humanize(a.toStage ?? '')})${a.reason ? ' | ' + a.reason : ''}`,
          14,
          y
        );
        y += 6;
      });
      y += 4;
      doc.setFontSize(8);
      doc.text('Generated by AICTE Approval Workflow Automation System', 14, y);
      doc.save(`${app.applicationNumber.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      push(apiError(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Back
      </button>
      <PageHeader
        title={app.applicationNumber}
        subtitle={`${app.institution?.name} · ${humanize(app.assignedRegion)} Region`}
        actions={
          <button
            onClick={downloadCaseFile}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FileDown size={16} /> {exporting ? 'Generating…' : 'Export Case File (PDF)'}
          </button>
        }
      />

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge value={app.status} />
          {app.isBreached && <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700">SLA BREACHED</span>}
          {app.isHumanVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
              <ShieldAlert size={12} /> Human Verified
            </span>
          )}
        </div>
        <WorkflowStepper currentStage={app.currentStage} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Application Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Academic Year" value={app.academicYear} />
            <Detail label="Program Type" value={humanize(app.programType)} />
            <Detail label="Processing Route" value={humanize(app.routeType)} />
            <Detail label="Assigned Officer" value={app.assignedOfficer?.fullName ?? 'Unassigned'} />
            <Detail label="Submitted" value={formatDateTime(app.submittedAt)} />
            <Detail label="SLA Due" value={formatDateTime(app.slaDueAt)} />
          </dl>
          {app.remarks && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <span className="font-semibold">Remarks: </span>
              {app.remarks}
            </div>
          )}
          {canAssign && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <label className="mb-1 block text-xs font-medium uppercase text-slate-400">
                Assigned Officer
              </label>
              <div className="flex gap-2">
                <select
                  value={app.assignedOfficerId ?? ''}
                  onChange={(e) => assignOfficer(e.target.value)}
                  disabled={assigning}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} ({humanize(o.role)})
                    </option>
                  ))}
                </select>
              </div>
              {assigning && <p className="mt-1 text-xs text-slate-400">Saving assignment…</p>}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Actions</h3>
          {actions.length === 0 ? (
            <p className="text-sm text-slate-400">No actions available for your role.</p>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => (
                <button
                  key={a.action}
                  onClick={() => {
                    setModal(a);
                    setReason('');
                  }}
                  className={`w-full rounded-lg ${a.style} px-3 py-2 text-sm font-semibold text-white hover:opacity-90`}
                >
                  {a.gated && <ShieldAlert size={13} className="mr-1 inline" />}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <History size={16} /> Workflow &amp; Audit Timeline
        </h3>
        <div className="space-y-3">
          {(app.actions ?? []).length === 0 && <p className="text-sm text-slate-400">No history yet.</p>}
          {(app.actions ?? []).map((a: WorkflowAction) => (
            <div key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-2.5 w-2.5 rounded-full ${a.isAutomated ? 'bg-purple-500' : 'bg-blue-500'}`} />
                <div className="mt-1 w-px flex-1 bg-slate-200" />
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium text-slate-800">
                  {humanize(a.actionType)}
                  {a.isAutomated && <span className="ml-2 text-xs text-purple-600">automated</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {humanize(a.fromStage ?? '')} → {humanize(a.toStage ?? '')} · {a.actor?.fullName ?? 'System'} ·{' '}
                  {formatDateTime(a.createdAt)}
                </p>
                {a.reason && <p className="mt-1 text-xs text-slate-600">Reason: {a.reason}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {modal && (
        <Modal title={modal.gated ? 'Human Oversight Confirmation Required' : 'Confirm Action'} onClose={() => setModal(null)}>
          {modal.gated && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <p>
                This is a statutory action. The system supports but does not replace the decision of the
                competent authority. A recorded reason is mandatory and will be added to the audit trail.
              </p>
            </div>
          )}
          <p className="mb-3 text-sm text-slate-600">
            You are about to <span className="font-semibold">{modal.label}</span> for application{' '}
            <span className="font-semibold">{app.applicationNumber}</span>.
          </p>
          <Field label={modal.gated || modal.reasonRequired ? 'Reason (mandatory)' : 'Reason (optional)'}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Enter recorded reason / observations"
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Applying…' : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}
