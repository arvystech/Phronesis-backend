const jwt = require("jsonwebtoken");
const createToken = require("../utils/createToken");

// Authenticate user for API
const requireAuth = (req, res, next) => {
  let token = req.cookies && req.cookies.token;
  if (!token && req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      title: "Authentication Required",
      message: "Please log in to access this resource.",
      redirect: "/login/student",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("JWT Error:", err.message);

      // Remove the expired/invalid cookie
      if (res.clearCookie) res.clearCookie("token");

      return res.status(401).json({
        success: false,
        statusCode: 401,
        title: "Session Expired",
        message: "Session expired or invalid token. Please log in again.",
        redirect: "/login/student",
      });
    }

    // Store user information
    req.user = decoded;

    // Sliding expiration: renew if less than 15 minutes remain before expiry
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp - currentTime;

    if (timeRemaining < 15 * 60) {
      const newToken = createToken({
        id: decoded.id,
        role: decoded.role,
      });

      // Replace the old cookie with the renewed one
      if (res.cookie) {
        res.cookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 30 * 60 * 1000, // 30 minutes
        });
      }
      res.setHeader("X-Refreshed-Token", newToken);
    }

    next();
  });
};

module.exports = { requireAuth };
