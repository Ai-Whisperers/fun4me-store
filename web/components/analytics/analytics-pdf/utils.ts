/**
 * Analytics PDF Utilities
 *
 * Helper functions for PDF generation and data formatting.
 */

import type { ExportType, ExportColumn } from './types'

// =============================================================================
// Report Titles
// =============================================================================

export const REPORT_TITLES: Record<ExportType, string> = {
  revenue: 'Reporte de Ingresos',
  appointments: 'Reporte de Citas',
  clients: 'Reporte de Clientes',
  services: 'Reporte de Servicios',
  inventory: 'Reporte de Inventario',
  customers: 'Reporte de Segmentacion de Clientes',
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get nested value from object using dot notation path
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Format value for display in PDF based on key name
 */
export function formatValue(value: unknown, key: string): string {
  if (value === null || value === undefined) return '-'

  // Currency formatting
  if (
    key.includes('price') ||
    key.includes('total') ||
    key.includes('amount') ||
    key.includes('revenue') ||
    key.includes('cost')
  ) {
    const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0
    return `Gs ${num.toLocaleString('es-PY')}`
  }

  // Date formatting
  if (key.includes('date') || key.includes('_at') || key.includes('time')) {
    const date = new Date(String(value))
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-PY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(key.includes('time') && { hour: '2-digit', minute: '2-digit' }),
      })
    }
  }

  // Boolean formatting
  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No'
  }

  return String(value)
}

/**
 * Get default columns for each export type
 */
export function getDefaultColumns(type: ExportType): ExportColumn[] {
  const columnMap: Record<ExportType, ExportColumn[]> = {
    revenue: [
      { key: 'invoice_number', header: 'Nro. Factura' },
      { key: 'client.full_name', header: 'Cliente' },
      { key: 'total', header: 'Total' },
      { key: 'status', header: 'Estado' },
      { key: 'created_at', header: 'Fecha' },
    ],
    appointments: [
      { key: 'start_time', header: 'Fecha/Hora' },
      { key: 'pet.name', header: 'Mascota' },
      { key: 'service.name', header: 'Servicio' },
      { key: 'vet.full_name', header: 'Veterinario' },
      { key: 'status', header: 'Estado' },
    ],
    clients: [
      { key: 'full_name', header: 'Nombre' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Telefono' },
      { key: 'created_at', header: 'Fecha Registro' },
    ],
    services: [
      { key: 'name', header: 'Servicio' },
      { key: 'category', header: 'Categoria' },
      { key: 'base_price', header: 'Precio Base' },
      { key: 'duration_minutes', header: 'Duracion (min)' },
      { key: 'is_active', header: 'Activo' },
    ],
    inventory: [
      { key: 'sku', header: 'SKU' },
      { key: 'name', header: 'Producto' },
      { key: 'base_price', header: 'Precio' },
      { key: 'inventory.stock_quantity', header: 'Stock' },
      { key: 'inventory.reorder_point', header: 'Punto Reorden' },
    ],
    customers: [
      { key: 'full_name', header: 'Cliente' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Telefono' },
      { key: 'created_at', header: 'Cliente desde' },
    ],
  }

  return columnMap[type] || []
}
