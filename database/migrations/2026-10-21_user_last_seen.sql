-- Keep last_seen_at after sign-out while marking the account offline immediately.
ALTER TABLE users
  ADD COLUMN last_logout_at DATETIME NULL AFTER last_seen_at;
