import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ok } from '../utils/response';

export async function listUsers(req: Request, res: Response) {
  const { role, region } = req.query as Record<string, string>;
  const user = req.user!;
  const users = await prisma.user.findMany({
    where: {
      role: role,
      region: region ?? (user.role === 'REGIONAL_OFFICER' ? user.region ?? undefined : undefined),
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      region: true,
      designation: true,
      institutionId: true,
    },
    orderBy: { fullName: 'asc' },
  });
  return ok(res, users);
}
