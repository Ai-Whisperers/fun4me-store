---
description: GUIDANCE for Git workflow, branching, and PRs
---

# Git Workflow

> **Full Documentation**: [GIT_WORKFLOW.md](file:///c:/Users/Alejandro/Documents/Ivan/Adris/Vete/documentation/GIT_WORKFLOW.md)

## Branching Strategy

- **`main`**: Production (Deploys to Prod). Protected.
- **`develop`**: Staging (Deploys to Staging). Integration branch.
- **Feature Branches**: `feat/name` (from `develop`, merge to `develop`)
- **Bugfix Branches**: `fix/name` (from `develop`, merge to `develop`)
- **Hotfix Branches**: `hotfix/name` (from `main`, merge to `main` & `develop`)

## Common Operations

### Start a Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feat/my-feature
```

### Commit Changes

Use **Conventional Commits**:

- `feat: add new login page`
- `fix: resolve crash on startup`
- `docs: update readme`

### Verify locally

```bash
npm run lint
npm run test:unit
```

### Push & PR

```bash
git push origin feat/my-feature
# Open PR to 'develop' branch
```
