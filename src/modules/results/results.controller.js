const jwt = require("jsonwebtoken");
const model = require("./results.model");

async function listClasses(_req, res) {
  try { return res.json({ success: true, classes: await model.listClasses() }); }
  catch (error) {
    console.error("[results] list classes:", error);
    return res.status(500).json({ success: false, message: "Unable to load classes." });
  }
}

async function login(req, res) {
  const classId = Number(req.body?.classId);
  const password = req.body?.password;
  if (!Number.isSafeInteger(classId) || classId < 1 || typeof password !== "string" || !password) {
    return res.status(400).json({ success: false, code: "INVALID_LOGIN", message: "classId and password are required." });
  }
  try {
    const result = await model.loginClass(classId, password);
    if (!result) return res.status(401).json({ success: false, code: "INVALID_CREDENTIALS", message: "Class or password is incorrect." });
    const token = jwt.sign({
      role: "results_teacher",
      classId: result.class.classId,
      sessionId: result.period.session_id,
      termId: result.period.term_id,
    }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.cookie("results_teacher", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    });
    return res.json({ success: true, class: result.class, teacher: result.teacher, period: result.period });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[results] login:", error);
    if (error.code === "ER_BAD_FIELD_ERROR") return res.status(409).json({ success: false, code: "RESULTS_MIGRATION_REQUIRED", message: "Run the Results portal database migration first." });
    return res.status(500).json({ success: false, message: "Unable to sign in to Results." });
  }
}

function logout(_req, res) {
  res.clearCookie("results_teacher", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });
  return res.json({ success: true, message: "Results session ended." });
}

async function me(req, res) {
  try {
    const context = await model.getTeacherContext(req.resultsTeacher.classId, req.resultsTeacher.sessionId, req.resultsTeacher.termId);
    if (!context) return res.status(404).json({ success: false, message: "Results class or academic period no longer exists." });
    return res.json({ success: true, teacher: context, class: { classId: context.class_id, className: context.class_name }, period: { sessionId: context.session_id, sessionName: context.session_name, termId: context.term_id, termName: context.term_name } });
  } catch (error) {
    console.error("[results] auth me:", error);
    return res.status(500).json({ success: false, message: "Unable to load Results session." });
  }
}

async function listStudents(req, res) {
  try { return res.json({ success: true, students: await model.listStudents(req.resultsTeacher.classId) }); }
  catch (error) {
    console.error("[results] roster:", error);
    return res.status(500).json({ success: false, message: "Unable to load class roster." });
  }
}

async function listSubjects(req, res) {
  try { return res.json({ success: true, subjects: await model.listClassSubjects(req.resultsTeacher.classId) }); }
  catch (error) {
    console.error("[results] subjects:", error);
    return res.status(500).json({ success: false, message: "Unable to load class subjects." });
  }
}

function requestPeriod(req, res) {
  const sessionId = Number(req.body?.sessionId ?? req.query.sessionId ?? req.resultsTeacher.sessionId);
  const termId = Number(req.body?.termId ?? req.query.termId ?? req.resultsTeacher.termId);
  if (sessionId !== req.resultsTeacher.sessionId || termId !== req.resultsTeacher.termId) {
    res.status(403).json({ success: false, code: "PERIOD_ACCESS_DENIED", message: "This session can only access its active academic period." });
    return null;
  }
  return { sessionId, termId };
}

function validScores(scores) {
  if (!Array.isArray(scores) || !scores.length) return "scores must be a non-empty array.";
  const seen = new Set();
  for (const score of scores) {
    const subjectId = Number(score?.subjectId);
    if (!Number.isSafeInteger(subjectId) || subjectId < 1 || seen.has(subjectId)) return "Each score needs a unique valid subjectId.";
    seen.add(subjectId);
    for (const [field, max] of [["ca1", 10], ["ca2", 10], ["ca3", 10], ["examination", 70]]) {
      const value = score[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) return `${field} must be a number from 0 to ${max}.`;
    }
  }
  return null;
}

async function getScores(req, res) {
  const period = requestPeriod(req, res);
  if (!period) return;
  try {
    const result = await model.getStudentScores(req.resultsTeacher.classId, req.params.studentId, period.sessionId, period.termId);
    return res.json({ success: true, ...result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[results] get scores:", error);
    return res.status(500).json({ success: false, message: "Unable to load student scores." });
  }
}

async function saveScores(req, res) {
  const period = requestPeriod(req, res);
  if (!period) return;
  const validationError = validScores(req.body?.scores);
  if (validationError) return res.status(422).json({ success: false, code: "INVALID_SCORES", message: validationError });
  try {
    const result = await model.saveStudentScores(req.resultsTeacher.classId, req.params.studentId, period.sessionId, period.termId, req.body.scores);
    return res.json({ success: true, ...result, message: "Student scores saved." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[results] save scores:", error);
    return res.status(500).json({ success: false, message: "Unable to save student scores." });
  }
}

async function standings(req, res) {
  try {
    const data = await model.getClassStandings(req.resultsTeacher.classId, req.resultsTeacher.sessionId, req.resultsTeacher.termId);
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[results] standings:", error);
    return res.status(500).json({ success: false, message: "Unable to load class standings." });
  }
}

async function studentResults(req, res) {
  try {
    const data = await model.getStudentResults(req.resultsTeacher.classId, req.params.studentId, req.resultsTeacher.sessionId, req.resultsTeacher.termId);
    return res.json({ success: true, ...data });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[results] student results:", error);
    return res.status(500).json({ success: false, message: "Unable to load student results." });
  }
}

async function setActivePeriod(req, res) {
  const sessionId = Number(req.body?.sessionId);
  const termId = Number(req.body?.termId);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1 || !Number.isSafeInteger(termId) || termId < 1) {
    return res.status(422).json({ success: false, code: "INVALID_PERIOD", message: "Valid sessionId and termId are required." });
  }
  try {
    const period = await model.setActivePeriod(sessionId, termId, req.user.id);
    return res.json({ success: true, period });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[results] set active period:", error);
    return res.status(500).json({ success: false, message: "Unable to update the active academic period." });
  }
}

module.exports = { listClasses, login, logout, me, listStudents, listSubjects, getScores, saveScores, standings, studentResults, setActivePeriod };
