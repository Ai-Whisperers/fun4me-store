# Portal Pages Reference (Pet Owner)

Authenticated pages for pet owners. All routes under `/[clinic]/portal/*`.

**Required Role:** `owner`, `vet`, or `admin`

---

## Table of Contents

### Authentication
1. [Login](#1-login)
2. [Signup](#2-signup)
3. [Forgot Password](#3-forgot-password)
4. [Reset Password](#4-reset-password)
5. [Logout](#5-logout)

### Dashboard
6. [Owner Dashboard](#6-owner-dashboard)
7. [Patients List](#7-patients-list)

### Pet Management
8. [Add New Pet](#8-add-new-pet)
9. [Pet Profile](#9-pet-profile)
10. [Edit Pet](#10-edit-pet)
11. [Add Vaccine Record](#11-add-vaccine-record)
12. [Add Medical Record](#12-add-medical-record)

### Appointments
13. [Appointments List](#13-appointments-list)
14. [New Appointment](#14-new-appointment)
15. [Appointment Detail](#15-appointment-detail)

### Prescriptions & Products
16. [New Prescription](#16-new-prescription)
17. [Products List](#17-products-list)
18. [New Product](#18-new-product)

### Settings & Information
19. [User Profile](#19-user-profile)
20. [Schedule View](#20-schedule-view)
21. [Team View](#21-team-view)
22. [Finance View](#22-finance-view)
23. [Inventory View](#23-inventory-view)
24. [Campaigns](#24-campaigns)
25. [Epidemiology](#25-epidemiology)
26. [Audit Logs (Admin)](#26-audit-logs-admin)

---

## Authentication

### 1. Login

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/login` |
| **File** | `web/app/[clinic]/portal/login/page.tsx` |
| **Access** | Public (redirects if already logged in) |

### Purpose
Authenticate pet owners to access their portal.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Email input | Type | Email validation |
| Password input | Type | Hidden characters |
| Show/hide password | Click icon | Toggles password visibility |
| "Iniciar Sesion" | Click | Submits login form |
| Loading spinner | View | Shows during authentication |
| Error message | View | Red alert for invalid credentials |
| "Olvidaste tu contrasena?" | Click | Navigate to forgot password |
| "Registrarse" | Click | Navigate to signup |
| Google OAuth button | Click | Initiates Google sign-in |

### Form Validation
- Email: Required, valid email format
- Password: Required, minimum 6 characters

### Post-Login Redirect
- Default: `/[clinic]/portal/dashboard`
- If return URL: Redirects to original destination

---

### 2. Signup

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/signup` |
| **File** | `web/app/[clinic]/portal/signup/page.tsx` |
| **Access** | Public |

### Purpose
Register new pet owner accounts.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Full name input | Type | Required field |
| Email input | Type | Email validation, uniqueness check |
| Phone input | Type | Optional, format validation |
| Password input | Type | Minimum 6 chars, strength indicator |
| Confirm password | Type | Must match password |
| Terms checkbox | Toggle | Required to proceed |
| "Crear Cuenta" | Click | Submits registration |
| Success message | View | Email confirmation sent |
| "Ya tienes cuenta?" | Click | Navigate to login |
| Google OAuth button | Click | Initiates Google sign-up |

### Form Validation
- Name: Required, 2-100 characters
- Email: Required, valid format, not already registered
- Password: Minimum 6 characters
- Confirm: Must match password

### Post-Signup Flow
1. Account created in Supabase Auth
2. Profile created with `owner` role and clinic's `tenant_id`
3. Confirmation email sent
4. Redirected to login with success message

---

### 3. Forgot Password

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/forgot-password` |
| **File** | `web/app/[clinic]/portal/forgot-password/page.tsx` |
| **Access** | Public |

### Purpose
Request password reset email.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Email input | Type | Email validation |
| "Enviar Enlace" | Click | Sends reset email |
| Loading state | View | Spinner during submission |
| Success message | View | "Revisa tu correo" |
| Error message | View | If email not found |
| "Volver al Login" | Click | Navigate to login |

---

### 4. Reset Password

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/reset-password` |
| **File** | `web/app/[clinic]/portal/reset-password/page.tsx` |
| **Access** | Via email link (with token) |

### Purpose
Set new password after receiving reset email.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| New password input | Type | Minimum 6 characters |
| Confirm password | Type | Must match |
| "Cambiar Contrasena" | Click | Updates password |
| Success message | View | Password changed confirmation |
| "Ir al Login" | Click | Navigate to login |
| Invalid/expired token | View | Error message + request new link |

---

### 5. Logout

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/logout` |
| **File** | `web/app/[clinic]/portal/logout/page.tsx` |
| **Access** | Authenticated |

### Purpose
Sign out and clear session.

### Behavior
- Clears Supabase session
- Clears local storage
- Redirects to `/[clinic]/portal/login`

---

## Dashboard

### 6. Owner Dashboard

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/dashboard` |
| **File** | `web/app/[clinic]/portal/dashboard/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |

### Purpose
Main hub for pet owners after login. Overview of pets and appointments.

### Sections
1. **Welcome Banner** - Greeting with user name
2. **Quick Actions** - Add pet, book appointment buttons
3. **My Pets** - Grid of pet cards
4. **Upcoming Appointments** - Next 3 appointments
5. **Recent Activity** - Timeline of recent actions
6. **Loyalty Points** - Points balance card (if enabled)

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Agregar Mascota" | Click | Navigate to `/[clinic]/portal/pets/new` |
| "Agendar Cita" | Click | Navigate to `/[clinic]/portal/appointments/new` |
| Pet card | Click | Navigate to `/[clinic]/portal/pets/[id]` |
| Pet card "Editar" | Click | Navigate to `/[clinic]/portal/pets/[id]/edit` |
| Appointment card | Click | Navigate to `/[clinic]/portal/appointments/[id]` |
| "Ver Todos" (pets) | Click | Navigate to patients list |
| "Ver Todos" (appointments) | Click | Navigate to appointments list |
| Loyalty card | Click | Shows redemption options |

### Components Used
- `loyalty-card.tsx` - Points display with progress
- `appointment-card.tsx` - Upcoming appointments

---

### 7. Patients List

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/dashboard/patients` |
| **File** | `web/app/[clinic]/portal/dashboard/patients/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |

### Purpose
Complete list of owner's registered pets.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Search input | Type | Filters pets by name |
| Species filter | Select | Filters by Dog/Cat/Other |
| Pet card | Click | Navigate to pet profile |
| "Agregar Mascota" | Click | Navigate to add pet form |
| Sort dropdown | Select | Sort by name, age, recent |
| Empty state | View | Prompt to add first pet |

---

## Pet Management

### 8. Add New Pet

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/pets/new` |
| **File** | `web/app/[clinic]/portal/pets/new/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |
| **Components** | `edit-pet-form.tsx` |

### Purpose
Register a new pet in the system.

### Form Sections

#### Basic Information
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Photo | File upload | No | Image files only, max 5MB |
| Name | Text | Yes | 1-100 characters |
| Species | Dropdown | Yes | Perro, Gato, Otro |
| Breed | Text | No | Free text |
| Birth Date | Date picker | No | Cannot be future date |
| Sex | Radio | No | Macho, Hembra |
| Neutered | Checkbox | No | Boolean |
| Color/Markings | Text | No | Free text |
| Weight | Number | No | Positive number (kg) |

#### Health Information
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Temperament | Dropdown | No | Amigable, Timido, Agresivo, Tranquilo |
| Allergies | Text | No | Free text |
| Existing Conditions | Textarea | No | Free text |
| Microchip ID | Text | No | Alphanumeric |

#### Diet Information
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Diet Category | Dropdown | No | Regular, Premium, Prescription, Raw |
| Diet Notes | Textarea | No | Free text |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Photo area | Click | Opens file picker |
| Photo area | Drag & drop | Uploads photo |
| Photo "Cambiar" | Hover + click | Replace photo |
| Photo "Eliminar" | Click | Removes photo |
| Form fields | Input | Real-time validation |
| "Guardar Mascota" | Click | Submits form |
| Loading state | View | Spinner on button |
| Success | Redirect | Navigate to pet profile |
| Error | View | Red error messages per field |
| "Cancelar" | Click | Navigate back |

---

### 9. Pet Profile

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/pets/[id]` |
| **File** | `web/app/[clinic]/portal/pets/[id]/page.tsx` |
| **Access** | Owner of pet, `vet`, `admin` |

### Purpose
Complete pet profile with medical history, vaccines, and records.

### Sections

#### Header
- Pet photo (large, circular)
- Pet name and basic info
- QR code badge
- Edit button

#### Quick Stats
- Age
- Weight
- Species/Breed
- Neutered status

#### Tabs
1. **General** - Basic information
2. **Vacunas** - Vaccine records
3. **Historial** - Medical records timeline
4. **Recetas** - Prescriptions

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Editar" button | Click | Navigate to edit pet |
| QR code | Click | Opens QR generator modal |
| Tab buttons | Click | Switches visible section |
| "Agregar Vacuna" | Click | Navigate to add vaccine |
| Vaccine row | Click | Expands vaccine details |
| "Agregar Registro" | Click | Navigate to add medical record |
| Record row | Click | Expands record details |
| Prescription row | Click | Opens prescription modal |
| "Descargar PDF" | Click | Downloads prescription PDF |
| "Ver Certificado" | Click | Downloads vaccine certificate |
| Photo | Click | Opens lightbox |

### Components Used
- `qr-generator.tsx` - QR code generation
- `vaccine-schedule.tsx` - Vaccine timeline
- `prescription-download-button.tsx` - PDF export

---

### 10. Edit Pet

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/pets/[id]/edit` |
| **File** | `web/app/[clinic]/portal/pets/[id]/edit/page.tsx` |
| **Access** | Owner of pet, `vet`, `admin` |
| **Components** | `edit-pet-form.tsx` |

### Purpose
Modify existing pet information.

### User Interactions

Same as "Add New Pet" with additions:

| Element | Interaction | Result |
|---------|-------------|--------|
| Form | Load | Pre-populated with existing data |
| "Guardar Cambios" | Click | Updates pet |
| "Eliminar Mascota" | Click | Opens delete confirmation |

### Delete Section (Danger Zone)
| Element | Interaction | Result |
|---------|-------------|--------|
| "Eliminar Mascota" | Click | Opens confirmation dialog |
| Confirmation dialog | Type pet name | Enables delete button |
| "Confirmar Eliminacion" | Click | Soft deletes pet |
| Cancel | Click | Closes dialog |

---

### 11. Add Vaccine Record

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/pets/[id]/vaccines/new` |
| **File** | `web/app/[clinic]/portal/pets/[id]/vaccines/new/page.tsx` |
| **Access** | `vet`, `admin` (owners can view but not add) |

### Purpose
Record a new vaccination for a pet.

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Vaccine Name | Dropdown | Yes | From vaccine list |
| Date Administered | Date | Yes | Cannot be future |
| Batch Number | Text | No | Alphanumeric |
| Next Due Date | Date | No | Must be after administered date |
| Administered By | Dropdown | No | Staff members |
| Notes | Textarea | No | Free text |
| Photos | Multi-upload | No | Image files, max 3 |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Vaccine dropdown | Select | Pre-fills typical interval |
| Date picker | Select | Sets administered date |
| "Calcular Proxima" | Click | Auto-calculates next due |
| Photo upload | Click/drag | Adds vaccine record photos |
| "Guardar Vacuna" | Click | Submits vaccine record |
| Success | Redirect | Navigate to pet profile vaccines tab |
| "Cancelar" | Click | Navigate back |

---

### 12. Add Medical Record

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/pets/[id]/records/new` |
| **File** | `web/app/[clinic]/portal/pets/[id]/records/new/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
Add consultation, exam, surgery, or other medical record.

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Record Type | Dropdown | Yes | Consulta, Examen, Cirugia, Emergencia, Control |
| Title | Text | Yes | 3-200 characters |
| Date | Date | Yes | Cannot be future |
| Diagnosis | Autocomplete | No | From diagnosis codes |
| Notes | Rich textarea | No | Free text with formatting |
| Attachments | Multi-upload | No | PDF, images |

### Vitals Section
| Field | Type | Required |
|-------|------|----------|
| Weight | Number (kg) | No |
| Temperature | Number (°C) | No |
| Heart Rate | Number (bpm) | No |
| Respiratory Rate | Number (rpm) | No |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Record type | Select | May show additional fields |
| Diagnosis search | Type | Autocomplete from VeNom codes |
| Diagnosis result | Click | Adds to record |
| File upload | Click/drag | Attaches to record |
| "Guardar Registro" | Click | Submits medical record |
| Success | Redirect | Navigate to pet profile history tab |

---

## Appointments

### 13. Appointments List

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/appointments` |
| **File** | `web/app/[clinic]/portal/appointments/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |

### Purpose
View all appointments (upcoming and past).

### Sections
1. **Filters** - Date range, status, pet
2. **Upcoming** - Future appointments
3. **Past** - Historical appointments

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Date filter | Select range | Filters by date |
| Status filter | Select | Filters by status |
| Pet filter | Select | Filters by pet |
| "Nueva Cita" | Click | Navigate to new appointment |
| Appointment card | Click | Navigate to appointment detail |
| Card "Reprogramar" | Click | Opens reschedule dialog |
| Card "Cancelar" | Click | Opens cancel confirmation |
| Refresh button | Click | Reloads appointments |

### Appointment Statuses
| Status | Color | Description |
|--------|-------|-------------|
| Pendiente | Yellow | Awaiting confirmation |
| Confirmada | Green | Confirmed |
| Completada | Blue | Finished |
| Cancelada | Red | Cancelled |
| No Asistio | Gray | No-show |

---

### 14. New Appointment

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/appointments/new` |
| **File** | `web/app/[clinic]/portal/appointments/new/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |
| **Components** | `booking-wizard.tsx` |

### Purpose
Book a new appointment (same as public booking wizard).

See [Appointment Booking](#8-appointment-booking) in Public Pages for full documentation.

---

### 15. Appointment Detail

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/appointments/[id]` |
| **File** | `web/app/[clinic]/portal/appointments/[id]/page.tsx` |
| **Access** | Owner of appointment, `vet`, `admin` |

### Purpose
View and manage a specific appointment.

### Sections
1. **Header** - Status badge, date/time
2. **Pet Info** - Pet photo and details
3. **Service** - Service booked with price
4. **Notes** - Appointment notes
5. **Actions** - Reschedule, cancel buttons

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Reprogramar" | Click | Opens reschedule dialog |
| "Cancelar Cita" | Click | Opens cancel confirmation |
| Cancel reason | Input | Required for cancellation |
| "Confirmar Cancelacion" | Click | Cancels appointment |
| "Descargar Ticket" | Click | Downloads appointment ticket |
| "Agregar al Calendario" | Click | Downloads .ics file |
| Pet link | Click | Navigate to pet profile |

### Reschedule Dialog
| Element | Interaction | Result |
|---------|-------------|--------|
| Date picker | Select | Minimum is tomorrow |
| Time slots | Click | Select new time |
| "Confirmar" | Click | Submits reschedule request |
| Info banner | View | "Subject to confirmation" |

---

## Prescriptions & Products

### 16. New Prescription

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/prescriptions/new` |
| **File** | `web/app/[clinic]/portal/prescriptions/new/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
Create a new prescription for a pet.

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Pet | Dropdown | Yes | Clinic pets |
| Drug | Autocomplete | Yes | From drug database |
| Dosage | Calculated | Yes | Auto from weight × mg/kg |
| Frequency | Dropdown | Yes | Once daily, BID, TID, etc. |
| Duration | Number + unit | Yes | Days, weeks, months |
| Instructions | Textarea | No | Special instructions |
| Refills | Number | No | 0-5 refills allowed |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Pet dropdown | Select | Loads pet weight for calculation |
| Drug search | Type | Shows matching drugs |
| Drug result | Click | Auto-calculates dosage |
| Manual dosage | Toggle | Allows manual override |
| "Agregar Medicamento" | Click | Adds another drug row |
| Remove drug | Click X | Removes drug from prescription |
| "Crear Receta" | Click | Generates prescription |
| Preview | View | Shows prescription PDF preview |
| "Descargar PDF" | Click | Downloads prescription |
| Digital signature | View | Vet's signature on document |

---

### 17. Products List

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/products` |
| **File** | `web/app/[clinic]/portal/products/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
View and manage store products (staff view).

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Search | Type | Filters by name, SKU |
| Category filter | Select | Filters by category |
| Stock filter | Toggle | Show low stock only |
| "Nuevo Producto" | Click | Navigate to add product |
| Product row | Click | Opens edit modal |
| Stock indicator | View | Red if below minimum |
| Quick edit stock | Click number | Inline edit |

---

### 18. New Product

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/products/new` |
| **File** | `web/app/[clinic]/portal/products/new/page.tsx` |
| **Access** | `admin` |

### Purpose
Add new product to store inventory.

### Form Fields
| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| SKU | Text | Yes |
| Category | Dropdown | Yes |
| Price | Number | Yes |
| Cost | Number | No |
| Initial Stock | Number | Yes |
| Minimum Stock | Number | No |
| Description | Textarea | No |
| Image | File upload | No |

---

## Settings & Information

### 19. User Profile

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/profile` |
| **File** | `web/app/[clinic]/portal/profile/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |

### Purpose
Update personal information and preferences.

### Form Fields
| Field | Type | Required |
|-------|------|----------|
| Full Name | Text | Yes |
| Email | Text | Read-only |
| Phone | Tel | No |
| Secondary Phone | Tel | No |
| Address | Text | No |
| City | Text | No |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Form fields | Edit | Real-time validation |
| "Guardar Cambios" | Click | Updates profile |
| Success toast | View | "Perfil actualizado" |
| "Cambiar Contrasena" | Click | Opens password change section |
| Password fields | Input | Requires current + new + confirm |

---

### 20. Schedule View

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/schedule` |
| **File** | `web/app/[clinic]/portal/schedule/page.tsx` |
| **Access** | `owner`, `vet`, `admin` |

### Purpose
View clinic operating hours and staff availability.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Week navigation | Click arrows | Previous/next week |
| Day column | View | Shows open hours |
| Staff filter | Select | Shows specific vet availability |
| Holiday indicator | View | Closed days highlighted |

---

### 21. Team View

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/team` |
| **File** | `web/app/[clinic]/portal/team/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
View and manage clinic team members.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Team member card | Click | Shows profile |
| "Invitar" | Click | Opens invite dialog (admin) |
| Invite email | Input | Email address |
| Invite role | Select | vet or admin |
| "Enviar Invitacion" | Click | Sends invite email |
| Pending invites | View | List of pending invitations |
| Remove invite | Click X | Cancels invitation |

---

### 22. Finance View

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/finance` |
| **File** | `web/app/[clinic]/portal/finance/page.tsx` |
| **Access** | `admin` |

### Purpose
Financial overview and expense tracking.

### Sections
1. **Summary Cards** - Revenue, expenses, profit
2. **Revenue Chart** - Monthly trends
3. **Recent Invoices** - Quick access
4. **Expenses** - Expense list

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Date range | Select | Filters data |
| "Agregar Gasto" | Click | Opens expense form |
| Expense form | Submit | Logs expense |
| Invoice link | Click | Navigate to invoice |
| Export button | Click | Downloads report CSV |

---

### 23. Inventory View

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/inventory` |
| **File** | `web/app/[clinic]/portal/inventory/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
Manage store inventory and stock levels.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Search | Type | Filters products |
| Low stock toggle | Toggle | Shows only low stock |
| Product row | Click | Opens stock adjustment |
| Adjust stock | +/- buttons | Adds/removes stock |
| Reason dropdown | Select | Stock adjustment reason |
| "Guardar" | Click | Records adjustment |
| Import button | Click | Opens CSV import |
| Export button | Click | Downloads inventory CSV |

---

### 24. Campaigns

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/campaigns` |
| **File** | `web/app/[clinic]/portal/campaigns/page.tsx` |
| **Access** | `admin` |

### Purpose
Manage marketing campaigns and broadcasts.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Nueva Campana" | Click | Opens campaign creator |
| Campaign list | View | Shows active/scheduled |
| Campaign row | Click | Opens campaign detail |
| Audience selector | Multi-select | Choose recipients |
| Message template | Select/edit | Campaign content |
| Schedule | Date/time picker | When to send |
| "Enviar" | Click | Sends/schedules campaign |

---

### 25. Epidemiology

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/epidemiology` |
| **File** | `web/app/[clinic]/portal/epidemiology/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
Disease tracking and epidemiology reports.

### Sections
1. **Heatmap** - Geographic disease distribution
2. **Trends** - Condition frequency over time
3. **Alerts** - Outbreak notifications
4. **Reports** - Downloadable reports

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Condition filter | Select | Filters by diagnosis |
| Date range | Select | Filters time period |
| Heatmap zoom | Scroll/pinch | Zooms map |
| Heatmap marker | Click | Shows case details |
| Export report | Click | Downloads PDF |

---

### 26. Audit Logs (Admin)

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/portal/admin/audit` |
| **File** | `web/app/[clinic]/portal/admin/audit/page.tsx` |
| **Access** | `admin` only |

### Purpose
View system audit trail for security and compliance.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| User filter | Select | Filters by user |
| Action filter | Select | Filters by action type |
| Date range | Select | Filters time period |
| Log entry | Click | Expands details |
| Export | Click | Downloads audit log CSV |

### Logged Actions
- User logins/logouts
- Pet CRUD operations
- Appointment changes
- Invoice changes
- Profile updates
- Permission changes

---

## Role-Based Access Summary

| Screen | Owner | Vet | Admin |
|--------|:-----:|:---:|:-----:|
| Dashboard | View own | View all | View all |
| Pets | Own only | All | All |
| Add Vaccine | - | Yes | Yes |
| Add Medical Record | - | Yes | Yes |
| Prescriptions | View own | Create | Create |
| Appointments | Own only | All | All |
| Products | - | View | Full |
| Team | - | View | Full |
| Finance | - | - | Full |
| Inventory | - | View | Full |
| Campaigns | - | - | Full |
| Epidemiology | - | View | Full |
| Audit Logs | - | - | Full |

---

*Last updated: December 2024*
