const express = require("express");
const router = express.Router();
const controller = require("./cbt.controller");
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");
const idempotency = require("../../middlewares/idempotency");
const requireCbtCandidate = require("../../middlewares/requireCbtCandidate");
const { rateLimit } = require("express-rate-limit");

const cbtAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, code: "TOO_MANY_ACCESS_ATTEMPTS", message: "Too many access attempts. Try again later." },
});

// Public CBT reference data. These lookups do not create a candidate session.
router.get("/admin/cbt/classes", controller.listClasses);
router.get("/admin/cbt/subjects", controller.listSubjects);
router.get("/classes", controller.listClasses);
router.get("/subjects", controller.listSubjects);
router.get("/api-proxy/classes", controller.listClasses);
router.get("/api-proxy/subjects", controller.listSubjects);
router.get("/api-proxy/student/cbt/classes", controller.listClasses);
router.get("/api-proxy/student/cbt/subjects", controller.listSubjects);

// Keep CBT lookups public above this line; exam management remains admin-only.
router.use("/admin/cbt", requireAuth, verifyRole("admin"));
router.get("/admin/cbt/exams", controller.listAdminExams);
router.post("/admin/cbt/exams", idempotency(), controller.createExam);
router.get("/admin/cbt/exams/:examId", controller.getAdminExam);
router.put("/admin/cbt/exams/:examId", controller.updateExam);
router.post("/admin/cbt/exams/:examId/publish", controller.publishExam);
router.post("/admin/cbt/exams/:examId/close", controller.closeExam);
router.delete("/admin/cbt/exams/:examId", controller.archiveExam);
router.get("/admin/cbt/exams/:examId/attempts", controller.listAttempts);
router.get("/admin/cbt/students", controller.listCbtStudents);
router.get("/admin/cbt/students/:studentId/results", controller.getStudentCbtResults);
router.get("/admin/cbt/attempts/:attemptId/review", controller.getAttemptReview);

// API proxy aliases used by the admin frontend.
router.use("/api-proxy/admin/cbt", requireAuth, verifyRole("admin"));
router.get("/api-proxy/admin/cbt/students", controller.listCbtStudents);
router.get("/api-proxy/admin/cbt/students/:studentId/results", controller.getStudentCbtResults);
router.get("/api-proxy/admin/cbt/attempts/:attemptId/review", controller.getAttemptReview);

// Candidate access is separate from the student portal login.
router.post("/cbt/access", cbtAccessLimiter, controller.accessCandidate);
router.post("/api-proxy/cbt/access", cbtAccessLimiter, controller.accessCandidate);
router.post("/student/cbt/access", cbtAccessLimiter, controller.accessCandidate);
router.post("/api-proxy/student/cbt/access", cbtAccessLimiter, controller.accessCandidate);
router.post("/cbt/logout", controller.endCandidateAccess);
router.post("/student/cbt/logout", controller.endCandidateAccess);
router.post("/api-proxy/student/cbt/logout", controller.endCandidateAccess);

router.use("/cbt", requireCbtCandidate);
router.get("/cbt/exams", controller.listCandidateExams);
router.post("/cbt/exams/:examId/attempts", idempotency(), controller.startAttempt);
router.get("/cbt/attempts/:attemptId", controller.getAttempt);
router.put("/cbt/attempts/:attemptId/answers/:questionId", controller.saveAnswer);
router.post("/cbt/attempts/:attemptId/submit", idempotency(), controller.submitAttempt);

router.use("/student/cbt", requireCbtCandidate);
router.get("/student/cbt/exams", controller.listCandidateExams);
router.post("/student/cbt/exams/:examId/attempts", idempotency(), controller.startAttempt);
router.get("/student/cbt/attempts/:attemptId", controller.getAttempt);
router.put("/student/cbt/attempts/:attemptId/answers/:questionId", controller.saveAnswer);
router.post("/student/cbt/attempts/:attemptId/submit", idempotency(), controller.submitAttempt);

// Keep the frontend's /api-proxy-prefixed CBT URLs on the same candidate session.
router.use("/api-proxy/student/cbt", requireCbtCandidate);
router.get("/api-proxy/student/cbt/exams", controller.listCandidateExams);
router.post("/api-proxy/student/cbt/exams/:examId/attempts", idempotency(), controller.startAttempt);
router.get("/api-proxy/student/cbt/attempts/:attemptId", controller.getAttempt);
router.put("/api-proxy/student/cbt/attempts/:attemptId/answers/:questionId", controller.saveAnswer);
router.post("/api-proxy/student/cbt/attempts/:attemptId/submit", idempotency(), controller.submitAttempt);

module.exports = router;
