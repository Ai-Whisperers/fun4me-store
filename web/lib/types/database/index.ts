/**
 * Database Types - Barrel Export
 *
 * This file re-exports all types from the split modules for backward compatibility.
 * Import from '@/lib/types/database' or '@/lib/types/database.ts' (legacy)
 *
 * Types are organized by domain:
 * - enums.ts - All enum types
 * - core.ts - Tenant, Profile, ClinicInvite
 * - pets.ts - Pet, Vaccine, MedicalRecord, Prescription, Appointment
 * - invoicing.ts - Service, Invoice, Payment, Refund
 * - notifications.ts - Reminders, Notifications
 * - hospitalization.ts - Kennel, Hospitalization, Vitals, Treatment
 * - lab.ts - Lab tests, orders, results
 * - consent.ts - Consent templates, documents
 * - staff.ts - Staff profiles, shifts, time-off
 * - messaging.ts - Conversations, messages, campaigns
 * - insurance.ts - Insurance providers, policies, claims
 * - analytics.ts - Dashboard stats, materialized views
 * - helpers.ts - API response types, pagination
 */

// Enums
export * from './enums'

// Core tables
export * from './core'

// Domain-specific tables
export * from './pets'
export * from './invoicing'
export * from './notifications'
export * from './hospitalization'
export * from './lab'
export * from './consent'
export * from './staff'
export * from './messaging'
export * from './insurance'

// Analytics & Dashboard
export * from './analytics'

// Helpers
export * from './helpers'
