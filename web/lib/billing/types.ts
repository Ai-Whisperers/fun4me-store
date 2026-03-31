/**
 * Platform Billing Types
 *
 * Type definitions for the billing system including:
 * - Platform invoices (Vetic → Clinic)
 * - Service commissions
 * - Payment methods
 * - Grace period evaluations
 * - Payment transactions
 * - Billing reminders
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type SubscriptionTier = 'gratis' | 'profesional'

export type CommissionRateType = 'initial' | 'standard' | 'enterprise'

export type PaymentMethodType = 'card' | 'bank_transfer' | 'mercadopago' | 'paypal'

export type PlatformInvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'waived'

export type CommissionStatus = 'pending' | 'invoiced' | 'paid' | 'waived' | 'adjusted'

export type PaymentTransactionStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partial_refund'

export type TenantPaymentStatus = 'current' | 'pending' | 'overdue' | 'grace_period' | 'suspended'

export type ReminderType =
  | 'upcoming_invoice'
  | 'invoice_due'
  | 'overdue_gentle'
  | 'overdue_reminder'
  | 'overdue_urgent'
  | 'grace_period_starting'
  | 'grace_period_warning'
  | 'grace_period_expired'
  | 'payment_confirmation'
  | 'payment_failed'
  | 'payment_method_expiring'

export type ReminderChannel = 'email' | 'sms' | 'in_app' | 'whatsapp'

export type GracePeriodDays = 30 | 60 | 90

// =============================================================================
// SERVICE COMMISSIONS
// =============================================================================

export interface ServiceCommission {
  id: string
  tenant_id: string
  appointment_id: string
  invoice_id: string | null

  // Amounts
  service_total: number
  tax_amount: number
  commissionable_amount: number

  // Commission
  commission_rate: number // Decimal e.g., 0.03 = 3%
  commission_amount: number
  rate_type: CommissionRateType
  months_active: number

  // Status
  status: CommissionStatus
  platform_invoice_id: string | null

  // Adjustments
  original_commission: number | null
  adjustment_amount: number
  adjustment_reason: string | null

  // Timestamps
  calculated_at: string
  invoiced_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface ServiceCommissionSummary {
  total_appointments: number
  total_revenue: number
  total_commissionable: number
  total_commission: number
  net_commission: number
  avg_rate: number
}

// =============================================================================
// PLATFORM INVOICES
// =============================================================================

export interface PlatformInvoice {
  id: string
  tenant_id: string
  invoice_number: string // VETIC-YYYY-NNNNNN

  // Period
  period_start: string // DATE
  period_end: string // DATE

  // Amount breakdown
  subscription_amount: number
  store_commission_amount: number
  service_commission_amount: number

  // Totals
  subtotal: number
  tax_rate: number // Decimal e.g., 0.10 = 10%
  tax_amount: number
  total: number

  // Status
  status: PlatformInvoiceStatus

  // Dates
  issued_at: string | null
  due_date: string
  paid_at: string | null

  // Payment
  payment_method: string | null
  payment_reference: string | null
  payment_amount: number | null

  // Grace period
  grace_period_days: GracePeriodDays | null
  grace_reason: string | null
  grace_evaluation_id: string | null

  // Reminders
  reminder_count: number
  last_reminder_at: string | null

  // Admin
  notes: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface PlatformInvoiceItem {
  id: string
  platform_invoice_id: string

  item_type: 'subscription' | 'store_commission' | 'service_commission' | 'adjustment' | 'credit' | 'late_fee' | 'discount'
  description: string
  quantity: number
  unit_price: number
  total: number

  // Reference
  reference_type: string | null
  reference_id: string | null

  created_at: string
}

export interface PlatformInvoiceWithItems extends PlatformInvoice {
  items: PlatformInvoiceItem[]
}

// =============================================================================
// PAYMENT METHODS
// =============================================================================

export interface TenantPaymentMethod {
  id: string
  tenant_id: string

  method_type: PaymentMethodType
  display_name: string // "Visa terminada en 4242"

  // Card (Stripe)
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  card_brand: string | null
  card_last_four: string | null
  card_exp_month: number | null
  card_exp_year: number | null
  card_funding: string | null

  // Bank transfer
  bank_name: string | null
  bank_alias: string | null
  bank_account_type: string | null
  bank_account_holder: string | null

  // MercadoPago
  mercadopago_account_id: string | null
  mercadopago_email: string | null

  // PayPal
  paypal_email: string | null
  paypal_payer_id: string | null

  // Status
  is_default: boolean
  is_verified: boolean
  is_active: boolean
  verified_at: string | null

  // Usage
  last_used_at: string | null
  use_count: number

  // Billing address
  billing_name: string | null
  billing_address: string | null
  billing_city: string | null
  billing_country: string

  // Timestamps
  created_at: string
  updated_at: string
}

// =============================================================================
// GRACE PERIOD EVALUATIONS
// =============================================================================

export interface GraceMetrics {
  monthly_revenue: number // PYG
  revenue_growth_rate: number // MoM %
  active_clients: number
  appointments_last_30d: number
  store_orders_last_30d: number
  pets_registered: number
  account_age_days: number
  payment_history_score: number // 0-1
  overdue_count: number
  outstanding_balance: number // PYG
  seasonality_factor: number // 0.5-1.5
  economic_index: number // 0-1
}

export interface GraceFactorWeights {
  payment_history: number
  revenue: number
  activity: number
  account_age: number
  economic: number
}

export interface GracePeriodEvaluation {
  id: string
  tenant_id: string
  platform_invoice_id: string | null

  // Input
  metrics: GraceMetrics

  // AI scores
  economic_score: number | null
  risk_score: number | null
  engagement_score: number | null
  trust_score: number | null
  final_score: number | null

  // Output
  recommended_grace_days: GracePeriodDays
  confidence: number | null
  reasoning: string
  factor_weights: GraceFactorWeights | null

  // Decision
  approved_grace_days: GracePeriodDays | null
  approved_by: string | null
  approved_at: string | null
  approval_notes: string | null
  status: 'pending' | 'approved' | 'overridden' | 'expired'

  // Model info
  model_version: string
  model_params: Record<string, unknown> | null

  // Timestamps
  evaluated_at: string
  created_at: string
}

// =============================================================================
// PAYMENT TRANSACTIONS
// =============================================================================

export interface BillingPaymentTransaction {
  id: string
  tenant_id: string
  platform_invoice_id: string | null
  payment_method_id: string | null

  amount: number
  currency: string

  payment_method_type: PaymentMethodType
  payment_method_display: string | null

  // Stripe
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  stripe_client_secret: string | null
  stripe_receipt_url: string | null

  // MercadoPago
  mercadopago_payment_id: string | null
  mercadopago_preference_id: string | null

  // PayPal
  paypal_order_id: string | null
  paypal_capture_id: string | null

  // Bank transfer
  bank_transfer_reference: string | null
  bank_transfer_date: string | null
  bank_transfer_proof_url: string | null

  // Status
  status: PaymentTransactionStatus
  failure_code: string | null
  failure_message: string | null

  // Refund
  refund_amount: number | null
  refund_reason: string | null
  refunded_at: string | null

  // Metadata
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null

  // Audit
  initiated_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

// =============================================================================
// BILLING REMINDERS
// =============================================================================

export interface BillingReminder {
  id: string
  tenant_id: string
  platform_invoice_id: string | null

  reminder_type: ReminderType
  channel: ReminderChannel

  // Recipient
  recipient_email: string | null
  recipient_phone: string | null
  recipient_user_id: string | null

  // Content
  subject: string | null
  content: string | null
  template_id: string | null

  // Status
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  scheduled_for: string | null
  sent_at: string | null
  delivered_at: string | null
  failed_at: string | null
  failure_reason: string | null

  // Engagement
  opened_at: string | null
  clicked_at: string | null

  // Provider
  provider: string | null
  provider_message_id: string | null

  created_at: string
}

// =============================================================================
// TENANT BILLING INFO (extends base Tenant type)
// =============================================================================

export interface TenantBillingInfo {
  // Stripe
  stripe_customer_id: string | null

  // Billing contact
  billing_email: string | null
  billing_name: string | null
  billing_ruc: string | null
  billing_address: string | null
  billing_city: string | null

  // Invoice scheduling
  next_invoice_date: string | null // DATE
  last_invoice_date: string | null // DATE
  current_grace_period_days: GracePeriodDays

  // Payment status
  outstanding_balance: number
  days_overdue: number
  payment_status: TenantPaymentStatus

  // Auto-pay
  auto_pay_enabled: boolean
  default_payment_method_id: string | null

  // Commission tracking
  services_start_date: string | null // DATE
  ecommerce_start_date: string | null // DATE
  commission_tier: CommissionRateType | null
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface BillingOverviewResponse {
  tenant_id: string
  tenant_name: string

  // Subscription
  tier: SubscriptionTier
  tier_display_name: string
  monthly_amount: number
  billing_cycle: 'monthly' | 'annual'

  // Trial
  is_trial: boolean
  trial_days_remaining: number | null
  trial_end_date: string | null

  // Next invoice
  next_invoice_date: string | null
  first_invoice_date: string | null

  // Current period commissions
  current_period: {
    start: string
    end: string
    store_orders: number
    store_commission: number
    service_appointments: number
    service_commission: number
    total_commission: number
    subscription: number
    estimated_subtotal: number
    estimated_tax: number
    estimated_total: number
  }

  // Outstanding
  outstanding_balance: number
  days_overdue: number
  payment_status: TenantPaymentStatus

  // Payment methods
  has_payment_method: boolean
  default_payment_method: TenantPaymentMethod | null
}

export interface AddPaymentMethodRequest {
  method_type: PaymentMethodType

  // For cards (Stripe SetupIntent flow)
  stripe_payment_method_id?: string

  // For bank transfer
  bank_name?: string
  bank_alias?: string
  bank_account_holder?: string

  // Common
  set_as_default?: boolean
  billing_name?: string
  billing_address?: string
  billing_city?: string
}

export interface PayInvoiceRequest {
  invoice_id: string
  payment_method_id: string
}

export interface ConfirmBankTransferRequest {
  invoice_id: string
  transfer_reference: string
  transfer_date: string
  proof_url?: string
}

export interface StripeSetupIntentResponse {
  client_secret: string
  customer_id: string
}

// =============================================================================
// COMMISSION RATE CONSTANTS (matches tiers.ts)
// =============================================================================

export const COMMISSION_RATES = {
  initial: 0.03, // 3%
  standard: 0.05, // 5%
  enterprise: 0.02, // 2%
} as const

export const INITIAL_PERIOD_MONTHS = 6

export const TAX_RATE_PY = 0.10 // 10% IVA Paraguay

export const INVOICE_DUE_DAYS = 15 // Days after period end

export const GRACE_PERIOD_OPTIONS: GracePeriodDays[] = [30, 60, 90]
