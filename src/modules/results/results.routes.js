const express = require("express");
const { rateLimit } = require("express-rate-limit");
const controller = require("./results.controller");
const { requireAuth } = require("../../middlewares/verifyToken");
const verifyRole = require("../../middlewares/verifyRole");
const { requireResultsTeacher, requireOwnResultsClass } = require("../../middlewares/requireResultsTeacher");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statusCode: 429, code: "TOO_MANY_LOGIN_ATTEMPTS", message: "Too many login attempts. Try again later." },
});

for (const prefix of ["/results", "/api-proxy/results"]) {
  router.get(`${prefix}/classes`, controller.listClasses);
  router.post(`${prefix}/auth/login`, loginLimiter, controller.login);
  router.get(`${prefix}/auth/me`, requireResultsTeacher, controller.me);
  router.post(`${prefix}/auth/logout`, requireResultsTeacher, controller.logout);

  router.get(`${prefix}/classes/:classId/students`, requireResultsTeacher, requireOwnResultsClass, controller.listStudents);
  router.get(`${prefix}/classes/:classId/subjects`, requireResultsTeacher, requireOwnResultsClass, controller.listSubjects);
  router.get(`${prefix}/classes/:classId/students/:studentId/scores`, requireResultsTeacher, requireOwnResultsClass, controller.getScores);
  router.put(`${prefix}/classes/:classId/students/:studentId/scores`, requireResultsTeacher, requireOwnResultsClass, controller.saveScores);
  router.get(`${prefix}/classes/:classId/standings`, requireResultsTeacher, requireOwnResultsClass, controller.standings);
  router.get(`${prefix}/classes/:classId/students/:studentId/results`, requireResultsTeacher, requireOwnResultsClass, controller.studentResults);
}

router.put("/results/admin/active-period", requireAuth, verifyRole("admin"), controller.setActivePeriod);
router.put("/api-proxy/results/admin/active-period", requireAuth, verifyRole("admin"), controller.setActivePeriod);

module.exports = router;
