/**
 * Notification Email Templates
 *
 * Templates for email notifications with Spanish text
 */

import type { NotificationType } from '../types'

// =============================================================================
// Types
// =============================================================================

export interface EmailTemplate {
  html: string
  text: string
}

export interface TemplateParams {
  title: string
  message: string
  data?: Record<string, unknown>
  actionUrl?: string
  tenantId: string
}

// =============================================================================
// Base Template
// =============================================================================

function baseEmailTemplate(params: {
  title: string
  content: string
  actionUrl?: string
  actionText?: string
}): EmailTemplate {
  const { title, content, actionUrl, actionText } = params

  const actionButton = actionUrl
    ? `
    <tr>
      <td style="padding: 24px 0;">
        <a href="${actionUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;
                  font-weight: 500;">
          ${actionText || 'Ver más'}
        </a>
      </td>
    </tr>
  `
    : ''

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">🐾 VetePy</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px;">${title}</h2>
              <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- Action Button -->
          ${actionButton}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Este correo fue enviado automáticamente por VetePy.<br>
                Por favor no responda a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
${title}

${content.replace(/<[^>]*>/g, '')}

${actionUrl ? `Ver más: ${actionUrl}` : ''}

---
Este correo fue enviado automáticamente por VetePy.
`

  return { html, text }
}

// =============================================================================
// Specific Templates
// =============================================================================

const templates: Record<
  NotificationType,
  (params: TemplateParams) => EmailTemplate
> = {
  // Waitlist
  waitlist_slot_available: (params) => {
    const { data } = params
    const petName = (data?.petName as string) || 'tu mascota'
    const appointmentDate = (data?.appointmentDate as string) || ''
    const serviceName = (data?.serviceName as string) || 'el servicio solicitado'

    return baseEmailTemplate({
      title: '¡Turno disponible!',
      content: `
        <p>¡Buenas noticias! Se ha liberado un turno para <strong>${petName}</strong>.</p>
        <p><strong>Servicio:</strong> ${serviceName}</p>
        ${appointmentDate ? `<p><strong>Fecha disponible:</strong> ${appointmentDate}</p>` : ''}
        <p>Este turno está reservado por tiempo limitado. Confirma tu cita lo antes posible.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Confirmar turno',
    })
  },

  waitlist_confirmed: (params) => {
    const { data } = params
    const petName = (data?.petName as string) || 'tu mascota'
    const appointmentDate = (data?.appointmentDate as string) || ''
    const serviceName = (data?.serviceName as string) || ''

    return baseEmailTemplate({
      title: 'Cita confirmada',
      content: `
        <p>Tu cita para <strong>${petName}</strong> ha sido confirmada.</p>
        ${serviceName ? `<p><strong>Servicio:</strong> ${serviceName}</p>` : ''}
        ${appointmentDate ? `<p><strong>Fecha:</strong> ${appointmentDate}</p>` : ''}
        <p>Te esperamos. Recuerda llegar 10 minutos antes de la hora programada.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver cita',
    })
  },

  waitlist_declined: (params) => {
    const { data } = params
    const reason = (data?.reason as string) || 'El turno ofrecido no fue aceptado'

    return baseEmailTemplate({
      title: 'Turno no aceptado',
      content: `
        <p>${reason}</p>
        <p>No te preocupes, seguirás en la lista de espera y te notificaremos cuando haya otro turno disponible.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver lista de espera',
    })
  },

  // Orders & Subscriptions
  order_confirmation: (params) => {
    const { data } = params
    const orderNumber = (data?.orderNumber as string) || ''
    const total = (data?.total as number) || 0

    return baseEmailTemplate({
      title: '¡Pedido confirmado!',
      content: `
        <p>Hemos recibido tu pedido correctamente.</p>
        ${orderNumber ? `<p><strong>Número de pedido:</strong> ${orderNumber}</p>` : ''}
        ${total > 0 ? `<p><strong>Total:</strong> ₲ ${total.toLocaleString('es-PY')}</p>` : ''}
        <p>Te notificaremos cuando tu pedido esté listo para entrega o retiro.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver pedido',
    })
  },

  order_status_update: (params) => {
    const { data } = params
    const orderNumber = (data?.orderNumber as string) || ''
    const status = (data?.status as string) || ''
    const statusText = getOrderStatusText(status)

    return baseEmailTemplate({
      title: 'Actualización de pedido',
      content: `
        <p>El estado de tu pedido ha sido actualizado.</p>
        ${orderNumber ? `<p><strong>Pedido:</strong> ${orderNumber}</p>` : ''}
        <p><strong>Nuevo estado:</strong> ${statusText}</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver pedido',
    })
  },

  subscription_stock_issue: (params) => {
    const { data } = params
    const productName = (data?.productName as string) || 'el producto'

    return baseEmailTemplate({
      title: 'Problema con tu suscripción',
      content: `
        <p>Lamentamos informarte que no pudimos procesar tu suscripción.</p>
        <p>El producto <strong>${productName}</strong> no tiene stock suficiente en este momento.</p>
        <p>Te notificaremos cuando el producto esté disponible nuevamente.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver suscripción',
    })
  },

  subscription_renewal: (params) => {
    const { data } = params
    const nextDate = (data?.nextDate as string) || ''

    return baseEmailTemplate({
      title: 'Suscripción renovada',
      content: `
        <p>Tu suscripción ha sido renovada exitosamente.</p>
        ${nextDate ? `<p><strong>Próxima renovación:</strong> ${nextDate}</p>` : ''}
        <p>Gracias por confiar en nosotros.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver suscripción',
    })
  },

  // Admin/Platform
  product_approved: (params) => {
    const { data } = params
    const productName = (data?.productName as string) || 'Tu producto'

    return baseEmailTemplate({
      title: 'Producto aprobado',
      content: `
        <p><strong>${productName}</strong> ha sido aprobado y ahora está disponible en el catálogo.</p>
        <p>Los clientes ya pueden verlo y comprarlo en tu tienda.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver producto',
    })
  },

  product_rejected: (params) => {
    const { data } = params
    const productName = (data?.productName as string) || 'El producto'
    const reason = (data?.reason as string) || ''

    return baseEmailTemplate({
      title: 'Producto no aprobado',
      content: `
        <p><strong>${productName}</strong> no fue aprobado para el catálogo.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Puedes editar el producto y volver a enviarlo para revisión.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Editar producto',
    })
  },

  commission_invoice: (params) => {
    const { data } = params
    const invoiceNumber = (data?.invoiceNumber as string) || ''
    const amount = (data?.amount as number) || 0
    const dueDate = (data?.dueDate as string) || ''

    return baseEmailTemplate({
      title: 'Factura de comisión',
      content: `
        <p>Se ha generado una nueva factura de comisión para tu clínica.</p>
        ${invoiceNumber ? `<p><strong>Número de factura:</strong> ${invoiceNumber}</p>` : ''}
        ${amount > 0 ? `<p><strong>Monto:</strong> ₲ ${amount.toLocaleString('es-PY')}</p>` : ''}
        ${dueDate ? `<p><strong>Vencimiento:</strong> ${dueDate}</p>` : ''}
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver factura',
    })
  },

  // Staff
  recurrence_limit_warning: (params) => {
    const { data } = params
    const appointmentType = (data?.appointmentType as string) || ''
    const remaining = (data?.remaining as number) || 0

    return baseEmailTemplate({
      title: 'Aviso: Citas recurrentes por terminar',
      content: `
        <p>Las citas recurrentes para <strong>${appointmentType}</strong> están próximas a terminar.</p>
        <p><strong>Citas restantes:</strong> ${remaining}</p>
        <p>Considera extender el patrón de recurrencia si es necesario.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver configuración',
    })
  },

  appointment_reminder: (params) => {
    const { data } = params
    const petName = (data?.petName as string) || 'tu mascota'
    const appointmentDate = (data?.appointmentDate as string) || ''
    const serviceName = (data?.serviceName as string) || ''

    return baseEmailTemplate({
      title: 'Recordatorio de cita',
      content: `
        <p>Te recordamos que tienes una cita programada para <strong>${petName}</strong>.</p>
        ${serviceName ? `<p><strong>Servicio:</strong> ${serviceName}</p>` : ''}
        ${appointmentDate ? `<p><strong>Fecha:</strong> ${appointmentDate}</p>` : ''}
        <p>Por favor, llega 10 minutos antes de la hora programada.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver cita',
    })
  },

  low_stock_alert: (params) => {
    const { data } = params
    const productName = (data?.productName as string) || 'Un producto'
    const currentStock = (data?.currentStock as number) || 0

    return baseEmailTemplate({
      title: 'Alerta de stock bajo',
      content: `
        <p><strong>${productName}</strong> tiene stock bajo.</p>
        <p><strong>Stock actual:</strong> ${currentStock} unidades</p>
        <p>Considera realizar un pedido de reposición.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver inventario',
    })
  },

  // Laboratory
  lab_results_ready: (params) => {
    const { data } = params
    const petName = (data?.petName as string) || 'tu mascota'
    const orderNumber = (data?.orderNumber as string) || ''
    const hasAbnormal = (data?.hasAbnormal as boolean) || false

    const abnormalNotice = hasAbnormal
      ? `<p style="background-color: #fef3c7; padding: 12px; border-radius: 6px; color: #92400e;">
          <strong>⚠️ Nota:</strong> Algunos resultados requieren atención. Te recomendamos revisarlos con el veterinario.
        </p>`
      : ''

    return baseEmailTemplate({
      title: 'Resultados de laboratorio listos',
      content: `
        <p>¡Buenas noticias! Los resultados de laboratorio de <strong>${petName}</strong> ya están disponibles.</p>
        ${orderNumber ? `<p><strong>Orden:</strong> ${orderNumber}</p>` : ''}
        ${abnormalNotice}
        <p>Puedes ver los resultados completos ingresando a tu portal.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver resultados',
    })
  },

  lab_critical_result: (params) => {
    const { data } = params
    const petName = (data?.petName as string) || 'Paciente'
    const criticalTests = (data?.criticalTests as string[]) || []
    const orderNumber = (data?.orderNumber as string) || ''
    const ownerName = (data?.ownerName as string) || ''

    return baseEmailTemplate({
      title: '🚨 ALERTA: Valor crítico de laboratorio',
      content: `
        <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 16px;">
          <p style="margin: 0; color: #991b1b; font-weight: bold;">RESULTADO CRÍTICO DETECTADO</p>
        </div>
        <p><strong>Paciente:</strong> ${petName}</p>
        ${ownerName ? `<p><strong>Propietario:</strong> ${ownerName}</p>` : ''}
        ${orderNumber ? `<p><strong>Orden:</strong> ${orderNumber}</p>` : ''}
        <p><strong>Pruebas con valores críticos:</strong></p>
        <ul style="color: #dc2626;">
          ${criticalTests.map((test) => `<li>${test}</li>`).join('')}
        </ul>
        <p style="font-weight: bold;">Se requiere revisión inmediata del paciente.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver resultados ahora',
    })
  },

  lab_abnormal_result: (params) => {
    const { data } = params
    const petName = (data?.petName as string) || 'Paciente'
    const abnormalTests = (data?.abnormalTests as string[]) || []
    const orderNumber = (data?.orderNumber as string) || ''

    return baseEmailTemplate({
      title: '⚠️ Resultados con valores fuera de rango',
      content: `
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
          <p style="margin: 0; color: #92400e; font-weight: bold;">VALORES ANORMALES DETECTADOS</p>
        </div>
        <p><strong>Paciente:</strong> ${petName}</p>
        ${orderNumber ? `<p><strong>Orden:</strong> ${orderNumber}</p>` : ''}
        <p><strong>Pruebas con valores anormales:</strong></p>
        <ul style="color: #92400e;">
          ${abnormalTests.map((test) => `<li>${test}</li>`).join('')}
        </ul>
        <p>Se recomienda revisar los resultados y contactar al propietario si es necesario.</p>
      `,
      actionUrl: params.actionUrl,
      actionText: 'Ver resultados',
    })
  },

  // General
  custom: (params) =>
    baseEmailTemplate({
      title: params.title,
      content: `<p>${params.message}</p>`,
      actionUrl: params.actionUrl,
    }),
}

// =============================================================================
// Helper Functions
// =============================================================================

function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'En proceso',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  }
  return statusMap[status] || status
}

// =============================================================================
// Export
// =============================================================================

/**
 * Get email template for a notification type
 */
export async function getEmailTemplate(
  type: NotificationType,
  params: TemplateParams
): Promise<EmailTemplate> {
  const templateFn = templates[type] || templates.custom
  return templateFn(params)
}
