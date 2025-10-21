// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PolygonReceiver
 * @notice Receives bridged USDC from Arbitrum via LayerZero/Stargate
 *         Manages Polymarket order custody and settlement on Polygon
 */
contract PolygonReceiver is Ownable, ReentrancyGuard {
    /// @notice USDC token on Polygon
    IERC20 public usdc;

    /// @notice Tracks USDC received per strategy per user
    /// strategyId => user => amount
    mapping(uint256 => mapping(address => uint256)) public userFunds;

    /// @notice Total USDC held for each strategy
    /// strategyId => totalAmount
    mapping(uint256 => uint256) public strategyFunds;

    /// @notice Polymarket position data per strategy
    /// strategyId => OrderData
    struct PolymarketPosition {
        uint256 marketId;
        string side; // "BUY" or "SELL"
        uint256 shares; // amount of shares held
        uint256 entryPrice; // price at entry
    }

    mapping(uint256 => PolymarketPosition[]) public positions;

    /// @notice Track which strategies have been settled
    /// strategyId => isSettled
    mapping(uint256 => bool) public settlementStatus;

    // Events
    event USDCReceived(uint256 indexed strategyId, address indexed user, uint256 amount);
    event PolymarketOrderPlaced(uint256 indexed strategyId, uint256 marketId, string side, uint256 shares);
    event PolymarketOrderClosed(uint256 indexed strategyId, uint256 marketId, uint256 finalValue);
    event StrategySettled(uint256 indexed strategyId, uint256 realizedPnL, uint256 finalBalance);
    event FundsWithdrawn(uint256 indexed strategyId, address indexed recipient, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Called by bridge when USDC is transferred from Arbitrum
     *         Accumulates funds for strategy execution
     */
    function receiveUSDC(uint256 strategyId, address user, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(amount > 0, "Amount must be > 0");
        
        // Record user's funds
        userFunds[strategyId][user] += amount;
        strategyFunds[strategyId] += amount;

        emit USDCReceived(strategyId, user, amount);
    }

    /**
     * @notice Records a Polymarket order placement
     *         Called by bridge after executing order via API
     */
    function recordPolymarketOrder(
        uint256 strategyId,
        uint256 marketId,
        string calldata side,
        uint256 shares,
        uint256 entryPrice
    ) external onlyOwner {
        positions[strategyId].push(PolymarketPosition({
            marketId: marketId,
            side: side,
            shares: shares,
            entryPrice: entryPrice
        }));

        emit PolymarketOrderPlaced(strategyId, marketId, side, shares);
    }

    /**
     * @notice Close a Polymarket position and record exit
     *         Called by bridge at settlement time
     */
    function closePolymarketPosition(
        uint256 strategyId,
        uint256 positionIndex,
        uint256 finalValue
    ) external onlyOwner {
        require(positionIndex < positions[strategyId].length, "Invalid position index");
        
        PolymarketPosition storage pos = positions[strategyId][positionIndex];
        uint256 marketId = pos.marketId;
        
        // Remove position (or mark as closed)
        // For simplicity, we don't delete but just emit the close event
        emit PolymarketOrderClosed(strategyId, marketId, finalValue);
    }

    /**
     * @notice Settlement phase: calculate PnL and prepare payout
     *         Called by bridge after all positions are closed
     */
    function settleStrategy(
        uint256 strategyId,
        uint256 totalBalance
    ) external onlyOwner {
        require(!settlementStatus[strategyId], "Already settled");
        
        uint256 initialBalance = strategyFunds[strategyId];
        int256 realizedPnL = int256(totalBalance) - int256(initialBalance);
        
        settlementStatus[strategyId] = true;

        emit StrategySettled(strategyId, uint256(realizedPnL), totalBalance);
    }

    /**
     * @notice Withdraw user's share of settled funds
     *         Called by bridge to send profits back to Arbitrum
     */
    function withdrawFunds(
        uint256 strategyId,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(settlementStatus[strategyId], "Not yet settled");
        require(amount > 0, "Amount must be > 0");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");

        strategyFunds[strategyId] -= amount;
        require(usdc.transfer(recipient, amount), "Transfer failed");

        emit FundsWithdrawn(strategyId, recipient, amount);
    }

    /**
     * @notice View all positions for a strategy
     */
    function getPositions(uint256 strategyId) 
        external 
        view 
        returns (PolymarketPosition[] memory) 
    {
        return positions[strategyId];
    }

    /**
     * @notice Check strategy settlement status
     */
    function isSettled(uint256 strategyId) external view returns (bool) {
        return settlementStatus[strategyId];
    }
}
