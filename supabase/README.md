# Supabase Migration System

This project has been migrated from a manual `setup-db.mjs` script to the standard Supabase CLI migration workflow.

## Structure

- `supabase/migrations/`: Contains the versioned SQL migration files.
- `supabase/seed.sql`: Contains the initial data (seeds).

## How to use

### Applying Schema (Local or Remote)

If you have the Supabase CLI installed (`npm i -g supabase`):

1.  **Reset Database** (Wipe & Re-apply):

    ```bash
    supabase db reset
    ```

2.  **Apply New Migrations** (Keep data, apply only new changes):
    ```bash
    supabase migration up
    ```

### Creating New Changes

Instead of creating a file in `web/db/` and manually adding it to `dummy array`, do:

```bash
supabase migration new name_of_change
```

Then edit the new SQL file in `supabase/migrations/`.

## Legacy Files

The files in `web/db/` are now **DEPRECATED** as the source of truth for the schema, but are kept for reference or seed generation.
