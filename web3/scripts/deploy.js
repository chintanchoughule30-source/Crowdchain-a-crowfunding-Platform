const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  CrowdChain — Smart Contract Deployment");
  console.log("═══════════════════════════════════════════\n");

  // Get deployer info
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${hre.ethers.formatEther(balance)} ETH\n`);

  // Deploy CrowdFunding contract
  console.log("Deploying CrowdFunding contract...");
  const CrowdFunding = await hre.ethers.getContractFactory("CrowdFunding");
  const crowdFunding = await CrowdFunding.deploy();
  await crowdFunding.waitForDeployment();

  const contractAddress = await crowdFunding.getAddress();
  console.log(`✓ CrowdFunding deployed to: ${contractAddress}\n`);

  // Save contract address and ABI for the frontend
  const contractsDir = path.join(__dirname, "..", "..", "client", "src", "contract");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract address
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ CrowdFunding: contractAddress }, null, 2)
  );

  // Save ABI for local client builds.
  const artifact = await hre.artifacts.readArtifact("CrowdFunding");
  fs.writeFileSync(
    path.join(contractsDir, "CrowdFunding.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log("✓ Contract address saved to: client/src/contract/contract-address.json");
  console.log("✓ Contract ABI saved to:     client/src/contract/CrowdFunding.abi.json");
  console.log("\n═══════════════════════════════════════════");
  console.log("  Deployment Complete!");
  console.log("═══════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
