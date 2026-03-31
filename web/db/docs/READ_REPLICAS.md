# Read Replica Configuration Guide

This guide explains how to configure and use read replicas for the Vete veterinary platform to scale read-heavy workloads.

## Overview

Read replicas provide:
- **Horizontal read scaling**: Distribute SELECT queries across multiple database instances
- **Geographic distribution**: Place replicas closer to users in different regions
- **Reporting isolation**: Run heavy analytics without impacting production
- **High availability**: Failover capability if primary fails

## Architecture

```
                         ┌──────────────────┐
                         │   Application    │
                         │    (Next.js)     │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼─────┐               ┌─────▼─────┐
              │  Writes   │               │  Reads    │
              │  (Mutations)              │  (Queries)│
              └─────┬─────┘               └─────┬─────┘
                    │                           │
              ┌─────▼─────┐               ┌─────▼─────┐
              │  Primary  │──Replication──▶  Replica  │
              │  Database │               │  Database │
              └───────────┘               └───────────┘
```

## Supabase Read Replicas

### Enabling Read Replicas

1. Go to Supabase Dashboard → Project Settings → Database
2. Click "Add Read Replica"
3. Select region (choose closest to your users)
4. Wait for provisioning (~5-10 minutes)

### Connection Strings

After enabling, you'll have two connection strings:

```bash
# Primary (read/write)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Replica (read-only)
DATABASE_URL_REPLICA=postgresql://postgres:[password]@db.[project-ref]-replica.supabase.co:5432/postgres
```

## Application Configuration

### 1. Environment Variables

Add to `.env.local`:

```env
# Primary database (writes)
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres

# Read replica (reads)
DATABASE_URL_REPLICA=postgresql://postgres:xxx@db.xxx-replica.supabase.co:5432/postgres

# Enable read replica routing
USE_READ_REPLICA=true
```

### 2. Database Client Configuration

Update `web/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { env } from '@/lib/env'

// Primary connection (read/write)
const primaryClient = postgres(env.DATABASE_URL, {
  prepare: false,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  min: parseInt(process.env.DB_POOL_MIN || '0', 10),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '20', 10),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10),
  max_lifetime: 60 * 30,
})

// Replica connection (read-only) - optional
const replicaClient = process.env.DATABASE_URL_REPLICA
  ? postgres(process.env.DATABASE_URL_REPLICA, {
      prepare: false,
      max: parseInt(process.env.DB_POOL_MAX_REPLICA || '20', 10),  // More capacity for reads
      min: 0,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    })
  : null

// Export both connections
export const db = drizzle(primaryClient, { schema })
export const dbRead = replicaClient
  ? drizzle(replicaClient, { schema })
  : db  // Fallback to primary if no replica

// Health checks
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await primaryClient`SELECT 1`
    return true
  } catch {
    return false
  }
}

export async function isReplicaHealthy(): Promise<boolean> {
  if (!replicaClient) return false
  try {
    await replicaClient`SELECT 1`
    return true
  } catch {
    return false
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await primaryClient.end()
  if (replicaClient) await replicaClient.end()
}
```

### 3. Using Read Replicas in API Routes

```typescript
import { db, dbRead } from '@/db'

// Use dbRead for SELECT queries
export async function GET(request: NextRequest) {
  // Read from replica (fast, scalable)
  const { data } = await dbRead
    .select()
    .from(appointments)
    .where(eq(appointments.tenant_id, tenantId))

  return NextResponse.json(data)
}

// Use db for mutations
export async function POST(request: NextRequest) {
  // Write to primary
  const result = await db
    .insert(appointments)
    .values(newAppointment)
    .returning()

  return NextResponse.json(result)
}
```

### 4. Query Routing Middleware

Create a helper for automatic routing:

```typescript
// lib/db/query-router.ts
import { db, dbRead } from '@/db'

export type QueryType = 'read' | 'write'

export function getDb(queryType: QueryType = 'read') {
  return queryType === 'write' ? db : dbRead
}

// Usage in API routes
const database = getDb('read')
const results = await database.select().from(table)
```

### 5. Supabase Client Configuration

For Supabase client (RLS-enabled queries):

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'

export async function createClient(options?: { useReplica?: boolean }) {
  const url = options?.useReplica && process.env.NEXT_PUBLIC_SUPABASE_URL_REPLICA
    ? process.env.NEXT_PUBLIC_SUPABASE_URL_REPLICA
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: /* ... */ }
  )
}
```

## Query Routing Strategy

### Route to Replica (dbRead)

- Dashboard data fetches
- Search/filter operations
- Reports and analytics
- Listing pages (appointments, patients, invoices)
- Public-facing pages (services, products)
- Historical data lookups

### Route to Primary (db)

- All INSERT/UPDATE/DELETE operations
- Queries that must see latest data immediately
- Transactional operations (checkout, payments)
- Real-time features (new messages check)
- Operations that write and then read

## Handling Replication Lag

Replicas may be slightly behind primary (typically <1 second). Handle this:

### 1. Read-After-Write Consistency

```typescript
// After creating a record, read from primary briefly
export async function createAndReturn(data: NewRecord) {
  // Write to primary
  const [created] = await db
    .insert(records)
    .values(data)
    .returning()

  // Return immediately from primary (not replica)
  // Client can refresh later to get replica-synced data
  return created
}
```

### 2. Stale Data Indicators

```typescript
// Include data freshness in response
export async function GET() {
  const data = await dbRead.select().from(table)

  return NextResponse.json({
    data,
    meta: {
      source: 'replica',
      warning: 'Data may be up to 1 second stale'
    }
  })
}
```

### 3. Force Primary for Critical Reads

```typescript
// Query parameter to force fresh data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const forceFresh = searchParams.get('fresh') === 'true'

  const database = forceFresh ? db : dbRead
  const data = await database.select().from(table)

  return NextResponse.json(data)
}
```

## Monitoring

### Replication Lag Query

```sql
-- Check replication lag (run on replica)
SELECT
    CASE
        WHEN pg_is_in_recovery() THEN
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
        ELSE
            0
    END AS replication_lag_seconds;
```

### Connection Pool Stats

```sql
-- Check active connections per database
SELECT
    datname,
    usename,
    application_name,
    client_addr,
    state,
    count(*) as connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;
```

## Multi-Region Setup

For global applications, deploy replicas in multiple regions:

```
┌────────────────────────────────────────────────────────────────┐
│                         Americas                                │
│  ┌─────────────┐                                               │
│  │   Primary   │◄──────────────────────────────────────────┐   │
│  │  (us-east)  │                                           │   │
│  └──────┬──────┘                                           │   │
│         │                                                  │   │
│         │ Replication                                      │   │
│         ▼                                                  │   │
│  ┌─────────────┐                                           │   │
│  │  Replica 1  │                                           │   │
│  │  (us-west)  │                                           │   │
│  └─────────────┘                                           │   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                           EMEA                                  │
│  ┌─────────────┐                                               │
│  │  Replica 2  │◄──────────────────────────────────────────────┤
│  │ (eu-west-1) │                                               │
│  └─────────────┘                                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                           APAC                                  │
│  ┌─────────────┐                                               │
│  │  Replica 3  │◄──────────────────────────────────────────────┘
│  │ (ap-south)  │
│  └─────────────┘
└────────────────────────────────────────────────────────────────┘
```

### Geographic Routing

```typescript
// Route to nearest replica based on request origin
function getReplicaForRegion(region: string) {
  const replicas = {
    'us': process.env.DATABASE_URL_REPLICA_US,
    'eu': process.env.DATABASE_URL_REPLICA_EU,
    'ap': process.env.DATABASE_URL_REPLICA_AP,
  }
  return replicas[region] || replicas['us']
}
```

## Cost Considerations

| Component | Supabase Pro | Supabase Team |
|-----------|--------------|---------------|
| Read Replicas | 1 included | 2 included |
| Additional Replicas | $75/month each | $75/month each |
| Cross-region | Additional bandwidth | Additional bandwidth |

## Checklist

- [ ] Enable read replica in Supabase Dashboard
- [ ] Add `DATABASE_URL_REPLICA` to environment variables
- [ ] Update `db/index.ts` with replica connection
- [ ] Audit API routes for read/write classification
- [ ] Update heavy-read routes to use `dbRead`
- [ ] Add replication lag monitoring
- [ ] Test failover scenarios
- [ ] Document query routing for team

---

_Last updated: January 2026_
