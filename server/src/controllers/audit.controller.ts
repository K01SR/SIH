import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok } from '../utils/response';

export async function listAuditLogs(req: Request, res: Response) {
  const { entityType, entityId, userId, limit } = req.query as Record<string, string>;
  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId, userId },
    include: { user: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit ?? '200', 10),
  });
  return ok(res, logs);
}

export async function applicationTimeline(req: Request, res: Response) {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: 'Application', entityId: req.params.id },
    include: { user: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return ok(res, logs);
}
