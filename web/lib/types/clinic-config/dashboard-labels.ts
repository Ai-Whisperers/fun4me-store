/**
 * Dashboard Labels Types (Vet/Admin)
 * These types define the localization structure for staff dashboard UI
 */

// ============================================================================
// Sidebar & Navigation
// ============================================================================

export interface DashboardSidebarLabels {
  agenda: string
  dashboard: string
  calendar: string
  appointments_today: string
  vaccines: string
  hospital: string
  laboratory: string
  clients: string
  directory: string
  messages: string
  consents: string
  finances: string
  analytics: string
  invoices: string
  inventory: string
  insurance: string
  settings: string
  team: string
  schedules: string
  time_off: string
  audit: string
  tools: string
  back_to_portal: string
}

// ============================================================================
// Analytics
// ============================================================================

export interface DashboardAnalyticsLabels {
  title: string
  subtitle: string
  period: {
    week: string
    month: string
    quarter: string
  }
  stats: {
    revenue: string
    appointments: string
    new_clients: string
    new_pets: string
    vs_previous: string
  }
  charts: {
    revenue_by_day: string
    appointments_by_type: string
    top_services: string
  }
  quick_stats: {
    satisfaction: string
    wait_time: string
    retention: string
    low_stock: string
  }
}

// ============================================================================
// Clients Management
// ============================================================================

export interface DashboardClientLabels {
  title: string
  search_placeholder: string
  export_csv: string
  new_client: string
  bulk_message: string
  filters: {
    all: string
    vip: string
    recent: string
    inactive: string
    criadero: string
    rescate: string
  }
  detail: {
    contact_info: string
    financial_summary: string
    outstanding_balance: string
    total_invoices: string
    registered_pets: string
    internal_notes: string
    add_note: string
    pets: string
    add_pet: string
    appointment_history: string
    invoice_history: string
    communication_history: string
    new_appointment: string
    view_invoices: string
    send_message: string
  }
}

export interface DashboardTagLabels {
  vip: string
  criadero: string
  rescate: string
  nuevo: string
  frecuente: string
  moroso: string
  empleado: string
  referido: string
  add: string
  select_tag: string
  all_assigned: string
}

export interface DashboardLoyaltyLabels {
  title: string
  current_balance: string
  lifetime_earned: string
  next_level: string
  add: string
  redeem: string
  points: string
  levels: {
    bronze: string
    silver: string
    gold: string
    platinum: string
  }
  transaction_history: string
  points_added: string
  points_redeemed: string
  confirm: string
}

export interface DashboardNotesLabels {
  title: string
  add: string
  placeholder: string
  private: string
  public: string
  no_notes: string
  add_first: string
}

// ============================================================================
// Search & Navigation
// ============================================================================

export interface DashboardSearchLabels {
  placeholder: string
  no_results: string
  try_other: string
  recent: string
  types: {
    client: string
    pet: string
    appointment: string
    invoice: string
    product: string
  }
}

export interface DashboardShortcutsLabels {
  title: string
  subtitle: string
  categories: {
    general: string
    search: string
    calendar: string
    clients: string
    quick_actions: string
    other: string
  }
  press_to_show: string
}

// ============================================================================
// Messaging
// ============================================================================

export interface DashboardBulkMessagingLabels {
  title: string
  steps: {
    select: string
    compose: string
    review: string
    sending: string
  }
  channel: string
  channels: {
    whatsapp: string
    email: string
    sms: string
  }
  template: string
  templates: {
    reminder: string
    promo: string
    checkup: string
    custom: string
  }
  message: string
  variables_hint: string
  selected_count: string
  select_all: string
  clear: string
  continue_with: string
  confirm_send: string
  send_warning: string
  send: string
  completed: string
  sent_count: string
  failed_count: string
}

// ============================================================================
// Inventory
// ============================================================================

export interface DashboardInventoryLabels {
  title: string
  search_placeholder: string
  scan_barcode: string
  export: string
  filters: {
    all: string
    in_stock: string
    low_stock: string
    out_of_stock: string
  }
  barcode_scanner: {
    title: string
    searching: string
    not_found: string
    use_code: string
    scan_another: string
    manual_entry: string
    stock_available: string
    price: string
  }
}

// ============================================================================
// Patient & Waiting Room
// ============================================================================

export interface DashboardPatientActionsLabels {
  title: string
  frequent: string
  more: string
  actions: {
    new_appointment: string
    medical_history: string
    vaccine: string
    prescription: string
    lab: string
    hospitalize: string
    quality_of_life: string
    quick_consult: string
    consent: string
    photo_doc: string
    message_owner: string
  }
}

export interface DashboardWaitingRoomLabels {
  title: string
  refresh: string
  check_in: string
  start_consult: string
  complete: string
  no_show: string
  waiting_time: string
  statuses: {
    pending: string
    confirmed: string
    checked_in: string
    in_progress: string
    completed: string
    cancelled: string
    no_show: string
  }
}

// ============================================================================
// Settings
// ============================================================================

export interface DashboardSettingsLabels {
  title: string
  sections: {
    general: string
    branding: string
    modules: string
    services: string
  }
  general: {
    clinic_name: string
    description: string
    contact: string
    phone: string
    email: string
    address: string
    hours: string
  }
  branding: {
    colors: string
    logo: string
    favicon: string
  }
  modules: {
    enable_disable: string
    clinical: string
    features: string
    commerce: string
  }
}

// ============================================================================
// Export & Common
// ============================================================================

export interface DashboardExportLabels {
  title: string
  fields_to_export: string
  select_all: string
  none: string
  download: string
  exporting: string
  exported: string
  fields_selected: string
}

export interface DashboardCommonLabels {
  loading: string
  error: string
  retry: string
  save: string
  cancel: string
  edit: string
  delete: string
  confirm: string
  close: string
  back: string
  next: string
  search: string
  filter: string
  export: string
  import: string
  view_details: string
  not_registered: string
  units: string
}

// ============================================================================
// Combined Dashboard Labels
// ============================================================================

export interface DashboardLabels {
  sidebar: DashboardSidebarLabels
  analytics: DashboardAnalyticsLabels
  clients: DashboardClientLabels
  tags: DashboardTagLabels
  loyalty: DashboardLoyaltyLabels
  notes: DashboardNotesLabels
  search: DashboardSearchLabels
  shortcuts: DashboardShortcutsLabels
  bulk_messaging: DashboardBulkMessagingLabels
  inventory: DashboardInventoryLabels
  patient_actions: DashboardPatientActionsLabels
  waiting_room: DashboardWaitingRoomLabels
  settings: DashboardSettingsLabels
  export: DashboardExportLabels
  common: DashboardCommonLabels
}
