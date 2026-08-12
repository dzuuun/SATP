ALTER TABLE academic_records_consolidated
  ADD INDEX idx_arc_period_student_excluded (
    school_year_id,
    semester_id,
    student_id,
    is_excluded
  ),
  ALGORITHM = INPLACE,
  LOCK = NONE;
