export const StrategyManagerABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdc",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_hedgeExecutor",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "name": "OrdersExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payoutAmount",
        "type": "uint256"
      }
    ],
    "name": "StrategyClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maturityTs",
        "type": "uint256"
      }
    ],
    "name": "StrategyCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "grossAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netAmount",
        "type": "uint256"
      }
    ],
    "name": "StrategyPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "payoutPerUSDC",
        "type": "uint256"
      }
    ],
    "name": "StrategySettled",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "grossAmount",
        "type": "uint256"
      }
    ],
    "name": "buyStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      }
    ],
    "name": "claimStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "feeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maturityTs",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "marketId",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isYes",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxPriceBps",
            "type": "uint256"
          }
        ],
        "internalType": "struct StrategyManager.PolymarketOrder[]",
        "name": "pmOrders",
        "type": "tuple[]"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "dex",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "asset",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isLong",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxSlippageBps",
            "type": "uint256"
          }
        ],
        "internalType": "struct StrategyManager.HedgeOrder[]",
        "name": "hedgeOrders",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "expectedProfitBps",
        "type": "uint256"
      }
    ],
    "name": "createStrategy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "hedgeExecutor",
    "outputs": [
      {
        "internalType": "contract IHedgeExecutor",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextStrategyId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "name": "reportExecutionStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "payoutPerUSDC",
        "type": "uint256"
      }
    ],
    "name": "settleStrategy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "strategies",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "feeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maturityTs",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "components": [
          {
            "components": [
              {
                "internalType": "string",
                "name": "marketId",
                "type": "string"
              },
              {
                "internalType": "bool",
                "name": "isYes",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxPriceBps",
                "type": "uint256"
              }
            ],
            "internalType": "struct StrategyManager.PolymarketOrder[]",
            "name": "polymarketOrders",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "dex",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "asset",
                "type": "string"
              },
              {
                "internalType": "bool",
                "name": "isLong",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxSlippageBps",
                "type": "uint256"
              }
            ],
            "internalType": "struct StrategyManager.HedgeOrder[]",
            "name": "hedgeOrders",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256",
            "name": "expectedProfitBps",
            "type": "uint256"
          }
        ],
        "internalType": "struct StrategyManager.StrategyDetails",
        "name": "details",
        "type": "tuple"
      },
      {
        "internalType": "bool",
        "name": "settled",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "payoutPerUSDC",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userPositions",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "strategyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "purchaseTs",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "claimed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;