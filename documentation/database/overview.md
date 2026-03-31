# Database Overview

Vete uses **Supabase** (PostgreSQL) as its database with Row-Level Security (RLS) for multi-tenant data isolation.

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE PROJECT                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL                            │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │   Core      │  │   Medical   │  │    Business     │   │   │
│  │  │  Tables     │  │   Tables    │  │    Tables       │   │   │
│  │  │             │  │             │  │                 │   │   │
│  │  │  tenants    │  │  pets       │  │  appointments   │   │   │
│  │  │  profiles   │  │  vaccines   │  │  invoices       │   │   │
│  │  │  invites    │  │  records    │  │  inventory      │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │  Clinical   │  │   Comms     │  │    Safety       │   │   │
│  │  │  Reference  │  │             │  │                 │   │   │
│  │  │             │  │             │  │                 │   │   │
│  │  │  diagnoses  │  │  messages   │  │  lost_pets      │   │   │
│  │  │  drugs      │  │  reminders  │  │  qr_tags        │   │   │
│  │  │  growth     │  │  campaigns  │  │  audit_logs     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  │                                                           │   │
│  │  ═══════════════════════════════════════════════════════ │   │
│  │              Row-Level Security (RLS)                     │   │
│  │         Tenant isolation via is_staff_of()                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   Supabase      │  │    Supabase     │                       │
│  │   Auth          │  │    Storage      │                       │
│  │                 │  │                 │                       │
│  │   - Email/Pass  │  │   - Pet photos  │                       │
│  │   - OAuth       │  │   - Documents   │                       │
│  │   - JWT tokens  │  │   - Signatures  │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

## Schema Categories

### Core Tables

| Table | Purpose |
|-------|---------|
| `tenants` | Clinic/tenant registry |
| `profiles` | User profiles (extends auth.users) |
| `clinic_invites` | Staff invitation system |

### Pet Management

| Table | Purpose |
|-------|---------|
| `pets` | Pet profiles |
| `vaccines` | Vaccination records |
| `vaccine_templates` | Default vaccine schedules |
| `vaccine_reactions` | Adverse reaction tracking |
| `qr_tags` | Physical QR tag management |
| `clinic_patient_access` | Cross-clinic access |

### Medical Records

| Table | Purpose |
|-------|---------|
| `medical_records` | Consultations, exams, surgeries |
| `prescriptions` | Digital prescriptions |
| `voice_notes` | Audio dictation |
| `dicom_images` | Medical imaging |

### Clinical Reference

| Table | Purpose |
|-------|---------|
| `diagnosis_codes` | VeNom/SNOMED codes |
| `drug_dosages` | Dosing reference |
| `growth_standards` | Weight percentiles |
| `reproductive_cycles` | Breeding management |
| `euthanasia_assessments` | QoL assessments |

### Business Operations

| Table | Purpose |
|-------|---------|
| `appointments` | Scheduling |
| `services` | Service catalog |
| `invoices` | Invoice headers |
| `invoice_items` | Line items |
| `payments` | Payment records |
| `payment_methods` | Payment options |
| `refunds` | Refund tracking |
| `client_credits` | Store credit |
| `expenses` | Clinic expenses |
| `loyalty_points` | Points balance |
| `loyalty_transactions` | Points ledger |

### Inventory

| Table | Purpose |
|-------|---------|
| `store_categories` | Product categories |
| `store_products` | Product catalog |
| `store_inventory` | Stock levels |
| `store_inventory_transactions` | Stock movements |
| `store_campaigns` | Promotions |
| `store_price_history` | Price audit |

### Hospitalization

| Table | Purpose |
|-------|---------|
| `kennels` | Cage/kennel management |
| `hospitalizations` | Admission records |
| `hospitalization_vitals` | Vitals monitoring |
| `hospitalization_treatments` | Treatment schedule |
| `hospitalization_feedings` | Feeding log |
| `kennel_transfers` | Transfer history |
| `hospitalization_visits` | Visitor log |
| `hospitalization_documents` | Related documents |

### Communication

| Table | Purpose |
|-------|---------|
| `conversations` | Message threads |
| `messages` | Individual messages |
| `message_templates` | Message templates |
| `notification_channels` | Channel config |
| `notification_preferences` | User prefs |
| `reminders` | Scheduled reminders |
| `notification_queue` | Send queue |
| `notification_log` | Delivery log |
| `broadcast_campaigns` | Mass messaging |

### Safety & Audit

| Table | Purpose |
|-------|---------|
| `pet_qr_codes` | QR code metadata |
| `lost_pets` | Lost & found registry |
| `disease_reports` | Epidemiology data |
| `audit_logs` | Security audit trail |

## Migration Files

Migrations are located in `web/db/` and should be run in order:

```
db/
├── 00_cleanup.sql              # Reset (dev only)
├── 01_extensions.sql           # pgcrypto, etc.
├── 02_schema_core.sql          # tenants, profiles
├── 03_schema_pets.sql          # pets, vaccines
├── 04_schema_medical.sql       # records, prescriptions
├── 05_schema_clinical.sql      # diagnoses, drugs
├── 06_schema_appointments.sql  # scheduling
├── 07_schema_inventory.sql     # products, stock
├── 08_schema_finance.sql       # expenses, loyalty
├── 09_schema_safety.sql        # QR, lost pets
├── 10_schema_epidemiology.sql  # disease reports
├── 11_indexes.sql              # Performance indexes
├── 12_functions.sql            # Utility functions
├── 13_triggers.sql             # Automated triggers
├── 14_rls_policies.sql         # Row-Level Security
├── 15_rpcs.sql                 # RPC functions
├── 16_storage.sql              # Storage buckets
├── 17_realtime.sql             # Realtime config
├── 20_seed_data.sql            # Initial data
├── 21_schema_invoicing.sql     # Full invoicing
├── 22_schema_reminders.sql     # Notification system
├── 23_schema_hospitalization.sql
├── 24_schema_lab_results.sql
├── 25_schema_consent.sql
├── 26_schema_staff.sql
├── 27_schema_messaging.sql
├── 28_schema_insurance.sql
├── 29_soft_deletes.sql
├── 30_enhanced_audit.sql
├── 31_materialized_views.sql
└── 32_scheduled_jobs.sql
```

## Key Database Functions

### `is_staff_of(tenant_id)`

Checks if current user is staff (vet/admin) of a tenant:

```sql
CREATE FUNCTION is_staff_of(in_tenant_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND tenant_id = in_tenant_id
        AND role IN ('vet', 'admin')
    );
$$ LANGUAGE sql SECURITY DEFINER;
```

### `handle_new_user()`

Trigger function that creates profile on signup:

```sql
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for invite
    -- Create profile with appropriate role/tenant
    -- Clean up used invite
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `process_inventory_transaction()`

Updates stock and weighted average cost:

```sql
CREATE FUNCTION process_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Get current stock and WAC
    -- Calculate new values
    -- Update inventory record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Row-Level Security

Every table has RLS enabled with policies for:

1. **Owner access** - Users see their own data
2. **Staff access** - Vets/admins see tenant data
3. **Cross-tenant protection** - No data leaks

Example policies:

```sql
-- Pets: Owners see their own, staff see all in tenant
CREATE POLICY "Owners see own pets"
ON pets FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Staff see tenant pets"
ON pets FOR SELECT
USING (is_staff_of(tenant_id));

CREATE POLICY "Staff manage pets"
ON pets FOR ALL
USING (is_staff_of(tenant_id));
```

## Related Documentation

- [Schema Reference](schema-reference.md) - Complete table documentation
- [RLS Policies](rls-policies.md) - Security policy details
- [Migrations Guide](migrations.md) - Running migrations
- [Functions Reference](functions.md) - All database functions
