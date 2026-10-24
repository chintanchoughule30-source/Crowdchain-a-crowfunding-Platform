# CrowdChain

CrowdChain is a **local-only crowdfunding demonstration**. A React client talks to a local Express API; the API assigns users disposable Hardhat accounts and submits transactions to the Solidity escrow contract. Campaign artwork, metadata, and milestone evidence are pinned to IPFS through Pinata.

- **Author:** Chintan Choughule
- **GitHub:** [chintanchoughule30-source](https://github.com/chintanchoughule30-source)
- **Repository:** [Crowdchain-a-crowfunding-Platform](https://github.com/chintanchoughule30-source/Crowdchain-a-crowfunding-Platform)

> **Local demo only:** the backend signs with unlocked Hardhat test accounts. Do not configure it for a public chain, use real funds, or expose the API/RPC to a network. Local account keys are public test keys.

## What the demo demonstrates

- Campaign metadata and artwork are pinned to IPFS; only the metadata CID and campaign terms are stored on-chain.
- New campaigns wait for an administrator’s on-chain moderation decision before they can receive donations.
- Donations stay in escrow. After a successful campaign, the creator submits a milestone request with evidence pinned to IPFS.
- Donor voting power equals each donor’s total contribution. A request is paid only when yes votes exceed 50% of all campaign contributions and the three-day voting period has ended.
- Failed or cancelled campaigns allow donors to claim eligible refunds.
- The backend provides local registration/login, password hashing, role checks, HTTP-only sessions, an admin moderation queue with on-chain overview statistics, and persistent transaction-idempotency records.
- Campaigns, donor lists, milestone requests, and chain events are readable without signing in; authentication is required to submit actions.

## Requirements

- Node.js 18 or later and npm
- A Pinata account/JWT to create campaigns and upload evidence
- A modern browser; **MetaMask is not required**

## Configure local secrets

From the repository root, make a private local API configuration file:

```powershell
Copy-Item "server\.env.example" "server\.env"
notepad "server\.env"
```

Set these values in `server/.env`:

```dotenv
PINATA_JWT=your-Pinata-JWT
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
RPC_URL=http://127.0.0.1:8545
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-unique-password-at-least-12-characters-long
```

Use your own admin password. Do not share or commit the JWT or password. The API binds to loopback and only signs on the Hardhat chain. `server/.env` and generated `server/data/` files are git-ignored.

To obtain the JWT, create an API key in Pinata’s dashboard under **API Keys**. Copy the JWT when Pinata displays it and store it only in `server/.env`. The API pins the image/evidence file and then the campaign metadata JSON.

## Start the local demo

Run each long-lived service in its own PowerShell terminal and keep it open. Open the repository root in each terminal.

### 1. Start Hardhat

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\web3"
npm install
npm run node
```

The RPC endpoint is `http://127.0.0.1:8545` and the chain ID is `31337`. If `EADDRINUSE` appears, a node is already listening; do not start a duplicate.

### 2. Compile and deploy

In a second terminal, after Hardhat is ready:

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\web3"
npm run deploy:local
```

Deployment generates the contract address and ABI in `client/src/contract/`. Deploy again whenever you restart the Hardhat node; a fresh node has no campaigns or previous contract deployment.

### 3. Start the local API

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\server"
npm install
npm start
```

The API listens at `http://127.0.0.1:3001`. Verify its health at `http://127.0.0.1:3001/api/health`; `chainId` should be `31337`. Check `pinataConfigured` and `adminConfigured` in the JSON response without sharing secrets.

If the API reports that a Pinata upload or IPFS gateway is unreachable, the local API and blockchain may still be running; campaign files and metadata need internet access to Pinata. Check your internet connection, DNS, firewall, and VPN/proxy settings, then retry. If the API reports a Pinata pinning error instead, verify that `PINATA_JWT` is valid in `server/.env`. Restart the API after changing `.env`.

### 4. Start the client

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\client"
npm install
npm run dev
```

Open `http://localhost:5173`. Keep this hostname: the browser session cookie and API CORS settings are configured for `localhost:5173`.

## Use the application

1. Select **Create an account** and register a local demo username/password. The API assigns an unused Hardhat test account; each new user gets a different local signer.
2. Sign in as the configured admin using `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The admin receives Hardhat account 0, which is also the contract deployer/admin.
3. As a regular user, create a campaign with an image. The API pins its image and metadata to Pinata and the backend records a pending-review campaign transaction.
4. As admin, open **Admin** and approve or reject the campaign with a review note. Only approved campaigns accept donations.
5. Sign in as another user and donate at least `0.001 ETH` of local test funds.
6. After the goal is met and the campaign deadline passes, the creator can attach milestone evidence, pin it to IPFS, and submit a spending request.
7. Donors vote once per request. After the three-day voting period, a signed-in user can finalize the result; approved funds are paid to the nominated recipient.

Users and hashed passwords are stored locally in `server/data/users.json`; only disposable Hardhat addresses are assigned. Sessions are in memory and expire after 12 hours. Restarting the API signs users out; sign in again. Resetting all local demo accounts requires stopping the API and removing the specific `server/data/users.json` file.

## Local time acceleration for presentations

Voting and campaign deadlines are real timestamps on the local chain. For a demo, use a second terminal:

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\web3"
npx hardhat console --network localhost
```

At the Hardhat console prompt, advance two days for a short campaign:

```js
await network.provider.send("evm_increaseTime", [172800])
await network.provider.send("evm_mine")
```

Advance four days after a milestone vote to reach its finalization time:

```js
await network.provider.send("evm_increaseTime", [345600])
await network.provider.send("evm_mine")
```

These commands affect only the disposable local chain.

## Tests and checks

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\web3"
npm test
```

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\server"
npm test
```

The API integration tests expect the local Hardhat RPC to be running. The frontend production build can be checked with:

```powershell
Set-Location "C:\path\to\project_crowdfunding-master\client"
npm run build
```

## Architecture and limitations

- `web3/`: escrow contract, local deployment script, and contract tests.
- `server/`: loopback-only local API, scrypt password hashes, local account assignment, server-side signing, Pinata uploads, moderation and chain reads.
- `client/`: React/Vite dashboard, authentication, campaign UI, admin queue, and event explorer.

This is intentionally a classroom/local-network architecture, **not production authentication or custody**. The Hardhat RPC exposes unlocked, publicly known accounts; anyone who can access the local RPC can use them. Sessions and rate limiting are in-memory, and local JSON stores are not a production database. A public deployment would need user-controlled signing or audited key management, persistent secure session storage, stronger rate limiting, private RPC access, monitoring, and security review.

Transaction attempts are stored locally with their signer nonce and starting block. If the API restarts after a transaction is broadcast, retrying the same action from the same browser reuses its idempotency key; the API searches the local chain for that signer/nonce before deciding whether to retry. Keep `server/data/transactions.json` while recovering an in-progress local demo.

## Author

Created and maintained by **Chintan Choughule**.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for the full license text.
