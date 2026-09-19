CREATE TABLE IF NOT EXISTS ab_booking_mail (
 booking_id BIGINT UNSIGNED PRIMARY KEY,
 status ENUM('pending','sending','accepted') NOT NULL DEFAULT 'pending',
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 attempted_at DATETIME NULL, accepted_at DATETIME NULL,
 FOREIGN KEY (booking_id) REFERENCES ab_bookings(id), INDEX mail_queue(status,attempted_at)
) ENGINE=InnoDB;
INSERT IGNORE INTO ab_migrations(id) VALUES ('002_booking_mail');
