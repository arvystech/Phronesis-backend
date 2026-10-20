-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 19, 2026 at 07:29 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `phronesis_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `admin_id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`admin_id`, `email`, `password`, `created_at`, `updated_at`) VALUES
(2, 'admin@phronesis.edu', '$2b$12$tPN.hi8Qp9L1NvO64j9Y4O1A3wQOnmIrnvokuGAwW5h1s.5YHhw26', '2026-10-13 16:38:52', '2026-10-13 16:38:52');

-- --------------------------------------------------------

--
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `announcement_id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(50) DEFAULT 'General',
  `publish_date` date NOT NULL,
  `author` varchar(100) DEFAULT 'School Admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`announcement_id`, `title`, `content`, `category`, `publish_date`, `author`) VALUES
(1, '2026/2027 Academic Admissions Now Open', 'Applications for the upcoming academic session are now being accepted online and physically at the school administration office.', 'Admissions', '2026-08-01', 'Admin Office'),
(2, 'Inter-House Sports Competition Announced', 'Join us for our annual sports day competition next month. Track events and team selections begin next week.', 'Events', '2026-07-28', 'Sports Department'),
(3, 'Form 4 Science Fair Victory', 'Congratulations to our senior students for winning 1st place in the Regional Science & Technology Expo.', 'Achievement', '2026-07-15', 'Principal Office');

-- --------------------------------------------------------

--
-- Table structure for table `assessments`
--

CREATE TABLE `assessments` (
  `assessment_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `assessment_type` enum('Test','Assignment','Project') NOT NULL DEFAULT 'Assignment',
  `due_date` datetime NOT NULL,
  `total_marks` decimal(5,2) NOT NULL DEFAULT 100.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessments`
--

INSERT INTO `assessments` (`assessment_id`, `class_id`, `subject_id`, `teacher_id`, `title`, `description`, `assessment_type`, `due_date`, `total_marks`) VALUES
(1, 1, 1, 1, 'Mid-Term Algebra Assignment', 'Complete exercises 1 to 15 on Quadratic Equations in Textbook Page 42.', 'Assignment', '2026-08-06 10:56:33', 100.00),
(2, 1, 3, 3, 'Biology Plant Cell Model Project', 'Build a 3D labeled model of a plant cell using eco-friendly materials.', 'Project', '2026-08-09 10:56:33', 100.00),
(3, 1, 5, 5, 'Physics Mechanics Quiz', 'In-class multiple choice test covering Newton Laws of Motion.', 'Test', '2026-08-11 10:56:33', 50.00),
(4, 1, 2, 2, 'English Essay: Technology in Education', 'Write a 500-word essay discussing the impacts of AI on high school learning.', 'Assignment', '2026-08-01 10:56:33', 100.00),
(5, 1, 4, 4, 'Chemistry Lab Experiment Report', 'Submit formal report on acid-base titration lab activity.', 'Assignment', '2026-08-03 10:56:33', 100.00);

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `term_id` int(11) NOT NULL,
  `total_days` int(11) NOT NULL DEFAULT 60,
  `days_present` int(11) NOT NULL DEFAULT 54,
  `days_absent` int(11) NOT NULL DEFAULT 6,
  `percentage` decimal(5,2) NOT NULL DEFAULT 90.00,
  `remarks` varchar(255) DEFAULT 'Good attendance!'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `student_id`, `session_id`, `term_id`, `total_days`, `days_present`, `days_absent`, `percentage`, `remarks`) VALUES
(1, 3, 2, 3, 60, 54, 6, 90.00, 'Good attendance!'),
(2, 1, 2, 3, 60, 57, 3, 95.00, 'Excellent attendance record.');

-- --------------------------------------------------------

--
-- Table structure for table `biometric_attendance`
--

CREATE TABLE `biometric_attendance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED DEFAULT NULL,
  `student_id` bigint(20) UNSIGNED DEFAULT NULL,
  `person_type` enum('staff','student') NOT NULL,
  `biometric_enrollment_no` varchar(20) NOT NULL,
  `machine_no` smallint(5) UNSIGNED NOT NULL,
  `source_record_no` varchar(20) DEFAULT NULL,
  `attendance_datetime` datetime NOT NULL,
  `mode_code` smallint(5) UNSIGNED DEFAULT NULL,
  `io_mode` tinyint(3) UNSIGNED NOT NULL,
  `source_file` varchar(255) DEFAULT NULL,
  `imported_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `class_id` int(11) NOT NULL,
  `class_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`class_id`, `class_name`) VALUES
(1, 'JSS1'),
(2, 'JSS2'),
(3, 'SSS1');

-- --------------------------------------------------------

--
-- Table structure for table `result_subjects`
--

CREATE TABLE `result_subjects` (
  `result_subject_id` int(11) NOT NULL,
  `result_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `ca_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `mid_term_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `exam_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `total_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `grade` varchar(10) NOT NULL DEFAULT '',
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `result_subjects`
--

INSERT INTO `result_subjects` (`result_subject_id`, `result_id`, `subject_id`, `ca_score`, `mid_term_score`, `exam_score`, `total_score`, `grade`, `remarks`) VALUES
(1, 1, 1, 28.00, 18.00, 46.00, 92.00, 'A', 'John has shown exceptional understanding of Mathematics concepts this term.'),
(2, 1, 2, 26.00, 17.00, 45.00, 88.00, 'A-', 'Very good performance in English. Keep it up.'),
(3, 1, 3, 25.00, 16.00, 44.00, 85.00, 'B+', 'Good performance in Biology.'),
(4, 1, 4, 27.00, 17.00, 46.00, 90.00, 'A', 'Excellent work in Chemistry. Showed deep curiosity.'),
(5, 1, 5, 24.00, 15.00, 43.00, 82.00, 'B', 'Above average. Can do better.'),
(6, 2, 1, 25.00, 16.00, 43.00, 84.00, 'B+', 'Consistent effort. Keep pushing for perfection.'),
(7, 2, 2, 27.00, 18.00, 47.00, 92.00, 'A', 'Brilliant command of the language.'),
(8, 2, 3, 26.00, 17.00, 45.00, 88.00, 'A-', 'A solid understanding of ecology.'),
(9, 2, 4, 25.00, 16.00, 44.00, 85.00, 'B+', 'Excellent practical skills.'),
(10, 2, 5, 28.00, 19.00, 48.00, 95.00, 'A+', 'Outstanding capability in theoretical and applied physics.'),
(11, 3, 1, 29.00, 19.00, 49.00, 97.00, 'A+', 'Absolute genius performance in final mathematics exam.'),
(12, 3, 2, 28.00, 18.00, 46.00, 92.00, 'A', 'Consistent excellence in essay writing.'),
(13, 3, 3, 27.00, 17.00, 46.00, 90.00, 'A', 'Outstanding research skills.'),
(14, 3, 4, 26.00, 17.00, 45.00, 88.00, 'A-', 'Very good performance.'),
(15, 3, 5, 29.00, 18.00, 47.00, 94.00, 'A', 'Superb work.'),
(16, 5, 1, 26.00, 17.00, 42.00, 85.00, 'B+', 'Very good problem-solving skills.'),
(17, 5, 2, 28.00, 18.00, 44.00, 90.00, 'A', 'Superb communication.'),
(18, 5, 3, 27.00, 17.00, 44.00, 88.00, 'A-', 'Great work.'),
(19, 5, 4, 25.00, 16.00, 41.00, 82.00, 'B', 'Good performance.'),
(20, 5, 5, 27.00, 17.00, 43.00, 87.00, 'A-', 'Splendid effort.');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` int(11) NOT NULL,
  `session_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `session_name`) VALUES
(1, '2024/2025'),
(2, '2025/2026');

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_no` varchar(30) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `other_names` varchar(150) DEFAULT NULL,
  `biometric_enrollment_no` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `department` enum('Teaching','Non-Teaching') NOT NULL,
  `employment_status` enum('active','inactive','suspended','resigned','terminated') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `staff_no`, `first_name`, `last_name`, `other_names`, `biometric_enrollment_no`, `email`, `phone`, `department`, `employment_status`, `created_at`, `updated_at`) VALUES
(1, 'PS/STAFF/001', 'Joseph', 'Edet', NULL, '12345', 'joe@gmail.com', '08012349567', 'Teaching', 'active', '2026-10-16 13:24:57', '2026-10-16 13:24:57'),
(2, 'PS/STAFF/002', 'Mary', 'Jack', NULL, '24678', 'mary@gmail.com', '08049032732', 'Non-Teaching', 'active', '2026-10-16 17:12:40', '2026-10-16 17:12:40'),
(4, 'PS/STAFF/003', 'Joseph', 'Bola', NULL, '28930', 'joseph@gmail.com', '08049342732', 'Teaching', 'active', '2026-10-16 22:08:00', '2026-10-16 22:08:00');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` int(11) NOT NULL,
  `admission_number` varchar(50) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `middle_name` varchar(50) DEFAULT '',
  `last_name` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `gender` varchar(10) NOT NULL,
  `date_of_birth` varchar(30) NOT NULL,
  `class_id` int(11) NOT NULL,
  `profile_pic` varchar(255) DEFAULT 'NULL',
  `blood_group` varchar(10) DEFAULT 'N/A',
  `state_of_origin` varchar(50) DEFAULT 'N/A',
  `parent_name` varchar(100) DEFAULT 'N/A',
  `parent_phone` varchar(30) DEFAULT 'N/A',
  `parent_email` varchar(100) DEFAULT 'N/A',
  `address` varchar(255) DEFAULT 'N/A',
  `status` varchar(20) DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_default_password` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`student_id`, `admission_number`, `first_name`, `middle_name`, `last_name`, `password`, `gender`, `date_of_birth`, `class_id`, `profile_pic`, `blood_group`, `state_of_origin`, `parent_name`, `parent_phone`, `parent_email`, `address`, `status`, `created_at`, `is_default_password`) VALUES
(1, 'PS001', 'Jane', 'Mary', 'Doe', '$2b$12$VeaYR7vm4vGMKSfb3RVad.TU9kVjGhhIuiwb4oYRzP61WOL58XBKi', 'Female', '12/05/2005', 2, 'NULL', 'A+', 'Oyo State', 'Mr. & Mrs. Doe', '+234 802 345 6789', 'jane.parent@phronesis.edu', '45 Crescent Way, Victoria Island', 'Active', '2026-08-04 09:56:32', 1),
(2, 'PS002', 'Alex', 'James', 'Smith', '$2b$12$VeaYR7vm4vGMKSfb3RVad.TU9kVjGhhIuiwb4oYRzP61WOL58XBKi', 'Male', '20/08/2004', 1, 'NULL', 'B+', 'Ogun State', 'Dr. Smith', '+234 803 456 7890', 'alex.parent@phronesis.edu', '88 Liberty Avenue, Ikeja', 'Active', '2026-08-04 09:56:32', 1),
(3, 'PS003', 'John', 'Doe', 'Lyn', '$2b$12$W/gU90QwDJ6an/Vl3SsuoOthwS83bsb0zk4zQWcCIyRy4s20NovSm', 'Male', '15/03/2004', 1, '2b91d2ee-d454-402e-aada-6273bd32732f.webp', 'O+', 'Lagos State', 'Mr. & Mrs. Lyn', '+234 800 123 4567', 'john.parent@phronesis.edu', '12 Academy Road, Phronesis City', 'Active', '2026-08-04 09:56:32', 0);

-- --------------------------------------------------------

--
-- Table structure for table `student_assessments`
--

CREATE TABLE `student_assessments` (
  `id` int(11) NOT NULL,
  `assessment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `submission_status` enum('Upcoming','Pending','Completed','Overdue') NOT NULL DEFAULT 'Upcoming',
  `submission_date` datetime DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `feedback` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_assessments`
--

INSERT INTO `student_assessments` (`id`, `assessment_id`, `student_id`, `submission_status`, `submission_date`, `score`, `feedback`) VALUES
(1, 1, 3, 'Upcoming', NULL, NULL, NULL),
(2, 2, 3, 'Pending', NULL, NULL, NULL),
(3, 3, 3, 'Upcoming', NULL, NULL, NULL),
(4, 4, 3, 'Completed', '2026-08-01 10:56:34', 92.00, 'Excellent arguments and well structured essay!'),
(5, 5, 3, 'Overdue', NULL, NULL, 'Submission overdue. Please turn in urgently.');

-- --------------------------------------------------------

--
-- Table structure for table `student_payments`
--

CREATE TABLE `student_payments` (
  `payment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `term_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `amount_due` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_date` datetime DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'Bank Transfer',
  `transaction_ref` varchar(100) DEFAULT NULL,
  `status` enum('Paid','Partial','Pending') NOT NULL DEFAULT 'Paid'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_payments`
--

INSERT INTO `student_payments` (`payment_id`, `student_id`, `session_id`, `term_id`, `title`, `amount_due`, `amount_paid`, `payment_date`, `payment_method`, `transaction_ref`, `status`) VALUES
(1, 3, 2, 1, 'Term 1 Tuition & Utility Fees', 150000.00, 150000.00, '2025-09-15 10:45:00', 'Bank Transfer', 'TRX-98234561', 'Paid'),
(2, 3, 2, 2, 'Term 2 Tuition & Sports Fees', 155000.00, 155000.00, '2026-01-10 14:20:00', 'Bank Transfer', 'TRX-98239912', 'Paid'),
(3, 3, 2, 3, 'Term 3 Tuition & Development Fees', 160000.00, 160000.00, '2026-04-20 09:15:00', 'Card Payment', 'TRX-98245100', 'Paid');

-- --------------------------------------------------------

--
-- Table structure for table `student_results`
--

CREATE TABLE `student_results` (
  `result_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `term_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `total_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `average_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `gpa` decimal(3,2) NOT NULL DEFAULT 0.00,
  `cgpa` decimal(3,2) NOT NULL DEFAULT 0.00,
  `grade` varchar(10) NOT NULL DEFAULT '',
  `class_position` int(11) NOT NULL DEFAULT 0,
  `total_students` int(11) NOT NULL DEFAULT 0,
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_results`
--

INSERT INTO `student_results` (`result_id`, `student_id`, `session_id`, `term_id`, `class_id`, `total_score`, `average_score`, `gpa`, `cgpa`, `grade`, `class_position`, `total_students`, `remarks`) VALUES
(1, 3, 2, 1, 1, 437.00, 87.40, 3.80, 3.80, 'A-', 5, 120, 'An excellent academic performance. John has demonstrated strong analytical abilities and consistent dedication.'),
(2, 3, 2, 2, 1, 444.00, 88.80, 3.90, 3.85, 'A-', 3, 120, 'Superb performance. Outstanding progress in Physics and English.'),
(3, 3, 2, 3, 1, 461.00, 92.20, 4.00, 3.90, 'A', 1, 120, 'A phenomenal academic year! John finishes top of the class. Exceptional excellence across all subjects.'),
(4, 3, 1, 3, 1, 406.00, 81.20, 3.40, 3.40, 'B', 12, 115, 'John had a good academic year. Focused and hardworking.'),
(5, 1, 2, 1, 2, 432.00, 86.40, 3.75, 3.75, 'A-', 7, 120, 'Very good academic performance. Jane is highly conscientious.');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `subject_id` int(11) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `subject_code` varchar(20) DEFAULT NULL,
  `syllabus` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`subject_id`, `subject_name`, `subject_code`, `syllabus`) VALUES
(1, 'Mathematics', 'MATH101', 'Algebra, Geometry, Trigonometry, Statistics, Calculus Basics'),
(2, 'English Language', 'ENG101', 'Grammar, Essay Writing, Oral English, Comprehension & Vocabulary'),
(3, 'Biology', 'BIO101', 'Cell Biology, Genetics, Plant & Animal Physiology, Ecology'),
(4, 'Chemistry', 'CHEM101', 'Atomic Structure, Chemical Bonding, Stoichiometry, Organic Chemistry'),
(5, 'Physics', 'PHYS101', 'Mechanics, Heat, Light, Magnetism, Electricity & Quantum Basics'),
(6, 'Morning Break', 'BREAK', 'Rest and refreshment interval');

-- --------------------------------------------------------

--
-- Table structure for table `subject_teachers`
--

CREATE TABLE `subject_teachers` (
  `id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subject_teachers`
--

INSERT INTO `subject_teachers` (`id`, `subject_id`, `teacher_id`, `class_id`) VALUES
(1, 1, 1, 1),
(6, 1, 1, 2),
(2, 2, 2, 1),
(7, 2, 2, 2),
(3, 3, 3, 1),
(8, 3, 3, 2),
(4, 4, 4, 1),
(9, 4, 4, 2),
(5, 5, 5, 1),
(10, 5, 5, 2);

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `teacher_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `profile_pic` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`teacher_id`, `name`, `email`, `phone`, `specialty`, `profile_pic`, `created_at`) VALUES
(1, 'Mr. Thompson', 'thompson@phronesis.edu', '+2348011112222', 'Mathematics', NULL, '2026-08-04 09:56:32'),
(2, 'Mrs. Johnson', 'johnson@phronesis.edu', '+2348022223333', 'English Language', NULL, '2026-08-04 09:56:32'),
(3, 'Mrs. Phronesis', 'phronesis@phronesis.edu', '+2348033334444', 'Biology', NULL, '2026-08-04 09:56:32'),
(4, 'Dr. Williams', 'williams@phronesis.edu', '+2348044445555', 'Chemistry', NULL, '2026-08-04 09:56:32'),
(5, 'Mr. Anderson', 'anderson@phronesis.edu', '+2348055556666', 'Physics', NULL, '2026-08-04 09:56:32');

-- --------------------------------------------------------

--
-- Table structure for table `terms`
--

CREATE TABLE `terms` (
  `term_id` int(11) NOT NULL,
  `term_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `terms`
--

INSERT INTO `terms` (`term_id`, `term_name`) VALUES
(1, 'Term 1'),
(2, 'Term 2'),
(3, 'Term 3');

-- --------------------------------------------------------

--
-- Table structure for table `timetables`
--

CREATE TABLE `timetables` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) DEFAULT NULL,
  `day` enum('Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room` varchar(50) DEFAULT 'Lab 101'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `timetables`
--

INSERT INTO `timetables` (`id`, `class_id`, `subject_id`, `teacher_id`, `day`, `start_time`, `end_time`, `room`) VALUES
(1, 1, 1, 1, 'Monday', '08:00:00', '09:00:00', 'Room 101'),
(2, 1, 2, 2, 'Monday', '09:00:00', '10:00:00', 'Room 101'),
(3, 1, 6, NULL, 'Monday', '10:00:00', '10:30:00', 'Cafeteria'),
(4, 1, 3, 3, 'Monday', '10:30:00', '11:30:00', 'Lab 2'),
(5, 1, 4, 4, 'Monday', '11:30:00', '12:30:00', 'Lab 1'),
(6, 1, 5, 5, 'Tuesday', '08:00:00', '09:00:00', 'Lab 3'),
(7, 1, 1, 1, 'Tuesday', '09:00:00', '10:00:00', 'Room 101'),
(8, 1, 6, NULL, 'Tuesday', '10:00:00', '10:30:00', 'Cafeteria'),
(9, 1, 2, 2, 'Tuesday', '10:30:00', '11:30:00', 'Room 101'),
(10, 1, 3, 3, 'Wednesday', '08:00:00', '09:00:00', 'Lab 2'),
(11, 1, 4, 4, 'Wednesday', '09:00:00', '10:00:00', 'Lab 1'),
(12, 1, 6, NULL, 'Wednesday', '10:00:00', '10:30:00', 'Cafeteria'),
(13, 1, 5, 5, 'Wednesday', '10:30:00', '11:30:00', 'Lab 3'),
(14, 1, 1, 1, 'Thursday', '08:00:00', '09:00:00', 'Room 101'),
(15, 1, 2, 2, 'Thursday', '09:00:00', '10:00:00', 'Room 101'),
(16, 1, 6, NULL, 'Thursday', '10:00:00', '10:30:00', 'Cafeteria'),
(17, 1, 3, 3, 'Thursday', '10:30:00', '11:30:00', 'Lab 2'),
(18, 1, 4, 4, 'Friday', '08:00:00', '09:00:00', 'Lab 1'),
(19, 1, 5, 5, 'Friday', '09:00:00', '10:00:00', 'Lab 3'),
(20, 1, 6, NULL, 'Friday', '10:00:00', '10:30:00', 'Cafeteria'),
(21, 1, 1, 1, 'Friday', '10:30:00', '11:30:00', 'Room 101');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`announcement_id`);

--
-- Indexes for table `assessments`
--
ALTER TABLE `assessments`
  ADD PRIMARY KEY (`assessment_id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD UNIQUE KEY `idx_student_term_attendance` (`student_id`,`session_id`,`term_id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `term_id` (`term_id`);

--
-- Indexes for table `biometric_attendance`
--
ALTER TABLE `biometric_attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_biometric_punch` (`machine_no`,`biometric_enrollment_no`,`attendance_datetime`,`mode_code`,`io_mode`),
  ADD KEY `idx_biometric_attendance_staff_date` (`staff_id`,`attendance_datetime`),
  ADD KEY `idx_biometric_attendance_datetime` (`attendance_datetime`),
  ADD KEY `idx_biometric_attendance_person_date` (`person_type`,`attendance_datetime`),
  ADD KEY `idx_biometric_attendance_enrollment` (`biometric_enrollment_no`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`class_id`),
  ADD UNIQUE KEY `class_name` (`class_name`);

--
-- Indexes for table `result_subjects`
--
ALTER TABLE `result_subjects`
  ADD PRIMARY KEY (`result_subject_id`),
  ADD UNIQUE KEY `idx_result_subject` (`result_id`,`subject_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD UNIQUE KEY `session_name` (`session_name`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `staff_no` (`staff_no`),
  ADD UNIQUE KEY `biometric_enrollment_no` (`biometric_enrollment_no`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `admission_number` (`admission_number`),
  ADD KEY `idx_student_admission` (`admission_number`),
  ADD KEY `idx_student_class` (`class_id`);

--
-- Indexes for table `student_assessments`
--
ALTER TABLE `student_assessments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_student_assessment` (`assessment_id`,`student_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `student_payments`
--
ALTER TABLE `student_payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `term_id` (`term_id`);

--
-- Indexes for table `student_results`
--
ALTER TABLE `student_results`
  ADD PRIMARY KEY (`result_id`),
  ADD UNIQUE KEY `idx_student_session_term` (`student_id`,`session_id`,`term_id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `term_id` (`term_id`),
  ADD KEY `class_id` (`class_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`subject_id`),
  ADD UNIQUE KEY `subject_name` (`subject_name`),
  ADD UNIQUE KEY `subject_code` (`subject_code`);

--
-- Indexes for table `subject_teachers`
--
ALTER TABLE `subject_teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_subject_teacher_class` (`subject_id`,`teacher_id`,`class_id`),
  ADD KEY `teacher_id` (`teacher_id`),
  ADD KEY `class_id` (`class_id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`teacher_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `terms`
--
ALTER TABLE `terms`
  ADD PRIMARY KEY (`term_id`),
  ADD UNIQUE KEY `term_name` (`term_name`);

--
-- Indexes for table `timetables`
--
ALTER TABLE `timetables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `teacher_id` (`teacher_id`),
  ADD KEY `idx_timetable_class_day` (`class_id`,`day`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `admin_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `assessments`
--
ALTER TABLE `assessments`
  MODIFY `assessment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `biometric_attendance`
--
ALTER TABLE `biometric_attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `class_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `result_subjects`
--
ALTER TABLE `result_subjects`
  MODIFY `result_subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `sessions`
--
ALTER TABLE `sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `student_assessments`
--
ALTER TABLE `student_assessments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `student_payments`
--
ALTER TABLE `student_payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `student_results`
--
ALTER TABLE `student_results`
  MODIFY `result_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `subject_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `subject_teachers`
--
ALTER TABLE `subject_teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `teacher_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `terms`
--
ALTER TABLE `terms`
  MODIFY `term_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `timetables`
--
ALTER TABLE `timetables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assessments`
--
ALTER TABLE `assessments`
  ADD CONSTRAINT `assessments_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assessments_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assessments_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE SET NULL;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`session_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`term_id`) REFERENCES `terms` (`term_id`) ON DELETE CASCADE;

--
-- Constraints for table `biometric_attendance`
--
ALTER TABLE `biometric_attendance`
  ADD CONSTRAINT `fk_biometric_attendance_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`);

--
-- Constraints for table `result_subjects`
--
ALTER TABLE `result_subjects`
  ADD CONSTRAINT `result_subjects_ibfk_1` FOREIGN KEY (`result_id`) REFERENCES `student_results` (`result_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `result_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_assessments`
--
ALTER TABLE `student_assessments`
  ADD CONSTRAINT `student_assessments_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`assessment_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_assessments_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_payments`
--
ALTER TABLE `student_payments`
  ADD CONSTRAINT `student_payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_payments_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`session_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_payments_ibfk_3` FOREIGN KEY (`term_id`) REFERENCES `terms` (`term_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_results`
--
ALTER TABLE `student_results`
  ADD CONSTRAINT `student_results_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_results_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`session_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_results_ibfk_3` FOREIGN KEY (`term_id`) REFERENCES `terms` (`term_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_results_ibfk_4` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE;

--
-- Constraints for table `subject_teachers`
--
ALTER TABLE `subject_teachers`
  ADD CONSTRAINT `subject_teachers_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subject_teachers_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subject_teachers_ibfk_3` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE;

--
-- Constraints for table `timetables`
--
ALTER TABLE `timetables`
  ADD CONSTRAINT `timetables_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`class_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `timetables_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `timetables_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`teacher_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
