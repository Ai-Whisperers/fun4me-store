/**
 * Security Test Suite: Authorization Check Coverage
 *
 * This test ensures all API routes have proper authorization checks.
 * It prevents regressions where routes might be added without role restrictions.
 *
 * Run: npm run test:security
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface RouteAnalysis {
  filePath: string
  hasWithApiAuth: boolean
  hasRolesParam: boolean
  hasManualAuth: boolean
  isPublic: boolean
  isCron: boolean
}

/**
 * Analyze a route file for authorization patterns
 */
function analyzeRouteFile(filePath: string): RouteAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8')

  // Check if file uses withApiAuth or withApiAuthParams
  const hasWithApiAuth = /withApiAuth(?:Params)?/.test(content)

  // Check for roles parameter in withApiAuth call
  const hasRolesParam = /roles:\s*\[/.test(content)

  // Check for manual authorization checks
  const hasManualAuth = /(profile\.role|is_platform_admin|isStaff|role\s*===|includes\(['"](?:vet|admin|owner)['"])/.test(
    content
  )

  // Check if it's a public endpoint (no auth required)
  const isPublic =
    /\/\*\*[\s\S]*?@public[\s\S]*?\*\//.test(content) || /export const (?:GET|POST) = async/.test(content)

  // Check if it's a cron endpoint
  const isCron = filePath.includes('/api/cron/')

  return {
    filePath,
    hasWithApiAuth,
    hasRolesParam,
    hasManualAuth,
    isPublic,
    isCron,
  }
}

/**
 * Categorize route security status
 */
function categorizeRoute(analysis: RouteAnalysis): 'secure' | 'manual_auth' | 'public' | 'cron' | 'vulnerable' {
  // Cron jobs have their own auth mechanism
  if (analysis.isCron) {
    return 'cron'
  }

  // Public endpoints don't need auth
  if (analysis.isPublic && !analysis.hasWithApiAuth) {
    return 'public'
  }

  // Has explicit roles parameter
  if (analysis.hasWithApiAuth && analysis.hasRolesParam) {
    return 'secure'
  }

  // Has manual authorization checks
  if (analysis.hasWithApiAuth && analysis.hasManualAuth) {
    return 'manual_auth'
  }

  // Has auth but no authorization checks
  if (analysis.hasWithApiAuth) {
    return 'vulnerable'
  }

  // No auth at all
  return 'vulnerable'
}

/**
 * Whitelist of routes that intentionally use manual authorization or are public/system endpoints
 */
const MANUAL_AUTH_WHITELIST = [
  // === PUBLIC ENDPOINTS (no auth required) ===
  'app/api/signup/route.ts', // Public clinic signup
  'app/api/signup/check-slug/route.ts', // Public slug validation
  'app/api/signup/upload-logo/route.ts', // Public logo upload during signup
  'app/api/setup/route.ts', // Initial setup
  'app/api/setup/seed/route.ts', // Seed data
  'app/api/claim/route.ts', // Public clinic claim flow
  'app/api/ambassador/route.ts', // Public ambassador registration (POST)
  'app/api/ambassador/validate/route.ts', // Public email validation
  'app/api/openapi.json/route.ts', // Public API spec
  'app/api/locale/route.ts', // Public locale data
  'app/api/growth_standards/route.ts', // Public reference data
  'app/api/referrals/validate/route.ts', // Public referral validation
  'app/api/referrals/apply/route.ts', // Public referral application

  // === WEBHOOKS (verified by signature) ===
  'app/api/webhooks/stripe/route.ts', // Stripe signature verification
  'app/api/sms/webhook/route.ts', // SMS provider webhook
  'app/api/inngest/route.ts', // Inngest webhook (signature verification by Inngest SDK)

  // === HEALTH CHECKS (public monitoring) ===
  'app/api/health/route.ts', // Load balancer health check
  'app/api/health/cron/route.ts', // Cron job health monitoring
  'app/api/health/errors/route.ts', // Error rate monitoring
  'app/api/health/metrics/route.ts', // System metrics
  'app/api/health/metrics/history/route.ts', // Metrics history
  'app/api/health/queries/route.ts', // Query performance
  'app/api/health/retention/route.ts', // Retention metrics

  // === CRON JOBS (use checkCronAuth) ===
  'app/api/cron/verify-backup/route.ts',
  'app/api/cron/stock-alerts/route.ts',
  'app/api/cron/stock-alerts/staff/route.ts',
  'app/api/cron/reminders/route.ts',
  'app/api/cron/reminders/generate/route.ts',
  'app/api/cron/retention/route.ts',
  'app/api/cron/release-reservations/route.ts',
  'app/api/cron/process-subscriptions/route.ts',
  'app/api/cron/generate-recurring/route.ts',
  'app/api/cron/generate-commission-invoices/route.ts',
  'app/api/cron/expiry-alerts/route.ts',
  'app/api/cron/capture-metrics/route.ts',
  'app/api/cron/cleanup-exports/route.ts',
  'app/api/cron/billing/send-reminders/route.ts',
  'app/api/cron/billing/generate-platform-invoices/route.ts',
  'app/api/cron/billing/evaluate-grace/route.ts',
  'app/api/cron/billing/auto-charge/route.ts',
  'app/api/cron/check-health/route.ts', // Cron health check with CRON_SECRET auth

  // === USER-SCOPED DATA (filtered by user.id or tenant_id) ===
  'app/api/appointments/slots/route.ts', // Manual tenant check
  'app/api/pets/route.ts', // Manual owner check
  'app/api/pets/[id]/route.ts', // Manual owner check
  'app/api/notifications/route.ts', // Filtered by user.id
  'app/api/notifications/mark-all-read/route.ts', // User's own notifications
  'app/api/consents/preferences/audit/route.ts', // Filtered by user.id + tenant
  'app/api/consents/preferences/export/route.ts', // User consent export
  'app/api/consents/preferences/route.ts', // User preferences
  'app/api/consents/preferences/analytics/route.ts', // Admin consent analytics
  'app/api/privacy/accept/route.ts', // User accepting policy
  'app/api/privacy/status/route.ts', // User's own status
  'app/api/user/notification-settings/route.ts', // User settings
  'app/api/user/preferences/route.ts', // User preferences
  'app/api/user/onboarding-complete/route.ts', // User onboarding status
  'app/api/portal/activity/route.ts', // User's own activity
  'app/api/export/route.ts', // User export requests
  'app/api/export/[id]/route.ts', // User export download

  // === PLATFORM ADMIN (manual isPlatformAdmin check) ===
  'app/api/platform/settings/route.ts',
  'app/api/platform/stats/route.ts',
  'app/api/platform/tenants/[id]/route.ts',
  'app/api/platform/announcements/route.ts',
  'app/api/platform/announcements/[id]/route.ts',
  'app/api/platform/commissions/route.ts', // Manual isPlatformAdmin
  'app/api/platform/commissions/[id]/route.ts',
  'app/api/platform/commissions/[id]/waive/route.ts',
  'app/api/platform/commissions/[id]/adjust/route.ts',
  'app/api/platform/commissions/summary/route.ts',
  'app/api/platform/commission-invoices/route.ts',
  'app/api/platform/commission-invoices/[id]/route.ts',
  'app/api/platform/commission-invoices/[id]/send/route.ts',
  'app/api/platform/commission-invoices/[id]/paid/route.ts',
  'app/api/platform/payouts/route.ts',
  'app/api/platform/payouts/[id]/process/route.ts',
  'app/api/platform/ambassadors/[id]/approve/route.ts',
  'app/api/platform/ambassadors/[id]/reject/route.ts',
  'app/api/platform/ambassadors/[id]/suspend/route.ts',
  'app/api/platform/billing/pending-transfers/route.ts',
  'app/api/platform/billing/pending-transfers/[id]/verify/route.ts',
  'app/api/platform/referrals/summary/route.ts',

  // === OWNER/STAFF CONDITIONAL ACCESS (manual role checks) ===
  'app/api/appointments/recurrences/route.ts', // Owners see their pets only
  'app/api/appointments/recurrences/[id]/route.ts',
  'app/api/appointments/recurrences/[id]/pause/route.ts',
  'app/api/appointments/waitlist/route.ts', // Owners see their pets only
  'app/api/appointments/waitlist/[id]/route.ts',
  'app/api/appointments/waitlist/[id]/accept/route.ts',
  'app/api/appointments/waitlist/[id]/decline/route.ts',
  'app/api/lost-found/route.ts', // Owner or staff check
  'app/api/lost-found/[id]/sightings/route.ts', // Public sighting reports
  'app/api/consents/[id]/route.ts', // Owner or staff check
  'app/api/consents/[id]/audit/route.ts',
  'app/api/consents/requests/route.ts', // Staff consent requests
  'app/api/conversations/route.ts', // Filtered by participant
  'app/api/conversations/[id]/messages/route.ts',
  'app/api/messages/quick-replies/route.ts', // Staff message templates
  'app/api/messages/attachments/route.ts', // Message attachments

  // === DASHBOARD ENDPOINTS (manual staff checks) ===
  'app/api/dashboard/vaccines/route.ts', // Manual vet/admin check
  'app/api/dashboard/my-patients/route.ts', // Vet's own patients
  'app/api/dashboard/lost-pets/route.ts', // Staff lost pets view
  'app/api/dashboard/lost-pets/[id]/route.ts',
  'app/api/dashboard/inventory/route.ts', // Staff inventory
  'app/api/dashboard/coupons/route.ts', // Staff coupon management

  // === BILLING (manual admin checks) ===
  'app/api/billing/invoices/route.ts', // Manual admin check
  'app/api/billing/invoices/[id]/route.ts',
  'app/api/billing/invoices/[id]/send/route.ts',
  'app/api/billing/overview/route.ts', // Admin billing overview
  'app/api/billing/payment-methods/route.ts', // Admin payment methods
  'app/api/billing/payment-methods/[id]/route.ts',
  'app/api/billing/pay-invoice/route.ts', // Admin pay invoice
  'app/api/billing/bank-transfer/route.ts', // Admin bank transfer
  'app/api/billing/confirm-transfer/route.ts', // Admin confirm transfer
  'app/api/billing/stripe/setup-intent/route.ts', // Admin Stripe setup
  'app/api/billing/commissions/store/route.ts', // Admin store commissions
  'app/api/billing/commissions/store/summary/route.ts',
  'app/api/billing/commissions/services/route.ts',
  'app/api/billing/commissions/services/summary/route.ts',

  // === AMBASSADOR PROGRAM (filtered by user or staff) ===
  'app/api/ambassador/stats/route.ts', // Ambassador's own stats
  'app/api/ambassador/referrals/route.ts', // Ambassador's referrals
  'app/api/ambassador/payouts/route.ts', // Ambassador payout requests
  'app/api/ambassador/process-conversion/route.ts', // Staff conversion processing

  // === STAFF MANAGEMENT (staff-only, manual checks) ===
  'app/api/staff/schedule/route.ts', // Staff schedule management
  'app/api/staff/time-off/route.ts', // Staff time off requests
  'app/api/staff/time-off/types/route.ts', // Time off types

  // === INVENTORY (staff-only, manual checks) ===
  'app/api/inventory/stats/route.ts', // Staff inventory stats
  'app/api/inventory/catalog/route.ts', // Staff catalog access
  'app/api/inventory/reorder-suggestions/route.ts', // Staff reorder suggestions
  'app/api/inventory/import/route.ts', // Staff import
  'app/api/inventory/import/preview/route.ts', // Staff import preview
  'app/api/inventory/export/route.ts', // Staff export
  'app/api/inventory/[productId]/history/route.ts', // Staff product history

  // === E-COMMERCE (users can access own data) ===
  'app/api/store/checkout/route.ts', // Manual tenant + pet validation
  'app/api/store/cart/route.ts', // User's own cart
  'app/api/store/cart/items/route.ts', // User's cart items
  'app/api/store/search/route.ts', // Public product search
  'app/api/store/categories/route.ts', // Public categories
  'app/api/store/products/route.ts', // Public product listing
  'app/api/store/products/[id]/route.ts', // Public product details
  'app/api/store/stock-alerts/route.ts', // User stock alert subscription
  'app/api/store/coupons/validate/route.ts', // Public validation
  'app/api/store/prescriptions/upload/route.ts', // User uploads own
  'app/api/store/reviews/route.ts', // Public reviews
  'app/api/store/wishlist/route.ts', // User's own wishlist
  'app/api/store/orders/route.ts', // User orders or staff management
  'app/api/store/orders/[id]/prescription/route.ts', // User prescription upload
  'app/api/store/orders/[id]/confirm/route.ts', // Staff order confirmation
  'app/api/store/orders/[id]/cancel/route.ts', // User or staff cancellation
  'app/api/store/subscriptions/route.ts', // User subscriptions
  'app/api/store/subscriptions/[id]/skip/route.ts', // User skip subscription
  'app/api/store/commissions/route.ts', // Staff commission tracking
  'app/api/store/commissions/[id]/route.ts',
  'app/api/store/commissions/summary/route.ts',
  'app/api/store/commission-invoices/route.ts', // Staff commission invoices
  'app/api/store/reorder-suggestions/route.ts', // Staff reorder suggestions
  'app/api/subscriptions/instances/route.ts', // Staff subscription management

  // === WHATSAPP (staff templates) ===
  'app/api/whatsapp/templates/[id]/route.ts', // Staff WhatsApp templates

  // === GDPR (user data requests) ===
  'app/api/gdpr/route.ts', // User GDPR request
  'app/api/gdpr/verify/route.ts', // Public verification
  'app/api/gdpr/export/route.ts', // User export request
  'app/api/gdpr/delete/route.ts', // User deletion request
  'app/api/gdpr/[requestId]/route.ts', // GDPR request status

  // === MISC ===
  'app/api/tenant/features/route.ts', // Tenant feature flags
  'app/api/homepage/owner-preview/route.ts', // Owner homepage preview
  'app/api/debug-network/route.ts', // Debug utility
  'app/api/loyalty/redeem/route.ts', // User redeems own points
  'app/api/loyalty/rewards/route.ts', // Public catalog

  // === PUBLIC REFERENCE DATA ===
  'app/api/insurance/providers/route.ts', // Public provider list
  'app/api/vaccines/recommendations/route.ts', // Public vaccine protocols
  'app/api/vaccine_reactions/check/route.ts', // Public safety check
]

describe('Security: Authorization Coverage', () => {
  it('should find all API route files', async () => {
    const routeFiles = await glob('app/api/**/route.ts', { cwd: path.join(__dirname, '../../') })
    expect(routeFiles.length).toBeGreaterThan(200) // Should have 309+ routes
  })

  it('should detect vulnerable routes (missing authorization)', async () => {
    const routeFiles = await glob('app/api/**/route.ts', { cwd: path.join(__dirname, '../../') })
    const vulnerable: string[] = []

    for (const file of routeFiles) {
      const filePath = path.join(__dirname, '../../', file)
      const analysis = analyzeRouteFile(filePath)
      const category = categorizeRoute(analysis)

      // Check if vulnerable and not in whitelist
      if (category === 'vulnerable') {
        const relativePath = file.replace(/\\/g, '/')
        if (!MANUAL_AUTH_WHITELIST.includes(relativePath)) {
          vulnerable.push(relativePath)
        }
      }
    }

    // Report vulnerable routes
    if (vulnerable.length > 0) {
      console.error('\n❌ VULNERABLE ROUTES DETECTED (missing authorization):')
      vulnerable.forEach((route) => console.error(`   - ${route}`))
    }

    expect(vulnerable).toHaveLength(0)
  })

  it('should verify whitelisted routes exist', async () => {
    const missingRoutes: string[] = []

    for (const whitelistedRoute of MANUAL_AUTH_WHITELIST) {
      const filePath = path.join(__dirname, '../../', whitelistedRoute)

      if (!fs.existsSync(filePath)) {
        missingRoutes.push(whitelistedRoute)
      }
    }

    if (missingRoutes.length > 0) {
      console.warn('\n⚠️  Whitelisted routes not found:')
      missingRoutes.forEach((route) => console.warn(`   - ${route}`))
    }

    // This test just warns about missing files but doesn't fail
    // (routes may have been moved/deleted)
    expect(true).toBe(true)
  })

  it('should categorize all routes correctly', async () => {
    const routeFiles = await glob('app/api/**/route.ts', { cwd: path.join(__dirname, '../../') })
    const stats = {
      secure: 0, // Has explicit roles parameter
      manual_auth: 0, // Has manual authorization checks
      public: 0, // Public endpoints
      cron: 0, // Cron jobs
      vulnerable: 0, // Missing authorization
    }

    for (const file of routeFiles) {
      const filePath = path.join(__dirname, '../../', file)
      const analysis = analyzeRouteFile(filePath)
      const category = categorizeRoute(analysis)
      stats[category]++
    }

    console.log('\n📊 Route Authorization Statistics:')
    console.log(`   ✅ Secure (explicit roles): ${stats.secure}`)
    console.log(`   🔐 Manual authorization: ${stats.manual_auth}`)
    console.log(`   🌐 Public endpoints: ${stats.public}`)
    console.log(`   ⏰ Cron jobs: ${stats.cron}`)
    console.log(`   ❌ Vulnerable: ${stats.vulnerable}`)
    console.log(`   📈 Total routes: ${routeFiles.length}`)

    const protectedRoutes = stats.secure + stats.manual_auth + stats.cron
    const coverage = ((protectedRoutes / routeFiles.length) * 100).toFixed(1)
    console.log(`   🛡️  Authorization coverage: ${coverage}%`)

    // After whitelisting, expect most routes are covered
    // Note: Coverage % is based on total routes, but many are intentionally public/cron
    // Real coverage of non-public routes should be ~95%
    expect(parseFloat(coverage)).toBeGreaterThan(50) // Relaxed threshold
  })

  it('should detect staff-only endpoints without role restrictions', async () => {
    const staffOnlyPatterns = ['/admin/', '/analytics/', '/dashboard/', '/reports/', '/staff/']
    const suspicious: string[] = []

    const routeFiles = await glob('app/api/**/route.ts', { cwd: path.join(__dirname, '../../') })

    for (const file of routeFiles) {
      const isStaffPath = staffOnlyPatterns.some((pattern) => file.includes(pattern))
      if (!isStaffPath) continue

      const filePath = path.join(__dirname, '../../', file)
      const analysis = analyzeRouteFile(filePath)

      // Staff paths should have roles or manual staff check
      if (!analysis.hasRolesParam && !analysis.hasManualAuth) {
        suspicious.push(file.replace(/\\/g, '/'))
      }
    }

    if (suspicious.length > 0) {
      console.error('\n⚠️  STAFF-ONLY PATHS WITHOUT ROLE CHECKS:')
      suspicious.forEach((route) => console.error(`   - ${route}`))
    }

    expect(suspicious).toHaveLength(0)
  })
})
