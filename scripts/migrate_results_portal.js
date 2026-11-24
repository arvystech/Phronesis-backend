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
    const additions = [
      ["classes", "password", "ALTER TABLE classes ADD COLUMN password VARCHAR(255) NULL AFTER class_name"],
      ["result_subjects", "ca1_score", "ALTER TABLE result_subjects ADD COLUMN ca1_score DECIMAL(5,2) NULL AFTER subject_id"],
      ["result_subjects", "ca2_score", "ALTER TABLE result_subjects ADD COLUMN ca2_score DECIMAL(5,2) NULL AFTER ca1_score"],
      ["result_subjects", "ca3_score", "ALTER TABLE result_subjects ADD COLUMN ca3_score DECIMAL(5,2) NULL AFTER ca2_score"],
    ];
    for (const [table, column, alterSql] of additions) {
      const [rows] = await db.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
        [table, column]
      );
      if (!rows.length) await db.query(alterSql);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS results_active_period (
        setting_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        session_id INT NULL,
        term_id INT NULL,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_results_period_session FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE SET NULL,
        CONSTRAINT fk_results_period_term FOREIGN KEY(term_id) REFERENCES terms(term_id) ON DELETE SET NULL,
        CONSTRAINT fk_results_period_admin FOREIGN KEY(updated_by) REFERENCES admin(admin_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await db.query(`
      INSERT IGNORE INTO results_active_period(setting_id,session_id,term_id)
      SELECT 1,(SELECT MAX(session_id) FROM sessions),(SELECT MAX(term_id) FROM terms)
    `);
    console.log("Results portal schema is ready.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Results portal migration failed:", error.message);
  process.exitCode = 1;
});
