<?php
/** Bastiyan HIS Professional persistence layer — embedded SQLite via PDO. */

function bastianSqlitePath(): string {
    $configured = defined('BASTIAN_SQLITE_PATH') ? trim((string)BASTIAN_SQLITE_PATH) : '';
    if ($configured !== '') return $configured;
    return __DIR__ . '/data/bastiyan.sqlite';
}

function bastianDbEnabled(): bool {
    return extension_loaded('pdo') && extension_loaded('pdo_sqlite');
}

/** Convert the small MySQL dialect used by legacy Bastiyan queries to SQLite. */
function bastianSqliteTransform(string $sql): string {
    $trim = trim($sql);

    if (preg_match('/^SHOW\\s+COLUMNS\\s+FROM\\s+`?([A-Za-z0-9_]+)`?/i', $trim, $m)) {
        return "SELECT name AS Field, type AS Type, CASE WHEN \"notnull\"=0 THEN 'YES' ELSE 'NO' END AS \"Null\", dflt_value AS \"Default\", CASE WHEN pk>0 THEN 'PRI' ELSE '' END AS \"Key\", '' AS Extra FROM pragma_table_info('" . $m[1] . "')";
    }
    if (preg_match('/^SHOW\\s+TABLES\\s+LIKE\\s+/i', $trim)) {
        return "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'bastian_%' ORDER BY name";
    }
    if (preg_match('/^SHOW\\s+TABLES\\s*$/i', $trim)) {
        return "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
    }
    if (preg_match('/^SHOW\\s+CREATE\\s+TABLE\\s+`?([A-Za-z0-9_]+)`?/i', $trim, $m)) {
        $name = str_replace("'", "''", $m[1]);
        return "SELECT name AS `Table`, sql AS `Create Table` FROM sqlite_master WHERE type='table' AND name='" . $name . "'";
    }
    if (stripos($trim, 'information_schema.tables') !== false) {
        return "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?";
    }
    if (preg_match('/^SET\\s+FOREIGN_KEY_CHECKS\\s*=\\s*0/i', $trim)) return 'PRAGMA foreign_keys=OFF';
    if (preg_match('/^SET\\s+FOREIGN_KEY_CHECKS\\s*=\\s*1/i', $trim)) return 'PRAGMA foreign_keys=ON';
    if (preg_match('/^ALTER\\s+TABLE\\s+.+\\s+MODIFY\\s+/is', $trim)) return 'SELECT 0';

    // SQLite does not support MySQL AFTER in ALTER TABLE ADD COLUMN.
    $sql = preg_replace('/\\s+AFTER\\s+`?[A-Za-z0-9_]+`?/i', '', $sql);
    $sql = preg_replace('/\\bINSERT\\s+IGNORE\\s+INTO\\b/i', 'INSERT OR IGNORE INTO', $sql);
    $sql = preg_replace('/\\bON\\s+DUPLICATE\\s+KEY\\s+UPDATE\\b/i', 'ON CONFLICT DO UPDATE SET', $sql);
    $sql = preg_replace('/\\bVALUES\\s*\\(\\s*`?([A-Za-z0-9_]+)`?\\s*\\)/i', 'excluded.$1', $sql);
    $sql = preg_replace('/\\bIF\\s*\\(/i', 'IIF(', $sql);
    $sql = preg_replace('/\\bCHAR_LENGTH\\s*\\(/i', 'LENGTH(', $sql);
    $sql = preg_replace('/\\s+FOR\\s+UPDATE\\b/i', '', $sql);
    return $sql;
}

function bastianSqliteCreateParts(string $sql): array {
    $trim = trim($sql);
    if (!preg_match('/^CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+`?([A-Za-z0-9_]+)`?/i', $trim, $tm)) {
        return [bastianSqliteTransform($sql), []];
    }
    $table = $tm[1];
    $indexes = [];
    $lines = preg_split('/\\R/', $sql) ?: [$sql];
    $kept = [];
    foreach ($lines as $line) {
        if (preg_match('/^\\s*UNIQUE\\s+KEY\\s+`?([A-Za-z0-9_]+)`?\\s*\\(([^)]+)\\)\\s*,?\\s*$/i', $line, $m)) {
            $indexes[] = 'CREATE UNIQUE INDEX IF NOT EXISTS `' . $m[1] . '` ON `' . $table . '` (' . $m[2] . ')';
            continue;
        }
        if (preg_match('/^\\s*KEY\\s+`?([A-Za-z0-9_]+)`?\\s*\\(([^)]+)\\)\\s*,?\\s*$/i', $line, $m)) {
            $indexes[] = 'CREATE INDEX IF NOT EXISTS `' . $m[1] . '` ON `' . $table . '` (' . $m[2] . ')';
            continue;
        }
        $kept[] = $line;
    }
    $sql = implode("\n", $kept);
    $sql = preg_replace('/\\)\\s*ENGINE=InnoDB\\s+DEFAULT\\s+CHARSET=utf8mb4\\s+COLLATE=utf8mb4_unicode_ci\\s*;?\\s*$/i', ')', $sql);
    $sql = preg_replace('/\\b(BIGINT|INT)\\s+UNSIGNED\\s+NOT\\s+NULL\\s+AUTO_INCREMENT\\s+PRIMARY\\s+KEY\\b/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
    $sql = preg_replace('/\\b(BIGINT|INT)\\s+NOT\\s+NULL\\s+AUTO_INCREMENT\\s+PRIMARY\\s+KEY\\b/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
    $sql = preg_replace('/\\b(BIGINT|INT)\\s+(?:UNSIGNED\\s+)?AUTO_INCREMENT\\s+PRIMARY\\s+KEY\\b/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $sql);
    $sql = preg_replace('/\\bAUTO_INCREMENT\\b/i', 'AUTOINCREMENT', $sql);
    $sql = preg_replace('/\\bUNSIGNED\\b/i', '', $sql);
    $sql = preg_replace('/\\bTINYINT\\s*\\(\\s*1\\s*\\)/i', 'INTEGER', $sql);
    $sql = preg_replace('/\\bBIGINT\\b/i', 'INTEGER', $sql);
    $sql = preg_replace('/\\bINT\\b/i', 'INTEGER', $sql);
    $sql = preg_replace('/\\bLONGTEXT\\b/i', 'TEXT', $sql);
    $sql = preg_replace('/\\bDATETIME\\b/i', 'TEXT', $sql);
    $sql = preg_replace('/\\bDECIMAL\\s*\\(\\s*\\d+\\s*,\\s*\\d+\\s*\\)/i', 'REAL', $sql);
    $sql = preg_replace('/,\\s*\\)/s', "\n)", $sql);
    $sql = bastianSqliteTransform($sql);
    return [$sql, $indexes];
}

class BastiyanSqlitePDO extends PDO {
    public function prepare(string $query, array $options = []): PDOStatement|false {
        return parent::prepare(bastianSqliteTransform($query), $options);
    }
    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false {
        $query = bastianSqliteTransform($query);
        if ($fetchMode === null) return parent::query($query);
        return parent::query($query, $fetchMode, ...$fetchModeArgs);
    }
    public function exec(string $statement): int|false {
        [$sql, $indexes] = bastianSqliteCreateParts($statement);
        $result = parent::exec($sql);
        foreach ($indexes as $idx) parent::exec($idx);
        return $result;
    }
    public function beginTransaction(): bool {
        if ($this->inTransaction()) return false;
        return parent::exec('BEGIN IMMEDIATE') !== false;
    }
}

function bastianPdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    if (!bastianDbEnabled()) throw new RuntimeException('PDO_SQLITE_REQUIRED');
    $path = bastianSqlitePath();
    $dir = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('SQLITE_DATA_DIR_CREATE_FAILED');
    if (!is_writable($dir)) throw new RuntimeException('SQLITE_DATA_DIR_NOT_WRITABLE:' . $dir);
    $pdo = new BastiyanSqlitePDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec('PRAGMA foreign_keys=ON');
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA synchronous=NORMAL');
    $pdo->exec('PRAGMA busy_timeout=8000');
    $pdo->exec('PRAGMA temp_store=MEMORY');
    return $pdo;
}

function bastianCreateSchema(PDO $pdo): void {
    $appVersion = function_exists('bastianAppVersion') ? bastianAppVersion() : '4.2.0';
    if (!preg_match('/^\d+\.\d+\.\d+$/', $appVersion)) $appVersion = '4.2.0';
    $sql = [
        "CREATE TABLE IF NOT EXISTS bastian_centers (
            id VARCHAR(80) PRIMARY KEY,
            code VARCHAR(80) NOT NULL,
            name VARCHAR(190) NOT NULL,
            city VARCHAR(190) NULL,
            phone VARCHAR(80) NULL,
            address TEXT NULL,
            center_type VARCHAR(60) NOT NULL DEFAULT 'clinic',
            plan_name VARCHAR(60) NOT NULL DEFAULT 'standard',
            start_date VARCHAR(20) NULL,
            end_date VARCHAR(20) NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            archived TINYINT(1) NOT NULL DEFAULT 0,
            notes TEXT NULL,
            version VARCHAR(30) NOT NULL DEFAULT '{$appVersion}',
            last_sync DATETIME NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            archived_at DATETIME NULL,
            UNIQUE KEY uq_bastian_center_code (code),
            KEY idx_bastian_centers_status (active, archived),
            KEY idx_bastian_centers_expiry (end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_users (
            id VARCHAR(100) PRIMARY KEY,
            center_id VARCHAR(80) NOT NULL,
            name VARCHAR(190) NOT NULL,
            username VARCHAR(190) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(80) NOT NULL DEFAULT 'staff',
            roles_json LONGTEXT NULL,
            permissions_json LONGTEXT NULL,
            department VARCHAR(190) NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            is_primary_admin TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            last_login_at DATETIME NULL,
            UNIQUE KEY uq_bastian_username (username),
            KEY idx_bastian_users_center (center_id, active),
            CONSTRAINT fk_bastian_users_center FOREIGN KEY (center_id) REFERENCES bastian_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            token_hash CHAR(64) NOT NULL,
            role VARCHAR(40) NOT NULL,
            center_id VARCHAR(80) NULL,
            user_id VARCHAR(100) NULL,
            created_at DATETIME NOT NULL,
            expires_at DATETIME NOT NULL,
            last_seen_at DATETIME NULL,
            ip_hash CHAR(64) NULL,
            user_agent_hash CHAR(64) NULL,
            UNIQUE KEY uq_bastian_session_token (token_hash),
            KEY idx_bastian_sessions_expiry (expires_at),
            KEY idx_bastian_sessions_center (center_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_center_state (
            center_id VARCHAR(80) PRIMARY KEY,
            state_json LONGTEXT NOT NULL,
            revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
            checksum CHAR(64) NOT NULL,
            updated_at DATETIME NOT NULL,
            updated_by VARCHAR(100) NULL,
            CONSTRAINT fk_bastian_state_center FOREIGN KEY (center_id) REFERENCES bastian_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_center_backups (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            center_id VARCHAR(80) NOT NULL,
            revision BIGINT UNSIGNED NOT NULL,
            state_json LONGTEXT NOT NULL,
            checksum CHAR(64) NOT NULL,
            reason VARCHAR(80) NOT NULL DEFAULT 'automatic',
            created_at DATETIME NOT NULL,
            KEY idx_bastian_backups_center_time (center_id, created_at),
            CONSTRAINT fk_bastian_backups_center FOREIGN KEY (center_id) REFERENCES bastian_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_device_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            center_id VARCHAR(80) NOT NULL,
            user_id VARCHAR(100) NULL,
            token_hash CHAR(64) NOT NULL,
            device_name VARCHAR(190) NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            last_seen_at DATETIME NULL,
            revoked_at DATETIME NULL,
            UNIQUE KEY uq_bastian_device_token (token_hash),
            KEY idx_bastian_device_center (center_id, active),
            CONSTRAINT fk_bastian_device_center FOREIGN KEY (center_id) REFERENCES bastian_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            center_id VARCHAR(80) NULL,
            actor_type VARCHAR(40) NOT NULL,
            actor_id VARCHAR(100) NULL,
            action VARCHAR(120) NOT NULL,
            entity_type VARCHAR(80) NULL,
            entity_id VARCHAR(120) NULL,
            details_json TEXT NULL,
            ip_hash CHAR(64) NULL,
            created_at DATETIME NOT NULL,
            KEY idx_bastian_audit_center_time (center_id, created_at),
            KEY idx_bastian_audit_action (action, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_login_limits (
            login_key CHAR(64) PRIMARY KEY,
            failures INT UNSIGNED NOT NULL DEFAULT 0,
            first_failure_at DATETIME NULL,
            blocked_until DATETIME NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_tickets (
            id VARCHAR(100) PRIMARY KEY,
            center_id VARCHAR(80) NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            priority VARCHAR(30) NOT NULL DEFAULT 'normal',
            status VARCHAR(30) NOT NULL DEFAULT 'open',
            created_by VARCHAR(100) NULL,
            replies_json LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_bastian_tickets_center (center_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_center_integrations (
            center_id VARCHAR(80) NOT NULL,
            provider VARCHAR(60) NOT NULL,
            config_json LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL,
            updated_by VARCHAR(100) NULL,
            PRIMARY KEY (center_id, provider),
            CONSTRAINT fk_bastian_integrations_center FOREIGN KEY (center_id) REFERENCES bastian_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_appointment_reminders (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            center_id VARCHAR(80) NOT NULL,
            appointment_id VARCHAR(120) NOT NULL,
            patient_id VARCHAR(120) NULL,
            patient_name VARCHAR(190) NULL,
            mobile VARCHAR(40) NULL,
            appointment_at DATETIME NULL,
            scheduled_for DATETIME NULL,
            reminder_type VARCHAR(40) NOT NULL DEFAULT '24h',
            status VARCHAR(40) NOT NULL DEFAULT 'pending',
            attempts INT UNSIGNED NOT NULL DEFAULT 0,
            provider VARCHAR(40) NULL,
            provider_message_id VARCHAR(190) NULL,
            last_error TEXT NULL,
            last_attempt_at DATETIME NULL,
            sent_at DATETIME NULL,
            history_json LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uq_bastiyan_appointment_reminder (center_id, appointment_id, reminder_type),
            KEY idx_bastiyan_reminder_due (center_id, status, appointment_at),
            KEY idx_bastiyan_reminder_sent (center_id, sent_at),
            CONSTRAINT fk_bastiyan_reminder_center FOREIGN KEY (center_id) REFERENCES bastian_centers(id) ON UPDATE CASCADE ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_center_catalog (
            center_id VARCHAR(80) NOT NULL,
            catalog_key VARCHAR(60) NOT NULL,
            payload_json LONGTEXT NOT NULL,
            revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL,
            updated_by VARCHAR(100) NULL,
            PRIMARY KEY (center_id, catalog_key),
            KEY idx_bastian_catalog_updated (center_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_center_online_store (
            center_id VARCHAR(80) NOT NULL,
            data_key VARCHAR(60) NOT NULL,
            payload_json LONGTEXT NOT NULL,
            revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL,
            updated_by VARCHAR(100) NULL,
            PRIMARY KEY (center_id, data_key),
            KEY idx_bastian_online_updated (center_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_workflow_events (
            center_id VARCHAR(80) NOT NULL,
            event_id VARCHAR(140) NOT NULL,
            encounter_id VARCHAR(140) NOT NULL,
            patient_id VARCHAR(140) NULL,
            from_status VARCHAR(80) NULL,
            to_status VARCHAR(80) NULL,
            actor_id VARCHAR(120) NULL,
            actor_name VARCHAR(190) NULL,
            actor_role VARCHAR(80) NULL,
            reason TEXT NULL,
            action_text TEXT NULL,
            details_json LONGTEXT NULL,
            occurred_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,event_id),
            KEY idx_bastian_workflow_encounter(center_id,encounter_id,occurred_at),
            KEY idx_bastian_workflow_patient(center_id,patient_id,occurred_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_future_reservations (
            center_id VARCHAR(80) NOT NULL,
            appointment_id VARCHAR(140) NOT NULL,
            encounter_id VARCHAR(140) NULL,
            patient_id VARCHAR(140) NULL,
            service_id VARCHAR(140) NULL,
            doctor_id VARCHAR(140) NULL,
            location_name VARCHAR(190) NULL,
            appointment_date VARCHAR(40) NULL,
            appointment_time VARCHAR(20) NULL,
            status VARCHAR(60) NOT NULL DEFAULT 'reserved',
            payload_json LONGTEXT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,appointment_id),
            KEY idx_bastian_reservation_date(center_id,appointment_date,status),
            KEY idx_bastian_reservation_patient(center_id,patient_id,status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_invoice_adjustments (
            center_id VARCHAR(80) NOT NULL,
            adjustment_id VARCHAR(140) NOT NULL,
            encounter_id VARCHAR(140) NOT NULL,
            patient_id VARCHAR(140) NULL,
            adjustment_type VARCHAR(60) NOT NULL,
            amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            reason TEXT NULL,
            actor_id VARCHAR(120) NULL,
            actor_name VARCHAR(190) NULL,
            payload_json LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,adjustment_id),
            KEY idx_bastian_adjustment_encounter(center_id,encounter_id,adjustment_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_payment_receipts (
            center_id VARCHAR(80) NOT NULL,
            receipt_id VARCHAR(140) NOT NULL,
            encounter_id VARCHAR(140) NULL,
            patient_id VARCHAR(140) NULL,
            method VARCHAR(60) NOT NULL,
            amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            tracking_no VARCHAR(190) NULL,
            occurred_at DATETIME NOT NULL,
            recorded_at DATETIME NOT NULL,
            actor_id VARCHAR(120) NULL,
            payload_json LONGTEXT NULL,
            PRIMARY KEY(center_id,receipt_id),
            KEY idx_bastian_payment_patient(center_id,patient_id,occurred_at),
            KEY idx_bastian_payment_method(center_id,method,occurred_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_discount_records (
            center_id VARCHAR(80) NOT NULL,
            discount_id VARCHAR(140) NOT NULL,
            encounter_id VARCHAR(140) NULL,
            patient_id VARCHAR(140) NULL,
            amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            reason TEXT NOT NULL,
            authorizer_id VARCHAR(120) NULL,
            authorizer_name VARCHAR(190) NULL,
            actor_id VARCHAR(120) NULL,
            created_at DATETIME NOT NULL,
            payload_json LONGTEXT NULL,
            PRIMARY KEY(center_id,discount_id),
            KEY idx_bastian_discount_encounter(center_id,encounter_id,created_at),
            KEY idx_bastian_discount_authorizer(center_id,authorizer_id,created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_custom_service_library (
            center_id VARCHAR(80) NOT NULL,
            service_key VARCHAR(190) NOT NULL,
            title VARCHAR(255) NOT NULL,
            doctor_id VARCHAR(140) NULL,
            last_estimated_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            last_final_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            times_used INT UNSIGNED NOT NULL DEFAULT 0,
            payload_json LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,service_key),
            KEY idx_bastian_custom_service_doctor(center_id,doctor_id,updated_at),
            KEY idx_bastian_custom_service_title(center_id,title)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_consent_documents (
            center_id VARCHAR(80) NOT NULL,
            document_id VARCHAR(140) NOT NULL,
            patient_id VARCHAR(140) NULL,
            encounter_id VARCHAR(140) NULL,
            form_id VARCHAR(140) NULL,
            title VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            mime_type VARCHAR(100) NULL,
            sha256 CHAR(64) NULL,
            doctor_id VARCHAR(140) NULL,
            care_staff_id VARCHAR(140) NULL,
            actor_id VARCHAR(120) NULL,
            created_at DATETIME NOT NULL,
            payload_json LONGTEXT NULL,
            PRIMARY KEY(center_id,document_id),
            KEY idx_bastian_consent_patient(center_id,patient_id,created_at),
            KEY idx_bastian_consent_encounter(center_id,encounter_id,created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_custom_service_events (
            center_id VARCHAR(80) NOT NULL,
            event_id VARCHAR(140) NOT NULL,
            encounter_id VARCHAR(140) NULL,
            patient_id VARCHAR(140) NULL,
            service_key VARCHAR(190) NULL,
            estimated_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            final_amount DECIMAL(18,2) NULL,
            doctor_commission DECIMAL(18,2) NOT NULL DEFAULT 0,
            care_staff_commission DECIMAL(18,2) NOT NULL DEFAULT 0,
            center_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
            status VARCHAR(60) NOT NULL DEFAULT 'estimated',
            payload_json LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,event_id),
            KEY idx_bastian_custom_event_encounter(center_id,encounter_id),
            KEY idx_bastian_custom_event_patient(center_id,patient_id,created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_sms_events (
            center_id VARCHAR(80) NOT NULL,
            event_id VARCHAR(140) NOT NULL,
            patient_id VARCHAR(140) NULL,
            encounter_id VARCHAR(140) NULL,
            event_type VARCHAR(80) NOT NULL,
            mobile VARCHAR(40) NULL,
            message TEXT NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'sent',
            amount DECIMAL(18,2) NOT NULL DEFAULT 0,
            actor_id VARCHAR(120) NULL,
            actor_name VARCHAR(190) NULL,
            payload_json LONGTEXT NULL,
            occurred_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,event_id),
            KEY idx_bastian_sms_patient(center_id,patient_id,occurred_at),
            KEY idx_bastian_sms_type(center_id,event_type,status,occurred_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_kavenegar_incoming_sms (
            center_id VARCHAR(80) NOT NULL,
            message_id VARCHAR(190) NOT NULL,
            from_mobile VARCHAR(40) NULL,
            to_line VARCHAR(80) NULL,
            message TEXT NOT NULL,
            received_at DATETIME NOT NULL,
            patient_id VARCHAR(140) NULL,
            patient_name VARCHAR(190) NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'received',
            payload_json LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,message_id),
            KEY idx_bastian_kv_inbox_center_time(center_id,received_at),
            KEY idx_bastian_kv_inbox_mobile(center_id,from_mobile,received_at),
            KEY idx_bastian_kv_inbox_patient(center_id,patient_id,received_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS bastian_idempotency_keys (
            center_id VARCHAR(80) NOT NULL,
            idempotency_key VARCHAR(190) NOT NULL,
            encounter_id VARCHAR(140) NULL,
            actor_id VARCHAR(120) NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY(center_id,idempotency_key),
            KEY idx_bastian_idempotency_encounter(center_id,encounter_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    foreach ($sql as $statement) $pdo->exec($statement);
    // 4.5.5: non-destructive RBAC expansion for multi-role personnel.
    try {
        $cols = [];
        foreach ($pdo->query("SHOW COLUMNS FROM bastian_users")->fetchAll(PDO::FETCH_ASSOC) as $c) $cols[strtolower((string)$c['Field'])] = true;
        if (!isset($cols['roles_json'])) $pdo->exec("ALTER TABLE bastian_users ADD COLUMN roles_json LONGTEXT NULL AFTER role");
        if (!isset($cols['permissions_json'])) $pdo->exec("ALTER TABLE bastian_users ADD COLUMN permissions_json LONGTEXT NULL AFTER roles_json");
        $pdo->exec("UPDATE bastian_users SET roles_json=JSON_ARRAY(role) WHERE (roles_json IS NULL OR roles_json='') AND role IS NOT NULL AND role<>''");
        $pdo->exec("UPDATE bastian_users SET permissions_json=JSON_OBJECT() WHERE permissions_json IS NULL OR permissions_json=''");
    } catch (Throwable $e) { error_log('[Bastiyan 4.5.5] RBAC schema migration warning: '.$e->getMessage()); }
    // The installed application version is authoritative for every center.
    try {
        $version = $appVersion;
        $pdo->exec('ALTER TABLE bastian_centers MODIFY version VARCHAR(30) NOT NULL DEFAULT ' . $pdo->quote($version));
        $st = $pdo->prepare('UPDATE bastian_centers SET version=? WHERE version<>? OR version IS NULL');
        $st->execute([$version, $version]);
    } catch (Throwable $e) { /* non-blocking migration for older MariaDB hosts */ }
}

function bastianNow(): string { return date('Y-m-d H:i:s'); }
function bastianHashIp(): string { return hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '')); }
function bastianHashUa(): string { return hash('sha256', (string)($_SERVER['HTTP_USER_AGENT'] ?? '')); }

function bastianDataKeyBytes(): ?string {
    if(!defined('BASTIAN_DATA_ENCRYPTION_KEY') || BASTIAN_DATA_ENCRYPTION_KEY==='') return null;
    $raw=base64_decode((string)BASTIAN_DATA_ENCRYPTION_KEY,true);
    if($raw===false || strlen($raw)<32) $raw=hash('sha256',(string)BASTIAN_DATA_ENCRYPTION_KEY,true);
    return substr($raw,0,32);
}
function bastianEncryptStateJson(string $plain): string {
    $key=bastianDataKeyBytes(); if($key===null)return $plain;
    if(!function_exists('openssl_encrypt'))throw new RuntimeException('OPENSSL_REQUIRED_FOR_DATA_ENCRYPTION');
    $iv=random_bytes(12);$tag='';$cipher=openssl_encrypt($plain,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag,'bastian-his-state-v1',16);
    if($cipher===false)throw new RuntimeException('STATE_ENCRYPTION_FAILED');
    return 'enc:v1:'.base64_encode($iv).':'.base64_encode($tag).':'.base64_encode($cipher);
}
function bastianDecryptStateJson(string $stored): string {
    if(!str_starts_with($stored,'enc:v1:'))return $stored; // legacy plaintext migration
    $key=bastianDataKeyBytes();if($key===null)throw new RuntimeException('DATA_ENCRYPTION_KEY_MISSING');
    $parts=explode(':',$stored,5);if(count($parts)!==5)throw new RuntimeException('ENCRYPTED_STATE_FORMAT_INVALID');
    $iv=base64_decode($parts[2],true);$tag=base64_decode($parts[3],true);$cipher=base64_decode($parts[4],true);
    if($iv===false||$tag===false||$cipher===false)throw new RuntimeException('ENCRYPTED_STATE_FORMAT_INVALID');
    $plain=openssl_decrypt($cipher,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag,'bastian-his-state-v1');
    if($plain===false)throw new RuntimeException('ENCRYPTED_STATE_AUTH_FAILED');return $plain;
}

function bastianAudit(string $action, ?string $centerId = null, ?string $actorType = null, ?string $actorId = null, ?string $entityType = null, ?string $entityId = null, array $details = []): void {
    try {
        $pdo = bastianPdo();
        $stmt = $pdo->prepare("INSERT INTO bastian_audit_logs(center_id,actor_type,actor_id,action,entity_type,entity_id,details_json,ip_hash,created_at) VALUES(?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$centerId, $actorType ?: 'system', $actorId, $action, $entityType, $entityId, $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null, bastianHashIp(), bastianNow()]);
    } catch (Throwable $e) { /* audit must never break the primary transaction */ }
}

function bastianDbPublicCenter(array $r): array {
    return [
        'id'=>(string)$r['id'], 'code'=>(string)$r['code'], 'name'=>(string)$r['name'],
        'city'=>(string)($r['city']??''), 'phone'=>(string)($r['phone']??''), 'address'=>(string)($r['address']??''),
        'centerType'=>(string)($r['center_type']??'clinic'), 'planName'=>(string)($r['plan_name']??'standard'),
        'startDate'=>(string)($r['start_date']??''), 'endDate'=>(string)($r['end_date']??''),
        'active'=>(bool)$r['active'], 'archived'=>(bool)$r['archived'], 'notes'=>(string)($r['notes']??''),
        'version'=>function_exists('bastianAppVersion') ? bastianAppVersion() : (string)($r['version']??'4.2.0'), 'lastSync'=>$r['last_sync'] ? date('c', strtotime($r['last_sync'])) : null,
        'createdAt'=>$r['created_at'] ? date('c', strtotime($r['created_at'])) : null,
        'updatedAt'=>$r['updated_at'] ? date('c', strtotime($r['updated_at'])) : null,
        'archivedAt'=>!empty($r['archived_at']) ? date('c', strtotime($r['archived_at'])) : null,
    ];
}

function bastianDbCenters(bool $includeArchived = true): array {
    $pdo=bastianPdo();
    $sql="SELECT c.*, u.username AS admin_username,
          (SELECT COUNT(*) FROM bastian_users u2 WHERE u2.center_id=c.id AND u2.active=1) AS users_count,
          (SELECT COUNT(*) FROM bastian_center_backups b WHERE b.center_id=c.id) AS backup_count,
          (SELECT MAX(created_at) FROM bastian_center_backups b2 WHERE b2.center_id=c.id) AS last_backup_at,
          (SELECT CHAR_LENGTH(state_json) FROM bastian_center_state s WHERE s.center_id=c.id) AS state_size,
          (SELECT revision FROM bastian_center_state s2 WHERE s2.center_id=c.id) AS state_revision
          FROM bastian_centers c
          LEFT JOIN bastian_users u ON u.center_id=c.id AND u.is_primary_admin=1
          " . ($includeArchived ? '' : 'WHERE c.archived=0 ') . "ORDER BY c.created_at DESC";
    $rows=$pdo->query($sql)->fetchAll();
    return array_map(function($r){
        $c=bastianDbPublicCenter($r); $c['adminUsername']=$r['admin_username']??''; $c['usersCount']=(int)($r['users_count']??0); $c['backupCount']=(int)($r['backup_count']??0); $c['lastBackupAt']=!empty($r['last_backup_at'])?date('c',strtotime($r['last_backup_at'])):null; $c['stateSizeBytes']=(int)($r['state_size']??0); $c['stateRevision']=(int)($r['state_revision']??0); return $c;
    },$rows);
}

function bastianDbCenter(string $id): ?array {
    $st=bastianPdo()->prepare("SELECT c.*, u.username AS admin_username FROM bastian_centers c LEFT JOIN bastian_users u ON u.center_id=c.id AND u.is_primary_admin=1 WHERE c.id=? LIMIT 1");
    $st->execute([$id]);$r=$st->fetch();if(!$r)return null;$c=bastianDbPublicCenter($r);$c['adminUsername']=$r['admin_username']??'';return $c;
}

function bastianDbCenterRaw(string $id): ?array { $st=bastianPdo()->prepare('SELECT * FROM bastian_centers WHERE id=?');$st->execute([$id]);$r=$st->fetch();return $r?:null; }

function bastianCanonicalUserRole(string $raw): string {
    $r=function_exists('mb_strtolower')?mb_strtolower(trim($raw),'UTF-8'):strtolower(trim($raw));
    $r=str_replace(['ي','ك'],['ی','ک'],$r);
    if($r==='')return 'staff';
    if(str_contains($r,'دستیار')||str_contains($r,'پرستار')||str_contains($r,'assistant')||str_contains($r,'nurse')||str_contains($r,'nursing'))return 'nurse';
    if(str_contains($r,'پزشک')||str_contains($r,'دکتر')||str_contains($r,'doctor')||str_contains($r,'physician'))return 'doctor';
    if(str_contains($r,'مدیر انبار')||str_contains($r,'انباردار')||str_contains($r,'inventory_manager')||str_contains($r,'inventory manager'))return 'inventory_manager';
    if(str_contains($r,'حسابدار')||str_contains($r,'accountant'))return 'accountant';
    if(str_contains($r,'صندوق')||str_contains($r,'cashier'))return 'cashier';
    if(str_contains($r,'خرید')||str_contains($r,'تدارک')||str_contains($r,'purchaser'))return 'purchaser';
    if(str_contains($r,'اتاق عمل')||str_contains($r,'operating_room_supervisor'))return 'operating_room_supervisor';
    if(str_contains($r,'بازرس')||str_contains($r,'inspector'))return 'inspector';
    if(str_contains($r,'مدیر')||$r==='admin'||str_contains($r,'administrator'))return 'admin';
    return preg_match('/^[a-z0-9_\-]+$/',$r)?$r:'staff';
}

function bastianDbUserPublic(array $u): array {
    $rawRole=(string)($u['role']??'staff');$role=bastianCanonicalUserRole($rawRole);
    $rolesRaw=[]; if(!empty($u['roles_json'])){$decoded=json_decode((string)$u['roles_json'],true);if(is_array($decoded))$rolesRaw=$decoded;} if(!$rolesRaw)$rolesRaw=[$rawRole];
    $roles=[];foreach(array_merge([$rawRole],$rolesRaw) as $r){$r=bastianCanonicalUserRole((string)$r);if($r!==''&&!in_array($r,$roles,true))$roles[]=$r;}
    $permissions=[];if(!empty($u['permissions_json'])){$decoded=json_decode((string)$u['permissions_json'],true);if(is_array($decoded))$permissions=$decoded;}
    $out=['id'=>(string)$u['id'],'centerId'=>(string)$u['center_id'],'name'=>(string)$u['name'],'username'=>(string)$u['username'],'role'=>$role,'roles'=>$roles,'assignedRoles'=>$roles,'permissions'=>$permissions,'department'=>(string)($u['department']??''),'active'=>(bool)$u['active'],'status'=>(bool)$u['active']?'active':'inactive','isPrimaryAdmin'=>(bool)($u['is_primary_admin']??false),'lastLoginAt'=>!empty($u['last_login_at'])?date('c',strtotime($u['last_login_at'])):null];
    if($rawRole!==$role)$out['roleTitle']=$rawRole; return $out;
}

function bastianEnsureRbacSchema(): void {
    static $ready=false; if($ready) return;
    $pdo=bastianPdo();
    $cols=[]; foreach($pdo->query("SHOW COLUMNS FROM bastian_users")->fetchAll(PDO::FETCH_ASSOC) as $c) $cols[strtolower((string)$c['Field'])]=true;
    if(!isset($cols['roles_json'])) $pdo->exec("ALTER TABLE bastian_users ADD COLUMN roles_json LONGTEXT NULL AFTER role");
    if(!isset($cols['permissions_json'])) $pdo->exec("ALTER TABLE bastian_users ADD COLUMN permissions_json LONGTEXT NULL AFTER roles_json");
    $pdo->exec("UPDATE bastian_users SET roles_json=JSON_ARRAY(role) WHERE (roles_json IS NULL OR roles_json='') AND role IS NOT NULL AND role<>''");
    $pdo->exec("UPDATE bastian_users SET permissions_json=JSON_OBJECT() WHERE permissions_json IS NULL OR permissions_json=''");
    $ready=true;
}

function bastianDbUsers(string $centerId): array {
    bastianEnsureRbacSchema(); $st=bastianPdo()->prepare('SELECT * FROM bastian_users WHERE center_id=? ORDER BY is_primary_admin DESC,name ASC');$st->execute([$centerId]);return array_map('bastianDbUserPublic',$st->fetchAll()); }

function bastianDbFindUserByUsername(string $username): ?array { bastianEnsureRbacSchema(); $st=bastianPdo()->prepare('SELECT * FROM bastian_users WHERE username=? LIMIT 1');$st->execute([$username]);$r=$st->fetch();return $r?:null; }
function bastianDbUserRawById(string $userId): ?array { $st=bastianPdo()->prepare('SELECT * FROM bastian_users WHERE id=? LIMIT 1');$st->execute([$userId]);$r=$st->fetch();return $r?:null; }

function bastianDbCreateOrUpdateCenter(array $incoming, string $plainPassword = ''): array {
    $pdo=bastianPdo();$pdo->beginTransaction();
    try {
        $id=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($incoming['id']??''));
        $isEdit=$id!=='' && bastianDbCenterRaw($id)!==null;
        $now=bastianNow();
        if(!$isEdit){$id='cnt-'.date('YmdHis').'-'.strtolower(substr(bin2hex(random_bytes(4)),0,6));}
        $name=trim((string)($incoming['name']??''));$adminUsername=trim((string)($incoming['adminUsername']??''));
        if($name===''||$adminUsername==='')throw new InvalidArgumentException('نام مرکز و نام کاربری مدیر مرکز الزامی است.');
        if(!$isEdit && strlen($plainPassword)<8)throw new InvalidArgumentException('رمز مرکز جدید باید حداقل ۸ کاراکتر باشد.');
        $code=trim((string)($incoming['code']??''));if($code==='')$code='CNT-'.strtoupper(substr(bin2hex(random_bytes(4)),0,8));
        if($isEdit){
            $st=$pdo->prepare('UPDATE bastian_centers SET code=?,name=?,city=?,phone=?,address=?,center_type=?,plan_name=?,start_date=?,end_date=?,active=?,notes=?,updated_at=? WHERE id=?');
            $st->execute([$code,$name,$incoming['city']??'', $incoming['phone']??'', $incoming['address']??'', $incoming['centerType']??'clinic',$incoming['planName']??'standard',$incoming['startDate']??'', $incoming['endDate']??'', !empty($incoming['active'])?1:0,$incoming['notes']??'',$now,$id]);
            $u=$pdo->prepare('SELECT * FROM bastian_users WHERE center_id=? AND is_primary_admin=1 LIMIT 1');$u->execute([$id]);$admin=$u->fetch();
            if($admin){
                if($plainPassword!==''){$q=$pdo->prepare('UPDATE bastian_users SET name=?,username=?,password_hash=?,active=1,updated_at=? WHERE id=?');$q->execute(['مدیر مرکز '.$name,$adminUsername,password_hash($plainPassword,PASSWORD_DEFAULT),$now,$admin['id']]);}
                else{$q=$pdo->prepare('UPDATE bastian_users SET name=?,username=?,active=1,updated_at=? WHERE id=?');$q->execute(['مدیر مرکز '.$name,$adminUsername,$now,$admin['id']]);}
            }
        }else{
            $st=$pdo->prepare('INSERT INTO bastian_centers(id,code,name,city,phone,address,center_type,plan_name,start_date,end_date,active,archived,notes,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $st->execute([$id,$code,$name,$incoming['city']??'', $incoming['phone']??'', $incoming['address']??'', $incoming['centerType']??'clinic',$incoming['planName']??'standard',$incoming['startDate']??'', $incoming['endDate']??'',!empty($incoming['active'])?1:0,0,$incoming['notes']??'',function_exists('bastianAppVersion')?bastianAppVersion():'4.2.0',$now,$now]);
            $uid='center-admin-'.$id;
            $u=$pdo->prepare('INSERT INTO bastian_users(id,center_id,name,username,password_hash,role,department,active,is_primary_admin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
            $u->execute([$uid,$id,'مدیر مرکز '.$name,$adminUsername,password_hash($plainPassword,PASSWORD_DEFAULT),'admin','مدیریت مرکز',1,1,$now,$now]);
        }
        $pdo->commit();
        return bastianDbCenter($id) ?: [];
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function bastianDbUpsertUser(string $centerId,array $user): array {
    bastianEnsureRbacSchema(); $pdo=bastianPdo();$id=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($user['id']??''));if($id==='')$id='u-'.bin2hex(random_bytes(8));
    $name=trim((string)($user['name']??''));$username=trim((string)($user['username']??''));$password=(string)($user['password']??'');$role=(string)($user['role']??'staff');
    $rolesIn=is_array($user['roles']??null)?$user['roles']:[];$roles=[];foreach(array_merge([$role],$rolesIn) as $r){$r=bastianCanonicalUserRole((string)$r);if($r!==''&&!in_array($r,$roles,true))$roles[]=$r;}if(!$roles)$roles=['staff'];$role=$roles[0];
    $permissions=is_array($user['permissions']??null)?$user['permissions']:[];$active=!isset($user['active'])||!empty($user['active']);$department=(string)($user['department']??'');
    if($name===''||$username==='')throw new InvalidArgumentException('نام و نام کاربری الزامی است.');
    $ex=$pdo->prepare('SELECT * FROM bastian_users WHERE id=? AND center_id=?');$ex->execute([$id,$centerId]);$row=$ex->fetch();$now=bastianNow();$rolesJson=json_encode(array_values($roles),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$permissionsJson=json_encode($permissions,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if($row){
        if($password!==''){$q=$pdo->prepare('UPDATE bastian_users SET name=?,username=?,password_hash=?,role=?,roles_json=?,permissions_json=?,department=?,active=?,updated_at=? WHERE id=? AND center_id=?');$q->execute([$name,$username,password_hash($password,PASSWORD_DEFAULT),$role,$rolesJson,$permissionsJson,$department,$active?1:0,$now,$id,$centerId]);}
        else{$q=$pdo->prepare('UPDATE bastian_users SET name=?,username=?,role=?,roles_json=?,permissions_json=?,department=?,active=?,updated_at=? WHERE id=? AND center_id=?');$q->execute([$name,$username,$role,$rolesJson,$permissionsJson,$department,$active?1:0,$now,$id,$centerId]);}
    } else {
        if($password==='')throw new InvalidArgumentException('برای کاربر جدید رمز عبور الزامی است.');
        $q=$pdo->prepare('INSERT INTO bastian_users(id,center_id,name,username,password_hash,role,roles_json,permissions_json,department,active,is_primary_admin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,0,?,?)');$q->execute([$id,$centerId,$name,$username,password_hash($password,PASSWORD_DEFAULT),$role,$rolesJson,$permissionsJson,$department,$active?1:0,$now,$now]);
    }
    bastianSyncUsersIntoState($centerId);return bastianDbUsers($centerId);
}

function bastianDbDeleteUser(string $centerId,string $userId): array {
    $pdo=bastianPdo();$st=$pdo->prepare('SELECT is_primary_admin FROM bastian_users WHERE id=? AND center_id=?');$st->execute([$userId,$centerId]);$r=$st->fetch();if(!$r)throw new RuntimeException('USER_NOT_FOUND');if(!empty($r['is_primary_admin']))throw new InvalidArgumentException('مدیر اصلی مرکز قابل حذف نیست.');$q=$pdo->prepare('UPDATE bastian_users SET active=0,updated_at=? WHERE id=? AND center_id=?');$q->execute([bastianNow(),$userId,$centerId]);bastianSyncUsersIntoState($centerId);return bastianDbUsers($centerId);
}


function bastianClinicalCatalogKeys(): array {
    return ['medicalServices','products','categories','serviceCategories','warehouses'];
}

function bastianEnsureClinicalCatalogSchema(): void {
    static $ready=false;
    if($ready)return;
    $pdo=bastianPdo();
    $pdo->exec("CREATE TABLE IF NOT EXISTS bastian_center_catalog (
        center_id VARCHAR(80) NOT NULL,
        catalog_key VARCHAR(60) NOT NULL,
        payload_json LONGTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(100) NULL,
        PRIMARY KEY (center_id, catalog_key),
        KEY idx_bastian_catalog_updated (center_id, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready=true;
}

function bastianDbCatalogGet(string $centerId,string $key): ?array {
    if(!in_array($key,bastianClinicalCatalogKeys(),true))return null;
    bastianEnsureClinicalCatalogSchema();
    $st=bastianPdo()->prepare('SELECT payload_json,revision,updated_at FROM bastian_center_catalog WHERE center_id=? AND catalog_key=? LIMIT 1');
    $st->execute([$centerId,$key]);$r=$st->fetch();if(!$r)return null;
    $payload=json_decode((string)$r['payload_json'],true);
    if(!is_array($payload))$payload=[];
    return ['items'=>$payload,'revision'=>(int)$r['revision'],'updatedAt'=>date('c',strtotime((string)$r['updated_at']))];
}

function bastianDbCatalogPut(string $centerId,string $key,array $items,string $actorId='system'): array {
    if(!in_array($key,bastianClinicalCatalogKeys(),true))throw new InvalidArgumentException('CATALOG_KEY_INVALID');
    bastianEnsureClinicalCatalogSchema();
    $json=json_encode(array_values($items),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if($json===false)throw new RuntimeException('CATALOG_JSON_INVALID');
    $pdo=bastianPdo();$now=bastianNow();
    $st=$pdo->prepare("INSERT INTO bastian_center_catalog(center_id,catalog_key,payload_json,revision,updated_at,updated_by)
        VALUES(?,?,?,1,?,?)
        ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json),revision=revision+1,updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)");
    $st->execute([$centerId,$key,$json,$now,$actorId]);
    return bastianDbCatalogGet($centerId,$key)??['items'=>array_values($items),'revision'=>1,'updatedAt'=>date('c',strtotime($now))];
}

function bastianLegacyCenterStateSnapshot(string $centerId): ?array {
    if(!defined('CENTERS_DATA_DIR'))return null;
    $id=preg_replace('/[^a-zA-Z0-9_-]/','',$centerId);
    if($id==='')return null;
    $path=rtrim(CENTERS_DATA_DIR,'/\\').DIRECTORY_SEPARATOR.$id.DIRECTORY_SEPARATOR.'state.json';
    if(!is_file($path))return null;
    $raw=@file_get_contents($path);if($raw===false||trim($raw)==='')return null;
    $state=json_decode($raw,true);
    return is_array($state)?$state:null;
}

function bastianDbGetStateResilient(string $centerId): array {
    try{
        $current=bastianDbGetState($centerId);
        if($current)return ['ok'=>true,'source'=>'primary','current'=>$current,'errorCode'=>null];
    }catch(Throwable $e){
        $primaryError=$e->getMessage();
        error_log('[Bastiyan] primary center state read failed for '.$centerId.': '.$primaryError);
        $legacy=bastianLegacyCenterStateSnapshot($centerId);
        if(is_array($legacy)){
            $json=json_encode($legacy,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            return ['ok'=>true,'source'=>'legacy-file','degraded'=>true,'current'=>[
                'state'=>$legacy,'revision'=>0,'checksum'=>hash('sha256',(string)$json),'updatedAt'=>date('c',filemtime(rtrim(CENTERS_DATA_DIR,'/\\').DIRECTORY_SEPARATOR.$centerId.DIRECTORY_SEPARATOR.'state.json')?:time())
            ],'errorCode'=>$primaryError];
        }
        try{
            $st=bastianPdo()->prepare('SELECT state_json,revision,checksum,created_at FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT 8');
            $st->execute([$centerId]);
            foreach($st->fetchAll() as $b){
                try{
                    $plain=bastianDecryptStateJson((string)$b['state_json']);
                    $state=json_decode($plain,true);
                    if(is_array($state)){
                        return ['ok'=>true,'source'=>'database-backup','degraded'=>true,'current'=>[
                            'state'=>$state,'revision'=>(int)$b['revision'],'checksum'=>(string)$b['checksum'],'updatedAt'=>date('c',strtotime((string)$b['created_at']))
                        ],'errorCode'=>$primaryError];
                    }
                }catch(Throwable $ignore){}
            }
        }catch(Throwable $ignore){}
        return ['ok'=>false,'source'=>'none','current'=>null,'errorCode'=>$primaryError];
    }
    $legacy=bastianLegacyCenterStateSnapshot($centerId);
    if(is_array($legacy)){
        $json=json_encode($legacy,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        return ['ok'=>true,'source'=>'legacy-file','degraded'=>true,'current'=>[
            'state'=>$legacy,'revision'=>0,'checksum'=>hash('sha256',(string)$json),'updatedAt'=>date('c')
        ],'errorCode'=>'STATE_ROW_MISSING'];
    }
    return ['ok'=>false,'source'=>'none','current'=>null,'errorCode'=>'STATE_ROW_MISSING'];
}

function bastianDbClinicalBootstrap(string $centerId): array {
    $users=bastianDbUsers($centerId);
    $catalog=[];$catalogMeta=[];$missing=[];$catalogReady=true;$catalogError=null;
    try{bastianEnsureClinicalCatalogSchema();}catch(Throwable $e){
        $catalogReady=false;$catalogError=$e->getMessage();
        error_log('[Bastiyan] clinical catalog schema unavailable for '.$centerId.': '.$catalogError);
    }
    foreach(bastianClinicalCatalogKeys() as $key){
        $row=null;
        if($catalogReady){
            try{$row=bastianDbCatalogGet($centerId,$key);}catch(Throwable $e){$catalogError=$e->getMessage();$row=null;}
        }
        if($row){$catalog[$key]=$row['items'];$catalogMeta[$key]=['source'=>'catalog-table','revision'=>$row['revision'],'updatedAt'=>$row['updatedAt']];}
        else{$catalog[$key]=[];$missing[]=$key;}
    }
    $stateStatus=['ok'=>true,'source'=>'not-needed','errorCode'=>null];
    if($missing){
        $stateStatus=bastianDbGetStateResilient($centerId);
        $recovered=$stateStatus['current']['state']??null;
        if(is_array($recovered)){
            foreach($missing as $key){
                $items=$recovered[$key]??[];
                if(is_array($items)&&count($items)){
                    $catalog[$key]=array_values($items);
                    if($catalogReady){
                        try{
                            $saved=bastianDbCatalogPut($centerId,$key,$catalog[$key],'catalog-recovery');
                            $catalogMeta[$key]=['source'=>'recovered-'.$stateStatus['source'],'revision'=>$saved['revision'],'updatedAt'=>$saved['updatedAt']];
                        }catch(Throwable $e){
                            $catalogMeta[$key]=['source'=>'runtime-recovery','revision'=>0,'updatedAt'=>null];
                        }
                    }else{
                        $catalogMeta[$key]=['source'=>'runtime-recovery','revision'=>0,'updatedAt'=>null];
                    }
                }else{
                    $catalogMeta[$key]=['source'=>'empty','revision'=>0,'updatedAt'=>null];
                }
            }
        }else{
            foreach($missing as $key)$catalogMeta[$key]=['source'=>'empty','revision'=>0,'updatedAt'=>null];
        }
    }
    return [
        'users'=>$users,
        'medicalServices'=>$catalog['medicalServices']??[],
        'products'=>$catalog['products']??[],
        'categories'=>$catalog['categories']??[],
        'serviceCategories'=>$catalog['serviceCategories']??[],
        'warehouses'=>$catalog['warehouses']??[],
        'catalogMeta'=>$catalogMeta,
        'catalogStatus'=>['ready'=>$catalogReady,'errorCode'=>$catalogError],
        'stateStatus'=>[
            'available'=>(bool)($stateStatus['ok']??false),
            'source'=>(string)($stateStatus['source']??'none'),
            'errorCode'=>$stateStatus['errorCode']??null,
            'degraded'=>!empty($stateStatus['degraded']),
        ],
    ];
}


/**
 * Bastiyan HIS 3.3.10 online store.
 *
 * This is the authoritative web persistence layer. It deliberately does NOT
 * depend on a separate database service. Every top-level app collection is
 * stored in the embedded SQLite database of this PHP service. The browser
 * keeps only a disposable mirror/cache.
 */
function bastianOnlineStoreTable(): array {
    static $backend=null;
    if(is_array($backend))return $backend;
    $pdo=bastianPdo();

    // First probe existing tables with SELECT. Some shared hosts allow normal
    // application CRUD but intentionally deny CREATE TABLE after deployment.
    try{
        $pdo->query('SELECT data_key,payload_json,revision,updated_at,updated_by FROM bastian_center_online_store WHERE 1=0');
        return $backend=['table'=>'bastian_center_online_store','keyColumn'=>'data_key','name'=>'online-store'];
    }catch(Throwable $missingPreferred){}

    try{
        $pdo->exec("CREATE TABLE IF NOT EXISTS bastian_center_online_store (
            center_id VARCHAR(80) NOT NULL,
            data_key VARCHAR(60) NOT NULL,
            payload_json LONGTEXT NOT NULL,
            revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL,
            updated_by VARCHAR(100) NULL,
            PRIMARY KEY (center_id, data_key),
            KEY idx_bastian_online_updated (center_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->query('SELECT data_key,payload_json,revision,updated_at,updated_by FROM bastian_center_online_store WHERE 1=0');
        return $backend=['table'=>'bastian_center_online_store','keyColumn'=>'data_key','name'=>'online-store'];
    }catch(Throwable $preferredError){
        error_log('[Bastiyan] preferred online store unavailable: '.$preferredError->getMessage());
    }

    // 3.3.8 already introduced this table. Probe it before attempting DDL.
    try{
        $pdo->query('SELECT catalog_key,payload_json,revision,updated_at,updated_by FROM bastian_center_catalog WHERE 1=0');
        return $backend=['table'=>'bastian_center_catalog','keyColumn'=>'catalog_key','name'=>'catalog-fallback'];
    }catch(Throwable $missingCatalog){}

    try{
        bastianEnsureClinicalCatalogSchema();
        $pdo->query('SELECT catalog_key,payload_json,revision,updated_at,updated_by FROM bastian_center_catalog WHERE 1=0');
        return $backend=['table'=>'bastian_center_catalog','keyColumn'=>'catalog_key','name'=>'catalog-fallback'];
    }catch(Throwable $catalogError){
        throw new RuntimeException('ONLINE_STORE_UNAVAILABLE:'.preg_replace('/[^A-Za-z0-9_:\-.]/','_',substr($catalogError->getMessage(),0,90)));
    }
}

function bastianOnlineSafeKey(string $key): ?string {
    $key=trim($key);
    if($key===''||strlen($key)>60)return null;
    if(!preg_match('/^[A-Za-z][A-Za-z0-9_]{0,59}$/',$key))return null;
    return $key;
}

function bastianOnlineStoreGetRaw(string $centerId): array {
    $b=bastianOnlineStoreTable();$pdo=bastianPdo();$table=$b['table'];$keyCol=$b['keyColumn'];
    $st=$pdo->prepare("SELECT {$keyCol} AS data_key,payload_json,revision,updated_at,updated_by FROM {$table} WHERE center_id=?");
    $st->execute([$centerId]);$out=[];
    foreach($st->fetchAll() as $r){
        $key=(string)$r['data_key'];$decoded=json_decode((string)$r['payload_json'],true);
        if(json_last_error()!==JSON_ERROR_NONE)continue;
        $out[$key]=['payload'=>$decoded,'revision'=>(int)$r['revision'],'updatedAt'=>date('c',strtotime((string)$r['updated_at'])),'updatedBy'=>(string)($r['updated_by']??'')];
    }
    return $out;
}

function bastianOnlineLower(string $value): string { return function_exists('mb_strtolower')?mb_strtolower($value,'UTF-8'):strtolower($value); }
function bastianOnlineNormalizeRoleText($value): string {
    $text=bastianOnlineLower(trim((string)$value));
    return str_replace(['ي','ك'],['ی','ک'],$text);
}

function bastianOnlinePublicDirectoryUser(array $u,string $defaultRole='staff'): ?array {
    $id=trim((string)($u['id']??$u['userId']??$u['doctorId']??''));
    $name=trim((string)($u['name']??$u['fullName']??$u['userName']??$u['doctorName']??''));
    $username=trim((string)($u['username']??''));
    $role=trim((string)($u['role']??$u['userRole']??$u['roleName']??$defaultRole));
    if($name===''&&$username==='')return null;
    if($id==='')$id='directory-'.substr(hash('sha256',bastianOnlineLower($username.'|'.$name.'|'.$role)),0,20);
    $active=!isset($u['active'])||$u['active']!==false;
    if(isset($u['status'])&&in_array(bastianOnlineNormalizeRoleText($u['status']),['inactive','disabled','غیرفعال'],true))$active=false;
    $out=[
        'id'=>$id,'name'=>$name!==''?$name:$username,'username'=>$username,'role'=>$role!==''?$role:$defaultRole,
        'department'=>(string)($u['department']??$u['specialty']??''),'active'=>$active,'status'=>$active?'active':'inactive',
        'directoryOnly'=>!empty($u['directoryOnly']),
    ];
    foreach(['roles','assignedRoles','roleTitle','roleName','medicalCode','specialty','commissionRate','assistantCommissionPercent','doctorCommissionPercent','financialAccount','contractType','baseSalary','bankCardNumber','bankIban'] as $k){
        if(array_key_exists($k,$u))$out[$k]=$u[$k];
    }
    return $out;
}

function bastianOnlineDirectoryFromState(array $state): array {
    $sources=[];
    foreach((array)($state['users']??[]) as $u)if(is_array($u)){$n=bastianOnlinePublicDirectoryUser($u,(string)($u['role']??'staff'));if($n)$sources[]=$n;}
    foreach((array)($state['doctors']??[]) as $u)if(is_array($u)){$u['directoryOnly']=true;$n=bastianOnlinePublicDirectoryUser($u,'doctor');if($n)$sources[]=$n;}
    foreach((array)($state['staffDirectory']??[]) as $u)if(is_array($u)){$u['directoryOnly']=true;$n=bastianOnlinePublicDirectoryUser($u,(string)($u['role']??'staff'));if($n)$sources[]=$n;}
    // HR accounts sometimes preserve a staff name even when an old user record was
    // lost. They are useful as a display directory but never become login accounts.
    foreach((array)($state['staffAccounts']??[]) as $a)if(is_array($a)&&!empty($a['userName'])){
        $role=(string)($a['userRole']??$a['role']??'staff');$n=bastianOnlinePublicDirectoryUser([
            'id'=>$a['userId']??'','name'=>$a['userName'],'role'=>$role,'active'=>true,'directoryOnly'=>true,
            'commissionRate'=>$a['commissionPercent']??null,'financialAccount'=>$a
        ],$role);if($n)$sources[]=$n;
    }
    return bastianOnlineMergeDirectory([], $sources);
}

function bastianOnlineMergeDirectory(array $dbUsers,array $directory): array {
    $out=[];$indexById=[];$indexByUsername=[];$indexByName=[];
    $append=function(array $raw,bool $dbAuthoritative=false)use(&$out,&$indexById,&$indexByUsername,&$indexByName){
        $u=bastianOnlinePublicDirectoryUser($raw,(string)($raw['role']??'staff'));if(!$u)return;
        $id=(string)$u['id'];$username=bastianOnlineLower(trim((string)($u['username']??'')));$name=bastianOnlineLower(trim((string)($u['name']??'')));
        $idx=$indexById[$id]??($username!==''?($indexByUsername[$username]??null):null)??($name!==''?($indexByName[$name]??null):null);
        if($idx===null){$idx=count($out);$out[]=$u;}
        else{
            // Login-table fields win for identity/role while financial/directory
            // metadata can enrich them.
            $out[$idx]=$dbAuthoritative?array_merge($out[$idx],$u):array_merge($u,$out[$idx]);
        }
        $final=$out[$idx];$indexById[(string)$final['id']]=$idx;
        $fu=bastianOnlineLower(trim((string)($final['username']??'')));if($fu!=='')$indexByUsername[$fu]=$idx;
        $fn=bastianOnlineLower(trim((string)($final['name']??'')));if($fn!=='')$indexByName[$fn]=$idx;
    };
    foreach($directory as $u)if(is_array($u))$append($u,false);
    foreach($dbUsers as $u)if(is_array($u))$append($u,true);
    return array_values($out);
}

function bastianOnlineCenterOverlay(array $state,array $center): array {
    $state['currentCenterId']=(string)$center['id'];
    $state['medicalCenters']=[$center];
    $state['settings']=array_merge(is_array($state['settings']??null)?$state['settings']:[],[
        'clinicName'=>(string)($center['name']??''),'phone'=>(string)($center['phone']??''),'address'=>(string)($center['address']??''),
        'city'=>(string)($center['city']??''),'centerCode'=>(string)($center['code']??''),'centerType'=>(string)($center['centerType']??'clinic'),
        'licensePlanName'=>(string)($center['planName']??'standard'),'licenseEndDate'=>(string)($center['endDate']??''),
        'licenseStatus'=>(!empty($center['active'])&&empty($center['archived']))?'active':'suspended',
    ]);
    return $state;
}

function bastianDbOnlineRead(string $centerId,bool $attemptLegacyMigration=true): array {
    $center=bastianDbCenter($centerId);if(!$center)throw new RuntimeException('CENTER_NOT_FOUND');
    $rows=bastianOnlineStoreGetRaw($centerId);$meta=$rows['onlineMeta']['payload']??null;
    $initialized=is_array($meta)&&!empty($meta['initialized']);
    if(!$initialized&&$attemptLegacyMigration){
        try{bastianDbOnlineMigrateLegacy($centerId);}catch(Throwable $e){error_log('[Bastiyan] online migration skipped for '.$centerId.': '.$e->getMessage());}
        $rows=bastianOnlineStoreGetRaw($centerId);$meta=$rows['onlineMeta']['payload']??null;$initialized=is_array($meta)&&!empty($meta['initialized']);
    }
    $state=[];
    foreach($rows as $key=>$row){
        if($key==='onlineMeta'||$key==='staffDirectory')continue;
        if(bastianOnlineSafeKey($key)===null)continue;
        $state[$key]=$row['payload'];
    }
    // 3.3.10 critical catalog bridge: even after the Online Store has already
    // been initialized, never let an empty online collection hide a healthy
    // service/product catalog left by earlier releases. This is intentionally
    // read-through and non-destructive: the online value wins when it contains
    // data; the legacy/catalog value is used only when the online collection is
    // empty or missing.
    $criticalCatalogOverlay=[];
    $needsCriticalCatalog=false;
    foreach(['medicalServices','products','categories','serviceCategories','warehouses'] as $criticalKey){
        $v=$state[$criticalKey]??null;
        if(!is_array($v)||count($v)===0){$needsCriticalCatalog=true;break;}
    }
    if($needsCriticalCatalog){
        try{
            $clinical=bastianDbClinicalBootstrap($centerId);
            foreach(['medicalServices','products','categories','serviceCategories','warehouses'] as $criticalKey){
                $currentValue=$state[$criticalKey]??null;
                $fallbackValue=$clinical[$criticalKey]??null;
                if((!is_array($currentValue)||count($currentValue)===0)&&is_array($fallbackValue)&&count($fallbackValue)>0){
                    $state[$criticalKey]=array_values($fallbackValue);
                    $criticalCatalogOverlay[$criticalKey]=count($fallbackValue);
                }
            }
        }catch(Throwable $criticalCatalogError){
            error_log('[Bastiyan] 3.3.10 critical catalog bridge failed for '.$centerId.': '.$criticalCatalogError->getMessage());
        }
    }

    $directory=is_array($rows['staffDirectory']['payload']??null)?$rows['staffDirectory']['payload']:[];
    // doctors and staffAccounts are also recovery sources for older installs.
    $directory=bastianOnlineMergeDirectory($directory,bastianOnlineDirectoryFromState($state));
    $state['users']=bastianOnlineMergeDirectory(bastianDbUsers($centerId),$directory);
    $state=bastianOnlineCenterOverlay($state,$center);
    $revision=(int)($meta['revision']??0);$checksum=(string)($meta['checksum']??'');$updatedAt=(string)($meta['updatedAt']??($rows['onlineMeta']['updatedAt']??''));
    return [
        'state'=>$state,'center'=>$center,'revision'=>$revision,'checksum'=>$checksum,'updatedAt'=>$updatedAt,
        'initialized'=>$initialized,'needsClientSeed'=>!$initialized,'backend'=>(string)(bastianOnlineStoreTable()['name']??'online-store'),
        'criticalCatalogOverlay'=>$criticalCatalogOverlay,
    ];
}

function bastianDbOnlineHasMeaningfulData(array $state): bool {
    foreach(['patients','visitQueue','appointments','medicalServices','products','salesInvoices','purchaseInvoices','treatmentPlans','expenses','stockMovements','staffAccounts','payrolls','signedConsents'] as $key){
        if(is_array($state[$key]??null)&&count($state[$key]))return true;
    }
    return false;
}

function bastianDbOnlineMigrateLegacy(string $centerId): bool {
    $rows=bastianOnlineStoreGetRaw($centerId);$meta=$rows['onlineMeta']['payload']??null;if(is_array($meta)&&!empty($meta['initialized']))return true;
    $candidate=[];
    try{$legacy=bastianDbGetStateResilient($centerId);if(is_array($legacy['current']['state']??null))$candidate=$legacy['current']['state'];}catch(Throwable $ignore){}
    // Overlay the independent 3.3.10 catalog. It may be healthy even when the
    // encrypted state cannot be decoded.
    try{
        $clinical=bastianDbClinicalBootstrap($centerId);
        foreach(['medicalServices','products','categories','serviceCategories','warehouses'] as $k){if(is_array($clinical[$k]??null)&&count($clinical[$k]))$candidate[$k]=$clinical[$k];}
    }catch(Throwable $ignore){}
    if(!bastianDbOnlineHasMeaningfulData($candidate))return false;
    bastianDbOnlineSave($centerId,$candidate,null,'legacy-migration',true);
    return true;
}

function bastianDbOnlineTouch(string $centerId,string $actorId='online-touch'): void {
    try{
        $rows=bastianOnlineStoreGetRaw($centerId);$meta=$rows['onlineMeta']['payload']??null;
        if(!is_array($meta)||empty($meta['initialized']))return;
        $current=bastianDbOnlineRead($centerId,false);$state=is_array($current['state']??null)?$current['state']:[];
        $backend=bastianOnlineStoreTable();$pdo=bastianPdo();$table=$backend['table'];$keyCol=$backend['keyColumn'];$now=bastianNow();
        $newRevision=max(1,(int)($meta['revision']??0)+1);
        $checksum=hash('sha256',json_encode($state,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
        $next=['initialized'=>true,'revision'=>$newRevision,'checksum'=>$checksum,'updatedAt'=>date('c',strtotime($now)),'schema'=>'online-collections-v1'];
        $json=json_encode($next,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        $up=$pdo->prepare("INSERT INTO {$table}(center_id,{$keyCol},payload_json,revision,updated_at,updated_by) VALUES(?,?,?,1,?,?) ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json),revision=revision+1,updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)");
        $up->execute([$centerId,'onlineMeta',$json,$now,$actorId]);
        $pdo->prepare('UPDATE bastian_centers SET last_sync=?,updated_at=? WHERE id=?')->execute([$now,$now,$centerId]);
    }catch(Throwable $e){error_log('[Bastiyan] online touch failed for '.$centerId.': '.$e->getMessage());}
}

function bastianDbProjectPatientFlow440(PDO $pdo,string $centerId,array $state,string $actorId,string $now): void {
    if(isset($state['visitQueue']) && is_array($state['visitQueue'])){
        $eventUp=$pdo->prepare('INSERT INTO bastian_workflow_events(center_id,event_id,encounter_id,patient_id,from_status,to_status,actor_id,actor_name,actor_role,reason,action_text,details_json,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE details_json=VALUES(details_json),reason=VALUES(reason),action_text=VALUES(action_text)');
        $adjUp=$pdo->prepare('INSERT INTO bastian_invoice_adjustments(center_id,adjustment_id,encounter_id,patient_id,adjustment_type,amount,reason,actor_id,actor_name,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount),reason=VALUES(reason),actor_id=VALUES(actor_id),actor_name=VALUES(actor_name),payload_json=VALUES(payload_json),updated_at=VALUES(updated_at)');
        $keyUp=$pdo->prepare('INSERT IGNORE INTO bastian_idempotency_keys(center_id,idempotency_key,encounter_id,actor_id,created_at) VALUES(?,?,?,?,?)');
        foreach($state['visitQueue'] as $enc){
            if(!is_array($enc))continue;$encounterId=(string)($enc['id']??'');if($encounterId==='')continue;$patientId=(string)($enc['patientId']??'');
            foreach(($enc['workflowHistory']??[]) as $ev){if(!is_array($ev))continue;$eventId=(string)($ev['id']??'');if($eventId==='')$eventId='wf-'.hash('sha256',$encounterId.'|'.json_encode($ev,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));$at=(string)($ev['at']??$ev['createdAt']??$now);$ts=strtotime($at);$occurred=$ts?date('Y-m-d H:i:s',$ts):$now;$eventUp->execute([$centerId,$eventId,$encounterId,$patientId,(string)($ev['fromStatus']??''),(string)($ev['toStatus']??$ev['status']??''),(string)($ev['userId']??$ev['actorId']??''),(string)($ev['userName']??$ev['actorName']??''),(string)($ev['userRole']??$ev['role']??''),(string)($ev['reason']??''),(string)($ev['action']??$ev['message']??''),json_encode($ev,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$occurred]);}
            foreach(($enc['services']??[]) as $line){if(!is_array($line))continue;$type=(string)($line['adjustmentType']??'');if(!in_array($type,['miscellaneous','cashier_discount'],true))continue;$id=(string)($line['id']??'');if($id==='')$id='adj-'.hash('sha256',$encounterId.'|'.json_encode($line));$amount=(float)($line['price']??$line['unitPrice']??0);$created=(string)($line['registeredAt']??$line['createdAt']??$now);$ts=strtotime($created);$createdDb=$ts?date('Y-m-d H:i:s',$ts):$now;$adjUp->execute([$centerId,$id,$encounterId,$patientId,$type,$amount,(string)($line['reason']??''),(string)($line['registeredById']??$actorId),(string)($line['registeredByName']??''),json_encode($line,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$createdDb,$now]);}
            foreach(($enc['idempotencyKeys']??[]) as $key){$key=trim((string)$key);if($key!=='')$keyUp->execute([$centerId,$key,$encounterId,$actorId,$now]);}
        }
    }
    if(isset($state['appointments']) && is_array($state['appointments'])){
        $appUp=$pdo->prepare('INSERT INTO bastian_future_reservations(center_id,appointment_id,encounter_id,patient_id,service_id,doctor_id,location_name,appointment_date,appointment_time,status,payload_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE encounter_id=VALUES(encounter_id),patient_id=VALUES(patient_id),service_id=VALUES(service_id),doctor_id=VALUES(doctor_id),location_name=VALUES(location_name),appointment_date=VALUES(appointment_date),appointment_time=VALUES(appointment_time),status=VALUES(status),payload_json=VALUES(payload_json),updated_at=VALUES(updated_at)');
        foreach($state['appointments'] as $app){if(!is_array($app))continue;$id=(string)($app['id']??'');if($id==='')continue;$appUp->execute([$centerId,$id,(string)($app['encounterId']??$app['sourceQueueId']??''),(string)($app['patientId']??''),(string)($app['serviceId']??''),(string)($app['doctorId']??''),(string)($app['locationName']??$app['hospitalName']??''),(string)($app['date']??$app['appointmentDate']??''),(string)($app['time']??$app['appointmentTime']??''),(string)($app['status']??'reserved'),json_encode($app,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$now]);}
    }
}

function bastianDbOnlineSave(string $centerId,array $state,?int $baseRevision,string $actorId='system',bool $force=false): array {
    $center=bastianDbCenter($centerId);if(!$center)throw new RuntimeException('CENTER_NOT_FOUND');
    $backend=bastianOnlineStoreTable();$pdo=bastianPdo();$table=$backend['table'];$keyCol=$backend['keyColumn'];$now=bastianNow();
    // Preserve a public staff directory separately. Credentials/passwords are
    // never accepted or stored in this generic online data area.
    $hasDirectorySource=array_key_exists('users',$state)||array_key_exists('doctors',$state)||array_key_exists('staffAccounts',$state)||array_key_exists('staffDirectory',$state);
    $directory=$hasDirectorySource?bastianOnlineDirectoryFromState($state):[];
    if($hasDirectorySource){
        try{
            $existingRows=bastianOnlineStoreGetRaw($centerId);
            $existingDirectory=is_array($existingRows['staffDirectory']['payload']??null)?$existingRows['staffDirectory']['payload']:[];
            // New/recovered directory data wins on matching identities, while old
            // directory-only staff are retained until explicitly deactivated.
            $directory=bastianOnlineMergeDirectory($directory,$existingDirectory);
        }catch(Throwable $ignore){}
    }
    unset($state['users'],$state['currentCenterId'],$state['medicalCenters']);
    if(isset($state['settings'])&&is_array($state['settings'])){
        foreach(['smsApiKey','identityInquiryApiKey','licenseKey','password','passwordHash','apiKey','clientSecret','accessToken','refreshToken'] as $secret)unset($state['settings'][$secret]);
    }
    $payloads=[];
    foreach($state as $key=>$value){
        $safe=bastianOnlineSafeKey((string)$key);if($safe===null||$safe==='onlineMeta'||$safe==='staffDirectory')continue;
        $json=json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if($json===false)throw new RuntimeException('ONLINE_JSON_INVALID_'.$safe);$payloads[$safe]=$json;
    }
    if($hasDirectorySource){$dirJson=json_encode(array_values($directory),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if($dirJson===false)$dirJson='[]';$payloads['staffDirectory']=$dirJson;}
    $pdo->beginTransaction();
    try{
        $metaSt=$pdo->prepare("SELECT payload_json FROM {$table} WHERE center_id=? AND {$keyCol}='onlineMeta' FOR UPDATE");$metaSt->execute([$centerId]);$metaRow=$metaSt->fetch();
        $meta=$metaRow?json_decode((string)$metaRow['payload_json'],true):[];if(!is_array($meta))$meta=[];$currentRevision=(int)($meta['revision']??0);
        if(!$force&&$baseRevision!==null&&$baseRevision!==$currentRevision){$pdo->rollBack();$current=bastianDbOnlineRead($centerId,false);return ['conflict'=>true,'current'=>$current];}
        $up=$pdo->prepare("INSERT INTO {$table}(center_id,{$keyCol},payload_json,revision,updated_at,updated_by) VALUES(?,?,?,1,?,?) ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json),revision=revision+1,updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)");
        foreach($payloads as $key=>$json)$up->execute([$centerId,$key,$json,$now,$actorId]);
        bastianDbProjectPatientFlow440($pdo,$centerId,$state,$actorId,$now);
        // Build a stable checksum from the just-saved payloads plus any untouched
        // collections. Missing keys are never deleted by a partial/role save.
        $read=$pdo->prepare("SELECT {$keyCol} AS data_key,payload_json FROM {$table} WHERE center_id=? AND {$keyCol}<>'onlineMeta'");$read->execute([$centerId]);$checksumParts=[];
        foreach($read->fetchAll() as $r)$checksumParts[(string)$r['data_key']]=(string)$r['payload_json'];ksort($checksumParts,SORT_STRING);
        $checksum=hash('sha256',json_encode($checksumParts,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));$newRevision=$currentRevision+1;
        $meta=['initialized'=>true,'revision'=>$newRevision,'checksum'=>$checksum,'updatedAt'=>date('c',strtotime($now)),'schema'=>'online-collections-v1'];
        $metaJson=json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        $up->execute([$centerId,'onlineMeta',$metaJson,$now,$actorId]);
        $c=$pdo->prepare('UPDATE bastian_centers SET last_sync=?,updated_at=? WHERE id=?');$c->execute([$now,$now,$centerId]);
        $pdo->commit();
        $result=bastianDbOnlineRead($centerId,false);$result['saved']=true;return $result;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}


function bastianDbGetState(string $centerId): ?array {
    $st=bastianPdo()->prepare('SELECT state_json,revision,checksum,updated_at FROM bastian_center_state WHERE center_id=?');$st->execute([$centerId]);$r=$st->fetch();if(!$r)return null;$plain=bastianDecryptStateJson((string)$r['state_json']);$state=json_decode($plain,true);if(!is_array($state))$state=[];return ['state'=>$state,'revision'=>(int)$r['revision'],'checksum'=>$r['checksum'],'updatedAt'=>date('c',strtotime($r['updated_at']))];
}

function bastianDbInitializeState(string $centerId,array $state): array {
    $state['currentCenterId']=$centerId;$state['users']=bastianDbUsers($centerId);$json=json_encode($state,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$checksum=hash('sha256',$json);$stored=bastianEncryptStateJson($json);$now=bastianNow();$st=bastianPdo()->prepare('INSERT INTO bastian_center_state(center_id,state_json,revision,checksum,updated_at,updated_by) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE state_json=VALUES(state_json),checksum=VALUES(checksum),updated_at=VALUES(updated_at)');$st->execute([$centerId,$stored,1,$checksum,$now,'system']);return bastianDbGetState($centerId); }

function bastianDbBackupState(string $centerId,string $reason='automatic',bool $force=false): bool {
    $pdo=bastianPdo();$current=bastianDbGetState($centerId);if(!$current)return false;
    if(!$force){$st=$pdo->prepare('SELECT created_at FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT 1');$st->execute([$centerId]);$last=$st->fetchColumn();if($last && time()-strtotime($last)<(defined('BASTIAN_BACKUP_INTERVAL')?BASTIAN_BACKUP_INTERVAL:3600))return true;}
    $json=json_encode($current['state'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$stored=bastianEncryptStateJson($json);$st=$pdo->prepare('INSERT INTO bastian_center_backups(center_id,revision,state_json,checksum,reason,created_at) VALUES(?,?,?,?,?,?)');$st->execute([$centerId,$current['revision'],$stored,$current['checksum'],$reason,bastianNow()]);
    $ret=defined('BASTIAN_BACKUP_RETENTION')?BASTIAN_BACKUP_RETENTION:180;$del=$pdo->prepare("DELETE FROM bastian_center_backups WHERE center_id=? AND id NOT IN (SELECT id FROM (SELECT id FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT {$ret}) keepers)");$del->execute([$centerId,$centerId]);return true;
}


function bastianDbListBackups(string $centerId,int $limit=60): array {
    $limit=max(1,min(200,$limit));$st=bastianPdo()->prepare("SELECT id,revision,checksum,reason,created_at,LENGTH(state_json) AS stored_size FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT {$limit}");$st->execute([$centerId]);
    return array_map(function($r){return ['id'=>(int)$r['id'],'revision'=>(int)$r['revision'],'checksum'=>$r['checksum'],'reason'=>$r['reason'],'createdAt'=>date('c',strtotime($r['created_at'])),'storedSizeBytes'=>(int)$r['stored_size']];},$st->fetchAll());
}

function bastianDbRestoreBackup(string $centerId,int $backupId,string $actorId='superadmin'): array {
    $st=bastianPdo()->prepare('SELECT id,revision,state_json,checksum,reason,created_at FROM bastian_center_backups WHERE id=? AND center_id=? LIMIT 1');$st->execute([$backupId,$centerId]);$b=$st->fetch();if(!$b)throw new RuntimeException('BACKUP_NOT_FOUND');
    $plain=bastianDecryptStateJson((string)$b['state_json']);$state=json_decode($plain,true);if(!is_array($state))throw new RuntimeException('BACKUP_CORRUPT');
    $current=bastianDbGetState($centerId);if(!$current)throw new RuntimeException('STATE_NOT_FOUND');
    bastianDbBackupState($centerId,'before_restore',true);
    $saved=bastianDbSaveState($centerId,$state,(int)$current['revision'],$actorId,true);
    return ['success'=>true,'restoredBackupId'=>(int)$b['id'],'sourceRevision'=>(int)$b['revision'],'sourceCreatedAt'=>date('c',strtotime($b['created_at'])),'revision'=>(int)($saved['revision']??0),'savedAt'=>$saved['savedAt']??date('c')];
}

function bastianDbSaveState(string $centerId,array $state,?int $baseRevision,string $actorId='system',bool $force=false): array {
    $pdo=bastianPdo();$pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT state_json,revision,checksum FROM bastian_center_state WHERE center_id=? FOR UPDATE');$q->execute([$centerId]);$current=$q->fetch();
        if(!$current){$pdo->rollBack();return ['missing'=>true];}
        $currentRevision=(int)$current['revision'];
        if(!$force && $baseRevision!==null && $baseRevision!==$currentRevision){$pdo->rollBack();$fresh=bastianDbGetState($centerId);return ['conflict'=>true,'current'=>$fresh];}
        $lastBackup=$pdo->prepare('SELECT created_at FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT 1');$lastBackup->execute([$centerId]);$last=$lastBackup->fetchColumn();
        if(!$last || time()-strtotime($last)>=(defined('BASTIAN_BACKUP_INTERVAL')?BASTIAN_BACKUP_INTERVAL:3600)){
            $b=$pdo->prepare('INSERT INTO bastian_center_backups(center_id,revision,state_json,checksum,reason,created_at) VALUES(?,?,?,?,?,?)');$b->execute([$centerId,$currentRevision,$current['state_json'],$current['checksum'],'automatic',bastianNow()]);
        }
        $state['currentCenterId']=$centerId;$state['users']=bastianDbUsers($centerId);$json=json_encode($state,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$checksum=hash('sha256',$json);$stored=bastianEncryptStateJson($json);$newRevision=$currentRevision+1;$now=bastianNow();
        $u=$pdo->prepare('UPDATE bastian_center_state SET state_json=?,revision=?,checksum=?,updated_at=?,updated_by=? WHERE center_id=?');$u->execute([$stored,$newRevision,$checksum,$now,$actorId,$centerId]);
        $c=$pdo->prepare('UPDATE bastian_centers SET last_sync=?,updated_at=? WHERE id=?');$c->execute([$now,$now,$centerId]);
        $pdo->commit();return ['success'=>true,'revision'=>$newRevision,'checksum'=>$checksum,'savedAt'=>date('c',strtotime($now))];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function bastianSyncUsersIntoState(string $centerId): void {
    // 3.3.10: login users are already authoritative rows in bastian_users.
    // Only bump the online-data revision so every open workstation refreshes its
    // role-aware doctor/assistant directory on the next poll. No encrypted State write.
    bastianDbOnlineTouch($centerId,'identity-sync');
}

function bastianDbArchiveCenter(string $centerId): bool { $st=bastianPdo()->prepare('UPDATE bastian_centers SET active=0,archived=1,archived_at=?,updated_at=? WHERE id=?');$st->execute([bastianNow(),bastianNow(),$centerId]);return $st->rowCount()>0; }

function bastianDbCreateSession(string $role,?string $centerId=null,?string $userId=null): string {
    $plain=bin2hex(random_bytes(32));$hash=hash('sha256',$plain);$ttl=defined('BASTIAN_ACCESS_TOKEN_TTL')?BASTIAN_ACCESS_TOKEN_TTL:43200;$created=bastianNow();$expires=date('Y-m-d H:i:s',time()+$ttl);$st=bastianPdo()->prepare('INSERT INTO bastian_sessions(token_hash,role,center_id,user_id,created_at,expires_at,last_seen_at,ip_hash,user_agent_hash) VALUES(?,?,?,?,?,?,?,?,?)');$st->execute([$hash,$role,$centerId,$userId,$created,$expires,$created,bastianHashIp(),bastianHashUa()]);return $plain;
}

function bastianDbValidateSession(string $plain,array $roles=[],?string $centerId=null): ?array {
    if($plain==='')return null;$hash=hash('sha256',$plain);$pdo=bastianPdo();$now=bastianNow();$st=$pdo->prepare('SELECT * FROM bastian_sessions WHERE token_hash=? AND expires_at>? LIMIT 1');$st->execute([$hash,$now]);$s=$st->fetch();if(!$s)return null;if($roles&&!in_array($s['role'],$roles,true))return null;if($centerId&&$s['role']!=='superadmin'&&$s['center_id']!==$centerId)return null;
    $userRole=null;$userActive=true;
    if(!empty($s['user_id'])){$u=bastianDbUserRawById((string)$s['user_id']);if($u){$userRole=bastianCanonicalUserRole((string)$u['role']);$userActive=!empty($u['active']);if(!$userActive)return null;}}
    $ttl=defined('BASTIAN_ACCESS_TOKEN_TTL')?BASTIAN_ACCESS_TOKEN_TTL:43200;$expires=date('Y-m-d H:i:s',time()+$ttl);$pdo->prepare('UPDATE bastian_sessions SET last_seen_at=?,expires_at=? WHERE id=?')->execute([$now,$expires,$s['id']]);return ['role'=>$s['role'],'centerId'=>$s['center_id'],'userId'=>$s['user_id'],'userRole'=>$userRole,'expiresAt'=>strtotime($expires)];
}

function bastianDbRevokeSession(string $plain): void { if($plain==='')return;$st=bastianPdo()->prepare('DELETE FROM bastian_sessions WHERE token_hash=?');$st->execute([hash('sha256',$plain)]); }

function bastianLoginKey(string $username,string $scope='login'): string { return hash('sha256',strtolower(trim($username)).'|'.bastianHashIp().'|'.$scope); }
function bastianCheckLoginLimit(string $key): bool { $st=bastianPdo()->prepare('SELECT blocked_until FROM bastian_login_limits WHERE login_key=?');$st->execute([$key]);$v=$st->fetchColumn();return !$v||strtotime($v)<=time(); }
function bastianRecordLoginFailure(string $key): void { $pdo=bastianPdo();$st=$pdo->prepare('SELECT * FROM bastian_login_limits WHERE login_key=?');$st->execute([$key]);$r=$st->fetch();$now=bastianNow();if(!$r){$pdo->prepare('INSERT INTO bastian_login_limits(login_key,failures,first_failure_at,updated_at) VALUES(?,1,?,?)')->execute([$key,$now,$now]);return;}$fail=(int)$r['failures']+1;$first=strtotime($r['first_failure_at']?:$now);if(time()-$first>900){$fail=1;$first=time();}$blocked=$fail>=5?date('Y-m-d H:i:s',time()+900):null;$pdo->prepare('UPDATE bastian_login_limits SET failures=?,first_failure_at=?,blocked_until=?,updated_at=? WHERE login_key=?')->execute([$fail,date('Y-m-d H:i:s',$first),$blocked,$now,$key]); }
function bastianClearLoginLimit(string $key): void { $st=bastianPdo()->prepare('DELETE FROM bastian_login_limits WHERE login_key=?');$st->execute([$key]); }

function bastianDbIssueDeviceToken(string $centerId,string $deviceName='Mother PC',?string $userId=null): string { $plain=bin2hex(random_bytes(32));$st=bastianPdo()->prepare('INSERT INTO bastian_device_tokens(center_id,user_id,token_hash,device_name,active,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)');$st->execute([$centerId,$userId,hash('sha256',$plain),$deviceName,1,bastianNow(),bastianNow()]);return $plain; }
function bastianDbRefreshDeviceToken(string $plain): ?array { if($plain==='')return null;$st=bastianPdo()->prepare('SELECT * FROM bastian_device_tokens WHERE token_hash=? AND active=1 AND revoked_at IS NULL LIMIT 1');$st->execute([hash('sha256',$plain)]);$r=$st->fetch();if(!$r)return null;bastianPdo()->prepare('UPDATE bastian_device_tokens SET last_seen_at=? WHERE id=?')->execute([bastianNow(),$r['id']]);return $r; }

function bastianDbBackupStats(string $centerId): array { $pdo=bastianPdo();$st=$pdo->prepare('SELECT COUNT(*) c,MAX(created_at) last_at FROM bastian_center_backups WHERE center_id=?');$st->execute([$centerId]);$b=$st->fetch();$s=bastianDbGetState($centerId);return ['backupCount'=>(int)($b['c']??0),'lastBackupDate'=>!empty($b['last_at'])?date('c',strtotime($b['last_at'])):null,'stateRevision'=>$s['revision']??0,'stateSizeBytes'=>$s?strlen(json_encode($s['state'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)):0,'updatedAt'=>$s['updatedAt']??null]; }

function bastianDbIntegrationConfig(string $centerId, string $provider): array {
    if ($centerId === '' || !preg_match('/^[a-z0-9_-]{1,60}$/i', $provider)) return [];
    $st = bastianPdo()->prepare('SELECT config_json FROM bastian_center_integrations WHERE center_id=? AND provider=? LIMIT 1');
    $st->execute([$centerId, $provider]);
    $stored = $st->fetchColumn();
    if (!is_string($stored) || $stored === '') return [];
    $plain = bastianDecryptStateJson($stored);
    $config = json_decode($plain, true);
    return is_array($config) ? $config : [];
}

function bastianDbSetIntegrationConfig(string $centerId, string $provider, array $config, string $actor='superadmin'): void {
    if ($centerId === '' || !preg_match('/^[a-z0-9_-]{1,60}$/i', $provider)) throw new InvalidArgumentException('سرویس انتخاب‌شده معتبر نیست.');
    if (bastianDataKeyBytes() === null) throw new RuntimeException('کلید رمزگذاری داده سرور تنظیم نشده است؛ یک‌بار Setup را اجرا کنید.');
    $clean = [];
    foreach ($config as $key => $value) {
        if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]{0,50}$/', (string)$key)) continue;
        $clean[(string)$key] = is_string($value) ? trim($value) : $value;
    }
    $plain = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($plain === false) throw new RuntimeException('ذخیره تنظیمات سرویس ممکن نشد.');
    $stored = bastianEncryptStateJson($plain);
    $st = bastianPdo()->prepare('INSERT INTO bastian_center_integrations(center_id,provider,config_json,updated_at,updated_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE config_json=VALUES(config_json),updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)');
    $st->execute([$centerId, $provider, $stored, bastianNow(), $actor]);
}

function bastianDbIntegrationValue(string $centerId, string $provider, string $field, string $fallback=''): string {
    try {
        $config = bastianDbIntegrationConfig($centerId, $provider);
        $value = trim((string)($config[$field] ?? ''));
        return $value !== '' ? $value : $fallback;
    } catch (Throwable $e) { return $fallback; }
}

function bastianDbExportAll(): array { $pdo=bastianPdo();$out=['format'=>'bastian-his-export-v1','createdAt'=>date('c'),'centers'=>[]];foreach(bastianDbCenters(true) as $c){$id=$c['id'];$state=bastianDbGetState($id);$out['centers'][]=['center'=>$c,'users'=>bastianDbUsers($id),'state'=>$state,'backups'=>[]];}return $out; }
