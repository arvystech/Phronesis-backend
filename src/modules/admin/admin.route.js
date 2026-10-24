const adminController = require("./admin.controller")
const { addStaff, staffAttendance } = require("../staff/staff.controller")


// const {addStaff} require("")
const express = require("express");
const router = express.Router();
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");
const idempotency = require("../../middlewares/idempotency");

router.use("/admin", requireAuth, verifyRole("admin"));

router
    .route("/admin/dashboard")
    .get(adminController.getAdminDashboard)

router
    .route("/admin/add-staff")
    .post(idempotency(), addStaff)

router
    .route("/admin/staff-attendance")
    .get(staffAttendance)


module.exports = router;