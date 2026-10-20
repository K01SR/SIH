import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok } from '../utils/response';

export async function listInstitutions(req: Request, res: Response) {
  const { region } = req.query as Record<string, string>;
  const user = req.user!;
  const where =
    user.role === 'INSTITUTION'
      ? { id: user.institutionId! }
      : region
        ? { region }
        : {};
  const institutions = await prisma.institution.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  return ok(res, institutions);
}
