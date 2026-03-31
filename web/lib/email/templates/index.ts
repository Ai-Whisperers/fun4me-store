/**
 * Email Templates Index
 *
 * Exports all email templates for easy importing
 */

export {
  generateInvoiceEmail,
  generateInvoiceEmailText,
  type InvoiceEmailData,
} from './invoice-email'

export {
  generateConsentRequestEmail,
  generateConsentRequestEmailText,
  type ConsentRequestEmailData,
} from './consent-request'

export {
  generateAppointmentReminderEmail,
  generateAppointmentReminderEmailText,
  type AppointmentReminderEmailData,
} from './appointment-reminder'

// Ambassador program templates
export {
  sendAmbassadorApprovalEmail,
  type AmbassadorApprovalEmailData,
} from './ambassador-approved'

export {
  sendAmbassadorRejectionEmail,
  type AmbassadorRejectionEmailData,
} from './ambassador-rejected'

export {
  sendAmbassadorNewReferralEmail,
  type AmbassadorNewReferralEmailData,
} from './ambassador-new-referral'

export {
  sendAmbassadorConversionEmail,
  type AmbassadorConversionEmailData,
} from './ambassador-conversion'
