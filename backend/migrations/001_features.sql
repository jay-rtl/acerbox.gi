CREATE TABLE IF NOT EXISTS ab_migrations (id VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ab_reviews (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, client_name VARCHAR(100) NOT NULL,
 rating TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5), review_text TEXT NOT NULL,
 status ENUM('pending','approved') NOT NULL DEFAULT 'pending', fingerprint CHAR(64) NOT NULL UNIQUE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 approved_at DATETIME NULL, INDEX reviews_public(status, approved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ab_slots (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_type VARCHAR(40) NOT NULL,
 starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 UNIQUE KEY unique_window(booking_type, starts_at, ends_at), INDEX slot_dates(starts_at, active),
 CHECK(ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ab_bookings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, slot_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL, phone VARCHAR(40) NOT NULL DEFAULT '',
 booking_type VARCHAR(40) NOT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL,
 notes TEXT NOT NULL, status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reservation_slot BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status IN ('pending','confirmed') THEN slot_id ELSE NULL END) STORED,
 UNIQUE KEY active_slot(reservation_slot), INDEX booking_conflicts(status, starts_at, ends_at),
 FOREIGN KEY(slot_id) REFERENCES ab_slots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ab_blocked_dates (blocked_date DATE PRIMARY KEY) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ab_booking_lock (id TINYINT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO ab_booking_lock VALUES (1);
CREATE TABLE IF NOT EXISTS ab_rate_limits (bucket_key CHAR(64) PRIMARY KEY, hits INT NOT NULL, expires_at BIGINT NOT NULL, INDEX expiry(expires_at)) ENGINE=InnoDB;
INSERT IGNORE INTO ab_migrations(id) VALUES ('001_features');
