/**
 * Landing Page WhatsApp Messages
 *
 * Messages used across the public landing pages.
 */

export const landingMessages = {
  // ============ Hero Section ============

  /**
   * Main CTA - "Empezar Gratis" button
   */
  startFree: () => 'Hola! Quiero empezar con Vetic gratis',

  // ============ Navigation ============

  /**
   * Contact button in navbar
   */
  contact: () => 'Hola! Me interesa Vetic para mi clínica',

  // ============ CTA Section ============

  /**
   * Main CTA section "Empezar por WhatsApp"
   */
  ctaStart: () => 'Hola! Quiero empezar con Vetic',

  // ============ Network/Red Page ============

  /**
   * Join the Vetic network
   */
  joinNetwork: () => 'Hola! Quiero unirme a la red Vetic',

  // ============ Demo Page ============

  /**
   * Schedule a demo
   */
  scheduleDemo: () => 'Hola! Quiero agendar una demo de Vetic',

  // ============ About Us Page ============

  /**
   * Learn more about Vetic
   */
  learnMore: () => 'Hola! Quiero saber más sobre Vetic',

  // ============ Floating WhatsApp Widget ============

  /**
   * Quick message options for floating widget
   */
  quickVeterinarian: () => 'Hola! Soy veterinario y me interesa Vetic para mi clinica',

  quickPetOwner: () => 'Hola! Soy dueno de mascota y quiero saber mas sobre Vetic',

  quickDemo: () => 'Hola! Me gustaria ver una demo de Vetic',

  quickQuestion: () => 'Hola! Tengo una pregunta sobre Vetic',
}

export type LandingMessageKey = keyof typeof landingMessages
