ALTER TABLE users
  ADD COLUMN last_seen_at DATETIME NULL AFTER is_active,
  ADD INDEX idx_users_active_last_seen (is_active, last_seen_at);
