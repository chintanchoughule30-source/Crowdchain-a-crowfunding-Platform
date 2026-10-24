# ⛓️ CrowdChain Smart Contracts (`web3`)

Solidity contracts and Hardhat testing suite for the CrowdChain crowdfunding dApp.

## Requirements
- Node.js >= 18
- Hardhat >= 2.22

## Commands

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run contract test suite
npx hardhat test

# Run local Hardhat node
npx hardhat node

# Deploy to local node
npx hardhat run scripts/deploy.js --network localhost
```

## Contract Highlights
- Admin review is required before campaigns accept donations.
- Spending requests record an evidence IPFS CID.
- **ReentrancyGuard** from OpenZeppelin (`@openzeppelin/contracts/security/ReentrancyGuard.sol`)
- Structured EVM events for campaign, moderation, funding, and voting activity.
- Donor-weighted approvals and bounded escrow commitments.
- Pull-payment pattern for refunds; milestone payouts are guarded against reentrancy.
