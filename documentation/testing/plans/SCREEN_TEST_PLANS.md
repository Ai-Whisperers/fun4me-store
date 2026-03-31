# Screen Test Plans

Complete test plans for all screens in the Vete platform, organized by section (Public, Portal, Dashboard).

## Table of Contents

1. [Public Pages](#public-pages)
2. [Portal Pages](#portal-pages)
3. [Dashboard Pages](#dashboard-pages)
4. [Global Pages](#global-pages)

---

## Public Pages

### Screen: Homepage (`/[clinic]`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Hero section rendering
- [ ] Service card rendering
- [ ] Testimonial carousel logic
- [ ] Navigation component logic
- [ ] Theme application

#### Integration Tests
- [ ] Homepage content loads from JSON-CMS
- [ ] Services load correctly
- [ ] Testimonials load correctly
- [ ] Clinic theme applied correctly
- [ ] Multi-tenant content isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Hero section displays
- [ ] Services section displays
- [ ] Testimonials carousel works
- [ ] Navigation works
- [ ] "Agendar Cita" button navigates correctly
- [ ] "Ver Servicios" button navigates correctly
- [ ] WhatsApp button works
- [ ] Phone number clickable (mobile)
- [ ] Mobile menu works
- [ ] Responsive design works
- [ ] Theme colors applied correctly

**Test Scenarios:**
1. **Happy Path:** Load homepage → View content → Click CTA → Navigate
2. **Mobile:** Load on mobile → Menu works → Navigation works
3. **Theme:** Load with different clinic → Theme applied correctly

**Test Data:**
- Clinic content data
- Services data
- Testimonials data
- Theme configurations

---

### Screen: Services Catalog (`/[clinic]/services`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Service card rendering
- [ ] Category filter logic
- [ ] Service grid layout
- [ ] Price formatting

#### Integration Tests
- [ ] Services load from JSON-CMS
- [ ] Category filtering works
- [ ] Services display correctly
- [ ] Pricing displays correctly
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] All services display
- [ ] Category filter works
- [ ] Service cards clickable
- [ ] Service cards navigate to detail page
- [ ] "Agendar" button on card works
- [ ] Hover effects work
- [ ] Responsive grid works
- [ ] Search works (if implemented)

**Test Scenarios:**
1. **Browse:** Load page → View services → Filter by category → Click service
2. **Book:** Load page → Click "Agendar" → Navigate to booking

**Test Data:**
- Services data
- Categories
- Pricing data

---

### Screen: Service Detail (`/[clinic]/services/[serviceId]`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Service detail rendering
- [ ] FAQ accordion logic
- [ ] Price display formatting

#### Integration Tests
- [ ] Service detail loads from JSON-CMS
- [ ] Service data displays correctly
- [ ] FAQ displays correctly
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Service details display
- [ ] Pricing displays
- [ ] FAQ accordion works
- [ ] "Agendar Cita" button works
- [ ] "Volver a Servicios" button works
- [ ] Share button works (mobile)
- [ ] Responsive design works

**Test Scenarios:**
1. **View:** Load service detail → View information → Expand FAQ
2. **Book:** Load service detail → Click "Agendar" → Navigate to booking with service pre-selected

**Test Data:**
- Service detail data
- FAQ data

---

### Screen: Online Store (`/[clinic]/store`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Product card rendering
- [ ] Category filter logic
- [ ] Search logic
- [ ] Stock status display
- [ ] Price formatting

#### Integration Tests
- [ ] Products load from database
- [ ] Category filtering works
- [ ] Search works
- [ ] Stock status correct
- [ ] Out of stock products handled
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Products display
- [ ] Category filter works
- [ ] Search works
- [ ] Product cards clickable
- [ ] Add to cart button works
- [ ] Stock status displays correctly
- [ ] Out of stock products marked
- [ ] Low stock indicator shows
- [ ] Sale badges display
- [ ] Cart icon shows item count
- [ ] Responsive grid works

**Test Scenarios:**
1. **Browse:** Load store → View products → Filter by category → Search
2. **Add to Cart:** Load store → Click product → Add to cart → Cart updates

**Test Data:**
- Products data
- Categories
- Stock levels
- Pricing

---

### Screen: Shopping Cart (`/[clinic]/cart`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Cart item rendering
- [ ] Quantity control logic
- [ ] Total calculation
- [ ] Empty cart state

#### Integration Tests
- [ ] Cart items load correctly
- [ ] Quantity update works
- [ ] Item removal works
- [ ] Total calculation correct
- [ ] Stock validation on quantity change
- [ ] Cart persists

#### E2E Tests
- [ ] Page loads successfully
- [ ] Cart items display
- [ ] Quantity can be increased
- [ ] Quantity can be decreased
- [ ] Stock limit enforced
- [ ] Items can be removed
- [ ] Total calculates correctly
- [ ] "Seguir Comprando" button works
- [ ] "Finalizar Compra" button works
- [ ] Empty cart state displays
- [ ] Responsive design works

**Test Scenarios:**
1. **Manage Cart:** Load cart → Update quantities → Remove items → View total
2. **Checkout:** Load cart → Review items → Click checkout → Navigate to checkout

**Test Data:**
- Cart items
- Stock levels
- Pricing

---

### Screen: Checkout (`/[clinic]/cart/checkout`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Form field validation
- [ ] Email validation
- [ ] Phone validation
- [ ] Address validation
- [ ] Payment method selection

#### Integration Tests
- [ ] Order created successfully
- [ ] Contact information saved
- [ ] Shipping address saved
- [ ] Payment method saved
- [ ] Stock decremented
- [ ] Order confirmation sent
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Order summary displays
- [ ] Contact form works
- [ ] Address form works
- [ ] Payment method selection works
- [ ] Form validation works
- [ ] Terms checkbox required
- [ ] "Confirmar Pedido" button works
- [ ] Order confirmation displays
- [ ] "Volver al Carrito" button works
- [ ] Responsive design works

**Test Scenarios:**
1. **Complete Order:** Load checkout → Fill form → Select payment → Confirm → Order created
2. **Validation:** Load checkout → Submit without required fields → Errors display

**Test Data:**
- Cart items
- Contact information
- Addresses
- Payment methods

---

### Screen: Appointment Booking (`/[clinic]/book`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Step navigation logic
- [ ] Service selection logic
- [ ] Pet selection logic
- [ ] Date validation
- [ ] Time slot availability
- [ ] Price calculation
- [ ] Form validation

#### Integration Tests
- [ ] Services load correctly
- [ ] User's pets load correctly
- [ ] Available slots fetched
- [ ] Appointment created successfully
- [ ] Appointment linked correctly
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Step 1: Service selection works
- [ ] Step 2: Pet selection works (or register new)
- [ ] Step 3: Date selection works
- [ ] Step 3: Time slot selection works
- [ ] Step 4: Notes can be added
- [ ] Step 4: Confirmation works
- [ ] Step 5: Success message displays
- [ ] Sidebar summary updates
- [ ] Back navigation works
- [ ] Responsive design works

**Test Scenarios:**
1. **Complete Booking:** Service → Pet → Date/Time → Notes → Confirm → Success
2. **No Pets:** Service → Register pet → Continue booking
3. **Unavailable Slot:** Select slot → Error → Select different slot

**Test Data:**
- Services
- User's pets
- Available slots
- Business hours

---

### Screen: Toxic Food Checker (`/[clinic]/tools/toxic-food`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Search input logic
- [ ] Autocomplete logic
- [ ] Toxicity display logic
- [ ] Symptom list rendering

#### Integration Tests
- [ ] Food database loads
- [ ] Search works
- [ ] Autocomplete works
- [ ] Toxicity information loads
- [ ] Symptoms load correctly
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Search input works
- [ ] Autocomplete suggestions appear
- [ ] Food details display
- [ ] Safe indicator shows (green)
- [ ] Toxic indicator shows (red)
- [ ] Symptoms list displays
- [ ] "Ver Mas" expands details
- [ ] Responsive design works

**Test Scenarios:**
1. **Check Safe Food:** Search → Select safe food → View "Seguro" indicator
2. **Check Toxic Food:** Search → Select toxic food → View "Toxico" indicator → View symptoms

**Test Data:**
- Food database
- Toxicity levels
- Symptoms data

---

### Screen: Age Calculator (`/[clinic]/tools/age-calculator`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Age calculation logic (dog)
- [ ] Age calculation logic (cat)
- [ ] Date picker logic
- [ ] Species selector logic
- [ ] Result formatting

#### Integration Tests
- [ ] Age calculated correctly for dogs
- [ ] Age calculated correctly for cats
- [ ] Results display correctly

#### E2E Tests
- [ ] Page loads successfully
- [ ] Date picker works
- [ ] Species selector works
- [ ] Age calculates in real-time
- [ ] Results display correctly
- [ ] Human age equivalent shows
- [ ] Progress bar displays
- [ ] Responsive design works

**Test Scenarios:**
1. **Calculate Dog Age:** Select date → Select dog → View age → View human years
2. **Calculate Cat Age:** Select date → Select cat → View age → View human years

**Test Data:**
- Birth dates
- Species

---

## Portal Pages

### Screen: Login (`/[clinic]/portal/login`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Email input validation
- [ ] Password input validation
- [ ] Show/hide password logic
- [ ] Form submission logic
- [ ] Error message display

#### Integration Tests
- [ ] Valid credentials login
- [ ] Invalid credentials fail
- [ ] Session created
- [ ] Redirect works
- [ ] Return URL redirect works
- [ ] OAuth login works
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Email input works
- [ ] Password input works
- [ ] Show/hide password toggle works
- [ ] "Iniciar Sesion" button works
- [ ] Loading spinner displays
- [ ] Error message displays for invalid credentials
- [ ] "Olvidaste tu contrasena?" link works
- [ ] "Registrarse" link works
- [ ] Google OAuth button works
- [ ] Redirect after login works
- [ ] Responsive design works

**Test Scenarios:**
1. **Successful Login:** Enter credentials → Submit → Redirect to dashboard
2. **Failed Login:** Enter invalid credentials → Submit → Error displays
3. **OAuth Login:** Click Google → Authenticate → Redirect to dashboard

**Test Data:**
- Valid credentials
- Invalid credentials
- OAuth accounts

---

### Screen: Signup (`/[clinic]/portal/signup`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Name validation
- [ ] Email validation
- [ ] Phone validation
- [ ] Password validation
- [ ] Password confirmation matching
- [ ] Terms checkbox logic
- [ ] Form submission logic

#### Integration Tests
- [ ] Valid registration succeeds
- [ ] Duplicate email fails
- [ ] User created in Supabase
- [ ] Profile created
- [ ] Confirmation email sent
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] All form fields work
- [ ] Email validation works
- [ ] Password strength indicator works
- [ ] Password confirmation matching works
- [ ] Terms checkbox required
- [ ] "Crear Cuenta" button works
- [ ] Success message displays
- [ ] "Ya tienes cuenta?" link works
- [ ] Google OAuth button works
- [ ] Responsive design works

**Test Scenarios:**
1. **Successful Signup:** Fill form → Accept terms → Submit → Success → Redirect to login
2. **Validation:** Submit without required fields → Errors display
3. **Duplicate Email:** Enter existing email → Submit → Error displays

**Test Data:**
- New user data
- Existing emails
- Invalid data

---

### Screen: Owner Dashboard (`/[clinic]/portal/dashboard`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Pet card rendering
- [ ] Appointment card rendering
- [ ] Stats calculation
- [ ] Quick action buttons

#### Integration Tests
- [ ] User's pets load
- [ ] Upcoming appointments load
- [ ] Recent activity loads
- [ ] Loyalty points load (if enabled)
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Welcome banner displays
- [ ] Quick actions display
- [ ] Pet cards display
- [ ] "Agregar Mascota" button works
- [ ] "Agendar Cita" button works
- [ ] Pet cards clickable
- [ ] Appointment cards display
- [ ] "Ver Todos" links work
- [ ] Loyalty card displays (if enabled)
- [ ] Responsive design works

**Test Scenarios:**
1. **View Dashboard:** Load → View pets → View appointments → Click pet
2. **Quick Actions:** Click "Agregar Mascota" → Navigate to pet registration

**Test Data:**
- User's pets
- Appointments
- Loyalty points

---

### Screen: Pet Profile (`/[clinic]/portal/pets/[id]`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Tab navigation logic
- [ ] Vaccine list rendering
- [ ] Medical record list rendering
- [ ] Prescription list rendering
- [ ] QR code generation

#### Integration Tests
- [ ] Pet data loads
- [ ] Vaccines load
- [ ] Medical records load
- [ ] Prescriptions load
- [ ] QR code generates
- [ ] Access control (owner only)
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Pet photo displays
- [ ] Pet information displays
- [ ] Tabs work (General, Vacunas, Historial, Recetas)
- [ ] "Editar" button works
- [ ] QR code button works
- [ ] "Agregar Vacuna" button works
- [ ] "Agregar Registro" button works
- [ ] Vaccine rows expand
- [ ] Record rows expand
- [ ] Prescription rows clickable
- [ ] "Descargar PDF" works
- [ ] Responsive design works

**Test Scenarios:**
1. **View Profile:** Load → View general info → Switch tabs → View vaccines → View records
2. **Add Vaccine:** Load → Click "Agregar Vacuna" → Navigate to vaccine form

**Test Data:**
- Pet data
- Vaccines
- Medical records
- Prescriptions

---

### Screen: Add/Edit Pet (`/[clinic]/portal/pets/new` or `/edit`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Form field validation
- [ ] Photo upload logic
- [ ] Photo preview logic
- [ ] Date picker logic
- [ ] Form submission logic

#### Integration Tests
- [ ] Pet created successfully (new)
- [ ] Pet updated successfully (edit)
- [ ] Photo uploaded
- [ ] Photo deleted
- [ ] Form pre-populates (edit)
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] All form fields work
- [ ] Photo upload works (click)
- [ ] Photo upload works (drag & drop)
- [ ] Photo preview displays
- [ ] Photo can be changed
- [ ] Photo can be deleted
- [ ] Form validation works
- [ ] "Guardar Mascota" button works
- [ ] Success redirect works
- [ ] "Cancelar" button works
- [ ] Responsive design works

**Test Scenarios:**
1. **Create Pet:** Load → Fill form → Upload photo → Submit → Redirect to profile
2. **Edit Pet:** Load → Form pre-populated → Update fields → Submit → Changes saved

**Test Data:**
- Pet data
- Photos
- Invalid data

---

### Screen: Add Vaccine (`/[clinic]/portal/pets/[id]/vaccines/new`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Vaccine dropdown logic
- [ ] Date picker logic
- [ ] Next due date calculation
- [ ] Photo upload logic
- [ ] Form validation

#### Integration Tests
- [ ] Vaccine created successfully
- [ ] Vaccine linked to pet
- [ ] Next due date calculated
- [ ] Photos uploaded
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Vaccine dropdown works
- [ ] Date picker works
- [ ] "Calcular Proxima" button works
- [ ] Photo upload works
- [ ] Form validation works
- [ ] "Guardar Vacuna" button works
- [ ] Success redirect works
- [ ] "Cancelar" button works
- [ ] Responsive design works

**Test Scenarios:**
1. **Add Vaccine:** Load → Select vaccine → Select date → Calculate next due → Submit → Redirect

**Test Data:**
- Vaccines
- Dates
- Photos

---

### Screen: Appointments List (`/[clinic]/portal/appointments`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Filter logic
- [ ] Sort logic
- [ ] Appointment card rendering
- [ ] Status badge rendering

#### Integration Tests
- [ ] Appointments load
- [ ] Filtering works
- [ ] Sorting works
- [ ] Status updates work
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Appointments display
- [ ] Date filter works
- [ ] Status filter works
- [ ] Pet filter works
- [ ] "Nueva Cita" button works
- [ ] Appointment cards clickable
- [ ] "Reprogramar" button works
- [ ] "Cancelar" button works
- [ ] Refresh button works
- [ ] Responsive design works

**Test Scenarios:**
1. **View Appointments:** Load → View list → Filter by date → Click appointment
2. **Cancel Appointment:** Load → Click cancel → Confirm → Appointment cancelled

**Test Data:**
- Appointments
- Filters
- Statuses

---

## Dashboard Pages

### Screen: Staff Dashboard (`/[clinic]/dashboard`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Stats card rendering
- [ ] Chart data formatting
- [ ] Alert generation
- [ ] Appointment card rendering

#### Integration Tests
- [ ] Stats load correctly
- [ ] Charts render with data
- [ ] Alerts load
- [ ] Today's appointments load
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Stats cards display
- [ ] Charts render
- [ ] Alerts display
- [ ] Today's appointments display
- [ ] "Check-in" button works
- [ ] "Iniciar" button works
- [ ] "Completar" button works
- [ ] Stat cards clickable
- [ ] Date range selector works
- [ ] Refresh button works
- [ ] Responsive design works

**Test Scenarios:**
1. **View Dashboard:** Load → View stats → View charts → View appointments
2. **Manage Appointment:** Click "Check-in" → Appointment status updates

**Test Data:**
- Dashboard stats
- Chart data
- Appointments
- Alerts

---

### Screen: Appointments Management (`/[clinic]/dashboard/appointments`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Filter logic
- [ ] Appointment card rendering
- [ ] Status button visibility
- [ ] Bulk selection logic

#### Integration Tests
- [ ] Appointments load
- [ ] Filtering works
- [ ] Status updates work
- [ ] Bulk actions work
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Appointments display
- [ ] Filters work
- [ ] "Hoy" button works
- [ ] Status chips work
- [ ] Appointment cards expand
- [ ] "Check-in" button works
- [ ] "Iniciar Consulta" button works
- [ ] "Completar" button works
- [ ] "Marcar No Asistio" button works
- [ ] "Reprogramar" button works
- [ ] "Cancelar" button works
- [ ] Bulk select works
- [ ] Bulk complete works
- [ ] Responsive design works

**Test Scenarios:**
1. **Manage Appointments:** Load → Filter → Check-in → Start → Complete
2. **Bulk Actions:** Select multiple → Bulk complete → All updated

**Test Data:**
- Appointments
- Filters
- Statuses

---

### Screen: Calendar View (`/[clinic]/dashboard/calendar`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Calendar rendering
- [ ] Event rendering
- [ ] View mode switching
- [ ] Date navigation
- [ ] Event drag logic

#### Integration Tests
- [ ] Appointments load
- [ ] Shifts load
- [ ] Time off loads
- [ ] Events display correctly
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Calendar displays
- [ ] Events display
- [ ] View modes work (Day/Week/Month)
- [ ] Navigation works (Previous/Next/Today)
- [ ] Staff filter works
- [ ] Event type filters work
- [ ] Empty slot double-click opens modal
- [ ] Event click opens detail
- [ ] Event drag works (if enabled)
- [ ] Responsive design works

**Test Scenarios:**
1. **View Calendar:** Load → View week → Filter by staff → Click event
2. **Create Appointment:** Double-click empty slot → Fill form → Create

**Test Data:**
- Appointments
- Shifts
- Time off

---

### Screen: Invoice List (`/[clinic]/dashboard/invoices`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Invoice row rendering
- [ ] Filter logic
- [ ] Sort logic
- [ ] Status badge rendering

#### Integration Tests
- [ ] Invoices load
- [ ] Filtering works
- [ ] Sorting works
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Invoices display
- [ ] Status chips work
- [ ] Date range filter works
- [ ] Client search works
- [ ] "Nueva Factura" button works
- [ ] Invoice rows clickable
- [ ] Quick "Enviar" works
- [ ] Quick "Pagado" works
- [ ] Sort headers work
- [ ] Export button works
- [ ] Responsive design works

**Test Scenarios:**
1. **View Invoices:** Load → Filter by status → Search client → Click invoice
2. **Quick Actions:** Click quick "Enviar" → Invoice sent

**Test Data:**
- Invoices
- Filters
- Statuses

---

### Screen: Create Invoice (`/[clinic]/dashboard/invoices/new`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Pet selection logic
- [ ] Line item logic
- [ ] Calculation logic
- [ ] Form validation

#### Integration Tests
- [ ] Invoice created successfully
- [ ] Line items saved
- [ ] Calculations correct
- [ ] PDF generated
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Pet dropdown works
- [ ] Line items can be added
- [ ] Service autocomplete works
- [ ] Quantity controls work
- [ ] Calculations update automatically
- [ ] "Vista Previa" button works
- [ ] "Guardar Borrador" button works
- [ ] "Guardar y Enviar" button works
- [ ] "Cancelar" button works
- [ ] Responsive design works

**Test Scenarios:**
1. **Create Invoice:** Select pet → Add items → Calculate → Save → Send
2. **Draft:** Create invoice → Save as draft → Edit later

**Test Data:**
- Pets
- Services
- Products
- Pricing

---

### Screen: WhatsApp Inbox (`/[clinic]/dashboard/whatsapp`)

**Test Coverage Required:**

#### Unit Tests
- [ ] Conversation list rendering
- [ ] Message thread rendering
- [ ] Template selector logic
- [ ] Message input logic

#### Integration Tests
- [ ] Conversations load
- [ ] Messages load
- [ ] Message sent successfully
- [ ] Template used correctly
- [ ] Multi-tenant isolation

#### E2E Tests
- [ ] Page loads successfully
- [ ] Conversation list displays
- [ ] Conversations clickable
- [ ] Message thread displays
- [ ] Message input works
- [ ] Send button works
- [ ] Template button works
- [ ] Template selector works
- [ ] Variables can be filled
- [ ] Attachment button works
- [ ] Search works
- [ ] Unread filter works
- [ ] Responsive design works

**Test Scenarios:**
1. **Send Message:** Select conversation → Type message → Send
2. **Use Template:** Click template → Fill variables → Send

**Test Data:**
- Conversations
- Messages
- Templates

---

*This document should be updated as new screens are added or existing screens are modified.*

