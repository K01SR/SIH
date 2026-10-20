import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    // Run tests sequentially — they share a single SQLite test database.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
