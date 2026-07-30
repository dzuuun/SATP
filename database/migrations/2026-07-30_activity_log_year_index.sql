ALTER TABLE activity_log
  ADD INDEX idx_activity_log_date_time_id (date_time, id);
