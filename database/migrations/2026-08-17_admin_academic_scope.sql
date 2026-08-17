ALTER TABLE users
  ADD COLUMN admin_academic_scope ENUM('COLLEGE', 'SHS', 'ALL') NULL DEFAULT NULL
  AFTER permission_id;

UPDATE users
SET admin_academic_scope = 'ALL'
WHERE is_admin_rater = 1;

UPDATE users
SET admin_academic_scope = NULL
WHERE is_student_rater = 1 AND is_admin_rater = 0;
