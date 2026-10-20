import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok } from '../utils/response';
import { EscalationEngine } from '../engines/escalation.engine';

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
