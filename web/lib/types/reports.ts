/**
 * Report and analytics types for dashboard and business intelligence
 */

export interface DashboardStats {
  appointments_today: number
  appointments_week: number
  revenue_today: number
  revenue_month: number
  new_clients_month: number
  active_hospitalizations: number
  pending_lab_orders: number
  overdue_invoices: number
}

export interface RevenueReport {
  period: 'day' | 'week' | 'month' | 'year'
  data: Array<{
    date: string
    revenue: number
    appointments: number
    products: number
  }>
  totals: {
    total_revenue: number
    total_appointments: number
    total_products: number
    average_per_day: number
  }
}

export interface AppointmentReport {
  period: string
  by_service: Array<{
    service_name: string
    count: number
    revenue: number
  }>
  by_status: Record<string, number>
  by_vet: Array<{
    vet_name: string
    count: number
    revenue: number
  }>
  completion_rate: number
  no_show_rate: number
}

export interface InventoryReport {
  low_stock_items: Array<{
    product_id: string
    product_name: string
    current_stock: number
    reorder_point: number
  }>
  out_of_stock_count: number
  total_inventory_value: number
  turnover_rate: number
}

/**
 * Client analytics for retention and engagement
 */
export interface ClientAnalytics {
  total_clients: number
  active_clients: number
  new_clients_this_month: number
  retention_rate: number
  average_visits_per_client: number
  top_clients: Array<{
    client_id: string
    client_name: string
    total_spent: number
    visit_count: number
  }>
}

/**
 * Service performance metrics
 */
export interface ServicePerformance {
  service_id: string
  service_name: string
  total_bookings: number
  total_revenue: number
  average_rating: number
  utilization_rate: number
  growth_rate: number
}

/**
 * Financial summary for accounting
 */
export interface FinancialSummary {
  period: string
  gross_revenue: number
  expenses: number
  net_profit: number
  profit_margin: number
  outstanding_receivables: number
  payment_breakdown: Record<string, number>
}
