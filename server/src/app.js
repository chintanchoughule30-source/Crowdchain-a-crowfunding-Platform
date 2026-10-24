const crypto = require("node:crypto");
const path = require("node:path");
const { promisify } = require("node:util");
const cors = require("cors");
const express = require("express");
const multer = require("multer");
const { Contract, JsonRpcProvider, formatEther, parseEther, isAddress } = require("ethers");
const { readUsers, writeUsers, readTransactions, writeTransactions } = require("./storage");

const scrypt = promisify(crypto.scrypt);
const SESSION_TTL = 12 * 60 * 60 * 1000;
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
const STATUSES = ["Active", "Successful", "Failed", "Cancelled", "Pending review", "Rejected"];

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function createApp() {
  const app = express();
  const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const pinataJwt = process.env.PINATA_JWT;
  const provider = new JsonRpcProvider(rpcUrl, 31337, { staticNetwork: true });
  const fetchUpstream = async (url, options, service) => {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
    } catch (error) {
      const reason = error.cause?.code ? ` (${error.cause.code})` : "";
      throw makeError(502,
        `${service} is unreachable${reason}. Check your internet connection, DNS, firewall, or VPN, then retry.`);
    }
  };
  const addressFile = path.join(__dirname, "..", "..", "client", "src", "contract", "contract-address.json");
  const abiFile = path.join(__dirname, "..", "..", "client", "src", "contract", "CrowdFunding.abi.json");
  const addressConfig = require(addressFile);
  const abi = require(abiFile);
  const sessions = new Map();
  const failedLogins = new Map();
  const accountLocks = new Map();
  const users = readUsers();
  const transactionRecords = readTransactions();

  const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      callback(
        allowed.includes(file.mimetype)
          ? null
          : Object.assign(new Error("Choose a JPEG, PNG, or WebP image."), { status: 400 }),
        allowed.includes(file.mimetype)
      );
    },
  });
  const uploadEvidence = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];
      callback(
        allowed.includes(file.mimetype)
          ? null
          : Object.assign(new Error("Evidence must be a PDF, image, or plain-text document."), { status: 400 }),
        allowed.includes(file.mimetype)
      );
    },
  });

  const getContract = async (user) => {
    if (!addressConfig.CrowdFunding) throw makeError(503, "Deploy the CrowdFunding contract to the local Hardhat node first.");
    const chainId = await provider.send("eth_chainId", []);
    if (BigInt(chainId) !== 31337n) throw makeError(503, "The configured RPC is not the Hardhat local chain (31337).");
    const signer = await provider.getSigner(user.address);
    return new Contract(addressConfig.CrowdFunding, abi, signer);
  };

  const parseCookies = (header = "") => Object.fromEntries(
    header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const separator = part.indexOf("=");
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    })
  );

  const getSessionUser = (req) => {
    const token = parseCookies(req.headers.cookie).crowdchain_session;
    const session = token && sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return null;
    }
    return users.find((user) => user.username === session.username) || null;
  };

  const requireAuth = (req, _res, next) => {
    adminSetup.then(() => {
      req.user = getSessionUser(req);
      if (!req.user) return next(makeError(401, "Sign in to continue."));
      return next();
    }).catch(next);
  };

  const requireAdmin = (req, _res, next) => {
    if (req.user.role !== "admin") return next(makeError(403, "Administrator access required."));
    return next();
  };

  const assertSameOrigin = (req, _res, next) => {
    const origin = req.get("origin");
    if (origin && origin !== allowedOrigin) return next(makeError(403, "Request origin is not allowed."));
    return next();
  };

  const readHardhatAccounts = async () => {
    try {
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length < 2) throw new Error("The local node returned fewer than two accounts.");
      return accounts;
    } catch (error) {
      throw makeError(503, `Hardhat RPC is unavailable at ${rpcUrl}: ${error.message}`);
    }
  };

  const passwordHash = async (password, salt) =>
    Buffer.from(await scrypt(password, salt, 64)).toString("hex");

  const adminSetup = (async () => {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username && !password) return;
    if (typeof username !== "string" || !/^[A-Za-z0-9_.-]{3,32}$/.test(username)
      || typeof password !== "string" || password.length < 12) {
      throw new Error("ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters are required for the local admin account.");
    }
    const accounts = await readHardhatAccounts();
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHashValue = await passwordHash(password, salt);
    const existing = users.find((user) => user.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      existing.username = username;
      existing.address = accounts[0];
      existing.role = "admin";
      existing.salt = salt;
      existing.passwordHash = passwordHashValue;
    } else {
      users.push({ username, address: accounts[0], role: "admin", salt, passwordHash: passwordHashValue });
    }
    writeUsers(users);
  })();

  const checkPassword = async (password, user) => {
    const candidate = Buffer.from(await passwordHash(password, user.salt), "hex");
    const expected = Buffer.from(user.passwordHash, "hex");
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  };

  const createSession = (res, user) => {
    const token = crypto.randomBytes(32).toString("base64url");
    sessions.set(token, { username: user.username, expiresAt: Date.now() + SESSION_TTL });
    res.cookie("crowdchain_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: SESSION_TTL,
    });
  };

  const publicUser = (user) => ({
    username: user.username,
    address: user.address,
    role: user.role,
    balance: user.balance || "0",
  });

  const saveTransaction = () => writeTransactions(transactionRecords);

  const withAccountLock = async (address, operation) => {
    const key = address.toLowerCase();
    const previous = accountLocks.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    accountLocks.set(key, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (accountLocks.get(key) === current) accountLocks.delete(key);
    }
  };

  const reconcile = async (record) => {
    if (record.status === "confirmed" || record.status === "rejected") return record;
    if (!record.hash && Number.isInteger(record.nonce) && Number.isInteger(record.startBlock)) {
      const latestBlock = await provider.getBlockNumber();
      if (latestBlock < record.startBlock) {
        record.status = "rejected";
        saveTransaction();
        return record;
      }
      const fromBlock = Math.max(record.startBlock, latestBlock - 4999);
      for (let blockNumber = fromBlock; blockNumber <= latestBlock; blockNumber += 1) {
        const block = await provider.getBlock(blockNumber, true);
        for (const item of block?.transactions || []) {
          const transaction = typeof item === "string" ? await provider.getTransaction(item) : item;
          if (transaction
            && transaction.from.toLowerCase() === record.address.toLowerCase()
            && transaction.nonce === record.nonce) {
            record.hash = transaction.hash;
            record.status = "pending";
            saveTransaction();
            break;
          }
        }
        if (record.hash) break;
      }
    }
    if (record.hash) {
      const receipt = await provider.getTransactionReceipt(record.hash);
      if (receipt) {
        record.status = receipt.status === 1 ? "confirmed" : "rejected";
        record.block = Number(receipt.blockNumber);
        if (record.status === "confirmed") {
          record.result = {
            status: "confirmed",
            hash: receipt.hash,
            block: Number(receipt.blockNumber),
            address: record.address,
          };
        }
        saveTransaction();
      }
    }
    return record;
  };

  const transact = async (req, res, action, submit) => {
    const idempotencyKey = req.get("idempotency-key");
    if (!idempotencyKey || !/^[\w-]{16,100}$/.test(idempotencyKey)) {
      throw makeError(400, "A unique Idempotency-Key header (16-100 letters, numbers, _ or -) is required.");
    }
    const key = `${req.user.address.toLowerCase()}:${idempotencyKey}`;
    const requestHash = crypto.createHash("sha256")
      .update(JSON.stringify({ action, path: req.path, body: req.body || {} }))
      .digest("hex");
    return withAccountLock(req.user.address, async () => {
      let record = transactionRecords[key];
      if (record) {
        if (record.requestHash && record.requestHash !== requestHash) {
          throw makeError(409, "This Idempotency-Key was already used for a different transaction.");
        }
        await reconcile(record);
        if (record.status === "confirmed") return res.json(record.result);
        if (record.status === "pending") {
          return res.status(202).json({ status: record.status, hash: record.hash || null });
        }
        if (record.status === "rejected") {
          throw makeError(409, "This transaction attempt was rejected. Use a new idempotency key to retry.");
        }
        if (!Number.isInteger(record.nonce)) {
          return res.status(202).json({ status: "preparing", hash: null });
        }
        const pendingNonce = await provider.getTransactionCount(record.address, "pending");
        if (pendingNonce > record.nonce) {
          return res.status(202).json({ status: "preparing", hash: null });
        }
      } else {
        record = {
          action,
          username: req.user.username,
          address: req.user.address,
          status: "preparing",
          requestHash,
          nonce: await provider.getTransactionCount(req.user.address, "pending"),
          startBlock: await provider.getBlockNumber(),
          createdAt: new Date().toISOString(),
        };
        transactionRecords[key] = record;
        saveTransaction();
      }

      try {
        const transaction = await submit(record.nonce);
        record.hash = transaction.hash;
        record.status = "pending";
        saveTransaction();
        const receipt = await transaction.wait();
        if (receipt.status !== 1) {
          record.status = "rejected";
          saveTransaction();
          throw makeError(409, "The blockchain rejected the transaction.");
        }
        record.status = "confirmed";
        record.block = Number(receipt.blockNumber);
        record.result = {
          status: "confirmed",
          hash: receipt.hash,
          block: Number(receipt.blockNumber),
          address: req.user.address,
        };
        saveTransaction();
        return res.json(record.result);
      } catch (error) {
        if (!record.hash) {
          const pendingNonce = await provider.getTransactionCount(record.address, "pending");
          record.status = pendingNonce > record.nonce ? "preparing" : "rejected";
          saveTransaction();
        }
        throw error;
      }
    });
  };

  const pinFile = async (file, name) => {
    if (!pinataJwt || pinataJwt === "replace-with-your-pinata-jwt") {
      throw makeError(503, "Configure PINATA_JWT in server/.env before pinning files.");
    }
    const form = new FormData();
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    form.append("pinataMetadata", JSON.stringify({ name }));
    const response = await fetchUpstream("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${pinataJwt}` },
      body: form,
    }, "Pinata file upload");
    const result = await response.json();
    if (!response.ok || !result.IpfsHash) {
      throw makeError(response.status === 401 || response.status === 403 ? 502 : 502,
        result.error?.details || result.error || "Pinata failed to pin the uploaded file.");
    }
    return result.IpfsHash;
  };

  const mapCampaign = async (contract, item, index) => {
    const response = await fetchUpstream(`${IPFS_GATEWAY}${item.metadataCID}`, {}, "Pinata IPFS gateway");
    if (!response.ok) throw makeError(502, `Could not retrieve metadata for campaign #${index} from IPFS.`);
    const metadata = await response.json();
    const status = Number(await contract.getCampaignStatus(index));
    return {
      pId: index,
      owner: item.owner,
      metadataCID: item.metadataCID,
      title: metadata.name,
      description: metadata.description,
      creatorName: metadata.creatorName,
      target: formatEther(item.target),
      deadline: Number(item.deadline) * 1000,
      amountCollected: formatEther(item.amountCollected),
      amountReleased: formatEther(item.amountReleased),
      reservedAmount: formatEther(item.reservedAmount),
      image: metadata.image?.startsWith("ipfs://") ? `${IPFS_GATEWAY}${metadata.image.slice(7)}` : metadata.image,
      category: metadata.category,
      donators: item.donators,
      donations: item.donations.map(formatEther),
      status: STATUSES[status],
      moderationStatus: Number(item.moderationStatus),
    };
  };

  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json({ limit: "64kb" }));
  app.use(assertSameOrigin);

  app.get("/api/health", async (_req, res) => {
    try {
      const chainId = await provider.send("eth_chainId", []);
      res.json({
        ok: true,
        chainId: Number(BigInt(chainId)),
        contractAddress: addressConfig.CrowdFunding,
        pinataConfigured: Boolean(pinataJwt && pinataJwt !== "replace-with-your-pinata-jwt"),
        adminConfigured: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD),
      });
    } catch (error) {
      res.status(503).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/auth/session", async (req, res, next) => {
    try {
      const user = getSessionUser(req);
      if (!user) return res.json({ user: null });
      const balance = await provider.getBalance(user.address);
      user.balance = formatEther(balance);
      return res.json({ user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      await adminSetup;
      const { username, password } = req.body || {};
      if (typeof username !== "string" || !/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
        throw makeError(400, "Username must be 3-32 characters using letters, numbers, dot, dash or underscore.");
      }
      if (typeof password !== "string" || password.length < 10 || password.length > 128) {
        throw makeError(400, "Password must be between 10 and 128 characters.");
      }
      if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        throw makeError(409, "That username is already registered.");
      }
      const accounts = await readHardhatAccounts();
      const usedAddresses = new Set(users.map((user) => user.address.toLowerCase()));
      const address = accounts.slice(1).find((candidate) => !usedAddresses.has(candidate.toLowerCase()));
      if (!address) throw makeError(503, "All local demo signer accounts are assigned. Reset server/data/users.json to restart this local demo.");
      const salt = crypto.randomBytes(16).toString("hex");
      const user = {
        username,
        address,
        role: "user",
        salt,
        passwordHash: await passwordHash(password, salt),
      };
      users.push(user);
      writeUsers(users);
      user.balance = formatEther(await provider.getBalance(user.address));
      createSession(res, user);
      return res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      await adminSetup;
      const ip = req.ip;
      let attempts = failedLogins.get(ip);
      if (!attempts || attempts.resetAt <= Date.now()) {
        attempts = { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
      }
      if (attempts.count >= 10 && attempts.resetAt > Date.now()) throw makeError(429, "Too many login attempts. Try again in 15 minutes.");
      const { username, password } = req.body || {};
      const user = typeof username === "string" ? users.find((item) => item.username.toLowerCase() === username.toLowerCase()) : null;
      const valid = user && typeof password === "string" && await checkPassword(password, user);
      if (!valid) {
        attempts.count += 1;
        failedLogins.set(ip, attempts);
        throw makeError(401, "Invalid username or password.");
      }
      failedLogins.delete(ip);
      user.balance = formatEther(await provider.getBalance(user.address));
      createSession(res, user);
      return res.json({ user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const token = parseCookies(req.headers.cookie).crowdchain_session;
    sessions.delete(token);
    res.clearCookie("crowdchain_session", { httpOnly: true, sameSite: "strict", path: "/" });
    res.json({ ok: true });
  });

  app.get("/api/campaigns", async (_req, res, next) => {
    try {
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      const items = await contract.getCampaigns();
      const campaigns = await Promise.all(items.map((item, index) => mapCampaign(contract, item, index)));
      res.json({ campaigns });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/campaigns/:id/requests", async (req, res, next) => {
    try {
      const campaignId = Number(req.params.id);
      const user = getSessionUser(req);
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      if (!Number.isSafeInteger(campaignId) || campaignId < 0) {
        throw makeError(400, "Campaign ID must be a non-negative integer.");
      }
      if (campaignId >= Number(await contract.numberOfCampaigns())) {
        throw makeError(404, "Campaign does not exist.");
      }
      const items = await contract.getRequests(campaignId);
      const requests = await Promise.all(items.map(async (request, index) => ({
        requestId: index,
        description: request.description,
        evidenceCID: request.evidenceCID,
        evidenceUrl: `${IPFS_GATEWAY}${request.evidenceCID}`,
        amount: formatEther(request.amount),
        recipient: request.recipient,
        votingDeadline: Number(request.votingDeadline) * 1000,
        yesVotes: formatEther(request.yesVotes),
        noVotes: formatEther(request.noVotes),
        finalized: request.finalized,
        approved: request.approved,
        hasVoted: user ? await contract.hasVoted(campaignId, index, user.address) : false,
      })));
      res.json({ requests });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/campaigns/:id/donations", async (req, res, next) => {
    try {
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      const [donators, donations] = await contract.getDonators(Number(req.params.id));
      res.json({ donations: donators.map((donator, index) => ({ donator, donation: formatEther(donations[index]) })) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/campaigns/:id/me", requireAuth, async (req, res, next) => {
    try {
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      const campaignId = Number(req.params.id);
      const [contribution, refunded] = await Promise.all([
        contract.donorContributions(campaignId, req.user.address),
        contract.hasRefunded(campaignId, req.user.address),
      ]);
      res.json({ contribution: formatEther(contribution), refunded });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/campaigns", requireAuth, requireAdmin, async (_req, res, next) => {
    try {
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      const items = await contract.getCampaigns();
      const campaigns = await Promise.all(items.flatMap((item, index) =>
        Number(item.moderationStatus) === 0 ? [mapCampaign(contract, item, index)] : []));
      res.json({ campaigns });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/stats", requireAuth, requireAdmin, async (_req, res, next) => {
    try {
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      const items = await contract.getCampaigns();
      const statuses = await Promise.all(items.map((_item, index) => contract.getCampaignStatus(index)));
      const stats = items.reduce((totals, item) => ({
        totalRaised: totals.totalRaised + item.amountCollected,
        totalReleased: totals.totalReleased + item.amountReleased,
        totalReserved: totals.totalReserved + item.reservedAmount,
      }), { totalRaised: 0n, totalReleased: 0n, totalReserved: 0n });
      res.json({
        campaignCount: items.length,
        pendingReview: items.filter((item) => Number(item.moderationStatus) === 0).length,
        successful: statuses.filter((status) => Number(status) === 1).length,
        failed: statuses.filter((status) => Number(status) === 2).length,
        totalRaised: formatEther(stats.totalRaised),
        totalReleased: formatEther(stats.totalReleased),
        totalReserved: formatEther(stats.totalReserved),
        contractBalance: formatEther(await provider.getBalance(addressConfig.CrowdFunding)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/campaign-metadata", requireAuth, uploadImage.single("image"), async (req, res, next) => {
    try {
      const { title, description, category, creatorName } = req.body || {};
      if (!title?.trim() || !description?.trim() || !category?.trim() || !req.file) {
        throw makeError(400, "Title, description, category, and campaign image are required.");
      }
      if (title.length > 120 || description.length > 5000) throw makeError(400, "Title or description exceeds the supported length.");
      const imageCID = await pinFile(req.file, `crowdchain-image-${Date.now()}`);
      const metadata = {
        name: title.trim(),
        description: description.trim(),
        category: category.trim(),
        creatorName: (creatorName || "").trim(),
        image: `ipfs://${imageCID}`,
        version: 1,
      };
      const response = await fetchUpstream("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${pinataJwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          pinataMetadata: { name: `crowdchain-campaign-${Date.now()}` },
          pinataContent: metadata,
        }),
      }, "Pinata metadata upload");
      const result = await response.json();
      if (!response.ok || !result.IpfsHash) throw makeError(502, result.error?.details || result.error || "Pinata failed to pin campaign metadata.");
      res.status(201).json({ cid: result.IpfsHash });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/milestone-evidence", requireAuth, uploadEvidence.single("evidence"), async (req, res, next) => {
    try {
      if (!req.file) throw makeError(400, "Select a milestone evidence document.");
      const cid = await pinFile(req.file, `crowdchain-evidence-${Date.now()}`);
      res.status(201).json({ cid, url: `${IPFS_GATEWAY}${cid}` });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/campaigns", requireAuth, async (req, res, next) => {
    try {
      const { cid, target, deadline } = req.body || {};
      if (typeof cid !== "string" || !cid.trim()) throw makeError(400, "Metadata CID is required.");
      if (!target || !Number.isFinite(Number(target)) || Number(target) <= 0) throw makeError(400, "Target must be greater than zero.");
      const timestamp = Math.floor(new Date(deadline).getTime() / 1000);
      if (!Number.isFinite(timestamp) || timestamp <= Math.floor(Date.now() / 1000)) throw makeError(400, "Campaign deadline must be in the future.");
      const contract = await getContract(req.user);
      return await transact(req, res, "createCampaign", (nonce) =>
        contract.createCampaign(cid, parseEther(String(target)), timestamp, { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/campaigns/:id/donations", requireAuth, async (req, res, next) => {
    try {
      const amount = req.body?.amount;
      if (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 0.001) throw makeError(400, "Donation must be at least 0.001 ETH.");
      const contract = await getContract(req.user);
      return await transact(req, res, "donate", (nonce) =>
        contract.donateToCampaign(Number(req.params.id), { value: parseEther(String(amount)), nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/campaigns/:id/refund", requireAuth, async (req, res, next) => {
    try {
      const contract = await getContract(req.user);
      return await transact(req, res, "claimRefund", (nonce) =>
        contract.claimRefund(Number(req.params.id), { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/campaigns/:id/cancel", requireAuth, async (req, res, next) => {
    try {
      const contract = await getContract(req.user);
      return await transact(req, res, "cancelCampaign", (nonce) =>
        contract.cancelCampaign(Number(req.params.id), { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/campaigns/:id/requests", requireAuth, async (req, res, next) => {
    try {
      const { description, evidenceCID, recipient, amount } = req.body || {};
      if (!description?.trim() || !evidenceCID?.trim() || !isAddress(recipient) || !amount || Number(amount) <= 0) {
        throw makeError(400, "Description, evidence CID, valid recipient and positive amount are required.");
      }
      const contract = await getContract(req.user);
      return await transact(req, res, "createRequest", (nonce) =>
        contract.createRequest(Number(req.params.id), description.trim(), evidenceCID.trim(), recipient, parseEther(String(amount)), { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/campaigns/:id/requests/:requestId/votes", requireAuth, async (req, res, next) => {
    try {
      if (typeof req.body?.approve !== "boolean") throw makeError(400, "Vote must be true or false.");
      const contract = await getContract(req.user);
      return await transact(req, res, "voteRequest", (nonce) =>
        contract.approveRequest(Number(req.params.id), Number(req.params.requestId), req.body.approve, { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/campaigns/:id/requests/:requestId/finalize", requireAuth, async (req, res, next) => {
    try {
      const contract = await getContract(req.user);
      return await transact(req, res, "finalizeRequest", (nonce) =>
        contract.finalizeRequest(Number(req.params.id), Number(req.params.requestId), { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/campaigns/:id/review", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      if (typeof req.body?.approved !== "boolean") throw makeError(400, "Choose approve or reject.");
      if (typeof req.body?.reason !== "string" || req.body.reason.trim().length < 3 || req.body.reason.length > 500) {
        throw makeError(400, "Provide a review note between 3 and 500 characters.");
      }
      const contract = await getContract(req.user);
      return await transact(req, res, "moderateCampaign", (nonce) =>
        contract.moderateCampaign(Number(req.params.id), req.body.approved, req.body.reason.trim(), { nonce }));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/transactions", requireAuth, async (_req, res, next) => {
    try {
      const events = [
        "CampaignCreated", "CampaignModerated", "DonationReceived", "FundsWithdrawn",
        "RefundClaimed", "CampaignCancelled", "RequestCreated", "RequestVoted", "RequestFinalized",
      ];
      const contract = new Contract(addressConfig.CrowdFunding, abi, provider);
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 4999);
      const logs = (await Promise.all(events.map((name) => contract.queryFilter(contract.filters[name](), fromBlock, latestBlock))))
        .flat()
        .sort((a, b) => b.blockNumber - a.blockNumber)
        .slice(0, 100);
      const amountPositions = {
        DonationReceived: 2,
        FundsWithdrawn: 3,
        RefundClaimed: 2,
        RequestCreated: 3,
        RequestVoted: 4,
      };
      const accountPositions = {
        CampaignCreated: 1,
        CampaignModerated: 1,
        DonationReceived: 1,
        FundsWithdrawn: 2,
        RefundClaimed: 1,
        CampaignCancelled: 1,
        RequestCreated: 2,
        RequestVoted: 2,
      };
      const blockCache = new Map();
      const transactions = await Promise.all(logs.map(async (log) => {
        const name = log.fragment.name;
        const amountPosition = amountPositions[name];
        if (!blockCache.has(log.blockNumber)) {
          blockCache.set(log.blockNumber, provider.getBlock(log.blockNumber));
        }
        const block = await blockCache.get(log.blockNumber);
        return {
          hash: log.transactionHash,
          type: name,
          account: accountPositions[name] === undefined ? "" : log.args[accountPositions[name]],
          block: log.blockNumber,
          timestamp: block ? block.timestamp * 1000 : null,
          status: "Confirmed",
          amount: amountPosition === undefined ? "—" : `${formatEther(log.args[amountPosition])} ETH`,
        };
      }));
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    const status = error instanceof multer.MulterError ? 400 : error.status || 500;
    console.error("CrowdChain API request failed:", error.message);
    res.status(status).json({ error: error.message || "Request failed." });
  });

  return app;
}

module.exports = { createApp };
