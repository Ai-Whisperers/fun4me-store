import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    include: ['tests/database/**/*.test.ts'],
    globals: true,
    setupFiles: ['./tests/database/setup-vitest.ts'],
    testTimeout: 30000, // 30s for database operations
    hookTimeout: 30000,
    teardownTimeout: 30000,
    pool: 'forks', // Use forks instead of threads for better isolation
    // Note: poolOptions removed in Vitest 4
    // Database tests run sequentially to avoid race conditions
    fileParallelism: false, // Run test files sequentially
    maxConcurrency: 1,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
