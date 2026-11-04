const adminController = require("./admin.controller")
const { addStaff, getStaff, allStaffAttendance, getDetailById, getAttendanceById } = require("../staff/staff.controller")


// const {addStaff} require("")
const express = require("express");
const router = express.Router();
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");
const idempotency = require("../../middlewares/idempotency");

router.use("/admin", requireAuth, verifyRole("admin"));

router.get("/admin/staff/:id", getDetailById);
router.get("/admin/staff/:id/attendance", getAttendanceById);

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