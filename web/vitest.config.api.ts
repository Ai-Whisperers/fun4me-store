import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'

// Load environment variables (priority order: .env.test > .env.local > .env)
const envTestPath = resolve(__dirname, '.env.test')
const envLocalPath = resolve(__dirname, '.env.local')
const envPath = resolve(__dirname, '.env')

if (existsSync(envTestPath)) {
  loadDotenv({ path: envTestPath })
  console.log('[Vitest API Config] Loaded environment from .env.test')
} else if (existsSync(envLocalPath)) {
  loadDotenv({ path: envLocalPath })
  console.log('[Vitest API Config] Loaded environment from .env.local')
} else if (existsSync(envPath)) {
  loadDotenv({ path: envPath })
  console.log('[Vitest API Config] Loaded environment from .env')
} else {
  console.warn('[Vitest API Config] No .env.test, .env.local or .env found - tests may fail')
}

export default defineConfig(() => ({
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      // Mock modules for testing
      redis: resolve(__dirname, './tests/__mocks__/redis.ts'),
      'server-only': resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
  test: {
    name: 'api',
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.api.setup.ts'],
    
    // Test file patterns - only API tests
    include: ['tests/api/**/*.test.ts', 'tests/api/**/*.test.tsx'],
    
    // Exclude other test types
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/unit/**',
      'tests/integration/**',
      'tests/components/**',
      'tests/database/**',
      'e2e/**',
    ],
    
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/api',
      exclude: [
        'node_modules/**',
        '.next/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      // Coverage thresholds for API tests
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    
    // Timeouts
    testTimeout: 30000, // API tests may involve network calls
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Parallel execution settings (Vitest 4 flat config)
    pool: 'forks',
    forks: {
      singleFork: false, // Allow parallel execution
    },
    isolate: true,
    maxConcurrency: 4, // Run up to 4 tests in parallel
    
    // Sequence configuration
    sequence: {
      shuffle: false, // Deterministic test order
    },
    
    // Retry failed tests once (network may be flaky)
    retry: 1,
    
    // Watch mode
    watch: false,
  },
}))
