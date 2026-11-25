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

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS subject_classes (
        subject_id INT NOT NULL,
        class_id INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(subject_id,class_id),
        KEY idx_subject_classes_class(class_id,subject_id),
        CONSTRAINT fk_subject_classes_subject FOREIGN KEY(subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
        CONSTRAINT fk_subject_classes_class FOREIGN KEY(class_id) REFERENCES classes(class_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Keep current teaching assignments and classes already represented in
    // existing uploaded results. This only adds associations; it does not
    // rewrite subjects, CBT exams, attempts, or result scores.
    await db.query(`
      INSERT IGNORE INTO subject_classes(subject_id,class_id)
      SELECT subject_id,class_id FROM subject_teachers
    `);
    await db.query(`
      INSERT IGNORE INTO subject_classes(subject_id,class_id)
      SELECT rs.subject_id,sr.class_id
      FROM result_subjects rs JOIN student_results sr ON sr.result_id=rs.result_id
    `);

    const [hasCbtClasses] = await db.query(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cbt_exam_classes'"
    );
    if (hasCbtClasses.length) {
      await db.query(`
        INSERT IGNORE INTO subject_classes(subject_id,class_id)
        SELECT e.subject_id,ec.class_id
        FROM cbt_exams e JOIN cbt_exam_classes ec ON ec.exam_id=e.exam_id
      `);
    }
    // Older CBT installs may predate the multi-class join table.
    const [hasCbtExams] = await db.query(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cbt_exams'"
    );
    if (hasCbtExams.length) {
      await db.query(`
        INSERT IGNORE INTO subject_classes(subject_id,class_id)
        SELECT subject_id,class_id FROM cbt_exams
      `);
    }

    console.log("Subject-to-class offerings are ready.");
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Subject class migration failed:", error);
  process.exitCode = 1;
});
