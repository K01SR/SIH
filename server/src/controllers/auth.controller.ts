import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ok, fail } from '../utils/response';
import { recordAudit } from '../services/audit.service';

function signToken(user: { id: string; email: string; role: string; region: string | null; institutionId: string | null }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, region: user.region, institutionId: user.institutionId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return fail(res, 401, 'Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return fail(res, 401, 'Invalid credentials');

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    region: user.region,
    institutionId: user.institutionId,
  });

  await recordAudit({
    userId: user.id,
    userRole: user.role,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return ok(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      region: user.region,
      institutionId: user.institutionId,
      designation: user.designation,
    },
  }, 'Logged in');
}

export async function register(req: Request, res: Response) {
  const { email, password, fullName, role, region, institutionId, designation } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail(res, 409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, role, region: region ?? null, institutionId: institutionId ?? null, designation },
  });
  return ok(res, { id: user.id, email: user.email, role: user.role }, 'User registered');
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { institution: true },
  });
  if (!user) return fail(res, 404, 'User not found');
  return ok(res, {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    region: user.region,
    designation: user.designation,
    institution: user.institution,
  });
}
