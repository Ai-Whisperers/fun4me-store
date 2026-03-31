# Vetic Financial Projections 2026-2028

**Version**: 1.0
**Date**: January 2026
**Currency**: Paraguayan Guaraníes (PYG) and USD
**Exchange Rate**: Gs 7,300 = $1 USD (approximate)

---

## Executive Summary

Vetic follows a freemium model with multiple revenue streams. This document projects financial performance across 6 scenarios from validation (10 clinics) to global scale (10,000 clinics).

### Key Assumptions

- Average paid tier: Gs 200,000/month (~$27 USD)
- Paid conversion rate: 30-40% of total clinics
- E-commerce commission: 3% → 5%
- Bulk order margin: 20% average
- Infrastructure scales sub-linearly (economies of scale)

---

## 1. Cost Structure

### Fixed Costs (Monthly)

| Cost Category                  | Low (0-50) | Medium (50-200) | High (200+)    |
| ------------------------------ | ---------- | --------------- | -------------- |
| Supabase (DB + Auth + Storage) | $25-50     | $50-100         | $100-500       |
| Vercel (Hosting)               | $0-20      | $20-50          | $50-300        |
| Resend (Email)                 | $0-5       | $5-15           | $20-100        |
| Twilio (WhatsApp)              | $5-10      | $15-50          | $50-300        |
| Upstash (Redis)                | $0-5       | $5-10           | $10-50         |
| **Total Infrastructure**       | **$30-90** | **$95-225**     | **$230-1,250** |

### Variable Costs (Per Clinic/Month)

| Cost Type            | Free Tier      | Paid Tier    |
| -------------------- | -------------- | ------------ |
| Storage              | $0.50-1        | $1-3         |
| Database queries     | $0.10-0.50     | $0.50-2      |
| Email sending        | $0.10-0.30     | $0.30-1      |
| WhatsApp (if used)   | $0             | $1-5         |
| **Total per Clinic** | **$0.70-1.80** | **$2.80-11** |

### Staff Costs (When Scaling)

| Role               | Milestone     | Monthly Cost |
| ------------------ | ------------- | ------------ |
| Part-time Support  | 100 clinics   | $300-500     |
| Full-time Support  | 300 clinics   | $800-1,200   |
| Operations Manager | 500 clinics   | $1,500-2,000 |
| Second Support     | 1,000 clinics | $800-1,200   |

---

## 2. Revenue Streams

### 2.1 Subscriptions

| Tier        | Price (PYG) | Price (USD) | Expected % |
| ----------- | ----------- | ----------- | ---------- |
| Gratis      | 0           | $0          | 60-70%     |
| Básico      | 100,000     | $14         | 10-15%     |
| Crecimiento | 200,000     | $27         | 10-15%     |
| Profesional | 400,000     | $55         | 5-10%      |
| Empresarial | Custom      | $100+       | 1-2%       |

**Average Revenue Per Paid Clinic**: ~$30/month

### 2.2 E-commerce Commission

| Period    | Rate | Avg Sales/Store | Commission/Store |
| --------- | ---- | --------------- | ---------------- |
| Month 1-6 | 3%   | Gs 3M (~$411)   | Gs 90K (~$12)    |
| Month 7+  | 5%   | Gs 5M (~$685)   | Gs 250K (~$34)   |

**Stores as % of Paid Clinics**: ~60%

### 2.3 Bulk Ordering Margin

| Product Category | Retail Price | Bulk Price | Margin |
| ---------------- | ------------ | ---------- | ------ |
| Vaccines         | Gs 50,000    | Gs 35,000  | 30%    |
| Medications      | Gs 30,000    | Gs 24,000  | 20%    |
| Food             | Gs 200,000   | Gs 160,000 | 20%    |
| Consumables      | Gs 10,000    | Gs 8,000   | 20%    |

**Average Margin**: 20%
**Average Order/Clinic/Month**: Gs 2,000,000 (~$274)

### 2.4 Advertising (Free Tier)

| Metric                       | Value  |
| ---------------------------- | ------ |
| Avg impressions/clinic/month | 10,000 |
| CPM (Google AdSense)         | $2-5   |
| Revenue/free clinic/month    | $20-50 |
| Google's cut                 | ~32%   |
| Net revenue/clinic           | $14-34 |

---

## 3. Scenario Projections

### Scenario 1: Validation (10 Clinics)

**Timeline**: Month 1-3

| Metric        | Value   |
| ------------- | ------- |
| Total clinics | 10      |
| Free tier     | 7 (70%) |
| Paid tier     | 3 (30%) |

**Revenue:**
| Stream | Monthly |
|--------|---------|
| Subscriptions (3 × Gs 180K avg) | Gs 540,000 |
| E-commerce (1 store × 3%) | Gs 90,000 |
| Advertising (7 × $25) | Gs 1,277,500 |
| **Total** | **Gs 1,907,500 (~$261)** |

**Costs:**
| Category | Monthly |
|----------|---------|
| Infrastructure | $50 |
| Variable (10 clinics) | $20 |
| **Total** | **$70** |

**Net Margin**: ~$191 (73%)

---

### Scenario 2: Product-Market Fit (50 Clinics)

**Timeline**: Month 3-6

| Metric        | Value    |
| ------------- | -------- |
| Total clinics | 50       |
| Free tier     | 30 (60%) |
| Paid tier     | 20 (40%) |

**Revenue:**
| Stream | Monthly (PYG) | Monthly (USD) |
|--------|---------------|---------------|
| Subscriptions (20 × Gs 200K) | Gs 4,000,000 | $548 |
| E-commerce (10 stores × 3%) | Gs 900,000 | $123 |
| Advertising (30 × Gs 175K) | Gs 5,250,000 | $719 |
| **Total** | **Gs 10,150,000** | **$1,390** |

**Costs:**
| Category | Monthly |
|----------|---------|
| Infrastructure | $150 |
| Variable (50 clinics) | $150 |
| Part-time support | $300 |
| **Total** | **$600** |

**Net Margin**: ~$790 (57%)

---

### Scenario 3: Early Growth (100 Clinics)

**Timeline**: Month 6-9

| Metric        | Value    |
| ------------- | -------- |
| Total clinics | 100      |
| Free tier     | 60 (60%) |
| Paid tier     | 40 (40%) |

**Revenue:**
| Stream | Monthly (PYG) | Monthly (USD) |
|--------|---------------|---------------|
| Subscriptions (40 × Gs 210K) | Gs 8,400,000 | $1,151 |
| E-commerce (25 stores × 4%) | Gs 4,000,000 | $548 |
| Bulk orders (30 × Gs 400K margin) | Gs 12,000,000 | $1,644 |
| Advertising (60 × Gs 175K) | Gs 10,500,000 | $1,438 |
| **Total** | **Gs 34,900,000** | **$4,781** |

**Costs:**
| Category | Monthly |
|----------|---------|
| Infrastructure | $300 |
| Variable (100 clinics) | $350 |
| Support (full-time) | $1,000 |
| **Total** | **$1,650** |

**Net Margin**: ~$3,131 (65%)

---

### Scenario 4: Paraguay Saturation (300 Clinics)

**Timeline**: Month 9-12

| Metric        | Value     |
| ------------- | --------- |
| Total clinics | 300       |
| Free tier     | 180 (60%) |
| Paid tier     | 120 (40%) |

**Revenue:**
| Stream | Monthly (PYG) | Monthly (USD) |
|--------|---------------|---------------|
| Subscriptions (120 × Gs 220K) | Gs 26,400,000 | $3,616 |
| E-commerce (70 stores × 4%) | Gs 11,200,000 | $1,534 |
| Bulk orders (80 × Gs 450K margin) | Gs 36,000,000 | $4,932 |
| Advertising (180 × Gs 175K) | Gs 31,500,000 | $4,315 |
| **Total** | **Gs 105,100,000** | **$14,397** |

**Costs:**
| Category | Monthly |
|----------|---------|
| Infrastructure | $700 |
| Variable (300 clinics) | $1,000 |
| Support (2 people) | $2,000 |
| Operations | $500 |
| **Total** | **$4,200** |

**Net Margin**: ~$10,197 (71%)

---

### Scenario 5: Regional Expansion (500 Clinics)

**Timeline**: Year 1 End / Year 2 Start

| Metric        | Value                  |
| ------------- | ---------------------- |
| Total clinics | 500                    |
| Free tier     | 300 (60%)              |
| Paid tier     | 200 (40%)              |
| Countries     | 2 (Paraguay + Bolivia) |

**Revenue:**
| Stream | Monthly (PYG) | Monthly (USD) |
|--------|---------------|---------------|
| Subscriptions (200 × Gs 230K) | Gs 46,000,000 | $6,301 |
| E-commerce (100 stores × 4%) | Gs 20,000,000 | $2,740 |
| Bulk orders (120 × Gs 500K margin) | Gs 60,000,000 | $8,219 |
| Advertising (300 × Gs 175K) | Gs 52,500,000 | $7,192 |
| Gov bounties | Gs 2,500,000 | $342 |
| **Total** | **Gs 181,000,000** | **$24,795** |

**Costs:**
| Category | Monthly |
|----------|---------|
| Infrastructure | $1,500 |
| Variable (500 clinics) | $2,000 |
| Support team (3) | $3,500 |
| Operations | $1,000 |
| Marketing | $500 |
| **Total** | **$8,500** |

**Net Margin**: ~$16,295 (66%)

---

### Scenario 6: Global Scale (2,000+ Clinics)

**Timeline**: Year 2-3

| Metric        | Value                   |
| ------------- | ----------------------- |
| Total clinics | 2,000                   |
| Free tier     | 1,200 (60%)             |
| Paid tier     | 800 (40%)               |
| Countries     | 5+ (PY, BO, UY, PE, EC) |

**Revenue:**
| Stream | Monthly (PYG) | Monthly (USD) |
|--------|---------------|---------------|
| Subscriptions (800 × Gs 240K) | Gs 192,000,000 | $26,301 |
| E-commerce (400 stores × 5%) | Gs 100,000,000 | $13,699 |
| Bulk orders (500 × Gs 600K margin) | Gs 300,000,000 | $41,096 |
| Advertising (1,200 × Gs 175K) | Gs 210,000,000 | $28,767 |
| Gov bounties | Gs 15,000,000 | $2,055 |
| Data licensing | Gs 10,000,000 | $1,370 |
| **Total** | **Gs 827,000,000** | **$113,288** |

**Costs:**
| Category | Monthly |
|----------|---------|
| Infrastructure | $5,000 |
| Variable (2,000 clinics) | $8,000 |
| Support team (8) | $10,000 |
| Operations team (3) | $5,000 |
| Marketing | $3,000 |
| Office/Admin | $2,000 |
| **Total** | **$33,000** |

**Net Margin**: ~$80,288 (71%)

---

## 4. Break-Even Analysis

### Minimum Viable Business

| Scenario                        | Clinics Needed | Timeline  |
| ------------------------------- | -------------- | --------- |
| Cover infrastructure only       | 5 paid         | Month 1-2 |
| Cover infra + part-time support | 15 paid        | Month 2-3 |
| Cover infra + full-time support | 30 paid        | Month 3-4 |
| Sustainable (founder salary)    | 50 paid        | Month 4-6 |

### Break-Even by Revenue Stream

| Stream             | Break-Even Point              |
| ------------------ | ----------------------------- |
| Subscriptions only | 8 paid clinics at Gs 200K avg |
| With e-commerce    | 6 paid clinics + 3 stores     |
| With advertising   | 4 paid + 10 free clinics      |
| All streams        | ~15 total clinics             |

---

## 5. Sensitivity Analysis

### What If: Paid Conversion Drops to 20%

| Scenario    | Original | Adjusted | Impact |
| ----------- | -------- | -------- | ------ |
| 100 clinics | $4,781   | $3,200   | -33%   |
| 500 clinics | $24,795  | $18,500  | -25%   |

**Mitigation**: Increase free tier ad revenue, improve conversion funnel

### What If: Bulk Ordering Fails

| Scenario    | With Bulk | Without | Impact |
| ----------- | --------- | ------- | ------ |
| 100 clinics | $4,781    | $3,137  | -34%   |
| 500 clinics | $24,795   | $16,576 | -33%   |

**Mitigation**: Focus on subscriptions + e-commerce, delay bulk ordering

### What If: Infrastructure Costs Double

| Scenario    | Original Margin | New Margin | Impact |
| ----------- | --------------- | ---------- | ------ |
| 100 clinics | 65%             | 59%        | -6pp   |
| 500 clinics | 66%             | 63%        | -3pp   |

**Mitigation**: Optimize queries, implement caching, negotiate enterprise rates

---

## 6. Investment Requirements

### Self-Funded Path

| Phase  | Investment    | Purpose                   |
| ------ | ------------- | ------------------------- |
| Launch | $0-500        | Minimal infrastructure    |
| Growth | $1,000-2,000  | Marketing, first hires    |
| Scale  | $5,000-10,000 | Team expansion, logistics |

**Time to Profitability**: 6-9 months

### Accelerated Path (With Investment)

| Phase    | Investment | Purpose                         | Expected Return            |
| -------- | ---------- | ------------------------------- | -------------------------- |
| Seed     | $50,000    | Team, marketing, bulk inventory | 300 clinics in 6 months    |
| Series A | $500,000   | Regional expansion, tech        | 2,000 clinics in 18 months |

**Use of Funds**:

- 40% - Team (support, sales, operations)
- 30% - Marketing and customer acquisition
- 20% - Technology and infrastructure
- 10% - Bulk ordering working capital

---

## 7. Key Metrics Dashboard

### Monthly Tracking

| Metric              | Target (Month 6) | Target (Month 12) |
| ------------------- | ---------------- | ----------------- |
| Total signups       | 100              | 500               |
| Paid clinics        | 40               | 200               |
| MRR (subscriptions) | Gs 8M            | Gs 46M            |
| E-commerce GMV      | Gs 25M           | Gs 250M           |
| Bulk order GMV      | Gs 60M           | Gs 600M           |
| Churn rate          | <5%              | <3%               |
| CAC                 | <$50             | <$30              |
| LTV                 | >$300            | >$500             |

### Weekly Tracking

- New signups (free vs paid)
- Conversion events (trial → paid)
- Support tickets and resolution time
- Feature usage by tier
- Revenue by stream

---

## 8. Risk-Adjusted Projections

### Conservative Case (70% of targets)

| Timeline | Clinics | MRR     |
| -------- | ------- | ------- |
| Month 6  | 70      | $3,300  |
| Month 12 | 350     | $10,000 |
| Month 24 | 1,400   | $55,000 |

### Base Case (100% of targets)

| Timeline | Clinics | MRR      |
| -------- | ------- | -------- |
| Month 6  | 100     | $4,800   |
| Month 12 | 500     | $24,800  |
| Month 24 | 2,000   | $113,000 |

### Optimistic Case (130% of targets)

| Timeline | Clinics | MRR      |
| -------- | ------- | -------- |
| Month 6  | 130     | $6,200   |
| Month 12 | 650     | $32,000  |
| Month 24 | 2,600   | $147,000 |

---

## Appendix: Calculation Formulas

### MRR Calculation

```
MRR = Σ(Paid clinics × Tier price) + E-commerce commission + Bulk margin + Ad revenue
```

### LTV Calculation

```
LTV = ARPU × Average customer lifetime
LTV = $30/month × 18 months = $540
```

### CAC Calculation

```
CAC = (Marketing spend + Sales cost) / New customers acquired
Target CAC = $30-50
```

### Unit Economics

```
LTV:CAC ratio target = >3:1
Current estimate = $540 : $40 = 13.5:1 ✓
```

---

_Financial projections v1.0_
_January 2026_
_Review quarterly and adjust assumptions_
