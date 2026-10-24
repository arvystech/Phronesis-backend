
const createToken = require("./createToken");
const bcrypt = require("bcrypt");

/**
 * Handles login for students, staff, and admins.
 */
async function handleLogin(
  identifier,
  password,
  role,
  model,
  idField,
  res
) {
  // 1. Validate required fields
  if (
    typeof identifier !== "string" ||
    !identifier.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all fields before signing in.",
    });
  }

  try {
    // 2. Retrieve the user.
    // The model returns one user object or null.
    const user = await model(identifier.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please check and try again.",
      });
    }

    // 3. Verify the password
    if (
      typeof user.password !== "string" ||
      !user.password
    ) {
      console.error(
        `[handleLogin] Password hash missing for role "${role}".`
      );

      return res.status(500).json({
        success: false,
        message: "Unable to authenticate this account.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please check and try again.",
      });
    }

    // 4. Validate the user ID
    const userId = user[idField];

    if (userId === undefined || userId === null) {
      throw new Error(
        `Missing ID field "${idField}" for role "${role}".`
      );
    }

    // 5. Create the JWT
    const token = createToken({
      id: userId,
      role,
    });

    // 6. Set the authentication cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 60 * 1000,
      path: "/",
    });

    // 7. Send the successful response
    return res.status(200).json({
      success: true,
      message: "Authentication successful.",
      role,
      user: {
        id: userId,
      },
      token,
    });
  } catch (error) {
    console.error(
      `[handleLogin] Unexpected error for role "${role}":`,
      error
    );

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: "A server error occurred. Please try again.",
    });
  }
}

module.exports = handleLogin;
