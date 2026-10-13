const createToken = require("./createToken");
const bcrypt = require("bcrypt");

/**
 * Handles login for any user role in API mode.
 * Sets the authentication cookie and returns a JSON response.
 */
async function handleLogin(identifier, password, role, model, idField, res) {
  // 1. Validate required fields
  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all fields before signing in.",
    });
  }

  try {
    // 2. Look up user by identifier
    const userData = await model(identifier);

    if (!userData || userData.length === 0) {
      return res.status(401).json({
        success: false,
        message: `No ${role.toLowerCase()} account was found with that ID. Please check and try again.`,
      });
    }

    const user = userData[0];

    // 3. Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again or contact your administrator.",
      });
    }

    // 4. Create JWT token
    const payload = {
      id: user[idField],
      role,
    };
    
    const token = createToken(payload);

    // 5. Set secure cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    // 6. Return JSON response for API consumers
    return res.json({
      success: true,
      message: "Authentication successful.",
      token,
      role,
      user: {
        id: user[idField],
        admission_number: user.admission_number,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error(`[handleLogin] Unexpected error for role "${role}":`, error);
    return res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again in a moment.",
    });
  }
}

module.exports = handleLogin;
