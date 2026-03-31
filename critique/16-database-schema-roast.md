# Database Schema Deep-Dive - The Migration Monster

**Date**: January 19, 2026  
**Analyst**: Sisyphus  
**Status**: ⚠️ CONCERNING FINDINGS

---

## Executive Summary

The Vete database exhibits **excellent security hygiene** (RLS everywhere, tenant isolation) but suffers from **migration sprawl** and **schema bloat**. The codebase contains **100 migration files** totaling ~25,000 lines, including a **3,577-line monster** that defines 120+ tables at once. While v2 schema exists as a refactored solution, production still uses the sprawling v1 migrations.

**Bottom Line**: Good security foundation, poor migration hygiene.

---

## By the Numbers

| Metric | Count | Status |
|--------|-------|--------|
| **Migration Files** | 100 files | 🔴 Too many |
| **Total Migration Lines** | ~25,000 lines | 🔴 Unmanageable |
| **Largest Migration** | 3,577 lines (!) | 🔴 MONSTER |
| **Tables Created** | 120 in monster + 100+ added | 🟡 Schema creep |
| **RLS Enabled Tables** | 348 tables | ✅ Excellent |
| **RLS Policies** | 432 policies | ✅ Excellent |
| **Indexes** | 817 indexes | ✅ Good coverage |
| **Foreign Keys** | 806 (from earlier) | ✅ Referential integrity |
| **ENUMs** | 38 types | 🟡 Many enums |
| **Database Functions** | 100+ (estimate) | 🟡 Mixed patterns |

---

## The Monster Migration

### File: `archive/0000_parched_scalphunter.sql` (3,577 lines)

This file is **Drizzle ORM's schema introspection** - a dump of the entire database at one point in time.

**What it contains**:
```sql
-- Lines 1-37: 38 ENUM type definitions
CREATE TYPE "public"."appointment_status" AS ENUM(...)
CREATE TYPE "public"."claim_status" AS ENUM(...)
-- ... 36 more

-- Lines 38-3577: 120+ table definitions
CREATE TABLE "tenants" (...)
CREATE TABLE "profiles" (...)
CREATE TABLE "pets" (...)
-- ... 117+ more tables
```

**Problems**:
1. **Unreadable**: 3,577 lines in one file
2. **Unmaintainable**: Can't see individual changes
3. **Irreversible**: No down migration
4. **No comments**: Zero documentation
5. **Archived but referenced**: Still in git, confuses developers

**Should be**: Broken into 30-50 domain-specific migrations

---

## Migration Sprawl

### Growth Pattern

```
archive/
├── 0000_parched_scalphunter.sql    # 3,577 lines - INITIAL DUMP
└── 0001_broad_katie_power.sql      # 443 lines   - ANOTHER DUMP

migrations/
├── 001_add_tenant_id_to_child_tables.sql   # 395 lines
├── 012_security_audit_fixes.sql            # 608 lines
├── 021_fix_checkout_race_conditions.sql    # 473 lines
├── 027_table_partitioning.sql              # 450 lines
├── 028_data_archiving.sql                  # 561 lines
├── 031_store_commissions.sql               # 522 lines
├── 034_adoption_board.sql                  # 424 lines
├── 035_service_subscriptions.sql           # 621 lines
├── 036_platform_admin.sql                  # 414 lines
├── 040_comprehensive_fk_indexes.sql        # 435 lines
├── 061_ambassador_program.sql              # 452 lines
├── 062_booking_request_flow.sql            # 734 lines (LARGEST)
├── 069_fix_checkout_price_validation.sql   # 461 lines
├── 073_checkout_idempotency_rpc.sql        # 443 lines
├── 077_fix_checkout_composite_ids.sql      # 472 lines
├── 083_fix_checkout_price_validation.sql   # 461 lines (DUPLICATE!)
├── 085_add_rls_to_archive_tables.sql       # 439 lines
└── ... 83 more files (averaging 100-300 lines each)
```

**Anti-Patterns Detected**:
1. **Duplicate fixes**: Multiple "fix checkout price validation" files
2. **Patch-on-patch**: "Fix" migrations fixing previous fixes
3. **Feature creep**: Adding entire systems via migration (ambassador, adoption)
4. **Missing rollbacks**: Most migrations have no down migration
5. **Inconsistent naming**: Some numbered, some descriptive, no pattern

---

## Migration Anti-Patterns

### 1. The "Fix" Files (80, 85, 88, 100, 101)

**Pattern**: Migrations that fix mistakes in previous migrations

```sql
-- Migration 069: fix_checkout_price_validation.sql
-- Migration 083: fix_checkout_price_validation.sql (AGAIN!)
-- Migration 077: fix_checkout_composite_service_ids.sql
```

**Problem**: Each "fix" indicates a migration was deployed broken

**Root cause**: No migration testing before deployment

**Solution**: 
- Test migrations in staging
- Squash fix migrations before release
- Use v2 schema (already refactored)

---

### 2. Monolithic Feature Dumps

**Example**: `062_booking_request_flow.sql` (734 lines)

```sql
-- Creates 15+ tables
CREATE TABLE booking_requests (...)
CREATE TABLE booking_slots (...)
CREATE TABLE booking_availability (...)
-- ... 12 more tables

-- Adds 30+ RLS policies
CREATE POLICY "..." ON booking_requests ...
-- ... 29 more

-- Creates 20+ indexes
CREATE INDEX idx_booking_requests_tenant ...
-- ... 19 more

-- Adds 5+ functions
CREATE FUNCTION check_availability(...) ...
-- ... 4 more
```

**Problem**: Entire feature added in one migration

**Better approach**: Break into logical steps
```sql
061_booking_requests_schema.sql    # Tables only (100 lines)
062_booking_requests_rls.sql       # RLS policies (150 lines)
063_booking_requests_indexes.sql   # Indexes (80 lines)
064_booking_requests_functions.sql # Functions (200 lines)
```

---

### 3. Missing Down Migrations

**Current**: 100 migrations, ~5 have down migrations

```sql
-- Typical migration (NO rollback)
CREATE TABLE new_feature (...);
-- EOF
```

**Should be**:
```sql
-- Up migration
CREATE TABLE new_feature (...);

-- Down migration (in separate file or commented)
-- DROP TABLE new_feature;
```

**Impact**: Can't rollback deployments easily

---

### 4. Inconsistent Numbering

**Current pattern** (inconsistent):
```
001_add_tenant_id.sql
012_security_fixes.sql  # Gap! Where's 002-011?
021_fix_checkout.sql
027_partitioning.sql    # Gap! Where's 022-026?
```

**Problem**: Gaps indicate:
- Deleted migrations (bad!)
- Merged migrations (confusing!)
- No clear ordering

**Should be**: Sequential without gaps, or use timestamps

---

## The v2 Refactor (Unused)

### What Exists: `web/db/v2/` Directory

**Structure** (MUCH BETTER):
```
v2/
├── 00_cleanup.sql              # Drop script
├── 01_extensions.sql           # PostgreSQL extensions
├── 02_functions/
│   ├── 02_core_functions.sql
│   └── 03_helper_functions.sql
├── 10_core/
│   ├── 10_tenants.sql          # Multi-tenant foundation
│   ├── 11_profiles.sql
│   └── 12_invites.sql
├── 20_pets/
│   ├── 20_pets.sql
│   └── 21_vaccines.sql
├── 30_clinical/
│   ├── 30_reference_data.sql
│   ├── 31_lab.sql
│   ├── 32_hospitalization.sql
│   └── 33_medical_records.sql
├── 40_scheduling/
│   ├── 40_services.sql
│   └── 41_appointments.sql
├── 50_finance/
│   ├── 50_invoicing.sql
│   └── 51_expenses.sql
├── 60_store/                   # MODULAR APPROACH
│   ├── suppliers/01_suppliers.sql
│   ├── categories/01_categories.sql
│   ├── brands/01_brands.sql
│   ├── products/01_products.sql
│   ├── inventory/01_inventory.sql
│   ├── orders/01_orders.sql
│   ├── reviews/01_reviews.sql
│   └── procurement/01_procurement.sql
├── 70_communications/
├── 80_insurance/
├── 85_system/
├── 90_infrastructure/
└── 95_seeds/
```

**Benefits**:
- ✅ Domain-driven organization
- ✅ Modular files (50-200 lines each)
- ✅ Self-contained (tables + RLS + indexes + triggers together)
- ✅ Clear dependencies
- ✅ Easy to find things
- ✅ Eliminates "fix" files (done right from start)

**Problem**: **NOT USED IN PRODUCTION**

The v2 schema is a complete rewrite but hasn't replaced v1 yet.

---

## Good Patterns (RLS & Security)

### Row-Level Security Coverage: EXCELLENT

**Every table has RLS enabled**:
```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
-- ... 345 more tables
```

**Policies follow consistent patterns**:
```sql
-- Staff access (typical pattern)
CREATE POLICY "Staff can manage" ON table_name FOR ALL
  USING (is_staff_of(tenant_id));

-- Owner access (typical pattern)
CREATE POLICY "Owners view own pets" ON pets FOR SELECT
  USING (owner_id = auth.uid());

-- Service role bypass (typical pattern)
CREATE POLICY "Service role full access" ON table_name FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

**Result**: 432 policies protecting 348 tables

**Grade**: ✅ **A+** (Security is excellent)

---

### Helper Functions: GOOD

**Key security functions**:
```sql
-- Check if user is staff in a tenant
CREATE FUNCTION is_staff_of(tenant_id text) RETURNS boolean

-- Check if user owns a pet
CREATE FUNCTION is_owner_of_pet(pet_id uuid) RETURNS boolean

-- Get current user's tenant
CREATE FUNCTION get_user_tenant() RETURNS text

-- Get current user's role
CREATE FUNCTION get_user_role() RETURNS text
```

**Business logic functions**:
```sql
-- Generate sequence numbers
CREATE FUNCTION generate_sequence_number(prefix, tenant)

-- Validate coupons
CREATE FUNCTION validate_coupon(tenant, code)

-- Find available appointment slots
CREATE FUNCTION get_available_slots(tenant, date)

-- Dashboard stats
CREATE FUNCTION get_clinic_stats(tenant)
```

**Grade**: ✅ **A** (Well-designed, reusable)

---

### Indexes: GOOD

**817 indexes** covering:
- Foreign keys (all indexed)
- Common WHERE clauses (tenant_id, pet_id, user_id)
- Timestamp ranges (created_at, updated_at)
- Status columns (status, is_active)
- Search fields (name, email, code)

**Example**:
```sql
-- Composite indexes for common queries
CREATE INDEX idx_appointments_tenant_date 
  ON appointments(tenant_id, appointment_date);

CREATE INDEX idx_invoices_tenant_status 
  ON invoices(tenant_id, status) WHERE deleted_at IS NULL;

-- GIN indexes for JSONB and arrays
CREATE INDEX idx_products_features 
  ON products USING GIN(features);
```

**Grade**: ✅ **A** (Comprehensive coverage)

---

## Issues Found

### 1. Schema Bloat (348 Tables)

**Current tables** (estimated from migrations):
- Core: ~10 tables (tenants, profiles, etc.)
- Pets: ~5 tables (pets, vaccines, etc.)
- Clinical: ~30 tables (lab, hospital, records)
- Scheduling: ~10 tables (services, appointments)
- Finance: ~20 tables (invoices, payments, loyalty)
- Store: ~40 tables (products, inventory, orders)
- Communications: ~15 tables (messages, reminders)
- Insurance: ~10 tables (policies, claims)
- System: ~20 tables (staff, audit, QR tags)
- Archive: ~20 tables (historical data)
- **Other**: ~168 tables (?)

**Problem**: 348 tables is A LOT for a single application

**Questions**:
1. Are all 348 tables actively used?
2. Are some tables redundant (fix migrations created duplicates)?
3. Can some tables be merged?

**Recommendation**: Audit table usage, archive unused tables

---

### 2. ENUM Overuse (38 Types)

**Current ENUMs**:
```sql
CREATE TYPE appointment_status AS ENUM(...)
CREATE TYPE claim_status AS ENUM(...)
CREATE TYPE hospitalization_status AS ENUM(...)
CREATE TYPE invoice_status AS ENUM(...)
CREATE TYPE order_status AS ENUM(...)
CREATE TYPE payment_status AS ENUM(...)
CREATE TYPE prescription_status AS ENUM(...)
CREATE TYPE vaccine_status AS ENUM(...)
CREATE TYPE workflow_status AS ENUM(...)
-- ... 29 more
```

**Problem**: PostgreSQL ENUMs are immutable

**Impact**:
- Can't easily add values (requires migration + table lock)
- Can't remove values (requires full rebuild)
- Type changes break schema

**Alternative**: Use text columns with CHECK constraints
```sql
-- FLEXIBLE (can change constraint easily)
CREATE TABLE appointments (
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled'))
);

-- RIGID (requires migration to add values)
CREATE TABLE appointments (
  status appointment_status NOT NULL DEFAULT 'scheduled'
);
```

**Recommendation**: 
- Keep ENUMs for stable, rarely-changing types (user_role, pet_species)
- Use TEXT + CHECK for evolving statuses

---

### 3. Missing Indexes on JSONB Columns

**Current**: Many tables have JSONB columns without indexes

```sql
-- tenants table
settings jsonb DEFAULT '{}'::jsonb,  -- NO INDEX
business_hours jsonb DEFAULT '{}'::jsonb,  -- NO INDEX

-- profiles table
-- (No JSONB columns, good)

-- products table
features jsonb,  -- HAS GIN INDEX ✅
specifications jsonb,  -- NO INDEX
```

**Problem**: Queries on JSONB columns without indexes are slow

**Impact**: 
```sql
-- SLOW (table scan)
SELECT * FROM tenants 
WHERE settings->>'feature_x' = 'enabled';

-- FAST (with GIN index)
SELECT * FROM tenants 
WHERE settings @> '{"feature_x": "enabled"}';
```

**Fix**: Add GIN indexes to commonly-queried JSONB columns

---

### 4. Soft Delete Inconsistency

**Pattern 1**: Has soft delete columns
```sql
CREATE TABLE pets (
  deleted_at timestamp with time zone,
  deleted_by uuid
);
```

**Pattern 2**: No soft delete columns
```sql
CREATE TABLE tenants (
  -- No deleted_at column!
);
```

**Problem**: Inconsistent soft delete implementation

**Impact**:
- Some tables can't be "undeleted"
- Queries need to check for deleted_at in some tables but not others
- Confusion about which tables support soft delete

**Recommendation**: Standardize soft delete across all tables (v2 schema does this)

---

### 5. Missing Materialized Views for Analytics

**Current**: Complex dashboard queries hit live tables

**Example**: Dashboard stats query
```sql
-- Expensive query (joins 10+ tables)
SELECT 
  COUNT(DISTINCT appointments.*) as appointment_count,
  COUNT(DISTINCT pets.*) as pet_count,
  SUM(invoices.total) as revenue,
  ...
FROM appointments
JOIN pets ON ...
JOIN invoices ON ...
WHERE tenant_id = 'adris'
  AND deleted_at IS NULL
  AND ...
```

**Problem**: Dashboard loads slowly (joins 10+ tables)

**Solution**: Materialized views refreshed hourly
```sql
CREATE MATERIALIZED VIEW clinic_stats AS
SELECT 
  tenant_id,
  appointment_count,
  pet_count,
  revenue,
  last_updated
FROM ...;

-- Refresh every hour
CREATE INDEX idx_clinic_stats_tenant ON clinic_stats(tenant_id);
```

**Recommendation**: Create materialized views for dashboard queries

---

## Migration to v2 Schema

### Why Migrate?

| Aspect | v1 (Current) | v2 (Better) |
|--------|--------------|-------------|
| **Files** | 100 migrations | 30 domain modules |
| **Largest file** | 3,577 lines | 200 lines max |
| **Organization** | Chronological | Domain-driven |
| **Findability** | Hard (search 100 files) | Easy (know domain) |
| **"Fix" files** | 15+ fix migrations | 0 (done right) |
| **Soft deletes** | Inconsistent | Standardized |
| **Documentation** | Minimal | Comprehensive |

### Migration Strategy

**Phase 1**: Preparation (1 week)
1. Audit v1 vs v2 differences
2. Identify data migration requirements
3. Create rollback plan
4. Test v2 schema in staging

**Phase 2**: Parallel Run (2 weeks)
1. Run v2 schema in parallel environment
2. Dual-write to both schemas
3. Verify data consistency
4. Test all application features

**Phase 3**: Cutover (1 day)
1. Maintenance window (2-3 hours)
2. Final data sync
3. Switch application to v2
4. Monitor for issues

**Phase 4**: Cleanup (1 week)
1. Remove v1 migration files
2. Archive old schema
3. Update documentation

**Total effort**: 4 weeks  
**Risk**: Medium (database migration is always risky)

---

## Recommendations

### Immediate (P0)

1. **Audit Table Usage**
   - Identify unused tables
   - Archive or drop unused tables
   - Effort: 2 days
   - Risk: Low

2. **Add Missing Indexes**
   - Index commonly-queried JSONB columns
   - Add composite indexes for dashboard queries
   - Effort: 1 day
   - Risk: Low (use CONCURRENTLY)

3. **Standardize Soft Deletes**
   - Add deleted_at/deleted_by to all tables
   - Update queries to filter deleted records
   - Effort: 3 days
   - Risk: Medium

### Short-Term (P1)

4. **Create Materialized Views**
   - Build dashboard_stats materialized view
   - Refresh hourly via cron
   - Effort: 2 days
   - Risk: Low

5. **Squash Fix Migrations**
   - Combine duplicate "fix" migrations
   - Create clean migration history
   - Effort: 2 days
   - Risk: Low

6. **Document Migration Process**
   - Create migration testing checklist
   - Add rollback procedures
   - Effort: 1 day
   - Risk: None

### Long-Term (P2)

7. **Migrate to v2 Schema**
   - Follow migration strategy above
   - Effort: 4 weeks
   - Risk: Medium

8. **Replace ENUMs with TEXT + CHECK**
   - Convert volatile ENUMs to TEXT columns
   - Keep stable ENUMs (user_role, pet_species)
   - Effort: 3 days
   - Risk: Medium

9. **Implement Table Partitioning**
   - Partition large tables by tenant_id
   - Partition time-series tables by date
   - Effort: 1 week
   - Risk: High

---

## Conclusion

The Vete database exhibits **excellent security practices** (RLS everywhere, tenant isolation) but suffers from **migration technical debt**. The 100-migration v1 schema is **sprawling and hard to maintain**, while the **v2 refactor exists but is unused**. 

**Key Issues**:
1. 3,577-line monster migration (unreadable)
2. 100 migrations with duplicate "fix" files
3. 348 tables (potential bloat)
4. 38 ENUMs (inflexible)
5. Missing indexes on JSONB columns
6. Inconsistent soft delete

**Priorities**:
1. **Audit and clean up** (remove unused tables, add missing indexes)
2. **Standardize patterns** (soft delete, ENUM usage)
3. **Plan v2 migration** (domain-driven schema is much better)

**Overall Grade**: B+ (Security: A+, Organization: C, Performance: B)

---

**Next**: Authentication & Security Deep-Dive
