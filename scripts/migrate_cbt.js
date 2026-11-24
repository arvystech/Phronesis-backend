require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });
  const statements = [
    `CREATE TABLE IF NOT EXISTS cbt_exams (
      exam_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(180) NOT NULL,
      class_id INT NOT NULL,
      subject_id INT NOT NULL,
      session_id INT NULL,
      term_id INT NULL,
      duration_seconds INT NOT NULL DEFAULT 1800,
      status ENUM('draft','published','closed','archived') NOT NULL DEFAULT 'draft',
      available_from DATETIME NULL,
      available_until DATETIME NULL,
      current_version INT NOT NULL DEFAULT 1,
      created_by BIGINT UNSIGNED NOT NULL,
      updated_by BIGINT UNSIGNED NOT NULL,
      published_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (exam_id), KEY idx_cbt_exams_class_status (class_id,status),
      CONSTRAINT fk_cbt_exam_class FOREIGN KEY (class_id) REFERENCES classes(class_id),
      CONSTRAINT fk_cbt_exam_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
      CONSTRAINT fk_cbt_exam_session FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL,
      CONSTRAINT fk_cbt_exam_term FOREIGN KEY (term_id) REFERENCES terms(term_id) ON DELETE SET NULL,
      CONSTRAINT fk_cbt_exam_created_by FOREIGN KEY (created_by) REFERENCES admin(admin_id),
      CONSTRAINT fk_cbt_exam_updated_by FOREIGN KEY (updated_by) REFERENCES admin(admin_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_exam_classes (
      exam_id BIGINT UNSIGNED NOT NULL,
      class_id INT NOT NULL,
      PRIMARY KEY (exam_id,class_id),
      KEY idx_cbt_exam_classes_class (class_id),
      CONSTRAINT fk_cbt_exam_classes_exam FOREIGN KEY (exam_id) REFERENCES cbt_exams(exam_id) ON DELETE CASCADE,
      CONSTRAINT fk_cbt_exam_classes_class FOREIGN KEY (class_id) REFERENCES classes(class_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_exam_versions (
      exam_id BIGINT UNSIGNED NOT NULL, version INT NOT NULL,
      published_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (exam_id,version),
      CONSTRAINT fk_cbt_version_exam FOREIGN KEY (exam_id) REFERENCES cbt_exams(exam_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_questions (
      question_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, exam_id BIGINT UNSIGNED NOT NULL,
      version INT NOT NULL, position INT NOT NULL, prompt TEXT NOT NULL,
      PRIMARY KEY(question_id), UNIQUE KEY uq_cbt_question_position(exam_id,version,position),
      CONSTRAINT fk_cbt_question_version FOREIGN KEY(exam_id,version) REFERENCES cbt_exam_versions(exam_id,version) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_options (
      option_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, question_id BIGINT UNSIGNED NOT NULL,
      label CHAR(1) NOT NULL, option_text TEXT NOT NULL, is_correct TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY(option_id), UNIQUE KEY uq_cbt_option_label(question_id,label),
      CONSTRAINT fk_cbt_option_question FOREIGN KEY(question_id) REFERENCES cbt_questions(question_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_attempts (
      attempt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, student_id INT NOT NULL,
      exam_id BIGINT UNSIGNED NOT NULL, version INT NOT NULL, attempt_number INT NOT NULL DEFAULT 1,
      status ENUM('in_progress','submitted','auto_submitted','voided') NOT NULL DEFAULT 'in_progress',
      started_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, submitted_at DATETIME NULL,
      submission_reason ENUM('student','time_limit') NULL, score INT NULL, max_score INT NOT NULL,
      last_activity_at DATETIME NOT NULL,
      PRIMARY KEY(attempt_id), UNIQUE KEY uq_cbt_attempt_number(student_id,exam_id,attempt_number),
      KEY idx_cbt_attempt_exam_status(exam_id,status),
      CONSTRAINT fk_cbt_attempt_student FOREIGN KEY(student_id) REFERENCES students(student_id),
      CONSTRAINT fk_cbt_attempt_version FOREIGN KEY(exam_id,version) REFERENCES cbt_exam_versions(exam_id,version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_attempt_answers (
      attempt_id BIGINT UNSIGNED NOT NULL, question_id BIGINT UNSIGNED NOT NULL,
      selected_option_id BIGINT UNSIGNED NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY(attempt_id,question_id),
      CONSTRAINT fk_cbt_answer_attempt FOREIGN KEY(attempt_id) REFERENCES cbt_attempts(attempt_id) ON DELETE CASCADE,
      CONSTRAINT fk_cbt_answer_question FOREIGN KEY(question_id) REFERENCES cbt_questions(question_id),
      CONSTRAINT fk_cbt_answer_option FOREIGN KEY(selected_option_id) REFERENCES cbt_options(option_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS cbt_audit_events (
      event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, actor_type ENUM('admin','student','system') NOT NULL,
      actor_id BIGINT UNSIGNED NULL, exam_id BIGINT UNSIGNED NULL, attempt_id BIGINT UNSIGNED NULL,
      event_type VARCHAR(40) NOT NULL, event_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(event_id), KEY idx_cbt_audit_exam_time(exam_id,event_at), KEY idx_cbt_audit_attempt_time(attempt_id,event_at),
      CONSTRAINT fk_cbt_audit_exam FOREIGN KEY(exam_id) REFERENCES cbt_exams(exam_id) ON DELETE SET NULL,
      CONSTRAINT fk_cbt_audit_attempt FOREIGN KEY(attempt_id) REFERENCES cbt_attempts(attempt_id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];
  try {
    for (const sql of statements) await db.query(sql);

    // Preserve each existing exam's single class assignment in the new join table.
    await db.query(
      `INSERT IGNORE INTO cbt_exam_classes(exam_id,class_id)
       SELECT exam_id,class_id FROM cbt_exams`
    );

    // Upgrade databases created by the earlier one-attempt schema. Existing
    // attempts receive attempt_number=1; the new index permits audited retries.
    const [attemptNumberColumn] = await db.query("SHOW COLUMNS FROM cbt_attempts LIKE 'attempt_number'");
    if (!attemptNumberColumn.length) {
      await db.query("ALTER TABLE cbt_attempts ADD COLUMN attempt_number INT NOT NULL DEFAULT 1 AFTER version");
    }
    const [attemptNumberIndex] = await db.query("SHOW INDEX FROM cbt_attempts WHERE Key_name='uq_cbt_attempt_number'");
    if (!attemptNumberIndex.length) {
      await db.query("ALTER TABLE cbt_attempts ADD UNIQUE KEY uq_cbt_attempt_number (student_id,exam_id,attempt_number)");
    }
    const [legacyUniqueIndex] = await db.query("SHOW INDEX FROM cbt_attempts WHERE Key_name='uq_cbt_one_attempt'");
    if (legacyUniqueIndex.length) await db.query("ALTER TABLE cbt_attempts DROP INDEX uq_cbt_one_attempt");
    console.log("CBT tables are ready.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("CBT migration failed:", error.message);
  process.exitCode = 1;
});
