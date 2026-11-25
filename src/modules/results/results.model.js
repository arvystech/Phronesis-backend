const db = require("../../config/dbConnection");
const bcrypt = require("bcrypt");

const fail = (status, code, message) => Object.assign(new Error(message), { status, code });

async function listClasses() {
  const [rows] = await db.query("SELECT class_id,class_name FROM classes ORDER BY class_name");
  return rows;
}

async function getActivePeriod(conn = db) {
  const [rows] = await conn.query(
    `SELECT p.session_id,p.term_id,s.session_name,t.term_name
     FROM results_active_period p
     LEFT JOIN sessions s ON s.session_id=p.session_id
     LEFT JOIN terms t ON t.term_id=p.term_id
     WHERE p.setting_id=1`
  );
  return rows[0] || null;
}

async function loginClass(classId, password) {
  const [rows] = await db.query("SELECT class_id,class_name,password FROM classes WHERE class_id=?", [classId]);
  const klass = rows[0];
  if (!klass || !klass.password || !(await bcrypt.compare(password, klass.password))) return null;
  const period = await getActivePeriod();
  if (!period?.session_id || !period?.term_id) throw fail(503, "ACTIVE_PERIOD_NOT_CONFIGURED", "The active academic session and term have not been configured.");
  const [teacherRows] = await db.query(
    `SELECT st.id,st.first_name,st.last_name,st.email
     FROM classes c LEFT JOIN staff st ON st.id=c.class_teacher_id
     WHERE c.class_id=?`,
    [classId]
  );
  return { class: { classId: klass.class_id, className: klass.class_name }, teacher: teacherRows[0], period };
}

async function getTeacherContext(classId, sessionId, termId) {
  const [rows] = await db.query(
    `SELECT c.class_id,c.class_name,st.id AS teacher_id,st.first_name,st.last_name,st.email,
            s.session_id,s.session_name,t.term_id,t.term_name
     FROM classes c
     LEFT JOIN staff st ON st.id=c.class_teacher_id
     JOIN sessions s ON s.session_id=?
     JOIN terms t ON t.term_id=?
     WHERE c.class_id=?`,
    [sessionId, termId, classId]
  );
  return rows[0] || null;
}

async function listStudents(classId) {
  const [rows] = await db.query(
    `SELECT student_id,admission_number,first_name,middle_name,last_name,class_id,status
     FROM students WHERE class_id=? ORDER BY last_name,first_name,student_id`,
    [classId]
  );
  return rows;
}

async function listClassSubjects(classId) {
  const [rows] = await db.query(
    `SELECT s.subject_id,s.subject_name,s.subject_code
     FROM subject_classes sc JOIN subjects s ON s.subject_id=sc.subject_id
     WHERE sc.class_id=? ORDER BY s.subject_name`,
    [classId]
  );
  return rows;
}

async function getClassStudent(classId, studentId, conn = db) {
  const [rows] = await conn.query(
    `SELECT student_id,admission_number,first_name,middle_name,last_name,class_id,status
     FROM students WHERE student_id=? AND class_id=?`,
    [studentId, classId]
  );
  return rows[0] || null;
}

async function getStudentScores(classId, studentId, sessionId, termId) {
  const student = await getClassStudent(classId, studentId);
  if (!student) throw fail(404, "STUDENT_NOT_IN_CLASS", "Student was not found in this class.");
  const [rows] = await db.query(
    `SELECT s.subject_id,s.subject_name,s.subject_code,
            rs.ca1_score AS ca1,rs.ca2_score AS ca2,rs.ca3_score AS ca3,
            rs.exam_score AS examination,rs.ca_score AS totalCa,
            rs.total_score AS finalTotal,rs.grade,rs.remarks
     FROM subjects s
     JOIN subject_classes sc ON sc.subject_id=s.subject_id AND sc.class_id=?
     LEFT JOIN student_results sr ON sr.student_id=? AND sr.class_id=? AND sr.session_id=? AND sr.term_id=?
     LEFT JOIN result_subjects rs ON rs.result_id=sr.result_id AND rs.subject_id=s.subject_id
     GROUP BY s.subject_id,s.subject_name,s.subject_code,rs.ca1_score,rs.ca2_score,rs.ca3_score,
              rs.exam_score,rs.ca_score,rs.total_score,rs.grade,rs.remarks
     ORDER BY s.subject_name`,
    [classId, studentId, classId, sessionId, termId]
  );
  const scores = rows.map((row) => ({
    ...row,
    ca1: row.ca1 === null ? null : Number(row.ca1),
    ca2: row.ca2 === null ? null : Number(row.ca2),
    ca3: row.ca3 === null ? null : Number(row.ca3),
    examination: row.examination === null ? null : Number(row.examination),
    totalCa: row.totalCa === null ? null : Number(row.totalCa),
    finalTotal: row.finalTotal === null ? null : Number(row.finalTotal),
  }));
  return { student, sessionId, termId, scores };
}

function calculateGrade(score) {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

function gradePoint(grade) {
  return ({ A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 })[grade] ?? 0;
}

async function refreshClassPositions(conn, classId, sessionId, termId) {
  const [subjects] = await conn.query("SELECT COUNT(*) subject_count FROM subject_classes WHERE class_id=?", [classId]);
  const requiredCount = Number(subjects[0].subject_count);
  await conn.query(
    "UPDATE student_results SET class_position=0,total_students=0 WHERE class_id=? AND session_id=? AND term_id=?",
    [classId, sessionId, termId]
  );
  if (!requiredCount) return;
  const [eligible] = await conn.query(
    `SELECT sr.result_id,sr.average_score,sr.total_score
     FROM student_results sr
     JOIN result_subjects rs ON rs.result_id=sr.result_id
     JOIN subject_classes sc ON sc.subject_id=rs.subject_id AND sc.class_id=sr.class_id
     WHERE sr.class_id=? AND sr.session_id=? AND sr.term_id=?
     GROUP BY sr.result_id,sr.average_score,sr.total_score
     HAVING COUNT(DISTINCT rs.subject_id)=?
     ORDER BY sr.average_score DESC,sr.total_score DESC,sr.result_id ASC`,
    [classId, sessionId, termId, requiredCount]
  );
  let rank = 0;
  let previousKey = null;
  for (let i = 0; i < eligible.length; i++) {
    const key = `${Number(eligible[i].average_score).toFixed(2)}:${Number(eligible[i].total_score).toFixed(2)}`;
    if (key !== previousKey) rank = i + 1;
    previousKey = key;
    await conn.query("UPDATE student_results SET class_position=?,total_students=? WHERE result_id=?", [rank, eligible.length, eligible[i].result_id]);
  }
}

async function saveStudentScores(classId, studentId, sessionId, termId, scores) {
  return db.withTransaction(async (conn) => {
    const student = await getClassStudent(classId, studentId, conn);
    if (!student) throw fail(404, "STUDENT_NOT_IN_CLASS", "Student was not found in this class.");
    const [allSubjects] = await conn.query("SELECT subject_id FROM subject_classes WHERE class_id=?", [classId]);
    const requiredSubjectIds = allSubjects.map((row) => Number(row.subject_id)).sort((a, b) => a - b);
    const requestedIds = scores.map((item) => Number(item.subjectId)).sort((a, b) => a - b);
    if (!requiredSubjectIds.length || requiredSubjectIds.length !== requestedIds.length || requiredSubjectIds.some((id, i) => id !== requestedIds[i])) {
      throw fail(422, "SUBJECT_SET_MISMATCH", "Submit a score for every subject offered by this class, with no duplicates.");
    }

    const [existing] = await conn.query(
      "SELECT result_id FROM student_results WHERE student_id=? AND session_id=? AND term_id=? FOR UPDATE",
      [studentId, sessionId, termId]
    );
    let resultId;
    if (existing.length) {
      resultId = existing[0].result_id;
      await conn.query("UPDATE student_results SET class_id=? WHERE result_id=?", [classId, resultId]);
    } else {
      const [insert] = await conn.query(
        "INSERT INTO student_results(student_id,session_id,term_id,class_id) VALUES(?,?,?,?)",
        [studentId, sessionId, termId, classId]
      );
      resultId = insert.insertId;
    }

    let totalScore = 0;
    let totalGradePoints = 0;
    const savedScores = [];
    for (const item of scores) {
      const caTotal = Number((item.ca1 + item.ca2 + item.ca3).toFixed(2));
      const finalTotal = Number((caTotal + item.examination).toFixed(2));
      const grade = calculateGrade(finalTotal);
      savedScores.push({
        subjectId: Number(item.subjectId),
        ca1: item.ca1,
        ca2: item.ca2,
        ca3: item.ca3,
        examination: item.examination,
        totalCa: caTotal,
        finalTotal,
        percentage: finalTotal,
        grade,
      });
      totalScore += finalTotal;
      totalGradePoints += gradePoint(grade);
      const [saved] = await conn.query(
        "SELECT result_subject_id FROM result_subjects WHERE result_id=? AND subject_id=?",
        [resultId, item.subjectId]
      );
      if (saved.length) {
        await conn.query(
          `UPDATE result_subjects SET ca1_score=?,ca2_score=?,ca3_score=?,ca_score=?,mid_term_score=0,
           exam_score=?,total_score=?,grade=?,remarks=? WHERE result_subject_id=?`,
          [item.ca1, item.ca2, item.ca3, caTotal, item.examination, finalTotal, grade, grade, saved[0].result_subject_id]
        );
      } else {
        await conn.query(
          `INSERT INTO result_subjects(result_id,subject_id,ca1_score,ca2_score,ca3_score,ca_score,mid_term_score,exam_score,total_score,grade,remarks)
           VALUES(?,?,?,?,?,?,0,?,?,?,?)`,
          [resultId, item.subjectId, item.ca1, item.ca2, item.ca3, caTotal, item.examination, finalTotal, grade, grade]
        );
      }
    }

    const average = Number((totalScore / scores.length).toFixed(2));
    const overallGrade = calculateGrade(average);
    const gpa = Number((totalGradePoints / scores.length).toFixed(2));
    await conn.query(
      "UPDATE student_results SET total_score=?,average_score=?,grade=?,gpa=?,cgpa=? WHERE result_id=?",
      [totalScore.toFixed(2), average.toFixed(2), overallGrade, gpa.toFixed(2), gpa.toFixed(2), resultId]
    );
    await refreshClassPositions(conn, classId, sessionId, termId);
    return { resultId, student, sessionId, termId, totalScore: Number(totalScore.toFixed(2)), averageScore: average, grade: overallGrade, scores: savedScores };
  });
}

async function getStudentResults(classId, studentId, sessionId, termId) {
  const student = await getClassStudent(classId, studentId);
  if (!student) throw fail(404, "STUDENT_NOT_IN_CLASS", "Student was not found in this class.");
  const [summaryRows] = await db.query(
    `SELECT result_id,total_score,average_score,gpa,cgpa,grade,class_position,total_students,remarks
     FROM student_results WHERE student_id=? AND class_id=? AND session_id=? AND term_id=?`,
    [studentId, classId, sessionId, termId]
  );
  const summary = summaryRows[0] || null;
  let subjects = [];
  if (summary) {
    const [rows] = await db.query(
      `SELECT s.subject_id,s.subject_name,s.subject_code,rs.ca1_score AS ca1,rs.ca2_score AS ca2,
              rs.ca3_score AS ca3,rs.ca_score AS totalCa,rs.exam_score AS examination,
              rs.total_score AS finalTotal,rs.grade,rs.remarks
       FROM result_subjects rs JOIN subjects s ON s.subject_id=rs.subject_id
       WHERE rs.result_id=? ORDER BY s.subject_name`,
      [summary.result_id]
    );
    subjects = rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value !== null && ["ca1", "ca2", "ca3", "totalCa", "examination", "finalTotal"].includes(key) ? Number(value) : value])));
  }
  return { student, sessionId, termId, summary, subjects };
}

async function getClassStandings(classId, sessionId, termId) {
  const [required] = await db.query("SELECT COUNT(*) count FROM subject_classes WHERE class_id=?", [classId]);
  const subjectCount = Number(required[0].count);
  if (!subjectCount) return { classId, sessionId, termId, requiredSubjectCount: 0, standings: [] };
  const [rows] = await db.query(
    `SELECT st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,
            sr.result_id,sr.total_score,sr.average_score,sr.grade,sr.gpa,sr.class_position,
            COUNT(DISTINCT rs.subject_id) completed_subject_count
     FROM student_results sr JOIN students st ON st.student_id=sr.student_id
     JOIN result_subjects rs ON rs.result_id=sr.result_id
     JOIN subject_classes sc ON sc.subject_id=rs.subject_id AND sc.class_id=sr.class_id
     WHERE sr.class_id=? AND sr.session_id=? AND sr.term_id=?
     GROUP BY st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,
              sr.result_id,sr.total_score,sr.average_score,sr.grade,sr.gpa,sr.class_position
     HAVING COUNT(DISTINCT rs.subject_id)=?
     ORDER BY sr.average_score DESC,sr.total_score DESC,st.last_name,st.first_name`,
    [classId, sessionId, termId, subjectCount]
  );
  let rank = 0;
  let previousKey = null;
  const standings = rows.map((row, index) => {
    const key = `${Number(row.average_score).toFixed(2)}:${Number(row.total_score).toFixed(2)}`;
    if (key !== previousKey) rank = index + 1;
    previousKey = key;
    return { ...row, class_position: rank, total_score: Number(row.total_score), average_score: Number(row.average_score), gpa: Number(row.gpa) };
  });
  return {
    classId,
    sessionId,
    termId,
    requiredSubjectCount: subjectCount,
    standings,
  };
}

async function setActivePeriod(sessionId, termId, adminId) {
  const [sessions] = await db.query("SELECT session_id FROM sessions WHERE session_id=?", [sessionId]);
  const [terms] = await db.query("SELECT term_id FROM terms WHERE term_id=?", [termId]);
  if (!sessions.length || !terms.length) throw fail(422, "INVALID_PERIOD", "Selected academic session or term does not exist.");
  await db.query(
    `INSERT INTO results_active_period(setting_id,session_id,term_id,updated_by)
     VALUES(1,?,?,?) ON DUPLICATE KEY UPDATE session_id=VALUES(session_id),term_id=VALUES(term_id),updated_by=VALUES(updated_by)`,
    [sessionId, termId, adminId]
  );
  return getActivePeriod();
}

module.exports = { listClasses, loginClass, getActivePeriod, getTeacherContext, listStudents, listClassSubjects, getStudentScores, saveStudentScores, getStudentResults, getClassStandings, setActivePeriod, fail };
