import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Prepares an isolated SQLite database for the test run before any test file
 * imports the Prisma client. Must be required first in the global setup.
 */
const testDbPath = path.resolve(process.cwd(), 'prisma/test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-value';
process.env.ENABLE_SCHEDULER = 'false';

if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

execSync('npx prisma db push --skip-generate --accept-data-loss', {
  stdio: 'ignore',
  env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
});

export const TEST_DB_URL = `file:${testDbPath}`;
