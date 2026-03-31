# SCALE-004: Horizontal Scaling Preparation

## Priority: P3
## Category: Scalability
## Status: Not Started
## Epic: [EPIC-14: Load Testing & Scalability](../epics/EPIC-14-load-testing-scalability.md)

## Description
Prepare the application architecture for horizontal scaling across multiple instances, ensuring stateless design and proper session management.

## Current State
- Application runs on single Vercel instance
- In-memory state in some components
- Session management via Supabase (already stateless)
- File uploads go directly to Supabase Storage (good)

## Proposed Solution

### Stateless Verification Checklist
```typescript
// Audit all in-memory state usage
// lib/audit/stateless-check.ts

// ❌ Bad: In-memory cache
const cache = new Map();
export function getCached(key: string) {
  return cache.get(key);
}

// ✅ Good: External cache (Redis)
export async function getCached(key: string) {
  return await redis.get(key);
}

// ❌ Bad: Singleton with state
class RateLimiter {
  private requests = new Map();
}

// ✅ Good: Redis-backed rate limiting (already implemented)
import { Ratelimit } from '@upstash/ratelimit';
```

### Distributed Job Processing
```typescript
// lib/jobs/distributed.ts
import { Inngest } from 'inngest';

// Use Inngest for distributed background jobs
export const inngest = new Inngest({ id: 'vete-platform' });

// Jobs are automatically distributed across workers
export const processReminder = inngest.createFunction(
  { id: 'process-reminder' },
  { event: 'reminder/send' },
  async ({ event, step }) => {
    await step.run('send-notification', async () => {
      await sendReminderNotification(event.data.reminderId);
    });
  }
);
```

### Health Check Endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
  ]);

  const healthy = checks.every(c => c.status === 'ok');

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    instance: process.env.VERCEL_REGION || 'local',
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await db.execute(sql`SELECT 1`);
    return { name: 'database', status: 'ok' };
  } catch (error) {
    return { name: 'database', status: 'error', message: error.message };
  }
}
```

### Load Balancer Configuration
```typescript
// vercel.json
{
  "regions": ["gru1", "iad1"],  // São Paulo + US East
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

### Session Affinity (if needed)
```typescript
// For WebSocket connections (future)
// lib/websocket/cluster.ts
import { createAdapter } from '@socket.io/redis-adapter';

export function configureSocketCluster(io: Server) {
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  io.adapter(createAdapter(pubClient, subClient));
}
```

## Implementation Steps
1. Audit codebase for in-memory state
2. Migrate any in-memory caching to Redis
3. Verify background jobs use Inngest
4. Implement comprehensive health checks
5. Configure multi-region deployment
6. Test horizontal scaling behavior
7. Document scaling procedures

## Acceptance Criteria
- [ ] No in-memory state (except React)
- [ ] All caching via Redis
- [ ] Background jobs via Inngest
- [ ] Health check endpoint working
- [ ] Multi-region deployment tested
- [ ] Scaling runbook documented

## Stateless Audit Checklist
- [ ] No `new Map()` for caching
- [ ] No singleton state
- [ ] No local file writes (except /tmp)
- [ ] Session in Supabase/JWT
- [ ] Rate limiting via Upstash
- [ ] Job queue via Inngest

## Related Files
- `lib/cache/` - Caching layer
- `lib/jobs/` - Background jobs
- `app/api/health/` - Health checks
- `vercel.json` - Deployment config

## Estimated Effort
- 8 hours
  - State audit: 2h
  - Redis migration: 2h
  - Health checks: 2h
  - Multi-region setup: 2h
