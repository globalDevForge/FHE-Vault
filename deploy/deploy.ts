import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const token = await deploy("ERC7984USDT", {
    from: deployer,
    log: true,
  });

  const vault = await deploy("FHEVault", {
    from: deployer,
    args: [token.address],
    log: true,
  });

  console.log(`ERC7984USDT contract: ${token.address}`);
  console.log(`FHEVault contract: ${vault.address}`);
};
export default func;
func.id = "deploy_fheVault"; // id required to prevent reexecution
func.tags = ["FHEVault"];
