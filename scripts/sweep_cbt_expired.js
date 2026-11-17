require("dotenv").config();
const db = require("../src/config/dbConnection");
const cbtModel = require("../src/modules/cbt/cbt.model");

async function main() {
  try {
    const result = await cbtModel.sweepExpiredAttempts();
    console.log(`CBT expiry sweep: scanned=${result.scanned}, finalized=${result.finalized}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("CBT expiry sweep failed:", error.message);
  process.exitCode = 1;
});
