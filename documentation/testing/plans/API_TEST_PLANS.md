# API Endpoint Test Plans

Complete test plans for all 83 API endpoints in the Vete platform.

## Table of Contents

1. [Pets API](#pets-api)
2. [Appointments API](#appointments-api)
3. [Booking API](#booking-api)
4. [Invoices API](#invoices-api)
5. [Prescriptions API](#prescriptions-api)
6. [Inventory API](#inventory-api)
7. [Store API](#store-api)
8. [Clients API](#clients-api)
9. [Dashboard API](#dashboard-api)
10. [Clinical Tools API](#clinical-tools-api)
11. [Communication API](#communication-api)
12. [Settings API](#settings-api)
13. [Other APIs](#other-apis)

---

## Pets API

### Endpoint: `GET /api/pets/[id]`

**Test Coverage Required:**

#### Unit Tests
- [ ] Response formatting
- [ ] Error message formatting

#### Integration Tests
- [ ] Pet data returned correctly
- [ ] Pet photo URL included
- [ ] Pet relationships included (owner, vaccines, records)
- [ ] 404 for non-existent pet
- [ ] Access control (owner/vet/admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/pets/123` → 200 → Pet data
2. **Not Found:** GET `/api/pets/999` → 404
3. **Unauthorized:** GET without auth → 401
4. **Wrong Tenant:** GET other clinic's pet → 403

**Test Data:**
- Valid pet IDs
- Non-existent pet IDs
- Pets from different tenants

---

### Endpoint: `GET /api/pets/[id]/qr`

**Test Coverage Required:**

#### Integration Tests
- [ ] QR code generated
- [ ] QR code contains correct data
- [ ] QR code format correct
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/pets/123/qr` → 200 → QR code image
2. **Not Found:** GET `/api/pets/999/qr` → 404

**Test Data:**
- Valid pet IDs

---

## Appointments API

### Endpoint: `GET /api/appointments/slots`

**Test Coverage Required:**

#### Unit Tests
- [ ] Date validation
- [ ] Time slot generation
- [ ] Business hours filtering
- [ ] Booked slot exclusion

#### Integration Tests
- [ ] Available slots returned
- [ ] Booked slots excluded
- [ ] Business hours respected
- [ ] Date parameter validation
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/appointments/slots?date=2024-12-20` → 200 → Available slots
2. **Invalid Date:** GET `/api/appointments/slots?date=invalid` → 400
3. **Past Date:** GET `/api/appointments/slots?date=2020-01-01` → 400

**Test Data:**
- Valid dates
- Dates with bookings
- Past dates
- Future dates

---

### Endpoint: `POST /api/appointments/[id]/check-in`

**Test Coverage Required:**

#### Integration Tests
- [ ] Appointment checked in
- [ ] Status updated
- [ ] Timestamp recorded
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST `/api/appointments/123/check-in` → 200 → Status updated
2. **Not Found:** POST `/api/appointments/999/check-in` → 404
3. **Unauthorized:** POST without staff role → 403
4. **Already Checked In:** POST already checked-in → 400

**Test Data:**
- Valid appointment IDs
- Appointments in various states

---

### Endpoint: `POST /api/appointments/[id]/complete`

**Test Coverage Required:**

#### Integration Tests
- [ ] Appointment completed
- [ ] Status updated
- [ ] Completion notes saved
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST `/api/appointments/123/complete` → 200 → Status updated
2. **With Notes:** POST with notes → Notes saved
3. **Not Found:** POST `/api/appointments/999/complete` → 404

**Test Data:**
- Valid appointment IDs
- Completion notes

---

## Booking API

### Endpoint: `POST /api/booking`

**Test Coverage Required:**

#### Unit Tests
- [ ] Request validation
- [ ] Date/time validation
- [ ] Slot availability check

#### Integration Tests
- [ ] Appointment created
- [ ] Slot marked as booked
- [ ] Email confirmation sent
- [ ] Request validation
- [ ] Slot availability validated
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST with valid data → 201 → Appointment created
2. **Invalid Data:** POST with missing fields → 400
3. **Slot Unavailable:** POST with booked slot → 409
4. **Past Date:** POST with past date → 400

**Test Data:**
- Valid booking data
- Invalid booking data
- Booked slots

---

## Invoices API

### Endpoint: `GET /api/invoices`

**Test Coverage Required:**

#### Integration Tests
- [ ] Invoices returned
- [ ] Filtering works (status, date, client)
- [ ] Sorting works
- [ ] Pagination works
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/invoices` → 200 → Invoice list
2. **Filtered:** GET `/api/invoices?status=paid` → Filtered results
3. **Paginated:** GET `/api/invoices?page=2&limit=10` → Paginated results

**Test Data:**
- Invoices in various states
- Filters
- Pagination parameters

---

### Endpoint: `GET /api/invoices/[id]`

**Test Coverage Required:**

#### Integration Tests
- [ ] Invoice data returned
- [ ] Line items included
- [ ] Payment history included
- [ ] 404 for non-existent
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/invoices/123` → 200 → Invoice data
2. **Not Found:** GET `/api/invoices/999` → 404

**Test Data:**
- Valid invoice IDs
- Non-existent invoice IDs

---

### Endpoint: `POST /api/invoices`

**Test Coverage Required:**

#### Integration Tests
- [ ] Invoice created
- [ ] Line items saved
- [ ] Calculations correct
- [ ] Invoice number generated
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST with valid data → 201 → Invoice created
2. **Invalid Data:** POST with missing fields → 400
3. **Invalid Calculations:** POST with wrong totals → 400

**Test Data:**
- Valid invoice data
- Invalid invoice data

---

### Endpoint: `POST /api/invoices/[id]/send`

**Test Coverage Required:**

#### Integration Tests
- [ ] Email sent
- [ ] Invoice status updated
- [ ] Email template used
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST `/api/invoices/123/send` → 200 → Email sent
2. **No Email:** POST invoice without client email → 400

**Test Data:**
- Invoices with emails
- Invoices without emails

---

### Endpoint: `POST /api/invoices/[id]/payments`

**Test Coverage Required:**

#### Integration Tests
- [ ] Payment recorded
- [ ] Invoice status updated
- [ ] Payment history updated
- [ ] Amount validation
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST payment → 201 → Payment recorded
2. **Exceeds Total:** POST payment exceeding invoice → 400
3. **Invalid Amount:** POST negative amount → 400

**Test Data:**
- Valid payment amounts
- Invalid payment amounts

---

### Endpoint: `POST /api/invoices/[id]/refund`

**Test Coverage Required:**

#### Integration Tests
- [ ] Refund processed
- [ ] Invoice status updated
- [ ] Refund amount validated
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST refund → 200 → Refund processed
2. **Exceeds Payment:** POST refund exceeding payments → 400

**Test Data:**
- Valid refund amounts
- Invalid refund amounts

---

## Prescriptions API

### Endpoint: `GET /api/prescriptions`

**Test Coverage Required:**

#### Integration Tests
- [ ] Prescriptions returned
- [ ] Filtering works (pet, vet, date)
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/prescriptions` → 200 → Prescription list
2. **Filtered:** GET `/api/prescriptions?petId=123` → Filtered results

**Test Data:**
- Prescriptions
- Filters

---

### Endpoint: `POST /api/prescriptions`

**Test Coverage Required:**

#### Integration Tests
- [ ] Prescription created
- [ ] Dosage calculated
- [ ] PDF generated
- [ ] Access control (vet/admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST with valid data → 201 → Prescription created
2. **Invalid Data:** POST with missing fields → 400

**Test Data:**
- Valid prescription data
- Invalid prescription data

---

## Inventory API

### Endpoint: `GET /api/inventory/stats`

**Test Coverage Required:**

#### Integration Tests
- [ ] Stats returned
- [ ] Low stock items included
- [ ] Calculations correct
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/inventory/stats` → 200 → Stats data

**Test Data:**
- Inventory data

---

### Endpoint: `GET /api/inventory/alerts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Low stock alerts returned
- [ ] Threshold respected
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/inventory/alerts` → 200 → Alert list

**Test Data:**
- Products with low stock

---

### Endpoint: `POST /api/inventory/import`

**Test Coverage Required:**

#### Integration Tests
- [ ] CSV parsed
- [ ] Products imported
- [ ] Validation errors returned
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST CSV file → 200 → Products imported
2. **Invalid CSV:** POST invalid format → 400
3. **Validation Errors:** POST with invalid data → 400 → Error list

**Test Data:**
- Valid CSV files
- Invalid CSV files

---

### Endpoint: `GET /api/inventory/export`

**Test Coverage Required:**

#### Integration Tests
- [ ] CSV generated
- [ ] All products included
- [ ] Format correct
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/inventory/export` → 200 → CSV file

**Test Data:**
- Inventory data

---

## Store API

### Endpoint: `GET /api/store/products`

**Test Coverage Required:**

#### Integration Tests
- [ ] Products returned
- [ ] Filtering works (category, search)
- [ ] Stock status included
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/store/products` → 200 → Product list
2. **Filtered:** GET `/api/store/products?category=food` → Filtered results
3. **Search:** GET `/api/store/products?search=dog` → Search results

**Test Data:**
- Products
- Categories
- Search terms

---

### Endpoint: `GET /api/store/products/[id]`

**Test Coverage Required:**

#### Integration Tests
- [ ] Product data returned
- [ ] Stock status included
- [ ] 404 for non-existent
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/store/products/123` → 200 → Product data
2. **Not Found:** GET `/api/store/products/999` → 404

**Test Data:**
- Valid product IDs
- Non-existent product IDs

---

### Endpoint: `POST /api/store/checkout`

**Test Coverage Required:**

#### Integration Tests
- [ ] Order created
- [ ] Stock decremented
- [ ] Order confirmation sent
- [ ] Validation works
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST with valid data → 201 → Order created
2. **Out of Stock:** POST with out-of-stock item → 400
3. **Invalid Data:** POST with missing fields → 400

**Test Data:**
- Valid checkout data
- Out-of-stock items
- Invalid data

---

## Clients API

### Endpoint: `GET /api/clients`

**Test Coverage Required:**

#### Integration Tests
- [ ] Clients returned
- [ ] Filtering works
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/clients` → 200 → Client list
2. **Filtered:** GET `/api/clients?search=john` → Filtered results

**Test Data:**
- Clients
- Search terms

---

### Endpoint: `GET /api/clients/[id]`

**Test Coverage Required:**

#### Integration Tests
- [ ] Client data returned
- [ ] Pets included
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/clients/123` → 200 → Client data
2. **Not Found:** GET `/api/clients/999` → 404

**Test Data:**
- Valid client IDs
- Non-existent client IDs

---

### Endpoint: `GET /api/clients/[id]/loyalty`

**Test Coverage Required:**

#### Integration Tests
- [ ] Loyalty points returned
- [ ] Transaction history included
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/clients/123/loyalty` → 200 → Loyalty data

**Test Data:**
- Client IDs with loyalty points

---

## Dashboard API

### Endpoint: `GET /api/dashboard/stats`

**Test Coverage Required:**

#### Integration Tests
- [ ] Stats returned
- [ ] Calculations correct
- [ ] Date range filtering works
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/dashboard/stats` → 200 → Stats data
2. **Date Range:** GET `/api/dashboard/stats?start=2024-01-01&end=2024-12-31` → Filtered stats

**Test Data:**
- Dashboard data
- Date ranges

---

### Endpoint: `GET /api/dashboard/appointments`

**Test Coverage Required:**

#### Integration Tests
- [ ] Appointments returned
- [ ] Date filtering works
- [ ] Status filtering works
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/dashboard/appointments` → 200 → Appointment list
2. **Today:** GET `/api/dashboard/appointments?date=today` → Today's appointments

**Test Data:**
- Appointments
- Dates

---

### Endpoint: `GET /api/dashboard/revenue`

**Test Coverage Required:**

#### Integration Tests
- [ ] Revenue data returned
- [ ] Date range filtering works
- [ ] Calculations correct
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/dashboard/revenue` → 200 → Revenue data
2. **Date Range:** GET with date range → Filtered revenue

**Test Data:**
- Revenue data
- Date ranges

---

### Endpoint: `GET /api/dashboard/vaccines`

**Test Coverage Required:**

#### Integration Tests
- [ ] Upcoming vaccines returned
- [ ] Date filtering works
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/dashboard/vaccines` → 200 → Vaccine list
2. **Upcoming:** GET `/api/dashboard/vaccines?upcoming=true` → Upcoming vaccines

**Test Data:**
- Vaccines
- Dates

---

## Clinical Tools API

### Endpoint: `GET /api/drug_dosages`

**Test Coverage Required:**

#### Integration Tests
- [ ] Drug dosages returned
- [ ] Filtering works (species, route)
- [ ] Search works
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/drug_dosages` → 200 → Drug list
2. **Filtered:** GET `/api/drug_dosages?species=dog` → Filtered results
3. **Search:** GET `/api/drug_dosages?search=amoxicillin` → Search results

**Test Data:**
- Drug database
- Filters
- Search terms

---

### Endpoint: `GET /api/diagnosis_codes`

**Test Coverage Required:**

#### Integration Tests
- [ ] Diagnosis codes returned
- [ ] Search works
- [ ] Category filtering works
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/diagnosis_codes` → 200 → Code list
2. **Search:** GET `/api/diagnosis_codes?search=fever` → Search results

**Test Data:**
- Diagnosis codes
- Search terms

---

### Endpoint: `GET /api/growth_charts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Growth charts returned
- [ ] Species filtering works
- [ ] Breed filtering works
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/growth_charts` → 200 → Chart data
2. **Filtered:** GET `/api/growth_charts?species=dog&breed=labrador` → Filtered charts

**Test Data:**
- Growth chart data
- Species
- Breeds

---

### Endpoint: `GET /api/vaccine_reactions`

**Test Coverage Required:**

#### Integration Tests
- [ ] Vaccine reactions returned
- [ ] Vaccine type filtering works
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/vaccine_reactions` → 200 → Reaction list
2. **Filtered:** GET `/api/vaccine_reactions?vaccine=rabies` → Filtered results

**Test Data:**
- Vaccine reactions
- Vaccine types

---

## Communication API

### Endpoint: `GET /api/whatsapp`

**Test Coverage Required:**

#### Integration Tests
- [ ] Conversations returned
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/whatsapp` → 200 → Conversation list

**Test Data:**
- Conversations

---

### Endpoint: `POST /api/whatsapp/send`

**Test Coverage Required:**

#### Integration Tests
- [ ] Message sent
- [ ] Template used correctly
- [ ] Variables replaced
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST message → 200 → Message sent
2. **Template:** POST with template → Variables replaced → Message sent

**Test Data:**
- Messages
- Templates
- Phone numbers

---

### Endpoint: `GET /api/whatsapp/templates`

**Test Coverage Required:**

#### Integration Tests
- [ ] Templates returned
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/whatsapp/templates` → 200 → Template list

**Test Data:**
- Templates

---

## Settings API

### Endpoint: `GET /api/settings/general`

**Test Coverage Required:**

#### Integration Tests
- [ ] Settings returned
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/settings/general` → 200 → Settings data

**Test Data:**
- Settings data

---

### Endpoint: `PUT /api/settings/general`

**Test Coverage Required:**

#### Integration Tests
- [ ] Settings updated
- [ ] Validation works
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** PUT with valid data → 200 → Settings updated
2. **Invalid Data:** PUT with invalid data → 400

**Test Data:**
- Valid settings data
- Invalid settings data

---

### Endpoint: `GET /api/settings/branding`

**Test Coverage Required:**

#### Integration Tests
- [ ] Branding settings returned
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/settings/branding` → 200 → Branding data

**Test Data:**
- Branding data

---

### Endpoint: `PUT /api/settings/branding`

**Test Coverage Required:**

#### Integration Tests
- [ ] Branding updated
- [ ] Logo upload works
- [ ] Theme colors updated
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** PUT with valid data → 200 → Branding updated
2. **Logo Upload:** PUT with logo file → Logo uploaded → URL returned

**Test Data:**
- Branding data
- Logo files

---

## Other APIs

### Endpoint: `GET /api/services`

**Test Coverage Required:**

#### Integration Tests
- [ ] Services returned
- [ ] Public access
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/services` → 200 → Service list

**Test Data:**
- Services

---

### Endpoint: `GET /api/search`

**Test Coverage Required:**

#### Integration Tests
- [ ] Search results returned
- [ ] Multiple entity types searched
- [ ] Relevance ranking works
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/search?q=dog` → 200 → Search results
2. **Empty:** GET `/api/search?q=` → 400

**Test Data:**
- Search terms
- Searchable entities

---

### Endpoint: `GET /api/notifications`

**Test Coverage Required:**

#### Integration Tests
- [ ] Notifications returned
- [ ] Unread count included
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** GET `/api/notifications` → 200 → Notification list
2. **Unread:** GET `/api/notifications?unread=true` → Unread only

**Test Data:**
- Notifications

---

### Endpoint: `POST /api/notifications/mark-all-read`

**Test Coverage Required:**

#### Integration Tests
- [ ] All notifications marked read
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** POST → 200 → All marked read

**Test Data:**
- Notifications

---

*This document should be updated as new API endpoints are added or existing endpoints are modified.*

