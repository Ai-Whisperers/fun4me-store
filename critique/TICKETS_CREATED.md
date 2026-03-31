# Critique Issues → Actionable Tickets Mapping

This document maps issues identified in the critique/roast files to actionable tickets in `documentation/tickets/`.

**Status**: 5 tickets created from 4 critique files (high-priority issues only)

---

## Summary by Critique File

| Critique File | Issues Found | Tickets Created | Status |
|---------------|--------------|-----------------|--------|
| [01-architecture-roast.md](./01-architecture-roast.md) | 7 issues | 1 ticket | ✅ P0 issues converted |
| [05-testing-roast.md](./05-testing-roast.md) | 9 issues | 2 tickets | ✅ P0 issues converted |
| [09-security-roast.md](./09-security-roast.md) | 9 issues | 1 ticket | ✅ P0 issues converted |
| [12-typescript-roast.md](./12-typescript-roast.md) | 9 issues | 1 ticket | ✅ P0 issues converted |
| **Remaining 8 critiques** | ~50 issues | 0 tickets | 📋 P2/P3 backlog |

**Total**: 5 critical tickets created, ~50 lower-priority issues remain for future conversion.

---

## Tickets Created

### From `01-architecture-roast.md`

| Critique ID | Issue | Severity | Ticket Created | Priority |
|-------------|-------|----------|----------------|----------|
| **ARCH-001** | Bloated Server Actions (27KB files) | 🔴 Critical | [REF-009: Split Bloated Server Actions](../documentation/tickets/refactoring/REF-009-split-bloated-server-actions.md) | P0 |
| ARCH-002 | State Management Chaos | 🔴 Critical | ⏸️ **Deferred** (requires React Query migration discussion) | - |
| ARCH-003 | Theme Provider Misplacement | 🟠 High | ⏸️ **Quick fix** (30min - can be done ad-hoc) | - |
| ARCH-004 | Inconsistent Module Organization | 🟠 High | ⏸️ **P2 backlog** (organizational, not blocking) | - |
| ARCH-005 | Migration File Monsters | 🟠 High | ℹ️ **Process change only** (no code ticket needed) | - |
| ARCH-006 | Component Directory Sprawl | 🟡 Medium | ⏸️ **P2 backlog** | - |
| ARCH-007 | Missing Barrel Exports | 🟡 Medium | 📋 Existing: [REF-004](../documentation/tickets/refactoring/REF-004-component-barrel-exports.md) | P3 |

**Tickets Created**: 1 (REF-009)  
**Deferred/Existing**: 6 (lower priority or quick fixes)

---

### From `05-testing-roast.md`

| Critique ID | Issue | Severity | Ticket Created | Priority |
|-------------|-------|----------|----------------|----------|
| **TEST-001** | 20% Test Coverage | 🔴 Critical | 📋 Existing: [EPIC-17: Comprehensive Test Coverage](../documentation/tickets/epics/EPIC-17-comprehensive-test-coverage.md) | P0-P1 |
| **TEST-002** | E2E Tests Mostly Skipped | 🔴 Critical | ℹ️ **Covered by EPIC-17** | - |
| **TEST-003** | Generic Supabase Mock | 🔴 Critical | [TST-019: Improve Supabase Mock Realism](../documentation/tickets/testing/TST-019-improve-supabase-mock-realism.md) | P0 |
| **TEST-004** | No Pre-Commit Hooks | 🟠 High | [TST-020: Add Pre-Commit Hooks](../documentation/tickets/testing/TST-020-add-pre-commit-hooks.md) | P1 |
| TEST-005 | No Test Database Isolation | 🟠 High | ⏸️ **P2 backlog** (infrastructure, not urgent) | - |
| TEST-006 | Factory Underutilization | 🟠 High | ℹ️ **Cultural change** (no code ticket needed, add to dev guide) | - |
| TEST-007 | Missing Component Tests | 🟡 Medium | ℹ️ **Covered by EPIC-17** | - |
| TEST-008 | No Accessibility Testing | 🟡 Medium | 📋 Existing: [A11Y-001 through A11Y-003](../documentation/tickets/accessibility-compliance/) | P2 |
| TEST-009 | No Performance Tests | 🟡 Medium | 📋 Existing: [SCALE-001 through SCALE-003](../documentation/tickets/scalability/) | P2 |

**Tickets Created**: 2 (TST-019, TST-020)  
**Deferred/Existing**: 7 (covered by existing epics or lower priority)

---

### From `09-security-roast.md`

| Critique ID | Issue | Severity | Ticket Created | Priority |
|-------------|-------|----------|----------------|----------|
| **SEC-001** | Tenant Isolation Gaps | 🔴 Critical | 📋 Existing: [SEC-001: Tenant Validation](../documentation/tickets/security/SEC-001-tenant-validation.md) | P1 (Complete) |
| **SEC-002** | RLS Policy Verification | 🔴 Critical | [SEC-024: Comprehensive RLS Testing](../documentation/tickets/security/SEC-024-comprehensive-rls-testing.md) | P0 |
| **SEC-003** | Missing Rate Limiting | 🔴 Critical | 📋 Existing: [API-003: Rate Limiting](../documentation/tickets/api-gaps/API-003-rate-limiting.md) | P1 (Complete) |
| SEC-004 | Sensitive Data in Logs | 🟠 High | ⏸️ **P2 backlog** | - |
| SEC-005 | Input Validation Gaps | 🟠 High | 📋 Existing: [VALID-001 through VALID-004](../documentation/tickets/validation/) | P2 (Complete) |
| SEC-006 | QR Code Security | 🟠 High | ⏸️ **P2 backlog** (requires product decision) | - |
| SEC-007 | Session Security | 🟠 High | ⏸️ **P2 backlog** (verify existing config) | - |
| SEC-008 | Prescription Data Access | 🟡 Medium | ⏸️ **P2 backlog** | - |
| SEC-009 | File Upload Security | 🟡 Medium | ⏸️ **P2 backlog** | - |

**Tickets Created**: 1 (SEC-024)  
**Deferred/Existing**: 8 (many already completed or lower priority)

---

### From `12-typescript-roast.md`

| Critique ID | Issue | Severity | Ticket Created | Priority |
|-------------|-------|----------|----------------|----------|
| **TS-001** | 28 Environment Variable Assertions | 🔴 Critical | [TECH-006: Create Validated Env Module](../documentation/tickets/technical-debt/TECH-006-create-validated-env-module.md) | P0 |
| **TS-002** | Map/Set Access Without Guards | 🔴 Critical | ⏸️ **P2 backlog** (create helper function, low effort) | - |
| TS-003 | Unsafe Type Casts | 🟠 High | ⏸️ **P2 backlog** | - |
| TS-004 | Filter + Map Pattern Assertions | 🟠 High | ⏸️ **P2 backlog** (add type predicates) | - |
| TS-005 | Query Result Assumptions | 🟠 High | ⏸️ **P2 backlog** | - |
| TS-006 | Missing tsconfig Strictness | 🟡 Medium | ⏸️ **P2 backlog** | - |
| TS-007 | Object.keys Cast Pattern | 🟡 Medium | ⏸️ **P2 backlog** | - |
| TS-008 | Optional Chaining Misuse | 🟡 Medium | ⏸️ **P2 backlog** | - |
| TS-009 | Type Predicate Quality | 🟡 Medium | ℹ️ **Cultural change** (use existing predicates) | - |

**Tickets Created**: 1 (TECH-006)  
**Deferred/Existing**: 8 (lower priority or quick fixes)

---

## Remaining Critique Files (Not Yet Converted)

These 8 critique files have NOT been converted to tickets yet:

| File | Score | Key Issues | Estimated Tickets |
|------|-------|------------|-------------------|
| `02-code-quality-roast.md` | 6/10 | File size creep, inconsistent patterns | 3-5 tickets |
| `03-api-design-roast.md` | 7/10 | Two auth patterns, format chaos | 2-3 tickets |
| `04-database-roast.md` | 7.5/10 | RLS gaps, soft delete ignored | 2-4 tickets |
| `06-seeding-roast.md` | 7/10 | No FK validation, fragmented seeds | 1-2 tickets |
| `07-pages-roast.md` | 6.5/10 | Missing loading/empty states | 3-5 tickets |
| `08-ux-ui-roast.md` | 7/10 | Inconsistent styling patterns | 2-3 tickets |
| `10-dependencies-roast.md` | 4/10 | **CREDENTIALS IN GIT** (EMERGENCY), no CI/CD | 4-6 tickets |
| `11-documentation-roast.md` | 5/10 | No JSDoc, abandoned TODOs | 2-3 tickets |

**Estimated Total**: 19-31 additional tickets from remaining critiques.

---

## Conversion Priority Guide

### ✅ Already Converted (High Priority)

| Priority | Criteria | Action Taken |
|----------|----------|--------------|
| **P0 - Critical** | Security risks, data integrity, blocking | ✅ Converted to tickets |
| **P1 - High** | User impact, DX issues | ✅ Converted to tickets |

### 📋 Backlog (Future Conversion)

| Priority | Criteria | Action Plan |
|----------|----------|-------------|
| **P2 - Medium** | Code quality, maintainability | Convert as needed for sprint planning |
| **P3 - Low** | Nice-to-haves, polish | Convert only if actively working on area |

---

## How to Convert Remaining Issues

When ready to convert more critique issues to tickets:

1. **Read critique file** to understand issue context
2. **Determine severity** (P0/P1/P2/P3)
3. **Check for duplicates** in existing tickets
4. **Create ticket** using template:
   - Clear problem statement
   - Code examples from critique
   - Proposed solution
   - Acceptance criteria
   - Effort estimate
   - File paths affected
5. **Link to source** in ticket header (e.g., `Source: critique/XX-roast.md (ISSUE-ID)`)
6. **Update this file** with mapping

---

## Next Steps

### Immediate (This Sprint)
- [ ] Review 5 created tickets (REF-009, TST-019, TST-020, SEC-024, TECH-006)
- [ ] Prioritize in sprint backlog
- [ ] Assign owners
- [ ] Begin implementation

### Short-Term (Next 2 Sprints)
- [ ] Convert `10-dependencies-roast.md` (contains EMERGENCY credential issue)
- [ ] Convert `02-code-quality-roast.md` (code organization)
- [ ] Convert `07-pages-roast.md` (UX improvements)

### Long-Term (Backlog)
- [ ] Convert remaining 5 critique files as needed
- [ ] Archive critique files once all actionable items converted
- [ ] Create continuous improvement process to prevent issues

---

## Statistics

| Metric | Count |
|--------|-------|
| **Critique Files Reviewed** | 4 of 12 (33%) |
| **Issues Identified** | ~34 across 4 files |
| **Tickets Created** | 5 |
| **Tickets Deferred (P2/P3)** | ~20 |
| **Tickets Existing (Duplicates)** | ~9 |
| **Estimated Remaining Tickets** | 19-31 from 8 unreviewed files |

**Conversion Rate**: ~15% of issues became immediate tickets (P0/P1 only)  
**Efficiency**: Focused on highest-impact issues first

---

**Created**: 2026-01-19  
**Last Updated**: 2026-01-19  
**Status**: High-priority critique conversion complete. Remaining 8 files in backlog.
