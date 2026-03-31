# Agent Coordination Guide

## Overview

This document coordinates 10 AI agents working in parallel on the Vete platform. Each agent has isolated tasks that don't conflict with others.

**Total Agents**: 10
**Parallelization Strategy**: Feature-based isolation
**Conflict Prevention**: Separate file domains per agent

---

## Agent Assignment Matrix

| Agent | Domain | Files Owned | Dependencies |
|-------|--------|-------------|--------------|
| Agent-01 | Authentication | `app/[clinic]/auth/*`, `actions/auth.ts` | None |
| Agent-02 | Pet Management | `app/[clinic]/portal/pets/*`, `actions/pets.ts` | None |
| Agent-03 | Appointments (Owner) | `app/[clinic]/portal/appointments/*`, `components/appointments/*` | None |
| Agent-04 | Appointments (Staff) | `app/[clinic]/dashboard/appointments/*`, `api/appointments/*` | Agent-03 shared types |
| Agent-05 | Invoicing UI | `app/[clinic]/dashboard/invoices/*`, `components/invoices/*` | None (API exists) |
| Agent-06 | Messaging UI | `app/[clinic]/portal/messages/*`, `components/messaging/*` | None (API exists) |
| Agent-07 | Calendar & Scheduling | `app/[clinic]/dashboard/calendar/*`, `components/calendar/*` | None |
| Agent-08 | Hospitalization | `app/[clinic]/dashboard/hospitalization/*`, `api/hospitalizations/*` | None |
| Agent-09 | Lab Results | `app/[clinic]/dashboard/labs/*`, `api/lab-orders/*` | None |
| Agent-10 | Reports & Analytics | `app/[clinic]/dashboard/reports/*`, `api/reports/*` | None |

---

## Execution Phases

### Phase 1: Foundation (Agents 1-3 start immediately)
These agents have NO dependencies and can start right away.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Agent-01     │  │    Agent-02     │  │    Agent-03     │
│  Auth (Reset)   │  │   Pet Editing   │  │ Appt Cancel UI  │
│                 │  │                 │  │                 │
│  Time: 2-4h     │  │  Time: 2-4h     │  │  Time: 4-6h     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   [Complete]           [Complete]           [Complete]
```

### Phase 2: Core Features (Agents 4-7 start after Phase 1 kickoff)
Can start 30 minutes after Phase 1 begins (no real dependencies, just staggered).

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Agent-04     │  │    Agent-05     │  │    Agent-06     │  │    Agent-07     │
│ Appt Staff View │  │  Invoicing UI   │  │  Messaging UI   │  │ Calendar View   │
│                 │  │                 │  │                 │  │                 │
│  Time: 6-8h     │  │  Time: 8-12h    │  │  Time: 8-12h    │  │  Time: 8-12h    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Phase 3: Advanced Features (Agents 8-10 start after Phase 2 kickoff)
Can start 1 hour after Phase 2 begins.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Agent-08     │  │    Agent-09     │  │    Agent-10     │
│ Hospitalization │  │   Lab Results   │  │    Reports      │
│                 │  │                 │  │                 │
│  Time: 12-16h   │  │  Time: 10-14h   │  │  Time: 10-14h   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## File Ownership Rules

### CRITICAL: No Agent Should Touch Another Agent's Files

Each agent owns specific directories. **NEVER modify files outside your domain.**

#### Shared Files (READ ONLY for all agents)
```
lib/supabase/server.ts      # READ ONLY - Supabase client
lib/supabase/client.ts      # READ ONLY - Browser client
lib/types/database.ts       # READ ONLY - Type definitions
lib/clinics.ts              # READ ONLY - Content loading
components/ui/*             # READ ONLY - Shared UI components
```

#### If You Need a Shared Component
1. Check if it exists in `components/ui/`
2. If not, create it in YOUR domain folder first
3. Document in handoff notes that it could be promoted to shared

---

## Conflict Prevention Strategies

### 1. Type Definitions
**Problem**: Multiple agents might need new types.
**Solution**: Each agent creates types in their own file.

```typescript
// Agent-05 creates: lib/types/invoicing.ts
// Agent-06 creates: lib/types/messaging.ts
// Agent-08 creates: lib/types/hospitalization.ts
```

### 2. Server Actions
**Problem**: Multiple agents might add to actions/.
**Solution**: Each agent owns their action file.

```
actions/auth.ts          → Agent-01 ONLY
actions/pets.ts          → Agent-02 ONLY
actions/appointments.ts  → Agent-03 owns, Agent-04 can READ
actions/invoices.ts      → Agent-05 ONLY
actions/messages.ts      → Agent-06 ONLY
actions/calendar.ts      → Agent-07 ONLY
actions/hospitalization.ts → Agent-08 ONLY
actions/labs.ts          → Agent-09 ONLY
actions/reports.ts       → Agent-10 ONLY
```

### 3. API Routes
**Problem**: API routes might overlap.
**Solution**: Clear route ownership.

```
api/auth/*               → Agent-01
api/pets/*               → Agent-02
api/appointments/*       → Agent-04 (Agent-03 uses existing)
api/invoices/*           → EXISTS (Agent-05 uses it)
api/conversations/*      → EXISTS (Agent-06 uses it)
api/messages/*           → EXISTS (Agent-06 uses it)
api/staff/schedule/*     → Agent-07
api/hospitalizations/*   → Agent-08
api/lab-orders/*         → Agent-09
api/reports/*            → Agent-10
```

### 4. Database Migrations
**Problem**: Multiple agents might need schema changes.
**Solution**: Reserved migration number ranges.

```
33-39: Agent-01 (Auth)
40-49: Agent-02 (Pets)
50-59: Agent-03/04 (Appointments)
60-69: Agent-05 (Invoicing)
70-79: Agent-06 (Messaging)
80-89: Agent-07 (Calendar)
90-99: Agent-08 (Hospitalization)
100-109: Agent-09 (Labs)
110-119: Agent-10 (Reports)
```

### 5. Component Naming
**Problem**: Component name collisions.
**Solution**: Domain-prefixed or folder-isolated components.

```
components/auth/           → Agent-01
components/pets/           → Agent-02
components/appointments/   → Agent-03/04
components/invoices/       → Agent-05
components/messaging/      → Agent-06
components/calendar/       → Agent-07
components/hospitalization/→ Agent-08
components/labs/           → Agent-09
components/reports/        → Agent-10
```

---

## Communication Protocol

### When You Need Something From Another Agent's Domain

1. **DON'T** modify their files
2. **DO** document the need in your handoff notes
3. **DO** create a temporary workaround in your domain
4. **DO** flag it for integration later

### Handoff Note Format
```markdown
## Handoff Notes

### Completed
- [x] Task 1
- [x] Task 2

### In Progress
- [ ] Task 3 (50% done)

### Blocked/Needs Integration
- Need `AppointmentStatus` type from Agent-04
- Need cancel button callback in appointment list (Agent-03)

### For Next Session
- Start with Task 4
- Review the TODO in file X
```

---

## Shared Dependencies (Pre-installed)

All agents can assume these are available:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.88.0",
    "@supabase/ssr": "latest",
    "next": "15.5.9",
    "react": "^19.0.0",
    "recharts": "^3.6.0",
    "zod": "^3.x",
    "date-fns": "^3.x",
    "lucide-react": "latest"
  }
}
```

### If You Need a New Package

1. Document it in your task file
2. Use what's available if possible
3. Don't install without documenting

---

## Testing Strategy

Each agent is responsible for testing their own domain:

```
tests/unit/auth/         → Agent-01
tests/unit/pets/         → Agent-02
tests/unit/appointments/ → Agent-03/04
tests/unit/invoices/     → Agent-05
tests/unit/messaging/    → Agent-06
tests/unit/calendar/     → Agent-07
tests/unit/hospitalization/ → Agent-08
tests/unit/labs/         → Agent-09
tests/unit/reports/      → Agent-10
```

---

## Integration Points

After all agents complete, these integrations will be needed:

### Dashboard Home Page
- Agent-05: Invoice summary widget
- Agent-07: Today's calendar widget
- Agent-08: Hospitalized patients count
- Agent-09: Pending lab results count
- Agent-10: Key metrics

### Portal Home Page
- Agent-02: Pet cards (exists)
- Agent-03: Upcoming appointments
- Agent-06: Unread messages count

### Navigation Updates
- Each agent adds their routes to nav (document only, don't modify nav)

---

## Quick Reference: Who Owns What

### By Feature
| Feature | Owner |
|---------|-------|
| Login/Logout | Exists |
| Password Reset | Agent-01 |
| Pet Create | Exists |
| Pet Edit | Agent-02 |
| Pet Delete | Agent-02 |
| Appointment Book | Exists |
| Appointment Cancel | Agent-03 |
| Appointment Reschedule | Agent-03 |
| Staff Appointment View | Agent-04 |
| Check-in/Complete | Agent-04 |
| Invoice Create | Agent-05 |
| Invoice Send | Agent-05 |
| Payment Record | Agent-05 |
| Chat UI | Agent-06 |
| Message Templates | Agent-06 |
| Calendar View | Agent-07 |
| Staff Schedule | Agent-07 |
| Admit Patient | Agent-08 |
| Vitals Recording | Agent-08 |
| Discharge | Agent-08 |
| Lab Order | Agent-09 |
| Results Entry | Agent-09 |
| Financial Reports | Agent-10 |
| Analytics Dashboard | Agent-10 |

### By Page Route
| Route | Owner |
|-------|-------|
| `/[clinic]/auth/forgot-password` | Agent-01 |
| `/[clinic]/auth/reset-password` | Agent-01 |
| `/[clinic]/portal/pets/[id]/edit` | Agent-02 |
| `/[clinic]/portal/appointments/*` | Agent-03 |
| `/[clinic]/portal/messages/*` | Agent-06 |
| `/[clinic]/dashboard/appointments/*` | Agent-04 |
| `/[clinic]/dashboard/invoices/*` | Agent-05 |
| `/[clinic]/dashboard/calendar/*` | Agent-07 |
| `/[clinic]/dashboard/hospitalization/*` | Agent-08 |
| `/[clinic]/dashboard/labs/*` | Agent-09 |
| `/[clinic]/dashboard/reports/*` | Agent-10 |

---

## Startup Checklist for Each Agent

Before starting work:

1. [ ] Read this coordination document
2. [ ] Read your specific task file (`XX-agent-name.md`)
3. [ ] Read `../06-technical-notes.md` for code patterns
4. [ ] Read the main `CLAUDE.md` for project context
5. [ ] Verify you understand your file ownership boundaries
6. [ ] Check the shared components available in `components/ui/`
7. [ ] Start with the first task in your list

---

## Emergency Conflicts

If you accidentally modify another agent's file:

1. STOP immediately
2. Revert the change
3. Document what you needed in your handoff notes
4. Create the functionality in YOUR domain instead

---

*This document should be read by all agents before starting work.*
