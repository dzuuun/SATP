ALTER TABLE teacher_departments
  ADD COLUMN teaching_status TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER is_primary;

UPDATE teacher_departments
INNER JOIN teachers ON teachers.id = teacher_departments.teacher_id
SET teacher_departments.teaching_status = teachers.is_part_time;

ALTER TABLE teachers
  DROP COLUMN is_part_time;
