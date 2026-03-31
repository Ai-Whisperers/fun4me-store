# Database Schema v2

A modular, self-contained database schema for the Vete veterinary platform.

## Key Improvements Over v1

| Issue in v1                                             | Solution in v2                                  |
| ------------------------------------------------------- | ----------------------------------------------- |
| "Fix" files scattered throughout (80, 85, 88, 100, 101) | No fix files - everything correct from start    |
| Tables, RLS, indexes, triggers in separate files        | Self-contained modules with everything together |
| Duplicate files (31 & 57 both for materialized views)   | Single source of truth for each feature         |
| Inconsistent numbering with gaps                        | Clear, logical numbering by domain              |
| Missing soft deletes added via patches                  | Soft delete built in from the start             |
| Monolithic files (1700+ lines)                          | Modular files (50-200 lines each)               |
| Poor dependency management                              | Clear domain separation                         |

## Directory Structure

```
v2/
├── 00_cleanup.sql              # Drop all tables/functions (for reset)
├── 01_extensions.sql           # PostgreSQL extensions
├── 02_functions/
│   ├── 02_core_functions.sql   # Core utility functions
│   └── 03_helper_functions.sql # Business logic helpers
├── 10_core/
│   ├── 10_tenants.sql          # Multi-tenant foundation
│   ├── 11_profiles.sql         # User profiles
│   └── 12_invites.sql          # Clinic invitations
├── 20_pets/
│   ├── 20_pets.sql             # Pet profiles
│   └── 21_vaccines.sql         # Vaccination records
├── 30_clinical/
│   ├── 30_reference_data.sql   # Diagnosis codes, drug dosages, growth standards
│   ├── 31_lab.sql              # Laboratory orders and results
│   ├── 32_hospitalization.sql  # Kennels, hospitalizations, vitals
│   └── 33_medical_records.sql  # Medical records, prescriptions, consent
├── 40_scheduling/
│   ├── 40_services.sql         # Service catalog
│   └── 41_appointments.sql     # Appointment booking
├── 50_finance/
│   ├── 50_invoicing.sql        # Invoices, payments, refunds
│   └── 51_expenses.sql         # Expenses, loyalty points
├── 60_store/
│   ├── suppliers/
│   │   └── 01_suppliers.sql           # B2B suppliers management
│   ├── categories/
│   │   └── 01_categories.sql          # Product categories hierarchy
│   ├── brands/
│   │   └── 01_brands.sql              # Product brands management
│   ├── products/
│   │   └── 01_products.sql            # Product catalog with dual-unit inventory
│   ├── inventory/
│   │   └── 01_inventory.sql           # Stock management and transactions
│   ├── orders/
│   │   └── 01_orders.sql              # Order management, payments, coupons
│   ├── reviews/
│   │   └── 01_reviews.sql             # Product reviews and wishlists
│   ├── procurement/
│   │   └── 01_procurement.sql         # B2B market intelligence
│   └── 02_import_rpc.sql              # Import utilities
├── 70_communications/
│   └── 70_messaging.sql        # Conversations, messages, reminders
├── 80_insurance/
│   └── 80_insurance.sql        # Insurance providers, policies, claims
├── 85_system/
│   ├── 85_staff.sql            # Staff profiles, schedules, time off
│   └── 86_audit.sql            # Audit logs, notifications, QR tags
├── 90_infrastructure/
│   ├── 90_storage.sql          # Supabase Storage buckets
│   ├── 91_realtime.sql         # Realtime subscriptions
│   └── 92_views.sql            # Dashboard views and stats
├── 95_seeds/
│   ├── 95_seed_services.sql    # Service catalog
│   ├── 96_seed_store.sql       # Products and inventory
│   └── 97_seed_demo_data.sql   # Reference data and demo content
├── run-migrations.sql          # psql script to run all
└── setup-db.mjs                # Node.js runner script
```

## Module Template

Each SQL file follows this structure:

```sql
-- =============================================================================
-- XX_MODULE_NAME.SQL
-- =============================================================================
-- Description of what this module provides.
--
-- Dependencies: list of required modules
-- =============================================================================

-- A. TABLE DEFINITIONS
-- B. ROW LEVEL SECURITY
-- C. INDEXES
-- D. TRIGGERS
-- E. FUNCTIONS
-- F. SEED DATA (if any)
```

## Running Migrations

### Option 1: Using psql (Recommended)

```bash
cd web/db/v2
psql $DATABASE_URL -f run-migrations.sql
```

### Option 2: Using Node.js Script

```bash
cd web/db/v2

# Run all migrations
node setup-db.mjs

# Reset and run (DELETES ALL DATA)
node setup-db.mjs --reset

# Dry run (see what would execute)
node setup-db.mjs --dry-run
```

### Option 3: Via Supabase Dashboard

Copy each file's contents into the SQL Editor and run in order.

## Table Summary

### Core (10_core/) - 3 tables

- `tenants` - Clinic/organization records
- `profiles` - User profiles extending auth.users
- `clinic_invites` - Invitation system

### Pets (20_pets/) - 4 tables

- `pets` - Pet profiles
- `vaccine_templates` - Vaccine reference data
- `vaccines` - Vaccination records
- `vaccine_reactions` - Adverse reaction tracking

### Clinical (30_clinical/) - 20 tables

- Reference: `diagnosis_codes`, `drug_dosages`, `growth_standards`, `reproductive_cycles`, `euthanasia_assessments`
- Lab: `lab_test_catalog`, `lab_panels`, `lab_orders`, `lab_order_items`, `lab_results`, `lab_result_attachments`, `lab_result_comments`
- Hospital: `kennels`, `hospitalizations`, `hospitalization_vitals`, `hospitalization_medications`, `hospitalization_treatments`, `hospitalization_feedings`, `hospitalization_notes`
- Medical: `medical_records`, `prescriptions`, `consent_templates`, `consent_documents`

### Scheduling (40_scheduling/) - 2 tables

- `services` - Service catalog with pricing
- `appointments` - Appointment bookings

### Finance (50_finance/) - 12 tables

- `payment_methods`, `invoices`, `invoice_items`, `payments`, `refunds`, `client_credits`
- `expenses`, `expense_categories`, `loyalty_points`, `loyalty_transactions`, `loyalty_rules`

### Store (60_store/) - 9 tables

- `store_categories`, `store_brands`, `store_products`, `store_inventory`, `store_inventory_transactions`
- `store_campaigns`, `store_campaign_items`, `store_coupons`, `store_price_history`

### Communications (70_communications/) - 6 tables

- `conversations`, `messages`, `message_templates`
- `reminders`, `notification_queue`, `communication_preferences`

### Insurance (80_insurance/) - 5 tables

- `insurance_providers`, `insurance_policies`, `insurance_claims`, `insurance_claim_items`, `insurance_claim_documents`

### System (85_system/) - 8 tables

- `staff_profiles`, `staff_schedules`, `staff_schedule_entries`, `time_off_types`, `staff_time_off`
- `audit_logs`, `notifications`, `qr_tags`, `qr_tag_scans`, `lost_pets`, `disease_reports`

## Security

All tables use Row Level Security (RLS) with these patterns:

1. **Tenant Isolation**: Staff can only access data for their tenant
2. **Owner Access**: Pet owners can view their own pets' data
3. **Staff Elevation**: `is_staff_of(tenant_id)` grants broader access
4. **Service Role**: Full access for backend operations

## Key Functions

| Function                                   | Purpose                          |
| ------------------------------------------ | -------------------------------- |
| `handle_updated_at()`                      | Auto-update timestamps           |
| `is_staff_of(tenant_id)`                   | Check if user is staff in tenant |
| `is_owner_of_pet(pet_id)`                  | Check if user owns the pet       |
| `get_user_tenant()`                        | Get current user's tenant_id     |
| `get_user_role()`                          | Get current user's role          |
| `soft_delete(table, id)`                   | Soft delete helper               |
| `generate_sequence_number(prefix, tenant)` | Generate numbered sequences      |
| `get_pet_by_tag(code)`                     | Public QR tag lookup             |
| `search_pets(tenant, query)`               | Staff pet search                 |
| `validate_coupon(tenant, code)`            | Coupon validation                |
| `get_available_slots(tenant, date)`        | Appointment slot finder          |
| `get_clinic_stats(tenant)`                 | Dashboard statistics             |

## Storage Buckets

| Bucket          | Public | Purpose                |
| --------------- | ------ | ---------------------- |
| `pets`          | Yes    | Pet photos             |
| `vaccines`      | Yes    | Vaccine certificates   |
| `records`       | Yes    | Medical attachments    |
| `prescriptions` | Yes    | Prescription PDFs      |
| `invoices`      | Yes    | Invoice PDFs           |
| `lab`           | Yes    | Lab result attachments |
| `consents`      | Yes    | Consent documents      |
| `store`         | Yes    | Product images         |
| `receipts`      | No     | Expense receipts       |
| `qr-codes`      | Yes    | QR code images         |
| `signatures`    | Yes    | Digital signatures     |

## Resetting the Database

⚠️ **WARNING**: This deletes ALL data!

```bash
cd web/db/v2
psql $DATABASE_URL -f 00_cleanup.sql
psql $DATABASE_URL -f run-migrations.sql
```

Or use the Node script:

```bash
node setup-db.mjs --reset
```

## Database Optimization Benefits

### ✅ **Modular Architecture**

- **Before**: 1 monolithic file (1700+ lines) with mixed concerns
- **After**: 8 focused modules (50-200 lines each) by domain
- **Benefit**: Easier maintenance, faster development, clear separation

### ✅ **Improved Dependency Management**

- **Clear domain boundaries**: suppliers → categories → brands → products → operations
- **Logical loading order**: Foundation → Catalog → Operations → Intelligence
- **Better error isolation**: Issues in one module don't affect others

### ✅ **Enhanced Developer Experience**

- **Faster file loads**: Smaller files load quicker in editors
- **Easier navigation**: Find tables instantly by domain
- **Reduced merge conflicts**: Smaller files mean fewer conflicts
- **Better code reviews**: Focused changes are easier to review

### ✅ **Performance Benefits**

- **Faster deployments**: Only changed modules need attention
- **Better caching**: Database can cache smaller schema chunks
- **Improved debugging**: Isolate issues to specific domains

### ✅ **Scalability**

- **Easy expansion**: Add new domains without affecting existing code
- **Team parallelization**: Different developers can work on different modules
- **Independent versioning**: Update domains independently

## File Size Optimization

| Module      | Tables | Lines | Purpose                               |
| ----------- | ------ | ----- | ------------------------------------- |
| suppliers   | 1      | ~80   | B2B supplier management               |
| categories  | 1      | ~100  | Product category hierarchy            |
| brands      | 1      | ~90   | Brand management                      |
| products    | 1      | ~200  | Product catalog + dual-unit inventory |
| inventory   | 2      | ~120  | Stock management + transactions       |
| orders      | 4      | ~180  | Orders + payments + coupons           |
| reviews     | 2      | ~80   | Reviews + wishlists                   |
| procurement | 2      | ~150  | B2B intelligence + assignments        |

**Total**: 14 tables across 8 focused modules vs 1 monolithic file

## Adding New Tables

1. Determine the correct module (or create new one)
2. Follow the module template structure
3. Include: TABLE, RLS, INDEXES, TRIGGERS
4. Update `run-migrations.sql` to include new file
5. Add DROP statement to `00_cleanup.sql`
6. Test with dry run first

## Demo Accounts

After running migrations, create these users in Supabase Auth:

| Email               | Password    | Role  | Clinic  |
| ------------------- | ----------- | ----- | ------- |
| `admin@demo.com`    | password123 | Admin | terrapet   |
| `vet@demo.com`      | password123 | Vet   | terrapet   |
| `owner@demo.com`    | password123 | Owner | terrapet   |
| `owner2@demo.com`   | password123 | Owner | terrapet   |
| `vet@petlife.com`   | password123 | Vet   | petlife |
| `admin@petlife.com` | password123 | Admin | petlife |

The `handle_new_user()` trigger automatically creates profiles with correct roles/tenants.

---

_Last updated: December 2024_
