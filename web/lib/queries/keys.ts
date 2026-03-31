/**
 * Query Keys Convention for TanStack Query
 *
 * RES-001: React Query Migration
 *
 * Naming convention:
 * - Use arrays for hierarchical keys
 * - Include tenant/clinic context where needed
 * - Use descriptive, consistent naming
 *
 * Usage:
 * ```typescript
 * useQuery({
 *   queryKey: queryKeys.inventory.list(clinic, filters),
 *   queryFn: () => fetchInventory(clinic, filters),
 * })
 * ```
 */

// Type for query key factory functions
type QueryKeyFactory<T extends readonly unknown[]> = (...args: Parameters<(...args: T) => void>) => readonly unknown[]

export const queryKeys = {
  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: (clinic: string) => ['dashboard', 'stats', clinic] as const,
    activity: (clinic: string, limit?: number) => ['dashboard', 'activity', clinic, { limit }] as const,
    revenue: (clinic: string, period: string) => ['dashboard', 'revenue', clinic, period] as const,
    revenueChart: (clinic: string, months?: number) =>
      ['dashboard', 'revenue-chart', clinic, { months }] as const,
    todayAppointments: (clinic: string) => ['dashboard', 'today-appointments', clinic] as const,
    pendingOrders: (clinic: string) => ['dashboard', 'pending-orders', clinic] as const,
    todayFocus: (clinic: string) => ['dashboard', 'today-focus', clinic] as const,
    alerts: (clinic: string) => ['dashboard', 'alerts', clinic] as const,
    myPatients: (vetId: string) => ['dashboard', 'my-patients', vetId] as const,
    appointmentsChart: (clinic: string, period: string) =>
      ['dashboard', 'appointments-chart', clinic, period] as const,
  },

  // Inventory queries
  inventory: {
    all: ['inventory'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['inventory', 'list', clinic, filters] as const,
    detail: (productId: string) => ['inventory', 'detail', productId] as const,
    stats: (clinic: string) => ['inventory', 'stats', clinic] as const,
    alerts: (clinic: string) => ['inventory', 'alerts', clinic] as const,
    categories: (clinic: string) => ['inventory', 'categories', clinic] as const,
    lowStock: (clinic: string) => ['inventory', 'low-stock', clinic] as const,
    expiring: (clinic: string, days?: number) => ['inventory', 'expiring', clinic, { days }] as const,
  },

  // Appointments queries
  appointments: {
    all: ['appointments'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['appointments', 'list', clinic, filters] as const,
    detail: (appointmentId: string) => ['appointments', 'detail', appointmentId] as const,
    calendar: (clinic: string, start: string, end: string) =>
      ['appointments', 'calendar', clinic, { start, end }] as const,
    pending: (clinic: string) => ['appointments', 'pending', clinic] as const,
    waitlist: (clinic: string) => ['appointments', 'waitlist', clinic] as const,
    slots: (clinic: string, date: string, serviceId?: string) =>
      ['appointments', 'slots', clinic, { date, serviceId }] as const,
    recurrences: (showInactive?: boolean) =>
      ['appointments', 'recurrences', { showInactive }] as const,
  },

  // Pets queries
  pets: {
    all: ['pets'] as const,
    list: (clinic: string, ownerId?: string) => ['pets', 'list', clinic, { ownerId }] as const,
    detail: (petId: string) => ['pets', 'detail', petId] as const,
    medical: (petId: string) => ['pets', 'medical', petId] as const,
    vaccines: (petId: string) => ['pets', 'vaccines', petId] as const,
    growthChart: (petId: string) => ['pets', 'growth-chart', petId] as const,
    weightHistory: (petId: string) => ['pets', 'weight-history', petId] as const,
  },

  // Clinical queries
  clinical: {
    all: ['clinical'] as const,
    drugSearch: (query: string) => ['clinical', 'drug-search', query] as const,
    diagnosisSearch: (query: string) => ['clinical', 'diagnosis-search', query] as const,
    diagnosisCodes: () => ['clinical', 'diagnosis-codes'] as const,
    drugDosages: () => ['clinical', 'drug-dosages'] as const,
    growthCharts: () => ['clinical', 'growth-charts'] as const,
    growthStandards: (breedCategory: string, gender: string) =>
      ['clinical', 'growth-standards', breedCategory, gender] as const,
    vaccineReactions: () => ['clinical', 'vaccine-reactions'] as const,
    prescriptions: () => ['clinical', 'prescriptions'] as const,
    dosageCalculator: (drugId: string, species: string, weight: number) =>
      ['clinical', 'dosage', { drugId, species, weight }] as const,
    labTests: (clinic: string) => ['clinical', 'lab-tests', clinic] as const,
    labPanels: (clinic: string) => ['clinical', 'lab-panels', clinic] as const,
  },

  // Store queries
  store: {
    all: ['store'] as const,
    products: (clinic: string, filters?: Record<string, unknown>) =>
      ['store', 'products', clinic, filters] as const,
    product: (productId: string) => ['store', 'product', productId] as const,
    categories: (clinic: string) => ['store', 'categories', clinic] as const,
    cart: (clinic: string, userId?: string) => ['store', 'cart', clinic, userId] as const,
    orders: (clinic: string, filters?: Record<string, unknown>) =>
      ['store', 'orders', clinic, filters] as const,
    order: (orderId: string) => ['store', 'order', orderId] as const,
    wishlist: (clinic: string, userId: string) => ['store', 'wishlist', clinic, userId] as const,
  },

  // Clients/Owners queries
  clients: {
    all: ['clients'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['clients', 'list', clinic, filters] as const,
    detail: (clientId: string) => ['clients', 'detail', clientId] as const,
    segments: (clinic: string) => ['clients', 'segments', clinic] as const,
    notes: (clientId: string, clinic: string) => ['clients', 'notes', clientId, clinic] as const,
  },

  // Staff queries
  staff: {
    all: ['staff'] as const,
    list: (clinic: string) => ['staff', 'list', clinic] as const,
    detail: (staffId: string) => ['staff', 'detail', staffId] as const,
    schedules: (clinic: string) => ['staff', 'schedules', clinic] as const,
    timeOff: (clinic: string) => ['staff', 'time-off', clinic] as const,
  },

  // Services queries
  services: {
    all: ['services'] as const,
    list: (clinic: string) => ['services', 'list', clinic] as const,
    detail: (serviceId: string) => ['services', 'detail', serviceId] as const,
    categories: (clinic: string) => ['services', 'categories', clinic] as const,
  },

  // Invoicing queries
  invoices: {
    all: ['invoices'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['invoices', 'list', clinic, filters] as const,
    detail: (invoiceId: string) => ['invoices', 'detail', invoiceId] as const,
    stats: (clinic: string, period?: string) => ['invoices', 'stats', clinic, { period }] as const,
  },

  // Messages/Conversations queries
  messages: {
    all: ['messages'] as const,
    conversations: (clinic: string) => ['messages', 'conversations', clinic] as const,
    conversation: (conversationId: string) => ['messages', 'conversation', conversationId] as const,
    unread: (clinic: string) => ['messages', 'unread', clinic] as const,
    templates: (clinic: string) => ['messages', 'templates', clinic] as const,
  },

  // Hospitalizations queries
  hospitalizations: {
    all: ['hospitalizations'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['hospitalizations', 'list', clinic, filters] as const,
    detail: (hospitalizationId: string) => ['hospitalizations', 'detail', hospitalizationId] as const,
    vitals: (hospitalizationId: string) => ['hospitalizations', 'vitals', hospitalizationId] as const,
    medications: (hospitalizationId: string) => ['hospitalizations', 'medications', hospitalizationId] as const,
    kennels: (clinic: string) => ['hospitalizations', 'kennels', clinic] as const,
  },

  // Lab queries
  lab: {
    all: ['lab'] as const,
    orders: (clinic: string, filters?: Record<string, unknown>) =>
      ['lab', 'orders', clinic, filters] as const,
    order: (orderId: string) => ['lab', 'order', orderId] as const,
    results: (orderId: string) => ['lab', 'results', orderId] as const,
    catalog: (clinic: string) => ['lab', 'catalog', clinic] as const,
  },

  // Campaigns queries
  campaigns: {
    all: ['campaigns'] as const,
    list: (clinic: string) => ['campaigns', 'list', clinic] as const,
    detail: (campaignId: string) => ['campaigns', 'detail', campaignId] as const,
    stats: (campaignId: string) => ['campaigns', 'stats', campaignId] as const,
  },

  // Subscriptions queries
  subscriptions: {
    all: ['subscriptions'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['subscriptions', 'list', clinic, filters] as const,
    detail: (subscriptionId: string) => ['subscriptions', 'detail', subscriptionId] as const,
    plans: (clinic: string) => ['subscriptions', 'plans', clinic] as const,
  },

  // Reminders queries
  reminders: {
    all: ['reminders'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['reminders', 'list', clinic, filters] as const,
    templates: (clinic: string) => ['reminders', 'templates', clinic] as const,
  },

  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    overview: (clinic: string, period: string) => ['analytics', 'overview', clinic, period] as const,
    sales: (clinic: string, period: string) => ['analytics', 'sales', clinic, period] as const,
    appointments: (clinic: string, period: string) => ['analytics', 'appointments', clinic, period] as const,
    clients: (clinic: string, period: string) => ['analytics', 'clients', clinic, period] as const,
    products: (clinic: string, period: string) => ['analytics', 'products', clinic, period] as const,
  },

  // Consents queries
  consents: {
    all: ['consents'] as const,
    templates: (clinic: string) => ['consents', 'templates', clinic] as const,
    template: (templateId: string) => ['consents', 'template', templateId] as const,
    documents: (clinic: string, petId?: string) =>
      ['consents', 'documents', clinic, { petId }] as const,
  },

  // Notifications queries
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string) => ['notifications', 'list', userId] as const,
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
    preferences: (userId: string) => ['notifications', 'preferences', userId] as const,
    bell: () => ['notifications', 'bell'] as const,
  },

  // WhatsApp queries
  whatsapp: {
    all: ['whatsapp'] as const,
    messages: (clinic: string, phone: string) => ['whatsapp', 'messages', clinic, phone] as const,
    templates: (clinic: string) => ['whatsapp', 'templates', clinic] as const,
  },

  // Loyalty queries
  loyalty: {
    all: ['loyalty'] as const,
    balance: (userId: string) => ['loyalty', 'balance', userId] as const,
    history: (userId: string) => ['loyalty', 'history', userId] as const,
    redemptionOptions: (clinic: string) => ['loyalty', 'redemption-options', clinic] as const,
  },

  // Coupons queries
  coupons: {
    all: ['coupons'] as const,
    list: (clinic: string, filters?: Record<string, unknown>) =>
      ['coupons', 'list', clinic, filters] as const,
    detail: (couponId: string) => ['coupons', 'detail', couponId] as const,
    validate: (clinic: string, code: string) => ['coupons', 'validate', clinic, code] as const,
  },

  // Referrals queries
  referrals: {
    all: ['referrals'] as const,
    list: (clinic: string) => ['referrals', 'list', clinic] as const,
    stats: (clinic: string) => ['referrals', 'stats', clinic] as const,
    code: (userId: string) => ['referrals', 'code', userId] as const,
  },

  // Suppliers queries
  suppliers: {
    all: ['suppliers'] as const,
    list: (filters?: { search?: string; type?: string; status?: string }) =>
      ['suppliers', 'list', filters] as const,
    detail: (supplierId: string) => ['suppliers', 'detail', supplierId] as const,
    products: (supplierId: string) => ['suppliers', 'products', supplierId] as const,
  },

  // Procurement queries
  procurement: {
    all: ['procurement'] as const,
    orders: (filters?: Record<string, unknown>) => ['procurement', 'orders', filters] as const,
    order: (orderId: string) => ['procurement', 'order', orderId] as const,
    priceComparison: (productName: string) => ['procurement', 'price-comparison', productName] as const,
  },

  // Epidemiology queries
  epidemiology: {
    all: ['epidemiology'] as const,
    heatmap: (tenantId: string, species?: string) =>
      ['epidemiology', 'heatmap', tenantId, { species }] as const,
    reports: (species?: string) => ['epidemiology', 'reports', { species }] as const,
  },

  // Vaccines (clinic-wide) queries
  vaccines: {
    all: ['vaccines'] as const,
    upcoming: (clinic: string, days?: number) =>
      ['vaccines', 'upcoming', clinic, { days }] as const,
    mandatory: (days?: number) => ['vaccines', 'mandatory', { days }] as const,
    overdue: (clinic: string) => ['vaccines', 'overdue', clinic] as const,
  },

  // Search queries
  search: {
    all: ['search'] as const,
    global: (clinic: string, query: string) => ['search', 'global', clinic, query] as const,
    products: (clinic: string, query: string) => ['search', 'products', clinic, query] as const,
    clients: (clinic: string, query: string) => ['search', 'clients', clinic, query] as const,
    pets: (clinic: string, query: string) => ['search', 'pets', clinic, query] as const,
  },
} as const

// Helper type for domains that have 'all' property
type DomainsWithAll = {
  [K in keyof typeof queryKeys]: 'all' extends keyof (typeof queryKeys)[K] ? K : never
}[keyof typeof queryKeys]

// Helper to get all keys for a domain (useful for invalidation)
export function getAllKeysForDomain(domain: DomainsWithAll): readonly unknown[] {
  return queryKeys[domain].all
}

// Type exports for type-safe query key usage
export type QueryKeys = typeof queryKeys
export type DashboardQueryKeys = typeof queryKeys.dashboard
export type InventoryQueryKeys = typeof queryKeys.inventory
export type AppointmentsQueryKeys = typeof queryKeys.appointments
export type PetsQueryKeys = typeof queryKeys.pets
export type ClinicalQueryKeys = typeof queryKeys.clinical
export type StoreQueryKeys = typeof queryKeys.store
