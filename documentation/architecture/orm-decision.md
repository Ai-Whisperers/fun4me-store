# Architectural Decision Record: Selecting Drizzle ORM

## Status
Accepted

## Date
2025-12-23

## Context
The project currently uses the native Supabase (`supabase-js`) client for all database operations. While powerful, it lacks the full type safety and expressive query building capabilities of a dedicated ORM, especially for complex relationships and analytical queries.

## Decision
We will adopt **Drizzle ORM** as the project's standard ORM.

## Reasoning
1. **Lightweight & Fast:** Drizzle has zero dependencies and no runtime overhead, making it ideal for the serverless environment of Next.js and Supabase Edge functions.
2. **TypeScript-First:** It provides superior type safety derived directly from TypeScript definitions, without a separate code generation step.
3. **SQL-Like Syntax:** It remains close to SQL, providing full control while still offering high-level abstractions.
4. **Supabase Compatibility:** Drizzle's architecture is highly compatible with Supabase's Postgres backend and can be configured to respect Row Level Security (RLS).

## Consequences
- **Pros:**
    - Improved developer experience with full type safety and autocompletion.
    - Faster query writing for complex joins and aggregations.
    - Reduced boilerplate for database interactions.
- **Cons:**
    - Introduces a new dependency and toolset (`drizzle-kit`).
    - Requires a manual setup of connection management to ensure RLS compliance where necessary.

## Implementation Strategy
1. Install `drizzle-orm` and `drizzle-kit`.
2. Configure Drizzle to connect to the Supabase database.
3. Use Drizzle for a new "Audit Logs" feature.
4. Migrate the "Profiles" data access to use Drizzle.
