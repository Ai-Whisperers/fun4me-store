# Vete - Multi-Tenant Veterinary Platform

Welcome to the technical documentation for **Vete**, a comprehensive multi-tenant veterinary clinic platform built with Next.js 15, Supabase, and TypeScript.

## Quick Links

| Section | Description |
|---------|-------------|
| [Getting Started](getting-started/quick-start.md) | Set up your development environment |
| [Architecture](architecture/overview.md) | System design and patterns |
| [Database](database/overview.md) | Schema, migrations, and RLS |
| [API Reference](api/overview.md) | REST endpoints and Server Actions |
| [Features](features/overview.md) | All implemented features |
| [Backend Systems](backend/error-handling.md) | Error handling, auth, logging, validation |
| [Development](development/setup.md) | Contributing and coding standards |
| [Growth Strategy](growth-strategy/01-pricing-strategy.md) | Pricing, ambassador program, pre-generation |

### Operations & Infrastructure

| Document | Description |
|----------|-------------|
| [Domain Management](../docs/DOMAIN_MANAGEMENT.md) | Custom domains, CNAME configuration, DNS setup |
| [Docker Deployment](../docs/DOCKER_DEPLOYMENT.md) | Self-hosted deployment with Docker |
| [Cloudflare Tunnels](../docs/CLOUDFLARE_TUNNELS.md) | Zero-trust tunnel configuration |
| [Environment Variables](../docs/ENV_COMPLETE_REFERENCE.md) | All 77+ environment variables |
| [Security Guidelines](../docs/SECURITY_GUIDELINES.md) | Security best practices |

---

## Platform Overview

Vete is a **SaaS veterinary management platform** that provides:

- **Multi-tenant architecture** - Single codebase serves multiple clinic websites
- **JSON-CMS content system** - Clinics customize content without code changes
- **Dynamic theming** - Each clinic has its own branding/colors
- **Comprehensive clinic management** - Appointments, medical records, inventory, invoicing
- **Clinical decision support** - Drug dosages, diagnosis codes, growth charts
- **Pet owner portal** - Owners manage their pets, view records, book appointments
- **Real-time features** - Live dashboard updates, notifications

### Target Market

- Veterinary clinics in Paraguay (Spanish-speaking)
- Small to medium clinics seeking digital transformation
- Multi-location veterinary groups

### Current Tenants

- `adris` - Veterinaria Adris
- `petlife` - PetLife Center

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Next.js (App Router) | 15.5.9 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.4.19 |
| **Database** | Supabase (PostgreSQL) | - |
| **Auth** | Supabase Auth | - |
| **Storage** | Supabase Storage | - |
| **PDF** | @react-pdf/renderer | 4.3.1 |
| **Charts** | recharts | 3.6.0 |
| **Testing** | Vitest + Playwright | - |

> **Important**: This project uses Tailwind CSS v3, NOT v4. Do not upgrade.

---

## Platform Statistics

| Metric | Count |
|--------|-------|
| **Database Tables** | 100+ |
| **API Route Files** | 313 files (~480+ HTTP methods) |
| **Server Actions** | 37 |
| **React Components** | 674 |
| **Pages (Routes)** | 256+ |
| **Cron Jobs** | 18 |
| **Custom Hooks** | 10 |
| **Database Migrations** | 94 sequential migrations |
| **Environment Variables** | 77 (4 required, 73 optional) |
| **Test Files** | 205 unit/integration + 40 E2E |

See [Codebase Statistics](reference/codebase-statistics.md) for detailed breakdown.

---

## Documentation Structure

```
documentation/
├── getting-started/         # Setup and first steps
│   ├── quick-start.md
│   └── environment-variables.md
│
├── architecture/            # System design
│   ├── overview.md
│   ├── multi-tenancy.md
│   ├── CODE_PATTERNS.md
│   ├── context-providers.md     # Cart, Wishlist, Notification contexts
│   ├── theme-system.md          # CSS variable theming
│   ├── state-management.md      # Zustand + Context patterns
│   └── diagrams/
│
├── database/               # Supabase/PostgreSQL
│   ├── overview.md
│   ├── schema-reference.md
│   ├── unified-inventory-view.md
│   └── scoped-queries.md        # Tenant-isolated query builders
│
├── api/                    # API documentation
│   ├── overview.md
│   ├── rate-limiting.md
│   └── checkout-endpoint.md
│
├── backend/                # Backend systems
│   ├── error-handling.md
│   ├── authentication-patterns.md
│   ├── rate-limiting.md
│   ├── logging-and-monitoring.md
│   └── validation-system.md
│
├── features/               # Feature documentation
│   ├── overview.md
│   ├── store-components.md
│   ├── clinical-components.md   # Dosage calculator, QoL, etc.
│   └── integrations.md          # WhatsApp, Email
│
├── development/            # Developer guides
│   ├── setup.md
│   ├── testing-utilities.md
│   ├── hooks-library.md
│   ├── cron-jobs.md
│   └── formatting-utilities.md  # Currency, date, number formatting
│
├── tickets/               # Development backlog
│   ├── refactoring/
│   ├── bugs/
│   ├── features/
│   └── technical-debt/
│
├── growth-strategy/       # Growth & monetization (NEW)
│   ├── 01-pricing-strategy.md
│   ├── 02-pre-generation-system.md
│   ├── 03-ambassador-program.md
│   ├── 04-outreach-scripts.md
│   ├── 05-database-migrations.md
│   ├── 06-api-reference.md
│   ├── 07-admin-operations.md
│   ├── 08-metrics-analytics.md
│   ├── 09-troubleshooting.md
│   └── 10-website-updates.md
│
├── reference/             # Reference materials
│   ├── routing-map.md
│   └── codebase-statistics.md
│
└── product/               # Product documentation
    └── roadmap.md
```

---

## Quick Start

```bash
# Clone and install
cd web
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Access clinics
open http://localhost:3000/adris
open http://localhost:3000/petlife
```

See [Getting Started Guide](getting-started/quick-start.md) for detailed setup.

---

## Key Concepts

### Multi-Tenancy

Each clinic operates as an isolated tenant:
- Routes: `/[clinic]/*` (e.g., `/adris/services`)
- Content: `.content_data/[clinic]/` JSON files
- Database: `tenant_id` column + RLS policies

### Deployment Options

| Method | Use Case | Documentation |
|--------|----------|---------------|
| **Vercel** | Production SaaS (default) | Automatic via GitHub |
| **Docker** | Self-hosted, on-premise | [Docker Guide](../docs/DOCKER_DEPLOYMENT.md) |
| **Cloudflare Tunnel** | Behind NAT/firewall | [Tunnel Guide](../docs/CLOUDFLARE_TUNNELS.md) |

### Domain Management

Custom domains are managed via CLI:
```bash
node scripts/domains.mjs list              # List all domains
node scripts/domains.mjs add <domain> <tenant>  # Add domain
node scripts/domains.mjs validate          # Validate config
```

See [Domain Management Guide](../docs/DOMAIN_MANAGEMENT.md) for details.

### JSON-CMS

Content is decoupled from code:
- `config.json` - Clinic settings, contact, modules
- `theme.json` - Colors, fonts, gradients
- `services.json` - Service catalog with pricing
- `home.json` - Homepage content

### Role-Based Access

| Role | Capabilities |
|------|--------------|
| `owner` | Pet owners - manage their pets, book appointments |
| `vet` | Veterinarians - full medical access, prescriptions |
| `admin` | Clinic administrators - all access + settings |

---

## Feature Summary

### Public Website
- Dynamic homepage with hero, features, testimonials
- Service catalog with pricing
- About page with team profiles
- Online appointment booking
- Contact information with WhatsApp integration

### Pet Management
- Pet profiles with photos
- Vaccine records and schedules
- Medical history timeline
- QR code identification tags
- Lost & found registry

### Clinical Tools
- Digital prescriptions with PDF export
- Diagnosis code search (VeNom/SNOMED)
- Drug dosage calculator
- Growth charts and tracking
- Vaccine reaction monitoring
- Quality of life assessments (HHHHHMM scale)
- Reproductive cycle tracking

### Business Tools
- Appointment scheduling
- Full invoicing system
- Inventory management with WAC
- Expense tracking
- Loyalty points program
- Campaign management

### Hospitalization
- Kennel/cage management
- Vitals monitoring
- Treatment scheduling
- Feeding logs
- Visitor management

### Communication
- In-app messaging
- SMS/WhatsApp/Email notifications
- Automated reminders
- Broadcast campaigns

---

## Development Tickets

Active development backlog with 16 tickets organized by priority.

### High Priority (P1)
- [REF-001](tickets/refactoring/REF-001-centralize-auth-patterns.md) - Centralize Auth Patterns
- [SEC-001](tickets/security/SEC-001-tenant-validation.md) - Add Tenant Validation
- [BUG-001](tickets/bugs/BUG-001-double-signup-routes.md) - Fix Double Signup Routes
- [REF-002](tickets/refactoring/REF-002-form-validation-centralization.md) - Centralize Form Validation

### Medium Priority (P2)
- Analytics dashboard, multi-language support, automated reminders
- API error handling, performance optimizations

### Quick Wins (< 4 hours)
- Tenant validation fix (2-3h)
- Remove duplicate signup route (1.5h)
- Fix redirect params (3h)

See [tickets/README.md](tickets/README.md) for complete backlog.

---

## Contributing

See [Contributing Guide](development/contributing.md) for:
- Code style standards
- Pull request process
- Testing requirements

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Questions**: Contact the development team

---

*Last updated: January 2026*
*Documentation updated with: architecture (context providers, theme system, state management), database (scoped queries), features (clinical components, integrations), development (formatting utilities)*
