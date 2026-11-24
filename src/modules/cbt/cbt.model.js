const db = require("../../config/dbConnection");

const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });
const nowSql = "UTC_TIMESTAMP()";

async function listClasses() {
  const [rows] = await db.query("SELECT class_id,class_name FROM classes ORDER BY class_name");
  return rows;
}

async function listSubjects() {
  const [rows] = await db.query("SELECT subject_id,subject_name,subject_code FROM subjects ORDER BY subject_name");
  return rows;
}

async function resolveCandidate(admissionNumber) {
  const [rows] = await db.query(
    `SELECT st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,
            st.class_id,c.class_name
     FROM students st JOIN classes c ON c.class_id=st.class_id
     WHERE st.admission_number=? AND st.status='Active' LIMIT 2`,
    [admissionNumber]
  );
  // The schema dump only indexes admission_number; it does not guarantee uniqueness.
  // Fail closed if the identifier does not resolve to exactly one active student.
  if (rows.length !== 1) return null;
  return rows[0];
}

function validateExam(input) {
  if (!input || typeof input !== "object" || !Number.isInteger(Number(input.subjectId))) throw httpError(422, "subjectId is required.", "INVALID_EXAM");
  const rawClassIds = Array.isArray(input.classIds) ? input.classIds : [input.classId];
  const classIds = [...new Set(rawClassIds.map(Number))];
  if (!classIds.length || classIds.some((id) => !Number.isSafeInteger(id) || id < 1)) throw httpError(422, "Provide one or more valid classIds.", "INVALID_CLASSES");
  const duration = Number(input.durationSeconds ?? 1800);
  if (!Number.isInteger(duration) || duration < 60 || duration > 14400) throw httpError(422, "durationSeconds must be between 60 and 14400.", "INVALID_DURATION");
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 200) throw httpError(422, "Provide between 1 and 200 questions.", "INVALID_QUESTIONS");
  for (const q of input.questions) {
    if (!q || typeof q.prompt !== "string" || !q.prompt.trim() || !Array.isArray(q.options) || q.options.length !== 4) throw httpError(422, "Each question needs a prompt and exactly four options.", "INVALID_QUESTION");
    const labels = q.options.map((o) => String(o.label || "").toUpperCase()).sort().join("");
    if (labels !== "ABCD" || q.options.filter((o) => o.isCorrect === true).length !== 1 || q.options.some((o) => typeof o.text !== "string" || !o.text.trim())) throw httpError(422, "Each question must have distinct A-D options and exactly one correct option.", "INVALID_OPTIONS");
  }
  const from = input.availableFrom ? new Date(input.availableFrom) : null;
  const until = input.availableUntil ? new Date(input.availableUntil) : null;
  if ((from && Number.isNaN(+from)) || (until && Number.isNaN(+until)) || (from && until && from >= until)) throw httpError(422, "Availability dates are invalid.", "INVALID_AVAILABILITY");
  return { ...input, classIds, classId: classIds[0], duration, from, until };
}

async function replaceExamClasses(conn, examId, classIds) {
  const placeholders = classIds.map(() => "?").join(",");
  const [classes] = await conn.query(`SELECT class_id FROM classes WHERE class_id IN (${placeholders})`, classIds);
  if (classes.length !== classIds.length) throw httpError(422, "One or more selected classes do not exist.", "INVALID_CLASSES");
  await conn.query("DELETE FROM cbt_exam_classes WHERE exam_id=?", [examId]);
  for (const classId of classIds) await conn.query("INSERT INTO cbt_exam_classes(exam_id,class_id) VALUES(?,?)", [examId, classId]);
}

async function replaceQuestions(conn, examId, version, questions) {
  await conn.query("DELETE FROM cbt_questions WHERE exam_id=? AND version=?", [examId, version]);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const [result] = await conn.query("INSERT INTO cbt_questions(exam_id,version,position,prompt) VALUES(?,?,?,?)", [examId, version, i + 1, q.prompt.trim()]);
    for (const option of q.options) await conn.query("INSERT INTO cbt_options(question_id,label,option_text,is_correct) VALUES(?,?,?,?)", [result.insertId, option.label.toUpperCase(), option.text.trim(), option.isCorrect ? 1 : 0]);
  }
}

async function readQuestions(examId, version, includeCorrect = false, attemptId = null) {
  const [rows] = await db.query(
    `SELECT q.question_id,q.position,q.prompt,o.option_id,o.label,o.option_text${includeCorrect ? ",o.is_correct" : ""}${attemptId ? ",aa.selected_option_id" : ""}
     FROM cbt_questions q JOIN cbt_options o ON o.question_id=q.question_id
     ${attemptId ? "LEFT JOIN cbt_attempt_answers aa ON aa.question_id=q.question_id AND aa.attempt_id=?" : ""}
     WHERE q.exam_id=? AND q.version=? ORDER BY q.position,o.label`,
    attemptId ? [attemptId, examId, version] : [examId, version]
  );
  const questions = [];
  for (const row of rows) {
    let q = questions[questions.length - 1];
    if (!q || q.questionId !== row.question_id) {
      q = { questionId: row.question_id, position: row.position, prompt: row.prompt, options: [] };
      questions.push(q);
    }
    const option = { optionId: row.option_id, label: row.label, text: row.option_text };
    if (includeCorrect) option.isCorrect = Boolean(row.is_correct);
    q.options.push(option);
    if (attemptId && row.selected_option_id === row.option_id) q.selectedOptionId = row.option_id;
  }
  return questions;
}

async function listAdminExams(filters = {}) {
  const where = [], params = [];
  for (const [key, column] of [["classId", "e.class_id"], ["subjectId", "e.subject_id"], ["status", "e.status"], ["sessionId", "e.session_id"]]) {
    if (filters[key] !== undefined && filters[key] !== "") {
      if (key === "classId") where.push("EXISTS (SELECT 1 FROM cbt_exam_classes filter_ec WHERE filter_ec.exam_id=e.exam_id AND filter_ec.class_id=?)");
      else where.push(`${column}=?`);
      params.push(filters[key]);
    }
  }
  const [rows] = await db.query(`SELECT e.*,c.class_name,s.subject_name,se.session_name,t.term_name,(SELECT COUNT(*) FROM cbt_questions q WHERE q.exam_id=e.exam_id AND q.version=e.current_version) question_count,(SELECT GROUP_CONCAT(ec.class_id ORDER BY ec.class_id) FROM cbt_exam_classes ec WHERE ec.exam_id=e.exam_id) assigned_class_ids,(SELECT GROUP_CONCAT(ac.class_name ORDER BY ac.class_name SEPARATOR ', ') FROM cbt_exam_classes ec JOIN classes ac ON ac.class_id=ec.class_id WHERE ec.exam_id=e.exam_id) assigned_class_names FROM cbt_exams e JOIN classes c ON c.class_id=e.class_id JOIN subjects s ON s.subject_id=e.subject_id LEFT JOIN sessions se ON se.session_id=e.session_id LEFT JOIN terms t ON t.term_id=e.term_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY e.updated_at DESC LIMIT 200`, params);
  return rows.map((row) => ({
    ...row,
    class_ids: row.assigned_class_ids ? row.assigned_class_ids.split(",").map(Number) : [row.class_id],
    class_names: row.assigned_class_names || row.class_name,
  }));
}

async function getAdminExam(examId) {
  const [rows] = await db.query("SELECT * FROM cbt_exams WHERE exam_id=?", [examId]);
  if (!rows.length) throw httpError(404, "Exam not found.", "EXAM_NOT_FOUND");
  const [assignedClasses] = await db.query("SELECT c.class_id,c.class_name FROM cbt_exam_classes ec JOIN classes c ON c.class_id=ec.class_id WHERE ec.exam_id=? ORDER BY c.class_name", [examId]);
  return { ...rows[0], classIds: assignedClasses.map((item) => item.class_id), classes: assignedClasses, questions: await readQuestions(rows[0].exam_id, rows[0].current_version, true) };
}

async function createExam(input, adminId) {
  const exam = validateExam(input);
  return db.withTransaction(async (conn) => {
    const [result] = await conn.query(`INSERT INTO cbt_exams(title,class_id,subject_id,session_id,term_id,duration_seconds,available_from,available_until,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?)`, [String(exam.title || `${exam.className || "CBT"} ${exam.subjectName || "Exam"}`).trim().slice(0,180), exam.classId, exam.subjectId, exam.sessionId || null, exam.termId || null, exam.duration, exam.from, exam.until, adminId, adminId]);
    await replaceExamClasses(conn, result.insertId, exam.classIds);
    await conn.query("INSERT INTO cbt_exam_versions(exam_id,version) VALUES(?,1)", [result.insertId]);
    await replaceQuestions(conn, result.insertId, 1, exam.questions);
    await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,event_type) VALUES('admin',?,?, 'exam_created')", [adminId, result.insertId]);
    return result.insertId;
  });
}

async function updateExam(examId, input, adminId) {
  const exam = validateExam(input);
  await db.withTransaction(async (conn) => {
    const [rows] = await conn.query("SELECT status,current_version FROM cbt_exams WHERE exam_id=? FOR UPDATE", [examId]);
    if (!rows.length) throw httpError(404, "Exam not found.", "EXAM_NOT_FOUND");
    if (rows[0].status !== "draft") throw httpError(409, "Only draft exams can be edited.", "EXAM_IMMUTABLE");
    await conn.query("UPDATE cbt_exams SET title=?,class_id=?,subject_id=?,session_id=?,term_id=?,duration_seconds=?,available_from=?,available_until=?,updated_by=? WHERE exam_id=?", [String(exam.title || "CBT Exam").trim().slice(0,180), exam.classId, exam.subjectId, exam.sessionId || null, exam.termId || null, exam.duration, exam.from, exam.until, adminId, examId]);
    await replaceExamClasses(conn, examId, exam.classIds);
    await replaceQuestions(conn, examId, rows[0].current_version, exam.questions);
    await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,event_type) VALUES('admin',?,?, 'exam_updated')", [adminId, examId]);
  });
}

async function setExamStatus(examId, adminId, action) {
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.query("SELECT * FROM cbt_exams WHERE exam_id=? FOR UPDATE", [examId]);
    const exam = rows[0];
    if (!exam) throw httpError(404, "Exam not found.", "EXAM_NOT_FOUND");
    if (action === "publish") {
      if (exam.status !== "draft") throw httpError(409, "Only draft exams can be published.", "INVALID_EXAM_STATE");
      const [assignedClassCount] = await conn.query("SELECT COUNT(*) class_count FROM cbt_exam_classes WHERE exam_id=?", [examId]);
      if (Number(assignedClassCount[0].class_count) < 1) throw httpError(422, "Assign the exam to at least one class before publishing.", "NO_ASSIGNED_CLASSES");
      const [counts] = await conn.query("SELECT COUNT(DISTINCT q.question_id) question_count,COUNT(o.option_id) option_count,SUM(o.is_correct) correct_count FROM cbt_questions q JOIN cbt_options o ON o.question_id=q.question_id WHERE q.exam_id=? AND q.version=?", [examId, exam.current_version]);
      // mysql2 can return SUM() as a string even when COUNT() is numeric.
      // Normalize aggregate values before comparing so valid exams can publish.
      const questionCount = Number(counts[0].question_count);
      const optionCount = Number(counts[0].option_count);
      const correctCount = Number(counts[0].correct_count);
      if (!questionCount || optionCount !== questionCount * 4 || correctCount !== questionCount) throw httpError(422, "Exam questions failed validation.", "INVALID_EXAM");
      await conn.query(`UPDATE cbt_exams SET status='published',published_at=${nowSql},updated_by=? WHERE exam_id=?`, [adminId, examId]);
      await conn.query(`UPDATE cbt_exam_versions SET published_at=${nowSql} WHERE exam_id=? AND version=?`, [examId, exam.current_version]);
      await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,event_type) VALUES('admin',?,?, 'exam_published')", [adminId, examId]);
    } else if (action === "close") {
      if (!['published'].includes(exam.status)) throw httpError(409, "Only published exams can be closed.", "INVALID_EXAM_STATE");
      await conn.query("UPDATE cbt_exams SET status='closed',updated_by=? WHERE exam_id=?", [adminId, examId]);
      await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,event_type) VALUES('admin',?,?, 'exam_closed')", [adminId, examId]);
    } else if (action === "archive") {
      await conn.query("UPDATE cbt_exams SET status='archived',updated_by=? WHERE exam_id=?", [adminId, examId]);
      await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,event_type) VALUES('admin',?,?, 'exam_archived')", [adminId, examId]);
    }
  });
}

async function listStudentExams(studentId) {
  const [rows] = await db.query(`SELECT e.exam_id,e.title,e.duration_seconds,e.available_from,e.available_until,c.class_name,s.subject_name,se.session_name,t.term_name,(SELECT COUNT(*) FROM cbt_questions q WHERE q.exam_id=e.exam_id AND q.version=e.current_version) question_count,a.attempt_id,a.status AS attempt_status FROM students st JOIN cbt_exam_classes ec ON ec.class_id=st.class_id JOIN cbt_exams e ON e.exam_id=ec.exam_id JOIN classes c ON c.class_id=st.class_id JOIN subjects s ON s.subject_id=e.subject_id LEFT JOIN sessions se ON se.session_id=e.session_id LEFT JOIN terms t ON t.term_id=e.term_id LEFT JOIN cbt_attempts a ON a.student_id=st.student_id AND a.exam_id=e.exam_id AND a.status='in_progress' WHERE st.student_id=? AND st.status='Active' AND e.status='published' AND (e.available_from IS NULL OR e.available_from<=UTC_TIMESTAMP()) AND (e.available_until IS NULL OR e.available_until>UTC_TIMESTAMP()) AND (a.attempt_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM cbt_attempts done WHERE done.student_id=st.student_id AND done.exam_id=e.exam_id AND done.status<>'voided')) ORDER BY e.available_from,e.exam_id`, [studentId]);
  return rows;
}

async function startAttempt(studentId, examId) {
  try { return await db.withTransaction(async (conn) => {
    const [students] = await conn.query("SELECT class_id FROM students WHERE student_id=? AND status='Active'", [studentId]);
    if (!students.length) throw httpError(403, "This exam is not available.", "EXAM_UNAVAILABLE");
    const [exams] = await conn.query("SELECT e.* FROM cbt_exams e JOIN cbt_exam_classes ec ON ec.exam_id=e.exam_id WHERE e.exam_id=? AND ec.class_id=? AND e.status='published' AND (e.available_from IS NULL OR e.available_from<=UTC_TIMESTAMP()) AND (e.available_until IS NULL OR e.available_until>UTC_TIMESTAMP()) FOR UPDATE", [examId, students[0].class_id]);
    if (!exams.length) throw httpError(403, "This exam is not available.", "EXAM_UNAVAILABLE");
    const [existing] = await conn.query("SELECT attempt_id FROM cbt_attempts WHERE student_id=? AND exam_id=? AND status<>'voided'", [studentId, examId]);
    if (existing.length) throw httpError(409, "An attempt already exists for this exam.", "ATTEMPT_EXISTS");
    const [attemptNumbers] = await conn.query("SELECT COALESCE(MAX(attempt_number),0)+1 next_attempt_number FROM cbt_attempts WHERE student_id=? AND exam_id=?", [studentId, examId]);
    const attemptNumber = Number(attemptNumbers[0].next_attempt_number);
    const [q] = await conn.query("SELECT COUNT(*) count FROM cbt_questions WHERE exam_id=? AND version=?", [examId, exams[0].current_version]);
    const [insert] = await conn.query(`INSERT INTO cbt_attempts(student_id,exam_id,version,attempt_number,started_at,expires_at,max_score,last_activity_at) VALUES(?,?,?,?,${nowSql},DATE_ADD(${nowSql},INTERVAL ? SECOND),?,${nowSql})`, [studentId, examId, exams[0].current_version, attemptNumber, exams[0].duration_seconds, q[0].count]);
    await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,attempt_id,event_type) VALUES('student',?,?,?, 'attempt_started')", [studentId, examId, insert.insertId]);
    return insert.insertId;
  }); } catch (error) {
    if (error.code === "ER_DUP_ENTRY") throw httpError(409, "An attempt already exists for this exam.", "ATTEMPT_EXISTS");
    throw error;
  }
}

async function getAttempt(studentId, attemptId, finalizeExpired = true) {
  const [rows] = await db.query("SELECT a.*,e.title,e.class_id,e.subject_id,c.class_name,s.subject_name,(a.expires_at<=UTC_TIMESTAMP()) expired FROM cbt_attempts a JOIN cbt_exams e ON e.exam_id=a.exam_id JOIN students st ON st.student_id=a.student_id JOIN classes c ON c.class_id=st.class_id JOIN subjects s ON s.subject_id=e.subject_id WHERE a.attempt_id=? AND a.student_id=?", [attemptId, studentId]);
  if (!rows.length) throw httpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
  let attempt = rows[0];
  if (attempt.status === "voided") throw httpError(409, "This attempt was reset by an administrator. Refresh the exam list to start a new attempt.", "ATTEMPT_RESET");
  if (finalizeExpired && attempt.status === "in_progress" && attempt.expired) {
    await submitAttempt(studentId, attemptId, "time_limit");
    return getAttempt(studentId, attemptId, false);
  }
  const questions = await readQuestions(attempt.exam_id, attempt.version, false, attemptId);
  const [server] = await db.query("SELECT UTC_TIMESTAMP() server_time");
  return { ...attempt, serverTime: server[0].server_time, questions };
}

async function saveAnswer(studentId, attemptId, questionId, optionId) {
  if (!Number.isInteger(Number(optionId))) throw httpError(422, "optionId is required.", "INVALID_OPTION");
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.query("SELECT * FROM cbt_attempts WHERE attempt_id=? AND student_id=? FOR UPDATE", [attemptId, studentId]);
    const a = rows[0];
    if (!a) throw httpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (a.status !== "in_progress") throw httpError(409, "Attempt is already finalized.", "ATTEMPT_FINALIZED");
    const [deadline] = await conn.query("SELECT expires_at<=UTC_TIMESTAMP() expired FROM cbt_attempts WHERE attempt_id=?", [attemptId]);
    if (deadline[0].expired) {
      const [grade] = await conn.query(
        `SELECT COALESCE(SUM(o.is_correct),0) score
         FROM cbt_attempt_answers aa
         JOIN cbt_options o ON o.option_id=aa.selected_option_id
         JOIN cbt_questions q ON q.question_id=aa.question_id
         WHERE aa.attempt_id=? AND q.exam_id=? AND q.version=?`,
        [attemptId, a.exam_id, a.version]
      );
      await conn.query(
        `UPDATE cbt_attempts SET status='auto_submitted',submitted_at=${nowSql},
         submission_reason='time_limit',score=?,last_activity_at=${nowSql} WHERE attempt_id=?`,
        [grade[0].score, attemptId]
      );
      await conn.query(
        "INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,attempt_id,event_type) VALUES('system',NULL,?,?, 'auto_submitted')",
        [a.exam_id, attemptId]
      );
      return { expired: true };
    }
    const [valid] = await conn.query("SELECT o.option_id FROM cbt_options o JOIN cbt_questions q ON q.question_id=o.question_id WHERE o.option_id=? AND q.question_id=? AND q.exam_id=? AND q.version=?", [optionId, questionId, a.exam_id, a.version]);
    if (!valid.length) throw httpError(422, "Option does not belong to this question.", "INVALID_OPTION");
    await conn.query("INSERT INTO cbt_attempt_answers(attempt_id,question_id,selected_option_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE selected_option_id=VALUES(selected_option_id)", [attemptId, questionId, optionId]);
    await conn.query("UPDATE cbt_attempts SET last_activity_at=UTC_TIMESTAMP() WHERE attempt_id=?", [attemptId]);
    return { attemptId: Number(attemptId), questionId: Number(questionId), selectedOptionId: Number(optionId) };
  });
}

async function submitAttempt(studentId, attemptId, reason = "student") {
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.query("SELECT * FROM cbt_attempts WHERE attempt_id=? AND student_id=? FOR UPDATE", [attemptId, studentId]);
    const a = rows[0];
    if (!a) throw httpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
    if (a.status !== "in_progress") return a;
    const [score] = await conn.query(`SELECT COALESCE(SUM(o.is_correct),0) score FROM cbt_attempt_answers aa JOIN cbt_options o ON o.option_id=aa.selected_option_id JOIN cbt_questions q ON q.question_id=aa.question_id WHERE aa.attempt_id=? AND q.exam_id=? AND q.version=?`, [attemptId, a.exam_id, a.version]);
    const [deadline] = await conn.query("SELECT expires_at<=UTC_TIMESTAMP() expired FROM cbt_attempts WHERE attempt_id=?", [attemptId]);
    const timedOut = deadline[0].expired || reason === "time_limit";
    const status = timedOut ? "auto_submitted" : "submitted";
    await conn.query(`UPDATE cbt_attempts SET status=?,submitted_at=${nowSql},submission_reason=?,score=?,last_activity_at=${nowSql} WHERE attempt_id=?`, [status, timedOut ? "time_limit" : "student", score[0].score, attemptId]);
    await conn.query("INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,attempt_id,event_type) VALUES(?,?,?,?,?)", [timedOut ? "system" : "student", timedOut ? null : studentId, a.exam_id, attemptId, status]);
    const [updated] = await conn.query("SELECT * FROM cbt_attempts WHERE attempt_id=?", [attemptId]);
    return updated[0];
  });
}

async function listAttempts(examId) {
  const [rows] = await db.query("SELECT a.attempt_id,a.attempt_number,a.student_id,st.admission_number,st.first_name,st.last_name,a.status,a.started_at,a.expires_at,a.submitted_at,a.score,a.max_score FROM cbt_attempts a JOIN students st ON st.student_id=a.student_id WHERE a.exam_id=? ORDER BY a.started_at DESC LIMIT 500", [examId]);
  return rows;
}

async function sweepExpiredAttempts(batchSize = 500) {
  const limit = Math.min(1000, Math.max(1, Number(batchSize) || 500));
  const [expired] = await db.query(
    `SELECT student_id,attempt_id FROM cbt_attempts
     WHERE status='in_progress' AND expires_at<=UTC_TIMESTAMP()
     ORDER BY expires_at,attempt_id LIMIT ?`,
    [limit]
  );
  let finalized = 0;
  for (const attempt of expired) {
    const result = await submitAttempt(attempt.student_id, attempt.attempt_id, "time_limit");
    if (result.status === "auto_submitted") finalized++;
  }
  return { scanned: expired.length, finalized };
}

async function resetAttempt(adminId, attemptId) {
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT a.attempt_id,a.student_id,a.exam_id,a.status,e.status exam_status,
              (e.available_from IS NULL OR e.available_from<=UTC_TIMESTAMP()) available_started,
              (e.available_until IS NULL OR e.available_until>UTC_TIMESTAMP()) available_not_ended
       FROM cbt_attempts a JOIN cbt_exams e ON e.exam_id=a.exam_id
       WHERE a.attempt_id=? FOR UPDATE`,
      [attemptId]
    );
    const attempt = rows[0];
    if (!attempt || attempt.status === "voided") throw httpError(404, "Active attempt not found.", "ATTEMPT_NOT_FOUND");
    if (attempt.exam_status !== "published" || !attempt.available_started || !attempt.available_not_ended) {
      throw httpError(409, "This exam is not currently available for a replacement attempt.", "EXAM_NOT_AVAILABLE");
    }
    await conn.query("UPDATE cbt_attempts SET status='voided' WHERE attempt_id=?", [attemptId]);
    await conn.query(
      "INSERT INTO cbt_audit_events(actor_type,actor_id,exam_id,attempt_id,event_type) VALUES('admin',?,?,?,'attempt_reset')",
      [adminId, attempt.exam_id, attemptId]
    );
    return { attemptId: attempt.attempt_id, studentId: attempt.student_id, examId: attempt.exam_id };
  });
}

async function listCbtStudents(filters = {}) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 50));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
  const search = String(filters.search || "").trim();
  if (search) {
    const pattern = `%${search}%`;
    where.push("(st.admission_number LIKE ? OR st.first_name LIKE ? OR st.middle_name LIKE ? OR st.last_name LIKE ? OR CONCAT_WS(' ',st.first_name,st.middle_name,st.last_name) LIKE ?)");
    params.push(pattern, pattern, pattern, pattern, pattern);
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
  const [totalRows] = await db.query(`SELECT COUNT(*) total FROM students st ${clause}`, params);
  const [students] = await db.query(
    `SELECT st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,
            st.class_id,c.class_name,st.status,
            COUNT(a.attempt_id) attempt_count,
            COALESCE(SUM(CASE WHEN a.status IN ('submitted','auto_submitted') THEN 1 ELSE 0 END),0) completed_exam_count,
            MAX(a.submitted_at) latest_submission_at
     FROM students st
     JOIN classes c ON c.class_id=st.class_id
     LEFT JOIN cbt_attempts a ON a.student_id=st.student_id AND a.status<>'voided'
     ${clause}
     GROUP BY st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,st.class_id,c.class_name,st.status
     ORDER BY st.last_name,st.first_name,st.student_id
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { students, pagination: { page, limit, total: Number(totalRows[0].total), totalPages: Math.ceil(Number(totalRows[0].total) / limit) } };
}

async function getStudentCbtResults(studentId) {
  const [students] = await db.query(
    `SELECT st.student_id,st.admission_number,st.first_name,st.middle_name,st.last_name,
            st.class_id,c.class_name,st.status
     FROM students st JOIN classes c ON c.class_id=st.class_id
     WHERE st.student_id=?`,
    [studentId]
  );
  if (!students.length) throw httpError(404, "Student not found.", "STUDENT_NOT_FOUND");
  const [attempts] = await db.query(
    `SELECT a.attempt_id,a.exam_id,a.version,a.attempt_number,a.status,a.started_at,a.expires_at,
            a.submitted_at,a.submission_reason,a.score,a.max_score,
            e.title,e.duration_seconds,e.session_id,e.term_id,
            c.class_name,s.subject_name,se.session_name,t.term_name,
            (SELECT COUNT(*) FROM cbt_questions q WHERE q.exam_id=a.exam_id AND q.version=a.version) question_count,
            (SELECT COUNT(*) FROM cbt_attempt_answers aa WHERE aa.attempt_id=a.attempt_id AND aa.selected_option_id IS NOT NULL) answered_count
     FROM cbt_attempts a
     JOIN cbt_exams e ON e.exam_id=a.exam_id
     JOIN students st ON st.student_id=a.student_id
     JOIN classes c ON c.class_id=st.class_id
     JOIN subjects s ON s.subject_id=e.subject_id
     LEFT JOIN sessions se ON se.session_id=e.session_id
     LEFT JOIN terms t ON t.term_id=e.term_id
     WHERE a.student_id=? AND a.status<>'voided'
     ORDER BY a.started_at DESC,a.attempt_id DESC`,
    [studentId]
  );
  const results = attempts.map((attempt) => ({
    ...attempt,
    percentage: attempt.score === null || !Number(attempt.max_score)
      ? null
      : Math.round((Number(attempt.score) / Number(attempt.max_score)) * 10000) / 100,
  }));
  return {
    student: students[0],
    summary: {
      totalAttempts: results.length,
      completedExams: results.filter((item) => item.status === "submitted" || item.status === "auto_submitted").length,
      inProgressExams: results.filter((item) => item.status === "in_progress").length,
    },
    results,
  };
}

async function getAttemptReview(attemptId) {
  const [attemptRows] = await db.query(
    `SELECT a.attempt_id,a.student_id,a.exam_id,a.version,a.attempt_number,a.status,a.started_at,a.expires_at,
            a.submitted_at,a.submission_reason,a.score,a.max_score,
            st.admission_number,st.first_name,st.middle_name,st.last_name,
            e.title,e.duration_seconds,c.class_name,s.subject_name,se.session_name,t.term_name
     FROM cbt_attempts a
     JOIN students st ON st.student_id=a.student_id
     JOIN cbt_exams e ON e.exam_id=a.exam_id
     JOIN classes c ON c.class_id=st.class_id
     JOIN subjects s ON s.subject_id=e.subject_id
     LEFT JOIN sessions se ON se.session_id=e.session_id
     LEFT JOIN terms t ON t.term_id=e.term_id
     WHERE a.attempt_id=? AND a.status<>'voided'`,
    [attemptId]
  );
  if (!attemptRows.length) throw httpError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
  const row = attemptRows[0];
  const [answerRows] = await db.query(
    `SELECT q.question_id,q.position,q.prompt,o.option_id,o.label,o.option_text,o.is_correct,aa.selected_option_id
     FROM cbt_questions q
     JOIN cbt_options o ON o.question_id=q.question_id
     LEFT JOIN cbt_attempt_answers aa ON aa.attempt_id=? AND aa.question_id=q.question_id
     WHERE q.exam_id=? AND q.version=?
     ORDER BY q.position,o.label`,
    [attemptId, row.exam_id, row.version]
  );
  const questions = [];
  for (const optionRow of answerRows) {
    let question = questions[questions.length - 1];
    if (!question || question.questionId !== optionRow.question_id) {
      question = {
        questionId: optionRow.question_id,
        number: optionRow.position,
        prompt: optionRow.prompt,
        selectedOption: null,
        correctOption: null,
        options: [],
      };
      questions.push(question);
    }
    const option = {
      optionId: optionRow.option_id,
      label: optionRow.label,
      text: optionRow.option_text,
      isCorrect: Boolean(optionRow.is_correct),
      selected: optionRow.selected_option_id === optionRow.option_id,
    };
    question.options.push(option);
    if (option.isCorrect) question.correctOption = { optionId: option.optionId, label: option.label, text: option.text };
    if (option.selected) question.selectedOption = { optionId: option.optionId, label: option.label, text: option.text };
  }
  const answeredCount = questions.filter((question) => question.selectedOption !== null).length;
  const correctCount = questions.filter((question) => question.selectedOption && question.selectedOption.optionId === question.correctOption?.optionId).length;
  const maxScore = Number(row.max_score);
  const score = row.score === null ? null : Number(row.score);
  return {
    attempt: {
      attemptId: row.attempt_id,
      status: row.status,
      version: row.version,
      attemptNumber: row.attempt_number,
      startedAt: row.started_at,
      expiresAt: row.expires_at,
      submittedAt: row.submitted_at,
      submissionReason: row.submission_reason,
      score,
      maxScore,
      percentage: score === null || maxScore === 0 ? null : Math.round((score / maxScore) * 10000) / 100,
    },
    student: {
      studentId: row.student_id,
      admissionNumber: row.admission_number,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      className: row.class_name,
    },
    exam: {
      examId: row.exam_id,
      title: row.title,
      className: row.class_name,
      subjectName: row.subject_name,
      sessionName: row.session_name,
      termName: row.term_name,
      durationSeconds: row.duration_seconds,
    },
    summary: { questionCount: questions.length, answeredCount, correctCount },
    questions,
  };
}

module.exports = { validateExam, listClasses, listSubjects, resolveCandidate, listAdminExams, getAdminExam, createExam, updateExam, setExamStatus, listStudentExams, startAttempt, getAttempt, saveAnswer, submitAttempt, listAttempts, sweepExpiredAttempts, resetAttempt, listCbtStudents, getStudentCbtResults, getAttemptReview, httpError };
