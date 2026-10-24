const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const usersPath = path.join(dataDirectory, "users.json");
const transactionsPath = path.join(dataDirectory, "transactions.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, filePath);
}

module.exports = {
  readUsers: () => readJson(usersPath, []),
  writeUsers: (users) => writeJson(usersPath, users),
  readTransactions: () => readJson(transactionsPath, {}),
  writeTransactions: (transactions) => writeJson(transactionsPath, transactions),
};
