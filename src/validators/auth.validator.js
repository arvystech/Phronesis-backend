/**
 * Password complexity validation regex
 * Requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const validatePasswordComplexity = (password) => {
  return passwordRegex.test(password);
};

function validateLoginInput(identifier, password) {
  if (
    typeof identifier !== "string" ||
    identifier.trim() === "" ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    return {
      isValid: false,
      message: "Please provide a valid identifier and password.",
    };
  }

  return { isValid: true };
}

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
