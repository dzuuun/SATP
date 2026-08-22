CREATE TABLE IF NOT EXISTS schools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(45) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_schools_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO schools (code, name, is_active)
VALUES
  ('COLLEGE', 'Higher Education', 1),
  ('SHS', 'Senior High School', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

ALTER TABLE colleges
  ADD COLUMN school_id INT UNSIGNED NULL AFTER name;

UPDATE colleges
SET school_id = (
  SELECT schools.id
  FROM schools
  WHERE schools.code =
    CASE WHEN colleges.code = 'SEN-HISCH' THEN 'SHS' ELSE 'COLLEGE' END
  ORDER BY schools.id
  LIMIT 1
)
WHERE school_id IS NULL;

ALTER TABLE colleges
  MODIFY school_id INT UNSIGNED NOT NULL,
  ADD KEY idx_colleges_school_id (school_id),
  ADD CONSTRAINT fk_colleges_school_id
    FOREIGN KEY (school_id) REFERENCES schools (id)
    ON UPDATE CASCADE;
