# Vete Platform - Comprehensive Diagram Analysis

This document identifies all diagrams, flows, and charts we can create to understand the Vete platform architecture, interactions, and features using Mermaid diagrams.

> **Reference**: [Cursor Mermaid Diagrams Cookbook](https://cursor.com/docs/cookbook/mermaid-diagrams)

---

## Table of Contents

1. [Architecture Diagrams](#architecture-diagrams)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [User Journey Flows](#user-journey-flows)
4. [System Interaction Diagrams](#system-interaction-diagrams)
5. [Database Schema Diagrams](#database-schema-diagrams)
6. [Security & Access Control](#security--access-control)
7. [Feature-Specific Flows](#feature-specific-flows)
8. [State Machine Diagrams](#state-machine-diagrams)
9. [Component Hierarchy](#component-hierarchy)
10. [API Flow Diagrams](#api-flow-diagrams)

---

## Architecture Diagrams

### 1. High-Level System Architecture

**Purpose**: Show the overall system structure and how components interact.

**Type**: `graph TD` or `flowchart TD`

**What it shows**:
- Client browsers (Pet Owner, Vet, Admin)
- Next.js application layer
- Supabase services (PostgreSQL, Auth, Storage)
- Multi-tenant routing
- JSON-CMS content system

**Key Elements**:
```
Clients → Next.js App Router → Supabase
         ↓
    JSON-CMS Content
         ↓
    Dynamic Theming
```

### 2. Multi-Tenant Architecture

**Purpose**: Visualize how multiple clinics are served from one codebase.

**Type**: `graph LR` with subgraphs

**What it shows**:
- Dynamic routing `/[clinic]/*`
- Content isolation per tenant
- Database RLS isolation
- Theme isolation
- Shared codebase

**Key Elements**:
- Tenant A (adris) → Content A → Theme A → Data A
- Tenant B (petlife) → Content B → Theme B → Data B
- Shared: Code, Database Schema, Infrastructure

### 3. Application Layer Architecture

**Purpose**: Detail the Next.js application structure.

**Type**: `flowchart TD`

**What it shows**:
- App Router structure
- Server Components vs Client Components
- API Routes
- Server Actions
- Middleware layer
- Component organization

### 4. Technology Stack Diagram

**Purpose**: Show all technologies and their relationships.

**Type**: `graph TB`

**What it shows**:
- Frontend: Next.js 15, React 19, Tailwind CSS
- Backend: Next.js API Routes, Server Actions
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- Storage: Supabase Storage
- Testing: Vitest, Playwright

---

## Data Flow Diagrams

### 5. Page Load Flow

**Purpose**: Trace how a page request flows through the system.

**Type**: `sequenceDiagram`

**What it shows**:
```
User → Next.js Router → Layout → Page Component
                        ↓
                   Load Clinic Data
                        ↓
                   Apply Theme
                        ↓
                   Render Content
```

**Key Steps**:
1. User requests `/[clinic]/services`
2. Router extracts clinic slug
3. Layout loads clinic config + theme
4. Page loads services.json
5. Components render with theme
6. Response sent to browser

### 6. API Request Flow

**Purpose**: Show how API requests are processed.

**Type**: `sequenceDiagram`

**What it shows**:
```
Client → API Route → Auth Check → RLS → Database → Response
```

**Key Steps**:
1. Client makes fetch request
2. API route handler receives request
3. Supabase client created
4. Auth token validated
5. RLS policies applied automatically
6. Query executed
7. Response returned

### 7. Server Action Flow

**Purpose**: Trace Server Action execution.

**Type**: `sequenceDiagram`

**What it shows**:
```
Form → Server Action → Validation → Database → Result
```

**Key Steps**:
1. Form submission
2. Server Action invoked
3. Input validation (Zod)
4. Auth check
5. Database operation
6. Success/error result

### 8. Multi-Tenant Data Isolation Flow

**Purpose**: Show how RLS ensures data isolation.

**Type**: `flowchart TD`

**What it shows**:
```
User Request → Extract tenant_id from profile
                    ↓
              RLS Policy Check
                    ↓
         Filter: WHERE tenant_id = user.tenant_id
                    ↓
              Return Filtered Data
```

---

## User Journey Flows

### 9. Pet Owner Registration & Onboarding

**Purpose**: Complete flow from signup to first appointment.

**Type**: `flowchart TD`

**What it shows**:
```
Visit Clinic Site → Sign Up → Email Verification
                              ↓
                    Create Profile
                              ↓
                    Register Pet
                              ↓
                    Book Appointment
                              ↓
                    Receive Confirmation
```

### 10. Appointment Booking Flow

**Purpose**: Step-by-step booking wizard flow.

**Type**: `flowchart TD`

**What it shows**:
```
Step 1: Select Service
    ↓
Step 2: Select Pet
    ↓
Step 3: Choose Date/Time
    ↓
Step 4: Confirm Details
    ↓
Submit → API Call → Overlap Check → Create Appointment
```

**States**:
- service_selection
- pet_selection
- datetime_selection
- confirmation
- success
- error

### 11. Store Checkout Flow

**Purpose**: Complete e-commerce checkout process.

**Type**: `flowchart TD` (detailed in checkout-flow.md)

**What it shows**:
```
Add to Cart → View Cart → Checkout Page
                              ↓
                    Validate Stock (with locking)
                              ↓
                    Create Invoice
                              ↓
                    Decrement Stock
                              ↓
                    Return Success
```

### 12. Pet Medical Record Creation

**Purpose**: Flow for creating a medical record.

**Type**: `sequenceDiagram`

**What it shows**:
```
Vet → Dashboard → Select Pet → New Record Form
                                      ↓
                            Fill Details (diagnosis, notes)
                                      ↓
                            Submit → Server Action
                                      ↓
                            Validate → Create Record
                                      ↓
                            Update Pet Timeline
```

### 13. Prescription Workflow

**Purpose**: Create and manage prescriptions.

**Type**: `flowchart TD`

**What it shows**:
```
Select Pet → Create Prescription → Add Medications
                                        ↓
                              Calculate Dosages
                                        ↓
                              Generate PDF
                                        ↓
                              Sign & Send
```

---

## System Interaction Diagrams

### 14. Authentication Flow

**Purpose**: Complete authentication process.

**Type**: `sequenceDiagram`

**What it shows**:
```
User → Login Form → Supabase Auth
                        ↓
              Email/Password Validation
                        ↓
              JWT Token Generated
                        ↓
              Profile Lookup (tenant_id, role)
                        ↓
              Session Established
                        ↓
              RLS Context Set
```

### 15. Multi-Tenant Request Routing

**Purpose**: How requests are routed to correct tenant.

**Type**: `flowchart TD`

**What it shows**:
```
Request → Extract [clinic] from URL
              ↓
        Load Clinic Config
              ↓
        Validate Tenant Exists
              ↓
        Apply Theme
              ↓
        Set RLS Context
              ↓
        Route to Page
```

### 16. Content Loading Flow

**Purpose**: How JSON-CMS content is loaded.

**Type**: `sequenceDiagram`

**What it shows**:
```
Page Component → getClinicData()
                        ↓
              Read config.json
              Read theme.json
              Read [page].json
                        ↓
              Parse & Validate
                        ↓
              Return ClinicData
                        ↓
              Render with Theme
```

### 17. Theme Application Flow

**Purpose**: How dynamic theming works.

**Type**: `flowchart TD`

**What it shows**:
```
Load theme.json → Extract CSS Variables
                        ↓
              Inject into <html>
                        ↓
              Components Use var(--primary)
                        ↓
              Browser Applies Styles
```

---

## Database Schema Diagrams

### 18. Core Entity Relationship Diagram

**Purpose**: Main entities and relationships.

**Type**: `erDiagram`

**What it shows**:
```
TENANTS ||--o{ PROFILES : has
PROFILES ||--o{ PETS : owns
PETS ||--o{ APPOINTMENTS : has
PETS ||--o{ MEDICAL_RECORDS : has
PETS ||--o{ VACCINES : has
APPOINTMENTS }o--|| SERVICES : uses
INVOICES ||--o{ INVOICE_ITEMS : contains
STORE_PRODUCTS ||--o{ STORE_INVENTORY : tracks
```

### 19. Medical Records Schema

**Purpose**: Medical data structure.

**Type**: `erDiagram`

**What it shows**:
```
PETS ||--o{ MEDICAL_RECORDS : has
MEDICAL_RECORDS ||--o{ PRESCRIPTIONS : generates
MEDICAL_RECORDS }o--|| DIAGNOSIS_CODES : uses
PRESCRIPTIONS }o--|| DRUG_DOSAGES : references
```

### 20. Business Operations Schema

**Purpose**: Invoicing, inventory, appointments.

**Type**: `erDiagram`

**What it shows**:
```
APPOINTMENTS }o--|| SERVICES : uses
INVOICES ||--o{ INVOICE_ITEMS : contains
INVOICES ||--o{ PAYMENTS : receives
STORE_PRODUCTS ||--o{ STORE_INVENTORY : tracks
STORE_INVENTORY ||--o{ INVENTORY_TRANSACTIONS : logs
```

### 21. Hospitalization Schema

**Purpose**: Inpatient management structure.

**Type**: `erDiagram`

**What it shows**:
```
PETS ||--o{ HOSPITALIZATIONS : admitted_to
HOSPITALIZATIONS }o--|| KENNELS : assigned_to
HOSPITALIZATIONS ||--o{ VITALS : monitored_by
HOSPITALIZATIONS ||--o{ TREATMENTS : receives
HOSPITALIZATIONS ||--o{ FEEDINGS : logged_in
```

---

## Security & Access Control

### 22. Row-Level Security (RLS) Flow

**Purpose**: How RLS policies enforce isolation.

**Type**: `flowchart TD`

**What it shows**:
```
Query Request → Get auth.uid()
                    ↓
              Lookup Profile
                    ↓
              Extract tenant_id
                    ↓
              Apply RLS Policy
                    ↓
         WHERE tenant_id = user.tenant_id
                    ↓
              Return Filtered Results
```

### 23. Role-Based Access Control

**Purpose**: How roles determine permissions.

**Type**: `graph TD`

**What it shows**:
```
OWNER → Own Pets, Own Appointments, Own Invoices
VET → All Pets (tenant), Medical Records, Prescriptions
ADMIN → Everything + Settings, Team Management
```

### 24. Authentication Security Layers

**Purpose**: Multiple security layers.

**Type**: `flowchart TD`

**What it shows**:
```
Layer 1: HTTPS/CORS
    ↓
Layer 2: JWT Validation
    ↓
Layer 3: Profile Lookup
    ↓
Layer 4: Tenant Validation
    ↓
Layer 5: RLS Policies
    ↓
Layer 6: Audit Logging
```

### 25. Cross-Tenant Protection

**Purpose**: How cross-tenant access is prevented.

**Type**: `sequenceDiagram`

**What it shows**:
```
User A (tenant: adris) → Request Data
                            ↓
                    RLS Checks tenant_id
                            ↓
                    Filter: WHERE tenant_id = 'adris'
                            ↓
                    User B (petlife) data excluded
```

---

## Feature-Specific Flows

### 26. Appointment Overlap Detection

**Purpose**: How double-booking is prevented.

**Type**: `flowchart TD`

**What it shows**:
```
New Appointment Request
    ↓
Calculate Start/End Times
    ↓
Query Existing Appointments
    ↓
Check: existing.start < new.end AND existing.end > new.start
    ↓
Overlap Found? → Error: "Horario ocupado"
    ↓
No Overlap → Create Appointment
```

### 27. Inventory Stock Management

**Purpose**: Stock tracking with WAC (Weighted Average Cost).

**Type**: `flowchart TD`

**What it shows**:
```
Inventory Transaction
    ↓
Get Current Stock & WAC
    ↓
Calculate New Values
    ↓
Update Inventory Record
    ↓
Log Transaction
```

### 28. Invoice Creation Flow

**Purpose**: How invoices are created and paid.

**Type**: `flowchart TD`

**What it shows**:
```
Create Invoice → Add Items → Calculate Totals
                                    ↓
                          Record Payment
                                    ↓
                          Update Status
                                    ↓
                          Generate PDF
```

### 29. Vaccine Schedule Tracking

**Purpose**: Vaccine due date calculation.

**Type**: `flowchart TD`

**What it shows**:
```
Record Vaccination → Get Template
                            ↓
                    Calculate Next Due Date
                            ↓
                    Create Next Vaccine Record
                            ↓
                    Set Status: 'scheduled'
```

### 30. QR Tag Assignment Flow

**Purpose**: How QR tags are assigned to pets.

**Type**: `sequenceDiagram`

**What it shows**:
```
Scan QR Code → Lookup Tag
                    ↓
              Check if Assigned
                    ↓
              Assign to Pet
                    ↓
              Update Pet Record
                    ↓
              Log Assignment
```

### 31. Lab Order Workflow

**Purpose**: Lab order creation to results.

**Type**: `flowchart TD`

**What it shows**:
```
Create Lab Order → Select Tests
                        ↓
              Assign to Pet
                        ↓
              Status: 'pending'
                        ↓
              Enter Results
                        ↓
              Status: 'completed'
                        ↓
              Attach PDFs
```

### 32. Hospitalization Admission Flow

**Purpose**: Patient admission process.

**Type**: `flowchart TD`

**What it shows**:
```
Select Pet → Choose Kennel → Admit
                                    ↓
                          Record Vitals
                                    ↓
                          Schedule Treatments
                                    ↓
                          Log Feedings
                                    ↓
                          Monitor → Discharge
```

---

## State Machine Diagrams

### 33. Appointment Status State Machine

**Purpose**: Appointment lifecycle states.

**Type**: `stateDiagram-v2`

**What it shows**:
```
[scheduled] → [confirmed] → [checked_in] → [in_progress] → [completed]
     ↓              ↓             ↓
[cancelled]   [no_show]    [rescheduled]
```

### 34. Invoice Status State Machine

**Purpose**: Invoice payment states.

**Type**: `stateDiagram-v2`

**What it shows**:
```
[pending] → [sent] → [paid]
    ↓          ↓
[cancelled] [overdue] → [paid]
```

### 35. Inventory Transaction Types

**Purpose**: Stock movement states.

**Type**: `stateDiagram-v2`

**What it shows**:
```
[stock_in] → Increase Stock
[stock_out] → Decrease Stock
[adjustment] → Correct Stock
[sale] → Decrease Stock (with invoice)
```

### 36. User Session States

**Purpose**: Authentication session lifecycle.

**Type**: `stateDiagram-v2`

**What it shows**:
```
[unauthenticated] → [authenticating] → [authenticated] → [expired]
                                        ↓
                                  [logged_out]
```

---

## Component Hierarchy

### 37. Booking Wizard Component Tree

**Purpose**: Component structure of booking flow.

**Type**: `graph TD`

**What it shows**:
```
BookingWizard
├── ProgressStepper
├── ServiceSelectionStep
├── PetSelectionStep
├── DateTimeSelectionStep
├── ConfirmationStep
└── SuccessScreen
```

### 38. Dashboard Layout Structure

**Purpose**: Staff dashboard component organization.

**Type**: `graph TD`

**What it shows**:
```
DashboardLayout
├── SidebarNavigation
├── Header
├── MainContent
│   ├── StatsCards
│   ├── CalendarView
│   └── RecentActivity
└── Footer
```

### 39. Clinic Theme Provider Hierarchy

**Purpose**: How theming cascades through components.

**Type**: `graph TD`

**What it shows**:
```
ClinicThemeProvider (injects CSS vars)
├── Layout
│   ├── Header (uses var(--primary))
│   ├── Navigation (uses var(--primary))
│   └── Content
│       └── Page Components (use theme vars)
└── Footer
```

---

## API Flow Diagrams

### 40. REST API Request Lifecycle

**Purpose**: Complete API request processing.

**Type**: `sequenceDiagram`

**What it shows**:
```
Client → API Route → Middleware → Auth Check
                                    ↓
                              Rate Limiting
                                    ↓
                              Input Validation
                                    ↓
                              Business Logic
                                    ↓
                              Database Query (RLS)
                                    ↓
                              Response Formatting
                                    ↓
                              Return JSON
```

### 41. Server Action vs REST API Decision Tree

**Purpose**: When to use Server Actions vs REST API.

**Type**: `flowchart TD`

**What it shows**:
```
Form Submission?
    ↓ YES → Use Server Action
    ↓ NO
Client-Side Fetch?
    ↓ YES → Use REST API
    ↓ NO
Server Component?
    ↓ YES → Use Server Action
```

### 42. Error Handling Flow

**Purpose**: How errors propagate through system.

**Type**: `flowchart TD`

**What it shows**:
```
Error Occurs
    ↓
Catch in Handler
    ↓
Log Error
    ↓
Format Error Response
    ↓
Return to Client
    ↓
Display User-Friendly Message
```

---

## Recommended Diagram Creation Strategy

Following the [Cursor Mermaid Cookbook](https://cursor.com/docs/cookbook/mermaid-diagrams) approach:

### Phase 1: Start Small (Low-Level)

1. **Appointment Booking Flow** - Single feature, detailed
2. **Checkout Flow** - Single feature, detailed
3. **Authentication Flow** - Core system component
4. **RLS Policy Flow** - Security mechanism

### Phase 2: Mid-Level (Component Integration)

5. **Multi-Tenant Request Routing** - How tenants are isolated
6. **API Request Lifecycle** - How APIs work
7. **Page Load Flow** - How pages render
8. **Database Query Flow** - How data is fetched

### Phase 3: High-Level (System Overview)

9. **System Architecture** - Complete system view
10. **Multi-Tenant Architecture** - Tenant isolation overview
11. **Entity Relationship Diagram** - Database structure
12. **User Journey Maps** - Complete user flows

### Phase 4: Combine & Abstract

13. **System Interaction Overview** - All components together
14. **Data Flow Summary** - End-to-end data movement
15. **Security Architecture** - All security layers
16. **Feature Matrix** - All features and their relationships

---

## Diagram Categories Summary

| Category | Count | Priority | Complexity |
|----------|-------|----------|------------|
| Architecture | 4 | High | Medium |
| Data Flow | 4 | High | Medium |
| User Journeys | 5 | High | Low |
| System Interactions | 4 | Medium | Medium |
| Database Schema | 4 | High | High |
| Security | 4 | Critical | High |
| Feature Flows | 7 | Medium | Low-Medium |
| State Machines | 4 | Medium | Low |
| Component Hierarchy | 3 | Low | Low |
| API Flows | 3 | Medium | Medium |
| **Total** | **42** | - | - |

---

## Next Steps

1. **Start with Phase 1 diagrams** (low-level, single features)
2. **Create Mermaid files** in `documentation/architecture/diagrams/`
3. **Reference in documentation** - Link diagrams from relevant docs
4. **Iterate and refine** - Update as system evolves
5. **Use in onboarding** - Help new developers understand system

---

## Tools & Resources

- **Mermaid Live Editor**: https://mermaid.live/
- **Cursor Mermaid Extension**: Already installed (`bierner.markdown-mermaid`)
- **Documentation**: https://cursor.com/docs/cookbook/mermaid-diagrams
- **Mermaid Syntax Guide**: https://mermaid.js.org/

---

*This analysis provides a comprehensive roadmap for visualizing the Vete platform architecture, flows, and interactions. Start with Phase 1 diagrams and build upward to create a complete visual understanding of the system.*

