# Vete Growth Strategy Implementation

> **Target**: 100 paying clinics in 6 months
> **Market**: Paraguay veterinary clinics
> **Strategy**: Cold DMs + University Network + Pre-Generation Automation

## Overview

This documentation covers the complete growth strategy implementation for Vete.

## Documentation Index

### Core Strategy

| # | Document | Description |
|---|----------|-------------|
| 01 | **[Pricing Strategy](./01-pricing-strategy.md)** | Annual plans, ROI guarantee, onboarding structure |
| 02 | **[Pre-Generation System](./02-pre-generation-system.md)** | Bulk clinic generation and claim flow |
| 03 | **[Ambassador Program](./03-ambassador-program.md)** | Commission-based referral system |
| 04 | **[Outreach Scripts](./04-outreach-scripts.md)** | Cold DM templates and messaging |

### Technical Reference

| # | Document | Description |
|---|----------|-------------|
| 05 | **[Database Migrations](./05-database-migrations.md)** | Complete SQL migration reference |
| 06 | **[API Reference](./06-api-reference.md)** | All endpoints with examples |
| 07 | **[Admin Operations](./07-admin-operations.md)** | Manual admin tasks and queries |
| 08 | **[Metrics & Analytics](./08-metrics-analytics.md)** | KPIs, dashboards, SQL queries |
| 09 | **[Troubleshooting](./09-troubleshooting.md)** | Common issues and solutions |
| 10 | **[Website Updates](./10-website-updates.md)** | Landing page update recommendations |

---

## Strategy Summary

### Distribution Channels

| Channel | Time Allocation | Target |
|---------|-----------------|--------|
| Cold DMs (WhatsApp/Instagram) | 60% | 150+ DMs/week |
| University Network | 30% | 20 ambassadors/month |
| Pre-Generation System | 10% → 50% | 100 sites/batch |

### Revenue Model

| Plan | Price | Monthly Equivalent | Target Conversion |
|------|-------|-------------------|-------------------|
| Free Trial | Gs 0 | - | Entry point |
| Professional Annual | Gs 2,400,000/year | Gs 200,000 | Primary |
| Professional 2-Year | Gs 4,000,000/2 years | Gs 166,667 | High commitment |

### Key Differentiators

1. **ROI Guarantee**: 6 new clients in 6 months or 6 months free
2. **Pre-Generated Sites**: "Your website is already live" approach
3. **High-Touch Onboarding**: 60-min setup + 4 weekly check-ins
4. **Ambassador Commissions**: 30-50% cash for referrers

---

## Quick Start

### For Developers

```bash
# Run bulk clinic generation
cd web
npx tsx scripts/bulk-generate.ts --source=leads.csv --db

# Start development server
npm run dev
```

### Key Files

| Component | Location |
|-----------|----------|
| Pricing config | `web/lib/pricing/tiers.ts` |
| Bulk generator | `web/scripts/bulk-generate.ts` |
| Claim API | `web/app/api/claim/route.ts` |
| Ambassador APIs | `web/app/api/ambassador/` |
| Ambassador UI | `web/app/ambassador/` |
| DB Migrations | `web/db/migrations/060_*.sql`, `061_*.sql` |

---

## Implementation Status

### Completed ✅

- [x] ROI guarantee configuration
- [x] Annual pricing plans (Gs 2.4M/year, Gs 4M/2-years)
- [x] Onboarding call structure
- [x] Pre-generation database fields
- [x] Bulk clinic generation script
- [x] Claim website API (GET/POST)
- [x] Ambassador database schema
- [x] Ambassador registration & auth
- [x] Ambassador dashboard
- [x] Ambassador referrals tracking
- [x] Ambassador payouts system

### Pending 📋

- [ ] Admin dashboard for approving ambassadors
- [ ] Automated commission calculations on subscription
- [ ] Email notifications for ambassador events
- [ ] WhatsApp integration for outreach automation
- [ ] Analytics dashboard for conversion tracking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Growth Strategy Stack                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Pre-Gen     │  │ Ambassador  │  │ Pricing & Billing   │  │
│  │ System      │  │ Program     │  │                     │  │
│  │             │  │             │  │                     │  │
│  │ • Scraping  │  │ • Register  │  │ • Annual Plans      │  │
│  │ • Bulk Gen  │  │ • Dashboard │  │ • ROI Guarantee     │  │
│  │ • Claim API │  │ • Referrals │  │ • Onboarding        │  │
│  │             │  │ • Payouts   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Database Layer                     │    │
│  │                                                      │    │
│  │  tenants (+ pre-generation fields)                   │    │
│  │  ambassadors                                         │    │
│  │  ambassador_referrals                                │    │
│  │  ambassador_payouts                                  │    │
│  │  referral_codes (clinic-to-clinic)                   │    │
│  │  referrals                                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Contact

For questions about the growth strategy implementation:
- Review the detailed documentation in this folder
- Check the plan file: `.claude/plans/zippy-doodling-oasis.md`

---

*Last updated: January 2026*
