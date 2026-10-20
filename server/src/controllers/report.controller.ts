import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok } from '../utils/response';
import { ApplicationService } from '../services/application.service';

export async function pendencyReport(_req: Request, res: Response) {
  const [byRegion, ageing, workloads] = await Promise.all([
    ApplicationService.regionPendency(),
    ApplicationService.ageingAnalysis(),
    ApplicationService.workloadDistribution(),
  ]);
  return ok(res, { byRegion, ageing, workloads });
}

export async function evcReport(_req: Request, res: Response) {
  const evcs = await prisma.evcSchedule.findMany({ include: { application: true } });
  const byStatus: Record<string, number> = {};
  for (const e of evcs) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
  return ok(res, { total: evcs.length, byStatus, evcs });
}

export async function complianceReport(_req: Request, res: Response) {
  const undertakings = await prisma.undertaking.groupBy({ by: ['status'], _count: { _all: true } });
  const documents = await prisma.document.groupBy({ by: ['status'], _count: { _all: true } });
  return ok(res, { undertakings, documents });
}

export async function overdueReport(_req: Request, res: Response) {
  const now = new Date();
  const [breachedApps, overdueUndertakings, expiredDocs] = await Promise.all([
    prisma.application.findMany({ where: { isBreached: true }, include: { institution: true } }),
    prisma.undertaking.findMany({ where: { dueDate: { lt: now }, status: { notIn: ['COMPLIANT'] } }, include: { application: true } }),
    prisma.document.findMany({ where: { validUntil: { lt: now } }, include: { institution: true } }),
  ]);
  return ok(res, { breachedApps, overdueUndertakings, expiredDocs });
}

export async function regionPerformance(_req: Request, res: Response) {
  const apps = await prisma.application.findMany({ select: { assignedRegion: true, isBreached: true, status: true } });
  const regions: Record<string, { total: number; breached: number; completed: number; breachRate: number }> = {};
  for (const a of apps) {
    const k = a.assignedRegion;
    if (!regions[k]) regions[k] = { total: 0, breached: 0, completed: 0, breachRate: 0 };
    regions[k].total++;
    if (a.isBreached) regions[k].breached++;
    if (['APPROVED', 'APPROVED_WITH_UNDERTAKING', 'REJECTED'].includes(a.status)) regions[k].completed++;
  }
  Object.values(regions).forEach((r) => {
    r.breachRate = r.total ? Math.round((r.breached / r.total) * 100) : 0;
  });
  return ok(res, regions);
}
