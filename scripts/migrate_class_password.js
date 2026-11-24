require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  try {
    const [columns] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='classes' AND COLUMN_NAME='password'"
    );
    if (!columns.length) {
      await db.query("ALTER TABLE classes ADD COLUMN password VARCHAR(255) NULL AFTER class_name");
      console.log("Added nullable classes.password column.");
    } else {
      console.log("classes.password already exists.");
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Class password migration failed:", error.message);
  process.exitCode = 1;
});
