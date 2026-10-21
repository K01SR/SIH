import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, created, fail } from '../utils/response';
import { recordAudit } from '../services/audit.service';
import { createAlert, notify } from '../services/notification.service';

export async function listUndertakings(req: Request, res: Response) {
  const { status, applicationId } = req.query as Record<string, string>;
  const user = req.user!;
  const undertakings = await prisma.undertaking.findMany({
    where: {
      status: status as never,
      applicationId,
      // Institutions may only see undertakings arising from their own applications.
      ...(user.role === 'INSTITUTION' ? { application: { institutionId: user.institutionId! } } : {}),
    },
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
    data: {
      applicationId,
      title,
      description,
      conditions: conditions ? (typeof conditions === 'string' ? conditions : JSON.stringify(conditions)) : '{}',
      dueDate: new Date(dueDate),
    },
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
  const user = req.user!;

  // Institutions may only submit evidence against their own undertakings.
  const existing = await prisma.undertaking.findUnique({
    where: { id: req.params.id },
    include: { application: { include: { institution: true } } },
  });
  if (!existing) return fail(res, 404, 'Undertaking not found');
  if (user.role === 'INSTITUTION' && existing.application.institutionId !== user.institutionId) {
    return fail(res, 403, 'This undertaking does not belong to your institution');
  }

  const u = await prisma.undertaking.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED', submittedAt: new Date(), evidencePath },
  });
  await recordAudit({
    userId: user.id,
    userRole: user.role,
    action: 'UNDERTAKING_EVIDENCE_SUBMITTED',
    entityType: 'Undertaking',
    entityId: u.id,
    details: { evidencePath },
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
  const user = req.user!;
  const list = await prisma.undertaking.findMany({
    where: {
      status: { in: ['PENDING', 'SUBMITTED', 'UNDER_VERIFICATION'] },
      dueDate: { lte: until },
      ...(user.role === 'INSTITUTION' ? { application: { institutionId: user.institutionId! } } : {}),
    },
    include: { application: { include: { institution: true } } },
    orderBy: { dueDate: 'asc' },
  });
  return ok(res, list);
}
