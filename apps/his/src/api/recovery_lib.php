<?php
/**
 * Bastiyan HIS Disaster Recovery v1
 * Full runtime + database snapshots, independent from the web UI.
 */

if (!function_exists('bastianRecoveryRoot')) {
function bastianRecoveryRoot(): string { return realpath(dirname(__DIR__)) ?: dirname(__DIR__); }
function bastianRecoveryBaseDir(): string {
    $base = defined('DATA_DIR') ? DATA_DIR . 'disaster_recovery/' : __DIR__ . '/data/disaster_recovery/';
    if (!is_dir($base)) @mkdir($base, 0750, true);
    return $base;
}
function bastianRecoverySnapshotsDir(): string {
    $dir = bastianRecoveryBaseDir() . 'snapshots/';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    return $dir;
}
function bastianRecoveryRetention(): int { return defined('BASTIAN_RECOVERY_RETENTION') ? max(3, (int)BASTIAN_RECOVERY_RETENTION) : 8; }
function bastianRecoveryDatabaseRetention(): int { return defined('BASTIAN_RECOVERY_DB_RETENTION') ? max(7, (int)BASTIAN_RECOVERY_DB_RETENTION) : 30; }

function bastianRecoveryRemoveTree(string $path): void {
    if (!file_exists($path) && !is_link($path)) return;
    if (!is_dir($path) || is_link($path)) { @unlink($path); return; }
    foreach (scandir($path) ?: [] as $item) {
        if ($item === '.' || $item === '..') continue;
        bastianRecoveryRemoveTree($path . DIRECTORY_SEPARATOR . $item);
    }
    @rmdir($path);
}

function bastianRecoveryNormalizePath(string $path): string {
    return ltrim(str_replace('\\', '/', $path), '/');
}

function bastianRecoveryIsManagedPath(string $relative): bool {
    $p = bastianRecoveryNormalizePath($relative);
    if ($p === '' || str_contains($p, "\0") || str_contains($p, '../')) return false;
    $blocked = [
        'api/config.local.php', 'api/data/', 'uploads/', 'downloads/', '.git/', 'node_modules/',
        'backup/', 'src/', 'deploy/', 'BASTIYAN_RECOVERY_UNLOCK.txt'
    ];
    foreach ($blocked as $prefix) {
        if ($p === rtrim($prefix, '/') || str_starts_with($p, $prefix)) return false;
    }
    foreach (['app/', 'client-vendor/', 'assets/', 'fonts/'] as $prefix) if (str_starts_with($p, $prefix)) return true;
    if (str_starts_with($p, 'api/')) {
        return (bool)preg_match('/\.(?:php|htaccess|txt|json)$/i', $p) || str_ends_with($p, '/.htaccess');
    }
    $rootAllowed = [
        '.htaccess', '.user.ini', 'index.html', 'portal.js', 'portal.css', 'manifest.json', 'service-worker.js',
        'server-center.html', 'install-client.html', 'center-logo-placeholder.svg', 'favicon.ico', 'logo.png',
        'logo.jpg', 'icon.png', 'bastiyan-logo.png', 'version.json', 'bastiyan-recovery.php',
        'BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt'
    ];
    return in_array($p, $rootAllowed, true);
}

function bastianRecoveryScanRuntime(?string $root = null): array {
    $root = $root ?: bastianRecoveryRoot();
    $out = [];
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($it as $file) {
        if (!$file->isFile() || $file->isLink()) continue;
        $full = $file->getPathname();
        $rel = bastianRecoveryNormalizePath(substr($full, strlen(rtrim($root, DIRECTORY_SEPARATOR)) + 1));
        if (!bastianRecoveryIsManagedPath($rel)) continue;
        $out[$rel] = [
            'size' => (int)$file->getSize(),
            'sha256' => hash_file('sha256', $full),
            'mode' => substr(sprintf('%o', $file->getPerms()), -4),
        ];
    }
    ksort($out, SORT_STRING);
    return $out;
}

function bastianRecoveryCopyRuntime(string $destRuntime): array {
    $root = bastianRecoveryRoot();
    if (!is_dir($destRuntime) && !@mkdir($destRuntime, 0750, true)) throw new RuntimeException('RECOVERY_RUNTIME_DIR_CREATE_FAILED');
    $files = bastianRecoveryScanRuntime($root);
    $bytes = 0;
    foreach ($files as $rel => &$meta) {
        $src = $root . '/' . $rel;
        $dst = $destRuntime . '/' . $rel;
        if (!is_dir(dirname($dst)) && !@mkdir(dirname($dst), 0750, true)) throw new RuntimeException('RECOVERY_RUNTIME_SUBDIR_CREATE_FAILED:' . $rel);
        if (!@copy($src, $dst)) throw new RuntimeException('RECOVERY_RUNTIME_COPY_FAILED:' . $rel);
        if (!hash_equals($meta['sha256'], hash_file('sha256', $dst))) throw new RuntimeException('RECOVERY_RUNTIME_HASH_FAILED:' . $rel);
        @chmod($dst, octdec($meta['mode'] ?: '0644'));
        $bytes += (int)$meta['size'];
    }
    unset($meta);
    return ['files' => $files, 'bytes' => $bytes];
}

function bastianRecoveryZipRuntime(string $runtimeDir, string $zipPath, array $files): void {
    if (!class_exists('ZipArchive')) throw new RuntimeException('RECOVERY_ZIPARCHIVE_REQUIRED');
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) throw new RuntimeException('RECOVERY_ZIP_CREATE_FAILED');
    foreach ($files as $rel => $meta) {
        $source = $runtimeDir . '/' . $rel;
        if (!$zip->addFile($source, $rel)) { $zip->close(); throw new RuntimeException('RECOVERY_ZIP_ADD_FAILED:' . $rel); }
    }
    $readme = "Bastiyan HIS - Last Stable Runtime\nاین فایل توسط سامانه بازیابی خودکار ساخته شده است.\nبرای بازیابی اضطراری، محتویات ZIP را در ریشه نصب Bastiyan HIS با Replace/Overwrite استخراج کنید.\nconfig.local.php، دیتابیس و uploads داخل این ZIP نیستند.\n";
    $zip->addFromString('BASTIYAN_RECOVERY_README_FA.txt', $readme);
    $zip->close();
    if (!is_file($zipPath) || filesize($zipPath) < 100) throw new RuntimeException('RECOVERY_ZIP_INVALID');
    $check = new ZipArchive();
    if ($check->open($zipPath, ZipArchive::CHECKCONS) !== true) throw new RuntimeException('RECOVERY_ZIP_CHECK_FAILED');
    $check->close();
}

function bastianRecoveryKey(): string {
    $seed = defined('BASTIAN_BACKUP_KEY') ? trim((string)BASTIAN_BACKUP_KEY) : '';
    if ($seed === '' && defined('BASTIAN_DATA_ENCRYPTION_KEY')) $seed = trim((string)BASTIAN_DATA_ENCRYPTION_KEY);
    if ($seed !== '') return hash('sha256', 'bastiyan-recovery-v1|' . $seed, true);
    $keyFile = bastianRecoveryBaseDir() . 'recovery.key';
    if (is_file($keyFile)) {
        $raw = base64_decode(trim((string)@file_get_contents($keyFile)), true);
        if (is_string($raw) && strlen($raw) === 32) return $raw;
    }
    $raw = random_bytes(32);
    if (@file_put_contents($keyFile, base64_encode($raw), LOCK_EX) === false) throw new RuntimeException('RECOVERY_KEY_WRITE_FAILED');
    @chmod($keyFile, 0600);
    return $raw;
}

function bastianRecoveryDatabaseTables(PDO $pdo): array {
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) ?: [];
    $tables = array_values(array_filter(array_map('strval', $tables), fn($t) => preg_match('/^bastian_[A-Za-z0-9_]+$/', $t)));
    sort($tables, SORT_STRING);
    return $tables;
}

function bastianRecoveryCreateDatabaseBackup(string $targetFile): array {
    if (!function_exists('bastianDbEnabled') || !bastianDbEnabled()) return ['enabled' => false, 'tables' => 0, 'bytes' => 0, 'file' => null];
    if (!function_exists('openssl_encrypt')) throw new RuntimeException('RECOVERY_OPENSSL_REQUIRED');
    $pdo = bastianPdo();
    $tables = bastianRecoveryDatabaseTables($pdo);
    $payload = [
        'format' => 'bastiyan-his-database-recovery-v1',
        'version' => function_exists('bastianAppVersion') ? bastianAppVersion() : '',
        'createdAt' => date('c'),
        'tables' => [],
    ];
    foreach ($tables as $table) {
        $quoted = '`' . str_replace('`', '``', $table) . '`';
        $createRow = $pdo->query('SHOW CREATE TABLE ' . $quoted)->fetch(PDO::FETCH_ASSOC) ?: [];
        $createSql = '';
        foreach ($createRow as $k => $v) if (stripos((string)$k, 'Create Table') !== false) { $createSql = (string)$v; break; }
        $rows = $pdo->query('SELECT * FROM ' . $quoted)->fetchAll(PDO::FETCH_ASSOC);
        $payload['tables'][$table] = ['createSql' => $createSql, 'rows' => $rows];
    }
    $plain = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if (!is_string($plain)) throw new RuntimeException('RECOVERY_DATABASE_JSON_FAILED');
    $sha = hash('sha256', $plain);
    $compression = function_exists('gzencode') ? 'gzip' : 'none';
    $toEncrypt = $compression === 'gzip' ? gzencode($plain, 6) : $plain;
    if (!is_string($toEncrypt)) throw new RuntimeException('RECOVERY_DATABASE_COMPRESS_FAILED');
    $iv = random_bytes(12); $tag = ''; $aad = 'BASTIYAN-HIS-RECOVERY-V1';
    $cipher = openssl_encrypt($toEncrypt, 'aes-256-gcm', bastianRecoveryKey(), OPENSSL_RAW_DATA, $iv, $tag, $aad);
    if ($cipher === false) throw new RuntimeException('RECOVERY_DATABASE_ENCRYPT_FAILED');
    $envelope = [
        'format' => 'bastiyan-his-aes256gcm-recovery-v1', 'version' => $payload['version'], 'createdAt' => date('c'),
        'aad' => $aad, 'compression' => $compression, 'iv' => base64_encode($iv), 'tag' => base64_encode($tag),
        'data' => base64_encode($cipher), 'sha256' => $sha, 'tableCount' => count($tables),
    ];
    if (!is_dir(dirname($targetFile))) @mkdir(dirname($targetFile), 0750, true);
    if (@file_put_contents($targetFile, json_encode($envelope, JSON_UNESCAPED_SLASHES), LOCK_EX) === false) throw new RuntimeException('RECOVERY_DATABASE_WRITE_FAILED');
    @chmod($targetFile, 0640);
    return ['enabled' => true, 'tables' => count($tables), 'bytes' => (int)filesize($targetFile), 'file' => basename($targetFile), 'sha256' => hash_file('sha256', $targetFile)];
}

function bastianRecoveryReadDatabaseBackup(string $file): array {
    if (!is_file($file)) throw new RuntimeException('RECOVERY_DATABASE_FILE_NOT_FOUND');
    $env = json_decode((string)@file_get_contents($file), true);
    if (!is_array($env) || ($env['format'] ?? '') !== 'bastiyan-his-aes256gcm-recovery-v1') throw new RuntimeException('RECOVERY_DATABASE_ENVELOPE_INVALID');
    $aad = (string)($env['aad'] ?? 'BASTIYAN-HIS-RECOVERY-V1');
    $cipher = base64_decode((string)($env['data'] ?? ''), true);
    $iv = base64_decode((string)($env['iv'] ?? ''), true);
    $tag = base64_decode((string)($env['tag'] ?? ''), true);
    if (!is_string($cipher) || !is_string($iv) || !is_string($tag)) throw new RuntimeException('RECOVERY_DATABASE_BASE64_INVALID');
    $packed = openssl_decrypt($cipher, 'aes-256-gcm', bastianRecoveryKey(), OPENSSL_RAW_DATA, $iv, $tag, $aad);
    if ($packed === false) throw new RuntimeException('RECOVERY_DATABASE_DECRYPT_FAILED');
    $plain = (($env['compression'] ?? '') === 'gzip') ? gzdecode($packed) : $packed;
    if (!is_string($plain) || !hash_equals((string)($env['sha256'] ?? ''), hash('sha256', $plain))) throw new RuntimeException('RECOVERY_DATABASE_AUTH_FAILED');
    $data = json_decode($plain, true);
    if (!is_array($data) || ($data['format'] ?? '') !== 'bastiyan-his-database-recovery-v1' || !is_array($data['tables'] ?? null)) throw new RuntimeException('RECOVERY_DATABASE_PAYLOAD_INVALID');
    return $data;
}

function bastianRecoveryRestoreDatabase(string $file): array {
    if (!function_exists('bastianDbEnabled') || !bastianDbEnabled()) throw new RuntimeException('RECOVERY_DATABASE_NOT_CONFIGURED');
    $data = bastianRecoveryReadDatabaseBackup($file);
    $pdo = bastianPdo();
    $restoredRows = 0;
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    try {
        foreach ($data['tables'] as $table => $bundle) {
            if (!preg_match('/^bastian_[A-Za-z0-9_]+$/', (string)$table)) continue;
            $quoted = '`' . str_replace('`', '``', (string)$table) . '`';
            $existsSt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?');
            $existsSt->execute([(string)$table]);
            if (!(int)$existsSt->fetchColumn()) {
                $createSql = trim((string)($bundle['createSql'] ?? ''));
                if ($createSql === '') throw new RuntimeException('RECOVERY_DATABASE_SCHEMA_MISSING:' . $table);
                $pdo->exec($createSql);
            }
            $pdo->exec('DELETE FROM ' . $quoted);
            foreach ((array)($bundle['rows'] ?? []) as $row) {
                if (!is_array($row) || !$row) continue;
                $cols = array_keys($row);
                foreach ($cols as $col) if (!preg_match('/^[A-Za-z0-9_]+$/', (string)$col)) throw new RuntimeException('RECOVERY_DATABASE_COLUMN_INVALID');
                $sql = 'INSERT INTO ' . $quoted . ' (`' . implode('`,`', $cols) . '`) VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')';
                $st = $pdo->prepare($sql); $st->execute(array_values($row)); $restoredRows++;
            }
        }
    } finally {
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }
    return ['success' => true, 'tables' => count($data['tables']), 'rows' => $restoredRows, 'backupVersion' => (string)($data['version'] ?? '')];
}

function bastianRecoveryCreateSnapshot(string $reason = 'manual', array $options = []): array {
    $includeRuntime = array_key_exists('runtime', $options) ? (bool)$options['runtime'] : true;
    $includeDatabase = array_key_exists('database', $options) ? (bool)$options['database'] : true;
    $id = date('Ymd_His') . '_' . preg_replace('/[^a-z0-9_-]+/i', '-', $reason) . '_' . bin2hex(random_bytes(3));
    $dir = bastianRecoverySnapshotsDir() . $id;
    if (!@mkdir($dir, 0750, true)) throw new RuntimeException('RECOVERY_SNAPSHOT_DIR_FAILED');
    try {
        $runtimeInfo = ['files' => [], 'bytes' => 0];
        $runtimeZip = null;
        if ($includeRuntime) {
            $runtimeInfo = bastianRecoveryCopyRuntime($dir . '/runtime');
            $runtimeZip = $dir . '/runtime.zip';
            bastianRecoveryZipRuntime($dir . '/runtime', $runtimeZip, $runtimeInfo['files']);
        }
        $dbInfo = ['enabled' => false, 'tables' => 0, 'bytes' => 0, 'file' => null];
        if ($includeDatabase) $dbInfo = bastianRecoveryCreateDatabaseBackup($dir . '/database.bastiyanbak');
        $versionMeta = function_exists('bastianVersionMeta') ? bastianVersionMeta() : ['version' => '', 'buildNumber' => 0];
        $meta = [
            'id' => $id, 'format' => 'bastiyan-his-disaster-snapshot-v1', 'complete' => true,
            'reason' => $reason, 'createdAt' => date('c'), 'version' => (string)($versionMeta['version'] ?? ''),
            'buildNumber' => (int)($versionMeta['buildNumber'] ?? 0), 'targetVersion' => (string)($options['targetVersion'] ?? ''),
            'runtimeIncluded' => $includeRuntime, 'runtimeFiles' => count($runtimeInfo['files']), 'runtimeBytes' => (int)$runtimeInfo['bytes'],
            'runtimeZipSha256' => $runtimeZip && is_file($runtimeZip) ? hash_file('sha256', $runtimeZip) : null,
            'runtimeManifest' => $runtimeInfo['files'], 'databaseIncluded' => (bool)$dbInfo['enabled'], 'database' => $dbInfo,
        ];
        if (@file_put_contents($dir . '/snapshot.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX) === false) throw new RuntimeException('RECOVERY_SNAPSHOT_META_FAILED');
        if ($includeRuntime && !bastianRecoveryVerifySnapshot($id)['valid']) throw new RuntimeException('RECOVERY_SNAPSHOT_VERIFY_FAILED');
        if ($reason === 'before_update' || !empty($options['markStable'])) {
            if ($runtimeZip && is_file($runtimeZip)) @copy($runtimeZip, bastianRecoveryBaseDir() . 'LAST_STABLE_RUNTIME.zip');
            if (!empty($dbInfo['file']) && is_file($dir . '/database.bastiyanbak')) @copy($dir . '/database.bastiyanbak', bastianRecoveryBaseDir() . 'LAST_STABLE_DATABASE.bastiyanbak');
            @file_put_contents(bastianRecoveryBaseDir() . 'LAST_STABLE_INFO.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
        }
        bastianRecoveryPrune();
        return $meta;
    } catch (Throwable $e) {
        bastianRecoveryRemoveTree($dir);
        throw $e;
    }
}

function bastianRecoveryVerifySnapshot(string $id): array {
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $id)) return ['valid' => false, 'error' => 'INVALID_ID'];
    $dir = bastianRecoverySnapshotsDir() . $id;
    $meta = json_decode((string)@file_get_contents($dir . '/snapshot.json'), true);
    if (!is_array($meta) || empty($meta['complete'])) return ['valid' => false, 'error' => 'META_INVALID'];
    if (!empty($meta['runtimeIncluded'])) {
        foreach ((array)($meta['runtimeManifest'] ?? []) as $rel => $fileMeta) {
            $file = $dir . '/runtime/' . bastianRecoveryNormalizePath((string)$rel);
            if (!is_file($file)) return ['valid' => false, 'error' => 'RUNTIME_MISSING:' . $rel];
            if (!hash_equals((string)($fileMeta['sha256'] ?? ''), hash_file('sha256', $file))) return ['valid' => false, 'error' => 'RUNTIME_HASH:' . $rel];
        }
        $zip = $dir . '/runtime.zip';
        if (!is_file($zip) || !hash_equals((string)($meta['runtimeZipSha256'] ?? ''), hash_file('sha256', $zip))) return ['valid' => false, 'error' => 'ZIP_HASH'];
    }
    if (!empty($meta['databaseIncluded'])) {
        try { bastianRecoveryReadDatabaseBackup($dir . '/database.bastiyanbak'); } catch (Throwable $e) { return ['valid' => false, 'error' => $e->getMessage()]; }
    }
    return ['valid' => true, 'id' => $id, 'version' => (string)($meta['version'] ?? ''), 'createdAt' => (string)($meta['createdAt'] ?? '')];
}

function bastianRecoveryRestoreRuntimeDirectory(string $runtimeDir, array $manifest): array {
    $root = bastianRecoveryRoot();
    $snapshotPaths = array_fill_keys(array_keys($manifest), true);
    $current = bastianRecoveryScanRuntime($root);
    $preserve = ['bastiyan-recovery.php' => true, 'BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt' => true];
    foreach (array_keys($current) as $rel) {
        if (isset($snapshotPaths[$rel]) || isset($preserve[$rel])) continue;
        $target = $root . '/' . $rel;
        if (is_file($target)) @unlink($target);
    }
    $restored = 0;
    foreach ($manifest as $rel => $meta) {
        $rel = bastianRecoveryNormalizePath((string)$rel);
        if (!bastianRecoveryIsManagedPath($rel)) continue;
        $src = $runtimeDir . '/' . $rel; $target = $root . '/' . $rel;
        if (!is_file($src)) throw new RuntimeException('RECOVERY_RESTORE_SOURCE_MISSING:' . $rel);
        if (!hash_equals((string)($meta['sha256'] ?? ''), hash_file('sha256', $src))) throw new RuntimeException('RECOVERY_RESTORE_SOURCE_HASH:' . $rel);
        if (!is_dir(dirname($target)) && !@mkdir(dirname($target), 0755, true)) throw new RuntimeException('RECOVERY_RESTORE_DIR_FAILED:' . $rel);
        $tmp = $target . '.bastiyan-restore-' . bin2hex(random_bytes(3));
        if (!@copy($src, $tmp)) throw new RuntimeException('RECOVERY_RESTORE_COPY_FAILED:' . $rel);
        if (!@rename($tmp, $target)) { @unlink($tmp); throw new RuntimeException('RECOVERY_RESTORE_RENAME_FAILED:' . $rel); }
        if (!empty($meta['mode'])) @chmod($target, octdec((string)$meta['mode']));
        $restored++;
    }
    return ['success' => true, 'filesRestored' => $restored];
}

function bastianRecoveryRestoreSnapshot(string $id, bool $restoreDatabase = false): array {
    $verify = bastianRecoveryVerifySnapshot($id);
    if (empty($verify['valid'])) throw new RuntimeException('RECOVERY_SNAPSHOT_INVALID:' . ($verify['error'] ?? 'UNKNOWN'));
    $dir = bastianRecoverySnapshotsDir() . $id;
    $meta = json_decode((string)@file_get_contents($dir . '/snapshot.json'), true);
    if (empty($meta['runtimeIncluded'])) throw new RuntimeException('RECOVERY_RUNTIME_NOT_IN_SNAPSHOT');
    $runtimeResult = bastianRecoveryRestoreRuntimeDirectory($dir . '/runtime', (array)$meta['runtimeManifest']);
    $dbResult = null;
    if ($restoreDatabase) {
        if (empty($meta['databaseIncluded'])) throw new RuntimeException('RECOVERY_DATABASE_NOT_IN_SNAPSHOT');
        $dbResult = bastianRecoveryRestoreDatabase($dir . '/database.bastiyanbak');
    }
    return ['success' => true, 'snapshotId' => $id, 'restoredVersion' => (string)($meta['version'] ?? ''), 'runtime' => $runtimeResult, 'database' => $dbResult];
}

function bastianRecoveryListLegacyUpdaterBackups(int $limit = 20): array {
    $base = defined('UPDATE_RUNTIME_DIR') ? UPDATE_RUNTIME_DIR . 'backups/' : __DIR__ . '/data/update_runtime/backups/';
    $rows = [];
    foreach (glob($base . '*', GLOB_ONLYDIR) ?: [] as $dir) {
        $meta = json_decode((string)@file_get_contents($dir . '/backup.json'), true);
        if (!is_array($meta)) continue;
        $rows[] = ['id' => basename($dir), 'type' => 'legacy-updater', 'fromVersion' => (string)($meta['fromVersion'] ?? ''), 'toVersion' => (string)($meta['toVersion'] ?? ''), 'version' => (string)($meta['fromVersion'] ?? ''), 'createdAt' => (string)($meta['createdAt'] ?? ''), 'runtimeIncluded' => true, 'databaseIncluded' => false, 'complete' => true];
    }
    usort($rows, fn($a,$b) => strcmp((string)$b['createdAt'], (string)$a['createdAt']));
    return array_slice($rows, 0, $limit);
}

function bastianRecoveryListSnapshots(int $limit = 30, bool $includeLegacy = true): array {
    $rows = [];
    foreach (glob(bastianRecoverySnapshotsDir() . '*', GLOB_ONLYDIR) ?: [] as $dir) {
        $meta = json_decode((string)@file_get_contents($dir . '/snapshot.json'), true);
        if (!is_array($meta) || empty($meta['complete'])) continue;
        $rows[] = [
            'id' => basename($dir), 'type' => 'disaster-snapshot', 'version' => (string)($meta['version'] ?? ''),
            'buildNumber' => (int)($meta['buildNumber'] ?? 0), 'targetVersion' => (string)($meta['targetVersion'] ?? ''),
            'reason' => (string)($meta['reason'] ?? ''), 'createdAt' => (string)($meta['createdAt'] ?? ''),
            'runtimeIncluded' => !empty($meta['runtimeIncluded']), 'databaseIncluded' => !empty($meta['databaseIncluded']),
            'runtimeFiles' => (int)($meta['runtimeFiles'] ?? 0), 'runtimeBytes' => (int)($meta['runtimeBytes'] ?? 0), 'complete' => true,
        ];
    }
    if ($includeLegacy) $rows = array_merge($rows, bastianRecoveryListLegacyUpdaterBackups($limit));
    usort($rows, fn($a,$b) => strcmp((string)$b['createdAt'], (string)$a['createdAt']));
    return array_slice($rows, 0, max(1, min(100, $limit)));
}

function bastianRecoveryRestoreLegacyUpdaterBackup(string $id): array {
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $id)) throw new RuntimeException('RECOVERY_LEGACY_ID_INVALID');
    $base = defined('UPDATE_RUNTIME_DIR') ? UPDATE_RUNTIME_DIR . 'backups/' : __DIR__ . '/data/update_runtime/backups/';
    $dir = $base . $id;
    $meta = json_decode((string)@file_get_contents($dir . '/backup.json'), true);
    if (!is_array($meta)) throw new RuntimeException('RECOVERY_LEGACY_NOT_FOUND');
    $root = bastianRecoveryRoot(); $restored = 0;
    foreach ((array)($meta['backedUpFiles'] ?? []) as $rel) {
        $rel = bastianRecoveryNormalizePath((string)$rel);
        $src = $dir . '/files/' . $rel; $target = $root . '/' . $rel;
        if (!is_file($src)) throw new RuntimeException('RECOVERY_LEGACY_FILE_MISSING:' . $rel);
        if (!is_dir(dirname($target))) @mkdir(dirname($target), 0755, true);
        $tmp = $target . '.bastiyan-legacy-restore';
        if (!@copy($src, $tmp) || !@rename($tmp, $target)) { @unlink($tmp); throw new RuntimeException('RECOVERY_LEGACY_RESTORE_FAILED:' . $rel); }
        $restored++;
    }
    $preserve = ['bastiyan-recovery.php' => true, 'BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt' => true];
    foreach ((array)($meta['newFiles'] ?? []) as $rel) {
        $rel = bastianRecoveryNormalizePath((string)$rel);
        if (isset($preserve[$rel])) continue;
        if (bastianRecoveryIsManagedPath($rel)) @unlink($root . '/' . $rel);
    }
    return ['success' => true, 'snapshotId' => $id, 'restoredVersion' => (string)($meta['fromVersion'] ?? ''), 'runtime' => ['filesRestored' => $restored], 'legacy' => true];
}

function bastianRecoveryPrune(): void {
    $full = []; $dbOnly = [];
    foreach (glob(bastianRecoverySnapshotsDir() . '*', GLOB_ONLYDIR) ?: [] as $dir) {
        $meta = json_decode((string)@file_get_contents($dir . '/snapshot.json'), true);
        if (!is_array($meta)) continue;
        $row = ['dir' => $dir, 'createdAt' => (string)($meta['createdAt'] ?? '')];
        if (!empty($meta['runtimeIncluded'])) $full[] = $row; else $dbOnly[] = $row;
    }
    $sort = fn(&$a) => usort($a, fn($x,$y) => strcmp($y['createdAt'], $x['createdAt']));
    $sort($full); $sort($dbOnly);
    foreach (array_slice($full, bastianRecoveryRetention()) as $row) bastianRecoveryRemoveTree($row['dir']);
    foreach (array_slice($dbOnly, bastianRecoveryDatabaseRetention()) as $row) bastianRecoveryRemoveTree($row['dir']);
}

function bastianRecoveryStatus(): array {
    $rows = bastianRecoveryListSnapshots(20, true);
    $lastFull = null; $lastDb = null;
    foreach ($rows as $row) {
        if ($lastFull === null && !empty($row['runtimeIncluded'])) $lastFull = $row;
        if ($lastDb === null && !empty($row['databaseIncluded'])) $lastDb = $row;
    }
    return [
        'success' => true, 'enabled' => true, 'currentVersion' => function_exists('bastianAppVersion') ? bastianAppVersion() : '',
        'snapshots' => $rows, 'lastRuntimeSnapshot' => $lastFull, 'lastDatabaseSnapshot' => $lastDb,
        'lastStableRuntimeZip' => is_file(bastianRecoveryBaseDir() . 'LAST_STABLE_RUNTIME.zip'),
        'recoveryConsole' => './bastiyan-recovery.php', 'unlockTemplate' => './BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt',
        'retention' => bastianRecoveryRetention(), 'databaseRetention' => bastianRecoveryDatabaseRetention(),
    ];
}
}
