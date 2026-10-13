/**
 * Password complexity validation regex
 * Requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const validatePasswordComplexity = (password) => {
  return passwordRegex.test(password);
};

const validateLoginInput = (identifier, password) => {
  if (!identifier || !password) {
    return {
      isValid: false,
      message: "Please fill in all fields before signing in.",
    };
  }
  return { isValid: true };
};

const validateChangePasswordInput = (currentPassword, newPassword, confirmPassword) => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      isValid: false,
      message: "Please fill in all password fields.",
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      isValid: false,
      message: "New password and confirmation password do not match.",
    };
  }
  if (!validatePasswordComplexity(newPassword)) {
    return {
      isValid: false,
      message:
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.",
    };
  }
  return { isValid: true };
};

module.exports = {
  passwordRegex,
  validatePasswordComplexity,
  validateLoginInput,
  validateChangePasswordInput,
};
