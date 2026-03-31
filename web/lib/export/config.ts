/**
 * Export Table Configurations
 *
 * DATA-002: Defines column mappings and transformations for each exportable table.
 */

import { format } from 'date-fns'
import type { TableExportConfig, ExportableTable } from './types'

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(value: unknown): string {
  if (!value) return ''
  const date = new Date(value as string)
  return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd')
}

function formatDateTime(value: unknown): string {
  if (!value) return ''
  const date = new Date(value as string)
  return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd HH:mm:ss')
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return ''
  return Number(value).toLocaleString('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatBoolean(value: unknown): string {
  return value ? 'Sí' : 'No'
}

// =============================================================================
// Table Export Configurations
// =============================================================================

export const TABLE_CONFIGS: Record<ExportableTable, TableExportConfig> = {
  pets: {
    dbTable: 'pets',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'name', header: 'Nombre' },
      { column: 'species', header: 'Especie' },
      { column: 'breed', header: 'Raza' },
      { column: 'date_of_birth', header: 'Fecha de Nacimiento', transform: formatDate },
      { column: 'gender', header: 'Género' },
      { column: 'weight', header: 'Peso (kg)' },
      { column: 'microchip_id', header: 'Microchip', anonymize: true, anonymizedValue: '***' },
      { column: 'is_neutered', header: 'Esterilizado', transform: formatBoolean },
      { column: 'medical_notes', header: 'Notas Médicas' },
      { column: 'created_at', header: 'Fecha de Registro', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'profiles',
        on: 'pets.owner_id = profiles.id',
        columns: [
          { column: 'full_name', header: 'Propietario', anonymize: true, anonymizedValue: 'Cliente ***' },
          { column: 'email', header: 'Email Propietario', anonymize: true, anonymizedValue: '***@***.com' },
          { column: 'phone', header: 'Teléfono Propietario', anonymize: true, anonymizedValue: '***' },
        ],
      },
    ],
  },

  appointments: {
    dbTable: 'appointments',
    dateColumn: 'start_time',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'start_time', header: 'Fecha/Hora', transform: formatDateTime },
      { column: 'end_time', header: 'Fin', transform: formatDateTime },
      { column: 'status', header: 'Estado' },
      { column: 'scheduling_status', header: 'Estado Programación' },
      { column: 'notes', header: 'Notas' },
      { column: 'created_at', header: 'Creado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'pets',
        on: 'appointments.pet_id = pets.id',
        columns: [
          { column: 'name', header: 'Mascota' },
          { column: 'species', header: 'Especie' },
        ],
      },
      {
        table: 'services',
        on: 'appointments.service_id = services.id',
        columns: [{ column: 'name', header: 'Servicio' }],
      },
      {
        table: 'profiles AS vet',
        on: 'appointments.vet_id = vet.id',
        columns: [{ column: 'full_name', header: 'Veterinario' }],
      },
    ],
  },

  invoices: {
    dbTable: 'invoices',
    dateColumn: 'created_at',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'invoice_number', header: 'Número Factura' },
      { column: 'status', header: 'Estado' },
      { column: 'subtotal', header: 'Subtotal', transform: formatCurrency },
      { column: 'tax_amount', header: 'Impuesto', transform: formatCurrency },
      { column: 'total', header: 'Total', transform: formatCurrency },
      { column: 'due_date', header: 'Vencimiento', transform: formatDate },
      { column: 'paid_at', header: 'Fecha de Pago', transform: formatDateTime },
      { column: 'notes', header: 'Notas' },
      { column: 'created_at', header: 'Creado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'profiles AS client',
        on: 'invoices.client_id = client.id',
        columns: [
          { column: 'full_name', header: 'Cliente', anonymize: true, anonymizedValue: 'Cliente ***' },
          { column: 'email', header: 'Email Cliente', anonymize: true, anonymizedValue: '***@***.com' },
        ],
      },
    ],
  },

  payments: {
    dbTable: 'payments',
    dateColumn: 'payment_date',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'amount', header: 'Monto', transform: formatCurrency },
      { column: 'payment_date', header: 'Fecha', transform: formatDate },
      { column: 'status', header: 'Estado' },
      { column: 'notes', header: 'Notas' },
      { column: 'created_at', header: 'Creado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'invoices',
        on: 'payments.invoice_id = invoices.id',
        columns: [{ column: 'invoice_number', header: 'Número Factura' }],
      },
      {
        table: 'payment_methods',
        on: 'payments.payment_method_id = payment_methods.id',
        columns: [{ column: 'name', header: 'Método de Pago' }],
      },
    ],
  },

  vaccines: {
    dbTable: 'vaccines',
    dateColumn: 'administered_date',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'vaccine_name', header: 'Vacuna' },
      { column: 'administered_date', header: 'Fecha Aplicación', transform: formatDate },
      { column: 'next_due_date', header: 'Próxima Dosis', transform: formatDate },
      { column: 'status', header: 'Estado' },
      { column: 'lot_number', header: 'Lote' },
      { column: 'notes', header: 'Notas' },
      { column: 'created_at', header: 'Registrado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'pets',
        on: 'vaccines.pet_id = pets.id',
        columns: [
          { column: 'name', header: 'Mascota' },
          { column: 'species', header: 'Especie' },
        ],
      },
      {
        table: 'profiles AS vet',
        on: 'vaccines.administered_by = vet.id',
        columns: [{ column: 'full_name', header: 'Administrado Por' }],
      },
    ],
  },

  medical_records: {
    dbTable: 'medical_records',
    dateColumn: 'visit_date',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'visit_date', header: 'Fecha Visita', transform: formatDate },
      { column: 'record_type', header: 'Tipo' },
      { column: 'chief_complaint', header: 'Motivo Consulta' },
      { column: 'diagnosis', header: 'Diagnóstico' },
      { column: 'treatment', header: 'Tratamiento' },
      { column: 'notes', header: 'Notas' },
      { column: 'created_at', header: 'Registrado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'pets',
        on: 'medical_records.pet_id = pets.id',
        columns: [
          { column: 'name', header: 'Mascota' },
          { column: 'species', header: 'Especie' },
        ],
      },
      {
        table: 'profiles AS vet',
        on: 'medical_records.vet_id = vet.id',
        columns: [{ column: 'full_name', header: 'Veterinario' }],
      },
    ],
  },

  prescriptions: {
    dbTable: 'prescriptions',
    dateColumn: 'created_at',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'medications', header: 'Medicamentos' }, // JSONB - will need special handling
      { column: 'instructions', header: 'Instrucciones' },
      { column: 'valid_until', header: 'Válido Hasta', transform: formatDate },
      { column: 'created_at', header: 'Creado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'pets',
        on: 'prescriptions.pet_id = pets.id',
        columns: [{ column: 'name', header: 'Mascota' }],
      },
      {
        table: 'profiles AS vet',
        on: 'prescriptions.vet_id = vet.id',
        columns: [{ column: 'full_name', header: 'Veterinario' }],
      },
    ],
  },

  lab_orders: {
    dbTable: 'lab_orders',
    dateColumn: 'ordered_at',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'order_number', header: 'Número Orden' },
      { column: 'status', header: 'Estado' },
      { column: 'priority', header: 'Prioridad' },
      { column: 'notes', header: 'Notas' },
      { column: 'ordered_at', header: 'Fecha Orden', transform: formatDateTime },
      { column: 'completed_at', header: 'Completado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'pets',
        on: 'lab_orders.pet_id = pets.id',
        columns: [{ column: 'name', header: 'Mascota' }],
      },
      {
        table: 'profiles AS orderer',
        on: 'lab_orders.ordered_by = orderer.id',
        columns: [{ column: 'full_name', header: 'Ordenado Por' }],
      },
    ],
  },

  lab_results: {
    dbTable: 'lab_results',
    dateColumn: 'created_at',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'value', header: 'Valor' },
      { column: 'unit', header: 'Unidad' },
      { column: 'reference_range', header: 'Rango Referencia' },
      { column: 'is_abnormal', header: 'Anormal', transform: formatBoolean },
      { column: 'notes', header: 'Notas' },
      { column: 'created_at', header: 'Registrado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'lab_orders',
        on: 'lab_results.lab_order_id = lab_orders.id',
        columns: [{ column: 'order_number', header: 'Número Orden' }],
      },
      {
        table: 'lab_test_catalog',
        on: 'lab_results.test_id = lab_test_catalog.id',
        columns: [
          { column: 'name', header: 'Prueba' },
          { column: 'code', header: 'Código' },
        ],
      },
    ],
  },

  clients: {
    dbTable: 'profiles',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'full_name', header: 'Nombre', anonymize: true, anonymizedValue: 'Cliente ***' },
      { column: 'email', header: 'Email', anonymize: true, anonymizedValue: '***@***.com' },
      { column: 'phone', header: 'Teléfono', anonymize: true, anonymizedValue: '***' },
      { column: 'address', header: 'Dirección', anonymize: true, anonymizedValue: '***' },
      { column: 'created_at', header: 'Registrado', transform: formatDateTime },
    ],
    // Filter: WHERE role = 'owner'
  },

  products: {
    dbTable: 'store_products',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'sku', header: 'SKU' },
      { column: 'name', header: 'Nombre' },
      { column: 'description', header: 'Descripción' },
      { column: 'base_price', header: 'Precio Base', transform: formatCurrency },
      { column: 'is_active', header: 'Activo', transform: formatBoolean },
      { column: 'is_prescription_required', header: 'Requiere Receta', transform: formatBoolean },
      { column: 'created_at', header: 'Creado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'store_categories',
        on: 'store_products.category_id = store_categories.id',
        columns: [{ column: 'name', header: 'Categoría' }],
      },
    ],
  },

  inventory: {
    dbTable: 'store_inventory',
    columns: [
      { column: 'id', header: 'ID' },
      { column: 'stock_quantity', header: 'Stock' },
      { column: 'reorder_point', header: 'Punto de Reorden' },
      { column: 'weighted_average_cost', header: 'Costo Promedio', transform: formatCurrency },
      { column: 'updated_at', header: 'Actualizado', transform: formatDateTime },
    ],
    joins: [
      {
        table: 'store_products',
        on: 'store_inventory.product_id = store_products.id',
        columns: [
          { column: 'sku', header: 'SKU' },
          { column: 'name', header: 'Producto' },
        ],
      },
    ],
  },
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all columns for a table including joined columns
 */
export function getAllColumnsForTable(table: ExportableTable): string[] {
  const config = TABLE_CONFIGS[table]
  const columns = config.columns.map((c) => c.header)

  if (config.joins) {
    for (const join of config.joins) {
      columns.push(...join.columns.map((c) => c.header))
    }
  }

  return columns
}

/**
 * Validate table names
 */
export function isValidExportTable(table: string): table is ExportableTable {
  return (TABLE_CONFIGS as Record<string, unknown>)[table] !== undefined
}
