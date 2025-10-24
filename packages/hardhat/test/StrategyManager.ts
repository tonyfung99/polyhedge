import { expect } from "chai";
import { ethers } from "hardhat";

describe("StrategyManager", function () {
  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();

    // Deploy a mock USDC first
    const ERC20Mock = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    const usdcDeployment = await ERC20Mock.deploy("USD Coin", "USDC", 6);
    await usdcDeployment.waitForDeployment();
    const usdcAddr = await usdcDeployment.getAddress();
    const usdcMock = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", usdcAddr);
    const usdc = await ethers.getContractAt("IERC20", usdcAddr);

    // Deploy mock GMX contracts for testing
    // In real deployment, these would be actual GMX addresses on Arbitrum
    const gmxExchangeRouter = owner.address; // Placeholder
    const gmxRouter = owner.address; // Placeholder

    // Deploy HedgeExecutor with GMX addresses and USDC
    const HedgeExecutor = await ethers.getContractFactory("HedgeExecutor");
    const hedgeExecutor = await HedgeExecutor.deploy(gmxExchangeRouter, gmxRouter, usdcAddr);
    await hedgeExecutor.waitForDeployment();

    // Deploy StrategyManager with HedgeExecutor address
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const manager = await StrategyManager.deploy(usdcAddr, await hedgeExecutor.getAddress());
    await manager.waitForDeployment();

    // Tell HedgeExecutor about StrategyManager
    await hedgeExecutor.setStrategyManager(await manager.getAddress());

    // Set up asset markets for testing (BTC market)
    await hedgeExecutor.setAssetMarket("BTC", owner.address); // Use owner address as test market

    // Mint USDC to Alice and approve
    await usdcMock.mint(alice.address, 1_000_000_000); // 1,000 USDC with 6 decimals
    await usdc.connect(alice).approve(await manager.getAddress(), 1_000_000_000);

    // Fund HedgeExecutor with USDC for hedge execution
    await usdcMock.mint(await hedgeExecutor.getAddress(), 1_000_000_000);

    return { owner, alice, usdc, manager, hedgeExecutor };
  }

  it("creates, buys, settles, and claims", async function () {
    const { alice, usdc, manager, hedgeExecutor } = await deployFixture();

    // Create a simple strategy
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const maturity = now + 60; // 1 minute

    const pmOrders: any[] = [
      { marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }, // 100 USDC, 10%
    ];
    const hedgeOrders: any[] = [{ dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 }];

    await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);

    // Alice buys 200 USDC gross
    await manager.connect(alice).buyStrategy(1, 200_000_000);

    // Verify hedge order was created
    const hedgeOrder = await hedgeExecutor.getHedgeOrder(1);
    expect(hedgeOrder.strategyId).to.equal(1);
    expect(hedgeOrder.user).to.equal(alice.address);
    expect(hedgeOrder.asset).to.equal("BTC");
    expect(hedgeOrder.isLong).to.equal(false);
    expect(hedgeOrder.amount).to.equal(100_000_000);
    expect(hedgeOrder.executed).to.equal(true);

    // Verify order is marked as executed
    expect(await hedgeExecutor.isOrderExecuted(1)).to.equal(true);

    // Fast-forward to after maturity
    await ethers.provider.send("evm_increaseTime", [70]);
    await ethers.provider.send("evm_mine", []);

    // Close hedge order
    await hedgeExecutor.closeHedgeOrder(1, 5_000_000); // 5 USDC profit

    // Settle with payoutPerUSDC = 1.05 (1,050,000)
    await manager.settleStrategy(1, 1_050_000);

    // Fund contract with profit so it can pay out above principal (simulating realized PnL)
    const usdcForProfit = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", await usdc.getAddress());
    await usdcForProfit.mint(await manager.getAddress(), 20_000_000); // +20 USDC

    const balBefore = await usdc.balanceOf(alice.address);
    await manager.connect(alice).claimStrategy(1);
    const balAfter = await usdc.balanceOf(alice.address);

    // Alice paid net after 2% fee: 196 USDC => 196_000_000
    // Payout = net * 1.05 = 205.8 USDC
    expect(balAfter - balBefore).to.equal(205_800_000);
  });
});
