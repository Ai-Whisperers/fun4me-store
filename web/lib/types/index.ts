/**
 * Types barrel export
 *
 * Central export point for all type definitions in the application.
 * Import types from here instead of individual files for consistency.
 *
 * Note: Some type names conflict across files (e.g., AppointmentStatus in
 * status.ts vs clinic-config.ts). We export with aliases to resolve conflicts.
 *
 * @example
 * ```typescript
 * import type { Pet, Profile, StoreProductWithDetails, CalendarEvent } from '@/lib/types'
 * ```
 */

// =============================================================================
// DATABASE TYPES (Core entities)
// =============================================================================
export type {
  Pet,
  Profile,
  Appointment,
  Hospitalization,
  LabOrder,
  Invoice,
  Service,
} from './database'

// =============================================================================
// ACTION RESULT TYPES (Server action returns)
// =============================================================================
export type { ActionResult, FieldErrors } from './action-result'

// =============================================================================
// STORE / E-COMMERCE TYPES
// =============================================================================
export {
  // Constants
  SPECIES,
  LIFE_STAGES,
  BREED_SIZES,
  HEALTH_CONDITIONS,
  VARIANT_TYPES,
  DISCOUNT_TYPES,
  RELATION_TYPES,
  PRESCRIPTION_STATUSES,
  SORT_OPTIONS,
  // Labels
  SPECIES_LABELS,
  LIFE_STAGE_LABELS,
  BREED_SIZE_LABELS,
  HEALTH_CONDITION_LABELS,
  SORT_OPTION_LABELS,
  PRESCRIPTION_STATUS_LABELS,
} from './store'

export type {
  // Enums
  Species,
  LifeStage,
  BreedSize,
  HealthCondition,
  VariantType,
  DiscountType,
  RelationType,
  PrescriptionStatus as StorePrescriptionStatus,
  SortOption,
  // Brand & Category
  StoreBrand,
  StoreCategory,
  StoreSubcategory,
  // Products
  StoreProduct,
  StoreProductWithDetails,
  StoreProductImage,
  StoreProductVariant,
  // Reviews
  StoreReview,
  StoreReviewImage,
  StoreReviewVote,
  ReviewSummary,
  // Wishlist & Alerts
  StoreWishlistItem,
  StoreStockAlert,
  // Coupons
  StoreCoupon,
  StoreCouponUsage,
  CouponValidationResult,
  // Q&A
  StoreProductQuestion,
  // Recently Viewed
  StoreRecentlyViewed,
  // Related Products
  StoreRelatedProduct,
  // Prescriptions
  StorePrescription,
  StorePrescriptionProduct,
  // Campaigns
  StoreCampaign,
  StoreCampaignItem,
  // API Types
  ProductFilters,
  ProductQueryParams,
  ProductListResponse,
  AvailableFilters,
  ReviewQueryParams,
  ReviewListResponse,
  CreateReviewInput,
  WishlistResponse,
  CreateStockAlertInput,
  ApplyCouponInput,
  AskQuestionInput,
  // Cart
  CartItemType,
  CartItem,
  CartState,
  // Search
  SearchSuggestion,
  SearchResponse,
} from './store'

// =============================================================================
// APPOINTMENT TYPES
// =============================================================================
export { statusConfig as appointmentStatusConfig } from './appointments'
export {
  formatAppointmentDate,
  formatAppointmentDateTime,
  formatAppointmentTime,
  canCancelAppointment,
  canRescheduleAppointment,
} from './appointments'
export type {
  AppointmentDisplayStatus,
  AppointmentWithDetails,
  AppointmentCardData,
  CancelAppointmentResult,
  RescheduleAppointmentResult,
} from './appointments'

// =============================================================================
// CALENDAR & SCHEDULING TYPES
// =============================================================================
export {
  // Constants
  DAY_NAMES,
  SHORT_DAY_NAMES,
  TIME_OFF_STATUS_LABELS,
  TIME_OFF_STATUS_COLORS,
  SHIFT_STATUS_LABELS,
  SHIFT_TYPE_LABELS,
  EVENT_COLORS,
  // Functions
  getDayName,
  formatTime,
  formatDuration,
  appointmentToCalendarEvent,
  timeOffToCalendarEvent,
  shiftToCalendarEvent,
  getViewDateRange,
  isWithinSchedule,
  datesOverlap,
  isStaffAvailable,
  calculateWeeklyHours,
  getAvailableTimeSlots,
} from './calendar'
export type {
  DayOfWeek,
  CalendarEventType,
  CalendarEvent,
  CalendarEventResource,
  CalendarView,
  CalendarFilters,
  StaffMember,
  StaffSchedule,
  StaffScheduleEntry,
  StaffScheduleWithProfile,
  AvailabilityOverrideType,
  StaffAvailabilityOverride,
  StaffAvailability,
  AvailabilitySlot,
  TimeOffStatus,
  TimeOffType,
  TimeOffRequest,
  TimeOffBalance,
  TimeOffRequestWithDetails,
  ShiftType,
  ShiftStatus,
  StaffShift,
  ScheduleEntryFormData,
  ScheduleEntryDbData,
  StaffScheduleFormData,
  TimeOffRequestFormData,
  QuickAddAppointmentFormData,
  ShiftFormData,
  CalendarActionResult,
  CalendarEventsResponse,
  StaffSchedulesResponse,
  TimeOffRequestsResponse,
  StaffListResponse,
  AvailabilityResponse,
} from './calendar'

// =============================================================================
// STAFF TYPES
// =============================================================================
export type {
  StaffProfileExtended,
  StaffAvailabilityCheck,
  StaffPerformance,
  StaffWorkload,
  StaffCredential,
} from './staff'

// =============================================================================
// INVOICING TYPES
// =============================================================================
export {
  invoiceStatusConfig,
  paymentMethodLabels,
  STATUS_LABELS as INVOICE_STATUS_LABELS,
  STATUS_COLORS as INVOICE_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  roundCurrency,
  formatCurrency,
  formatDate as formatInvoiceDate,
  canEditInvoice,
  canSendInvoice,
  canRecordPayment,
  canReceivePayment,
  canVoidInvoice,
  calculateLineTotal,
  calculateInvoiceTotals,
} from './invoicing'
export type {
  InvoiceStatus,
  PaymentMethod,
  InvoiceItemFormData,
  InvoiceFormData,
  RecordPaymentData,
  InvoiceItem,
  Invoice as InvoiceWithDetails,
  Payment,
  Refund,
  Service as InvoiceService,
  Product as InvoiceProduct,
} from './invoicing'

// =============================================================================
// SERVICE TYPES (JSON-CMS from services.ts)
// =============================================================================
export type {
  ServiceVariant as CMSServiceVariant,
  ServiceDetails as CMSServiceDetails,
  ServiceBooking as CMSServiceBooking,
  Service as CMSService,
  ServicesData as CMSServicesData,
  ServiceCartItem,
  PetForService,
  ServiceSelectionState,
} from './services'

// =============================================================================
// STATUS TYPES (Canonical status definitions)
// =============================================================================
export {
  APPOINTMENT_STATUSES,
  INVOICE_STATUSES,
  HOSPITALIZATION_STATUSES,
  LAB_ORDER_STATUSES,
  INSURANCE_CLAIM_STATUSES,
  MESSAGE_STATUSES,
  PAYMENT_STATUSES,
  PRESCRIPTION_STATUSES as RX_STATUSES,
  APPOINTMENT_TRANSITIONS,
  INVOICE_TRANSITIONS,
  HOSPITALIZATION_TRANSITIONS,
  LAB_ORDER_TRANSITIONS,
  INSURANCE_CLAIM_TRANSITIONS,
  canTransitionTo,
  canTransitionAppointment,
  canTransitionInvoice,
  canTransitionHospitalization,
  canTransitionLabOrder,
  canTransitionInsuranceClaim,
} from './status'
export type {
  AppointmentStatus,
  HospitalizationStatus,
  LabOrderStatus,
  InsuranceClaimStatus,
  MessageStatus,
  PaymentStatus,
  PrescriptionStatus,
} from './status'

// =============================================================================
// CLINIC CONFIG TYPES (JSON-CMS configuration)
// Note: Many types here overlap with other files. Import explicitly to avoid conflicts.
// =============================================================================
export type {
  // UI Label types
  NavLabels,
  FooterLabels,
  HomeLabels,
  ServicesLabels,
  AboutLabels,
  PortalLabels,
  StoreLabels,
  CartLabels,
  CheckoutLabels,
  BookingLabels,
  CommonLabels,
  AuthLabels,
  ToolsLabels,
  ErrorLabels,
  DashboardLabels,
  UiLabels,
  // Config types
  ContactInfo,
  SocialLinks,
  HoursInfo,
  ModuleSettings,
  ClinicSettings,
  BrandingAssets,
  StatsInfo,
  ClinicConfig,
  // Home page data
  HeroSection,
  FeatureItem,
  PromoBanner,
  StatsSection,
  InteractiveToolsSection,
  ServicesPreview,
  TestimonialsSection,
  PartnersSection,
  CtaSection,
  SeoMetadata,
  HomeData,
  // About page data
  AboutData,
  TeamMember,
  Certification,
  // Testimonials & FAQ
  Testimonial,
  TestimonialsData,
  FaqItem,
  FaqData,
  // Legal
  LegalData,
  // Theme
  ClinicTheme,
  // Images
  ClinicImage,
  ClinicImages,
  // Complete clinic data
  ClinicData,
} from './clinic-config'

// =============================================================================
// ERROR TYPES
// =============================================================================
export {
  ErrorMessages,
  AppError,
  successResult,
  errorResult,
  validationErrorResult,
  categorizeError,
  getUserErrorMessage,
} from './errors'
export type { ErrorCategory } from './errors'

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================
export { isNotificationType, getNotificationTypeLabel } from './notification'
export type { Notification, NotificationType, NotificationPreferences } from './notification'

// =============================================================================
// SETTINGS TYPES
// =============================================================================
export { DEFAULT_CLINIC_SETTINGS, isValidTimeFormat, validateDayHours } from './settings'
export type {
  ClinicOperationalSettings,
  GeneralSettings,
  BusinessHours,
  DayHours,
  AppointmentSettings as AppointmentSettingsConfig,
  InvoicingSettings,
  NotificationSettings as NotificationSettingsConfig,
  IntegrationSettings,
} from './settings'

// =============================================================================
// AUDIT TYPES
// =============================================================================
export { isAuditAction } from './audit'
export type { AuditLog, AuditAction, AuditFilter } from './audit'

// =============================================================================
// REPORTS TYPES
// =============================================================================
export type {
  DashboardStats,
  RevenueReport,
  AppointmentReport as AppointmentReportData,
  InventoryReport,
  ClientAnalytics,
  ServicePerformance,
  FinancialSummary,
} from './reports'

// =============================================================================
// WHATSAPP TYPES
// =============================================================================
export {
  whatsAppStatusConfig,
  templateCategoryConfig,
  conversationTypeLabels,
  WHATSAPP_GREEN,
  formatParaguayPhone,
  formatPhoneDisplay,
  fillTemplateVariables,
  extractTemplateVariables,
  formatMessageTime,
  defaultWhatsAppTemplates,
} from './whatsapp'
export type {
  MessageDirection,
  WhatsAppMessageStatus,
  ConversationType,
  TemplateCategory,
  WhatsAppMessage,
  WhatsAppTemplate,
  WhatsAppConversation,
  Conversation as WhatsAppConversationExtended,
  TwilioWhatsAppWebhook,
} from './whatsapp'

// =============================================================================
// DOMAIN MANAGEMENT TYPES
// =============================================================================
export type {
  DomainType,
  DomainProvider,
  DomainStatus,
  SSLProvider,
  DNSRecordType,
  SSLConfig,
  DNSRecord,
  DomainEntry,
  CloudflareTunnel,
  DomainsConfig,
  DomainLookupResult,
  DomainTenantMap,
} from './domains'
