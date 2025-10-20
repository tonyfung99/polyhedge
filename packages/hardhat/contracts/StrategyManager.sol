// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StrategyManager
 * @notice Minimal contract to create, sell, and settle hedging strategies.
 *         Designed to unblock frontend and bot integrations. Execution of
 *         off-chain orders (Polymarket/DEX) is coordinated by an external
 *         bridge/backend listening to emitted events.
 */
contract StrategyManager is Ownable, ReentrancyGuard {
    struct PolymarketOrder {
        string marketId; // external id reference
        bool isYes; // YES/NO side
        uint256 amount; // quote amount denominated in USDC (6 decimals)
        uint256 maxPriceBps; // max price in basis points of 1e4 (e.g. 500 = 5.00%)
    }

    struct HedgeOrder {
        string dex; // e.g. GMX / Hyperliquid / Gains
        string asset; // e.g. BTC, ETH
        bool isLong; // long/short
        uint256 amount; // quote amount denominated in USDC (6 decimals)
        uint256 maxSlippageBps; // basis points
    }

    struct StrategyDetails {
        PolymarketOrder[] polymarketOrders;
        HedgeOrder[] hedgeOrders;
        uint256 expectedProfitBps; // expected net profit in bps
    }

    struct Strategy {
        uint256 id;
        string name;
        uint256 feeBps; // platform fee in bps
        uint256 maturityTs; // unix timestamp
        bool active;
        StrategyDetails details;
        // settlement
        bool settled;
        uint256 payoutPerUSDC; // 6 decimals, e.g. 1.08e6 means 1.08 USDC per 1 USDC net
    }

    struct UserPosition {
        uint256 strategyId;
        uint256 amount; // net principal in USDC (after fee)
        uint256 purchaseTs;
        bool claimed;
    }

    IERC20 public immutable usdc;
    uint256 public nextStrategyId = 1;

    // strategyId => Strategy
    mapping(uint256 => Strategy) public strategies;
    // user => positions
    mapping(address => UserPosition[]) public userPositions;

    // Events used by the bridge/backend to coordinate off-chain execution
    event StrategyCreated(uint256 indexed strategyId, string name, uint256 maturityTs);
    event StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 grossAmount, uint256 netAmount);
    event OrdersExecuted(uint256 indexed strategyId, address indexed user, bool success);
    event StrategyClaimed(uint256 indexed strategyId, address indexed user, uint256 payoutAmount);
    event StrategySettled(uint256 indexed strategyId, uint256 payoutPerUSDC);
    // New: signal to bridge/HedgeExecutor on Arbitrum
    event HedgeOrdersTriggered(uint256 indexed strategyId, address indexed user, HedgeOrder[] hedgeOrders);

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "USDC address required");
        usdc = IERC20(_usdc);
    }

    // ------------------
    // Admin/Bot functions
    // ------------------

    function createStrategy(
        string calldata name,
        uint256 feeBps,
        uint256 maturityTs,
        PolymarketOrder[] calldata pmOrders,
        HedgeOrder[] calldata hedgeOrders,
        uint256 expectedProfitBps
    ) external onlyOwner returns (uint256 strategyId) {
        require(maturityTs > block.timestamp, "maturity must be future");
        require(feeBps <= 2000, "fee too high"); // <=20%

        strategyId = nextStrategyId++;

        // Copy arrays into storage
        Strategy storage s = strategies[strategyId];
        s.id = strategyId;
        s.name = name;
        s.feeBps = feeBps;
        s.maturityTs = maturityTs;
        s.active = true;
        s.details.expectedProfitBps = expectedProfitBps;
        s.settled = false;
        s.payoutPerUSDC = 0;

        for (uint256 i = 0; i < pmOrders.length; i++) {
            s.details.polymarketOrders.push(pmOrders[i]);
        }
        for (uint256 j = 0; j < hedgeOrders.length; j++) {
            s.details.hedgeOrders.push(hedgeOrders[j]);
        }

        emit StrategyCreated(strategyId, name, maturityTs);
    }

    // ------------------
    // User functions
    // ------------------

    function buyStrategy(uint256 strategyId, uint256 grossAmount) external nonReentrant {
        Strategy storage s = strategies[strategyId];
        require(s.active, "strategy inactive");
        require(!s.settled, "strategy settled");
        require(block.timestamp < s.maturityTs, "strategy matured");
        require(grossAmount > 0, "amount=0");

        // pull funds
        require(usdc.transferFrom(msg.sender, address(this), grossAmount), "USDC transfer failed");

        // fee and net calculation
        uint256 feeAmount = (grossAmount * s.feeBps) / 10_000;
        uint256 netAmount = grossAmount - feeAmount;

        // record user position
        userPositions[msg.sender].push(
            UserPosition({ strategyId: strategyId, amount: netAmount, purchaseTs: block.timestamp, claimed: false })
        );

        emit StrategyPurchased(strategyId, msg.sender, grossAmount, netAmount);
        
        // Trigger hedge orders on Arbitrum via cross-chain messaging
        // In production, LayerZero would handle this automatically
        emit HedgeOrdersTriggered(strategyId, msg.sender, s.details.hedgeOrders);
    }

    function claimStrategy(uint256 strategyId) external nonReentrant {
        Strategy storage s = strategies[strategyId];
        require(block.timestamp >= s.maturityTs, "not matured");
        require(s.settled, "not settled");
        require(s.payoutPerUSDC > 0, "payout unset");

        // find unclaimed position (simple linear scan for MVP)
        UserPosition[] storage positions = userPositions[msg.sender];
        uint256 idx = type(uint256).max;
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].strategyId == strategyId && !positions[i].claimed) {
                idx = i;
                break;
            }
        }
        require(idx != type(uint256).max, "no position");

        UserPosition storage p = positions[idx];
        p.claimed = true;

        // Payout is proportional to contributed net amount times settlement factor
        uint256 payout = (p.amount * s.payoutPerUSDC) / 1_000_000; // 6 decimals
        require(usdc.transfer(msg.sender, payout), "USDC payout failed");

        emit StrategyClaimed(strategyId, msg.sender, payout);
    }

    // ------------------
    // Bridge/Executor hooks (owner for MVP)
    // ------------------
    function reportExecutionStatus(uint256 strategyId, address user, bool success) external onlyOwner {
        emit OrdersExecuted(strategyId, user, success);
    }

    /// @notice Settle a strategy with a global payout-per-USDC factor after all legs are closed off-chain
    function settleStrategy(uint256 strategyId, uint256 payoutPerUSDC) external onlyOwner {
        Strategy storage s = strategies[strategyId];
        require(block.timestamp >= s.maturityTs, "not matured");
        require(!s.settled, "already settled");
        require(payoutPerUSDC > 0, "invalid payout");
        s.settled = true;
        s.payoutPerUSDC = payoutPerUSDC; // 6 decimals
        // deactivate further buys just in case
        s.active = false;
        emit StrategySettled(strategyId, payoutPerUSDC);
    }
}
