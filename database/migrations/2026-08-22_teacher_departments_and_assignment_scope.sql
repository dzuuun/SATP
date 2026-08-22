CREATE TABLE IF NOT EXISTS teacher_departments (
  teacher_id INT UNSIGNED NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (teacher_id, department_id),
  KEY idx_teacher_departments_department (department_id, teacher_id),
  CONSTRAINT fk_teacher_departments_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_teacher_departments_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO teacher_departments (teacher_id, department_id, is_primary)
SELECT id, department_id, 1
FROM teachers
WHERE department_id IS NOT NULL;
