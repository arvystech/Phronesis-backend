const db = require("../../config/dbConnection");
const bcrypt = require("bcrypt");

async function listClasses() {
  const [rows] = await db.query(
    `SELECT c.class_id,c.class_name,c.class_teacher_id AS teacher_id,
            CONCAT_WS(' ',s.first_name,s.last_name) AS teacher_name,
            s.email AS teacher_email
     FROM classes c
     LEFT JOIN staff s ON s.id=c.class_teacher_id
     ORDER BY c.class_name`
  );
  return rows;
}

async function createClass({ className, teacherId }) {
  return db.withTransaction(async (conn) => {
    const [teachers] = await conn.query(
      "SELECT id,first_name,last_name,email FROM staff WHERE id=?",
      [teacherId]
    );
    if (!teachers.length) {
      const error = new Error("Selected teacher was not found.");
      error.status = 422;
      error.code = "INVALID_TEACHER";
      throw error;
    }

    const [result] = await conn.query(
      "INSERT INTO classes(class_name,class_teacher_id) VALUES(?,?)",
      [className, teacherId]
    );
    return {
      class_id: result.insertId,
      class_name: className,
      teacher_id: teachers[0].id,
      teacher_name: [teachers[0].first_name, teachers[0].last_name].filter(Boolean).join(" "),
      teacher_email: teachers[0].email,
    };
  });
}

async function updateClassPassword(classId, password) {
  const [classes] = await db.query("SELECT class_id FROM classes WHERE class_id=?", [classId]);
  if (!classes.length) {
    const error = new Error("Class not found.");
    error.status = 404;
    error.code = "CLASS_NOT_FOUND";
    throw error;
  }
  const passwordHash = password === null ? null : await bcrypt.hash(password, 12);
  await db.query("UPDATE classes SET password=? WHERE class_id=?", [passwordHash, classId]);
  return { class_id: Number(classId), password_set: passwordHash !== null };
}

module.exports = { listClasses, createClass, updateClassPassword };
