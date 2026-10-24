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

    const [result] = await connection.query(
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
    );
    return result;
  } catch (err) {
    throw err;
  }
}

// Get student By ID with class details
const getStudentById = async (studentId) => {
  const [student] = await connection.query(
    `
      SELECT 
        students.*,
        classes.class_name
      FROM students
      INNER JOIN classes
        ON students.class_id = classes.class_id
      WHERE students.student_id = ?
      `,
    [studentId]
  );
  return student[0] || null;
}

// Get student by admission number
const getStudentByAdmissionNumber = async (admissionNumber) => {
  const [student] = await connection.query(
    `SELECT * FROM students WHERE admission_number = ?`,
    [admissionNumber],
  );
  return student[0] || null;
}

// Update student profile picture
const updateStudentProfilePic = async (studentId, profilePic) => {
  const [result] = await connection.query(
    `UPDATE students SET profile_pic = ? WHERE student_id = ?`,
    [profilePic, studentId],
  );
  return result;
}

// Update student password and set is_default_password to 0.
// If expectedOldPassword is provided, atomically verifies that the password
// has not changed concurrently before applying the update (Optimistic Concurrency Control).
const updateStudentPassword = async (studentId, newHashedPassword, expectedOldPassword = null) => {
  let sql = `UPDATE students SET password = ?, is_default_password = 0 WHERE student_id = ?`;
  const params = [newHashedPassword, studentId];

  if (expectedOldPassword) {
    sql += ` AND password = ?`;
    params.push(expectedOldPassword);
  }

  const [result] = await connection.query(sql, params);
  return result;
}

// Get student attendance metrics
const getStudentAttendance = async (studentId) => {
  connection.query(
    `
      SELECT * FROM attendance
      WHERE student_id = ?
      ORDER BY session_id DESC, term_id DESC
      LIMIT 1
      `,
    [studentId],
  );
  return results.length > 0 ? results[0] : { percentage: 90.0, remarks: "Good attendance!" };
}

// ==========================================
// 2. ACADEMIC RESULTS MODELS
// ==========================================

/**
 * Fetch all academic sessions
 * @returns {Promise<Array>}
 */
const getSessions = async () => {
  connection.query(
    "SELECT * FROM sessions ORDER BY session_name DESC",
  );
}

/**
 * Fetch all academic terms
 * @returns {Promise<Array>}
 */
const getTerms = async () => {
  connection.query(
    "SELECT * FROM terms ORDER BY term_id ASC",
  );
  return results;
}

/**
 * Fetch the latest session and term for which a student has results
 * @param {number} studentId
 * @returns {Promise<Object|null>}
 */
const getLatestResultSessionAndTerm = async (studentId) => {
  connection.query(
    `
      SELECT session_id, term_id 
      FROM student_results 
      WHERE student_id = ? 
      ORDER BY session_id DESC, term_id DESC 
      LIMIT 1
      `,
    [studentId],
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Fetch the student's result summary for a session and term
 * @param {number} studentId
 * @param {number} sessionId
 * @param {number} termId
 * @returns {Promise<Object|null>}
 */
const getResultSummary = async (studentId, sessionId, termId) => {
  const [results] = await connection.query(
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
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Fetch the detailed subject breakdown for a given result summary ID
 * @param {number} resultId
 * @returns {Promise<Array>}
 */
const getSubjectResults = async (resultId) => {
  const [results] = await connection.query(
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
  );
  return results;
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
const getTimetableByClassId = async (classId) => {
  const [results] = await connection.query(
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
  );
  return results;
}

/**
 * Add a new timetable entry
 */
const addTimetableEntry = async (classId, subjectId, teacherId, day, startTime, endTime, room) => {
  const [results] = await connection.query(
    `INSERT INTO timetables (class_id, subject_id, teacher_id, day, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [classId, subjectId, teacherId, day, startTime, endTime, room],
  );
  return results;
}

/**
 * Update an existing timetable entry
 */
const updateTimetableEntry = async (id, classId, subjectId, teacherId, day, startTime, endTime, room) => {
  const [results] = await connection.query(
    `UPDATE timetables SET class_id = ?, subject_id = ?, teacher_id = ?, day = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?`,
    [classId, subjectId, teacherId, day, startTime, endTime, room, id],
  );
  return results;
}

/**
 * Delete a timetable entry
 */
const deleteTimetableEntry = async (id) => {
  const [results] = await connection.query(
    `DELETE FROM timetables WHERE id = ?`,
    [id],
  );
  return results;
}

/**
 * Retrieve specific subject details (teacher name, rooms, days, times, syllabus) 
 * for a specific class.
 * @param {number} classId
 * @param {string} subjectName
 * @returns {Promise<Array>}
 */
const getSubjectDetails = async (classId, subjectName) => {
  const [results] = await connection.query(
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
  );
  return results;
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
const getStudentAssessments = async (studentId, classId) => {
  const [results] = await connection.query(
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
  );
  return results;
}

/**
 * Get summary counts for student assessments (Pending, Upcoming, Completed, Overdue)
 * @param {number} studentId 
 * @param {number} classId 
 * @returns {Promise<Object>}
 */
const getAssessmentSummary = async (studentId, classId) => {
  const items = await getStudentAssessments(studentId, classId)
  const pendingCount = items.filter((i) => i.status === "Pending" || i.status === "Upcoming").length;
  const upcomingThisWeekCount = items.filter((i) => i.status === "Upcoming" || i.status === "Pending").length;
  const completedCount = items.filter((i) => i.status === "Completed").length;
  const overdueCount = items.filter((i) => i.status === "Overdue").length;

  return ({
    pending: pendingCount,
    upcomingThisWeek: upcomingThisWeekCount,
    completed: completedCount,
    overdue: overdueCount,
    total: items.length,
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
const getStudentPayments = async (studentId) => {
  const [results] = await connection.query(
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
  );
  return results;
}

/**
 * Fetch overall payment summary and metrics for student
 * @param {number} studentId 
 * @returns {Promise<Object>}
 */
const getPaymentStatusSummary = async (studentId) => {
  const payments = await getStudentPayments(studentId)
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

  return ({
    status: status,
    outstandingBalance: outstandingBalance > 0 ? outstandingBalance : 0,
    termsPaidCount: termsPaid,
    onTimePercentage: payments.length > 0 ? Math.round((termsPaid / payments.length) * 100) : 100,
    pendingFees: outstandingBalance > 0 ? outstandingBalance : 0,
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
const getLatestAnnouncements = async (limit = 5) => {
  const [results] = await connection.query(
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
  );
  return results;
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
