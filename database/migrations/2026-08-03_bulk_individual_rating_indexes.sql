-- Speeds up semester-wide individual rating exports.
ALTER TABLE academic_records_consolidated
  ADD INDEX idx_arc_rating_period (
    school_year_id,
    semester_id,
    status,
    teacher_id,
    subject_id,
    student_id
  ),
  ALGORITHM = INPLACE,
  LOCK = NONE;

ALTER TABLE trans_item
  ADD INDEX idx_trans_item_report_cover (transaction_id, item_id, rate),
  ALGORITHM = INPLACE,
  LOCK = NONE;
