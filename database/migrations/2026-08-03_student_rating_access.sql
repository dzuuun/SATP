CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
);

INSERT INTO system_settings (setting_key, setting_value)
VALUES ('student_rating_enabled', '1')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
