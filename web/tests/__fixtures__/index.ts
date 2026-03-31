/**
 * Test Fixtures - Central Export
 *
 * Re-exports all fixtures for easy importing in tests.
 */

// Tenants
export * from './tenants'

// Users
export * from './users'

// Pets
export * from './pets'

// Vaccines
export * from './vaccines'

// Appointments
export * from './appointments'

/**
 * Quick Reference:
 *
 * Tenants:
 *   import { DEFAULT_TENANT, TENANT_ROUTES, tenantUrl } from '@/tests/__fixtures__';
 *
 * Users:
 *   import { DEFAULT_OWNER, DEFAULT_VET, DEFAULT_ADMIN, getUser } from '@/tests/__fixtures__';
 *
 * Pets:
 *   import { DEFAULT_PET, getPet, generatePetData } from '@/tests/__fixtures__';
 *
 * Vaccines:
 *   import { getVaccinesByPet, generateVaccineData } from '@/tests/__fixtures__';
 *
 * Appointments:
 *   import { generateAppointmentData, TIME_SLOTS } from '@/tests/__fixtures__';
 */
