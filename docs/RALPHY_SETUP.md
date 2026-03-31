# Ralphy - Parallel AI Agent System for Vete

**Version**: 1.0.0  
**Last Updated**: January 17, 2026

Ralphy enables multiple AI agents to work in parallel on different tasks using git worktrees for isolation. This dramatically speeds up development by running 3-4 agents simultaneously without conflicts.

---

## 🚀 Quick Start

### Prerequisites

- Git 2.5+ (for worktrees support)
- PowerShell 7.2+ or Bash
- OpenCode or Claude Code installed
- Vete project cloned

### Installation (Already Done!)

The Ralphy system is pre-configured in `.ralphy/`:

```
.ralphy/
├── ralphy.sh              # Bash orchestration script
├── ralphy.ps1             # PowerShell orchestration script
├── config.json            # Ralphy configuration
├── state/                 # Agent state files (auto-generated)
├── logs/                  # Agent execution logs (auto-generated)
└── test-tasks/            # Example tasks for testing
```

### Verify Setup

```powershell
# Windows (PowerShell)
cd C:\Users\Alejandro\Documents\Ivan\Adris\Vete
powershell -ExecutionPolicy Bypass -File .ralphy/ralphy.ps1 list

# Linux/Mac (Bash)
cd /path/to/Vete
./.ralphy/ralphy.sh list
```

**Expected output:**
```
=== Ralphy Worktrees ===
C:/Users/Alejandro/Documents/Ivan/Adris/Vete            [develop]
../vete-worktrees/ralphy-agent-1  [ralphy/agent-1-services]
../vete-worktrees/ralphy-agent-2  [ralphy/agent-2-tests]
../vete-worktrees/ralphy-agent-3  [ralphy/agent-3-security]
```

---

## 📖 How It Works

### Architecture

```
Main Repo (Vete/)
    ├── develop branch  ← Coordination center
    └── Ralphy orchestration (.ralphy/)

Worktrees (../vete-worktrees/)
    ├── ralphy-agent-1/  ← Agent 1 workspace (branch: ralphy/agent-1-services)
    ├── ralphy-agent-2/  ← Agent 2 workspace (branch: ralphy/agent-2-tests)
    └── ralphy-agent-3/  ← Agent 3 workspace (branch: ralphy/agent-3-security)
```

### Key Concepts

1. **Git Worktrees**: Each agent works in a separate directory with its own branch
2. **Isolation**: Agents can't conflict - each has independent files
3. **Parallel Execution**: 3-4 agents run simultaneously
4. **Merge Control**: Changes are reviewed and merged back to `develop` when complete

---

## 🎯 Usage

### Basic Workflow

```powershell
# 1. Check worktree status
.\ralphy.ps1 status

# 2. Start an agent
.\ralphy.ps1 start 1 "Create InvoiceService" .claude/prompts/ralph/THE_BUILDER.md

# 3. Monitor progress
.\ralphy.ps1 status

# 4. Stop an agent
.\ralphy.ps1 stop 1

# 5. Merge completed work
.\ralphy.ps1 merge 1
```

### Parallel Execution Example

**Terminal 1**: Agent 1 - Service Refactoring
```powershell
cd C:\Users\Alejandro\Documents\Ivan\Adris\vete-worktrees\ralphy-agent-1
opencode --agent build
# Prompt: Follow task in .ralphy/test-tasks/agent-1-task.md
```

**Terminal 2**: Agent 2 - Integration Tests
```powershell
cd C:\Users\Alejandro\Documents\Ivan\Adris\vete-worktrees\ralphy-agent-2
opencode --agent build
# Prompt: Follow task in .ralphy/test-tasks/agent-2-task.md
```

**Terminal 3**: Agent 3 - Security Audit
```powershell
cd C:\Users\Alejandro\Documents\Ivan\Adris\vete-worktrees\ralphy-agent-3
opencode --agent build
# Prompt: Follow task in .ralphy/test-tasks/agent-3-task.md
```

All 3 agents work simultaneously without conflicts!

---

## 🔧 Ralphy Commands

### Windows (PowerShell)

```powershell
# List all worktrees
.\ralphy.ps1 list

# Check worktree status
.\ralphy.ps1 check ../vete-worktrees/ralphy-agent-1

# Start agent
.\ralphy.ps1 start <agent_id> "<task>" [prompt_file]

# Stop agent
.\ralphy.ps1 stop <agent_id>

# Show agent status
.\ralphy.ps1 status

# Merge agent work back to develop
.\ralphy.ps1 merge <agent_id>

# Cleanup all worktrees
.\ralphy.ps1 cleanup

# Help
.\ralphy.ps1 help
```

### Linux/Mac (Bash)

```bash
# Same commands, different script
./.ralphy/ralphy.sh list
./.ralphy/ralphy.sh start 1 "Task description" prompt.md
./.ralphy/ralphy.sh status
./.ralphy/ralphy.sh merge 1
```

---

## 📝 Configuration

### .ralphy/config.json

```json
{
  "max_agents": 3,                    // Maximum concurrent agents
  "auto_merge": false,                // Auto-push after merge
  "require_approval": true,           // Require review before merge
  "base_branch": "develop",           // Branch to merge into
  "task_source": "documentation/tickets/README.md",
  
  "agents": {
    "1": {
      "name": "services-refactor",
      "description": "Extract service layer from API routes",
      "worktree": "ralphy-agent-1",
      "branch": "ralphy/agent-1-services",
      "ralph_agent": "THE_BUILDER"
    },
    "2": {
      "name": "integration-tests",
      "description": "Create comprehensive integration tests",
      "worktree": "ralphy-agent-2",
      "branch": "ralphy/agent-2-tests",
      "ralph_agent": "THE_TESTER"
    },
    "3": {
      "name": "security-audit",
      "description": "RLS and multi-tenant security audit",
      "worktree": "ralphy-agent-3",
      "branch": "ralphy/agent-3-security",
      "ralph_agent": "THE_SHERIFF"
    }
  }
}
```

### Customizing Agents

Edit `config.json` to add more agents or change assignments:

```json
{
  "agents": {
    "4": {
      "name": "documentation",
      "description": "Update documentation",
      "worktree": "ralphy-agent-4",
      "branch": "ralphy/agent-4-docs",
      "ralph_agent": "THE_LIBRARIAN"
    }
  }
}
```

Then create the worktree:

```powershell
git worktree add -b ralphy/agent-4-docs ../vete-worktrees/ralphy-agent-4 develop
```

---

## 🛡️ Safety Features

### Built-in Protections

1. **Isolated Branches**: Each agent works on its own branch
2. **Merge Approval**: Changes must be reviewed before merging (if `require_approval: true`)
3. **State Tracking**: Agent status saved in `.ralphy/state/`
4. **Logging**: All agent output logged to `.ralphy/logs/`

### Safety Hooks Plugin

The `.opencode/plugins/vete-safety/` plugin automatically:

- ✅ Blocks `.env` file edits
- ✅ Warns about missing `tenant_id` filters
- ✅ Validates RLS in migrations
- ✅ Checks for hardcoded colors
- ✅ Enforces Spanish text in UI

See `.opencode/plugins/vete-safety/README.md` for details.

---

## 🎓 OpenCode Skills

Ralphy works seamlessly with Vete-specific skills in `.opencode/skills/`:

### vete-supabase-rls
**Activation**: `migration|sql|database|supabase|rls`

Provides RLS patterns for multi-tenant security:
- Table creation with `tenant_id`
- RLS policy templates
- API route tenant filtering

### vete-api-routes
**Activation**: `api|route.ts|nextjs api`

Provides API route patterns:
- Auth + tenant isolation template
- POST/PUT/DELETE patterns
- Error response standards

### vete-nextjs-patterns
**Activation**: `nextjs|server component|page.tsx`

Provides Next.js patterns:
- Multi-tenant routing
- Server vs Client components
- Theme variable usage

**Skills activate automatically based on file context!**

---

## 📊 Workflow Patterns

### Pattern 1: Feature Development Sprint

```
Agent 1: Backend (Service Layer)
Agent 2: Frontend (Components)
Agent 3: Tests (Integration)
Agent 4: Documentation
```

**Result**: Complete feature in 1/4 the time

### Pattern 2: Refactoring Phase

```
Agent 1: Extract InvoiceService
Agent 2: Extract PaymentService
Agent 3: Extract StoreService
```

**Result**: Parallel refactoring without conflicts

### Pattern 3: Quality Improvement

```
Agent 1: Add E2E tests
Agent 2: Security audit
Agent 3: Performance optimization
```

**Result**: Comprehensive quality improvements in parallel

---

## 🔄 Merge Workflow

### Safe Merge Process

1. **Review Changes**:
   ```powershell
   cd ../vete-worktrees/ralphy-agent-1
   git status
   git diff develop
   ```

2. **Run Tests** (if applicable):
   ```powershell
   cd web
   npm test
   npm run build
   ```

3. **Merge to Develop**:
   ```powershell
   cd C:\Users\Alejandro\Documents\Ivan\Adris\Vete
   .\ralphy.ps1 merge 1
   ```

4. **Review Prompt** (if `require_approval: true`):
   ```
   Review changes before merge:
   [Git diff stats shown]
   Proceed with merge? (y/N):
   ```

5. **Cleanup** (optional):
   ```powershell
   git worktree remove ../vete-worktrees/ralphy-agent-1
   git branch -d ralphy/agent-1-services
   ```

---

## 🧪 Testing Ralphy

### Test Tasks Provided

Three example tasks are in `.ralphy/test-tasks/`:

1. **agent-1-task.md**: Extract InvoiceService (30 min)
2. **agent-2-task.md**: Create AppointmentService tests (45 min)
3. **agent-3-task.md**: Security audit of appointments API (30 min)

### Running Test Tasks

```powershell
# Terminal 1
cd ../vete-worktrees/ralphy-agent-1
opencode --agent build
# Paste contents of .ralphy/test-tasks/agent-1-task.md

# Terminal 2
cd ../vete-worktrees/ralphy-agent-2
opencode --agent build
# Paste contents of .ralphy/test-tasks/agent-2-task.md

# Terminal 3
cd ../vete-worktrees/ralphy-agent-3
opencode --agent build
# Paste contents of .ralphy/test-tasks/agent-3-task.md
```

**Expected Result**: All 3 agents work simultaneously, creating different files in isolated branches.

---

## 🐛 Troubleshooting

### Issue: Worktree creation fails

```
fatal: 'develop' is already used by worktree
```

**Solution**: Create worktree with a new branch:
```powershell
git worktree add -b ralphy/agent-1-new ../vete-worktrees/ralphy-agent-1 develop
```

### Issue: Can't switch branches in main repo

```
fatal: cannot switch branches while in worktree
```

**Solution**: Worktrees lock branches. This is intentional - work in the worktree, not main repo.

### Issue: Merge conflicts

**Solution**: Resolve conflicts manually:
```powershell
git checkout develop
git merge ralphy/agent-1-services
# Resolve conflicts in editor
git add .
git commit
```

### Issue: Agent not responding

**Solution**: Check agent status and logs:
```powershell
.\ralphy.ps1 status
cat .ralphy/logs/agent-1-*.log
```

---

## 📈 Performance Impact

### Expected Speedup

| Workflow | Sequential | Parallel (Ralphy) | Speedup |
|----------|------------|-------------------|---------|
| 3 services refactored | 90 min | 30 min | **3x** |
| Full test suite | 120 min | 40 min | **3x** |
| Security audit + fixes | 60 min | 20 min | **3x** |
| Documentation update | 45 min | 15 min | **3x** |

**Average**: 3-4x faster development when running 3-4 agents in parallel.

---

## 🎯 Best Practices

### Do's ✅

- Assign independent tasks to agents (no shared files)
- Review changes before merging
- Keep worktrees synced with develop regularly
- Use descriptive branch names
- Clean up completed worktrees
- Test in worktree before merging

### Don'ts ❌

- Don't work on same files in multiple agents
- Don't commit directly to develop in worktrees
- Don't forget to merge completed work
- Don't skip code review
- Don't leave stale worktrees around
- Don't bypass safety checks

---

## 🔗 Integration with Existing Tools

### Ralph Loop Agents

Ralphy complements the existing Ralph agents in `.claude/prompts/ralph/`:

- **THE_BUILDER**: Feature implementation
- **THE_SHERIFF**: Security enforcement
- **THE_LIBRARIAN**: Documentation sync
- **THE_DETECTIVE**: Gap analysis
- **THE_TESTER**: Test creation

**Use Ralphy to run these agents in parallel!**

### CI/CD Integration

Ralphy branches follow git-flow conventions:

```
develop (main branch)
  ├── ralphy/agent-1-services (feature branch)
  ├── ralphy/agent-2-tests (feature branch)
  └── ralphy/agent-3-security (feature branch)
```

All branches can be pushed to origin and tested in CI/CD independently.

---

## 📚 Additional Resources

- **Git Worktrees Documentation**: https://git-scm.com/docs/git-worktree
- **OpenCode Documentation**: https://opencode.ai/docs
- **Vete Coding Standards**: `CLAUDE.md`
- **Ralph Agents Guide**: `.claude/RALPH_COMMANDS.md`
- **Safety Plugin**: `.opencode/plugins/vete-safety/README.md`
- **Skills Reference**: `.opencode/skills/`

---

## 🤝 Contributing

To improve Ralphy:

1. Test new workflows and document them
2. Add new agent configurations to `config.json`
3. Create more example tasks in `.ralphy/test-tasks/`
4. Report issues or suggestions

---

## 📄 License

Part of the Vete project - proprietary.

---

**Happy Parallel Development! 🚀**

For questions or support, check the resources above or review the test tasks to see Ralphy in action.
