/**
 * Support & FAQ WhatsApp Messages
 *
 * Messages for customer support, FAQ, and contact forms.
 */

import type { ContactFormParams, SupportTicketParams } from '../types'

export const supportMessages = {
  // ============ General Support ============

  /**
   * Generic question about Vetic
   */
  question: () => 'Hola! Tengo una pregunta sobre Vetic',

  /**
   * FAQ fallback - couldn't find answer
   */
  faqHelp: () => 'Hola! Tengo una pregunta que no encontré en el FAQ',

  /**
   * Technical support request
   */
  technicalSupport: () => 'Hola! Necesito ayuda técnica con Vetic',

  // ============ Contact Form ============

  /**
   * Contact form submission with name and clinic
   */
  contactForm: ({ contactName, clinicName }: ContactFormParams) =>
    `Hola! Soy ${contactName} de ${clinicName}. Me gustaría recibir más información sobre Vetic.`,

  // ============ Account Support ============

  /**
   * Account/login issues
   */
  accountHelp: () => 'Hola! Necesito ayuda con mi cuenta de Vetic',

  /**
   * Billing/payment support
   */
  billingSupport: () => 'Hola! Tengo una consulta sobre facturación/pagos',

  /**
   * Plan change request
   */
  planChange: () => 'Hola! Quiero cambiar mi plan de Vetic',

  /**
   * Cancellation inquiry
   */
  cancellation: () => 'Hola! Tengo una consulta sobre cancelación',

  // ============ Ticket Reference ============

  /**
   * Follow up on existing support ticket
   */
  ticketFollowUp: ({ ticketId }: SupportTicketParams) =>
    ticketId
      ? `Hola! Quiero dar seguimiento a mi ticket #${ticketId}`
      : 'Hola! Quiero dar seguimiento a mi caso de soporte',

  /**
   * Report an issue
   */
  reportIssue: ({ issue }: SupportTicketParams) =>
    issue ? `Hola! Quiero reportar un problema: ${issue}` : 'Hola! Quiero reportar un problema',
}

export type SupportMessageKey = keyof typeof supportMessages
