# New Database Migrations (074-087)

## Summary

14 new migrations addressing: subscription tiers, payment atomicity, security fixes, and system enhancements.

## Migrations List

### 074: Add Subscription Tier Columns

**File:** `074_add_subscription_tier_columns.sql`
**Purpose:** Adds subscription tier system to tenants table
**Changes:**

- `subscription_tier` column (default: 'gratis')
- Trial tracking (`is_trial`, `trial_end_date`)
- Subscription expiration tracking
- Feature overrides (JSONB)
- Referral discount tracking

### 075: Atomic Payment Recording

**File:** `075_atomic_payment_recording.sql`
**Purpose:** Fixes race condition in payment recording
**Critical Fix:** Prevents double-payment vulnerability
**Changes:**

- SELECT FOR UPDATE row-locking
- Atomic transaction handling
- Proper validation before processing

### 076: Add User Preferences Column

**File:** `076_add_user_preferences_column.sql`
**Purpose:** User preferences storage
**Changes:**

- `preferences` JSONB column on profiles table

### 077: Fix Checkout Composite Service IDs

**File:** `077_fix_checkout_composite_service_ids.sql`
**Purpose:** Handles composite service IDs in checkout
**Changes:**

- Updates `process_checkout()` function
- Extracts UUID from composite IDs (`serviceId-petId-variant`)

### 078: Consent Template Versioning

**File:** `078_consent_template_versioning.sql`
**Purpose:** Versioning system for consent templates
**Changes:**

- `consent_template_versions` table
- Version tracking and audit trail

### 079: Claim Code Verification

**File:** `079_claim_code_verification.sql`
**Purpose:** Pre-generated clinic claim system
**Changes:**

- Claim code verification functions
- Security checks for clinic claiming

### 080: Cron Job Tracking

**File:** `080_cron_job_tracking.sql`
**Purpose:** Monitor background job health
**Changes:**

- `cron_job_executions` table
- Job status tracking
- Performance metrics

### 081: Performance Metrics History

**File:** `081_performance_metrics_history.sql`
**Purpose:** Track system performance over time
**Changes:**

- `performance_metrics_history` table
- Time-series performance data

### 082: Loyalty Rewards Redemptions

**File:** `082_loyalty_rewards_redemptions.sql`
**Purpose:** Track loyalty point redemptions
**Changes:**

- `loyalty_redemptions` table
- Redemption history and audit

### 083: Fix Checkout Price Validation

**File:** `083_fix_checkout_price_validation.sql`
**Purpose:** Prevent price manipulation attacks
**Changes:**

- Enhanced price validation in checkout
- Server-side price verification

### 084: Fix Lost Pets RLS

**File:** `084_fix_lost_pets_rls.sql`
**Purpose:** **CRITICAL SECURITY FIX**
**Changes:**

- Fixes tenant isolation in `lost_pets` table
- Removes overly permissive policies
- Adds proper tenant-scoped policies

### 085: Add RLS to Archive Tables

**File:** `085_add_rls_to_archive_tables.sql`
**Purpose:** Security hardening for archive tables
**Changes:**

- Enables RLS on archive tables
- Tenant-scoped policies

### 086: Standardize Column Naming

**File:** `086_standardize_column_naming.sql`
**Purpose:** Consistency improvements
**Changes:**

- Renames inconsistent columns
- Follows naming conventions

### 087: Add Missing Updated_At Triggers

**File:** `087_add_missing_updated_at_triggers.sql`
**Purpose:** Auto-update timestamps
**Changes:**

- Adds `updated_at` triggers to tables missing them

## Priority Classification

### 🔴 CRITICAL (Must Apply ASAP)

1. **075**: Atomic Payment Recording - Prevents data corruption
2. **084**: Fix Lost Pets RLS - Security vulnerability

### 🟡 HIGH (Important Features)

3. **074**: Subscription Tiers - Required for billing
4. **077**: Checkout Composite IDs - Fixes cart checkout
5. **083**: Price Validation - Security

### 🟢 MEDIUM (Enhancements)

6. **078**: Consent Versioning
7. **079**: Claim Code System
8. **080**: Cron Job Tracking
9. **085**: Archive RLS

### 🔵 LOW (Nice to Have)

10. **076**: User Preferences
11. **081**: Performance Metrics
12. **082**: Loyalty Redemptions
13. **086**: Column Naming
14. **087**: Updated_At Triggers

## Testing Recommendations

Before committing, test:

1. ✅ No SQL syntax errors
2. ✅ No breaking changes to existing functions
3. ✅ RLS policies don't block legitimate access
4. ⚠️ Run on staging first (payment functions are sensitive)

## Deployment Notes

- **Run in order** (074 → 087)
- **Backup database** before applying
- **Test payment recording** after 075
- **Verify RLS policies** after 084 and 085

---

_Created: January 15, 2026_
_Renumbered from previous duplicate migrations (063, 068, 074-084)_
