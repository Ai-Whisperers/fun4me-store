# Database Schema Reference

Complete reference for all database tables in the Vete platform.

## Table of Contents

- [Core Tables](#core-tables)
- [Pet Management](#pet-management)
- [Medical Records](#medical-records)
- [Clinical Reference](#clinical-reference)
- [Appointments](#appointments)
- [Invoicing](#invoicing)
- [Inventory](#inventory)
- [Finance](#finance)
- [Hospitalization](#hospitalization)
- [Communication](#communication)
- [Safety & Audit](#safety--audit)

---

## Core Tables

### `tenants`

Clinic/tenant registry.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (slug: 'adris', 'petlife') |
| `name` | TEXT | Display name |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `profiles`

User profiles (extends Supabase auth.users).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (matches auth.users.id) |
| `tenant_id` | TEXT | FK to tenants |
| `email` | TEXT | User email |
| `full_name` | TEXT | Display name |
| `phone` | TEXT | Phone number |
| `avatar_url` | TEXT | Profile photo |
| `role` | TEXT | 'owner', 'vet', 'admin' |
| `city` | TEXT | City for epidemiology |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

### `clinic_invites`

Staff invitation tokens.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `email` | TEXT | Invited email |
| `role` | TEXT | Role to assign |
| `invited_by` | UUID | FK to profiles |
| `expires_at` | TIMESTAMPTZ | Expiration |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Pet Management

### `pets`

Pet profiles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `owner_id` | UUID | FK to profiles |
| `name` | TEXT | Pet name |
| `species` | TEXT | 'dog', 'cat', etc. |
| `breed` | TEXT | Breed |
| `birth_date` | DATE | Date of birth |
| `sex` | TEXT | 'male', 'female', 'unknown' |
| `color` | TEXT | Coat color |
| `weight_kg` | NUMERIC | Current weight |
| `microchip_id` | TEXT | Microchip number |
| `photo_url` | TEXT | Profile photo |
| `notes` | TEXT | General notes |
| `is_neutered` | BOOLEAN | Spay/neuter status |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

### `vaccines`

Vaccination records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `name` | TEXT | Vaccine name |
| `brand` | TEXT | Manufacturer |
| `lot_number` | TEXT | Batch/lot number |
| `administered_date` | DATE | Date given |
| `administered_by` | UUID | FK to profiles (vet) |
| `next_due_date` | DATE | Next dose due |
| `status` | TEXT | 'pending', 'verified' |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `vaccine_templates`

Default vaccine schedules by species.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `species` | TEXT | Target species |
| `vaccine_name` | TEXT | Vaccine name |
| `dose_number` | INT | Dose sequence |
| `min_age_weeks` | INT | Minimum age |
| `interval_weeks` | INT | Interval between doses |

### `qr_tags`

Physical QR tag registry.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `code` | TEXT | Unique tag code |
| `pet_id` | UUID | FK to pets (nullable) |
| `tenant_id` | TEXT | FK to tenants |
| `is_active` | BOOLEAN | Tag status |
| `assigned_at` | TIMESTAMPTZ | Assignment date |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Medical Records

### `medical_records`

Clinical consultations and procedures.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `tenant_id` | TEXT | FK to tenants |
| `vet_id` | UUID | FK to profiles |
| `visit_date` | DATE | Visit date |
| `type` | TEXT | 'consultation', 'surgery', 'emergency', etc. |
| `chief_complaint` | TEXT | Presenting issue |
| `history` | TEXT | Medical history |
| `physical_exam` | JSONB | Exam findings |
| `diagnosis_code` | UUID | FK to diagnosis_codes |
| `diagnosis_text` | TEXT | Diagnosis description |
| `treatment` | TEXT | Treatment provided |
| `notes` | TEXT | Additional notes |
| `follow_up_date` | DATE | Follow-up scheduled |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `prescriptions`

Digital prescriptions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `medical_record_id` | UUID | FK to medical_records |
| `vet_id` | UUID | FK to profiles |
| `tenant_id` | TEXT | FK to tenants |
| `medications` | JSONB | Array of medications |
| `instructions` | TEXT | Patient instructions |
| `valid_until` | DATE | Prescription expiry |
| `signature_url` | TEXT | Vet signature image |
| `status` | TEXT | 'active', 'filled', 'expired' |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Clinical Reference

### `diagnosis_codes`

VeNom/SNOMED diagnosis codes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `code` | TEXT | Diagnosis code |
| `name` | TEXT | Display name |
| `description` | TEXT | Description |
| `category` | TEXT | Category grouping |
| `species` | TEXT[] | Applicable species |

### `drug_dosages`

Drug dosing reference.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `drug_name` | TEXT | Drug name |
| `species` | TEXT | Target species |
| `indication` | TEXT | Usage indication |
| `dose_mg_per_kg` | NUMERIC | Dose calculation |
| `route` | TEXT | Administration route |
| `frequency` | TEXT | Dosing frequency |
| `max_dose_mg` | NUMERIC | Maximum dose |
| `notes` | TEXT | Additional notes |

### `growth_standards`

Weight percentiles by species/breed.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `species` | TEXT | Species |
| `breed_category` | TEXT | Breed size category |
| `age_weeks` | INT | Age in weeks |
| `p5_weight` | NUMERIC | 5th percentile |
| `p25_weight` | NUMERIC | 25th percentile |
| `p50_weight` | NUMERIC | 50th percentile |
| `p75_weight` | NUMERIC | 75th percentile |
| `p95_weight` | NUMERIC | 95th percentile |

### `vaccine_reactions`

Adverse reaction tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `vaccine_id` | UUID | FK to vaccines |
| `reaction_type` | TEXT | Type of reaction |
| `severity` | TEXT | 'mild', 'moderate', 'severe' |
| `description` | TEXT | Details |
| `onset_hours` | INT | Hours after vaccine |
| `resolved_at` | TIMESTAMPTZ | Resolution time |
| `reported_by` | UUID | FK to profiles |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `euthanasia_assessments`

Quality of life assessments (HHHHHMM scale).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `assessed_by` | UUID | FK to profiles |
| `hurt_score` | INT | Pain (0-10) |
| `hunger_score` | INT | Appetite (0-10) |
| `hydration_score` | INT | Hydration (0-10) |
| `hygiene_score` | INT | Hygiene (0-10) |
| `happiness_score` | INT | Happiness (0-10) |
| `mobility_score` | INT | Mobility (0-10) |
| `more_good_days_score` | INT | Good days (0-10) |
| `total_score` | INT | Calculated total |
| `notes` | TEXT | Assessment notes |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `reproductive_cycles`

Breeding management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `cycle_type` | TEXT | 'heat', 'pregnancy', etc. |
| `start_date` | DATE | Cycle start |
| `end_date` | DATE | Cycle end |
| `notes` | TEXT | Notes |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Appointments

### `appointments`

Appointment scheduling.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `pet_id` | UUID | FK to pets |
| `owner_id` | UUID | FK to profiles |
| `vet_id` | UUID | FK to profiles |
| `service_id` | UUID | FK to services |
| `start_time` | TIMESTAMPTZ | Appointment start |
| `end_time` | TIMESTAMPTZ | Appointment end |
| `status` | TEXT | 'pending', 'confirmed', 'completed', 'cancelled' |
| `notes` | TEXT | Appointment notes |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Invoicing

### `services`

Billable service catalog.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `code` | TEXT | Service code |
| `name` | TEXT | Service name |
| `description` | TEXT | Description |
| `category` | TEXT | Category |
| `base_price` | NUMERIC | Base price |
| `tax_rate` | NUMERIC | Tax percentage |
| `duration_minutes` | INT | Duration |
| `is_active` | BOOLEAN | Active status |

### `invoices`

Invoice headers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `invoice_number` | TEXT | Human-readable number |
| `client_id` | UUID | FK to profiles |
| `pet_id` | UUID | FK to pets |
| `invoice_date` | DATE | Invoice date |
| `due_date` | DATE | Payment due date |
| `subtotal` | NUMERIC | Subtotal |
| `tax_amount` | NUMERIC | Tax amount |
| `discount_amount` | NUMERIC | Discounts |
| `total` | NUMERIC | Grand total |
| `amount_paid` | NUMERIC | Amount paid |
| `balance_due` | NUMERIC | Remaining balance |
| `status` | TEXT | 'draft', 'sent', 'paid', etc. |
| `notes` | TEXT | Client notes |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `invoice_items`

Invoice line items.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `invoice_id` | UUID | FK to invoices |
| `item_type` | TEXT | 'service', 'product', 'custom' |
| `service_id` | UUID | FK to services |
| `product_id` | UUID | FK to store_products |
| `description` | TEXT | Line description |
| `quantity` | NUMERIC | Quantity |
| `unit_price` | NUMERIC | Unit price |
| `subtotal` | NUMERIC | Line subtotal |
| `tax_amount` | NUMERIC | Line tax |
| `total` | NUMERIC | Line total |

### `payments`

Payment records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `invoice_id` | UUID | FK to invoices |
| `payment_method_id` | UUID | FK to payment_methods |
| `amount` | NUMERIC | Payment amount |
| `payment_date` | TIMESTAMPTZ | Payment date |
| `reference_number` | TEXT | Transaction reference |
| `status` | TEXT | 'completed', 'refunded', etc. |
| `received_by` | UUID | FK to profiles |

---

## Inventory

### `store_products`

Product catalog.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `category_id` | UUID | FK to store_categories |
| `sku` | TEXT | SKU code |
| `name` | TEXT | Product name |
| `description` | TEXT | Description |
| `base_price` | NUMERIC | Retail price |
| `cost_price` | NUMERIC | Cost price |
| `is_active` | BOOLEAN | Active status |

### `store_inventory`

Stock levels.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK to store_products |
| `tenant_id` | TEXT | FK to tenants |
| `stock_quantity` | NUMERIC | Current stock |
| `reorder_point` | NUMERIC | Low stock threshold |
| `weighted_average_cost` | NUMERIC | WAC calculation |
| `updated_at` | TIMESTAMPTZ | Last update |

### `store_inventory_transactions`

Stock movements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `product_id` | UUID | FK to store_products |
| `type` | TEXT | 'purchase', 'sale', 'adjustment', etc. |
| `quantity` | NUMERIC | Quantity (+ or -) |
| `unit_cost` | NUMERIC | Cost per unit |
| `performed_by` | UUID | FK to profiles |
| `notes` | TEXT | Transaction notes |
| `reference_type` | TEXT | Reference source ('order', 'adjustment', etc.) |
| `reference_id` | UUID | FK to source record |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `clinic_product_assignments`

Maps global catalog products to clinics with optional overrides.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `catalog_product_id` | UUID | FK to store_products (global) |
| `sale_price` | NUMERIC | Clinic-specific price override |
| `min_stock_level` | INTEGER | Clinic-specific minimum |
| `location` | TEXT | Storage location |
| `requires_prescription` | BOOLEAN | Prescription requirement override |
| `is_active` | BOOLEAN | Active for this clinic |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Views

### `unified_clinic_inventory`

Combines own products and catalog assigned products into a single queryable view.

See [Unified Inventory View Documentation](./unified-inventory-view.md) for complete details.

| Column | Type | Description |
|--------|------|-------------|
| `source` | TEXT | `'own'` or `'catalog'` |
| `product_id` | UUID | Product identifier |
| `name` | TEXT | Product name |
| `stock_quantity` | INTEGER | Current stock |
| `reserved_quantity` | INTEGER | Stock in carts |
| `available_quantity` | INTEGER | Available for sale |
| `stock_status` | TEXT | `'in_stock'`, `'low_stock'`, `'out_of_stock'` |
| `tenant_id` | TEXT | Clinic tenant ID |
| ... | ... | (see full reference) |

---

## Helper Functions

### `get_clinic_inventory()`

Retrieves filtered inventory for a tenant.

```sql
SELECT * FROM get_clinic_inventory(
    p_tenant_id := 'adris',
    p_source := 'own',
    p_category_id := NULL,
    p_stock_status := 'low_stock',
    p_search := 'flea',
    p_limit := 50,
    p_offset := 0
);
```

### `get_inventory_stats()`

Returns inventory summary statistics.

```sql
SELECT * FROM get_inventory_stats('adris');
-- Returns: total_products, low_stock_count, out_of_stock_count, total_value, etc.
```

### `release_expired_reservations()`

Releases stock reservations from expired/abandoned carts.

```sql
SELECT * FROM release_expired_reservations();
-- Returns: released_count
```

### `reserve_stock()`

Reserves stock for a cart item.

```sql
SELECT * FROM reserve_stock(p_tenant_id, p_cart_id, p_product_id, p_quantity);
```

### `release_reservation()`

Releases a specific cart item reservation.

```sql
SELECT * FROM release_reservation(p_cart_id, p_product_id);
```

---

## Finance

### `expenses`

Clinic expenses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `clinic_id` | TEXT | FK to tenants |
| `category` | TEXT | Expense category |
| `amount` | NUMERIC | Amount |
| `description` | TEXT | Description |
| `date` | DATE | Expense date |
| `proof_url` | TEXT | Receipt image |
| `created_by` | UUID | FK to profiles |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `loyalty_points`

Points balance per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to profiles |
| `points` | INT | Current balance |
| `updated_at` | TIMESTAMPTZ | Last update |

### `loyalty_transactions`

Points ledger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `clinic_id` | TEXT | FK to tenants |
| `pet_id` | UUID | FK to pets |
| `points` | INT | Points earned/spent |
| `description` | TEXT | Transaction reason |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `loyalty_rewards`

Loyalty rewards catalog.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `name` | TEXT | Reward name |
| `description` | TEXT | Reward description |
| `category` | TEXT | discount, service, product, experience, general |
| `points_cost` | INT | Points required to redeem |
| `reward_type` | TEXT | discount_percentage, discount_fixed, free_service, free_product, custom |
| `reward_value` | NUMERIC | Percentage or fixed amount |
| `applicable_to` | TEXT | all, services, products |
| `applicable_item_ids` | UUID[] | Specific service/product IDs |
| `stock` | INT | Available quantity (NULL = unlimited) |
| `max_per_user` | INT | Max redemptions per user (NULL = unlimited) |
| `valid_from` | TIMESTAMPTZ | Start of validity period |
| `valid_to` | TIMESTAMPTZ | End of validity period |
| `is_active` | BOOLEAN | Active status |
| `is_featured` | BOOLEAN | Featured on rewards page |
| `image_url` | TEXT | Reward image |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

### `loyalty_redemptions`

Loyalty reward redemptions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `reward_id` | UUID | FK to loyalty_rewards |
| `user_id` | UUID | FK to profiles |
| `pet_id` | UUID | FK to pets (nullable) |
| `points_spent` | INT | Points deducted |
| `redemption_code` | TEXT | Unique redemption code |
| `status` | TEXT | pending, approved, used, expired, cancelled |
| `used_at` | TIMESTAMPTZ | When redemption was used |
| `used_on_invoice_id` | UUID | FK to invoices (nullable) |
| `used_on_order_id` | UUID | FK to store_orders (nullable) |
| `discount_applied` | NUMERIC | Discount amount applied |
| `expires_at` | TIMESTAMPTZ | Expiration date |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Hospitalization

### `kennels`

Kennel/cage registry.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `name` | TEXT | Kennel name |
| `code` | TEXT | Kennel code |
| `location` | TEXT | Physical location |
| `kennel_type` | TEXT | 'standard', 'icu', 'isolation', etc. |
| `size_category` | TEXT | Size category |
| `daily_rate` | NUMERIC | Daily charge |
| `current_status` | TEXT | 'available', 'occupied', etc. |
| `is_active` | BOOLEAN | Active status |

### `hospitalizations`

Hospitalization records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `pet_id` | UUID | FK to pets |
| `kennel_id` | UUID | FK to kennels |
| `hospitalization_number` | TEXT | Case number |
| `hospitalization_type` | TEXT | 'medical', 'surgical', 'boarding' |
| `admitted_at` | TIMESTAMPTZ | Admission time |
| `actual_discharge_at` | TIMESTAMPTZ | Discharge time |
| `admission_reason` | TEXT | Reason for admission |
| `treatment_plan` | JSONB | Treatment protocol |
| `status` | TEXT | 'active', 'discharged' |
| `acuity_level` | TEXT | 'critical', 'stable', etc. |

### `hospitalization_vitals`

Vitals monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `hospitalization_id` | UUID | FK to hospitalizations |
| `recorded_by` | UUID | FK to profiles |
| `recorded_at` | TIMESTAMPTZ | Recording time |
| `temperature_celsius` | NUMERIC | Temperature |
| `heart_rate_bpm` | INT | Heart rate |
| `respiratory_rate` | INT | Respiratory rate |
| `pain_score` | INT | Pain scale (0-10) |
| `observations` | TEXT | Notes |

---

## Communication

### `conversations`

Message threads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `client_id` | UUID | FK to profiles |
| `pet_id` | UUID | FK to pets |
| `subject` | TEXT | Conversation subject |
| `channel` | TEXT | 'in_app', 'sms', 'whatsapp' |
| `status` | TEXT | 'open', 'resolved', 'closed' |
| `assigned_to` | UUID | FK to profiles |
| `last_message_at` | TIMESTAMPTZ | Last message time |

### `messages`

Individual messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | FK to conversations |
| `sender_id` | UUID | FK to profiles |
| `sender_type` | TEXT | 'client', 'staff', 'system' |
| `message_type` | TEXT | 'text', 'image', 'file' |
| `content` | TEXT | Message content |
| `status` | TEXT | 'sent', 'delivered', 'read' |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `reminders`

Scheduled reminders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `client_id` | UUID | FK to profiles |
| `pet_id` | UUID | FK to pets |
| `type` | TEXT | 'vaccine_reminder', 'appointment_reminder' |
| `scheduled_at` | TIMESTAMPTZ | Send time |
| `status` | TEXT | 'pending', 'sent', 'failed' |
| `reference_type` | TEXT | Related entity type |
| `reference_id` | UUID | Related entity ID |

---

## Safety & Audit

### `lost_pets`

Lost and found registry.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `pet_id` | UUID | FK to pets |
| `reported_by` | UUID | FK to profiles |
| `status` | TEXT | 'lost', 'found', 'reunited' |
| `last_seen_location` | TEXT | Last known location |
| `last_seen_date` | DATE | Date last seen |
| `finder_contact` | TEXT | Finder info |
| `resolved_at` | TIMESTAMPTZ | Resolution time |

### `disease_reports`

Epidemiological data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `diagnosis_code_id` | UUID | FK to diagnosis_codes |
| `species` | TEXT | Affected species |
| `location_zone` | TEXT | Geographic zone |
| `reported_date` | DATE | Report date |
| `severity` | TEXT | 'mild', 'moderate', 'severe' |

### `audit_logs`

Security audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `user_id` | UUID | FK to profiles |
| `action` | TEXT | Action performed |
| `resource` | TEXT | Affected resource |
| `details` | JSONB | Additional details |
| `ip_address` | TEXT | Client IP |
| `created_at` | TIMESTAMPTZ | Action timestamp |

### `claim_audit_log`

Insurance claim verification audit log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `claim_id` | UUID | FK to insurance_claims |
| `action` | TEXT | Verification action taken |
| `verified_by` | UUID | FK to profiles |
| `verification_code` | TEXT | Unique verification code |
| `notes` | TEXT | Verification notes |
| `created_at` | TIMESTAMPTZ | Audit timestamp |

### `consent_template_versions`

Version history for consent templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `template_id` | UUID | FK to consent_templates |
| `version_number` | INT | Version number |
| `content` | TEXT | Template content at this version |
| `created_by` | UUID | FK to profiles |
| `created_at` | TIMESTAMPTZ | Version creation time |

### `financial_audit_logs`

Financial transaction audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `transaction_type` | TEXT | payment, refund, adjustment, etc. |
| `related_table` | TEXT | invoices, payments, etc. |
| `related_id` | UUID | ID of related record |
| `amount` | NUMERIC | Transaction amount |
| `performed_by` | UUID | FK to profiles |
| `details` | JSONB | Additional transaction details |
| `created_at` | TIMESTAMPTZ | Audit timestamp |

### `cron_job_runs`

Cron job execution tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `job_name` | TEXT | Name of cron job |
| `started_at` | TIMESTAMPTZ | Job start time |
| `completed_at` | TIMESTAMPTZ | Job completion time (nullable) |
| `status` | TEXT | running, completed, failed |
| `records_processed` | INT | Number of records processed |
| `error_message` | TEXT | Error details if failed |
| `execution_time_ms` | INT | Execution time in milliseconds |
| `metadata` | JSONB | Additional execution context |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `performance_metrics_history`

Performance metrics tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `metric_name` | TEXT | Name of metric |
| `metric_value` | NUMERIC | Metric value |
| `metric_unit` | TEXT | Unit of measurement |
| `dimensions` | JSONB | Metric dimensions/tags |
| `measured_at` | TIMESTAMPTZ | Measurement timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

---

## Laboratory

### `lab_test_catalog`

Available lab tests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants (null = global) |
| `name` | TEXT | Test name |
| `code` | TEXT | Test code |
| `category` | TEXT | Test category |
| `sample_type` | TEXT | Sample type required |
| `turnaround_hours` | INT | Expected turnaround |
| `base_price` | NUMERIC | Base price |
| `is_active` | BOOLEAN | Active status |

### `lab_panels`

Pre-configured test panels.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `name` | TEXT | Panel name |
| `description` | TEXT | Panel description |
| `test_ids` | UUID[] | Array of test IDs |
| `base_price` | NUMERIC | Panel price |

### `lab_orders`

Lab test orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `pet_id` | UUID | FK to pets |
| `ordered_by` | UUID | FK to profiles (vet) |
| `order_number` | TEXT | Human-readable number |
| `status` | TEXT | 'ordered', 'in_progress', 'completed' |
| `priority` | TEXT | 'routine', 'urgent', 'stat' |
| `ordered_at` | TIMESTAMPTZ | Order timestamp |
| `completed_at` | TIMESTAMPTZ | Completion time |
| `notes` | TEXT | Order notes |

### `lab_order_items`

Individual tests in an order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lab_order_id` | UUID | FK to lab_orders |
| `test_id` | UUID | FK to lab_test_catalog |
| `status` | TEXT | Item status |
| `price` | NUMERIC | Charged price |

### `lab_results`

Test results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lab_order_id` | UUID | FK to lab_orders |
| `test_id` | UUID | FK to lab_test_catalog |
| `value` | TEXT | Result value |
| `unit` | TEXT | Unit of measurement |
| `reference_min` | NUMERIC | Reference range min |
| `reference_max` | NUMERIC | Reference range max |
| `is_abnormal` | BOOLEAN | Abnormal flag |
| `notes` | TEXT | Result notes |
| `entered_by` | UUID | FK to profiles |
| `entered_at` | TIMESTAMPTZ | Entry time |

### `lab_result_attachments`

Result file attachments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lab_order_id` | UUID | FK to lab_orders |
| `file_url` | TEXT | Storage URL |
| `file_name` | TEXT | Original filename |
| `file_type` | TEXT | MIME type |
| `uploaded_by` | UUID | FK to profiles |
| `uploaded_at` | TIMESTAMPTZ | Upload time |

### `lab_result_comments`

Discussion/notes on results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `lab_order_id` | UUID | FK to lab_orders |
| `comment` | TEXT | Comment text |
| `created_by` | UUID | FK to profiles |
| `created_at` | TIMESTAMPTZ | Creation time |

---

## Consent Management

### `consent_templates`

Consent form templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `name` | TEXT | Template name |
| `description` | TEXT | Template description |
| `content` | TEXT | Template content (HTML) |
| `category` | TEXT | Template category |
| `requires_witness` | BOOLEAN | Witness required |
| `is_active` | BOOLEAN | Active status |
| `version` | INT | Version number |

### `consent_template_versions`

Version history for templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `template_id` | UUID | FK to consent_templates |
| `version` | INT | Version number |
| `content` | TEXT | Version content |
| `created_at` | TIMESTAMPTZ | Creation time |
| `created_by` | UUID | FK to profiles |

### `consent_documents`

Signed consent records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `template_id` | UUID | FK to consent_templates |
| `pet_id` | UUID | FK to pets |
| `client_id` | UUID | FK to profiles |
| `signed_at` | TIMESTAMPTZ | Signature time |
| `signature_url` | TEXT | Signature image URL |
| `witness_name` | TEXT | Witness name |
| `witness_signature_url` | TEXT | Witness signature |
| `ip_address` | TEXT | Signer IP |
| `expires_at` | TIMESTAMPTZ | Expiration date |
| `revoked_at` | TIMESTAMPTZ | Revocation time |

---

## Insurance

### `insurance_providers`

Insurance company directory.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Provider name |
| `code` | TEXT | Provider code |
| `contact_email` | TEXT | Contact email |
| `contact_phone` | TEXT | Contact phone |
| `claims_portal_url` | TEXT | Claims portal URL |
| `is_active` | BOOLEAN | Active status |

### `insurance_policies`

Pet insurance policies.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `pet_id` | UUID | FK to pets |
| `provider_id` | UUID | FK to insurance_providers |
| `policy_number` | TEXT | Policy number |
| `coverage_type` | TEXT | Coverage type |
| `coverage_amount` | NUMERIC | Coverage limit |
| `deductible` | NUMERIC | Deductible amount |
| `copay_percentage` | NUMERIC | Copay % |
| `effective_date` | DATE | Start date |
| `expiration_date` | DATE | End date |
| `status` | TEXT | 'active', 'expired', 'cancelled' |

### `insurance_claims`

Insurance claims.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `policy_id` | UUID | FK to insurance_policies |
| `pet_id` | UUID | FK to pets |
| `claim_number` | TEXT | Claim reference |
| `claim_type` | TEXT | 'medical', 'accident', 'wellness' |
| `service_date` | DATE | Date of service |
| `diagnosis` | TEXT | Diagnosis |
| `total_amount` | NUMERIC | Total claimed |
| `approved_amount` | NUMERIC | Approved amount |
| `status` | TEXT | 'submitted', 'pending', 'approved', 'denied' |
| `submitted_at` | TIMESTAMPTZ | Submission time |
| `processed_at` | TIMESTAMPTZ | Processing time |
| `notes` | TEXT | Claim notes |

### `insurance_claim_items`

Line items in a claim.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `claim_id` | UUID | FK to insurance_claims |
| `service_id` | UUID | FK to services |
| `description` | TEXT | Item description |
| `amount` | NUMERIC | Item amount |
| `approved_amount` | NUMERIC | Approved amount |

---

## Staff Management

### `staff_profiles`

Extended staff information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `profile_id` | UUID | FK to profiles |
| `tenant_id` | TEXT | FK to tenants |
| `license_number` | TEXT | Professional license |
| `specialization` | TEXT | Specialization |
| `hire_date` | DATE | Hire date |
| `employment_type` | TEXT | 'full_time', 'part_time', 'contractor' |
| `hourly_rate` | NUMERIC | Hourly rate |
| `is_active` | BOOLEAN | Active status |

### `staff_schedules`

Regular working schedules.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `staff_id` | UUID | FK to staff_profiles |
| `day_of_week` | INT | Day (0=Sunday, 6=Saturday) |
| `start_time` | TIME | Shift start |
| `end_time` | TIME | Shift end |
| `is_available` | BOOLEAN | Available for appointments |

### `staff_time_off`

Time off requests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `staff_id` | UUID | FK to staff_profiles |
| `type_id` | UUID | FK to staff_time_off_types |
| `start_date` | DATE | Start date |
| `end_date` | DATE | End date |
| `reason` | TEXT | Request reason |
| `status` | TEXT | 'pending', 'approved', 'denied' |
| `approved_by` | UUID | FK to profiles |
| `approved_at` | TIMESTAMPTZ | Approval time |

### `staff_time_off_types`

Time off type catalog.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `name` | TEXT | Type name |
| `is_paid` | BOOLEAN | Paid time off |
| `max_days_per_year` | INT | Annual limit |
| `requires_approval` | BOOLEAN | Needs approval |

---

## E-Commerce Extended

### `store_orders`

Customer orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `customer_id` | UUID | FK to profiles |
| `order_number` | TEXT | Human-readable number |
| `status` | TEXT | 'pending', 'pending_prescription', 'confirmed', 'shipped', 'delivered', 'cancelled' |
| `subtotal` | NUMERIC | Subtotal |
| `tax_amount` | NUMERIC | Tax |
| `shipping_amount` | NUMERIC | Shipping cost |
| `discount_amount` | NUMERIC | Discounts |
| `total` | NUMERIC | Grand total |
| `shipping_address` | JSONB | Shipping address |
| `notes` | TEXT | Order notes |
| `requires_prescription_review` | BOOLEAN | Has items needing prescription |
| `prescription_file_url` | TEXT | Main prescription file URL |
| `prescription_reviewed_by` | UUID | FK to profiles (vet who reviewed) |
| `prescription_reviewed_at` | TIMESTAMPTZ | Review timestamp |
| `prescription_notes` | TEXT | Vet review notes |
| `prescription_rejection_reason` | TEXT | Reason if rejected |
| `created_at` | TIMESTAMPTZ | Order time |

### `store_order_items`

Order line items.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | FK to store_orders |
| `product_id` | UUID | FK to store_products |
| `variant_id` | UUID | FK to store_product_variants |
| `quantity` | INT | Quantity |
| `unit_price` | NUMERIC | Unit price |
| `total` | NUMERIC | Line total |
| `requires_prescription` | BOOLEAN | Item needs prescription |
| `prescription_file_url` | TEXT | Prescription file for this item |

### `store_coupons`

Discount coupons.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `code` | TEXT | Coupon code |
| `description` | TEXT | Description |
| `discount_type` | TEXT | 'percentage', 'fixed' |
| `discount_value` | NUMERIC | Discount amount |
| `min_purchase` | NUMERIC | Minimum purchase |
| `usage_limit` | INT | Max uses |
| `times_used` | INT | Current uses |
| `valid_from` | TIMESTAMPTZ | Start date |
| `valid_until` | TIMESTAMPTZ | End date |
| `is_active` | BOOLEAN | Active status |

### `store_reviews`

Product reviews.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `product_id` | UUID | FK to store_products |
| `user_id` | UUID | FK to profiles |
| `rating` | INT | Rating (1-5) |
| `title` | TEXT | Review title |
| `content` | TEXT | Review content |
| `is_verified_purchase` | BOOLEAN | Verified buyer |
| `is_approved` | BOOLEAN | Moderation status |
| `created_at` | TIMESTAMPTZ | Review time |

### `store_wishlists`

User wishlists (product bookmarks).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `user_id` | UUID | FK to profiles |
| `product_id` | UUID | FK to store_products |
| `created_at` | TIMESTAMPTZ | When added |

Unique constraint on (user_id, product_id).

### `store_carts`

Persistent shopping carts for logged-in users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `customer_id` | UUID | FK to profiles |
| `items` | JSONB | Cart items array |
| `updated_at` | TIMESTAMPTZ | Last update |
| `created_at` | TIMESTAMPTZ | Cart created |

Unique constraint on (customer_id, tenant_id).

### `store_stock_alerts`

Stock restoration notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `product_id` | UUID | FK to store_products |
| `user_id` | UUID | FK to profiles (nullable) |
| `email` | TEXT | Email to notify |
| `notified` | BOOLEAN | Whether notification sent |
| `created_at` | TIMESTAMPTZ | Subscription time |

Unique constraint on (email, product_id).

### `store_wishlist` (DEPRECATED)

Legacy table - use `store_wishlists` instead.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to profiles |
| `product_id` | UUID | FK to store_products |
| `created_at` | TIMESTAMPTZ | Added time |

---

## WhatsApp Integration

### `whatsapp_messages`

WhatsApp message history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `conversation_id` | UUID | FK to conversations |
| `phone_number` | TEXT | Phone number |
| `direction` | TEXT | 'inbound', 'outbound' |
| `message_type` | TEXT | 'text', 'image', 'document' |
| `content` | TEXT | Message content |
| `media_url` | TEXT | Media URL |
| `status` | TEXT | 'sent', 'delivered', 'read', 'failed' |
| `external_id` | TEXT | Provider message ID |
| `created_at` | TIMESTAMPTZ | Message time |

### `whatsapp_templates`

WhatsApp message templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | TEXT | FK to tenants |
| `name` | TEXT | Template name |
| `category` | TEXT | Template category |
| `content` | TEXT | Template content |
| `variables` | TEXT[] | Variable placeholders |
| `is_approved` | BOOLEAN | WhatsApp approval status |
| `external_id` | TEXT | Provider template ID |

---

## Notifications

### `notifications`

User notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to profiles |
| `tenant_id` | TEXT | FK to tenants |
| `type` | TEXT | Notification type |
| `title` | TEXT | Notification title |
| `message` | TEXT | Notification message |
| `data` | JSONB | Additional data |
| `read_at` | TIMESTAMPTZ | Read timestamp |
| `created_at` | TIMESTAMPTZ | Creation time |

---

## Entity Relationship Diagram

```
tenants
    │
    ├─── profiles (tenant_id)
    │       │
    │       ├─── pets (owner_id)
    │       │       │
    │       │       ├─── vaccines (pet_id)
    │       │       ├─── medical_records (pet_id)
    │       │       ├─── prescriptions (pet_id)
    │       │       ├─── appointments (pet_id)
    │       │       ├─── hospitalizations (pet_id)
    │       │       ├─── lab_orders (pet_id)
    │       │       ├─── insurance_policies (pet_id)
    │       │       ├─── consent_documents (pet_id)
    │       │       └─── qr_tags (pet_id)
    │       │
    │       ├─── staff_profiles (profile_id)
    │       │       ├─── staff_schedules (staff_id)
    │       │       └─── staff_time_off (staff_id)
    │       │
    │       ├─── invoices (client_id)
    │       ├─── conversations (client_id)
    │       ├─── store_orders (customer_id)
    │       ├─── store_wishlist (user_id)
    │       ├─── notifications (user_id)
    │       └─── loyalty_points (user_id)
    │
    ├─── services (tenant_id)
    ├─── store_products (tenant_id)
    │       ├─── store_inventory (product_id)
    │       ├─── store_reviews (product_id)
    │       └─── store_order_items (product_id)
    ├─── store_coupons (tenant_id)
    ├─── kennels (tenant_id)
    ├─── lab_test_catalog (tenant_id)
    ├─── consent_templates (tenant_id)
    ├─── insurance_providers (global)
    ├─── message_templates (tenant_id)
    ├─── whatsapp_templates (tenant_id)
    └─── expenses (clinic_id)
```

---

## Table Count Summary

| Category | Tables |
|----------|--------|
| Core | 3 |
| Pet Management | 5 |
| Medical Records | 3 |
| Clinical Reference | 8 |
| Appointments | 2 |
| Invoicing | 5 |
| Inventory | 4 |
| Finance | 5 (+2 loyalty tables) |
| Hospitalization | 4 |
| Laboratory | 7 |
| Consent | 4 (+1 versioning table) |
| Insurance | 4 |
| Communication | 5 |
| Staff | 4 |
| E-Commerce | 5 |
| WhatsApp | 2 |
| Safety & Audit | 10 (+6 audit/tracking tables) |
| **Total** | **~80+** |

---

## Related Documentation

- [Database Overview](overview.md)
- [RLS Policies](rls-policies.md)
- [Migrations Guide](migrations.md)
- [Functions Reference](functions.md)
- [DB Improvement Report](../../web/db/DB_IMPROVEMENT_REPORT.md)
