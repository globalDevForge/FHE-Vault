import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { deployments, ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { ERC7984USDT, FHEVault } from "../types";

const toBigInt = (value: bigint | number) => BigInt(value.toString());

describe("FHEVaultSepolia", function () {
  let alice: HardhatEthersSigner;
  let vault: FHEVault;
  let token: ERC7984USDT;
  let vaultAddress: string;
  let step = 0;
  let steps = 0;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This hardhat test suite can only run on Sepolia Testnet");
      this.skip();
    }

    try {
      const vaultDeployment = await deployments.get("FHEVault");
      const tokenDeployment = await deployments.get("ERC7984USDT");
      vaultAddress = vaultDeployment.address;
      vault = (await ethers.getContractAt("FHEVault", vaultDeployment.address)) as FHEVault;
      token = (await ethers.getContractAt("ERC7984USDT", tokenDeployment.address)) as ERC7984USDT;
    } catch (error) {
      (error as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw error;
    }

    const [signer] = await ethers.getSigners();
    alice = signer;
  });

  beforeEach(async function () {
    step = 0;
    steps = 0;
  });

  it("retrieves stake data for the connected signer", async function () {
    steps = 6;
    this.timeout(4 * 40000);

    progress("Querying plaintext stake...");
    const plainStake = await vault.getStake(alice.address);
    progress(`Plain stake: ${plainStake.toString()}`);

    progress("Querying encrypted stake...");
    const encryptedStake = await vault.getStakeCipher(alice.address);
    progress(`Encrypted stake: ${encryptedStake}`);

    if (encryptedStake !== ethers.ZeroHash) {
      await fhevm.initializeCLIApi();
      progress("Decrypting stake...");
      const decryptedStake = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedStake,
        vaultAddress,
        alice,
      );
      progress(`Decrypted stake: ${decryptedStake}`);
      expect(toBigInt(decryptedStake)).to.equal(toBigInt(plainStake));
    } else {
      progress("Stake is zero, skipping decryption");
      expect(plainStake).to.equal(0n);
    }

    progress("Checking total staked amount...");
    const totalStaked = await vault.getTotalStaked();
    progress(`Total staked: ${totalStaked.toString()}`);

    progress("Verifying operator status...");
    const isOperator = await vault.isVaultOperator(alice.address);
    progress(`Is operator: ${isOperator}`);
  });
});
