import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok, created, fail } from '../utils/response';
import { recordAudit } from '../services/audit.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listDocuments(req: Request, res: Response) {
  const { status, institutionId, type } = req.query as Record<string, string>;
  const user = req.user!;
  const docs = await prisma.document.findMany({
    where: {
      status: status as never,
      type: type as never,
      institutionId: user.role === 'INSTITUTION' ? user.institutionId! : institutionId,
    },
    include: { institution: true },
    orderBy: { validUntil: 'asc' },
  });
  return ok(res, docs);
}

export async function createDocument(req: Request, res: Response) {
  const { institutionId, applicationId, type, title, filePath, issuedDate, validFrom, validUntil } = req.body;
  const user = req.user!;
  const instId = user.role === 'INSTITUTION' ? user.institutionId! : institutionId;
  if (!instId) return fail(res, 400, 'institutionId is required');
  const doc = await prisma.document.create({
    data: {
      institutionId: instId,
      applicationId: applicationId ?? null,
      type,
      title,
      filePath: filePath ?? '',
      issuedDate: issuedDate ? new Date(issuedDate) : null,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
    },
  });
  await recordAudit({
    userId: user.id,
    userRole: user.role,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'Document',
    entityId: doc.id,
    details: { type, title },
  });
  return created(res, doc, 'Document recorded');
}

export async function submitRenewal(req: Request, res: Response) {
  const { renewedUntil, filePath } = req.body;
  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: {
      status: 'RENEWAL_SUBMITTED',
      renewalSubmittedAt: new Date(),
      renewedUntil: renewedUntil ? new Date(renewedUntil) : null,
      filePath: filePath ?? undefined,
    },
  });
  return ok(res, doc, 'Renewal submitted');
}

export async function verifyRenewal(req: Request, res: Response) {
  const { decision, remarks } = req.body;
  const approved = decision === 'APPROVED';
  const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!existing) return fail(res, 404, 'Document not found');
  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: {
      status: approved ? 'RENEWAL_VERIFIED' : 'RENEWAL_REJECTED',
      validUntil: approved ? existing.renewedUntil : existing.validUntil,
      verifiedAt: new Date(),
      verifiedById: req.user!.id,
      verificationRemarks: remarks,
      expiryAlertSent: false,
      escalated: false,
    },
  });
  await recordAudit({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'DOCUMENT_RENEWAL_VERIFIED',
    entityType: 'Document',
    entityId: doc.id,
    details: { decision, remarks },
  });
  return ok(res, doc, 'Renewal verification recorded');
}

export async function expiringDocuments(req: Request, res: Response) {
  const days = parseInt((req.query.days as string) ?? '30', 10);
  const until = new Date(Date.now() + days * DAY_MS);
  const docs = await prisma.document.findMany({
    where: { validUntil: { lte: until }, status: { in: ['VALID', 'EXPIRING_SOON'] } },
    include: { institution: true },
    orderBy: { validUntil: 'asc' },
  });
  const now = Date.now();
  return ok(
    res,
    docs.map((d) => ({
      ...d,
      daysToExpiry: Math.ceil(((d.validUntil?.getTime() ?? now) - now) / DAY_MS),
    }))
  );
}
