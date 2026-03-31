/**
 * GDPR Data Subject Rights Types
 *
 * COMP-001: Type definitions for GDPR compliance operations
 */

/**
 * GDPR request types based on EU GDPR articles
 */
export type GDPRRequestType =
  | 'access' // Article 15 - Right of access
  | 'rectification' // Article 16 - Right to rectification
  | 'erasure' // Article 17 - Right to erasure ("right to be forgotten")
  | 'restriction' // Article 18 - Right to restriction of processing
  | 'portability' // Article 20 - Right to data portability
  | 'objection' // Article 21 - Right to object

/**
 * Status of a GDPR request
 */
export type GDPRRequestStatus =
  | 'pending' // Request received, awaiting processing
  | 'identity_verification' // Awaiting identity verification
  | 'processing' // Currently being processed
  | 'completed' // Request fulfilled
  | 'rejected' // Request rejected (with reason)
  | 'cancelled' // Cancelled by user

/**
 * A GDPR data subject request record
 */
export interface GDPRRequest {
  id: string
  userId: string
  tenantId: string
  requestType: GDPRRequestType
  status: GDPRRequestStatus
  requestedAt: string
  processedAt?: string
  completedAt?: string
  rejectionReason?: string
  verificationToken?: string
  verificationExpiresAt?: string
  exportFileUrl?: string
  exportExpiresAt?: string
  notes?: string
  processedBy?: string
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new GDPR request
 */
export interface CreateGDPRRequestInput {
  requestType: GDPRRequestType
  reason?: string
}

/**
 * User data categories for export (Article 15 & 20)
 */
export interface UserDataExport {
  exportedAt: string
  format: 'json'
  dataSubject: DataSubjectInfo
  profile: ProfileData | null
  pets: PetData[]
  appointments: AppointmentData[]
  medicalRecords: MedicalRecordData[]
  prescriptions: PrescriptionData[]
  invoices: InvoiceData[]
  payments: PaymentData[]
  messages: MessageData[]
  loyaltyPoints: LoyaltyData | null
  storeOrders: StoreOrderData[]
  storeReviews: StoreReviewData[]
  consents: ConsentData[]
  activityLog: ActivityLogEntry[]
}

/**
 * Data subject identification info
 */
export interface DataSubjectInfo {
  userId: string
  email: string
  fullName: string
  tenantId: string
  tenantName: string
  role: string
  accountCreatedAt: string
}

/**
 * Profile data for export
 */
export interface ProfileData {
  id: string
  fullName: string
  email: string
  phone?: string
  address?: string
  preferredLanguage?: string
  notificationPreferences?: Record<string, boolean>
  createdAt: string
  updatedAt: string
}

/**
 * Pet data for export
 */
export interface PetData {
  id: string
  name: string
  species: string
  breed?: string
  dateOfBirth?: string
  gender?: string
  weight?: number
  microchipId?: string
  photoUrl?: string
  isDeceased: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Appointment data for export
 */
export interface AppointmentData {
  id: string
  petName: string
  serviceName: string
  scheduledAt: string
  status: string
  notes?: string
  createdAt: string
}

/**
 * Medical record data for export
 */
export interface MedicalRecordData {
  id: string
  petName: string
  recordType: string
  date: string
  diagnosis?: string
  treatment?: string
  notes?: string
  vetName?: string
  createdAt: string
}

/**
 * Prescription data for export
 */
export interface PrescriptionData {
  id: string
  petName: string
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
  }>
  prescribedAt: string
  validUntil: string
  vetName: string
}

/**
 * Invoice data for export
 */
export interface InvoiceData {
  id: string
  invoiceNumber: string
  date: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  tax: number
  total: number
  status: string
}

/**
 * Payment data for export
 */
export interface PaymentData {
  id: string
  invoiceNumber?: string
  amount: number
  method: string
  date: string
  status: string
}

/**
 * Message data for export
 */
export interface MessageData {
  id: string
  conversationId: string
  direction: 'sent' | 'received'
  content: string
  timestamp: string
  status: string
}

/**
 * Loyalty points data for export
 */
export interface LoyaltyData {
  currentBalance: number
  lifetimeEarned: number
  transactions: Array<{
    date: string
    points: number
    description: string
    type: 'earned' | 'redeemed'
  }>
}

/**
 * Store order data for export
 */
export interface StoreOrderData {
  id: string
  orderNumber: string
  date: string
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  total: number
  status: string
  shippingAddress?: string
}

/**
 * Store review data for export
 */
export interface StoreReviewData {
  id: string
  productName: string
  rating: number
  comment?: string
  createdAt: string
}

/**
 * Consent data for export
 */
export interface ConsentData {
  id: string
  templateName: string
  signedAt: string
  petName?: string
  documentUrl?: string
}

/**
 * Activity log entry for export
 */
export interface ActivityLogEntry {
  id: string
  action: string
  resource: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Deletion result with details
 */
export interface DeletionResult {
  success: boolean
  deletedCategories: string[]
  anonymizedCategories: string[]
  retainedCategories: Array<{
    category: string
    reason: string
    retentionPeriod: string
  }>
  errors: Array<{
    category: string
    error: string
  }>
  completedAt: string
}

/**
 * Categories of data that can be deleted vs anonymized vs retained
 */
export const DATA_CATEGORIES = {
  /** Data that can be fully deleted */
  deletable: [
    'profile_preferences',
    'notification_settings',
    'messages',
    'store_cart',
    'store_wishlist',
    'stock_alerts',
    'store_reviews',
    'reminders',
  ],
  /** Data that must be anonymized (legal/medical records) */
  anonymizable: [
    'profile', // Keep structure, remove PII
    'medical_records', // Legal retention requirements
    'prescriptions', // Legal retention requirements
    'consent_documents', // Legal retention requirements
    'invoices', // Financial records retention
    'payments', // Financial records retention
    'audit_logs', // Compliance requirement
  ],
  /** Data retained for legal/business reasons */
  retained: [
    {
      category: 'medical_records',
      reason: 'Requisito legal de retención de registros médicos',
      retentionPeriod: '10 años',
    },
    {
      category: 'invoices',
      reason: 'Requisito fiscal de retención de facturas',
      retentionPeriod: '5 años',
    },
    {
      category: 'consent_documents',
      reason: 'Evidencia de consentimiento informado',
      retentionPeriod: '10 años',
    },
  ],
} as const

/**
 * Identity verification methods
 */
export type VerificationMethod = 'password' | 'email_code' | 'sms_code'

/**
 * Identity verification input
 */
export interface VerificationInput {
  method: VerificationMethod
  password?: string
  code?: string
}

/**
 * GDPR compliance log entry
 */
export interface GDPRComplianceLog {
  id: string
  requestId: string
  userId: string
  tenantId: string
  action: string
  details: Record<string, unknown>
  performedBy: string
  performedAt: string
}

/**
 * Response for GDPR request creation
 */
export interface GDPRRequestResponse {
  requestId: string
  status: GDPRRequestStatus
  estimatedCompletionDays: number
  verificationRequired: boolean
  message: string
}

/**
 * Export download response
 */
export interface ExportDownloadResponse {
  downloadUrl: string
  expiresAt: string
  format: 'json'
  sizeBytes: number
}
