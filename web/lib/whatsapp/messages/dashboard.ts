/**
 * Dashboard / Staff WhatsApp Messages
 *
 * Messages for staff dashboard features, billing, and administrative tasks.
 */

import type { ClinicBillingParams } from '../types'

export const dashboardMessages = {
  // ============ Billing & Subscription ============

  /**
   * Billing inquiry from dashboard
   */
  billingInquiry: () => 'Hola! Tengo una consulta sobre mi facturacion de Vetic',

  /**
   * Upgrade plan request
   */
  upgradePlan: () => 'Hola! Quiero subir de plan',

  /**
   * Downgrade plan request
   */
  downgradePlan: () => 'Hola! Quiero bajar de plan',

  /**
   * Payment method update
   */
  updatePayment: () => 'Hola! Quiero actualizar mi metodo de pago',

  /**
   * Invoice question
   */
  invoiceQuestion: () => 'Hola! Tengo una pregunta sobre mi factura',

  /**
   * Plan inquiry with clinic name
   */
  planInquiry: ({ clinicName }: ClinicBillingParams) =>
    `Hola! Soy de ${clinicName} y quiero consultar sobre mi plan de Vetic`,

  /**
   * Billing support with clinic name
   */
  billingSupport: ({ clinicName }: ClinicBillingParams) =>
    `Hola! Tengo una consulta sobre facturacion de Vetic para la clinica ${clinicName}`,

  // ============ Staff Management ============

  /**
   * Add staff member help
   */
  addStaff: () => 'Hola! Necesito ayuda para agregar un usuario',

  /**
   * Staff permissions question
   */
  staffPermissions: () => 'Hola! Tengo una pregunta sobre permisos de usuario',

  // ============ Technical Support ============

  /**
   * Integration help
   */
  integrationHelp: () => 'Hola! Necesito ayuda con una integracion',

  /**
   * API access request
   */
  apiAccess: () => 'Hola! Quiero consultar sobre acceso a la API',

  /**
   * Data export help
   */
  dataExport: () => 'Hola! Necesito ayuda para exportar mis datos',

  /**
   * Migration assistance
   */
  migrationHelp: () => 'Hola! Necesito ayuda con la migracion de datos',

  // ============ Feature Requests ============

  /**
   * Feature suggestion
   */
  featureSuggestion: () => 'Hola! Tengo una sugerencia de funcionalidad para Vetic',

  /**
   * Report bug
   */
  reportBug: () => 'Hola! Quiero reportar un error en el sistema',

  // ============ Training ============

  /**
   * Request training session
   */
  requestTraining: () => 'Hola! Quiero agendar una capacitacion para mi equipo',

  /**
   * Documentation question
   */
  documentationHelp: () => 'Hola! Tengo una pregunta sobre como usar Vetic',
}

export type DashboardMessageKey = keyof typeof dashboardMessages
