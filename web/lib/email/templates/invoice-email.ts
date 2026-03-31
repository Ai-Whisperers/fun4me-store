/**
 * Invoice Email Template
 *
 * Generates HTML email for invoice delivery to pet owners
 */

export interface InvoiceEmailData {
  clinicName: string
  clinicLogo?: string
  clinicAddress?: string
  clinicPhone?: string
  clinicEmail?: string
  ownerName: string
  petName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid?: number
  amountDue: number
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    discountPercent?: number
    lineTotal: number
  }>
  notes?: string
  paymentInstructions?: string
  viewUrl?: string
}

/**
 * Generate invoice email HTML
 */
export function generateInvoiceEmail(data: InvoiceEmailData): string {
  const {
    clinicName,
    clinicLogo,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    ownerName,
    petName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    subtotal,
    taxRate,
    taxAmount,
    total,
    amountPaid = 0,
    amountDue,
    items,
    notes,
    paymentInstructions,
    viewUrl,
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

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              ${clinicLogo ? `<img src="${clinicLogo}" alt="${clinicName}" style="max-width: 150px; height: auto; margin-bottom: 20px;">` : ''}
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${clinicName}</h1>
              ${clinicAddress ? `<p style="margin: 8px 0 0; color: #e0e0e0; font-size: 14px;">${clinicAddress}</p>` : ''}
              <div style="margin-top: 12px;">
                ${clinicPhone ? `<span style="color: #e0e0e0; font-size: 14px; margin-right: 15px;">📞 ${clinicPhone}</span>` : ''}
                ${clinicEmail ? `<span style="color: #e0e0e0; font-size: 14px;">✉️ ${clinicEmail}</span>` : ''}
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h2 style="margin: 0 0 10px; color: #333333; font-size: 24px; font-weight: 600;">Hola ${ownerName},</h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                Adjuntamos la factura por los servicios prestados a <strong>${petName}</strong>.
              </p>
            </td>
          </tr>

          <!-- Invoice Details -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 8px 15px; width: 50%;">
                    <strong style="color: #666666; font-size: 13px; text-transform: uppercase;">Factura Nº:</strong>
                    <div style="color: #333333; font-size: 16px; font-weight: 600; margin-top: 4px;">${invoiceNumber}</div>
                  </td>
                  <td style="padding: 8px 15px; width: 50%; text-align: right;">
                    <strong style="color: #666666; font-size: 13px; text-transform: uppercase;">Fecha:</strong>
                    <div style="color: #333333; font-size: 16px; font-weight: 600; margin-top: 4px;">${formatDate(invoiceDate)}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 8px 15px; border-top: 1px solid #e0e0e0;">
                    <strong style="color: #666666; font-size: 13px; text-transform: uppercase;">Vencimiento:</strong>
                    <div style="color: #333333; font-size: 16px; font-weight: 600; margin-top: 4px;">${formatDate(dueDate)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e0e0e0;">
                    <th style="padding: 12px; text-align: left; font-size: 13px; color: #666666; text-transform: uppercase; font-weight: 600;">Descripción</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; color: #666666; text-transform: uppercase; font-weight: 600; width: 60px;">Cant.</th>
                    <th style="padding: 12px; text-align: right; font-size: 13px; color: #666666; text-transform: uppercase; font-weight: 600; width: 100px;">Precio</th>
                    <th style="padding: 12px; text-align: right; font-size: 13px; color: #666666; text-transform: uppercase; font-weight: 600; width: 100px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item, index) => `
                    <tr style="border-bottom: 1px solid #e0e0e0;">
                      <td style="padding: 12px; color: #333333; font-size: 14px;">
                        ${item.description}
                        ${item.discountPercent ? `<br><span style="color: #10b981; font-size: 12px;">Descuento: ${item.discountPercent}%</span>` : ''}
                      </td>
                      <td style="padding: 12px; text-align: center; color: #666666; font-size: 14px;">${item.quantity}</td>
                      <td style="padding: 12px; text-align: right; color: #666666; font-size: 14px;">${formatCurrency(item.unitPrice)}</td>
                      <td style="padding: 12px; text-align: right; color: #333333; font-size: 14px; font-weight: 600;">${formatCurrency(item.lineTotal)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table style="width: 100%; border-collapse: collapse; margin-left: auto; max-width: 300px;">
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subtotal:</td>
                  <td style="padding: 8px 0; text-align: right; color: #333333; font-size: 14px;">${formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">IVA (${taxRate}%):</td>
                  <td style="padding: 8px 0; text-align: right; color: #333333; font-size: 14px;">${formatCurrency(taxAmount)}</td>
                </tr>
                ${
                  amountPaid > 0
                    ? `
                  <tr style="border-top: 1px solid #e0e0e0;">
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; font-weight: 600;">Total:</td>
                    <td style="padding: 8px 0; text-align: right; color: #333333; font-size: 16px; font-weight: 600;">${formatCurrency(total)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #10b981; font-size: 14px;">Pagado:</td>
                    <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 14px;">${formatCurrency(amountPaid)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #333333;">
                    <td style="padding: 12px 0; color: #333333; font-size: 16px; font-weight: 700;">Saldo Pendiente:</td>
                    <td style="padding: 12px 0; text-align: right; color: #ef4444; font-size: 18px; font-weight: 700;">${formatCurrency(amountDue)}</td>
                  </tr>
                `
                    : `
                  <tr style="border-top: 2px solid #333333;">
                    <td style="padding: 12px 0; color: #333333; font-size: 16px; font-weight: 700;">Total a Pagar:</td>
                    <td style="padding: 12px 0; text-align: right; color: #333333; font-size: 18px; font-weight: 700;">${formatCurrency(total)}</td>
                  </tr>
                `
                }
              </table>
            </td>
          </tr>

          <!-- Notes -->
          ${
            notes
              ? `
            <tr>
              <td style="padding: 0 40px 20px;">
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                  <strong style="color: #92400e; font-size: 14px; display: block; margin-bottom: 5px;">Nota:</strong>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">${notes}</p>
                </div>
              </td>
            </tr>
          `
              : ''
          }

          <!-- Payment Instructions -->
          ${
            paymentInstructions
              ? `
            <tr>
              <td style="padding: 0 40px 30px;">
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
                  <strong style="color: #065f46; font-size: 14px; display: block; margin-bottom: 5px;">Formas de Pago:</strong>
                  <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.5; white-space: pre-line;">${paymentInstructions}</p>
                </div>
              </td>
            </tr>
          `
              : ''
          }

          <!-- CTA Button -->
          ${
            viewUrl
              ? `
            <tr>
              <td style="padding: 0 40px 30px; text-align: center;">
                <a href="${viewUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver Factura Completa
                </a>
              </td>
            </tr>
          `
              : ''
          }

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center; line-height: 1.5;">
                Gracias por confiar en nosotros para el cuidado de ${petName}.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.5;">
                Si tienes alguna pregunta sobre esta factura, no dudes en contactarnos.
              </p>
              ${
                clinicPhone || clinicEmail
                  ? `
                <p style="margin: 10px 0 0; color: #999999; font-size: 12px; text-align: center;">
                  ${clinicPhone ? `📞 ${clinicPhone}` : ''} ${clinicPhone && clinicEmail ? '|' : ''} ${clinicEmail ? `✉️ ${clinicEmail}` : ''}
                </p>
              `
                  : ''
              }
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
 * Generate plain text version of invoice email
 */
export function generateInvoiceEmailText(data: InvoiceEmailData): string {
  const {
    clinicName,
    ownerName,
    petName,
    invoiceNumber,
    invoiceDate,
    dueDate,
    subtotal,
    taxRate,
    taxAmount,
    total,
    amountPaid = 0,
    amountDue,
    items,
    notes,
    paymentInstructions,
    viewUrl,
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

  let text = `${clinicName}\n`
  text += `${'='.repeat(clinicName.length)}\n\n`
  text += `Hola ${ownerName},\n\n`
  text += `Adjuntamos la factura por los servicios prestados a ${petName}.\n\n`
  text += `FACTURA Nº: ${invoiceNumber}\n`
  text += `FECHA: ${formatDate(invoiceDate)}\n`
  text += `VENCIMIENTO: ${formatDate(dueDate)}\n\n`
  text += `ITEMS:\n`
  text += `${'-'.repeat(60)}\n`

  items.forEach((item) => {
    text += `${item.description}\n`
    if (item.discountPercent) {
      text += `  Descuento: ${item.discountPercent}%\n`
    }
    text += `  Cantidad: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.lineTotal)}\n\n`
  })

  text += `${'-'.repeat(60)}\n`
  text += `Subtotal: ${formatCurrency(subtotal)}\n`
  text += `IVA (${taxRate}%): ${formatCurrency(taxAmount)}\n`

  if (amountPaid > 0) {
    text += `Total: ${formatCurrency(total)}\n`
    text += `Pagado: ${formatCurrency(amountPaid)}\n`
    text += `SALDO PENDIENTE: ${formatCurrency(amountDue)}\n\n`
  } else {
    text += `TOTAL A PAGAR: ${formatCurrency(total)}\n\n`
  }

  if (notes) {
    text += `NOTA:\n${notes}\n\n`
  }

  if (paymentInstructions) {
    text += `FORMAS DE PAGO:\n${paymentInstructions}\n\n`
  }

  if (viewUrl) {
    text += `Ver factura completa: ${viewUrl}\n\n`
  }

  text += `Gracias por confiar en nosotros para el cuidado de ${petName}.\n\n`
  text += `Si tienes alguna pregunta sobre esta factura, no dudes en contactarnos.\n`

  return text
}
