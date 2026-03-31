# Git Hooks - Quick Reference

## Hooks Installed

### Pre-commit Hook
**Runs on**: Every `git commit`  
**Speed**: Fast (~5-10 seconds)  
**Checks**:
- ✅ ESLint on staged files (auto-fix enabled)
- ✅ Prettier formatting
- ✅ Smoke tests (non-blocking)

### Commit-msg Hook
**Runs on**: Every `git commit`  
**Speed**: Instant  
**Checks**:
- ✅ Conventional commit format

### Pre-push Hook
**Runs on**: Every `git push`  
**Speed**: Slow (~2-5 minutes)  
**Checks**:
- ✅ Full TypeScript type check
- ✅ Production build test
- ✅ All unit tests

---

## Bypassing Hooks (Emergency Only)

### Skip pre-commit hook
```bash
git commit --no-verify -m "Emergency fix"
```

### Skip pre-push hook
```bash
git push --no-verify
```

**⚠️ WARNING**: Only use `--no-verify` in true emergencies. All checks run in CI anyway.

---

## Troubleshooting

### Hook says "permission denied"
```bash
# From repository root
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/pre-push
```

### Hook fails but code is fine
```bash
# Run checks manually to see detailed output
cd web

# Check what pre-commit runs
npm run lint
npm run test:smoke

# Check what pre-push runs
npm run typecheck
npm run build
npm run test:unit
```

### Disable hooks temporarily
```bash
# Rename hooks directory
mv .git/hooks .git/hooks.disabled

# Re-enable later
mv .git/hooks.disabled .git/hooks
```

---

## Conventional Commit Format

The commit-msg hook enforces this format:

```
type(scope): subject

body (optional)

footer (optional)
```

### Valid Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Build process, dependencies, etc.

### Examples

```bash
# Good commits
git commit -m "feat(auth): add password reset flow"
git commit -m "fix(cart): resolve checkout redirect issue"
git commit -m "docs: update API documentation"
git commit -m "test(pets): add vaccine CRUD tests"

# Bad commits (will be rejected)
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "updates"
```

---

## Performance

| Hook | Average Time | Max Time |
|------|-------------|----------|
| pre-commit | 5-10s | 30s |
| commit-msg | <1s | <1s |
| pre-push | 2-5min | 10min |

**Tip**: The pre-commit hook is fast because it only checks staged files.  
The pre-push hook is comprehensive but only runs when pushing (not on every commit).

---

## CI/CD Integration

All hooks mirror CI checks:
- Pre-commit = CI "Lint & Format" job
- Pre-push = CI "Build & Test" job

If hooks pass, CI will pass (unless race conditions or environment differences).
