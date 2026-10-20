import { prisma } from '../config/prisma';
import { ApplicationStatus, Stage, Region } from '../types/domain';
import { RulesEngine } from '../engines/rules.engine';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PendencyFilter {
  region?: Region;
  stage?: Stage;
  status?: ApplicationStatus;
  officerId?: string;
}

export class ApplicationService {
  static async list(filter: PendencyFilter = {}) {
    return prisma.application.findMany({
      where: {
        assignedRegion: filter.region,
        currentStage: filter.stage,
        status: filter.status,
        assignedOfficerId: filter.officerId,
      },
      include: {
        institution: true,
        assignedOfficer: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Ageing analysis grouped into configured buckets. */
  static async ageingAnalysis(filter: PendencyFilter = {}) {
    const apps = await prisma.application.findMany({
      where: {
        assignedRegion: filter.region,
        currentStage: filter.stage,
        status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] },
      },
      select: { id: true, createdAt: true, currentStage: true, assignedRegion: true, status: true },
    });
    const thresholds = await RulesEngine.getAgeingThresholds();
    const now = Date.now();
    const buckets = thresholds.buckets.map((b) => ({
      label: b.label,
      color: b.color,
      count: 0,
    }));
    const byStage: Record<string, number> = {};
    for (const app of apps) {
      const ageDays = Math.floor((now - app.createdAt.getTime()) / DAY_MS);
      thresholds.buckets.forEach((b, i) => {
        const inBucket = ageDays >= b.min && (b.max === null || ageDays <= b.max);
        if (inBucket) buckets[i].count++;
      });
      byStage[app.currentStage] = (byStage[app.currentStage] ?? 0) + 1;
    }
    return { total: apps.length, buckets, byStage };
  }

  /** Region-wise pendency breakdown. */
  static async regionPendency() {
    const apps = await prisma.application.findMany({
      where: { status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] } },
      select: { assignedRegion: true, isBreached: true, currentStage: true },
    });
    const map: Record<string, { total: number; breached: number; byStage: Record<string, number> }> = {};
    for (const app of apps) {
      const key = app.assignedRegion;
      if (!map[key]) map[key] = { total: 0, breached: 0, byStage: {} };
      map[key].total++;
      if (app.isBreached) map[key].breached++;
      map[key].byStage[app.currentStage] = (map[key].byStage[app.currentStage] ?? 0) + 1;
    }
    return map;
  }

  /** Workload distribution across officers. */
  static async workloadDistribution() {
    const apps = await prisma.application.groupBy({
      by: ['assignedOfficerId'],
      where: { status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] } },
      _count: { _all: true },
    });
    const officers = await prisma.user.findMany({
      where: { id: { in: apps.map((a) => a.assignedOfficerId).filter(Boolean) as string[] } },
      select: { id: true, fullName: true, role: true, region: true },
    });
    return apps.map((a) => {
      const officer = officers.find((o) => o.id === a.assignedOfficerId);
      return {
        officerId: a.assignedOfficerId,
        officerName: officer?.fullName ?? 'Unassigned',
        role: officer?.role,
        region: officer?.region,
        activeCases: a._count._all,
      };
    });
  }

  /** Simple predictive pendency: forecast breaches within the next N days. */
  static async predictivePendency(withinDays = 30) {
    const now = Date.now();
    const horizon = now + withinDays * DAY_MS;
    const apps = await prisma.application.findMany({
      where: {
        status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] },
        slaDueAt: { not: null, lte: new Date(horizon) },
      },
      include: { institution: true },
      orderBy: { slaDueAt: 'asc' },
    });
    return apps.map((app) => {
      const daysRemaining = Math.ceil((app.slaDueAt!.getTime() - now) / DAY_MS);
      return {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        institution: app.institution.name,
        region: app.assignedRegion,
        stage: app.currentStage,
        daysRemaining,
        risk: daysRemaining < 0 ? 'BREACHED' : daysRemaining <= 7 ? 'HIGH' : 'MEDIUM',
      };
    });
  }

  /** Summary counters for dashboards. */
  static async dashboardSummary(filter: PendencyFilter = {}) {
    const where = {
      assignedRegion: filter.region,
      assignedOfficerId: filter.officerId,
    };
    const [total, pending, breached, approved, rejected] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.count({
        where: { ...where, status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] } },
      }),
      prisma.application.count({ where: { ...where, isBreached: true, status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] } } }),
      prisma.application.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.application.count({ where: { ...where, status: 'REJECTED' } }),
    ]);
    return { total, pending, breached, approved, rejected };
  }
}
