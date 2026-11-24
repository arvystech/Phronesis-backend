# CBT backend integration for Phronesis

This document maps the supplied CBT guide to the existing backend in this repository and tracks the current backend integration.

## Existing backend conventions

- Runtime: Express 5, CommonJS, `mysql2/promise` (`src/config/dbConnection.js`).
- Routes are feature modules mounted in `src/app.js`; current route paths are not version-prefixed.
- `requireAuth` in `src/middlewares/verifyToken.js` accepts the existing `token` HttpOnly cookie or a Bearer token and puts `{ id, role }` in `req.user`.
- Admin CBT management and reporting APIs use `requireAuth` plus `verifyRole("admin")`; CBT candidates use a short-lived CBT-only token after admission-number access, without the school portal login.
- Cookie-authenticated writes pass through the global CSRF middleware. Bearer requests follow the existing CSRF bypass.
- The database is MySQL/InnoDB, not PostgreSQL. Use `INT` for class/subject/student/session/term IDs and `BIGINT UNSIGNED` for admin IDs to match the schema.

## Reuse these school records

| CBT relationship | Existing table / column |
|---|---|
| Student | `students.student_id` |
| Student login identifier | `students.admission_number` |
| Student class | `students.class_id` → `classes.class_id` |
| Class label | `classes.class_name` |
| Subject | `subjects.subject_id`, `subjects.subject_name` |
| Academic session | `sessions.session_id`, `sessions.session_name` |
| Term | `terms.term_id`, `terms.term_name` |
| Admin creator/updater | `admin.admin_id` (unsigned BIGINT) |

Do not create CBT-specific copies of students, classes, subjects, sessions, or terms. Students do not need the school portal login: they enter their admission number at the CBT access endpoint, which resolves exactly one active student and issues a short-lived HttpOnly CBT-only cookie. The SQL dump does not guarantee admission-number uniqueness, so the lookup fails closed if it finds zero or multiple active records. Admission number alone is an identifier, not proof of identity; consider adding a PIN/OTP if impersonation risk is unacceptable.

## Route/module placement

The `src/modules/cbt/` module is mounted in `src/app.js`. Routes follow the repository's existing paths; there is no `/api/v1` mount. Admin routes use the existing admin middleware. Candidate attempt routes use the CBT-only cookie/session and always derive the student ID from its signed claim, never a body or path parameter.

Suggested initial route surface:

| Method | Route | Existing auth convention |
|---|---|---|
| GET/POST | `/admin/cbt/exams` | admin JWT + admin role |
| GET/PUT | `/admin/cbt/exams/:examId` | admin JWT + admin role |
| POST | `/admin/cbt/exams/:examId/publish` | admin JWT + admin role |
| POST | `/admin/cbt/exams/:examId/close` | admin JWT + admin role |
| GET | `/admin/cbt/exams/:examId/attempts` | admin JWT + admin role |
| POST | `/cbt/access` | Public, rate-limited admission-number lookup; issues CBT-only cookie |
| GET | `/cbt/exams` | CBT candidate cookie; derive class from resolved student |
| POST | `/cbt/exams/:examId/attempts` | CBT candidate cookie |
| GET | `/cbt/attempts/:attemptId` | CBT candidate cookie + ownership check |
| PUT | `/cbt/attempts/:attemptId/answers/:questionId` | CBT candidate cookie + ownership/deadline checks |
| POST | `/cbt/attempts/:attemptId/submit` | CBT candidate cookie + ownership check; idempotent |

Compatibility aliases also exist under `/student/cbt/...`; the frontend may use those paths. Access accepts `{ "admissionNumber": "..." }` (and the guide's legacy `studentId` field). A successful access response sets the cookie and returns the candidate summary plus eligible exams. The admission-number endpoint is rate-limited, returns a generic failure, and fails closed on duplicate active records.

## MySQL schema design

Add a migration file under `scripts/` (do not append feature tables to the supplied phpMyAdmin dump as the deployment mechanism). Use InnoDB, foreign keys to the existing tables, UTC timestamps, and transactions. Suggested tables:

- `cbt_exams`: auto-increment `BIGINT UNSIGNED` ID, title, `class_id INT`, `subject_id INT`, nullable `session_id INT` and `term_id INT`, `duration_seconds INT`, status, availability window, current version, `created_by/updated_by BIGINT UNSIGNED`, audit timestamps. Foreign keys reference `classes`, `subjects`, `sessions`, `terms`, and `admin`.
- `cbt_exam_classes`: many-to-many mapping between exams and existing class/arm records. `class_id` remains the legacy primary assigned class on `cbt_exams` for compatibility; new API payloads should send `classIds`.
- `cbt_exam_versions`: `(exam_id, version)` unique key plus publication timestamp and immutable snapshot metadata.
- `cbt_questions`: exam/version, position, prompt, unique `(exam_id, version, position)`.
- `cbt_options`: question, label, text, `is_correct`; unique `(question_id, label)`. Validate exactly A/B/C/D and exactly one correct option in a transaction in application code (MySQL CHECK constraints cannot enforce cross-row counts).
- `cbt_attempts`: student, exam/version, attempt number, state, start/expiry/submit timestamps, score/max score, submission reason. Add an index for `(student_id, exam_id, status)`; enforce one allowed attempt with an appropriate unique key if policy is one attempt. If retakes are later enabled, use attempt number and enforce the limit transactionally.
- `cbt_attempt_answers`: attempt, question, nullable selected option, updated timestamp, unique `(attempt_id, question_id)`. Validate the option belongs to the attempt's exam version before saving.

Use numeric IDs in the database (matching this schema); the frontend does not need sequential IDs to be authorization tokens. Every attempt read/write still checks both ownership (`attempt.student_id = req.user.id`) and exam/version membership.

## Behavior to preserve from the guide

- Published exam versions and their question/option text are immutable. An edit creates a new version; active attempts continue on the version they started.
- The server sets `started_at` and `expires_at` using its clock and the exam's stored duration (1800 seconds for the intended 30 minutes). Ignore client duration/start/expiry/class/student fields.
- Student question payloads omit `is_correct`; admin detail and grading can access it.
- Save each answer with an upsert after checking attempt ownership, active status, expiry, question membership, and option membership.
- Submission locks the attempt row in a MySQL transaction, grades server-side, records final status and timestamps, and returns the stored result on retries. A submit at/after expiry finalizes as `auto_submitted`; late answer writes fail.
- Check expiry during load, answer, and submit requests. Schedule `npm run cbt:sweep-expired` (for example, once per minute) in production so attempts are finalized even when a candidate disconnects and never returns.
- Use existing CSRF protection for cookie-authenticated mutation requests, parameterized SQL, input validation, and existing response conventions (`success`, `statusCode`, `message`). Never return correct answers to student routes.

## Frontend boundary and rollout

This repository contains the backend only; the guide's `/admin/cbt` and `/cbt` browser apps and their JavaScript are not present here. Backend work can expose the endpoints, but replacing `localStorage` requires a separate frontend change in that application/repository. Keep the backend response contract compatible with the guide's proposed exam/question shapes and have the frontend send the existing CSRF token for cookie-authenticated writes.

Recommended rollout: add and apply the MySQL migration; implement admin draft/publish and student attempt APIs behind existing JWT roles; verify student class eligibility from `students.class_id`; then connect the frontend and disable localStorage as the source of truth. Confirm retake policy and whether sessions/terms must be mandatory before finalizing the migration constraints.

## Implemented in this repository

- `scripts/migrate_cbt.js` creates the CBT tables and audit event table; run with `npm run migrate:cbt` after setting the normal database environment variables. `scripts/sweep_cbt_expired.js` finalizes expired attempts and should be scheduled in production with `npm run cbt:sweep-expired`.
- Exams can be assigned to multiple class arms using `classIds: [1, 2]`; the CBT migration creates `cbt_exam_classes` and backfills each existing exam's former `class_id`. Existing `classId` requests still work as a one-class assignment.
- `src/modules/cbt/` currently exposes admin draft CRUD, publish/close/archive, attempt listing, student eligible-exam listing, attempt start/resume, answer save, and submit routes. They are mounted by `src/app.js` and use the existing role middleware.
- The admin dashboard can fetch a paginated student roster at `GET /admin/cbt/students` (or `/api-proxy/admin/cbt/students`) and each student's full attempt history at `GET /admin/cbt/students/:studentId/results` (or the `/api-proxy/admin/cbt` alias). These routes require an admin role.
- General student directory/details are available from `GET /api-proxy/admin/students` and `GET /api-proxy/admin/students/:studentId`. Admins can edit admission number, names, optional gender/date of birth, class, and guardian name/phone with `PATCH /api-proxy/admin/students/:studentId`; password hashes are not returned.
- Admin answer review is available at `GET /admin/cbt/attempts/:attemptId/review` (also under `/api-proxy/admin/cbt`). It returns all questions from that attempt's immutable version, selected and correct options, and summary counts for a next/previous modal.
- Admins can reset an attempt with `POST /admin/cbt/attempts/:attemptId/reset` (also under `/api-proxy/admin/cbt`). The attempt is marked `voided` and retained for audit; the student can start another attempt while the exam remains available.
- Admins can set or clear a class password with `PATCH /classes/:classId/password` (also `/api-proxy/classes/:classId/password`). Passwords are bcrypt-hashed and never returned; run `npm run migrate:class-password` to add the nullable database column.
- Public class and subject lookup data are available at `/admin/cbt/classes`, `/admin/cbt/subjects`, `/classes`, `/subjects`, `/api-proxy/classes`, and `/api-proxy/subjects`. These GET routes do not require sign-in and do not create a CBT candidate session.
- Student attempt identity is taken from the CBT-only signed token. Timer enforcement and grading use MySQL UTC time and the server-side answer key. Student question payloads omit correctness data.

Published exams are immutable and the API currently rejects editing them; an explicit new-version workflow remains to be added. The browser applications are absent from this repository, so their localStorage migration and UI behavior remain a separate frontend task.

## Results portal API

- Run `npm run migrate:results` before using the Results portal. It ensures class password and separate CA mark columns exist and creates the active academic period setting.
- Public class dropdown: `GET /results/classes` (proxy alias `/api-proxy/results/classes`). Login: `POST /results/auth/login` with `{ classId, password }`. A valid class password creates an eight-hour HttpOnly class-scoped `results_teacher` session. Authenticated APIs are available under both `/results/...` and `/api-proxy/results/...`.
- The class-scoped session can only access its class. `GET /results/auth/me` returns the assigned class and active session/term. Admins set the active period with `PUT /results/admin/active-period` and `{ sessionId, termId }`.
- Results subject lists and score completeness use every row in the `subjects` table, independent of CBT and `subject_teachers`; this supports paper-based exams whose marks are uploaded later. Scores use `result_subjects.ca1_score`, `ca2_score`, `ca3_score`, `ca_score`, `exam_score`, `total_score`, and `grade`, with `student_results` unique by student/session/term. The backend validates CA marks 0–10 and examination 0–70, calculates totals and grade bands (A 70+, B 60+, C 50+, D 45+, E 40+, F below 40), and calculates standings only for students with scores in every database subject. Equal average and total scores share a competition rank.
