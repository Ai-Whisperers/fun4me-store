'use client'

/**
 * Analytics PDF Document
 *
 * React-PDF component for rendering analytics reports as PDF documents.
 */

import { Document, Page, Text, View } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { REPORT_TITLES, getNestedValue, formatValue } from './utils'
import type { AnalyticsExportData } from './types'

interface Props {
  exportData: AnalyticsExportData
}

export function AnalyticsPDFDocument({ exportData }: Props) {
  const { type, title, columns, data, period, clinicName, generatedAt } = exportData

  // Calculate summary stats
  const totalRecords = data.length

  // Calculate totals for numeric columns
  const numericSummary: { label: string; value: string }[] = []

  if (type === 'revenue') {
    const totalRevenue = data.reduce((sum, row) => {
      const val = getNestedValue(row, 'total')
      return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0)
    }, 0)
    numericSummary.push({
      label: 'Ingresos Totales',
      value: `Gs ${totalRevenue.toLocaleString('es-PY')}`,
    })
  }

  if (type === 'inventory') {
    const totalStock = data.reduce((sum, row) => {
      const val = getNestedValue(row, 'inventory.stock_quantity')
      return sum + (typeof val === 'number' ? val : parseInt(String(val)) || 0)
    }, 0)
    numericSummary.push({
      label: 'Stock Total',
      value: totalStock.toLocaleString('es-PY'),
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{clinicName}</Text>
            <Text style={styles.subtitle}>Sistema de Gestion Veterinaria</Text>
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportType}>{title || REPORT_TITLES[type]}</Text>
            <Text style={styles.dateRange}>
              {period.startDate} - {period.endDate}
            </Text>
            <Text style={styles.generatedAt}>Generado: {generatedAt}</Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumen</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de Registros:</Text>
            <Text style={styles.summaryValue}>{totalRecords}</Text>
          </View>
          {numericSummary.map((item, index) => (
            <View key={index} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{item.label}:</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Data Table */}
        {data.length > 0 ? (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              {columns.map((col, index) => (
                <Text key={index} style={styles.tableCellHeader}>
                  {col.header}
                </Text>
              ))}
            </View>

            {/* Table Rows - limit to 50 for performance */}
            {data.slice(0, 50).map((row, rowIndex) => (
              <View
                key={rowIndex}
                style={rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                {columns.map((col, colIndex) => (
                  <Text key={colIndex} style={styles.tableCell}>
                    {formatValue(getNestedValue(row, col.key), col.key)}
                  </Text>
                ))}
              </View>
            ))}

            {data.length > 50 && (
              <View style={styles.tableRow}>
                <Text style={{ ...styles.tableCell, fontStyle: 'italic', color: '#666' }}>
                  ... y {data.length - 50} registros mas
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noData}>No hay datos para el periodo seleccionado</Text>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {clinicName} - Reporte generado automaticamente
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
