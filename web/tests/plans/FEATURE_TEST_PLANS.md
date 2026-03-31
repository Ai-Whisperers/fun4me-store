# Feature Test Plans

Complete test plans for all features in the Vete platform, organized by feature area.

## Table of Contents

1. [Authentication Features](#authentication-features)
2. [Pet Management Features](#pet-management-features)
3. [Appointment Booking Features](#appointment-booking-features)
4. [Invoice & Finance Features](#invoice--finance-features)
5. [Prescription Features](#prescription-features)
6. [Inventory Management Features](#inventory-management-features)
7. [Store/E-commerce Features](#storee-commerce-features)
8. [Clinical Tools Features](#clinical-tools-features)
9. [Dashboard Features](#dashboard-features)
10. [Communication Features](#communication-features)
11. [Settings & Administration Features](#settings--administration-features)

---

## Authentication Features

### Feature: User Registration

**Test Coverage Required:**

#### Unit Tests

- [ ] Email validation logic
- [ ] Password strength validation
- [ ] Password confirmation matching
- [ ] Form field validation
- [ ] Error message generation

#### Integration Tests

- [ ] Successful registration creates user in Supabase Auth
- [ ] Successful registration creates profile with correct tenant_id
- [ ] Duplicate email registration fails
- [ ] Invalid email format fails
- [ ] Weak password fails validation
- [ ] Password mismatch fails
- [ ] Terms acceptance required
- [ ] Confirmation email sent
- [ ] OAuth registration flow (Google)
- [ ] Multi-tenant isolation (user created for correct clinic)

#### System Tests

- [ ] Complete registration flow: Form → Submit → Email → Login
- [ ] OAuth registration: Google → Profile creation → Login
- [ ] Registration with existing email shows appropriate error
- [ ] Registration redirects to correct portal after success

#### E2E Tests

- [ ] User can register via email/password
- [ ] User can register via Google OAuth
- [ ] Form validation works correctly
- [ ] Error messages display correctly
- [ ] Success redirect works
- [ ] Confirmation email received

**Test Data:**

- Valid user data
- Invalid email formats
- Weak passwords
- Existing emails
- OAuth test accounts

---

### Feature: User Login

**Test Coverage Required:**

#### Unit Tests

- [ ] Email format validation
- [ ] Password presence validation
- [ ] Error message formatting

#### Integration Tests

- [ ] Valid credentials login successfully
- [ ] Invalid email fails
- [ ] Invalid password fails
- [ ] Non-existent user fails
- [ ] Unconfirmed email fails (if email confirmation required)
- [ ] Session created correctly
- [ ] User redirected to correct portal
- [ ] Return URL redirect works
- [ ] OAuth login flow
- [ ] Multi-tenant isolation (user can only access their clinic)

#### System Tests

- [ ] Login → Dashboard redirect
- [ ] Login → Return URL redirect
- [ ] Failed login → Error message → Retry
- [ ] OAuth login → Profile check → Dashboard

#### E2E Tests

- [ ] User can login with email/password
- [ ] User can login with Google OAuth
- [ ] Invalid credentials show error
- [ ] Login redirects correctly
- [ ] Session persists on page refresh
- [ ] Logout works correctly

**Test Data:**

- Valid credentials
- Invalid credentials
- Unconfirmed accounts
- OAuth test accounts

---

### Feature: Password Reset

**Test Coverage Required:**

#### Unit Tests

- [ ] Email validation
- [ ] Token validation
- [ ] Password strength validation
- [ ] Password confirmation matching

#### Integration Tests

- [ ] Forgot password sends email
- [ ] Reset link contains valid token
- [ ] Token expires after time limit
- [ ] Used token cannot be reused
- [ ] Invalid token fails
- [ ] Password update succeeds
- [ ] Old password no longer works
- [ ] New password works immediately

#### System Tests

- [ ] Forgot password → Email → Reset link → New password → Login
- [ ] Expired token → Error → Request new link
- [ ] Used token → Error → Request new link

#### E2E Tests

- [ ] User can request password reset
- [ ] Reset email received
- [ ] Reset link works
- [ ] Password can be changed
- [ ] New password works for login

**Test Data:**

- Valid email addresses
- Invalid tokens
- Expired tokens
- Used tokens

---

## Pet Management Features

### Feature: Pet Registration

**Test Coverage Required:**

#### Unit Tests

- [ ] Name validation (1-100 characters)
- [ ] Species validation
- [ ] Birth date validation (not future)
- [ ] Weight validation (positive number)
- [ ] Photo upload validation (file type, size)
- [ ] Form field validation
- [ ] Age calculation from birth date

#### Integration Tests

- [ ] Pet created with all required fields
- [ ] Pet created with optional fields
- [ ] Pet photo uploaded to storage
- [ ] Pet linked to correct owner
- [ ] Pet linked to correct tenant
- [ ] Duplicate pet name allowed (same owner)
- [ ] Pet creation fails with invalid data
- [ ] Pet creation fails without owner
- [ ] Multi-tenant isolation (pet created for correct clinic)

#### System Tests

- [ ] Complete pet registration: Form → Upload → Submit → Profile
- [ ] Pet registration with photo: Upload → Validate → Submit
- [ ] Pet registration without photo: Submit → Default image

#### E2E Tests

- [ ] User can register a new pet
- [ ] Form validation works
- [ ] Photo upload works
- [ ] Pet appears in pet list after creation
- [ ] Pet profile accessible after creation

**Test Data:**

- Valid pet data
- Invalid pet data
- Various photo formats
- Large photo files
- Missing required fields

---

### Feature: Pet Profile View

**Test Coverage Required:**

#### Unit Tests

- [ ] Age calculation display
- [ ] Weight formatting
- [ ] Date formatting
- [ ] Photo display logic

#### Integration Tests

- [ ] Pet profile loads with all data
- [ ] Pet profile loads with photo
- [ ] Pet profile loads without photo (default image)
- [ ] Pet profile shows vaccines
- [ ] Pet profile shows medical records
- [ ] Pet profile shows prescriptions
- [ ] Pet profile access control (owner only)
- [ ] Vet can access all pet profiles
- [ ] Multi-tenant isolation (can't access other clinic's pets)

#### System Tests

- [ ] Pet profile → View vaccines → View records → View prescriptions
- [ ] Pet profile → Edit → Save → View updated data

#### E2E Tests

- [ ] Pet profile displays correctly
- [ ] All tabs work (General, Vaccines, History, Prescriptions)
- [ ] QR code generation works
- [ ] Edit button navigates correctly
- [ ] Photo displays correctly

**Test Data:**

- Pets with complete data
- Pets with minimal data
- Pets with photos
- Pets without photos
- Pets with vaccines
- Pets with medical records

---

### Feature: Pet Editing

**Test Coverage Required:**

#### Unit Tests

- [ ] Form pre-population
- [ ] Field validation (same as registration)
- [ ] Photo replacement logic
- [ ] Photo deletion logic

#### Integration Tests

- [ ] Pet update succeeds with valid data
- [ ] Pet update fails with invalid data
- [ ] Photo update works
- [ ] Photo deletion works
- [ ] Pet update maintains relationships
- [ ] Pet update maintains tenant_id
- [ ] Access control (owner only)
- [ ] Vet can edit pet profiles

#### System Tests

- [ ] Edit pet → Update fields → Save → View changes
- [ ] Edit pet → Replace photo → Save → View new photo
- [ ] Edit pet → Delete photo → Save → View default image

#### E2E Tests

- [ ] User can edit pet information
- [ ] Form pre-populates correctly
- [ ] Photo can be replaced
- [ ] Photo can be deleted
- [ ] Changes save correctly
- [ ] Changes visible after save

**Test Data:**

- Existing pets
- Updated pet data
- New photos
- Invalid updates

---

### Feature: Pet Deletion

**Test Coverage Required:**

#### Unit Tests

- [ ] Confirmation dialog logic
- [ ] Soft delete vs hard delete logic

#### Integration Tests

- [ ] Pet soft delete succeeds
- [ ] Deleted pet not visible in lists
- [ ] Deleted pet data preserved
- [ ] Deleted pet relationships maintained
- [ ] Access control (owner only)
- [ ] Vet can delete pets
- [ ] Admin can delete pets

#### System Tests

- [ ] Delete pet → Confirm → Pet removed from list → Data preserved

#### E2E Tests

- [ ] User can delete pet
- [ ] Confirmation dialog appears
- [ ] Pet removed after confirmation
- [ ] Pet no longer appears in lists

**Test Data:**

- Pets to delete
- Pets with relationships (vaccines, records)

---

## Appointment Booking Features

### Feature: Appointment Booking Wizard

**Test Coverage Required:**

#### Unit Tests

- [ ] Service selection logic
- [ ] Pet selection logic
- [ ] Date validation (not past, within business hours)
- [ ] Time slot validation
- [ ] Slot availability calculation
- [ ] Price calculation
- [ ] Form step navigation

#### Integration Tests

- [ ] Service selection works
- [ ] Pet selection works (shows owner's pets)
- [ ] Available slots fetched correctly
- [ ] Slot booking succeeds
- [ ] Slot booking fails if already booked
- [ ] Appointment created with correct data
- [ ] Appointment linked to correct pet
- [ ] Appointment linked to correct owner
- [ ] Appointment linked to correct tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Complete booking: Service → Pet → Date/Time → Confirm → Success
- [ ] Booking with unavailable slot: Select → Error → Select different
- [ ] Booking with notes: Add notes → Submit → Notes saved

#### E2E Tests

- [ ] User can complete booking wizard
- [ ] All steps work correctly
- [ ] Service selection works
- [ ] Pet selection works
- [ ] Date/time selection works
- [ ] Available slots display correctly
- [ ] Booking confirmation works
- [ ] Success message displays

**Test Data:**

- Available services
- User's pets
- Available time slots
- Booked time slots
- Business hours

---

### Feature: Appointment Management

**Test Coverage Required:**

#### Unit Tests

- [ ] Status transition logic
- [ ] Status button visibility logic
- [ ] Date/time formatting
- [ ] Appointment filtering logic
- [ ] Appointment sorting logic

#### Integration Tests

- [ ] Appointment list loads correctly
- [ ] Appointment filtering works
- [ ] Appointment sorting works
- [ ] Appointment status update works
- [ ] Check-in works
- [ ] Start appointment works
- [ ] Complete appointment works
- [ ] Cancel appointment works
- [ ] Reschedule appointment works
- [ ] Mark no-show works
- [ ] Access control (owner sees own, vet sees all)

#### System Tests

- [ ] Appointment workflow: Pending → Confirmed → Check-in → In Progress → Complete
- [ ] Appointment cancellation: Cancel → Reason → Confirmed
- [ ] Appointment reschedule: Reschedule → New date/time → Confirmed

#### E2E Tests

- [ ] User can view appointments
- [ ] User can filter appointments
- [ ] User can cancel appointment
- [ ] User can reschedule appointment
- [ ] Staff can check-in appointment
- [ ] Staff can start appointment
- [ ] Staff can complete appointment
- [ ] Status updates correctly

**Test Data:**

- Appointments in various states
- Past appointments
- Future appointments
- Different statuses

---

## Invoice & Finance Features

### Feature: Invoice Creation

**Test Coverage Required:**

#### Unit Tests

- [ ] Line item calculation
- [ ] Subtotal calculation
- [ ] Discount calculation
- [ ] Tax calculation (IVA 10%)
- [ ] Total calculation
- [ ] Invoice number generation
- [ ] Due date calculation

#### Integration Tests

- [ ] Invoice created with line items
- [ ] Invoice calculations correct
- [ ] Invoice linked to correct pet
- [ ] Invoice linked to correct owner
- [ ] Invoice linked to correct tenant
- [ ] Invoice saved as draft
- [ ] Invoice sent to client
- [ ] Invoice PDF generated
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Create invoice: Select pet → Add items → Calculate → Save → Send
- [ ] Invoice with discounts: Add items → Apply discount → Calculate → Save
- [ ] Invoice PDF: Create → Generate PDF → Download

#### E2E Tests

- [ ] Staff can create invoice
- [ ] Line items can be added
- [ ] Calculations are correct
- [ ] Invoice can be saved as draft
- [ ] Invoice can be sent
- [ ] PDF can be downloaded

**Test Data:**

- Pets and owners
- Service items
- Product items
- Discount rates
- Tax rates

---

### Feature: Payment Processing

**Test Coverage Required:**

#### Unit Tests

- [ ] Payment amount validation
- [ ] Partial payment logic
- [ ] Payment method validation
- [ ] Payment date validation

#### Integration Tests

- [ ] Payment recorded correctly
- [ ] Invoice status updated (Paid/Partial)
- [ ] Payment history recorded
- [ ] Multiple payments allowed
- [ ] Payment cannot exceed invoice total
- [ ] Refund processing works
- [ ] Payment linked to correct invoice
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Record payment: Invoice → Payment → Amount → Method → Record → Status updated
- [ ] Partial payment: Invoice → Partial payment → Status = Partial → Remaining balance
- [ ] Full payment: Invoice → Full payment → Status = Paid
- [ ] Refund: Paid invoice → Refund → Amount → Status updated

#### E2E Tests

- [ ] Staff can record payment
- [ ] Payment amount validated
- [ ] Invoice status updates
- [ ] Payment history displays
- [ ] Refund can be processed

**Test Data:**

- Invoices in various states
- Payment amounts
- Payment methods
- Refund scenarios

---

## Prescription Features

### Feature: Prescription Creation

**Test Coverage Required:**

#### Unit Tests

- [ ] Drug dosage calculation (weight × mg/kg)
- [ ] Frequency validation
- [ ] Duration validation
- [ ] Refill count validation
- [ ] Prescription number generation

#### Integration Tests

- [ ] Prescription created with drug
- [ ] Dosage calculated correctly
- [ ] Prescription linked to correct pet
- [ ] Prescription linked to correct vet
- [ ] Prescription linked to correct tenant
- [ ] Prescription PDF generated
- [ ] Prescription saved correctly
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Create prescription: Select pet → Select drug → Calculate dosage → Add instructions → Generate PDF
- [ ] Prescription with multiple drugs: Add drug → Add another → Generate PDF
- [ ] Prescription refills: Create → Set refills → Track refills

#### E2E Tests

- [ ] Vet can create prescription
- [ ] Drug selection works
- [ ] Dosage calculated automatically
- [ ] Prescription PDF generated
- [ ] Prescription saved correctly

**Test Data:**

- Pets with weights
- Drug database
- Dosage calculations
- Prescription templates

---

## Inventory Management Features

### Feature: Inventory CRUD

**Test Coverage Required:**

#### Unit Tests

- [ ] Stock quantity validation
- [ ] Price validation
- [ ] SKU validation
- [ ] Category validation
- [ ] Low stock calculation

#### Integration Tests

- [ ] Product created successfully
- [ ] Product updated successfully
- [ ] Product deleted successfully
- [ ] Stock updated correctly
- [ ] Low stock alerts triggered
- [ ] Product linked to correct tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Create product: Form → Save → Appears in list
- [ ] Update stock: Product → Adjust stock → Stock updated → Alert if low
- [ ] Import products: CSV → Parse → Validate → Import → Products created

#### E2E Tests

- [ ] Staff can create product
- [ ] Staff can update product
- [ ] Staff can delete product
- [ ] Stock can be adjusted
- [ ] Low stock alerts display

**Test Data:**

- Product data
- Stock quantities
- Price data
- CSV import files

---

## Store/E-commerce Features

### Feature: Product Catalog

**Test Coverage Required:**

#### Unit Tests

- [ ] Product filtering logic
- [ ] Product sorting logic
- [ ] Search logic
- [ ] Category filtering
- [ ] Price formatting
- [ ] Stock status calculation

#### Integration Tests

- [ ] Products load correctly
- [ ] Product filtering works
- [ ] Product search works
- [ ] Category filtering works
- [ ] Out of stock products hidden/shown correctly
- [ ] Products linked to correct tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Browse products: Load → Filter → Search → View product
- [ ] Product with low stock: Display → Show warning → Allow purchase

#### E2E Tests

- [ ] User can browse products
- [ ] User can search products
- [ ] User can filter by category
- [ ] Product details display correctly
- [ ] Stock status displays correctly

**Test Data:**

- Products in various categories
- Products with different stock levels
- Search terms

---

### Feature: Shopping Cart

**Test Coverage Required:**

#### Unit Tests

- [ ] Add to cart logic
- [ ] Remove from cart logic
- [ ] Update quantity logic
- [ ] Cart total calculation
- [ ] Stock validation in cart

#### Integration Tests

- [ ] Item added to cart
- [ ] Item removed from cart
- [ ] Quantity updated in cart
- [ ] Cart persists across sessions
- [ ] Stock validated when adding
- [ ] Stock validated when updating quantity
- [ ] Cart linked to session/tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Add to cart: Product → Add → Cart updated → Total calculated
- [ ] Update quantity: Cart → Change quantity → Stock validated → Cart updated
- [ ] Remove item: Cart → Remove → Cart updated

#### E2E Tests

- [ ] User can add items to cart
- [ ] User can remove items from cart
- [ ] User can update quantities
- [ ] Cart total calculates correctly
- [ ] Stock limits enforced
- [ ] Cart persists on page refresh

**Test Data:**

- Products with stock
- Products out of stock
- Cart states

---

### Feature: Checkout

**Test Coverage Required:**

#### Unit Tests

- [ ] Contact information validation
- [ ] Shipping address validation
- [ ] Payment method validation
- [ ] Order total calculation
- [ ] Shipping cost calculation

#### Integration Tests

- [ ] Order created successfully
- [ ] Order linked to cart items
- [ ] Stock decremented after order
- [ ] Order confirmation sent
- [ ] Order linked to correct tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Complete checkout: Cart → Contact → Address → Payment → Confirm → Order created → Stock updated
- [ ] Checkout with out of stock: Cart → Checkout → Stock check → Error → Update cart

#### E2E Tests

- [ ] User can complete checkout
- [ ] Form validation works
- [ ] Order confirmation displays
- [ ] Stock updated after order
- [ ] Confirmation email sent

**Test Data:**

- Cart with items
- Contact information
- Shipping addresses
- Payment methods

---

## Clinical Tools Features

### Feature: Drug Dosage Calculator

**Test Coverage Required:**

#### Unit Tests

- [ ] Dosage calculation (weight × mg/kg)
- [ ] Drug search logic
- [ ] Species filtering
- [ ] Route filtering
- [ ] Unit conversion

#### Integration Tests

- [ ] Drug database loads
- [ ] Drug search works
- [ ] Dosage calculated correctly
- [ ] Species filter works
- [ ] Route filter works
- [ ] Data linked to correct tenant

#### System Tests

- [ ] Calculate dosage: Select drug → Enter weight → Select species → Calculate → Display result

#### E2E Tests

- [ ] User can search drugs
- [ ] User can calculate dosage
- [ ] Filters work correctly
- [ ] Results display correctly

**Test Data:**

- Drug database
- Pet weights
- Species data

---

### Feature: Toxic Food Checker

**Test Coverage Required:**

#### Unit Tests

- [ ] Food search logic
- [ ] Toxicity level calculation
- [ ] Symptom list generation

#### Integration Tests

- [ ] Food database loads
- [ ] Food search works
- [ ] Toxicity information displays
- [ ] Symptoms display correctly
- [ ] Data linked to correct tenant

#### System Tests

- [ ] Check food: Search → Select → Display toxicity → Display symptoms

#### E2E Tests

- [ ] User can search foods
- [ ] Toxicity information displays
- [ ] Symptoms list displays
- [ ] Safe foods marked correctly

**Test Data:**

- Food database
- Toxicity levels
- Symptoms data

---

## Dashboard Features

### Feature: Staff Dashboard

**Test Coverage Required:**

#### Unit Tests

- [ ] Stats calculation
- [ ] Chart data formatting
- [ ] Alert generation logic
- [ ] Date range filtering

#### Integration Tests

- [ ] Dashboard stats load correctly
- [ ] Charts render with data
- [ ] Alerts display correctly
- [ ] Today's appointments load
- [ ] Data linked to correct tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Dashboard load: Stats → Charts → Appointments → Alerts
- [ ] Date range filter: Select range → Stats update → Charts update

#### E2E Tests

- [ ] Dashboard loads correctly
- [ ] Stats display correctly
- [ ] Charts render correctly
- [ ] Appointments display correctly
- [ ] Alerts display correctly

**Test Data:**

- Dashboard stats
- Chart data
- Appointments
- Alerts

---

## Communication Features

### Feature: WhatsApp Integration

**Test Coverage Required:**

#### Unit Tests

- [ ] Message formatting
- [ ] Template variable replacement
- [ ] Phone number validation

#### Integration Tests

- [ ] Message sent successfully
- [ ] Template used correctly
- [ ] Variables replaced correctly
- [ ] Conversation created
- [ ] Messages received
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Send message: Compose → Send → Message sent → Conversation updated
- [ ] Use template: Select template → Fill variables → Send → Message sent

#### E2E Tests

- [ ] Staff can send messages
- [ ] Templates work correctly
- [ ] Conversations display correctly
- [ ] Messages received display correctly

**Test Data:**

- Phone numbers
- Message templates
- Template variables

---

## Settings & Administration Features

### Feature: Clinic Settings

**Test Coverage Required:**

#### Unit Tests

- [ ] Settings validation
- [ ] Business hours validation
- [ ] Theme color validation

#### Integration Tests

- [ ] Settings saved correctly
- [ ] Settings loaded correctly
- [ ] Business hours updated
- [ ] Theme updated
- [ ] Settings linked to correct tenant
- [ ] Multi-tenant isolation

#### System Tests

- [ ] Update settings: Form → Save → Settings updated → Applied

#### E2E Tests

- [ ] Admin can update settings
- [ ] Settings save correctly
- [ ] Settings apply correctly

**Test Data:**

- Settings data
- Business hours
- Theme colors

---

_This document should be updated as new features are added or existing features are modified._
