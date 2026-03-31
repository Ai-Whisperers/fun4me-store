/**
 * Screenshot Configuration
 *
 * Defines all pages, user roles, and data variations for screenshot capture.
 */

export type UserRole = 'owner' | 'vet' | 'admin' | 'public'

export interface PageConfig {
  /** Route path (relative to clinic) */
  path: string
  /** Human-readable name for the screenshot */
  name: string
  /** Which roles can access this page */
  roles: UserRole[]
  /** Whether this page requires authentication */
  requiresAuth: boolean
  /** Data variations to capture */
  variations?: DataVariation[]
  /** Wait for specific selector before screenshot */
  waitFor?: string
  /** Additional actions before screenshot */
  beforeScreenshot?: BeforeScreenshotAction[]
  /** Dynamic path parameters */
  params?: Record<string, string>
}

export interface DataVariation {
  /** Name for this variation */
  name: string
  /** Description */
  description: string
  /** Data setup function name */
  setupFn?: string
  /** Query params to add */
  queryParams?: Record<string, string>
  /** Actions to perform */
  actions?: BeforeScreenshotAction[]
}

export interface BeforeScreenshotAction {
  type: 'click' | 'fill' | 'select' | 'scroll' | 'wait' | 'hover'
  selector?: string
  value?: string
  delay?: number
}

// ============================================================================
// PUBLIC PAGES - No authentication required
// ============================================================================

export const PUBLIC_PAGES: PageConfig[] = [
  {
    path: '/',
    name: 'homepage',
    roles: ['public', 'owner', 'vet', 'admin'],
    requiresAuth: false,
    waitFor: 'main',
  },
  {
    path: '/about',
    name: 'about',
    roles: ['public'],
    requiresAuth: false,
  },
  {
    path: '/services',
    name: 'services',
    roles: ['public'],
    requiresAuth: false,
  },
  {
    path: '/store',
    name: 'store',
    roles: ['public'],
    requiresAuth: false,
    variations: [
      { name: 'default', description: 'Default view' },
      { name: 'category-food', description: 'Food category', queryParams: { category: 'alimentos' } },
      { name: 'search', description: 'Search results', queryParams: { q: 'vitaminas' } },
    ],
  },
  {
    path: '/cart',
    name: 'cart',
    roles: ['public', 'owner'],
    requiresAuth: false,
    variations: [
      { name: 'empty', description: 'Empty cart' },
    ],
  },
  {
    path: '/book',
    name: 'booking',
    roles: ['public'],
    requiresAuth: false,
    variations: [
      { name: 'step-1', description: 'Service selection' },
    ],
  },
  {
    path: '/faq',
    name: 'faq',
    roles: ['public'],
    requiresAuth: false,
  },
  {
    path: '/diagnosis_codes',
    name: 'diagnosis-codes',
    roles: ['public', 'vet'],
    requiresAuth: false,
    variations: [
      { name: 'default', description: 'Search interface' },
      { name: 'search', description: 'Search results', queryParams: { q: 'dermatitis' } },
    ],
  },
  {
    path: '/drug_dosages',
    name: 'drug-dosages',
    roles: ['public', 'vet'],
    requiresAuth: false,
    variations: [
      { name: 'default', description: 'Calculator interface' },
    ],
  },
  {
    path: '/growth_charts',
    name: 'growth-charts',
    roles: ['public', 'vet'],
    requiresAuth: false,
  },
  {
    path: '/euthanasia_assessments',
    name: 'euthanasia-assessment',
    roles: ['vet'],
    requiresAuth: false,
  },
  {
    path: '/loyalty_points',
    name: 'loyalty-points',
    roles: ['public'],
    requiresAuth: false,
  },
]

// ============================================================================
// PORTAL PAGES - Owner access (pet owners)
// ============================================================================

export const PORTAL_PAGES: PageConfig[] = [
  // Auth pages (no auth required)
  {
    path: '/portal/login',
    name: 'portal-login',
    roles: ['public'],
    requiresAuth: false,
  },
  {
    path: '/portal/signup',
    name: 'portal-signup',
    roles: ['public'],
    requiresAuth: false,
  },

  // Main portal pages
  {
    path: '/portal',
    name: 'portal-home',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/dashboard',
    name: 'portal-dashboard',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-pets', description: 'Dashboard with pets' },
      { name: 'with-appointments', description: 'Dashboard with upcoming appointments' },
    ],
  },
  {
    path: '/portal/pets',
    name: 'portal-pets-list',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'multiple-pets', description: 'Multiple pets view' },
      { name: 'single-pet', description: 'Single pet view' },
    ],
  },
  {
    path: '/portal/pets/new',
    name: 'portal-pets-new',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/pets/:petId',
    name: 'portal-pet-detail',
    roles: ['owner'],
    requiresAuth: true,
    params: { petId: '00000000-0000-0000-0001-000000000001' },
    variations: [
      { name: 'with-records', description: 'Pet with medical records' },
      { name: 'with-vaccines', description: 'Pet with vaccine history' },
    ],
  },
  {
    path: '/portal/pets/:petId/edit',
    name: 'portal-pet-edit',
    roles: ['owner'],
    requiresAuth: true,
    params: { petId: '00000000-0000-0000-0001-000000000001' },
  },
  {
    path: '/portal/appointments',
    name: 'portal-appointments',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-history', description: 'With appointment history' },
      { name: 'empty', description: 'No appointments' },
    ],
  },
  {
    path: '/portal/appointments/new',
    name: 'portal-appointments-new',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/schedule',
    name: 'portal-schedule',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/messages',
    name: 'portal-messages',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-conversations', description: 'With message history' },
      { name: 'empty', description: 'No messages' },
    ],
  },
  {
    path: '/portal/messages/new',
    name: 'portal-messages-new',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/invoices/:invoiceId',
    name: 'portal-invoice-detail',
    roles: ['owner'],
    requiresAuth: true,
    params: { invoiceId: 'sample-invoice-id' },
  },
  {
    path: '/portal/loyalty',
    name: 'portal-loyalty',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-points', description: 'With loyalty points balance' },
      { name: 'with-history', description: 'With transaction history' },
    ],
  },
  {
    path: '/portal/rewards',
    name: 'portal-rewards',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/notifications',
    name: 'portal-notifications',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-notifications', description: 'With unread notifications' },
      { name: 'empty', description: 'No notifications' },
    ],
  },
  {
    path: '/portal/profile',
    name: 'portal-profile',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/settings',
    name: 'portal-settings',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/settings/notifications',
    name: 'portal-settings-notifications',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/settings/security',
    name: 'portal-settings-security',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/payments',
    name: 'portal-payments',
    roles: ['owner'],
    requiresAuth: true,
  },
  {
    path: '/portal/wishlist',
    name: 'portal-wishlist',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-items', description: 'With wishlist items' },
      { name: 'empty', description: 'Empty wishlist' },
    ],
  },
  {
    path: '/portal/orders',
    name: 'portal-orders',
    roles: ['owner'],
    requiresAuth: true,
    variations: [
      { name: 'with-orders', description: 'With order history' },
      { name: 'empty', description: 'No orders' },
    ],
  },
]

// ============================================================================
// DASHBOARD PAGES - Vet and Admin access
// ============================================================================

export const DASHBOARD_PAGES: PageConfig[] = [
  // Main dashboard
  {
    path: '/dashboard',
    name: 'dashboard-home',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    waitFor: '[data-testid="dashboard"]',
    variations: [
      { name: 'default', description: 'Default view with stats' },
      { name: 'with-appointments', description: 'With today appointments' },
      { name: 'with-alerts', description: 'With pending alerts' },
    ],
  },

  // Appointments
  {
    path: '/dashboard/appointments',
    name: 'dashboard-appointments',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'list-view', description: 'List view' },
      { name: 'with-pending', description: 'With pending appointments' },
    ],
  },
  {
    path: '/dashboard/appointments/new',
    name: 'dashboard-appointments-new',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/calendar',
    name: 'dashboard-calendar',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'day-view', description: 'Day view', queryParams: { view: 'day' } },
      { name: 'week-view', description: 'Week view', queryParams: { view: 'week' } },
      { name: 'month-view', description: 'Month view', queryParams: { view: 'month' } },
    ],
  },

  // Patients
  {
    path: '/dashboard/patients',
    name: 'dashboard-patients',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'list-view', description: 'Patient list' },
      { name: 'search', description: 'Search results', queryParams: { q: 'Max' } },
    ],
  },
  {
    path: '/dashboard/patients/:patientId',
    name: 'dashboard-patient-detail',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    params: { patientId: '00000000-0000-0000-0001-000000000001' },
    variations: [
      { name: 'overview', description: 'Patient overview' },
      { name: 'medical-history', description: 'Medical history tab' },
      { name: 'vaccines', description: 'Vaccines tab' },
    ],
  },

  // Clients
  {
    path: '/dashboard/clients',
    name: 'dashboard-clients',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/clients/:clientId',
    name: 'dashboard-client-detail',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    params: { clientId: '00000000-0000-0000-0000-000000000001' },
  },
  {
    path: '/dashboard/clients/invite',
    name: 'dashboard-clients-invite',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Hospital
  {
    path: '/dashboard/hospital',
    name: 'dashboard-hospital',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'with-patients', description: 'With hospitalized patients' },
      { name: 'empty', description: 'No patients' },
    ],
  },
  {
    path: '/dashboard/hospital/:hospitalizationId',
    name: 'dashboard-hospitalization-detail',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    params: { hospitalizationId: 'sample-hospitalization-id' },
  },

  // Lab
  {
    path: '/dashboard/lab',
    name: 'dashboard-lab',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'pending-orders', description: 'Pending lab orders' },
      { name: 'completed', description: 'Completed results' },
    ],
  },
  {
    path: '/dashboard/lab/new',
    name: 'dashboard-lab-new',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/lab/:orderId',
    name: 'dashboard-lab-detail',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    params: { orderId: 'sample-lab-order-id' },
  },

  // Inventory
  {
    path: '/dashboard/inventory',
    name: 'dashboard-inventory',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'default', description: 'Inventory list' },
      { name: 'low-stock', description: 'Low stock filter', queryParams: { filter: 'low-stock' } },
    ],
  },
  {
    path: '/dashboard/inventory/expiring',
    name: 'dashboard-inventory-expiring',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // Invoices
  {
    path: '/dashboard/invoices',
    name: 'dashboard-invoices',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'all', description: 'All invoices' },
      { name: 'pending', description: 'Pending invoices', queryParams: { status: 'pending' } },
      { name: 'paid', description: 'Paid invoices', queryParams: { status: 'paid' } },
    ],
  },
  {
    path: '/dashboard/invoices/new',
    name: 'dashboard-invoices-new',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/invoices/:invoiceId',
    name: 'dashboard-invoice-detail',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    params: { invoiceId: 'sample-invoice-id' },
  },

  // Orders (Store)
  {
    path: '/dashboard/orders',
    name: 'dashboard-orders',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'all', description: 'All orders' },
      { name: 'pending', description: 'Pending orders' },
    ],
  },
  {
    path: '/dashboard/orders/prescriptions',
    name: 'dashboard-orders-prescriptions',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // Vaccines
  {
    path: '/dashboard/vaccines',
    name: 'dashboard-vaccines',
    roles: ['vet', 'admin'],
    requiresAuth: true,
    variations: [
      { name: 'due-today', description: 'Due today' },
      { name: 'overdue', description: 'Overdue vaccines' },
    ],
  },

  // Consents
  {
    path: '/dashboard/consents',
    name: 'dashboard-consents',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/consents/templates',
    name: 'dashboard-consents-templates',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Insurance
  {
    path: '/dashboard/insurance',
    name: 'dashboard-insurance',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/insurance/policies',
    name: 'dashboard-insurance-policies',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/insurance/claims/new',
    name: 'dashboard-insurance-claims-new',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // Reminders
  {
    path: '/dashboard/reminders',
    name: 'dashboard-reminders',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // WhatsApp
  {
    path: '/dashboard/whatsapp',
    name: 'dashboard-whatsapp',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/whatsapp/templates',
    name: 'dashboard-whatsapp-templates',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Campaigns
  {
    path: '/dashboard/campaigns',
    name: 'dashboard-campaigns',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Coupons
  {
    path: '/dashboard/coupons',
    name: 'dashboard-coupons',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Schedules
  {
    path: '/dashboard/schedules',
    name: 'dashboard-schedules',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/time-off',
    name: 'dashboard-time-off',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/time-off/new',
    name: 'dashboard-time-off-new',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // Team
  {
    path: '/dashboard/team',
    name: 'dashboard-team',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Analytics
  {
    path: '/dashboard/analytics',
    name: 'dashboard-analytics',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/analytics/customers',
    name: 'dashboard-analytics-customers',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/analytics/store',
    name: 'dashboard-analytics-store',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Epidemiology
  {
    path: '/dashboard/epidemiology',
    name: 'dashboard-epidemiology',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // Lost Pets
  {
    path: '/dashboard/lost-pets',
    name: 'dashboard-lost-pets',
    roles: ['vet', 'admin'],
    requiresAuth: true,
  },

  // Audit
  {
    path: '/dashboard/audit',
    name: 'dashboard-audit',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Admin Catalog Approvals
  {
    path: '/dashboard/admin/catalog-approvals',
    name: 'dashboard-admin-catalog-approvals',
    roles: ['admin'],
    requiresAuth: true,
  },

  // Settings
  {
    path: '/dashboard/settings',
    name: 'dashboard-settings',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/general',
    name: 'dashboard-settings-general',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/branding',
    name: 'dashboard-settings-branding',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/services',
    name: 'dashboard-settings-services',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/modules',
    name: 'dashboard-settings-modules',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/alerts',
    name: 'dashboard-settings-alerts',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/sms',
    name: 'dashboard-settings-sms',
    roles: ['admin'],
    requiresAuth: true,
  },
  {
    path: '/dashboard/settings/time-off-types',
    name: 'dashboard-settings-time-off-types',
    roles: ['admin'],
    requiresAuth: true,
  },
]

// ============================================================================
// All pages combined
// ============================================================================

export const ALL_PAGES: PageConfig[] = [
  ...PUBLIC_PAGES,
  ...PORTAL_PAGES,
  ...DASHBOARD_PAGES,
]

// ============================================================================
// User credentials for authentication
// ============================================================================

export interface UserCredentials {
  email: string
  password: string
  role: UserRole
  tenantId: string
}

export const TEST_USERS: Record<UserRole, UserCredentials> = {
  public: {
    email: '',
    password: '',
    role: 'public',
    tenantId: 'terrapet',
  },
  owner: {
    email: 'owner1@test.local',
    password: 'TestPassword123!',
    role: 'owner',
    tenantId: 'terrapet',
  },
  vet: {
    email: 'vet1@test.local',
    password: 'TestPassword123!',
    role: 'vet',
    tenantId: 'terrapet',
  },
  admin: {
    email: 'admin@test.local',
    password: 'TestPassword123!',
    role: 'admin',
    tenantId: 'terrapet',
  },
}

// ============================================================================
// Screenshot settings
// ============================================================================

export const SCREENSHOT_CONFIG = {
  /** Output directory for screenshots */
  outputDir: './screenshots',
  /** Default tenant */
  defaultTenant: 'terrapet',
  /** Viewport sizes */
  viewports: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 },
  },
  /** Default viewport */
  defaultViewport: 'desktop' as const,
  /** Full page screenshots */
  fullPage: true,
  /** Screenshot format */
  format: 'png' as const,
  /** Delay after page load (ms) */
  loadDelay: 1000,
  /** Max timeout per page (ms) */
  timeout: 30000,
}
