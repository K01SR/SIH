import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/** Global API rate limiter to protect against abuse and brute force. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});

/** Stricter limiter for authentication endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' },
});

/** No-op passthrough retained for symmetry in tests. */
export const noopLimiter = (_req: Request, _res: Response, next: NextFunction) => next();
