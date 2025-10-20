import { expect } from "chai";
import { ethers } from "hardhat";

describe("StrategyManager", function () {
  async function deployFixture() {
    const [, alice] = await ethers.getSigners();

    // Deploy a mock USDC (minimal ERC20) for testing using a built-in Mock if available
    const ERC20Mock = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    const usdcDeployment = await ERC20Mock.deploy("USD Coin", "USDC", 6);
    await usdcDeployment.waitForDeployment();
    const usdcAddr = await usdcDeployment.getAddress();
    const usdcMock = await ethers.getContractAt("contracts/test/MockERC20.sol:MockERC20", usdcAddr);
    const usdc = await ethers.getContractAt("IERC20", usdcAddr);

    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const manager = await StrategyManager.deploy(await usdc.getAddress());
    await manager.waitForDeployment();

    // Mint USDC to Alice and approve
    await usdcMock.mint(alice.address, 1_000_000_000); // 1,000 USDC with 6 decimals
    await usdc.connect(alice).approve(await manager.getAddress(), 1_000_000_000);

    return { alice, usdc, manager };
  }

  it("creates, buys, settles, and claims", async function () {
    const { alice, usdc, manager } = await deployFixture();

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

    // Fast-forward to after maturity
    await ethers.provider.send("evm_increaseTime", [70]);
    await ethers.provider.send("evm_mine", []);

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
