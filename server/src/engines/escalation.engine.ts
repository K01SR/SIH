import { prisma } from '../config/prisma';
import { RulesEngine } from './rules.engine';
import { createAlert, notify } from '../services/notification.service';
import { recordAudit } from '../services/audit.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SweepSummary {
  slaBreached: number;
  slaApproaching: number;
  evcDelayed: number;
  undertakingsOverdue: number;
  documentsExpired: number;
  documentsExpiring: number;
  escalationsCreated: number;
}

/**
 * Escalation Engine - periodic sweep that inspects applications, EVCs,
 * undertakings and documents, raises alerts and escalates overdue items per
 * the configurable escalation matrix.
 */
export class EscalationEngine {
  static async sweep(): Promise<SweepSummary> {
    const summary: SweepSummary = {
      slaBreached: 0,
      slaApproaching: 0,
      evcDelayed: 0,
      undertakingsOverdue: 0,
      documentsExpired: 0,
      documentsExpiring: 0,
      escalationsCreated: 0,
    };
    const now = new Date();
    const matrix = await RulesEngine.getEscalationMatrix();
    const ruleFor = (trigger: string) => matrix.rules.find((r) => r.trigger === trigger);

    // --- SLA tracking for in-flight applications ---
    const activeApps = await prisma.application.findMany({
      where: {
        status: {
          in: [
            'SUBMITTED',
            'UNDER_SCRUTINY',
            'EVC_QUEUED',
            'EVC_SCHEDULED',
            'UNDER_SAC_SHC',
            'PENDING_DECISION',
          ],
        },
        slaDueAt: { not: null },
      },
    });

    for (const app of activeApps) {
      const daysRemaining = Math.ceil((app.slaDueAt!.getTime() - now.getTime()) / DAY_MS);
      if (daysRemaining < 0 && !app.isBreached) {
        summary.slaBreached++;
        await prisma.application.update({ where: { id: app.id }, data: { isBreached: true } });
        const rule = ruleFor('sla_breached');
        await createAlert({
          type: 'SLA_BREACHED',
          severity: 'CRITICAL',
          title: `SLA breached: ${app.applicationNumber}`,
          message: `Application exceeded its prescribed timeline by ${Math.abs(daysRemaining)} day(s).`,
          applicationId: app.id,
          entityType: 'Application',
          entityId: app.id,
          recipientRole: rule?.toRole,
        });
        await this.escalate('Application', app.id, `SLA breached by ${Math.abs(daysRemaining)} days`, rule?.toRole);
        summary.escalationsCreated++;
      } else if (daysRemaining >= 0 && daysRemaining <= 3) {
        summary.slaApproaching++;
        await createAlert({
          type: 'SLA_APPROACHING',
          severity: 'WARNING',
          title: `SLA approaching: ${app.applicationNumber}`,
          message: `Application due in ${daysRemaining} day(s).`,
          applicationId: app.id,
          entityType: 'Application',
          entityId: app.id,
          recipientRole: 'REGIONAL_OFFICER',
        });
      }
    }

    // --- EVC delay tracking ---
    const overdueEvcs = await prisma.evcSchedule.findMany({
      where: { status: { in: ['QUEUED', 'SCHEDULED', 'DELAYED'] }, dueAt: { lt: now } },
      include: { application: true },
    });
    for (const evc of overdueEvcs) {
      const overdueDays = Math.ceil((now.getTime() - (evc.dueAt?.getTime() ?? now.getTime())) / DAY_MS);
      summary.evcDelayed++;
      if (!evc.isBreached) {
        await prisma.evcSchedule.update({ where: { id: evc.id }, data: { isBreached: true, status: 'DELAYED' } });
      }
      const rule = ruleFor('evc_overdue_days');
      await createAlert({
        type: 'EVC_DELAYED',
        severity: 'CRITICAL',
        title: `EVC delayed: ${evc.application.applicationNumber}`,
        message: `EVC overdue by ${overdueDays} day(s).`,
        applicationId: evc.applicationId,
        entityType: 'EvcSchedule',
        entityId: evc.id,
        recipientRole: rule?.toRole,
      });
      if (overdueDays >= (rule?.threshold ?? 5)) {
        await this.escalate('EvcSchedule', evc.id, `EVC overdue ${overdueDays} days`, rule?.toRole);
        summary.escalationsCreated++;
      }
    }

    // --- Undertaking overdue tracking ---
    const overdueUndertakings = await prisma.undertaking.findMany({
      where: { dueDate: { lt: now }, status: { in: ['PENDING', 'SUBMITTED', 'UNDER_VERIFICATION'] } },
      include: { application: true },
    });
    for (const u of overdueUndertakings) {
      summary.undertakingsOverdue++;
      await prisma.undertaking.update({ where: { id: u.id }, data: { status: 'ESCALATED', escalated: true } });
      const rule = ruleFor('undertaking_overdue_days');
      await createAlert({
        type: 'UNDERTAKING_OVERDUE',
        severity: 'WARNING',
        title: `Undertaking overdue: ${u.application.applicationNumber}`,
        message: `"${u.title}" was due on ${u.dueDate.toDateString()}.`,
          applicationId: u.applicationId,
          entityType: 'Undertaking',
          entityId: u.id,
          recipientRole: rule?.toRole,
          institutionId: u.application.institutionId,
        });
      await this.escalate('Undertaking', u.id, 'Undertaking unfulfilled beyond due date', rule?.toRole);
      summary.escalationsCreated++;
    }

    // --- Document expiry tracking ---
    const docs = await prisma.document.findMany({
      where: { validUntil: { not: null }, status: { in: ['VALID', 'EXPIRING_SOON'] } },
      include: { institution: true },
    });
    for (const doc of docs) {
      const daysToExpiry = Math.ceil((doc.validUntil!.getTime() - now.getTime()) / DAY_MS);
      if (daysToExpiry < 0) {
        summary.documentsExpired++;
        await prisma.document.update({ where: { id: doc.id }, data: { status: 'EXPIRED', escalated: true } });
        const rule = ruleFor('document_expired_days');
        await createAlert({
          type: 'DOCUMENT_EXPIRED',
          severity: 'CRITICAL',
          title: `Document expired: ${doc.title}`,
          message: `${doc.type} for ${doc.institution.name} expired on ${doc.validUntil!.toDateString()}.`,
          entityType: 'Document',
          entityId: doc.id,
          recipientRole: rule?.toRole,
          institutionId: doc.institutionId,
        });
        await this.escalate('Document', doc.id, 'Prescribed document expired', rule?.toRole);
        summary.escalationsCreated++;
      } else if (daysToExpiry <= 30 && !doc.expiryAlertSent) {
        summary.documentsExpiring++;
        await prisma.document.update({
          where: { id: doc.id },
          data: { status: 'EXPIRING_SOON', expiryAlertSent: true },
        });
        await createAlert({
          type: 'DOCUMENT_EXPIRING',
          severity: daysToExpiry <= 7 ? 'CRITICAL' : 'WARNING',
          title: `Document expiring: ${doc.title}`,
          message: `${doc.type} expires in ${daysToExpiry} day(s).`,
          entityType: 'Document',
          entityId: doc.id,
          recipientRole: 'INSTITUTION',
          institutionId: doc.institutionId,
        });
      }
    }

    return summary;
  }

  private static async escalate(entityType: string, entityId: string, reason: string, toRole?: string) {
    await prisma.escalation.create({
      data: {
        entityType,
        entityId,
        reason,
        toRole: (toRole as never) ?? 'BUREAU_OFFICER',
        level: 1,
      },
    });
    await recordAudit({
      action: 'ESCALATION_CREATED',
      entityType,
      entityId,
      details: { reason, toRole },
    });
  }
}
