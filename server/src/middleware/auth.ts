import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { fail } from '../utils/response';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  region?: string | null;
  institutionId?: string | null;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 401, 'Authentication required');
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role as never,
      region: (payload.region as never) ?? null,
      institutionId: payload.institutionId ?? null,
    };
    next();
  } catch {
    return fail(res, 401, 'Invalid or expired token');
  }
};

export const authorize = (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return fail(res, 401, 'Authentication required');
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return fail(res, 403, 'Insufficient permissions for this action');
    }
    next();
  };
