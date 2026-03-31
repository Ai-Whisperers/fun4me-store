# Dashboard (Staff) Test Plan

> **Area**: Staff dashboard and operations  
> **Routes**: 30 dashboard routes  
> **Priority**: Critical (business operations)

---

## Overview

### Scope
All staff-only pages for veterinarians and administrators under `/[clinic]/dashboard/*` routes.

### Test Coverage Goals
- **Unit Tests**: 80%
- **Integration Tests**: 95%
- **Functionality Tests**: 90%
- **UAT Tests**: 80% (critical workflows)
- **E2E Tests**: 70% (critical pages)

---

## Test Areas

### 1. Dashboard Overview

#### 1.1 Main Dashboard (`/[clinic]/dashboard`)

**Test Cases**:
- ✅ Stats cards display correctly
- ✅ Total pets count accurate
- ✅ Today's appointments count accurate
- ✅ Pending vaccines count accurate
- ✅ Unpaid invoices count accurate
- ✅ Stats update in real-time
- ✅ Trend indicators display
- ✅ Today's appointments queue displays
- ✅ Appointment cards render
- ✅ Check-in button works
- ✅ Start appointment button works
- ✅ Complete appointment button works
- ✅ Charts render correctly
- ✅ Appointments trend chart
- ✅ Revenue chart
- ✅ Species distribution chart
- ✅ Alerts section displays
- ✅ Low inventory alerts
- ✅ Overdue invoice alerts
- ✅ Vaccine reminder alerts
- ✅ Navigation works
- ✅ Role-based access (vet/admin only)
- ✅ Multi-tenant isolation

**Test Files**:
- `tests/functionality/dashboard/overview.test.ts`
- `tests/integration/dashboard/stats.test.ts`
- `e2e/dashboard/overview.spec.ts`

---

### 2. Appointments Management

#### 2.1 Appointments List (`/[clinic]/dashboard/appointments`)

**Test Cases**:
- ✅ All appointments display
- ✅ Filter by date works
- ✅ Filter by status works
- ✅ Filter by service works
- ✅ Filter by veterinarian works
- ✅ "Hoy" button jumps to today
- ✅ Appointment cards render
- ✅ Status badges display
- ✅ Check-in button works
- ✅ Start appointment button works
- ✅ Complete appointment button works
- ✅ No-show button works
- ✅ Reschedule button works
- ✅ Cancel button works
- ✅ Bulk selection works
- ✅ Bulk actions work
- ✅ Export to CSV works
- ✅ Empty state displays
- ✅ Loading state displays
- ✅ Error state handles failures

**Test Files**:
- `tests/functionality/dashboard/appointments.test.ts`
- `tests/integration/booking/appointments.test.ts`
- `e2e/dashboard/appointments.spec.ts`

#### 2.2 Check-In Appointment

**Test Cases**:
- ✅ Check-in button marks appointment as checked-in
- ✅ Arrival timestamp recorded
- ✅ Status updated to "Checked-in"
- ✅ Appointment moves in queue
- ✅ Notification sent (if configured)
- ✅ Cannot check-in twice

**Test Files**:
- `tests/integration/booking/check-in.test.ts`
- `e2e/dashboard/appointments.spec.ts`

#### 2.3 Start Appointment

**Test Cases**:
- ✅ Start button marks appointment as in-progress
- ✅ Status updated to "En Progreso"
- ✅ Start timestamp recorded
- ✅ Timer starts (if implemented)
- ✅ Cannot start if not checked-in

**Test Files**:
- `tests/integration/booking/appointments.test.ts`
- `e2e/dashboard/appointments.spec.ts`

#### 2.4 Complete Appointment

**Test Cases**:
- ✅ Complete button opens completion modal
- ✅ Completion notes input
- ✅ Appointment marked as completed
- ✅ Status updated to "Completada"
- ✅ End timestamp recorded
- ✅ Duration calculated
- ✅ Notes saved
- ✅ Medical record can be created
- ✅ Invoice can be created

**Test Files**:
- `tests/integration/booking/appointments.test.ts`
- `e2e/dashboard/appointments.spec.ts`

#### 2.5 Mark No-Show

**Test Cases**:
- ✅ No-show button marks appointment
- ✅ Status updated to "No Asistio"
- ✅ No-show reason recorded (optional)
- ✅ Slot freed up
- ✅ Notification sent to owner

**Test Files**:
- `tests/integration/booking/appointments.test.ts`
- `e2e/dashboard/appointments.spec.ts`

#### 2.6 Appointment Status Transitions

**Test Cases**:
- ✅ Valid status transitions work
- ✅ Invalid transitions prevented
- ✅ Status history tracked
- ✅ Audit trail created

**Test Files**:
- `tests/integration/booking/status-transitions.test.ts`

---

### 3. Calendar

#### 3.1 Calendar View (`/[clinic]/dashboard/calendar`)

**Test Cases**:
- ✅ Calendar renders correctly
- ✅ Day view works
- ✅ Week view works (default)
- ✅ Month view works
- ✅ View toggle works
- ✅ Previous/Next navigation works
- ✅ "Hoy" button jumps to today
- ✅ Date picker works
- ✅ Appointments display as events
- ✅ Shifts display as events
- ✅ Time off displays as events
- ✅ Event colors correct
- ✅ Event tooltips display
- ✅ Staff filter works
- ✅ Event type filter works
- ✅ Empty slot double-click opens quick-add
- ✅ Event click opens detail modal
- ✅ Event drag-and-drop works (if implemented)
- ✅ Event resize works (if implemented)

**Test Files**:
- `tests/functionality/dashboard/calendar.test.ts`
- `e2e/dashboard/calendar.spec.ts`

#### 3.2 Quick-Add Appointment

**Test Cases**:
- ✅ Modal opens on empty slot click
- ✅ Time pre-filled
- ✅ Pet selection works
- ✅ Service selection works
- ✅ Veterinarian selection works
- ✅ Reason input works
- ✅ Appointment created on submit
- ✅ Event appears on calendar
- ✅ Slot validation works

**Test Files**:
- `tests/integration/booking/appointments.test.ts`
- `e2e/dashboard/calendar.spec.ts`

#### 3.3 Event Detail Modal

**Test Cases**:
- ✅ Modal opens on event click
- ✅ Event information displays
- ✅ Edit button works
- ✅ Delete button works
- ✅ Close button works

**Test Files**:
- `tests/functionality/dashboard/calendar.test.ts`
- `e2e/dashboard/calendar.spec.ts`

---

### 4. Invoicing

#### 4.1 Invoices List (`/[clinic]/dashboard/invoices`)

**Test Cases**:
- ✅ All invoices display
- ✅ Filter by status works
- ✅ Filter by date range works
- ✅ Filter by client works
- ✅ Filter by amount range works
- ✅ Search works
- ✅ Invoice rows render
- ✅ Status badges display
- ✅ Quick "Enviar" button works
- ✅ Quick "Pagado" button works
- ✅ "Nueva Factura" button works
- ✅ Invoice rows link to details
- ✅ Sort by column works
- ✅ Export to CSV works
- ✅ Empty state displays

**Test Files**:
- `tests/functionality/dashboard/invoices.test.ts`
- `tests/integration/invoices/crud.test.ts`
- `e2e/dashboard/invoices.spec.ts`

#### 4.2 Create Invoice (`/[clinic]/dashboard/invoices/new`)

**Test Cases**:
- ✅ Form displays correctly
- ✅ Pet selection works
- ✅ Client auto-filled from pet
- ✅ Line items section
- ✅ Add line item works
- ✅ Remove line item works
- ✅ Service autocomplete works
- ✅ Service selection fills description and price
- ✅ Quantity input works
- ✅ Price input works
- ✅ Discount input works
- ✅ Subtotal calculates correctly
- ✅ Tax calculates correctly (10% IVA)
- ✅ Total calculates correctly
- ✅ Notes input works
- ✅ Terms input works
- ✅ Due date picker works (default +30 days)
- ✅ "Vista Previa" shows PDF preview
- ✅ "Guardar Borrador" saves as draft
- ✅ "Guardar y Enviar" saves and sends email
- ✅ Invoice created successfully
- ✅ Redirects to invoice detail

**Test Files**:
- `tests/unit/actions/invoices.test.ts`
- `tests/integration/invoices/crud.test.ts`
- `tests/functionality/dashboard/invoices.test.ts`
- `e2e/dashboard/invoices.spec.ts`

#### 4.3 Invoice Detail (`/[clinic]/dashboard/invoices/[id]`)

**Test Cases**:
- ✅ Invoice details display
- ✅ Invoice number displays
- ✅ Status badge displays
- ✅ Date and due date display
- ✅ Client information displays
- ✅ Pet information displays
- ✅ Line items table displays
- ✅ Totals display correctly
- ✅ Payment history displays
- ✅ "Editar" button works (if draft)
- ✅ "Enviar" button works
- ✅ "Registrar Pago" button works
- ✅ "Descargar PDF" button works
- ✅ "Anular" button works
- ✅ PDF generation works
- ✅ PDF download works

**Test Files**:
- `tests/functionality/dashboard/invoices.test.ts`
- `tests/integration/invoices/crud.test.ts`
- `e2e/dashboard/invoices.spec.ts`

#### 4.4 Send Invoice

**Test Cases**:
- ✅ Send dialog opens
- ✅ Email pre-filled from client
- ✅ Message template displays
- ✅ Email sent successfully
- ✅ Status updated to "Enviada"
- ✅ Sent timestamp recorded
- ✅ Email delivery confirmation

**Test Files**:
- `tests/integration/invoices/send.test.ts`
- `e2e/dashboard/invoices.spec.ts`

#### 4.5 Record Payment

**Test Cases**:
- ✅ Payment dialog opens
- ✅ Amount input works
- ✅ Date picker works (default today)
- ✅ Payment method selection works
- ✅ Reference input works
- ✅ Notes input works
- ✅ Payment recorded successfully
- ✅ Invoice status updated
- ✅ Payment history updated
- ✅ Partial payment handling
- ✅ Overpayment handling

**Test Files**:
- `tests/integration/invoices/payments.test.ts`
- `e2e/dashboard/invoices.spec.ts`

#### 4.6 Void Invoice

**Test Cases**:
- ✅ Void dialog opens
- ✅ Reason input required
- ✅ Warning message displays
- ✅ Invoice voided successfully
- ✅ Status updated to "Anulada"
- ✅ Void reason recorded
- ✅ Cannot void if paid
- ✅ Audit trail created

**Test Files**:
- `tests/integration/invoices/void.test.ts`
- `e2e/dashboard/invoices.spec.ts`

#### 4.7 Invoice Calculations

**Test Cases**:
- ✅ Subtotal calculation correct
- ✅ Discount calculation correct
- ✅ Tax calculation correct (10% IVA)
- ✅ Total calculation correct
- ✅ Rounding correct (2 decimal places)
- ✅ Currency formatting correct

**Test Files**:
- `tests/functionality/dashboard/invoices.test.ts`
- `tests/unit/lib/currency-rounding.test.ts`

---

### 5. Inventory Management

#### 5.1 Inventory List (`/[clinic]/portal/inventory`)

**Test Cases**:
- ✅ All inventory items display
- ✅ Filter by category works
- ✅ Filter by stock level works
- ✅ Search works
- ✅ Product rows render
- ✅ Stock levels display
- ✅ Low stock indicators
- ✅ "Nuevo Producto" button works
- ✅ Product rows link to details
- ✅ Export to CSV works
- ✅ Import from CSV works
- ✅ Empty state displays

**Test Files**:
- `tests/functionality/dashboard/inventory.test.ts`
- `tests/integration/inventory/crud.test.ts`
- `e2e/dashboard/inventory.spec.ts`

#### 5.2 Stock Tracking

**Test Cases**:
- ✅ Stock levels update on sale
- ✅ Stock levels update on adjustment
- ✅ Low stock alerts trigger
- ✅ Out of stock handling
- ✅ Stock history tracked

**Test Files**:
- `tests/integration/inventory/stock-tracking.test.ts`

#### 5.3 Inventory Alerts

**Test Cases**:
- ✅ Low stock alerts display
- ✅ Alert threshold configurable
- ✅ Alerts appear on dashboard
- ✅ Alert resolution works

**Test Files**:
- `tests/integration/inventory/alerts.test.ts`

---

### 6. Finance & Expenses

#### 6.1 Expenses (`/[clinic]/portal/finance`)

**Test Cases**:
- ✅ Expenses list displays
- ✅ Filter by category works
- ✅ Filter by date range works
- ✅ Add expense works
- ✅ Edit expense works
- ✅ Delete expense works
- ✅ Expense categories work
- ✅ Expense totals calculate
- ✅ Export works

**Test Files**:
- `tests/functionality/dashboard/finance.test.ts`
- `tests/integration/finance/expenses.test.ts`
- `e2e/dashboard/finance.spec.ts`

#### 6.2 P&L Reports

**Test Cases**:
- ✅ P&L report generates
- ✅ Revenue calculates correctly
- ✅ Expenses calculate correctly
- ✅ Profit calculates correctly
- ✅ Date range filtering works
- ✅ Export works

**Test Files**:
- `tests/integration/finance/pl.test.ts`

---

### 7. Team Management

#### 7.1 Team List (`/[clinic]/portal/team`)

**Test Cases**:
- ✅ Team members display
- ✅ Roles display
- ✅ "Invitar Staff" button works
- ✅ Edit member works
- ✅ Remove member works
- ✅ Role assignment works
- ✅ Permission validation

**Test Files**:
- `tests/functionality/dashboard/team.test.ts`
- `tests/integration/team/management.test.ts`
- `e2e/dashboard/team.spec.ts`

#### 7.2 Staff Schedules

**Test Cases**:
- ✅ Schedules list displays
- ✅ Individual schedule displays
- ✅ Schedule editing works
- ✅ Recurring schedules work
- ✅ Time off integration works

**Test Files**:
- `tests/integration/schedules/schedules.test.ts`
- `e2e/dashboard/schedules.spec.ts`

---

### 8. WhatsApp Integration

#### 8.1 WhatsApp Inbox (`/[clinic]/dashboard/whatsapp`)

**Test Cases**:
- ✅ Conversations list displays
- ✅ Conversation selection works
- ✅ Messages display
- ✅ Send message works
- ✅ Template selection works
- ✅ Variable substitution works
- ✅ Attachment upload works
- ✅ Search conversations works
- ✅ Unread filter works

**Test Files**:
- `tests/functionality/dashboard/whatsapp.test.ts`
- `tests/integration/whatsapp/messaging.test.ts`
- `e2e/dashboard/whatsapp.spec.ts`

#### 8.2 WhatsApp Templates

**Test Cases**:
- ✅ Templates list displays
- ✅ Create template works
- ✅ Edit template works
- ✅ Delete template works
- ✅ Template variables work
- ✅ Template preview works

**Test Files**:
- `tests/integration/whatsapp/templates.test.ts`

---

## User Acceptance Test Scenarios

### Scenario 1: Complete Appointment Workflow

**Steps**:
1. View dashboard
2. Check-in appointment
3. Start appointment
4. Complete appointment with notes
5. Create invoice
6. Record payment
7. Send invoice

**Test File**: `tests/uat/vet/manage-appointments.test.ts`

### Scenario 2: Create Invoice & Process Payment

**Steps**:
1. Navigate to invoices
2. Create new invoice
3. Add line items
4. Calculate totals
5. Save and send
6. Record payment
7. Verify status update

**Test File**: `tests/uat/vet/create-invoice.test.ts`

---

## Test Implementation Priority

### Phase 1 (Critical - Week 1-2)
1. Dashboard overview
2. Appointments management
3. Invoice creation and management

### Phase 2 (High - Week 3-4)
4. Calendar
5. Inventory management
6. Finance & expenses

### Phase 3 (Medium - Week 5+)
7. Team management
8. WhatsApp integration
9. UAT scenarios

---

## Test Files Summary

| Test Type | Files | Coverage |
|-----------|-------|----------|
| **Unit** | 8 files | Actions |
| **Integration** | 15 files | All features |
| **Functionality** | 12 files | All pages |
| **UAT** | 5 files | Critical workflows |
| **E2E** | 10 files | Critical pages |
| **Total** | **50 files** | **90% coverage** |

---

*Last Updated: December 2024*

