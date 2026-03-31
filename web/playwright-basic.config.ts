import { defineConfig, devices } from '@playwright/test'

/**
 * Basic Playwright Configuration - No Global Setup
 * 
 * Simple config for testing the E2E framework without complex setup
 */

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,

  // No global setup - keep it simple
  // globalSetup: './e2e/global-setup.ts',
  // globalTeardown: './e2e/global-teardown.ts',

  reporter: [['list']],

  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  // Auto-start dev server for E2E tests
  webServer: {
    command: 'npm run dev -- --port 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 minutes to start
  },

  projects: [
    {
      name: 'basic-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // No auth state - fresh browser
      },
    },
  ],

  outputDir: 'test-results-basic',
})