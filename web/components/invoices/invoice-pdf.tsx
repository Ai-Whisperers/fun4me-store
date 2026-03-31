'use client'

import { useState } from 'react'
import { Loader2, Download } from 'lucide-react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { useToast } from '@/components/ui/Toast'
import {
  formatCurrency,
  formatDate,
  type Invoice,
  paymentMethodLabels,
} from '@/lib/types/invoicing'

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a2e',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    color: '#666',
    width: 80,
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
  col1: { width: '40%' },
  col2: { width: '10%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '10%', textAlign: 'right' },
  col5: { width: '20%', textAlign: 'right' },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 200,
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
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
    marginTop: 8,
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
})

// PDF Document Component
export function InvoicePDFDocument({
  invoice,
  clinicName,
}: {
  invoice: Invoice
  clinicName: string
}) {
  const owner = invoice.pets?.owner

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{clinicName}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>Factura</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text>Fecha: {formatDate(invoice.created_at)}</Text>
            {invoice.due_date && <Text>Vencimiento: {formatDate(invoice.due_date)}</Text>}
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{owner?.full_name || 'N/A'}</Text>
          </View>
          {owner?.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{owner.email}</Text>
            </View>
          )}
          {owner?.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{owner.phone}</Text>
            </View>
          )}
          {invoice.pets && (
            <View style={styles.row}>
              <Text style={styles.label}>Mascota:</Text>
              <Text style={styles.value}>
                {invoice.pets.name} ({invoice.pets.species})
              </Text>
            </View>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Descripción</Text>
              <Text style={styles.col2}>Cant.</Text>
              <Text style={styles.col3}>Precio</Text>
              <Text style={styles.col4}>Desc.</Text>
              <Text style={styles.col5}>Subtotal</Text>
            </View>
            {invoice.invoice_items?.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{item.description}</Text>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.col4}>
                  {item.discount_percent ? `${item.discount_percent}%` : '-'}
                </Text>
                <Text style={styles.col5}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA ({invoice.tax_rate}%)</Text>
            <Text>{formatCurrency(invoice.tax_amount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalValue}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
          {invoice.amount_paid > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={{ color: 'green' }}>Pagado</Text>
                <Text style={{ color: 'green' }}>-{formatCurrency(invoice.amount_paid)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalValue}>Pendiente</Text>
                <Text style={{ color: 'orange', fontWeight: 'bold' }}>
                  {formatCurrency(invoice.amount_due)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Pagos Registrados</Text>
            {invoice.payments.map((payment, index) => (
              <View key={index} style={styles.row}>
                <Text style={{ flex: 1 }}>
                  {formatDate(payment.paid_at)} - {paymentMethodLabels[payment.payment_method]}
                  {payment.reference_number && ` (Ref: ${payment.reference_number})`}
                </Text>
                <Text style={{ color: 'green' }}>{formatCurrency(payment.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={{ color: '#666' }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>Gracias por confiar en {clinicName}</Text>
      </Page>
    </Document>
  )
}

// Download Button Component
interface InvoicePDFButtonProps {
  invoice: Invoice
  clinicName: string
  variant?: 'button' | 'icon'
}

export function InvoicePDFButton({
  invoice,
  clinicName,
  variant = 'button',
}: InvoicePDFButtonProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const blob = await pdf(
        <InvoicePDFDocument invoice={invoice} clinicName={clinicName} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (_error: unknown) {
      showToast({ title: 'Error al generar PDF', variant: 'error' })
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
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Descargar PDF
    </button>
  )
}
