-- =============================================================================
-- PHRONESIS ACADEMY DATABASE SETUP & MIGRATION SCRIPT
-- Database: phronesis_db
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS student_payments;
DROP TABLE IF EXISTS student_assessments;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS result_subjects;
DROP TABLE IF EXISTS student_results;
DROP TABLE IF EXISTS timetables;
DROP TABLE IF EXISTS subject_teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS terms;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS announcements;

-- 2. Create 'classes' table
CREATE TABLE classes (
  class_id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create 'teachers' table
CREATE TABLE teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(30),
  specialty VARCHAR(100),
  profile_pic VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create 'subjects' table
CREATE TABLE subjects (
  subject_id INT AUTO_INCREMENT PRIMARY KEY,
  subject_name VARCHAR(100) NOT NULL UNIQUE,
  subject_code VARCHAR(20) UNIQUE,
  syllabus TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Create 'sessions' table
CREATE TABLE sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  session_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Create 'terms' table
CREATE TABLE terms (
  term_id INT AUTO_INCREMENT PRIMARY KEY,
  term_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Create 'students' table
CREATE TABLE students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  admission_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50) DEFAULT '',
  last_name VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  date_of_birth VARCHAR(30) NOT NULL,
  class_id INT NOT NULL,
  profile_pic VARCHAR(255) DEFAULT 'NULL',
  blood_group VARCHAR(10) DEFAULT 'O+',
  state_of_origin VARCHAR(50) DEFAULT 'Lagos State',
  parent_name VARCHAR(100) DEFAULT 'Mr. & Mrs. Doe',
  parent_phone VARCHAR(30) DEFAULT '+234 800 123 4567',
  parent_email VARCHAR(100) DEFAULT 'parents@phronesis.edu',
  address VARCHAR(255) DEFAULT '12 Academy Road, Phronesis City',
  status VARCHAR(20) DEFAULT 'Active',
  is_default_password TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  INDEX idx_student_admission (admission_number),
  INDEX idx_student_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Create 'subject_teachers' table
CREATE TABLE subject_teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  class_id INT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  UNIQUE KEY idx_subject_teacher_class (subject_id, teacher_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Create 'timetables' table
CREATE TABLE timetables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT DEFAULT NULL,
  day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50) DEFAULT 'Lab 101',
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  INDEX idx_timetable_class_day (class_id, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Create 'student_results' table
CREATE TABLE student_results (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  session_id INT NOT NULL,
  term_id INT NOT NULL,
  class_id INT NOT NULL,
  total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  average_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  gpa DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  cgpa DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  grade VARCHAR(10) NOT NULL DEFAULT '',
  class_position INT NOT NULL DEFAULT 0,
  total_students INT NOT NULL DEFAULT 0,
  remarks TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(term_id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  UNIQUE KEY idx_student_session_term (student_id, session_id, term_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Create 'result_subjects' table
CREATE TABLE result_subjects (
  result_subject_id INT AUTO_INCREMENT PRIMARY KEY,
  result_id INT NOT NULL,
  subject_id INT NOT NULL,
  ca_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  mid_term_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  exam_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  grade VARCHAR(10) NOT NULL DEFAULT '',
  remarks TEXT,
  FOREIGN KEY (result_id) REFERENCES student_results(result_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  UNIQUE KEY idx_result_subject (result_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Create 'attendance' table
CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  session_id INT NOT NULL,
  term_id INT NOT NULL,
  total_days INT NOT NULL DEFAULT 60,
  days_present INT NOT NULL DEFAULT 54,
  days_absent INT NOT NULL DEFAULT 6,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  remarks VARCHAR(255) DEFAULT 'Good attendance!',
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(term_id) ON DELETE CASCADE,
  UNIQUE KEY idx_student_term_attendance (student_id, session_id, term_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Create 'assessments' table
CREATE TABLE assessments (
  assessment_id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT DEFAULT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  assessment_type ENUM('Test', 'Assignment', 'Project') NOT NULL DEFAULT 'Assignment',
  due_date DATETIME NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Create 'student_assessments' table
CREATE TABLE student_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  student_id INT NOT NULL,
  submission_status ENUM('Upcoming', 'Pending', 'Completed', 'Overdue') NOT NULL DEFAULT 'Upcoming',
  submission_date DATETIME DEFAULT NULL,
  score DECIMAL(5,2) DEFAULT NULL,
  feedback TEXT,
  FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  UNIQUE KEY idx_student_assessment (assessment_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Create 'student_payments' table
CREATE TABLE student_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  session_id INT NOT NULL,
  term_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_date DATETIME DEFAULT NULL,
  payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
  transaction_ref VARCHAR(100) DEFAULT NULL,
  status ENUM('Paid', 'Partial', 'Pending') NOT NULL DEFAULT 'Paid',
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(term_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Create 'announcements' table
CREATE TABLE announcements (
  announcement_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'General',
  publish_date DATE NOT NULL,
  author VARCHAR(100) DEFAULT 'School Admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================================================
-- SEED DATA POPULATION
-- =============================================================================

-- Classes
INSERT INTO classes (class_id, class_name) VALUES
(1, 'JSS1'),
(2, 'JSS2'),
(3, 'SSS1');

-- Teachers
INSERT INTO teachers (teacher_id, name, email, phone, specialty) VALUES
(1, 'Mr. Thompson', 'thompson@phronesis.edu', '+2348011112222', 'Mathematics'),
(2, 'Mrs. Johnson', 'johnson@phronesis.edu', '+2348022223333', 'English Language'),
(3, 'Mrs. Phronesis', 'phronesis@phronesis.edu', '+2348033334444', 'Biology'),
(4, 'Dr. Williams', 'williams@phronesis.edu', '+2348044445555', 'Chemistry'),
(5, 'Mr. Anderson', 'anderson@phronesis.edu', '+2348055556666', 'Physics');

-- Subjects
INSERT INTO subjects (subject_id, subject_name, subject_code, syllabus) VALUES
(1, 'Mathematics', 'MATH101', 'Algebra, Geometry, Trigonometry, Statistics, Calculus Basics'),
(2, 'English Language', 'ENG101', 'Grammar, Essay Writing, Oral English, Comprehension & Vocabulary'),
(3, 'Biology', 'BIO101', 'Cell Biology, Genetics, Plant & Animal Physiology, Ecology'),
(4, 'Chemistry', 'CHEM101', 'Atomic Structure, Chemical Bonding, Stoichiometry, Organic Chemistry'),
(5, 'Physics', 'PHYS101', 'Mechanics, Heat, Light, Magnetism, Electricity & Quantum Basics'),
(6, 'Morning Break', 'BREAK', 'Rest and refreshment interval');

-- Sessions
INSERT INTO sessions (session_id, session_name) VALUES
(1, '2024/2025'),
(2, '2025/2026');

-- Terms
INSERT INTO terms (term_id, term_name) VALUES
(1, 'Term 1'),
(2, 'Term 2'),
(3, 'Term 3');

-- -- Students (Default Password for all is 'Password123' bcrypt hashed: $2b$12$VeaYR7vm4vGMKSfb3RVad.TU9kVjGhhIuiwb4oYRzP61WOL58XBKi)
INSERT INTO students (student_id, admission_number, first_name, middle_name, last_name, password, gender, date_of_birth, class_id, profile_pic, blood_group, state_of_origin, parent_name, parent_phone, parent_email, address, is_default_password) VALUES
(1, 'PS001', 'Jane', 'Mary', 'Doe', '$2b$12$VeaYR7vm4vGMKSfb3RVad.TU9kVjGhhIuiwb4oYRzP61WOL58XBKi', 'Female', '12/05/2005', 2, 'NULL', 'A+', 'Oyo State', 'Mr. & Mrs. Doe', '+234 802 345 6789', 'jane.parent@phronesis.edu', '45 Crescent Way, Victoria Island', 1),
(2, 'PS002', 'Alex', 'James', 'Smith', '$2b$12$VeaYR7vm4vGMKSfb3RVad.TU9kVjGhhIuiwb4oYRzP61WOL58XBKi', 'Male', '20/08/2004', 1, 'NULL', 'B+', 'Ogun State', 'Dr. Smith', '+234 803 456 7890', 'alex.parent@phronesis.edu', '88 Liberty Avenue, Ikeja', 1),
(3, 'PS003', 'John', 'Doe', 'Lyn', '$2b$12$VeaYR7vm4vGMKSfb3RVad.TU9kVjGhhIuiwb4oYRzP61WOL58XBKi', 'Male', '15/03/2004', 1, 'NULL', 'O+', 'Lagos State', 'Mr. & Mrs. Lyn', '+234 800 123 4567', 'john.parent@phronesis.edu', '12 Academy Road, Phronesis City', 1);

-- Subject Teachers
INSERT INTO subject_teachers (subject_id, teacher_id, class_id) VALUES
(1, 1, 1), (2, 2, 1), (3, 3, 1), (4, 4, 1), (5, 5, 1),
(1, 1, 2), (2, 2, 2), (3, 3, 2), (4, 4, 2), (5, 5, 2);

-- Timetables for JSS1 (class_id 1)
INSERT INTO timetables (class_id, subject_id, teacher_id, day, start_time, end_time, room) VALUES
-- Monday
(1, 1, 1, 'Monday', '08:00:00', '09:00:00', 'Room 101'),
(1, 2, 2, 'Monday', '09:00:00', '10:00:00', 'Room 101'),
(1, 6, NULL, 'Monday', '10:00:00', '10:30:00', 'Cafeteria'),
(1, 3, 3, 'Monday', '10:30:00', '11:30:00', 'Lab 2'),
(1, 4, 4, 'Monday', '11:30:00', '12:30:00', 'Lab 1'),
-- Tuesday
(1, 5, 5, 'Tuesday', '08:00:00', '09:00:00', 'Lab 3'),
(1, 1, 1, 'Tuesday', '09:00:00', '10:00:00', 'Room 101'),
(1, 6, NULL, 'Tuesday', '10:00:00', '10:30:00', 'Cafeteria'),
(1, 2, 2, 'Tuesday', '10:30:00', '11:30:00', 'Room 101'),
-- Wednesday
(1, 3, 3, 'Wednesday', '08:00:00', '09:00:00', 'Lab 2'),
(1, 4, 4, 'Wednesday', '09:00:00', '10:00:00', 'Lab 1'),
(1, 6, NULL, 'Wednesday', '10:00:00', '10:30:00', 'Cafeteria'),
(1, 5, 5, 'Wednesday', '10:30:00', '11:30:00', 'Lab 3'),
-- Thursday
(1, 1, 1, 'Thursday', '08:00:00', '09:00:00', 'Room 101'),
(1, 2, 2, 'Thursday', '09:00:00', '10:00:00', 'Room 101'),
(1, 6, NULL, 'Thursday', '10:00:00', '10:30:00', 'Cafeteria'),
(1, 3, 3, 'Thursday', '10:30:00', '11:30:00', 'Lab 2'),
-- Friday
(1, 4, 4, 'Friday', '08:00:00', '09:00:00', 'Lab 1'),
(1, 5, 5, 'Friday', '09:00:00', '10:00:00', 'Lab 3'),
(1, 6, NULL, 'Friday', '10:00:00', '10:30:00', 'Cafeteria'),
(1, 1, 1, 'Friday', '10:30:00', '11:30:00', 'Room 101');

-- Student Results
INSERT INTO student_results (result_id, student_id, session_id, term_id, class_id, total_score, average_score, gpa, cgpa, grade, class_position, total_students, remarks) VALUES
(1, 3, 2, 1, 1, 437.00, 87.40, 3.80, 3.80, 'A-', 5, 120, 'An excellent academic performance. John has demonstrated strong analytical abilities and consistent dedication.'),
(2, 3, 2, 2, 1, 444.00, 88.80, 3.90, 3.85, 'A-', 3, 120, 'Superb performance. Outstanding progress in Physics and English.'),
(3, 3, 2, 3, 1, 461.00, 92.20, 4.00, 3.90, 'A', 1, 120, 'A phenomenal academic year! John finishes top of the class. Exceptional excellence across all subjects.'),
(4, 3, 1, 3, 1, 406.00, 81.20, 3.40, 3.40, 'B', 12, 115, 'John had a good academic year. Focused and hardworking.'),
(5, 1, 2, 1, 2, 432.00, 86.40, 3.75, 3.75, 'A-', 7, 120, 'Very good academic performance. Jane is highly conscientious.');

-- Result Subjects
INSERT INTO result_subjects (result_id, subject_id, ca_score, mid_term_score, exam_score, total_score, grade, remarks) VALUES
(1, 1, 28.00, 18.00, 46.00, 92.00, 'A', 'John has shown exceptional understanding of Mathematics concepts this term.'),
(1, 2, 26.00, 17.00, 45.00, 88.00, 'A-', 'Very good performance in English. Keep it up.'),
(1, 3, 25.00, 16.00, 44.00, 85.00, 'B+', 'Good performance in Biology.'),
(1, 4, 27.00, 17.00, 46.00, 90.00, 'A', 'Excellent work in Chemistry. Showed deep curiosity.'),
(1, 5, 24.00, 15.00, 43.00, 82.00, 'B', 'Above average. Can do better.'),

(2, 1, 25.00, 16.00, 43.00, 84.00, 'B+', 'Consistent effort. Keep pushing for perfection.'),
(2, 2, 27.00, 18.00, 47.00, 92.00, 'A', 'Brilliant command of the language.'),
(2, 3, 26.00, 17.00, 45.00, 88.00, 'A-', 'A solid understanding of ecology.'),
(2, 4, 25.00, 16.00, 44.00, 85.00, 'B+', 'Excellent practical skills.'),
(2, 5, 28.00, 19.00, 48.00, 95.00, 'A+', 'Outstanding capability in theoretical and applied physics.'),

(3, 1, 29.00, 19.00, 49.00, 97.00, 'A+', 'Absolute genius performance in final mathematics exam.'),
(3, 2, 28.00, 18.00, 46.00, 92.00, 'A', 'Consistent excellence in essay writing.'),
(3, 3, 27.00, 17.00, 46.00, 90.00, 'A', 'Outstanding research skills.'),
(3, 4, 26.00, 17.00, 45.00, 88.00, 'A-', 'Very good performance.'),
(3, 5, 29.00, 18.00, 47.00, 94.00, 'A', 'Superb work.'),

(5, 1, 26.00, 17.00, 42.00, 85.00, 'B+', 'Very good problem-solving skills.'),
(5, 2, 28.00, 18.00, 44.00, 90.00, 'A', 'Superb communication.'),
(5, 3, 27.00, 17.00, 44.00, 88.00, 'A-', 'Great work.'),
(5, 4, 25.00, 16.00, 41.00, 82.00, 'B', 'Good performance.'),
(5, 5, 27.00, 17.00, 43.00, 87.00, 'A-', 'Splendid effort.');

-- Attendance
INSERT INTO attendance (student_id, session_id, term_id, total_days, days_present, days_absent, percentage, remarks) VALUES
(3, 2, 3, 60, 54, 6, 90.00, 'Good attendance!'),
(1, 2, 3, 60, 57, 3, 95.00, 'Excellent attendance record.');

-- Assessments
INSERT INTO assessments (assessment_id, class_id, subject_id, teacher_id, title, description, assessment_type, due_date, total_marks) VALUES
(1, 1, 1, 1, 'Mid-Term Algebra Assignment', 'Complete exercises 1 to 15 on Quadratic Equations in Textbook Page 42.', 'Assignment', DATE_ADD(NOW(), INTERVAL 2 DAY), 100.00),
(2, 1, 3, 3, 'Biology Plant Cell Model Project', 'Build a 3D labeled model of a plant cell using eco-friendly materials.', 'Project', DATE_ADD(NOW(), INTERVAL 5 DAY), 100.00),
(3, 1, 5, 5, 'Physics Mechanics Quiz', 'In-class multiple choice test covering Newton Laws of Motion.', 'Test', DATE_ADD(NOW(), INTERVAL 7 DAY), 50.00),
(4, 1, 2, 2, 'English Essay: Technology in Education', 'Write a 500-word essay discussing the impacts of AI on high school learning.', 'Assignment', DATE_SUB(NOW(), INTERVAL 3 DAY), 100.00),
(5, 1, 4, 4, 'Chemistry Lab Experiment Report', 'Submit formal report on acid-base titration lab activity.', 'Assignment', DATE_SUB(NOW(), INTERVAL 1 DAY), 100.00);

-- Student Assessments
INSERT INTO student_assessments (assessment_id, student_id, submission_status, submission_date, score, feedback) VALUES
(1, 3, 'Upcoming', NULL, NULL, NULL),
(2, 3, 'Pending', NULL, NULL, NULL),
(3, 3, 'Upcoming', NULL, NULL, NULL),
(4, 3, 'Completed', DATE_SUB(NOW(), INTERVAL 3 DAY), 92.00, 'Excellent arguments and well structured essay!'),
(5, 3, 'Overdue', NULL, NULL, 'Submission overdue. Please turn in urgently.');

-- Student Payments
INSERT INTO student_payments (payment_id, student_id, session_id, term_id, title, amount_due, amount_paid, payment_date, payment_method, transaction_ref, status) VALUES
(1, 3, 2, 1, 'Term 1 Tuition & Utility Fees', 150000.00, 150000.00, '2025-09-15 10:45:00', 'Bank Transfer', 'TRX-98234561', 'Paid'),
(2, 3, 2, 2, 'Term 2 Tuition & Sports Fees', 155000.00, 155000.00, '2026-01-10 14:20:00', 'Bank Transfer', 'TRX-98239912', 'Paid'),
(3, 3, 2, 3, 'Term 3 Tuition & Development Fees', 160000.00, 160000.00, '2026-04-20 09:15:00', 'Card Payment', 'TRX-98245100', 'Paid');

-- Announcements
INSERT INTO announcements (announcement_id, title, content, category, publish_date, author) VALUES
(1, '2026/2027 Academic Admissions Now Open', 'Applications for the upcoming academic session are now being accepted online and physically at the school administration office.', 'Admissions', '2026-08-01', 'Admin Office'),
(2, 'Inter-House Sports Competition Announced', 'Join us for our annual sports day competition next month. Track events and team selections begin next week.', 'Events', '2026-07-28', 'Sports Department'),
(3, 'Form 4 Science Fair Victory', 'Congratulations to our senior students for winning 1st place in the Regional Science & Technology Expo.', 'Achievement', '2026-07-15', 'Principal Office');

SET FOREIGN_KEY_CHECKS = 1;
