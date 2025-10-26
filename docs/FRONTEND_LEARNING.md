# Frontend Development Plan

Planning document for building the Polyhedge frontend as part of the hackathon learning journey.

## Current State of the Repo

### Existing Frontend Packages

Your monorepo already has **2 frontend packages**:

#### 1. `packages/nextjs` (Scaffold-ETH 2 Default)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + **DaisyUI**
- **Web3**: RainbowKit + wagmi + viem
- **Status**: Basic Scaffold-ETH 2 template
- **Purpose**: Default web3 starter - can be replaced or repurposed

#### 2. `packages/vincent-login` (Teammate's Work)
- **Framework**: React + Vite (not Next.js)
- **Purpose**: Polymarket authentication via Lit Protocol Vincent SDK
- **Status**: Testing authentication flow
- **Note**: As you mentioned, we can ignore this for now

### Recommendation

**Option A (Recommended)**: Replace/rebuild `packages/nextjs` with your own frontend using shadcn/ui
**Option B**: Create a new package `packages/app` or `packages/frontend` with shadcn/ui

I recommend **Option A** - repurposing the existing Next.js package since it already has the web3 setup configured.

---

## What is shadcn/ui?

### The Short Answer

**shadcn/ui is NOT a component library** - it's a **collection of copy-paste components** built with Radix UI and Tailwind CSS.

### Key Differences from Traditional Libraries

| Traditional Library (like DaisyUI) | shadcn/ui |
|-------------------------------------|-----------|
| Install via npm/yarn | **Copy components directly into your codebase** |
| Import from package | **You own the code** - edit freely |
| Fixed styling | Fully customizable with Tailwind |
| Bundle bloat | Only what you use |
| Version locked | No version conflicts |

### Why shadcn/ui is Awesome for Learning

1. **You own the code** - Every component lives in your `components/ui` folder
2. **Learn by reading** - See exactly how components are built
3. **Customize easily** - Modify any component without fighting abstractions
4. **Modern stack** - Uses latest React patterns (Server Components, hooks)
5. **Accessible by default** - Built on Radix UI primitives

### How It Works

```bash
# Install shadcn CLI
npx shadcn@latest init

# Add components you need
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

This copies the component code into your project:
```
components/
  ui/
    button.tsx       ← You own this file!
    card.tsx         ← Edit it however you want
    dialog.tsx       ← Full control
```

### The Tech Stack Behind shadcn/ui

- **Radix UI** - Unstyled, accessible UI primitives (dialogs, dropdowns, etc.)
- **Tailwind CSS** - Utility-first CSS framework
- **class-variance-authority (cva)** - Managing component variants
- **clsx** / **tailwind-merge** - Merging Tailwind classes

---

## shadcn/ui Component Libraries & Ecosystem

### Official shadcn/ui Components

The official collection includes 50+ components:
- **Layout**: Card, Separator, Tabs, Sheet (slide-over)
- **Forms**: Button, Input, Select, Checkbox, Radio, Switch
- **Data Display**: Table, Badge, Avatar, Progress
- **Feedback**: Toast, Alert, Dialog, Alert Dialog
- **Navigation**: Dropdown Menu, Navigation Menu, Command (⌘K menu)
- **Advanced**: Calendar, Date Picker, Data Table, Combobox

Browse all: https://ui.shadcn.com/docs/components

### Community Component Libraries

Several developers have built **additional component collections** on top of shadcn/ui:

#### 1. **shadcn/ui Blocks** (Official)
- https://ui.shadcn.com/blocks
- Pre-built sections: dashboards, authentication, charts
- Copy entire sections, not just components

#### 2. **Magic UI**
- https://magicui.design/
- Animated components (count-up, marquee, sparkles)
- Focus on motion and micro-interactions

#### 3. **Aceternity UI**
- https://ui.aceternity.com/
- Beautiful animated components
- Great for landing pages

#### 4. **shadcn/ui Charts**
- Built on Recharts
- Data visualization components

#### 5. **shadcn Table** (TanStack Table)
- Advanced data tables
- Sorting, filtering, pagination

### All Compatible Since They're Just Code

Since shadcn/ui components are just TypeScript files you copy, you can:
- Mix and match from different libraries
- Combine shadcn + Magic UI + your custom components
- Modify any component to fit your needs

---

## Proposed Frontend Architecture

### Tech Stack for Polyhedge

```typescript
{
  "Framework": "Next.js 15 (App Router)",
  "Styling": "Tailwind CSS + shadcn/ui",
  "Web3": "RainbowKit + wagmi + viem",
  "State Management": "Zustand (already in repo) or React Query",
  "Components": "shadcn/ui + custom components",
  "Forms": "React Hook Form + Zod validation",
  "Charts": "Recharts (via shadcn charts)",
  "Animations": "Framer Motion (optional)"
}
```

### Monorepo Structure

```
polyhedge/
├── packages/
│   ├── nextjs/                    ← Your main frontend (rebuild this)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           ← Landing page
│   │   │   ├── strategies/
│   │   │   │   ├── page.tsx       ← Browse strategies
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx   ← Strategy details
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       ← User positions
│   │   │   └── admin/
│   │   │       └── page.tsx       ← Create strategies
│   │   ├── components/
│   │   │   ├── ui/                ← shadcn components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...
│   │   │   ├── strategy/          ← Custom components
│   │   │   │   ├── StrategyCard.tsx
│   │   │   │   ├── BuyStrategyDialog.tsx
│   │   │   │   └── PositionTable.tsx
│   │   │   ├── web3/
│   │   │   │   ├── ConnectButton.tsx
│   │   │   │   └── NetworkSwitch.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       └── Footer.tsx
│   │   ├── lib/
│   │   │   ├── contracts/         ← Contract interactions
│   │   │   │   ├── strategyManager.ts
│   │   │   │   ├── hedgeExecutor.ts
│   │   │   │   └── abis/
│   │   │   └── utils.ts
│   │   └── hooks/
│   │       ├── useStrategyManager.ts
│   │       ├── useUserPositions.ts
│   │       └── useStrategyDetails.ts
│   ├── hardhat/                   ← Smart contracts
│   ├── bridge/                    ← Backend service
│   └── vincent-login/             ← Auth (can integrate later)
└── docs/
    ├── SMART_CONTRACT_API.md      ← Your contract docs
    └── FRONTEND_PLANNING.md       ← This file
```

---

## Step-by-Step Implementation Plan

### Phase 1: Setup shadcn/ui (1-2 hours)

1. **Clean up existing Next.js app**
   ```bash
   cd packages/nextjs
   ```

2. **Initialize shadcn/ui**
   ```bash
   npx shadcn@latest init
   ```

   Answer the prompts:
   - ✅ TypeScript: Yes
   - ✅ Style: Default
   - ✅ Base color: Slate (or your preference)
   - ✅ CSS variables: Yes
   - ✅ Tailwind config: tailwind.config.ts
   - ✅ Components: @/components
   - ✅ Utils: @/lib/utils
   - ✅ React Server Components: Yes

3. **Add essential components**
   ```bash
   npx shadcn@latest add button card dialog input label select tabs badge alert toast table
   ```

4. **Test it works**
   Update `app/page.tsx` with a simple shadcn button to verify

### Phase 2: Core Pages (3-4 hours)

Build these pages in order:

1. **Landing Page** (`app/page.tsx`)
   - Hero section
   - How it works
   - Featured strategies
   - CTA to browse strategies

2. **Strategies Page** (`app/strategies/page.tsx`)
   - List all active strategies
   - Strategy cards with key info
   - Filter/search functionality

3. **Strategy Details** (`app/strategies/[id]/page.tsx`)
   - Full strategy details
   - Buy dialog
   - Polymarket & GMX order breakdown
   - Expected returns chart

4. **User Dashboard** (`app/dashboard/page.tsx`)
   - User's active positions
   - Claimable strategies
   - PnL overview

5. **Admin Panel** (`app/admin/page.tsx`)
   - Create new strategies
   - Settle matured strategies
   - View all positions

### Phase 3: Web3 Integration (2-3 hours)

1. **Setup contract hooks**
   ```typescript
   // hooks/useStrategyManager.ts
   export function useStrategyManager() {
     const { data: strategies } = useReadContract({
       address: STRATEGY_MANAGER_ADDRESS,
       abi: StrategyManagerABI,
       functionName: 'strategies',
       // ...
     });

     const { writeContract } = useWriteContract();

     const buyStrategy = async (strategyId: bigint, amount: bigint) => {
       // Approve USDC first
       // Then call buyStrategy
     };

     return { strategies, buyStrategy };
   }
   ```

2. **Contract interaction components**
   - BuyStrategyDialog
   - ClaimRewardsButton
   - ApproveUSDCButton

3. **Real-time updates**
   - Listen to contract events
   - Update UI when transactions confirm

### Phase 4: Polish & UX (2-3 hours)

1. **Add animations** (optional)
   - Page transitions
   - Loading states
   - Micro-interactions

2. **Error handling**
   - Transaction failures
   - Network errors
   - Helpful error messages with toast notifications

3. **Responsive design**
   - Mobile-first approach
   - Test on different screen sizes

4. **Loading states**
   - Skeleton screens
   - Spinners for transactions

---

## Key Components to Build

### 1. StrategyCard Component

```typescript
// components/strategy/StrategyCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StrategyCardProps {
  strategy: {
    id: number;
    name: string;
    expectedProfitBps: number;
    maturityTs: number;
    feeBps: number;
    active: boolean;
  };
  onBuy: (strategyId: number) => void;
}

export function StrategyCard({ strategy, onBuy }: StrategyCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>{strategy.name}</CardTitle>
          <Badge variant={strategy.active ? "default" : "secondary"}>
            {strategy.active ? "Active" : "Closed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Expected Return</span>
            <span className="font-semibold text-green-600">
              +{(strategy.expectedProfitBps / 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Maturity</span>
            <span className="text-sm">
              {new Date(strategy.maturityTs * 1000).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Fee</span>
            <span className="text-sm">{(strategy.feeBps / 100).toFixed(2)}%</span>
          </div>
        </div>
        <Button
          className="w-full mt-4"
          onClick={() => onBuy(strategy.id)}
          disabled={!strategy.active}
        >
          Buy Strategy
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 2. BuyStrategyDialog Component

```typescript
// components/strategy/BuyStrategyDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface BuyStrategyDialogProps {
  strategy: Strategy;
  onConfirm: (amount: string) => Promise<void>;
  children: React.ReactNode;
}

export function BuyStrategyDialog({ strategy, onConfirm, children }: BuyStrategyDialogProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      await onConfirm(amount);
    } finally {
      setIsLoading(false);
    }
  };

  const feeAmount = parseFloat(amount || "0") * (strategy.feeBps / 10000);
  const netAmount = parseFloat(amount || "0") - feeAmount;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy {strategy.name}</DialogTitle>
          <DialogDescription>
            Enter the amount of USDC you want to invest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {amount && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span>Gross Amount</span>
                <span>{parseFloat(amount).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Fee ({(strategy.feeBps / 100).toFixed(2)}%)</span>
                <span>-{feeAmount.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Net Investment</span>
                <span>{netAmount.toFixed(2)} USDC</span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleBuy}
            disabled={!amount || isLoading}
          >
            {isLoading ? "Processing..." : "Confirm Purchase"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Web3 Integration Hook

```typescript
// hooks/useStrategyManager.ts
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { STRATEGY_MANAGER_ADDRESS, USDC_ADDRESS } from '@/lib/contracts/addresses';
import { strategyManagerABI } from '@/lib/contracts/abis/StrategyManager';
import { erc20ABI } from '@/lib/contracts/abis/ERC20';

export function useStrategyManager() {
  // Read strategies
  const { data: nextStrategyId } = useReadContract({
    address: STRATEGY_MANAGER_ADDRESS,
    abi: strategyManagerABI,
    functionName: 'nextStrategyId',
  });

  // Write contract hook
  const { writeContractAsync } = useWriteContract();

  const buyStrategy = async (strategyId: number, amount: string) => {
    const amountWei = parseUnits(amount, 6); // USDC has 6 decimals

    // Step 1: Approve USDC
    const approveTx = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [STRATEGY_MANAGER_ADDRESS, amountWei],
    });

    // Wait for approval
    await waitForTransactionReceipt({ hash: approveTx });

    // Step 2: Buy strategy
    const buyTx = await writeContractAsync({
      address: STRATEGY_MANAGER_ADDRESS,
      abi: strategyManagerABI,
      functionName: 'buyStrategy',
      args: [BigInt(strategyId), amountWei],
    });

    return buyTx;
  };

  return {
    nextStrategyId,
    buyStrategy,
  };
}
```

---

## Learning Resources

### shadcn/ui
- **Official Docs**: https://ui.shadcn.com/
- **All Components**: https://ui.shadcn.com/docs/components
- **Examples**: https://ui.shadcn.com/examples

### Next.js 15 (App Router)
- **Docs**: https://nextjs.org/docs
- **App Router Guide**: https://nextjs.org/docs/app

### Tailwind CSS
- **Docs**: https://tailwindcss.com/docs
- **Cheat Sheet**: https://nerdcave.com/tailwind-cheat-sheet

### wagmi (Web3 React Hooks)
- **Docs**: https://wagmi.sh/
- **Hooks**: https://wagmi.sh/react/hooks/useReadContract

### Design Inspiration
- **shadcn/ui Examples**: https://ui.shadcn.com/examples/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Linear App**: https://linear.app/ (great UI/UX)

---

## Next Steps

### Immediate Actions

1. **Decide on approach**
   - Option A: Rebuild `packages/nextjs` with shadcn/ui ✅ (Recommended)
   - Option B: Create new `packages/app`

2. **Setup shadcn/ui**
   ```bash
   cd packages/nextjs
   npx shadcn@latest init
   npx shadcn@latest add button card dialog input select tabs
   ```

3. **Create a simple test page**
   - Update `app/page.tsx` with shadcn components
   - Test the setup works

4. **Design the pages**
   - Sketch out the user flows
   - List all the pages you need
   - Identify the key components

5. **Start building**
   - Begin with the Strategies page (most important)
   - Then Strategy Details page
   - Then Dashboard

### Questions to Answer

Before diving in, decide on:

1. **Color scheme** - What colors represent Polyhedge?
2. **Branding** - Do you have a logo/name?
3. **Target users** - Crypto natives or mainstream users?
4. **Key features** - What's the MVP for the hackathon?

---

## Summary

**Yes, you can absolutely build the frontend directly in this monorepo!**

### What You Have Now
- ✅ Monorepo setup with yarn workspaces
- ✅ Next.js package ready to customize (`packages/nextjs`)
- ✅ Web3 setup (RainbowKit, wagmi) already configured
- ✅ Tailwind CSS already set up
- ✅ Smart contract ABIs and addresses

### What You Need to Add
- 🎨 shadcn/ui components (5 min setup)
- 📄 Your custom pages and components
- 🔗 Contract interaction hooks
- ✨ Polish and UX improvements

### Why shadcn/ui is Perfect for Learning
- You'll understand how components work (you own the code)
- Easier to customize than fighting a library's opinions
- Modern React patterns (Server Components, hooks)
- Industry-standard stack (many companies use this exact setup)
- Great documentation and community

### Your teammate's `vincent-login` package
You can **integrate it later** when you need Polymarket authentication. For now, focus on the core strategy buying/selling flow with regular wallet connection (RainbowKit).

**Ready to start?** Let me know and I can help you set up shadcn/ui and build your first page!
