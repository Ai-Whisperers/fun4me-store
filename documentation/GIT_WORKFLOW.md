# Git Workflow Guidelines

This document outlines the standard Git workflow for the Vete project. Following these guidelines ensures a stable production environment for sales and marketing while enabling rapid development of new features.

## Branching Strategy

We follow a strategy that separates **development** from **production** stability.

### Primary Branches

| Branch    | Environment    | Purpose                                                          | CI/CD Behavior                            |
| --------- | -------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| `main`    | **Production** | The source of truth for the live application. Restricted branch. | Deploys to Production URL. **Protected**. |
| `develop` | **Staging**    | Integration branch for testing features before release.          | Deploys to Staging URL. **Protected**.    |

### Supporting Branches

| Branch Type | Naming Convention      | Source    | Merge To           | Purpose                         |
| ----------- | ---------------------- | --------- | ------------------ | ------------------------------- |
| **Feature** | `feat/name-of-feature` | `develop` | `develop`          | Developing new functionality.   |
| **Bugfix**  | `fix/name-of-bug`      | `develop` | `develop`          | Fixing non-critical bugs.       |
| **Hotfix**  | `hotfix/name-of-issue` | `main`    | `main` & `develop` | Emergency fixes for Production. |

---

## Development Process

1.  **Start a Feature**:

    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feat/my-new-feature
    ```

2.  **Commit Changes**:
    Use [Conventional Commits](https://www.conventionalcommits.org/).

    Format: `<type>(<scope>): <description>`

    - `feat`: A new feature
    - `fix`: A bug fix
    - `docs`: Documentation only changes
    - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
    - `refactor`: A code change that neither fixes a bug nor adds a feature
    - `perf`: A code change that improves performance
    - `test`: Adding missing tests or correcting existing tests
    - `chore`: Changes to the build process or auxiliary tools and libraries

    _Example_: `feat(auth): add google login support`

3.  **Open a Pull Request (PR)**:

    - Push your branch: `git push origin feat/my-new-feature`
    - Open PR targeting `develop`.
    - Fill out the PR Template.

4.  **Review & Merge**:
    - CI checks must pass (Lint, Test, Build).
    - At least one review approval is required.
    - Merge to `develop` (Squash & Merge recommended).

---

## Release Process

1.  **Staging Release**:

    - Merging to `develop` automatically deploys to the Staging environment.
    - Verification should happen here by the QA/Product team.

2.  **Production Release**:
    - When Staging is stable and ready for release.
    - Create a PR from `develop` to `main`.
    - Title: `chore(release): version x.x.x`
    - Upon merge, Production deployment triggers automatically.
    - A release tag is created automatically by the CI pipeline.

---

## Branch Protection Configuration

To ensure the integrity of `main` and `develop`, the following Branch Protection Rules must be enabled in GitHub Settings:

### 1. Require a pull request before merging

- **Require approvals**: 1
- **Dismiss stale pull request approvals when new commits are pushed**: Enabled
- **Require review from Code Owners**: Enabled (using `.github/CODEOWNERS`)

### 2. Require status checks to pass before merging

- **Require branches to be up to date before merging**: Enabled
- **Status checks that are required**:
  - `CI Success` (This aggregate job ensures Lint, Type Check, Build, and Unit Tests pass)

### 3. Include administrators

- **Enforce all configured restrictions for administrators**: Enabled

---

## Refactoring Workflow

### Branch Naming for Refactoring

Refactoring work follows specific naming conventions to track progress:

| Refactoring Type | Branch Name | Example |
|------------------|-------------|---------|
| **Phase Work** | `refactor/phase-X-Y-description` | `refactor/phase-1-1-base-service` |
| **Quick Win** | `refactor/qw-N-description` | `refactor/qw-6-git-workflow-docs` |
| **Component Extraction** | `refactor/extract-component-name` | `refactor/extract-event-details` |
| **Service Layer** | `refactor/service-entity-name` | `refactor/service-appointments` |

### Refactoring Commit Messages

Use conventional commits with `refactor` type and specific scopes:

```bash
# Format: refactor(scope): description - ticket-id

# Examples:
refactor(services): add BaseService abstract class - phase1-1
refactor(api): extract appointment validation logic - phase1-8
refactor(components): split event-detail-modal into 4 components - phase2-1
test(services): add AppointmentService tests (95% coverage) - phase1-7
docs(refactoring): document service layer patterns - phase1-4
```

### Required Commit Information

All refactoring commits must include:
1. **Type**: `refactor`, `test`, `docs`, or `perf`
2. **Scope**: Module/layer being changed (`services`, `api`, `components`, `types`)
3. **Description**: Brief summary (50 chars max)
4. **Ticket Reference**: Phase/task ID from refactoring board

### Pull Request Template for Refactoring

```markdown
## Refactoring: [Phase X.Y - Task Name]

### Ticket Reference
- **Task ID**: `phase1-1`
- **Ticket**: [REF-001 - Create BaseService](link-to-ticket)

### Changes Made
- [ ] Created `BaseService` abstract class
- [ ] Added `ServiceResult<T>` type system
- [ ] Implemented error handling patterns
- [ ] Added comprehensive tests (95% coverage)

### Quality Checks
- [ ] All tests passing (`npm run test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Type checking clean (`npm run typecheck`)
- [ ] Zero warnings, zero errors
- [ ] Metrics updated (if applicable)

### Verification Steps
1. Run `npm run test:services` - all pass
2. Check coverage report - BaseService at 97%
3. Build succeeds - `npm run build`

### Breaking Changes
- [ ] None
- [ ] Breaking changes documented below

### Migration Required
- [ ] No migration needed
- [ ] Migration steps documented below

### Dependencies
- **Blocks**: phase1-5, phase1-14, phase1-18 (requires BaseService)
- **Depends On**: None

### Metrics Impact
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Service LOC | N/A | 234 | +234 |
| Test Coverage | N/A | 97% | N/A |

### Checklist
- [ ] Code follows existing patterns
- [ ] Tests added (95%+ coverage for services)
- [ ] Documentation updated
- [ ] BASELINE_METRICS.md updated (if needed)
- [ ] No regressions (all E2E tests pass)
- [ ] Reviewed by another developer
```

### Refactoring Review Guidelines

Reviewers should verify:

#### Code Quality
- [ ] Follows established patterns in `AUTONOMOUS_WORK_PLAN.md`
- [ ] No regression in functionality
- [ ] Tests cover edge cases and error paths
- [ ] Error handling is consistent
- [ ] Type safety maintained (no `any`, `@ts-ignore`)

#### Documentation
- [ ] Public APIs have JSDoc/TSDoc comments
- [ ] Complex logic has inline comments explaining "why"
- [ ] README updated if public interface changed
- [ ] Migration guide provided for breaking changes

#### Testing
- [ ] Unit tests pass (`npm run test:unit`)
- [ ] Integration tests pass (if applicable)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Coverage meets requirements (95% services, 85% components)

#### Metrics
- [ ] Code complexity reduced (Cyclomatic < 10)
- [ ] File sizes reasonable (<300 lines for components, <500 for services)
- [ ] No new God components/services (>700 lines)
- [ ] Baseline metrics updated if significant change

### Merging Refactoring Work

1. **Squash and Merge**: Preferred for clean history
   - Single commit per PR in `develop`
   - Commit message = PR title
   - Description = PR body summary

2. **Deployment**:
   - Refactoring merges to `develop` → auto-deploy to Staging
   - Test thoroughly in Staging before release
   - Production deploy via `develop` → `main` PR

3. **Post-Merge**:
   - Update refactoring board: mark todo as `completed`
   - Update `REFACTORING_BOARD.md` progress
   - Document learnings in `REFACTORING_TICKETS.md`
   - Run `./scripts/track-metrics.sh` for weekly report

### Refactoring Branch Lifecycle

```
┌─────────────────────────────────────────────────┐
│ 1. Create Branch                                │
│    git checkout develop                         │
│    git pull origin develop                      │
│    git checkout -b refactor/phase-1-1-base      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Implement Changes                            │
│    - Follow patterns in AUTONOMOUS_WORK_PLAN.md │
│    - Add tests (95%+ coverage for services)     │
│    - Update documentation                       │
│    - Run validation: npm run lint, typecheck    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Verify Quality                               │
│    npm run test                  # All tests    │
│    npm run lint                  # Clean        │
│    npm run typecheck             # No errors    │
│    npm run build                 # Success      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. Commit with Convention                       │
│    git add .                                    │
│    git commit -m "refactor(services): add       │
│      BaseService abstract class - phase1-1"     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. Push and Create PR                           │
│    git push origin refactor/phase-1-1-base      │
│    # Open PR to develop using template          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 6. Code Review                                  │
│    - Reviewer follows guidelines above          │
│    - Address feedback                           │
│    - Re-run all checks after changes            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 7. Merge to Develop                             │
│    - Squash and Merge (preferred)               │
│    - Delete branch after merge                  │
│    - Auto-deploys to Staging                    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 8. Update Tracking                              │
│    - Mark todo completed                        │
│    - Update REFACTORING_BOARD.md                │
│    - Run ./scripts/track-metrics.sh             │
└─────────────────────────────────────────────────┘
```

### Zero Warnings, Zero Errors Policy

**Absolute requirement**: No warnings or errors allowed before commit.

#### Pre-Commit Checklist
```bash
# 1. Run all validation
npm run lint              # Must pass with 0 warnings
npm run typecheck         # Must pass with 0 errors
npm run test              # All tests must pass
npm run build             # Must build successfully

# 2. Verify zero output
# Look for:
#   ✓ All checks passed
#   ✓ 0 errors, 0 warnings
#   ✓ Build succeeded

# 3. Only then commit
git commit -m "refactor(...): ..."
```

#### If Validation Fails
1. **DO NOT** commit with warnings/errors
2. Fix issues immediately:
   ```bash
   npm run lint:fix        # Auto-fix linting issues
   npm run format          # Fix formatting
   # Manually fix remaining issues
   ```
3. Re-run validation
4. Repeat until clean

#### Auto-Fix vs Manual Fix
- **Auto-fix first**: `npm run lint:fix`, `npm run format`
- **Manual fix**: Type errors, logic issues, test failures
- **Never skip**: Tests, type checking, build validation

### Common Refactoring Patterns

#### Service Extraction
```bash
# Branch: refactor/service-appointments
# Commit: refactor(services): extract AppointmentService logic - phase1-5

# Changes:
1. Create web/lib/services/appointments/AppointmentService.ts
2. Extract logic from web/app/api/appointments/*.ts
3. Add tests in web/tests/services/appointments/
4. Update API routes to use service
5. Update documentation in docs/
```

#### Component Splitting
```bash
# Branch: refactor/extract-event-details
# Commit: refactor(components): split event-detail-modal - phase2-1

# Changes:
1. Create 4 new components: EventDetailsView, EventActionsPanel, etc.
2. Refactor event-detail-modal to use new components
3. Add tests for each component
4. Update Storybook stories
```

#### API Route Refactoring
```bash
# Branch: refactor/api-appointments-list
# Commit: refactor(api): simplify appointments list endpoint - phase1-8

# Changes:
1. Replace direct DB logic with AppointmentService
2. Reduce route from 181 lines to <100 lines
3. Add comprehensive error handling
4. Update tests
```

---

## Related Documentation

- [Refactoring Master Plan](../REFACTORING_TICKETS.md)
- [Autonomous Work Guide](../AUTONOMOUS_WORK_PLAN.md)
- [Baseline Metrics](../BASELINE_METRICS.md)
- [Code Patterns](architecture/CODE_PATTERNS.md)
