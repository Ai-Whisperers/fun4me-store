# Vete Refactoring - Ticket List

**Generated**: January 15, 2026  
**Total Tickets**: 63  
**Source**: BASELINE_METRICS.md analysis  
**Board Setup**: See REFACTORING_BOARD.md

---

## How to Use This Document

1. **Review tickets** in priority order (P0 → P3)
2. **Create issues** in GitHub (or chosen platform)
3. **Apply labels** as specified in each ticket
4. **Add to board** in appropriate column (Backlog or Ready)
5. **Estimate effort** based on S/M/L/XL guidelines

---

## Phase 0 - Preparation & Measurement (5 tickets)

### ✅ #0.1 - Establish Baseline Metrics
**Status**: COMPLETED  
**Priority**: P0 - Critical  
**Effort**: M (4 hours)  
**Labels**: Phase-0-Prep, docs

**Summary**: Create comprehensive baseline metrics document for refactoring initiative.

**Completed**: January 15, 2026

---

### #0.2 - Create Refactoring Board
**Status**: IN PROGRESS  
**Priority**: P0 - Critical  
**Effort**: M (3 hours)  
**Labels**: Phase-0-Prep, docs

**Summary**: Set up project management board with columns, labels, and initial tickets.

**Acceptance Criteria**:
- [ ] GitHub Project (or alternative) created
- [ ] Columns configured (Backlog, Ready, In Progress, Review, Done)
- [ ] All labels created (Priority, Effort, Phase, Type)
- [ ] 30+ tickets imported from REFACTORING_TICKETS.md
- [ ] Views configured (Board, Priority, Phase, Effort)

**Files to Create**:
- GitHub Project configuration
- Labels in repository

**References**:
- REFACTORING_BOARD.md (structure)
- REFACTORING_TICKETS.md (ticket source)

---

### #0.3 - Expand E2E Test Coverage
**Priority**: P0 - Critical  
**Effort**: L (6 hours)  
**Labels**: Phase-0-Prep, test

**Summary**: Add comprehensive E2E tests for critical user flows to prevent regressions during refactoring.

**Acceptance Criteria**:
- [ ] Appointment booking flow E2E test (book → confirm → check-in)
- [ ] Invoice payment flow E2E test (create → pay → receipt)
- [ ] Pet registration + vaccine E2E test (register → add vaccine → view history)
- [ ] Store checkout E2E test (add to cart → upload prescription → checkout)
- [ ] All tests passing in CI/CD

**Technical Details**:
- Use Playwright (already configured)
- Test against local dev environment
- Cover happy path + 2-3 error scenarios per flow

**Files to Create**:
- `tests/e2e/critical-flows/appointment-booking.spec.ts`
- `tests/e2e/critical-flows/invoice-payment.spec.ts`
- `tests/e2e/critical-flows/pet-registration.spec.ts`
- `tests/e2e/critical-flows/store-checkout.spec.ts`

**Blocked By**: None  
**Blocks**: #1.1 (safer to refactor with tests)

---

### #0.4 - Add API Contract Tests
**Priority**: P1 - High  
**Effort**: M (4 hours)  
**Labels**: Phase-0-Prep, test

**Summary**: Add JSON schema validation for key API endpoints to ensure contract stability.

**Acceptance Criteria**:
- [ ] Schema validation for 10+ critical endpoints
- [ ] Response format assertions (structure, types)
- [ ] Error response standards validated
- [ ] Tests integrated into CI/CD

**Technical Details**:
- Use Zod schemas for validation
- Test endpoints: appointments, invoices, pets, prescriptions, store orders
- Validate both success and error responses

**Files to Create**:
- `tests/api/contracts/appointments.test.ts`
- `tests/api/contracts/invoices.test.ts`
- `tests/api/contracts/pets.test.ts`
- `lib/api/schemas.ts` (if needed)

---

### #0.5 - Establish Performance Baselines
**Priority**: P2 - Medium  
**Effort**: M (3 hours)  
**Labels**: Phase-0-Prep, performance, test

**Summary**: Capture baseline performance metrics for APIs and pages before refactoring.

**Acceptance Criteria**:
- [ ] API response time baselines (P50, P95, P99) for 20+ endpoints
- [ ] Page load performance baselines (FCP, LCP, TTI) for 10+ pages
- [ ] Database query benchmarks for slow queries
- [ ] Results documented in `metrics/performance-baseline.md`

**Technical Details**:
- Use Lighthouse CI for page metrics
- Use k6 or similar for API load testing
- Document in metrics/ directory

**Files to Create**:
- `tests/performance/api-benchmarks.js`
- `tests/performance/page-benchmarks.js`
- `metrics/performance-baseline.md`

---

## Phase 1 - Service Layer Foundation (25 tickets)

### #1.1 - Create BaseService Class
**Priority**: P0 - Critical  
**Effort**: M (4 hours)  
**Labels**: Phase-1-Services, refactor, P0-Critical, M-Medium

**Summary**: Create abstract base service class with transaction management, error handling, and tenant validation.

**Acceptance Criteria**:
- [ ] `BaseService` class created with abstract methods
- [ ] Transaction management (`withTransaction`)
- [ ] Tenant validation (`validateTenant`)
- [ ] Error handling (`handleError`)
- [ ] Service result types (`ServiceResult<T>`, `ServiceError`)
- [ ] Unit tests (95%+ coverage)
- [ ] Documentation and usage examples

**Technical Details**:
```typescript
// lib/services/base.service.ts
export abstract class BaseService {
  constructor(protected supabase: SupabaseClient) {}
  
  protected async withTransaction<T>(
    fn: (client: SupabaseClient) => Promise<T>
  ): Promise<ServiceResult<T>>
  
  protected async validateTenant(
    resourceId: string,
    tenantId: string
  ): Promise<void>
  
  protected handleError(error: unknown): ServiceError
}
```

**Files to Create**:
- `lib/services/base.service.ts`
- `lib/services/types.ts` (ServiceResult, ServiceError types)
- `lib/services/__tests__/base.service.test.ts`

**Blocks**: #1.2, #1.3, #1.4 (all other services depend on this)

**References**:
- See `lib/utils/timeout.ts` for error handling patterns
- See `lib/api/cron-external-calls.ts` for wrapper patterns

---

### #1.2 - Create AppointmentService
**Priority**: P0 - Critical  
**Effort**: XL (12 hours)  
**Labels**: Phase-1-Services, refactor, P0-Critical, XL-Extra-Large

**Summary**: Extract all appointment business logic from 15+ routes into a single testable service.

**Acceptance Criteria**:
- [ ] `AppointmentService` extends `BaseService`
- [ ] Methods: create, getById, update, delete, list, cancel, reschedule, checkIn, complete
- [ ] All business logic extracted from routes
- [ ] Transaction management for complex operations
- [ ] 95%+ test coverage
- [ ] Documentation with usage examples

**Technical Details**:
- Extract logic from `/api/appointments/*` routes (15+ files)
- Handle scheduling status, waitlist logic, overlap detection
- Include validation, error handling, tenant isolation

**Routes to Refactor** (separate tickets):
- `/api/appointments` (list) → #1.2.1
- `/api/appointments/[id]` (get, update, delete) → #1.2.2
- `/api/appointments/create` (create) → #1.2.3
- `/api/appointments/check-in` (check-in) → #1.2.4
- `/api/appointments/complete` (complete) → #1.2.5
- (10+ more routes)

**Files to Create**:
- `lib/services/appointment.service.ts`
- `lib/services/__tests__/appointment.service.test.ts`

**Blocked By**: #1.1  
**Blocks**: #1.2.1 - #1.2.15 (route refactors)

---

### #1.2.1 - Refactor /api/appointments (List)
**Priority**: P0 - Critical  
**Effort**: S (2 hours)  
**Labels**: Phase-1-Services, refactor, P0-Critical, S-Small

**Summary**: Refactor appointments list endpoint to use AppointmentService.

**Acceptance Criteria**:
- [ ] Route uses `AppointmentService.list()`
- [ ] Route reduced to < 50 lines
- [ ] All filtering/pagination handled by service
- [ ] Tests updated
- [ ] No regressions in functionality

**Before**:
```typescript
// ~100+ lines of business logic
export async function GET(request: Request) {
  // Auth check
  // Tenant validation
  // Complex query logic
  // Pagination
  // Filtering
  // Error handling
  return Response.json(data);
}
```

**After**:
```typescript
// ~30 lines - thin controller
export async function GET(request: Request) {
  const supabase = await createClient();
  const { user, tenantId } = await auth(supabase);
  
  const filters = getFiltersFromRequest(request);
  const result = await appointmentService.list(filters, tenantId);
  
  if (!result.success) {
    return errorResponse(result.error);
  }
  
  return Response.json(result.data);
}
```

**Files to Modify**:
- `app/api/appointments/route.ts`

**Blocked By**: #1.2

---

### #1.2.2 - #1.2.15 - (Similar tickets for other appointment routes)

**[TRUNCATED FOR BREVITY - Pattern established]**

---

### #1.3 - Create InvoiceService
**Priority**: P0 - Critical  
**Effort**: L (8 hours)  
**Labels**: Phase-1-Services, refactor, P0-Critical, L-Large

**Summary**: Extract invoice and payment business logic from 10+ routes.

**Acceptance Criteria**:
- [ ] `InvoiceService` extends `BaseService`
- [ ] Methods: create, getById, update, addLineItem, processPayment, refund, sendEmail, generatePDF
- [ ] Transaction management for payments
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/invoice.service.ts`
- `lib/services/__tests__/invoice.service.test.ts`

**Blocked By**: #1.1

---

### #1.4 - Create InventoryService
**Priority**: P0 - Critical  
**Effort**: XL (12 hours)  
**Labels**: Phase-1-Services, refactor, P0-Critical, XL-Extra-Large

**Summary**: Extract inventory management logic from 15+ routes.

**Acceptance Criteria**:
- [ ] `InventoryService` extends `BaseService`
- [ ] Methods: adjustStock, receiveStock, sendExpiryAlerts, sendStockAlerts, previewImport, getReorderSuggestions
- [ ] Weighted average cost (WAC) calculations
- [ ] Stock reservation logic
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/inventory.service.ts`
- `lib/services/__tests__/inventory.service.test.ts`

**Blocked By**: #1.1

---

### #1.5 - Create PetService
**Priority**: P1 - High  
**Effort**: L (8 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, L-Large

**Summary**: Extract pet management logic from 12+ routes.

**Acceptance Criteria**:
- [ ] `PetService` extends `BaseService`
- [ ] Methods: create, getById, update, delete, list, addVaccine, addMedicalRecord, generateQR
- [ ] Owner association logic
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/pet.service.ts`
- `lib/services/__tests__/pet.service.test.ts`

**Blocked By**: #1.1

---

### #1.6 - Create LabOrderService
**Priority**: P1 - High  
**Effort**: M (6 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, M-Medium

**Summary**: Extract lab order logic from 8+ routes.

**Acceptance Criteria**:
- [ ] `LabOrderService` extends `BaseService`
- [ ] Methods: create (atomic), addResults, addComments, listOrders
- [ ] Uses `create_lab_order_atomic` RPC function
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/lab-order.service.ts`
- `lib/services/__tests__/lab-order.service.test.ts`

**Blocked By**: #1.1

---

### #1.7 - Create PrescriptionService
**Priority**: P1 - High  
**Effort**: M (6 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, M-Medium

**Summary**: Extract prescription logic from 6+ routes.

**Acceptance Criteria**:
- [ ] `PrescriptionService` extends `BaseService`
- [ ] Methods: create, verify, generatePDF, sendToOwner
- [ ] Prescription verification security
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/prescription.service.ts`
- `lib/services/__tests__/prescription.service.test.ts`

**Blocked By**: #1.1

---

### #1.8 - Create StaffService
**Priority**: P1 - High  
**Effort**: L (8 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, L-Large

**Summary**: Extract staff management logic from 10+ routes.

**Acceptance Criteria**:
- [ ] `StaffService` extends `BaseService`
- [ ] Methods: manageSchedule, requestTimeOff, approveTimeOff, getAvailability
- [ ] Staff schedule overlap detection
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/staff.service.ts`
- `lib/services/__tests__/staff.service.test.ts`

**Blocked By**: #1.1

---

### #1.9 - Create AnalyticsService
**Priority**: P1 - High  
**Effort**: M (6 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, M-Medium

**Summary**: Extract analytics logic from 8+ routes.

**Acceptance Criteria**:
- [ ] `AnalyticsService` extends `BaseService`
- [ ] Methods: getPatientMetrics, getOperations, getOverview, getFinancials
- [ ] Query optimization for large datasets
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/analytics.service.ts`
- `lib/services/__tests__/analytics.service.test.ts`

**Blocked By**: #1.1

---

### #1.10 - Create BillingService
**Priority**: P1 - High  
**Effort**: L (8 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, L-Large

**Summary**: Extract billing logic from 12+ routes and cron jobs.

**Acceptance Criteria**:
- [ ] `BillingService` extends `BaseService`
- [ ] Methods: autoCharge, sendReminders, evaluateGrace, processPayment, generatePlatformInvoices
- [ ] Subscription billing logic
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/billing.service.ts`
- `lib/services/__tests__/billing.service.test.ts`

**Blocked By**: #1.1

---

### #1.11 - Create StoreService
**Priority**: P1 - High  
**Effort**: L (8 hours)  
**Labels**: Phase-1-Services, refactor, P1-High, L-Large

**Summary**: Extract e-commerce logic from 10+ routes.

**Acceptance Criteria**:
- [ ] `StoreService` extends `BaseService`
- [ ] Methods: manageCart, checkout, processOrder, handlePrescription, releaseReservations
- [ ] Stock reservation logic
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/store.service.ts`
- `lib/services/__tests__/store.service.test.ts`

**Blocked By**: #1.1

---

### #1.12 - Create ReminderService
**Priority**: P2 - Medium  
**Effort**: M (6 hours)  
**Labels**: Phase-1-Services, refactor, P2-Medium, M-Medium

**Summary**: Extract reminder generation and sending logic from cron jobs.

**Acceptance Criteria**:
- [ ] `ReminderService` extends `BaseService`
- [ ] Methods: generate, send, scheduleAppointment, scheduleVaccine
- [ ] Template rendering
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/reminder.service.ts`
- `lib/services/__tests__/reminder.service.test.ts`

**Blocked By**: #1.1

---

### #1.13 - Create SubscriptionService
**Priority**: P2 - Medium  
**Effort**: M (6 hours)  
**Labels**: Phase-1-Services, refactor, P2-Medium, M-Medium

**Summary**: Extract subscription processing logic from cron jobs.

**Acceptance Criteria**:
- [ ] `SubscriptionService` extends `BaseService`
- [ ] Methods: process, renew, cancel, upgrade, downgrade
- [ ] Billing cycle management
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/subscription.service.ts`
- `lib/services/__tests__/subscription.service.test.ts`

**Blocked By**: #1.1

---

### #1.14 - Create WhatsAppService
**Priority**: P2 - Medium  
**Effort**: M (4 hours)  
**Labels**: Phase-1-Services, refactor, P2-Medium, M-Medium

**Summary**: Extract WhatsApp integration logic.

**Acceptance Criteria**:
- [ ] `WhatsAppService` extends `BaseService`
- [ ] Methods: sendMessage, receiveMessage, sendTemplate
- [ ] API integration with retry logic
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/whatsapp.service.ts`
- `lib/services/__tests__/whatsapp.service.test.ts`

**Blocked By**: #1.1

---

### #1.15 - Create EmailService
**Priority**: P2 - Medium  
**Effort**: M (4 hours)  
**Labels**: Phase-1-Services, refactor, P2-Medium, M-Medium

**Summary**: Extract email sending logic with retry/timeout protection.

**Acceptance Criteria**:
- [ ] `EmailService` extends `BaseService`
- [ ] Methods: send, sendTemplate, sendInvoice, sendReminder
- [ ] Uses existing timeout/retry utilities
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/email.service.ts`
- `lib/services/__tests__/email.service.test.ts`

**Blocked By**: #1.1

**References**:
- `lib/utils/timeout.ts`
- `lib/api/cron-external-calls.ts`

---

### #1.16 - Create ProcurementService
**Priority**: P2 - Medium  
**Effort**: M (6 hours)  
**Labels**: Phase-1-Services, refactor, P2-Medium, M-Medium

**Summary**: Extract procurement logic.

**Acceptance Criteria**:
- [ ] `ProcurementService` extends `BaseService`
- [ ] Methods: createOrder, updateOrder, receiveOrder, getLeads
- [ ] Supplier integration
- [ ] 95%+ test coverage

**Files to Create**:
- `lib/services/procurement.service.ts`
- `lib/services/__tests__/procurement.service.test.ts`

**Blocked By**: #1.1

---

## Phase 2 - Component Architecture (15 tickets)

### #2.1 - Break Up event-detail-modal.tsx (738 lines)
**Priority**: P0 - Critical  
**Effort**: XL (10 hours)  
**Labels**: Phase-2-Components, refactor, P0-Critical, XL-Extra-Large

**Summary**: Break 738-line god component into 4-5 focused components.

**Acceptance Criteria**:
- [ ] Main component < 150 lines
- [ ] Extract `EventDetailsView` component (~150 lines)
- [ ] Extract `EventActionsPanel` component (~120 lines)
- [ ] Extract `EventFormFields` component (~180 lines)
- [ ] Extract `EventComments` component (~100 lines)
- [ ] All components tested
- [ ] No functionality regressions

**Technical Details**:
- Current: 738 lines in single file
- Target: 5 files @ ~150 lines each
- Use composition pattern
- Extract shared hooks

**Files to Create**:
- `components/calendar/event-detail-modal/index.tsx` (main, 150 lines)
- `components/calendar/event-detail-modal/EventDetailsView.tsx`
- `components/calendar/event-detail-modal/EventActionsPanel.tsx`
- `components/calendar/event-detail-modal/EventFormFields.tsx`
- `components/calendar/event-detail-modal/EventComments.tsx`
- `components/calendar/event-detail-modal/__tests__/`

**Files to Delete**:
- `components/calendar/event-detail-modal.tsx` (old 738-line file)

---

### #2.2 - Extract CalendarStyles.tsx to Theme System (731 lines)
**Priority**: P0 - Critical  
**Effort**: M (4 hours)  
**Labels**: Phase-2-Components, refactor, P0-Critical, M-Medium

**Summary**: Move 731 lines of calendar styles to Tailwind config or CSS modules.

**Acceptance Criteria**:
- [ ] Styles extracted to appropriate location
- [ ] Calendar components updated to use theme
- [ ] No visual regressions
- [ ] File deleted or reduced to < 100 lines

**Technical Details**:
- Move CSS to Tailwind config extensions
- Or create CSS module if dynamic styles needed
- Update calendar components to use new styles

**Files to Modify**:
- `tailwind.config.ts` (add calendar styles)
- Calendar components (update style references)

**Files to Delete/Reduce**:
- `components/calendar/CalendarStyles.tsx`

---

### #2.3 - Break Up multi-mode-scanner.tsx (662 lines)
**Priority**: P0 - Critical  
**Effort**: L (8 hours)  
**Labels**: Phase-2-Components, refactor, P0-Critical, L-Large

**Summary**: Separate scanner modes into individual components.

**Acceptance Criteria**:
- [ ] Main component < 150 lines
- [ ] Extract `BarcodeScanner` component
- [ ] Extract `QRScanner` component
- [ ] Extract `ManualEntry` component
- [ ] Extract `ScannerControls` component
- [ ] All modes tested independently

**Files to Create**:
- `components/dashboard/inventory/multi-mode-scanner/index.tsx`
- `components/dashboard/inventory/multi-mode-scanner/BarcodeScanner.tsx`
- `components/dashboard/inventory/multi-mode-scanner/QRScanner.tsx`
- `components/dashboard/inventory/multi-mode-scanner/ManualEntry.tsx`
- `components/dashboard/inventory/multi-mode-scanner/ScannerControls.tsx`

---

### #2.4 - #2.14 - (Similar tickets for remaining god components)

**[TRUNCATED FOR BREVITY - Pattern established for 11 more components]**

---

### #2.15 - Create Component Library Documentation
**Priority**: P2 - Medium  
**Effort**: M (4 hours)  
**Labels**: Phase-2-Components, docs, P2-Medium, M-Medium

**Summary**: Document component architecture and patterns for consistency.

**Acceptance Criteria**:
- [ ] Component structure guide (ui/, shared/, features/, pages/)
- [ ] Naming conventions
- [ ] Composition patterns
- [ ] Testing patterns
- [ ] Examples for each component type

**Files to Create**:
- `components/README.md` (update existing COMPONENT_GUIDE.md)
- Examples for each component category

---

## Phase 3 - Background Job Queue (14 tickets)

### #3.1 - Set Up Inngest Configuration
**Priority**: P0 - Critical  
**Effort**: M (3 hours)  
**Labels**: Phase-3-Jobs, refactor, P0-Critical, M-Medium

**Summary**: Configure Inngest for background job processing.

**Acceptance Criteria**:
- [ ] Inngest client configured
- [ ] Environment variables set
- [ ] Development mode working
- [ ] Production deployment plan documented

**Files to Create**:
- `lib/inngest/client.ts`
- `lib/inngest/functions/` (directory)
- Documentation for Inngest setup

---

### #3.2 - Migrate auto-charge Cron to Inngest
**Priority**: P1 - High  
**Effort**: M (4 hours)  
**Labels**: Phase-3-Jobs, refactor, P1-High, M-Medium

**Summary**: Convert `/api/cron/billing/auto-charge` to Inngest job.

**Acceptance Criteria**:
- [ ] Inngest function created
- [ ] Uses `BillingService.autoCharge()`
- [ ] Scheduled correctly (cron expression)
- [ ] Retry logic configured
- [ ] Monitoring added
- [ ] Old endpoint deprecated (returns 410 Gone)

**Files to Create**:
- `lib/inngest/functions/billing/auto-charge.ts`

**Files to Modify**:
- `app/api/cron/billing/auto-charge/route.ts` (deprecate)

**Blocked By**: #3.1, #1.10 (BillingService)

---

### #3.3 - #3.14 - (Similar tickets for 12 remaining cron jobs)

**[TRUNCATED FOR BREVITY - Pattern established for all cron migrations]**

---

## Phase 4 - Database Optimization (8 tickets)

### #4.1 - Add Missing Database Indexes
**Priority**: P1 - High  
**Effort**: M (4 hours)  
**Labels**: Phase-4-Database, performance, P1-High, M-Medium

**Summary**: Add indexes to high-traffic queries identified in baseline.

**Acceptance Criteria**:
- [ ] Indexes added to appointments (start_time, clinic_id)
- [ ] Indexes added to invoices (created_at, status)
- [ ] Indexes added to medical_records (pet_id, created_at)
- [ ] Migration created with rollback
- [ ] Query performance verified (20-50% improvement)

**Technical Details**:
```sql
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_clinic_start ON appointments(clinic_id, start_time);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_medical_records_pet_created ON medical_records(pet_id, created_at);
```

**Files to Create**:
- `web/db/098_add_performance_indexes.sql`

---

### #4.2 - Implement Rollback Migrations
**Priority**: P1 - High  
**Effort**: L (6 hours)  
**Labels**: Phase-4-Database, tech-debt, P1-High, L-Large

**Summary**: Add rollback capability to all 97 existing migrations.

**Acceptance Criteria**:
- [ ] Rollback scripts created for critical migrations (last 20)
- [ ] Migration rollback process documented
- [ ] Rollback tested in dev environment

**Files to Create**:
- `web/db/rollback/` (directory with rollback scripts)
- `web/db/README.md` (rollback procedure)

---

### #4.3 - #4.8 - (Database consolidation, optimization, documentation)

**[TRUNCATED FOR BREVITY]**

---

## Phase 5 - Dependency Cleanup (5 tickets)

### #5.1 - Remove Duplicate Date Libraries
**Priority**: P1 - High  
**Effort**: S (2 hours)  
**Labels**: Phase-5-Deps, tech-debt, P1-High, S-Small

**Summary**: Standardize on `date-fns`, remove `dayjs`.

**Acceptance Criteria**:
- [ ] All `dayjs` usage converted to `date-fns`
- [ ] `dayjs` uninstalled
- [ ] Tests passing
- [ ] No functionality regressions

**Files to Modify**:
- Search for `dayjs` imports, replace with `date-fns`
- `package.json` (remove dayjs)

---

### #5.2 - #5.5 - (Remove other duplicates, unused packages)

**[TRUNCATED FOR BREVITY]**

---

## Phase 6 - Performance & Monitoring (5 tickets)

### #6.1 - Set Up Sentry Error Tracking
**Priority**: P0 - Critical  
**Effort**: M (4 hours)  
**Labels**: Phase-6-Perf, monitoring, P0-Critical, M-Medium

**Summary**: Add production error tracking with Sentry.

**Acceptance Criteria**:
- [ ] Sentry installed and configured
- [ ] Source maps uploaded
- [ ] Error boundary integration
- [ ] Custom error context (user, tenant)
- [ ] Alert rules configured

**Files to Create**:
- `lib/monitoring/sentry.ts`
- `sentry.client.config.ts`
- `sentry.server.config.ts`

---

### #6.2 - #6.5 - (Performance monitoring, optimization, dashboards)

**[TRUNCATED FOR BREVITY]**

---

## Quick Wins (10 tickets - Can Do Anytime)

### #QW.1 - Add Critical Database Indexes
**Priority**: P1 - High  
**Effort**: S (2 hours)  
**Labels**: Quick-Win, performance, P1-High, S-Small

**Summary**: Add most critical missing indexes for immediate performance gain.

**Same as #4.1 but can be done independently anytime**

---

### #QW.2 - Remove formik (Unused Dependency)
**Priority**: P2 - Medium  
**Effort**: S (1 hour)  
**Labels**: Quick-Win, tech-debt, P2-Medium, S-Small

**Summary**: Remove unused formik package.

**Acceptance Criteria**:
- [ ] Verify formik is unused (search codebase)
- [ ] Uninstall: `npm uninstall formik`
- [ ] Build succeeds

---

### #QW.3 - Remove chart.js (Duplicate)
**Priority**: P2 - Medium  
**Effort**: S (1 hour)  
**Labels**: Quick-Win, tech-debt, P2-Medium, S-Small

**Summary**: Remove chart.js, keep recharts.

---

### #QW.4 - Remove axios (Use Native Fetch)
**Priority**: P2 - Medium  
**Effort**: M (3 hours)  
**Labels**: Quick-Win, tech-debt, P2-Medium, M-Medium

**Summary**: Replace axios with native fetch API.

---

### #QW.5 - Add .editorconfig for Consistency
**Priority**: P3 - Low  
**Effort**: S (30 min)  
**Labels**: Quick-Win, tech-debt, P3-Low, S-Small

**Summary**: Add .editorconfig for cross-editor consistency.

---

### #QW.6 - Document Git Workflow
**Priority**: P2 - Medium  
**Effort**: S (1 hour)  
**Labels**: Quick-Win, docs, P2-Medium, S-Small

**Summary**: Document branching strategy and PR process.

---

### #QW.7 - Set Up Dependabot
**Priority**: P2 - Medium  
**Effort**: S (1 hour)  
**Labels**: Quick-Win, tech-debt, P2-Medium, S-Small

**Summary**: Auto-update dependencies with Dependabot.

---

### #QW.8 - Add PR Template
**Priority**: P2 - Medium  
**Effort**: S (30 min)  
**Labels**: Quick-Win, docs, P2-Medium, S-Small

**Summary**: Standardize PR descriptions with template.

---

### #QW.9 - Add Issue Templates
**Priority**: P2 - Medium  
**Effort**: S (1 hour)  
**Labels**: Quick-Win, docs, P2-Medium, S-Small

**Summary**: Create templates for bugs, features, refactoring.

---

### #QW.10 - Update CLAUDE.md with Refactoring Context
**Priority**: P2 - Medium  
**Effort**: S (1 hour)  
**Labels**: Quick-Win, docs, P2-Medium, S-Small

**Summary**: Add refactoring status and patterns to CLAUDE.md.

**Acceptance Criteria**:
- [ ] Add section on service layer patterns
- [ ] Document component structure changes
- [ ] Update with new architectural decisions

**Files to Modify**:
- `CLAUDE.md`

---

## Summary Statistics

**Total Tickets**: 63

**By Phase**:
- Phase 0: 5 tickets (1 complete)
- Phase 1: 25 tickets
- Phase 2: 15 tickets
- Phase 3: 14 tickets
- Phase 4: 8 tickets
- Phase 5: 5 tickets
- Phase 6: 5 tickets
- Quick Wins: 10 tickets

**By Priority**:
- P0 (Critical): 15 tickets
- P1 (High): 28 tickets
- P2 (Medium): 18 tickets
- P3 (Low): 2 tickets

**By Effort**:
- S (Small): 12 tickets (~18 hours)
- M (Medium): 26 tickets (~104 hours)
- L (Large): 15 tickets (~120 hours)
- XL (Extra Large): 10 tickets (~120 hours)

**Total Estimated Effort**: ~362 hours (~9 weeks solo, ~4-5 weeks with team of 2-3)

---

## Next Steps

1. ✅ Review this ticket list
2. ✅ Create GitHub Project (or chosen platform)
3. ✅ Import Phase 0 tickets (5 tickets)
4. ✅ Import Phase 1 tickets (25 tickets)
5. ✅ Import Quick Win tickets (10 tickets)
6. ✅ Prioritize Ready column (top 20 tickets)
7. ✅ Begin Phase 0, Step 0.3 (safety nets)

---

_Last Updated: January 15, 2026_
