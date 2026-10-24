const connection = require("../../config/dbConnection");

/**
 * Get student by admission number for authentication
 * @param {string} admissionNumber
 * @returns {Promise<Array>}
 */
const getStudentByAdmissionNumber = async (admissionNumber) => {
  try {
    const [student] = await connection.query(
      `SELECT * FROM students WHERE admission_number = ?`,
      [admissionNumber],
    );
    return student[0] || null
  } catch (error) {
    console.error("[admin.model] Error in getStudentByAdmissionNumber:", error);
    return null;
  }
}

const getAdminByEmail = async (email) => {
  try {
    const [admin] = await connection.query(
      `SELECT * FROM admin WHERE email = ?`,
      [email],
    );
    return admin[0] || null
  } catch (error) {
    console.error("[admin.model] Error in getAdminByEmail:", error);
    return null;
  }
}

module.exports = {
  getStudentByAdmissionNumber, getAdminByEmail
};
