
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `satp` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `satp`;
DROP TABLE IF EXISTS `academic_records_consolidated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_records_consolidated` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `school_year_id` int(10) unsigned NOT NULL,
  `semester_id` int(10) unsigned NOT NULL,
  `subject_id` int(10) unsigned NOT NULL,
  `teacher_id` int(10) unsigned NOT NULL,
  `student_id` int(10) unsigned NOT NULL,
  `schedule_code` varchar(50) DEFAULT NULL,
  `time_start` time DEFAULT NULL,
  `time_end` time DEFAULT NULL,
  `day` varchar(20) DEFAULT NULL,
  `room_id` smallint(5) unsigned DEFAULT NULL,
  `is_excluded` tinyint(1) DEFAULT 0,
  `reason` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_arc_student_course_teacher_schedule` (`student_id`,`school_year_id`,`semester_id`,`subject_id`,`teacher_id`,`schedule_code`),
  KEY `fk_school_year` (`school_year_id`),
  KEY `fk_semester` (`semester_id`),
  KEY `fk_teacher` (`teacher_id`),
  KEY `fk_student` (`student_id`),
  KEY `fk_subject` (`subject_id`),
  KEY `fk_room` (`room_id`),
  KEY `idx_arc_rating_period` (`school_year_id`,`semester_id`,`status`,`teacher_id`,`subject_id`,`student_id`),
  KEY `idx_arc_period_student_excluded` (`school_year_id`,`semester_id`,`student_id`,`is_excluded`),
  KEY `idx_arc_student_period_excluded_course` (`student_id`,`school_year_id`,`semester_id`,`is_excluded`,`subject_id`),
  KEY `idx_arc_report_period` (`school_year_id`,`semester_id`,`is_excluded`,`teacher_id`,`subject_id`,`status`,`student_id`),
  KEY `idx_arc_schedule_assignment` (`school_year_id`,`semester_id`,`schedule_code`,`subject_id`,`teacher_id`),
  CONSTRAINT `fk_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `fk_school_year` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`),
  CONSTRAINT `fk_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
  CONSTRAINT `fk_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `fk_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=290030 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `date_time` datetime NOT NULL,
  `action` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_activity_log_user_id` (`user_id`),
  KEY `idx_activity_log_date` (`date_time`,`id`),
  KEY `idx_activity_log_user_date` (`user_id`,`date_time`,`id`),
  CONSTRAINT `fk_activity_log_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_info` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=809207 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schools` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(45) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schools_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `colleges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `colleges` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(45) NOT NULL,
  `name` varchar(100) NOT NULL,
  `school_id` int(10) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_colleges_school_id` (`school_id`),
  CONSTRAINT `fk_colleges_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(45) NOT NULL,
  `name` varchar(100) NOT NULL,
  `department_id` int(10) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`code`),
  KEY `fk_courses_department_id` (`department_id`),
  CONSTRAINT `fk_courses_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=176 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(45) NOT NULL,
  `name` varchar(100) NOT NULL,
  `college_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`code`),
  KEY `fk_departments_college_id` (`college_id`),
  CONSTRAINT `fk_departments_college_id` FOREIGN KEY (`college_id`) REFERENCES `colleges` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `image_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `image_file` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `teacher_id` int(10) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `path` varchar(100) NOT NULL,
  PRIMARY KEY (`id`,`teacher_id`),
  KEY `fk_image_file_teacher_id` (`teacher_id`),
  CONSTRAINT `fk_image_file_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `number` int(10) unsigned NOT NULL,
  `question` text NOT NULL,
  `category_id` int(10) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_items_category_id` (`category_id`),
  CONSTRAINT `fk_items_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `transaction_access` tinyint(3) unsigned NOT NULL,
  `maintenance_access` tinyint(3) unsigned NOT NULL,
  `reports_access` tinyint(3) unsigned NOT NULL,
  `users_access` tinyint(3) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=335 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `school_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_years` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  `in_use` tinyint(3) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `semesters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `semesters` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `in_use` tinyint(3) unsigned NOT NULL,
  `is_current_college` tinyint(1) NOT NULL DEFAULT 0,
  `is_current_shs` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `student_subject`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_subject` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `school_year_id` int(10) unsigned NOT NULL,
  `semester_id` int(10) unsigned NOT NULL,
  `subject_id` int(10) unsigned NOT NULL,
  `teacher_id` int(10) unsigned NOT NULL,
  `student_id` int(10) unsigned NOT NULL,
  `schedule_code` varchar(100) NOT NULL,
  `time_start` time NOT NULL,
  `time_end` time NOT NULL,
  `day` varchar(9) NOT NULL,
  `room_id` smallint(5) unsigned DEFAULT NULL,
  `is_excluded` tinyint(3) unsigned NOT NULL,
  `reason` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`,`school_year_id`,`semester_id`,`subject_id`,`teacher_id`,`student_id`),
  KEY `fk_student_subject_room_id` (`room_id`),
  KEY `fk_student_subject_school_year__id` (`school_year_id`),
  KEY `fk_student_subject_semester_id` (`semester_id`),
  KEY `fk_student_subject_student_id` (`student_id`),
  KEY `fk_student_subject_subject_id` (`subject_id`),
  KEY `fk_student_subject_teacher_id` (`teacher_id`),
  KEY `idx_student_subject_consolidation` (`school_year_id`,`semester_id`,`teacher_id`,`subject_id`,`student_id`),
  CONSTRAINT `fk_student_subject_room_id` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `fk_student_subject_school_year__id` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`),
  CONSTRAINT `fk_student_subject_semester_id` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
  CONSTRAINT `fk_student_subject_student_id` FOREIGN KEY (`student_id`) REFERENCES `user_info` (`user_id`),
  CONSTRAINT `fk_student_subject_subject_id` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `fk_student_subject_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=262482 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(45) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`code`)
) ENGINE=InnoDB AUTO_INCREMENT=5128 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teachers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teachers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `surname` varchar(45) CHARACTER SET utf8 NOT NULL,
  `givenname` varchar(45) CHARACTER SET utf8 NOT NULL,
  `middlename` varchar(45) CHARACTER SET utf8 DEFAULT NULL,
  `prefix` varchar(10) DEFAULT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `department_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`surname`,`givenname`) USING BTREE,
  KEY `fk_teachers_department_id` (`department_id`),
  CONSTRAINT `fk_teachers_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1291 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teacher_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_departments` (
  `teacher_id` int(10) unsigned NOT NULL,
  `department_id` int(10) unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `teaching_status` tinyint(3) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`teacher_id`,`department_id`),
  KEY `idx_teacher_departments_department` (`department_id`,`teacher_id`),
  CONSTRAINT `fk_teacher_departments_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_teacher_departments_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
DROP TABLE IF EXISTS `academic_record_departments`;
CREATE TABLE `academic_record_departments` (
  `academic_record_id` int(10) unsigned NOT NULL,
  `department_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`academic_record_id`),
  KEY `idx_academic_record_departments_department` (`department_id`,`academic_record_id`),
  CONSTRAINT `fk_academic_record_departments_record` FOREIGN KEY (`academic_record_id`) REFERENCES `academic_records_consolidated` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_academic_record_departments_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trans_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trans_item` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` int(10) unsigned NOT NULL,
  `item_id` int(10) unsigned NOT NULL,
  `rate` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_trans_item_item_id` (`item_id`),
  KEY `idx_trans_item_report_cover` (`transaction_id`,`item_id`,`rate`),
  CONSTRAINT `fk_trans_item_item_id` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `fk_trans_item_transaction_id` FOREIGN KEY (`transaction_id`) REFERENCES `academic_records_consolidated` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8580485 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `school_year_id` int(10) unsigned NOT NULL,
  `semester_id` int(10) unsigned NOT NULL,
  `subject_id` int(10) unsigned NOT NULL,
  `teacher_id` int(10) unsigned NOT NULL,
  `comment` text DEFAULT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_transactions_school_year_id` (`school_year_id`),
  KEY `fk_transactions_semester_id` (`semester_id`),
  KEY `fk_transactions_subject_id` (`subject_id`),
  KEY `fk_transactions_teacher_id` (`teacher_id`),
  KEY `fk_transactions_user_id` (`user_id`),
  KEY `idx_transactions_period_teacher` (`school_year_id`,`semester_id`,`teacher_id`,`id`),
  CONSTRAINT `fk_transactions_school_year_id` FOREIGN KEY (`school_year_id`) REFERENCES `school_years` (`id`),
  CONSTRAINT `fk_transactions_semester_id` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
  CONSTRAINT `fk_transactions_subject_id` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `fk_transactions_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`),
  CONSTRAINT `fk_transactions_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_info` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=290030 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_info` (
  `user_id` int(10) unsigned NOT NULL,
  `surname` varchar(45) NOT NULL,
  `givenname` varchar(45) NOT NULL,
  `middlename` varchar(45) NOT NULL,
  `course_id` int(10) unsigned DEFAULT NULL,
  `year_level` varchar(45) DEFAULT NULL,
  `gender` enum('MALE','FEMALE') NOT NULL,
  PRIMARY KEY (`user_id`,`surname`,`givenname`,`middlename`),
  KEY `fk_user_info_course_id` (`course_id`),
  CONSTRAINT `fk_user_info_course_id` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  CONSTRAINT `fk_user_info_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(45) NOT NULL,
  `google_email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `permission_id` int(10) unsigned DEFAULT NULL,
  `admin_academic_scope` enum('COLLEGE','SHS','ALL') DEFAULT NULL,
  `is_temp_pass` tinyint(3) unsigned NOT NULL,
  `is_student_rater` tinyint(3) unsigned NOT NULL,
  `is_admin_rater` tinyint(3) unsigned NOT NULL,
  `is_active` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`,`username`),
  UNIQUE KEY `uq_users_google_email` (`google_email`),
  KEY `fk_users_permission_id` (`permission_id`),
  KEY `idx_users_username` (`username`),
  CONSTRAINT `fk_users_permission_id` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10612 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
