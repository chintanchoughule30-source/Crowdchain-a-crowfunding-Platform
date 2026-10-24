const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const supertest = require("supertest");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "crowdchain-api-"));
process.env.DATA_DIR = dataDirectory;
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "local-test-admin-password";
const { createApp } = require("../src/app");

test("local API auth, account assignment, access control, and validation", async (t) => {
  t.after(() => fs.rmSync(dataDirectory, { recursive: true, force: true }));
  let chainAvailable = false;
  try {
    const response = await fetch(process.env.RPC_URL || "http://127.0.0.1:8545", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
    });
    chainAvailable = response.ok && (await response.json()).result === "0x7a69";
  } catch {
    chainAvailable = false;
  }
  if (!chainAvailable) {
    t.skip("Start the local Hardhat node before running the backend integration tests.");
    return;
  }

  const agent = supertest.agent(createApp());
  const username = `demo-${Date.now()}`;
  const password = "local-demo-password";

  const health = await agent.get("/api/health").expect(200);
  assert.equal(health.body.chainId, 31337);

  await agent.post("/api/auth/register").send({ username, password: "short" }).expect(400);
  const registration = await agent.post("/api/auth/register").send({ username, password }).expect(201);
  assert.match(registration.body.user.address, /^0x[a-fA-F0-9]{40}$/);
  assert.equal(registration.body.user.role, "user");
  await agent.post("/api/auth/register").send({ username, password }).expect(409);

  await agent.get("/api/admin/campaigns").expect(403);
  await agent.post("/api/campaigns/0/donations")
    .set("Idempotency-Key", "invalid-donation-key-123")
    .send({ amount: "0.0001" })
    .expect(400);

  await agent.post("/api/auth/logout").expect(200);
  await agent.get("/api/campaigns/9007199254740991/requests").expect(404);
  await agent.post("/api/auth/login").send({ username, password: "wrong-password" }).expect(401);
  const login = await agent.post("/api/auth/login").send({ username, password }).expect(200);
  assert.equal(login.body.user.address, registration.body.user.address);

  const admin = supertest.agent(createApp());
  await admin.post("/api/auth/login").send({
    username: "test-admin",
    password: "local-test-admin-password",
  }).expect(200);
  await admin.get("/api/admin/campaigns").expect(200);
  const stats = await admin.get("/api/admin/stats").expect(200);
  assert.equal(typeof stats.body.campaignCount, "number");
  assert.equal(typeof stats.body.contractBalance, "string");
  await agent.post("/api/auth/logout").expect(200);

});
