CREATE TABLE `users`(
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(45) NOT NULL,
    `password` VARCHAR(32) NOT NULL,
    `permission_id` INT(11) UNSIGNED NOT NULL,
    `is_temp_pass` TINYINT(1) UNSIGNED NOT NULL,
    `is_student_rater` TINYINT(1) UNSIGNED NOT NULL,
    `is_admin_rater` TINYINT(1) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `username`)
); 

CREATE TABLE `user_info`(
    `user_id` INT(11) UNSIGNED NOT NULL,
    `surname` VARCHAR(45) NOT NULL,
    `givenname` VARCHAR(45) NOT NULL,
    `middlename` VARCHAR(45) NULL,
    `course_id` INT(10) UNSIGNED NULL,
    `year_level` VARCHAR(45) NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    PRIMARY KEY(
        `user_id`,
        `surname`,
        `givenname`
    )
);

CREATE TABLE `teachers`(
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `surname` VARCHAR(45) NOT NULL,
    `givenname` VARCHAR(45) NOT NULL,
    `middlename` VARCHAR(45) NULL,
    `department_id` INT(11) UNSIGNED NOT NULL,
    `is_part_time` TINYINT(1) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(
        `id`,
        `surname`,
        `givenname`
    )
);

CREATE TABLE `courses`(
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(45) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `department_id` INT(10) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `code`)
);

CREATE TABLE `image_file`(
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `teacher_id` INT(11) UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `path` VARCHAR(100) NOT NULL,
    PRIMARY KEY(`id`, `teacher_id`)
);

CREATE TABLE `departments`(
    `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(45) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `college_id` INT(10) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `code`)
);

CREATE TABLE `trans_item`(
    `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_id` INT(10) UNSIGNED NOT NULL,
    `item_id` INT(10) UNSIGNED NOT NULL,
    `rate` INT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`)
);

CREATE TABLE `permissions`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `transaction_access` TINYINT(1) UNSIGNED NOT NULL,
    `maintenance_access` TINYINT(1) UNSIGNED NOT NULL,
    `reports_access` TINYINT(1) UNSIGNED NOT NULL,
    `users_access` TINYINT(1) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`)
); 

CREATE TABLE `activity_log`(
    `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `date_time` DATETIME NOT NULL,
    `action` TEXT NOT NULL,
    PRIMARY KEY(`id`)
);

CREATE TABLE `categories`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `name`)
);

CREATE TABLE `semesters`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `in_use` TINYINT(1) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `name`)
); 

CREATE TABLE `subjects`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(45) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `code`)
);

CREATE TABLE `colleges`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(45) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`)
); 

CREATE TABLE `items`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `number` INT(2) UNSIGNED NOT NULL,
    `question` TEXT NOT NULL,
    `category_id` INT(10) UNSIGNED NOT NULL,
    `is_active` TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY(`id`)
);

CREATE TABLE `transactions`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `school_year_id` INT(10) UNSIGNED NOT NULL,
    `semester_id` INT(10) UNSIGNED NOT NULL,
    `subject_id` INT(10) UNSIGNED NOT NULL,
    `teacher_id` INT(10) UNSIGNED NOT NULL,
    `comment` TEXT NOT NULL,
    `user_id` INT(10) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`)
);

CREATE TABLE `rooms`(
    `id` SMALLINT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`)
); 

CREATE TABLE `school_years`(
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `in_use` TINYINT(1) UNSIGNED NOT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL,
    PRIMARY KEY(`id`, `name`)
);

CREATE TABLE `student_subject`(
    `school_year_id` INT(10) UNSIGNED NOT NULL,
    `semester_id` INT(10) UNSIGNED NOT NULL,
    `subject_id` INT(10) UNSIGNED NOT NULL,
    `teacher_id` INT(10) UNSIGNED NOT NULL,
    `student_id` INT(10) UNSIGNED NOT NULL,
    `schedule_code` VARCHAR(20) NOT NULL,
    `time_start` TIME NOT NULL,
    `time_end` TIME NOT NULL,
    `day` VARCHAR(9) NOT NULL,
    `room_id` SMALLINT(10) UNSIGNED NOT NULL,
    `is_excluded` TINYINT(1) UNSIGNED NOT NULL,
    `reason` VARCHAR(100) NULL,
    PRIMARY KEY(
        `school_year_id`,
        `semester_id`,
        `subject_id`,
        `teacher_id`,
        `student_id`
    )
);

	-- trans_item
ALTER TABLE
    `trans_item` ADD CONSTRAINT `fk_trans_item_transaction_id` FOREIGN KEY(`transaction_id`) REFERENCES `transactions`(`id`),
    ADD CONSTRAINT `fk_trans_item_item_id` FOREIGN KEY(`item_id`) REFERENCES `items`(`id`);
    
    -- transaction
ALTER TABLE
    `transactions` ADD CONSTRAINT `fk_transactions_school_year_id` FOREIGN KEY(`school_year_id`) REFERENCES `school_years`(`id`),
    ADD CONSTRAINT `fk_transactions_semester_id` FOREIGN KEY(`semester_id`) REFERENCES `semesters`(`id`),
    ADD CONSTRAINT `fk_transactions_subject_id` FOREIGN KEY(`subject_id`) REFERENCES `subjects`(`id`),
    ADD CONSTRAINT `fk_transactions_teacher_id` FOREIGN KEY(`teacher_id`) REFERENCES `teachers`(`id`),
    ADD CONSTRAINT `fk_transactions_user_id` FOREIGN KEY(`user_id`) REFERENCES `user_info`(`user_id`);
    
    -- items
ALTER TABLE
    `items` ADD CONSTRAINT `fk_items_category_id` FOREIGN KEY(`category_id`) REFERENCES `categories`(`id`);
    
    -- courses
ALTER TABLE
    `courses` ADD CONSTRAINT `fk_courses_department_id` FOREIGN KEY(`department_id`) REFERENCES `departments`(`id`);
    
    -- image_file
ALTER TABLE
    `image_file` ADD CONSTRAINT `fk_image_file_teacher_id` FOREIGN KEY(`teacher_id`) REFERENCES `teachers`(`id`);
    
    -- departments
ALTER TABLE
    `departments` ADD CONSTRAINT `fk_departments_college_id` FOREIGN KEY(`college_id`) REFERENCES `colleges`(`id`);
    
    -- activity_log
ALTER TABLE
    `activity_log` ADD CONSTRAINT `fk_activity_log_user_id` FOREIGN KEY(`user_id`) REFERENCES `user_info`(`user_id`);
    
    -- teachers
ALTER TABLE
    `teachers` ADD CONSTRAINT `fk_teachers_department_id` FOREIGN KEY(`department_id`) REFERENCES `departments`(`id`);
    
    -- user_info
ALTER TABLE
    `user_info` ADD CONSTRAINT `fk_user_info_user_id` FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    ADD CONSTRAINT `fk_user_info_course_id` FOREIGN KEY(`course_id`) REFERENCES `courses`(`id`);
    
    -- users
ALTER TABLE
    `users` ADD CONSTRAINT `fk_users_permission_id` FOREIGN KEY(`permission_id`) REFERENCES `permissions`(`id`);
    
    -- student_subject
ALTER TABLE
    `student_subject` ADD CONSTRAINT `fk_student_subject_school_year_id` FOREIGN KEY(`school_year_id`) REFERENCES `school_years`(`id`),
    ADD CONSTRAINT `fk_student_subject_semester_id` FOREIGN KEY(`semester_id`) REFERENCES `semesters`(`id`),
    ADD CONSTRAINT `fk_student_subject_subject_id` FOREIGN KEY(`subject_id`) REFERENCES `subjects`(`id`),
    ADD CONSTRAINT `fk_student_subject_teacher_id` FOREIGN KEY(`teacher_id`) REFERENCES `teachers`(`id`),
    ADD CONSTRAINT `fk_student_subject_student_id` FOREIGN KEY(`student_id`) REFERENCES `user_info`(`user_id`),
	ADD CONSTRAINT `fk_student_subject_room` FOREIGN KEY(`room_id`) REFERENCES `rooms` (`id`);