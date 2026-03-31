'use client'

import { useState } from 'react'
import { Loader2, Download, FileText } from 'lucide-react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { useToast } from '@/components/ui/Toast'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  variant_id: string | null
  variant_name: string | null
  quantity: number
  unit_price: number
  line_total: number
}

interface Order {
  id: string
  order_number: string
  status: string
  subtotal: number
  discount_amount: number
  coupon_code: string | null
  shipping_cost: number
  tax_amount: number
  total: number
  shipping_address: {
    street?: string
    city?: string
    phone?: string
    recipient_name?: string
  } | null
  shipping_method: string
  payment_method: string
  created_at: string
  store_order_items: OrderItem[]
}

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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  orderInfo: {
    textAlign: 'right',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    marginTop: 4,
    alignSelf: 'flex-end',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a2e',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    color: '#666',
    width: 100,
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
  tableRowAlternate: {
    backgroundColor: '#fafafa',
  },
  col1: { width: '45%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    width: 220,
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 2,
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
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  watermark: {
    position: 'absolute',
    top: '45%',
    left: '30%',
    fontSize: 48,
    color: '#f0f0f0',
    transform: 'rotate(-30deg)',
    opacity: 0.5,
  },
})

const STATUS_LABELS: Record<string, string> = {
  pending: 'PENDIENTE',
  confirmed: 'CONFIRMADO',
  processing: 'EN PROCESO',
  shipped: 'ENVIADO',
  delivered: 'ENTREGADO',
  cancelled: 'CANCELADO',
  refunded: 'REEMBOLSADO',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: 'Contra Entrega',
  card: 'Tarjeta',
  bank_transfer: 'Transferencia Bancaria',
}

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  delivery: 'Envío a Domicilio',
  pickup: 'Retiro en Tienda',
}

// Format currency
function formatCurrency(amount: number): string {
  return `Gs ${amount.toLocaleString('es-PY')}`
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// PDF Document Component
function OrderInvoicePDFDocument({
  order,
  clinicName,
}: {
  order: Order
  clinicName: string
}): React.ReactElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{clinicName}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>Comprobante de Pedido</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{order.order_number}</Text>
            <Text style={{ color: '#666' }}>{formatDate(order.created_at)}</Text>
            <View style={styles.badge}>
              <Text>{STATUS_LABELS[order.status] || order.status}</Text>
            </View>
          </View>
        </View>

        {/* Shipping Info */}
        {order.shipping_address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos de Envío</Text>
            {order.shipping_address.recipient_name && (
              <View style={styles.row}>
                <Text style={styles.label}>Destinatario:</Text>
                <Text style={styles.value}>{order.shipping_address.recipient_name}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Dirección:</Text>
              <Text style={styles.value}>
                {order.shipping_address.street}
                {order.shipping_address.city && `, ${order.shipping_address.city}`}
              </Text>
            </View>
            {order.shipping_address.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Teléfono:</Text>
                <Text style={styles.value}>{order.shipping_address.phone}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Método:</Text>
              <Text style={styles.value}>
                {SHIPPING_METHOD_LABELS[order.shipping_method] || order.shipping_method}
              </Text>
            </View>
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Pago</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Método de Pago:</Text>
            <Text style={styles.value}>
              {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Producto</Text>
              <Text style={styles.col2}>Cant.</Text>
              <Text style={styles.col3}>Precio Unit.</Text>
              <Text style={styles.col4}>Subtotal</Text>
            </View>
            {order.store_order_items.map((item, index) => (
              <View
                key={item.id}
                style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlternate] : [])]}
              >
                <View style={styles.col1}>
                  <Text>{item.product_name}</Text>
                  {item.variant_name && (
                    <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
                      {item.variant_name}
                    </Text>
                  )}
                </View>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.col4}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ color: '#16a34a' }}>
                Descuento{order.coupon_code && ` (${order.coupon_code})`}
              </Text>
              <Text style={{ color: '#16a34a' }}>-{formatCurrency(order.discount_amount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Envío</Text>
            <Text>{order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : 'Gratis'}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA (10%)</Text>
            <Text>{formatCurrency(order.tax_amount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Gracias por tu compra en {clinicName}</Text>
          <Text style={{ marginTop: 4 }}>
            Este documento es un comprobante de pedido y no es una factura fiscal.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Download Button Component
interface OrderInvoicePDFButtonProps {
  order: Order
  clinicName: string
  variant?: 'button' | 'icon' | 'text'
}

export function OrderInvoicePDFButton({
  order,
  clinicName,
  variant = 'button',
}: OrderInvoicePDFButtonProps): React.ReactElement {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDownload = async (): Promise<void> => {
    setLoading(true)
    try {
      const blob = await pdf(
        <OrderInvoicePDFDocument order={order} clinicName={clinicName} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pedido-${order.order_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error generating PDF:', e)
      }
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
        title="Descargar Comprobante"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
        ) : (
          <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
        )}
      </button>
    )
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-2 text-[var(--primary)] hover:underline disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Descargar Comprobante
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[var(--text-primary)] transition-colors hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Comprobante PDF
    </button>
  )
}

export { OrderInvoicePDFDocument }
