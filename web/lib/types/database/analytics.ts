/**
 * Dashboard / Materialized Views & Analytics Types
 */

// =============================================================================
// DASHBOARD / MATERIALIZED VIEWS
// =============================================================================

export interface ClinicDashboardStats {
  tenant_id: string
  clinic_name: string
  total_pets: number
  total_dogs: number
  total_cats: number
  total_other: number
  total_clients: number
  today_appointments: number
  today_confirmed: number
  today_completed: number
  week_appointments: number
  month_records: number
  vaccines_pending: number
  vaccines_due_soon: number
  active_hospitalizations: number
  pending_lab_orders: number
  month_revenue: number
  outstanding_balance: number
  refreshed_at: string
}

export interface AppointmentAnalytics {
  tenant_id: string
  month: string
  total_appointments: number
  completed: number
  cancelled: number
  no_shows: number
  completion_rate: number
  no_show_rate: number
  avg_duration_minutes: number
  refreshed_at: string
}

export interface RevenueAnalytics {
  tenant_id: string
  month: string
  invoice_count: number
  gross_revenue: number
  total_discounts: number
  total_taxes: number
  net_revenue: number
  collected_revenue: number
  outstanding_revenue: number
  avg_invoice_amount: number
  overdue_count: number
  refreshed_at: string
}

export interface InventoryAlert {
  tenant_id: string
  product_id: string
  product_name: string
  sku: string | null
  stock_quantity: number
  min_stock_level: number
  expiry_date: string | null
  batch_number: string | null
  alert_type: 'out_of_stock' | 'low_stock' | 'expired' | 'expiring_soon' | 'ok'
  refreshed_at: string
}
