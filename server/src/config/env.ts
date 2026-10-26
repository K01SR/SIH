import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

// In production a weak default secret must never be silently accepted.
const jwtSecret =
  process.env.JWT_SECRET ||
  (nodeEnv === 'production'
    ? ''
    : 'dev-secret-change-in-production');

if (nodeEnv === 'production' && (!jwtSecret || jwtSecret.length < 16)) {
  throw new Error('JWT_SECRET must be set to a strong value (>=16 chars) in production');
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrl:
    process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  escalationCron: process.env.ESCALATION_CRON || '*/5 * * * *',
  enableScheduler: process.env.ENABLE_SCHEDULER !== 'false',
};
