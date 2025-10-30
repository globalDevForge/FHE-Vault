import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:vault-info", "Print the deployed token and vault addresses").setAction(async (_args: TaskArguments, hre) => {
  const { deployments } = hre;

  const tokenDeployment = await deployments.get("ERC7984USDT");
  const vaultDeployment = await deployments.get("FHEVault");

  console.log(`ERC7984USDT address: ${tokenDeployment.address}`);
  console.log(`FHEVault address   : ${vaultDeployment.address}`);
});

task("task:mint", "Mint test fUSDT to your wallet")
  .addParam("amount", "Mint amount in token units (6 decimals)")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const parsedAmount = BigInt(taskArguments.amount);
    if (parsedAmount <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    const tokenDeployment = await deployments.get("ERC7984USDT");
    const token = await ethers.getContractAt("ERC7984USDT", tokenDeployment.address);

    const [signer] = await ethers.getSigners();

    const tx = await token.connect(signer).mint(signer.address, parsedAmount);
    console.log(`Mint tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Mint tx status: ${receipt?.status}`);
  });

task("task:set-operator", "Authorize the vault to transfer your fUSDT")
  .addOptionalParam("expiry", "Unix timestamp for operator expiry", "0")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const expiry = BigInt(taskArguments.expiry);

    const tokenDeployment = await deployments.get("ERC7984USDT");
    const vaultDeployment = await deployments.get("FHEVault");
    const token = await ethers.getContractAt("ERC7984USDT", tokenDeployment.address);

    const [signer] = await ethers.getSigners();

    const tx = await token.connect(signer).setOperator(vaultDeployment.address, Number(expiry));
    console.log(`Set operator tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Set operator tx status: ${receipt?.status}`);
  });

task("task:stake", "Stake fUSDT into the vault")
  .addParam("amount", "Stake amount in token units (6 decimals)")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const parsedAmount = BigInt(taskArguments.amount);
    if (parsedAmount <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    const vaultDeployment = await deployments.get("FHEVault");
    const vault = await ethers.getContractAt("FHEVault", vaultDeployment.address);

    const [signer] = await ethers.getSigners();

    const tx = await vault.connect(signer).stake(parsedAmount);
    console.log(`Stake tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Stake tx status: ${receipt?.status}`);
  });

task("task:withdraw", "Withdraw staked fUSDT from the vault")
  .addParam("amount", "Withdraw amount in token units (6 decimals)")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const parsedAmount = BigInt(taskArguments.amount);
    if (parsedAmount <= 0n) {
      throw new Error("Amount must be greater than zero");
    }

    const vaultDeployment = await deployments.get("FHEVault");
    const vault = await ethers.getContractAt("FHEVault", vaultDeployment.address);

    const [signer] = await ethers.getSigners();

    const tx = await vault.connect(signer).withdraw(parsedAmount);
    console.log(`Withdraw tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Withdraw tx status: ${receipt?.status}`);
  });

task("task:decrypt-stake", "Decrypt a user's encrypted stake value")
  .addOptionalParam("holder", "User address; defaults to first signer")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const vaultDeployment = await deployments.get("FHEVault");
    const vault = await ethers.getContractAt("FHEVault", vaultDeployment.address);

    const [signer] = await ethers.getSigners();
    const holder = taskArguments.holder ? taskArguments.holder : signer.address;

    const encryptedStake = await vault.getStakeCipher(holder);
    console.log(`Encrypted stake for ${holder}: ${encryptedStake}`);

    if (encryptedStake === ethers.ZeroHash) {
      console.log("Stake is zero");
      return;
    }

    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedStake,
      vaultDeployment.address,
      signer,
    );

    console.log(`Decrypted stake: ${clearValue}`);
  });
