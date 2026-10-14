const connection = require("../../config/dbConnection");

/**
 * Get student by admission number for authentication
 * @param {string} admissionNumber
 * @returns {Promise<Array>}
 */
function getStudentByAdmissionNumber(admissionNumber) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM students WHERE admission_number = ?`,
      [admissionNumber],
      (err, student) => {
        if (err) return reject(err);
        resolve(student);
      }
    );
  });
}

function getAdminByEmail(email) {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM admin WHERE email = ?`,
      [email], (err, admin) => {
        if (err) return reject(err)
        resolve(admin)
      }
    )
  })
}

module.exports = {
  getStudentByAdmissionNumber, getAdminByEmail
};
