const jwt = require("jsonwebtoken");
const db = require("../config/dbConnection");

async function requireResultsTeacher(req, res, next) {
  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer || req.cookies?.results_teacher;
  if (!token) return res.status(401).json({ success: false, code: "RESULTS_LOGIN_REQUIRED", message: "Log in with the class password to access Results." });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "results_teacher" || !payload.classId) throw new Error("Invalid results session");
  } catch (_) {
    res.clearCookie("results_teacher", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/" });
    return res.status(401).json({ success: false, code: "RESULTS_SESSION_EXPIRED", message: "Results session expired. Log in again." });
  }
  try {
    const [periods] = await db.query("SELECT session_id,term_id FROM results_active_period WHERE setting_id=1");
    if (!periods.length || !periods[0].session_id || !periods[0].term_id) {
      return res.status(503).json({ success: false, code: "ACTIVE_PERIOD_NOT_CONFIGURED", message: "The active academic session and term have not been configured." });
    }
    req.resultsTeacher = { classId: Number(payload.classId), sessionId: Number(periods[0].session_id), termId: Number(periods[0].term_id) };
    next();
  } catch (error) {
    console.error("[resultsAuth] Active period lookup failed:", error);
    return res.status(503).json({ success: false, code: "RESULTS_UNAVAILABLE", message: "Results service is temporarily unavailable." });
  }
}

function requireOwnResultsClass(req, res, next) {
  if (String(req.params.classId) !== String(req.resultsTeacher.classId)) {
    return res.status(403).json({ success: false, code: "CLASS_ACCESS_DENIED", message: "This session can only access its assigned class." });
  }
  next();
}

module.exports = { requireResultsTeacher, requireOwnResultsClass };
