import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'

// Load environment variables (priority order: .env.test > .env.local > .env)
const envTestPath = resolve(__dirname, '.env.test')
const envLocalPath = resolve(__dirname, '.env.local')
const envPath = resolve(__dirname, '.env')

if (existsSync(envTestPath)) {
  loadDotenv({ path: envTestPath })
  console.log('[Vitest Component Config] Loaded environment from .env.test')
} else if (existsSync(envLocalPath)) {
  loadDotenv({ path: envLocalPath })
  console.log('[Vitest Component Config] Loaded environment from .env.local')
} else if (existsSync(envPath)) {
  loadDotenv({ path: envPath })
  console.log('[Vitest Component Config] Loaded environment from .env')
} else {
  console.warn('[Vitest Component Config] No .env.test, .env.local or .env found - tests may fail')
}

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      // Mock modules for testing
      redis: resolve(__dirname, './tests/__mocks__/redis.ts'),
      'server-only': resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
  test: {
    name: 'components',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup-components.ts'],
    
    // Test file patterns - only component tests
    include: ['tests/components/**/*.test.tsx', 'tests/components/**/*.test.ts'],
    
    // Exclude other test types
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/unit/**',
      'tests/integration/**',
      'tests/api/**',
      'e2e/**',
    ],
    
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/components',
      exclude: [
        'node_modules/**',
        '.next/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/route.ts',
      ],
      // Coverage thresholds for components
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
    
    // Timeouts
    testTimeout: 15000, // Component tests may need more time for rendering
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Parallel execution settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution for component tests
      },
    },
    isolate: true,
    maxConcurrency: 4, // Run up to 4 tests in parallel
    
    // Sequence configuration
    sequence: {
      shuffle: false, // Deterministic test order
    },
    
    // Retry failed tests once
    retry: 1,
    
    // Watch mode
    watch: false,
  },
}))
