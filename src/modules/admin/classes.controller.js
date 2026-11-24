const classesModel = require("./classes.model");

async function listClasses(_req, res) {
  try {
    const classes = await classesModel.listClasses();
    return res.json({ success: true, classes });
  } catch (error) {
    console.error("[classesController] listClasses:", error);
    return res.status(500).json({ success: false, message: "Unable to load classes." });
  }
}

async function createClass(req, res) {
  const className = typeof req.body?.class_name === "string" ? req.body.class_name.trim() : "";
  const teacherId = Number(req.body?.teacher_id);
  if (!className || className.length > 50) {
    return res.status(422).json({ success: false, code: "INVALID_CLASS_NAME", message: "class_name is required and must be at most 50 characters." });
  }
  if (!Number.isSafeInteger(teacherId) || teacherId < 1) {
    return res.status(422).json({ success: false, code: "INVALID_TEACHER", message: "A valid teacher_id is required." });
  }

  try {
    const createdClass = await classesModel.createClass({ className, teacherId });
    return res.status(201).json({ success: true, class: createdClass });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, code: "CLASS_ALREADY_EXISTS", message: "A class with this name already exists." });
    }
    if (error.status) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    console.error("[classesController] createClass:", error);
    return res.status(500).json({ success: false, message: "Unable to create class." });
  }
}

async function updateClassPassword(req, res) {
  const classId = Number(req.params.classId);
  const password = req.body?.password;
  if (!Number.isSafeInteger(classId) || classId < 1) {
    return res.status(422).json({ success: false, code: "INVALID_CLASS_ID", message: "A valid class ID is required." });
  }
  if (password !== null && (typeof password !== "string" || password.length < 8 || password.length > 128)) {
    return res.status(422).json({ success: false, code: "INVALID_PASSWORD", message: "password must be 8 to 128 characters, or null to clear it." });
  }

  try {
    const result = await classesModel.updateClassPassword(classId, password);
    return res.json({ success: true, class: result, message: password === null ? "Class password cleared." : "Class password updated." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    if (error.code === "ER_BAD_FIELD_ERROR") {
      return res.status(409).json({ success: false, code: "CLASS_PASSWORD_MIGRATION_REQUIRED", message: "Apply the class password database migration before updating passwords." });
    }
    console.error("[classesController] updateClassPassword:", error);
    return res.status(500).json({ success: false, message: "Unable to update class password." });
  }
}

module.exports = { listClasses, createClass, updateClassPassword };
