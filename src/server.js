const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config(); // fallback

const app = require("./app");
const port = process.env.PORT || 3000;

let serverInstance = null;
if (require.main === module) {
  serverInstance = app.listen(port, () => {
    console.log(`PHRONESIS API backend running on port ${port}`);
  });
}

module.exports = serverInstance || app;
