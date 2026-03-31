# Agent Task Lists - 10 Agent Parallel Work

This directory contains structured task lists for 10 AI agents working in parallel on the Vete veterinary platform.

## Quick Start

1. **Read `00-COORDINATION.md` first** - Master coordination document
2. **Read your agent file** - `XX-agent-*.md`
3. **Read project context** - Main `CLAUDE.md` at project root
4. **Start working** - Follow tasks in order

---

## Agent Assignments

| Agent | File | Domain | Priority | Est. Hours |
|-------|------|--------|----------|------------|
| Agent-01 | `01-agent-auth.md` | Password Reset | 🔴 Critical | 4-6h |
| Agent-02 | `02-agent-pets.md` | Pet Editing | 🔴 Critical | 4-6h |
| Agent-03 | `03-agent-appointments-owner.md` | Owner Appointments | 🔴 Critical | 6-8h |
| Agent-04 | `04-agent-appointments-staff.md` | Staff Appointments | 🟡 High | 8-10h |
| Agent-05 | `05-agent-invoicing.md` | Invoice UI | 🟡 High | 10-14h |
| Agent-06 | `06-agent-messaging.md` | Chat UI | 🟡 High | 10-14h |
| Agent-07 | `07-agent-calendar.md` | Calendar View | 🟡 High | 10-14h |
| Agent-08 | `08-agent-hospitalization.md` | Hospitalization | 🟡 High | 14-18h |
| Agent-09 | `09-agent-labs.md` | Lab Results | 🟡 High | 12-16h |
| Agent-10 | `10-agent-reports.md` | Reports/Analytics | 🟡 High | 12-16h |

---

## Execution Order

```
PHASE 1 (Start Immediately)
├── Agent-01: Auth ──────────────────→ [2-4h] ✓
├── Agent-02: Pets ──────────────────→ [2-4h] ✓
└── Agent-03: Appointments (Owner) ──→ [4-6h] ✓

PHASE 2 (Start after 30 mins)
├── Agent-04: Appointments (Staff) ──→ [6-8h]
├── Agent-05: Invoicing ─────────────→ [8-12h]
├── Agent-06: Messaging ─────────────→ [8-12h]
└── Agent-07: Calendar ──────────────→ [8-12h]

PHASE 3 (Start after 1 hour)
├── Agent-08: Hospitalization ───────→ [12-16h]
├── Agent-09: Labs ──────────────────→ [10-14h]
└── Agent-10: Reports ───────────────→ [10-14h]
```

---

## File Ownership Matrix

**CRITICAL: Each agent owns specific files. Never modify another agent's files.**

| Directory/File | Owner |
|----------------|-------|
| `app/[clinic]/auth/forgot-password/*` | Agent-01 |
| `app/[clinic]/auth/reset-password/*` | Agent-01 |
| `app/actions/auth.ts` | Agent-01 |
| `app/[clinic]/portal/pets/*/edit/*` | Agent-02 |
| `app/actions/pets.ts` | Agent-02 |
| `app/[clinic]/portal/appointments/*` | Agent-03 |
| `app/actions/appointments.ts` | Agent-03 (Agent-04 adds) |
| `components/appointments/*` | Agent-03 |
| `app/[clinic]/dashboard/appointments/*` | Agent-04 |
| `app/api/appointments/*` | Agent-04 |
| `components/dashboard/appointments/*` | Agent-04 |
| `app/[clinic]/dashboard/invoices/*` | Agent-05 |
| `components/invoices/*` | Agent-05 |
| `app/[clinic]/portal/messages/*` | Agent-06 |
| `app/[clinic]/dashboard/messages/*` | Agent-06 |
| `components/messaging/*` | Agent-06 |
| `app/[clinic]/dashboard/calendar/*` | Agent-07 |
| `app/api/staff/schedule/*` | Agent-07 |
| `components/calendar/*` | Agent-07 |
| `app/[clinic]/dashboard/hospitalization/*` | Agent-08 |
| `app/api/hospitalizations/*` | Agent-08 |
| `components/hospitalization/*` | Agent-08 |
| `app/[clinic]/dashboard/labs/*` | Agent-09 |
| `app/api/lab-orders/*` | Agent-09 |
| `components/labs/*` | Agent-09 |
| `app/[clinic]/dashboard/reports/*` | Agent-10 |
| `app/api/reports/*` | Agent-10 |
| `components/reports/*` | Agent-10 |

---

## Database Migration Ranges

| Agent | Range | Example |
|-------|-------|---------|
| Agent-01 | 33-39 | `33_auth_enhancements.sql` |
| Agent-02 | 40-49 | `40_pet_enhancements.sql` |
| Agent-03/04 | 50-59 | `50_appointment_workflow.sql` |
| Agent-05 | 60-69 | `60_invoicing_enhancements.sql` |
| Agent-06 | 70-79 | `70_messaging_enhancements.sql` |
| Agent-07 | 80-89 | `80_staff_schedules.sql` |
| Agent-08 | 90-99 | `90_hospitalization_enhancements.sql` |
| Agent-09 | 100-109 | `100_lab_enhancements.sql` |
| Agent-10 | 110-119 | `110_report_views.sql` |

---

## Shared Resources (READ ONLY)

All agents can READ but not MODIFY:
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/types/database.ts`
- `lib/clinics.ts`
- `components/ui/*`

---

## Conflict Resolution

If you accidentally touch another agent's file:
1. **STOP** - Don't continue
2. **REVERT** - Undo the change
3. **DOCUMENT** - Note in your handoff what you needed
4. **WORKAROUND** - Create in YOUR domain instead

---

## Required Reading Before Starting

1. `00-COORDINATION.md` - This master guide
2. Your agent file (`XX-agent-*.md`)
3. `../06-technical-notes.md` - Code patterns
4. `CLAUDE.md` (project root) - Project context

---

## Handoff Protocol

When pausing work, update your agent file's "Handoff Notes" section:
- Mark completed tasks
- Note in-progress work
- Document any blockers
- List integration needs

---

## Dependencies Between Agents

| Agent | Depends On | Notes |
|-------|------------|-------|
| Agent-01 | None | Independent |
| Agent-02 | None | Independent |
| Agent-03 | None | Creates shared types |
| Agent-04 | Agent-03 | Uses appointment types/actions |
| Agent-05 | None | API already exists |
| Agent-06 | None | API already exists |
| Agent-07 | None | Independent |
| Agent-08 | None | Schema exists |
| Agent-09 | None | Schema exists |
| Agent-10 | None | Independent |

---

## Success Criteria

All agents should ensure:
- [ ] All text is in Spanish
- [ ] Uses CSS variables (no hardcoded colors)
- [ ] Mobile responsive
- [ ] Auth checks on all pages/APIs
- [ ] Tenant isolation (filter by tenant_id)
- [ ] Handoff notes updated
- [ ] Tests written (if time permits)

---

*Created: December 2024*
*For: 10-Agent Parallel Development*
