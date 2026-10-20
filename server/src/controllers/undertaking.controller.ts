import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, created, fail } from '../utils/response';
import { recordAudit } from '../services/audit.service';
import { createAlert, notify } from '../services/notification.service';

export async function listUndertakings(req: Request, res: Response) {
  const { status, applicationId } = req.query as Record<string, string>;
  const undertakings = await prisma.undertaking.findMany({
    where: { status: status as never, applicationId },
    include: { application: { include: { institution: true } } },
    orderBy: { dueDate: 'asc' },
  });
  return ok(res, undertakings);
}

export async function createUndertaking(req: Request, res: Response) {
  const { applicationId, title, description, conditions, dueDate } = req.body;
  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) return fail(res, 404, 'Application not found');
  const u = await prisma.undertaking.create({
    data: { applicationId, title, description, conditions: conditions ?? {}, dueDate: new Date(dueDate) },
  });
  await prisma.application.update({ where: { id: applicationId }, data: { status: 'APPROVED_WITH_UNDERTAKING' } });
  await notify({
    userId: app.assignedOfficerId,
    subject: `Undertaking recorded: ${title}`,
    body: `Due on ${new Date(dueDate).toDateString()}.`,
  });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'UNDERTAKING_CREATED',
    entityType: 'Undertaking',
    entityId: u.id,
    details: { applicationId, title, dueDate },
  });
  return created(res, u, 'Undertaking recorded');
}

export async function submitUndertaking(req: Request, res: Response) {
  const { evidencePath } = req.body;
  const u = await prisma.undertaking.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED', submittedAt: new Date(), evidencePath },
  });
  return ok(res, u, 'Compliance evidence submitted');
}

export async function verifyUndertaking(req: Request, res: Response) {
  const { decision, remarks } = req.body;
  const compliant = decision === 'COMPLIANT';
  const u = await prisma.undertaking.update({
    where: { id: req.params.id },
    data: {
      status: compliant ? 'COMPLIANT' : 'NON_COMPLIANT',
      verifiedAt: new Date(),
      verifiedById: req.user!.id,
      verificationRemarks: remarks,
    },
  });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'UNDERTAKING_VERIFIED',
    entityType: 'Undertaking',
    entityId: u.id,
    details: { decision, remarks },
  });
  return ok(res, u, 'Verification recorded');
}

export async function upcomingUndertakings(req: Request, res: Response) {
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const list = await prisma.undertaking.findMany({
    where: { status: { in: ['PENDING', 'SUBMITTED', 'UNDER_VERIFICATION'] }, dueDate: { lte: until } },
    include: { application: { include: { institution: true } } },
    orderBy: { dueDate: 'asc' },
  });
  return ok(res, list);
}
