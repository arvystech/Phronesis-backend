const mysql = require("mysql2");
require("dotenv").config();

console.log("=== Running Idempotency & Concurrency Database Migration ===");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Error connecting to database:", err.message);
    process.exit(1);
  }

  // 1. Create idempotency_keys table
  const createIdempotencyTableSql = `
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      idempotency_key VARCHAR(255) NOT NULL,
      user_id VARCHAR(100) DEFAULT NULL,
      route VARCHAR(255) NOT NULL,
      request_hash VARCHAR(64) NOT NULL,
      status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
      response_status INT DEFAULT NULL,
      response_headers JSON DEFAULT NULL,
      response_body LONGTEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      UNIQUE KEY uq_idempotency_key (idempotency_key),
      INDEX idx_idempotency_user_route (user_id, route),
      INDEX idx_idempotency_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  connection.query(createIdempotencyTableSql, (err) => {
    if (err) {
      console.error("❌ Error creating idempotency_keys table:", err.message);
      connection.end();
      process.exit(1);
    }
    console.log("✅ 'idempotency_keys' table verified/created successfully.");

    // 2. Check if student_payments has unique index on transaction_ref
    connection.query("SHOW INDEX FROM student_payments WHERE Key_name = 'uq_payment_trx_ref'", (err, rows) => {
      if (err) {
        console.error("❌ Error checking indexes on student_payments:", err.message);
        connection.end();
        process.exit(1);
      }

      if (rows && rows.length > 0) {
        console.log("✅ Unique index 'uq_payment_trx_ref' already exists on student_payments(transaction_ref).");
        completeMigration();
      } else {
        console.log("Adding unique constraint 'uq_payment_trx_ref' on student_payments(transaction_ref)...");
        connection.query(
          "ALTER TABLE student_payments ADD UNIQUE KEY uq_payment_trx_ref (transaction_ref)",
          (alterErr) => {
            if (alterErr) {
              console.error("❌ Error adding unique index to student_payments:", alterErr.message);
              connection.end();
              process.exit(1);
            }
            console.log("✅ Successfully added unique index 'uq_payment_trx_ref' to student_payments.");
            completeMigration();
          }
        );
      }
    });
  });

  function completeMigration() {
    console.log("✅ Migration completed successfully!");
    connection.end();
  }
});
