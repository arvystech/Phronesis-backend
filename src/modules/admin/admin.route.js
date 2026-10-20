const adminController = require("./admin.controller")
const { addStaff } = require("../staff/staff.controller")

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
    .post("/admin/add-staff", idempotency(), addStaff)
module.exports = router;