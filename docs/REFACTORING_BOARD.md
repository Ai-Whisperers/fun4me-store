# Vete Refactoring Board - Structure & Setup

**Created**: January 15, 2026  
**Purpose**: Project management structure for 16-week refactoring initiative  
**Board Type**: GitHub Projects (recommended) or Linear/Jira/Notion

---

## Board Configuration

### Columns

| Column | Purpose | WIP Limit | Notes |
|--------|---------|-----------|-------|
| **Backlog** | All tickets not yet prioritized | None | Unsorted, low priority |
| **Ready** | Prioritized, ready to work | 20 tickets | High priority, clear scope |
| **In Progress** | Currently being worked | 5 tickets | Active work, blockers visible |
| **Review** | Awaiting code review/testing | 10 tickets | PRs open, testing in progress |
| **Done** | Completed and verified | None | Archive after 2 weeks |

### Labels

#### Priority Labels (Urgency)

| Label | Color | Criteria | Example |
|-------|-------|----------|---------|
| **P0 - Critical** | 🔴 Red | Blocks main phases, must do first | BaseService creation, top 3 god components |
| **P1 - High** | 🟡 Yellow | Core refactoring work | Remaining services, component breakup |
| **P2 - Medium** | 🟢 Green | Quality improvements | Database indexes, dependency cleanup |
| **P3 - Low** | 🔵 Blue | Nice to have, polish | Documentation, minor optimizations |

#### Effort Labels (Complexity/Time)

| Label | Color | Time Estimate | Complexity |
|-------|-------|---------------|------------|
| **S - Small** | ⚪ White | < 2 hours | Simple, clear scope |
| **M - Medium** | 🟡 Yellow | 2-4 hours | Moderate complexity |
| **L - Large** | 🟠 Orange | 4-8 hours | Complex, multiple files |
| **XL - Extra Large** | 🔴 Red | 1-2 days | Very complex, risky |

#### Phase Labels (Categorization)

| Label | Color | Phase | Weeks |
|-------|-------|-------|-------|
| **Phase 0 - Prep** | ⚫ Black | Preparation & Measurement | Week 1 |
| **Phase 1 - Services** | 🟣 Purple | Service Layer Foundation | Weeks 2-5 |
| **Phase 2 - Components** | 🔵 Blue | Component Architecture | Weeks 6-9 |
| **Phase 3 - Jobs** | 🟢 Green | Background Job Queue | Weeks 10-11 |
| **Phase 4 - Database** | 🟡 Yellow | Database Optimization | Weeks 12-13 |
| **Phase 5 - Deps** | 🟠 Orange | Dependency Cleanup | Week 14 |
| **Phase 6 - Perf** | 🔴 Red | Performance & Monitoring | Weeks 15-16 |
| **Quick Win** | ⭐ Gold | Independent high-impact tasks | Anytime |

#### Type Labels (Work Category)

| Label | Purpose |
|-------|---------|
| **refactor** | Code restructuring without behavior change |
| **test** | Adding or improving tests |
| **docs** | Documentation updates |
| **performance** | Performance optimization |
| **tech-debt** | Addressing technical debt |
| **monitoring** | Observability and monitoring |

### Views

**Recommended GitHub Projects Views**:

1. **Board View** (Default)
   - Group by: Column
   - Sort by: Priority (P0 → P3)
   - Filter: None (show all)

2. **Priority View**
   - Group by: Priority label
   - Sort by: Phase
   - Filter: Status != Done

3. **Phase View**
   - Group by: Phase label
   - Sort by: Priority
   - Filter: Status != Done

4. **Effort View**
   - Group by: Effort label
   - Sort by: Priority
   - Filter: Status = Ready

5. **Sprint View** (Week-by-week)
   - Group by: Assignee
   - Sort by: Priority
   - Filter: Custom date field (current week)

---

## GitHub Projects Setup Instructions

### Option 1: GitHub Projects (Recommended)

**Step 1: Create Project**
```
1. Go to: https://github.com/YOUR_ORG/Vete/projects
2. Click "New project"
3. Choose "Board" template
4. Name: "Vete Refactoring (2026)"
5. Click "Create"
```

**Step 2: Configure Columns**
```
1. Rename default columns to match our structure:
   - Todo → Backlog
   - In Progress → In Progress
   - Done → Done
2. Add custom columns:
   - Ready (between Backlog and In Progress)
   - Review (between In Progress and Done)
```

**Step 3: Create Labels**
```
1. Go to repository → Issues → Labels
2. Click "New label" for each label in our structure
3. Use colors specified in tables above
4. Create all Priority, Effort, Phase, and Type labels
```

**Step 4: Import Tickets**
```
1. See REFACTORING_TICKETS.md for full ticket list
2. Create issues in batches:
   - Phase 0 tickets (5 tickets)
   - Phase 1 tickets (20 tickets)
   - Phase 2 tickets (15 tickets)
   - Quick Wins (10 tickets)
   - Etc.
3. Apply labels as specified in ticket descriptions
4. Add to project board
```

**Step 5: Configure Custom Fields** (Optional)
```
1. Add custom field: "Target Week" (Number 1-16)
2. Add custom field: "Actual Hours" (Number)
3. Add custom field: "Blocked By" (Text)
4. Add custom field: "Related PRs" (Text)
```

---

### Option 2: Linear (Alternative)

**Setup**:
```
1. Create project: "Vete Refactoring"
2. Create cycles: Week 1-16
3. Import labels and tickets
4. Use cycles for sprint planning
```

---

### Option 3: Notion (Alternative)

**Setup**:
```
1. Create database: "Refactoring Board"
2. Properties:
   - Status (Select): Backlog, Ready, In Progress, Review, Done
   - Priority (Select): P0, P1, P2, P3
   - Effort (Select): S, M, L, XL
   - Phase (Select): Phase 0-6, Quick Win
   - Type (Multi-select): refactor, test, docs, etc.
   - Assignee (Person)
   - Target Week (Number)
3. Create board view grouped by Status
4. Import tickets from REFACTORING_TICKETS.md
```

---

## Workflow

### Ticket Lifecycle

```
Created → Backlog → Ready → In Progress → Review → Done
```

**State Transitions**:

1. **Created → Backlog**
   - Auto-added on ticket creation
   - No specific criteria

2. **Backlog → Ready**
   - Criteria:
     - ✅ Acceptance criteria defined
     - ✅ Dependencies identified
     - ✅ Effort estimated
     - ✅ Priority assigned
   - Action: Move to Ready column

3. **Ready → In Progress**
   - Criteria:
     - ✅ Assignee available
     - ✅ No blockers
     - ✅ WIP limit not exceeded (< 5 tickets)
   - Action: Assign, move to In Progress, start work

4. **In Progress → Review**
   - Criteria:
     - ✅ Code written
     - ✅ Tests added (if applicable)
     - ✅ PR opened
     - ✅ Self-review completed
   - Action: Move to Review, request code review

5. **Review → Done**
   - Criteria:
     - ✅ Code reviewed and approved
     - ✅ Tests passing
     - ✅ Changes validated
     - ✅ Merged to main
   - Action: Move to Done, close ticket

6. **Review → In Progress** (Revisions)
   - If changes requested, move back to In Progress

---

## Ticket Template

**Title Format**: `[Phase X] Brief description of task`

**Example**: `[Phase 1] Create BaseService class`

**Description Template**:
```markdown
## Summary
[1-2 sentence description of what needs to be done]

## Context
[Why this is needed, what problem it solves]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Details
[Specific implementation notes, file paths, patterns to follow]

## Testing Requirements
- [ ] Unit tests added
- [ ] Integration tests added (if applicable)
- [ ] Manual testing performed

## Dependencies
- Blocked by: #123
- Blocks: #456
- Related: #789

## Effort Estimate
[S/M/L/XL] - [X hours]

## Files to Change
- `path/to/file1.ts`
- `path/to/file2.tsx`

## References
- See: BASELINE_METRICS.md section X
- Pattern: `.cursor/exemplars/service-exemplar.md`
```

---

## Progress Tracking

### Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

### Weekly Review (Every Friday)

**Review Metrics**:
- Tickets completed this week
- Velocity (story points or hours)
- Blockers identified
- Risks surfaced

**Update Metrics**:
```bash
./scripts/track-metrics.sh
```

**Review Progress Report**:
```bash
cat metrics/progress-report-YYYY-MM-DD.md
```

**Adjust Priorities** if needed based on:
- Velocity (faster/slower than expected)
- Blockers discovered
- New risks identified

---

## Success Metrics

### Board Health Indicators

**Green** (Healthy):
- ✅ Ready column has 15-20 tickets (2-3 weeks of work)
- ✅ In Progress has < 5 tickets (no bottleneck)
- ✅ Review column moving quickly (< 2 day average)
- ✅ Steady flow from Ready → Done

**Yellow** (Needs Attention):
- ⚠️ Ready column has < 10 tickets (running out of work)
- ⚠️ In Progress has 5-7 tickets (potential bottleneck)
- ⚠️ Review column stalled (tickets sitting > 3 days)

**Red** (Action Required):
- 🔴 Ready column empty (planning breakdown)
- 🔴 In Progress has > 8 tickets (WIP limit violated)
- 🔴 Review column has > 15 tickets (review bottleneck)
- 🔴 Tickets moving backwards (In Progress → Ready)

### Velocity Tracking

**Calculate Weekly Velocity**:
```
Velocity = Sum of effort points completed / week
```

**Example**:
- Week 1: 5 tickets (2S + 2M + 1L) = ~12 hours
- Week 2: 7 tickets (3S + 3M + 1L) = ~16 hours
- Average velocity: ~14 hours/week

**Adjust Estimates** based on actual velocity.

---

## Phase-Specific Focus

### Phase 0 (Week 1) - Current

**Active Columns**: Backlog, Ready, In Progress  
**Focus**: Preparation, safety nets  
**Tickets**: 5-10 tickets  
**Velocity Target**: Setup tasks (not measured)

### Phase 1 (Weeks 2-5)

**Active Columns**: All  
**Focus**: Service layer extraction  
**Tickets**: 20-25 tickets  
**Velocity Target**: 2-3 services/week

### Phase 2 (Weeks 6-9)

**Active Columns**: All  
**Focus**: Component refactoring  
**Tickets**: 15-20 tickets  
**Velocity Target**: 3-4 components/week

### Phase 3-6 (Weeks 10-16)

**Active Columns**: All  
**Focus**: Jobs, DB, Deps, Perf  
**Tickets**: 20-30 tickets total  
**Velocity Target**: 3-5 tickets/week

---

## Communication Cadence

### Daily
- Update ticket status as work progresses
- Comment on blockers immediately
- Move cards between columns

### Weekly (Friday)
- Team review of completed work
- Metrics review (`./scripts/track-metrics.sh`)
- Plan next week's priorities
- Update estimates if needed

### Bi-weekly (Every 2 weeks)
- Phase retrospective (what worked, what didn't)
- Adjust processes if needed
- Celebrate wins 🎉

### Monthly (End of each month)
- Stakeholder update
- Budget review (time spent vs planned)
- Risk assessment
- Go/no-go decision for next phase

---

## Risk Management

### Identifying Risks

**Common Risks**:
1. Scope creep (new features during refactoring)
2. Underestimated complexity
3. Unforeseen dependencies
4. Team availability changes
5. Production issues requiring attention

**Mitigation**:
- Add "risk" label to tickets with potential issues
- Create "spike" tickets for unknowns (time-boxed research)
- Buffer 20% extra time in estimates
- Maintain "backup" priorities if blockers hit

---

## Tools & Automation

### GitHub Actions Integration (Future)

**Automated Workflows**:
```yaml
# .github/workflows/refactoring-metrics.yml
name: Refactoring Metrics

on:
  schedule:
    - cron: '0 0 * * 5'  # Every Friday at midnight
  workflow_dispatch:

jobs:
  track-metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run metric tracking
        run: ./scripts/track-metrics.sh
      - name: Commit report
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add metrics/
          git commit -m "chore: weekly refactoring metrics"
          git push
```

---

## Next Steps

**Immediate** (Today):
1. ✅ Review this board structure
2. ✅ Choose platform (GitHub Projects recommended)
3. ✅ Create project in chosen platform
4. ✅ Set up columns and labels
5. ✅ Review REFACTORING_TICKETS.md
6. ✅ Import first 20-30 tickets

**This Week**:
1. Complete Phase 0, Step 0.2 (this document)
2. Move to Phase 0, Step 0.3 (safety nets)
3. Populate Ready column with Phase 1 tickets
4. Establish weekly review cadence

**Week 2** (Phase 1 Start):
1. Begin service layer work
2. Track velocity
3. Adjust estimates based on actual progress

---

## Appendix: Label Colors

**For Copy-Paste into GitHub**:

```
Priority Labels:
- P0-Critical: #d73a4a (red)
- P1-High: #fbca04 (yellow)
- P2-Medium: #0e8a16 (green)
- P3-Low: #0075ca (blue)

Effort Labels:
- S-Small: #ffffff (white)
- M-Medium: #fbca04 (yellow)
- L-Large: #d93f0b (orange)
- XL-Extra-Large: #d73a4a (red)

Phase Labels:
- Phase-0-Prep: #000000 (black)
- Phase-1-Services: #8b5cf6 (purple)
- Phase-2-Components: #3b82f6 (blue)
- Phase-3-Jobs: #10b981 (green)
- Phase-4-Database: #f59e0b (yellow)
- Phase-5-Deps: #f97316 (orange)
- Phase-6-Perf: #ef4444 (red)
- Quick-Win: #fbbf24 (gold)

Type Labels:
- refactor: #c5def5 (light blue)
- test: #c2e0c6 (light green)
- docs: #fef2c0 (light yellow)
- performance: #f9d0c4 (light orange)
- tech-debt: #e99695 (light red)
- monitoring: #d4c5f9 (light purple)
```

---

_Last Updated: January 15, 2026_
