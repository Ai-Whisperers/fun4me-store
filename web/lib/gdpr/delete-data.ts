/**
 * GDPR Data Deletion Utility
 *
 * COMP-001: Implements GDPR Article 17 (Right to Erasure)
 * Handles data deletion and anonymization with legal retention compliance
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DeletionResult } from './types'
import { DATA_CATEGORIES } from './types'

/**
 * Anonymization placeholder values
 */
const ANONYMIZED = {
  name: '[DATOS ELIMINADOS]',
  email: 'deleted@anonymized.local',
  phone: '0000000000',
  address: '[DATOS ELIMINADOS]',
  content: '[CONTENIDO ELIMINADO POR SOLICITUD GDPR]',
} as const

/**
 * Delete or anonymize all user data per GDPR requirements
 *
 * @param userId - The user ID whose data should be deleted
 * @param tenantId - The tenant ID for the user
 * @returns Detailed result of the deletion operation
 */
export async function deleteUserData(
  userId: string,
  tenantId: string
): Promise<DeletionResult> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const deletedCategories: string[] = []
  const anonymizedCategories: string[] = []
  const errors: Array<{ category: string; error: string }> = []

  // Get user's pets for cascading operations
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  const petIds = pets?.map((p) => p.id) || []

  // 1. Delete fully deletable data
  try {
    await deleteFullyDeletableData(supabase, userId, tenantId, petIds)
    deletedCategories.push(...DATA_CATEGORIES.deletable)
  } catch (error: unknown) {
    errors.push({
      category: 'deletable_data',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 2. Anonymize medical/legal records
  try {
    await anonymizeMedicalRecords(supabase, userId, tenantId, petIds)
    anonymizedCategories.push('medical_records')
  } catch (error: unknown) {
    errors.push({
      category: 'medical_records',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 3. Anonymize prescriptions
  try {
    await anonymizePrescriptions(supabase, userId, tenantId, petIds)
    anonymizedCategories.push('prescriptions')
  } catch (error: unknown) {
    errors.push({
      category: 'prescriptions',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 4. Anonymize consent documents
  try {
    await anonymizeConsentDocuments(supabase, userId, tenantId, petIds)
    anonymizedCategories.push('consent_documents')
  } catch (error: unknown) {
    errors.push({
      category: 'consent_documents',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 5. Anonymize invoices
  try {
    await anonymizeInvoices(supabase, userId, tenantId)
    anonymizedCategories.push('invoices')
  } catch (error: unknown) {
    errors.push({
      category: 'invoices',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 6. Anonymize audit logs
  try {
    await anonymizeAuditLogs(supabase, userId, tenantId)
    anonymizedCategories.push('audit_logs')
  } catch (error: unknown) {
    errors.push({
      category: 'audit_logs',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 7. Anonymize profile (but keep structure for foreign key integrity)
  try {
    await anonymizeProfile(supabase, userId)
    anonymizedCategories.push('profile')
  } catch (error: unknown) {
    errors.push({
      category: 'profile',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 8. Delete pets (after anonymizing related records)
  try {
    await deletePets(supabase, userId, tenantId)
    deletedCategories.push('pets')
  } catch (error: unknown) {
    errors.push({
      category: 'pets',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  // 9. Delete from Supabase Auth (last step)
  try {
    await adminClient.auth.admin.deleteUser(userId)
    deletedCategories.push('auth_user')
  } catch (error: unknown) {
    errors.push({
      category: 'auth_user',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }

  return {
    success: errors.length === 0,
    deletedCategories,
    anonymizedCategories,
    retainedCategories: [...DATA_CATEGORIES.retained],
    errors,
    completedAt: new Date().toISOString(),
  }
}

/**
 * Delete fully deletable data (no legal retention required)
 */
async function deleteFullyDeletableData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string,
  petIds: string[]
): Promise<void> {
  // Delete store cart
  await supabase
    .from('store_carts')
    .delete()
    .eq('customer_id', userId)
    .eq('tenant_id', tenantId)

  // Delete store wishlist
  await supabase
    .from('store_wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  // Delete stock alerts
  await supabase
    .from('store_stock_alerts')
    .delete()
    .eq('email', userId) // Assuming email is used as identifier
    .eq('tenant_id', tenantId)

  // Delete store reviews
  await supabase
    .from('store_reviews')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  // Delete reminders for user's pets
  if (petIds.length > 0) {
    await supabase
      .from('reminders')
      .delete()
      .eq('tenant_id', tenantId)
      .in('pet_id', petIds)
  }

  // Delete reminders for user
  await supabase
    .from('reminders')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('client_id', userId)

  // Delete notifications
  await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)

  // Get and delete conversations and messages
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('client_id', userId)
    .eq('tenant_id', tenantId)

  if (conversations && conversations.length > 0) {
    const conversationIds = conversations.map((c) => c.id)

    // Delete message attachments first
    await supabase
      .from('message_attachments')
      .delete()
      .in('message_id', conversationIds)

    // Delete messages
    await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds)

    // Delete conversations
    await supabase
      .from('conversations')
      .delete()
      .eq('client_id', userId)
      .eq('tenant_id', tenantId)
  }

  // Delete loyalty points and transactions
  await supabase
    .from('loyalty_transactions')
    .delete()
    .eq('user_id', userId)

  await supabase
    .from('loyalty_points')
    .delete()
    .eq('user_id', userId)
}

/**
 * Anonymize medical records (required for legal retention)
 */
async function anonymizeMedicalRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  _userId: string,
  tenantId: string,
  petIds: string[]
): Promise<void> {
  if (petIds.length === 0) return

  // Anonymize medical records - remove PII but keep medical data
  await supabase
    .from('medical_records')
    .update({
      notes: ANONYMIZED.content,
      // Keep diagnosis, treatment for medical history
    })
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  // Anonymize vaccines
  await supabase
    .from('vaccines')
    .update({
      notes: ANONYMIZED.content,
    })
    .in('pet_id', petIds)

  // Anonymize vaccine reactions
  await supabase
    .from('vaccine_reactions')
    .update({
      notes: ANONYMIZED.content,
    })
    .in('pet_id', petIds)

  // Anonymize hospitalizations
  const { data: hospitalizations } = await supabase
    .from('hospitalizations')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  if (hospitalizations && hospitalizations.length > 0) {
    const hospIds = hospitalizations.map((h) => h.id)

    await supabase
      .from('hospitalizations')
      .update({
        notes: ANONYMIZED.content,
        discharge_notes: ANONYMIZED.content,
      })
      .in('id', hospIds)
  }
}

/**
 * Anonymize prescriptions (required for legal retention)
 */
async function anonymizePrescriptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  _userId: string,
  tenantId: string,
  petIds: string[]
): Promise<void> {
  if (petIds.length === 0) return

  // Keep prescription data for medical records, but remove any personal notes
  await supabase
    .from('prescriptions')
    .update({
      notes: ANONYMIZED.content,
    })
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)
}

/**
 * Anonymize consent documents (required for legal retention)
 */
async function anonymizeConsentDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  _userId: string,
  tenantId: string,
  petIds: string[]
): Promise<void> {
  if (petIds.length === 0) return

  // Remove signature but keep record of consent
  await supabase
    .from('consent_documents')
    .update({
      signature_url: null,
      signatory_name: ANONYMIZED.name,
    })
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)
}

/**
 * Anonymize invoices (required for financial records retention)
 */
async function anonymizeInvoices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<void> {
  // Anonymize client reference but keep financial data
  await supabase
    .from('invoices')
    .update({
      client_name: ANONYMIZED.name,
      client_email: ANONYMIZED.email,
      client_phone: ANONYMIZED.phone,
      client_address: ANONYMIZED.address,
      notes: ANONYMIZED.content,
    })
    .eq('tenant_id', tenantId)
    .eq('client_id', userId)
}

/**
 * Anonymize audit logs (keep for compliance but remove PII)
 */
async function anonymizeAuditLogs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<void> {
  // Update audit logs to remove identifying details
  // Note: We keep the action/resource for compliance but anonymize user details
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, details')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  if (logs && logs.length > 0) {
    for (const log of logs) {
      const anonymizedDetails = {
        ...(log.details as Record<string, unknown>),
        ip_address: '0.0.0.0',
        user_agent: ANONYMIZED.content,
        user_email: ANONYMIZED.email,
      }

      await supabase
        .from('audit_logs')
        .update({ details: anonymizedDetails })
        .eq('id', log.id)
    }
  }
}

/**
 * Anonymize profile (keep structure for FK integrity, remove PII)
 */
async function anonymizeProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      full_name: ANONYMIZED.name,
      email: ANONYMIZED.email,
      phone: ANONYMIZED.phone,
      avatar_url: null,
      // Mark as deleted
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

/**
 * Delete pets and related data that doesn't need retention
 */
async function deletePets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<void> {
  // Get pets
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (!pets || pets.length === 0) return

  const petIds = pets.map((p) => p.id)

  // Delete QR tags
  await supabase
    .from('qr_tags')
    .delete()
    .in('pet_id', petIds)

  // Delete growth records
  await supabase
    .from('growth_records')
    .delete()
    .in('pet_id', petIds)

  // Delete reproductive cycles
  await supabase
    .from('reproductive_cycles')
    .delete()
    .in('pet_id', petIds)

  // Delete euthanasia assessments
  await supabase
    .from('euthanasia_assessments')
    .delete()
    .in('pet_id', petIds)

  // Delete lost pet reports
  await supabase
    .from('lost_pets')
    .delete()
    .in('pet_id', petIds)

  // Delete adoption listings
  await supabase
    .from('adoptions')
    .delete()
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  // Update pets to anonymized state (keep for medical record integrity)
  await supabase
    .from('pets')
    .update({
      name: ANONYMIZED.name,
      photo_url: null,
      microchip_id: null,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .in('id', petIds)
}

/**
 * Log a GDPR deletion request for compliance
 */
export async function logGDPRDeletion(
  requestId: string,
  userId: string,
  tenantId: string,
  result: DeletionResult
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('gdpr_compliance_logs').insert({
    request_id: requestId,
    user_id: userId,
    tenant_id: tenantId,
    action: 'data_erasure',
    details: {
      deleted_categories: result.deletedCategories,
      anonymized_categories: result.anonymizedCategories,
      retained_categories: result.retainedCategories,
      errors: result.errors,
      completed_at: result.completedAt,
    },
    performed_by: 'system',
    performed_at: new Date().toISOString(),
  })
}

/**
 * Check if user can be deleted (no pending obligations)
 */
export async function canDeleteUser(
  userId: string,
  tenantId: string
): Promise<{ canDelete: boolean; blockers: string[] }> {
  const supabase = await createClient()
  const blockers: string[] = []

  // Check for unpaid invoices
  const { data: unpaidInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', userId)
    .eq('tenant_id', tenantId)
    .in('status', ['sent', 'overdue'])
    .limit(1)

  if (unpaidInvoices && unpaidInvoices.length > 0) {
    blockers.push('Tiene facturas pendientes de pago')
  }

  // Check for pending appointments
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (pets && pets.length > 0) {
    const petIds = pets.map((p) => p.id)

    const { data: pendingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('pet_id', petIds)
      .in('status', ['scheduled', 'confirmed'])
      .limit(1)

    if (pendingAppointments && pendingAppointments.length > 0) {
      blockers.push('Tiene citas pendientes')
    }
  }

  // Check for hospitalized pets
  if (pets && pets.length > 0) {
    const petIds = pets.map((p) => p.id)

    const { data: hospitalizedPets } = await supabase
      .from('hospitalizations')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('pet_id', petIds)
      .eq('status', 'admitted')
      .limit(1)

    if (hospitalizedPets && hospitalizedPets.length > 0) {
      blockers.push('Tiene mascotas hospitalizadas')
    }
  }

  // Check for pending store orders
  const { data: pendingOrders } = await supabase
    .from('store_orders')
    .select('id')
    .eq('customer_id', userId)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'processing', 'shipped'])
    .limit(1)

  if (pendingOrders && pendingOrders.length > 0) {
    blockers.push('Tiene pedidos pendientes de entrega')
  }

  return {
    canDelete: blockers.length === 0,
    blockers,
  }
}
