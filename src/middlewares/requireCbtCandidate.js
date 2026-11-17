const jwt = require("jsonwebtoken");

function requireCbtCandidate(req, res, next) {
  const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  // Prefer an explicitly supplied fresh bearer token over a possibly stale cookie.
  const token = bearer || req.cookies?.cbt_candidate;
  if (!token) return res.status(401).json({ success: false, statusCode: 401, code: "CBT_ACCESS_REQUIRED", message: "Enter your admission number to access the CBT." });

  try {
    const candidate = jwt.verify(token, process.env.JWT_SECRET);
    if (candidate.role !== "cbt_candidate" || !candidate.id) throw new Error("Invalid CBT candidate token");
    req.cbtCandidate = { id: candidate.id };
    next();
  } catch (_) {
    res.clearCookie("cbt_candidate", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return res.status(401).json({ success: false, statusCode: 401, code: "CBT_ACCESS_EXPIRED", message: "CBT access expired. Enter your admission number again." });
  }
}

module.exports = requireCbtCandidate;
