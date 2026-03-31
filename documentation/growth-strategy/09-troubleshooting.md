# Troubleshooting Guide

> Common issues and solutions for growth strategy systems

## Overview

This guide covers common issues you may encounter with the pre-generation system, ambassador program, and claim flow.

---

## Claim Flow Issues

### Issue: "Clínica no encontrada"

**Symptoms:** User gets 404 error when trying to claim a clinic.

**Causes:**
1. Clinic slug doesn't exist in database
2. Typo in the URL
3. Content files exist but no database record

**Solutions:**

```sql
-- Check if clinic exists
SELECT id, name, status FROM tenants WHERE id = 'clinic-slug';

-- If missing, check if content exists
-- ls .content_data/clinic-slug/

-- If content exists but no DB record, create one
INSERT INTO tenants (id, name, status, is_pregenerated)
VALUES ('clinic-slug', 'Clinic Name', 'pregenerated', true);
```

### Issue: "Esta clínica ya fue reclamada"

**Symptoms:** User can't claim a clinic that should be available.

**Causes:**
1. Someone else already claimed it
2. Status was manually changed
3. Duplicate claim attempt

**Solutions:**

```sql
-- Check current status
SELECT id, name, status, claimed_at, claimed_by FROM tenants WHERE id = 'clinic-slug';

-- If legitimately unclaimed but status wrong, reset
UPDATE tenants
SET status = 'pregenerated', claimed_at = NULL, claimed_by = NULL
WHERE id = 'clinic-slug'
AND claimed_by IS NULL;  -- Safety check
```

### Issue: "Este email ya está registrado"

**Symptoms:** User can't claim because email is in use.

**Causes:**
1. User already has an account
2. Email used for different clinic
3. Previous failed claim attempt left orphan user

**Solutions:**

```sql
-- Check existing user
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'user@email.com';

-- Check existing profile
SELECT id, tenant_id, role FROM profiles WHERE email = 'user@email.com';

-- If orphan user (no profile), delete and retry
-- WARNING: Only do this if user confirms they haven't used the account
DELETE FROM auth.users WHERE email = 'user@email.com'
AND id NOT IN (SELECT id FROM profiles);
```

### Issue: User claimed but can't access dashboard

**Symptoms:** Claim succeeded but dashboard shows "No autorizado".

**Causes:**
1. Profile not created
2. Profile has wrong tenant_id
3. Profile has wrong role

**Solutions:**

```sql
-- Check profile
SELECT * FROM profiles WHERE id = 'user-uuid';

-- If profile missing, create it
INSERT INTO profiles (id, tenant_id, email, role)
SELECT
    u.id,
    u.raw_user_meta_data->>'tenant_id',
    u.email,
    'admin'
FROM auth.users u
WHERE u.email = 'user@email.com';

-- If profile has wrong tenant
UPDATE profiles
SET tenant_id = 'correct-clinic-slug'
WHERE id = 'user-uuid';

-- If profile has wrong role
UPDATE profiles
SET role = 'admin'
WHERE id = 'user-uuid';
```

---

## Ambassador Issues

### Issue: Ambassador can't login

**Symptoms:** Login fails or redirects to register page.

**Causes:**
1. Email not verified
2. Password incorrect
3. User exists but no ambassador record
4. Ambassador status is not 'active'

**Solutions:**

```sql
-- Check user exists
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'amb@email.com';

-- Check ambassador record
SELECT id, user_id, status FROM ambassadors WHERE email = 'amb@email.com';

-- If ambassador record missing user_id, link it
UPDATE ambassadors
SET user_id = (SELECT id FROM auth.users WHERE email = 'amb@email.com')
WHERE email = 'amb@email.com';

-- If status wrong
UPDATE ambassadors SET status = 'active' WHERE email = 'amb@email.com';
```

### Issue: Referral code not working

**Symptoms:** Code validation returns "Código no encontrado".

**Causes:**
1. Code doesn't exist
2. Ambassador is not active
3. Code has typo

**Solutions:**

```sql
-- Search for similar codes (fuzzy match)
SELECT referral_code, full_name, status
FROM ambassadors
WHERE referral_code ILIKE '%PARTIAL%';

-- Check specific code
SELECT a.referral_code, a.full_name, a.status
FROM ambassadors a
WHERE a.referral_code = 'CODE123';

-- Code exists but ambassador inactive
UPDATE ambassadors SET status = 'active'
WHERE referral_code = 'CODE123' AND status = 'pending';
```

### Issue: Commission not credited

**Symptoms:** Clinic converted but ambassador didn't get commission.

**Causes:**
1. `convert_ambassador_referral` function not called
2. Referral record missing
3. Status not updated

**Solutions:**

```sql
-- Find the referral
SELECT * FROM ambassador_referrals WHERE tenant_id = 'clinic-slug';

-- If referral exists but not converted, convert manually
SELECT convert_ambassador_referral(
    'referral-uuid',
    2400000  -- subscription amount
);

-- If referral doesn't exist but should, create it
INSERT INTO ambassador_referrals (ambassador_id, tenant_id, status)
SELECT a.id, 'clinic-slug', 'converted'
FROM ambassadors a WHERE a.referral_code = 'CODE123';

-- Then convert it
SELECT convert_ambassador_referral(
    (SELECT id FROM ambassador_referrals WHERE tenant_id = 'clinic-slug'),
    2400000
);
```

### Issue: Tier not upgrading

**Symptoms:** Ambassador has 5+ conversions but still "embajador" tier.

**Causes:**
1. Trigger didn't fire
2. conversions_count out of sync

**Solutions:**

```sql
-- Check actual conversion count
SELECT a.id, a.tier, a.conversions_count,
    (SELECT COUNT(*) FROM ambassador_referrals ar
     WHERE ar.ambassador_id = a.id AND ar.status = 'converted') as actual_conversions
FROM ambassadors a
WHERE a.id = 'ambassador-uuid';

-- Fix count and tier
UPDATE ambassadors
SET
    conversions_count = (
        SELECT COUNT(*) FROM ambassador_referrals
        WHERE ambassador_id = ambassadors.id AND status = 'converted'
    ),
    tier = CASE
        WHEN (SELECT COUNT(*) FROM ambassador_referrals
              WHERE ambassador_id = ambassadors.id AND status = 'converted') >= 10 THEN 'super'
        WHEN (SELECT COUNT(*) FROM ambassador_referrals
              WHERE ambassador_id = ambassadors.id AND status = 'converted') >= 5 THEN 'promotor'
        ELSE 'embajador'
    END,
    commission_rate = CASE
        WHEN (SELECT COUNT(*) FROM ambassador_referrals
              WHERE ambassador_id = ambassadors.id AND status = 'converted') >= 10 THEN 50.00
        WHEN (SELECT COUNT(*) FROM ambassador_referrals
              WHERE ambassador_id = ambassadors.id AND status = 'converted') >= 5 THEN 40.00
        ELSE 30.00
    END
WHERE id = 'ambassador-uuid';
```

### Issue: Payout request fails

**Symptoms:** "Ya tienes una solicitud de pago pendiente" but no pending request visible.

**Causes:**
1. Hidden pending/approved/processing payout
2. Previous failed payout not properly reset

**Solutions:**

```sql
-- Find all payouts for ambassador
SELECT * FROM ambassador_payouts
WHERE ambassador_id = 'ambassador-uuid'
ORDER BY created_at DESC;

-- If stuck in processing/approved, fail it
UPDATE ambassador_payouts
SET status = 'failed', failure_reason = 'Reset por soporte'
WHERE ambassador_id = 'ambassador-uuid'
AND status IN ('pending', 'approved', 'processing');

-- Reset referral payout status
UPDATE ambassador_referrals
SET payout_status = 'pending', payout_id = NULL
WHERE ambassador_id = 'ambassador-uuid'
AND payout_status = 'scheduled';
```

---

## Bulk Generation Issues

### Issue: Script fails with CSV parse error

**Symptoms:** `Error: Invalid CSV` or similar parse error.

**Causes:**
1. CSV encoding issues (UTF-8 BOM)
2. Unescaped quotes in data
3. Wrong delimiter

**Solutions:**

```bash
# Check file encoding
file leads.csv

# Convert to UTF-8 if needed
iconv -f ISO-8859-1 -t UTF-8 leads.csv > leads_utf8.csv

# Check for BOM and remove
sed -i '1s/^\xEF\xBB\xBF//' leads.csv

# View first few lines to check format
head -5 leads.csv
```

### Issue: Generated sites have wrong theme

**Symptoms:** Emergency clinic has green theme instead of red.

**Causes:**
1. `clinic_type` column has wrong value
2. Case sensitivity issue

**Solutions:**

```bash
# Check CSV values
cut -d',' -f5 leads.csv | sort | uniq

# Fix in CSV - clinic_type must be lowercase:
# general, emergency, specialist, grooming, rural
```

```sql
-- Fix in database
UPDATE tenants
SET clinic_type = 'emergency'
WHERE id = 'clinic-slug';
```

Then regenerate content files:

```bash
# Regenerate single clinic
npx tsx scripts/bulk-generate.ts --source=single.csv --output=.content_data
```

### Issue: Database insert fails

**Symptoms:** `Error: duplicate key value violates unique constraint`

**Causes:**
1. Clinic slug already exists
2. Re-running script without --dry-run

**Solutions:**

```sql
-- Check existing
SELECT id, name, status FROM tenants WHERE id = 'clinic-slug';

-- If pre-generated and want to overwrite
DELETE FROM tenants WHERE id = 'clinic-slug' AND status = 'pregenerated';

-- Or skip duplicates in CSV before running
```

---

## Database Issues

### Issue: RLS blocking queries

**Symptoms:** Queries return empty results when data exists.

**Causes:**
1. Running as authenticated user without proper profile
2. RLS policies too restrictive

**Solutions:**

```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Check profile
SELECT * FROM profiles WHERE id = auth.uid();

-- For admin operations, use service role key in Supabase client
-- Or run directly in SQL editor (bypasses RLS)
```

### Issue: Function doesn't exist

**Symptoms:** `ERROR: function convert_ambassador_referral(uuid, numeric) does not exist`

**Causes:**
1. Migration 061 not applied
2. Function was dropped

**Solutions:**

```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'convert_ambassador_referral';

-- If missing, re-run migration
-- \i web/db/migrations/061_ambassador_program.sql
```

### Issue: Trigger not firing

**Symptoms:** `update_ambassador_tier` trigger doesn't run on conversion.

**Causes:**
1. Trigger not created
2. Wrong trigger condition

**Solutions:**

```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'update_tier_on_conversion';

-- If missing, recreate
CREATE TRIGGER update_tier_on_conversion
    AFTER UPDATE OF status ON ambassador_referrals
    FOR EACH ROW
    WHEN (NEW.status = 'converted' AND OLD.status != 'converted')
    EXECUTE FUNCTION update_ambassador_tier();
```

---

## API Issues

### Issue: 401 Unauthorized on all requests

**Symptoms:** All API calls return 401.

**Causes:**
1. Session expired
2. Cookies not being sent
3. CORS issues

**Solutions:**

```javascript
// Ensure credentials included
fetch('/api/ambassador', {
  credentials: 'include',  // Important!
})

// Check if session exists
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Refresh session
await supabase.auth.refreshSession()
```

### Issue: 500 Internal Server Error

**Symptoms:** API returns 500 with no details.

**Causes:**
1. Database connection failed
2. Missing environment variable
3. Unhandled exception

**Solutions:**

```bash
# Check server logs
# Vercel: vercel logs
# Local: check terminal output

# Check env vars
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: Rate limit exceeded

**Symptoms:** `429 Too Many Requests`

**Causes:**
1. Too many requests in short time
2. Bot/script hammering API

**Solutions:**

```javascript
// Add delay between requests
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

for (const item of items) {
  await processItem(item)
  await delay(1000)  // 1 second between requests
}
```

```sql
-- Check rate limit logs (if using Upstash)
-- Review in Upstash dashboard
```

---

## Content Issues

### Issue: Pre-generated site shows wrong info

**Symptoms:** Clinic name or contact details are incorrect.

**Causes:**
1. Source CSV had wrong data
2. Content files not updated after DB change

**Solutions:**

```bash
# Edit content file directly
nano .content_data/clinic-slug/config.json

# Update the fields, save, and redeploy
git add .content_data/clinic-slug/
git commit -m "Fix clinic info"
git push
```

### Issue: Theme colors not applying

**Symptoms:** Site shows default colors instead of clinic type theme.

**Causes:**
1. `theme.json` has wrong values
2. CSS variables not being read
3. Build cache

**Solutions:**

```bash
# Check theme file
cat .content_data/clinic-slug/theme.json

# Clear build cache
rm -rf .next/

# Rebuild
npm run build
```

### Issue: Services not showing

**Symptoms:** Services page is empty or shows wrong services.

**Causes:**
1. `services.json` missing or malformed
2. Category structure wrong

**Solutions:**

```bash
# Check services file
cat .content_data/clinic-slug/services.json | jq .

# Validate JSON
cat .content_data/clinic-slug/services.json | python -m json.tool

# Compare with template
diff .content_data/clinic-slug/services.json .content_data/_TEMPLATE/services.json
```

---

## Quick Diagnostic Commands

### Health Check Script

```bash
#!/bin/bash
# Save as check-health.sh

echo "=== Growth Strategy Health Check ==="

echo -e "\n--- Database Connection ---"
psql $DATABASE_URL -c "SELECT 1" > /dev/null && echo "✅ Database connected" || echo "❌ Database failed"

echo -e "\n--- Table Counts ---"
psql $DATABASE_URL -t -c "
SELECT 'Tenants (pregenerated)' as table_name, COUNT(*) FROM tenants WHERE is_pregenerated;
SELECT 'Tenants (claimed)' as table_name, COUNT(*) FROM tenants WHERE status = 'claimed';
SELECT 'Tenants (active)' as table_name, COUNT(*) FROM tenants WHERE status = 'active';
SELECT 'Ambassadors (active)' as table_name, COUNT(*) FROM ambassadors WHERE status = 'active';
SELECT 'Ambassadors (pending)' as table_name, COUNT(*) FROM ambassadors WHERE status = 'pending';
SELECT 'Referrals (total)' as table_name, COUNT(*) FROM ambassador_referrals;
SELECT 'Payouts (pending)' as table_name, COUNT(*) FROM ambassador_payouts WHERE status = 'pending';
"

echo -e "\n--- Recent Errors ---"
# Check your logging system

echo -e "\n--- Content Directories ---"
ls -la .content_data/ | head -10

echo -e "\n=== Health Check Complete ==="
```

### Quick Fixes Script

```sql
-- Run these to fix common sync issues

-- 1. Fix ambassador stats
UPDATE ambassadors SET
    referrals_count = COALESCE((SELECT COUNT(*) FROM ambassador_referrals WHERE ambassador_id = ambassadors.id), 0),
    conversions_count = COALESCE((SELECT COUNT(*) FROM ambassador_referrals WHERE ambassador_id = ambassadors.id AND status = 'converted'), 0)
WHERE TRUE;

-- 2. Fix tier assignments
UPDATE ambassadors SET
    tier = CASE
        WHEN conversions_count >= 10 THEN 'super'
        WHEN conversions_count >= 5 THEN 'promotor'
        ELSE 'embajador'
    END,
    commission_rate = CASE
        WHEN conversions_count >= 10 THEN 50.00
        WHEN conversions_count >= 5 THEN 40.00
        ELSE 30.00
    END
WHERE TRUE;

-- 3. Fix pending payout calculations
UPDATE ambassadors SET
    pending_payout = COALESCE((
        SELECT SUM(commission_amount)
        FROM ambassador_referrals
        WHERE ambassador_id = ambassadors.id
        AND status = 'converted'
        AND payout_status = 'pending'
    ), 0)
WHERE TRUE;

-- 4. Expire old pre-generated sites
UPDATE tenants SET status = 'expired'
WHERE status = 'pregenerated'
AND created_at < NOW() - INTERVAL '30 days';
```

---

## Getting Help

If issues persist:

1. Check server logs for detailed error messages
2. Review recent changes in git history
3. Test in isolation (single clinic, single ambassador)
4. Check Supabase Dashboard for database issues
5. Review RLS policies if permission-related

---

*Last updated: January 2026*
