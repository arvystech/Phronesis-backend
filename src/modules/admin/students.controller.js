const studentsModel = require("./students.model");

async function listStudents(req, res) {
  try {
    const data = await studentsModel.listStudents(req.query);
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error("[adminStudentsController] listStudents:", error);
    return res.status(500).json({ success: false, message: "Unable to load students." });
  }
}

async function getStudent(req, res) {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, code: "INVALID_STUDENT_ID", message: "A valid student ID is required." });
  }
  try {
    const student = await studentsModel.getStudentById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    return res.json({ success: true, student });
  } catch (error) {
    console.error("[adminStudentsController] getStudent:", error);
    return res.status(500).json({ success: false, message: "Unable to load student details." });
  }
}

async function updateStudentClass(req, res) {
  const studentId = Number(req.params.studentId);
  const classId = Number(req.body?.class_id);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, code: "INVALID_STUDENT_ID", message: "A valid student ID is required." });
  }
  if (!Number.isSafeInteger(classId) || classId < 1) {
    return res.status(422).json({ success: false, code: "INVALID_CLASS", message: "A valid class_id is required." });
  }
  try {
    const student = await studentsModel.updateStudentClass(studentId, classId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    return res.json({ success: true, student, message: "Student class updated." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[adminStudentsController] updateStudentClass:", error);
    return res.status(500).json({ success: false, message: "Unable to update student class." });
  }
}

const EDITABLE_STUDENT_FIELDS = {
  admission_number: { aliases: ["admission_number", "admissionNumber"], max: 50, requiredText: true },
  first_name: { aliases: ["first_name", "firstName"], max: 50, requiredText: true },
  middle_name: { aliases: ["middle_name", "middleName"], max: 50, optional: true },
  last_name: { aliases: ["last_name", "lastName"], max: 50, requiredText: true },
  gender: { aliases: ["gender"], max: 10, optional: true },
  date_of_birth: { aliases: ["date_of_birth", "dateOfBirth"], max: 30, optional: true, date: true },
  class_id: { aliases: ["class_id", "classId"], integer: true },
  parent_name: { aliases: ["parent_name", "parentName", "guardianName"], max: 100, optional: true },
  parent_phone: { aliases: ["parent_phone", "parentPhone", "guardianPhone"], max: 30, optional: true },
};

function pickInput(body, aliases) {
  for (const alias of aliases) if (Object.prototype.hasOwnProperty.call(body, alias)) return { found: true, value: body[alias] };
  return { found: false };
}

function validDate(value) {
  if (value === null || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function updateStudentDetails(req, res) {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId < 1) {
    return res.status(400).json({ success: false, code: "INVALID_STUDENT_ID", message: "A valid student ID is required." });
  }
  const body = req.body || {};
  const updates = {};
  for (const [column, rule] of Object.entries(EDITABLE_STUDENT_FIELDS)) {
    const input = pickInput(body, rule.aliases);
    if (!input.found) continue;
    if (rule.integer) {
      const value = Number(input.value);
      if (!Number.isSafeInteger(value) || value < 1) return res.status(422).json({ success: false, code: "INVALID_CLASS", message: "class_id must be a valid class ID." });
      updates[column] = value;
      continue;
    }
    if (input.value === null || input.value === "") {
      if (rule.requiredText) return res.status(422).json({ success: false, code: "INVALID_STUDENT_DETAILS", message: `${column} cannot be empty.` });
      if (!rule.optional) continue;
      updates[column] = null;
      continue;
    }
    if (typeof input.value !== "string") return res.status(422).json({ success: false, code: "INVALID_STUDENT_DETAILS", message: `${column} must be text.` });
    const value = input.value.trim();
    if (!value && rule.requiredText) return res.status(422).json({ success: false, code: "INVALID_STUDENT_DETAILS", message: `${column} cannot be empty.` });
    if (value.length > rule.max) return res.status(422).json({ success: false, code: "INVALID_STUDENT_DETAILS", message: `${column} must be ${rule.max} characters or fewer.` });
    if (rule.date && !validDate(value)) return res.status(422).json({ success: false, code: "INVALID_DATE_OF_BIRTH", message: "date_of_birth must be a valid YYYY-MM-DD date." });
    updates[column] = value || null;
  }
  if (!Object.keys(updates).length) return res.status(422).json({ success: false, code: "NO_FIELDS_TO_UPDATE", message: "Provide at least one editable student field." });

  try {
    const student = await studentsModel.updateStudentDetails(studentId, updates);
    if (!student) return res.status(404).json({ success: false, message: "Student not found." });
    return res.json({ success: true, student, message: "Student details updated." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, code: "ADMISSION_NUMBER_EXISTS", message: "Another student already uses this admission number." });
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    console.error("[adminStudentsController] updateStudentDetails:", error);
    return res.status(500).json({ success: false, message: "Unable to update student details." });
  }
}

module.exports = { listStudents, getStudent, updateStudentClass, updateStudentDetails };
