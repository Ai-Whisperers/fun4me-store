# Agent-05: Invoicing UI

**Agent ID**: Agent-05
**Domain**: Invoice Creation & Management UI
**Priority**: 🟡 High
**Estimated Total Effort**: 10-14 hours
**Status**: ✅ Completed

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/invoices/            # CREATE directory
  - page.tsx                                # Invoice list
  - new/page.tsx                            # Create invoice
  - [id]/page.tsx                           # Invoice detail
  - [id]/edit/page.tsx                      # Edit invoice
app/actions/invoices.ts                     # CREATE
components/invoices/                        # CREATE directory
lib/types/invoicing.ts                      # CREATE
db/60_*.sql through db/69_*.sql            # Reserved range
tests/unit/invoices/                        # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
app/api/invoices/*                          # API exists - USE IT
app/api/services/route.ts                   # Services API exists
lib/types/database.ts                       # Existing types
components/ui/*                             # Reuse these
```

### Files I must NOT touch
```
app/api/invoices/*                          # Already implemented
Everything else
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. `documentation/feature-gaps/08-api-gaps.md` - API reference

**Important**: The invoicing API is already implemented! Your job is to build the UI that uses it.

### Existing API Endpoints
```
GET    /api/invoices          - List invoices
POST   /api/invoices          - Create invoice
GET    /api/invoices/[id]     - Get invoice
PATCH  /api/invoices/[id]     - Update invoice
DELETE /api/invoices/[id]     - Delete invoice
POST   /api/invoices/[id]/payments - Record payment
POST   /api/invoices/[id]/send     - Send to client
POST   /api/invoices/[id]/refund   - Process refund
GET    /api/services          - List services
```

---

## Tasks

### Task 1: Create Invoice Types
**File**: `lib/types/invoicing.ts`

```typescript
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'other'

export interface InvoiceItem {
  id?: string
  service_id?: string
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
  tax_percent?: number
  subtotal: number
}

export interface Invoice {
  id: string
  invoice_number: string
  tenant_id: string
  client_id: string
  pet_id?: string
  appointment_id?: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total: number
  amount_paid: number
  amount_due: number
  notes?: string
  items: InvoiceItem[]
  client?: {
    id: string
    full_name: string
    email: string
    phone?: string
  }
  pet?: {
    id: string
    name: string
  }
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference?: string
  notes?: string
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes?: number
  category?: string
  is_active: boolean
}
```

### Task 2: Create Invoice List Page
**File**: `app/[clinic]/dashboard/invoices/page.tsx`

- [ ] Fetch invoices from API
- [ ] Filter by status, date range, client
- [ ] Search functionality
- [ ] Pagination
- [ ] Status badges
- [ ] Link to detail and create

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoiceList } from '@/components/invoices/invoice-list'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ status?: string; page?: string; search?: string }>
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { status, page, search } = await searchParams
  const supabase = await createClient()
  
  // Auth & staff check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/auth/login`)
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
  if (!isStaff) redirect(`/${clinic}/portal`)
  
  // Fetch invoices
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/invoices?clinic=${clinic}&status=${status || ''}&page=${page || '1'}&search=${search || ''}`,
    { headers: { /* auth headers */ } }
  )
  const { data: invoices, pagination } = await response.json()
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Facturas
        </h1>
        <a 
          href={`/${clinic}/dashboard/invoices/new`}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg"
        >
          Nueva Factura
        </a>
      </div>
      
      <InvoiceList 
        invoices={invoices} 
        pagination={pagination}
        clinic={clinic}
      />
    </div>
  )
}
```

### Task 3: Create Invoice Form Component
**File**: `components/invoices/invoice-form.tsx`

- [ ] Client selector (search/autocomplete)
- [ ] Pet selector (based on client)
- [ ] Service items list
- [ ] Add/remove line items
- [ ] Auto-calculate totals
- [ ] Tax and discount handling
- [ ] Notes field
- [ ] Due date picker

This is the most complex component - break it into sub-components:

```
components/invoices/
  - invoice-form.tsx           # Main form container
  - client-selector.tsx        # Client search/select
  - line-items.tsx             # Line items list
  - line-item-row.tsx          # Single line item
  - service-selector.tsx       # Service dropdown
  - totals-summary.tsx         # Subtotal, tax, total
```

### Task 4: Create New Invoice Page
**File**: `app/[clinic]/dashboard/invoices/new/page.tsx`

- [ ] Render invoice form
- [ ] Pre-populate from appointment if linked
- [ ] Handle form submission
- [ ] Redirect to invoice detail on success

### Task 5: Create Invoice Detail Page
**File**: `app/[clinic]/dashboard/invoices/[id]/page.tsx`

- [ ] Display full invoice
- [ ] Show line items
- [ ] Payment history
- [ ] Action buttons (send, record payment, cancel)
- [ ] Print/PDF button

### Task 6: Create Payment Recording Dialog
**File**: `components/invoices/record-payment-dialog.tsx`

- [ ] Amount input
- [ ] Payment method selector
- [ ] Reference/notes
- [ ] Submit to API
- [ ] Update invoice display

### Task 7: Create Send Invoice Dialog
**File**: `components/invoices/send-invoice-dialog.tsx`

- [ ] Email preview
- [ ] Send button
- [ ] Call send API endpoint

### Task 8: Create Invoice PDF Component
**File**: `components/invoices/invoice-pdf.tsx`

- [ ] Use @react-pdf/renderer
- [ ] Match invoice design
- [ ] Download button

### Task 9: Create Server Actions
**File**: `app/actions/invoices.ts`

- [ ] `createInvoice` action
- [ ] `updateInvoice` action
- [ ] `recordPayment` action
- [ ] `sendInvoice` action

### Task 10: Testing
**Directory**: `tests/unit/invoices/`

- [ ] Test form validation
- [ ] Test calculations
- [ ] Test API integration

---

## Component Structure

```
components/invoices/
├── invoice-list.tsx           # List with filters
├── invoice-card.tsx           # Card in list
├── invoice-form.tsx           # Create/edit form
├── invoice-detail.tsx         # Full invoice view
├── client-selector.tsx        # Client search
├── line-items.tsx             # Line items editor
├── line-item-row.tsx          # Single line item
├── service-selector.tsx       # Service dropdown
├── totals-summary.tsx         # Calculations display
├── record-payment-dialog.tsx  # Payment modal
├── send-invoice-dialog.tsx    # Send modal
├── invoice-pdf.tsx            # PDF generation
└── status-badge.tsx           # Status indicator
```

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Page title | Facturas |
| New invoice | Nueva Factura |
| Invoice number | Número de factura |
| Client | Cliente |
| Pet | Mascota |
| Date | Fecha |
| Due date | Fecha de vencimiento |
| Status | Estado |
| Draft | Borrador |
| Sent | Enviada |
| Paid | Pagada |
| Partial | Pago parcial |
| Overdue | Vencida |
| Cancelled | Cancelada |
| Items | Artículos |
| Service | Servicio |
| Description | Descripción |
| Quantity | Cantidad |
| Unit price | Precio unitario |
| Discount | Descuento |
| Tax | Impuesto |
| Subtotal | Subtotal |
| Total | Total |
| Amount paid | Monto pagado |
| Amount due | Saldo pendiente |
| Add item | Agregar artículo |
| Remove | Eliminar |
| Record payment | Registrar pago |
| Send invoice | Enviar factura |
| Print | Imprimir |
| Download PDF | Descargar PDF |
| Payment method | Método de pago |
| Cash | Efectivo |
| Card | Tarjeta |
| Transfer | Transferencia |
| Notes | Notas |

---

## Status Badge Colors

```typescript
const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}
```

---

## Acceptance Criteria

- [x] Staff can view list of invoices
- [x] Staff can create new invoices
- [x] Staff can add multiple line items
- [x] Totals calculate automatically
- [x] Staff can record payments
- [x] Staff can send invoice to client email
- [x] Staff can download PDF
- [x] Invoice detail shows payment history
- [x] Status updates correctly
- [x] All text in Spanish
- [x] Uses CSS variables
- [x] Mobile responsive

---

## Dependencies

**None** - API already exists. This agent builds UI only.

---

## Handoff Notes

(Fill this in when pausing or completing work)

### Completed
- [x] Task 1: Invoice Types - Enhanced existing `lib/types/invoicing.ts` with utility functions
- [x] Task 2: Invoice List Page - Already existed at `app/[clinic]/dashboard/invoices/page.tsx`
- [x] Task 3: Invoice Form Component - Created all subcomponents:
  - `components/invoices/invoice-form.tsx`
  - `components/invoices/line-items.tsx`
  - `components/invoices/line-item-row.tsx`
  - `components/invoices/totals-summary.tsx`
  - `components/invoices/service-selector.tsx` (already existed)
- [x] Task 4: New Invoice Page - Created at `app/[clinic]/dashboard/invoices/new/page.tsx`
- [x] Task 5: Invoice Detail Page - Created at `app/[clinic]/dashboard/invoices/[id]/page.tsx`
- [x] Task 6: Payment Recording Dialog - Created `components/invoices/record-payment-dialog.tsx`
- [x] Task 7: Send Invoice Dialog - Created `components/invoices/send-invoice-dialog.tsx`
- [x] Task 8: Invoice PDF Component - Created `components/invoices/invoice-pdf.tsx`
- [x] Task 9: Server Actions - Created `app/actions/invoices.ts` with:
  - `createInvoice`
  - `recordPayment`
  - `updateInvoiceStatus`
  - `sendInvoice`
  - `voidInvoice`
  - `getClinicServices`
  - `getClinicPets`
  - `getInvoice`
- [x] Task 10: Unit Tests - Created `tests/unit/actions/invoices.test.ts` (37 tests, all passing)

### In Progress
- None

### Blockers
- None

### Notes for Integration
- Invoice list, invoice card, status badge, and service selector components already existed
- API endpoints already implemented - UI consumes them
- All text is in Spanish (Paraguay locale)
- Currency formatted as Paraguayan Guaraní (PYG)
- Uses CSS variables for theming

---

*Agent-05 Task File - Last updated: December 2024*
