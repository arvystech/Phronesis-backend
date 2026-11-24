const db = require("../../config/dbConnection");

const STUDENT_FIELDS = `
  st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,
  st.gender,st.date_of_birth,st.class_id,c.class_name,st.profile_pic,st.blood_group,
  st.state_of_origin,st.parent_name,st.parent_phone,st.parent_email,st.address,
  st.status,st.created_at,st.is_default_password`;

async function listStudents(filters = {}) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 50));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
  const search = String(filters.search || "").trim();
  if (search) {
    const like = `%${search}%`;
    where.push("(st.admission_number LIKE ? OR st.first_name LIKE ? OR st.middle_name LIKE ? OR st.last_name LIKE ? OR CONCAT_WS(' ',st.first_name,st.middle_name,st.last_name) LIKE ? OR st.parent_name LIKE ? OR st.parent_email LIKE ?)");
    params.push(like, like, like, like, like, like, like);
  }
  if (filters.classId !== undefined && filters.classId !== "") {
    where.push("st.class_id=?");
    params.push(filters.classId);
  }
  if (filters.status !== undefined && filters.status !== "") {
    where.push("st.status=?");
    params.push(filters.status);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM students st ${clause}`,
    params
  );
  const [students] = await db.query(
    `SELECT ${STUDENT_FIELDS}
     FROM students st JOIN classes c ON c.class_id=st.class_id
     ${clause}
     ORDER BY st.last_name,st.first_name,st.student_id
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const total = Number(countRows[0].total);
  return {
    students,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getStudentById(studentId) {
  const [rows] = await db.query(
    `SELECT ${STUDENT_FIELDS}
     FROM students st JOIN classes c ON c.class_id=st.class_id
     WHERE st.student_id=?`,
    [studentId]
  );
  return rows[0] || null;
}

async function updateStudentClass(studentId, classId) {
  const [classes] = await db.query("SELECT class_id FROM classes WHERE class_id=?", [classId]);
  if (!classes.length) {
    const error = new Error("Selected class was not found.");
    error.status = 422;
    error.code = "INVALID_CLASS";
    throw error;
  }
  const [result] = await db.query("UPDATE students SET class_id=? WHERE student_id=?", [classId, studentId]);
  if (!result.affectedRows) return null;
  return getStudentById(studentId);
}

async function updateStudentDetails(studentId, updates) {
  const [existing] = await db.query("SELECT student_id FROM students WHERE student_id=?", [studentId]);
  if (!existing.length) return null;
  if (updates.class_id !== undefined) {
    const [classes] = await db.query("SELECT class_id FROM classes WHERE class_id=?", [updates.class_id]);
    if (!classes.length) {
      const error = new Error("Selected class was not found.");
      error.status = 422;
      error.code = "INVALID_CLASS";
      throw error;
    }
  }
  const fields = Object.keys(updates);
  const values = fields.map((field) => updates[field]);
  if (fields.length) {
    const setClause = fields.map((field) => `\`${field}\`=?`).join(",");
    await db.query(`UPDATE students SET ${setClause} WHERE student_id=?`, [...values, studentId]);
  }
  return getStudentById(studentId);
}

module.exports = { listStudents, getStudentById, updateStudentClass, updateStudentDetails };
