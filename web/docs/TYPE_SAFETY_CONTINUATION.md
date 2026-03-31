# Type Safety Cleanup - Continuation Guide

**Session Summary**: 65/149 violations fixed (44% complete)  
**Remaining Work**: 81 violations across 38 files  
**Estimated Time**: 4-7 hours

---

## Quick Start Commands

```bash
# Navigate to project
cd web

# Check current violation count
npm run lint 2>&1 | grep -E "no-explicit-any|no-non-null-assertion" | wc -l
# Expected: ~81

# Run tests (baseline)
npm run test:unit
# Expected: 920 passing

# View detailed remaining violations
cat docs/TYPE_SAFETY_REMAINING.md
```

---

## Recommended Approach: Phase-by-Phase

### Phase 1: Quick Wins (1-2 hours)

**Target**: 30 violations in files with single issues

**Strategy**: Fix all single-violation files first for maximum progress with minimum complexity.

```bash
# Get list of files with single violations
npm run lint 2>&1 | grep "1 problem" -B5 | grep "\.tsx\|\.ts" | sort -u > /tmp/single-files.txt

# Work through them one by one
head -10 /tmp/single-files.txt
```

**Common Patterns**:

1. Filter-guaranteed assertions → Add eslint-disable comment
2. Array[0] access → Add null check or default value
3. `Record<string, any>` → Change to `Record<string, unknown>`

**Example Fix**:

```typescript
// File: components/booking/booking-wizard/index.tsx
// Before: const item = items.find(x => x.id === id)!
// After:
const item = items.find((x) => x.id === id)
if (!item) throw new Error('Item not found')
```

**Test After Each Batch**:

```bash
# Every 5-10 fixes, run tests
npm run test:unit

# Check progress
npm run lint 2>&1 | grep -E "no-explicit-any|no-non-null-assertion" | wc -l
```

---

### Phase 2: Medium Complexity (2-3 hours)

**Target**: 35 violations in files with 2-3 issues

**Priority Files**:

1. `lib/domain/messaging/service.ts` (2 any)
2. `lib/domain/safety/service.ts` (2 any)
3. `app/[clinic]/layout.tsx` (2 any, 1 non-null)
4. Component files with 2-3 non-null assertions

**Strategy**: Fix one complete file at a time. Read surrounding context to understand why the violation exists.

**Example - Messaging Service**:

```typescript
// lib/domain/messaging/service.ts

// Before:
async sendMessage(data: any) {
  // ...
}

// After: Create proper interface
interface MessageData {
  recipient: string
  content: string
  type: 'sms' | 'email' | 'whatsapp'
  metadata?: Record<string, unknown>
}

async sendMessage(data: MessageData) {
  // ...
}
```

**Test After Each File**:

```bash
npm run test:unit
npm run lint lib/domain/messaging/service.ts
```

---

### Phase 3: Complex Cases (1-2 hours)

**Target**: 16 violations in files with 4+ issues

**High Priority Files**:

1. `app/[clinic]/euthanasia_assessments/client.tsx` (5 violations)
2. `app/api/vaccines/recommendations/route.ts` (4 violations)
3. `components/calendar/calendar.tsx` (4 violations)
4. `components/consents/consent-pdf.tsx` (3 violations)

**Strategy**:

1. Read the entire file to understand context
2. Identify common patterns (e.g., all are filter-guaranteed)
3. Fix all similar violations together
4. Test thoroughly after each file

**Example - Vaccine Recommendations**:

```typescript
// app/api/vaccines/recommendations/route.ts
// Pattern: Multiple filter-guaranteed assertions

// Add block comment at top of function:
/* eslint-disable @typescript-eslint/no-non-null-assertion */

// At the end:
/* eslint-enable @typescript-eslint/no-non-null-assertion */

// With explanatory comment:
// Non-null assertions in this function are safe because:
// 1. All arrays are filtered to ensure properties exist before mapping
// 2. Results are validated against schema before processing
```

**Test After Each File**:

```bash
npm run test:unit
npm run lint <filepath>
npm run build  # For critical files
```

---

## Alternative Approach: By File Type

### Option A: Components First (2 hours)

Fix all 18 component files together to establish consistent patterns.

```bash
# Get all component files with violations
npm run lint components/ 2>&1 | grep "error.*no-" -B1 | grep "\.tsx"

# Common component patterns:
# 1. Event handlers: (e: any) → (e: React.MouseEvent<HTMLElement>)
# 2. Refs: ref.current! → if (!ref.current) return
# 3. Props: props.item! → Add default value or null check
```

### Option B: Backend First (2-3 hours)

Fix all API routes and services for production stability.

```bash
# Get all API/service files
npm run lint app/api/ lib/services/ lib/domain/ 2>&1 | grep "error.*no-"

# Common backend patterns:
# 1. Supabase results: data! → if (!data || error) return handleError()
# 2. Array operations: array[0]! → with length check
# 3. Generic types: any → Record<string, unknown> or specific interface
```

### Option C: Low-Hanging Fruit (1 hour)

Fix only the easiest violations for quick progress boost.

```bash
# Target: Simple filter-guaranteed assertions and Record<any, string>

# Pattern 1: Filter-guaranteed (15 violations)
const ids = items.filter(i => i.id).map(i => i.id!)
# → Add eslint-disable comment

# Pattern 2: Record<string, any> (10 violations)
data: Record<string, any>
# → Change to Record<string, unknown>
```

---

## Session Planning

### Session 1: Quick Progress (1.5 hours)

- **Goal**: Fix 30 violations (single-issue files)
- **Outcome**: 81 → 51 violations (63% complete)
- **Risk**: Low (isolated changes)

### Session 2: Core Logic (2 hours)

- **Goal**: Fix API routes and services (20 violations)
- **Outcome**: 51 → 31 violations (79% complete)
- **Risk**: Medium (business logic)

### Session 3: Components & Polish (2 hours)

- **Goal**: Fix remaining component files (30 violations)
- **Outcome**: 31 → 1 violations (99% complete)
- **Risk**: Low-Medium (UI logic)

### Session 4: Final Sweep (1 hour)

- **Goal**: Fix last complex cases
- **Outcome**: 1 → 0 violations (100% complete)
- **Risk**: High (most complex remaining)

---

## Quality Gates

### After Each Phase

```bash
# 1. Tests must pass
npm run test:unit
# Expected: 920/920 passing

# 2. Build must succeed
npm run build
# Expected: No errors

# 3. Violation count reduced
npm run lint 2>&1 | grep -E "no-explicit-any|no-non-null-assertion" | wc -l
# Expected: Lower than before

# 4. No new violations
npm run lint | grep "problems"
# Expected: Only type safety violations, no new warnings
```

### Before Final Completion

```bash
# Full test suite
npm run test

# E2E tests (if applicable)
npm run test:e2e

# Type checking
npm run typecheck

# Final lint
npm run lint
```

---

## Troubleshooting

### Issue: Tests Fail After Fix

**Symptom**: Type fix causes runtime error

```bash
npm run test:unit
# Some tests failing
```

**Solution**:

1. Review the fix - was a non-null assertion actually protecting against null?
2. Check if proper error handling was added
3. Look at test expectations - do they need updating?

**Example**:

```typescript
// Before (worked but unsafe):
const item = items[0]!
processItem(item)

// After (fix introduces null):
const item = items[0]
if (!item) throw new Error('No items') // ← Tests may not expect this error
processItem(item)

// Better fix:
const item = items[0]
if (!item) {
  console.warn('No items to process')
  return // Graceful handling
}
processItem(item)
```

### Issue: Build Fails After Fix

**Symptom**: TypeScript compilation error

```bash
npm run build
# Type error in dependent files
```

**Solution**:

1. The fixed type may be used elsewhere incorrectly
2. Check imports and usages of the changed type
3. Fix or update dependent code

### Issue: Too Many Violations in One File

**Symptom**: File has 10+ violations, overwhelming to fix

**Solution**: Break it down

1. Group violations by pattern (all filter-guaranteed, all array access, etc.)
2. Fix one pattern at a time
3. Or use block-level eslint-disable with thorough justification

---

## Code Review Checklist

Before marking a fix complete:

- [ ] Violation is fixed or properly justified
- [ ] eslint-disable comments include explanation
- [ ] No non-null assertions without justification
- [ ] `any` is replaced with specific type or `unknown`
- [ ] Tests pass for the modified file
- [ ] Build succeeds
- [ ] No new violations introduced
- [ ] Error handling added if removing assertions
- [ ] Documentation updated if API changed

---

## Communication Template

When resuming work:

```
Resuming Type Safety Cleanup
Current: 81 violations remaining (44% complete)
Target: Fix [X] violations in [Y] hours
Approach: [Phase 1 / Phase 2 / Phase 3]

Starting with: [file or category]
Expected outcome: [new violation count]

Files to modify:
1. [file1]
2. [file2]
...
```

When completing a phase:

```
Phase [X] Complete
Fixed: [N] violations
Time: [actual time]
Tests: [pass/fail status]
New violation count: [number]
Progress: [percentage]%

Next steps: [continue to Phase X+1 / review findings / pause]
```

---

## Success Definition

**Phase 1 Complete**: 51 violations remaining (66% done)  
**Phase 2 Complete**: 31 violations remaining (79% done)  
**Phase 3 Complete**: 1 violations remaining (99% done)  
**Project Complete**: 0 violations remaining (100% done)

**Final Deliverables**:

1. ✅ All 149 violations fixed or justified
2. ✅ All tests passing (920/920)
3. ✅ Build successful
4. ✅ Documentation updated
5. ✅ Progress report completed
6. ✅ Patterns documented for future development

---

## Reference Documents

- **Progress Tracking**: `docs/TYPE_SAFETY_PROGRESS.md`
- **Remaining Work**: `docs/TYPE_SAFETY_REMAINING.md`
- **Fix Patterns**: `docs/TYPE_SAFETY_CLEANUP_GUIDE.md`
- **Project Guidelines**: `../CLAUDE.md` (see Error Handling section)

---

## Time Estimates by Approach

| Approach              | Time      | Progress         | Risk   |
| --------------------- | --------- | ---------------- | ------ |
| **Phase-by-Phase**    | 4-7 hours | Steady           | Low    |
| **Components First**  | 3-5 hours | Front-loaded     | Medium |
| **Backend First**     | 3-5 hours | Critical first   | Medium |
| **Low-Hanging Fruit** | 5-8 hours | Quick wins early | Low    |

**Recommendation**: Phase-by-Phase approach for steady, low-risk progress.

---

_Last Updated: January 23, 2026 - 14:45 PYT_  
_Next Session: Ready to start Phase 1 (Quick Wins)_
