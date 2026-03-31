# Dashboard Pages Reference (Staff/Admin)

Staff-only pages for clinic operations. All routes under `/[clinic]/dashboard/*`.

**Required Role:** `vet` or `admin`

---

## Table of Contents

1. [Staff Dashboard Home](#1-staff-dashboard-home)
2. [Appointments Management](#2-appointments-management)
3. [Calendar View](#3-calendar-view)
4. [Staff Schedules List](#4-staff-schedules-list)
5. [Individual Staff Schedule](#5-individual-staff-schedule)
6. [Invoices List](#6-invoices-list)
7. [Create Invoice](#7-create-invoice)
8. [Invoice Detail](#8-invoice-detail)
9. [WhatsApp Inbox](#9-whatsapp-inbox)
10. [WhatsApp Templates](#10-whatsapp-templates)

---

## 1. Staff Dashboard Home

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard` |
| **File** | `web/app/[clinic]/dashboard/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
Central operations hub for clinic staff with KPIs and quick actions.

### Sections

#### 1. Stats Cards Row
Real-time KPIs at the top:

| Stat | Icon | Description |
|------|------|-------------|
| Total Mascotas | Paw | Total registered pets |
| Citas Hoy | Calendar | Today's appointments |
| Vacunas Pendientes | Syringe | Upcoming vaccine reminders |
| Facturas Pendientes | Invoice | Unpaid invoices |

Each card shows:
- Large number value
- Trend indicator (up/down arrow)
- Percentage change vs last period
- Color-coded icon
- Alert border if needs attention

#### 2. Today's Appointments Queue
| Element | Description |
|---------|-------------|
| Appointment card | Pet photo, name, time, service |
| Status badge | Current status |
| Quick action buttons | Check-in, Start, Complete |

#### 3. Charts Row
| Chart | Type | Data |
|-------|------|------|
| Appointments Trend | Line | Last 30 days appointments |
| Revenue | Bar | Monthly revenue |
| Species Distribution | Pie | Pets by species |

#### 4. Alerts Section
| Alert Type | Trigger |
|------------|---------|
| Low Inventory | Stock below minimum |
| Overdue Invoices | Invoices past due |
| Vaccine Reminders | Vaccines due this week |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Stat card | Click | Navigate to related section |
| Appointment "Check-in" | Click | Marks patient arrived |
| Appointment "Iniciar" | Click | Starts consultation timer |
| Appointment "Completar" | Click | Opens completion notes |
| Alert item | Click | Navigate to resolve |
| "Ver Todos" | Click | Navigate to full list |
| Date range selector | Select | Adjusts chart data |
| Refresh button | Click | Reloads dashboard data |

### Components Used
- `stats-cards.tsx` - KPI display
- `appointments-chart.tsx` - Trend visualization
- `revenue-chart.tsx` - Financial chart
- `inventory-alerts.tsx` - Low stock warnings
- `upcoming-vaccines.tsx` - Vaccine reminders

---

## 2. Appointments Management

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/appointments` |
| **File** | `web/app/[clinic]/dashboard/appointments/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
Full appointment queue management for staff.

### Sections

#### 1. Filter Bar
| Filter | Type | Options |
|--------|------|---------|
| Date | Date picker | Any date |
| Status | Multi-select | All statuses |
| Service | Dropdown | All services |
| Veterinarian | Dropdown | Staff members |

#### 2. Appointments Queue
List/grid of appointment cards with full details.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Date picker | Select | Shows that day's appointments |
| "Hoy" button | Click | Jumps to today |
| Status filter chips | Click | Toggles status visibility |
| Appointment card | Click | Expands inline details |
| "Check-in" button | Click | Registers arrival timestamp |
| "Iniciar Consulta" | Click | Marks in-progress |
| "Completar" | Click | Opens completion modal |
| Completion notes | Input | Optional visit notes |
| "Marcar No Asistio" | Click | Records no-show |
| "Reprogramar" | Click | Opens reschedule dialog |
| "Cancelar" | Click | Opens cancel dialog |
| Pet link | Click | Opens pet profile |
| Owner link | Click | Opens owner profile |
| Bulk select | Checkbox | Enables bulk actions |
| Bulk complete | Click | Completes selected |

### Appointment Status Flow
```
Pendiente → Confirmada → En Progreso → Completada
    │           │              │
    └→ Cancelada ←─────────────┘
                      │
                      └→ No Asistio
```

### Status Button Visibility

| Status | Check-in | Start | Complete | No-Show | Cancel |
|--------|:--------:|:-----:|:--------:|:-------:|:------:|
| Pendiente | Yes | - | - | Yes | Yes |
| Confirmada | Yes | - | - | Yes | Yes |
| Checked-in | - | Yes | - | Yes | Yes |
| En Progreso | - | - | Yes | - | - |
| Completada | - | - | - | - | - |
| Cancelada | - | - | - | - | - |

---

## 3. Calendar View

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/calendar` |
| **File** | `web/app/[clinic]/dashboard/calendar/page.tsx` |
| **Access** | `vet`, `admin` |
| **Components** | `calendar-container.tsx` |

### Purpose
Visual calendar for appointments, shifts, and time off management.

### View Modes
| Mode | Description |
|------|-------------|
| Day | Single day with hourly slots |
| Week | 7-day grid (default) |
| Month | Monthly overview |

### Event Types
| Type | Color | Description |
|------|-------|-------------|
| Appointments | Blue | Client appointments |
| Shifts | Green | Staff working hours |
| Time Off | Red/Orange | Approved leave |
| Holidays | Gray | Clinic closed |

### User Interactions

#### Navigation
| Element | Interaction | Result |
|---------|-------------|--------|
| Previous/Next arrows | Click | Navigate time period |
| "Hoy" button | Click | Jump to today |
| View toggle (D/W/M) | Click | Switch view mode |
| Date picker | Click | Jump to specific date |

#### Filtering
| Element | Interaction | Result |
|---------|-------------|--------|
| Staff pills | Click | Toggle staff visibility |
| Event type checkboxes | Toggle | Show/hide event types |
| "Todos" | Click | Show all staff |

#### Event Interactions
| Element | Interaction | Result |
|---------|-------------|--------|
| Empty time slot | Double-click | Opens quick-add modal |
| Existing event | Click | Opens event detail modal |
| Event | Drag | Reschedules (if allowed) |
| Event | Drag edges | Changes duration |

### Quick-Add Modal
Create appointment from calendar slot:

| Field | Type | Required |
|-------|------|----------|
| Time | Pre-filled | Yes |
| Pet | Dropdown | Yes |
| Service | Dropdown | No |
| Veterinarian | Dropdown | No |
| Reason | Text | No |
| Notes | Textarea | No |

### Event Detail Modal
| Element | Interaction | Result |
|---------|-------------|--------|
| Event info | View | Type, time, attendees |
| "Editar" | Click | Opens edit form |
| "Eliminar" | Click | Confirmation dialog |
| Close (X) | Click | Closes modal |

---

## 4. Staff Schedules List

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/schedules` |
| **File** | `web/app/[clinic]/dashboard/schedules/page.tsx` |
| **Access** | `admin` |

### Purpose
Manage recurring staff schedules and working hours.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Staff member row | Click | Navigate to individual schedule |
| "Nuevo Horario" | Click | Opens schedule creator |
| Active toggle | Toggle | Enables/disables schedule |
| Copy schedule | Click | Duplicates schedule |
| Delete schedule | Click | Confirmation dialog |

### Schedule Overview Card
| Display | Description |
|---------|-------------|
| Staff name + photo | Identification |
| Weekly hours | Total hours per week |
| Active days | Days with shifts |
| Status badge | Active/Inactive |

---

## 5. Individual Staff Schedule

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/schedules/[staffId]` |
| **File** | `web/app/[clinic]/dashboard/schedules/[staffId]/page.tsx` |
| **Access** | `admin` |
| **Components** | `schedule-editor.tsx` |

### Purpose
Configure individual staff member's recurring schedule.

### Sections

#### 1. Schedule Grid
7-day week grid showing shift times.

| Day | Start Time | End Time | Break |
|-----|------------|----------|-------|
| Lunes | 09:00 | 18:00 | 13:00-14:00 |
| Martes | 09:00 | 18:00 | 13:00-14:00 |
| ... | ... | ... | ... |

#### 2. Time Off Requests
Pending and approved time off for this staff member.

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Day row | Click | Opens time editor |
| Start time | Time picker | Sets shift start |
| End time | Time picker | Sets shift end |
| Break toggle | Toggle | Enables break time |
| Break times | Time pickers | Sets break period |
| Day checkbox | Toggle | Working that day |
| "Copiar a Todos" | Click | Copies to all days |
| "Guardar" | Click | Saves schedule |
| Time off request | Click | Opens request detail |
| "Aprobar" | Click | Approves time off |
| "Rechazar" | Click | Opens rejection reason |

---

## 6. Invoices List

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/invoices` |
| **File** | `web/app/[clinic]/dashboard/invoices/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
View and manage all clinic invoices.

### Filters

| Filter | Type | Options |
|--------|------|---------|
| Status | Chips | Draft, Sent, Paid, Overdue, Void |
| Date Range | Date picker | Custom range |
| Client | Search | Pet owner name |
| Amount | Range | Min/max |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Status chips | Click | Toggles filter |
| Search | Type | Filters by client/invoice# |
| "Nueva Factura" | Click | Navigate to create invoice |
| Invoice row | Click | Navigate to invoice detail |
| Quick "Enviar" | Click | Sends invoice email |
| Quick "Pagado" | Click | Opens payment dialog |
| Sort headers | Click | Sorts by column |
| Export | Click | Downloads CSV |

### Invoice Row Display
| Column | Description |
|--------|-------------|
| # | Invoice number |
| Cliente | Pet owner name |
| Mascota | Pet name |
| Fecha | Invoice date |
| Vence | Due date |
| Total | Amount |
| Estado | Status badge |
| Acciones | Quick actions |

### Status Badges
| Status | Color | Meaning |
|--------|-------|---------|
| Borrador | Gray | Not sent |
| Enviada | Blue | Sent to client |
| Pagada | Green | Fully paid |
| Parcial | Yellow | Partially paid |
| Vencida | Red | Past due |
| Anulada | Dark gray | Voided |

---

## 7. Create Invoice

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/invoices/new` |
| **File** | `web/app/[clinic]/dashboard/invoices/new/page.tsx` |
| **Access** | `vet`, `admin` |
| **Components** | `invoice-form.tsx` |

### Purpose
Generate new invoice for services rendered.

### Form Sections

#### 1. Client/Pet Selection
| Element | Interaction | Result |
|---------|-------------|--------|
| Pet dropdown | Select | Shows pet photo, name, breed |
| Search pets | Type | Filters pet list |
| Auto-fill client | Automatic | From pet's owner |

#### 2. Line Items
| Column | Type | Required |
|--------|------|----------|
| Descripcion | Text/Autocomplete | Yes |
| Servicio | Dropdown | No |
| Cantidad | Number | Yes (default 1) |
| Precio Unit. | Number | Yes |
| Descuento % | Number | No (default 0) |
| Subtotal | Calculated | Auto |

| Element | Interaction | Result |
|---------|-------------|--------|
| Service search | Type | Autocomplete services |
| Service select | Click | Fills description + price |
| Quantity +/- | Click | Adjusts quantity |
| "Agregar Linea" | Click | Adds new empty row |
| Row delete (X) | Click | Removes line item |

#### 3. Notes & Terms
| Field | Type |
|-------|------|
| Notas | Textarea |
| Terminos | Textarea (defaults) |

#### 4. Due Date
| Field | Type | Default |
|-------|------|---------|
| Fecha Vencimiento | Date picker | +30 days |

#### 5. Totals Summary
| Line | Description |
|------|-------------|
| Subtotal | Sum of line items |
| Descuento | Total discounts |
| IVA (10%) | Calculated tax |
| **Total** | Final amount |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Vista Previa" | Click | Shows PDF preview |
| "Guardar Borrador" | Click | Saves as draft |
| "Guardar y Enviar" | Click | Saves + sends email |
| "Cancelar" | Click | Discards, navigate back |

---

## 8. Invoice Detail

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/invoices/[id]` |
| **File** | `web/app/[clinic]/dashboard/invoices/[id]/page.tsx` |
| **Access** | `vet`, `admin` |

### Purpose
View, edit, and manage a specific invoice.

### Sections

#### 1. Header
- Invoice number
- Status badge
- Date / Due date
- Action buttons

#### 2. Client Info
- Pet owner name
- Contact info
- Pet name + photo

#### 3. Line Items Table
Full breakdown of services/products.

#### 4. Totals
Subtotal, discounts, tax, total.

#### 5. Payment History
| Column | Description |
|--------|-------------|
| Fecha | Payment date |
| Metodo | Cash, Card, Transfer |
| Monto | Amount paid |
| Referencia | Transaction ID |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Editar" | Click | Opens edit mode (if draft) |
| "Enviar" | Click | Opens send dialog |
| "Registrar Pago" | Click | Opens payment dialog |
| "Descargar PDF" | Click | Downloads invoice PDF |
| "Anular" | Click | Opens void confirmation |
| Payment row | Click | Shows payment details |
| "Reembolsar" | Click | Opens refund dialog |

### Send Invoice Dialog
| Field | Type |
|-------|------|
| Email | Pre-filled from client |
| Mensaje | Textarea with template |
| "Enviar" | Button |

### Record Payment Dialog
| Field | Type | Required |
|-------|------|----------|
| Monto | Number | Yes |
| Fecha | Date | Yes (default today) |
| Metodo | Dropdown | Yes |
| Referencia | Text | No |
| Notas | Textarea | No |

### Void Invoice Dialog
| Element | Interaction | Result |
|---------|-------------|--------|
| Reason input | Text | Required |
| Warning | View | "Action cannot be undone" |
| "Confirmar Anulacion" | Click | Voids invoice |

---

## 9. WhatsApp Inbox

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/whatsapp` |
| **File** | `web/app/[clinic]/dashboard/whatsapp/page.tsx` |
| **Access** | `vet`, `admin` |
| **Components** | `inbox.tsx` |

### Purpose
Manage WhatsApp conversations with clients.

### Layout
Two-panel layout:
1. **Left Panel** - Conversation list
2. **Right Panel** - Active conversation

### Conversation List (Left Panel)

| Element | Description |
|---------|-------------|
| Client name | Phone number owner |
| Last message preview | Truncated text |
| Timestamp | When last message sent |
| Unread badge | Count of unread messages |
| Pet indicator | If linked to pet |

### User Interactions (List)

| Element | Interaction | Result |
|---------|-------------|--------|
| Conversation row | Click | Loads conversation |
| Search | Type | Filters by name/phone |
| Unread filter | Toggle | Shows only unread |
| "Nueva Conversacion" | Click | Opens new chat |
| New chat phone input | Enter | Starts conversation |

### Message Thread (Right Panel)

| Element | Description |
|---------|-------------|
| Header | Client name, phone, linked pet |
| Message bubbles | Time-ordered messages |
| Date dividers | Groups by date |
| Outgoing | Right-aligned, blue |
| Incoming | Left-aligned, gray |

### User Interactions (Thread)

| Element | Interaction | Result |
|---------|-------------|--------|
| Back arrow (mobile) | Click | Returns to list |
| Client name | Click | Opens client details |
| Pet name | Click | Opens pet profile |
| Message input | Type | Compose message |
| Send button | Click | Sends message |
| Enter key | Press | Sends message |
| Template button | Click | Opens template selector |
| Attachment button | Click | Opens file picker |
| Scroll | Scroll up | Loads older messages |

### Template Selector

| Element | Interaction | Result |
|---------|-------------|--------|
| Template list | View | Available templates |
| Template row | Click | Selects template |
| Variables | View | Shows required variables |
| Variable inputs | Fill | Client name, pet name, etc. |
| Preview | View | Message with variables |
| "Usar Plantilla" | Click | Inserts into composer |

---

## 10. WhatsApp Templates

| Property | Value |
|----------|-------|
| **Route** | `/[clinic]/dashboard/whatsapp/templates` |
| **File** | `web/app/[clinic]/dashboard/whatsapp/templates/page.tsx` |
| **Access** | `admin` |
| **Components** | `template-manager.tsx` |

### Purpose
Create and manage reusable WhatsApp message templates.

### Template Types
| Type | Use Case |
|------|----------|
| Recordatorio Cita | Appointment reminders |
| Vacuna Pendiente | Vaccine due notices |
| Factura | Invoice sending |
| Confirmacion | Booking confirmations |
| General | Custom messages |

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| "Nueva Plantilla" | Click | Opens create form |
| Template card | Click | Opens edit form |
| Template toggle | Toggle | Enables/disables |
| Delete (X) | Click | Confirmation dialog |

### Template Form

| Field | Type | Required |
|-------|------|----------|
| Nombre | Text | Yes |
| Categoria | Dropdown | Yes |
| Contenido | Textarea | Yes |
| Variables | Tags | Auto-detected |

### Available Variables
| Variable | Replaced With |
|----------|---------------|
| `{{cliente}}` | Client full name |
| `{{mascota}}` | Pet name |
| `{{fecha}}` | Formatted date |
| `{{hora}}` | Formatted time |
| `{{servicio}}` | Service name |
| `{{monto}}` | Invoice amount |
| `{{clinica}}` | Clinic name |

### User Interactions (Form)

| Element | Interaction | Result |
|---------|-------------|--------|
| Content textarea | Type | Shows variables as typed |
| Variable button | Click | Inserts variable at cursor |
| Preview tab | Click | Shows rendered example |
| "Guardar" | Click | Saves template |
| "Cancelar" | Click | Discards changes |

---

## Role-Based Access Summary

| Screen | Vet | Admin |
|--------|:---:|:-----:|
| Dashboard Home | Full | Full |
| Appointments | Manage | Manage |
| Calendar | View + Create | Full |
| Schedules List | View | Full CRUD |
| Staff Schedule | View | Edit |
| Invoices List | View + Create | Full |
| Create Invoice | Yes | Yes |
| Invoice Detail | View + Payment | Full |
| WhatsApp Inbox | Send/Receive | Send/Receive |
| WhatsApp Templates | Use | Full CRUD |

---

## Server Actions Used

| Screen | Actions |
|--------|---------|
| Dashboard | `getStaffAppointments`, dashboard stats APIs |
| Appointments | `checkInAppointment`, `startAppointment`, `completeAppointment`, `markNoShow` |
| Calendar | `getStaffSchedules`, appointment CRUD |
| Schedules | `createStaffSchedule`, `updateStaffSchedule`, `deleteStaffSchedule` |
| Invoices | `createInvoice`, `updateInvoiceStatus`, `sendInvoice`, `recordPayment`, `voidInvoice` |
| WhatsApp | `getConversations`, `getMessages`, `sendMessage`, template CRUD |

---

*Last updated: December 2024*
