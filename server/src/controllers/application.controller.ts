import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, created, fail } from '../utils/response';
import { ApplicationService } from '../services/application.service';
import { WorkflowEngine, WorkflowAuthorizationError } from '../engines/workflow.engine';
import { RulesEngine } from '../engines/rules.engine';
import { recordAudit } from '../services/audit.service';
import { NotificationChannel } from '../types/domain';

export async function listApplications(req: Request, res: Response) {
  const { region, stage, status, officerId } = req.query as Record<string, string>;
  const user = req.user!;
  const filter = {
    region: (region as never) ?? (user.role === 'REGIONAL_OFFICER' ? (user.region as never) : undefined),
    stage: stage as never,
    status: status as never,
    officerId: user.role === 'INSTITUTION' ? undefined : officerId,
  };
  if (user.role === 'INSTITUTION') {
    const apps = await prisma.application.findMany({
      where: { institutionId: user.institutionId! },
      include: { institution: true, assignedOfficer: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, apps);
  }
  return ok(res, await ApplicationService.list(filter));
}

export async function getApplication(req: Request, res: Response) {
  const app = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: {
      institution: true,
      assignedOfficer: { select: { id: true, fullName: true, role: true } },
      actions: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { fullName: true, role: true } } } },
      undertakings: true,
      evcSchedules: { include: { members: { include: { user: { select: { fullName: true, role: true } } } } } },
      documents: true,
      alerts: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!app) return fail(res, 404, 'Application not found');
  // Institutions may only open their own applications; regional officers are
  // restricted to their own region.
  const user = req.user!;
  if (user.role === 'INSTITUTION' && app.institutionId !== user.institutionId) {
    return fail(res, 403, 'This application does not belong to your institution');
  }
  if (user.role === 'REGIONAL_OFFICER' && app.assignedRegion !== user.region) {
    return fail(res, 403, 'This application is outside your region');
  }
  return ok(res, app);
}

export async function createApplication(req: Request, res: Response) {
  const { academicYear, programType, routeType } = req.body;
  const user = req.user!;
  let institutionId = user.institutionId;
  if (user.role !== 'INSTITUTION') institutionId = req.body.institutionId;
  if (!institutionId) return fail(res, 400, 'institutionId is required');

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  if (!institution) return fail(res, 404, 'Institution not found');

  const count = await prisma.application.count();
  const applicationNumber = `AICTE/${academicYear}/${String(count + 1).padStart(5, '0')}`;
  const resolvedRoute = routeType ?? (institution.isNewInstitution ? 'NEW_INSTITUTION' : 'SCRUTINY_EVC');
  const firstStage = await RulesEngine.resolveRoute(resolvedRoute);
  const slaDueAt = await RulesEngine.computeSlaDue(firstStage[0] ?? 'SCRUTINY');

  const app = await prisma.application.create({
    data: {
      applicationNumber,
      institutionId,
      academicYear,
      programType,
      routeType: resolvedRoute,
      assignedRegion: institution.region,
      status: 'SUBMITTED',
      currentStage: (firstStage[0] as never) ?? 'SCRUTINY',
      submittedAt: new Date(),
      slaDueAt,
    },
  });

  await recordAudit({
    userId: user.id,
    userRole: user.role,
    action: 'APPLICATION_SUBMITTED',
    entityType: 'Application',
    entityId: app.id,
    details: { applicationNumber, routeType: resolvedRoute },
  });

  return created(res, app, 'Application submitted');
}

export async function transitionApplication(req: Request, res: Response) {
  const { actionType, reason, metadata } = req.body;
  const user = req.user!;

  // Scope the action to the actor's jurisdiction.
  const target = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!target) return fail(res, 404, 'Application not found');
  if (user.role === 'REGIONAL_OFFICER' && target.assignedRegion !== user.region) {
    return fail(res, 403, 'This application is outside your region');
  }

  // Human-oversight safeguard: statutory actions require an explicit reason.
  const gated = ['APPROVE', 'REJECT', 'PROPOSE_DECISION'].includes(actionType);
  if (gated && !reason) {
    return fail(res, 422, 'A recorded reason is mandatory for this action (human oversight)');
  }
  if (actionType === 'RETURN' && !reason) {
    return fail(res, 422, 'A reason is mandatory when returning an application');
  }

  try {
    const result = await WorkflowEngine.transition({
      applicationId: req.params.id,
      actionType,
      actorId: user.id,
      actorRole: user.role,
      reason,
      metadata,
    });
    return ok(res, result, 'Transition applied');
  } catch (err) {
    if (err instanceof WorkflowAuthorizationError) {
      return fail(res, 403, err.message);
    }
    return fail(res, 400, (err as Error).message);
  }
}

export async function routeToEvc(req: Request, res: Response) {
  try {
    const schedule = await WorkflowEngine.queueForEvc(req.params.id);
    await WorkflowEngine.transition({
      applicationId: req.params.id,
      actionType: 'ROUTE_TO_EVC',
      actorId: req.user!.id,
      actorRole: req.user!.role,
    });
    return ok(res, schedule, 'Application queued for EVC');
  } catch (err) {
    return fail(res, 400, (err as Error).message);
  }
}

export async function dashboardSummary(req: Request, res: Response) {
  const user = req.user!;
  const filter = {
    region: user.role === 'REGIONAL_OFFICER' ? (user.region as never) : undefined,
    officerId: user.role === 'REGIONAL_OFFICER' || user.role === 'BUREAU_OFFICER' ? user.id : undefined,
    // Institutions only ever see their own case data.
    institutionId: user.role === 'INSTITUTION' ? user.institutionId! : undefined,
  };
  const [summary, ageing] = await Promise.all([
    ApplicationService.dashboardSummary(filter),
    ApplicationService.ageingAnalysis(filter),
  ]);
  return ok(res, { summary, ageing });
}

export async function regionPendency(req: Request, res: Response) {
  const user = req.user!;
  return ok(
    res,
    await ApplicationService.regionPendency({
      institutionId: user.role === 'INSTITUTION' ? user.institutionId! : undefined,
    })
  );
}

export async function workload(_req: Request, res: Response) {
  return ok(res, await ApplicationService.workloadDistribution());
}

export async function predictive(req: Request, res: Response) {
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const user = req.user!;
  return ok(
    res,
    await ApplicationService.predictivePendency(days, {
      institutionId: user.role === 'INSTITUTION' ? user.institutionId! : undefined,
    })
  );
}

export async function assignOfficer(req: Request, res: Response) {
  const { officerId } = req.body;
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) return fail(res, 404, 'Application not found');
  let officer = null;
  if (officerId) {
    officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer) return fail(res, 404, 'Officer not found');
  }
  const updated = await prisma.application.update({
    where: { id: app.id },
    data: { assignedOfficerId: officerId ?? null },
    include: { assignedOfficer: { select: { id: true, fullName: true, role: true } } },
  });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'OFFICER_ASSIGNED',
    entityType: 'Application',
    entityId: app.id,
    details: { officerId, officerName: officer?.fullName ?? null },
  });
  return ok(res, updated, officerId ? `Assigned to ${officer!.fullName}` : 'Assignment cleared');
}

/**
 * Simulation mode: project pendency impact of adding N officers to a region.
 * Deterministic heuristic based on current open caseload and average
 * processing throughput — supports what-if capacity planning.
 */
export async function simulate(req: Request, res: Response) {
  const region = (req.query.region as string) || undefined;
  const additionalOfficers = Math.max(0, parseInt((req.query.additionalOfficers as string) ?? '0', 10));
  const apps = await prisma.application.findMany({
    where: {
      assignedRegion: region as never,
      status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] },
    },
    select: { assignedOfficerId: true, isBreached: true, currentStage: true },
  });
  const openCases = apps.length;
  const breached = apps.filter((a) => a.isBreached).length;
  const currentOfficers = new Set(apps.map((a) => a.assignedOfficerId).filter(Boolean)).size || 1;
  const officersAfter = currentOfficers + additionalOfficers;
  const perOfficerNow = openCases / currentOfficers;
  const perOfficerAfter = openCases / officersAfter;
  const breachRateNow = openCases ? breached / openCases : 0;
  const projectedBreachRate = Math.max(0, breachRateNow * (perOfficerNow / perOfficerAfter));
  return ok(res, {
    region: region ?? 'ALL',
    openCases,
    breached,
    currentOfficers,
    additionalOfficers,
    officersAfter,
    casesPerOfficerNow: Math.round(perOfficerNow * 10) / 10,
    casesPerOfficerAfter: Math.round(perOfficerAfter * 10) / 10,
    breachRateNow: Math.round(breachRateNow * 1000) / 10,
    projectedBreachRate: Math.round(projectedBreachRate * 1000) / 10,
    projectedReductionPct: breachRateNow ? Math.round((1 - projectedBreachRate / breachRateNow) * 1000) / 10 : 0,
  });
}

export async function sendCommunication(req: Request, res: Response) {
  const { subject, body, channel } = req.body;
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) return fail(res, 404, 'Application not found');
  const { notify } = await import('../services/notification.service');
  const record = await notify({
    userId: app.assignedOfficerId,
    subject: subject ?? `Communication regarding ${app.applicationNumber}`,
    body,
    channel: (channel as NotificationChannel) ?? NotificationChannel.IN_APP,
    metadata: { applicationId: app.id },
  });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'COMMUNICATION_SENT',
    entityType: 'Application',
    entityId: app.id,
    details: { subject, channel },
  });
  return ok(res, record, 'Communication recorded');
}
