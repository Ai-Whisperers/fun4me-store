# Services Layer Deep-Dive Analysis - The Mega-Service Crisis

**Date**: January 19, 2026  
**Analyst**: Sisyphus  
**Status**: 🔥 CRITICAL FINDINGS

---

## Executive Summary

The Vete services layer exhibits a **chronic violation of the Single Responsibility Principle**. What started as a clean BaseService pattern has devolved into 5 god-objects managing entire feature domains. These mega-services range from **970 to 1,114 lines**, each handling responsibilities that should be distributed across 3-5 specialized services.

**Bottom Line**: This isn't a services layer—it's 5 monoliths pretending to be microservices.

---

## The Mega-Service Hall of Shame

### 1. InvoiceService - 1,114 Lines (The Behemoth)

**File**: `web/lib/services/invoice-service.ts`  
**Methods**: 26 public methods  
**Responsibilities**: 6+ domains

#### What It Does

| Domain | Methods | Lines | Should Be |
|--------|---------|-------|-----------|
| Invoice CRUD | `list`, `getById`, `create`, `update`, `delete` | ~350 | ✅ `InvoiceService` |
| Payment Processing | `recordPayment`, `getPayments` | ~100 | ❌ `PaymentService` |
| Refund Handling | `refundPayment` | ~80 | ❌ `RefundService` |
| Status Management | `sendInvoice`, `markAsPaid`, `voidInvoice` | ~150 | ❌ `InvoiceStateService` |
| Queries & Reports | `getOverdueInvoices`, `getRevenueSummary` | ~120 | ❌ `InvoiceReportingService` |
| Business Logic | Currency rounding, tax calculation, totals | ~200 | ❌ `InvoiceCalculator` (pure utility) |

#### Specific Violations

**1. Payment Logic Mixed with Invoice Logic**
```typescript
// Lines 635-720: recordPayment method (85 lines)
async recordPayment(
  tenantId: string,
  userId: string,
  input: RecordPaymentInput
): Promise<ServiceResult<Payment>> {
  // Validates invoice
  // Validates payment amount
  // Creates payment record
  // Updates invoice amounts
  // Handles audit log
  // All in one transaction!
}
```

**Why it's wrong**: Payments are a separate entity with their own lifecycle. This creates tight coupling between invoices and payments.

**2. Revenue Analytics Mixed with CRUD**
```typescript
// Lines 1045-1113: getRevenueSummary (68 lines)
async getRevenueSummary(
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<ServiceResult<RevenueSummary>> {
  // Aggregates all invoices
  // Calculates totals, outstanding, overdue
  // Returns complex analytics
}
```

**Why it's wrong**: Reporting is a read-heavy, cacheable operation. It doesn't belong with transactional CRUD methods.

**3. Currency Math Duplication**
- `roundCurrency` imported **4 times** in the same file
- Used in `create`, `update`, `recordPayment`, `refundPayment`
- Should be a centralized utility, not imported ad-hoc

#### Proposed Split

```typescript
// Proposed structure (estimate: 5 services)
InvoiceService          // 300 lines - CRUD only
PaymentService          // 250 lines - Payments + refunds
InvoiceStateService     // 200 lines - Status transitions
InvoiceReportingService // 200 lines - Analytics + queries
InvoiceCalculator       // 100 lines - Pure functions (tax, totals)
```

**Effort**: 3-4 days (careful transaction boundary management required)

---

### 2. LabService - 1,077 Lines (The Lab Labyrinth)

**File**: `web/lib/services/lab-service.ts`  
**Methods**: 41 public methods  
**Responsibilities**: 7+ domains

#### What It Does

| Domain | Methods | Lines | Should Be |
|--------|---------|-------|-----------|
| Test Catalog | `listTests`, `getTest`, `getTestCategories` | ~90 | ✅ `LabTestCatalogService` |
| Panel Management | `listPanels`, `getPanel` | ~60 | ✅ `LabPanelService` |
| Order Management | `listOrders`, `getOrder`, `createOrder`, `updateOrderStatus`, `cancelOrder` | ~300 | ✅ `LabOrderService` |
| Results Entry | `listResults`, `enterResult`, `updateResult`, `getAbnormalResults` | ~150 | ❌ `LabResultService` |
| Attachments | `listAttachments`, `addAttachment`, `deleteAttachment` | ~80 | ❌ `LabAttachmentService` |
| Comments | `listComments`, `addComment` | ~60 | ❌ `LabCommentService` |
| Statistics | `getStats` | ~75 | ❌ `LabReportingService` |

#### Specific Violations

**1. Kitchen Sink Pattern**
This service manages:
- Test catalog (reference data)
- Panels (configuration)
- Orders (transactional)
- Results (clinical data)
- Attachments (files)
- Comments (communications)
- Statistics (analytics)

**That's 7 distinct bounded contexts in one file.**

**2. Atomic Order Creation Missing**
```typescript
// Lines 571-631: createOrder method
async createOrder(
  tenantId: string,
  data: CreateOrderData
): Promise<ServiceResult<LabOrder>> {
  // Generates order number (RPC)
  // Creates order record
  // Fetches test prices separately
  // Manually inserts order items
  // NO TRANSACTION WRAPPER!
}
```

**Why it's wrong**: If item insertion fails, you have an orphaned order. This should call a PostgreSQL function (`create_lab_order_atomic`).

**3. Flag Calculation Logic in Service**
```typescript
// Lines 745-757: Result entry calculates abnormal flags
if (data.numeric_value !== undefined && data.reference_min !== undefined) {
  if (data.numeric_value < data.reference_min) {
    isAbnormal = true;
    flag = flag || 'low';
  } else if (data.numeric_value > data.reference_max) {
    isAbnormal = true;
    flag = flag || 'high';
  }
}
```

**Why it's wrong**: This is business logic that should be in a pure function or a database check constraint.

#### Proposed Split

```typescript
// Proposed structure (estimate: 5 services)
LabTestCatalogService   // 200 lines - Tests + categories
LabPanelService         // 150 lines - Panels
LabOrderService         // 350 lines - Orders + items
LabResultService        // 250 lines - Results + attachments + comments
LabReportingService     // 150 lines - Stats + analytics
```

**Effort**: 4-5 days (test result domain is complex)

---

### 3. HospitalizationService - 1,061 Lines (The Ward Warden)

**File**: `web/lib/services/hospitalization-service.ts`  
**Methods**: 55 public methods  
**Responsibilities**: 8+ domains

#### What It Does

| Domain | Methods | Lines | Should Be |
|--------|---------|-------|-----------|
| Kennel Management | 6 methods | ~120 | ❌ `KennelService` |
| Hospitalization CRUD | 8 methods | ~200 | ✅ `HospitalizationService` |
| Vitals Tracking | 3 methods | ~90 | ❌ `VitalsService` |
| Medication Management | 5 methods | ~120 | ❌ `MedicationAdministrationService` |
| Treatment Tracking | 4 methods | ~100 | ❌ `TreatmentService` |
| Feeding Logs | 4 methods | ~90 | ❌ `FeedingService` |
| Notes | 2 methods | ~50 | ❌ `HospitalizationNotesService` |
| Statistics | 1 method | ~65 | ❌ `HospitalizationReportingService` |

#### Specific Violations

**1. Kennel Management Doesn't Belong**
```typescript
// Lines 347-445: Kennel CRUD (98 lines)
async listKennels(...)
async getKennel(...)
async createKennel(...)
async updateKennel(...)
async getAvailableKennels(...)
```

**Why it's wrong**: Kennels are infrastructure, not part of patient care. This is like putting "building management" in a medical records system.

**2. Medication Administration is Complex Enough to Stand Alone**
```typescript
// 5 methods, ~120 lines
scheduleMedication()     // Creates scheduled med
administerMedication()   // Marks as given
skipMedication()         // Records why skipped
listMedications()        // Query
```

This is a complete medication administration module (MAR) embedded in a hospitalization service.

**3. Feeding Logic in Completion**
```typescript
// Lines 920-939: completeFeeding
const status: FeedingStatus =
  data.consumed_amount === '0' || data.appetite_score === 0 
    ? 'refused' 
    : 'completed';
```

**Why it's wrong**: Status derivation is business logic. Should be in a `FeedingStatusCalculator` or database function.

#### Proposed Split

```typescript
// Proposed structure (estimate: 7 services)
KennelService                     // 150 lines
HospitalizationService            // 300 lines (core patient management)
VitalsTrackingService             // 150 lines
MedicationAdministrationService   // 200 lines
TreatmentService                  // 150 lines
FeedingService                    // 150 lines
HospitalizationReportingService   // 100 lines
```

**Effort**: 5-6 days (medication tracking is safety-critical)

---

### 4. SafetyService - 1,010 Lines (The Safety Swiss Army Knife)

**File**: `web/lib/services/safety-service.ts`  
**Methods**: 43 public methods  
**Responsibilities**: 3 unrelated domains

#### What It Does

| Domain | Methods | Lines | Should Be |
|--------|---------|-------|-----------|
| Lost Pet Tracking | 7 methods | ~300 | ❌ `LostPetService` |
| Sighting Reports | 5 methods | ~150 | ❌ `SightingService` |
| Match Suggestions | 3 methods | ~100 | ❌ `PetMatchService` |
| Disease Surveillance | 11 methods | ~400 | ❌ `EpidemiologyService` |
| Utility Functions | 2 methods | ~30 | ✅ (private, fine here) |

#### Specific Violations

**1. "Safety" is Not a Bounded Context**
This service combines:
- **Lost pets** (public safety, civilian reporting)
- **Disease tracking** (epidemiology, veterinary surveillance)

**These have ZERO functional overlap.** This is like combining "traffic accidents" and "infectious disease" into one government agency.

**2. Geographic Distance Calculation**
```typescript
// Lines 985-1008: Haversine formula implementation
private calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  // 24 lines of trigonometry
}
```

**Why it's wrong**: This is a utility function used by exactly one method (`listLostPets`). Should be in a `GeoUtils` module, tested independently, and reused across the app.

**3. Manual Report Aggregation**
```typescript
// Lines 919-946: getDiseaseStatsByZone (27 lines)
const zoneStats: Record<string, {...}> = {};

for (const report of data) {
  const zone = report.location_zone || 'Sin zona';
  if (!zoneStats[zone]) { /* initialize */ }
  zoneStats[zone].total_cases += report.case_count;
  zoneStats[zone].diagnoses.add(report.diagnosis_name);
  // ... more aggregation
}
```

**Why it's wrong**: This is a report query. Should be a PostgreSQL function or a materialized view, not JavaScript loops.

#### Proposed Split

```typescript
// Proposed structure (estimate: 4 services)
LostPetService           // 350 lines (reports + sightings + matches)
EpidemiologyService      // 450 lines (disease tracking + analytics)
GeoUtils                 // 50 lines (pure functions, separate module)
```

**Effort**: 3 days (domains are independent)

---

### 5. ConsentService - 971 Lines (The Consent Conglomerate)

**File**: `web/lib/services/consent-service.ts`  
**Methods**: 48 public methods  
**Responsibilities**: 4 domains

#### What It Does

| Domain | Methods | Lines | Should Be |
|--------|---------|-------|-----------|
| Template Management | 9 methods | ~250 | ✅ `ConsentTemplateService` |
| Template Versioning | 3 methods | ~120 | ❌ `ConsentVersionService` |
| Document Lifecycle | 9 methods | ~300 | ✅ `ConsentDocumentService` |
| User Preferences | 8 methods | ~250 | ❌ `ConsentPreferenceService` |
| Audit Logging | 2 methods | ~50 | ❌ (should be utility) |

#### Specific Violations

**1. Template Versioning is Complex**
```typescript
// Lines 386-438: updateTemplate with versioning
if (data.content_html || data.title) {
  // Call RPC to create new version
  const { data: result, error: versionError } = await this.supabase.rpc(
    'create_consent_template_version',
    { p_template_id, p_title, p_content_html, p_change_summary, p_user_id }
  );
}
// Then update metadata fields separately
```

**Why it's better than others**: At least it delegates versioning to a database function. But still, version management could be its own service.

**2. Audit Logging Swallows Errors**
```typescript
// Lines 908-925: logDocumentAction
private async logDocumentAction(...) {
  try {
    await this.supabase.from('consent_audit_log').insert(...);
  } catch (_error: unknown) {
    // Don't fail the main operation if audit logging fails
    logger.error('[Consent] Failed to log consent action', { action });
  }
}
```

**Why it's concerning**: 
- ✅ Good: Doesn't crash on audit failure
- ❌ Bad: Silently loses audit trail
- 🤔 Better: Queue to a dead letter queue for retry

**3. Mixed Concerns in Preferences**
```typescript
// Method 1: hasPreferenceConsent (boolean check)
// Method 2: getUserPreferences (list all)
// Method 3: updatePreference (single update)
// Method 4: updatePreferences (bulk update)
```

This is fine, but could be in a dedicated `ConsentPreferenceService` with caching.

#### Proposed Split

```typescript
// Proposed structure (estimate: 3 services)
ConsentTemplateService     // 350 lines (templates + versions)
ConsentDocumentService     // 350 lines (documents + signing)
ConsentPreferenceService   // 300 lines (user preferences + analytics)
```

**Effort**: 2-3 days (domains are well-separated already)

---

## Cross-Cutting Issues

### 1. Inconsistent Error Handling

**Invoice Service** (Spanish):
```typescript
throw new Error('La factura debe tener al menos un item');
```

**Lab Service** (English):
```typescript
throw new Error('Failed to fetch lab tests');
```

**Hospitalization Service** (Mixed):
```typescript
throw new Error('Order not found'); // English
// vs
'Error al marcar mascota como encontrada' // Spanish
```

**Fix**: Centralize error messages with i18n keys.

---

### 2. Missing Transactions

**Lab Order Creation** (lines 571-631):
```typescript
// Create order
const { data: order } = await this.supabase.from('lab_orders').insert(...);

// Create items (SEPARATE QUERY - NO TRANSACTION!)
await this.supabase.from('lab_order_items').insert(items);
```

**If items insert fails**: Orphaned order exists in database.

**Fix**: Wrap in database transaction or use atomic RPC function.

---

### 3. Business Logic in Services

**Should be in pure functions**:
- Currency rounding (invoice-service)
- Flag calculation (lab-service)
- Status derivation (hospitalization-service)
- Distance calculation (safety-service)

**Why**: Pure functions are:
- Testable without mocking
- Reusable across services
- Cacheable
- Parallelizable

---

### 4. Missing Pagination

**Lab Service** `listTests`:
```typescript
async listTests(tenantId: string, filters?: TestFilters) {
  let query = this.supabase.from('lab_test_catalog').select('*');
  // NO .range() or .limit()
  const { data } = await query;
  return data || [];
}
```

**Risk**: Returns ALL tests in the catalog. Could be 1,000+ rows.

**Fix**: Add pagination to all list methods.

---

## Recommendations

### Immediate (P0 - Within 1 Sprint)

1. **Extract Payment Logic from InvoiceService**
   - Create `PaymentService` with `recordPayment`, `refundPayment`
   - Effort: 1 day
   - Risk: Medium (must preserve transaction boundaries)

2. **Split SafetyService**
   - Create `LostPetService` and `EpidemiologyService`
   - Effort: 2 days
   - Risk: Low (domains are independent)

3. **Add Pagination to All List Methods**
   - Default: 20 items per page
   - Effort: 0.5 days
   - Risk: Low

### Short-Term (P1 - Within 2 Sprints)

4. **Extract Kennel Management from HospitalizationService**
   - Create standalone `KennelService`
   - Effort: 1 day
   - Risk: Low

5. **Create Pure Function Utilities**
   - `InvoiceCalculator.ts`: roundCurrency, calculateTax, calculateTotal
   - `LabResultValidator.ts`: isAbnormal, calculateFlag
   - `GeoUtils.ts`: calculateDistance, getBoundsFromRadius
   - Effort: 1 day
   - Risk: None (no state changes)

6. **Wrap Multi-Step Operations in Transactions**
   - Invoice creation + items
   - Lab order creation + items
   - Hospitalization admission + initial vitals
   - Effort: 2 days
   - Risk: Medium (requires testing)

### Long-Term (P2 - Within Quarter)

7. **Full Service Layer Refactoring**
   - Follow proposed splits for all 5 mega-services
   - Estimated services after refactor: **25 services** (from 24)
   - Effort: 15-20 days
   - Risk: High (requires comprehensive testing)

8. **Introduce Service Layer Testing**
   - Unit tests for pure functions (80%+ coverage)
   - Integration tests for services (60%+ coverage)
   - Effort: 10 days
   - Risk: Low (improves stability)

9. **Create Domain Layer Documentation**
   - Bounded context map
   - Service dependency diagram
   - API contracts (input/output types)
   - Effort: 3 days
   - Risk: None

---

## Comparison: Before vs. After Refactoring

### Current State (Bad)

```
InvoiceService (1,114 lines)
  ├─ Invoice CRUD
  ├─ Payment Processing
  ├─ Refund Handling
  ├─ Status Management
  ├─ Revenue Analytics
  └─ Currency Math
```

**Problems**:
- Hard to test (mock 6 domains)
- Hard to reuse (payments tied to invoices)
- Hard to scale (one file, one transaction pool)
- Hard to understand (26 methods in one class)

### Proposed State (Good)

```
InvoiceService (300 lines)
  └─ Invoice CRUD only

PaymentService (250 lines)
  ├─ Payment Processing
  └─ Refund Handling

InvoiceStateService (200 lines)
  └─ Status Transitions (draft → sent → paid)

InvoiceReportingService (200 lines)
  ├─ Revenue Analytics
  └─ Overdue Queries

InvoiceCalculator (100 lines, pure functions)
  ├─ roundCurrency
  ├─ calculateTax
  └─ calculateTotal
```

**Benefits**:
- ✅ Each service has 5-8 methods (manageable)
- ✅ Pure functions are reusable
- ✅ Easy to test (mock one domain at a time)
- ✅ Clear boundaries (single responsibility)
- ✅ Can scale independently (different connection pools)

---

## Estimated Refactoring Effort

| Service | Current LOC | Proposed Services | New LOC | Effort (Days) | Risk |
|---------|-------------|-------------------|---------|---------------|------|
| InvoiceService | 1,114 | 5 services | 1,050 | 3-4 | Medium |
| LabService | 1,077 | 5 services | 1,100 | 4-5 | Medium |
| HospitalizationService | 1,061 | 7 services | 1,200 | 5-6 | High |
| SafetyService | 1,010 | 2 services + util | 850 | 3 | Low |
| ConsentService | 971 | 3 services | 1,000 | 2-3 | Low |
| **Total** | **5,233** | **22 new services** | **5,200** | **17-21 days** | - |

**Note**: Line count remains similar because we're reorganizing, not rewriting. The value is in **separation of concerns**.

---

## Conclusion

The Vete services layer suffers from **god object syndrome**. Five mega-services handle responsibilities that should be distributed across 20+ focused services. This creates:

1. **Maintenance burden**: Changing payment logic requires touching invoice service
2. **Testing complexity**: Mocking 7 domains to test one method
3. **Reusability problems**: Can't use payment logic without invoice dependency
4. **Cognitive load**: 1,000+ line files are hard to navigate

**The fix**: Systematic refactoring following domain-driven design principles. Each service should manage one bounded context.

**Priority**: Start with low-risk extractions (SafetyService split, KennelService extraction) to build confidence, then tackle the complex domains (Invoice, Lab, Hospitalization).

---

**Next Step**: Component Architecture Analysis (674 components across 46 directories)
