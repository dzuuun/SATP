ALTER TABLE academic_records_consolidated
  ADD INDEX idx_arc_student_period_excluded_course (
    student_id,
    school_year_id,
    semester_id,
    is_excluded,
    subject_id
  ),
  ALGORITHM = INPLACE,
  LOCK = NONE;
