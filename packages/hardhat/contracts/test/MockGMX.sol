// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockGMXExchangeRouter
 * @notice Mock implementation of GMX ExchangeRouter for testing
 */
contract MockGMXExchangeRouter {
    uint256 private orderCounter = 0;

    /**
     * @notice Mock createOrder function that returns a deterministic order key
     */
    function createOrder(
        address account,
        address[] calldata addressItems,
        uint256[] calldata uintItems,
        bytes32[] calldata bytesDataItems,
        bytes calldata data
    ) external returns (bytes32) {
        orderCounter++;
        // Return a deterministic order key based on counter
        return keccak256(abi.encodePacked(account, orderCounter, block.timestamp));
    }

    /**
     * @notice Get the next order counter value
     */
    function getOrderCounter() external view returns (uint256) {
        return orderCounter;
    }
}

/**
 * @title MockGMXRouter
 * @notice Mock implementation of GMX Router for testing
 */
contract MockGMXRouter {
    mapping(address => mapping(address => uint256)) private allowances;

    /**
     * @notice Mock approvePlugin function
     */
    function approvePlugin(address plugin) external {
        // Mock implementation - just accept the call
    }

    /**
     * @notice Mock plugin function
     */
    function plugin() external view returns (address) {
        return address(this);
    }
}
