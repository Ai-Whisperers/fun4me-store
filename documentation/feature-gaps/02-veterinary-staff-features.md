# Veterinary Staff Feature Gaps

This document details missing features from the perspective of veterinary staff (veterinarians and technicians) who use the platform to manage patients, appointments, and clinical workflows.

> **December 2024 Update**: A comprehensive code audit revealed that many features listed here as "missing" have been partially or fully implemented. Key implementations include:
> - Staff dashboard with stats, charts, alerts
> - Pet search with fuzzy matching
> - Medical records creation with vitals
> - Prescription system with PDF generation
> - Drug dosage calculator
> - Diagnosis code search
> - Growth charts display
> - Vaccine reactions tracking
> - Inventory management (schema + API)
> - Full invoicing API (CRUD, payments, refunds)
>
> Review each section against actual code before implementation.

---

## 1. Schedule & Calendar Management

### Current State
- Appointments stored in database
- Staff dashboard shows upcoming appointment count
- Link to `/schedule` page exists but page is incomplete

### Missing Features

#### 1.1 Visual Calendar View 🔴 CRITICAL
**User Story**: As a vet, I want to see my appointments on a calendar so I can plan my day.

**Requirements**:
- Day view with hourly time slots
- Week view with columns per day
- Month overview
- Drag-and-drop rescheduling
- Color coding by service type
- Color coding by status (confirmed, pending, arrived)
- Click appointment to see details
- Click empty slot to create appointment

**Implementation Notes**:
- Consider library: `react-big-calendar` or `@fullcalendar/react`
- File: `web/app/[clinic]/portal/schedule/page.tsx` (exists, needs full implementation)
- File: `web/components/scheduling/calendar-view.tsx` (create)

**Acceptance Criteria**:
- [ ] Can view day/week/month
- [ ] Appointments display with pet name, service, time
- [ ] Can drag appointment to new time slot
- [ ] Updates database on drag-drop
- [ ] Shows overbooking warnings

---

#### 1.2 Staff Availability Management 🟡 HIGH
**User Story**: As a vet, I want to set my working hours so appointments are only booked when I'm available.

**Requirements**:
- Define weekly schedule (M-F 9-5, etc.)
- Set breaks (lunch 12-1)
- Mark days off/vacation
- Different schedules per week
- Override for specific dates

**Database**: Schema exists in `26_staff_scheduling.sql`
- Table: `staff_schedules`
- Table: `schedule_exceptions`

---

#### 1.3 Appointment Status Workflow 🔴 CRITICAL
**User Story**: As a vet tech, I want to update appointment status as the patient moves through their visit.

**Requirements**:
- Status progression:
  - `scheduled` → `confirmed` → `checked_in` → `in_progress` → `completed`
  - Alternative: `no_show`, `cancelled`
- Quick status buttons on calendar
- Time stamps for each status change
- Notification to owner on status change

**Implementation Notes**:
- `appointments` table has `status` field
- Need UI buttons to change status
- File: `web/components/scheduling/appointment-card.tsx` (create)

---

#### 1.4 Patient Queue / Waiting Room View 🟡 HIGH
**User Story**: As a vet, I want to see who's waiting so I know who's next.

**Requirements**:
- List of checked-in patients
- Wait time display
- Order by appointment time
- Order by check-in time
- Urgent/priority flag option
- Quick call-in button

---

#### 1.5 Multi-Room Management 🟢 MEDIUM
**User Story**: As a vet, I want to assign patients to exam rooms.

**Requirements**:
- Define available rooms
- Assign room when patient called
- Room status (occupied, cleaning, available)
- Visual room map

**Database Addition Needed**:
```sql
CREATE TABLE exam_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  room_type TEXT, -- 'exam', 'surgery', 'imaging'
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE room_assignments (
  appointment_id UUID REFERENCES appointments(id),
  room_id UUID REFERENCES exam_rooms(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);
```

---

#### 1.6 Time Blocking 🟢 MEDIUM
**User Story**: As a vet, I want to block time for surgeries, lunch, or admin work.

**Requirements**:
- Create time block on calendar
- Block type (surgery, meeting, lunch, personal)
- Recurring blocks
- Block prevents booking

---

## 2. Patient Management

### Current State
- Can view patient list on dashboard
- Pet search with fuzzy matching
- Pet profile with medical history
- Can add medical records

### Missing Features

#### 2.1 Patient Check-In Workflow 🔴 CRITICAL
**User Story**: As a vet tech, I want a streamlined check-in process when patients arrive.

**Requirements**:
- Check-in button on appointment
- Verify/update owner contact info
- Verify/update pet weight
- Confirm reason for visit
- Note any concerns from owner
- Assign to queue/waiting room

**File**: `web/components/scheduling/check-in-form.tsx` (create)

---

#### 2.2 Quick Notes During Exam 🟡 HIGH
**User Story**: As a vet, I want to quickly add notes during an examination.

**Requirements**:
- Floating note widget
- Auto-save every 30 seconds
- Voice-to-text option (browser API)
- Attach to current appointment
- Template quick-insert

---

#### 2.3 Photo Documentation 🟡 HIGH
**User Story**: As a vet, I want to take photos during exams to document conditions.

**Requirements**:
- Camera capture from device
- Upload from gallery
- Annotate photos (draw on image)
- Link to medical record
- Before/after comparison view

**Implementation Notes**:
- Use `<input type="file" capture="environment">` for mobile
- Store in Supabase Storage
- Link in `medical_records.attachments`

---

#### 2.4 Body Condition Scoring 🟡 HIGH
**User Story**: As a vet, I want to record standardized body condition scores.

**Requirements**:
- BCS scale (1-9)
- Visual reference chart
- Track over time
- Include in medical record
- Alert if score changes significantly

**Implementation Notes**:
- Add `bcs_score` field to `medical_records.vitals` JSONB
- Create `web/components/clinical/bcs-selector.tsx`

---

#### 2.5 Patient Alerts/Flags 🔴 CRITICAL
**User Story**: As a vet, I want to see important warnings about patients immediately.

**Requirements**:
- Alert types:
  - Aggressive animal
  - Fearful/anxious
  - Known allergies (drug reactions)
  - Special handling required
  - Outstanding balance
  - VIP client
- Display prominently on patient card
- Show on check-in
- Cannot be dismissed accidentally

**Current**: Vaccine reactions show as alert (partial implementation)
**Needed**: Generalized alert system

**Database Addition**:
```sql
CREATE TABLE patient_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID REFERENCES pets(id),
  alert_type TEXT NOT NULL, -- 'aggressive', 'fearful', 'allergy', 'handling', 'financial', 'vip'
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'danger'
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 2.6 Patient Search Enhancements 🟡 HIGH
**User Story**: As a vet tech, I want to find patients by multiple criteria.

**Requirements**:
- Search by pet name (exists)
- Search by owner name
- Search by owner phone
- Search by microchip ID
- Search by appointment date
- Recent patients list

---

## 3. Medical Records

### Current State
- Can create medical records with type, vitals, notes
- Timeline display on pet profile
- Attachments supported

### Missing Features

#### 3.1 SOAP Notes Format 🔴 CRITICAL
**User Story**: As a vet, I want to document visits in standard SOAP format.

**Requirements**:
- Structured form:
  - **S**ubjective: Owner's complaints, history
  - **O**bjective: Exam findings, vitals, test results
  - **A**ssessment: Diagnosis, differentials
  - **P**lan: Treatment, prescriptions, follow-up
- Each section expandable
- Template library for common presentations
- Auto-fill from previous visit

**Implementation Notes**:
- Modify `medical_records` structure or create separate SOAP table
- File: `web/components/clinical/soap-note-form.tsx` (create)

---

#### 3.2 Record Templates 🟡 HIGH
**User Story**: As a vet, I want pre-filled templates for common visit types.

**Requirements**:
- Templates for:
  - Annual wellness exam
  - Vaccination visit
  - Sick visit
  - Pre-surgical exam
  - Post-surgical follow-up
  - Dental cleaning
- Customizable templates per clinic
- Quick template selection

---

#### 3.3 Previous Record Comparison 🟢 MEDIUM
**User Story**: As a vet, I want to compare current findings with previous visits.

**Requirements**:
- Side-by-side view
- Highlight differences
- Weight/vitals trend
- Quick copy from previous

---

#### 3.4 Record Locking & Amendments 🟡 HIGH
**User Story**: As a vet, I want records to be locked after a period to prevent tampering.

**Requirements**:
- Auto-lock after 24-48 hours
- Amendment process for corrections
- Amendment shows original + correction
- Audit trail of all changes

**Implementation Notes**:
- Add `locked_at` field to `medical_records`
- Create `record_amendments` table
- Audit logs already exist

---

#### 3.5 Problem List Management 🟡 HIGH
**User Story**: As a vet, I want to track ongoing problems/conditions for each patient.

**Requirements**:
- Active problems list
- Resolved problems with date
- Link problems to records
- Alert when related problem
- Chronic condition tracking

**Database Addition**:
```sql
CREATE TABLE patient_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID REFERENCES pets(id),
  problem_name TEXT NOT NULL,
  diagnosis_code_id UUID REFERENCES diagnosis_codes(id),
  onset_date DATE,
  resolved_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 3.6 Discharge Instructions 🟡 HIGH
**User Story**: As a vet, I want to generate take-home instructions for clients.

**Requirements**:
- Template-based generation
- Customizable per visit
- Include:
  - Diagnosis summary (layman terms)
  - Medications with schedule
  - Activity restrictions
  - Diet recommendations
  - Warning signs to watch
  - Follow-up appointment
- Print and email options

**File**: `web/components/clinical/discharge-instructions.tsx` (create)

---

## 4. Diagnostics & Lab

### Current State
- Database schema exists (`24_lab_results.sql`)
- No UI implementation

### Missing Features

#### 4.1 Lab Order Creation 🟡 HIGH
**User Story**: As a vet, I want to order lab tests for a patient.

**Requirements**:
- Select test type (CBC, chemistry, urinalysis, fecal, etc.)
- Link to patient and appointment
- Track order status (ordered, collected, sent, resulted)
- In-house vs. external lab option
- Print requisition form

**Database**: Tables exist:
- `lab_orders`
- `lab_results`

**File**: `web/app/[clinic]/portal/lab/new/page.tsx` (create)

---

#### 4.2 Lab Result Entry 🟡 HIGH
**User Story**: As a vet, I want to enter lab results into the system.

**Requirements**:
- Manual entry form
- Import from CSV/PDF
- External lab integration (future)
- Reference ranges per species
- Abnormal value highlighting
- Historical comparison

---

#### 4.3 Lab Result Trends 🟢 MEDIUM
**User Story**: As a vet, I want to see how lab values have changed over time.

**Requirements**:
- Line chart for each value
- Normal range shading
- Compare multiple values
- Identify trends (improving, worsening)

---

#### 4.4 Imaging Viewer 🟢 MEDIUM
**User Story**: As a vet, I want to view X-rays and ultrasounds in the system.

**Requirements**:
- Image upload
- Basic viewer (zoom, pan, rotate)
- Compare with previous images
- Annotation tools
- DICOM support (advanced)

---

## 5. Surgery & Procedures

### Current State
- Surgery can be recorded as medical record type
- No dedicated surgery workflow

### Missing Features

#### 5.1 Surgery Scheduling 🟡 HIGH
**User Story**: As a vet, I want to schedule surgeries with proper time blocking.

**Requirements**:
- Block OR time on calendar
- Pre-op checklist required
- Staff assignment
- Equipment/room assignment
- Estimated duration

---

#### 5.2 Pre-Surgery Checklist 🟡 HIGH
**User Story**: As a vet tech, I want to confirm pre-surgical requirements are met.

**Requirements**:
- Fasting confirmation
- Pre-op bloodwork reviewed
- Consent form signed
- IV catheter placed
- Pre-medications given
- Cannot proceed without completion

**Database**: Consent system exists in `25_consent.sql`

---

#### 5.3 Anesthesia Monitoring Log 🟡 HIGH
**User Story**: As a vet, I want to record vitals during anesthesia.

**Requirements**:
- Time-based vital entry (every 5 min)
- HR, RR, SpO2, BP, temp, anesthesia depth
- Drug administration log
- Alert for abnormal values
- Generate anesthesia report

**Database Addition**:
```sql
CREATE TABLE anesthesia_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id),
  pet_id UUID REFERENCES pets(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  protocol TEXT,
  complications TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE anesthesia_vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id UUID REFERENCES anesthesia_logs(id),
  recorded_at TIMESTAMPTZ NOT NULL,
  heart_rate INT,
  respiratory_rate INT,
  spo2 DECIMAL,
  blood_pressure TEXT,
  temperature DECIMAL,
  anesthesia_depth TEXT,
  notes TEXT
);
```

---

#### 5.4 Surgery Notes Template 🟡 HIGH
**User Story**: As a vet, I want a structured format for surgical documentation.

**Requirements**:
- Pre-filled procedure templates (spay, neuter, mass removal, etc.)
- Surgical findings
- Tissue disposition
- Suture type and layers
- Estimated blood loss
- Complications
- Post-op instructions auto-generated

---

## 6. Prescriptions & Pharmacy

### Current State
- Can create prescriptions with drugs
- PDF generation works
- Drug dosage calculator component exists

### Missing Features

#### 6.1 Drug Database Search 🟡 HIGH
**User Story**: As a vet, I want to search for drugs by name when prescribing.

**Requirements**:
- Autocomplete drug search
- Show available formulations
- Show standard dosages
- Drug information link
- Recently used drugs

**Current**: Basic search exists in `drug-search.tsx`
**Needed**: Integration with prescription form

---

#### 6.2 Automatic Dosage Calculation 🟡 HIGH
**User Story**: As a vet, I want dosages calculated based on patient weight.

**Requirements**:
- Select drug and dose (mg/kg)
- Auto-calculate based on current weight
- Round to practical dose
- Show pills/tablets needed
- Duration calculator

**Current**: `dosage-calculator.tsx` exists
**Needed**: Integration into prescription workflow

---

#### 6.3 Drug Interaction Warnings 🔴 CRITICAL
**User Story**: As a vet, I want to be warned about dangerous drug interactions.

**Requirements**:
- Check against current medications
- Check against known allergies
- Severity levels (contraindicated, caution, monitor)
- Cannot proceed without acknowledgment
- Link to interaction details

**Implementation Notes**:
- Need drug interaction database
- Check `vaccine_reactions` for allergy history

---

#### 6.4 Controlled Substance Logging 🟡 HIGH
**User Story**: As a vet, I want to track controlled substances for DEA compliance.

**Requirements**:
- Log each dispensing
- Running inventory count
- Reconciliation reports
- Two-signature requirement
- Waste documentation

---

#### 6.5 Refill Approval Workflow 🟡 HIGH
**User Story**: As a vet, I want to review and approve refill requests from clients.

**Requirements**:
- Queue of pending refill requests
- View prescription history
- Quick approve/deny
- Add instructions if changed
- Auto-notify client
- Refill count tracking

---

#### 6.6 Prescription Printing 🟢 MEDIUM
**User Story**: As a vet, I want to print prescriptions for external pharmacies.

**Requirements**:
- Standard prescription format
- Clinic letterhead
- DEA number for controlled
- Client can take to human pharmacy if applicable

---

## 7. Billing During Visit

### Current State
- Invoice schema exists
- No UI for creating charges during visit

### Missing Features

#### 7.1 Quick Charge Addition 🔴 CRITICAL
**User Story**: As a vet, I want to add charges to the client's bill during the visit.

**Requirements**:
- Service search/selection
- Add to current invoice
- Quantity adjustment
- View running total
- Apply discounts

**File**: `web/components/billing/quick-charge.tsx` (create)

---

#### 7.2 Treatment Estimate Generation 🟡 HIGH
**User Story**: As a vet, I want to create cost estimates for clients before proceeding.

**Requirements**:
- Select services and products
- Show low/high range
- Client signature/approval
- Convert to invoice when approved
- Print or email estimate

---

#### 7.3 Service Bundles 🟢 MEDIUM
**User Story**: As a vet, I want to apply package pricing for common service combinations.

**Requirements**:
- Define bundles (e.g., "Puppy Package" = exam + vaccines + deworming)
- Apply bundle price vs. individual
- Track bundle usage

---

## 8. Client Communication

### Current State
- No in-app messaging UI
- WhatsApp link for external communication

### Missing Features

#### 8.1 In-Visit Notes to Client 🟡 HIGH
**User Story**: As a vet, I want to share specific notes with the client about their visit.

**Requirements**:
- Mark certain notes as "share with client"
- Automatically visible in client portal
- Layman-friendly language
- Photos can be included

---

#### 8.2 Post-Visit Follow-Up 🟡 HIGH
**User Story**: As a vet, I want to send follow-up messages after visits.

**Requirements**:
- Automated "How is [pet] doing?" message
- Customizable timing (1 day, 3 days, 1 week)
- Template-based
- Response comes into messaging

---

#### 8.3 Test Result Notification 🟡 HIGH
**User Story**: As a vet, I want to notify clients when test results are ready.

**Requirements**:
- One-click notify when results entered
- Include brief summary
- Link to view full results
- Option to call to discuss

---

## 9. Clinical Decision Support

### Current State
- Diagnosis code search exists
- Drug dosage calculator exists
- Growth charts display

### Missing Features

#### 9.1 Differential Diagnosis Helper 🟢 MEDIUM
**User Story**: As a vet, I want suggestions for possible diagnoses based on symptoms.

**Requirements**:
- Enter presenting symptoms
- Suggest possible diagnoses
- Ranked by likelihood
- Link to diagnostic workup
- Evidence-based sources

---

#### 9.2 Treatment Protocols 🟢 MEDIUM
**User Story**: As a vet, I want quick access to standard treatment protocols.

**Requirements**:
- Common conditions (parvo, kennel cough, diabetes, etc.)
- Step-by-step treatment
- Medication options
- Monitoring requirements
- Clinic-customizable

---

#### 9.3 Vaccination Protocols 🟡 HIGH
**User Story**: As a vet, I want automatic vaccine recommendations based on patient age and history.

**Requirements**:
- Species-specific schedules
- Age-based recommendations
- Account for previous vaccines
- Core vs. lifestyle vaccines
- Regional recommendations

**Current**: `vaccine_templates` table exists
**Needed**: Recommendation engine

---

## 10. Hospitalization & Boarding

### Current State
- Database schema exists (`23_boarding.sql`)
- No UI implementation

### Missing Features

#### 10.1 Kennel Assignment 🟡 HIGH
**User Story**: As a vet tech, I want to assign patients to kennels.

**Requirements**:
- Visual kennel grid/map
- Kennel status (available, occupied, cleaning)
- Assign patient to kennel
- Special requirements (isolation, oxygen)
- Capacity warnings

**Database**: Tables exist:
- `kennels`
- `hospitalizations`

**File**: `web/app/[clinic]/portal/hospital/page.tsx` (create)

---

#### 10.2 Hospitalization Treatment Sheets 🟡 HIGH
**User Story**: As a vet tech, I want a treatment sheet to track daily care.

**Requirements**:
- Treatment orders for patient
- Time-based checkboxes (medications, feedings, walks)
- Staff initials for each task
- Notes per treatment
- Print for cage card

---

#### 10.3 Vitals Monitoring Log 🟡 HIGH
**User Story**: As a vet tech, I want to record vitals at regular intervals.

**Requirements**:
- TPR (Temperature, Pulse, Respiration)
- Weight daily
- Appetite/eating
- Urination/defecation
- Attitude/mentation
- Chart trends over hospitalization

**Database**: `vitals` table exists

---

#### 10.4 Owner Updates 🟢 MEDIUM
**User Story**: As a vet, I want to send daily updates to owners of hospitalized pets.

**Requirements**:
- Daily status summary
- Include photo
- Send via email/SMS
- Template-based
- One-click send

---

#### 10.5 Discharge Workflow 🟡 HIGH
**User Story**: As a vet, I want a structured discharge process for hospitalized patients.

**Requirements**:
- Discharge checklist
- Final vitals recorded
- Medications dispensed
- Take-home instructions generated
- Follow-up scheduled
- Invoice finalized
- Release to owner

---

## Implementation Checklist

### Phase 1: Critical (Must Have)
- [ ] Visual calendar view
- [ ] Appointment status workflow
- [ ] Patient check-in process
- [ ] Quick notes during exam
- [ ] Patient alerts/flags
- [ ] SOAP notes format
- [ ] Drug interaction warnings
- [ ] Quick charge addition

### Phase 2: High Priority
- [ ] Staff availability management
- [ ] Patient queue view
- [ ] Photo documentation
- [ ] Body condition scoring
- [ ] Record templates
- [ ] Problem list management
- [ ] Lab order/result entry
- [ ] Surgery scheduling
- [ ] Pre-surgery checklist
- [ ] Anesthesia monitoring
- [ ] Prescription enhancements
- [ ] Treatment estimates
- [ ] Kennel assignment
- [ ] Treatment sheets

### Phase 3: Medium Priority
- [ ] Time blocking
- [ ] Multi-room management
- [ ] Record comparison
- [ ] Lab trends
- [ ] Imaging viewer
- [ ] Surgery notes template
- [ ] Discharge instructions
- [ ] Post-visit follow-up
- [ ] Differential diagnosis helper
- [ ] Treatment protocols
- [ ] Owner updates
