const authModel = require("./auth.model");
const handleLogin = require("../../utils/handleLogin");


/////////// STUDENT ////////////

// Student login endpoint information
const getStudentLogin = (req, res) => {
  res.json({
    success: true,
    message: "Student authentication endpoint. Submit POST request with admissionNumber and password.",
    csrfToken: res.locals.csrfToken || null,
  });
};

// Post Student login
const postStudentLogin = (req, res) => {
  const { admissionNumber, password } = req.body;

  handleLogin(
    admissionNumber,
    password,
    "student",
    authModel.getStudentByAdmissionNumber,
    "student_id",
    res
  );
};

// Student Logout
const getStudentLogout = (req, res) => {
  res.clearCookie("token");
  res.json({
    success: true,
    message: "Logged out successfully.",
  });
};


///////////// ADMIN ////////////////

//getAdmin Login
const getAdminLogin = (req, res) => {
  return res.json({
    success: true,
    message: "Admin Authentication Endpoint reached. Submit Post request with edmin email and password",
    csrfToken: res.locals.csrfToken || null
  })
}

//Post Admin Login
const postAdminLogin = (req, res) => {
  const { email, password } = req.body || {};

  handleLogin(
    email,
    password,
    "admin",
    authModel.getAdminByEmail,
    "admin_id",
    res
  );
};

module.exports = { getStudentLogin, postStudentLogin, getStudentLogout, getAdminLogin, postAdminLogin };
