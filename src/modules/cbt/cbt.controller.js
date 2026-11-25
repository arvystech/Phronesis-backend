const model = require("./cbt.model");
const jwt = require("jsonwebtoken");

const run = (handler) => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, statusCode: error.status, code: error.code, message: error.message });
    console.error("[CBT API]", error);
    return res.status(500).json({ success: false, statusCode: 500, message: "Unable to complete the CBT request." });
  }
};

const listAdminExams = run(async (req, res) => res.json({ success: true, exams: await model.listAdminExams(req.query) }));
const listClasses = run(async (req, res) => res.json({ success: true, classes: await model.listClasses() }));
const listSubjects = run(async (req, res) => res.json({ success: true, subjects: await model.listSubjects(req.query) }));
const createSubject = run(async (req, res) => {
  const subject = await model.createSubject(req.body);
  res.status(201).json({ success: true, subject, message: "Subject created and assigned to the selected classes." });
});
const setSubjectClasses = run(async (req, res) => {
  const assignment = await model.setSubjectClasses(req.params.subjectId, req.body?.classIds ?? req.body?.class_ids);
  res.json({ success: true, ...assignment, message: "Subject class offerings updated." });
});
const getAdminExam = run(async (req, res) => res.json({ success: true, exam: await model.getAdminExam(req.params.examId) }));
const createExam = run(async (req, res) => {
  const examId = await model.createExam(req.body, req.user.id);
  res.status(201).json({ success: true, examId, message: "Draft exam created." });
});
const updateExam = run(async (req, res) => {
  await model.updateExam(req.params.examId, req.body, req.user.id);
  res.json({ success: true, message: "Draft exam updated." });
});
const publishExam = run(async (req, res) => {
  await model.setExamStatus(req.params.examId, req.user.id, "publish");
  res.json({ success: true, message: "Exam published." });
});
const closeExam = run(async (req, res) => {
  await model.setExamStatus(req.params.examId, req.user.id, "close");
  res.json({ success: true, message: "Exam closed to new attempts." });
});
const archiveExam = run(async (req, res) => {
  await model.setExamStatus(req.params.examId, req.user.id, "archive");
  res.json({ success: true, message: "Exam archived." });
});
const listAttempts = run(async (req, res) => {
  const result = await model.listAttempts({ ...req.query, ...(req.params.examId ? { examId: req.params.examId } : {}) });
  res.json({ success: true, ...result });
});
const listCbtStudents = run(async (req, res) => res.json({ success: true, ...await model.listCbtStudents(req.query) }));
const getStudentCbtResults = run(async (req, res) => res.json({ success: true, ...await model.getStudentCbtResults(req.params.studentId) }));
const getAttemptReview = run(async (req, res) => res.json({ success: true, ...await model.getAttemptReview(req.params.attemptId) }));
const resetAttempt = run(async (req, res) => {
  const result = await model.resetAttempt(req.user.id, req.params.attemptId);
  res.json({
    success: true,
    ...result,
    status: "voided",
    message: "Attempt reset. The student can start a new attempt while the exam is available.",
  });
});

const listCandidateExams = run(async (req, res) => res.json({ success: true, exams: await model.listStudentExams(req.cbtCandidate.id) }));
const accessCandidate = run(async (req, res) => {
  const admissionNumber = String(req.body?.admissionNumber || req.body?.studentId || "").trim();
  if (!admissionNumber || admissionNumber.length > 50) return res.status(400).json({ success: false, statusCode: 400, code: "INVALID_ADMISSION_NUMBER", message: "Enter a valid admission number." });
  const candidate = await model.resolveCandidate(admissionNumber);
  if (!candidate) return res.status(401).json({ success: false, statusCode: 401, code: "CBT_ACCESS_DENIED", message: "Unable to verify candidate details. Check the admission number or contact the school." });
  const token = jwt.sign({ id: candidate.student_id, role: "cbt_candidate" }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.cookie("cbt_candidate", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
  const exams = await model.listStudentExams(candidate.student_id);
  res.json({
    success: true,
    // Allows cross-origin frontends that cannot persist the HttpOnly cookie
    // to keep this short-lived, CBT-scoped credential for the active tab.
    accessToken: token,
    candidate: {
      studentId: candidate.admission_number,
      displayName: [candidate.first_name, candidate.middle_name, candidate.last_name].filter(Boolean).join(" "),
      class: candidate.class_name,
    },
    exams,
  });
});
const endCandidateAccess = run(async (_req, res) => {
  res.clearCookie("cbt_candidate", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });
  res.json({ success: true, message: "CBT access ended." });
});
const startAttempt = run(async (req, res) => {
  const attemptId = await model.startAttempt(req.cbtCandidate.id, req.params.examId);
  const attempt = await model.getAttempt(req.cbtCandidate.id, attemptId);
  res.status(201).json({ success: true, attempt });
});
const getAttempt = run(async (req, res) => res.json({ success: true, attempt: await model.getAttempt(req.cbtCandidate.id, req.params.attemptId) }));
const saveAnswer = run(async (req, res) => {
  const answer = await model.saveAnswer(req.cbtCandidate.id, req.params.attemptId, req.params.questionId, req.body.optionId);
  if (answer.expired) return res.status(409).json({ success: false, statusCode: 409, code: "ATTEMPT_EXPIRED", message: "The attempt expired and was automatically submitted." });
  res.json({ success: true, answer });
});
const submitAttempt = run(async (req, res) => {
  const attempt = await model.submitAttempt(req.cbtCandidate.id, req.params.attemptId, "student");
  res.json({ success: true, attemptId: attempt.attempt_id, status: attempt.status, submittedAt: attempt.submitted_at, answeredCount: undefined, score: undefined, maxScore: undefined, message: "Your exam has been submitted successfully." });
});

module.exports = { listClasses, listSubjects, createSubject, setSubjectClasses, listAdminExams, getAdminExam, createExam, updateExam, publishExam, closeExam, archiveExam, listAttempts, listCbtStudents, getStudentCbtResults, getAttemptReview, resetAttempt, accessCandidate, endCandidateAccess, listCandidateExams, startAttempt, getAttempt, saveAnswer, submitAttempt };
