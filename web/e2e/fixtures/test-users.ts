/**
 * E2E Test Fixtures: Test Users
 *
 * Centralized test credentials used across all E2E tests.
 * These credentials must match what global-setup.ts creates.
 *
 * IMPORTANT: Keep these in sync with web/e2e/global-setup.ts
 */

import { E2E_TEST_OWNER, E2E_TEST_TENANT } from '../global-setup'

// Re-export for convenience
export { E2E_TEST_TENANT }

/**
 * Test user credentials
 * All users belong to the E2E_TEST_TENANT (terrapet)
 */
export const TEST_USERS = {
  /** Pet owner - can book appointments, manage pets, shop */
  owner: {
    email: E2E_TEST_OWNER.email,
    password: E2E_TEST_OWNER.password,
    fullName: E2E_TEST_OWNER.fullName,
    role: 'owner' as const,
  },

  /** Veterinarian - can view all patients, manage appointments, prescriptions */
  vet: {
    email: 'e2e-vet@test.local',
    password: 'E2ETestPassword123!',
    fullName: 'E2E Test Vet',
    role: 'vet' as const,
  },

  /** Admin - full access including settings, team, finances */
  admin: {
    email: 'e2e-admin@test.local',
    password: 'E2ETestPassword123!',
    fullName: 'E2E Test Admin',
    role: 'admin' as const,
  },
} as const

export type TestUserRole = keyof typeof TEST_USERS

/**
 * Get user credentials by role
 */
export function getTestUser(role: TestUserRole) {
  return TEST_USERS[role]
}

/**
 * Common URLs for the test tenant
 */
export const TEST_URLS = {
  // Auth
  login: `/${E2E_TEST_TENANT}/portal/login`,
  register: `/${E2E_TEST_TENANT}/register`,
  logout: `/${E2E_TEST_TENANT}/logout`,

  // Public
  home: `/${E2E_TEST_TENANT}`,
  booking: `/${E2E_TEST_TENANT}/book`,
  store: `/${E2E_TEST_TENANT}/store`,

  // Portal (owner)
  portalDashboard: `/${E2E_TEST_TENANT}/portal/dashboard`,
  portalAppointments: `/${E2E_TEST_TENANT}/portal/appointments`,
  portalPets: `/${E2E_TEST_TENANT}/portal/pets`,
  portalVaccines: `/${E2E_TEST_TENANT}/portal/vaccines`,
  portalInvoices: `/${E2E_TEST_TENANT}/portal/finance`,

  // Dashboard (staff)
  dashboardHome: `/${E2E_TEST_TENANT}/dashboard`,
  dashboardAppointments: `/${E2E_TEST_TENANT}/dashboard/appointments`,
  dashboardCalendar: `/${E2E_TEST_TENANT}/dashboard/calendar`,
  dashboardPatients: `/${E2E_TEST_TENANT}/dashboard/patients`,
  dashboardWaitingRoom: `/${E2E_TEST_TENANT}/dashboard/waiting-room`,
  dashboardInvoices: `/${E2E_TEST_TENANT}/dashboard/invoices`,

  // Store
  storeCart: `/${E2E_TEST_TENANT}/store/cart`,
  storeCheckout: `/${E2E_TEST_TENANT}/store/checkout`,
} as const

/**
 * Test data identifiers created by global-setup
 * These are prefixed with "E2E" for easy identification
 */
export const TEST_DATA_PREFIXES = {
  pet: 'E2E',
  product: 'E2E-',
  service: 'E2E ',
  coupon: 'E2ETEST',
} as const
