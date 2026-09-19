CREATE TABLE IF NOT EXISTS ab_blocked_windows (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL,
 UNIQUE KEY blocked_interval(starts_at,ends_at), CHECK(ends_at > starts_at)
) ENGINE=InnoDB;
INSERT IGNORE INTO ab_migrations(id) VALUES ('003_blocked_windows');
