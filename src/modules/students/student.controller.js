const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const studentModel = require("./student.model");
const upload = require("../../middlewares/multer");
const { formatTime, formatTimetableEntries } = require("../../utils/formatTimetable");

// ==========================================
// 1. HELPER / VIEW RENDERING HANDLERS
// ==========================================

/**
 * Helper to render student views / return JSON payload
 */
const renderStudentView = async (req, res, viewName, pageTitle) => {
  try {
    const getStudent = await studentModel.getStudentById(req.user.id);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        title: "Student Not Found",
        message: "We could not find your student record.",
      });
    }

    let timetableDataGrouped = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };

    if (viewName === "home-dashboard" || viewName === "timetable") {
      const dbEntries = await studentModel.getTimetableByClassId(student.class_id);
      timetableDataGrouped = formatTimetableEntries(dbEntries);
    }

    res.json({
      success: true,
      pageTitle: pageTitle,
      view: viewName,
      user: student,
      role: "student",
      timetableDataGrouped: timetableDataGrouped,
    });
  } catch (error) {
    console.error(`[studentController] Error handling "${viewName}":`, error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      title: "Something Went Wrong",
      message: "We encountered an unexpected problem processing your request.",
    });
  }
};

// ==========================================
// 2. DASHBOARD, PROFILE & ACCOUNT HANDLERS
// ==========================================

const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        title: "Student Not Found",
        message: "We could not find your student record.",
      });
    }

    // Parallel data loading from database
    const [
      attendance,
      latestSessionTerm,
      paymentSummary,
      announcements,
      assessmentsSummary,
      dbEntries,
    ] = await Promise.all([
      studentModel.getStudentAttendance(studentId),
      studentModel.getLatestResultSessionAndTerm(studentId),
      studentModel.getPaymentStatusSummary(studentId),
      studentModel.getLatestAnnouncements(3),
      studentModel.getAssessmentSummary(studentId, student.class_id),
      studentModel.getTimetableByClassId(student.class_id),
    ]);

    let resultSummary = null;
    if (latestSessionTerm) {
      resultSummary = await studentModel.getResultSummary(
        studentId,
        latestSessionTerm.session_id,
        latestSessionTerm.term_id
      );
    }

    const timetableDataGrouped = formatTimetableEntries(dbEntries);

    res.json({
      success: true,
      pageTitle: "Student Dashboard",
      user: student,
      role: "student",
      attendance: attendance,
      resultSummary: resultSummary,
      paymentSummary: paymentSummary,
      announcements: announcements,
      assessmentsSummary: assessmentsSummary,
      timetableDataGrouped: timetableDataGrouped,
    });
  } catch (error) {
    console.error("[studentController] Error in getStudentDashboard:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      title: "Something Went Wrong",
      message: "We encountered an error loading your dashboard data.",
    });
  }
};

const getStudentSettings = (req, res) => {
  renderStudentView(req, res, "settings", "Settings");
};

const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const [attendance, latestSessionTerm] = await Promise.all([
      studentModel.getStudentAttendance(studentId),
      studentModel.getLatestResultSessionAndTerm(studentId),
    ]);

    let resultSummary = null;
    if (latestSessionTerm) {
      resultSummary = await studentModel.getResultSummary(
        studentId,
        latestSessionTerm.session_id,
        latestSessionTerm.term_id
      );
    }

    res.json({
      success: true,
      pageTitle: "Student Profile",
      user: student,
      role: "student",
      attendance: attendance,
      resultSummary: resultSummary,
    });
  } catch (error) {
    console.error("[studentController] Error in getStudentProfile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student profile.",
    });
  }
};

// Handle student profile image upload
const uploadSingle = upload.single("profile_pic");

const uploadProfilePic = (req, res) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      let message = "An error occurred during file upload.";
      if (err.code === "LIMIT_FILE_SIZE") {
        message = "File is too large. Maximum size allowed is 5MB.";
      } else if (err.code === "INVALID_FILE_TYPE") {
        message = err.message;
      }
      return res.status(400).json({ success: false, message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file was selected." });
    }

    try {
      const studentId = req.user.id;
      const newFilename = req.file.filename;

      const getStudent = await studentModel.getStudentById(studentId);
      const student = getStudent[0];
      const oldProfilePic = student ? student.profile_pic : null;

      await studentModel.updateStudentProfilePic(studentId, newFilename);

      if (oldProfilePic) {
        const oldPath = path.resolve(__dirname, "../../../frontend/uploads", oldProfilePic);
        fs.unlink(oldPath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== "ENOENT") {
            console.error("[studentController] Failed to delete old profile picture:", unlinkErr);
          }
        });
      }

      return res.json({
        success: true,
        message: "Profile picture updated successfully.",
        filePath: `/uploads/${newFilename}`,
      });
    } catch (dbErr) {
      console.error("[studentController] Database error updating profile pic:", dbErr);
      return res.status(500).json({
        success: false,
        message: "Failed to save profile picture in the database.",
      });
    }
  });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const studentId = req.user.id;

    // 1. Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all password fields.",
      });
    }

    // 2. Validate password confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation password do not match.",
      });
    }

    // 3. Enforce password complexity (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
      });
    }

    // 4. Fetch student details from database
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    // 5. Verify current password matches
    const isCurrentMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isCurrentMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect current password. Please check and try again.",
      });
    }

    // 6. Prevent setting new password to the same current password
    const isSameAsCurrent = await bcrypt.compare(newPassword, student.password);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password.",
      });
    }

    // 7. Hash new password & update database
    const newHashedPassword = await bcrypt.hash(newPassword, 12);
    await studentModel.updateStudentPassword(studentId, newHashedPassword);

    // 8. Invalidate session / cookie
    res.clearCookie("token");
    return res.json({
      success: true,
      message: "Password changed successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("[studentController] Error in changePassword:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while updating your password. Please try again.",
    });
  }
};

// ==========================================
// 3. ACADEMIC RESULTS HANDLERS
// ==========================================

const getStudentResults = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        title: "Student Not Found",
        message: "We could not find your student record.",
      });
    }

    const sessions = await studentModel.getSessions();
    const terms = await studentModel.getTerms();

    let sessionId = req.query.session ? parseInt(req.query.session, 10) : null;
    let termId = req.query.term ? parseInt(req.query.term, 10) : null;

    if (!sessionId || !termId) {
      const latest = await studentModel.getLatestResultSessionAndTerm(studentId);
      if (latest) {
        sessionId = sessionId || latest.session_id;
        termId = termId || latest.term_id;
      } else {
        sessionId = sessionId || (sessions.length > 0 ? sessions[0].session_id : null);
        termId = termId || (terms.length > 0 ? terms[0].term_id : null);
      }
    }

    let summary = null;
    let subjectResults = [];

    if (sessionId && termId) {
      summary = await studentModel.getResultSummary(studentId, sessionId, termId);
      if (summary) {
        subjectResults = await studentModel.getSubjectResults(summary.result_id);
      }
    }

    res.json({
      success: true,
      pageTitle: "Academic Results",
      user: student,
      role: "student",
      sessions: sessions,
      terms: terms,
      selectedSessionId: sessionId,
      selectedTermId: termId,
      summary: summary,
      subjectResults: subjectResults,
    });
  } catch (error) {
    console.error("[resultsController] Error in getStudentResults:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      title: "Something Went Wrong",
      message: "We encountered an unexpected problem loading your results.",
    });
  }
};

const printStudentResults = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        title: "Student Not Found",
        message: "We could not find your student record.",
      });
    }

    const sessions = await studentModel.getSessions();
    const terms = await studentModel.getTerms();

    let sessionId = req.query.session ? parseInt(req.query.session, 10) : null;
    let termId = req.query.term ? parseInt(req.query.term, 10) : null;

    if (!sessionId || !termId) {
      const latest = await studentModel.getLatestResultSessionAndTerm(studentId);
      if (latest) {
        sessionId = sessionId || latest.session_id;
        termId = termId || latest.term_id;
      } else {
        sessionId = sessionId || (sessions.length > 0 ? sessions[0].session_id : null);
        termId = termId || (terms.length > 0 ? terms[0].term_id : null);
      }
    }

    let summary = null;
    let subjectResults = [];

    if (sessionId && termId) {
      summary = await studentModel.getResultSummary(studentId, sessionId, termId);
      if (summary) {
        subjectResults = await studentModel.getSubjectResults(summary.result_id);
      }
    }

    res.json({
      success: true,
      pageTitle: "Official Report Card",
      user: student,
      role: "student",
      selectedSessionId: sessionId,
      selectedTermId: termId,
      summary: summary,
      subjectResults: subjectResults,
    });
  } catch (error) {
    console.error("[resultsController] Error in printStudentResults:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while generating the print report.",
    });
  }
};

// ==========================================
// 4. TIMETABLE HANDLERS
// ==========================================

const getStudentTimetable = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        title: "Student Not Found",
        message: "We could not find your student record.",
      });
    }

    const dbEntries = await studentModel.getTimetableByClassId(student.class_id);
    const timetableDataGrouped = formatTimetableEntries(dbEntries);

    res.json({
      success: true,
      pageTitle: "Timetable",
      view: "timetable",
      user: student,
      role: "student",
      timetableDataGrouped: timetableDataGrouped,
    });
  } catch (error) {
    console.error("[timetableController] Error in getStudentTimetable:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      title: "Something Went Wrong",
      message: "We encountered an unexpected problem processing your request.",
    });
  }
};

const getSubjectDetailsAPI = async (req, res) => {
  try {
    const studentId = req.user.id;
    const subjectName = req.query.subject;

    if (!subjectName) {
      return res.status(400).json({ success: false, message: "Subject parameter is required." });
    }

    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const details = await studentModel.getSubjectDetails(student.class_id, subjectName);

    if (!details || details.length === 0) {
      return res.json({
        success: true,
        data: {
          teacher: "TBD",
          room: "TBD",
          time: "TBD",
          syllabus: "No syllabus details available in database.",
        },
      });
    }

    const teacherName = details[0].teacher_name || "TBD";
    const syllabus = details[0].syllabus || "No syllabus details available in database.";

    const rooms = [...new Set(details.map((d) => d.room).filter(Boolean))];
    const roomStr = rooms.length > 0 ? rooms.join(", ") : "TBD";

    const scheduleLines = details.map((d) => {
      const startFormatted = formatTime(d.start_time);
      const endFormatted = formatTime(d.end_time);
      return `${d.day}: ${startFormatted.time} ${startFormatted.period} - ${endFormatted.time} ${endFormatted.period}`;
    });
    const scheduleStr = scheduleLines.join("<br>");

    return res.json({
      success: true,
      data: {
        teacher: teacherName,
        room: roomStr,
        time: scheduleStr,
        syllabus: syllabus,
      },
    });
  } catch (error) {
    console.error("[timetableController] Error in getSubjectDetailsAPI:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ==========================================
// 5. ASSESSMENTS HANDLERS
// ==========================================

const getStudentAssessments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const [assessments, summary] = await Promise.all([
      studentModel.getStudentAssessments(studentId, student.class_id),
      studentModel.getAssessmentSummary(studentId, student.class_id),
    ]);

    res.json({
      success: true,
      pageTitle: "Assessments",
      user: student,
      role: "student",
      assessments: assessments,
      summary: summary,
    });
  } catch (error) {
    console.error("[assessmentsController] Error in getStudentAssessments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student assessments.",
    });
  }
};

// ==========================================
// 6. PAYMENTS & FEES HANDLERS
// ==========================================

const getStudentPayments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const getStudent = await studentModel.getStudentById(studentId);
    const student = getStudent[0];

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const [payments, paymentSummary] = await Promise.all([
      studentModel.getStudentPayments(studentId),
      studentModel.getPaymentStatusSummary(studentId),
    ]);

    res.json({
      success: true,
      pageTitle: "Fees & Payments",
      user: student,
      role: "student",
      payments: payments,
      paymentSummary: paymentSummary,
    });
  } catch (error) {
    console.error("[paymentsController] Error in getStudentPayments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student payments.",
    });
  }
};

// ==========================================
// 7. ANNOUNCEMENTS HANDLERS
// ==========================================

const getAnnouncements = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const announcements = await studentModel.getLatestAnnouncements(limit);

    res.json({
      success: true,
      announcements: announcements,
    });
  } catch (error) {
    console.error("[announcementsController] Error in getAnnouncements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch announcements.",
    });
  }
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // Helpers & View Rendering
  renderStudentView,

  // Student Profile & Account
  getStudentDashboard,
  getStudentSettings,
  getStudentProfile,
  uploadProfilePic,
  changePassword,

  // Academic Results
  getStudentResults,
  printStudentResults,

  // Timetable
  getStudentTimetable,
  getSubjectDetailsAPI,

  // Assessments
  getStudentAssessments,

  // Payments & Fees
  getStudentPayments,

  // Announcements
  getAnnouncements,
};
