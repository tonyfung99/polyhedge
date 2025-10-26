# Git Branching Strategy for Polyhedge Frontend

Guide to choosing the right git workflow for hackathon development while learning best practices.

## Your Proposed Strategy (Analysis)

### What You Suggested:
```
main
 └── FE-preview
      ├── delete old packages
      ├── feature/marketplace
      ├── feature/purchase-flow
      ├── feature/dashboard
      └── feature/wallet
           ↓
      merge features back to FE-preview
           ↓
      merge FE-preview to main (when done)
```

### Analysis: This is Actually GREAT Thinking! 🎯

**Why your logic is solid**:
1. ✅ **Isolation** - FE work doesn't affect main branch
2. ✅ **Safety** - Can delete old packages without breaking main
3. ✅ **Organization** - Each feature gets its own branch
4. ✅ **Learning** - You'll learn proper git workflows
5. ✅ **Rollback** - Easy to undo if something breaks

**Potential challenges**:
1. ⚠️ **Time overhead** - Managing multiple branches takes time
2. ⚠️ **Merge conflicts** - More branches = more potential conflicts
3. ⚠️ **Context switching** - Jumping between branches can be confusing
4. ⚠️ **Hackathon pace** - Under time pressure, simpler might be better

---

## Strategy Options (Compared)

### Option A: Your Proposed Strategy (Feature Branches)
**Best for**: Learning proper git workflows, team collaboration

```bash
# Current state
* fe-contract-docs (your current branch with docs)

# Create FE-preview from main
git checkout main
git checkout -b FE-preview

# Cherry-pick your doc commits
git cherry-pick <commit-hash-of-docs>

# Delete old packages (optional)
rm -rf packages/nextjs packages/vincent-login
git add -A
git commit -m "cleanup: remove old frontend packages"

# Create feature branches
git checkout -b feature/sidebar-layout
# ... work ...
git checkout FE-preview
git merge feature/sidebar-layout

git checkout -b feature/marketplace
# ... work ...
git checkout FE-preview
git merge feature/marketplace

# And so on...
```

**Pros**:
- ✅ Clean separation of features
- ✅ Easy to review individual features
- ✅ Can abandon a feature without affecting others
- ✅ Industry best practice
- ✅ Great for learning

**Cons**:
- ❌ More git commands to remember
- ❌ Potential merge conflicts when merging features
- ❌ Time overhead in hackathon setting
- ❌ Can be overwhelming when learning both React + Git

**Time cost**: +10-15% overhead for branch management

---

### Option B: Single Development Branch (Simpler)
**Best for**: Solo development, hackathons, rapid iteration

```bash
# Current state
* fe-contract-docs (has your docs)

# Rename to something more appropriate
git branch -m fe-contract-docs fe-development

# Build everything on this one branch
# No feature branches, just commit directly
git add packages/app
git commit -m "feat: add marketplace table"

git add packages/app
git commit -m "feat: add purchase dialog"

# When ready, merge to main
git checkout main
git merge fe-development
```

**Pros**:
- ✅ Simple - no branch juggling
- ✅ Fast - just code and commit
- ✅ Linear history - easy to follow
- ✅ Less context switching
- ✅ Focus on learning React, not Git

**Cons**:
- ❌ All changes mixed together
- ❌ Harder to isolate if something breaks
- ❌ Can't easily throw away experimental code
- ❌ Less "real-world" workflow

**Time cost**: Minimal overhead

---

### Option C: Hybrid Approach (Recommended for You!)
**Best for**: Balancing learning with hackathon speed

```bash
# Start with single branch
git checkout -b FE-preview

# Build features directly on FE-preview initially
git commit -m "feat: setup packages/app with shadcn"
git commit -m "feat: add sidebar layout"
git commit -m "feat: add marketplace table"

# Create feature branch ONLY for risky/experimental work
git checkout -b experiment/complex-chart
# Try something...
# If it works:
git checkout FE-preview
git merge experiment/complex-chart
# If it doesn't work:
git checkout FE-preview
git branch -D experiment/complex-chart  # Delete it!

# When ready, merge to main
git checkout main
git merge FE-preview
```

**Pros**:
- ✅ Simple for most work
- ✅ Flexibility for experiments
- ✅ Safety net when needed
- ✅ Balance of speed + learning
- ✅ Can switch to full feature branches later

**Cons**:
- ❌ Not as clean as full feature branches
- ❌ Still some overhead

**Time cost**: +5% overhead (only when needed)

---

## Recommendation for Polyhedge Hackathon

### 🏆 Go with **Option C: Hybrid Approach**

Here's why:

1. **You're learning TWO things** - React/Next.js AND Git
2. **Time pressure** - Hackathons have deadlines
3. **Solo development** - Not dealing with merge conflicts from teammates
4. **Flexibility** - Can always create feature branches if needed
5. **Best of both worlds** - Simple by default, branches when useful

### Concrete Plan for Your Project

#### Phase 1: Setup & Cleanup (now)
```bash
# You're on: fe-contract-docs
# This branch has: docs commits

# Create FE-preview from current branch
git checkout -b FE-preview

# Optional: Delete old packages now or later
# (I'd say keep them for now, delete later if needed)

# Commit any changes
git add docs/
git commit -m "docs: update plan with sidebar layout"
```

#### Phase 2: Build Core Features (next)
```bash
# Work directly on FE-preview
git add packages/app
git commit -m "feat: initialize packages/app with Next.js and shadcn"

git add packages/app/components/layout
git commit -m "feat: add sidebar layout with navigation"

git add packages/app/app/strategies
git commit -m "feat: add marketplace table with strategy data"

git add packages/app/components/strategies
git commit -m "feat: add buy strategy dialog and USDC approval"

git add packages/app/app/dashboard
git commit -m "feat: add user dashboard with positions table"
```

#### Phase 3: Use Feature Branches for Experiments
```bash
# Only when trying something risky/uncertain
git checkout -b experiment/animated-charts
# Try adding fancy charts...
# If it works, merge back
git checkout FE-preview
git merge experiment/animated-charts

# If it doesn't work or takes too long
git checkout FE-preview
git branch -D experiment/animated-charts  # Delete and move on
```

#### Phase 4: Polish & Merge to Main
```bash
# When ready to deploy/present
git checkout main
git merge FE-preview

# Push to GitHub
git push origin main
```

---

## Detailed Workflow: Step-by-Step

### Step 1: Create FE-Preview Branch (Right Now)

```bash
# Check current status
git status

# Make sure everything is committed
git add -A
git commit -m "docs: finalize planning documents"

# Create FE-preview from current branch
git checkout -b FE-preview

# Verify you're on the new branch
git branch
# Should show: * FE-preview
```

### Step 2: Optional Cleanup

**Option A: Delete old packages now**
```bash
# Remove old frontend packages
git rm -rf packages/nextjs
git rm -rf packages/vincent-login
git commit -m "cleanup: remove old frontend packages for fresh start"
```

**Option B: Keep them for now** (Recommended)
```bash
# Just create packages/app alongside them
# Can delete later if they're in the way
# Nice to keep as reference
```

### Step 3: Set Up New Package

```bash
# Create and initialize packages/app
mkdir -p packages/app
cd packages/app
npx create-next-app@latest . --typescript --tailwind --app

# Commit the new package
git add packages/app
git commit -m "feat: initialize packages/app with Next.js 15"

# Initialize shadcn
cd packages/app
npx shadcn@latest init
# Answer prompts...

# Commit shadcn setup
git add packages/app
git commit -m "feat: initialize shadcn/ui with default config"
```

### Step 4: Build Features (Commit Often!)

**Good commit cadence**: Every 30-60 minutes or when you complete a "unit" of work

```bash
# After creating sidebar layout
git add packages/app/components/layout
git commit -m "feat(layout): add sidebar navigation with Polyhedge branding"

# After creating marketplace table
git add packages/app/app/strategies
git add packages/app/components/strategies
git commit -m "feat(strategies): add marketplace table with strategy data"

# After adding buy dialog
git add packages/app/components/strategies/BuyStrategyDialog.tsx
git commit -m "feat(strategies): add buy dialog with USDC approval flow"
```

### Step 5: When Ready, Merge to Main

```bash
# Switch to main
git checkout main

# Merge FE-preview
git merge FE-preview

# Push to GitHub
git push origin main

# Push FE-preview branch too (backup)
git push origin FE-preview
```

---

## Common Git Commands You'll Use

### Daily Workflow

```bash
# Check what's changed
git status

# See your changes
git diff

# Add files
git add packages/app/components/NewComponent.tsx
# or add everything
git add -A

# Commit
git commit -m "feat: add new component"

# See commit history
git log --oneline -10

# Push to GitHub
git push origin FE-preview
```

### When Something Goes Wrong

```bash
# Undo changes to a file (before commit)
git checkout -- packages/app/components/BrokenComponent.tsx

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) ⚠️ DANGEROUS
git reset --hard HEAD~1

# See what you changed in last commit
git show

# Create a commit that undoes a previous commit
git revert <commit-hash>
```

### Branching Commands

```bash
# Create new branch
git checkout -b feature/new-thing

# Switch branches
git checkout FE-preview

# List all branches
git branch -a

# Delete branch (safe - won't delete if unmerged)
git branch -d feature/old-thing

# Delete branch (force - will delete even if unmerged)
git branch -D experiment/failed-thing

# Merge branch into current branch
git merge feature/new-thing
```

---

## Commit Message Best Practices

### Format
```
type(scope): short description

Longer explanation if needed
- Bullet points for details
- What changed and why
```

### Types
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code formatting (not CSS)
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance (dependencies, config)

### Examples

**Good commits**:
```bash
git commit -m "feat(marketplace): add strategy table with sorting"
git commit -m "feat(purchase): implement USDC approval flow"
git commit -m "fix(dashboard): correct P&L calculation for settled strategies"
git commit -m "style(sidebar): improve mobile responsiveness"
git commit -m "docs: update README with deployment instructions"
```

**Bad commits** (too vague):
```bash
git commit -m "update stuff"
git commit -m "fix"
git commit -m "wip"
```

---

## Handling Merge Conflicts (If They Happen)

### When You See a Merge Conflict

```bash
# Try to merge
git merge feature/something

# If conflict occurs:
Auto-merging packages/app/components/Something.tsx
CONFLICT (content): Merge conflict in packages/app/components/Something.tsx
Automatic merge failed; fix conflicts and then commit the result.
```

### Resolve It

1. **Open the conflicted file** - You'll see:
```typescript
<<<<<<< HEAD
// Your current code
const value = "A";
=======
// Incoming code from feature branch
const value = "B";
>>>>>>> feature/something
```

2. **Edit the file** - Keep what you want:
```typescript
// Choose one or combine both
const value = "B";
```

3. **Mark as resolved**:
```bash
git add packages/app/components/Something.tsx
git commit -m "merge: resolve conflict in Something component"
```

### Pro Tip: Use VS Code
VS Code has built-in merge conflict resolution UI - super helpful!

---

## Quick Decision Matrix

Choose your strategy based on:

| Your Situation | Recommended Strategy |
|----------------|---------------------|
| Solo developer, tight deadline | **Option B: Single Branch** |
| Solo developer, learning focus | **Option C: Hybrid** (👈 **YOU**) |
| Team of 2-3, hackathon | **Option C: Hybrid** |
| Team of 4+, hackathon | **Option A: Feature Branches** |
| Production app, multiple developers | **Option A: Feature Branches** |

---

## Final Recommendation for You

### Do This:

1. **Right now**: Create `FE-preview` branch from `fe-contract-docs`
2. **Keep old packages**: Don't delete yet (can reference later)
3. **Build on FE-preview**: Commit directly for most work
4. **Use feature branches**: Only for risky experiments
5. **Merge to main**: When ready to present/deploy

### Don't Do This:

1. ❌ Create feature branches for every tiny change
2. ❌ Worry too much about "perfect" git history
3. ❌ Stress about branching during hackathon
4. ❌ Delete old code until you're sure you don't need it

### Remember:

> "Perfect is the enemy of done" - especially in hackathons!

Git is a tool to help you, not slow you down. Use branches when they help, work directly when they don't.

---

## Next Steps

Ready to start? Here's your exact command sequence:

```bash
# 1. Commit current work
git add docs/
git commit -m "docs: finalize git strategy and frontend plan"

# 2. Create FE-preview branch
git checkout -b FE-preview

# 3. Verify
git branch
# Should show: * FE-preview

# 4. Start building!
# We'll create packages/app next
```

**Want me to help you execute these steps and create the new package?**
