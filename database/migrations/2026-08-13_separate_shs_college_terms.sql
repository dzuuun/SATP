ALTER TABLE semesters
  ADD COLUMN is_current_college TINYINT(1) NOT NULL DEFAULT 0 AFTER in_use,
  ADD COLUMN is_current_shs TINYINT(1) NOT NULL DEFAULT 0 AFTER is_current_college;

-- Preserve the existing current semester as the initial current term for both groups.
UPDATE semesters
SET is_current_college = IF(in_use = 1 AND is_active = 1, 1, 0),
    is_current_shs = IF(in_use = 1 AND is_active = 1, 1, 0);
