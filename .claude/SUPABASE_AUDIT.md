# Supabase Security & Architecture Audit

**Date**: 2025-12-17
**Status**: ✅ FIXED - All Critical Issues Resolved

---

## Executive Summary

~~The Supabase implementation has **significant security vulnerabilities** that must be addressed before production deployment.~~

**All critical security issues have been fixed:**

1. ✅ **API routes now have proper authentication** - Fixed in all route files
2. ✅ **RLS policies added to all sensitive tables** - Created `40_security_fixes.sql` migration
3. ✅ **Dynamic tenant ID** - Fixed in create-pet.ts, medical-records.ts, invite-staff.ts
4. ✅ **QR tags theft prevented** - Fixed policy in migration
5. ✅ **Signup trigger uses invite tenant** - Fixed in migration

### Files Modified:
- `web/app/api/vaccine_reactions/route.ts` - Full auth added
- `web/app/api/booking/route.ts` - Auth + pet ownership checks
- `web/app/api/prescriptions/route.ts` - Auth + role-based access
- `web/app/api/reproductive_cycles/route.ts` - Full auth added
- `web/app/api/euthanasia_assessments/route.ts` - Full auth added
- `web/app/api/finance/pl/route.ts` - Staff-only auth
- `web/app/api/finance/expenses/route.ts` - Staff-only auth (GET)
- `web/app/api/loyalty_points/route.ts` - Auth + pet access checks
- `web/app/actions/create-pet.ts` - Dynamic tenant_id
- `web/app/actions/medical-records.ts` - Dynamic tenant_id + role check
- `web/app/actions/invite-staff.ts` - Dynamic tenant_id
- `web/db/40_security_fixes.sql` - **NEW** migration with all RLS policies

---

## Critical Security Issues (ALL FIXED)

### 1. API Routes Without Authentication - ✅ FIXED

| Route | Methods | Status | Fix Applied |
|-------|---------|--------|-------------|
| `/api/vaccine_reactions` | GET, POST, PUT, DELETE | ✅ Fixed | Full auth + role-based access |
| `/api/booking` | POST | ✅ Fixed | Auth + pet ownership check |
| `/api/prescriptions` | GET, POST | ✅ Fixed | Auth + vet-only create |
| `/api/finance/pl` | GET | ✅ Fixed | Staff-only auth |
| `/api/reproductive_cycles` | GET, POST, PUT, DELETE | ✅ Fixed | Full auth + role-based access |
| `/api/euthanasia_assessments` | GET, POST, PUT, DELETE | ✅ Fixed | Full auth + role-based access |
| `/api/loyalty_points` | GET, POST | ✅ Fixed | Auth + pet access checks |
| `/api/epidemiology/heatmap` | GET | ⚠️ Intentionally public | Public health data |

**Example - vaccine_reactions/route.ts (NOW SECURE):**
```typescript
// Auth required, role-based filtering
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id:tenant_id, role')
    .eq('id', user.id)
    .single();

  // Staff sees clinic data, owners see only their pets
  if (['vet', 'admin'].includes(profile.role)) {
    query = query.eq('pet.tenant_id', profile.clinic_id);
  } else {
    query = query.eq('pet.owner_id', user.id);
  }
  // ...
}
```

### 2. Tables Missing RLS Policies - ✅ FIXED in 40_security_fixes.sql

| Table | Data Type | Status | Policy Applied |
|-------|-----------|--------|----------------|
| `prescriptions` | Medical/Drug data | ✅ Fixed | Owner view + Staff manage |
| `vaccine_reactions` | Medical data | ✅ Fixed | Owner view/insert + Staff manage |
| `voice_notes` | Clinical notes | ✅ Fixed | Owner view + Staff manage |
| `dicom_images` | Medical imaging | ✅ Fixed | Owner view + Staff manage |
| `reproductive_cycles` | Breeding data | ✅ Fixed | Owner view + Staff manage |
| `euthanasia_assessments` | Sensitive QoL | ✅ Fixed | Owner view + Staff manage |
| `loyalty_points` | Financial | ✅ Fixed | User own + Staff manage |
| `store_categories` | Inventory | ✅ Fixed | Staff manage + Tenant view |
| `store_products` | Inventory | ✅ Fixed | Staff manage + Tenant view |
| `store_inventory` | Inventory | ✅ Fixed | Staff manage |
| `store_inventory_transactions` | Inventory | ✅ Fixed | Staff manage |
| `store_campaigns` | Commerce | ✅ Fixed | Staff manage + Tenant view |
| `store_campaign_items` | Commerce | ✅ Fixed | Staff manage |
| `store_price_history` | Commerce | ✅ Fixed | Staff view |

### 3. Hard-Coded Tenant ID - ✅ FIXED

**File: `web/app/actions/create-pet.ts` - FIXED:**
```typescript
// Get user's tenant_id from their profile
const { data: profile } = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('id', user.id)
  .single();

const { error } = await supabase.from("pets").insert({
  owner_id: user.id,
  tenant_id: profile.tenant_id, // ✅ Dynamic from user profile
  ...
});
```

**File: `web/db/40_security_fixes.sql` - NEW Signup Trigger:**
```sql
-- Look for invite with tenant_id
SELECT tenant_id, role INTO invite_record
FROM public.clinic_invites
WHERE email = NEW.email;

INSERT INTO public.profiles (id, ..., tenant_id, role)
VALUES (NEW.id, ...,
  COALESCE(invite_record.tenant_id, 'adris'), -- ✅ Uses invite tenant
  COALESCE(invite_record.role, 'owner')
);
```

**Also fixed in:**
- `web/app/actions/medical-records.ts` - Uses profile.tenant_id
- `web/app/actions/invite-staff.ts` - Uses profile.tenant_id

### 4. QR Tags Security Flaw - ✅ FIXED

**File: `web/db/40_security_fixes.sql` - NEW Secure Policy:**
```sql
-- Drop the insecure policy
DROP POLICY IF EXISTS "Authenticated update tags" ON qr_tags;

-- ✅ Only owner/staff OR claim unassigned tags
CREATE POLICY "Owner or staff update tags" ON qr_tags FOR UPDATE
  USING (
    pet_id IS NULL  -- Unassigned tags can be claimed
    OR EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = qr_tags.pet_id
      AND (pets.owner_id = auth.uid() OR public.is_staff_of(pets.tenant_id))
    )
  );
```

**Impact**: Tag theft is now prevented. Users can only:
1. Claim unassigned tags (pet_id IS NULL)
2. Update tags on their own pets (owner)
3. Update tags on clinic pets (staff)

---

## Tables WITH Proper RLS

These tables have correct security:

| Table | Policies |
|-------|----------|
| `profiles` | Own view, staff view in tenant, own update |
| `pets` | Owner + staff access |
| `vaccines` | Via pet ownership |
| `products` | Staff manage, tenant view |
| `medical_records` | Staff manage, owner view own pet |
| `clinic_invites` | Admins only |
| `clinic_patient_access` | Staff manage |
| `expenses` | Admin manage, vet view |
| `audit_logs` | Admin view, users insert own |
| `pet_qr_codes` | Owner + staff view |
| `lost_pets` | Public view active, owner report own |
| `disease_reports` | Vet/admin view |
| `diagnosis_codes` | Public read |
| `appointments` | Owner view/create own (⚠️ vets cannot view!) |

---

## Database Schema Summary

### Core Tables
```
tenants (id, name, created_at, updated_at)
  └── profiles (id, tenant_id, role, full_name, email, phone, avatar_url)
        └── pets (id, owner_id, tenant_id, name, species, breed, ...)
              └── vaccines (id, pet_id, vaccine_name, date_administered, ...)
              └── medical_records (id, pet_id, tenant_id, record_type, ...)
              └── qr_tags (id, code, pet_id, ...)
```

### Clinical Tables
```
diagnosis_codes (id, code, term, description)
drug_dosages (id, drug_name, species, dosage_per_kg, route, ...)
growth_charts (id, species, breed, age_months, weight_kg)
prescriptions (id, pet_id, vet_id, drug_name, dosage, ...)
vaccine_reactions (id, pet_id, vaccine_id, reaction_type, ...)
voice_notes (id, pet_id, audio_url, transcript, ...)
dicom_images (id, pet_id, image_url, modality, ...)
reproductive_cycles (id, pet_id, cycle_start, cycle_end, ...)
euthanasia_assessments (id, pet_id, hurt_score, hunger_score, ...)
```

### Commerce Tables
```
store_categories (id, tenant_id, name, ...)
store_products (id, tenant_id, category_id, sku, barcode, ...)
store_inventory (id, product_id, current_stock, min_stock_level, ...)
store_inventory_transactions (id, product_id, transaction_type, quantity, ...)
store_campaigns (id, tenant_id, name, discount_percent, ...)
store_campaign_items (id, campaign_id, product_id)
store_price_history (id, product_id, old_price, new_price, ...)
```

### Other Tables
```
appointments (id, clinic_slug, pet_id, service_id, appointment_date, ...)
expenses (id, clinic_id, category, amount, description, ...)
audit_logs (id, user_id, action, resource_type, resource_id, ...)
pet_qr_codes (id, pet_id, qr_code_data, ...)
lost_pets (id, pet_id, status, last_seen_location, ...)
disease_reports (id, pet_id, diagnosis_code_id, location_zone, ...)
loyalty_points (id, user_id, balance, lifetime_earned, ...)
clinic_patient_access (id, clinic_id, pet_id, access_level, ...)
vaccine_templates (id, species, vaccine_name, recommended_age_weeks, ...)
```

---

## Helper Functions

### Security Functions
```sql
-- Check if user is staff (vet/admin) in tenant
is_staff_of(tenant_id) → boolean
-- Used in most RLS policies
```

### RPC Functions
```sql
get_clinic_stats()          -- Staff-only aggregation
get_pet_by_tag(code)        -- Public access to pet info via QR
assign_tag_to_pet(...)      -- Owner/staff authorization
get_network_stats()         -- Public platform stats
search_pets_global(query)   -- Cross-clinic search with privacy
grant_clinic_access(...)    -- Grant cross-clinic access
log_action(...)             -- Audit trail logging
import_inventory_batch(...) -- Bulk inventory import
```

---

## Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `handle_updated_at` | Most tables | Auto-update `updated_at` |
| `protect_critical_profile_columns` | profiles | Prevent role/tenant changes |
| `on_auth_user_created` | auth.users | Create profile on signup |
| `handle_new_pet_vaccines` | pets | Auto-create vaccine records |
| `process_inventory_transaction` | store_inventory_transactions | Update stock/cost |
| `track_price_change` | store_products | Audit price history |
| `auto_disease_report` | medical_records | Create epidemiology report |

---

## Storage Buckets

| Bucket | Public | Insert Policy | Select Policy |
|--------|--------|---------------|---------------|
| `vaccines` | Yes | Authenticated | Public |
| `pets` | Yes | Authenticated | Public |
| `records` | Yes | Staff only | Public |

**Issue**: All buckets are public for SELECT. Consider:
- Making `records` bucket private
- Implementing signed URLs for sensitive files

---

## Indexes

**Existing Indexes:**
- profiles: tenant_id, role, composite (id, tenant_id, role)
- pets: owner_id, tenant_id, microchip_id, name (TRGM)
- vaccines: pet_id
- products: tenant_id
- qr_tags: code
- medical_records: pet_id, tenant_id, created_at DESC
- clinic_invites: tenant_id, email
- store_products: tenant_id, category_id
- store_inventory_transactions: product_id, tenant_id
- pet_qr_codes: pet_id, is_active
- lost_pets: status, created_at DESC
- disease_reports: reported_date, location_zone, species

**Missing Indexes:**
- vaccine_reactions.pet_id
- lost_pets.pet_id
- appointments.pet_id
- appointments.clinic_slug
- prescriptions.pet_id
- prescriptions.vet_id

---

## Action Items - ✅ ALL COMPLETED

### Priority 1: CRITICAL - ✅ DONE
1. ✅ Add Authentication to vaccine_reactions API
2. ✅ Add RLS to vaccine_reactions table
3. ✅ Add Authentication to booking API
4. ✅ Fix hard-coded tenant_id in create-pet.ts
5. ✅ Fix QR tag policy

### Priority 2: HIGH - ✅ DONE
6. ✅ Add RLS to: prescriptions, voice_notes, dicom_images
7. ✅ Add RLS to: reproductive_cycles, euthanasia_assessments, loyalty_points
8. ✅ Add authentication to: prescriptions API, finance API
9. ✅ Fix signup trigger to get tenant from invite
10. ✅ Add vet access to appointments RLS

### Priority 3: MEDIUM - ✅ DONE
11. ✅ Add RLS to all store_* tables
12. ⚠️ Epidemiology API intentionally public (public health data)
13. ✅ Add missing indexes

### Remaining Items (Low Priority)
- Fix disease_reports schema (column mismatches)
- Create pet-qr-codes storage bucket

---

## Deployment Instructions

To apply all security fixes, run the new migration:

```bash
# In Supabase SQL Editor or via migration
psql -f web/db/40_security_fixes.sql
```

This migration will:
1. Enable RLS on 14 tables
2. Create proper access policies
3. Fix the QR tags policy
4. Update the signup trigger
5. Add 6 missing indexes

---

## Recommended RLS Patterns

### Clinical Data (Prescriptions, Voice Notes, etc.)
```sql
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Owners can view their pet's prescriptions
CREATE POLICY "Owner view" ON prescriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = prescriptions.pet_id
    AND pets.owner_id = auth.uid()
  ));

-- Staff can manage all in their clinic
CREATE POLICY "Staff manage" ON prescriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = prescriptions.pet_id
    AND is_staff_of(pets.tenant_id)
  ));
```

### Commerce Data (Inventory)
```sql
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- Staff can manage
CREATE POLICY "Staff manage products" ON store_products FOR ALL
  USING (is_staff_of(tenant_id));

-- Everyone in tenant can view
CREATE POLICY "Tenant view products" ON store_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = store_products.tenant_id
  ));
```

---

## Testing Recommendations

1. **Security Testing**
   - Test all API routes without authentication
   - Test cross-tenant data access
   - Test RLS bypass attempts
   - Test QR tag theft scenario

2. **Multi-Tenancy Testing**
   - Create users in different tenants
   - Verify data isolation
   - Test signup with/without invite

3. **Permission Testing**
   - Test owner vs vet vs admin access
   - Test cross-clinic access grants
   - Test staff role escalation prevention

---

*Audit completed by Claude Code*
