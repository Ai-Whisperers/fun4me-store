# Agent-08: Hospitalization Module

**Agent ID**: Agent-08
**Domain**: Hospitalization & Patient Care
**Priority**: 🟡 High
**Estimated Total Effort**: 14-18 hours
**Status**: Not Started

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/hospitalization/     # CREATE directory
app/api/hospitalizations/                   # CREATE directory
app/actions/hospitalization.ts              # CREATE
components/hospitalization/                 # CREATE directory
lib/types/hospitalization.ts                # CREATE
db/90_*.sql through db/99_*.sql            # Reserved range
tests/unit/hospitalization/                 # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/types/database.ts
db/23_schema_hospitalization.sql            # Schema exists - reference this
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
3. `db/23_schema_hospitalization.sql` - Existing database schema

**Important**: The database schema already exists! Build APIs and UI.

---

## Tasks

### Task 1: Create Hospitalization Types
**File**: `lib/types/hospitalization.ts`

```typescript
export type HospitalizationStatus = 'admitted' | 'in_treatment' | 'recovering' | 'discharged' | 'transferred' | 'deceased'

export interface Kennel {
  id: string
  tenant_id: string
  name: string
  location?: string
  size: 'small' | 'medium' | 'large' | 'xl'
  is_available: boolean
  current_patient_id?: string
  notes?: string
}

export interface Hospitalization {
  id: string
  tenant_id: string
  pet_id: string
  kennel_id?: string
  admitting_vet_id: string
  status: HospitalizationStatus
  reason: string
  diagnosis?: string
  admitted_at: string
  estimated_discharge?: string
  discharged_at?: string
  discharge_notes?: string
  special_instructions?: string
  diet_instructions?: string
  created_at: string
  // Joined
  pet?: {
    id: string
    name: string
    species: string
    breed?: string
    photo_url?: string
    owner?: {
      id: string
      full_name: string
      phone?: string
    }
  }
  kennel?: Kennel
  admitting_vet?: {
    id: string
    full_name: string
  }
}

export interface VitalsRecord {
  id: string
  hospitalization_id: string
  recorded_by: string
  recorded_at: string
  temperature_c?: number
  heart_rate?: number
  respiratory_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  weight_kg?: number
  pain_score?: number // 0-10
  notes?: string
}

export interface TreatmentRecord {
  id: string
  hospitalization_id: string
  treatment_type: string
  description: string
  administered_by: string
  scheduled_time?: string
  completed_time?: string
  status: 'scheduled' | 'completed' | 'skipped' | 'delayed'
  notes?: string
}

export interface FeedingRecord {
  id: string
  hospitalization_id: string
  food_type: string
  amount: string
  fed_at: string
  fed_by: string
  consumed_percentage?: number
  notes?: string
}
```

### Task 2: Create Hospitalization API Routes
**File**: `app/api/hospitalizations/route.ts`

- [ ] GET - list hospitalizations (active, discharged)
- [ ] POST - admit new patient

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const clinicSlug = searchParams.get('clinic')
  const status = searchParams.get('status')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinicSlug })
  if (!isStaff) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  let query = supabase
    .from('hospitalizations')
    .select(`
      *,
      pet:pets(id, name, species, breed, photo_url, owner:profiles(id, full_name, phone)),
      kennel:kennels(id, name, location),
      admitting_vet:profiles!admitting_vet_id(id, full_name)
    `)
    .eq('tenant_id', clinicSlug)
    .order('admitted_at', { ascending: false })
    
  if (status === 'active') {
    query = query.is('discharged_at', null)
  } else if (status === 'discharged') {
    query = query.not('discharged_at', 'is', null)
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
    
  const { data, error } = await supabase
    .from('hospitalizations')
    .insert({
      tenant_id: profile?.tenant_id,
      pet_id: body.pet_id,
      kennel_id: body.kennel_id,
      admitting_vet_id: user.id,
      reason: body.reason,
      diagnosis: body.diagnosis,
      estimated_discharge: body.estimated_discharge,
      special_instructions: body.special_instructions,
      diet_instructions: body.diet_instructions,
      status: 'admitted',
      admitted_at: new Date().toISOString()
    })
    .select()
    .single()
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  // Update kennel availability
  if (body.kennel_id) {
    await supabase
      .from('kennels')
      .update({ 
        is_available: false, 
        current_patient_id: data.id 
      })
      .eq('id', body.kennel_id)
  }
  
  return NextResponse.json(data, { status: 201 })
}
```

### Task 3: Create Single Hospitalization API
**File**: `app/api/hospitalizations/[id]/route.ts`

- [ ] GET - get hospitalization with vitals, treatments
- [ ] PATCH - update hospitalization
- [ ] DELETE - soft delete (not recommended)

### Task 4: Create Vitals API
**File**: `app/api/hospitalizations/[id]/vitals/route.ts`

- [ ] GET - list vitals for hospitalization
- [ ] POST - record new vitals

### Task 5: Create Treatments API
**File**: `app/api/hospitalizations/[id]/treatments/route.ts`

- [ ] GET - list treatments
- [ ] POST - schedule treatment
- [ ] PATCH - mark complete/skipped

### Task 6: Create Feedings API
**File**: `app/api/hospitalizations/[id]/feedings/route.ts`

- [ ] GET - list feedings
- [ ] POST - record feeding

### Task 7: Create Discharge API
**File**: `app/api/hospitalizations/[id]/discharge/route.ts`

- [ ] POST - discharge patient
- [ ] Update kennel availability
- [ ] Generate discharge summary

### Task 8: Create Kennel Management API
**File**: `app/api/kennels/route.ts`

- [ ] GET - list kennels with availability
- [ ] POST - create kennel
- [ ] PATCH - update kennel

### Task 9: Create Hospitalization Dashboard Page
**File**: `app/[clinic]/dashboard/hospitalization/page.tsx`

- [ ] Show active patients
- [ ] Kennel map/grid
- [ ] Quick actions
- [ ] Filter/search

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HospitalizationBoard } from '@/components/hospitalization/hospitalization-board'
import { KennelGrid } from '@/components/hospitalization/kennel-grid'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function HospitalizationPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/auth/login`)
  
  const { data: isStaff } = await supabase.rpc('is_staff_of', { _tenant_id: clinic })
  if (!isStaff) redirect(`/${clinic}/portal`)
  
  // Fetch active hospitalizations
  const { data: patients } = await supabase
    .from('hospitalizations')
    .select(`
      *,
      pet:pets(id, name, species, photo_url),
      kennel:kennels(id, name)
    `)
    .eq('tenant_id', clinic)
    .is('discharged_at', null)
    .order('admitted_at')
    
  // Fetch kennels
  const { data: kennels } = await supabase
    .from('kennels')
    .select('*')
    .eq('tenant_id', clinic)
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Hospitalización
        </h1>
        <a
          href={`/${clinic}/dashboard/hospitalization/admit`}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg"
        >
          Admitir Paciente
        </a>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HospitalizationBoard patients={patients || []} clinic={clinic} />
        </div>
        <div>
          <KennelGrid kennels={kennels || []} />
        </div>
      </div>
    </div>
  )
}
```

### Task 10: Create Admit Patient Page
**File**: `app/[clinic]/dashboard/hospitalization/admit/page.tsx`

- [ ] Search for pet
- [ ] Select kennel
- [ ] Enter admission details
- [ ] Submit

### Task 11: Create Patient Detail Page
**File**: `app/[clinic]/dashboard/hospitalization/[id]/page.tsx`

- [ ] Patient info header
- [ ] Vitals chart
- [ ] Treatment schedule
- [ ] Feeding log
- [ ] Notes/updates
- [ ] Discharge button

### Task 12: Create Hospitalization Board Component
**File**: `components/hospitalization/hospitalization-board.tsx`

- [ ] Card per patient
- [ ] Status indicator
- [ ] Time admitted
- [ ] Quick actions

### Task 13: Create Kennel Grid Component
**File**: `components/hospitalization/kennel-grid.tsx`

- [ ] Visual grid of kennels
- [ ] Color by availability
- [ ] Click to see patient or assign

### Task 14: Create Vitals Recording Component
**File**: `components/hospitalization/vitals-form.tsx`

- [ ] All vital inputs
- [ ] Pain score slider
- [ ] Notes field
- [ ] Submit

### Task 15: Create Treatment Schedule Component
**File**: `components/hospitalization/treatment-schedule.tsx`

- [ ] List scheduled treatments
- [ ] Mark as completed
- [ ] Add new treatment

### Task 16: Create Vitals Chart Component
**File**: `components/hospitalization/vitals-chart.tsx`

- [ ] Use recharts
- [ ] Show temp, HR, RR over time
- [ ] Highlight abnormal values

### Task 17: Create Discharge Dialog
**File**: `components/hospitalization/discharge-dialog.tsx`

- [ ] Discharge notes
- [ ] Follow-up instructions
- [ ] Generate summary
- [ ] Notify owner

### Task 18: Testing
**Directory**: `tests/unit/hospitalization/`

- [ ] Test API routes
- [ ] Test vitals recording
- [ ] Test discharge flow

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Hospitalization | Hospitalización |
| Admit patient | Admitir paciente |
| Active patients | Pacientes activos |
| Discharged | Dados de alta |
| Kennel | Jaula/Kennel |
| Available | Disponible |
| Occupied | Ocupado |
| Vitals | Signos vitales |
| Temperature | Temperatura |
| Heart rate | Frecuencia cardíaca |
| Respiratory rate | Frecuencia respiratoria |
| Blood pressure | Presión arterial |
| Weight | Peso |
| Pain score | Escala de dolor |
| Treatment | Tratamiento |
| Feeding | Alimentación |
| Scheduled | Programado |
| Completed | Completado |
| Skipped | Omitido |
| Discharge | Dar de alta |
| Discharge notes | Notas de alta |
| Admitted | Admitido |
| Recovering | En recuperación |
| Special instructions | Instrucciones especiales |
| Diet instructions | Instrucciones de dieta |
| Reason for admission | Motivo de internación |

---

## Component Structure

```
components/hospitalization/
├── hospitalization-board.tsx   # Main board view
├── patient-card.tsx            # Card in board
├── kennel-grid.tsx             # Kennel visual map
├── kennel-cell.tsx             # Single kennel
├── admit-form.tsx              # Admission form
├── patient-detail.tsx          # Full patient view
├── vitals-form.tsx             # Record vitals
├── vitals-chart.tsx            # Vitals over time
├── vitals-table.tsx            # Vitals history
├── treatment-schedule.tsx      # Treatment list
├── treatment-item.tsx          # Single treatment
├── feeding-log.tsx             # Feeding history
├── feeding-form.tsx            # Record feeding
├── discharge-dialog.tsx        # Discharge modal
└── status-badge.tsx            # Status indicator
```

---

## Vitals Reference Ranges

```typescript
const normalRanges = {
  dog: {
    temperature: { min: 38.3, max: 39.2, unit: '°C' },
    heart_rate: { min: 60, max: 140, unit: 'bpm' },
    respiratory_rate: { min: 10, max: 30, unit: '/min' },
  },
  cat: {
    temperature: { min: 38.1, max: 39.2, unit: '°C' },
    heart_rate: { min: 140, max: 220, unit: 'bpm' },
    respiratory_rate: { min: 20, max: 30, unit: '/min' },
  },
}
```

---

## Acceptance Criteria

- [ ] Staff can admit patients
- [ ] Staff can assign to kennels
- [ ] Staff can record vitals
- [ ] Vitals chart shows trends
- [ ] Staff can schedule treatments
- [ ] Staff can mark treatments complete
- [ ] Staff can record feedings
- [ ] Staff can discharge patients
- [ ] Kennel availability updates automatically
- [ ] Owner notification on discharge
- [ ] All text in Spanish
- [ ] Uses CSS variables
- [ ] Mobile responsive

---

## Dependencies

**None** - Database schema exists, build independently.

---

## Handoff Notes

(Fill this in when pausing or completing work)

### Completed
- [ ] Tasks 1-18

### In Progress
- 

### Blockers
- 

### Notes for Integration
- 

---

*Agent-08 Task File - Last updated: December 2024*
