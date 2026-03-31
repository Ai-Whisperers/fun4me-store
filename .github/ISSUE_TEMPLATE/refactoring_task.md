---
name: ♻️ Refactoring Task
about: Track code refactoring and technical debt work
title: '[REF] '
labels: ['refactoring', 'technical-debt']
assignees: ''
---

## ♻️ Refactoring Description

<!-- Provide a clear description of the refactoring work -->

---

## 🎯 Goals

<!-- What are you trying to improve? -->

- [ ] Reduce code complexity
- [ ] Improve type safety
- [ ] Extract reusable logic
- [ ] Split large components/services
- [ ] Improve performance
- [ ] Improve maintainability
- [ ] Fix technical debt
- [ ] Other: ___

---

## 📋 Current State

### Problems

<!-- What are the issues with the current code? -->

1. Problem 1: ...
2. Problem 2: ...
3. Problem 3: ...

### Code Metrics (Before)

| Metric | Current Value |
|--------|---------------|
| File LOC | |
| Cyclomatic Complexity | |
| Test Coverage | |
| Number of Functions | |
| Dependencies | |

### Affected Files

<!-- List files that will be changed -->
- `path/to/file1.ts`
- `path/to/file2.ts`

---

## 💡 Proposed Solution

### Approach

<!-- Describe the refactoring approach -->

### New Structure

<!-- Describe the new code structure -->

### Patterns to Apply

<!-- Which patterns from AUTONOMOUS_WORK_PLAN.md? -->
- [ ] Service layer pattern
- [ ] Component extraction pattern
- [ ] Error handling pattern
- [ ] Type safety pattern
- [ ] Other: ___

---

## 📊 Target Metrics (After)

| Metric | Target Value | Change |
|--------|--------------|--------|
| File LOC | | -X% |
| Cyclomatic Complexity | | -X |
| Test Coverage | | +X% |
| Number of Functions | | -X |
| Dependencies | | -X |

---

## 🔄 Migration Strategy

### Breaking Changes

<!-- Will this introduce breaking changes? -->
- [ ] No breaking changes
- [ ] Contains breaking changes (describe below)

### Migration Steps

<!-- If breaking, how should code be migrated? -->
1. Step 1
2. Step 2
3. Step 3

### Backward Compatibility

<!-- How long will old code be supported? -->
- [ ] Immediate cutover (no backward compatibility)
- [ ] Deprecated (supported for N sprints)
- [ ] Gradual migration

---

## 🧪 Testing Requirements

### Test Coverage Targets

- [ ] Services: ≥95%
- [ ] Components: ≥85%
- [ ] Utilities: ≥90%

### Test Types

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (if user-facing changes)
- [ ] Performance tests (if performance refactoring)

### Regression Testing

<!-- How to ensure no regressions? -->
- [ ] All existing tests pass
- [ ] Manual testing checklist (describe below)
- [ ] E2E critical paths verified

---

## 📝 Implementation Plan

### Tasks

<!-- Break down the work into tasks -->

1. [ ] Task 1: ...
2. [ ] Task 2: ...
3. [ ] Task 3: ...
4. [ ] Add tests
5. [ ] Update documentation
6. [ ] Review metrics

### Estimated Effort

<!-- How much time will this take? -->
- [ ] 🟢 **Small** - <4 hours
- [ ] 🟡 **Medium** - 4-8 hours
- [ ] 🟠 **Large** - 1-2 days
- [ ] 🔴 **X-Large** - >2 days

---

## 🔗 Dependencies

### Blocks

<!-- What does this refactoring block? -->
- Blocks #
- Blocks phase X.Y

### Depends On

<!-- What must be done first? -->
- Depends on #
- Depends on phase X.Y

### Related Work

<!-- Related refactoring tasks -->
- Related to #
- Part of phase X

---

## 🎯 Success Criteria

<!-- How will you know this refactoring is successful? -->

- [ ] All tests pass (zero warnings, zero errors)
- [ ] Code complexity reduced
- [ ] Test coverage increased (or maintained)
- [ ] Build time same or better
- [ ] No regressions (E2E tests pass)
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Metrics tracked in REFACTORING_BOARD.md

---

## 📚 References

<!-- Link to documentation, patterns, examples -->

- AUTONOMOUS_WORK_PLAN.md: <!-- Link to relevant section -->
- REFACTORING_TICKETS.md: <!-- Link to ticket -->
- Pattern examples: <!-- Link to exemplars -->
- Related docs: <!-- Link to relevant documentation -->

---

## 🚀 Deployment Notes

### Pre-Deployment

<!-- What needs to happen before deploying? -->
- [ ] Database migrations (if any)
- [ ] Environment variables (if any)
- [ ] Feature flags (if any)

### Rollback Plan

<!-- How to rollback if issues arise? -->
1. Rollback step 1
2. Rollback step 2

---

## 📊 Phase Information

<!-- If part of refactoring master plan -->

- **Phase**: Phase X.Y - [Phase Name]
- **Ticket ID**: `phaseX-Y`
- **Priority**: High/Medium/Low
- **Blocking**: Yes/No

---

## ⚙️ Quality Gates

<!-- Pre-commit checklist -->

- [ ] Code follows patterns in AUTONOMOUS_WORK_PLAN.md
- [ ] Zero warnings, zero errors (lint, typecheck, build)
- [ ] Test coverage meets requirements
- [ ] No `any`, `@ts-ignore` added (unless justified)
- [ ] Documentation updated
- [ ] Metrics captured
- [ ] Code reviewed

---

## 💬 Additional Context

<!-- Add any other context, notes, or information -->

---

<!-- 
Template Version: 1.0
Last Updated: January 2026
See documentation/GIT_WORKFLOW.md for refactoring workflow
-->
