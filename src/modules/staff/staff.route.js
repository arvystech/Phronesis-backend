const express = require("express")
const { getDetailById, getAttendanceById } = require("./staff.controller")
const verifyRole = require("../../middlewares/verifyRole");
const { requireAuth } = require("../../middlewares/verifyToken");
const router = express.Router()

const requireSelf = (req, res, next) => {
    if (String(req.user.id) !== String(req.params.id)) {
        return res.status(403).json({
            success: false,
            statusCode: 403,
            title: "Forbidden",
            message: "You can only access your own records.",
        });
    }
    next();
};


router.use("/staff", requireAuth, verifyRole("staff"));

router.get("/staff/:id", requireSelf, getDetailById)

router.get("/staff/:id/attendance/", requireSelf, getAttendanceById)



module.exports = router;