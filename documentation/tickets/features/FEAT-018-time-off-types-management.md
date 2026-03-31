# FEAT-018: Time-Off Types Management

## Priority: P3 - Low
## Category: Feature
## Status: Not Started
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)
## Affected Areas: Staff Management, Dashboard, Admin

## Description

Create admin UI for managing staff time-off types with configurable properties like paid/unpaid status and annual allowances.

## Source

Derived from `documentation/feature-gaps/INCOMPLETE_FEATURES_ANALYSIS.md` (TICKET-011)

## Context

> **Database**: `staff_time_off_types` table exists
> **API**: `api/staff/time-off/types/route.ts` exists
> **UI**: Hard-coded types in forms, no admin management

## Current State

- `staff_time_off_types` table exists with columns for paid status, max days
- API endpoint exists for CRUD operations
- Time-off request forms use hardcoded type options
- No admin UI to manage types
- No balance tracking per staff member

## Proposed Solution

### 1. Admin Management Page

```typescript
// app/[clinic]/dashboard/settings/time-off-types/page.tsx
export default async function TimeOffTypesPage() {
  const types = await getTimeOffTypes();

  return (
    <div>
      <div className="flex justify-between">
        <h1>Tipos de Permiso</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Tipo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Pagado</TableHead>
            <TableHead>Días Anuales</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map(type => (
            <TableRow key={type.id}>
              <TableCell>{type.name}</TableCell>
              <TableCell>
                <Badge variant={type.paid ? 'success' : 'secondary'}>
                  {type.paid ? 'Sí' : 'No'}
                </Badge>
              </TableCell>
              <TableCell>{type.max_days ?? 'Sin límite'}</TableCell>
              <TableCell>
                <EditButton onClick={() => openEditModal(type)} />
                <DeleteButton onClick={() => deleteType(type.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 2. Create/Edit Modal

```typescript
// components/staff/time-off-type-form.tsx
export function TimeOffTypeForm({ type, onSubmit }: TimeOffTypeFormProps) {
  const form = useForm<TimeOffTypeFormData>({
    defaultValues: type ?? {
      name: '',
      paid: true,
      max_days: null,
    },
  });

  return (
    <Form {...form}>
      <FormField
        name="name"
        label="Nombre del Tipo"
        placeholder="Vacaciones, Enfermedad, etc."
        required
      />
      <FormField
        name="paid"
        label="¿Es Pagado?"
        type="checkbox"
      />
      <FormField
        name="max_days"
        label="Días Máximos por Año"
        type="number"
        placeholder="Dejar vacío para sin límite"
      />
      <Button type="submit">
        {type ? 'Actualizar' : 'Crear'}
      </Button>
    </Form>
  );
}
```

### 3. Balance Tracking

```typescript
// api/staff/[id]/time-off-balance/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Get all time-off types
  const { data: types } = await supabase
    .from('staff_time_off_types')
    .select('*');

  // Get used days this year
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const { data: usedDays } = await supabase
    .from('staff_time_off')
    .select('type_id, start_date, end_date')
    .eq('staff_id', params.id)
    .eq('status', 'approved')
    .gte('start_date', yearStart);

  // Calculate balance per type
  const balance = types.map(type => ({
    type: type.name,
    allowed: type.max_days,
    used: calculateUsedDays(usedDays, type.id),
    remaining: type.max_days ? type.max_days - calculateUsedDays(usedDays, type.id) : null,
  }));

  return NextResponse.json(balance);
}
```

### 4. Update Time-Off Form

```typescript
// Use dynamic types from API instead of hardcoded
const { data: types } = useQuery({
  queryKey: ['time-off-types'],
  queryFn: () => fetch('/api/staff/time-off/types').then(r => r.json()),
});

<Select name="type_id">
  {types?.map(type => (
    <SelectItem key={type.id} value={type.id}>
      {type.name} {type.paid && '(Pagado)'}
    </SelectItem>
  ))}
</Select>
```

## Implementation Steps

1. [ ] Create admin management page
2. [ ] Create/edit type form modal
3. [ ] Update time-off request forms to use dynamic types
4. [ ] Implement balance tracking API
5. [ ] Add balance display to staff profile
6. [ ] Add validation for exceeding allowed days

## Acceptance Criteria

- [ ] Admin can add/edit time-off types
- [ ] Configure paid vs unpaid
- [ ] Set annual allowance days (optional)
- [ ] Track used vs remaining days per staff
- [ ] Time-off forms use dynamic types
- [ ] Warn when exceeding allowed days

## Related Files

- `web/app/api/staff/time-off/types/route.ts` - Existing API
- `web/app/[clinic]/dashboard/time-off/` - Time-off management
- `web/db/staff_time_off_types` - Database table

## Estimated Effort

- Admin page: 3 hours
- Form modal: 2 hours
- Balance tracking: 2 hours
- Form updates: 1 hour
- Testing: 2 hours
- **Total: 10 hours (1.5 days)**

---
*Created: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
