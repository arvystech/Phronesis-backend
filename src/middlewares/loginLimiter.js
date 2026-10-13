
const rateLimit = require("express-rate-limit");

function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    // Successful logins won't count toward the limit.
    skipSuccessfulRequests: true,

    handler: (req, res, next, options) => {
      return res.status(options.statusCode).json({
        success: false,
        message:
          "Too many login attempts. Please try again after 15 minutes.",
      });
    },
  });
}


module.exports = createLoginLimiter;
