import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'

/**
 * Vitest Configuration for Load Tests
 * 
 * Load tests require:
 * - Real Supabase connection (no mocks)
 * - Environment variables from .env.local
 * - No setup file (to avoid global mocks)
 * - Longer timeouts
 */
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'node', // Node environment for real database connections
    
    // Load .env.local for Supabase credentials
    env: loadEnv(mode, process.cwd(), ''),
    
    // No setup file - we don't want Supabase mocks
    // setupFiles: [],
    
    // Longer timeout for load tests
    testTimeout: 30000,
    
    // Load test file patterns
    include: ['tests/load/**/*.test.ts'],
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Single thread (load tests need real concurrency)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // No retries for load tests (we want real results)
    retry: 0,
    
    // Watch mode disabled
    watch: false,
  },
}))
