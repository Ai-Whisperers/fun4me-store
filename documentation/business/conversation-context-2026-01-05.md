# Vetic Pricing Strategy - Conversation Context

**Date**: January 5, 2026
**Session Purpose**: Complete pricing strategy analysis and implementation planning
**Status**: Phase 1 Complete (Documentation), Phase 2 Pending (UI Updates)

---

## Summary of What Was Accomplished

### 1. Comprehensive Analysis

- Analyzed 167 API endpoints, 100+ database tables, 75+ features
- Reviewed existing pricing components (pricing-section.tsx, pricing-quiz.tsx, roi-calculator.tsx)
- Calculated infrastructure costs ($30-1,250/month depending on scale)
- Created unit economics model (cost per clinic: $10-70)

### 2. Founder Questionnaire

- Created 85+ question questionnaire across 17 sections
- Founder reviewed and provided detailed corrections
- Key insights captured in `pricing-questionnaire-completed.md`

### 3. 30 Implementation Questions

- Detailed questions about specific implementation choices
- All 30 answered by founder
- Decisions documented in plan file

### 4. Documentation Created

- `documentation/business/pricing-strategy-2026.md` - Main strategy document
- `documentation/business/pricing-questionnaire-completed.md` - Founder's answers
- `web/lib/branding/config.ts` - White-label configuration
- `web/lib/pricing/tiers.ts` - Centralized pricing configuration

---

## Key Strategic Decisions (Founder Confirmed)

### Business Model

| Decision             | Choice                                     | Rationale                                       |
| -------------------- | ------------------------------------------ | ----------------------------------------------- |
| Free tier philosophy | FULL features + Ads                        | Drive adoption, data continuity between clinics |
| Primary revenue      | Subscriptions                              | Core, predictable income                        |
| Secondary revenue    | E-commerce (3-5%) + Bulk ordering (15-25%) | Network effects                                 |
| Tertiary revenue     | Ads + Data licensing + Gov bounties        | Fund free tier, long-term                       |

### Pricing Structure (5 Tiers)

| Tier        | Price (PYG) | USD        | Target                     |
| ----------- | ----------- | ---------- | -------------------------- |
| Gratis      | 0           | $0         | Mass adoption              |
| Básico      | 100,000     | $14        | Small clinics, ad-free     |
| Crecimiento | 200,000     | $27        | Growing, with e-commerce   |
| Profesional | 400,000     | $55        | Established, full features |
| Empresarial | Custom      | Negotiated | Chains, multi-location     |

### Per-User Pricing

- Users = Anyone who logs in (staff + pet owners)
- Extra user costs: Gs 30K-60K depending on tier

### Discounts

- Annual: 20% off
- Referral: 30% stackable per referral
- Early adopter (first 300): Locked rate forever

### Growth Strategy

1. **Proactive outreach**: Scrape ALL clinics, pre-generate websites, offer 3-month trial
2. **Referral program**: 30% discount per referral (stackable), +2 months for referred
3. **Pet owner viral loop**: Pet cards spread awareness when owners visit new clinics
4. **ROI guarantee**: Free 6 months if minimum new clients not acquired

### ROI Guarantee Formula

```
Minimum new clients = Monthly fee ÷ Gs 50,000
"New client" = Pet owner with minimum spend Gs 100,000
Evaluation: After 6 months
If not met: Next 6 months free
```

### Bulk Ordering / GPO

- Access: Crecimiento+ tiers only
- Minimum order: None (aggregate all small orders)
- Payment: 100% upfront (pre-order)
- Delivery: Pass-through cost + 10% markup
- Target margin: 15-25%

### Technical Decisions

- White-label ready (Vetic → AI-Whisperers abstraction)
- Ad network: Google AdSense (start), add direct sales later
- Multi-language: Spanish only for first 2 years
- "Powered by" banner: Top of page with upgrade CTA

### Support Model

| Tier        | Support              | Response Time |
| ----------- | -------------------- | ------------- |
| Gratis      | Community forum only | Best effort   |
| Básico      | Email                | 48 hours      |
| Crecimiento | Email                | 24 hours      |
| Profesional | Email + WhatsApp     | 12 hours      |
| Empresarial | All + Phone + SLA    | 4 hours       |

---

## Financial Projections Summary

### Year 1 Targets

- Total clinics: 500
- Paid clinics: 150 (30%)
- MRR: ~$5,600/month
- Primary revenue: Subscriptions + E-commerce commissions

### Year 2 Targets

- Total clinics: 2,000 (PY + BO + UY)
- Paid clinics: 500 (25%)
- MRR: ~$17,800/month
- Additional revenue: Bulk ordering margins

### Year 3 Targets

- Total clinics: 10,000 (global 3rd world)
- Paid clinics: 2,500 (25%)
- MRR: ~$91,000/month
- All revenue streams active

---

## Files Created This Session

### Documentation

| File                                                        | Purpose                         |
| ----------------------------------------------------------- | ------------------------------- |
| `documentation/business/pricing-strategy-2026.md`           | Complete pricing strategy       |
| `documentation/business/pricing-questionnaire-completed.md` | Founder's questionnaire answers |
| `documentation/business/conversation-context-2026-01-05.md` | This file                       |

### Code

| File                         | Purpose                         |
| ---------------------------- | ------------------------------- |
| `web/lib/branding/config.ts` | White-label brand configuration |
| `web/lib/pricing/tiers.ts`   | Centralized pricing tiers       |

### Plan

| File                                    | Purpose                               |
| --------------------------------------- | ------------------------------------- |
| `.claude/plans/generic-drifting-fog.md` | Full analysis and implementation plan |

---

## Remaining Implementation Tasks

### High Priority

1. [ ] Update `web/components/landing/pricing-section.tsx` - New 5-tier display
2. [ ] Update `web/components/landing/pricing-quiz.tsx` - New tier recommendations
3. [ ] Update `web/components/landing/roi-calculator.tsx` - ROI guarantee messaging

### Medium Priority

4. [ ] Create `web/components/ads/ad-banner.tsx` - AdSense integration
5. [ ] Create `web/app/api/billing/commissions/route.ts` - Commission tracking
6. [ ] Create `web/components/onboarding/setup-wizard.tsx` - AI-assisted onboarding

### Lower Priority

7. [ ] Create financial projections spreadsheet
8. [ ] Implement referral tracking system
9. [ ] Build bulk ordering wishlist aggregation

---

## Important Insights from Founder

### Why Free Tier Has Full Features

> "All clinics need full functionality so a premium clinic pet can be treated at a freemium clinic with all data available"

This means: Free tier must have medical records, vaccines, etc. Monetize through ads, not feature gating.

### Growth Philosophy

> "We want to make having the website economic so that it spreads fast and gets adopted easy so we can not only cover Paraguay but if it goes well we can do it for all clinics in all 3rd world countries"

### Referral Model (Stackable)

> "Stackable and overlapping so if they get 130% off they can have 100% next month and 30% the one after instead of giving them money"

### Bulk Ordering Vision

> "We want to add all the small purchases from all clinics to make 1 huge bulk purchase and deliver it all. One cheaper delivery fee that takes it to all clinics."

### Ultimate Vision

> "When AI gets better I will let it run and donate all earnings to humanitarian and animalitarian aid projects"

---

## Key Metrics to Track

| Metric          | Description               | Target           |
| --------------- | ------------------------- | ---------------- |
| Total signups   | All clinics (free + paid) | 500 by Year 1    |
| Paid conversion | % of free → paid          | 30%+             |
| MRR             | Monthly recurring revenue | Gs 40M by Year 1 |
| Churn           | Monthly cancellation rate | <5%              |
| CAC             | Cost to acquire clinic    | <$50             |
| LTV             | Lifetime value per clinic | >$500            |
| NPS             | Net Promoter Score        | >50              |

---

## How to Continue This Work

### Next Session Priority

1. Read this context document first
2. Read `pricing-strategy-2026.md` for full strategy
3. Check `web/lib/pricing/tiers.ts` for pricing config
4. Update the UI components (pricing-section, quiz, calculator)

### Key Files to Reference

- `.claude/plans/generic-drifting-fog.md` - Full analysis (2400+ lines)
- `documentation/business/pricing-questionnaire-completed.md` - Founder's exact answers
- `web/lib/pricing/tiers.ts` - Use these configs in UI updates

### Testing After UI Updates

1. Visit `/[clinic]/precios` to see pricing page
2. Test quiz recommendations
3. Verify ROI calculator shows guarantee message
4. Check mobile responsiveness

---

## Revenue Stream Implementation Status

| Stream         | Status                  | Files Involved        |
| -------------- | ----------------------- | --------------------- |
| Subscriptions  | Exists (update pricing) | pricing-section.tsx   |
| E-commerce     | Exists (add commission) | store/orders/route.ts |
| Bulk Ordering  | Not started             | New API routes needed |
| Advertising    | Not started             | ad-banner.tsx needed  |
| Data Licensing | Future (Year 2+)        | N/A                   |
| Gov Bounties   | Future (opportunistic)  | N/A                   |

---

## Contact & Company Info

- **Company**: AI-Whisperers
- **Brand**: Vetic
- **Market**: Paraguay (primary), Bolivia, Uruguay (expansion)
- **Target**: 500 clinics Year 1, 10,000 clinics Year 3
- **Focus**: 3rd world veterinary clinics

---

_Context document created: January 5, 2026_
_For session continuity and knowledge preservation_
