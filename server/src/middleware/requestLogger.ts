import morgan from 'morgan';
import type { Request } from 'express';
import { env } from '../config/env';

/**
 * Structured request logging. Uses concise output in development and a
 * compact timestamped format suitable for log aggregation in production.
 */
export const requestLogger = morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', {
  skip: (req: Request) => req.path === '/api/health',
});
