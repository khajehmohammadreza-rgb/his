<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$result = [
    'ok' => false,
    'product' => 'Bastiyan HIS',
    'build' => '514-1405-r24',
    'runtime' => 'php',
    'database' => 'embedded-sqlite',
    'externalDatabaseRequired' => false,
    'checks' => [],
];

try {
    require_once __DIR__ . '/api/config.php';

    $result['checks']['pdo'] = extension_loaded('pdo');
    $result['checks']['pdo_sqlite'] = extension_loaded('pdo_sqlite');
    $result['checks']['dataWritable'] = is_dir(__DIR__.'/api/data')
        ? is_writable(__DIR__.'/api/data')
        : is_writable(__DIR__.'/api');

    if (!$result['checks']['pdo_sqlite']) {
        throw new RuntimeException('PDO_SQLITE_NOT_AVAILABLE');
    }

    $pdo = new BastiyanSqlitePDO('sqlite::memory:', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec('PRAGMA foreign_keys=ON');
    bastianCreateSchema($pdo);

    // This is the exact compatibility path that caused "near Null: syntax error" in R9.
    $cols = $pdo->query('SHOW COLUMNS FROM bastian_users')->fetchAll(PDO::FETCH_ASSOC);
    $result['checks']['showColumnsCompatibility'] = count($cols) > 0
        && array_key_exists('Field', $cols[0])
        && array_key_exists('Null', $cols[0]);

    // Verify SQLite upsert conversion used by the online center store.
    $pdo->exec("CREATE TABLE IF NOT EXISTS r10_upsert_test (
        center_id VARCHAR(80) NOT NULL,
        data_key VARCHAR(60) NOT NULL,
        payload_json LONGTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL,
        updated_by VARCHAR(100) NULL,
        PRIMARY KEY (center_id, data_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $up = $pdo->prepare("INSERT INTO r10_upsert_test(center_id,data_key,payload_json,revision,updated_at,updated_by)
        VALUES(?,?,?,1,?,?)
        ON DUPLICATE KEY UPDATE
        payload_json=VALUES(payload_json),
        revision=revision+1,
        updated_at=VALUES(updated_at),
        updated_by=VALUES(updated_by)");
    $up->execute(['selftest','state','{}',date('Y-m-d H:i:s'),'r10']);
    $up->execute(['selftest','state','{"ok":true}',date('Y-m-d H:i:s'),'r10']);
    $row = $pdo->query("SELECT revision,payload_json FROM r10_upsert_test WHERE center_id='selftest' AND data_key='state'")->fetch();
    $result['checks']['upsertCompatibility'] = is_array($row)
        && (int)($row['revision'] ?? 0) === 2;

    $result['ok'] = !in_array(false, $result['checks'], true);
} catch (Throwable $e) {
    $result['error'] = preg_replace('/[^A-Za-z0-9_:\-. ]/', '_', substr($e->getMessage(), 0, 180));
}

echo json_encode($result, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
