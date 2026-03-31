# Agent-09: Lab Results Module

**Agent ID**: Agent-09
**Domain**: Laboratory Orders & Results
**Priority**: 🟡 High
**Estimated Total Effort**: 12-16 hours
**Status**: Not Started

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/labs/                # CREATE directory
app/api/lab-orders/                         # CREATE directory
app/actions/labs.ts                         # CREATE
components/labs/                            # CREATE directory
lib/types/labs.ts                           # CREATE
db/100_*.sql through db/109_*.sql          # Reserved range
tests/unit/labs/                            # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/types/database.ts
db/24_schema_lab_results.sql                # Schema exists
components/ui/*                             
```

### Files I must NOT touch
```
Everything else
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. `db/24_schema_lab_results.sql` - Existing database schema

**Important**: Database schema exists. Build APIs and UI.

---

## Tasks

### Task 1: Create Lab Types
**File**: `lib/types/labs.ts`

```typescript
export type LabOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type LabPriority = 'routine' | 'urgent' | 'stat'
export type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high'

export interface LabOrder {
  id: string
  tenant_id: string
  pet_id: string
  medical_record_id?: string
  ordered_by: string
  status: LabOrderStatus
  priority: LabPriority
  ordered_at: string
  completed_at?: string
  notes?: string
  // Joined
  pet?: {
    id: string
    name: string
    species: string
    owner?: {
      id: string
      full_name: string
    }
  }
  ordered_by_profile?: {
    id: string
    full_name: string
  }
  tests?: LabTest[]
  results?: LabResult[]
}

export interface LabTest {
  id: string
  lab_order_id: string
  test_type: string
  test_name: string
  status: LabOrderStatus
}

export interface LabResult {
  id: string
  lab_order_id: string
  test_id: string
  parameter: string
  value: string | number
  unit?: string
  reference_min?: number
  reference_max?: number
  flag?: ResultFlag
  notes?: string
  entered_by: string
  entered_at: string
  verified_by?: string
  verified_at?: string
}

export interface LabTestTemplate {
  id: string
  name: string
  category: string
  parameters: Array<{
    name: string
    unit: string
    reference_min?: number
    reference_max?: number
  }>
}

// Common test categories
export const LAB_CATEGORIES = [
  'Hematología',
  'Bioquímica',
  'Urianálisis',
  'Parasitología',
  'Serología',
  'Microbiología',
  'Citología',
  'Otros'
] as const
```

### Task 2: Create Lab Orders API
**File**: `app/api/lab-orders/route.ts`

- [ ] GET - list lab orders
- [ ] POST - create new order

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const clinicSlug = searchParams.get('clinic')
  const status = searchParams.get('status')
  const petId = searchParams.get('pet_id')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinicSlug })
  if (!isStaff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  let query = supabase
    .from('lab_orders')
    .select(`
      *,
      pet:pets(id, name, species, owner:profiles(id, full_name)),
      ordered_by_profile:profiles!ordered_by(id, full_name),
      tests:lab_tests(*),
      results:lab_results(*)
    `)
    .eq('tenant_id', clinicSlug)
    .order('ordered_at', { ascending: false })
    
  if (status) {
    query = query.eq('status', status)
  }
  if (petId) {
    query = query.eq('pet_id', petId)
  }
  
  const { data, error } = await query
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  
  // Create lab order
  const { data: order, error: orderError } = await supabase
    .from('lab_orders')
    .insert({
      tenant_id: profile?.tenant_id,
      pet_id: body.pet_id,
      medical_record_id: body.medical_record_id,
      ordered_by: user.id,
      priority: body.priority || 'routine',
      notes: body.notes,
      status: 'pending',
      ordered_at: new Date().toISOString()
    })
    .select()
    .single()
    
  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 })
  }
  
  // Create tests
  if (body.tests && body.tests.length > 0) {
    const testsToInsert = body.tests.map((test: any) => ({
      lab_order_id: order.id,
      test_type: test.test_type,
      test_name: test.test_name,
      status: 'pending'
    }))
    
    await supabase.from('lab_tests').insert(testsToInsert)
  }
  
  return NextResponse.json(order, { status: 201 })
}
```

### Task 3: Create Single Lab Order API
**File**: `app/api/lab-orders/[id]/route.ts`

- [ ] GET - get order with results
- [ ] PATCH - update order status

### Task 4: Create Results Entry API
**File**: `app/api/lab-orders/[id]/results/route.ts`

- [ ] POST - enter results

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Insert results
  const resultsToInsert = body.results.map((result: any) => ({
    lab_order_id: id,
    test_id: result.test_id,
    parameter: result.parameter,
    value: result.value,
    unit: result.unit,
    reference_min: result.reference_min,
    reference_max: result.reference_max,
    flag: calculateFlag(result.value, result.reference_min, result.reference_max),
    entered_by: user.id,
    entered_at: new Date().toISOString()
  }))
  
  const { data, error } = await supabase
    .from('lab_results')
    .insert(resultsToInsert)
    .select()
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  // Update order status
  await supabase
    .from('lab_orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
  
  return NextResponse.json(data, { status: 201 })
}

function calculateFlag(value: number, min?: number, max?: number): ResultFlag {
  if (min === undefined || max === undefined) return 'normal'
  
  const criticalLow = min - (min * 0.2)
  const criticalHigh = max + (max * 0.2)
  
  if (value < criticalLow) return 'critical_low'
  if (value > criticalHigh) return 'critical_high'
  if (value < min) return 'low'
  if (value > max) return 'high'
  return 'normal'
}
```

### Task 5: Create Verify Results API
**File**: `app/api/lab-orders/[id]/verify/route.ts`

- [ ] POST - vet verifies results

### Task 6: Create Lab Dashboard Page
**File**: `app/[clinic]/dashboard/labs/page.tsx`

- [ ] List pending orders
- [ ] List completed orders
- [ ] Filter by status, date
- [ ] Create new order button

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LabOrderList } from '@/components/labs/lab-order-list'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ status?: string; date?: string }>
}

export default async function LabsPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { status, date } = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/auth/login`)
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
  if (!isStaff) redirect(`/${clinic}/portal`)
  
  // Fetch orders based on filters
  // ...
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Laboratorio
        </h1>
        <a
          href={`/${clinic}/dashboard/labs/new`}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg"
        >
          Nueva Orden
        </a>
      </div>
      
      {/* Status tabs */}
      {/* Order list */}
    </div>
  )
}
```

### Task 7: Create New Lab Order Page
**File**: `app/[clinic]/dashboard/labs/new/page.tsx`

- [ ] Patient search
- [ ] Test selection
- [ ] Priority selector
- [ ] Notes
- [ ] Submit

### Task 8: Create Lab Order Detail Page
**File**: `app/[clinic]/dashboard/labs/[id]/page.tsx`

- [ ] Order info
- [ ] Tests requested
- [ ] Results (if entered)
- [ ] Enter results button
- [ ] Print/export results

### Task 9: Create Results Entry Page
**File**: `app/[clinic]/dashboard/labs/[id]/results/page.tsx`

- [ ] Form per test parameter
- [ ] Auto-flag out of range
- [ ] Save results
- [ ] Submit for verification

### Task 10: Create Lab Order List Component
**File**: `components/labs/lab-order-list.tsx`

- [ ] Order cards
- [ ] Status badges
- [ ] Priority indicator
- [ ] Quick actions

### Task 11: Create Test Selector Component
**File**: `components/labs/test-selector.tsx`

- [ ] Test category tabs
- [ ] Test checkboxes
- [ ] Custom test input

### Task 12: Create Results Form Component
**File**: `components/labs/results-form.tsx`

- [ ] Parameter inputs
- [ ] Unit display
- [ ] Reference range display
- [ ] Flag indicator

### Task 13: Create Results Display Component
**File**: `components/labs/results-display.tsx`

- [ ] Table of results
- [ ] Color-coded flags
- [ ] Reference ranges
- [ ] Print-friendly layout

### Task 14: Create Lab Report PDF
**File**: `components/labs/lab-report-pdf.tsx`

- [ ] Use @react-pdf/renderer
- [ ] Clinic header
- [ ] Patient info
- [ ] Results table
- [ ] Vet signature area

### Task 15: Testing
**Directory**: `tests/unit/labs/`

- [ ] Test API routes
- [ ] Test flag calculation
- [ ] Test results entry

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Laboratory | Laboratorio |
| Lab orders | Órdenes de laboratorio |
| New order | Nueva orden |
| Patient | Paciente |
| Test | Examen/Prueba |
| Priority | Prioridad |
| Routine | Rutina |
| Urgent | Urgente |
| STAT | Urgente inmediato |
| Status | Estado |
| Pending | Pendiente |
| In progress | En proceso |
| Completed | Completado |
| Cancelled | Cancelado |
| Results | Resultados |
| Enter results | Ingresar resultados |
| Verify | Verificar |
| Parameter | Parámetro |
| Value | Valor |
| Unit | Unidad |
| Reference range | Rango de referencia |
| Normal | Normal |
| Low | Bajo |
| High | Alto |
| Critical | Crítico |
| Ordered by | Ordenado por |
| Ordered at | Fecha de orden |
| Print report | Imprimir informe |

---

## Common Lab Tests

```typescript
const commonTests = {
  'Hematología': [
    { name: 'Hemograma completo', code: 'CBC' },
    { name: 'Perfil de coagulación', code: 'COAG' },
  ],
  'Bioquímica': [
    { name: 'Panel químico básico', code: 'CHEM7' },
    { name: 'Panel hepático', code: 'LIVER' },
    { name: 'Panel renal', code: 'KIDNEY' },
    { name: 'Glucosa', code: 'GLU' },
  ],
  'Urianálisis': [
    { name: 'Urianálisis completo', code: 'UA' },
    { name: 'Cultivo de orina', code: 'UC' },
  ],
}
```

---

## Flag Colors

```typescript
const flagColors: Record<ResultFlag, string> = {
  normal: 'text-green-600',
  low: 'text-yellow-600',
  high: 'text-yellow-600',
  critical_low: 'text-red-600 font-bold',
  critical_high: 'text-red-600 font-bold',
}
```

---

## Component Structure

```
components/labs/
├── lab-order-list.tsx          # Order list
├── lab-order-card.tsx          # Single order card
├── test-selector.tsx           # Test selection
├── test-category-panel.tsx     # Category panel
├── results-form.tsx            # Enter results
├── results-display.tsx         # View results
├── result-row.tsx              # Single result row
├── flag-badge.tsx              # Flag indicator
├── priority-badge.tsx          # Priority indicator
├── lab-report-pdf.tsx          # PDF generation
└── patient-search.tsx          # Search pet
```

---

## Acceptance Criteria

- [ ] Staff can create lab orders
- [ ] Staff can select tests from categories
- [ ] Staff can set priority
- [ ] Staff can enter results
- [ ] Out-of-range values auto-flagged
- [ ] Vet can verify results
- [ ] Results can be printed/exported
- [ ] Pet owners can view results (optional)
- [ ] All text in Spanish
- [ ] Uses CSS variables
- [ ] Mobile responsive

---

## Dependencies

**None** - Database schema exists.

---

## Handoff Notes

(Fill this in when pausing or completing work)

### Completed
- [ ] Tasks 1-15

### In Progress
- 

### Blockers
- 

### Notes for Integration
- 

---

*Agent-09 Task File - Last updated: December 2024*
