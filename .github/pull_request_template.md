# Pull Request

## Description

<!-- Provide a clear and concise summary of the changes -->

### Related Issue/Ticket

<!-- Link to related ticket, issue, or task -->
- **Issue**: #
- **Ticket**: <!-- e.g., REF-001, BUG-015, FEAT-023, phase1-1 -->
- **Documentation**: <!-- Link to relevant docs if applicable -->

---

## Type of Change

- [ ] ✨ **Feature**: New functionality (non-breaking)
- [ ] 🐛 **Bug Fix**: Fixes an issue (non-breaking)
- [ ] 🔥 **Breaking Change**: Requires migration or causes breaking changes
- [ ] 📝 **Documentation**: Documentation-only changes
- [ ] ♻️ **Refactoring**: Code improvement without functional changes
- [ ] 🔧 **Configuration**: Build, CI/CD, or tooling changes
- [ ] 🧪 **Testing**: Adding or updating tests
- [ ] ⚡ **Performance**: Performance improvement

---

## Changes Made

<!-- Provide a detailed list of changes -->

### Summary
<!-- Brief description of what was changed and why -->

### Files Changed
<!-- List key files and their purpose -->
- `path/to/file1.ts` - Description
- `path/to/file2.ts` - Description

---

## Testing

### Testing Checklist

- [ ] ✅ **Unit tests pass** (`npm run test:unit`)
- [ ] ✅ **Integration tests pass** (if applicable)
- [ ] ✅ **E2E tests pass** (`npm run test:e2e`)
- [ ] ✅ **Linting clean** (`npm run lint` - 0 warnings)
- [ ] ✅ **Type checking clean** (`npm run typecheck` - 0 errors)
- [ ] ✅ **Build succeeds** (`npm run build`)

### Test Coverage

<!-- For new code or refactoring -->
- **Coverage for services**: <!-- Should be ≥95% -->
- **Coverage for components**: <!-- Should be ≥85% -->
- **Coverage for utilities**: <!-- Should be ≥90% -->

### Manual Testing Steps

<!-- Describe manual verification steps -->
1. Step 1
2. Step 2
3. Expected result

---

## Refactoring-Specific (if applicable)

### Refactoring Goals

<!-- What are you trying to improve? -->
- [ ] Reduce code complexity
- [ ] Improve type safety
- [ ] Extract reusable logic
- [ ] Split large components/services
- [ ] Improve performance
- [ ] Other: ___

### Metrics Impact

<!-- How does this affect code metrics? -->

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| File LOC | | | |
| Cyclomatic Complexity | | | |
| Function Count | | | |
| Test Coverage | | | |
| Build Time | | | |

### Patterns Used

<!-- Which patterns from AUTONOMOUS_WORK_PLAN.md were followed? -->
- [ ] Service layer pattern
- [ ] Component extraction pattern
- [ ] Error handling pattern
- [ ] Type safety pattern
- [ ] Other: ___

### Dependencies

<!-- What blocks or is blocked by this PR? -->
- **Blocks**: <!-- e.g., phase1-5, phase1-14 -->
- **Depends On**: <!-- e.g., phase1-1 (BaseService) -->
- **Related PRs**: <!-- Links to related PRs -->

---

## Breaking Changes

<!-- Mark one -->
- [ ] ✅ **No breaking changes**
- [ ] ⚠️ **Contains breaking changes** (describe below)

### Breaking Changes Description

<!-- If breaking changes exist, describe them -->

### Migration Guide

<!-- How should users/developers migrate? -->
1. Migration step 1
2. Migration step 2

---

## Quality Checklist

### Code Quality

- [ ] Code follows project style guidelines (see `CLAUDE.md`)
- [ ] Code follows existing patterns (see `AUTONOMOUS_WORK_PLAN.md`)
- [ ] Self-reviewed my code thoroughly
- [ ] No `any`, `@ts-ignore`, `@ts-expect-error` added (unless absolutely necessary with justification)
- [ ] All functions have explicit return types
- [ ] Complex logic has explanatory comments (why, not what)
- [ ] No hardcoded values (use constants/config)
- [ ] Error handling is consistent and comprehensive

### Testing Quality

- [ ] Added tests for new code (services: 95%+, components: 85%+)
- [ ] Updated existing tests if behavior changed
- [ ] Tests cover edge cases and error paths
- [ ] Tests are readable and maintainable
- [ ] No tests skipped without justification
- [ ] E2E tests pass (critical user paths protected)

### Documentation

- [ ] Updated README if public interface changed
- [ ] Added/updated JSDoc/TSDoc for public APIs
- [ ] Updated relevant documentation in `documentation/`
- [ ] Updated `CHANGELOG.md` if applicable
- [ ] Migration guide added if breaking changes

### Security & Performance

- [ ] No secrets or credentials exposed
- [ ] SQL queries use parameterization (no string interpolation)
- [ ] API routes check authentication
- [ ] Database queries filter by `tenant_id`
- [ ] No N+1 query issues introduced
- [ ] Performance tested for large datasets (if applicable)

---

## Deployment Notes

### Pre-Deployment Checklist

- [ ] Database migrations required? (describe below)
- [ ] Environment variables added/changed? (document below)
- [ ] Feature flags needed? (describe below)
- [ ] Cache invalidation required?
- [ ] Backward compatibility maintained?

### Database Migrations

<!-- If migrations are needed -->
```sql
-- Migration SQL here (or link to migration file)
```

### Environment Variables

<!-- If env vars are needed -->
```bash
# Add to .env.local:
NEW_VAR=value
```

### Rollback Plan

<!-- How to rollback if issues arise -->
1. Rollback step 1
2. Rollback step 2

---

## Screenshots/Recordings

<!-- If UI changes, include screenshots or screen recordings -->

### Before
<!-- Screenshot before changes -->

### After
<!-- Screenshot after changes -->

---

## Review Guidance

### Focus Areas for Reviewers

<!-- What should reviewers pay attention to? -->
- [ ] Logic correctness in `path/to/file.ts`
- [ ] API contract changes
- [ ] Database query efficiency
- [ ] Type safety
- [ ] Test coverage
- [ ] Other: ___

### Known Limitations

<!-- Any known issues or limitations? -->
- Limitation 1
- Limitation 2

---

## Post-Merge Actions

<!-- Actions to take after merging -->
- [ ] Update refactoring board (mark todo completed)
- [ ] Update `REFACTORING_BOARD.md` progress
- [ ] Run `./scripts/track-metrics.sh` (if refactoring)
- [ ] Document learnings in `REFACTORING_TICKETS.md`
- [ ] Notify team in Slack/Discord
- [ ] Update project documentation
- [ ] Close related issues

---

## Additional Context

<!-- Any other context, links, or information -->

---

## Checklist Summary

**Before requesting review:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Zero warnings, zero errors (lint, typecheck, build)
- [ ] Code self-reviewed
- [ ] Documentation updated
- [ ] Breaking changes documented (if any)
- [ ] Migration guide provided (if breaking)
- [ ] Metrics impact analyzed (if refactoring)
- [ ] Security considerations addressed

**For reviewers:**
- [ ] Code follows project patterns
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] No regressions introduced
- [ ] Performance impact acceptable
- [ ] Security best practices followed

---

<!-- 
Template Version: 2.0
Last Updated: January 2026
See documentation/GIT_WORKFLOW.md for full workflow guidance
-->
