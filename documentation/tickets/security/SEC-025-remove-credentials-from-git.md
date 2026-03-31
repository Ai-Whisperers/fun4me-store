# SEC-025: EMERGENCY - Remove Credentials from Git History

**Category**: Security  
**Priority**: P0 - CRITICAL  
**Status**: Open  
**Effort**: 2-4 hours  
**Impact**: Critical - Active security incident  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-001)

## Summary

Environment files containing production credentials were committed to git. This requires immediate credential rotation and git history cleanup.

## Problem

Files `.env` and `.env.local` containing Supabase keys and database passwords were committed to repository history, exposing:
- Database access credentials
- Service role key (bypasses RLS)
- All API keys

## Solution

See full implementation plan in documentation/guides/security-incident-response.md

### Immediate Actions
1. Rotate all Supabase keys
2. Change database password
3. Remove files from git history using git-filter-repo
4. Update .gitignore
5. Add pre-commit hooks

## Acceptance Criteria
- [ ] All credentials rotated
- [ ] .env files removed from git history
- [ ] Pre-commit hooks prevent future commits
- [ ] Team notified and trained

## Related
- TST-020: Add pre-commit hooks
- SEC-024: RLS testing framework
