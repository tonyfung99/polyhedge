# Git Branching Strategy for Polyhedge Frontend

Feature branch workflow for building the Polyhedge frontend with proper git practices.

## Strategy: Feature Branches

**Goal**: Learn industry-standard git workflow while building isolated, reviewable features.

### Branch Structure

```
main (production-ready code)
 └── FE-preview (integration branch for all frontend work)
      ├── feature/setup-app (Phase 1: Initial setup)
      ├── feature/sidebar-layout (Phase 2: Layout & wallet)
      ├── feature/marketplace (Phase 3: Strategy table)
      ├── feature/purchase-flow (Phase 4: Buy dialog)
      └── feature/dashboard (Phase 5: User positions)
           ↓
      merge features back to FE-preview when complete
           ↓
      merge FE-preview to main when ready to deploy
```

### Why This Approach?

**Benefits**:
- ✅ **Clean separation** - Each feature is isolated
- ✅ **Easy to review** - Can see exactly what each feature does
- ✅ **Safe experimentation** - Can abandon features without affecting others
- ✅ **Industry standard** - This is how professional teams work
- ✅ **Great for learning** - You'll understand proper git workflows
- ✅ **Rollback friendly** - Easy to undo specific features

**Trade-offs**:
- ⚠️ Requires more git commands
- ⚠️ Potential merge conflicts between features
- ⚠️ ~10-15% time overhead for branch management

---

## Implementation Plan

### Phase 0: Create FE-Preview Branch (Now)

```bash
# Make sure everything is committed
git status
git add -A
git commit -m "docs: finalize planning documents"

# Create FE-preview from current branch (fe-contract-docs)
git checkout -b FE-preview

# Clean up old frontend packages
git rm -rf packages/nextjs
git rm -rf packages/vincent-login

# Clean up docs (keep only essential ones)
# Keep: FRONTEND_*, GIT_STRATEGY.md, PROJECT_OVERVIEW.md, SMART_CONTRACT_API.md
git rm docs/BRIDGE_CONTRACT_INTEGRATION_CHECKLIST.md
git rm docs/CRYPTO_PRICE_STRATEGIES.md
git rm docs/REFINED_IMPLEMENTATION_PLAN.md
git rm docs/TEAM_ASSIGNMENTS.md
git rm docs/TECHNICAL_SPECIFICATION.md
git rm docs/TOKEN_BRIDGE_ARCHITECTURE.md
git rm docs/bridge-service-notes.md
# ... and other non-essential docs

# Commit cleanup
git add -A
git commit -m "cleanup: remove old frontend packages and non-essential docs"

# Push FE-preview branch
git push origin FE-preview
```

---

### Phase 1: Setup App (Feature Branch)

**Goal**: Initialize `packages/app` with Next.js and shadcn

```bash
# Create feature branch from FE-preview
git checkout FE-preview
git checkout -b feature/setup-app

# Create and initialize packages/app
mkdir -p packages/app
cd packages/app
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Initialize shadcn
npx shadcn@latest init

# Add essential components
npx shadcn@latest add button card dialog table input label badge alert toast sheet avatar separator

# Update root package.json to include packages/app in workspaces
cd ../..
# Edit package.json manually or use script

# Install dependencies
yarn install

# Commit
git add -A
git commit -m "feat(setup): initialize packages/app with Next.js and shadcn"

# Merge back to FE-preview
git checkout FE-preview
git merge feature/setup-app

# Delete feature branch (cleanup)
git branch -d feature/setup-app

# Push
git push origin FE-preview
```

---

### Phase 2: Sidebar Layout (Feature Branch)

**Goal**: Build app shell with sidebar navigation and wallet connection

```bash
# Create feature branch
git checkout FE-preview
git checkout -b feature/sidebar-layout

# Install RainbowKit and wagmi
cd packages/app
yarn add @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query

# Create layout components:
# - app/providers.tsx (RainbowKit setup)
# - components/layout/TopBar.tsx (POLYHEDGE + wallet)
# - components/layout/Sidebar.tsx (navigation)
# - components/layout/AppLayout.tsx (wrapper)
# - app/layout.tsx (update to use AppLayout)

# Test that it works
yarn dev

# Commit incrementally
git add packages/app/app/providers.tsx
git commit -m "feat(layout): add RainbowKit providers and config"

git add packages/app/components/layout/
git commit -m "feat(layout): add sidebar navigation and top bar"

git add packages/app/app/layout.tsx
git commit -m "feat(layout): update root layout with sidebar"

# Merge back to FE-preview
git checkout FE-preview
git merge feature/sidebar-layout

# Delete feature branch
git branch -d feature/sidebar-layout

# Push
git push origin FE-preview
```

---

### Phase 3: Marketplace (Feature Branch)

**Goal**: Display all strategies in a table

```bash
# Create feature branch
git checkout FE-preview
git checkout -b feature/marketplace

# Create contract integration:
# - lib/contracts/addresses.ts
# - lib/contracts/abis/ (copy from hardhat)
# - hooks/useStrategies.ts

# Create marketplace components:
# - components/strategies/StrategyTable.tsx
# - app/strategies/page.tsx

# Test with real contract data
yarn dev

# Commit
git add packages/app/lib/contracts
git commit -m "feat(contracts): add contract addresses and ABIs"

git add packages/app/hooks/useStrategies.ts
git commit -m "feat(strategies): add useStrategies hook"

git add packages/app/components/strategies/StrategyTable.tsx
git commit -m "feat(strategies): add marketplace table component"

git add packages/app/app/strategies/page.tsx
git commit -m "feat(strategies): add marketplace page"

# Merge back to FE-preview
git checkout FE-preview
git merge feature/marketplace

# Delete feature branch
git branch -d feature/marketplace

# Push
git push origin FE-preview
```

---

### Phase 4: Purchase Flow (Feature Branch)

**Goal**: Implement buy strategy dialog with USDC approval

```bash
# Create feature branch
git checkout FE-preview
git checkout -b feature/purchase-flow

# Create purchase components:
# - components/strategies/BuyStrategyDialog.tsx
# - hooks/useBuyStrategy.ts

# Test the full flow
yarn dev

# Commit
git add packages/app/hooks/useBuyStrategy.ts
git commit -m "feat(purchase): add useBuyStrategy hook with USDC approval"

git add packages/app/components/strategies/BuyStrategyDialog.tsx
git commit -m "feat(purchase): add buy strategy dialog"

# Merge back to FE-preview
git checkout FE-preview
git merge feature/purchase-flow

# Delete feature branch
git branch -d feature/purchase-flow

# Push
git push origin FE-preview
```

---

### Phase 5: Dashboard (Feature Branch)

**Goal**: Show user positions and P&L with claim functionality

```bash
# Create feature branch
git checkout FE-preview
git checkout -b feature/dashboard

# Create dashboard components:
# - hooks/useUserPositions.ts
# - hooks/useClaimStrategy.ts
# - components/dashboard/PnLSummary.tsx
# - components/dashboard/PositionsTable.tsx
# - components/dashboard/ClaimButton.tsx
# - app/dashboard/page.tsx

# Test
yarn dev

# Commit
git add packages/app/hooks/useUserPositions.ts packages/app/hooks/useClaimStrategy.ts
git commit -m "feat(dashboard): add user positions and claim hooks"

git add packages/app/components/dashboard/
git commit -m "feat(dashboard): add positions table and P&L summary"

git add packages/app/app/dashboard/page.tsx
git commit -m "feat(dashboard): add dashboard page"

# Merge back to FE-preview
git checkout FE-preview
git merge feature/dashboard

# Delete feature branch
git branch -d feature/dashboard

# Push
git push origin FE-preview
```

---

### Phase 6: Polish (Feature Branch)

**Goal**: Add loading states, error handling, responsive design

```bash
# Create feature branch
git checkout FE-preview
git checkout -b feature/polish

# Add improvements:
# - Loading skeletons
# - Error boundaries
# - Mobile responsiveness
# - Empty states
# - Better UX

# Test thoroughly
yarn dev

# Commit
git add packages/app
git commit -m "feat(polish): add loading states and error handling"

git add packages/app
git commit -m "feat(polish): improve mobile responsiveness"

# Merge back to FE-preview
git checkout FE-preview
git merge feature/polish

# Delete feature branch
git branch -d feature/polish

# Push
git push origin FE-preview
```

---

### Final: Merge to Main

```bash
# When everything is working and tested
git checkout main
git merge FE-preview

# Push to main
git push origin main

# Keep FE-preview around for future work
git push origin FE-preview
```

---

## Common Git Commands

### Daily Workflow

```bash
# Check current branch
git branch

# Check status
git status

# See changes
git diff

# Add files
git add packages/app/components/NewComponent.tsx
# or add all
git add -A

# Commit
git commit -m "feat: add new component"

# Switch branches
git checkout FE-preview

# Create new feature branch
git checkout FE-preview
git checkout -b feature/new-thing

# Merge feature into FE-preview
git checkout FE-preview
git merge feature/new-thing

# Delete feature branch after merge
git branch -d feature/new-thing

# Push branch
git push origin FE-preview

# See commit history
git log --oneline -10
```

### When Things Go Wrong

```bash
# Undo changes to a file (before commit)
git checkout -- packages/app/components/BrokenComponent.tsx

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) ⚠️ DANGEROUS
git reset --hard HEAD~1

# See what changed in last commit
git show

# Abort a merge in progress
git merge --abort
```

---

## Handling Merge Conflicts

### When a Conflict Happens

```bash
# Trying to merge
git merge feature/something

# If conflict:
Auto-merging packages/app/components/Something.tsx
CONFLICT (content): Merge conflict in packages/app/components/Something.tsx
Automatic merge failed; fix conflicts and then commit the result.
```

### Resolve It

1. **Open the conflicted file**:
```typescript
<<<<<<< HEAD
// Code in FE-preview
const value = "A";
=======
// Code in feature branch
const value = "B";
>>>>>>> feature/something
```

2. **Edit to keep what you want**:
```typescript
const value = "B";
```

3. **Mark as resolved**:
```bash
git add packages/app/components/Something.tsx
git commit -m "merge: resolve conflict in Something component"
```

**Pro Tip**: Use VS Code's built-in merge conflict UI!

---

## Commit Message Best Practices

### Format

```
type(scope): short description

Optional longer explanation
- Bullet points for details
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting (not CSS)
- `refactor:` - Code restructure
- `test:` - Tests
- `chore:` - Maintenance

### Good Examples

```bash
git commit -m "feat(marketplace): add strategy table with sorting"
git commit -m "feat(purchase): implement USDC approval flow"
git commit -m "fix(dashboard): correct P&L calculation"
git commit -m "style(sidebar): improve mobile responsiveness"
```

### Bad Examples (too vague)

```bash
git commit -m "update"
git commit -m "fix"
git commit -m "wip"
```

---

## Feature Branch Checklist

Before merging a feature branch:

- [ ] Feature is complete and working
- [ ] Tested in browser
- [ ] No console errors
- [ ] Committed all changes
- [ ] Good commit messages
- [ ] Ready to merge

After merging:

- [ ] Delete feature branch (`git branch -d feature/name`)
- [ ] Push FE-preview (`git push origin FE-preview`)
- [ ] Start next feature

---

## Quick Reference

### Branch Naming Convention

```
feature/setup-app
feature/sidebar-layout
feature/marketplace
feature/purchase-flow
feature/dashboard
feature/polish
```

### Typical Feature Workflow

```bash
# 1. Start from FE-preview
git checkout FE-preview

# 2. Create feature branch
git checkout -b feature/new-thing

# 3. Work and commit
# ... make changes ...
git add -A
git commit -m "feat: add new thing"

# 4. Merge back to FE-preview
git checkout FE-preview
git merge feature/new-thing

# 5. Delete feature branch
git branch -d feature/new-thing

# 6. Push
git push origin FE-preview
```

---

## Next Steps

### Ready to Start?

```bash
# 1. Commit current work
git add -A
git commit -m "docs: finalize git strategy (feature branch approach)"

# 2. Create FE-preview branch
git checkout -b FE-preview

# 3. Clean up old packages and docs
git rm -rf packages/nextjs packages/vincent-login
# (clean up docs - see Phase 0 above)

# 4. Commit cleanup
git add -A
git commit -m "cleanup: remove old frontend packages and non-essential docs"

# 5. Push
git push origin FE-preview

# 6. Start first feature
git checkout -b feature/setup-app
# ... begin building!
```

**Let's go!** 🚀
