/**
 * GDPR Data Collection Utility
 *
 * COMP-001: Collects all user data for GDPR Article 15 (Right of Access)
 * and Article 20 (Right to Data Portability)
 */

import { createClient } from '@/lib/supabase/server'
import type {
  UserDataExport,
  DataSubjectInfo,
  ProfileData,
  PetData,
  AppointmentData,
  MedicalRecordData,
  PrescriptionData,
  InvoiceData,
  PaymentData,
  MessageData,
  LoyaltyData,
  StoreOrderData,
  StoreReviewData,
  ConsentData,
  ActivityLogEntry,
} from './types'

/**
 * Helper to get the first element from a Supabase relation (which returns arrays)
 */
function getRelationFirst<T>(relation: T | T[] | null | undefined): T | null {
  if (relation === null || relation === undefined) return null
  if (Array.isArray(relation)) return relation[0] ?? null
  return relation
}

/**
 * Collect all user data for GDPR export
 *
 * @param userId - The user ID to collect data for
 * @returns Complete user data export
 */
export async function collectUserData(userId: string): Promise<UserDataExport> {
  const supabase = await createClient()

  // Get base profile info first
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants!inner(name)')
    .eq('id', userId)
    .single()

  if (!profile) {
    throw new Error('Usuario no encontrado')
  }

  const tenantId = profile.tenant_id

  // Collect all data categories in parallel for efficiency
  const [
    profileData,
    petsData,
    appointmentsData,
    medicalRecordsData,
    prescriptionsData,
    invoicesData,
    paymentsData,
    messagesData,
    loyaltyData,
    storeOrdersData,
    storeReviewsData,
    consentsData,
    activityLogData,
  ] = await Promise.all([
    collectProfileData(supabase, userId),
    collectPetsData(supabase, userId, tenantId),
    collectAppointmentsData(supabase, userId, tenantId),
    collectMedicalRecordsData(supabase, userId, tenantId),
    collectPrescriptionsData(supabase, userId, tenantId),
    collectInvoicesData(supabase, userId, tenantId),
    collectPaymentsData(supabase, userId, tenantId),
    collectMessagesData(supabase, userId, tenantId),
    collectLoyaltyData(supabase, userId),
    collectStoreOrdersData(supabase, userId, tenantId),
    collectStoreReviewsData(supabase, userId, tenantId),
    collectConsentsData(supabase, userId, tenantId),
    collectActivityLogData(supabase, userId, tenantId),
  ])

  const dataSubject: DataSubjectInfo = {
    userId: profile.id,
    email: profile.email || '',
    fullName: profile.full_name || '',
    tenantId: profile.tenant_id,
    tenantName: getRelationFirst<{ name: string }>(profile.tenants)?.name || '',
    role: profile.role || 'owner',
    accountCreatedAt: profile.created_at,
  }

  return {
    exportedAt: new Date().toISOString(),
    format: 'json',
    dataSubject,
    profile: profileData,
    pets: petsData,
    appointments: appointmentsData,
    medicalRecords: medicalRecordsData,
    prescriptions: prescriptionsData,
    invoices: invoicesData,
    payments: paymentsData,
    messages: messagesData,
    loyaltyPoints: loyaltyData,
    storeOrders: storeOrdersData,
    storeReviews: storeReviewsData,
    consents: consentsData,
    activityLog: activityLogData,
  }
}

/**
 * Collect profile data
 */
async function collectProfileData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<ProfileData | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (!data) return null

  return {
    id: data.id,
    fullName: data.full_name || '',
    email: data.email || '',
    phone: data.phone || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Collect pets data
 */
async function collectPetsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<PetData[]> {
  const { data } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (!data) return []

  return data.map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species || '',
    breed: pet.breed || undefined,
    dateOfBirth: pet.date_of_birth || undefined,
    gender: pet.gender || undefined,
    weight: pet.weight || undefined,
    microchipId: pet.microchip_id || undefined,
    photoUrl: pet.photo_url || undefined,
    isDeceased: pet.is_deceased || false,
    createdAt: pet.created_at,
    updatedAt: pet.updated_at,
  }))
}

/**
 * Collect appointments data
 */
async function collectAppointmentsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<AppointmentData[]> {
  // Get user's pets first
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (!pets || pets.length === 0) return []

  const petIds = pets.map((p) => p.id)

  const { data } = await supabase
    .from('appointments')
    .select('id, start_time, status, notes, created_at, pets!inner(name), services(name)')
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  if (!data) return []

  return data.map((apt) => {
    // Supabase returns relations as arrays, get first element
    const pet = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets
    const service = Array.isArray(apt.services) ? apt.services[0] : apt.services
    return {
      id: apt.id,
      petName: (pet as { name: string } | undefined)?.name || '',
      serviceName: (service as { name: string } | null | undefined)?.name || 'Consulta',
      scheduledAt: apt.start_time,
      status: apt.status,
      notes: apt.notes || undefined,
      createdAt: apt.created_at,
    }
  })
}

/**
 * Collect medical records data
 */
async function collectMedicalRecordsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<MedicalRecordData[]> {
  // Get user's pets first
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (!pets || pets.length === 0) return []

  const petIds = pets.map((p) => p.id)

  const { data } = await supabase
    .from('medical_records')
    .select('id, record_type, visit_date, diagnosis, treatment, notes, created_at, pets!inner(name), profiles(full_name)')
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  if (!data) return []

  return data.map((record) => ({
    id: record.id,
    petName: getRelationFirst<{ name: string }>(record.pets)?.name || '',
    recordType: record.record_type || '',
    date: record.visit_date || record.created_at,
    diagnosis: record.diagnosis || undefined,
    treatment: record.treatment || undefined,
    notes: record.notes || undefined,
    vetName: getRelationFirst<{ full_name: string }>(record.profiles)?.full_name || undefined,
    createdAt: record.created_at,
  }))
}

/**
 * Collect prescriptions data
 */
async function collectPrescriptionsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<PrescriptionData[]> {
  // Get user's pets first
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (!pets || pets.length === 0) return []

  const petIds = pets.map((p) => p.id)

  const { data } = await supabase
    .from('prescriptions')
    .select('id, medications, created_at, valid_until, pets!inner(name), profiles(full_name)')
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  if (!data) return []

  return data.map((rx) => ({
    id: rx.id,
    petName: getRelationFirst<{ name: string }>(rx.pets)?.name || '',
    medications: Array.isArray(rx.medications)
      ? rx.medications.map((med: Record<string, string>) => ({
          name: med.name || '',
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          duration: med.duration || '',
        }))
      : [],
    prescribedAt: rx.created_at,
    validUntil: rx.valid_until || '',
    vetName: getRelationFirst<{ full_name: string }>(rx.profiles)?.full_name || '',
  }))
}

/**
 * Collect invoices data
 */
async function collectInvoicesData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<InvoiceData[]> {
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, subtotal, tax_amount, total, status, invoice_items(description, quantity, unit_price, total)')
    .eq('tenant_id', tenantId)
    .eq('client_id', userId)

  if (!data) return []

  return data.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number || '',
    date: inv.issue_date || '',
    items: Array.isArray(inv.invoice_items)
      ? inv.invoice_items.map((item: Record<string, unknown>) => ({
          description: (item.description as string) || '',
          quantity: (item.quantity as number) || 1,
          unitPrice: (item.unit_price as number) || 0,
          total: (item.total as number) || 0,
        }))
      : [],
    subtotal: inv.subtotal || 0,
    tax: inv.tax_amount || 0,
    total: inv.total || 0,
    status: inv.status || '',
  }))
}

/**
 * Collect payments data
 */
async function collectPaymentsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<PaymentData[]> {
  const { data } = await supabase
    .from('payments')
    .select('id, amount, payment_date, status, payment_methods(name), invoices(invoice_number)')
    .eq('tenant_id', tenantId)
    .eq('invoices.client_id', userId)

  if (!data) return []

  return data.map((payment) => ({
    id: payment.id,
    invoiceNumber: getRelationFirst<{ invoice_number: string }>(payment.invoices)?.invoice_number || undefined,
    amount: payment.amount || 0,
    method: getRelationFirst<{ name: string }>(payment.payment_methods)?.name || '',
    date: payment.payment_date || '',
    status: payment.status || '',
  }))
}

/**
 * Collect messages data
 */
async function collectMessagesData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<MessageData[]> {
  // Get user's conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', userId)

  if (!conversations || conversations.length === 0) return []

  const conversationIds = conversations.map((c) => c.id)

  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content, created_at, status')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: true })

  if (!data) return []

  return data.map((msg) => ({
    id: msg.id,
    conversationId: msg.conversation_id,
    direction: msg.sender_type === 'client' ? 'sent' : 'received',
    content: msg.content || '',
    timestamp: msg.created_at,
    status: msg.status || '',
  }))
}

/**
 * Collect loyalty points data
 */
async function collectLoyaltyData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<LoyaltyData | null> {
  const { data: points } = await supabase
    .from('loyalty_points')
    .select('balance, lifetime_earned')
    .eq('user_id', userId)
    .single()

  if (!points) return null

  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('created_at, points, description, type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return {
    currentBalance: points.balance || 0,
    lifetimeEarned: points.lifetime_earned || 0,
    transactions: (transactions || []).map((tx) => ({
      date: tx.created_at,
      points: tx.points || 0,
      description: tx.description || '',
      type: tx.type === 'earned' ? 'earned' : 'redeemed',
    })),
  }
}

/**
 * Collect store orders data
 */
async function collectStoreOrdersData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<StoreOrderData[]> {
  const { data } = await supabase
    .from('store_orders')
    .select('id, order_number, created_at, total, status, shipping_address, store_order_items(quantity, unit_price, total, store_products(name))')
    .eq('tenant_id', tenantId)
    .eq('customer_id', userId)

  if (!data) return []

  return data.map((order) => ({
    id: order.id,
    orderNumber: order.order_number || order.id,
    date: order.created_at,
    items: Array.isArray(order.store_order_items)
      ? order.store_order_items.map((item: Record<string, unknown>) => ({
          productName: getRelationFirst<{ name: string }>(item.store_products as { name: string } | { name: string }[] | null)?.name || '',
          quantity: (item.quantity as number) || 1,
          unitPrice: (item.unit_price as number) || 0,
          total: (item.total as number) || 0,
        }))
      : [],
    total: order.total || 0,
    status: order.status || '',
    shippingAddress: order.shipping_address || undefined,
  }))
}

/**
 * Collect store reviews data
 */
async function collectStoreReviewsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<StoreReviewData[]> {
  const { data } = await supabase
    .from('store_reviews')
    .select('id, rating, comment, created_at, store_products!inner(name)')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)

  if (!data) return []

  return data.map((review) => ({
    id: review.id,
    productName: getRelationFirst<{ name: string }>(review.store_products)?.name || '',
    rating: review.rating || 0,
    comment: review.comment || undefined,
    createdAt: review.created_at,
  }))
}

/**
 * Collect consent documents data
 */
async function collectConsentsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<ConsentData[]> {
  // Get user's pets first
  const { data: pets } = await supabase
    .from('pets')
    .select('id')
    .eq('owner_id', userId)
    .eq('tenant_id', tenantId)

  if (!pets || pets.length === 0) return []

  const petIds = pets.map((p) => p.id)

  const { data } = await supabase
    .from('consent_documents')
    .select('id, signed_at, signature_url, consent_templates(name), pets(name)')
    .eq('tenant_id', tenantId)
    .in('pet_id', petIds)

  if (!data) return []

  return data.map((consent) => ({
    id: consent.id,
    templateName: getRelationFirst<{ name: string }>(consent.consent_templates)?.name || '',
    signedAt: consent.signed_at || '',
    petName: getRelationFirst<{ name: string }>(consent.pets)?.name || undefined,
    documentUrl: consent.signature_url || undefined,
  }))
}

/**
 * Collect activity log data
 */
async function collectActivityLogData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string
): Promise<ActivityLogEntry[]> {
  const { data } = await supabase
    .from('audit_logs')
    .select('id, action, resource, created_at, details')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000) // Limit to last 1000 entries

  if (!data) return []

  return data.map((log) => ({
    id: log.id,
    action: log.action || '',
    resource: log.resource || '',
    timestamp: log.created_at,
    ipAddress: (log.details as Record<string, string>)?.ip_address || undefined,
    userAgent: (log.details as Record<string, string>)?.user_agent || undefined,
  }))
}

/**
 * Generate a downloadable JSON file from user data
 */
export function generateExportJson(data: UserDataExport): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Calculate approximate size of export data
 */
export function calculateExportSize(data: UserDataExport): number {
  return new Blob([generateExportJson(data)]).size
}
