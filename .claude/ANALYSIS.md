# Claude Code Configuration for Vete

> **Status**: Configuration enhanced December 2024. All critical context now provided for new sessions.

## Current Configuration Structure

```
.claude/
├── ANALYSIS.md              # This file - configuration overview
├── SUPABASE_AUDIT.md        # Security audit (all issues fixed)
├── QUICK_REFERENCE.md       # Condensed patterns card (NEW)
├── settings.json            # Claude Code project settings (NEW)
├── commands/                # Slash commands (8 commands)
│   ├── add-feature.md
│   ├── add-clinic.md
│   ├── add-api.md
│   ├── add-migration.md
│   ├── add-component.md
│   ├── run-tests.md
│   ├── review-code.md
│   └── debug.md
└── exemplars/               # Code pattern examples (6 exemplars)
    ├── README.md
    ├── nextjs-page-exemplar.md
    ├── supabase-api-exemplar.md
    ├── react-component-exemplar.md
    ├── database-migration-exemplar.md
    ├── vitest-testing-exemplar.md
    └── server-action-exemplar.md
```

## How New Sessions Get Context

1. **CLAUDE.md** (project root) - Auto-loaded, provides:
   - Quick start with 5 key concepts
   - Full tech stack and architecture diagram
   - Database schema overview
   - Coding standards with code examples
   - Slash commands reference
   - Critical warnings list

2. **settings.json** - Project metadata:
   - Multi-tenancy patterns
   - API patterns
   - Theming patterns
   - Directory structure

3. **QUICK_REFERENCE.md** - Condensed card:
   - Code templates (API, Page, Component, Migration)
   - Theme CSS variables
   - Spanish UI translations

4. **Slash Commands** - Task-specific:
   - `/add-feature` - New feature with patterns
   - `/add-clinic` - Onboard new tenant
   - `/add-api`, `/add-migration`, `/add-component`
   - `/run-tests`, `/review-code`, `/debug`

5. **Exemplars** - Good vs bad patterns:
   - Detailed examples for each file type
   - Project-specific anti-patterns

---

# Historical Analysis: .cursor vs .claude

## Executive Summary

The existing `.cursor` configuration is **over-engineered for this project**. It contains a comprehensive rules framework designed for a large enterprise with C++/C# migration workflows, MSSQL databases, PowerShell scripting, and complex CI/CD pipelines. This veterinary platform is a **Next.js/TypeScript/Supabase** application that needs targeted, practical guidance.

---

## Issues with Current .cursor Setup

### 1. Technology Mismatch (Critical)

The `.cursor` rules are built for:
- **C++/C# migration** (5 migration phase rules)
- **MSSQL databases** (SQL Server-specific standards)
- **PowerShell scripting** (10+ PowerShell exemplars)
- **Python/LangGraph** (per the IMPLEMENTATION_CHECKLIST)
- **.NET XML documentation**

This project uses:
- **Next.js 15 / TypeScript / React 19**
- **PostgreSQL via Supabase**
- **Tailwind CSS**
- **Vitest/Playwright testing**

**Impact**: ~80% of the rules are irrelevant and add noise.

### 2. Excessive Complexity

| Metric | .cursor | .claude |
|--------|---------|---------|
| Rules | 100+ files | 0 (uses CLAUDE.md) |
| Prompts | 100+ files | 7 focused commands |
| Templars | 40+ files | 0 (inline in commands) |
| Exemplars | 40+ files | 0 (inline examples) |
| Config files | 8+ | 1 (CLAUDE.md) |

**Impact**: Developer cognitive load, slow context loading, maintenance burden.

### 3. Missing Project-Specific Context

The `.cursor` has generic rules but lacks:
- Multi-tenant architecture patterns
- JSON-CMS content system guidelines
- Supabase RLS policy patterns
- Tailwind v3 (not v4) constraints
- Spanish language content requirements
- Veterinary domain terminology

### 4. Outdated Gap Analysis

The `SUMMARY.md` and `IMPLEMENTATION_CHECKLIST.md` describe missing Python/LangGraph/Pydantic rules - technologies this project doesn't use. This suggests the `.cursor` folder was copied from another project without adaptation.

---

## Specific Critique by Category

### Rules that ARE Relevant
- `clean-code.mdc` - General code quality
- `dry-principle.mdc` - Avoid duplication
- `naming-conventions.mdc` - Consistency
- `verify-information-rule.mdc` - Don't assume

### Rules that are IRRELEVANT
- `migration/*.mdc` - C++ to C# migration
- `database-standards/mssql-*.mdc` - Wrong database
- `scripts/powershell-*.mdc` - Not used
- `podcast/*.mdc` - Unrelated domain
- `python/*.mdc` - Not the primary stack

### Rules that are HARMFUL
- `no-summaries-rule.mdc` - Sometimes summaries are helpful
- `drill-sargeant.mdc` - Aggressive tone inappropriate
- `no-apologies-rule.mdc` - Professional communication matters

---

## What .claude Does Better

### 1. Single Source of Truth
The `CLAUDE.md` file provides:
- Complete tech stack reference
- Project structure
- Database schema overview
- Coding standards
- Common commands
- Critical warnings

All in one place, not scattered across 100+ files.

### 2. Focused Slash Commands
Instead of generic prompts, we have project-specific commands:
- `/add-feature` - Following project patterns
- `/add-clinic` - Multi-tenant onboarding
- `/add-api` - Supabase-specific patterns
- `/add-migration` - PostgreSQL/RLS patterns
- `/add-component` - Theme variable usage
- `/run-tests` - Vitest/Playwright
- `/review-code` - Project-specific checklist
- `/debug` - Common issue categories

### 3. Practical Over Theoretical
- No abstract "rule invocation strategies"
- No "templars" and "exemplars" hierarchy
- Just actionable guidance with inline examples

---

## Recommendations

### Option A: Keep Both (Hybrid)
- Keep `.cursor` for generic rules (clean code, DRY, naming)
- Use `.claude` for project-specific guidance
- Risk: Conflicting advice, maintenance burden

### Option B: Migrate to .claude (Recommended)
- Delete irrelevant `.cursor` rules (~80%)
- Keep only universal code quality rules
- Use `.claude` as primary AI guidance
- Simpler, faster, more relevant

### Option C: Rebuild .cursor
- Rewrite rules for Next.js/TypeScript/Supabase
- Remove all migration/PowerShell/podcast rules
- Match the focused approach of `.claude`
- Significant effort, questionable value

---

## Action Items

### Immediate
1. Add `.claude/` to `.gitignore` if secrets present
2. Review `CLAUDE.md` for accuracy
3. Test slash commands work correctly

### Short-term
4. Remove irrelevant `.cursor` subdirectories:
   - `rules/migration/`
   - `rules/podcast/`
   - `rules/python/` (unless adding Python)
   - `prompts/` (mostly generic/enterprise)
   - `exemplars/script/powershell/`

5. Keep useful `.cursor` rules:
   - `clean-code.mdc`
   - `dry-principle.mdc`
   - `naming-conventions.mdc`
   - `verify-information-rule.mdc`

### Long-term
6. Document lessons learned
7. Establish rule for importing AI configs to new projects
8. Consider project templates with appropriate AI configs

---

## Conclusion

The `.cursor` configuration represents a sophisticated framework designed for enterprise projects with different technology stacks. For this Next.js veterinary platform, a simpler, project-specific `.claude` configuration will be more effective.

**The goal is not to have the most rules, but to have the right guidance.**

---

*Analysis Date: 2025-12-17*
*Analyzed by: Claude Code*
