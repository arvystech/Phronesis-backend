const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config(); // fallback

const express = require("express");
const cookieParser = require("cookie-parser");
const csrf = require("@dr.pogodin/csurf");

// Initialize Database Connection
require("./config/dbConnection");

// Import Feature Routes
const authRoutes = require("./modules/auth/auth.routes");
const studentRoutes = require("./modules/students/student.routes");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded media (profile pictures, etc.)
app.use("/uploads", express.static(path.join(__dirname, "../frontend/uploads")));

// CSRF Protection (Cookie-based)
app.use(
  csrf({
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Expose CSRF token in response header / locals
app.use((req, res, next) => {
  const token = req.csrfToken ? req.csrfToken() : null;
  if (token) {
    res.setHeader("X-CSRF-Token", token);
    res.locals.csrfToken = token;
  }
  next();
});

// API Root / Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "PHRONESIS Academy API",
    version: "2.4.0",
    status: "online",
    timestamp: new Date().toISOString(),
    csrfToken: res.locals.csrfToken || null,
  });
});

// Admission Info API
app.get("/admission-info", (req, res) => {
  res.json({
    success: true,
    school: "PHRONESIS SUNESIS ACADEMY",
    admissions: {
      status: "Open for 2026/2027 Academic Session",
      levels: ["Junior Secondary School (JSS 1 - 3)", "Senior Secondary School (SSS 1 - 3)"],
      contact: {
        email: "admissions@phronesis.edu",
        phone: "+234 801 234 5678",
        office: "12 Academy Road, Phronesis City",
      },
    },
  });
});

// Mount Modular Feature Routes
app.use(authRoutes);
app.use(studentRoutes);

// ─── 404 API Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    title: "Endpoint Not Found",
    message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this API service.`,
  });
});

// ─── 500 / Global API Error Handler
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    console.warn("[CSRF Error]", err.message, "IP:", req.ip, "URL:", req.originalUrl);
    return res.status(403).json({
      success: false,
      statusCode: 403,
      title: "Invalid Security Token",
      message: "Invalid or expired CSRF token.",
    });
  }

  console.error("[Global Error Handler]", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    statusCode: status,
    title: "Internal Server Error",
    message: err.message || "An unexpected server error occurred.",
  });
});

module.exports = app;
