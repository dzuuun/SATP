-- Keeps the department attached to an enrollment without storing it on
-- academic_records_consolidated itself. This lets one merged teacher retain
-- the correct department for each transferred course.
CREATE TABLE IF NOT EXISTS academic_record_departments (
  academic_record_id INT UNSIGNED NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (academic_record_id),
  KEY idx_academic_record_departments_department (department_id, academic_record_id),
  CONSTRAINT fk_academic_record_departments_record
    FOREIGN KEY (academic_record_id) REFERENCES academic_records_consolidated (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_academic_record_departments_department
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO academic_record_departments (academic_record_id, department_id)
SELECT arc.id, teachers.department_id
FROM academic_records_consolidated AS arc
INNER JOIN teachers ON teachers.id = arc.teacher_id
WHERE teachers.department_id IS NOT NULL;
