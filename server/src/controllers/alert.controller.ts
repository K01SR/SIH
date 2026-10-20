import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { EscalationEngine } from '../engines/escalation.engine';
import { notifyBulk } from '../services/notification.service';
import { recordAudit } from '../services/audit.service';

export async function listAlerts(req: Request, res: Response) {
  const { severity, isRead, type } = req.query as Record<string, string>;
  const alerts = await prisma.alert.findMany({
    where: {
      severity: severity as never,
      type: type as never,
      isRead: isRead === undefined ? undefined : isRead === 'true',
      OR: req.user!.role === 'INSTITUTION' ? [{ recipientRole: 'INSTITUTION' }, { recipientId: null }] : undefined,
    },
    include: { application: { select: { applicationNumber: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return ok(res, alerts);
}

export async function markRead(req: Request, res: Response) {
  const alert = await prisma.alert.update({ where: { id: req.params.id }, data: { isRead: true } });
  return ok(res, alert);
}

export async function listEscalations(_req: Request, res: Response) {
  const escalations = await prisma.escalation.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return ok(res, escalations);
}

export async function runSweep(_req: Request, res: Response) {
  return ok(res, await EscalationEngine.sweep(), 'Escalation sweep completed');
}

export async function listNotifications(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok(res, notifications);
}

/** Admin/compliance bulk notification dispatch across a role or user set. */
export async function bulkNotify(req: Request, res: Response) {
  const { userIds, roles, subject, body, channel } = req.body;
  if (!subject || !body) return fail(res, 400, 'subject and body are required');
  if ((!userIds || !userIds.length) && (!roles || !roles.length)) {
    return fail(res, 400, 'Provide at least one recipient (userIds or roles)');
  }
  const result = await notifyBulk({ userIds, roles, subject, body, channel });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'BULK_NOTIFICATION_SENT',
    entityType: 'Notification',
    entityId: null,
    details: { roles, userIds, subject, channel, recipientCount: result.recipientCount },
  });
  return ok(res, result, `Notification sent to ${result.recipientCount} recipient(s)`);
}
