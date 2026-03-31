# API Endpoints Test Plan

> **Area**: REST API endpoints  
> **Endpoints**: 83 API routes  
> **Priority**: Critical (all endpoints must be tested)

---

## Overview

### Scope
All API endpoints under `/api/*` routes.

### Test Coverage Goals
- **Integration Tests**: 100% (all endpoints)
- **Unit Tests**: 80% (request/response validation)
- **Security Tests**: 100% (authentication, authorization, RLS)

---

## Test Areas

### 1. Authentication & Authorization

#### Test Cases for All Endpoints

**1.1 Authentication**
- ✅ Unauthenticated requests return 401
- ✅ Invalid tokens return 401
- ✅ Expired tokens return 401
- ✅ Valid tokens allow access

**1.2 Authorization**
- ✅ Owner role access restrictions
- ✅ Vet role access restrictions
- ✅ Admin role access restrictions
- ✅ Cross-role access prevention

**1.3 Multi-Tenant Isolation**
- ✅ Tenant data isolation enforced
- ✅ Cross-tenant access prevented
- ✅ Tenant ID validation
- ✅ RLS policies enforced

**Test Files**:
- `tests/security/auth-security.test.ts`
- `tests/security/rls-policies.test.ts`
- `tests/security/tenant-isolation.test.ts`

---

### 2. Pets API (`/api/pets`)

#### 2.1 GET `/api/pets`

**Test Cases**:
- ✅ Returns user's pets (owner)
- ✅ Returns all pets (vet/admin)
- ✅ Filters by tenant
- ✅ Pagination works
- ✅ Sorting works
- ✅ Search works
- ✅ Empty result handling
- ✅ Error handling

**Test Files**:
- `tests/api/pets.test.ts`
- `tests/integration/pets/crud.test.ts`

#### 2.2 GET `/api/pets/[id]`

**Test Cases**:
- ✅ Returns pet details
- ✅ 404 for non-existent pet
- ✅ 403 for other user's pet (owner)
- ✅ Access allowed for vet/admin
- ✅ Tenant isolation

**Test Files**:
- `tests/api/pets.test.ts`

#### 2.3 POST `/api/pets`

**Test Cases**:
- ✅ Creates pet with valid data
- ✅ Validation errors return 400
- ✅ Required fields enforced
- ✅ Tenant ID set automatically
- ✅ Owner ID set from auth
- ✅ Returns created pet

**Test Files**:
- `tests/api/pets.test.ts`
- `tests/integration/pets/crud.test.ts`

#### 2.4 PUT `/api/pets/[id]`

**Test Cases**:
- ✅ Updates pet with valid data
- ✅ Validation errors return 400
- ✅ 404 for non-existent pet
- ✅ 403 for other user's pet (owner)
- ✅ Returns updated pet

**Test Files**:
- `tests/api/pets.test.ts`

#### 2.5 DELETE `/api/pets/[id]`

**Test Cases**:
- ✅ Deletes pet
- ✅ 404 for non-existent pet
- ✅ 403 for other user's pet (owner)
- ✅ Cascade deletion handled
- ✅ Returns 204 on success

**Test Files**:
- `tests/api/pets.test.ts`

#### 2.6 GET `/api/pets/[id]/qr`

**Test Cases**:
- ✅ Returns QR code image
- ✅ QR code contains pet ID
- ✅ QR code scannable
- ✅ 404 for non-existent pet

**Test Files**:
- `tests/api/pets.test.ts`

---

### 3. Appointments API

#### 3.1 GET `/api/appointments`

**Test Cases**:
- ✅ Returns appointments
- ✅ Filters by date
- ✅ Filters by status
- ✅ Filters by veterinarian
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/appointments.test.ts`

#### 3.2 GET `/api/appointments/[id]`

**Test Cases**:
- ✅ Returns appointment details
- ✅ 404 for non-existent appointment
- ✅ Tenant isolation

**Test Files**:
- `tests/api/appointments.test.ts`

#### 3.3 POST `/api/appointments`

**Test Cases**:
- ✅ Creates appointment
- ✅ Slot availability validation
- ✅ Double-booking prevention
- ✅ Validation errors return 400
- ✅ Returns created appointment

**Test Files**:
- `tests/api/appointments.test.ts`
- `tests/integration/booking/appointments.test.ts`

#### 3.4 PUT `/api/appointments/[id]`

**Test Cases**:
- ✅ Updates appointment
- ✅ Status transition validation
- ✅ Validation errors return 400
- ✅ Returns updated appointment

**Test Files**:
- `tests/api/appointments.test.ts`

#### 3.5 POST `/api/appointments/[id]/check-in`

**Test Cases**:
- ✅ Marks appointment as checked-in
- ✅ Records arrival timestamp
- ✅ Updates status
- ✅ 404 for non-existent appointment

**Test Files**:
- `tests/api/appointments.test.ts`
- `tests/integration/booking/check-in.test.ts`

#### 3.6 POST `/api/appointments/[id]/complete`

**Test Cases**:
- ✅ Marks appointment as completed
- ✅ Records completion timestamp
- ✅ Updates status
- ✅ 404 for non-existent appointment

**Test Files**:
- `tests/api/appointments.test.ts`

#### 3.7 GET `/api/appointments/slots`

**Test Cases**:
- ✅ Returns available slots
- ✅ Filters by date
- ✅ Filters by service
- ✅ Excludes booked slots
- ✅ Excludes past slots
- ✅ Returns empty array if no slots

**Test Files**:
- `tests/api/appointments.test.ts`
- `tests/integration/booking/slots.test.ts`

#### 3.8 POST `/api/booking`

**Test Cases**:
- ✅ Creates booking
- ✅ Validates slot availability
- ✅ Creates appointment
- ✅ Sends confirmation email
- ✅ Returns booking details

**Test Files**:
- `tests/api/booking.test.ts`
- `tests/integration/booking/appointments.test.ts`

---

### 4. Invoices API (`/api/invoices`)

#### 4.1 GET `/api/invoices`

**Test Cases**:
- ✅ Returns invoices
- ✅ Filters by status
- ✅ Filters by date range
- ✅ Filters by client
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/invoices.test.ts`

#### 4.2 GET `/api/invoices/[id]`

**Test Cases**:
- ✅ Returns invoice details
- ✅ Includes line items
- ✅ Includes payments
- ✅ 404 for non-existent invoice

**Test Files**:
- `tests/api/invoices.test.ts`

#### 4.3 POST `/api/invoices`

**Test Cases**:
- ✅ Creates invoice
- ✅ Calculates totals correctly
- ✅ Validation errors return 400
- ✅ Returns created invoice

**Test Files**:
- `tests/api/invoices.test.ts`
- `tests/integration/invoices/crud.test.ts`

#### 4.4 PUT `/api/invoices/[id]`

**Test Cases**:
- ✅ Updates invoice
- ✅ Recalculates totals
- ✅ Validation errors return 400
- ✅ Returns updated invoice

**Test Files**:
- `tests/api/invoices.test.ts`

#### 4.5 POST `/api/invoices/[id]/send`

**Test Cases**:
- ✅ Sends invoice email
- ✅ Updates status to "Enviada"
- ✅ Records sent timestamp
- ✅ Email delivery confirmation

**Test Files**:
- `tests/api/invoices.test.ts`
- `tests/integration/invoices/send.test.ts`

#### 4.6 POST `/api/invoices/[id]/payments`

**Test Cases**:
- ✅ Records payment
- ✅ Updates invoice status
- ✅ Handles partial payments
- ✅ Handles overpayments
- ✅ Validation errors return 400

**Test Files**:
- `tests/api/invoices.test.ts`
- `tests/integration/invoices/payments.test.ts`

#### 4.7 POST `/api/invoices/[id]/refund`

**Test Cases**:
- ✅ Processes refund
- ✅ Updates invoice status
- ✅ Records refund amount
- ✅ Validation errors return 400

**Test Files**:
- `tests/api/invoices.test.ts`
- `tests/integration/invoices/refund.test.ts`

---

### 5. Inventory API (`/api/inventory`)

#### 5.1 GET `/api/inventory`

**Test Cases**:
- ✅ Returns inventory items
- ✅ Filters by category
- ✅ Filters by stock level
- ✅ Search works
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/inventory.test.ts`
- `tests/integration/inventory/crud.test.ts`

#### 5.2 POST `/api/inventory`

**Test Cases**:
- ✅ Creates inventory item
- ✅ Validation errors return 400
- ✅ Returns created item

**Test Files**:
- `tests/api/inventory.test.ts`

#### 5.3 PUT `/api/inventory/[id]`

**Test Cases**:
- ✅ Updates inventory item
- ✅ Stock level updates
- ✅ Validation errors return 400

**Test Files**:
- `tests/api/inventory.test.ts`

#### 5.4 GET `/api/inventory/alerts`

**Test Cases**:
- ✅ Returns low stock alerts
- ✅ Filters by threshold
- ✅ Tenant isolation

**Test Files**:
- `tests/api/inventory.test.ts`
- `tests/integration/inventory/alerts.test.ts`

#### 5.5 POST `/api/inventory/import`

**Test Cases**:
- ✅ Imports inventory from CSV
- ✅ Validates CSV format
- ✅ Creates/updates items
- ✅ Returns import results
- ✅ Error handling for invalid data

**Test Files**:
- `tests/api/inventory.test.ts`
- `tests/integration/inventory/import-export.test.ts`

#### 5.6 GET `/api/inventory/export`

**Test Cases**:
- ✅ Exports inventory to CSV
- ✅ Includes all fields
- ✅ Tenant isolation
- ✅ File download works

**Test Files**:
- `tests/api/inventory.test.ts`
- `tests/integration/inventory/import-export.test.ts`

#### 5.7 GET `/api/inventory/stats`

**Test Cases**:
- ✅ Returns inventory statistics
- ✅ Total items count
- ✅ Low stock count
- ✅ Out of stock count
- ✅ Value calculations

**Test Files**:
- `tests/api/inventory.test.ts`

---

### 6. Store API (`/api/store`)

#### 6.1 GET `/api/store/products`

**Test Cases**:
- ✅ Returns products
- ✅ Filters by category
- ✅ Filters by species
- ✅ Search works
- ✅ Pagination works
- ✅ Stock availability included
- ✅ Tenant isolation

**Test Files**:
- `tests/api/store.test.ts`

#### 6.2 GET `/api/store/products/[id]`

**Test Cases**:
- ✅ Returns product details
- ✅ Stock level included
- ✅ 404 for non-existent product

**Test Files**:
- `tests/api/store.test.ts`

#### 6.3 GET `/api/store/categories`

**Test Cases**:
- ✅ Returns product categories
- ✅ Tenant isolation

**Test Files**:
- `tests/api/store.test.ts`

#### 6.4 POST `/api/store/checkout`

**Test Cases**:
- ✅ Processes checkout
- ✅ Validates cart
- ✅ Validates stock
- ✅ Creates order
- ✅ Deducts inventory
- ✅ Processes payment
- ✅ Sends confirmation email
- ✅ Returns order details

**Test Files**:
- `tests/api/store.test.ts`
- `tests/integration/store/checkout.test.ts`

#### 6.5 GET `/api/store/orders`

**Test Cases**:
- ✅ Returns user's orders
- ✅ Filters by status
- ✅ Filters by date
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/store.test.ts`

#### 6.6 GET `/api/store/search`

**Test Cases**:
- ✅ Searches products
- ✅ Returns relevant results
- ✅ Highlights matches
- ✅ Empty results handled

**Test Files**:
- `tests/api/store.test.ts`

---

### 7. Clinical Tools API

#### 7.1 GET `/api/drug_dosages`

**Test Cases**:
- ✅ Returns drug dosages
- ✅ Filters by drug name
- ✅ Filters by species
- ✅ Calculates dosage by weight
- ✅ Returns correct units
- ✅ Validation errors return 400

**Test Files**:
- `tests/api/dosages.test.ts`
- `tests/functionality/clinical/drug-dosages.test.ts`

#### 7.2 GET `/api/diagnosis_codes`

**Test Cases**:
- ✅ Returns diagnosis codes
- ✅ Searches by code
- ✅ Searches by description
- ✅ Filters by system (VeNom/SNOMED)
- ✅ Pagination works

**Test Files**:
- `tests/api/diagnosis-codes.test.ts`

#### 7.3 GET `/api/growth_charts`

**Test Cases**:
- ✅ Returns growth chart data
- ✅ Filters by species
- ✅ Filters by gender
- ✅ Calculates percentiles
- ✅ Returns chart data points

**Test Files**:
- `tests/api/growth-charts.test.ts`

#### 7.4 GET `/api/growth_standards`

**Test Cases**:
- ✅ Returns growth standards
- ✅ Filters by species
- ✅ Returns percentile data

**Test Files**:
- `tests/api/growth-standards.test.ts`

---

### 8. Vaccines API

#### 8.1 GET `/api/vaccines`

**Test Cases**:
- ✅ Returns vaccines for pet
- ✅ Filters by pet ID
- ✅ Filters by status
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/vaccines.test.ts`
- `tests/integration/pets/vaccines.test.ts`

#### 8.2 POST `/api/vaccines`

**Test Cases**:
- ✅ Creates vaccine record
- ✅ Calculates next due date
- ✅ Validation errors return 400
- ✅ Returns created vaccine

**Test Files**:
- `tests/api/vaccines.test.ts`

#### 8.3 GET `/api/dashboard/vaccines`

**Test Cases**:
- ✅ Returns upcoming vaccines
- ✅ Filters by date range
- ✅ Returns overdue vaccines
- ✅ Tenant isolation

**Test Files**:
- `tests/api/dashboard.test.ts`

#### 8.4 GET `/api/vaccine_reactions`

**Test Cases**:
- ✅ Returns vaccine reactions
- ✅ Filters by vaccine type
- ✅ Filters by severity
- ✅ Search works

**Test Files**:
- `tests/api/vaccine-reactions.test.ts`

#### 8.5 POST `/api/vaccine_reactions/check`

**Test Cases**:
- ✅ Checks for vaccine reactions
- ✅ Returns risk assessment
- ✅ Validation errors return 400

**Test Files**:
- `tests/api/vaccine-reactions.test.ts`

---

### 9. Prescriptions API (`/api/prescriptions`)

#### 9.1 GET `/api/prescriptions`

**Test Cases**:
- ✅ Returns prescriptions
- ✅ Filters by pet ID
- ✅ Filters by status
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/prescriptions.test.ts`
- `tests/integration/prescriptions/crud.test.ts`

#### 9.2 POST `/api/prescriptions`

**Test Cases**:
- ✅ Creates prescription
- ✅ Validation errors return 400
- ✅ Returns created prescription

**Test Files**:
- `tests/api/prescriptions.test.ts`

---

### 10. Medical Records API

#### 10.1 GET `/api/medical-records`

**Test Cases**:
- ✅ Returns medical records
- ✅ Filters by pet ID
- ✅ Filters by date range
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/medical-records.test.ts`
- `tests/integration/medical-records/crud.test.ts`

#### 10.2 POST `/api/medical-records`

**Test Cases**:
- ✅ Creates medical record
- ✅ Validation errors return 400
- ✅ Returns created record

**Test Files**:
- `tests/api/medical-records.test.ts`

---

### 11. Dashboard API (`/api/dashboard`)

#### 11.1 GET `/api/dashboard/stats`

**Test Cases**:
- ✅ Returns dashboard statistics
- ✅ Total pets count
- ✅ Today's appointments count
- ✅ Pending vaccines count
- ✅ Unpaid invoices count
- ✅ Calculations accurate
- ✅ Tenant isolation

**Test Files**:
- `tests/api/dashboard.test.ts`
- `tests/integration/dashboard/stats.test.ts`

#### 11.2 GET `/api/dashboard/appointments`

**Test Cases**:
- ✅ Returns today's appointments
- ✅ Filters by status
- ✅ Sorted by time
- ✅ Tenant isolation

**Test Files**:
- `tests/api/dashboard.test.ts`

#### 11.3 GET `/api/dashboard/revenue`

**Test Cases**:
- ✅ Returns revenue data
- ✅ Filters by date range
- ✅ Groups by period
- ✅ Calculations accurate
- ✅ Tenant isolation

**Test Files**:
- `tests/api/dashboard.test.ts`

#### 11.4 GET `/api/dashboard/inventory-alerts`

**Test Cases**:
- ✅ Returns low stock alerts
- ✅ Filters by threshold
- ✅ Tenant isolation

**Test Files**:
- `tests/api/dashboard.test.ts`

#### 11.5 GET `/api/dashboard/time-off`

**Test Cases**:
- ✅ Returns time off requests
- ✅ Filters by status
- ✅ Filters by staff
- ✅ Tenant isolation

**Test Files**:
- `tests/api/dashboard.test.ts`

---

### 12. Finance API (`/api/finance`)

#### 12.1 GET `/api/finance/expenses`

**Test Cases**:
- ✅ Returns expenses
- ✅ Filters by category
- ✅ Filters by date range
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/finance.test.ts`
- `tests/integration/finance/expenses.test.ts`

#### 12.2 POST `/api/finance/expenses`

**Test Cases**:
- ✅ Creates expense
- ✅ Validation errors return 400
- ✅ Returns created expense

**Test Files**:
- `tests/api/finance.test.ts`

#### 12.3 GET `/api/finance/pl`

**Test Cases**:
- ✅ Returns P&L report
- ✅ Revenue calculations
- ✅ Expense calculations
- ✅ Profit calculations
- ✅ Date range filtering
- ✅ Tenant isolation

**Test Files**:
- `tests/api/finance.test.ts`
- `tests/integration/finance/pl.test.ts`

---

### 13. Search API (`/api/search`)

#### 13.1 GET `/api/search`

**Test Cases**:
- ✅ Searches across entities
- ✅ Returns relevant results
- ✅ Groups by entity type
- ✅ Pagination works
- ✅ Tenant isolation

**Test Files**:
- `tests/api/search.test.ts`

---

### 14. Rate Limiting

#### Test Cases for All Endpoints

**14.1 Rate Limiting**
- ✅ Rate limits enforced
- ✅ Rate limit headers present
- ✅ 429 status on limit exceeded
- ✅ Rate limit resets correctly

**Test Files**:
- `tests/security/rate-limiting.test.ts`
- `tests/unit/lib/rate-limit.test.ts`

---

### 15. Error Handling

#### Test Cases for All Endpoints

**15.1 Error Responses**
- ✅ 400 for validation errors
- ✅ 401 for authentication errors
- ✅ 403 for authorization errors
- ✅ 404 for not found
- ✅ 429 for rate limit exceeded
- ✅ 500 for server errors
- ✅ Error messages in Spanish
- ✅ Error format consistent

**Test Files**:
- `tests/api/error-handling.test.ts`

---

## Test Implementation Priority

### Phase 1 (Critical - Week 1-2)
1. Authentication & Authorization
2. Pets API
3. Appointments API
4. Invoices API

### Phase 2 (High - Week 3-4)
5. Inventory API
6. Store API
7. Dashboard API
8. Clinical Tools API

### Phase 3 (Medium - Week 5+)
9. Vaccines API
10. Prescriptions API
11. Medical Records API
12. Finance API
13. Search API

---

## Test Files Summary

| Test Type | Files | Coverage |
|-----------|-------|----------|
| **API Tests** | 25 files | All endpoints |
| **Integration** | 20 files | Critical flows |
| **Security** | 5 files | Auth & RLS |
| **Total** | **50 files** | **100% endpoints** |

---

*Last Updated: December 2024*

