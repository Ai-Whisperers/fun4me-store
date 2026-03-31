'use client'

import { useState } from 'react'
import { Loader2, Download, FileText } from 'lucide-react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { PlatformInvoice, PlatformInvoiceItem } from '@/lib/billing/types'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2DCEA3', // Vetic brand color
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 10,
    padding: '4 8',
    borderRadius: 4,
    marginTop: 8,
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusOverdue: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    color: '#666',
    width: 140,
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  col1: { width: '50%' },
  col2: { width: '15%', textAlign: 'right' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    color: '#666',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingTop: 8,
    marginTop: 8,
  },
  paymentInfo: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
  },
  graceNote: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fff7ed',
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
    fontSize: 9,
  },
})

// Format currency in Guaranies
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Status labels in Spanish
const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  paid: 'Pagada',
  overdue: 'Vencida',
  void: 'Anulada',
  waived: 'Condonada',
}

// Item type labels in Spanish
const itemTypeLabels: Record<string, string> = {
  subscription: 'Suscripcion',
  store_commission: 'Comision Tienda',
  service_commission: 'Comision Servicios',
  adjustment: 'Ajuste',
  credit: 'Credito',
  late_fee: 'Cargo por Mora',
  discount: 'Descuento',
}

interface PlatformInvoicePDFProps {
  invoice: PlatformInvoice
  items: PlatformInvoiceItem[]
  billingInfo: {
    name: string | null
    email: string | null
    ruc: string | null
    address: string | null
    city: string | null
  }
}

// PDF Document Component
export function PlatformInvoicePDFDocument({ invoice, items, billingInfo }: PlatformInvoicePDFProps) {
  const getStatusStyle = () => {
    switch (invoice.status) {
      case 'paid':
        return styles.statusPaid
      case 'overdue':
        return styles.statusOverdue
      default:
        return styles.statusPending
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Vetic</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>Plataforma Veterinaria</Text>
            <Text style={{ color: '#666', fontSize: 8, marginTop: 2 }}>
              Asuncion, Paraguay
            </Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text>Emision: {formatDate(invoice.issued_at || invoice.created_at)}</Text>
            <Text>Vencimiento: {formatDate(invoice.due_date)}</Text>
            <View style={[styles.statusBadge, getStatusStyle()]}>
              <Text>{statusLabels[invoice.status] || invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Billing Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Periodo de Facturacion</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Desde:</Text>
            <Text style={styles.value}>{formatDate(invoice.period_start)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Hasta:</Text>
            <Text style={styles.value}>{formatDate(invoice.period_end)}</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facturar a</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Razon Social:</Text>
            <Text style={styles.value}>{billingInfo.name || 'N/A'}</Text>
          </View>
          {billingInfo.ruc && (
            <View style={styles.row}>
              <Text style={styles.label}>RUC:</Text>
              <Text style={styles.value}>{billingInfo.ruc}</Text>
            </View>
          )}
          {billingInfo.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Direccion:</Text>
              <Text style={styles.value}>
                {billingInfo.address}
                {billingInfo.city ? `, ${billingInfo.city}` : ''}
              </Text>
            </View>
          )}
          {billingInfo.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{billingInfo.email}</Text>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Concepto</Text>
              <Text style={styles.col2}>Cant.</Text>
              <Text style={styles.col3}>P. Unit.</Text>
              <Text style={styles.col4}>Total</Text>
            </View>
            {items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.col1}>
                  <Text>{item.description}</Text>
                  <Text style={{ fontSize: 8, color: '#666' }}>
                    {itemTypeLabels[item.item_type] || item.item_type}
                  </Text>
                </View>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>{formatCurrency(Number(item.unit_price))}</Text>
                <Text style={styles.col4}>{formatCurrency(Number(item.total))}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatCurrency(Number(invoice.subtotal))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              IVA ({Math.round(Number(invoice.tax_rate) * 100)}%)
            </Text>
            <Text>{formatCurrency(Number(invoice.tax_amount))}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalValue}>TOTAL</Text>
            <Text style={styles.totalValue}>{formatCurrency(Number(invoice.total))}</Text>
          </View>
          {invoice.payment_amount && Number(invoice.payment_amount) > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={{ color: 'green' }}>Pagado</Text>
                <Text style={{ color: 'green' }}>
                  -{formatCurrency(Number(invoice.payment_amount))}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalValue}>Saldo Pendiente</Text>
                <Text style={{ color: '#f97316', fontWeight: 'bold' }}>
                  {formatCurrency(Number(invoice.total) - Number(invoice.payment_amount))}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Grace Period Note */}
        {invoice.grace_period_days && invoice.grace_period_days > 0 && (
          <View style={styles.graceNote}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
              Periodo de Gracia Activo
            </Text>
            <Text>
              Se ha otorgado un periodo de gracia de {invoice.grace_period_days} dias.
              {invoice.grace_reason ? ` Motivo: ${invoice.grace_reason}` : ''}
            </Text>
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Metodos de Pago Aceptados</Text>
          <Text style={{ marginBottom: 4 }}>
            - Tarjeta de credito/debito (Visa, Mastercard)
          </Text>
          <Text style={{ marginBottom: 4 }}>
            - Transferencia bancaria (solicitar alias)
          </Text>
          <Text>- MercadoPago</Text>
          <Text style={{ marginTop: 8, fontSize: 8, color: '#666' }}>
            Para consultas sobre facturacion: billing@vetic.com.py
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Vetic - Plataforma de Gestion Veterinaria | www.vetic.com.py | RUC: [PENDIENTE]
        </Text>
      </Page>
    </Document>
  )
}

// Download Button Component
interface PlatformInvoicePDFButtonProps {
  invoice: PlatformInvoice
  items: PlatformInvoiceItem[]
  billingInfo: {
    name: string | null
    email: string | null
    ruc: string | null
    address: string | null
    city: string | null
  }
  variant?: 'button' | 'icon'
}

export function PlatformInvoicePDFButton({
  invoice,
  items,
  billingInfo,
  variant = 'button',
}: PlatformInvoicePDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const blob = await pdf(
        <PlatformInvoicePDFDocument
          invoice={invoice}
          items={items}
          billingInfo={billingInfo}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:opacity-50"
        title="Descargar PDF"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
        ) : (
          <Download className="h-5 w-5 text-[var(--text-secondary)]" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-[var(--text-primary)] hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Descargar Factura
    </button>
  )
}
