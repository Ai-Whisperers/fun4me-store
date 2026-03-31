# Server Action Test Plans

Complete test plans for all 22 server actions in the Vete platform.

## Table of Contents

1. [Pet Actions](#pet-actions)
2. [Appointment Actions](#appointment-actions)
3. [Invoice Actions](#invoice-actions)
4. [Medical Record Actions](#medical-record-actions)
5. [Product Actions](#product-actions)
6. [Profile Actions](#profile-actions)
7. [Communication Actions](#communication-actions)
8. [Other Actions](#other-actions)

---

## Pet Actions

### Action: `createPet`

**File:** `app/actions/create-pet.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Photo upload validation
- [ ] Age calculation
- [ ] Error message formatting

#### Integration Tests
- [ ] Pet created successfully
- [ ] Pet linked to correct owner
- [ ] Pet linked to correct tenant
- [ ] Photo uploaded to storage
- [ ] Photo URL saved
- [ ] Validation errors returned
- [ ] Access control (owner/vet/admin)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create pet with all fields → Pet created → Photo uploaded
2. **Minimal Data:** Create pet with only required fields → Pet created
3. **With Photo:** Create pet with photo → Photo uploaded → URL saved
4. **Invalid Data:** Create pet with invalid data → Validation errors
5. **Unauthorized:** Create pet without auth → Error
6. **Wrong Tenant:** Create pet for other clinic → Error

**Test Data:**
- Valid pet data
- Invalid pet data
- Photo files
- Owner IDs

---

### Action: `updatePet` (via `pets.ts`)

**File:** `app/actions/pets.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Photo update logic
- [ ] Photo deletion logic

#### Integration Tests
- [ ] Pet updated successfully
- [ ] Photo updated
- [ ] Photo deleted
- [ ] Validation errors returned
- [ ] Access control (owner/vet/admin)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Update pet → Pet updated
2. **Photo Update:** Update photo → New photo uploaded → Old deleted
3. **Photo Delete:** Delete photo → Photo removed → Default used
4. **Invalid Data:** Update with invalid data → Validation errors

**Test Data:**
- Existing pets
- Updated pet data
- New photos

---

## Appointment Actions

### Action: `createAppointment`

**File:** `app/actions/create-appointment.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Date/time validation
- [ ] Slot availability check
- [ ] Price calculation

#### Integration Tests
- [ ] Appointment created successfully
- [ ] Slot marked as booked
- [ ] Appointment linked to pet
- [ ] Appointment linked to owner
- [ ] Email confirmation sent
- [ ] Validation errors returned
- [ ] Slot availability validated
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create appointment → Appointment created → Email sent
2. **Slot Unavailable:** Create with booked slot → Error
3. **Invalid Date:** Create with past date → Error
4. **Invalid Data:** Create with missing fields → Validation errors

**Test Data:**
- Valid appointment data
- Booked slots
- Invalid dates
- Pet IDs

---

### Action: `updateAppointment`

**File:** `app/actions/update-appointment.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Status transition validation
- [ ] Date/time validation

#### Integration Tests
- [ ] Appointment updated successfully
- [ ] Status updated
- [ ] Date/time updated
- [ ] Validation errors returned
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Update appointment → Appointment updated
2. **Status Update:** Update status → Status changed
3. **Reschedule:** Update date/time → New slot checked → Appointment rescheduled
4. **Invalid Status:** Invalid status transition → Error

**Test Data:**
- Existing appointments
- Status updates
- Date/time changes

---

## Invoice Actions

### Action: `createInvoice` (via `invoices.ts`)

**File:** `app/actions/invoices.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Line item validation
- [ ] Calculation logic
- [ ] Invoice number generation

#### Integration Tests
- [ ] Invoice created successfully
- [ ] Line items saved
- [ ] Calculations correct
- [ ] Invoice number generated
- [ ] Invoice linked to pet
- [ ] Invoice linked to owner
- [ ] Validation errors returned
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create invoice → Invoice created → Calculations correct
2. **With Discounts:** Create with discounts → Discounts applied → Total correct
3. **Invalid Calculations:** Create with wrong totals → Error
4. **Invalid Data:** Create with missing fields → Validation errors

**Test Data:**
- Valid invoice data
- Line items
- Discounts
- Invalid data

---

### Action: `updateInvoiceStatus` (via `invoices.ts`)

**File:** `app/actions/invoices.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Invoice status updated
- [ ] Status transition validated
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Update status → Status changed
2. **Invalid Transition:** Invalid status change → Error

**Test Data:**
- Invoices
- Status updates

---

## Medical Record Actions

### Action: `createMedicalRecord`

**File:** `app/actions/create-medical-record.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Vitals validation
- [ ] Date validation

#### Integration Tests
- [ ] Medical record created successfully
- [ ] Record linked to pet
- [ ] Vitals saved
- [ ] Attachments uploaded
- [ ] Validation errors returned
- [ ] Access control (vet/admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create record → Record created
2. **With Vitals:** Create with vitals → Vitals saved
3. **With Attachments:** Create with attachments → Files uploaded
4. **Invalid Data:** Create with invalid data → Validation errors

**Test Data:**
- Valid record data
- Vitals data
- Attachment files
- Invalid data

---

### Action: `updateMedicalRecord` (via `medical-records.ts`)

**File:** `app/actions/medical-records.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Medical record updated
- [ ] Validation errors returned
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Update record → Record updated
2. **Invalid Data:** Update with invalid data → Validation errors

**Test Data:**
- Existing records
- Updated data

---

## Product Actions

### Action: `createProduct`

**File:** `app/actions/create-product.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] SKU validation
- [ ] Price validation
- [ ] Stock validation

#### Integration Tests
- [ ] Product created successfully
- [ ] Product linked to tenant
- [ ] Photo uploaded
- [ ] Validation errors returned
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create product → Product created
2. **With Photo:** Create with photo → Photo uploaded
3. **Duplicate SKU:** Create with existing SKU → Error
4. **Invalid Data:** Create with invalid data → Validation errors

**Test Data:**
- Valid product data
- SKUs
- Photos
- Invalid data

---

### Action: `updateProduct`

**File:** `app/actions/update-product.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Product updated successfully
- [ ] Stock updated
- [ ] Price updated
- [ ] Validation errors returned
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Update product → Product updated
2. **Stock Update:** Update stock → Stock changed → Alerts if low
3. **Invalid Data:** Update with invalid data → Validation errors

**Test Data:**
- Existing products
- Updated data

---

### Action: `deleteProduct`

**File:** `app/actions/delete-product.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Product deleted successfully
- [ ] Soft delete vs hard delete
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Delete product → Product deleted
2. **With Orders:** Delete product with orders → Soft delete → Still accessible for orders

**Test Data:**
- Products
- Products with orders

---

## Profile Actions

### Action: `updateProfile`

**File:** `app/actions/update-profile.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Input validation
- [ ] Email validation
- [ ] Phone validation

#### Integration Tests
- [ ] Profile updated successfully
- [ ] Email updated (if changed)
- [ ] Phone updated
- [ ] Validation errors returned
- [ ] Access control (own profile or admin)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Update profile → Profile updated
2. **Email Change:** Update email → Email changed → Confirmation sent
3. **Invalid Data:** Update with invalid data → Validation errors

**Test Data:**
- Profile data
- Updated data
- Invalid data

---

## Communication Actions

### Action: `sendEmail`

**File:** `app/actions/send-email.ts`

**Test Coverage Required:**

#### Unit Tests
- [ ] Email validation
- [ ] Template rendering
- [ ] Variable replacement

#### Integration Tests
- [ ] Email sent successfully
- [ ] Template used correctly
- [ ] Variables replaced
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Send email → Email sent
2. **With Template:** Send with template → Template rendered → Variables replaced
3. **Invalid Email:** Send to invalid email → Error

**Test Data:**
- Email addresses
- Templates
- Variables

---

### Action: `sendWhatsApp` (via `whatsapp.ts`)

**File:** `app/actions/whatsapp.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] WhatsApp message sent
- [ ] Template used correctly
- [ ] Variables replaced
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Send message → Message sent
2. **With Template:** Send with template → Template used → Variables replaced
3. **Invalid Phone:** Send to invalid phone → Error

**Test Data:**
- Phone numbers
- Templates
- Variables

---

## Other Actions

### Action: `createVaccine`

**File:** `app/actions/create-vaccine.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Vaccine record created
- [ ] Vaccine linked to pet
- [ ] Next due date calculated
- [ ] Photos uploaded
- [ ] Validation errors returned
- [ ] Access control (vet/admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create vaccine → Vaccine created → Next due calculated
2. **With Photos:** Create with photos → Photos uploaded
3. **Invalid Data:** Create with invalid data → Validation errors

**Test Data:**
- Valid vaccine data
- Pet IDs
- Photos
- Invalid data

---

### Action: `assignTag`

**File:** `app/actions/assign-tag.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Tag assigned to pet
- [ ] QR code generated
- [ ] Tag linked correctly
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Assign tag → Tag assigned → QR generated
2. **Already Tagged:** Assign to already tagged pet → Error or update

**Test Data:**
- Pets
- Tag codes

---

### Action: `inviteClient`

**File:** `app/actions/invite-client.ts`

**Test Coverage Required:

#### Integration Tests
- [ ] Invitation sent
- [ ] Email sent
- [ ] Invitation link generated
- [ ] Access control (staff only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Invite client → Invitation sent → Email sent
2. **Existing User:** Invite existing user → Error or notification

**Test Data:**
- Email addresses
- Client data

---

### Action: `inviteStaff`

**File:** `app/actions/invite-staff.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Staff invitation sent
- [ ] Email sent
- [ ] Role assigned
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Invite staff → Invitation sent → Email sent → Role assigned
2. **Existing User:** Invite existing user → Error or notification

**Test Data:**
- Email addresses
- Roles

---

### Action: `createSchedule` (via `schedules.ts`)

**File:** `app/actions/schedules.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Schedule created
- [ ] Schedule linked to staff
- [ ] Recurring schedule saved
- [ ] Access control (admin only)
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Create schedule → Schedule created
2. **Recurring:** Create recurring schedule → Pattern saved

**Test Data:**
- Staff IDs
- Schedule data

---

### Action: `requestTimeOff` (via `time-off.ts`)

**File:** `app/actions/time-off.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Time off request created
- [ ] Request linked to staff
- [ ] Notification sent
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Request time off → Request created → Notification sent
2. **Overlap:** Request overlapping existing → Error or warning

**Test Data:**
- Staff IDs
- Date ranges

---

### Action: `safetyActions` (via `safety.ts`)

**File:** `app/actions/safety.ts`

**Test Coverage Required:**

#### Integration Tests
- [ ] Safety action executed
- [ ] Data saved
- [ ] Access control
- [ ] Multi-tenant isolation

#### Test Cases
1. **Success:** Execute safety action → Action completed → Data saved

**Test Data:**
- Safety data

---

*This document should be updated as new server actions are added or existing actions are modified.*

