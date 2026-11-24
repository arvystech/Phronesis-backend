const express = require("express");
const router = express.Router();
const studentController = require("./student.controller");
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");
const idempotency = require("../../middlewares/idempotency");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// School announcements endpoint
router.get("/announcements", studentController.getAnnouncements);

// Authenticated read access: students see their own data; admins must provide
// ?studentId=<id> to select the record they are authorized to review.
const requireStudentOrAdmin = (req, res, next) => {
  if (req.user?.role === "student") {
    req.studentId = req.user.id;
    return next();
  }
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, statusCode: 403, message: "Student or admin access is required." });
  }
  const studentId = Number(req.query.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, statusCode: 400, code: "STUDENT_ID_REQUIRED", message: "Admins must provide a valid studentId query parameter." });
  }
  req.studentId = studentId;
  next();
};

const requireStudentOrAdminForPathStudent = (req, res, next) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, statusCode: 400, code: "INVALID_STUDENT_ID", message: "A valid student ID is required." });
  }
  if (req.user?.role === "student" && String(req.user.id) !== String(studentId)) {
    return res.status(403).json({ success: false, statusCode: 403, message: "You can only access your own results." });
  }
  if (req.user?.role !== "student" && req.user?.role !== "admin") {
    return res.status(403).json({ success: false, statusCode: 403, message: "Student or admin access is required." });
  }
  req.studentId = studentId;
  next();
};

const readRoutes = [
  ["/dashboard", studentController.getStudentDashboard],
  ["/settings", studentController.getStudentSettings],
  ["/profile", studentController.getStudentProfile],
  ["/results", studentController.getStudentResults],
  ["/results/print", studentController.printStudentResults],
  ["/timetable", studentController.getStudentTimetable],
  ["/api/subject-details", studentController.getSubjectDetailsAPI],
  ["/assessments", studentController.getStudentAssessments],
  ["/payments", studentController.getStudentPayments],
];

for (const [path, handler] of readRoutes) {
  router.get(`/student${path}`, requireAuth, requireStudentOrAdmin, handler);
  router.get(`/api-proxy/student${path}`, requireAuth, requireStudentOrAdmin, handler);
}

// Individual academic report card with scores uploaded through Results portal.
router.get("/student/:studentId/results", requireAuth, requireStudentOrAdminForPathStudent, studentController.getStudentResults);
router.get("/api-proxy/student/:studentId/results", requireAuth, requireStudentOrAdminForPathStudent, studentController.getStudentResults);

// Mutations remain limited to the authenticated student who owns the account.
for (const prefix of ["/student", "/api-proxy/student"]) {
  router.post(
    `${prefix}/profile/upload-pic`,
    requireAuth,
    verifyRole("student"),
    studentController.handleProfilePicUpload,
    idempotency(),
    studentController.uploadProfilePic
  );
  router.post(
    `${prefix}/change-password`,
    requireAuth,
    verifyRole("student"),
    idempotency(),
    studentController.changePassword
  );
  router.get(`${prefix}/announcements`, requireAuth, requireStudentOrAdmin, studentController.getAnnouncements);
}

module.exports = router;
