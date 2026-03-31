# Agent-10: Reports & Analytics

**Agent ID**: Agent-10
**Domain**: Reporting & Analytics Dashboard
**Priority**: 🟡 High
**Estimated Total Effort**: 12-16 hours
**Status**: Not Started

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/dashboard/reports/             # CREATE directory
app/api/reports/                            # CREATE directory
app/actions/reports.ts                      # CREATE
components/reports/                         # CREATE directory
lib/types/reports.ts                        # CREATE
db/110_*.sql through db/119_*.sql          # Reserved range
tests/unit/reports/                         # CREATE
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/types/database.ts
app/api/dashboard/*                         # Dashboard stats API exists
components/dashboard/*                      # Dashboard components exist
components/ui/*                             
```

### Files I must NOT touch
```
app/api/dashboard/*                         # Already implemented
components/dashboard/*                      # Already implemented
Everything else
```

---

## Context

Read these files first:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. Existing dashboard components in `components/dashboard/`

**Note**: Basic dashboard components already exist. This agent builds the comprehensive reports section.

---

## Tasks

### Task 1: Create Report Types
**File**: `lib/types/reports.ts`

```typescript
export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx'

export interface DateRange {
  start: string
  end: string
}

export interface ReportFilters {
  period: ReportPeriod
  dateRange?: DateRange
  staffId?: string
  serviceId?: string
  species?: string
}

// Financial Reports
export interface FinancialSummary {
  period: DateRange
  revenue: {
    total: number
    byService: Array<{ service: string; amount: number }>
    byPaymentMethod: Array<{ method: string; amount: number }>
  }
  expenses: {
    total: number
    byCategory: Array<{ category: string; amount: number }>
  }
  profit: number
  invoices: {
    created: number
    paid: number
    pending: number
    overdue: number
  }
  comparison?: {
    previousPeriod: number
    percentChange: number
  }
}

// Patient Reports
export interface PatientSummary {
  period: DateRange
  newPatients: number
  totalPatients: number
  bySpecies: Array<{ species: string; count: number }>
  appointments: {
    total: number
    completed: number
    cancelled: number
    noShow: number
  }
  topConditions: Array<{ condition: string; count: number }>
}

// Service Reports
export interface ServiceSummary {
  period: DateRange
  services: Array<{
    id: string
    name: string
    count: number
    revenue: number
    averagePrice: number
  }>
  totalServices: number
  totalRevenue: number
}

// Staff Reports
export interface StaffPerformance {
  period: DateRange
  staff: Array<{
    id: string
    name: string
    appointmentsCompleted: number
    revenueGenerated: number
    averageRating?: number
    patientsServed: number
  }>
}

// Inventory Reports
export interface InventorySummary {
  lowStockItems: number
  expiringSoon: number
  totalValue: number
  movements: {
    in: number
    out: number
    adjustments: number
  }
}
```

### Task 2: Create Financial Report API
**File**: `app/api/reports/financial/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const clinicSlug = searchParams.get('clinic')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Must be admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin' || profile?.tenant_id !== clinicSlug) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  
  // Get invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, amount_paid, status, payment_method')
    .eq('tenant_id', clinicSlug)
    .gte('issue_date', startDate)
    .lte('issue_date', endDate)
    
  // Get invoice items for service breakdown
  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select(`
      subtotal,
      service:services(name)
    `)
    .eq('tenant_id', clinicSlug)
    // Join with invoices in date range
    
  // Get expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('clinic_id', clinicSlug)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    
  // Calculate summary
  const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0
  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0
  
  const summary = {
    period: { start: startDate, end: endDate },
    revenue: {
      total: totalRevenue,
      byService: [], // Aggregate from invoiceItems
      byPaymentMethod: [], // Aggregate from invoices
    },
    expenses: {
      total: totalExpenses,
      byCategory: [], // Aggregate from expenses
    },
    profit: totalRevenue - totalExpenses,
    invoices: {
      created: invoices?.length || 0,
      paid: invoices?.filter(i => i.status === 'paid').length || 0,
      pending: invoices?.filter(i => i.status === 'sent').length || 0,
      overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
    }
  }
  
  return NextResponse.json(summary)
}
```

### Task 3: Create Patient Report API
**File**: `app/api/reports/patients/route.ts`

- [ ] Patient counts
- [ ] Species breakdown
- [ ] Appointment statistics
- [ ] Common conditions

### Task 4: Create Service Report API
**File**: `app/api/reports/services/route.ts`

- [ ] Service utilization
- [ ] Revenue per service
- [ ] Trending services

### Task 5: Create Staff Report API
**File**: `app/api/reports/staff/route.ts`

- [ ] Staff productivity metrics
- [ ] Revenue per staff
- [ ] Appointment counts

### Task 6: Create Export API
**File**: `app/api/reports/export/route.ts`

- [ ] Export data as CSV
- [ ] Support multiple data types
- [ ] Date range filtering

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()
  
  const { dataType, format, filters } = body
  
  // Auth check (admin only)
  // ...
  
  let data: any[] = []
  
  switch (dataType) {
    case 'clients':
      const { data: clients } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', filters.clinicSlug)
        .eq('role', 'owner')
      data = clients || []
      break
      
    case 'pets':
      const { data: pets } = await supabase
        .from('pets')
        .select('*, owner:profiles(full_name, email)')
        .eq('tenant_id', filters.clinicSlug)
      data = pets || []
      break
      
    case 'appointments':
      // ...
      break
      
    case 'invoices':
      // ...
      break
  }
  
  if (format === 'csv') {
    const csv = convertToCSV(data)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${dataType}-export.csv"`
      }
    })
  }
  
  return NextResponse.json(data)
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  )
  
  return [headers.join(','), ...rows].join('\n')
}
```

### Task 7: Create Reports Dashboard Page
**File**: `app/[clinic]/dashboard/reports/page.tsx`

- [ ] Overview cards
- [ ] Quick period selectors
- [ ] Links to detailed reports

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportOverview } from '@/components/reports/report-overview'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function ReportsPage({ params }: Props) {
  const { clinic } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${clinic}/auth/login`)
  
  // Admin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin') {
    redirect(`/${clinic}/dashboard`)
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Reportes y Análisis
      </h1>
      
      <ReportOverview clinic={clinic} />
    </div>
  )
}
```

### Task 8: Create Financial Report Page
**File**: `app/[clinic]/dashboard/reports/financial/page.tsx`

- [ ] Date range selector
- [ ] Revenue chart
- [ ] Expenses breakdown
- [ ] Profit/loss summary
- [ ] Export button

### Task 9: Create Patient Report Page
**File**: `app/[clinic]/dashboard/reports/patients/page.tsx`

- [ ] New patients trend
- [ ] Species pie chart
- [ ] Appointment metrics
- [ ] Top conditions

### Task 10: Create Service Report Page
**File**: `app/[clinic]/dashboard/reports/services/page.tsx`

- [ ] Service utilization chart
- [ ] Revenue by service
- [ ] Service trends over time

### Task 11: Create Staff Report Page
**File**: `app/[clinic]/dashboard/reports/staff/page.tsx`

- [ ] Staff performance table
- [ ] Comparison charts
- [ ] Individual drill-down

### Task 12: Create Export Page
**File**: `app/[clinic]/dashboard/reports/export/page.tsx`

- [ ] Data type selector
- [ ] Date range
- [ ] Format selector
- [ ] Download button

### Task 13: Create Report Components

#### ReportOverview
**File**: `components/reports/report-overview.tsx`

- [ ] Summary cards
- [ ] Period quick selectors
- [ ] Mini charts

#### DateRangePicker
**File**: `components/reports/date-range-picker.tsx`

- [ ] Preset periods
- [ ] Custom date range
- [ ] Apply button

#### ReportChart
**File**: `components/reports/report-chart.tsx`

- [ ] Wrapper for recharts
- [ ] Loading state
- [ ] Empty state

#### FinancialReport
**File**: `components/reports/financial-report.tsx`

- [ ] Revenue chart (BarChart)
- [ ] Expenses pie chart
- [ ] Summary cards

#### PatientReport
**File**: `components/reports/patient-report.tsx`

- [ ] Species PieChart
- [ ] Trend LineChart
- [ ] Metrics cards

#### ExportButton
**File**: `components/reports/export-button.tsx`

- [ ] Format dropdown
- [ ] Download trigger

### Task 14: Create PDF Report Generator
**File**: `components/reports/report-pdf.tsx`

- [ ] Use @react-pdf/renderer
- [ ] Clinic branding
- [ ] Charts as images
- [ ] Summary tables

### Task 15: Testing
**Directory**: `tests/unit/reports/`

- [ ] Test API calculations
- [ ] Test date range handling
- [ ] Test CSV export

---

## Spanish Text Reference

| Element | Spanish Text |
|---------|-------------|
| Reports | Reportes |
| Analytics | Análisis |
| Financial | Financiero |
| Patients | Pacientes |
| Services | Servicios |
| Staff | Personal |
| Export | Exportar |
| Date range | Rango de fechas |
| Today | Hoy |
| This week | Esta semana |
| This month | Este mes |
| This year | Este año |
| Custom | Personalizado |
| Revenue | Ingresos |
| Expenses | Gastos |
| Profit | Ganancia |
| Loss | Pérdida |
| Total | Total |
| Average | Promedio |
| Growth | Crecimiento |
| Comparison | Comparación |
| vs previous period | vs período anterior |
| Download | Descargar |
| Generate report | Generar reporte |
| Apply filters | Aplicar filtros |
| New patients | Pacientes nuevos |
| Appointments | Citas |
| Top services | Servicios principales |

---

## Chart Colors

```typescript
const chartColors = {
  primary: 'var(--primary)',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  quaternary: '#8B5CF6',
  revenue: '#10B981',   // green
  expenses: '#EF4444',  // red
  profit: '#3B82F6',    // blue
}

// For pie charts
const speciesColors = {
  Perro: '#3B82F6',
  Gato: '#10B981',
  Ave: '#F59E0B',
  Roedor: '#8B5CF6',
  Reptil: '#EC4899',
  Otro: '#6B7280',
}
```

---

## Component Structure

```
components/reports/
├── report-overview.tsx         # Dashboard overview
├── date-range-picker.tsx       # Date selection
├── period-selector.tsx         # Quick periods
├── report-chart.tsx            # Chart wrapper
├── financial-report.tsx        # Financial section
├── revenue-chart.tsx           # Revenue visualization
├── expenses-chart.tsx          # Expenses breakdown
├── patient-report.tsx          # Patient section
├── species-chart.tsx           # Species pie chart
├── service-report.tsx          # Service section
├── staff-report.tsx            # Staff section
├── summary-card.tsx            # Metric card
├── comparison-indicator.tsx    # Up/down arrow
├── export-button.tsx           # Export trigger
├── export-dialog.tsx           # Export options
└── report-pdf.tsx              # PDF generation
```

---

## Materialized Views (Optional Performance)

If reports are slow, consider materialized views:

```sql
-- db/110_report_views.sql
CREATE MATERIALIZED VIEW daily_revenue_summary AS
SELECT 
  tenant_id,
  DATE(issue_date) as date,
  COUNT(*) as invoice_count,
  SUM(total) as total_revenue,
  SUM(amount_paid) as collected_revenue
FROM invoices
WHERE status != 'cancelled'
GROUP BY tenant_id, DATE(issue_date);

-- Refresh via pg_cron
SELECT cron.schedule('refresh-revenue-summary', '0 * * * *', 
  'REFRESH MATERIALIZED VIEW daily_revenue_summary');
```

---

## Acceptance Criteria

- [ ] Admin can view financial reports
- [ ] Admin can view patient reports
- [ ] Admin can view service reports
- [ ] Admin can view staff performance
- [ ] Reports support date range filtering
- [ ] Charts visualize data correctly
- [ ] Data can be exported as CSV
- [ ] Reports can be downloaded as PDF
- [ ] Only admin role has access
- [ ] All text in Spanish
- [ ] Uses CSS variables
- [ ] Mobile responsive (simplified mobile view)

---

## Dependencies

**None** - Uses existing dashboard API as reference.

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
- Consider adding report cards to main dashboard

---

*Agent-10 Task File - Last updated: December 2024*
