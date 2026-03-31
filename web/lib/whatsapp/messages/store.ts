/**
 * E-Commerce / Store WhatsApp Messages
 *
 * Messages related to the online store, orders, and products.
 */

import type { OrderInquiryParams } from '../types'

export const storeMessages = {
  // ============ Product Inquiries ============

  /**
   * General product question
   */
  productQuestion: () => 'Hola! Tengo una pregunta sobre un producto',

  /**
   * Specific product inquiry
   */
  productInquiry: ({ productName }: OrderInquiryParams) =>
    productName
      ? `Hola! Tengo una pregunta sobre el producto ${productName}`
      : 'Hola! Tengo una pregunta sobre un producto',

  /**
   * Product availability
   */
  productAvailability: ({ productName }: OrderInquiryParams) =>
    productName ? `Hola! Quiero saber si tienen ${productName} disponible` : 'Hola! Quiero consultar disponibilidad',

  /**
   * Stock notification request
   */
  notifyWhenAvailable: ({ productName }: OrderInquiryParams) =>
    productName
      ? `Hola! Quiero que me avisen cuando tengan ${productName} en stock`
      : 'Hola! Quiero que me avisen cuando tengan este producto',

  // ============ Order Support ============

  /**
   * Order status inquiry
   */
  orderStatus: ({ orderId }: OrderInquiryParams) =>
    orderId ? `Hola! Quiero consultar el estado de mi pedido #${orderId}` : 'Hola! Quiero consultar mi pedido',

  /**
   * Order problem/issue
   */
  orderProblem: ({ orderId }: OrderInquiryParams) =>
    orderId ? `Hola! Tengo un problema con mi pedido #${orderId}` : 'Hola! Tengo un problema con mi pedido',

  /**
   * Order cancellation
   */
  cancelOrder: ({ orderId }: OrderInquiryParams) =>
    orderId ? `Hola! Quiero cancelar mi pedido #${orderId}` : 'Hola! Quiero cancelar mi pedido',

  // ============ Prescriptions ============

  /**
   * Prescription product inquiry
   */
  prescriptionHelp: () => 'Hola! Tengo una pregunta sobre productos con receta',

  /**
   * Upload prescription help
   */
  uploadPrescription: () => 'Hola! Necesito ayuda para subir mi receta',

  // ============ Delivery ============

  /**
   * Delivery inquiry
   */
  deliveryQuestion: () => 'Hola! Tengo una pregunta sobre el envio',

  /**
   * Track delivery
   */
  trackDelivery: ({ orderId }: OrderInquiryParams) =>
    orderId ? `Hola! Quiero rastrear mi envio del pedido #${orderId}` : 'Hola! Quiero rastrear mi envio',

  // ============ Returns ============

  /**
   * Return/exchange request
   */
  returnRequest: ({ orderId }: OrderInquiryParams) =>
    orderId
      ? `Hola! Quiero hacer una devolucion del pedido #${orderId}`
      : 'Hola! Quiero consultar sobre devoluciones',
}

export type StoreMessageKey = keyof typeof storeMessages
