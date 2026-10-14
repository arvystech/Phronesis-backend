const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const createLoginLimiter = require("../../middlewares/loginLimiter");
const studentLoginLimiter = createLoginLimiter("/login/student");
const teacherLoginLimiter = createLoginLimiter("/login/teacher");
const adminLoginLimiter = createLoginLimiter("/login/admin");


//////// STUDENT ROUTES //////////
router
  .route("/login/student")
  .get(authController.getStudentLogin)
  .post(studentLoginLimiter, authController.postStudentLogin);

router.get("/logout/student", authController.getStudentLogout);

/////// ADMIN ROUTES //////////

router
  .route("/login/admin")
  .get(authController.getAdminLogin)
  .post(adminLoginLimiter, authController.postAdminLogin)
module.exports = router;
