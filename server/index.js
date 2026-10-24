require("dotenv").config();

const { createApp } = require("./src/app");

const port = Number(process.env.PORT || 3001);
const app = createApp();

app.listen(port, "127.0.0.1", () => {
  console.log(`CrowdChain local API listening at http://127.0.0.1:${port}`);
});
