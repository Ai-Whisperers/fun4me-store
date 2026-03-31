/**
 * Platform Invoice Email Template
 *
 * Generates HTML email for platform invoice delivery to clinic admins
 * Used for subscription fees, commissions, and other platform billing
 */

export interface PlatformInvoiceEmailData {
  clinicName: string
  adminName?: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  periodStart?: string
  periodEnd?: string
  subscriptionAmount?: number
  storeCommission?: number
  serviceCommission?: number
  total: number
  viewUrl?: string
  paymentMethods?: string[]
  bankDetails?: {
    bankName: string
    accountNumber: string
    accountName: string
    ruc?: string
  }
}

/**
 * Generate platform invoice email HTML
 */
export function generatePlatformInvoiceEmail(data: PlatformInvoiceEmailData): string {
  const {
    clinicName,
    adminName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    periodStart,
    periodEnd,
    subscriptionAmount,
    storeCommission,
    serviceCommission,
    total,
    viewUrl,
    paymentMethods,
    bankDetails,
  } = data

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const hasLineItems = subscriptionAmount || storeCommission || serviceCommission

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoiceNumber} - Vetic</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Vetic</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Plataforma Veterinaria</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 22px; font-weight: 600;">
                ${adminName ? `Hola ${adminName},` : `Estimado/a administrador/a,`}
              </h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Se ha generado una nueva factura para <strong>${clinicName}</strong>.
              </p>
            </td>
          </tr>

          <!-- Invoice Summary Box -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="width: 50%; vertical-align: top;">
                          <div style="margin-bottom: 15px;">
                            <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Factura Nº</span>
                            <div style="color: #1e293b; font-size: 18px; font-weight: 700; margin-top: 4px;">${invoiceNumber}</div>
                          </div>
                          <div>
                            <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Fecha de Emisión</span>
                            <div style="color: #1e293b; font-size: 14px; margin-top: 4px;">${formatDate(invoiceDate)}</div>
                          </div>
                        </td>
                        <td style="width: 50%; vertical-align: top; text-align: right;">
                          <div style="margin-bottom: 15px;">
                            <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Total a Pagar</span>
                            <div style="color: #4f46e5; font-size: 24px; font-weight: 700; margin-top: 4px;">${formatCurrency(total)}</div>
                          </div>
                          <div>
                            <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">Vencimiento</span>
                            <div style="color: #dc2626; font-size: 14px; font-weight: 600; margin-top: 4px;">${formatDate(dueDate)}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${periodStart && periodEnd ? `
          <!-- Period -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #eff6ff; border-radius: 6px; padding: 12px 16px; text-align: center;">
                <span style="color: #3b82f6; font-size: 13px;">
                  📅 Período: <strong>${formatDate(periodStart)}</strong> al <strong>${formatDate(periodEnd)}</strong>
                </span>
              </div>
            </td>
          </tr>
          ` : ''}

          ${hasLineItems ? `
          <!-- Line Items -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 12px 0; text-align: left; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">Concepto</th>
                    <th style="padding: 12px 0; text-align: right; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  ${subscriptionAmount ? `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 14px 0; color: #1e293b; font-size: 14px;">
                      <strong>Suscripción Mensual</strong>
                      <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Acceso a la plataforma Vetic</div>
                    </td>
                    <td style="padding: 14px 0; text-align: right; color: #1e293b; font-size: 14px; font-weight: 500;">${formatCurrency(subscriptionAmount)}</td>
                  </tr>
                  ` : ''}
                  ${storeCommission ? `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 14px 0; color: #1e293b; font-size: 14px;">
                      <strong>Comisión E-Commerce</strong>
                      <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Ventas en tienda online</div>
                    </td>
                    <td style="padding: 14px 0; text-align: right; color: #1e293b; font-size: 14px; font-weight: 500;">${formatCurrency(storeCommission)}</td>
                  </tr>
                  ` : ''}
                  ${serviceCommission ? `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 14px 0; color: #1e293b; font-size: 14px;">
                      <strong>Comisión Servicios</strong>
                      <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Citas y servicios facturados</div>
                    </td>
                    <td style="padding: 14px 0; text-align: right; color: #1e293b; font-size: 14px; font-weight: 500;">${formatCurrency(serviceCommission)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 16px 0; color: #1e293b; font-size: 16px; font-weight: 700;">TOTAL</td>
                    <td style="padding: 16px 0; text-align: right; color: #4f46e5; font-size: 18px; font-weight: 700;">${formatCurrency(total)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          ` : ''}

          ${bankDetails ? `
          <!-- Bank Details -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px; color: #166534; font-size: 14px; font-weight: 600;">
                  💳 Datos para Transferencia
                </h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 4px 0; color: #166534; width: 40%;">Banco:</td>
                    <td style="padding: 4px 0; color: #14532d; font-weight: 500;">${bankDetails.bankName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #166534;">Cuenta:</td>
                    <td style="padding: 4px 0; color: #14532d; font-weight: 500;">${bankDetails.accountNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #166534;">Titular:</td>
                    <td style="padding: 4px 0; color: #14532d; font-weight: 500;">${bankDetails.accountName}</td>
                  </tr>
                  ${bankDetails.ruc ? `
                  <tr>
                    <td style="padding: 4px 0; color: #166534;">RUC:</td>
                    <td style="padding: 4px 0; color: #14532d; font-weight: 500;">${bankDetails.ruc}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
          </tr>
          ` : ''}

          ${paymentMethods && paymentMethods.length > 0 ? `
          <!-- Payment Methods -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px;">
                <span style="color: #854d0e; font-size: 13px;">
                  <strong>Métodos de pago aceptados:</strong> ${paymentMethods.join(', ')}
                </span>
              </div>
            </td>
          </tr>
          ` : ''}

          ${viewUrl ? `
          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 40px 30px; text-align: center;">
              <a href="${viewUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Ver Factura Completa
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; text-align: center; line-height: 1.5;">
                Gracias por confiar en <strong>Vetic</strong> como su plataforma de gestión veterinaria.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                Si tienes alguna pregunta sobre esta factura, responde a este correo o contáctanos en soporte@vetic.app
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version of platform invoice email
 */
export function generatePlatformInvoiceEmailText(data: PlatformInvoiceEmailData): string {
  const {
    clinicName,
    adminName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    periodStart,
    periodEnd,
    subscriptionAmount,
    storeCommission,
    serviceCommission,
    total,
    viewUrl,
    bankDetails,
  } = data

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  let text = `VETIC - Plataforma Veterinaria\n`
  text += `${'='.repeat(40)}\n\n`

  text += `${adminName ? `Hola ${adminName},` : 'Estimado/a administrador/a,'}\n\n`
  text += `Se ha generado una nueva factura para ${clinicName}.\n\n`

  text += `FACTURA Nº: ${invoiceNumber}\n`
  text += `FECHA: ${formatDate(invoiceDate)}\n`
  text += `VENCIMIENTO: ${formatDate(dueDate)}\n`

  if (periodStart && periodEnd) {
    text += `PERÍODO: ${formatDate(periodStart)} al ${formatDate(periodEnd)}\n`
  }

  text += `\n${'-'.repeat(40)}\n`

  if (subscriptionAmount) {
    text += `Suscripción Mensual: ${formatCurrency(subscriptionAmount)}\n`
  }
  if (storeCommission) {
    text += `Comisión E-Commerce: ${formatCurrency(storeCommission)}\n`
  }
  if (serviceCommission) {
    text += `Comisión Servicios: ${formatCurrency(serviceCommission)}\n`
  }

  text += `${'-'.repeat(40)}\n`
  text += `TOTAL A PAGAR: ${formatCurrency(total)}\n\n`

  if (bankDetails) {
    text += `DATOS PARA TRANSFERENCIA:\n`
    text += `Banco: ${bankDetails.bankName}\n`
    text += `Cuenta: ${bankDetails.accountNumber}\n`
    text += `Titular: ${bankDetails.accountName}\n`
    if (bankDetails.ruc) {
      text += `RUC: ${bankDetails.ruc}\n`
    }
    text += '\n'
  }

  if (viewUrl) {
    text += `Ver factura completa: ${viewUrl}\n\n`
  }

  text += `Gracias por confiar en Vetic.\n`
  text += `Si tienes alguna pregunta, responde a este correo o contáctanos en soporte@vetic.app\n`

  return text
}
