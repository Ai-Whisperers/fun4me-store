# Vete Database Entity-Relationship Diagram

Complete visual representation of the Vete platform database schema showing all 100+ tables and their relationships.

## Table of Contents

- [Overview](#overview)
- [Core Domain](#core-domain)
- [Pet Management](#pet-management)
- [Clinical Domain](#clinical-domain)
- [Scheduling & Appointments](#scheduling--appointments)
- [Financial Domain](#financial-domain)
- [Inventory & Store](#inventory--store)
- [Laboratory](#laboratory)
- [Hospitalization](#hospitalization)
- [Communications](#communications)
- [Insurance](#insurance)
- [Staff Management](#staff-management)
- [System & Audit](#system--audit)
- [Full Schema Diagram](#full-schema-diagram)

---

## Overview

The Vete database is organized into **12 functional domains** with strict multi-tenant isolation enforced via Row-Level Security (RLS) policies.

### Key Architecture Principles

- **Multi-Tenancy**: Every table has `tenant_id` column
- **RLS Enforcement**: All tables use Row-Level Security
- **Audit Trail**: Soft deletes (`deleted_at`) on most tables
- **Timestamps**: `created_at` / `updated_at` on all tables
- **UUID Primary Keys**: All tables use UUID for primary keys
- **Foreign Key Integrity**: Cascading deletes where appropriate

### Domain Summary

| Domain              | Tables | Key Features                           |
| ------------------- | ------ | -------------------------------------- |
| **Core**            | 3      | Tenants, users, invitations            |
| **Pets**            | 4      | Pet profiles, vaccines, QR tags        |
| **Clinical**        | 20+    | Records, prescriptions, reference data |
| **Scheduling**      | 5+     | Appointments, services, waitlist       |
| **Finance**         | 12+    | Invoices, payments, loyalty            |
| **Inventory**       | 9+     | Products, stock, transactions          |
| **Laboratory**      | 7      | Orders, tests, results                 |
| **Hospitalization** | 8      | Kennels, vitals, treatments            |
| **Communications**  | 6      | Messages, reminders, notifications     |
| **Insurance**       | 5      | Policies, claims, providers            |
| **Staff**           | 5      | Profiles, schedules, time off          |
| **System**          | 8+     | Audit logs, QR tags, lost pets         |

---

## Core Domain

### Diagram

```mermaid
erDiagram
    tenants ||--o{ profiles : "has many"
    tenants ||--o{ clinic_invites : "has many"
    profiles ||--o{ clinic_invites : "invited_by"

    tenants {
        TEXT id PK "Slug (e.g., 'terrapet')"
        TEXT name "Clinic name"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    profiles {
        UUID id PK "Matches auth.users.id"
        TEXT tenant_id FK "Tenant association"
        TEXT email
        TEXT full_name
        TEXT phone
        TEXT avatar_url
        TEXT role "owner, vet, admin"
        TEXT city
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    clinic_invites {
        UUID id PK
        TEXT tenant_id FK
        TEXT email
        TEXT role
        UUID invited_by FK "→ profiles"
        TEXT token
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **tenants** → **profiles**: One-to-many (clinic has staff/owners)
- **profiles** → **clinic_invites**: One-to-many (staff invites others)

---

## Pet Management

### Diagram

```mermaid
erDiagram
    profiles ||--o{ pets : "owns"
    tenants ||--o{ pets : "belongs to"
    pets ||--o{ vaccines : "has"
    pets ||--o{ qr_tags : "tagged with"
    vaccine_templates ||--o{ vaccines : "based on"

    pets {
        UUID id PK
        TEXT tenant_id FK
        UUID owner_id FK "→ profiles"
        TEXT name
        TEXT species "dog, cat, etc."
        TEXT breed
        DATE birth_date
        TEXT sex
        TEXT color
        NUMERIC weight_kg
        TEXT microchip_id
        TEXT photo_url
        TEXT notes
        BOOLEAN is_neutered
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    vaccines {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        TEXT name
        TEXT brand
        TEXT lot_number
        DATE administered_date
        UUID administered_by FK "→ profiles"
        DATE next_due_date
        TEXT status "pending, verified"
        TEXT notes
        TIMESTAMPTZ created_at
    }

    vaccine_templates {
        UUID id PK
        TEXT tenant_id FK "NULL for global"
        TEXT species
        TEXT vaccine_name
        INT dose_number
        INT min_age_weeks
        INT interval_weeks
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }

    qr_tags {
        UUID id PK
        TEXT code "Unique tag code"
        UUID pet_id FK "Nullable"
        TEXT tenant_id FK
        BOOLEAN is_active
        TIMESTAMPTZ assigned_at
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **profiles** → **pets**: One-to-many (owner has multiple pets)
- **pets** → **vaccines**: One-to-many (pet has vaccine history)
- **pets** → **qr_tags**: One-to-many (pet can have multiple tags over time)
- **vaccine_templates** → **vaccines**: One-to-many (template used for scheduling)

---

## Clinical Domain

### Diagram

```mermaid
erDiagram
    pets ||--o{ medical_records : "has"
    profiles ||--o{ medical_records : "created by (vet)"
    medical_records ||--o{ prescriptions : "generates"
    diagnosis_codes ||--o{ medical_records : "used in"
    pets ||--o{ vaccine_reactions : "has"
    vaccines ||--o{ vaccine_reactions : "caused by"
    pets ||--o{ euthanasia_assessments : "assessed"
    pets ||--o{ reproductive_cycles : "tracked"

    medical_records {
        UUID id PK
        UUID pet_id FK
        TEXT tenant_id FK
        UUID vet_id FK "→ profiles"
        DATE visit_date
        TEXT type "consultation, surgery, emergency"
        TEXT chief_complaint
        TEXT history
        JSONB physical_exam
        UUID diagnosis_code FK
        TEXT diagnosis_text
        TEXT treatment
        TEXT notes
        DATE follow_up_date
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    prescriptions {
        UUID id PK
        UUID pet_id FK
        UUID medical_record_id FK
        UUID vet_id FK
        TEXT tenant_id FK
        JSONB medications "Array of drugs"
        TEXT instructions
        DATE valid_until
        TEXT signature_url
        TEXT status "active, filled, expired"
        TIMESTAMPTZ created_at
    }

    diagnosis_codes {
        UUID id PK
        TEXT code "VeNom/SNOMED code"
        TEXT name
        TEXT description
        TEXT category
        TEXT[] species "Applicable species"
        TIMESTAMPTZ created_at
    }

    drug_dosages {
        UUID id PK
        TEXT drug_name
        TEXT species
        TEXT indication
        NUMERIC dose_mg_per_kg
        TEXT route "oral, IV, etc."
        TEXT frequency
        NUMERIC max_dose_mg
        TEXT notes
        TIMESTAMPTZ created_at
    }

    growth_standards {
        UUID id PK
        TEXT species
        TEXT breed_category
        INT age_weeks
        NUMERIC p5_weight "5th percentile"
        NUMERIC p25_weight
        NUMERIC p50_weight "Median"
        NUMERIC p75_weight
        NUMERIC p95_weight
        TIMESTAMPTZ created_at
    }

    vaccine_reactions {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        UUID vaccine_id FK
        TEXT reaction_type
        TEXT severity "mild, moderate, severe"
        TEXT description
        INT onset_hours
        TIMESTAMPTZ resolved_at
        UUID reported_by FK "→ profiles"
        TIMESTAMPTZ created_at
    }

    euthanasia_assessments {
        UUID id PK
        UUID pet_id FK
        UUID assessed_by FK "→ profiles"
        INT hurt_score "0-10"
        INT hunger_score "0-10"
        INT hydration_score "0-10"
        INT hygiene_score "0-10"
        INT happiness_score "0-10"
        INT mobility_score "0-10"
        INT more_good_days_score "0-10"
        INT total_score "Calculated"
        TEXT notes
        TIMESTAMPTZ created_at
    }

    reproductive_cycles {
        UUID id PK
        UUID pet_id FK
        TEXT cycle_type "heat, pregnancy"
        DATE start_date
        DATE end_date
        TEXT notes
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **pets** → **medical_records**: One-to-many
- **medical_records** → **prescriptions**: One-to-many
- **diagnosis_codes** → **medical_records**: One-to-many
- **vaccines** → **vaccine_reactions**: One-to-many

---

## Scheduling & Appointments

### Diagram

```mermaid
erDiagram
    tenants ||--o{ services : "offers"
    tenants ||--o{ appointments : "schedules"
    pets ||--o{ appointments : "has"
    profiles ||--o{ appointments : "owns/performs"
    services ||--o{ appointments : "booked for"
    appointments ||--o{ waitlist : "has waitlist"

    services {
        UUID id PK
        TEXT tenant_id FK
        TEXT code
        TEXT name
        TEXT description
        TEXT category
        NUMERIC base_price
        NUMERIC tax_rate
        INT duration_minutes
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    appointments {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        UUID owner_id FK "→ profiles"
        UUID vet_id FK "→ profiles"
        UUID service_id FK
        TIMESTAMPTZ start_time
        TIMESTAMPTZ end_time
        TEXT status "pending, confirmed, completed, cancelled"
        TEXT notes
        TEXT cancellation_reason
        UUID cancelled_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    waitlist {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        UUID owner_id FK
        UUID service_id FK
        TEXT preferred_dates "JSONB array"
        TEXT status "active, notified, booked"
        TEXT priority "normal, urgent"
        TEXT notes
        TIMESTAMPTZ created_at
        TIMESTAMPTZ notified_at
    }

    recurring_appointments {
        UUID id PK
        UUID parent_appointment_id FK
        TEXT tenant_id FK
        TEXT frequency "daily, weekly, monthly"
        INT interval "Every N weeks"
        DATE end_date
        INT occurrences_count
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **services** → **appointments**: One-to-many
- **pets** → **appointments**: One-to-many
- **profiles** (owner) → **appointments**: One-to-many
- **profiles** (vet) → **appointments**: One-to-many
- **appointments** → **waitlist**: One-to-many (when no slots available)

---

## Financial Domain

### Diagram

```mermaid
erDiagram
    tenants ||--o{ invoices : "issues"
    profiles ||--o{ invoices : "billed to"
    invoices ||--o{ invoice_items : "contains"
    services ||--o{ invoice_items : "billed as"
    store_products ||--o{ invoice_items : "sold in"
    invoices ||--o{ payments : "paid via"
    payment_methods ||--o{ payments : "used for"
    profiles ||--o{ loyalty_points : "earns"
    profiles ||--o{ client_credits : "has"

    invoices {
        UUID id PK
        TEXT tenant_id FK
        TEXT invoice_number
        UUID client_id FK "→ profiles"
        UUID pet_id FK
        DATE invoice_date
        DATE due_date
        NUMERIC subtotal
        NUMERIC tax_amount
        NUMERIC discount_amount
        NUMERIC total
        NUMERIC amount_paid
        NUMERIC balance_due
        TEXT status "draft, sent, paid, overdue"
        TEXT notes
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    invoice_items {
        UUID id PK
        TEXT tenant_id FK
        UUID invoice_id FK
        TEXT item_type "service, product, custom"
        UUID service_id FK "Nullable"
        UUID product_id FK "Nullable"
        TEXT description
        NUMERIC quantity
        NUMERIC unit_price
        NUMERIC subtotal
        NUMERIC tax_amount
        NUMERIC total
        TIMESTAMPTZ created_at
    }

    payments {
        UUID id PK
        TEXT tenant_id FK
        UUID invoice_id FK
        UUID payment_method_id FK
        NUMERIC amount
        TIMESTAMPTZ payment_date
        TEXT reference_number
        TEXT status "completed, refunded, failed"
        UUID received_by FK "→ profiles"
        TEXT notes
        TIMESTAMPTZ created_at
    }

    payment_methods {
        UUID id PK
        TEXT tenant_id FK
        TEXT name "Cash, Card, Bank Transfer"
        TEXT type
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }

    loyalty_points {
        UUID id PK
        TEXT tenant_id FK
        UUID client_id FK "→ profiles"
        INT points_balance
        TIMESTAMPTZ last_updated
    }

    loyalty_transactions {
        UUID id PK
        TEXT tenant_id FK
        UUID client_id FK
        TEXT transaction_type "earn, redeem, expire"
        INT points_amount
        UUID invoice_id FK "Nullable"
        TEXT description
        TIMESTAMPTZ created_at
    }

    client_credits {
        UUID id PK
        TEXT tenant_id FK
        UUID client_id FK
        NUMERIC credit_amount
        TEXT reason
        UUID issued_by FK "→ profiles"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ deleted_at
    }

    refunds {
        UUID id PK
        TEXT tenant_id FK
        UUID payment_id FK
        NUMERIC amount
        TEXT reason
        UUID authorized_by FK
        TIMESTAMPTZ refund_date
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **invoices** → **invoice_items**: One-to-many
- **invoices** → **payments**: One-to-many
- **services** / **store_products** → **invoice_items**: Many-to-one
- **profiles** → **loyalty_points**: One-to-one

---

## Inventory & Store

### Diagram

```mermaid
erDiagram
    tenants ||--o{ store_categories : "has"
    store_categories ||--o{ store_products : "contains"
    store_brands ||--o{ store_products : "manufactures"
    store_products ||--o{ store_inventory : "tracked in"
    store_products ||--o{ store_inventory_transactions : "moved via"
    store_products ||--o{ clinic_product_assignments : "assigned to clinic"
    store_products ||--o{ store_campaigns : "promoted in"
    store_products ||--o{ store_coupons : "discounted via"

    store_categories {
        UUID id PK
        TEXT tenant_id FK
        TEXT name
        TEXT description
        UUID parent_id FK "Self-referencing"
        INT sort_order
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
    }

    store_brands {
        UUID id PK
        TEXT tenant_id FK
        TEXT name
        TEXT description
        TEXT logo_url
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
    }

    store_products {
        UUID id PK
        TEXT tenant_id FK
        UUID category_id FK
        UUID brand_id FK
        TEXT sku
        TEXT name
        TEXT description
        TEXT photo_url
        NUMERIC base_price
        NUMERIC cost_price
        BOOLEAN requires_prescription
        TEXT unit "unit, kg, box"
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ deleted_at
    }

    store_inventory {
        UUID id PK
        UUID product_id FK
        TEXT tenant_id FK
        NUMERIC stock_quantity
        NUMERIC reserved_quantity "In carts"
        NUMERIC reorder_point
        NUMERIC weighted_average_cost "WAC"
        TIMESTAMPTZ last_counted_at
        TIMESTAMPTZ updated_at
    }

    store_inventory_transactions {
        UUID id PK
        TEXT tenant_id FK
        UUID product_id FK
        TEXT type "purchase, sale, adjustment, return"
        NUMERIC quantity "Can be negative"
        NUMERIC unit_cost
        UUID performed_by FK "→ profiles"
        TEXT notes
        TEXT reference_type "order, invoice, adjustment"
        UUID reference_id
        TIMESTAMPTZ created_at
    }

    clinic_product_assignments {
        UUID id PK
        TEXT tenant_id FK
        UUID catalog_product_id FK "Global product"
        NUMERIC sale_price "Override"
        INT min_stock_level
        TEXT location "Storage location"
        BOOLEAN requires_prescription
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    store_campaigns {
        UUID id PK
        TEXT tenant_id FK
        TEXT name
        TEXT description
        DATE start_date
        DATE end_date
        NUMERIC discount_percentage
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
    }

    store_coupons {
        UUID id PK
        TEXT tenant_id FK
        TEXT code "Unique code"
        TEXT discount_type "percentage, fixed"
        NUMERIC discount_value
        NUMERIC min_purchase_amount
        INT max_uses
        INT times_used
        DATE valid_from
        DATE valid_until
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
    }

    inventory_reservations {
        UUID id PK
        TEXT tenant_id FK
        UUID product_id FK
        UUID user_id FK
        NUMERIC quantity
        TEXT reservation_type "cart, checkout"
        TIMESTAMPTZ expires_at
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **store_categories** → **store_products**: One-to-many (hierarchical categories)
- **store_products** → **store_inventory**: One-to-one (per tenant)
- **store_products** → **store_inventory_transactions**: One-to-many
- **store_products** → **clinic_product_assignments**: One-to-many (global catalog)

---

## Laboratory

### Diagram

```mermaid
erDiagram
    tenants ||--o{ lab_test_catalog : "offers"
    lab_test_catalog ||--o{ lab_panels : "grouped in"
    pets ||--o{ lab_orders : "has"
    profiles ||--o{ lab_orders : "ordered by"
    lab_orders ||--o{ lab_order_items : "contains"
    lab_test_catalog ||--o{ lab_order_items : "performed as"
    lab_order_items ||--o{ lab_results : "produces"
    lab_results ||--o{ lab_result_comments : "commented on"

    lab_test_catalog {
        UUID id PK
        TEXT tenant_id FK
        TEXT code
        TEXT name
        TEXT category
        TEXT specimen_type "blood, urine, etc."
        NUMERIC price
        TEXT reference_range
        TEXT units
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }

    lab_panels {
        UUID id PK
        TEXT tenant_id FK
        TEXT name
        TEXT description
        UUID[] test_ids "Array of test IDs"
        NUMERIC panel_price
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }

    lab_orders {
        UUID id PK
        TEXT tenant_id FK
        TEXT order_number
        UUID pet_id FK
        UUID ordered_by FK "→ profiles (vet)"
        TIMESTAMPTZ ordered_at
        TEXT status "ordered, in_progress, completed, cancelled"
        TEXT priority "routine, urgent, stat"
        TEXT lab_type "in_house, external"
        TEXT fasting_status
        TEXT clinical_notes
        BOOLEAN has_critical_values
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    lab_order_items {
        UUID id PK
        UUID order_id FK
        UUID test_id FK "→ lab_test_catalog"
        TEXT status "pending, completed"
        TIMESTAMPTZ created_at
    }

    lab_results {
        UUID id PK
        UUID order_item_id FK
        TEXT result_value
        TEXT result_unit
        TEXT reference_range
        TEXT interpretation "normal, abnormal, critical"
        TEXT notes
        UUID entered_by FK "→ profiles"
        TIMESTAMPTZ result_date
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    lab_result_attachments {
        UUID id PK
        UUID result_id FK
        TEXT file_name
        TEXT file_url
        TEXT file_type
        TIMESTAMPTZ uploaded_at
    }

    lab_result_comments {
        UUID id PK
        UUID result_id FK
        UUID commented_by FK "→ profiles"
        TEXT comment_text
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **lab_test_catalog** → **lab_panels**: Many-to-many (tests grouped in panels)
- **lab_orders** → **lab_order_items**: One-to-many
- **lab_order_items** → **lab_results**: One-to-one

---

## Hospitalization

### Diagram

```mermaid
erDiagram
    tenants ||--o{ kennels : "has"
    pets ||--o{ hospitalizations : "admitted to"
    kennels ||--o{ hospitalizations : "occupied by"
    hospitalizations ||--o{ hospitalization_vitals : "monitored via"
    hospitalizations ||--o{ hospitalization_medications : "treated with"
    hospitalizations ||--o{ hospitalization_treatments : "receives"
    hospitalizations ||--o{ hospitalization_feedings : "fed with"
    hospitalizations ||--o{ hospitalization_notes : "documented in"

    kennels {
        UUID id PK
        TEXT tenant_id FK
        TEXT kennel_number
        TEXT size "small, medium, large"
        TEXT type "isolation, ICU, standard"
        TEXT status "available, occupied, maintenance"
        TEXT location
        TEXT notes
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ deleted_at
    }

    hospitalizations {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        UUID kennel_id FK
        UUID admitted_by FK "→ profiles"
        TIMESTAMPTZ admitted_at
        TIMESTAMPTZ discharged_at
        TEXT status "active, discharged, transferred"
        TEXT reason "surgery, observation, treatment"
        TEXT discharge_notes
        UUID discharged_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    hospitalization_vitals {
        UUID id PK
        TEXT tenant_id FK
        UUID hospitalization_id FK
        NUMERIC temperature
        NUMERIC heart_rate
        NUMERIC respiratory_rate
        NUMERIC weight_kg
        TEXT attitude
        TEXT notes
        UUID recorded_by FK "→ profiles"
        TIMESTAMPTZ recorded_at
        TIMESTAMPTZ created_at
    }

    hospitalization_medications {
        UUID id PK
        TEXT tenant_id FK
        UUID hospitalization_id FK
        TEXT medication_name
        TEXT dosage
        TEXT route
        TEXT frequency
        TIMESTAMPTZ next_due
        UUID administered_by FK
        TIMESTAMPTZ administered_at
        TEXT notes
        TIMESTAMPTZ created_at
    }

    hospitalization_treatments {
        UUID id PK
        TEXT tenant_id FK
        UUID hospitalization_id FK
        TEXT treatment_type "IV fluids, wound care, etc."
        TEXT description
        UUID performed_by FK
        TIMESTAMPTZ performed_at
        TEXT notes
        TIMESTAMPTZ created_at
    }

    hospitalization_feedings {
        UUID id PK
        TEXT tenant_id FK
        UUID hospitalization_id FK
        TEXT food_type
        NUMERIC amount
        TEXT unit "g, ml, etc."
        BOOLEAN consumed
        UUID fed_by FK
        TIMESTAMPTZ fed_at
        TEXT notes
        TIMESTAMPTZ created_at
    }

    hospitalization_notes {
        UUID id PK
        TEXT tenant_id FK
        UUID hospitalization_id FK
        TEXT note_type "observation, treatment, discharge"
        TEXT content
        UUID created_by FK
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **kennels** → **hospitalizations**: One-to-many
- **hospitalizations** → **vitals/medications/treatments/feedings/notes**: One-to-many

---

## Communications

### Diagram

```mermaid
erDiagram
    tenants ||--o{ conversations : "has"
    profiles ||--o{ conversations : "participant"
    conversations ||--o{ messages : "contains"
    profiles ||--o{ messages : "sent by"
    tenants ||--o{ message_templates : "uses"
    tenants ||--o{ reminders : "schedules"
    pets ||--o{ reminders : "for"
    tenants ||--o{ notification_queue : "sends"

    conversations {
        UUID id PK
        TEXT tenant_id FK
        UUID owner_id FK "→ profiles"
        UUID vet_id FK "→ profiles"
        TEXT subject
        TEXT status "active, closed"
        TIMESTAMPTZ last_message_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ deleted_at
    }

    messages {
        UUID id PK
        UUID conversation_id FK
        UUID sender_id FK "→ profiles"
        TEXT content
        BOOLEAN is_read
        TIMESTAMPTZ read_at
        TEXT attachment_url
        TIMESTAMPTZ created_at
    }

    message_templates {
        UUID id PK
        TEXT tenant_id FK "NULL for global"
        TEXT name
        TEXT category "appointment, reminder, marketing"
        TEXT subject
        TEXT body "Template with placeholders"
        TEXT channel "sms, email, whatsapp"
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
    }

    reminders {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        TEXT reminder_type "vaccine, appointment, medication"
        TEXT message
        DATE scheduled_date
        TEXT status "pending, sent, failed"
        TEXT channel "sms, email, whatsapp"
        TIMESTAMPTZ sent_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ deleted_at
    }

    notification_queue {
        UUID id PK
        TEXT tenant_id FK
        UUID user_id FK "→ profiles"
        TEXT notification_type
        TEXT title
        TEXT message
        TEXT channel "in_app, email, sms"
        TEXT status "pending, sent, failed"
        TIMESTAMPTZ scheduled_for
        TIMESTAMPTZ sent_at
        INT retry_count
        TIMESTAMPTZ created_at
    }

    communication_preferences {
        UUID id PK
        UUID user_id FK "→ profiles"
        BOOLEAN email_enabled
        BOOLEAN sms_enabled
        BOOLEAN whatsapp_enabled
        BOOLEAN marketing_consent
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
```

### Key Relationships

- **conversations** → **messages**: One-to-many
- **profiles** → **conversations**: Many-to-many (owner-vet)
- **message_templates** → **reminders**: Many-to-one (template used)

---

## Insurance

### Diagram

```mermaid
erDiagram
    tenants ||--o{ insurance_providers : "works with"
    pets ||--o{ insurance_policies : "covered by"
    insurance_providers ||--o{ insurance_policies : "issued by"
    insurance_policies ||--o{ insurance_claims : "filed against"
    insurance_claims ||--o{ insurance_claim_items : "contains"
    insurance_claims ||--o{ insurance_claim_documents : "attached to"

    insurance_providers {
        UUID id PK
        TEXT tenant_id FK
        TEXT name
        TEXT contact_email
        TEXT contact_phone
        TEXT website
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    insurance_policies {
        UUID id PK
        UUID pet_id FK
        UUID provider_id FK
        TEXT policy_number
        TEXT policy_type "comprehensive, accident, wellness"
        DATE effective_date
        DATE expiration_date
        NUMERIC coverage_limit
        NUMERIC deductible
        NUMERIC reimbursement_rate
        TEXT status "active, expired, cancelled"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    insurance_claims {
        UUID id PK
        UUID policy_id FK
        TEXT claim_number
        UUID pet_id FK
        DATE claim_date
        DATE incident_date
        TEXT incident_description
        NUMERIC claimed_amount
        NUMERIC approved_amount
        TEXT status "submitted, under_review, approved, denied, paid"
        TEXT denial_reason
        UUID submitted_by FK "→ profiles"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    insurance_claim_items {
        UUID id PK
        UUID claim_id FK
        TEXT item_type "service, medication, procedure"
        TEXT description
        NUMERIC amount
        UUID invoice_id FK "Nullable"
        TIMESTAMPTZ created_at
    }

    insurance_claim_documents {
        UUID id PK
        UUID claim_id FK
        TEXT document_type "invoice, medical_record, receipt"
        TEXT file_name
        TEXT file_url
        TIMESTAMPTZ uploaded_at
    }
```

### Key Relationships

- **insurance_policies** → **insurance_claims**: One-to-many
- **insurance_claims** → **insurance_claim_items**: One-to-many
- **pets** → **insurance_policies**: One-to-many

---

## Staff Management

### Diagram

```mermaid
erDiagram
    profiles ||--o{ staff_profiles : "extended by"
    staff_profiles ||--o{ staff_schedules : "has"
    staff_schedules ||--o{ staff_schedule_entries : "contains"
    staff_profiles ||--o{ staff_time_off : "requests"
    time_off_types ||--o{ staff_time_off : "categorizes"

    staff_profiles {
        UUID id PK
        UUID profile_id FK "→ profiles"
        TEXT tenant_id FK
        TEXT specialization "surgeon, internist, etc."
        TEXT license_number
        DATE hire_date
        NUMERIC salary
        TEXT employment_type "full_time, part_time"
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    staff_schedules {
        UUID id PK
        UUID staff_id FK
        TEXT tenant_id FK
        TEXT schedule_type "weekly, custom"
        DATE effective_from
        DATE effective_until
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    staff_schedule_entries {
        UUID id PK
        UUID schedule_id FK
        TEXT day_of_week "monday, tuesday, etc."
        TIME start_time
        TIME end_time
        BOOLEAN is_available
        TIMESTAMPTZ created_at
    }

    time_off_types {
        UUID id PK
        TEXT tenant_id FK
        TEXT name "vacation, sick, personal"
        INT annual_days
        BOOLEAN requires_approval
        TIMESTAMPTZ created_at
    }

    staff_time_off {
        UUID id PK
        UUID staff_id FK
        TEXT tenant_id FK
        UUID type_id FK "→ time_off_types"
        DATE start_date
        DATE end_date
        TEXT reason
        TEXT status "pending, approved, denied"
        UUID approved_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
```

### Key Relationships

- **profiles** → **staff_profiles**: One-to-one (staff extension)
- **staff_profiles** → **staff_schedules**: One-to-many
- **staff_schedules** → **staff_schedule_entries**: One-to-many

---

## System & Audit

### Diagram

```mermaid
erDiagram
    tenants ||--o{ audit_logs : "generates"
    profiles ||--o{ audit_logs : "performed by"
    tenants ||--o{ notifications : "receives"
    profiles ||--o{ notifications : "sent to"
    pets ||--o{ lost_pets : "reported"
    lost_pets ||--o{ sightings : "has"
    pets ||--o{ disease_reports : "diagnosed with"

    audit_logs {
        UUID id PK
        TEXT tenant_id FK
        UUID user_id FK "→ profiles"
        TEXT action "create, update, delete"
        TEXT table_name
        UUID record_id
        JSONB old_data
        JSONB new_data
        TEXT ip_address
        TEXT user_agent
        TIMESTAMPTZ created_at
    }

    notifications {
        UUID id PK
        TEXT tenant_id FK
        UUID user_id FK
        TEXT type "appointment, invoice, reminder"
        TEXT title
        TEXT message
        TEXT link_url
        BOOLEAN is_read
        TIMESTAMPTZ read_at
        TIMESTAMPTZ created_at
    }

    lost_pets {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        UUID reported_by FK "→ profiles"
        DATE lost_date
        TEXT last_seen_location
        TEXT description
        TEXT photo_url
        TEXT status "lost, found, closed"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    sightings {
        UUID id PK
        UUID lost_pet_id FK
        TEXT location
        TEXT description
        UUID reported_by FK
        TIMESTAMPTZ sighting_date
        TIMESTAMPTZ created_at
    }

    disease_reports {
        UUID id PK
        TEXT tenant_id FK
        UUID pet_id FK
        UUID diagnosis_code FK
        TEXT disease_name
        DATE diagnosis_date
        TEXT severity
        TEXT treatment_outcome
        BOOLEAN is_notifiable "Public health reporting"
        TIMESTAMPTZ created_at
    }
```

### Key Relationships

- **audit_logs**: Tracks all data changes (generic)
- **lost_pets** → **sightings**: One-to-many
- **pets** → **disease_reports**: One-to-many

---

## Full Schema Diagram

### Comprehensive Overview (Simplified)

```mermaid
erDiagram
    %% CORE DOMAIN
    tenants ||--o{ profiles : "has"
    tenants ||--o{ clinic_invites : "has"

    %% PET MANAGEMENT
    profiles ||--o{ pets : "owns"
    pets ||--o{ vaccines : "has"
    pets ||--o{ qr_tags : "tagged"

    %% CLINICAL
    pets ||--o{ medical_records : "has"
    medical_records ||--o{ prescriptions : "generates"
    pets ||--o{ vaccine_reactions : "has"
    pets ||--o{ euthanasia_assessments : "assessed"

    %% SCHEDULING
    tenants ||--o{ services : "offers"
    tenants ||--o{ appointments : "schedules"
    pets ||--o{ appointments : "has"
    services ||--o{ appointments : "booked"

    %% FINANCE
    tenants ||--o{ invoices : "issues"
    invoices ||--o{ invoice_items : "contains"
    invoices ||--o{ payments : "paid"
    profiles ||--o{ loyalty_points : "earns"

    %% INVENTORY
    tenants ||--o{ store_products : "sells"
    store_products ||--o{ store_inventory : "tracked"
    store_products ||--o{ store_inventory_transactions : "moved"

    %% LABORATORY
    tenants ||--o{ lab_orders : "orders"
    pets ||--o{ lab_orders : "tested"
    lab_orders ||--o{ lab_order_items : "contains"
    lab_order_items ||--o{ lab_results : "produces"

    %% HOSPITALIZATION
    tenants ||--o{ kennels : "has"
    pets ||--o{ hospitalizations : "admitted"
    kennels ||--o{ hospitalizations : "occupies"
    hospitalizations ||--o{ hospitalization_vitals : "monitored"

    %% COMMUNICATIONS
    tenants ||--o{ conversations : "has"
    conversations ||--o{ messages : "contains"
    tenants ||--o{ reminders : "sends"

    %% INSURANCE
    pets ||--o{ insurance_policies : "covered"
    insurance_policies ||--o{ insurance_claims : "filed"

    %% STAFF
    profiles ||--o{ staff_profiles : "extends"
    staff_profiles ||--o{ staff_schedules : "has"

    %% SYSTEM
    tenants ||--o{ audit_logs : "generates"
    tenants ||--o{ notifications : "sends"
    pets ||--o{ lost_pets : "reported"
```

---

## Database Statistics

### Table Count by Domain

| Domain          | Table Count | Notes                               |
| --------------- | ----------- | ----------------------------------- |
| Core            | 3           | Minimal, focused                    |
| Pets            | 4           | Pet profiles + vaccines             |
| Clinical        | 20+         | Extensive medical tracking          |
| Scheduling      | 5           | Appointments + recurring + waitlist |
| Finance         | 12          | Full invoicing + loyalty            |
| Inventory       | 9+          | Dual-unit tracking, reservations    |
| Laboratory      | 7           | Orders, results, panels             |
| Hospitalization | 8           | Kennels + monitoring                |
| Communications  | 6           | Messages + reminders                |
| Insurance       | 5           | Policies + claims                   |
| Staff           | 5           | Profiles + schedules                |
| System          | 8+          | Audit + notifications               |
| **TOTAL**       | **100+**    | Complete clinic management          |

### Relationship Patterns

- **Multi-tenancy**: ALL tables have `tenant_id` foreign key to `tenants.id`
- **Ownership**: Most entities link to `profiles` (user who created/owns)
- **Pet-Centric**: 30+ tables reference `pets.id` directly
- **Soft Deletes**: 60+ tables have `deleted_at` column
- **Audit Trail**: `created_at` / `updated_at` on all tables
- **Status Fields**: 40+ tables use status enums for workflow tracking

---

## Foreign Key Constraints

### Key Cascading Rules

| Constraint                    | Action on Delete | Rationale                          |
| ----------------------------- | ---------------- | ---------------------------------- |
| `tenant_id → tenants`         | **RESTRICT**     | Prevent accidental tenant deletion |
| `pet_id → pets`               | **CASCADE**      | Remove all pet data if pet deleted |
| `profile_id → profiles`       | **SET NULL**     | Preserve data, anonymize user      |
| `invoice_id → invoices`       | **RESTRICT**     | Prevent financial data loss        |
| `product_id → store_products` | **RESTRICT**     | Maintain inventory history         |

---

## Indexes

### Performance-Critical Indexes

```sql
-- Multi-tenant isolation (on EVERY table)
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);

-- Common query patterns
CREATE INDEX idx_appointments_tenant_date ON appointments(tenant_id, start_time);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_pets_owner ON pets(owner_id, tenant_id);
CREATE INDEX idx_medical_records_pet_date ON medical_records(pet_id, visit_date DESC);

-- Partial indexes for active records
CREATE INDEX idx_products_active ON store_products(tenant_id, category_id)
WHERE is_active = TRUE AND deleted_at IS NULL;

-- Composite indexes for dashboards
CREATE INDEX idx_appointments_tenant_status_start
ON appointments(tenant_id, status, start_time);
```

---

## Row-Level Security (RLS)

### Policy Patterns

Every table has RLS policies enforcing:

1. **Tenant Isolation**: `tenant_id = get_user_tenant()`
2. **Role-Based Access**:
   - `owner`: Own pets only
   - `vet`: All pets in clinic
   - `admin`: Everything in clinic
3. **Service Role Bypass**: Backend operations use service role

### Example Policy

```sql
-- Staff can manage all pets in their clinic
CREATE POLICY "Staff manage pets" ON pets
    FOR ALL TO authenticated
    USING (is_staff_of(tenant_id));

-- Owners can only view their own pets
CREATE POLICY "Owners view own pets" ON pets
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid());
```

---

## Views & Functions

### Materialized Views

- **unified_clinic_inventory**: Combines own products + catalog products
- **clinic_stats**: Dashboard metrics (appointments, revenue, pets)

### Key Functions

| Function                                   | Purpose                            |
| ------------------------------------------ | ---------------------------------- |
| `is_staff_of(tenant_id)`                   | Check if user is staff/admin       |
| `get_user_tenant()`                        | Get current user's tenant          |
| `generate_sequence_number(prefix, tenant)` | Invoice/order numbering            |
| `adjust_inventory_atomic(...)`             | Transaction-safe inventory updates |
| `create_lab_order_atomic(...)`             | Atomic lab order creation          |
| `process_checkout_atomic(...)`             | Atomic checkout processing         |

---

## Migration Strategy

### Sequential Migrations

**94 migrations** applied in order:

1. `001_add_tenant_id_to_child_tables.sql`
2. `002_add_missing_foreign_keys.sql`
3. ...
4. `094_performance_metrics_history.sql`

### Idempotency Patterns

See `web/docs/MIGRATION_IDEMPOTENCY.md` for:

- `IF NOT EXISTS` patterns
- `CREATE OR REPLACE` for functions
- `DROP IF EXISTS` for triggers
- `DO $$ ... EXCEPTION` for constraints

---

## References

- **Schema Reference**: `documentation/database/schema-reference.md`
- **RLS Policies**: `documentation/database/rls-policies.md`
- **Migration Guide**: `web/docs/MIGRATION_IDEMPOTENCY.md`
- **Database README**: `web/db/README.md`

---

_Last updated: January 2026_
_Generated from: 94 migrations, 100+ tables, 12 domains_
