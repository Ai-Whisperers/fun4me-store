import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

/**
 * Improved Playwright Configuration for E2E Tests
 *
 * IMPROVEMENTS:
 * - Uses improved global setup with robust cleanup
 * - Better error handling and recovery
 * - More resilient user creation and auth state setup
 * - Simplified test data creation to reduce complexity
 * - Sequential execution to prevent conflicts
 *
 * Run tests:
 *   npm run test:e2e:improved              # All tests with improved setup
 *   npx playwright test --config=playwright-improved.config.ts  # Direct command
 */

const AUTH_FILE = resolve(__dirname, '.auth', 'owner.json')

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Sequential to prevent conflicts
  workers: 1,

  // Use improved global setup/teardown
  globalSetup: './e2e/global-setup-improved.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // Reporters
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-improved' }],
  ],

  // Shared settings for all projects
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  projects: [
    // Setup project - runs auth before all tests
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Main test project with authenticated state
    {
      name: 'chromium-improved',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // Unauthenticated project for public pages and auth flow tests
    {
      name: 'chromium-unauthenticated',
      testMatch: /\/(public|auth)\//,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - fresh browser
      },
    },
  ],

  // Output directories
  outputDir: 'test-results-improved',
})