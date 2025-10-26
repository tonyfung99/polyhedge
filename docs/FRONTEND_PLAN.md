# Polyhedge Frontend Implementation Plan

Clean-slate plan for building the Polyhedge frontend with shadcn/ui.

## Decision: Fresh Start with shadcn/ui

### Why Start Clean?

We're creating a **new frontend package** with shadcn/ui instead of modifying existing packages because:

1. **Clean learning environment** - No legacy code to navigate
2. **Purpose-built** - Designed specifically for Polyhedge, not a generic template
3. **Modern best practices** - Latest Next.js 15 App Router patterns
4. **Full control** - Every line of code is intentional

### What We're Ignoring (For Now)

- ❌ `packages/nextjs` - Scaffold-ETH 2 template (outdated for our needs)
- ❌ `packages/vincent-login` - Teammate's Polymarket auth (integrate later)

### What We're Building

- ✅ **New package**: `packages/app` (or `packages/frontend`)
- ✅ Next.js 15 + shadcn/ui + Tailwind
- ✅ RainbowKit for wallet connection
- ✅ Clean, focused codebase for Polyhedge

---

## Core Features to Build

### 1. Strategy Marketplace (Table View)
**Purpose**: Browse and discover available hedging strategies

**Key Components**:
- Data table showing all active strategies
- Sortable/filterable columns
- Strategy details in each row

**Data to Display**:
| Column | Data | Source |
|--------|------|--------|
| Strategy Name | `strategy.name` | StrategyManager |
| Expected Return | `strategy.expectedProfitBps` | StrategyManager |
| Maturity Date | `strategy.maturityTs` | StrategyManager |
| Fee | `strategy.feeBps` | StrategyManager |
| Status | `strategy.active` | StrategyManager |
| Actions | Buy button | - |

**Contract Integration**:
```typescript
// Read all strategies from StrategyManager
const strategies = await Promise.all(
  Array.from({ length: nextStrategyId - 1 }, (_, i) =>
    strategyManager.strategies(i + 1)
  )
);
```

**User Flow**:
```
User lands on page
  → Sees table of all strategies
  → Can sort by maturity, return, etc.
  → Clicks "Buy" button on a strategy
  → Opens purchase dialog (Feature #2)
```

---

### 2. Strategy Purchase Flow
**Purpose**: Allow users to buy a strategy with USDC

**Components Needed**:
- Purchase dialog/modal
- Amount input
- Fee breakdown display
- USDC approval step
- Transaction confirmation

**Purchase Steps**:
```
1. User clicks "Buy Strategy" button
2. Dialog opens with strategy details
3. User enters USDC amount
4. Show breakdown:
   - Gross amount: 100 USDC
   - Fee (5%): -5 USDC
   - Net investment: 95 USDC
5. User clicks "Approve USDC"
   → Calls usdc.approve(strategyManager, amount)
6. User clicks "Confirm Purchase"
   → Calls strategyManager.buyStrategy(strategyId, amount)
7. Show transaction pending state
8. On success: Show confirmation
9. Redirect to user dashboard
```

**Smart Contract Calls**:
```typescript
// Step 1: Approve USDC
await usdc.approve(STRATEGY_MANAGER_ADDRESS, grossAmount);

// Step 2: Buy strategy
await strategyManager.buyStrategy(strategyId, grossAmount);
```

**Events to Listen**:
```solidity
event StrategyPurchased(
  uint256 indexed strategyId,
  address indexed user,
  uint256 grossAmount,
  uint256 netAmount
)
```

**Edge Cases**:
- Insufficient USDC balance
- Strategy no longer active
- Strategy already matured
- Transaction failures
- Network switching (must be on Arbitrum)

---

### 3. User Dashboard (Positions & P&L)
**Purpose**: Track user's active positions and claimable rewards

**Sections**:

#### A. Active Positions Table
Show all positions user has purchased

| Column | Data | Source |
|--------|------|--------|
| Strategy Name | `strategy.name` | StrategyManager.strategies(id) |
| Amount Invested | `position.amount` | UserPosition.amount |
| Purchase Date | `position.purchaseTs` | UserPosition.purchaseTs |
| Maturity Date | `strategy.maturityTs` | StrategyManager.strategies(id) |
| Status | Active/Matured/Claimable | Derived |
| Expected Return | `strategy.expectedProfitBps` | StrategyManager.strategies(id) |
| Actions | Claim button (if matured) | - |

#### B. P&L Summary (Top of page)
```
┌─────────────────────────────────────┐
│  Total Invested:     $1,000 USDC    │
│  Active Positions:   3               │
│  Claimable:          $150 USDC       │
│  Estimated P&L:      +$45 USDC       │
└─────────────────────────────────────┘
```

#### C. Claim Flow
```
1. User sees matured strategy with "Claim" button
2. Clicks "Claim Rewards"
3. Calls strategyManager.claimStrategy(strategyId)
4. Receives payout to wallet
5. Position marked as claimed
6. Update dashboard
```

**Contract Integration**:
```typescript
// Get user's positions
const positions = await strategyManager.userPositions(userAddress);

// For each position, get strategy details
const strategyDetails = await strategyManager.strategies(position.strategyId);

// Check if claimable
const isMatured = Date.now() > strategyDetails.maturityTs * 1000;
const isSettled = strategyDetails.settled;
const canClaim = isMatured && isSettled && !position.claimed;

// Claim
await strategyManager.claimStrategy(strategyId);
```

**Real-time Updates**:
- Subscribe to StrategySettled events
- Subscribe to StrategyClaimed events
- Auto-refresh when user claims
- Show time until maturity for active positions

---

### 4. Wallet Integration (RainbowKit)
**Purpose**: Connect user's wallet to interact with contracts

**Requirements**:
- Connect/disconnect wallet
- Display connected address
- Network switching (force Arbitrum)
- Balance display (ETH + USDC)

**RainbowKit Setup**:
```typescript
// app/providers.tsx
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { arbitrum } from 'wagmi/chains';

const config = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http()
  }
});

export function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**Header Component**:
```typescript
// components/layout/Header.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Polyhedge</h1>
        <nav>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
```

**Network Guard**:
```typescript
// components/web3/NetworkGuard.tsx
import { useNetwork } from 'wagmi';

export function NetworkGuard({ children }) {
  const { chain } = useNetwork();

  if (chain?.id !== arbitrum.id) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        Please switch to Arbitrum network
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## Project Structure

### New Package: `packages/app`

```
packages/app/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── app/
│   ├── layout.tsx              ← Root layout with providers
│   ├── page.tsx                ← Landing page → redirects to /strategies
│   ├── providers.tsx           ← RainbowKit + wagmi setup
│   ├── strategies/
│   │   └── page.tsx            ← FEATURE #1: Marketplace table
│   └── dashboard/
│       └── page.tsx            ← FEATURE #3: User positions & P&L
├── components/
│   ├── ui/                     ← shadcn components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── strategies/
│   │   ├── StrategyTable.tsx          ← Marketplace table
│   │   └── BuyStrategyDialog.tsx      ← FEATURE #2: Purchase flow
│   ├── dashboard/
│   │   ├── PositionsTable.tsx         ← Active positions
│   │   ├── PnLSummary.tsx             ← Summary cards
│   │   └── ClaimButton.tsx            ← Claim rewards
│   ├── layout/
│   │   ├── Header.tsx                 ← FEATURE #4: Wallet connection
│   │   └── Footer.tsx
│   └── web3/
│       └── NetworkGuard.tsx           ← Ensure Arbitrum network
├── lib/
│   ├── contracts/
│   │   ├── addresses.ts               ← Contract addresses
│   │   └── abis/
│   │       ├── StrategyManager.json
│   │       ├── HedgeExecutor.json
│   │       └── ERC20.json
│   └── utils.ts                       ← cn() and helpers
└── hooks/
    ├── useStrategies.ts               ← Fetch all strategies
    ├── useUserPositions.ts            ← Fetch user positions
    ├── useBuyStrategy.ts              ← Buy strategy flow
    └── useClaimStrategy.ts            ← Claim rewards
```

---

## Implementation Roadmap

### Phase 1: Project Setup (30 mins)
**Goal**: Get a clean Next.js app with shadcn running

**Tasks**:
```bash
# 1. Create new package
mkdir -p packages/app
cd packages/app

# 2. Initialize Next.js
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# 3. Initialize shadcn
npx shadcn@latest init

# 4. Install dependencies
yarn add @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query

# 5. Add shadcn components
npx shadcn@latest add button card dialog table input label badge alert toast

# 6. Update root package.json workspace
# Add "packages/app" to workspaces array
```

**Verify**: Run `yarn dev` and see Next.js welcome page

---

### Phase 2: Layout & Wallet Setup (1 hour)
**Goal**: Basic app shell with wallet connection

**Tasks**:
1. Create `app/providers.tsx` with RainbowKit setup
2. Create `components/layout/Header.tsx` with ConnectButton
3. Update `app/layout.tsx` to use providers and header
4. Test wallet connection works

**Success Criteria**:
- ✅ Can connect wallet with RainbowKit
- ✅ See connected address in header
- ✅ Can disconnect wallet

---

### Phase 3: Feature #1 - Strategy Marketplace (2-3 hours)
**Goal**: Display all strategies in a table

**Tasks**:
1. Create `lib/contracts/addresses.ts` with contract addresses
2. Copy ABIs from `packages/hardhat/deployments/`
3. Create `hooks/useStrategies.ts` to fetch strategies
4. Create `components/strategies/StrategyTable.tsx`
5. Create `app/strategies/page.tsx`
6. Style the table with shadcn Table component

**Success Criteria**:
- ✅ Table shows all active strategies
- ✅ Displays name, expected return, maturity, fee
- ✅ Can sort by different columns
- ✅ Shows "Buy" button for each strategy

---

### Phase 4: Feature #2 - Purchase Flow (2-3 hours)
**Goal**: Complete buy strategy workflow

**Tasks**:
1. Create `components/strategies/BuyStrategyDialog.tsx`
2. Create `hooks/useBuyStrategy.ts`
3. Implement USDC approval step
4. Implement buyStrategy transaction
5. Add loading states and error handling
6. Add success toast notification

**Success Criteria**:
- ✅ Dialog opens when clicking "Buy"
- ✅ Shows fee breakdown
- ✅ Approves USDC successfully
- ✅ Calls buyStrategy successfully
- ✅ Shows loading spinners
- ✅ Handles errors gracefully

---

### Phase 5: Feature #3 - User Dashboard (2-3 hours)
**Goal**: Show user positions and P&L

**Tasks**:
1. Create `hooks/useUserPositions.ts`
2. Create `components/dashboard/PnLSummary.tsx`
3. Create `components/dashboard/PositionsTable.tsx`
4. Create `components/dashboard/ClaimButton.tsx`
5. Create `app/dashboard/page.tsx`
6. Implement claim flow

**Success Criteria**:
- ✅ Shows all user positions
- ✅ Displays P&L summary
- ✅ Shows maturity status
- ✅ Can claim matured strategies
- ✅ Updates after claiming

---

### Phase 6: Polish & Testing (1-2 hours)
**Goal**: Make it production-ready

**Tasks**:
1. Add loading skeletons
2. Add empty states ("No strategies", "No positions")
3. Improve error messages
4. Add responsive design (mobile-friendly)
5. Test all flows end-to-end
6. Add documentation

**Success Criteria**:
- ✅ Works on mobile
- ✅ Good UX for loading states
- ✅ Clear error messages
- ✅ No console errors
- ✅ All features working

---

## Smart Contract Integration Reference

### Contract Addresses (Arbitrum)
```typescript
// lib/contracts/addresses.ts
export const ADDRESSES = {
  STRATEGY_MANAGER: '0x...', // From deployment
  HEDGE_EXECUTOR: '0x...',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
} as const;
```

### Key Contract Functions

#### Read Functions
```typescript
// Get next strategy ID
const nextId = await strategyManager.nextStrategyId();

// Get strategy details
const strategy = await strategyManager.strategies(strategyId);

// Get user positions
const positions = await strategyManager.userPositions(userAddress);
```

#### Write Functions
```typescript
// Approve USDC
await usdc.approve(STRATEGY_MANAGER_ADDRESS, amount);

// Buy strategy
await strategyManager.buyStrategy(strategyId, grossAmount);

// Claim strategy
await strategyManager.claimStrategy(strategyId);
```

### Events to Monitor
```typescript
// Listen for purchases
strategyManager.on('StrategyPurchased', (strategyId, user, gross, net) => {
  // Refresh data
});

// Listen for settlements
strategyManager.on('StrategySettled', (strategyId, payoutPerUSDC) => {
  // Update claimable strategies
});

// Listen for claims
strategyManager.on('StrategyClaimed', (strategyId, user, amount) => {
  // Update user positions
});
```

---

## Design & UX Considerations

### Color Scheme Suggestions
- **Primary**: Blue/Indigo (trust, finance)
- **Success**: Green (profits, positive returns)
- **Warning**: Yellow (pending, maturity soon)
- **Danger**: Red (losses, errors)
- **Neutral**: Gray/Slate (background)

### Typography
- **Headings**: Bold, clear hierarchy
- **Numbers**: Monospace font for amounts (easier to read)
- **Returns**: Color-coded (green for positive, red for negative)

### UI Patterns
- **Loading States**: Skeleton screens (not spinners)
- **Empty States**: Helpful messages with CTAs
- **Error States**: Clear, actionable error messages
- **Success States**: Toast notifications

### Accessibility
- Proper ARIA labels
- Keyboard navigation
- Focus states
- Color contrast (WCAG AA)

---

## Testing Checklist

### Feature #1: Marketplace
- [ ] Strategies load correctly
- [ ] Table is sortable
- [ ] Shows correct data (name, return, maturity, fee)
- [ ] Buy button appears for active strategies
- [ ] Inactive strategies are disabled

### Feature #2: Purchase Flow
- [ ] Dialog opens on button click
- [ ] Amount input validation
- [ ] Fee calculation is correct
- [ ] USDC approval works
- [ ] Buy transaction succeeds
- [ ] Error handling for insufficient balance
- [ ] Error handling for inactive strategy
- [ ] Success toast appears
- [ ] Redirects to dashboard after purchase

### Feature #3: Dashboard
- [ ] Positions load for connected wallet
- [ ] P&L summary calculates correctly
- [ ] Shows maturity status
- [ ] Claim button only shows for claimable strategies
- [ ] Claim transaction succeeds
- [ ] Position updates after claim
- [ ] Shows empty state when no positions

### Feature #4: Wallet
- [ ] Connect wallet works
- [ ] Disconnect wallet works
- [ ] Shows connected address
- [ ] Network guard shows on wrong network
- [ ] Can switch to Arbitrum

---

## Monorepo Integration

### Update Root package.json
```json
{
  "workspaces": [
    "packages/hardhat",
    "packages/nextjs",
    "packages/bridge",
    "packages/app"  // Add this
  ]
}
```

### Run Commands
```bash
# Run app in development
yarn workspace @polyhedge/app dev

# Or from root with all packages
yarn dev

# Build for production
yarn workspace @polyhedge/app build

# Start production server
yarn workspace @polyhedge/app start
```

### Share Code Between Packages
If needed, you can import from other packages:
```typescript
// Import ABIs from hardhat package
import StrategyManagerABI from '@polyhedge/hardhat/deployments/arbitrum/StrategyManager.json';
```

---

## FAQ: Package Folder Structure

### Question: "Will everything for frontend always live in the package folder for a JS project?"

**Short Answer**: In a **monorepo**, yes! Each package is self-contained.

**Explanation**:

#### Monorepo Structure (What You Have)
```
polyhedge/                          ← Root (not a package itself)
├── package.json                    ← Workspace configuration
├── packages/
│   ├── app/                        ← Frontend package
│   │   ├── package.json            ← App dependencies
│   │   ├── app/                    ← Next.js pages
│   │   └── components/             ← React components
│   ├── hardhat/                    ← Smart contracts package
│   │   ├── package.json            ← Hardhat dependencies
│   │   └── contracts/              ← Solidity files
│   └── bridge/                     ← Backend package
│       ├── package.json            ← Bridge dependencies
│       └── src/                    ← TypeScript backend
└── yarn.lock
```

Each `packages/*` folder is an **independent package** with its own:
- `package.json` (dependencies)
- `node_modules` (shared via workspaces)
- Source code
- Build output

#### Single-Repo Structure (Traditional)
```
my-app/                             ← The package (just one)
├── package.json
├── src/                            ← All frontend code
├── components/
└── pages/
```

Everything lives in the root because there's only one package.

#### Why Monorepos Are Powerful
1. **Multiple packages in one repo** - Frontend + Backend + Contracts
2. **Shared dependencies** - Yarn/npm hoists common packages
3. **Easy imports** - Can import between packages
4. **Single version control** - All code in one Git repo

**In your case**: Yes, all frontend code will live in `packages/app/`. It's isolated from the other packages but can import their code if needed.

---

## Next Steps

### Immediate Actions

1. **Review this plan** - Any changes needed?
2. **Choose package name** - `packages/app` or `packages/frontend`?
3. **Run Phase 1** - Set up the new package
4. **Get first page working** - Strategies marketplace

### Questions to Answer Before Starting

1. **Do you have deployed contracts?**
   - Need contract addresses for Arbitrum
   - Need to copy ABIs

2. **Design preferences?**
   - Color scheme?
   - Any branding/logo?

3. **MVP scope?**
   - All 4 features or start with just marketplace + buy flow?

**Ready to start Phase 1?** Let me know and I'll help you scaffold the new package!
