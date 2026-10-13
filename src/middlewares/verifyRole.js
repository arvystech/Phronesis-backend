// Verify user role for API
const verifyRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        title: "Unauthorized",
        message: "Authentication required to verify role access.",
      });
    }

    if (req.user.role !== role) {
      console.log(`[verifyRole] Role mismatch: required '${role}', user has '${req.user.role}'`);
      return res.status(403).json({
        success: false,
        statusCode: 403,
        title: "Forbidden",
        message: `Insufficient permissions. Access restricted to role: '${role}'.`,
      });
    }

    next();
  };
};

module.exports = verifyRole;
