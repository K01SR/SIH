import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { RulesEngine } from '../engines/rules.engine';
import { recordAudit } from '../services/audit.service';
import { createAlert, notify } from '../services/notification.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listEvcs(req: Request, res: Response) {
  const { status } = req.query as Record<string, string>;
  const evcs = await prisma.evcSchedule.findMany({
    where: { status: status as never },
    include: {
      application: { include: { institution: true } },
      members: { include: { user: { select: { id: true, fullName: true, role: true, region: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return ok(res, evcs);
}

export async function queueForEvc(req: Request, res: Response) {
  const app = await prisma.application.findUnique({ where: { id: req.body.applicationId } });
  if (!app) return fail(res, 404, 'Application not found');
  const dueAt = await RulesEngine.computeSlaDue('EVC');
  const schedule = await prisma.evcSchedule.create({
    data: { applicationId: app.id, status: 'QUEUED', dueAt },
  });
  return ok(res, schedule, 'Queued for EVC');
}

export async function scheduleEvc(req: Request, res: Response) {
  const { scheduledDate, venue, meetingLink, memberIds, notes } = req.body;
  const evc = await prisma.evcSchedule.findUnique({ where: { id: req.params.id }, include: { members: true } });
  if (!evc) return fail(res, 404, 'EVC schedule not found');

  const proposed = new Date(scheduledDate);

  // Conflict detection: members already booked on the same day.
  const candidates = (memberIds as string[]) ?? [];
  const conflicts: string[] = [];
  for (const memberId of candidates) {
    const clash = await prisma.evcMember.findFirst({
      where: {
        userId: memberId,
        evcScheduleId: { not: evc.id },
        evcSchedule: {
          scheduledDate: {
            gte: new Date(proposed.setHours(0, 0, 0, 0)),
            lt: new Date(proposed.setHours(23, 59, 59, 999)),
          },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      },
      include: { user: true },
    });
    if (clash) conflicts.push(clash.user.fullName);
  }
  if (conflicts.length) {
    return fail(res, 409, `Scheduling conflict for: ${conflicts.join(', ')}`, { conflicts });
  }

  await prisma.evcMember.deleteMany({ where: { evcScheduleId: evc.id } });
  if (candidates.length) {
    await prisma.evcMember.createMany({
      data: candidates.map((userId) => ({ evcScheduleId: evc.id, userId })),
    });
  }

  const updated = await prisma.evcSchedule.update({
    where: { id: evc.id },
    data: { scheduledDate: proposed, venue, meetingLink, notes, status: 'SCHEDULED' },
    include: { members: { include: { user: true } }, application: true },
  });

  // Notify members and update application status.
  for (const memberId of candidates) {
    await notify({
      userId: memberId,
      subject: 'EVC scheduled',
      body: `You are scheduled for an EVC on ${proposed.toDateString()}.`,
      metadata: { evcId: evc.id },
    });
  }
  await prisma.application.update({ where: { id: evc.applicationId }, data: { status: 'EVC_SCHEDULED' } });

  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'EVC_SCHEDULED',
    entityType: 'EvcSchedule',
    entityId: evc.id,
    details: { scheduledDate: proposed, members: candidates },
  });

  return ok(res, updated, 'EVC scheduled');
}

export async function completeEvc(req: Request, res: Response) {
  const { notes } = req.body;
  const evc = await prisma.evcSchedule.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', completedDate: new Date(), notes },
    include: { application: true },
  });
  await prisma.application.update({ where: { id: evc.applicationId }, data: { status: 'EVC_COMPLETED' } });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'EVC_COMPLETED',
    entityType: 'EvcSchedule',
    entityId: evc.id,
  });
  return ok(res, evc, 'EVC completed');
}

export async function evcAlerts(_req: Request, res: Response) {
  const now = new Date();
  const evcs = await prisma.evcSchedule.findMany({
    where: { status: { in: ['SCHEDULED', 'QUEUED'] }, dueAt: { not: null } },
    include: { application: { include: { institution: true } } },
  });
  return ok(
    res,
    evcs.map((e) => ({
      id: e.id,
      applicationNumber: e.application.applicationNumber,
      institution: e.application.institution.name,
      status: e.status,
      dueAt: e.dueAt,
      daysRemaining: Math.ceil(((e.dueAt?.getTime() ?? now.getTime()) - now.getTime()) / DAY_MS),
    }))
  );
}
