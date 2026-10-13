require('dotenv').config();
const studentModel = require("../src/modules/students/student.model");
const resultsModel = studentModel;
const timetableModel = studentModel;
const assessmentsModel = studentModel;
const paymentsModel = studentModel;
const announcementsModel = studentModel;

async function runTests() {
  console.log("=== Testing Database Models ===");
  try {
    const students = await studentModel.getStudentById(3);
    console.log("Student (ID 3):", students[0].first_name, students[0].last_name, "Class:", students[0].class_name);

    const attendance = await studentModel.getStudentAttendance(3);
    console.log("Attendance:", attendance.percentage + "%", "-", attendance.remarks);

    const latest = await resultsModel.getLatestResultSessionAndTerm(3);
    console.log("Latest Result Session/Term:", latest);

    if (latest) {
      const summary = await resultsModel.getResultSummary(3, latest.session_id, latest.term_id);
      console.log("Result Summary GPA:", summary.gpa, "Rank:", summary.class_position);

      const subjectResults = await resultsModel.getSubjectResults(summary.result_id);
      console.log("Subject Results Count:", subjectResults.length);
    }

    const timetable = await timetableModel.getTimetableByClassId(students[0].class_id);
    console.log("Timetable Entries Count:", timetable.length);

    const assessments = await assessmentsModel.getStudentAssessments(3, students[0].class_id);
    console.log("Assessments Count:", assessments.length);

    const assessmentSummary = await assessmentsModel.getAssessmentSummary(3, students[0].class_id);
    console.log("Assessment Summary:", assessmentSummary);

    const payments = await paymentsModel.getStudentPayments(3);
    console.log("Payments Count:", payments.length);

    const paymentSummary = await paymentsModel.getPaymentStatusSummary(3);
    console.log("Payment Summary:", paymentSummary);

    const announcements = await announcementsModel.getLatestAnnouncements(3);
    console.log("Announcements Count:", announcements.length);

    console.log("\n✅ ALL DATABASE MODEL VERIFICATIONS PASSED SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed with error:", err);
    process.exit(1);
  }
}

runTests();
