// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HedgeExecutor
 * @notice Executes hedge orders on GMX (Arbitrum).
 *         Receives cross-chain messages from StrategyManager (Polygon) via LayerZero.
 *         Places perpetual orders directly on GMX on-chain.
 */
contract HedgeExecutor is Ownable {
    struct HedgeOrder {
        uint256 strategyId;
        address user;
        string asset; // e.g., "BTC", "ETH"
        bool isLong;
        uint256 amount; // USDC amount
        uint256 maxSlippageBps;
    }

    // strategyId => HedgeOrder
    mapping(uint256 => HedgeOrder) public hedgeOrders;
    mapping(uint256 => bool) public ordersClosed;

    event HedgeOrderCreated(uint256 indexed strategyId, string asset, bool isLong, uint256 amount);
    event HedgeOrderClosed(uint256 indexed strategyId, uint256 realizedPnL);
    event MessageReceived(uint256 indexed strategyId, address indexed user);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Receive cross-chain message from StrategyManager (Polygon)
     *         In production, this would be called by a LayerZero endpoint.
     *         For MVP, only owner can call.
     */
    function createHedgeOrder(
        uint256 strategyId,
        address user,
        string calldata asset,
        bool isLong,
        uint256 amount,
        uint256 maxSlippageBps
    ) external onlyOwner {
        require(amount > 0, "amount=0");

        hedgeOrders[strategyId] = HedgeOrder({
            strategyId: strategyId,
            user: user,
            asset: asset,
            isLong: isLong,
            amount: amount,
            maxSlippageBps: maxSlippageBps
        });

        // TODO: Call GMX.createOrder() here
        // For MVP, just emit event
        emit HedgeOrderCreated(strategyId, asset, isLong, amount);
        emit MessageReceived(strategyId, user);
    }

    /**
     * @notice Close hedge order at maturity
     *         Called by backend/bridge when strategy matures.
     */
    function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external onlyOwner {
        require(!ordersClosed[strategyId], "already closed");

        // TODO: Call GMX.closePosition() here
        ordersClosed[strategyId] = true;
        emit HedgeOrderClosed(strategyId, uint256(realizedPnL));
    }

    /**
     * @notice Get hedge order details
     */
    function getHedgeOrder(uint256 strategyId) external view returns (HedgeOrder memory) {
        return hedgeOrders[strategyId];
    }
}
