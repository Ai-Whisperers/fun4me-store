# Vete Refactoring - Quick Setup Guide

**Purpose**: Step-by-step instructions to set up the refactoring board  
**Time Required**: 30-60 minutes  
**Prerequisites**: GitHub repository access with admin permissions

---

## Step 1: Create GitHub Project (10 minutes)

### 1.1 Navigate to Projects

```
1. Go to: https://github.com/YOUR_USERNAME/Vete
2. Click "Projects" tab (top navigation)
3. Click "New project" (green button)
```

### 1.2 Choose Template

```
1. Select "Board" template
2. Click "Create"
```

### 1.3 Name Your Project

```
Project Name: "Vete Refactoring 2026"
Description: "16-week refactoring initiative - Service layer, components, jobs, DB, deps, performance"
Visibility: Private (or Public if preferred)
```

### 1.4 Configure Columns

**Default columns**: To Do, In Progress, Done

**Update to our structure**:
```
1. Rename "To Do" → "Backlog"
2. Add new column: "Ready" (between Backlog and In Progress)
3. Add new column: "Review" (between In Progress and Done)
4. Keep "In Progress" and "Done" as is
```

**Final column order**: Backlog → Ready → In Progress → Review → Done

---

## Step 2: Create Labels (15 minutes)

### 2.1 Navigate to Labels

```
1. Go to repository: https://github.com/YOUR_USERNAME/Vete
2. Click "Issues" tab
3. Click "Labels" button
4. Click "New label" for each label below
```

### 2.2 Priority Labels

| Name | Color | Description |
|------|-------|-------------|
| `P0-Critical` | `#d73a4a` | Blocks main phases, must do first |
| `P1-High` | `#fbca04` | Core refactoring work |
| `P2-Medium` | `#0e8a16` | Quality improvements |
| `P3-Low` | `#0075ca` | Nice to have, polish |

### 2.3 Effort Labels

| Name | Color | Description |
|------|-------|-------------|
| `S-Small` | `#ffffff` | < 2 hours |
| `M-Medium` | `#fbca04` | 2-4 hours |
| `L-Large` | `#d93f0b` | 4-8 hours |
| `XL-Extra-Large` | `#d73a4a` | 1-2 days |

### 2.4 Phase Labels

| Name | Color | Description |
|------|-------|-------------|
| `Phase-0-Prep` | `#000000` | Preparation & Measurement |
| `Phase-1-Services` | `#8b5cf6` | Service Layer Foundation |
| `Phase-2-Components` | `#3b82f6` | Component Architecture |
| `Phase-3-Jobs` | `#10b981` | Background Job Queue |
| `Phase-4-Database` | `#f59e0b` | Database Optimization |
| `Phase-5-Deps` | `#f97316` | Dependency Cleanup |
| `Phase-6-Perf` | `#ef4444` | Performance & Monitoring |
| `Quick-Win` | `#fbbf24` | Independent high-impact tasks |

### 2.5 Type Labels

| Name | Color | Description |
|------|-------|-------------|
| `refactor` | `#c5def5` | Code restructuring |
| `test` | `#c2e0c6` | Adding or improving tests |
| `docs` | `#fef2c0` | Documentation updates |
| `performance` | `#f9d0c4` | Performance optimization |
| `tech-debt` | `#e99695` | Addressing technical debt |
| `monitoring` | `#d4c5f9` | Observability and monitoring |

**Quick Copy-Paste** (for label colors):
```
P0: d73a4a, P1: fbca04, P2: 0e8a16, P3: 0075ca
S: ffffff, M: fbca04, L: d93f0b, XL: d73a4a
Phase-0: 000000, Phase-1: 8b5cf6, Phase-2: 3b82f6, Phase-3: 10b981
Phase-4: f59e0b, Phase-5: f97316, Phase-6: ef4444, Quick-Win: fbbf24
refactor: c5def5, test: c2e0c6, docs: fef2c0
performance: f9d0c4, tech-debt: e99695, monitoring: d4c5f9
```

---

## Step 3: Create First 10 Issues (20 minutes)

### 3.1 Start with Phase 0 + Quick Wins

**Recommended first batch** (easiest to verify setup):

1. **#0.2 - Create Refactoring Board** (this ticket!)
2. **#0.3 - Expand E2E Test Coverage**
3. **#0.4 - Add API Contract Tests**
4. **#0.5 - Establish Performance Baselines**
5. **#QW.1 - Add Critical Database Indexes**
6. **#QW.2 - Remove formik (Unused Dependency)**
7. **#QW.3 - Remove chart.js (Duplicate)**
8. **#QW.6 - Document Git Workflow**
9. **#QW.7 - Set Up Dependabot**
10. **#QW.10 - Update CLAUDE.md**

### 3.2 Issue Creation Template

For each issue, use this format:

**Title**: `[Phase X] Brief description` (e.g., `[Phase 0] Expand E2E Test Coverage`)

**Description**: Copy from REFACTORING_TICKETS.md (each ticket has full description)

**Labels**: Apply as specified in ticket (e.g., `Phase-0-Prep`, `P0-Critical`, `M-Medium`, `test`)

**Project**: Add to "Vete Refactoring 2026"

**Column**: 
- Phase 0 tickets → Ready column
- Quick Wins → Ready column
- Phase 1+ tickets → Backlog column

### 3.3 Example: Creating Issue #0.3

```
Title: [Phase 0] Expand E2E Test Coverage

Description:
## Summary
Add comprehensive E2E tests for critical user flows to prevent regressions during refactoring.

## Acceptance Criteria
- [ ] Appointment booking flow E2E test (book → confirm → check-in)
- [ ] Invoice payment flow E2E test (create → pay → receipt)
- [ ] Pet registration + vaccine E2E test (register → add vaccine → view history)
- [ ] Store checkout E2E test (add to cart → upload prescription → checkout)
- [ ] All tests passing in CI/CD

## Technical Details
- Use Playwright (already configured)
- Test against local dev environment
- Cover happy path + 2-3 error scenarios per flow

## Files to Create
- `tests/e2e/critical-flows/appointment-booking.spec.ts`
- `tests/e2e/critical-flows/invoice-payment.spec.ts`
- `tests/e2e/critical-flows/pet-registration.spec.ts`
- `tests/e2e/critical-flows/store-checkout.spec.ts`

## Blocks
#1.1 (safer to refactor with tests)

Labels:
- Phase-0-Prep
- P0-Critical
- L-Large
- test

Project: Vete Refactoring 2026
Column: Ready
```

---

## Step 4: Bulk Import Remaining Tickets (Optional - 15 minutes)

### Option A: Manual Creation (Recommended for First Time)

Continue creating issues 11-30 manually to familiarize yourself with the board.

**Suggested batch 2** (Phase 1 critical):
- #1.1 - Create BaseService Class
- #1.2 - Create AppointmentService
- #1.3 - Create InvoiceService
- #1.4 - Create InventoryService
- #1.5 - Create PetService

### Option B: GitHub CLI (Faster for Bulk)

**Prerequisites**: Install GitHub CLI (`gh`)

```bash
# Install gh (if not already installed)
# Windows: winget install GitHub.cli
# Mac: brew install gh
# Linux: See https://cli.github.com/

# Login
gh auth login

# Create issues from template (example)
gh issue create \
  --title "[Phase 1] Create BaseService Class" \
  --body "$(cat .github/ISSUE_TEMPLATE/ticket-1-1.md)" \
  --label "Phase-1-Services,P0-Critical,M-Medium,refactor" \
  --project "Vete Refactoring 2026"
```

**To automate**: Create `.github/ISSUE_TEMPLATE/` directory with markdown files for each ticket, then loop through them.

### Option C: GitHub API Script (Advanced)

**For bulk import of all 63 tickets**, use a script:

```javascript
// scripts/import-tickets.js
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const tickets = [
  // Copy from REFACTORING_TICKETS.md and format as JSON
];

async function importTickets() {
  for (const ticket of tickets) {
    await octokit.issues.create({
      owner: "YOUR_USERNAME",
      repo: "Vete",
      title: ticket.title,
      body: ticket.body,
      labels: ticket.labels,
    });
  }
}

importTickets();
```

---

## Step 5: Configure Project Views (10 minutes)

### 5.1 Default Board View

```
1. In project, click "⋮" (three dots) next to view name
2. Rename to "Board"
3. Group by: Column
4. Sort by: Manual (drag and drop)
5. Filter: None
```

### 5.2 Add Priority View

```
1. Click "+ New view"
2. Choose "Board" layout
3. Name: "By Priority"
4. Group by: Label (select P0-Critical, P1-High, P2-Medium, P3-Low)
5. Sort by: Manual
6. Filter: Status is not "Done"
```

### 5.3 Add Phase View

```
1. Click "+ New view"
2. Choose "Board" layout
3. Name: "By Phase"
4. Group by: Label (select Phase-0-Prep through Phase-6-Perf)
5. Sort by: Priority (P0 → P3)
6. Filter: Status is not "Done"
```

### 5.4 Add Sprint View (Optional)

```
1. Click "+ New view"
2. Choose "Table" layout
3. Name: "Current Week"
4. Columns: Title, Status, Priority, Effort, Assignee
5. Sort by: Priority
6. Filter: Status is "Ready" or "In Progress"
```

---

## Step 6: Verify Setup (5 minutes)

### Checklist

- [ ] GitHub Project created: "Vete Refactoring 2026"
- [ ] 5 columns: Backlog, Ready, In Progress, Review, Done
- [ ] 22 labels created (4 priority + 4 effort + 8 phase + 6 type)
- [ ] 10+ issues created (Phase 0 + Quick Wins)
- [ ] Issues have correct labels
- [ ] Issues added to project board
- [ ] Issues in correct columns (Ready vs Backlog)
- [ ] 3+ views configured (Board, Priority, Phase)

---

## Step 7: Start Working (NOW!)

### First Task: Mark #0.2 as Done

Since you just completed creating the board:

```
1. Find issue #0.2 (Create Refactoring Board)
2. Move to "Done" column
3. Close issue
4. Add comment: "✅ Board created with 63 tickets, 22 labels, 5 columns"
```

### Second Task: Pick a Quick Win

**Recommended**: Start with #QW.1 (Add Critical Database Indexes)

**Why**: 
- High impact (20-50% query performance)
- Low risk (adding indexes is safe)
- Fast (2 hours)
- Immediate validation (can run before/after benchmarks)

**Process**:
```
1. Move #QW.1 from Ready → In Progress
2. Assign to yourself
3. Create branch: git checkout -b quickwin/database-indexes
4. Add indexes (see ticket for SQL)
5. Test locally
6. Create PR
7. Move to Review
8. Merge
9. Move to Done
10. Celebrate first win! 🎉
```

---

## Ongoing Workflow

### Daily

1. **Morning**: Review board, pick next task from Ready column
2. **During work**: Update ticket status (In Progress → Review → Done)
3. **When blocked**: Comment on ticket, add "blocked" label, pick another task

### Weekly (Friday)

1. **Run metrics**: `./scripts/track-metrics.sh`
2. **Review progress**: Check metrics/progress-report-YYYY-MM-DD.md
3. **Team review**: What worked, what didn't, adjust priorities
4. **Refill Ready**: Move 5-10 tickets from Backlog → Ready for next week

### Bi-weekly

1. **Retrospective**: Phase review (if completing a phase)
2. **Celebrate wins**: Share progress with team
3. **Adjust estimates**: Update effort labels based on actual time

---

## Tips for Success

### 🎯 Focus

- **WIP Limit**: Max 3-5 tickets in "In Progress" at a time
- **Finish First**: Complete tickets before starting new ones
- **One Phase at a Time**: Don't jump between phases

### 🚀 Momentum

- **Quick Wins**: Do 1-2 quick wins per week for morale
- **Small PRs**: Keep PRs < 500 lines changed
- **Ship Daily**: Merge at least 1 PR per day

### 📊 Measurement

- **Track Everything**: Run `./scripts/track-metrics.sh` weekly
- **Celebrate Improvement**: Share when metrics improve
- **Adjust Course**: If velocity is off, adjust estimates

### 🛡️ Safety

- **Test First**: Expand tests before refactoring (Phase 0 Step 0.3)
- **Feature Flags**: Use flags for risky changes
- **Rollback Plan**: Always have a rollback strategy

---

## Troubleshooting

### Issue: Can't Add Issues to Project

**Solution**: Ensure you have admin access to repository and project.

### Issue: Labels Not Showing

**Solution**: Labels are repository-level. Create in Issues → Labels, then apply to issues.

### Issue: Too Many Tickets (Overwhelmed)

**Solution**: 
1. Focus only on "Ready" column (hide others)
2. Start with Quick Wins
3. Move 1-2 tickets to Ready at a time
4. Don't worry about Backlog yet

### Issue: Velocity Too Slow

**Solution**:
1. Re-estimate effort (S/M/L/XL might be off)
2. Break large tickets into smaller ones
3. Remove blockers
4. Ask for help / pair program

### Issue: Too Many Blockers

**Solution**:
1. Identify root cause (missing info, dependencies, etc.)
2. Create "spike" tickets for unknowns (time-boxed research)
3. Adjust priority (work on unblocked tickets first)

---

## Next Actions

**Right Now**:
1. ✅ Create GitHub Project
2. ✅ Create 22 labels
3. ✅ Import first 10 tickets
4. ✅ Configure views
5. ✅ Mark #0.2 as Done
6. ✅ Pick first Quick Win (#QW.1)

**This Week** (Phase 0):
1. ✅ Complete safety nets (#0.3, #0.4, #0.5)
2. ✅ Do 2-3 Quick Wins (#QW.1, #QW.2, #QW.6)
3. ✅ Prepare for Phase 1 (populate Ready with service tickets)

**Week 2** (Phase 1):
1. ✅ Create BaseService (#1.1)
2. ✅ Create AppointmentService (#1.2)
3. ✅ Refactor first 3 routes (#1.2.1, #1.2.2, #1.2.3)

---

## Resources

- **Board Structure**: REFACTORING_BOARD.md
- **All Tickets**: REFACTORING_TICKETS.md (63 tickets)
- **Baseline Metrics**: BASELINE_METRICS.md
- **Progress Tracking**: `./scripts/track-metrics.sh`
- **AI Context**: CLAUDE.md (updated with refactoring context)

---

**Ready to start? Let's build! 🚀**

_Last Updated: January 15, 2026_
