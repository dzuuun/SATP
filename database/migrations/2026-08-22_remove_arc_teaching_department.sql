-- Teacher department membership belongs only to teacher_departments.
-- This cleanup is safe whether or not the earlier ARC column was applied.

SET @satp_schema = DATABASE();

SET @drop_arc_department_fk = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = @satp_schema
        AND TABLE_NAME = 'academic_records_consolidated'
        AND CONSTRAINT_NAME = 'fk_arc_teaching_department'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'ALTER TABLE academic_records_consolidated DROP FOREIGN KEY fk_arc_teaching_department',
    'SELECT 1'
  )
);
PREPARE satp_stmt FROM @drop_arc_department_fk;
EXECUTE satp_stmt;
DEALLOCATE PREPARE satp_stmt;

SET @drop_arc_department_index = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = @satp_schema
        AND TABLE_NAME = 'academic_records_consolidated'
        AND INDEX_NAME = 'idx_arc_teaching_department'
    ),
    'ALTER TABLE academic_records_consolidated DROP INDEX idx_arc_teaching_department',
    'SELECT 1'
  )
);
PREPARE satp_stmt FROM @drop_arc_department_index;
EXECUTE satp_stmt;
DEALLOCATE PREPARE satp_stmt;

SET @drop_arc_department_column = (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @satp_schema
        AND TABLE_NAME = 'academic_records_consolidated'
        AND COLUMN_NAME = 'teaching_department_id'
    ),
    'ALTER TABLE academic_records_consolidated DROP COLUMN teaching_department_id',
    'SELECT 1'
  )
);
PREPARE satp_stmt FROM @drop_arc_department_column;
EXECUTE satp_stmt;
DEALLOCATE PREPARE satp_stmt;
