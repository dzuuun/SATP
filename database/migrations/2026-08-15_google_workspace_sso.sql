ALTER TABLE users
  ADD COLUMN google_email VARCHAR(255) NULL AFTER username,
  ADD UNIQUE INDEX uq_users_google_email (google_email);
