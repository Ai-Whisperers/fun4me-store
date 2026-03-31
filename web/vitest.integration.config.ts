import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'
import { existsSync } from 'fs'

// Load environment variables for integration tests
const envTestPath = resolve(__dirname, '.env.test')
const envLocalPath = resolve(__dirname, '.env.local')
const envPath = resolve(__dirname, '.env')

if (existsSync(envTestPath)) {
  loadDotenv({ path: envTestPath })
  console.log('[Integration Test Config] Loaded environment from .env.test')
} else if (existsSync(envLocalPath)) {
  loadDotenv({ path: envLocalPath })
  console.log('[Integration Test Config] Loaded environment from .env.local')
} else if (existsSync(envPath)) {
  loadDotenv({ path: envPath })
  console.log('[Integration Test Config] Loaded environment from .env')
} else {
  console.warn('[Integration Test Config] No .env file found')
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node', // Node environment for real database operations
    
    // Minimal setup - only essential Next.js mocks to prevent cookies() errors
    setupFiles: ['./vitest.integration.minimal.setup.ts'],
    
    // Longer timeout for database operations
    testTimeout: 30000,
    
    // Test file patterns
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
    
    // Exclude other test types
    exclude: ['node_modules/**', 'tests/unit/**', 'tests/api/**', 'tests/e2e/**'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'node_modules/**',
        'tests/__fixtures__/**',
        'tests/__helpers__/**',
        'tests/__mocks__/**',
      ],
    },
    
    // Reporter
    reporters: ['verbose'],
    
    // Pool configuration - use forks to completely isolate from mocks
    pool: 'forks',
    isolate: true,
    
    // No retry for integration tests (they should be deterministic)
    retry: 0,
  },
})
