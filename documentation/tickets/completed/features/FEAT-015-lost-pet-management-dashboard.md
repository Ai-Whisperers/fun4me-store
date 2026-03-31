# FEAT-015: Lost Pet Management Dashboard

## Priority: P2 - Medium
## Category: Feature
## Status: Completed
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)
## Affected Areas: Dashboard, Lost Pets, Safety

## Description

Create an admin dashboard for managing lost and found pet reports, allowing staff to track reports, contact finders, and mark pets as reunited.

## Source

Derived from `documentation/feature-gaps/INCOMPLETE_FEATURES_ANALYSIS.md` (TICKET-008)

## Context

> **Database**: `lost_pets` table exists
> **Action**: `reportFoundPet()` in `actions/safety.ts` works
> **QR Scan**: Can report found pet via QR
> **Missing**: Admin dashboard to manage lost/found pets

## Current State

- `lost_pets` table exists with status tracking
- QR tag scanning can create "found pet" reports
- `reportFoundPet()` server action works
- No dashboard UI for staff to manage reports
- No way to mark pets as reunited
- No notification to owner when pet is found

## Proposed Solution

### 1. Dashboard Page

```typescript
// app/[clinic]/dashboard/lost-pets/page.tsx
export default async function LostPetsDashboard({ params }: Props) {
  const supabase = await createClient();
  const { clinic } = await params;

  const { data: reports } = await supabase
    .from('lost_pets')
    .select(`
      *,
      pets (id, name, photo_url, species, breed, owner:profiles(full_name, email, phone)),
      sightings:lost_pet_sightings(*)
    `)
    .eq('tenant_id', getTenantId(clinic))
    .order('reported_at', { ascending: false });

  return (
    <div>
      <h1>Mascotas Perdidas</h1>
      <Tabs>
        <Tab value="lost">Perdidas ({lostCount})</Tab>
        <Tab value="found">Encontradas ({foundCount})</Tab>
        <Tab value="reunited">Reunidas ({reunitedCount})</Tab>
      </Tabs>
      <LostPetsList reports={reports} />
    </div>
  );
}
```

### 2. Report Detail Page

```typescript
// app/[clinic]/dashboard/lost-pets/[id]/page.tsx
// Show:
// - Pet info (photo, name, species, breed)
// - Owner contact info
// - Last seen location (with map)
// - Sighting reports
// - Action buttons (Contact finder, Mark reunited)
```

### 3. Mark as Reunited Action

```typescript
// actions/lost-pets.ts
export const markAsReunited = withActionAuth(
  async ({ profile, supabase }, reportId: string, notes?: string) => {
    // Update report status
    const { data: report, error } = await supabase
      .from('lost_pets')
      .update({
        status: 'reunited',
        reunited_at: new Date().toISOString(),
        reunited_notes: notes,
      })
      .eq('id', reportId)
      .select('pets(owner_id)')
      .single();

    // Notify owner
    await notifyOwner(report.pets.owner_id, {
      type: 'pet_reunited',
      message: 'Su mascota ha sido marcada como reunida.',
    });

    return actionSuccess();
  },
  { requireStaff: true }
);
```

### 4. Owner Notification

```typescript
// When pet is found via QR scan
export const notifyPetFound = async (petId: string, finderInfo: FinderInfo) => {
  const pet = await getPetWithOwner(petId);

  await sendEmail({
    to: pet.owner.email,
    subject: `${pet.name} ha sido encontrado!`,
    template: 'pet-found',
    data: {
      petName: pet.name,
      finderName: finderInfo.name,
      finderPhone: finderInfo.phone,
      location: finderInfo.location,
    },
  });

  await sendWhatsApp({
    to: pet.owner.phone,
    template: 'pet_found',
    params: [pet.name, finderInfo.name, finderInfo.phone],
  });
};
```

## Implementation Steps

1. [ ] Create dashboard page `/dashboard/lost-pets`
2. [ ] Create report detail page `/dashboard/lost-pets/[id]`
3. [ ] Implement `markAsReunited` server action
4. [ ] Add "Contact finder" action with call/WhatsApp buttons
5. [ ] Create owner notification for found pets
6. [ ] Add sighting history timeline
7. [ ] Optional: Add map visualization for sightings

## Acceptance Criteria

- [ ] Dashboard shows all lost/found pet reports
- [ ] Staff can contact finder (phone/WhatsApp)
- [ ] Mark as "reunited" with optional notes
- [ ] Owner notified via email/WhatsApp when pet found
- [ ] Report history kept for audit
- [ ] Filter by status (lost, found, reunited)

## Related Files

- `web/app/actions/safety.ts` - Has reportFoundPet
- `web/db/` - lost_pets, lost_pet_sightings tables
- `web/app/tag/[code]/page.tsx` - QR scan entry point

## Estimated Effort

- Dashboard page: 4 hours
- Detail page: 3 hours
- Server actions: 2 hours
- Notifications: 2 hours
- Testing: 2 hours
- **Total: 13 hours (2 days)**

## Implementation Notes

### Completed: January 2026

#### Dashboard Page
- **`app/[clinic]/dashboard/lost-pets/page.tsx`** - Server component with staff auth
- **`app/[clinic]/dashboard/lost-pets/client.tsx`** - Client component with tabs, filters, and card grid
- Features status filter tabs (All/Lost/Found/Reunited) with counts
- Search by pet name or owner name
- Card grid layout with pet photo, status badge, location, and actions
- Contact buttons (Phone/WhatsApp) for finders
- Quick "Mark Reunited" action

#### Detail Page
- **`app/[clinic]/dashboard/lost-pets/[id]/page.tsx`** - Server component
- **`app/[clinic]/dashboard/lost-pets/[id]/client.tsx`** - Full report details
- Pet information with photo, species, breed, color, microchip
- Owner contact card with Phone/WhatsApp buttons
- Last seen location with "View on Map" button
- Sighting timeline with verification status
- Match suggestions (if any potential matches exist)
- Status change actions
- Report history timeline

#### API Endpoints
- **`GET /api/dashboard/lost-pets`** - List reports with pagination and filters
- **`GET /api/dashboard/lost-pets/[id]`** - Get report with sightings and matches
- **`PUT /api/dashboard/lost-pets/[id]`** - Update status with owner notification

#### Server Actions (safety.ts)
- **`markPetAsReunited`** - Mark report as reunited with notification to owner
- **`notifyOwnerPetFound`** - Send notification when pet is found via QR
- **`reportPetSighting`** - Public action to report sighting (rate limited)

#### Notifications
- Pet found notification sent to owner when someone reports via QR
- Pet reunited notification when staff marks as reunited
- Sighting notification when someone reports seeing the pet

#### Audit Trail
- All status changes logged to `audit_logs` table
- Includes pet info, action user, and notes

---
*Created: January 2026*
*Completed: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
