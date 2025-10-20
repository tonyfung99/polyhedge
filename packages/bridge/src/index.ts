import 'dotenv/config';
import { ethers } from 'ethers';

// Minimal event listener wiring; fill with actual addresses/ABIs at runtime
const RPC_URL = process.env.POLYGON_RPC_URL || 'http://localhost:8545';
const STRATEGY_MANAGER_ADDRESS = process.env.STRATEGY_MANAGER_ADDRESS as string;
const STRATEGY_MANAGER_ABI = [
  'event StrategyPurchased(uint256 indexed strategyId, address indexed user, uint256 grossAmount, uint256 netAmount)',
  'function settleStrategy(uint256 strategyId, uint256 payoutPerUSDC) external',
];

async function main() {
  if (!STRATEGY_MANAGER_ADDRESS) {
    throw new Error('STRATEGY_MANAGER_ADDRESS is required');
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.EXECUTOR_PK || ethers.Wallet.createRandom().privateKey, provider);
  const contract = new ethers.Contract(STRATEGY_MANAGER_ADDRESS, STRATEGY_MANAGER_ABI, wallet);

  console.log('Bridge executor listening on', STRATEGY_MANAGER_ADDRESS);

  contract.on('StrategyPurchased', async (strategyId, user, grossAmount, netAmount) => {
    console.log('StrategyPurchased:', { strategyId: strategyId.toString(), user, grossAmount: grossAmount.toString(), netAmount: netAmount.toString() });
    // TODO: execute Polymarket orders, bridge funds, execute hedge orders
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


