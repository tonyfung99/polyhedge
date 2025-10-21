# Bridge Service Implementation Guide

## Overview

The bridge service coordinates cross-chain execution of strategies:
1. **Arbitrum**: Listen to StrategyPurchased events
2. **Stargate**: Bridge USDC from Arbitrum to Polygon
3. **Polygon**: Execute Polymarket orders with bridged USDC
4. **Settlement**: Coordinate final settlement across both chains

## Current Status

✅ **Already Implemented:**
- HyperSync event monitoring on Arbitrum
- StrategyPurchased event detection
- Basic executor structure
- Polymarket client scaffolding
- Environment configuration

⚠️ **Pending Implementation:**
- Stargate USDC bridge integration
- PolygonReceiver contract interaction
- Polymarket settlement tracking
- Dual-chain PnL coordination

## Implementation Tasks

### 1. Add Stargate Bridge Integration

**File:** `packages/bridge/src/services/bridge.ts` (NEW)

```typescript
import { createPublicClient, createWalletClient } from 'viem';
import { arbitrum, polygon } from 'viem/chains';

export class StargateUsdcBridge {
  private readonly arbitrumClient;
  private readonly polygonClient;
  private readonly relayerPrivateKey;

  constructor(relayerPrivateKey: string) {
    this.relayerPrivateKey = relayerPrivateKey;
    this.arbitrumClient = createPublicClient({ chain: arbitrum });
    this.polygonClient = createPublicClient({ chain: polygon });
  }

  /**
   * Initiate USDC transfer from Arbitrum to Polygon via Stargate
   * @param amount - Amount of USDC (with 6 decimals)
   * @param recipient - PolygonReceiver contract address
   * @returns - Bridge transaction hash
   */
  async bridgeUsdcToPoly(amount: bigint, recipient: string): Promise<string> {
    // TODO: Implement Stargate starSend() call
    // 1. Approve USDC to Stargate Router
    // 2. Call starSend() with:
    //    - dstChainId: Polygon chain ID
    //    - srcPoolId: USDC pool ID on Arbitrum
    //    - dstPoolId: USDC pool ID on Polygon
    //    - amount
    //    - minAmountLD (slippage protection)
    //    - lzTxObj (gas limits)
    //    - to: recipient (PolygonReceiver)
    // 3. Return tx hash
  }

  /**
   * Monitor Stargate bridge completion
   * @param txHash - Bridge transaction hash
   * @returns - True when bridge is confirmed on destination
   */
  async waitForBridgeCompletion(txHash: string): Promise<boolean> {
    // TODO: Monitor for srcChainTxConfirmed event on Arbitrum
    // Then listen for credit received on Polygon
  }

  /**
   * Bridge profits back from Polygon to Arbitrum
   * @param amount - Final USDC balance after settlement
   * @param recipient - User address
   */
  async bridgeUsdcToArbitrum(amount: bigint, recipient: string): Promise<string> {
    // TODO: Initiate return bridge from Polygon → Arbitrum
  }
}
```

**Reference:** [Stargate Documentation](https://stargate.finance/developers)

### 2. Update Executor for Dual-Chain Coordination

**File:** `packages/bridge/src/services/executor.ts` (UPDATE)

```typescript
export class StrategyPurchaseExecutor {
  private readonly bridge: StargateUsdcBridge;
  private readonly polygonReceiver: PolygonReceiverClient;

  async handleStrategyPurchase(event: StrategyPurchasedEvent) {
    try {
      // 1. Bridge USDC to Polygon
      const bridgeTxHash = await this.bridge.bridgeUsdcToPoly(
        event.netAmount,
        this.polygonReceiver.address
      );
      
      log.info('Initiated USDC bridge', { 
        strategyId: event.strategyId, 
        amount: event.netAmount,
        txHash: bridgeTxHash 
      });

      // 2. Wait for bridge completion
      await this.bridge.waitForBridgeCompletion(bridgeTxHash);
      
      log.info('USDC bridge completed', { 
        strategyId: event.strategyId 
      });

      // 3. Signal PolygonReceiver that funds arrived
      await this.polygonReceiver.recordUsdcReceived(
        event.strategyId,
        event.user,
        event.netAmount
      );

      // 4. Execute Polymarket orders on Polygon
      const strategy = this.config.strategies.get(event.strategyId);
      const intents = this.buildPolymarketOrderIntents(strategy, event.netAmount);

      for (const intent of intents) {
        await this.polymarket.executeOrder(intent);
      }

      // 5. Record orders on PolygonReceiver for tracking
      for (const order of strategy.polymarketOrders) {
        await this.polygonReceiver.recordPolymarketOrder(
          event.strategyId,
          order.marketId,
          order.isYes ? 'BUY' : 'SELL',
          event.netAmount, // simplified - in reality calculate per order
          0 // entry price from Polymarket API response
        );
      }

      log.info('Strategy purchase fully executed', {
        strategyId: event.strategyId,
        user: event.user
      });

    } catch (error) {
      log.error('Strategy execution failed', {
        error: (error as Error).message,
        strategyId: event.strategyId
      });
      throw error;
    }
  }
}
```

### 3. Create PolygonReceiver Client

**File:** `packages/bridge/src/services/polygonReceiverClient.ts` (NEW)

```typescript
import { createPublicClient, createWalletClient } from 'viem';
import { polygon } from 'viem/chains';
import { PolygonReceiver_ABI } from '../contracts/PolygonReceiver.js';

export class PolygonReceiverClient {
  private readonly publicClient;
  private readonly walletClient;
  public readonly address: string;

  constructor(relayerPrivateKey: string, contractAddress: string) {
    this.address = contractAddress;
    this.publicClient = createPublicClient({ chain: polygon });
    this.walletClient = createWalletClient({ 
      chain: polygon,
      account: privateKeyToAccount(relayerPrivateKey)
    });
  }

  /**
   * Record USDC receipt on PolygonReceiver
   */
  async recordUsdcReceived(
    strategyId: bigint,
    user: string,
    amount: bigint
  ): Promise<string> {
    return await this.walletClient.writeContract({
      address: this.address,
      abi: PolygonReceiver_ABI,
      functionName: 'receiveUSDC',
      args: [strategyId, user, amount],
    });
  }

  /**
   * Record Polymarket order placement
   */
  async recordPolymarketOrder(
    strategyId: bigint,
    marketId: bigint,
    side: 'BUY' | 'SELL',
    shares: bigint,
    entryPrice: bigint
  ): Promise<string> {
    return await this.walletClient.writeContract({
      address: this.address,
      abi: PolygonReceiver_ABI,
      functionName: 'recordPolymarketOrder',
      args: [strategyId, marketId, side, shares, entryPrice],
    });
  }

  /**
   * Close a Polymarket position and record exit
   */
  async closePolymarketPosition(
    strategyId: bigint,
    positionIndex: number,
    finalValue: bigint
  ): Promise<string> {
    return await this.walletClient.writeContract({
      address: this.address,
      abi: PolygonReceiver_ABI,
      functionName: 'closePolymarketPosition',
      args: [strategyId, positionIndex, finalValue],
    });
  }

  /**
   * Settle strategy after all positions closed
   */
  async settleStrategy(
    strategyId: bigint,
    totalBalance: bigint
  ): Promise<string> {
    return await this.walletClient.writeContract({
      address: this.address,
      abi: PolygonReceiver_ABI,
      functionName: 'settleStrategy',
      args: [strategyId, totalBalance],
    });
  }

  /**
   * Withdraw user's share of settled funds
   */
  async withdrawFunds(
    strategyId: bigint,
    recipient: string,
    amount: bigint
  ): Promise<string> {
    return await this.walletClient.writeContract({
      address: this.address,
      abi: PolygonReceiver_ABI,
      functionName: 'withdrawFunds',
      args: [strategyId, recipient, amount],
    });
  }
}
```

### 4. Setup .env Configuration

**File:** `packages/bridge/.env.example`

Add these variables:

```env
# Arbitrum Chain
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBITRUM_CHAIN_ID=42161

# Polygon Chain  
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CHAIN_ID=137

# Contracts
STRATEGY_MANAGER_ADDRESS=<deploy address on Arbitrum>
POLYGON_RECEIVER_ADDRESS=<deploy address on Polygon>

# Bridge Relayer Private Key (NEVER commit this!)
RELAYER_PRIVATE_KEY=<0x...>

# Stargate Configuration
STARGATE_ROUTER_ADDRESS=0x45A01E4e04F14f7A2a3F733DEC1ea7fF3c7dc0C  # Arbitrum
STARGATE_USDC_POOL_ID_ARBITRUM=1
STARGATE_USDC_POOL_ID_POLYGON=1

# Polymarket
POLYMARKET_API_URL=https://clob.polymarket.com
POLYMARKET_PRIVATE_KEY=<0x...>

# HyperSync
HYPERSYNC_URL=https://arbitrum.hypersync.xyz

# Logging
LOG_LEVEL=info
```

### 5. Update bridge/src/config/env.ts

```typescript
const config = z.object({
  // ... existing config ...
  
  // Stargate Bridge
  stargate_router_arbitrum: z.string(),
  stargate_usdc_pool_id_arbitrum: z.string().transform(Number),
  stargate_usdc_pool_id_polygon: z.string().transform(Number),

  // Polygon
  polygon_rpc_url: z.string().url(),
  polygon_receiver_address: z.string(),
  polygon_chain_id: z.string().transform(Number),

  // Relayer
  relayer_private_key: z.string().startsWith('0x'),
});
```

## Testing Checklist

- [ ] Test Stargate bridge on testnet (Arbitrum Sepolia → Polygon Mumbai)
- [ ] Verify USDC arrives on PolygonReceiver
- [ ] Test Polymarket order placement against bridged USDC
- [ ] Test settlement PnL calculation
- [ ] Test profit bridge-back from Polygon → Arbitrum
- [ ] End-to-end flow test on testnet
- [ ] Mainnet deployment with limited TVL

## Key Files to Update

1. ✅ **DONE**: `src/index.ts` - HyperSync monitoring (by team)
2. ✅ **DONE**: `src/services/executor.ts` - Basic structure (by team)
3. ⚠️ **TODO**: Add `src/services/bridge.ts` - Stargate integration
4. ⚠️ **TODO**: Add `src/services/polygonReceiverClient.ts` - Contract interaction
5. ⚠️ **TODO**: Update `src/config/env.ts` - New env variables
6. ⚠️ **TODO**: Update `package.json` - Add viem, ethers if needed

## References

- [Stargate Finance Docs](https://stargate.finance/developers)
- [Viem Documentation](https://viem.sh)
- [Arbitrum RPC Endpoints](https://docs.arbitrum.io/for-devs/public-chains)
- [Polygon RPC Endpoints](https://polygon.technology/developers)

## Support

- StrategyManager ABI: `packages/hardhat/deployments/arbitrum/StrategyManager.json`
- PolygonReceiver ABI: `packages/hardhat/deployments/polygon/PolygonReceiver.json`
- HedgeExecutor ABI: `packages/hardhat/deployments/arbitrum/HedgeExecutor.json`
