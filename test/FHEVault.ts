import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { ERC7984USDT, ERC7984USDT__factory, FHEVault, FHEVault__factory } from "../types";

const toBigInt = (value: bigint | number) => BigInt(value.toString());

async function deployFixture() {
  const tokenFactory = (await ethers.getContractFactory("ERC7984USDT")) as ERC7984USDT__factory;
  const token = (await tokenFactory.deploy()) as ERC7984USDT;
  await token.waitForDeployment();

  const vaultFactory = (await ethers.getContractFactory("FHEVault")) as FHEVault__factory;
  const vault = (await vaultFactory.deploy(await token.getAddress())) as FHEVault;
  await vault.waitForDeployment();

  return { token, vault };
}

describe("FHEVault", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let token: ERC7984USDT;
  let vault: FHEVault;

  before(async function () {
    const signers = await ethers.getSigners();
    deployer = signers[0];
    alice = signers[1];
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ token, vault } = await deployFixture());
  });

  it("stakes and withdraws while tracking encrypted balances", async function () {
    const stakeAmount = 5_000_000n; // 5 fUSDT assuming 6 decimals
    const withdrawAmount = 2_000_000n; // 2 fUSDT

    await token.connect(deployer).mint(alice.address, stakeAmount);

    const expiry = Math.floor(Date.now() / 1000) + 3600;
    await token.connect(alice).setOperator(await vault.getAddress(), expiry);

    await expect(vault.connect(alice).stake(stakeAmount))
      .to.emit(vault, "Staked")
      .withArgs(alice.address, stakeAmount);

    const aliceStake = await vault.getStake(alice.address);
    expect(aliceStake).to.equal(stakeAmount);

    const totalStake = await vault.getTotalStaked();
    expect(totalStake).to.equal(stakeAmount);

    const stakeCipher = await vault.getStakeCipher(alice.address);
    expect(stakeCipher).to.not.equal(ethers.ZeroHash);

    const decryptedStake = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      stakeCipher,
      await vault.getAddress(),
      alice,
    );

    expect(toBigInt(decryptedStake)).to.equal(stakeAmount);

    await expect(vault.connect(alice).withdraw(withdrawAmount))
      .to.emit(vault, "Withdrawn")
      .withArgs(alice.address, withdrawAmount);

    const remainingStake = await vault.getStake(alice.address);
    expect(remainingStake).to.equal(stakeAmount - withdrawAmount);

    const totalAfterWithdraw = await vault.getTotalStaked();
    expect(totalAfterWithdraw).to.equal(stakeAmount - withdrawAmount);

    const remainingCipher = await vault.getStakeCipher(alice.address);
    const decryptedRemaining = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      remainingCipher,
      await vault.getAddress(),
      alice,
    );

    expect(toBigInt(decryptedRemaining)).to.equal(stakeAmount - withdrawAmount);
  });

  it("reverts when staking or withdrawing invalid amounts", async function () {
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    await token.connect(alice).setOperator(await vault.getAddress(), expiry);

    await expect(vault.connect(alice).stake(0)).to.be.revertedWithCustomError(vault, "InvalidAmount");

    await expect(vault.connect(alice).withdraw(1)).to.be.revertedWithCustomError(vault, "InsufficientStake");
  });
});
