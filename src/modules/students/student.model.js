const connection = require("../../config/dbConnection");
const bcrypt = require("bcrypt");

// ==========================================
// 1. STUDENT PROFILE & AUTHENTICATION MODELS
// ==========================================

async function addStudent(
  admissionNumber,
  firstName,
  middleName,
  lastName,
  password,
  gender,
  dateOfBirth,
  classId,
  profilePic
) {
  try {
    const rawPassword = password || process.env.DEFAULT_STUDENT_PASSWORD || "Password123";
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const isDefaultPassword = rawPassword === (process.env.DEFAULT_STUDENT_PASSWORD || "Password123") ? 1 : 0;

    return new Promise((resolve, reject) => {
      connection.query(
        `INSERT INTO students(admission_number, first_name, middle_name, last_name, password, gender, date_of_birth, class_id, profile_pic, is_default_password) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [
          admissionNumber,
          firstName,
          middleName,
          lastName,
          hashedPassword,
          gender,
          dateOfBirth,
          classId,
          profilePic,
          isDefaultPassword,
        ],
        (err, student) => {
          if (err) return reject(err);
          resolve(student);
        }
      );
    });
  } catch (err) {
    throw err;
  }
}

// Get student By ID with class details
function getStudentById(studentId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        students.*,
        classes.class_name
      FROM students
      INNER JOIN classes
        ON students.class_id = classes.class_id
      WHERE students.student_id = ?
      `,
      [studentId],
      (err, student) => {
        if (err) return reject(err);
        resolve(student);
      }
    );
  });
}

// Get student by admission number
async function getStudentByAdmissionNumber(admissionNumber) {
  try {
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
  } catch (err) {
    throw err;
  }
}

// Update student profile picture
function updateStudentProfilePic(studentId, profilePic) {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE students SET profile_pic = ? WHERE student_id = ?`,
      [profilePic, studentId],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

// Update student password and set is_default_password to 0
function updateStudentPassword(studentId, newHashedPassword) {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE students SET password = ?, is_default_password = 0 WHERE student_id = ?`,
      [newHashedPassword, studentId],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

// Get student attendance metrics
function getStudentAttendance(studentId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT * FROM attendance
      WHERE student_id = ?
      ORDER BY session_id DESC, term_id DESC
      LIMIT 1
      `,
      [studentId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : { percentage: 90.0, remarks: "Good attendance!" });
      }
    );
  });
}

// ==========================================
// 2. ACADEMIC RESULTS MODELS
// ==========================================

/**
 * Fetch all academic sessions
 * @returns {Promise<Array>}
 */
function getSessions() {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM sessions ORDER BY session_name DESC",
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Fetch all academic terms
 * @returns {Promise<Array>}
 */
function getTerms() {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM terms ORDER BY term_id ASC",
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Fetch the latest session and term for which a student has results
 * @param {number} studentId
 * @returns {Promise<Object|null>}
 */
function getLatestResultSessionAndTerm(studentId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT session_id, term_id 
      FROM student_results 
      WHERE student_id = ? 
      ORDER BY session_id DESC, term_id DESC 
      LIMIT 1
      `,
      [studentId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      }
    );
  });
}

/**
 * Fetch the student's result summary for a session and term
 * @param {number} studentId
 * @param {number} sessionId
 * @param {number} termId
 * @returns {Promise<Object|null>}
 */
function getResultSummary(studentId, sessionId, termId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        sr.*, 
        s.session_name, 
        t.term_name,
        c.class_name
      FROM student_results sr
      JOIN sessions s ON sr.session_id = s.session_id
      JOIN terms t ON sr.term_id = t.term_id
      JOIN classes c ON sr.class_id = c.class_id
      WHERE sr.student_id = ? AND sr.session_id = ? AND sr.term_id = ?
      `,
      [studentId, sessionId, termId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results.length > 0 ? results[0] : null);
      }
    );
  });
}

/**
 * Fetch the detailed subject breakdown for a given result summary ID
 * @param {number} resultId
 * @returns {Promise<Array>}
 */
function getSubjectResults(resultId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        rs.result_subject_id,
        rs.result_id,
        rs.subject_id,
        rs.ca_score,
        rs.mid_term_score,
        rs.exam_score,
        rs.total_score,
        rs.grade,
        rs.remarks AS subject_remarks,
        s.subject_name,
        t.name AS teacher_name
      FROM result_subjects rs
      JOIN subjects s ON rs.subject_id = s.subject_id
      LEFT JOIN student_results sr ON rs.result_id = sr.result_id
      LEFT JOIN subject_teachers st ON (st.subject_id = rs.subject_id AND st.class_id = sr.class_id)
      LEFT JOIN teachers t ON st.teacher_id = t.teacher_id
      WHERE rs.result_id = ?
      ORDER BY s.subject_name ASC
      `,
      [resultId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

// ==========================================
// 3. TIMETABLE MODELS
// ==========================================

/**
 * Retrieve timetable entries for a specific class, joined with subjects and teachers.
 * Ordered chronologically by day and start time.
 * @param {number} classId 
 * @returns {Promise<Array>}
 */
function getTimetableByClassId(classId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        timetables.id,
        timetables.class_id,
        timetables.subject_id,
        timetables.teacher_id,
        timetables.day,
        timetables.start_time,
        timetables.end_time,
        timetables.room,
        subjects.subject_name,
        teachers.name AS teacher_name
      FROM timetables
      LEFT JOIN subjects
        ON timetables.subject_id = subjects.subject_id
      LEFT JOIN teachers
        ON timetables.teacher_id = teachers.teacher_id
      WHERE timetables.class_id = ?
      ORDER BY timetables.day, timetables.start_time
      `,
      [classId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Add a new timetable entry
 */
function addTimetableEntry(classId, subjectId, teacherId, day, startTime, endTime, room) {
  return new Promise((resolve, reject) => {
    connection.query(
      `INSERT INTO timetables (class_id, subject_id, teacher_id, day, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [classId, subjectId, teacherId, day, startTime, endTime, room],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Update an existing timetable entry
 */
function updateTimetableEntry(id, classId, subjectId, teacherId, day, startTime, endTime, room) {
  return new Promise((resolve, reject) => {
    connection.query(
      `UPDATE timetables SET class_id = ?, subject_id = ?, teacher_id = ?, day = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?`,
      [classId, subjectId, teacherId, day, startTime, endTime, room, id],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Delete a timetable entry
 */
function deleteTimetableEntry(id) {
  return new Promise((resolve, reject) => {
    connection.query(
      `DELETE FROM timetables WHERE id = ?`,
      [id],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Retrieve specific subject details (teacher name, rooms, days, times, syllabus) 
 * for a specific class.
 * @param {number} classId
 * @param {string} subjectName
 * @returns {Promise<Array>}
 */
function getSubjectDetails(classId, subjectName) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        timetables.room,
        timetables.day,
        timetables.start_time,
        timetables.end_time,
        subjects.subject_name,
        subjects.syllabus,
        teachers.name AS teacher_name
      FROM timetables
      JOIN subjects
        ON timetables.subject_id = subjects.subject_id
      LEFT JOIN teachers
        ON timetables.teacher_id = teachers.teacher_id
      WHERE timetables.class_id = ? AND subjects.subject_name = ?
      ORDER BY timetables.day, timetables.start_time
      `,
      [classId, subjectName],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

// ==========================================
// 4. ASSESSMENTS MODELS
// ==========================================

/**
 * Fetch all assessments for a student's class with student specific submission status
 * @param {number} studentId 
 * @param {number} classId 
 * @returns {Promise<Array>}
 */
function getStudentAssessments(studentId, classId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        a.assessment_id,
        a.title,
        a.description,
        a.assessment_type,
        a.due_date,
        a.total_marks,
        s.subject_name,
        t.name AS teacher_name,
        COALESCE(sa.submission_status, 
          IF(a.due_date < NOW(), 'Overdue', 'Upcoming')
        ) AS status,
        sa.score,
        sa.feedback,
        sa.submission_date
      FROM assessments a
      JOIN subjects s ON a.subject_id = s.subject_id
      LEFT JOIN teachers t ON a.teacher_id = t.teacher_id
      LEFT JOIN student_assessments sa ON (sa.assessment_id = a.assessment_id AND sa.student_id = ?)
      WHERE a.class_id = ?
      ORDER BY a.due_date ASC
      `,
      [studentId, classId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Get summary counts for student assessments (Pending, Upcoming, Completed, Overdue)
 * @param {number} studentId 
 * @param {number} classId 
 * @returns {Promise<Object>}
 */
function getAssessmentSummary(studentId, classId) {
  return new Promise((resolve, reject) => {
    getStudentAssessments(studentId, classId)
      .then((items) => {
        const pendingCount = items.filter((i) => i.status === "Pending" || i.status === "Upcoming").length;
        const upcomingThisWeekCount = items.filter((i) => i.status === "Upcoming" || i.status === "Pending").length;
        const completedCount = items.filter((i) => i.status === "Completed").length;
        const overdueCount = items.filter((i) => i.status === "Overdue").length;

        resolve({
          pending: pendingCount,
          upcomingThisWeek: upcomingThisWeekCount,
          completed: completedCount,
          overdue: overdueCount,
          total: items.length,
        });
      })
      .catch(reject);
  });
}

// ==========================================
// 5. PAYMENTS & FEES MODELS
// ==========================================

/**
 * Fetch student payment history joined with session and term names
 * @param {number} studentId 
 * @returns {Promise<Array>}
 */
function getStudentPayments(studentId) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        p.payment_id,
        p.student_id,
        p.title,
        p.amount_due,
        p.amount_paid,
        p.payment_date,
        p.payment_method,
        p.transaction_ref,
        p.status,
        s.session_name,
        t.term_name
      FROM student_payments p
      JOIN sessions s ON p.session_id = s.session_id
      JOIN terms t ON p.term_id = t.term_id
      WHERE p.student_id = ?
      ORDER BY p.session_id DESC, p.term_id DESC
      `,
      [studentId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

/**
 * Fetch overall payment summary and metrics for student
 * @param {number} studentId 
 * @returns {Promise<Object>}
 */
function getPaymentStatusSummary(studentId) {
  return new Promise((resolve, reject) => {
    getStudentPayments(studentId)
      .then((payments) => {
        let totalDue = 0;
        let totalPaid = 0;
        let termsPaid = 0;
        let pendingCount = 0;

        payments.forEach((p) => {
          totalDue += parseFloat(p.amount_due || 0);
          totalPaid += parseFloat(p.amount_paid || 0);
          if (p.status === "Paid") termsPaid++;
          if (p.status === "Pending" || p.status === "Partial") pendingCount++;
        });

        const outstandingBalance = totalDue - totalPaid;
        const status = outstandingBalance <= 0 ? "Up-to-Date" : "Pending";

        resolve({
          status: status,
          outstandingBalance: outstandingBalance > 0 ? outstandingBalance : 0,
          termsPaidCount: termsPaid,
          onTimePercentage: payments.length > 0 ? Math.round((termsPaid / payments.length) * 100) : 100,
          pendingFees: outstandingBalance > 0 ? outstandingBalance : 0,
        });
      })
      .catch(reject);
  });
}

// ==========================================
// 6. ANNOUNCEMENTS MODELS
// ==========================================

/**
 * Fetch latest school announcements ordered chronologically
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
function getLatestAnnouncements(limit = 5) {
  return new Promise((resolve, reject) => {
    connection.query(
      `
      SELECT 
        announcement_id,
        title,
        content,
        category,
        publish_date,
        author
      FROM announcements
      ORDER BY publish_date DESC, announcement_id DESC
      LIMIT ?
      `,
      [limit],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Student Profile & Core
  addStudent,
  getStudentById,
  getStudentByAdmissionNumber,
  updateStudentProfilePic,
  updateStudentPassword,
  getStudentAttendance,

  // Academic Results
  getSessions,
  getTerms,
  getLatestResultSessionAndTerm,
  getResultSummary,
  getSubjectResults,

  // Timetable
  getTimetableByClassId,
  addTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  getSubjectDetails,

  // Assessments
  getStudentAssessments,
  getAssessmentSummary,

  // Payments & Fees
  getStudentPayments,
  getPaymentStatusSummary,

  // Announcements
  getLatestAnnouncements,
};
