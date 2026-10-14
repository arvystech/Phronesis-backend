const adminController = require("./admin.controller")
const express = require("express");
const router = express.Router();
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");

router.use("/admin", requireAuth, verifyRole("admin"));

router
    .route("/admin/dashboard")
    .get(adminController.getAdminDashboard)


module.exports = router;