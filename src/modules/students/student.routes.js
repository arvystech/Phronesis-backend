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

// ==========================================
// STUDENT PROTECTED ROUTES
// ==========================================

// Protect all /student routes with authentication and role check
router.use("/student", requireAuth, verifyRole("student"));

// Student Profile, Settings & Dashboard
router.get("/student/dashboard", studentController.getStudentDashboard);
router.get("/student/settings", studentController.getStudentSettings);
router.get("/student/profile", studentController.getStudentProfile);
router.post(
  "/student/profile/upload-pic",
  studentController.handleProfilePicUpload,
  idempotency(),
  studentController.uploadProfilePic
);
router.post(
  "/student/change-password",
  idempotency(),
  studentController.changePassword
);

// Academic Results
router.get("/student/results", studentController.getStudentResults);
router.get("/student/results/print", studentController.printStudentResults);

// Timetable
router.get("/student/timetable", studentController.getStudentTimetable);
router.get("/student/api/subject-details", studentController.getSubjectDetailsAPI);

// Assessments
router.get("/student/assessments", studentController.getStudentAssessments);

// Payments & Fees
router.get("/student/payments", studentController.getStudentPayments);

// Announcements (Student Endpoint)
router.get("/student/announcements", studentController.getAnnouncements);

module.exports = router;
