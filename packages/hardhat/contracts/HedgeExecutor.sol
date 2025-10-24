// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// GMX V2 Interfaces
interface IGMXExchangeRouter {
    function createOrder(
        address account,
        address[] calldata addressItems,
        uint256[] calldata uintItems,
        bytes32[] calldata bytesDataItems,
        bytes calldata data
    ) external payable returns (bytes32);
}

interface IGMXRouter {
    function approvePlugin(address plugin) external;

    function plugin() external view returns (address);
}

interface IGMXOrderHandler {
    function executeOrder(bytes32 key, address keeper) external;
}

/**
 * @title HedgeExecutor
 * @notice Executes hedge orders on GMX (Arbitrum).
 *         Receives cross-chain messages from StrategyManager (Polygon) via LayerZero.
 *         Places perpetual orders directly on GMX on-chain.
 */
contract HedgeExecutor is Ownable, ReentrancyGuard {
    struct HedgeOrder {
        uint256 strategyId;
        address user;
        string asset; // e.g., "BTC", "ETH"
        bool isLong;
        uint256 amount; // USDC amount
        uint256 maxSlippageBps;
        bool executed;
        bytes32 gmxOrderKey;
    }

    // strategyId => HedgeOrder
    mapping(uint256 => HedgeOrder) public hedgeOrders;
    mapping(uint256 => bool) public ordersClosed;
    mapping(bytes32 => uint256) public gmxKeyToStrategyId; // GMX order key => strategy ID

    event HedgeOrderCreated(
        uint256 indexed strategyId,
        address indexed user,
        string asset,
        bool isLong,
        uint256 amount,
        bytes32 gmxOrderKey
    );
    event HedgeOrderClosed(uint256 indexed strategyId, uint256 realizedPnL);
    event MessageReceived(uint256 indexed strategyId, address indexed user);
    event HedgeOrderExecuted(uint256 indexed strategyId, bytes32 gmxOrderKey);

    address public strategyManager;

    // GMX contracts on Arbitrum
    IGMXExchangeRouter public gmxExchangeRouter;
    IGMXRouter public gmxRouter;
    IERC20 public usdc;

    // Market addresses for GMX (index token to market address mapping)
    mapping(string => address) public assetMarkets;

    constructor(address _gmxExchangeRouter, address _gmxRouter, address _usdc) Ownable(msg.sender) {
        require(_gmxExchangeRouter != address(0), "invalid GMX router");
        require(_gmxRouter != address(0), "invalid GMX router");
        require(_usdc != address(0), "invalid USDC");

        gmxExchangeRouter = IGMXExchangeRouter(_gmxExchangeRouter);
        gmxRouter = IGMXRouter(_gmxRouter);
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Set StrategyManager address (can only be called once by owner)
     */
    function setStrategyManager(address _strategyManager) external onlyOwner {
        require(_strategyManager != address(0), "invalid address");
        require(strategyManager == address(0), "already set");
        strategyManager = _strategyManager;
    }

    /**
     * @notice Configure market addresses for assets
     *         Maps asset symbols (e.g., "BTC", "ETH") to GMX market addresses
     */
    function setAssetMarket(string calldata asset, address marketAddress) external onlyOwner {
        require(marketAddress != address(0), "invalid market");
        assetMarkets[asset] = marketAddress;
    }

    /**
     * @notice Receive hedge order from StrategyManager and execute it on GMX
     *         Can only be called by StrategyManager
     */
    function createHedgeOrder(
        uint256 strategyId,
        address user,
        string calldata asset,
        bool isLong,
        uint256 amount,
        uint256 maxSlippageBps
    ) external nonReentrant {
        require(msg.sender == strategyManager, "only StrategyManager");
        require(amount > 0, "amount=0");
        require(assetMarkets[asset] != address(0), "asset not supported");

        // Check USDC balance and allowance
        require(usdc.balanceOf(address(this)) >= amount, "insufficient USDC balance");

        // Create the GMX order
        bytes32 gmxOrderKey = _executeGMXOrder(asset, isLong, amount, maxSlippageBps);

        // Store hedge order details
        hedgeOrders[strategyId] = HedgeOrder({
            strategyId: strategyId,
            user: user,
            asset: asset,
            isLong: isLong,
            amount: amount,
            maxSlippageBps: maxSlippageBps,
            executed: true,
            gmxOrderKey: gmxOrderKey
        });

        // Map GMX order key back to strategy for settlement
        gmxKeyToStrategyId[gmxOrderKey] = strategyId;

        emit HedgeOrderCreated(strategyId, user, asset, isLong, amount, gmxOrderKey);
        emit MessageReceived(strategyId, user);
        emit HedgeOrderExecuted(strategyId, gmxOrderKey);
    }

    /**
     * @notice Internal function to execute a GMX perpetual order
     *         Constructs the necessary parameters and calls GMXExchangeRouter
     */
    function _executeGMXOrder(
        string calldata asset,
        bool isLong,
        uint256 amount,
        uint256 maxSlippageBps
    ) internal returns (bytes32 orderKey) {
        address marketAddress = assetMarkets[asset];

        // Approve GMX to spend USDC
        usdc.approve(address(gmxRouter), amount);

        // Build order parameters for GMX V2
        // This is a simplified version - adjust based on actual GMX V2 order structure
        address[] memory addressItems = new address[](4);
        addressItems[0] = marketAddress; // market
        addressItems[1] = msg.sender; // receiver (StrategyManager)
        addressItems[2] = address(usdc); // initialCollateralToken
        addressItems[3] = address(0); // swapPath (none for direct orders)

        uint256[] memory uintItems = new uint256[](6);
        uintItems[0] = amount; // sizeDeltaUsd (in USDC value)
        uintItems[1] = amount; // initialCollateralDeltaAmount
        uintItems[2] = 0; // triggerPrice
        uintItems[3] = maxSlippageBps; // acceptablePrice / slippage
        uintItems[4] = 0; // executionFee (handled separately)
        uintItems[5] = isLong ? 1 : 0; // orderType (1 = MarketIncrease for longs)

        bytes32[] memory bytesDataItems = new bytes32[](0);

        // Create order via GMX ExchangeRouter
        orderKey = gmxExchangeRouter.createOrder(address(this), addressItems, uintItems, bytesDataItems, "");

        return orderKey;
    }

    /**
     * @notice Close hedge order at maturity
     *         Called by backend/bridge when strategy matures.
     *         Submits a close/reduce order to GMX
     */
    function closeHedgeOrder(uint256 strategyId, int256 realizedPnL) external nonReentrant onlyOwner {
        require(!ordersClosed[strategyId], "already closed");

        HedgeOrder storage hedge = hedgeOrders[strategyId];
        require(hedge.amount > 0, "order not found");

        // TODO: Call GMX.closePosition() via ExchangeRouter
        // For now, mark as closed
        ordersClosed[strategyId] = true;
        emit HedgeOrderClosed(strategyId, uint256(realizedPnL));
    }

    /**
     * @notice Get hedge order details
     */
    function getHedgeOrder(uint256 strategyId) external view returns (HedgeOrder memory) {
        return hedgeOrders[strategyId];
    }

    /**
     * @notice Get strategy ID from GMX order key (for settlement tracking)
     */
    function getStrategyIdFromGMXOrder(bytes32 gmxOrderKey) external view returns (uint256) {
        return gmxKeyToStrategyId[gmxOrderKey];
    }

    /**
     * @notice Check if a hedge order has been executed
     */
    function isOrderExecuted(uint256 strategyId) external view returns (bool) {
        return hedgeOrders[strategyId].executed;
    }

    /**
     * @notice Emergency withdrawal of USDC (owner only)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        require(usdc.transfer(msg.sender, amount), "transfer failed");
    }
}
