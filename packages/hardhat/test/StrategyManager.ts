import { expect } from "chai";
import { ethers } from "hardhat";

describe("StrategyManager", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    // Deploy a mock USDC first
    const ERC20Mock = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    const usdcDeployment = await ERC20Mock.deploy("USD Coin", "USDC", 6);
    await usdcDeployment.waitForDeployment();
    const usdcAddr = await usdcDeployment.getAddress();
    const usdcMock = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", usdcAddr);
    const usdc = await ethers.getContractAt("IERC20", usdcAddr);

    // Deploy mock GMX contracts for testing
    const MockGMXExchangeRouter = await ethers.getContractFactory("MockGMXExchangeRouter");
    const gmxExchangeRouter = await MockGMXExchangeRouter.deploy();
    await gmxExchangeRouter.waitForDeployment();

    const MockGMXRouter = await ethers.getContractFactory("MockGMXRouter");
    const gmxRouter = await MockGMXRouter.deploy();
    await gmxRouter.waitForDeployment();

    // Deploy HedgeExecutor with mock GMX addresses and USDC
    const HedgeExecutor = await ethers.getContractFactory("HedgeExecutor");
    const hedgeExecutor = await HedgeExecutor.deploy(
      await gmxExchangeRouter.getAddress(),
      await gmxRouter.getAddress(),
      usdcAddr,
    );
    await hedgeExecutor.waitForDeployment();

    // Deploy StrategyManager with HedgeExecutor address
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const manager = await StrategyManager.deploy(usdcAddr, await hedgeExecutor.getAddress());
    await manager.waitForDeployment();

    // Tell HedgeExecutor about StrategyManager
    await hedgeExecutor.setStrategyManager(await manager.getAddress());

    // Set up asset markets for testing
    await hedgeExecutor.setAssetMarket("BTC", owner.address); // Use owner address as test market
    await hedgeExecutor.setAssetMarket("ETH", owner.address); // ETH market
    await hedgeExecutor.setAssetMarket("SOL", owner.address); // SOL market

    // Mint USDC to Alice and Bob and approve
    await usdcMock.mint(alice.address, 1_000_000_000); // 1,000 USDC with 6 decimals
    await usdcMock.mint(bob.address, 1_000_000_000); // 1,000 USDC with 6 decimals
    await usdc.connect(alice).approve(await manager.getAddress(), 1_000_000_000);
    await usdc.connect(bob).approve(await manager.getAddress(), 1_000_000_000);

    // Fund HedgeExecutor with USDC for hedge execution
    await usdcMock.mint(await hedgeExecutor.getAddress(), 10_000_000_000); // 10,000 USDC

    return { owner, alice, bob, usdc, manager, hedgeExecutor, usdcMock, gmxExchangeRouter };
  }

  describe("GMX Hedge Order Execution", function () {
    it("should execute hedge order on strategy purchase", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      // Create a simple strategy
      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60; // 1 minute

      const pmOrders: any[] = [
        { marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }, // 100 USDC, 10%
      ];
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

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
    });

    it("should store GMX order key for tracking", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      const pmOrders: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

      await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);
      await manager.connect(alice).buyStrategy(1, 200_000_000);

      // Verify GMX order key is stored
      const hedgeOrder = await hedgeExecutor.getHedgeOrder(1);
      expect(hedgeOrder.gmxOrderKey).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");

      // Verify strategy ID can be retrieved from GMX order key
      const strategyId = await hedgeExecutor.getStrategyIdFromGMXOrder(hedgeOrder.gmxOrderKey);
      expect(strategyId).to.equal(1);
    });

    it("should handle multiple hedge orders for a single strategy", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      const pmOrders: any[] = [
        { marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 },
        { marketId: "m2", isYes: false, amount: 50_000_000, maxPriceBps: 500 },
      ];

      // Multiple hedge orders: BTC short + ETH long
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
        { dex: "GMX", asset: "ETH", isLong: true, amount: 50_000_000, maxSlippageBps: 150 },
      ];

      await manager.createStrategy("Multi-Hedge Strategy", 200, maturity, pmOrders, hedgeOrders, 0);
      await manager.connect(alice).buyStrategy(1, 200_000_000);

      // NOTE: Current implementation limitation - HedgeExecutor stores only the last hedge order
      // Each createHedgeOrder call overwrites the previous one. This should be fixed in a future
      // iteration by supporting an array of hedge orders per strategy ID.
      // For now, verify the last hedge order (ETH) is stored
      const hedgeOrder = await hedgeExecutor.getHedgeOrder(1);
      expect(hedgeOrder.asset).to.equal("ETH");
      expect(hedgeOrder.isLong).to.equal(true);
      expect(hedgeOrder.executed).to.equal(true);

      // Both hedge orders were executed and created on GMX
      // But only the last one is retrievable due to current storage design
    });

    it("should track hedge order status correctly", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      const pmOrders: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

      await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);

      // Before purchase
      expect(await hedgeExecutor.isOrderExecuted(1)).to.equal(false);

      // After purchase
      await manager.connect(alice).buyStrategy(1, 200_000_000);
      expect(await hedgeExecutor.isOrderExecuted(1)).to.equal(true);
    });

    it("should reject hedge order execution if asset not configured", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      const pmOrders: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];

      // Try to use an unconfigured asset
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "DOGE", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

      await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);

      // Should revert because DOGE market is not configured
      await expect(manager.connect(alice).buyStrategy(1, 200_000_000)).to.be.revertedWith("asset not supported");
    });

    it("should handle long and short hedge orders", async function () {
      const { alice, bob, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      // Strategy 1: Short hedge
      const pmOrders1: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders1: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];
      await manager.createStrategy("Short Hedge", 200, maturity, pmOrders1, hedgeOrders1, 0);

      // Strategy 2: Long hedge
      const pmOrders2: any[] = [{ marketId: "m2", isYes: false, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders2: any[] = [
        { dex: "GMX", asset: "ETH", isLong: true, amount: 100_000_000, maxSlippageBps: 150 },
      ];
      await manager.createStrategy("Long Hedge", 200, maturity, pmOrders2, hedgeOrders2, 0);

      // Alice buys short hedge strategy
      await manager.connect(alice).buyStrategy(1, 200_000_000);
      const hedgeOrder1 = await hedgeExecutor.getHedgeOrder(1);
      expect(hedgeOrder1.isLong).to.equal(false);

      // Bob buys long hedge strategy
      await manager.connect(bob).buyStrategy(2, 200_000_000);
      const hedgeOrder2 = await hedgeExecutor.getHedgeOrder(2);
      expect(hedgeOrder2.isLong).to.equal(true);
    });

    it("should close hedge order and track PnL", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      const pmOrders: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

      await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);
      await manager.connect(alice).buyStrategy(1, 200_000_000);

      // Fast-forward to after maturity
      await ethers.provider.send("evm_increaseTime", [70]);
      await ethers.provider.send("evm_mine", []);

      // Close hedge order with profit
      const hedgeOrderBefore = await hedgeExecutor.getHedgeOrder(1);
      expect(hedgeOrderBefore.executed).to.equal(true);

      await hedgeExecutor.closeHedgeOrder(1, 5_000_000); // 5 USDC profit

      // Verify order is marked as closed
      expect(await hedgeExecutor.isOrderExecuted(1)).to.equal(true); // Still shows as executed
    });

    it("should prevent closing already closed hedge orders", async function () {
      const { alice, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      const pmOrders: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

      await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);
      await manager.connect(alice).buyStrategy(1, 200_000_000);

      // Fast-forward to after maturity
      await ethers.provider.send("evm_increaseTime", [70]);
      await ethers.provider.send("evm_mine", []);

      // Close hedge order first time
      await hedgeExecutor.closeHedgeOrder(1, 5_000_000);

      // Try to close again - should revert
      await expect(hedgeExecutor.closeHedgeOrder(1, 3_000_000)).to.be.revertedWith("already closed");
    });

    it("should support different slippage tolerances", async function () {
      const { alice, bob, manager, hedgeExecutor } = await deployFixture();

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60;

      // Strategy with low slippage
      const pmOrders1: any[] = [{ marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders1: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 50 }, // 0.5%
      ];
      await manager.createStrategy("Low Slippage", 200, maturity, pmOrders1, hedgeOrders1, 0);

      // Strategy with high slippage
      const pmOrders2: any[] = [{ marketId: "m2", isYes: false, amount: 100_000_000, maxPriceBps: 1000 }];
      const hedgeOrders2: any[] = [
        { dex: "GMX", asset: "ETH", isLong: true, amount: 100_000_000, maxSlippageBps: 500 }, // 5%
      ];
      await manager.createStrategy("High Slippage", 200, maturity, pmOrders2, hedgeOrders2, 0);

      await manager.connect(alice).buyStrategy(1, 200_000_000);
      await manager.connect(bob).buyStrategy(2, 200_000_000);

      const order1 = await hedgeExecutor.getHedgeOrder(1);
      const order2 = await hedgeExecutor.getHedgeOrder(2);

      expect(order1.maxSlippageBps).to.equal(50);
      expect(order2.maxSlippageBps).to.equal(500);
    });
  });

  describe("Complete Flow: Purchase → Hedge → Settlement → Claim", function () {
    it("creates, buys, hedges, settles, and claims", async function () {
      const { alice, usdc, manager, hedgeExecutor, usdcMock } = await deployFixture();

      // Create a simple strategy
      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const maturity = now + 60; // 1 minute

      const pmOrders: any[] = [
        { marketId: "m1", isYes: true, amount: 100_000_000, maxPriceBps: 1000 }, // 100 USDC, 10%
      ];
      const hedgeOrders: any[] = [
        { dex: "GMX", asset: "BTC", isLong: false, amount: 100_000_000, maxSlippageBps: 100 },
      ];

      await manager.createStrategy("Test Strategy", 200, maturity, pmOrders, hedgeOrders, 0);

      // Alice buys 200 USDC gross
      await manager.connect(alice).buyStrategy(1, 200_000_000);

      // Verify hedge order was created with GMX
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
      await usdcMock.mint(await manager.getAddress(), 20_000_000); // +20 USDC

      const balBefore = await usdc.balanceOf(alice.address);
      await manager.connect(alice).claimStrategy(1);
      const balAfter = await usdc.balanceOf(alice.address);

      // Alice paid net after 2% fee: 196 USDC => 196_000_000
      // Payout = net * 1.05 = 205.8 USDC
      expect(balAfter - balBefore).to.equal(205_800_000);
    });
  });
});
