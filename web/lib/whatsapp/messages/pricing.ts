/**
 * Pricing Page WhatsApp Messages
 *
 * Messages related to pricing, plans, ROI calculator, and pricing quiz.
 */

import type { ROICalculatorParams, PlanInterestParams, TierCtaParams } from '../types'

export const pricingMessages = {
  // ============ General Pricing Inquiries ============

  /**
   * General pricing question
   */
  generalInquiry: () => 'Hola! Tengo una consulta sobre los planes de Vetic',

  /**
   * Doubts about which plan to choose
   */
  doubts: () => 'Hola! Tengo dudas sobre los planes de Vetic',

  /**
   * Custom/special pricing request
   */
  customPricing: () => 'Hola! Necesito algo especial para mi clinica',

  // ============ Plan-Specific Messages ============

  /**
   * Interest in a specific plan
   */
  planInterest: ({ planName }: PlanInterestParams) =>
    `Hola! Me interesa el Plan ${planName}. Quiero saber más!`,

  /**
   * Use tier CTA message from config
   */
  tierCta: ({ message }: TierCtaParams) => message,

  // ============ ROI Calculator ============

  /**
   * ROI calculator CTA - includes clinic size context
   */
  roiCalculator: ({ planName, monthlyConsultations }: ROICalculatorParams) =>
    `Hola! Vi los precios de Vetic.\n\nMi clínica tiene aproximadamente ${monthlyConsultations} consultas/mes.\n\nMe interesa el Plan ${planName}.\n\nQuiero saber más!`,

  /**
   * ROI calculator - simple version
   */
  roiCalculatorSimple: ({ planName, monthlyConsultations }: ROICalculatorParams) =>
    `Hola! Use la calculadora de ROI de Vetic. Tengo ${monthlyConsultations} pacientes/mes y me interesa el Plan ${planName}`,

  // ============ Pricing Quiz ============

  /**
   * Quiz recommendation result
   */
  quizRecommendation: ({ planName }: PlanInterestParams) =>
    `Hola! El quiz de Vetic me recomendó el Plan ${planName}. Quiero más información.`,

  // ============ Enterprise ============

  /**
   * Enterprise/custom pricing inquiry
   */
  enterprise: () => 'Hola! Tengo una cadena de clinicas y me interesa Vetic Empresarial',

  /**
   * Multi-location inquiry
   */
  multiLocation: () => 'Hola! Tengo varias sucursales y quiero saber sobre planes empresariales',
}

export type PricingMessageKey = keyof typeof pricingMessages
