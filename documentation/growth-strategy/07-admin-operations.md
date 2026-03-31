# Admin Operations Guide

> Manual operations for managing growth strategy systems

## Overview

This guide covers administrative operations that aren't (yet) automated in the admin UI. All operations require database access via Supabase Dashboard SQL Editor or direct PostgreSQL connection.

---

## Ambassador Management

### Approve Ambassador

When a new ambassador registers, their status is `pending`. Approve them to activate their account.

```sql
-- Approve ambassador by email
UPDATE ambassadors
SET
    status = 'active',
    approved_by = 'admin@vetic.com',  -- Your admin identifier
    approved_at = NOW(),
    updated_at = NOW()
WHERE email = 'juan@universidad.edu.py'
AND status = 'pending';

-- Verify approval
SELECT id, email, full_name, status, referral_code, approved_at
FROM ambassadors
WHERE email = 'juan@universidad.edu.py';
```

### Reject Ambassador

```sql
-- Reject with reason
UPDATE ambassadors
SET
    status = 'inactive',
    notes = 'Información incompleta - solicitar más detalles',
    updated_at = NOW()
WHERE email = 'suspicious@email.com'
AND status = 'pending';
```

### Suspend Ambassador

Temporarily disable an ambassador (e.g., for policy violations).

```sql
UPDATE ambassadors
SET
    status = 'suspended',
    notes = 'Suspendido por: [razón]',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### View Pending Approvals

```sql
SELECT
    id,
    full_name,
    email,
    phone,
    type,
    university,
    institution,
    created_at
FROM ambassadors
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### Manually Upgrade Tier

Force tier upgrade (e.g., for special arrangements).

```sql
UPDATE ambassadors
SET
    tier = 'promotor',
    commission_rate = 40.00,
    notes = 'Upgrade manual por acuerdo especial',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### Reset Ambassador Stats

If stats get out of sync (debugging only).

```sql
-- Recalculate from actual referrals
UPDATE ambassadors a
SET
    referrals_count = (
        SELECT COUNT(*) FROM ambassador_referrals ar WHERE ar.ambassador_id = a.id
    ),
    conversions_count = (
        SELECT COUNT(*) FROM ambassador_referrals ar
        WHERE ar.ambassador_id = a.id AND ar.status = 'converted'
    ),
    total_earned = (
        SELECT COALESCE(SUM(commission_amount), 0) FROM ambassador_referrals ar
        WHERE ar.ambassador_id = a.id AND ar.status = 'converted'
    ),
    pending_payout = (
        SELECT COALESCE(SUM(commission_amount), 0) FROM ambassador_referrals ar
        WHERE ar.ambassador_id = a.id
        AND ar.status = 'converted'
        AND ar.payout_status = 'pending'
    ),
    updated_at = NOW()
WHERE a.id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## Payout Processing

### View Pending Payouts

```sql
SELECT
    p.id,
    a.full_name,
    a.email,
    p.amount,
    p.bank_name,
    p.bank_account,
    p.bank_holder_name,
    p.created_at,
    array_length(p.referral_ids, 1) as referral_count
FROM ambassador_payouts p
JOIN ambassadors a ON a.id = p.ambassador_id
WHERE p.status = 'pending'
ORDER BY p.created_at ASC;
```

### Approve Payout

```sql
UPDATE ambassador_payouts
SET
    status = 'approved',
    approved_by = 'admin@vetic.com',
    approved_at = NOW(),
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440010';
```

### Process Payout (Mark as Processing)

After initiating bank transfer.

```sql
UPDATE ambassador_payouts
SET
    status = 'processing',
    processed_at = NOW(),
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440010';
```

### Complete Payout

After confirming bank transfer succeeded.

```sql
-- Start transaction for consistency
BEGIN;

-- Mark payout as completed
UPDATE ambassador_payouts
SET
    status = 'completed',
    transfer_reference = 'TRF-2026-001234',  -- Bank reference
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440010';

-- Update ambassador's totals
UPDATE ambassadors
SET
    total_paid = total_paid + (
        SELECT amount FROM ambassador_payouts
        WHERE id = '550e8400-e29b-41d4-a716-446655440010'
    ),
    pending_payout = pending_payout - (
        SELECT amount FROM ambassador_payouts
        WHERE id = '550e8400-e29b-41d4-a716-446655440010'
    ),
    updated_at = NOW()
WHERE id = (
    SELECT ambassador_id FROM ambassador_payouts
    WHERE id = '550e8400-e29b-41d4-a716-446655440010'
);

-- Mark referrals as paid
UPDATE ambassador_referrals
SET
    payout_status = 'paid',
    paid_at = NOW(),
    updated_at = NOW()
WHERE payout_id = '550e8400-e29b-41d4-a716-446655440010';

COMMIT;
```

### Fail Payout

If bank transfer fails.

```sql
BEGIN;

-- Mark payout as failed
UPDATE ambassador_payouts
SET
    status = 'failed',
    failure_reason = 'Cuenta bancaria inválida',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440010';

-- Reset referral payout status so they can request again
UPDATE ambassador_referrals
SET
    payout_status = 'pending',
    payout_id = NULL,
    updated_at = NOW()
WHERE payout_id = '550e8400-e29b-41d4-a716-446655440010';

COMMIT;
```

---

## Referral Management

### Manually Convert Referral

When a clinic subscribes, convert their referral to credit commission.

```sql
-- Find the referral
SELECT ar.id, ar.ambassador_id, ar.tenant_id, ar.status, a.commission_rate
FROM ambassador_referrals ar
JOIN ambassadors a ON a.id = ar.ambassador_id
WHERE ar.tenant_id = 'veterinaria-abc';

-- Convert with subscription amount
SELECT convert_ambassador_referral(
    '550e8400-e29b-41d4-a716-446655440001',  -- referral_id
    2400000  -- subscription amount (Gs)
);
```

### Mark Trial Started

When referred clinic starts their trial.

```sql
UPDATE ambassador_referrals
SET
    status = 'trial_started',
    trial_started_at = NOW(),
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440001';
```

### Expire Old Referrals

Mark referrals as expired if trial ended without conversion.

```sql
UPDATE ambassador_referrals
SET
    status = 'expired',
    updated_at = NOW()
WHERE status = 'trial_started'
AND trial_started_at < NOW() - INTERVAL '120 days';  -- 4 months trial max
```

### Cancel Referral

If clinic cancels before conversion.

```sql
BEGIN;

-- Cancel referral
UPDATE ambassador_referrals
SET
    status = 'cancelled',
    updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Decrement ambassador's count
UPDATE ambassadors
SET
    referrals_count = referrals_count - 1,
    updated_at = NOW()
WHERE id = (
    SELECT ambassador_id FROM ambassador_referrals
    WHERE id = '550e8400-e29b-41d4-a716-446655440001'
);

COMMIT;
```

---

## Pre-Generated Clinic Management

### View Unclaimed Clinics

```sql
SELECT
    id,
    name,
    phone,
    zone,
    clinic_type,
    google_rating,
    created_at,
    NOW() - created_at as age
FROM tenants
WHERE status = 'pregenerated'
AND is_pregenerated = TRUE
ORDER BY created_at DESC;
```

### Expire Old Pre-Generated Sites

```sql
UPDATE tenants
SET
    status = 'expired',
    updated_at = NOW()
WHERE status = 'pregenerated'
AND is_pregenerated = TRUE
AND created_at < NOW() - INTERVAL '30 days';
```

### Re-Activate Expired Site

If a clinic contacts you after expiration.

```sql
UPDATE tenants
SET
    status = 'pregenerated',
    updated_at = NOW()
WHERE id = 'veterinaria-abc'
AND status = 'expired';
```

### Delete Pre-Generated Site

Completely remove a pre-generated site.

```sql
-- Only delete if never claimed
DELETE FROM tenants
WHERE id = 'veterinaria-abc'
AND status IN ('pregenerated', 'expired')
AND claimed_at IS NULL;

-- Also remove content files manually:
-- rm -rf .content_data/veterinaria-abc/
```

### Change Clinic Type

Update template type for existing pre-generated site.

```sql
UPDATE tenants
SET
    clinic_type = 'emergency',
    updated_at = NOW()
WHERE id = 'veterinaria-abc';

-- Note: Also update .content_data/veterinaria-abc/theme.json
-- and services.json manually to match new type
```

---

## Bulk Operations

### Approve All Pending Ambassadors

Use with caution - review list first.

```sql
-- First, review
SELECT * FROM ambassadors WHERE status = 'pending';

-- Then approve all
UPDATE ambassadors
SET
    status = 'active',
    approved_by = 'bulk-approval-2026-01-07',
    approved_at = NOW(),
    updated_at = NOW()
WHERE status = 'pending';
```

### Process All Approved Payouts

After bank transfers complete.

```sql
-- List of payouts to process
SELECT id, amount, bank_name, bank_account
FROM ambassador_payouts
WHERE status = 'approved';

-- Update to processing
UPDATE ambassador_payouts
SET
    status = 'processing',
    processed_at = NOW(),
    updated_at = NOW()
WHERE status = 'approved';
```

### Send Notification Batch

Generate list for email/WhatsApp notifications.

```sql
-- Pending ambassador approvals (to notify admin)
SELECT full_name, email, created_at
FROM ambassadors
WHERE status = 'pending'
AND created_at > NOW() - INTERVAL '24 hours';

-- Expiring pre-generated sites (to contact clinics)
SELECT id, name, phone, zone
FROM tenants
WHERE status = 'pregenerated'
AND created_at BETWEEN NOW() - INTERVAL '25 days' AND NOW() - INTERVAL '20 days';
```

---

## Data Exports

### Export Ambassador Performance Report

```sql
COPY (
    SELECT
        a.full_name,
        a.email,
        a.type,
        a.tier,
        a.referrals_count,
        a.conversions_count,
        a.total_earned,
        a.pending_payout,
        a.created_at
    FROM ambassadors a
    WHERE a.status = 'active'
    ORDER BY a.conversions_count DESC
) TO '/tmp/ambassador_report.csv' WITH CSV HEADER;
```

### Export Pre-Generation Campaign Results

```sql
COPY (
    SELECT
        t.name as clinic_name,
        t.phone,
        t.zone,
        t.clinic_type,
        t.status,
        t.created_at as generated_at,
        t.claimed_at,
        CASE
            WHEN t.claimed_at IS NOT NULL THEN t.claimed_at - t.created_at
            ELSE NULL
        END as time_to_claim
    FROM tenants t
    WHERE t.is_pregenerated = TRUE
    ORDER BY t.created_at DESC
) TO '/tmp/pregeneration_report.csv' WITH CSV HEADER;
```

### Export Payout History

```sql
COPY (
    SELECT
        a.full_name as ambassador,
        p.amount,
        p.status,
        p.bank_name,
        p.bank_account,
        p.created_at as requested_at,
        p.completed_at,
        p.transfer_reference
    FROM ambassador_payouts p
    JOIN ambassadors a ON a.id = p.ambassador_id
    ORDER BY p.created_at DESC
) TO '/tmp/payout_history.csv' WITH CSV HEADER;
```

---

## Maintenance Tasks

### Daily Tasks

```sql
-- 1. Check for pending ambassador approvals
SELECT COUNT(*) as pending_ambassadors
FROM ambassadors WHERE status = 'pending';

-- 2. Check for pending payouts
SELECT COUNT(*) as pending_payouts, SUM(amount) as total_pending
FROM ambassador_payouts WHERE status IN ('pending', 'approved');

-- 3. Check for expiring pre-generated sites
SELECT COUNT(*) as expiring_soon
FROM tenants
WHERE status = 'pregenerated'
AND created_at < NOW() - INTERVAL '25 days';
```

### Weekly Tasks

```sql
-- 1. Expire old pre-generated sites
UPDATE tenants
SET status = 'expired', updated_at = NOW()
WHERE status = 'pregenerated'
AND created_at < NOW() - INTERVAL '30 days';

-- 2. Expire old trial referrals
UPDATE ambassador_referrals
SET status = 'expired', updated_at = NOW()
WHERE status = 'trial_started'
AND trial_started_at < NOW() - INTERVAL '120 days';

-- 3. Update ambassador tiers (if trigger missed)
UPDATE ambassadors
SET
    tier = CASE
        WHEN conversions_count >= 10 THEN 'super'
        WHEN conversions_count >= 5 THEN 'promotor'
        ELSE 'embajador'
    END,
    commission_rate = CASE
        WHEN conversions_count >= 10 THEN 50.00
        WHEN conversions_count >= 5 THEN 40.00
        ELSE 30.00
    END,
    updated_at = NOW()
WHERE tier != CASE
    WHEN conversions_count >= 10 THEN 'super'
    WHEN conversions_count >= 5 THEN 'promotor'
    ELSE 'embajador'
END;
```

### Monthly Tasks

```sql
-- 1. Generate conversion report
SELECT
    DATE_TRUNC('month', claimed_at) as month,
    COUNT(*) as clinics_claimed,
    COUNT(*) FILTER (WHERE status = 'active') as converted_to_paid
FROM tenants
WHERE is_pregenerated = TRUE AND claimed_at IS NOT NULL
GROUP BY DATE_TRUNC('month', claimed_at)
ORDER BY month DESC
LIMIT 12;

-- 2. Ambassador leaderboard
SELECT
    full_name,
    tier,
    conversions_count,
    total_earned
FROM ambassadors
WHERE status = 'active'
ORDER BY conversions_count DESC
LIMIT 10;

-- 3. Payout summary
SELECT
    DATE_TRUNC('month', completed_at) as month,
    COUNT(*) as payout_count,
    SUM(amount) as total_paid
FROM ambassador_payouts
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', completed_at)
ORDER BY month DESC
LIMIT 12;
```

---

## Emergency Operations

### Disable Ambassador Program

If you need to temporarily shut down registrations.

```sql
-- This disables code validation
UPDATE ambassadors SET status = 'suspended' WHERE status = 'active';

-- To re-enable
UPDATE ambassadors SET status = 'active' WHERE status = 'suspended';
```

### Pause All Payouts

```sql
UPDATE ambassador_payouts
SET
    status = 'pending',
    notes = COALESCE(notes, '') || ' [Paused on ' || NOW()::date || ']',
    updated_at = NOW()
WHERE status IN ('approved', 'processing');
```

### Audit Trail Query

Find all changes to an ambassador account.

```sql
-- If you have audit_logs table
SELECT *
FROM audit_logs
WHERE resource = 'ambassadors'
AND details->>'ambassador_id' = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;
```

---

## Checklist: New Ambassador Approval

1. [ ] Review registration info (name, email, type, university)
2. [ ] Verify email domain is legitimate
3. [ ] Check for duplicate registrations
4. [ ] Approve in database
5. [ ] Send welcome email with referral code
6. [ ] Add to ambassador communication group (WhatsApp/Slack)

## Checklist: Payout Processing

1. [ ] Review payout request in database
2. [ ] Verify bank details are complete
3. [ ] Check referral conversions are legitimate
4. [ ] Approve payout in database
5. [ ] Initiate bank transfer
6. [ ] Update status to `processing`
7. [ ] Confirm transfer completed
8. [ ] Update status to `completed` with reference
9. [ ] Notify ambassador of payment

---

*Last updated: January 2026*
