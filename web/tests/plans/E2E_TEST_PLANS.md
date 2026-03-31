# E2E Test Plans

Complete end-to-end test plans for critical user journeys in the Vete platform.

## Table of Contents

1. [Critical User Journeys](#critical-user-journeys)
2. [Public Website Journeys](#public-website-journeys)
3. [Portal Journeys](#portal-journeys)
4. [Dashboard Journeys](#dashboard-journeys)
5. [Cross-Feature Journeys](#cross-feature-journeys)

---

## Critical User Journeys

### Journey: New User Registration & First Pet

**Priority:** CRITICAL

**Steps:**

1. Visit homepage
2. Click "Zona Propietario"
3. Click "Registrarse"
4. Fill registration form
5. Submit registration
6. Receive confirmation email (verify)
7. Login with new account
8. Land on dashboard
9. Click "Agregar Mascota"
10. Fill pet registration form
11. Upload pet photo
12. Submit pet registration
13. View pet profile

**Test Coverage:**

- [ ] All steps complete successfully
- [ ] Form validations work
- [ ] Email confirmation sent
- [ ] Pet created correctly
- [ ] Photo uploaded correctly
- [ ] Navigation works
- [ ] Error handling works

**Test Data:**

- New user data
- Pet data
- Photo file

---

### Journey: Book Appointment (Public)

**Priority:** CRITICAL

**Steps:**

1. Visit homepage
2. Click "Agendar Cita"
3. Select service
4. Select pet (or register new)
5. Select date
6. Select time slot
7. Add notes
8. Confirm appointment
9. View confirmation

**Test Coverage:**

- [ ] All steps complete
- [ ] Service selection works
- [ ] Pet selection works
- [ ] Date/time selection works
- [ ] Available slots display
- [ ] Appointment created
- [ ] Confirmation displays

**Test Data:**

- Services
- Pets
- Available slots

---

### Journey: Complete Purchase (Store)

**Priority:** HIGH

**Steps:**

1. Visit store
2. Browse products
3. Filter by category
4. Add product to cart
5. View cart
6. Update quantities
7. Proceed to checkout
8. Fill contact information
9. Fill shipping address
10. Select payment method
11. Confirm order
12. View order confirmation

**Test Coverage:**

- [ ] All steps complete
- [ ] Product browsing works
- [ ] Cart updates correctly
- [ ] Checkout form works
- [ ] Order created
- [ ] Stock decremented
- [ ] Confirmation displays

**Test Data:**

- Products
- Cart items
- Contact information
- Addresses

---

## Public Website Journeys

### Journey: Browse Services

**Priority:** MEDIUM

**Steps:**

1. Visit homepage
2. Click "Servicios"
3. View services catalog
4. Filter by category
5. Click service card
6. View service details
7. Click "Agendar Cita"
8. Navigate to booking

**Test Coverage:**

- [ ] Services display
- [ ] Filtering works
- [ ] Service detail loads
- [ ] Navigation works

---

### Journey: Use Toxic Food Checker

**Priority:** MEDIUM

**Steps:**

1. Visit homepage
2. Navigate to tools
3. Click "Toxic Food Checker"
4. Search for food
5. View toxicity information
6. View symptoms (if toxic)

**Test Coverage:**

- [ ] Tool loads
- [ ] Search works
- [ ] Results display
- [ ] Information accurate

---

### Journey: Use Age Calculator

**Priority:** LOW

**Steps:**

1. Visit homepage
2. Navigate to tools
3. Click "Age Calculator"
4. Select birth date
5. Select species
6. View age calculation

**Test Coverage:**

- [ ] Tool loads
- [ ] Date picker works
- [ ] Calculation correct
- [ ] Results display

---

## Portal Journeys

### Journey: Manage Pet Profile

**Priority:** CRITICAL

**Steps:**

1. Login to portal
2. View dashboard
3. Click pet card
4. View pet profile
5. Switch to "Vacunas" tab
6. Click "Agregar Vacuna"
7. Fill vaccine form
8. Submit vaccine
9. View vaccine in list
10. Switch to "Historial" tab
11. View medical records
12. Click "Editar" button
13. Update pet information
14. Save changes
15. View updated profile

**Test Coverage:**

- [ ] All steps complete
- [ ] Tabs work
- [ ] Vaccine creation works
- [ ] Medical records display
- [ ] Edit works
- [ ] Changes save

---

### Journey: View & Manage Appointments

**Priority:** HIGH

**Steps:**

1. Login to portal
2. Navigate to appointments
3. View appointments list
4. Filter by status
5. Click appointment
6. View appointment details
7. Click "Reprogramar"
8. Select new date/time
9. Confirm reschedule
10. View updated appointment
11. Click "Cancelar"
12. Confirm cancellation
13. View cancelled appointment

**Test Coverage:**

- [ ] Appointments list loads
- [ ] Filtering works
- [ ] Reschedule works
- [ ] Cancellation works
- [ ] Status updates

---

### Journey: View Prescriptions

**Priority:** MEDIUM

**Steps:**

1. Login to portal
2. Navigate to pet profile
3. Switch to "Recetas" tab
4. View prescriptions list
5. Click prescription
6. View prescription details
7. Click "Descargar PDF"
8. Verify PDF downloads

**Test Coverage:**

- [ ] Prescriptions display
- [ ] Details load
- [ ] PDF generation works
- [ ] Download works

---

## Dashboard Journeys

### Journey: Staff Manage Appointment

**Priority:** CRITICAL

**Steps:**

1. Login as staff
2. View dashboard
3. View today's appointments
4. Click appointment
5. Click "Check-in"
6. Verify status updates
7. Click "Iniciar Consulta"
8. Verify status updates
9. Add completion notes
10. Click "Completar"
11. Verify status updates
12. View completed appointment

**Test Coverage:**

- [ ] All steps complete
- [ ] Status transitions work
- [ ] Notes save
- [ ] Status updates correctly

---

### Journey: Create Invoice

**Priority:** HIGH

**Steps:**

1. Login as staff
2. Navigate to invoices
3. Click "Nueva Factura"
4. Select pet
5. Add line items
6. Apply discount (optional)
7. Review totals
8. Add notes
9. Click "Guardar y Enviar"
10. Verify invoice created
11. Verify email sent
12. View invoice detail
13. Click "Registrar Pago"
14. Enter payment details
15. Record payment
16. Verify invoice status updates

**Test Coverage:**

- [ ] Invoice creation works
- [ ] Calculations correct
- [ ] Email sent
- [ ] Payment recording works
- [ ] Status updates

---

### Journey: Manage Inventory

**Priority:** HIGH

**Steps:**

1. Login as staff
2. Navigate to inventory
3. View inventory list
4. Filter by low stock
5. Click product
6. Adjust stock quantity
7. Select reason
8. Save adjustment
9. Verify stock updated
10. View inventory alerts
11. Verify alerts update

**Test Coverage:**

- [ ] Inventory loads
- [ ] Filtering works
- [ ] Stock adjustment works
- [ ] Alerts update

---

### Journey: Use Calendar

**Priority:** MEDIUM

**Steps:**

1. Login as staff
2. Navigate to calendar
3. View week view
4. Filter by staff
5. Click appointment
6. View appointment details
7. Double-click empty slot
8. Create new appointment
9. Verify appointment appears
10. Switch to month view
11. Verify appointments display

**Test Coverage:**

- [ ] Calendar loads
- [ ] Views work
- [ ] Filtering works
- [ ] Appointment creation works
- [ ] Navigation works

---

### Journey: Send WhatsApp Message

**Priority:** MEDIUM

**Steps:**

1. Login as staff
2. Navigate to WhatsApp
3. View conversations
4. Click conversation
5. View message thread
6. Click template button
7. Select template
8. Fill variables
9. Send message
10. Verify message sent
11. Verify message appears in thread

**Test Coverage:**

- [ ] Conversations load
- [ ] Message thread loads
- [ ] Template selection works
- [ ] Message sending works

---

## Cross-Feature Journeys

### Journey: Complete Pet Visit Workflow

**Priority:** CRITICAL

**Steps:**

1. Staff: Check-in appointment
2. Staff: Start consultation
3. Staff: Add medical record
4. Staff: Add vaccine record
5. Staff: Create prescription
6. Staff: Create invoice
7. Staff: Complete appointment
8. Owner: Login to portal
9. Owner: View pet profile
10. Owner: View new medical record
11. Owner: View new vaccine
12. Owner: View prescription
13. Owner: View invoice
14. Owner: Download prescription PDF
15. Owner: View invoice details

**Test Coverage:**

- [ ] Complete workflow works
- [ ] Data flows correctly
- [ ] All features integrate
- [ ] Owner sees updates

---

### Journey: Multi-Tenant Isolation

**Priority:** CRITICAL

**Steps:**

1. Login as user from Clinic A
2. View pets (should only see Clinic A pets)
3. Create pet (should be in Clinic A)
4. Logout
5. Login as user from Clinic B
6. View pets (should only see Clinic B pets)
7. Verify Clinic A pet not visible
8. Create pet (should be in Clinic B)
9. Verify Clinic B pet visible

**Test Coverage:**

- [ ] Data isolation works
- [ ] Users see only their clinic's data
- [ ] Creation works correctly
- [ ] No cross-tenant access

---

## Test Execution Strategy

### Test Organization

**By Priority:**

- Critical: Run on every commit
- High: Run on PR
- Medium: Run nightly
- Low: Run weekly

**By Browser:**

- Chrome (primary)
- Firefox
- Safari (WebKit)

**By Device:**

- Desktop
- Tablet
- Mobile

### Test Data Management

- Use test fixtures
- Clean up after tests
- Isolate test data
- Use realistic data

### Test Maintenance

- Update tests when features change
- Remove obsolete tests
- Add tests for new features
- Monitor test flakiness

---

_This document should be updated as new user journeys are identified or existing journeys change._
