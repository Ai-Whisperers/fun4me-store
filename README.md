# Vete - Multi-Tenant Veterinary Platform

A SaaS veterinary clinic management platform built with Next.js 15, Supabase, and TypeScript. Hosts multiple clinics from a single codebase using dynamic routing and a JSON-based CMS.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Vete
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd web
   npm install
   ```

3. **Environment Setup**

   Copy `.env.example` to `.env.local`:
   ```bash
   cd web
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials from the dashboard:

   ```bash
   # Required: Get these from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

   # Service role key (KEEP SECRET - server only)
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Optional: Configure rate limiting with Upstash Redis
   UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
   ```

4. **Run development server**
   ```bash
   # From root directory
   npm run dev
   # Or use the automated script
   install_and_run.bat
   ```

5. **Open in browser**
   - Default clinic: http://localhost:3000/adris
   - Or any configured clinic: http://localhost:3000/[clinic-slug]

## 📁 Project Structure

```
Vete/
├── README.md                    # This file
├── CLAUDE.md                    # AI assistant context & coding standards
├── MCP_SETUP.md                 # MCP server setup guide
├── DEPLOYMENT_CHECKLIST.md      # Deployment procedures
├── TENANT_ONBOARDING.md         # New clinic onboarding guide
├── TICKETS.md                   # Current ticket tracking
├── tasks/                       # Task breakdown by area
│   ├── 00-MASTER-INDEX.md
│   ├── 01-SECURITY.md
│   ├── 02-API-ROUTES.md
│   └── ...
├── web/                         # Next.js application
│   ├── app/                     # App Router pages & API routes
│   ├── components/              # React components
│   ├── lib/                     # Utilities & helpers
│   ├── db/                      # Database migrations
│   └── README.md                # Web app specific docs
├── documentation/               # Project documentation
│   ├── architecture/            # System design & patterns
│   ├── api/                     # API reference
│   ├── database/                # Schema & migrations
│   ├── features/                # Feature documentation
│   ├── guides/                  # How-to guides
│   ├── history/                 # Historical implementation notes
│   ├── infrastructure/          # GCP/VM hosting guides
│   └── tickets/                 # Feature/bug tickets
└── scripts/                     # Utility scripts (Python)
```

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 15.5.9 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.19 ⚠️ |
| Database | Supabase (PostgreSQL) | 2.88.0 |
| Auth | Supabase Auth | - |
| Testing | Vitest + Playwright | Latest |

⚠️ **Important**: Do not upgrade Tailwind CSS to v4 without reading deployment documentation.

## 📚 Documentation

### For Developers
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant context, coding standards, and quick reference
- **[documentation/development/](./documentation/development/)** - Setup and testing guides
- **[documentation/architecture/](./documentation/architecture/)** - System architecture and patterns

### For Operations
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Deployment procedures
- **[TENANT_ONBOARDING.md](./TENANT_ONBOARDING.md)** - Adding new clinics
- **[documentation/guides/](./documentation/guides/)** - Operational guides

### For Planning
- **[TICKETS.md](./TICKETS.md)** - Current bug/feature tickets
- **[tasks/](./tasks/)** - Task breakdown by area
- **[documentation/tickets/](./documentation/tickets/)** - Detailed ticket documentation

### Historical Reference
- **[documentation/history/](./documentation/history/)** - Past implementation summaries and refactoring notes

## 🏗️ Key Features

- **Multi-tenant Architecture** - Single codebase, multiple clinics
- **JSON-based CMS** - Content management without code changes
- **Pet Owner Portal** - Appointment booking, pet records, messaging
- **Staff Dashboard** - Clinical tools, scheduling, inventory
- **E-commerce Store** - Product catalog and checkout
- **Multi-language Ready** - Currently Spanish (Paraguay)

## 🔐 Security

- Row-Level Security (RLS) on all database tables
- Tenant isolation enforced at database level
- Authentication via Supabase Auth
- API rate limiting (see [documentation/api/rate-limiting.md](./documentation/api/rate-limiting.md))

## 🧪 Testing

```bash
cd web

# Run all tests
npm test

# Unit tests only
npm run test:unit

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage:html
```

## 📝 Contributing

1. Review [CLAUDE.md](./CLAUDE.md) for coding standards
2. Check [tasks/](./tasks/) for current work areas
3. Follow the ticket workflow (see [documentation/tickets/README.md](./documentation/tickets/README.md))
4. Ensure all tests pass before submitting

## 🚢 Deployment

### Hosting Options

| Platform | Best For | Cost |
|----------|----------|------|
| **Vercel** | Quick deploys, auto-scaling | Free - $20/mo |
| **GCP VM** | Full control, LatAm compliance | $0 - $35/mo |

### Production URLs

| Environment | URL | Hosting |
|-------------|-----|---------|
| Production (Vercel) | https://vetic.ai-whisperers.org | Vercel |
| Production (GCP) | http://34.151.201.27 | GCP e2-medium |

### Deployment Guides

- **Vercel**: Auto-deploys on push to `main` via [GitHub Actions](./.github/workflows/deploy.yml)
- **GCP VMs**: See [GCP Hosting Guide](./documentation/infrastructure/GCP_HOSTING.md)

### GCP Free Tier Quick Start

```bash
# New GCP accounts get $300 USD credits for 90 days
# Post-trial: e2-micro (1GB RAM) is always free

# Stack: Node.js 22 + PM2 + nginx + Certbot
# Regions: southamerica-east1 (São Paulo) recommended for LatAm
```

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed procedures.

## 📞 Support

- **Technical Issues**: Check [documentation/](./documentation/) or [TICKETS.md](./TICKETS.md)
- **Setup Help**: See [MCP_SETUP.md](./MCP_SETUP.md) for development environment setup

## 📄 License

[Add your license information here]

---

**Last Updated**: December 2025

