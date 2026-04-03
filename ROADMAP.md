# Fun4Me Store — Product Roadmap v3.0
## Roasted, Rebuilt, Revenue-First

---

## ⚠️ THE ROAST: Why v2.0 Was a Fantasy

### Problem 1: Terminal Scope Creep
v2 proposed **239 features** for a **single boutique** in Asunción (metro pop: ~2.5M,
GDP per capita: ~$6,000). That's more features than Shopify had at launch. We were
building FetLife + Shopify + Eventbrite + Substack + a CRM + an LMS + a loyalty
engine — for a shop that currently sells via Instagram DMs.

**Rule: You don't build a platform. You build a store that sells things.**

### Problem 2: Fantasy Timeline
239 features in 24 weeks = 10 features/week. Real estimates:
- "Bancard vPOS integration: 8h" → Reality: **2-4 weeks** (bureaucracy, sandbox
  issues, test cards, webhook debugging, merchant approval wait)
- "Forum with moderation: 6h" → Reality: **a separate product**
- "Subscription recurring billing: 6h" → Reality: **recurring payments in Paraguay
  don't exist as a simple API call**
- "Community profiles with privacy controls: 4h" → Reality: **weeks of work** when
  privacy is life-or-death for a BDSM audience

Real timeline for v2's scope: **12-18 months**, not 6.

### Problem 3: Zero Business Validation
The roadmap assumed demand for everything. But:
- How many customers does Fun4Me actually have? 50? 500? 5,000?
- What's their monthly revenue? Gs 5M? 50M? 500M?
- What's the average order value?
- What % are BDSM community vs. casual buyers?
- Has anyone asked customers if they WANT an online store?
- Will Paraguayans pay Gs 500,000/month (~$70 USD = 14% of average monthly income)
  for a subscription box of sex toys?
- Is the BDSM community in Asunción large enough to sustain a forum?

**None of these were answered. We built features instead of validating a business.**

### Problem 4: Technical Over-Engineering
**35+ database tables** before a single customer buys a product:
- community_profiles + forum_topics + forum_replies + private_messages = you're
  building a social network
- event_registrations + consent waivers = you're building Eventbrite
- subscription_plans + recurring billing = you're building Stripe Billing
- educational_videos + premium gating = you're building a course platform
- ambassador tracking + commission payouts = you're building an affiliate network

Each of these is a startup-scale product. Combining them in a custom build means
maintaining ALL of them forever with (probably) 1-2 developers.

### Problem 5: The Community Platform Trap
FetLife has 12.6M users and is barely profitable. They've been running since 2008.
Building a BDSM community platform is a **separate business** from selling vibrators.

Community features will:
- Take 3x longer than estimated
- Have 10x the moderation overhead expected
- Require serious safety/privacy engineering
- Generate **zero direct revenue**
- Distract from the actual money-maker

### Problem 6: Revenue Prioritization Backwards
v2 pushed revenue features to later phases:
- Card payments → Phase 2 (week 5+)
- Subscriptions → Phase 7 (week 21+, unvalidated)
- Loyalty → Phase 4 (you need customers before loyalty)
- Community → Phase 6 (zero revenue, maximum complexity)

Meanwhile, actual revenue drivers were buried or missing:
- WhatsApp Commerce (how Paraguay ACTUALLY buys)
- Checkout upsells / cross-sells
- Abandoned cart recovery
- Seasonal campaigns (Valentine's Day = 40-50% of annual sex shop revenue)
- Repeat purchase automation

### Problem 7: What Was Missing
- **Customer interviews** — talk to 20 real customers before writing code
- **Inventory audit** — how many SKUs does Fun4Me actually carry? 50? 500?
- **Operations plan** — who fulfills? Who answers support? Who moderates?
- **Content plan** — who writes 20+ articles for "Academia"? The owners are running
  a store, not a media company
- **Budget reality** — what can they actually afford?
- **WhatsApp-first thinking** — the store should be WhatsApp with a website, not
  a website with WhatsApp bolted on

### Problem 8: Paraguay Reality Check
- Average monthly income: ~Gs 3,500,000 ($500 USD)
- "Caja Kink" at Gs 500,000/month = **14% of average income** for a box of toys
- Credit card penetration is LOW — most transactions are cash
- Total addressable market for BDSM in Asunción: maybe 500-2,000 people
- You don't build a platform for millions when your market is thousands

---

## ✅ THE FIX: Revenue-First, Validation-Driven Roadmap

### Core Philosophy

```
OLD: "What features do global competitors have? Build all of them."
NEW: "What makes Fun4Me money TODAY? Do more of that. Online."

OLD: Build a platform → hope customers come
NEW: Validate demand → build only what's proven → measure → iterate

OLD: 239 features in 24 weeks
NEW: 60 features in 20 weeks, each phase paying for the next
```

### Principles
1. **VALIDATE BEFORE BUILDING** — every major feature needs evidence of demand
2. **REVENUE EVERY PHASE** — no phase exists purely for "growth" or "community"
3. **WHATSAPP-FIRST** — Paraguay lives on WhatsApp. The website supplements it
4. **SHIP SMALL, LEARN FAST** — 2-week cycles, measure everything
5. **BUY DON'T BUILD** — use Telegram for community, YouTube for videos,
   Google Forms for event registration, Instagram for social proof
6. **THE OWNERS' TIME IS FINITE** — every feature has an operations cost

---

## 1. PHASE 0: VALIDATION & PREPARATION (Weeks -2 to 0)

> **Goal:** Know your numbers. Get legal/payment blockers started. Talk to customers.
> **Cost:** $0 in development. Only time.

### Business Intelligence (MUST DO FIRST)

| #  | Task                                              | Owner     | Effort |
|----|---------------------------------------------------|-----------|--------|
| 01 | Interview 20 customers (in-store + WhatsApp)      | Owners    | 1 week |
|    | → What do you wish we had online?                 |           |        |
|    | → Would you buy from a website or prefer WhatsApp? |           |        |
|    | → What products do you wish we carried?            |           |        |
|    | → Would you attend a workshop? Pay how much?       |           |        |
|    | → Would you subscribe to a monthly box? At what price? |       |        |
| 02 | Inventory audit: count SKUs, categorize, photograph| Owners    | 1 week |
| 03 | Financial baseline: monthly revenue, AOV, top 20 products | Owners | 2h |
| 04 | Competitor shopping: buy from SexShop.com.py, document experience | Dev | 4h |
| 05 | Apply for Bancard vPOS merchant account            | Owners    | 1 day  |
|    | ⚠️ This takes 2-6 weeks. START NOW.                |           |        |
| 06 | Register domain (fun4me.com.py or fun4mestore.com) | Dev       | 1h     |
| 07 | Set up Cloudflare (DNS, SSL ready)                 | Dev       | 1h     |
| 08 | Supabase project creation                          | Dev       | 30min  |

### Validation Questions to Answer

```
MUST KNOW BEFORE WRITING CODE:
├── How many products do they sell? (drives catalog complexity)
├── Monthly revenue in Gs? (drives investment justification)
├── Top 20 products by revenue? (drives what to feature first)
├── Customer split: walk-in vs. Instagram vs. WhatsApp? (drives channel strategy)
├── Do customers want a website? (don't assume yes)
├── Workshop interest: yes/no + price sensitivity? (drives events phase)
├── Subscription interest: yes/no + price point? (drives subscription phase)
└── BDSM community size in Asunción? (drives community investment)
```

**Exit Gate:** Business baseline documented. Bancard application submitted. 
Domain registered. Customer interview insights written up.

---

## 2. TECH STACK (Simplified)

| Layer              | Technology                   | Why                                     |
|--------------------|------------------------------|-----------------------------------------|
| Frontend           | Next.js 15 (App Router)     | SSR/SEO, team knows it                  |
| Styling            | Tailwind CSS + shadcn/ui    | Fast, consistent, accessible            |
| Cart State         | Zustand + localStorage      | Persists across sessions                |
| Database           | Supabase (PostgreSQL)       | Auth, Storage, RLS, Edge Functions      |
| Payments           | Bancard vPOS                | Only game in town for PY cards          |
| WhatsApp           | Meta Cloud API              | Automated notifications                 |
| Email              | Resend                      | Transactional + simple campaigns        |
| Analytics          | Umami (self-hosted)         | Privacy-focused, free, lightweight      |
| Search             | Supabase FTS                | Built-in, zero cost, good enough        |
| Hosting            | VPS + Docker + Coolify      | No content policy risk, full control    |
| CDN                | Cloudflare                  | Free tier covers everything needed      |
| Community          | Telegram group (FREE)       | Don't build what exists                 |
| Events             | Google Forms + site listing  | Don't build Eventbrite                  |
| Video              | YouTube embeds              | Don't build a video platform            |
| Live Chat          | WhatsApp (already have it)  | Don't add another tool                  |

### What We're NOT Building (Use Existing Tools Instead)

| v2 Proposed                  | v3 Replacement          | Savings        |
|------------------------------|-------------------------|----------------|
| Forum platform (6+ tables)   | Telegram group          | ~80h dev time  |
| Private messaging system      | WhatsApp / Telegram DMs | ~30h dev time  |
| Community profiles + privacy  | Telegram pseudonyms     | ~40h dev time  |
| Video platform + premium gate | YouTube + embeds        | ~20h dev time  |
| Event management system       | Google Forms + page     | ~60h dev time  |
| AI chatbot                    | WhatsApp human support  | ~40h dev time  |
| Full CRM                      | Supabase + spreadsheet  | ~30h dev time  |
| **TOTAL SAVED**              |                         | **~300h**      |

---

## 3. DATABASE SCHEMA (Right-Sized)

### Phase 1 Tables Only (12 tables — not 35)

```sql
-- PRODUCTS (4 tables)
categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,              -- Price in Guaranies (no decimals)
  compare_at_price BIGINT,            -- Strike-through price
  category_id UUID REFERENCES categories(id),
  brand TEXT,
  sku TEXT UNIQUE,
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  experience_level TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  material TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  stock_quantity INT DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- NOTE: No product_variants table at launch. Add ONLY if inventory
-- audit reveals products with multiple variants. Most sex shop products
-- don't have variants (a vibrator is a vibrator). Don't over-model.

kink_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0
);

product_kinks (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  kink_id UUID REFERENCES kink_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, kink_id)
);

-- CUSTOMERS (1 table — extends Supabase auth.users)
customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  phone TEXT,
  age_verified BOOLEAN DEFAULT false,
  addresses JSONB DEFAULT '[]',        -- Array of address objects
  newsletter_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ORDERS (3 tables)
orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES customers(id),
  guest_email TEXT,                     -- For guest checkout
  guest_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','payment_pending','payment_confirmed','preparing',
    'shipped','delivered','completed','cancelled'
  )),
  subtotal BIGINT NOT NULL,
  shipping_cost BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  total BIGINT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer','cod','bancard','gift_card')),
  payment_ref TEXT,
  shipping_address JSONB NOT NULL,
  notes TEXT,
  is_gift BOOLEAN DEFAULT false,
  gift_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,           -- Snapshot at time of order
  quantity INT NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL,
  line_total BIGINT NOT NULL
);

shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- "Asunción", "Gran Asunción", "Interior"
  neighborhoods TEXT[] DEFAULT '{}',
  price BIGINT NOT NULL,
  free_above BIGINT,                   -- Free shipping threshold
  est_days TEXT,                       -- "Mismo día", "1-2 días"
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- PAYMENTS (2 tables)
payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  method TEXT NOT NULL,
  provider TEXT,                        -- 'bancard', 'manual'
  provider_ref TEXT,
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed','refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

bank_transfer_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  image_url TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- MARKETING (1 table — only coupons, added Phase 2)
coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('percentage','fixed','free_shipping')),
  value BIGINT NOT NULL,               -- % or Gs amount
  min_order BIGINT DEFAULT 0,
  max_uses INT,
  uses_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
```

### Tables Added ONLY When Needed (Phase 3+)

```sql
-- ADD IN PHASE 3 (when loyalty is validated)
reviews (...);                  -- Only if customers are willing to write them
loyalty_points (...);           -- Only if repeat purchase rate warrants it

-- ADD IN PHASE 4 (when events are validated)
events (...);                   -- Simple: title, date, location, capacity, price
event_registrations (...);      -- Simple: event_id, customer_id, paid

-- ADD IN PHASE 5 (when subscriptions are validated)
subscription_plans (...);
subscriptions (...);

-- MAYBE NEVER
forum_categories, forum_topics, forum_replies  -- Use Telegram instead
community_profiles                              -- Use Telegram instead
private_messages                                -- Use WhatsApp instead
educational_videos                              -- Use YouTube instead
ambassadors, ambassador_referrals               -- Premature
```

---

## 4. THE REAL ROADMAP

```
TIMELINE (20 weeks, expandable based on results):

Phase 0  (Pre-dev)    ░░  Validation + Legal/Payment Setup
Phase 1  (Weeks 1-4)  ████████  MVP: Browse + Buy + Admin
Phase 2  (Weeks 5-8)  ████████  Payments + Conversion Optimization
Phase 3  (Weeks 9-12) ████████  Retention: Accounts + Loyalty + Reviews
Phase 4  (Weeks 13-16) ████████ Growth: Content + Events + Bundles
Phase 5  (Weeks 17-20) ████████ Scale What Works (data-driven)
──────────────────────────────────────────
MVP SOFT LAUNCH       → Week 3  (friends & family)
MVP PUBLIC LAUNCH     → Week 4  (Instagram announcement)
CARD PAYMENTS LIVE    → Week 6  (Bancard approved by now)
FIRST CAMPAIGN        → Week 10 (seasonal or themed)
V1 COMPLETE           → Week 20
```

---

### ═══════════════════════════════════════════════════════════════
### PHASE 1: THE MONEY-MAKING MVP (Weeks 1-4)
### ═══════════════════════════════════════════════════════════════

> **Goal:** Customers find products online and BUY them. That's it.
> **Measure:** Orders per week, conversion rate, AOV, traffic source.

#### Week 1: Foundation + Skeleton

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 01 | Next.js 15 project: App Router, TS strict, pnpm   | 2   | —    |
| 02 | Tailwind + shadcn/ui + Fun4Me design tokens        | 3   | —    |
| 03 | Supabase: Phase 1 schema (12 tables) + RLS         | 6   | Integration tests |
| 04 | Docker dev environment (Supabase local + app)       | 2   | —    |
| 05 | CI: GitHub Actions (lint + typecheck + vitest)      | 2   | —    |
| 06 | Coolify deploy: docker-compose → VPS + domain + SSL| 3   | Deploy smoke test |
| 07 | Seed script: real categories + 30 products from inventory | 4 | —  |
| 08 | Age gate: DOB entry, 30-day cookie, middleware      | 2   | E2E test |
| 09 | Layout: header (logo, nav, search, cart icon) + footer | 4 | Visual |
| 10 | Mobile responsive nav (hamburger, categories)       | 3   | Mobile test |
| 11 | WhatsApp floating button (global, links to business WA) | 1 | — |
| 12 | Vitest + Playwright config                          | 2   | —    |

**Week 1 total: 34h | Exit: Site deploys, age gate works, seeded data visible**

#### Week 2: Product Catalog + Discovery

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 13 | Homepage: hero banner + featured + categories grid  | 6  | Visual |
| 14 | Homepage: "Explora por Kink" section with kink grid | 3  | —    |
| 15 | Homepage: bestsellers + new arrivals carousels      | 3  | —    |
| 16 | Homepage: trust badges bar (discreet shipping, PY company, 4.9★) | 2 | — |
| 17 | Category page: product grid + filters (price, experience) | 6 | E2E |
| 18 | "Shop by Kink" page: kink category grid → filtered products | 4 | E2E |
| 19 | Product card component: image, name, price, exp badge, WA button | 3 | Unit |
| 20 | Search: Supabase FTS with autocomplete              | 4  | Integration |
| 21 | Sort: price (asc/desc), newest, name                | 2  | Unit |
| 22 | Breadcrumbs + pagination                            | 2  | —    |

**Week 2 total: 35h | Exit: All products browsable, searchable, filterable**

#### Week 3: Product Detail + Cart + Checkout

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 23 | Product detail page: gallery, price, description, specs | 6 | E2E |
| 24 | Experience level badge (🟢🟡🔴) + material info     | 1  | —    |
| 25 | "Add to Cart" + quantity + "Pedir por WhatsApp" button | 3 | E2E |
| 26 | WhatsApp order: pre-populated message with product name + link | 2 | Manual |
| 27 | Related products: "También te puede gustar" (same category) | 2 | — |
| 28 | SEO: meta tags + JSON-LD Product schema per product  | 3  | Lighthouse |
| 29 | Cart drawer (slide-in): items, quantities, subtotal  | 4  | E2E |
| 30 | Cart: free shipping progress bar                     | 2  | Unit |
| 31 | Checkout page: shipping address form                 | 3  | E2E |
| 32 | Checkout: shipping zone auto-select + cost display   | 3  | Integration |
| 33 | Checkout: payment method selection (transfer / COD)  | 2  | E2E |
| 34 | Checkout: bank transfer → show account details + receipt upload | 3 | E2E |
| 35 | Checkout: COD → confirm and place order              | 2  | E2E |
| 36 | Order confirmation page + order number               | 2  | E2E |
| 37 | Order confirmation email via Resend (branded, discreet) | 3 | Integration |

**Week 3 total: 41h | Exit: Full purchase flow works end-to-end**

#### Week 4: Admin Panel + Soft Launch

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 38 | Admin: auth (Supabase role-based, admin flag)       | 2  | —    |
| 39 | Admin: dashboard — today's orders, revenue, low stock | 4 | — |
| 40 | Admin: product list + create + edit + delete         | 8  | E2E |
| 41 | Admin: image upload (Supabase Storage, drag & drop)  | 3  | —    |
| 42 | Admin: category + kink category management           | 3  | —    |
| 43 | Admin: order list with status filters + search       | 4  | —    |
| 44 | Admin: order detail → update status → trigger email  | 3  | Integration |
| 45 | Admin: bank transfer receipt viewer + verify button   | 2  | —    |
| 46 | Admin: print packing slip (DISCREET — generic items)  | 2  | —    |
| 47 | XML sitemap (auto-generated from products)           | 2  | —    |
| 48 | robots.txt + RTA adult meta tag                      | 1  | —    |
| 49 | Load 100% of real inventory from audit               | 4  | —    |
| 50 | Soft launch: share with 20 loyal customers for feedback | — | — |

**Week 4 total: 38h | EXIT: LIVE. Taking real orders. Measuring everything.**

### MVP Metrics to Track From Day 1
```
Daily:   Orders, revenue, unique visitors, WhatsApp clicks
Weekly:  Conversion rate, AOV, top products, traffic sources
Monthly: Returning visitors %, cart abandonment rate, search queries (what are people looking for?)
```

---

### ═══════════════════════════════════════════════════════════════
### PHASE 2: PAYMENTS + CONVERSION (Weeks 5-8)
### ═══════════════════════════════════════════════════════════════

> **Goal:** Remove buying friction. Add card payments. Increase AOV.
> **Measure:** Conversion rate improvement, AOV increase, payment method split.
> **Gate:** Only proceed if MVP is getting orders. If zero orders, FIX THAT first.

#### Weeks 5-6: Bancard Integration

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 51 | Bancard vPOS sandbox: API integration               | 10 | Integration |
| 52 | Checkout: Bancard payment flow (redirect or iframe)  | 8  | E2E |
| 53 | Bancard: webhook handler for payment confirmation    | 4  | Integration |
| 54 | Auto order status update: pending → payment_confirmed | 2 | Integration |
| 55 | Cuotas/installments: display options at checkout     | 4  | E2E |
| 56 | Payment failure page + retry option                  | 3  | E2E |
| 57 | Bancard production deployment + testing              | 4  | Smoke test |
| 58 | Admin: payment transactions view + reconciliation    | 3  | —    |

#### Weeks 7-8: Conversion Optimization

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 59 | Abandoned cart: WhatsApp message after 2h (manual first) | 4 | — |
|    | ↳ Just a Supabase cron + WA Cloud API template     |     |      |
| 60 | Checkout upsell: "Agregar lubricante por Gs 25,000" | 4  | A/B |
| 61 | Cross-sell on product page: "Clientes también compraron" | 3 | — |
| 62 | Free shipping threshold: adjust based on AOV data    | 1  | —    |
| 63 | Coupon code engine (% off, fixed, free shipping)     | 5  | E2E  |
| 64 | Admin: coupon CRUD + usage tracking                  | 3  | —    |
| 65 | Announcement bar: rotating promos, admin-editable    | 3  | —    |
| 66 | Product page: stock urgency ("¡Quedan solo 3!")      | 2  | —    |
| 67 | Guest checkout optimization: fewer fields, phone-first | 3 | E2E |
| 68 | Speed optimization: image lazy load, Cloudflare cache | 4 | Lighthouse |
| 69 | WhatsApp Cloud API setup: order confirmed template   | 4  | Integration |
| 70 | WhatsApp: shipped + delivered notification templates  | 3  | Integration |
| 71 | Admin: trigger WhatsApp notifications on status change | 3 | — |

**Phase 2 total: ~71h over 4 weeks**

### Phase 2 Decision Gate
```
MEASURE AFTER 2 WEEKS OF CARD PAYMENTS:
├── What % pay by card vs. COD vs. transfer?
├── Has conversion rate improved?
├── What's the new AOV? (cuotas should increase it)
├── What are the top search queries? (reveals unmet demand)
└── What products get viewed but not bought? (pricing or trust issue?)
```

---

### ═══════════════════════════════════════════════════════════════
### PHASE 3: RETENTION + REPEAT PURCHASES (Weeks 9-12)
### ═══════════════════════════════════════════════════════════════

> **Goal:** Turn one-time buyers into repeat customers.
> **Measure:** Repeat purchase rate, review submission rate, email list size.
> **Gate:** Only build loyalty if you have 100+ customers. Otherwise, focus on acquisition.

#### Weeks 9-10: Accounts + Reviews

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 72 | Customer registration (email + password)             | 3  | E2E  |
| 73 | Login + persistent session + magic link option       | 3  | E2E  |
| 74 | Customer profile: name, phone, addresses             | 3  | E2E  |
| 75 | Order history page (past orders + status)            | 4  | E2E  |
| 76 | Saved addresses (manage multiple)                    | 3  | —    |
| 77 | Wishlist: heart button → saved products page         | 4  | E2E  |
| 78 | Reviews: submit (stars + text), verified purchase badge | 5 | E2E |
| 79 | Reviews: display on product page + aggregate rating  | 3  | Unit |
| 80 | Reviews: admin moderation queue                      | 3  | —    |
| 81 | Google review prompt: after 3rd purchase, link to GMB | 2 | —   |

#### Weeks 11-12: Loyalty + First Campaign

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 82 | Loyalty: simple points system (1 pt / Gs 1,000)    | 4  | Integration |
|    | ↳ ONE tier only. No "Explorador/Amante/VIP" — premature. |  |    |
| 83 | Loyalty: points display in account + at checkout    | 3  | E2E  |
| 84 | Loyalty: redeem points as checkout discount          | 3  | E2E  |
| 85 | Email list: newsletter popup (delayed, non-annoying) | 2  | —   |
| 86 | First email campaign: top products + coupon          | 3  | —    |
| 87 | WhatsApp broadcast: first promo to opt-in list       | 2  | —    |
| 88 | Seasonal campaign prep: [Valentine's/Mother's Day/etc] | 4 | — |
|    | ↳ Landing page + curated collection + limited coupon |    |      |
| 89 | Blog: 5 SEO articles (product guides, BDSM basics)  | 8  | —    |
|    | ↳ Written by dev/owner, optimized for PY keywords    |    |      |
| 90 | Gift cards: digital (email delivery), redeem at checkout | 5 | E2E |

**Phase 3 total: ~60h over 4 weeks**

### Phase 3 Decision Gate
```
CRITICAL METRICS:
├── Repeat purchase rate — target >15% within 60 days
├── Reviews submitted — are customers engaging?
├── Email list size — growing?
├── Loyalty points redeemed — are people using it?
├── Blog traffic — is SEO working?
└── Customer feedback — what do they want NEXT?

BASED ON DATA, DECIDE:
├── IF events/workshops interest validated → build events in Phase 4
├── IF subscription box interest validated → build subscriptions in Phase 5
├── IF community demand exists → launch Telegram group (FREE, instant)
├── IF blog drives traffic → expand content in Phase 4
└── IF none of the above → focus on more products + better marketing
```

---

### ═══════════════════════════════════════════════════════════════
### PHASE 4: GROWTH — CONTENT + EVENTS + BUNDLES (Weeks 13-16)
### ═══════════════════════════════════════════════════════════════

> **Goal:** New revenue streams. Leverage community admin expertise.
> **Measure:** Event ticket revenue, bundle AOV, organic traffic growth.
> **Gate:** Only build what Phase 3 data says customers want.

#### Weeks 13-14: "Shop by Kink" + Bundles + Content

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 91 | "Shop by Kink" page: full kink descriptions + curated products | 6 | E2E |
|    | ↳ Each kink page has: description, beginner guide, products |   |    |
| 92 | Product bundles engine: create bundles with discount | 5 | E2E |
|    | ↳ "Kit Bondage Principiante" = 3 items, 15% off    |    |      |
| 93 | Bundle display: on homepage + relevant product pages | 3 | —   |
| 94 | Blog: 10 more articles (BDSM education, product guides) | 10 | — |
| 95 | Blog: "Related Products" sidebar in articles         | 2  | —    |
| 96 | FAQ page: shipping, returns, privacy, materials      | 3  | —    |
| 97 | Referral program: share code → both get Gs 25,000 off | 4 | E2E |
| 98 | Referral: tracking dashboard for customers           | 2  | —    |

#### Weeks 15-16: Events (Lightweight)

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 99 | Events page: list of upcoming events with details   | 4  | —    |
| 100| Event detail page: date, time, location, price, description | 3 | — |
| 101| Event registration: simple form + Bancard payment   | 4  | E2E  |
|    | ↳ OR free events: just name + email + WhatsApp      |     |      |
| 102| Event capacity tracking + "Sold Out" display        | 2  | —    |
| 103| Event reminder: WhatsApp message 24h before         | 2  | Integration |
| 104| Admin: create/edit events + view registrations      | 4  | —    |
| 105| "Shop supplies for this workshop" link to products  | 2  | —    |
|    | ↳ E.g., Shibari workshop → link to ropes            |    |      |
| 106| Bachelorette party bundles: curated gift sets        | 3  | —    |
| 107| Gift card: physical card design (for in-store sales) | 2  | —    |

**Phase 4 total: ~61h over 4 weeks**

**Events Types to Launch (Simple):**
```
START WITH 2-3 EVENTS:
├── Monthly "Fun4Me Social" munch (free, café meetup)
├── "Intro to Bondage" workshop (paid, at store or rented space)
└── Online Q&A with sexologist (Zoom, free, builds email list)

DO NOT BUILD:
├── Full event management with waitlists, series, consent waivers
├── Instructor profile system
├── Recurring event automation
└── Virtual event link management
↳ These are Phase 5 features IF events prove profitable
```

---

### ═══════════════════════════════════════════════════════════════
### PHASE 5: SCALE WHAT WORKS (Weeks 17-20)
### ═══════════════════════════════════════════════════════════════

> **Goal:** Double down on proven winners. Cut what doesn't work.
> **This phase is DATA-DRIVEN. Features depend on Phase 3-4 results.**

#### The Decision Matrix

```
IF events are profitable (>10 attendees, positive feedback):
  → Build event series, recurring events, instructor profiles
  → Build consent waiver system
  → Expand to monthly workshop calendar

IF events flopped:
  → Kill it. Keep using Google Forms for occasional meetups.

IF subscription boxes validated (>30 people said yes in survey):
  → Build ONE subscription tier
  → Simple: monthly, fixed price, curated by owners
  → Manual billing first (invoice via WhatsApp), automate later

IF subscriptions not validated:
  → Don't build it. Sell bundles instead (one-time purchase, no commitment).

IF blog driving significant traffic (>500 visits/month):
  → Expand "Academia": more articles, consider video embeds
  → Add email course: "7 Days of Kink Discovery" (drip campaign)

IF blog traffic is negligible:
  → Stop writing. Focus marketing budget on Instagram + WhatsApp.

IF community demand is real (people asking for it):
  → Create Telegram group with owners as admins (FREE, instant)
  → Link from website: "Únete a la comunidad Fun4Me"
  → If Telegram grows to 200+ members → THEN consider forum

IF referral program working:
  → Expand to ambassador program (power users with unique codes)
  → Give top referrers early access + free products

ALWAYS BUILD (regardless of data):
```

| #  | Task                                              | Hrs | Test |
|----|---------------------------------------------------|-----|------|
| 108| Advanced analytics dashboard: revenue trends, funnels | 6 | — |
| 109| Customer segmentation: new / returning / VIP / dormant | 4 | — |
| 110| Re-engagement: WhatsApp to dormant customers (30+ days) | 3 | — |
| 111| Email: abandoned cart sequence (2h, 24h, 48h)      | 4  | Integration |
| 112| Product recommendations: "Basado en tu historial"  | 4  | —    |
| 113| Speed + SEO audit: Core Web Vitals, Schema markup  | 4  | Lighthouse |
| 114| Admin: bulk product import/export (CSV)             | 4  | —    |
| 115| Admin: inventory alerts + stock history             | 3  | —    |
| 116| Performance marketing: prepare Google Ads campaign  | 4  | —    |
|    | ↳ Target "sex shop Paraguay" keywords (competitors aren't bidding) |  |  |

**Phase 5 total: ~36h base + conditional features**

---

## 5. FEATURE COMPARISON: v2 vs v3

| Feature                         | v2 (Fantasy)     | v3 (Reality)                      |
|---------------------------------|------------------|-----------------------------------|
| Total features                  | 239              | ~116                              |
| Database tables at launch       | 35+              | 12                                |
| Timeline                        | 24 weeks         | 20 weeks (expandable)             |
| Forum                           | Custom-built     | Telegram group (free)             |
| Community profiles              | Full privacy engine | Telegram pseudonyms            |
| Private messaging               | Custom-built     | WhatsApp / Telegram DMs           |
| Video platform                  | Mux + premium gating | YouTube embeds               |
| Event management                | Full Eventbrite clone | Simple page + form + payment |
| AI chatbot                      | Custom-built     | Cut entirely                      |
| Subscription boxes              | 4 tiers at launch | Validated first, 1 tier if proven|
| Ambassador program              | Phase 7          | Only if referrals prove demand    |
| Loyalty tiers                   | 3 tiers          | 1 simple points system            |
| CRM                             | Custom-built     | Supabase queries + common sense   |
| Blog                            | Full CMS engine  | Markdown in Supabase, simple      |
| Payment integration             | Week 5           | Started in Phase 0 (bureaucracy!) |
| Customer validation             | None             | Phase 0: 20 interviews            |
| Business metrics                | Phase 7          | Day 1                             |
| Decision gates                  | None             | Every phase                       |
| Operational cost considered?    | No               | Yes, every feature                |
| Dev hours estimated             | ~1,200h          | ~450h                             |

---

## 6. PRODUCT CATEGORY TAXONOMY (Simplified)

> Based on what a REAL boutique in Asunción would stock.
> Finalize after inventory audit in Phase 0.

```
MAIN NAVIGATION:
├── 🛍️ Tienda
│   ├── Novedades
│   ├── Más Vendidos
│   ├── Ofertas
│   └── Kits / Bundles
│
├── 📂 Categorías
│   ├── Vibradores
│   ├── Consoladores
│   ├── Anal
│   ├── Para Él
│   ├── Para Parejas
│   ├── Lencería
│   ├── Lubricantes y Cosmética
│   └── Bienestar Sexual
│
├── 🔥 Por Kink
│   ├── Bondage
│   ├── Impacto
│   ├── Dominación & Sumisión
│   ├── Sensaciones
│   ├── Privación Sensorial
│   └── [Expand based on inventory]
│
├── 📚 Guías (Phase 3+)
│   ├── Blog
│   ├── Guías para Principiantes
│   └── FAQ
│
└── 🎪 Eventos (Phase 4+)
    ├── Próximos Eventos
    └── Talleres
```

**Experience Level Labels (keep these — they're excellent):**
```
🟢 Principiante
🟡 Intermedio
🔴 Avanzado
```

---

## 7. BRAND & TRUST (Keep from v2 — This Was Good)

### Discreet Branding Rules
```
PACKAGING:      "F4M Comercial" — plain box, zero branding
BANK STATEMENT: "F4M COM" — generic merchant name
DELIVERY:       Generic sender, no product descriptions
WHATSAPP:       No product names in automated messages
PACKING SLIP:   Inside box only, neutral codes
```

### Trust Signals (every page)
```
🔒 Pago 100% Seguro
📦 Envío Discreto Garantizado
🔄 Garantía de Satisfacción
💬 Soporte por WhatsApp
⭐ 4.9★ en Google Maps
🇵🇾 Empresa Paraguaya
```

---

## 8. RISK REGISTER (Honest)

| Risk                                      | Likelihood | Impact | Mitigation                              |
|-------------------------------------------|-----------|--------|------------------------------------------|
| Bancard rejects adult merchant            | MEDIUM    | CRITICAL | Apply early. Frame as "wellness." Have bank transfer as fallback. |
| Zero online orders (customers prefer WA)  | MEDIUM    | HIGH   | WhatsApp ordering on every product. Website supplements, doesn't replace. |
| Nobody writes reviews                     | HIGH      | LOW    | Offer loyalty points for reviews. Seed with 10 authentic reviews. |
| Blog doesn't drive traffic                | MEDIUM    | LOW    | Try for 3 months. If no traction, reallocate time to Instagram/WA marketing. |
| Events don't attract attendees            | MEDIUM    | LOW    | Start with free munch (zero cost). Only invest in paid workshops if free events succeed. |
| Subscription box demand is zero           | HIGH      | LOW    | Validate in Phase 0 interviews. Don't build until proven. |
| Dev capacity insufficient                 | HIGH      | HIGH   | Scope is right-sized for 1 dev. Add second only if revenue justifies. |
| Payment fraud (especially COD)            | MEDIUM    | MEDIUM | COD limit per order. Phone verification. Bancard handles card fraud. |
| Hosting goes down                         | LOW       | HIGH   | Cloudflare caching. VPS monitoring. Coolify auto-restart. |
| Community platform liability (safety)     | N/A       | N/A    | NOT BUILDING IT. Using Telegram instead. Zero liability. |

---

## 9. SUCCESS METRICS BY PHASE

| Phase | Week | North Star Metric            | Target                    |
|-------|------|------------------------------|---------------------------|
| 1     | 4    | First paid order             | 1+ orders in week 4       |
| 1     | 4    | Products loaded              | 100% of inventory          |
| 2     | 8    | Weekly orders                | 10+ orders/week            |
| 2     | 8    | Card payment adoption        | >30% of orders             |
| 2     | 8    | Conversion rate              | >1.5%                      |
| 3     | 12   | Repeat customers             | >15% repeat within 60 days|
| 3     | 12   | Email list                   | 300+ subscribers           |
| 3     | 12   | Reviews                      | 50+ reviews on products    |
| 4     | 16   | Organic traffic              | 500+ monthly visitors from SEO |
| 4     | 16   | Event attendance             | 15+ at first workshop      |
| 4     | 16   | Bundle AOV lift              | +20% AOV on bundle orders  |
| 5     | 20   | Monthly revenue (online)     | Gs 15M+ (~$2,000 USD)     |
| 5     | 20   | Customer base                | 200+ unique customers      |

---

## 10. WHAT NOT TO BUILD (The Kill List)

These were in v2. They're cut. Here's why.

| Feature                          | Why It's Cut                                               |
|----------------------------------|------------------------------------------------------------|
| Custom forum                     | Use Telegram/Discord. Free, moderated, already built.      |
| Community profiles               | FetLife exists. Don't compete. Use Telegram pseudonyms.    |
| Private messaging                | WhatsApp exists. Don't reinvent it.                        |
| AI chatbot                       | Gimmick. Doesn't sell products. Owners ARE the experts.    |
| Video platform                   | YouTube is free. Embed it.                                 |
| 4-tier subscription boxes        | Validate demand first. Build 1 tier IF proven.             |
| 3-tier loyalty program           | Start with 1 tier. Add tiers when you have 500+ customers. |
| Ambassador program (Phase 7)     | Build referral program first. Ambassador is just referral+. |
| Product comparison tool          | Nobody uses these. Especially in adult commerce.           |
| Multi-currency display           | You sell in Guaranies. Period.                             |
| Material-based navigation        | Nice in theory. Nobody in PY searches by material.         |
| Gift registry                    | Maybe 5 people/year would use this. Not worth building.    |
| Bachelorette party features      | Just sell bundles labeled "despedida de soltera."           |
| Home party booking               | Operations nightmare. Not a tech feature.                  |
| Dungeon rental management        | If you need this, use Google Calendar.                     |
| PWA                              | Mobile website is fine. App install friction kills conversion. |
| Mobile app                       | Absolutely not. Website is enough.                         |
| Wholesale B2B portal             | Completely different business. Don't.                      |
| 3D product viewer                | Absurd for this market.                                    |
| Kink Academy paid courses        | You'd need 10,000+ customers to justify this.              |
| Consent waiver system            | Use a Google Form or paper form at the door.               |
| Instructor profile system        | The instructor is the owner. They don't need a profile page.|
| Event series management          | Premature. You don't know if events work yet.              |
| Full CRM                         | Supabase queries + a spreadsheet until you need more.      |
| Email campaign builder           | Use Resend's dashboard or Brevo free tier.                 |

---

## 11. DEVELOPMENT PRINCIPLES (Revised)

```
1. REVENUE BEFORE FEATURES     — If it doesn't make money or save time, don't build it.
2. VALIDATE BEFORE BUILDING    — Customer interviews > competitor analysis.
3. WHATSAPP IS THE PRODUCT     — The website helps WhatsApp sell more, not the other way around.
4. 12 TABLES BEFORE 35         — Add schema when you need it, not before.
5. MEASURE EVERYTHING          — Umami analytics from day 1. Decisions are data-driven.
6. SHIP EVERY 2 WEEKS          — No phase longer than 4 weeks without a deploy.
7. ONE DEV CAN DO THIS         — If the scope requires a team, the scope is wrong.
8. BUY > BUILD                 — Telegram, YouTube, Google Forms, Resend. Don't reinvent.
9. OPERATIONS = FEATURES       — Every feature has a human cost. Who runs it?
10. PHASE GATES ARE MANDATORY  — Don't start Phase N+1 until Phase N metrics are met.
```

---

## 12. REVENUE STREAMS (Realistic)

```
YEAR 1 (prove the model):
  └── Product Sales (90%+ of revenue)
  └── Gift Cards (5%)
  └── Paid Workshops (5%) — IF validated

YEAR 2 (expand what works):
  ├── Product Sales (70%)
  ├── Bundles / Kits (10%)
  ├── Subscription Box — 1 tier, IF validated (10%)
  ├── Workshops / Events (5%)
  └── Gift Cards (5%)

YEAR 3+ (diversify):
  ├── Product Sales (60%)
  ├── Subscriptions (15%)
  ├── Events / Education (10%)
  ├── Bundles (10%)
  └── Own-Brand Products (5%) — highest margin play
```

---

*Document version: 3.0 — "The Roasted Edition"*
*Created: 2026-04-03*
*Repository: github.com/Ai-Whisperers/fun4me-store*
*Total features: ~116 (down from 239)*
*Dev hours: ~450h (down from ~1,200h)*
*Timeline: 20 weeks with phase gates (down from 24 weeks waterfall)*
*Philosophy: Revenue first. Validate everything. Build less, sell more.*
