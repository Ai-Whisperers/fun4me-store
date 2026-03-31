'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import type { ClinicConfig } from '@/lib/clinics'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  type: 'product' | 'service'
  requires_prescription?: boolean
  image_url?: string
}

interface PrintableReceiptProps {
  config: ClinicConfig
  clinicSlug?: string
  items: CartItem[]
  subtotal: number
  taxRate: number
  taxName: string
  total: number
  currency: string
  invoiceNumber?: string
  customerEmail?: string
  petName?: string
  isQuote?: boolean
}

/**
 * PrintableReceipt - Beautiful professional receipt for printing
 *
 * Optimized for:
 * - A4 paper (full page layout)
 * - 80mm thermal printers
 * - Clean, modern design
 */
export function PrintableReceipt({
  config,
  clinicSlug,
  items,
  subtotal,
  taxRate,
  taxName,
  total,
  currency,
  invoiceNumber,
  customerEmail,
  petName,
  isQuote = true,
}: PrintableReceiptProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-PY', { style: 'currency', currency }).format(amount)

  const formatDate = () => {
    const now = new Date()
    return now.toLocaleDateString('es-PY', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = () => {
    const now = new Date()
    return now.toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const slug = clinicSlug || config.id || 'clinic'
  const trackingUrl = invoiceNumber
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}/portal/orders/${invoiceNumber}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/${slug}/cart/checkout`

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (trackingUrl) {
      QRCode.toDataURL(trackingUrl, {
        width: 120,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#1a1a1a',
          light: '#ffffff',
        },
      })
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(null))
    }
  }, [trackingUrl])

  // Calculate item count
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="printable-receipt hidden print:block">
      {/* A4 optimized container */}
      <div className="mx-auto min-h-screen bg-white px-8 py-6 text-black print:px-12 print:py-8">

        {/* ═══════════════════════════════════════════════════════════════
            HEADER - Clinic Branding
        ═══════════════════════════════════════════════════════════════ */}
        <header className="mb-8 text-center">
          {/* Logo */}
          {config.branding?.logo_url && (
            <div className="mb-4">
              <img
                src={config.branding.logo_url}
                alt={config.name}
                className="mx-auto h-16 w-auto object-contain print:h-20"
              />
            </div>
          )}

          {/* Clinic Name */}
          <h1 className="mb-2 text-2xl font-bold uppercase tracking-widest text-gray-900 print:text-3xl">
            {config.name}
          </h1>

          {/* Contact Info Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
            {config.contact?.address && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {config.contact.address}
              </span>
            )}
            {config.contact?.phone_display && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {config.contact.phone_display}
              </span>
            )}
          </div>

          {/* RUC */}
          {config.settings?.ruc && (
            <p className="mt-2 text-sm font-semibold text-gray-700">
              RUC: {config.settings.ruc}
            </p>
          )}

          {/* Decorative line */}
          <div className="mx-auto mt-6 flex items-center justify-center gap-2">
            <div className="h-px w-16 bg-gray-300" />
            <div className="h-1.5 w-1.5 rotate-45 bg-gray-400" />
            <div className="h-px w-16 bg-gray-300" />
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            DOCUMENT TYPE BADGE
        ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-8 text-center">
          <div className={`inline-block rounded-lg px-6 py-3 ${
            isQuote
              ? 'border-2 border-dashed border-amber-400 bg-amber-50'
              : 'border-2 border-green-500 bg-green-50'
          }`}>
            <h2 className={`text-xl font-bold uppercase tracking-wide ${
              isQuote ? 'text-amber-700' : 'text-green-700'
            }`}>
              {isQuote ? 'COTIZACIÓN' : 'COMPROBANTE DE PEDIDO'}
            </h2>
            {invoiceNumber && (
              <p className="mt-1 text-lg font-mono font-semibold text-gray-700">
                Nº {invoiceNumber}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium capitalize">{formatDate()}</p>
            <p className="text-gray-500">{formatTime()} hrs</p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CUSTOMER INFO CARD
        ═══════════════════════════════════════════════════════════════ */}
        {(customerEmail || petName) && (
          <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              Datos del Cliente
            </h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {customerEmail && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">{customerEmail}</span>
                </div>
              )}
              {petName && (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="font-medium text-gray-900">{petName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ITEMS TABLE
        ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
            Detalle ({totalItems} {totalItems === 1 ? 'artículo' : 'artículos'})
          </h3>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Descripción</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 w-20">Cant.</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">P. Unit.</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={`${item.type}-${item.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                          item.type === 'service'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.type === 'service' ? 'Servicio' : 'Producto'}
                        </span>
                        {item.requires_prescription && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Rx
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 font-medium text-gray-700">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TOTALS SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="ml-auto max-w-xs rounded-xl border-2 border-gray-900 bg-gray-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{taxName} ({(taxRate * 100).toFixed(0)}%):</span>
                <span>{formatCurrency(subtotal * taxRate)}</span>
              </div>
              <div className="border-t-2 border-dashed border-gray-300 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            QR CODE & TRACKING
        ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-8 flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-6">
          <div className="mb-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Código QR"
                width={100}
                height={100}
                className="h-24 w-24"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center bg-gray-100 text-xs text-gray-400">
                QR
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-500">
            {isQuote
              ? 'Escanea para completar tu pedido'
              : 'Escanea para ver el estado de tu pedido'}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            FOOTER - Legal & Thank You
        ═══════════════════════════════════════════════════════════════ */}
        <footer className="border-t border-gray-200 pt-6 text-center">
          {/* Legal disclaimer */}
          <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
            {isQuote ? (
              <>
                <p className="font-medium text-gray-700">Esta cotización es válida por 7 días.</p>
                <p className="mt-1">Los precios pueden variar según disponibilidad de stock.</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-700">Este comprobante no es válido como factura.</p>
                <p className="mt-1">Solicite su factura legal en recepción presentando este comprobante.</p>
              </>
            )}
          </div>

          {/* WhatsApp contact */}
          {config.contact?.whatsapp_number && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp: {config.contact.whatsapp_number}
            </div>
          )}

          {/* Thank you message */}
          <div className="mt-4">
            <p className="text-lg font-semibold text-gray-800">
              ¡Gracias por su preferencia!
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {config.name} - Cuidamos a quienes más quieres
            </p>
          </div>

          {/* Decorative paw prints */}
          <div className="mt-6 flex items-center justify-center gap-3 text-gray-300">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6-1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm3.5-4C8.67 5 8 5.67 8 6.5S8.67 8 9.5 8s1.5-.67 1.5-1.5S10.33 5 9.5 5zm5 0c-.83 0-1.5.67-1.5 1.5S13.67 8 14.5 8 16 7.33 16 6.5 15.33 5 14.5 5zM12 16c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z"/>
            </svg>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6-1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm3.5-4C8.67 5 8 5.67 8 6.5S8.67 8 9.5 8s1.5-.67 1.5-1.5S10.33 5 9.5 5zm5 0c-.83 0-1.5.67-1.5 1.5S13.67 8 14.5 8 16 7.33 16 6.5 15.33 5 14.5 5zM12 16c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z"/>
            </svg>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6-1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm3.5-4C8.67 5 8 5.67 8 6.5S8.67 8 9.5 8s1.5-.67 1.5-1.5S10.33 5 9.5 5zm5 0c-.83 0-1.5.67-1.5 1.5S13.67 8 14.5 8 16 7.33 16 6.5 15.33 5 14.5 5zM12 16c-2.21 0-4 1.79-4 4h8c0-2.21-1.79-4-4-4z"/>
            </svg>
          </div>
        </footer>
      </div>
    </div>
  )
}
