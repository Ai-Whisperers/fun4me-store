# Quick Start Guide

Get the Vete platform running locally in 5 minutes.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Supabase account** (free tier works)
- **Git**

## Step 1: Clone and Install

```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install
```

## Step 2: Configure Environment

Create a `.env.local` file in the `web/` directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Database direct connection (for migrations)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a project
2. Navigate to **Settings > API**
3. Copy the **Project URL** and **anon public** key
4. Paste them into `.env.local`

## Step 3: Set Up Database

Run the SQL migrations in order in the Supabase SQL Editor:

```bash
# In Supabase Dashboard > SQL Editor
# Run each file in web/db/ in numerical order:
# 01_extensions.sql
# 02_schema_core.sql
# 03_schema_pets.sql
# ... etc.
```

Or use the combined migration script:
```bash
npm run db:migrate
```

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Access the Application

Open your browser:

| URL | Description |
|-----|-------------|
| [localhost:3000](http://localhost:3000) | Root landing page |
| [localhost:3000/adris](http://localhost:3000/adris) | Adris clinic website |
| [localhost:3000/petlife](http://localhost:3000/petlife) | PetLife clinic website |
| [localhost:3000/adris/portal](http://localhost:3000/adris/portal) | Staff/Owner portal |

## Verification Checklist

- [ ] Homepage loads with clinic branding
- [ ] Services page displays service catalog
- [ ] Theme colors match clinic's `theme.json`
- [ ] No console errors

## Next Steps

- [Add a new clinic](../guides/adding-clinic.md)
- [Understand the architecture](../architecture/overview.md)
- [Explore the database schema](../database/overview.md)

## Troubleshooting

### "Module not found" errors

Ensure you're using Tailwind CSS v3:
```bash
npm list tailwindcss
# Should show 3.4.x
```

### Supabase connection errors

1. Check `.env.local` has correct values
2. Verify Supabase project is active
3. Check that RLS policies are applied

### Content not loading

Verify `.content_data/` directory exists with clinic folders:
```
web/.content_data/
├── adris/
│   ├── config.json
│   ├── theme.json
│   └── ...
└── petlife/
    └── ...
```

---

See [Installation Guide](installation.md) for detailed setup instructions.
