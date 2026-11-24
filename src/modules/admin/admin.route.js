const adminController = require("./admin.controller")
const { addStaff, getStaff, allStaffAttendance, getDetailById, getAttendanceById } = require("../staff/staff.controller")


// const {addStaff} require("")
const express = require("express");
const router = express.Router();
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");
const idempotency = require("../../middlewares/idempotency");
const classesController = require("./classes.controller");
const studentsController = require("./students.controller");

router.use("/admin", requireAuth, verifyRole("admin"));

// Classes management endpoints for the admin dashboard.
router.get("/classes", requireAuth, verifyRole("admin"), classesController.listClasses);
router.post("/classes", requireAuth, verifyRole("admin"), idempotency(), classesController.createClass);
router.patch("/classes/:classId/password", requireAuth, verifyRole("admin"), classesController.updateClassPassword);
router.get("/api-proxy/classes", requireAuth, verifyRole("admin"), classesController.listClasses);
router.post("/api-proxy/classes", requireAuth, verifyRole("admin"), idempotency(), classesController.createClass);
router.patch("/api-proxy/classes/:classId/password", requireAuth, verifyRole("admin"), classesController.updateClassPassword);
router.patch("/admin/classes/:classId/password", classesController.updateClassPassword);
router.patch("/api-proxy/admin/classes/:classId/password", requireAuth, verifyRole("admin"), classesController.updateClassPassword);
router.get("/admin/cbt/classes", classesController.listClasses);
router.get("/api-proxy/admin/cbt/classes", requireAuth, verifyRole("admin"), classesController.listClasses);
router.get("/subjects", requireAuth, verifyRole("admin"), require("../cbt/cbt.controller").listSubjects);
router.get("/api-proxy/subjects", requireAuth, verifyRole("admin"), require("../cbt/cbt.controller").listSubjects);

router.get("/admin/staff/:id", getDetailById);
router.get("/admin/staff/:id/attendance", getAttendanceById);
router.get("/admin/students", studentsController.listStudents);
router.get("/admin/students/:studentId", studentsController.getStudent);
router.put("/admin/students/:studentId", studentsController.updateStudentDetails);
router.patch("/admin/students/:studentId", studentsController.updateStudentDetails);
router.patch("/admin/students/:studentId/class", studentsController.updateStudentClass);
router.get("/api-proxy/admin/students", requireAuth, verifyRole("admin"), studentsController.listStudents);
router.get("/api-proxy/admin/students/:studentId", requireAuth, verifyRole("admin"), studentsController.getStudent);
router.put("/api-proxy/admin/students/:studentId", requireAuth, verifyRole("admin"), studentsController.updateStudentDetails);
router.patch("/api-proxy/admin/students/:studentId", requireAuth, verifyRole("admin"), studentsController.updateStudentDetails);
router.patch("/api-proxy/admin/students/:studentId/class", requireAuth, verifyRole("admin"), studentsController.updateStudentClass);

router.route("/admin/staff")
    .get(getStaff);

router
    .route("/admin/dashboard")
    .get(adminController.getAdminDashboard)

router
    .route("/admin/add-staff")
    .post(idempotency(), addStaff)

router
    .route("/admin/staff-attendance")
    .get(allStaffAttendance)


module.exports = router;
