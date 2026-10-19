const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "PHRONESIS Academy Portal API",
    version: "2.4.0",
    description: `
### Welcome to the PHRONESIS Academy Portal Backend API

This interactive documentation allows you to explore and test every API endpoint in the system.

---

### How to Test Protected Endpoints (Authentication Guide):

1. **Log in first**:
   - For **Student endpoints** (\`/student/*\`): Execute **POST /login/student** with a valid student admission number and password.
   - For **Admin endpoints** (\`/admin/*\`): Execute **POST /login/admin** with a valid admin email and password.

2. **Automatic Token Authorization**:
   - The login endpoint returns a **JWT token** in the response.
   - **Swagger UI will automatically detect the token and authorize your session!**
   - Alternatively, you can copy the returned \`token\` string, click the **Authorize 🔓** button at the top-right of this page, paste the token into **BearerAuth**, and click **Authorize**.

3. **CSRF & Security**:
   - Cookie-based CSRF protection is active for web sessions.
   - API endpoints accessed using **Bearer authentication** or directly from this Swagger interface automatically bypass CSRF restrictions, allowing friction-free testing.
    `,
    contact: {
      name: "PHRONESIS Academy Admissions & IT Support",
      email: "admissions@phronesis.edu",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current Host / Default Server",
    },
    {
      url: "http://localhost:3000",
      description: "Local Development Server (Port 3000)",
    },
    {
      url: "https://api.phronesis-sunesis.com.ng",
      description: "Production Server",
    },
  ],
  tags: [
    {
      name: "General",
      description: "API health checks, system status, and public school information",
    },
    {
      name: "Authentication",
      description: "Login and session management for students and administrators",
    },
    {
      name: "Staff",
      description: "Staff directory and member records",
    },
    {
      name: "Admin",
      description: "Protected administrative management endpoints (Requires Admin Role)",
    },
    {
      name: "Students",
      description: "Protected student portal endpoints (Requires Student Role)",
    },
  ],
  paths: {
    "/": {
      get: {
        tags: ["General"],
        summary: "API Health Check & Service Information",
        description: "Returns service online status, version, and the generated CSRF security token.",
        responses: {
          200: {
            description: "Service is online and healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    service: { type: "string", example: "PHRONESIS Academy API" },
                    version: { type: "string", example: "2.4.0" },
                    status: { type: "string", example: "online" },
                    timestamp: { type: "string", format: "date-time", example: "2026-10-19T18:00:00.000Z" },
                    csrfToken: { type: "string", example: "a1b2c3d4-csrf-token-sample" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/admission-info": {
      get: {
        tags: ["General"],
        summary: "School Admission Information",
        description: "Retrieves public academic session status, available class levels, and admissions office contact details.",
        responses: {
          200: {
            description: "Admission details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    school: { type: "string", example: "PHRONESIS SUNESIS ACADEMY" },
                    admissions: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "Open for 2026/2027 Academic Session" },
                        levels: {
                          type: "array",
                          items: { type: "string" },
                          example: ["Junior Secondary School (JSS 1 - 3)", "Senior Secondary School (SSS 1 - 3)"],
                        },
                        contact: {
                          type: "object",
                          properties: {
                            email: { type: "string", example: "admissions@phronesis.edu" },
                            phone: { type: "string", example: "+234 801 234 5678" },
                            office: { type: "string", example: "12 Academy Road, Phronesis City" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/announcements": {
      get: {
        tags: ["General"],
        summary: "Public Announcements",
        description: "Retrieves the latest general announcements and notices from the school.",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of announcements to retrieve (default is 5)",
            required: false,
            schema: {
              type: "integer",
              default: 5,
              example: 5,
            },
          },
        ],
        responses: {
          200: {
            description: "Announcements loaded successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnnouncementsResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/login/student": {
      get: {
        tags: ["Authentication"],
        summary: "Student Login Page Info & CSRF Token",
        description: "Returns authentication endpoint information and exposes the CSRF token for student login forms.",
        responses: {
          200: {
            description: "Login information and CSRF token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Student authentication endpoint. Submit POST request with admissionNumber and password." },
                    csrfToken: { type: "string", example: "csrf-token-sample-string" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Authentication"],
        summary: "Student Login",
        description: "Authenticates a student by admission number and password. Sets an HTTP-only JWT authentication cookie and returns the JWT token for API testing.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["admissionNumber", "password"],
                properties: {
                  admissionNumber: {
                    type: "string",
                    description: "Student's unique admission number",
                    example: "PHR/2026/001",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    description: "Student account password",
                    example: "Password123",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          400: {
            description: "Missing required fields",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Invalid admission number or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          429: {
            description: "Too many failed login attempts (Rate limited for 15 minutes)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/logout/student": {
      get: {
        tags: ["Authentication"],
        summary: "Student Logout",
        description: "Clears the student authentication cookie and invalidates the session.",
        responses: {
          200: {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Logged out successfully." },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/login/admin": {
      get: {
        tags: ["Authentication"],
        summary: "Admin Login Page Info & CSRF Token",
        description: "Returns authentication endpoint information and exposes the CSRF token for admin login.",
        responses: {
          200: {
            description: "Admin login endpoint reached",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Admin Authentication Endpoint reached. Submit Post request with admin email and password" },
                    csrfToken: { type: "string", example: "csrf-token-sample-string" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Authentication"],
        summary: "Admin Login",
        description: "Authenticates an administrator with email and password. Sets an HTTP-only cookie and returns a JWT token for API testing.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "Registered administrator email address",
                    example: "admin@phronesis.edu",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    description: "Administrator password",
                    example: "AdminSecret123",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Admin authentication successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          400: {
            description: "Missing required credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Invalid email or password",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          429: {
            description: "Too many login attempts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/staff": {
      get: {
        tags: ["Staff"],
        summary: "List All Staff Members",
        description: "Retrieves all registered school staff members including their department and contact details.",
        responses: {
          200: {
            description: "List of staff members retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    staff: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StaffMember" },
                    },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "Admin Dashboard Data",
        description: "Retrieves administrator dashboard overview, role, and administrator profile details. **Requires Admin Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard loaded successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminDashboardResponse" },
              },
            },
          },
          401: {
            description: "Authentication required / invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Forbidden - Insufficient permissions (Requires Admin role)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "Admin account not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/admin/add-staff": {
      post: {
        tags: ["Admin"],
        summary: "Add New Staff Member",
        description: "Creates and registers a new teaching or non-teaching staff member. **Requires Admin Bearer Token.**",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateStaffRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Staff created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateStaffResponse" },
              },
            },
          },
          400: {
            description: "Validation failed (missing or invalid fields)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Validation failed" },
                    errors: {
                      type: "object",
                      example: {
                        staff_no: "Staff number is required",
                        phone: "Phone number is invalid",
                        department: "Department must be one of: Teaching, Non-Teaching",
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Forbidden - Admin role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          409: {
            description: "Conflict - Staff number, biometric enrollment number, or email already exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "A staff member with this staff number already exists" },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/dashboard": {
      get: {
        tags: ["Students"],
        summary: "Student Dashboard Overview",
        description: "Retrieves complete dashboard details for the authenticated student, including profile, term attendance summary, latest exam results summary, fee payment status, announcements, and class timetable. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Student dashboard data loaded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StudentDashboardResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Forbidden (Requires Student role)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "Student record not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/profile": {
      get: {
        tags: ["Students"],
        summary: "Student Profile Details",
        description: "Retrieves student personal information, class enrollment, attendance records, and latest academic summary. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Student profile data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StudentProfileResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          404: {
            description: "Student not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/settings": {
      get: {
        tags: ["Students"],
        summary: "Student Settings Overview",
        description: "Retrieves student settings and profile metadata. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Student settings loaded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    pageTitle: { type: "string", example: "Settings" },
                    view: { type: "string", example: "settings" },
                    user: { type: "object" },
                    role: { type: "string", example: "student" },
                  },
                },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          403: {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/profile/upload-pic": {
      post: {
        tags: ["Students"],
        summary: "Upload Student Profile Picture",
        description: "Uploads a new profile image for the authenticated student. Accepted formats: JPG, JPEG, PNG, WEBP. Maximum file size: 5MB. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["profile_pic"],
                properties: {
                  profile_pic: {
                    type: "string",
                    format: "binary",
                    description: "Profile picture file to upload",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile picture updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Profile picture updated successfully." },
                    filePath: { type: "string", example: "/uploads/profile-123456789.png" },
                  },
                },
              },
            },
          },
          400: {
            description: "Invalid file format or file size exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/change-password": {
      post: {
        tags: ["Students"],
        summary: "Change Student Password",
        description: "Updates student password. Requirements: at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number. Invalidates current session on success. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Password changed successfully. Please log in with your new password." },
                  },
                },
              },
            },
          },
          400: {
            description: "Validation error (passwords do not match, same as old password, or complexity not met)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Current password incorrect",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/results": {
      get: {
        tags: ["Students"],
        summary: "Student Academic Results",
        description: "Retrieves student's subject scores, grades, remarks, class averages, and term position. If session and term query parameters are omitted, returns results for the most recent term. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "session",
            in: "query",
            description: "Academic Session ID (optional)",
            required: false,
            schema: { type: "integer", example: 1 },
          },
          {
            name: "term",
            in: "query",
            description: "Term ID (optional)",
            required: false,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          200: {
            description: "Academic results retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StudentResultsResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/results/print": {
      get: {
        tags: ["Students"],
        summary: "Printable Official Report Card Data",
        description: "Returns full formatted academic report card data suitable for printable report card generation. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "session",
            in: "query",
            description: "Academic Session ID",
            required: false,
            schema: { type: "integer", example: 1 },
          },
          {
            name: "term",
            in: "query",
            description: "Term ID",
            required: false,
            schema: { type: "integer", example: 1 },
          },
        ],
        responses: {
          200: {
            description: "Printable report card data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    pageTitle: { type: "string", example: "Official Report Card" },
                    user: { type: "object" },
                    role: { type: "string", example: "student" },
                    selectedSessionId: { type: "integer", example: 1 },
                    selectedTermId: { type: "integer", example: 1 },
                    summary: { type: "object" },
                    subjectResults: { type: "array", items: { type: "object" } },
                  },
                },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/timetable": {
      get: {
        tags: ["Students"],
        summary: "Student Weekly Timetable",
        description: "Retrieves student's weekly schedule grouped by day (Monday through Friday) with subjects, teacher names, classrooms, and time periods. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Timetable schedule retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TimetableResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/api/subject-details": {
      get: {
        tags: ["Students"],
        summary: "Subject Details & Syllabus",
        description: "Retrieves teacher, classroom, schedule, and syllabus for a given subject. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "subject",
            in: "query",
            description: "Name of the subject (e.g. Mathematics, English Language, Physics)",
            required: true,
            schema: {
              type: "string",
              example: "Mathematics",
            },
          },
        ],
        responses: {
          200: {
            description: "Subject details loaded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SubjectDetailsResponse" },
              },
            },
          },
          400: {
            description: "Subject parameter missing",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/assessments": {
      get: {
        tags: ["Students"],
        summary: "Student Continuous Assessments",
        description: "Retrieves all tests, assignments, exams, scores, submission status, and grade distribution for the student. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Assessments retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssessmentsResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/payments": {
      get: {
        tags: ["Students"],
        summary: "Student Fee Payments & Status",
        description: "Retrieves student tuition and fee payment history, total billed, amount paid, and outstanding balance summary. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Payment data retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaymentsResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/student/announcements": {
      get: {
        tags: ["Students"],
        summary: "Student Announcements (Protected)",
        description: "Retrieves latest school announcements for the authenticated student. **Requires Student Bearer Token.**",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Number of announcements to retrieve (default is 5)",
            required: false,
            schema: {
              type: "integer",
              default: 5,
              example: 5,
            },
          },
        ],
        responses: {
          200: {
            description: "Announcements list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnnouncementsResponse" },
              },
            },
          },
          401: {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token (obtained from POST /login/student or POST /login/admin). Swagger UI will send it in the 'Authorization: Bearer <token>' header on all protected requests.",
      },
      CsrfToken: {
        type: "apiKey",
        in: "header",
        name: "X-CSRF-Token",
        description: "CSRF token for web clients. Automatically handled for testing within Swagger UI.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          statusCode: { type: "integer", example: 400 },
          title: { type: "string", example: "Error" },
          message: { type: "string", example: "A descriptive error message." },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Authentication successful." },
          role: { type: "string", example: "student", enum: ["student", "admin"] },
          user: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
            },
          },
          token: {
            type: "string",
            description: "JWT Bearer token for accessing protected endpoints",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      StaffMember: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          staff_no: { type: "string", example: "STF/2026/001" },
          first_name: { type: "string", example: "Emeka" },
          last_name: { type: "string", example: "Okafor" },
          other_names: { type: "string", nullable: true, example: "Chidubem" },
          biometric_enrollment_no: { type: "string", example: "BIO-10293" },
          email: { type: "string", format: "email", nullable: true, example: "emeka.okafor@phronesis.edu" },
          phone: { type: "string", example: "+2348012345678" },
          department: { type: "string", enum: ["Teaching", "Non-Teaching"], example: "Teaching" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      CreateStaffRequest: {
        type: "object",
        required: [
          "staff_no",
          "first_name",
          "last_name",
          "biometric_enrollment_no",
          "phone",
          "department",
        ],
        properties: {
          staff_no: { type: "string", maxLength: 30, example: "STF/2026/045" },
          first_name: { type: "string", maxLength: 100, example: "Ngozi" },
          last_name: { type: "string", maxLength: 100, example: "Adeyemi" },
          other_names: { type: "string", maxLength: 150, nullable: true, example: "Blessing" },
          biometric_enrollment_no: { type: "string", maxLength: 20, example: "BIO-88741" },
          phone: { type: "string", example: "+2348033334455" },
          department: { type: "string", enum: ["Teaching", "Non-Teaching"], example: "Teaching" },
          email: { type: "string", format: "email", maxLength: 150, nullable: true, example: "ngozi.adeyemi@phronesis.edu" },
        },
      },
      CreateStaffResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Staff created" },
          staff: { $ref: "#/components/schemas/StaffMember" },
        },
      },
      AdminDashboardResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Admin Dashboard" },
          role: { type: "string", example: "Admin" },
          user: {
            type: "object",
            properties: {
              admin_id: { type: "integer", example: 1 },
              email: { type: "string", example: "admin@phronesis.edu" },
            },
          },
        },
      },
      StudentDashboardResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Student Dashboard" },
          role: { type: "string", example: "student" },
          user: { type: "object" },
          attendance: { type: "object" },
          resultSummary: { type: "object", nullable: true },
          paymentSummary: { type: "object" },
          announcements: { type: "array", items: { type: "object" } },
          assessmentsSummary: { type: "object" },
          timetableDataGrouped: { type: "object" },
        },
      },
      StudentProfileResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Student Profile" },
          role: { type: "string", example: "student" },
          user: { type: "object" },
          attendance: { type: "object" },
          resultSummary: { type: "object", nullable: true },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: {
            type: "string",
            format: "password",
            example: "OldPassword1",
          },
          newPassword: {
            type: "string",
            format: "password",
            description: "Must be >= 8 characters with at least 1 uppercase, 1 lowercase, and 1 number",
            example: "NewSecurePassword2",
          },
          confirmPassword: {
            type: "string",
            format: "password",
            example: "NewSecurePassword2",
          },
        },
      },
      StudentResultsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Academic Results" },
          role: { type: "string", example: "student" },
          sessions: { type: "array", items: { type: "object" } },
          terms: { type: "array", items: { type: "object" } },
          selectedSessionId: { type: "integer", nullable: true },
          selectedTermId: { type: "integer", nullable: true },
          summary: { type: "object", nullable: true },
          subjectResults: { type: "array", items: { type: "object" } },
        },
      },
      TimetableResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Timetable" },
          view: { type: "string", example: "timetable" },
          role: { type: "string", example: "student" },
          timetableDataGrouped: {
            type: "object",
            properties: {
              Monday: { type: "array", items: { type: "object" } },
              Tuesday: { type: "array", items: { type: "object" } },
              Wednesday: { type: "array", items: { type: "object" } },
              Thursday: { type: "array", items: { type: "object" } },
              Friday: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      SubjectDetailsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              teacher: { type: "string", example: "Mr. Chukwuemeka Eze" },
              room: { type: "string", example: "Room 102" },
              time: { type: "string", example: "Monday: 09:00 AM - 10:00 AM<br>Wednesday: 11:00 AM - 12:00 PM" },
              syllabus: { type: "string", example: "Algebra, Trigonometry, and Statistics" },
            },
          },
        },
      },
      AssessmentsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Assessments" },
          role: { type: "string", example: "student" },
          assessments: { type: "array", items: { type: "object" } },
          summary: { type: "object" },
        },
      },
      PaymentsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          pageTitle: { type: "string", example: "Fees & Payments" },
          role: { type: "string", example: "student" },
          payments: { type: "array", items: { type: "object" } },
          paymentSummary: { type: "object" },
        },
      },
      AnnouncementsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          announcements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                title: { type: "string", example: "Mid-Term Break Announcement" },
                content: { type: "string", example: "The school will observe mid-term break next week." },
                date: { type: "string", example: "2026-10-15" },
              },
            },
          },
        },
      },
    },
  },
};

const customCss = `
  /* Modern styling for PHRONESIS Academy API Documentation */
  .swagger-ui .topbar {
    background-color: #0f172a;
    border-bottom: 2px solid #3b82f6;
    padding: 12px 0;
  }
  .swagger-ui .topbar .topbar-wrapper img {
    content: url('/uploads/school-logo.png');
    height: 40px;
    width: auto;
  }
  .swagger-ui .topbar .topbar-wrapper .link {
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.5px;
  }
  .swagger-ui .info {
    margin: 30px 0;
  }
  .swagger-ui .info .title {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    font-weight: 800;
  }
  .swagger-ui .info h3 {
    color: #1e3a8a;
  }
  .swagger-ui .btn.authorize {
    background-color: #2563eb;
    color: #ffffff;
    border-color: #2563eb;
    border-radius: 6px;
    font-weight: 600;
    padding: 8px 16px;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    transition: all 0.2s ease;
  }
  .swagger-ui .btn.authorize:hover {
    background-color: #1d4ed8;
    border-color: #1d4ed8;
  }
  .swagger-ui .btn.authorize svg {
    fill: #ffffff;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  .swagger-ui .opblock.opblock-get {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 4px;
    font-weight: 700;
  }
  .swagger-ui .opblock-tag {
    font-size: 1.25rem;
    color: #1e293b;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
  }
`;

// Client-side script injected into Swagger UI to enable auto-authorization and smooth testing
const customJsStr = `
  (function() {
    console.log('[PHRONESIS API Docs] Initializing Swagger UI Enhancements...');

    // Helper to extract CSRF token and set default headers
    function setupInterceptors() {
      if (!window.ui) {
        setTimeout(setupInterceptors, 200);
        return;
      }

      // Check if a token is saved in localStorage
      const savedToken = localStorage.getItem('phronesis_jwt_token');
      if (savedToken && window.ui.preauthorizeApiKey) {
        window.ui.preauthorizeApiKey('BearerAuth', savedToken);
        console.log('[PHRONESIS API Docs] Restored saved Bearer token from localStorage.');
      }

      // Intercept fetch responses to capture login tokens automatically
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const clone = response.clone();
          const contentType = clone.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await clone.json();
            if (data && data.token && (data.role === 'student' || data.role === 'admin')) {
              console.log('[PHRONESIS API Docs] Login token detected! Auto-authorizing Swagger session...');
              localStorage.setItem('phronesis_jwt_token', data.token);
              if (window.ui && window.ui.preauthorizeApiKey) {
                window.ui.preauthorizeApiKey('BearerAuth', data.token);
                // Also trigger native authorize state
                if (window.ui.authActions && window.ui.authActions.authorize) {
                  window.ui.authActions.authorize({
                    BearerAuth: {
                      name: 'BearerAuth',
                      schema: { type: 'http', scheme: 'bearer' },
                      value: data.token
                    }
                  });
                }
              }

              // Display notification
              const notice = document.createElement('div');
              notice.style.position = 'fixed';
              notice.style.bottom = '20px';
              notice.style.right = '20px';
              notice.style.backgroundColor = '#10b981';
              notice.style.color = '#ffffff';
              notice.style.padding = '12px 20px';
              notice.style.borderRadius = '8px';
              notice.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              notice.style.zIndex = '9999';
              notice.style.fontWeight = '600';
              notice.style.fontSize = '14px';
              notice.innerHTML = '🔑 ' + data.role.toUpperCase() + ' Logged In! Bearer token automatically applied to Authorize.';
              document.body.appendChild(notice);
              setTimeout(() => notice.remove(), 6000);
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors for non-JSON responses
        }
        return response;
      };
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupInterceptors);
    } else {
      setupInterceptors();
    }
  })();
`;

const swaggerUiOptions = {
  customCss,
  customJsStr,
  customSiteTitle: "PHRONESIS Academy API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "list",
    filter: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Flag request as coming from Swagger UI and include credentials
      req.credentials = "include";
      if (!req.headers) req.headers = {};
      req.headers["X-Swagger-Request"] = "true";
      return req;
    },
  },
};

module.exports = {
  swaggerSpec,
  swaggerUiOptions,
};
