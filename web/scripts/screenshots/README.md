# Screenshot Automation

Automated full-page screenshot capture for all pages in the Vete platform, organized by user role and viewport.

## Quick Start

```bash
# Install dependencies (if not already)
npm install

# ===== LANDING PAGES (Marketing Site) =====
# Capture all landing pages (/, /precios, /funcionalidades, etc.)
npx tsx scripts/screenshots/capture-landing.ts

# Capture specific viewport only
npx tsx scripts/screenshots/capture-landing.ts --viewport desktop

# Capture specific page only
npx tsx scripts/screenshots/capture-landing.ts --page precios

# ===== CLINIC TENANT PAGES =====
# Capture all clinic pages (recommended method)
npx playwright test e2e/screenshots.spec.ts

# Or use the standalone script
npx tsx scripts/screenshots/run-all.ts
```

## Landing Page Screenshots

The `capture-landing.ts` script captures all public marketing pages:

| Page | Path | Description |
|------|------|-------------|
| Homepage | `/` | Hero, TrustBadges, PricingTeaser, CTA |
| Funcionalidades | `/funcionalidades` | Feature showcase with category tabs |
| Precios | `/precios` | Pricing plans, ROI calculator, payment methods |
| Demo | `/demo` | Demo video, booking section |
| FAQ | `/faq` | Categorized FAQs |
| Nosotros | `/nosotros` | About us, mission, values, stats |
| Red | `/red` | Clinic network |

Each page is captured in 3 viewports:
- **Desktop**: 1920x1080
- **Tablet**: 768x1024
- **Mobile**: 375x812

Plus scroll position shots (top, middle, bottom) for long pages.

Output: `./screenshots/landing/<date>/`

## Methods

### 1. Playwright Test (Recommended)

Uses the Playwright test runner for reliable screenshot capture:

```bash
# All screenshots
npx playwright test e2e/screenshots.spec.ts

# Specific role only
ROLE=owner npx playwright test e2e/screenshots.spec.ts

# Specific page only
PAGE=dashboard-home npx playwright test e2e/screenshots.spec.ts

# With specific browser
npx playwright test e2e/screenshots.spec.ts --project=chromium
```

### 2. Standalone Script

For more control and data setup:

```bash
# Full capture with all data
npx tsx scripts/screenshots/run-all.ts

# Using the capture script with options
npx tsx scripts/screenshots/capture.ts --role vet --viewport desktop

# With specific data set
npx tsx scripts/screenshots/capture.ts --data-set busyDay --role vet
```

## Output Structure

Screenshots are saved to `./screenshots/<date>/<tenant>/<viewport>/<role>/`:

```
screenshots/
└── 2026-01-04/
    └── terrapet/
        ├── desktop/
        │   ├── public/
        │   │   ├── homepage.png
        │   │   ├── services.png
        │   │   └── store.png
        │   ├── owner/
        │   │   ├── portal-dashboard.png
        │   │   ├── portal-pets.png
        │   │   └── ...
        │   ├── vet/
        │   │   ├── dashboard-home.png
        │   │   ├── dashboard-patients.png
        │   │   └── ...
        │   └── admin/
        │       ├── dashboard-settings.png
        │       └── ...
        ├── tablet/
        │   └── ...
        ├── mobile/
        │   └── ...
        └── index.html  # Visual browser
```

## Page Coverage

### Public Pages (No Auth)
- Homepage, About, Services, FAQ
- Store (with category/search variations)
- Cart, Booking wizard
- Login, Signup
- Clinical tools (diagnosis codes, drug dosages, growth charts)
- Loyalty points info

### Portal (Pet Owner)
- Dashboard, Pet list, Pet detail
- Appointments, Schedule
- Messages, Notifications
- Loyalty, Rewards, Wishlist
- Orders, Profile, Settings

### Dashboard (Vet/Admin)
- Main dashboard with stats
- Appointments, Calendar (day/week/month views)
- Patients, Clients
- Hospital, Lab orders
- Inventory, Expiring products
- Invoices (all/pending/paid)
- Orders, Vaccines
- Consents, Insurance
- Reminders, WhatsApp
- Schedules, Time-off
- Epidemiology, Lost pets

### Admin Only
- Team management
- Analytics (overview, customers, store)
- Campaigns, Coupons
- Audit logs
- Settings (general, branding, services, modules)

## Data Variations

The script supports different data sets:

| Data Set | Description |
|----------|-------------|
| `empty` | Minimal data - empty states |
| `full` | Rich data across all modules |
| `busyDay` | Many appointments throughout the day |
| `alerts` | Low stock, overdue vaccines, warnings |
| `hospitalization` | Active hospitalizations |
| `labResults` | Completed lab orders |

```bash
# Use specific data set
npx tsx scripts/screenshots/capture.ts --data-set busyDay
```

## Viewports

| Viewport | Size |
|----------|------|
| `desktop` | 1920×1080 |
| `tablet` | 768×1024 |
| `mobile` | 375×812 |

```bash
# Specific viewport
npx tsx scripts/screenshots/capture.ts --viewport mobile
```

## User Roles

| Role | Access | Test Credentials |
|------|--------|------------------|
| `public` | Public pages only | - |
| `owner` | Portal + Public | owner1@test.local / TestPassword123! |
| `vet` | Dashboard + Public | vet1@test.local / TestPassword123! |
| `admin` | Everything | admin@test.local / TestPassword123! |

## Configuration

### Environment Variables

```env
BASE_URL=http://localhost:3000   # App URL
NEXT_PUBLIC_SUPABASE_URL=...     # For data setup
SUPABASE_SERVICE_ROLE_KEY=...   # For data setup (optional)
```

### Customizing Pages

Edit `scripts/screenshots/config.ts` to:
- Add/remove pages
- Change page variations
- Modify wait conditions
- Add before-screenshot actions

## Integration with CI/CD

Add to your workflow:

```yaml
# .github/workflows/screenshots.yml
name: Screenshots

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  capture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: cd web && npm ci

      - name: Install Playwright
        run: cd web && npx playwright install --with-deps chromium

      - name: Start app
        run: cd web && npm run build && npm start &
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Capture screenshots
        run: cd web && npx playwright test e2e/screenshots.spec.ts
        env:
          BASE_URL: http://localhost:3000

      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: web/screenshots/
```

## Troubleshooting

### Authentication fails
- Ensure test users exist in the database
- Check credentials in `config.ts` match database
- Verify the login form selectors

### Screenshots are blank/loading
- Increase `waitFor` timeout in config
- Add specific waitFor selectors
- Check if page requires data to render

### Missing pages
- Verify route exists in app
- Check role permissions in config
- Ensure page isn't behind feature flag

## Files

| File | Purpose |
|------|---------|
| `config.ts` | Page definitions, user credentials, settings |
| `data-fixtures.ts` | Test data setup and cleanup |
| `capture.ts` | Main capture script with CLI |
| `run-all.ts` | Full capture with all combinations |
| `../e2e/screenshots.spec.ts` | Playwright test version |
