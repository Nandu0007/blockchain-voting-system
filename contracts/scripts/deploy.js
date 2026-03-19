// scripts/deploy.js - Deployment script for smart contracts

const hre = require("hardhat");

async function main() {
  console.log("Deploying Blockchain Voting System Contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy VoterRegistry
  console.log("\n1. Deploying VoterRegistry...");
  const VoterRegistry = await hre.ethers.getContractFactory("VoterRegistry");
  const voterRegistry = await VoterRegistry.deploy();
  await voterRegistry.waitForDeployment();
  const voterRegistryAddress = await voterRegistry.getAddress();
  console.log("VoterRegistry deployed to:", voterRegistryAddress);

  // Deploy VoteDelegation
  console.log("\n2. Deploying VoteDelegation...");
  const VoteDelegation = await hre.ethers.getContractFactory("VoteDelegation");
  const voteDelegation = await VoteDelegation.deploy();
  await voteDelegation.waitForDeployment();
  const voteDelegationAddress = await voteDelegation.getAddress();
  console.log("VoteDelegation deployed to:", voteDelegationAddress);

  // Deploy MultiSigVoting
  console.log("\n3. Deploying MultiSigVoting...");
  const MultiSigVoting = await hre.ethers.getContractFactory("MultiSigVoting");
  const multiSigVoting = await MultiSigVoting.deploy();
  await multiSigVoting.waitForDeployment();
  const multiSigVotingAddress = await multiSigVoting.getAddress();
  console.log("MultiSigVoting deployed to:", multiSigVotingAddress);

  // Set required approvals to 2 (can be adjusted)
  await multiSigVoting.setRequiredApprovalsCount(1);
  console.log("Set required approvals to 1 for bootstrap");

  // Deploy VotingRegistry
  console.log("\n4. Deploying VotingRegistry...");
  const VotingRegistry = await hre.ethers.getContractFactory("VotingRegistry");
  const votingRegistry = await VotingRegistry.deploy();
  await votingRegistry.waitForDeployment();
  const votingRegistryAddress = await votingRegistry.getAddress();
  console.log("VotingRegistry deployed to:", votingRegistryAddress);

  // Deploy a sample AdvancedBallot
  console.log("\n5. Deploying AdvancedBallot (sample)...");
  const AdvancedBallot = await hre.ethers.getContractFactory("AdvancedBallot");
  const options = ["Option A", "Option B", "Option C"];
  const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
  const endTime = startTime + 86400; // 24 hours later

  const advancedBallot = await AdvancedBallot.deploy(
    1,
    "Sample Ballot",
    "This is a sample ballot",
    0, // SINGLE_CHOICE
    startTime,
    endTime,
    options,
    false, // not encrypted
    deployer.address
  );
  await advancedBallot.waitForDeployment();
  const advancedBallotAddress = await advancedBallot.getAddress();
  console.log("AdvancedBallot deployed to:", advancedBallotAddress);

  // Save deployment addresses
  const deploymentAddresses = {
    voterRegistry: voterRegistryAddress,
    voteDelegation: voteDelegationAddress,
    multiSigVoting: multiSigVotingAddress,
    votingRegistry: votingRegistryAddress,
    advancedBallot: advancedBallotAddress,
    deployer: deployer.address,
    network: hre.network.name,
  };

  console.log("\n✅ Deployment complete!");
  console.log("\nDeployment Addresses:");
  console.log(JSON.stringify(deploymentAddresses, null, 2));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    "deployment-addresses.json",
    JSON.stringify(deploymentAddresses, null, 2)
  );
  console.log("\nAddresses saved to deployment-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
