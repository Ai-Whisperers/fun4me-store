/**
 * Insurance validation schemas
 * For policies, claims, and pre-authorization
 */

import { z } from 'zod'
import { INSURANCE_CLAIM_STATUSES } from '../types/status'
import { uuidSchema, requiredString, optionalString, currencySchema, enumSchema } from './common'

// =============================================================================
// INSURANCE POLICY
// =============================================================================

/**
 * Coverage types for insurance policies
 */
export const COVERAGE_TYPES = [
  'basic',
  'standard',
  'premium',
  'comprehensive',
  'accident_only',
  'wellness',
] as const
export type CoverageType = (typeof COVERAGE_TYPES)[number]

/**
 * Policy statuses
 */
export const POLICY_STATUSES = ['pending', 'active', 'expired', 'cancelled', 'suspended'] as const
export type PolicyStatus = (typeof POLICY_STATUSES)[number]

/**
 * Schema for creating an insurance policy
 */
export const createInsurancePolicySchema = z.object({
  pet_id: uuidSchema,
  provider_id: uuidSchema,
  policy_number: requiredString('Número de póliza', 50),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  coverage_type: enumSchema(COVERAGE_TYPES, 'Tipo de cobertura'),
  coverage_limit: currencySchema.optional(),
  deductible: z.number().min(0).optional(),
  reimbursement_percentage: z.number().min(0).max(100).optional(),
  premium_amount: z.number().min(0).optional(),
  billing_frequency: z.enum(['monthly', 'quarterly', 'annual']).optional(),
  coverage_details: optionalString(2000),
  exclusions: optionalString(2000),
  notes: optionalString(1000),
})

export type CreateInsurancePolicyInput = z.infer<typeof createInsurancePolicySchema>

/**
 * Schema for updating an insurance policy
 */
export const updateInsurancePolicySchema = createInsurancePolicySchema.partial().extend({
  status: z.enum(POLICY_STATUSES).optional(),
  cancelled_at: z.string().datetime().optional(),
  cancellation_reason: optionalString(500),
})

export type UpdateInsurancePolicyInput = z.infer<typeof updateInsurancePolicySchema>

// =============================================================================
// INSURANCE CLAIMS
// =============================================================================

/**
 * Claim types
 */
export const CLAIM_TYPES = [
  'medical',
  'surgical',
  'preventive',
  'emergency',
  'hospitalization',
  'diagnostic',
  'dental',
  'wellness',
  'other',
] as const
export type ClaimType = (typeof CLAIM_TYPES)[number]

/**
 * Schema for creating an insurance claim
 */
export const createInsuranceClaimSchema = z.object({
  policy_id: uuidSchema,
  pet_id: uuidSchema,
  claim_type: enumSchema(CLAIM_TYPES, 'Tipo de reclamo'),
  amount: currencySchema.refine((val) => val > 0, 'El monto debe ser mayor a 0'),
  description: requiredString('Descripción', 1000),
  service_date: z.string().datetime(),
  invoice_id: uuidSchema.optional(),
  diagnosis_code: optionalString(50),
  treatment_code: optionalString(50),
  documents: z.array(z.string().url()).optional(),
  veterinarian_notes: optionalString(1000),
})

export type CreateInsuranceClaimInput = z.infer<typeof createInsuranceClaimSchema>

/**
 * Schema for updating claim status
 */
export const updateClaimStatusSchema = z.object({
  status: z.enum(INSURANCE_CLAIM_STATUSES),
  approved_amount: z.number().min(0).optional(),
  paid_amount: z.number().min(0).optional(),
  paid_at: z.string().datetime().optional(),
  denial_reason: optionalString(500),
  denial_code: optionalString(50),
  appeal_deadline: z.string().datetime().optional(),
  notes: optionalString(1000),
})

export type UpdateClaimStatusInput = z.infer<typeof updateClaimStatusSchema>

/**
 * Schema for submitting a claim appeal
 */
export const submitClaimAppealSchema = z.object({
  claim_id: uuidSchema,
  appeal_reason: requiredString('Motivo de apelación', 2000),
  additional_documents: z.array(z.string().url()).optional(),
  veterinarian_statement: optionalString(2000),
})

export type SubmitClaimAppealInput = z.infer<typeof submitClaimAppealSchema>

// =============================================================================
// CLAIM ITEMS
// =============================================================================

/**
 * Schema for adding items to a claim
 */
export const createClaimItemSchema = z.object({
  claim_id: uuidSchema,
  service_id: uuidSchema.optional(),
  product_id: uuidSchema.optional(),
  description: requiredString('Descripción', 500),
  amount: currencySchema.refine((val) => val > 0, 'El monto debe ser mayor a 0'),
  quantity: z.number().int().min(1).default(1),
  procedure_code: optionalString(50),
  is_covered: z.boolean().default(true),
  denial_reason: optionalString(500),
})

export type CreateClaimItemInput = z.infer<typeof createClaimItemSchema>

// =============================================================================
// INSURANCE PROVIDERS
// =============================================================================

/**
 * Schema for creating an insurance provider
 */
export const createInsuranceProviderSchema = z.object({
  name: requiredString('Nombre', 200),
  contact_email: z.string().email('Email inválido').optional(),
  contact_phone: optionalString(50),
  website: z.string().url('URL inválida').optional(),
  address: optionalString(500),
  claim_submission_email: z.string().email('Email inválido').optional(),
  claim_submission_url: z.string().url('URL inválida').optional(),
  average_processing_days: z.number().int().min(1).max(365).optional(),
  notes: optionalString(1000),
  is_active: z.boolean().default(true),
})

export type CreateInsuranceProviderInput = z.infer<typeof createInsuranceProviderSchema>

/**
 * Schema for updating an insurance provider
 */
export const updateInsuranceProviderSchema = createInsuranceProviderSchema.partial().extend({
  id: uuidSchema,
})

export type UpdateInsuranceProviderInput = z.infer<typeof updateInsuranceProviderSchema>

// =============================================================================
// PRE-AUTHORIZATION
// =============================================================================

/**
 * Pre-authorization request statuses
 */
export const PREAUTH_STATUSES = ['pending', 'approved', 'denied', 'expired', 'cancelled'] as const
export type PreAuthStatus = (typeof PREAUTH_STATUSES)[number]

/**
 * Schema for creating a pre-authorization request
 */
export const createPreAuthSchema = z.object({
  policy_id: uuidSchema,
  pet_id: uuidSchema,
  procedure_name: requiredString('Nombre del procedimiento', 200),
  procedure_code: optionalString(50),
  estimated_cost: currencySchema,
  planned_date: z.string().datetime(),
  veterinarian_notes: requiredString('Justificación clínica', 1000),
  diagnosis: requiredString('Diagnóstico', 500),
  urgency: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  supporting_documents: z.array(z.string().url()).optional(),
})

export type CreatePreAuthInput = z.infer<typeof createPreAuthSchema>

/**
 * Schema for updating pre-authorization status
 */
export const updatePreAuthSchema = z.object({
  status: z.enum(PREAUTH_STATUSES),
  approved_amount: z.number().min(0).optional(),
  approval_code: optionalString(100),
  expires_at: z.string().datetime().optional(),
  conditions: optionalString(1000),
  denial_reason: optionalString(500),
  notes: optionalString(1000),
})

export type UpdatePreAuthInput = z.infer<typeof updatePreAuthSchema>

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Schema for policy query parameters
 */
export const policyQuerySchema = z.object({
  pet_id: uuidSchema.optional(),
  provider_id: uuidSchema.optional(),
  status: z.enum(POLICY_STATUSES).optional(),
  coverage_type: z.enum(COVERAGE_TYPES).optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PolicyQueryParams = z.infer<typeof policyQuerySchema>

/**
 * Schema for claim query parameters
 */
export const claimQuerySchema = z.object({
  policy_id: uuidSchema.optional(),
  pet_id: uuidSchema.optional(),
  status: z.enum(INSURANCE_CLAIM_STATUSES).optional(),
  claim_type: z.enum(CLAIM_TYPES).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ClaimQueryParams = z.infer<typeof claimQuerySchema>
