CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `account` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(64) NULL,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_account` (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cloud_sync_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scope_key` VARCHAR(128) NOT NULL,
    `snapshot_json` LONGTEXT NOT NULL,
    `updated_at` VARCHAR(64) NULL,
    `schema_version` INT NULL,
    `saved_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_scope_key` (`scope_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `health_records` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `record_date` VARCHAR(16) NOT NULL,
    `record_time` VARCHAR(16) NULL,
    `type` VARCHAR(32) NOT NULL,
    `value` VARCHAR(64) NOT NULL,
    `unit` VARCHAR(32) NULL,
    `notes` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `is_deleted` TINYINT NOT NULL DEFAULT 0,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`user_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `symptom_records` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `record_date` VARCHAR(16) NOT NULL,
    `record_time` VARCHAR(16) NULL,
    `description` TEXT NOT NULL,
    `measures` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `is_deleted` TINYINT NOT NULL DEFAULT 0,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`user_id`, `record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `activity_records` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `activity_date` VARCHAR(16) NOT NULL,
    `start_time` VARCHAR(16) NULL,
    `end_time` VARCHAR(16) NULL,
    `duration_minutes` INT NULL,
    `type` VARCHAR(32) NOT NULL,
    `content` VARCHAR(255) NOT NULL,
    `feeling` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `source` VARCHAR(32) NULL,
    `is_deleted` TINYINT NOT NULL DEFAULT 0,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`user_id`, `activity_date`),
    KEY `idx_user_type_date` (`user_id`, `type`, `activity_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reminders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `type` VARCHAR(32) NOT NULL,
    `reminder_date` VARCHAR(16) NOT NULL,
    `reminder_time` VARCHAR(16) NOT NULL,
    `repeat_type` VARCHAR(16) NOT NULL DEFAULT 'none',
    `notes` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `completed` TINYINT NOT NULL DEFAULT 0,
    `completed_at` VARCHAR(64) NULL,
    `snooze_until` VARCHAR(64) NULL,
    `snooze_count` INT NOT NULL DEFAULT 0,
    `is_deleted` TINYINT NOT NULL DEFAULT 0,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_date` (`user_id`, `reminder_date`),
    KEY `idx_user_status` (`user_id`, `completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_profiles` (
    `user_id` BIGINT NOT NULL,
    `name` VARCHAR(128) NOT NULL DEFAULT '',
    `gender` VARCHAR(32) NOT NULL DEFAULT '',
    `age` VARCHAR(16) NOT NULL DEFAULT '',
    `height` VARCHAR(16) NOT NULL DEFAULT '',
    `weight` VARCHAR(16) NOT NULL DEFAULT '',
    `blood_type` VARCHAR(16) NOT NULL DEFAULT '',
    `blood_pressure` VARCHAR(64) NOT NULL DEFAULT '',
    `blood_sugar` VARCHAR(64) NOT NULL DEFAULT '',
    `chronic_conditions` TEXT NOT NULL,
    `allergies` TEXT NOT NULL,
    `medications` TEXT NOT NULL,
    `health_goals` TEXT NOT NULL,
    `notes` TEXT NOT NULL,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daily_notes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `note_date` VARCHAR(16) NOT NULL,
    `content` TEXT NOT NULL,
    `is_deleted` TINYINT NOT NULL DEFAULT 0,
    `created_at` VARCHAR(64) NOT NULL,
    `updated_at` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_date` (`user_id`, `note_date`),
    KEY `idx_user_note_date` (`user_id`, `note_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
