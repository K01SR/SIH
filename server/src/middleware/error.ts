import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
}

/** eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A record with these details already exists', code: 'CONFLICT' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found', code: 'NOT_FOUND' });
    }
  }

  console.error('[error]', err);
  const status = (err as { status?: number }).status ?? 500;
  const message = (err as Error).message || 'Internal server error';
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : message,
    code: 'INTERNAL_ERROR',
  });
}
