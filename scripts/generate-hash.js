const bcrypt = require("bcrypt");

async function generateDefaultPasswordHash() {
  const hash = await bcrypt.hash("Password123", 12);
  console.log(hash);
}

generateDefaultPasswordHash();