-- Bastiyan HIS Migration v5.0.3 (Build 503)
-- Execution Date: 2026-08-27
CREATE TABLE IF NOT EXISTS system_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id VARCHAR(100) NOT NULL UNIQUE,
    version VARCHAR(20) NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) NOT NULL
);

INSERT OR IGNORE INTO system_migrations (migration_id, version, checksum)
VALUES ('20260827_v503_core_init', '5.0.3', 'INIT_CORE_MIGRATION');
