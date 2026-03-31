import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'path'

/**
 * Playwright Configuration for E2E Tests
 *
 * Features:
 * - Global setup/teardown for test data creation
 * - Auth state persistence (login once, reuse across tests)
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Visual validation tests with screenshots at each step
 *
 * Run tests:
 *   npm run test:e2e              # All tests
 *   npm run test:e2e -- --project=chromium  # Single browser
 *   npm run test:e2e:headed       # With browser visible
 *   npm run test:e2e -- --project=visual-chromium e2e/visual/  # Visual tests
 */

const AUTH_FILE = resolve(__dirname, '.auth', 'owner.json')
const SCREENSHOTS_DIR = resolve(__dirname, 'screenshots')

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false, // Changed to false to respect workers: 1
  workers: 1, // Run tests sequentially to prevent dev server overload

  // Global setup/teardown for E2E test data
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // Reporters
  reporter: [['list'], ['html', { open: 'never' }]],

  // Shared settings for all projects
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000, // Increased for slow dev server with heavy content
    actionTimeout: 10000,
  },

  projects: [
    // Setup project - runs auth before all tests
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Main browser projects - depend on setup
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use authenticated state from setup
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
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

    // ==========================================================================
    // Visual Validation Projects - Capture screenshots at each step
    // ==========================================================================

    // Visual tests - Chromium (authenticated)
    {
      name: 'visual-chromium',
      testMatch: /\/visual\//,
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        // Always capture screenshots for visual tests
        screenshot: 'on',
        video: 'on',
        trace: 'on',
      },
      dependencies: ['setup'],
    },

    // Visual tests - Mobile (authenticated)
    {
      name: 'visual-mobile',
      testMatch: /\/visual\//,
      use: {
        ...devices['iPhone 14'],
        storageState: AUTH_FILE,
        screenshot: 'on',
        video: 'on',
        trace: 'on',
      },
      dependencies: ['setup'],
    },

    // Visual tests - Unauthenticated (for registration/auth flow)
    {
      name: 'visual-unauthenticated',
      testMatch: /\/visual\/(registration|auth-flow)\./,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - fresh browser for registration/auth tests
        screenshot: 'on',
        video: 'on',
        trace: 'on',
      },
    },
  ],

  // Output directories
  outputDir: 'test-results',
})
