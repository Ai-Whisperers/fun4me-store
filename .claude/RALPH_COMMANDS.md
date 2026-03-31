# Ralph Agent Manual & Command Reference

**Choose your agent. Copy the command. Transform your workflow.**

This manual provides the specific command, target role, and expected outcome for each of the 19 specialized autonomous agents in the Ralph Suite.

---

## 🛠️ Engineering & Product

### 🔨 The Builder

**Target Role:** Software Engineer / Tech Lead
**Mission:** Autonomously implements features from the backlog.
**Expected Results:**

- Writes code in `web/` based on ticket specs.
- Marks tickets as `[x]` in `documentation/tickets/README.md`.
- Moves prompt files to `completed/` folder.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_BUILDER.md to process tickets from the README" --completion-promise "ALL_TICKETS_DONE" --max-iterations 50
```

### 🗓️ The Scrum Master

**Target Role:** Product Manager / Engineering Manager
**Mission:** Decomposes high-level Epics into actionable Sprint Tasks.
**Expected Results:**

- New P2/P3 tickets created in `documentation/tickets/features/`.
- Updates to `documentation/tickets/README.md` with new workload.
- Clear acceptance criteria added to vague requirements.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_SCRUM_MASTER.md" --completion-promise "SPRINT_PLANNING_COMPLETE" --max-iterations 20
```

### 📚 The Librarian

**Target Role:** Technical Writer / DevRel
**Mission:** Ensures documentation matches the actual codebase.
**Expected Results:**

- Updates `documentation/` files to match current code reality.
- Creates "Tech Debt" tickets for major discrepancies.
- Fixes broken links and outdated examples.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_LIBRARIAN.md" --completion-promise "DOCS_SYNC_COMPLETE" --max-iterations 30
```

### 🔍 The Detective

**Target Role:** Senior Engineer / QA
**Mission:** Finds missing work and gap analysis on "Completed" tickets.
**Expected Results:**

- Identifies features marked "Done" that have residual TODOs.
- Creates new tickets for missed "Remaining Work" items.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_DETECTIVE.md" --completion-promise "ANALYSIS_COMPLETE" --max-iterations 30
```

### 📢 The Broadcaster

**Target Role:** Product Marketing Manager / Release Manager
**Mission:** Generates Release Notes from recent work.
**Expected Results:**

- Creates date-stamped file in `documentation/marketing/releases/`.
- Summarizes technical changes into user-facing benefits.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_BROADCASTER.md" --completion-promise "RELEASE_NOTES_READY" --max-iterations 20
```

### 🧠 The Product Owner

**Target Role:** Head of Product
**Mission:** Turns raw ideas or feature clusters into formal Epics.
**Expected Results:**

- Creates `EPIC-[XXX].md` files in `documentation/tickets/epics/`.
- Updates `README.md` with new planned work.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_PRODUCT_OWNER.md" --completion-promise "EPIC_CREATED" --max-iterations 20
```

---

## 🔮 Innovation & Strategy

### 👁️ The Visionary

**Target Role:** Chief Innovation Officer
**Mission:** Generates novel feature ideas from multiple perspectives.
**Expected Results:**

- Appends new concepts to `documentation/growth-strategy/IDEAS_BACKLOG.md`.
- Brainstorms based on User Pain, Competitors, and Future Trends.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_VISIONARY.md" --completion-promise "IDEAS_GENERATED" --max-iterations 20
```

---

## 🛡️ Quality & Standards

### 🤠 The Sheriff

**Target Role:** Security Engineer / Lead Dev
**Mission:** Enforces RLS, Tenant Isolation, and Security Standards.
**Expected Results:**

- Scans `api/` and `lib/` for security violations.
- Creates `SEC-[XXX]` tickets for missing RLS policies or auth checks.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_SHERIFF.md" --completion-promise "STANDARDS_CHECK_COMPLETE" --max-iterations 30
```

### 🦗 The Exterminator

**Target Role:** QA Engineer
**Mission:** Proactively hunts for bugs and anti-patterns.
**Expected Results:**

- Scans code for logical errors and race conditions.
- Creates `BUG-[XXX]` tickets in `documentation/tickets/bugs/`.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_EXTERMINATOR.md" --completion-promise "BUG_HUNT_COMPLETE" --max-iterations 20
```

### 👩‍⚖️ The Auditor

**Target Role:** CTO / VP of Engineering
**Mission:** Grades codebase maturity (Perfect vs Garbage).
**Expected Results:**

- Updates `documentation/FEATURE_STATUS_REPORT.md`.
- Assigns maturity scores (1-5) to each module.
- Flags "Dead Code" for removal.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_AUDITOR.md" --completion-promise "AUDIT_COMPLETE" --max-iterations 40
```

### 🏗️ The Architect

**Target Role:** Principal Engineer
**Mission:** Identifies modularization and refactoring opportunities.
**Expected Results:**

- Creates `REF-[XXX]` tickets for code that needs abstraction.
- Suggests new hooks or utility libraries to reduce duplication.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_ARCHITECT.md" --completion-promise "REFACTOR_ANALYSIS_COMPLETE" --max-iterations 25
```

### 💡 The Innovator

**Target Role:** R&D Engineer
**Mission:** Modernizes stack and suggests library adoptions.
**Expected Results:**

- Identifies "reinvented wheels" (custom code that should be a library).
- Creates proposals for stack upgrades (e.g., "Move to React Query").

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_INNOVATOR.md" --completion-promise "RESEARCH_ANALYSIS_COMPLETE" --max-iterations 20
```

---

## 📈 Marketing Strategy

### ✍️ The Scribe

**Target Role:** Content Marketer
**Mission:** Drafts SEO-aligned blogs and social posts.
**Expected Results:**

- Creates drafts in `documentation/marketing/content/drafts/`.
- content aligns with `CONTENT_STRATEGY.md` topics.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_SCRIBE.md" --completion-promise "CONTENT_DRAFTING_COMPLETE" --max-iterations 20
```

### 🛡️ The Guardian

**Target Role:** Brand Manager
**Mission:** Audits content for Voice & Tone consistency.
**Expected Results:**

- Fixes typos and "banned words" in documentation.
- Creates `BRAND-[XXX]` tickets for major tone violations.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_GUARDIAN.md" --completion-promise "BRAND_AUDIT_COMPLETE" --max-iterations 20
```

### 💸 The Rainmaker

**Target Role:** Sales Enablement / Copywriter
**Mission:** Optimizes sales scripts and outreach emails.
**Expected Results:**

- Updates `documentation/growth-strategy/04-outreach-scripts.md`.
- Generates A/B test variants for high-stakes messages.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_RAINMAKER.md" --completion-promise "SALES_SCRIPTS_UPDATED" --max-iterations 20
```

### 🧪 The Alchemist

**Target Role:** Growth Hacker
**Mission:** Identifies Viral Loops and SEO opportunities.
**Expected Results:**

- Creates `GROWTH-[XXX]` tickets for missing meta tags or OG images.
- Suggests referral mechanics in `documentation/growth-strategy/`.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_ALCHEMIST.md" --completion-promise "GROWTH_HACK_COMPLETE" --max-iterations 25
```

### 🧠 The Empath

**Target Role:** UX Researcher
**Mission:** Updates Personas based on user feedback/tickets.
**Expected Results:**

- Updates `documentation/marketing/vetic/CUSTOMER_PERSONAS.md`.
- Adds new "Pain Points" derived from recent bug reports.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_EMPATH.md" --completion-promise "PERSONA_UPDATE_COMPLETE" --max-iterations 15
```

---

## 💼 Business Operations

### 🧭 The Guide

**Target Role:** Customer Success Manager
**Mission:** Removes friction for new users via documentation.
**Expected Results:**

- Updates `documentation/clients/questionnaire/07-preguntas-frecuentes.md`.
- Adds FAQs based on recently implemented complex features.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_GUIDE.md" --completion-promise "ONBOARDING_DOCS_UPDATED" --max-iterations 20
```

### ♟️ The Strategist

**Target Role:** Business Analyst / Pricing Lead
**Mission:** Adjusts Pricing Tiers based on feature value.
**Expected Results:**

- Updates `documentation/business/pricing-strategy-2026.md`.
- Suggests moving features between "Pro" and "Free" tiers.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_STRATEGIST.md" --completion-promise "PRICING_REVIEW_COMPLETE" --max-iterations 15
```

### 💰 The Treasurer

**Target Role:** CFO / Finance Lead
**Mission:** Updates Financial Projections based on dev velocity.
**Expected Results:**

- Updates tables in `documentation/business/financial-projections.md`.
- Shifts revenue forecasts based on delayed/completed milestones.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_TREASURER.md" --completion-promise "FINANCE_UPDATE_COMPLETE" --max-iterations 10
```

### 🔭 The Scout

**Target Role:** Market Researcher
**Mission:** Tracks Competitor Features vs. Our Capability.
**Expected Results:**

- Updates Competitor Matrix in `documentation/business/`.
- Marks our features as "Parity" or "Superior" as they complete.

```bash
/ralph-loop:ralph-loop "Follow instructions in .claude/prompts/ralph/THE_SCOUT.md" --completion-promise "COMPETITOR_UPDATE_COMPLETE" --max-iterations 15
```
