/**
 * DATABASE TYPES - Auto-generated from SQL schema
 *
 * NOTE: This file re-exports from split modules for backward compatibility.
 * For new code, prefer importing directly from '@/lib/types/database/'
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

export * from './database/index'
