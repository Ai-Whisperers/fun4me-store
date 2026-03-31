# API Gaps Documentation

## Overview

This document details API endpoints that need to be created to support the remaining features. Many schemas already exist in the database, so these APIs primarily involve creating Next.js API routes or Server Actions.

**Last Updated**: December 2024

---

## API Status Summary

| Category | Existing Endpoints | Missing Endpoints | Completion |
|----------|-------------------|-------------------|------------|
| Authentication | 3 | 2 | 60% |
| Pets | 5 | 3 | 63% |
| Appointments | 4 | 5 | 44% |
| Medical Records | 3 | 4 | 43% |
| Invoicing | 8 | 2 | 80% |
| Messaging | 6 | 3 | 67% |
| Hospitalization | 0 | 8 | 0% |
| Lab Results | 0 | 6 | 0% |
| Staff Management | 1 | 5 | 17% |
| Inventory | 3 | 4 | 43% |
| Reports | 5 | 6 | 45% |

---

## 1. Authentication APIs

### Existing
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Missing

#### 1.1 Password Reset Request
```
POST /api/auth/forgot-password
```
**Purpose**: Initiate password reset flow
**Request Body**:
```typescript
{
  email: string;
}
```
**Response**: `{ success: boolean; message: string }`
**Implementation Notes**:
- Use `supabase.auth.resetPasswordForEmail()`
- Redirect URL should be `/{clinic}/auth/reset-password`
- Rate limit: 3 requests per hour per email

#### 1.2 Password Update
```
POST /api/auth/update-password
```
**Purpose**: Complete password reset
**Request Body**:
```typescript
{
  password: string;
  confirmPassword: string;
}
```
**Response**: `{ success: boolean }`
**Implementation Notes**:
- User must be authenticated (via reset link)
- Use `supabase.auth.updateUser({ password })`
- Validate password strength server-side

---

## 2. Pet APIs

### Existing
- `GET /api/pets` - List user's pets
- `POST /api/pets` - Create pet
- `GET /api/pets/[id]` - Get pet details
- `GET /api/pets/[id]/vaccines` - Get vaccines
- `POST /api/pets/[id]/vaccines` - Add vaccine

### Missing

#### 2.1 Update Pet
```
PATCH /api/pets/[id]
```
**Purpose**: Edit pet information
**Request Body**:
```typescript
{
  name?: string;
  species?: string;
  breed?: string;
  date_of_birth?: string;
  sex?: 'male' | 'female' | 'unknown';
  weight_kg?: number;
  microchip_id?: string;
  is_neutered?: boolean;
  photo_url?: string;
  notes?: string;
}
```
**Implementation Notes**:
- Verify ownership via RLS
- Update `updated_at` timestamp
- Handle photo upload separately if new file

#### 2.2 Delete Pet (Soft Delete)
```
DELETE /api/pets/[id]
```
**Purpose**: Soft delete a pet
**Response**: `{ success: boolean }`
**Implementation Notes**:
- Set `deleted_at = now()`
- Keep for audit purposes
- Consider archiving medical history first

#### 2.3 Transfer Pet Ownership
```
POST /api/pets/[id]/transfer
```
**Purpose**: Transfer pet to another owner
**Request Body**:
```typescript
{
  new_owner_email: string;
  reason?: string;
}
```
**Implementation Notes**:
- Requires confirmation from new owner
- Create `pet_ownership_transfers` record
- Send notification to both parties

---

## 3. Appointment APIs

### Existing
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment (Server Action)
- `GET /api/appointments/[id]` - Get appointment
- `GET /api/appointments/availability` - Check availability

### Missing

#### 3.1 Cancel Appointment
```
POST /api/appointments/[id]/cancel
```
**Purpose**: Cancel an appointment
**Request Body**:
```typescript
{
  reason: string;
  notify_clinic?: boolean;
}
```
**Implementation Notes**:
- Server action exists: `cancelAppointment()`
- Update status to 'cancelled'
- Free up the time slot
- Queue cancellation notification

#### 3.2 Reschedule Appointment
```
POST /api/appointments/[id]/reschedule
```
**Purpose**: Move appointment to new time
**Request Body**:
```typescript
{
  new_date: string;
  new_time: string;
  reason?: string;
}
```
**Implementation Notes**:
- Check new slot availability first
- Keep history of reschedules
- Notify all parties

#### 3.3 Real-time Availability
```
GET /api/appointments/slots
```
**Purpose**: Get available slots for a date range
**Query Parameters**:
```typescript
{
  clinic_id: string;
  service_id?: string;
  vet_id?: string;
  start_date: string;
  end_date: string;
}
```
**Response**:
```typescript
{
  slots: Array<{
    date: string;
    time: string;
    available: boolean;
    vet_id?: string;
    vet_name?: string;
  }>;
}
```
**Implementation Notes**:
- Query `staff_schedules` for working hours
- Exclude existing appointments
- Consider service duration
- Account for buffer time between appointments

#### 3.4 Check-in Appointment
```
POST /api/appointments/[id]/check-in
```
**Purpose**: Mark patient as arrived
**Request Body**:
```typescript
{
  checked_in_by?: string;
  notes?: string;
}
```
**Implementation Notes**:
- Staff only endpoint
- Update status to 'checked_in'
- Record check-in time
- Trigger queue update

#### 3.5 Complete Appointment
```
POST /api/appointments/[id]/complete
```
**Purpose**: Mark appointment as completed
**Request Body**:
```typescript
{
  notes?: string;
  follow_up_needed?: boolean;
  follow_up_date?: string;
}
```
**Implementation Notes**:
- Staff only endpoint
- Update status to 'completed'
- Auto-create follow-up appointment if needed

---

## 4. Medical Records APIs

### Existing
- `GET /api/pets/[id]/records` - List medical records
- `POST /api/pets/[id]/records` - Create record
- `GET /api/records/[id]` - Get record details

### Missing

#### 4.1 Update Medical Record
```
PATCH /api/records/[id]
```
**Purpose**: Edit medical record
**Request Body**: Partial `MedicalRecord` type
**Implementation Notes**:
- Staff only
- Create audit log entry
- Track who made changes

#### 4.2 Add Attachment to Record
```
POST /api/records/[id]/attachments
```
**Purpose**: Upload files to medical record
**Request Body**: `FormData` with file
**Implementation Notes**:
- Accept images, PDFs, DICOM
- Store in Supabase Storage
- Link via `record_attachments` table

#### 4.3 Sign Medical Record
```
POST /api/records/[id]/sign
```
**Purpose**: Veterinarian signs off on record
**Request Body**:
```typescript
{
  signature_type: 'preliminary' | 'final';
  pin?: string;
}
```
**Implementation Notes**:
- Vet must verify identity (PIN or re-auth)
- Record signature timestamp
- Lock record from further edits if final

#### 4.4 Generate SOAP Note
```
GET /api/records/[id]/soap
```
**Purpose**: Export record as SOAP format
**Response**: SOAP-formatted text or PDF
**Implementation Notes**:
- Extract Subjective, Objective, Assessment, Plan
- Format for printing or sharing

---

## 5. Hospitalization APIs

### All Missing - Schema exists in `23_schema_hospitalization.sql`

#### 5.1 List Hospitalizations
```
GET /api/hospitalizations
```
**Query Parameters**:
```typescript
{
  clinic_id: string;
  status?: 'admitted' | 'discharged' | 'transferred';
  kennel_id?: string;
}
```

#### 5.2 Admit Patient
```
POST /api/hospitalizations
```
**Request Body**:
```typescript
{
  pet_id: string;
  kennel_id: string;
  admitting_vet_id: string;
  reason: string;
  estimated_discharge?: string;
  special_instructions?: string;
  diet_instructions?: string;
}
```

#### 5.3 Get Hospitalization Details
```
GET /api/hospitalizations/[id]
```
**Response**: Full hospitalization record with vitals, treatments, notes

#### 5.4 Update Hospitalization
```
PATCH /api/hospitalizations/[id]
```
**Purpose**: Update status, instructions, etc.

#### 5.5 Record Vitals
```
POST /api/hospitalizations/[id]/vitals
```
**Request Body**:
```typescript
{
  temperature_c?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  weight_kg?: number;
  pain_score?: number;
  notes?: string;
}
```

#### 5.6 Record Treatment
```
POST /api/hospitalizations/[id]/treatments
```
**Request Body**:
```typescript
{
  treatment_type: string;
  description: string;
  administered_by: string;
  scheduled_time?: string;
  completed_time?: string;
  notes?: string;
}
```

#### 5.7 Record Feeding
```
POST /api/hospitalizations/[id]/feedings
```
**Request Body**:
```typescript
{
  food_type: string;
  amount: string;
  consumed_percentage?: number;
  notes?: string;
}
```

#### 5.8 Discharge Patient
```
POST /api/hospitalizations/[id]/discharge
```
**Request Body**:
```typescript
{
  discharge_notes: string;
  medications_to_continue?: string[];
  follow_up_instructions?: string;
  follow_up_date?: string;
}
```

---

## 6. Lab Results APIs

### All Missing - Schema exists in `24_schema_lab_results.sql`

#### 6.1 Create Lab Order
```
POST /api/lab-orders
```
**Request Body**:
```typescript
{
  pet_id: string;
  medical_record_id?: string;
  tests: Array<{
    test_type: string;
    priority: 'routine' | 'stat';
  }>;
  notes?: string;
}
```

#### 6.2 List Lab Orders
```
GET /api/lab-orders
```
**Query Parameters**:
```typescript
{
  pet_id?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  date_from?: string;
  date_to?: string;
}
```

#### 6.3 Get Lab Order
```
GET /api/lab-orders/[id]
```
**Response**: Order with all associated results

#### 6.4 Enter Lab Results
```
POST /api/lab-orders/[id]/results
```
**Request Body**:
```typescript
{
  results: Array<{
    parameter: string;
    value: number | string;
    unit?: string;
    reference_min?: number;
    reference_max?: number;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }>;
  technician_id: string;
  notes?: string;
}
```

#### 6.5 Upload Lab Report
```
POST /api/lab-orders/[id]/upload
```
**Purpose**: Upload external lab report PDF
**Request Body**: `FormData` with file

#### 6.6 Verify Lab Results
```
POST /api/lab-orders/[id]/verify
```
**Purpose**: Vet reviews and approves results
**Request Body**:
```typescript
{
  verified_by: string;
  interpretation?: string;
  notify_owner?: boolean;
}
```

---

## 7. Staff Management APIs

### Existing
- `GET /api/staff` - List staff members

### Missing

#### 7.1 Get Staff Schedule
```
GET /api/staff/[id]/schedule
```
**Query Parameters**:
```typescript
{
  start_date: string;
  end_date: string;
}
```
**Response**: Array of schedule blocks

#### 7.2 Update Staff Schedule
```
PUT /api/staff/[id]/schedule
```
**Request Body**:
```typescript
{
  schedules: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
}
```

#### 7.3 Request Time Off
```
POST /api/staff/[id]/time-off
```
**Request Body**:
```typescript
{
  start_date: string;
  end_date: string;
  reason: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
}
```

#### 7.4 Approve Time Off
```
POST /api/time-off/[id]/approve
```
**Request Body**:
```typescript
{
  approved: boolean;
  notes?: string;
}
```

#### 7.5 Get Staff Performance
```
GET /api/staff/[id]/performance
```
**Query Parameters**:
```typescript
{
  period: 'week' | 'month' | 'quarter' | 'year';
}
```
**Response**:
```typescript
{
  appointments_completed: number;
  average_rating: number;
  revenue_generated: number;
  patients_seen: number;
}
```

---

## 8. Inventory APIs

### Existing
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add item
- `PATCH /api/inventory/[id]` - Update item

### Missing

#### 8.1 Record Stock Movement
```
POST /api/inventory/[id]/movements
```
**Request Body**:
```typescript
{
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  unit_cost?: number;
  reason: string;
  reference_id?: string;
  reference_type?: 'purchase' | 'sale' | 'expired' | 'damaged';
}
```

#### 8.2 Create Purchase Order
```
POST /api/inventory/purchase-orders
```
**Request Body**:
```typescript
{
  supplier_id: string;
  items: Array<{
    inventory_item_id: string;
    quantity: number;
    unit_cost: number;
  }>;
  expected_date?: string;
  notes?: string;
}
```

#### 8.3 Receive Purchase Order
```
POST /api/inventory/purchase-orders/[id]/receive
```
**Request Body**:
```typescript
{
  received_items: Array<{
    item_id: string;
    quantity_received: number;
    batch_number?: string;
    expiry_date?: string;
  }>;
}
```

#### 8.4 Get Expiring Items
```
GET /api/inventory/expiring
```
**Query Parameters**:
```typescript
{
  days_ahead?: number; // default 30
  category?: string;
}
```

---

## 9. Report APIs

### Existing
- `GET /api/dashboard/stats` - Dashboard KPIs
- `GET /api/dashboard/appointments` - Appointment trends
- `GET /api/dashboard/revenue` - Revenue analytics
- `GET /api/dashboard/inventory-alerts` - Stock alerts
- `GET /api/dashboard/vaccines` - Vaccine reminders

### Missing

#### 9.1 Generate Financial Report
```
GET /api/reports/financial
```
**Query Parameters**:
```typescript
{
  start_date: string;
  end_date: string;
  report_type: 'summary' | 'detailed' | 'tax';
  format?: 'json' | 'csv' | 'pdf';
}
```

#### 9.2 Generate Patient Report
```
GET /api/reports/patients
```
**Query Parameters**:
```typescript
{
  start_date: string;
  end_date: string;
  species?: string;
  include_demographics?: boolean;
}
```

#### 9.3 Generate Service Report
```
GET /api/reports/services
```
**Query Parameters**:
```typescript
{
  start_date: string;
  end_date: string;
  service_category?: string;
}
```
**Response**: Service utilization, revenue per service, trends

#### 9.4 Generate Staff Report
```
GET /api/reports/staff
```
**Query Parameters**:
```typescript
{
  start_date: string;
  end_date: string;
  staff_id?: string;
}
```
**Response**: Productivity metrics, appointments, revenue

#### 9.5 Export Data
```
POST /api/reports/export
```
**Request Body**:
```typescript
{
  data_type: 'clients' | 'pets' | 'appointments' | 'invoices';
  format: 'csv' | 'xlsx' | 'json';
  filters?: Record<string, any>;
}
```

#### 9.6 Epidemiology Report
```
GET /api/reports/epidemiology
```
**Query Parameters**:
```typescript
{
  start_date: string;
  end_date: string;
  condition?: string;
  species?: string;
  geographic_area?: string;
}
```

---

## 10. Consent Form APIs

### All Missing - Schema exists in `25_schema_consent.sql`

#### 10.1 List Consent Templates
```
GET /api/consent/templates
```
**Response**: Array of consent form templates

#### 10.2 Create Consent Template
```
POST /api/consent/templates
```
**Request Body**:
```typescript
{
  name: string;
  description: string;
  content_html: string;
  requires_witness?: boolean;
  valid_days?: number;
}
```

#### 10.3 Request Consent
```
POST /api/consent/requests
```
**Request Body**:
```typescript
{
  template_id: string;
  pet_id: string;
  owner_id: string;
  procedure_id?: string;
  expires_at?: string;
}
```

#### 10.4 Sign Consent
```
POST /api/consent/requests/[id]/sign
```
**Request Body**:
```typescript
{
  signature_data: string; // base64 signature image
  ip_address?: string;
  device_info?: string;
}
```

#### 10.5 Get Signed Consent PDF
```
GET /api/consent/requests/[id]/pdf
```
**Response**: PDF document with signature

---

## 11. Insurance APIs

### All Missing - Schema exists in `28_schema_insurance.sql`

#### 11.1 Add Insurance Policy
```
POST /api/pets/[id]/insurance
```
**Request Body**:
```typescript
{
  provider_name: string;
  policy_number: string;
  group_number?: string;
  coverage_start: string;
  coverage_end?: string;
  coverage_type: string;
  deductible?: number;
  copay_percentage?: number;
}
```

#### 11.2 Submit Claim
```
POST /api/insurance/claims
```
**Request Body**:
```typescript
{
  policy_id: string;
  invoice_id: string;
  diagnosis_codes: string[];
  procedure_codes: string[];
  notes?: string;
}
```

#### 11.3 Check Claim Status
```
GET /api/insurance/claims/[id]
```
**Response**: Claim status and history

#### 11.4 Update Claim
```
PATCH /api/insurance/claims/[id]
```
**Purpose**: Update with insurance company response

---

## Implementation Priority

### Phase 1 - Critical (Week 1-2)
1. `POST /api/auth/forgot-password`
2. `POST /api/auth/update-password`
3. `PATCH /api/pets/[id]`
4. `POST /api/appointments/[id]/cancel`
5. `GET /api/appointments/slots`

### Phase 2 - High Priority (Week 3-4)
1. `POST /api/appointments/[id]/check-in`
2. `POST /api/appointments/[id]/complete`
3. Hospitalization APIs (all)
4. Lab Results APIs (all)

### Phase 3 - Medium Priority (Week 5-6)
1. Staff Management APIs
2. Inventory movement APIs
3. Report generation APIs
4. Consent form APIs

### Phase 4 - Lower Priority (Week 7+)
1. Insurance APIs
2. Advanced reporting
3. Data export APIs

---

## API Design Standards

### Authentication
All endpoints require authentication unless marked public:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Authorization
Staff-only endpoints should verify role:
```typescript
const { data: isStaff } = await supabase.rpc('is_staff_of', { 
  _tenant_id: clinicId 
});
if (!isStaff) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Error Handling
Standard error response format:
```typescript
{
  error: string;
  code?: string;
  details?: Record<string, any>;
}
```

### Pagination
List endpoints should support pagination:
```typescript
{
  page?: number;      // default 1
  limit?: number;     // default 20, max 100
  sort?: string;      // field name
  order?: 'asc' | 'desc';
}
```

Response format:
```typescript
{
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

### Rate Limiting
Consider implementing rate limits for:
- Auth endpoints: 10 requests/minute
- Write operations: 60 requests/minute
- Read operations: 300 requests/minute

---

## Server Actions vs API Routes

### Use Server Actions For:
- Form submissions (create, update)
- Single-use mutations
- Actions that redirect after completion

### Use API Routes For:
- Data fetching (GET requests)
- Webhook receivers
- External integrations
- Real-time operations

---

## Testing Requirements

Each API endpoint should have:
1. Unit tests for business logic
2. Integration tests with database
3. Authentication/authorization tests
4. Error handling tests
5. Validation tests for input

Example test structure:
```typescript
describe('POST /api/appointments/[id]/cancel', () => {
  it('cancels appointment when owner requests', async () => {});
  it('prevents cancellation of past appointments', async () => {});
  it('requires authentication', async () => {});
  it('prevents cancellation by non-owner', async () => {});
  it('queues notification on success', async () => {});
});
```
