# Lost & Found Pet System

## Overview

The Lost & Found system helps clinics reunite lost pets with their owners by enabling reporting, sighting tracking, automatic matching, and public visibility of lost pets.

**Status**: ✅ Fully Implemented  
**Location**: Dashboard Module + Public API  
**Database**: `lost_pets`, `pet_sightings`, `pet_match_suggestions`

---

## Features

### 1. Lost Pet Reporting

**Who Can Use**: Pet owners, clinic staff

- Report a pet as lost with details (location, circumstances, contact info)
- Upload photos for identification
- Specify if report is public (visible to community)
- Set reward amount (optional)
- Track report status (lost, found, reunited, cancelled)

### 2. Sighting Reports

**Who Can Use**: Anyone (public or authenticated)

- Report sighting of a lost pet
- Include location, date/time, description
- Upload sighting photos
- Mark sightings as verified (staff only)

### 3. Automatic Matching

**How It Works**: System suggests potential matches based on:

- **Location proximity** - Sightings near last seen location
- **Physical characteristics** - Species, breed, color
- **Temporal correlation** - Recent sightings
- **Microchip data** - If available

### 4. Public Lost Pet Registry

**Public Page**: Anyone can view active lost pet reports (if marked public)

- Browse lost pets in area
- Filter by species, location, date
- View pet details and contact info
- Report sightings directly

### 5. Dashboard Management

**Staff Dashboard**: Full management interface

- View all lost pet reports for clinic
- Review and verify sightings
- Manually review match suggestions
- Mark pets as found/reunited
- Contact reporters and finders

---

## User Flows

### Flow 1: Owner Reports Lost Pet

```
1. Owner logs in to portal
2. Navigates to pet profile
3. Clicks "Report Lost"
4. Fills out form:
   - Last seen location (address or map pin)
   - Date/time last seen
   - Circumstances (escaped during walk, gate left open, etc.)
   - Contact preferences (phone, email, WhatsApp)
   - Reward amount (optional)
   - Make report public (yes/no)
5. Uploads recent photos
6. Submits report
7. Report created with status="lost"
8. Notification sent to clinic staff
```

### Flow 2: Someone Spots Lost Pet

```
1. Person sees lost pet
2. Visits clinic website or scans QR code
3. Searches public lost pet registry
4. Finds matching pet
5. Clicks "Report Sighting"
6. Fills out form:
   - Sighting location
   - Date/time
   - Description of pet condition
   - Contact info (optional)
7. Uploads photos
8. Submits sighting
9. Owner and clinic notified
```

### Flow 3: Pet Is Found

```
1. Owner finds pet (or someone brings to clinic)
2. Owner or staff marks report as "found"
3. Optional: Records who found pet and where
4. Status changes to "found" or "reunited"
5. Report archived
6. If reward was offered, staff can record payment
```

---

## API Endpoints

### GET /api/lost-found

List lost pet reports.

**Query Parameters**:
- `status` - Filter by status (lost, found, reunited) (default: `lost`)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)
- `include_all` - (Staff only) Include all statuses

**Response**:
```json
{
  "reports": [
    {
      "id": "uuid",
      "pet_id": "uuid",
      "status": "lost",
      "last_seen_location": "Av. España y Gral. Santos",
      "last_seen_date": "2026-01-15",
      "reward_amount": 500000,
      "is_public": true,
      "pet": {
        "name": "Max",
        "species": "dog",
        "breed": "Labrador",
        "color": "Golden",
        "photo_url": "https://...",
        "owner": {
          "full_name": "Juan Pérez",
          "phone": "+595981123456"
        }
      },
      "sightings": [
        {
          "sighting_date": "2026-01-16",
          "sighting_location": "Shopping del Sol",
          "is_verified": false
        }
      ]
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### POST /api/lost-found

Create a new lost pet report.

**Request Body**:
```json
{
  "pet_id": "uuid",
  "status": "lost",
  "last_seen_location": "Av. España y Gral. Santos",
  "last_seen_lat": -25.2964,
  "last_seen_lng": -57.6312,
  "last_seen_date": "2026-01-15T14:30:00Z",
  "circumstances": "Se escapó durante paseo en el parque",
  "reward_amount": 500000,
  "contact_phone": "+595981123456",
  "contact_email": "owner@example.com",
  "is_public": true
}
```

**Response**: Created report object

### GET /api/lost-found/[id]

Get single lost pet report with full details.

**Response**: Full report with pet details, sightings, and match suggestions

### PUT /api/lost-found/[id]

Update a lost pet report.

**Request Body**: Partial update object

### DELETE /api/lost-found/[id]

Delete a lost pet report.

### GET /api/lost-found/[id]/sightings

Get all sightings for a specific lost pet report.

### POST /api/lost-found/[id]/sightings

Report a sighting for a specific lost pet.

**Request Body**:
```json
{
  "sighting_date": "2026-01-16T10:00:00Z",
  "sighting_location": "Shopping del Sol",
  "sighting_lat": -25.2800,
  "sighting_lng": -57.6350,
  "description": "Vi al perro en el estacionamiento del shopping",
  "reporter_name": "María González",
  "reporter_phone": "+595981987654"
}
```

---

## Database Schema

### Table: lost_pets

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | Clinic identifier |
| `pet_id` | UUID | Reference to pets table |
| `status` | TEXT | lost, found, reunited, cancelled |
| `last_seen_location` | TEXT | Address or description |
| `last_seen_lat` | FLOAT | GPS latitude |
| `last_seen_lng` | FLOAT | GPS longitude |
| `last_seen_date` | TIMESTAMPTZ | When pet was last seen |
| `circumstances` | TEXT | How pet was lost |
| `reward_amount` | INTEGER | Reward in guaraníes |
| `contact_phone` | TEXT | Contact number |
| `contact_email` | TEXT | Contact email |
| `is_public` | BOOLEAN | Show in public registry |
| `reported_by` | UUID | User who reported |
| `found_date` | TIMESTAMPTZ | When pet was found (if applicable) |
| `found_location` | TEXT | Where pet was found |
| `found_by` | UUID | Who found the pet |
| `created_at` | TIMESTAMPTZ | Report creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

### Table: pet_sightings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lost_pet_id` | UUID | Reference to lost_pets |
| `sighting_date` | TIMESTAMPTZ | When pet was sighted |
| `sighting_location` | TEXT | Where pet was seen |
| `sighting_lat` | FLOAT | GPS latitude |
| `sighting_lng` | FLOAT | GPS longitude |
| `description` | TEXT | Sighting details |
| `reporter_name` | TEXT | Name of reporter |
| `reporter_phone` | TEXT | Contact number |
| `reporter_email` | TEXT | Contact email |
| `photos` | TEXT[] | Array of photo URLs |
| `is_verified` | BOOLEAN | Verified by staff |
| `created_at` | TIMESTAMPTZ | Sighting report time |

### Table: pet_match_suggestions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lost_report_id` | UUID | Lost pet report |
| `found_report_id` | UUID | Possible match (another lost report marked "found") |
| `match_score` | FLOAT | Confidence score (0-1) |
| `matching_factors` | JSONB | Why this is a match |
| `reviewed_by` | UUID | Staff who reviewed |
| `review_status` | TEXT | pending, confirmed, rejected |
| `created_at` | TIMESTAMPTZ | Suggestion generation time |

---

## Domain Layer

### Service: SafetyService

Location: `web/lib/domain/safety/service.ts`

**Methods**:

```typescript
class SafetyService {
  // List lost pet reports
  async listLostPets(
    tenantId: string, 
    filters: LostPetFilters
  ): Promise<LostPet[]>

  // List only public lost pets (for public page)
  async listPublicLostPets(
    tenantId: string,
    filters: LostPetFilters
  ): Promise<LostPet[]>

  // Get single report
  async getLostPet(reportId: string): Promise<LostPet | null>

  // Get report by pet ID
  async getLostPetByPetId(petId: string): Promise<LostPet | null>

  // Report a pet as lost
  async reportLostPet(
    tenantId: string,
    input: ReportLostPetInput,
    reportedBy: string
  ): Promise<LostPet>

  // Update lost pet report
  async updateLostPet(
    reportId: string,
    updates: UpdateLostPetInput
  ): Promise<LostPet>

  // Mark pet as found
  async markPetFound(
    reportId: string,
    foundLocation: string | null,
    foundBy: string | null
  ): Promise<LostPet>

  // Report sighting
  async reportSighting(
    input: ReportSightingInput
  ): Promise<PetSighting>

  // Get sightings for a report
  async getSightingsForReport(
    lostPetId: string
  ): Promise<PetSighting[]>

  // Verify sighting (staff only)
  async verifySighting(
    sightingId: string,
    verifiedBy: string
  ): Promise<PetSighting>

  // Get match suggestions
  async getMatchSuggestions(
    lostPetId: string
  ): Promise<PetMatchSuggestion[]>

  // Review match suggestion
  async reviewMatch(
    input: ReviewMatchInput
  ): Promise<PetMatchSuggestion>
}
```

---

## Dashboard Interface

### Location

`web/app/[clinic]/dashboard/lost-pets/page.tsx`

### Features

1. **Overview Stats**
   - Active lost reports
   - Total sightings
   - Reunited this month
   - Pending matches

2. **Reports Table**
   - Pet name, photo, species
   - Status badge (lost/found/reunited)
   - Last seen location & date
   - Days since report
   - Number of sightings
   - Quick actions (view, mark found, contact)

3. **Filters**
   - Status (all, lost, found, reunited)
   - Date range
   - Species
   - Location radius

4. **Map View** (if coordinates available)
   - Pins for last seen locations
   - Pins for sightings
   - Cluster when zoomed out

5. **Report Details View**
   - Full pet information
   - Report timeline
   - List of sightings with map
   - Match suggestions
   - Contact information
   - Actions (mark found, add note, contact owner)

---

## Business Logic

### Automatic Matching Algorithm

When a new lost pet report is created OR a new sighting is reported, the system:

1. **Identifies Candidates**:
   - Other lost reports in "found" status
   - Reports with recent unverified sightings
   - Within 10km radius of last seen location

2. **Calculates Match Score** (0-1):
   - Species match: +0.3
   - Breed similarity: +0.2
   - Color match: +0.2
   - Location proximity: +0.15
   - Temporal correlation: +0.15

3. **Creates Match Suggestion** if score > 0.6:
   - Link lost report to found report
   - Include matching factors (JSON)
   - Status: "pending" (requires staff review)

4. **Notifies Staff**:
   - Email/notification with match details
   - Staff reviews and confirms/rejects

### Location-Based Search

Distance calculation using Haversine formula:

```typescript
function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
```

---

## Security & Privacy

### Row-Level Security (RLS)

**Policy**: `lost_pets` table

```sql
-- Public can view only public lost reports
CREATE POLICY "Public view public reports" ON lost_pets
  FOR SELECT USING (is_public = true AND status = 'lost');

-- Staff can view all reports for their tenant
CREATE POLICY "Staff view all" ON lost_pets
  FOR SELECT USING (is_staff_of(tenant_id));

-- Owners can view their own pet's reports
CREATE POLICY "Owners view own" ON lost_pets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = lost_pets.pet_id
      AND pets.owner_id = auth.uid()
    )
  );
```

### Privacy Controls

1. **Contact Info**: Only shown if report is public OR user is authenticated
2. **Exact Location**: Option to show approximate area instead of exact GPS
3. **Owner Details**: Full name and contact shown only to staff, partial to public

---

## Testing

### Unit Tests

Location: `web/tests/unit/domain/safety/service.test.ts`

Coverage:
- Report creation with validation
- Sighting submission
- Match algorithm accuracy
- Location distance calculations

### Integration Tests

Location: `web/tests/integration/lost-found/`

Coverage:
- Full report lifecycle (lost → sighting → found → reunited)
- Public access vs staff access
- Tenant isolation

### E2E Tests

Location: `web/e2e/lost-pets.spec.ts`

Scenarios:
- Owner reports lost pet
- Public user reports sighting
- Staff reviews and marks found
- Match suggestions workflow

---

## Future Enhancements

### Planned

- **SMS Alerts**: Notify owner when sighting reported
- **WhatsApp Integration**: Share lost pet info via WhatsApp
- **Social Media Sharing**: Generate shareable lost pet posters
- **QR Code on Collars**: Quick report if found
- **Geofencing**: Alert when pet sighted near home

### Ideas

- **Community Network**: Connect with other clinics' lost pet systems
- **AI Photo Matching**: Computer vision to match sighting photos
- **Mobile App**: Dedicated lost pets app
- **Volunteer Network**: Coordinate search volunteers

---

## Related Features

- **[QR Code Pet Tags](./qr-codes.md)** - Scannable tags that link to pet profile
- **[Pet Profiles](./pet-management.md)** - Core pet information
- **[Notifications System](./notifications.md)** - Alert mechanisms
- **[Messaging](./messaging.md)** - Communication between owners and clinic

---

**Last Updated**: 2026-01-19  
**Documentation Version**: 1.0  
**Feature Status**: ✅ Production Ready
