# Metrics & Analytics

> Tracking success of the growth strategy

## Overview

This document defines the key metrics for measuring growth strategy success and provides SQL queries to calculate them.

---

## Key Performance Indicators (KPIs)

### Primary KPIs

| Metric | Target | Description |
|--------|--------|-------------|
| **Monthly Active Clinics** | 100 in 6 months | Clinics with activity in last 30 days |
| **Trial-to-Paid Conversion** | 40% | % of trials that become paying |
| **Ambassador Conversion Rate** | 40% | % of referrals that convert |
| **Claim Rate** | 15% | % of pre-generated sites claimed |
| **Monthly Recurring Revenue** | Gs 20M/month | Total monthly subscription revenue |

### Secondary KPIs

| Metric | Target | Description |
|--------|--------|-------------|
| Response Rate (DMs) | >10% | % of cold DMs that get responses |
| Time to Claim | <7 days | Average days from generation to claim |
| Ambassador Retention | >80% | % of ambassadors active after 3 months |
| Payout Processing Time | <5 days | Days from request to completed |
| Customer LTV | Gs 4.3M | Lifetime value per clinic |

---

## Dashboard Queries

### Overview Metrics

```sql
-- Summary dashboard
SELECT
    -- Clinics
    (SELECT COUNT(*) FROM tenants WHERE status = 'active') as active_clinics,
    (SELECT COUNT(*) FROM tenants WHERE status = 'claimed') as in_trial,
    (SELECT COUNT(*) FROM tenants WHERE is_pregenerated AND status = 'pregenerated') as unclaimed_pregenerated,

    -- Ambassadors
    (SELECT COUNT(*) FROM ambassadors WHERE status = 'active') as active_ambassadors,
    (SELECT COUNT(*) FROM ambassadors WHERE status = 'pending') as pending_ambassadors,

    -- Referrals this month
    (SELECT COUNT(*) FROM ambassador_referrals
     WHERE referred_at >= DATE_TRUNC('month', NOW())) as referrals_this_month,

    -- Conversions this month
    (SELECT COUNT(*) FROM ambassador_referrals
     WHERE status = 'converted'
     AND converted_at >= DATE_TRUNC('month', NOW())) as conversions_this_month,

    -- Pending payouts
    (SELECT COALESCE(SUM(pending_payout), 0) FROM ambassadors) as total_pending_payouts;
```

### Clinic Funnel

```sql
-- Pre-generation to paid funnel
WITH funnel AS (
    SELECT
        COUNT(*) FILTER (WHERE is_pregenerated) as generated,
        COUNT(*) FILTER (WHERE is_pregenerated AND status IN ('claimed', 'active')) as claimed,
        COUNT(*) FILTER (WHERE is_pregenerated AND status = 'active') as converted
    FROM tenants
)
SELECT
    generated,
    claimed,
    converted,
    ROUND(claimed * 100.0 / NULLIF(generated, 0), 2) as claim_rate,
    ROUND(converted * 100.0 / NULLIF(claimed, 0), 2) as conversion_rate,
    ROUND(converted * 100.0 / NULLIF(generated, 0), 2) as overall_rate
FROM funnel;
```

### Ambassador Funnel

```sql
-- Referral to conversion funnel
WITH funnel AS (
    SELECT
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE status IN ('trial_started', 'converted')) as trials_started,
        COUNT(*) FILTER (WHERE status = 'converted') as converted
    FROM ambassador_referrals
)
SELECT
    total_referrals,
    trials_started,
    converted,
    ROUND(trials_started * 100.0 / NULLIF(total_referrals, 0), 2) as trial_rate,
    ROUND(converted * 100.0 / NULLIF(trials_started, 0), 2) as conversion_rate,
    ROUND(converted * 100.0 / NULLIF(total_referrals, 0), 2) as overall_rate
FROM funnel;
```

---

## Time-Series Metrics

### Weekly Growth

```sql
-- Clinics by week
SELECT
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) FILTER (WHERE is_pregenerated) as generated,
    COUNT(*) FILTER (WHERE claimed_at IS NOT NULL) as claimed,
    COUNT(*) FILTER (WHERE status = 'active') as active
FROM tenants
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

### Monthly Ambassador Performance

```sql
SELECT
    DATE_TRUNC('month', ar.referred_at) as month,
    COUNT(DISTINCT ar.ambassador_id) as active_ambassadors,
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE ar.status = 'converted') as conversions,
    COALESCE(SUM(ar.commission_amount) FILTER (WHERE ar.status = 'converted'), 0) as commissions_earned
FROM ambassador_referrals ar
WHERE ar.referred_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', ar.referred_at)
ORDER BY month DESC;
```

### Daily Activity

```sql
-- Last 30 days activity
SELECT
    DATE(created_at) as date,
    (SELECT COUNT(*) FROM tenants WHERE DATE(created_at) = d.date AND is_pregenerated) as sites_generated,
    (SELECT COUNT(*) FROM tenants WHERE DATE(claimed_at) = d.date) as sites_claimed,
    (SELECT COUNT(*) FROM ambassadors WHERE DATE(created_at) = d.date) as ambassador_signups,
    (SELECT COUNT(*) FROM ambassador_referrals WHERE DATE(referred_at) = d.date) as referrals
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    '1 day'::interval
) as d(date)
ORDER BY date DESC;
```

---

## Conversion Metrics

### Trial to Paid Analysis

```sql
-- Conversion by source
SELECT
    CASE
        WHEN referred_by_ambassador_id IS NOT NULL THEN 'Ambassador'
        WHEN is_pregenerated THEN 'Pre-Generated'
        ELSE 'Direct Signup'
    END as source,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as converted,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'active') * 100.0 / COUNT(*),
        2
    ) as conversion_rate
FROM tenants
WHERE status IN ('claimed', 'active')
GROUP BY 1
ORDER BY conversion_rate DESC;
```

### Time to Conversion

```sql
-- Average days from claim to conversion
SELECT
    AVG(
        EXTRACT(EPOCH FROM (plan_expires_at - claimed_at)) / 86400
    )::int as avg_days_in_trial,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (plan_expires_at - claimed_at)) / 86400
    )::int as median_days_in_trial
FROM tenants
WHERE status = 'active'
AND claimed_at IS NOT NULL
AND plan_expires_at IS NOT NULL;
```

### Claim Speed

```sql
-- Time from pre-generation to claim
SELECT
    zone,
    COUNT(*) as total_claimed,
    AVG(EXTRACT(EPOCH FROM (claimed_at - created_at)) / 86400)::int as avg_days_to_claim,
    MIN(EXTRACT(EPOCH FROM (claimed_at - created_at)) / 86400)::int as min_days,
    MAX(EXTRACT(EPOCH FROM (claimed_at - created_at)) / 86400)::int as max_days
FROM tenants
WHERE is_pregenerated = TRUE
AND claimed_at IS NOT NULL
GROUP BY zone
ORDER BY avg_days_to_claim;
```

---

## Ambassador Metrics

### Leaderboard

```sql
SELECT
    ROW_NUMBER() OVER (ORDER BY conversions_count DESC, total_earned DESC) as rank,
    full_name,
    tier,
    referrals_count,
    conversions_count,
    ROUND(conversions_count * 100.0 / NULLIF(referrals_count, 0), 1) as conversion_rate,
    total_earned,
    pending_payout
FROM ambassadors
WHERE status = 'active'
ORDER BY conversions_count DESC, total_earned DESC
LIMIT 20;
```

### Tier Distribution

```sql
SELECT
    tier,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage,
    SUM(referrals_count) as total_referrals,
    SUM(conversions_count) as total_conversions,
    SUM(total_earned) as total_earned
FROM ambassadors
WHERE status = 'active'
GROUP BY tier
ORDER BY
    CASE tier
        WHEN 'super' THEN 1
        WHEN 'promotor' THEN 2
        WHEN 'embajador' THEN 3
    END;
```

### Ambassador Type Performance

```sql
SELECT
    type,
    COUNT(*) as ambassadors,
    SUM(referrals_count) as total_referrals,
    SUM(conversions_count) as total_conversions,
    ROUND(
        SUM(conversions_count) * 100.0 / NULLIF(SUM(referrals_count), 0),
        1
    ) as conversion_rate,
    ROUND(AVG(conversions_count), 1) as avg_conversions_per_ambassador
FROM ambassadors
WHERE status = 'active'
GROUP BY type
ORDER BY total_conversions DESC;
```

### Ambassador Retention

```sql
-- Ambassadors active in each month after signup
WITH ambassador_months AS (
    SELECT
        a.id,
        EXTRACT(MONTH FROM AGE(NOW(), a.created_at)) as months_since_signup,
        (SELECT COUNT(*) FROM ambassador_referrals ar
         WHERE ar.ambassador_id = a.id
         AND ar.referred_at >= a.created_at + (m.month || ' months')::interval
         AND ar.referred_at < a.created_at + ((m.month + 1) || ' months')::interval
        ) as referrals_in_month
    FROM ambassadors a
    CROSS JOIN generate_series(0, 5) as m(month)
    WHERE a.status = 'active'
)
SELECT
    months_since_signup as month,
    COUNT(*) as total_ambassadors,
    COUNT(*) FILTER (WHERE referrals_in_month > 0) as active_ambassadors,
    ROUND(
        COUNT(*) FILTER (WHERE referrals_in_month > 0) * 100.0 / COUNT(*),
        1
    ) as retention_rate
FROM ambassador_months
GROUP BY months_since_signup
ORDER BY month;
```

---

## Financial Metrics

### Revenue by Source

```sql
-- Approximate MRR by acquisition source
SELECT
    CASE
        WHEN referred_by_ambassador_id IS NOT NULL THEN 'Ambassador'
        WHEN is_pregenerated THEN 'Pre-Generated'
        ELSE 'Direct'
    END as source,
    COUNT(*) as clinics,
    COUNT(*) * 200000 as estimated_mrr  -- Gs 200K/month equivalent
FROM tenants
WHERE status = 'active'
GROUP BY 1
ORDER BY estimated_mrr DESC;
```

### Commission Costs

```sql
-- Commission liability
SELECT
    DATE_TRUNC('month', converted_at) as month,
    COUNT(*) as conversions,
    SUM(commission_amount) as total_commissions,
    SUM(commission_amount) FILTER (WHERE payout_status = 'pending') as pending,
    SUM(commission_amount) FILTER (WHERE payout_status = 'paid') as paid
FROM ambassador_referrals
WHERE status = 'converted'
GROUP BY DATE_TRUNC('month', converted_at)
ORDER BY month DESC
LIMIT 6;
```

### Payout Processing

```sql
-- Payout statistics
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as requests,
    SUM(amount) as total_requested,
    AVG(
        CASE WHEN completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400
        END
    )::int as avg_processing_days
FROM ambassador_payouts
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

---

## Geographic Metrics

### Performance by Zone

```sql
SELECT
    zone,
    COUNT(*) FILTER (WHERE is_pregenerated AND status = 'pregenerated') as unclaimed,
    COUNT(*) FILTER (WHERE status = 'claimed') as in_trial,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    ROUND(
        COUNT(*) FILTER (WHERE status IN ('claimed', 'active')) * 100.0 /
        NULLIF(COUNT(*) FILTER (WHERE is_pregenerated), 0),
        1
    ) as claim_rate
FROM tenants
WHERE zone IS NOT NULL
GROUP BY zone
ORDER BY active DESC, claim_rate DESC;
```

### Clinic Type Distribution

```sql
SELECT
    clinic_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'active') * 100.0 / COUNT(*),
        1
    ) as conversion_rate
FROM tenants
WHERE is_pregenerated = TRUE
GROUP BY clinic_type
ORDER BY total DESC;
```

---

## Cohort Analysis

### Monthly Claim Cohorts

```sql
-- Track cohorts by claim month
WITH cohorts AS (
    SELECT
        DATE_TRUNC('month', claimed_at) as cohort_month,
        id,
        status
    FROM tenants
    WHERE claimed_at IS NOT NULL
)
SELECT
    cohort_month,
    COUNT(*) as cohort_size,
    COUNT(*) FILTER (WHERE status = 'active') as converted,
    COUNT(*) FILTER (WHERE status = 'claimed') as still_trial,
    COUNT(*) FILTER (WHERE status = 'suspended') as churned,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'active') * 100.0 / COUNT(*),
        1
    ) as conversion_rate
FROM cohorts
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

### Ambassador Cohorts

```sql
-- Ambassador performance by signup month
WITH ambassador_cohorts AS (
    SELECT
        DATE_TRUNC('month', a.created_at) as cohort_month,
        a.id,
        a.referrals_count,
        a.conversions_count,
        a.total_earned
    FROM ambassadors a
    WHERE a.status = 'active'
)
SELECT
    cohort_month,
    COUNT(*) as ambassadors,
    SUM(referrals_count) as total_referrals,
    SUM(conversions_count) as total_conversions,
    SUM(total_earned) as total_earned,
    ROUND(AVG(referrals_count), 1) as avg_referrals,
    ROUND(AVG(conversions_count), 1) as avg_conversions
FROM ambassador_cohorts
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

---

## Reporting Views

### Create Materialized Views for Dashboards

```sql
-- Refresh these daily or on-demand
CREATE MATERIALIZED VIEW mv_growth_dashboard AS
SELECT
    NOW() as last_updated,

    -- Clinic metrics
    (SELECT COUNT(*) FROM tenants WHERE status = 'active') as active_clinics,
    (SELECT COUNT(*) FROM tenants WHERE status = 'claimed') as trial_clinics,
    (SELECT COUNT(*) FROM tenants WHERE is_pregenerated AND status = 'pregenerated') as unclaimed_sites,

    -- Ambassador metrics
    (SELECT COUNT(*) FROM ambassadors WHERE status = 'active') as active_ambassadors,
    (SELECT SUM(conversions_count) FROM ambassadors) as total_conversions,
    (SELECT SUM(total_earned) FROM ambassadors) as total_commissions,

    -- This month
    (SELECT COUNT(*) FROM ambassador_referrals WHERE referred_at >= DATE_TRUNC('month', NOW())) as referrals_this_month,
    (SELECT COUNT(*) FROM ambassador_referrals WHERE status = 'converted' AND converted_at >= DATE_TRUNC('month', NOW())) as conversions_this_month;

-- Refresh command
REFRESH MATERIALIZED VIEW mv_growth_dashboard;
```

---

## Alert Queries

### Low Performance Alerts

```sql
-- Ambassadors with no referrals in 30 days
SELECT full_name, email, phone,
    (NOW() - (SELECT MAX(referred_at) FROM ambassador_referrals WHERE ambassador_id = a.id)) as days_since_last_referral
FROM ambassadors a
WHERE status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM ambassador_referrals ar
    WHERE ar.ambassador_id = a.id
    AND ar.referred_at >= NOW() - INTERVAL '30 days'
)
ORDER BY days_since_last_referral DESC;

-- Pre-generated sites about to expire
SELECT id, name, phone, zone, created_at,
    30 - EXTRACT(DAY FROM NOW() - created_at)::int as days_until_expiry
FROM tenants
WHERE status = 'pregenerated'
AND created_at BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '20 days'
ORDER BY created_at;
```

---

## Tracking Spreadsheet Template

Use this for manual tracking alongside database queries:

| Week | DMs Sent | Responses | Response Rate | Claims | Conversions |
|------|----------|-----------|---------------|--------|-------------|
| W1 | | | | | |
| W2 | | | | | |
| W3 | | | | | |
| W4 | | | | | |

| Week | Ambassador Signups | Approvals | Referrals | Conv. |
|------|-------------------|-----------|-----------|-------|
| W1 | | | | |
| W2 | | | | |
| W3 | | | | |
| W4 | | | | |

---

*Last updated: January 2026*
