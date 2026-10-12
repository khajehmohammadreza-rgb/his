<?php
/**
 * Bastiyan HIS Professional - Chabokan PHP + embedded SQLite configuration.
 * No external MySQL/cloud database is required. Secrets live in config.local.php.
 */
date_default_timezone_set('Asia/Tehran');

$localConfig = __DIR__ . '/config.local.php';
if (file_exists($localConfig)) require_once $localConfig;

if (!defined('GEMINI_API_KEY')) define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: '');
if (!defined('KAVENEGAR_API_KEY')) define('KAVENEGAR_API_KEY', getenv('KAVENEGAR_API_KEY') ?: '');
if (!defined('IDENTITY_PROVIDER_URL')) define('IDENTITY_PROVIDER_URL', getenv('IDENTITY_PROVIDER_URL') ?: '');
if (!defined('IDENTITY_PROVIDER_API_KEY')) define('IDENTITY_PROVIDER_API_KEY', getenv('IDENTITY_PROVIDER_API_KEY') ?: '');
if (!defined('BASTIAN_SUPERADMIN_USERNAME')) define('BASTIAN_SUPERADMIN_USERNAME', getenv('BASTIAN_SUPERADMIN_USERNAME') ?: 'admin');
if (!defined('BASTIAN_SUPERADMIN_PASSWORD_HASH')) define('BASTIAN_SUPERADMIN_PASSWORD_HASH', getenv('BASTIAN_SUPERADMIN_PASSWORD_HASH') ?: '');
if (!defined('BASTIAN_BACKUP_KEY')) define('BASTIAN_BACKUP_KEY', getenv('BASTIAN_BACKUP_KEY') ?: '');
if (!defined('BASTIAN_DATA_ENCRYPTION_KEY')) define('BASTIAN_DATA_ENCRYPTION_KEY', getenv('BASTIAN_DATA_ENCRYPTION_KEY') ?: '');

if (!defined('BASTIAN_DB_DRIVER')) define('BASTIAN_DB_DRIVER', 'sqlite');
if (!defined('BASTIAN_SQLITE_PATH')) define('BASTIAN_SQLITE_PATH', getenv('BASTIAN_SQLITE_PATH') ?: '');

if (!defined('BASTIAN_ACCESS_TOKEN_TTL')) define('BASTIAN_ACCESS_TOKEN_TTL', 12 * 60 * 60);
if (!defined('BASTIAN_BACKUP_INTERVAL')) define('BASTIAN_BACKUP_INTERVAL', 60 * 60);
if (!defined('BASTIAN_BACKUP_RETENTION')) define('BASTIAN_BACKUP_RETENTION', 180);
if (!defined('BASTIAN_FULL_BACKUP_RETENTION')) define('BASTIAN_FULL_BACKUP_RETENTION', 30);
if (!defined('BASTIAN_SESSION_COOKIE')) define('BASTIAN_SESSION_COOKIE', 'bastian_session');
if (!defined('BASTIAN_LOCAL_MODE')) define('BASTIAN_LOCAL_MODE', false);
if (!defined('BASTIAN_UPDATE_MAX_BYTES')) define('BASTIAN_UPDATE_MAX_BYTES', 100 * 1024 * 1024);

function bastianVersionMeta(): array {
    static $meta = null;
    if (is_array($meta)) return $meta;
    $fallback = [
        'version' => '5.1.4',
        'buildNumber' => 514,
        'channel' => 'production',
        'releaseDate' => '2026-09-30',
    ];
    $path = dirname(__DIR__) . '/version.json';
    $decoded = is_file($path) ? json_decode((string)@file_get_contents($path), true) : null;
    $meta = is_array($decoded) ? array_merge($fallback, $decoded) : $fallback;
    return $meta;
}

function bastianAppVersion(): string {
    return (string)(bastianVersionMeta()['version'] ?? '5.1.4');
}

define('UPLOADS_DIR', __DIR__ . '/../uploads/'); // legacy only; new uploads are private
define('DATA_DIR', __DIR__ . '/data/');
define('CENTERS_DATA_DIR', DATA_DIR . 'centers/');
define('PRIVATE_UPLOADS_DIR', DATA_DIR . 'private_uploads/');
define('FULL_BACKUPS_DIR', DATA_DIR . 'full_backups/');
define('UPDATE_RUNTIME_DIR', DATA_DIR . 'update_runtime/');
define('SESSIONS_FILE', DATA_DIR . 'sessions.json'); // legacy migration only
define('MAX_UPLOAD_BYTES', 10 * 1024 * 1024);

foreach ([UPLOADS_DIR, DATA_DIR, CENTERS_DATA_DIR, PRIVATE_UPLOADS_DIR, FULL_BACKUPS_DIR, UPDATE_RUNTIME_DIR] as $dir) {
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
}

require_once __DIR__ . '/db.php';

function bastianSetSessionCookie(string $token): void {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    setcookie(BASTIAN_SESSION_COOKIE, $token, [
        'expires' => time() + BASTIAN_ACCESS_TOKEN_TTL,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin && $host && preg_match('#^https?://' . preg_quote($host, '#') . '$#i', $origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Bastiyan-Token, X-Requested-With, X-API-Key, X-Backup-Key');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://api.kavenegar.com https://generativelanguage.googleapis.com https://*.tamin.ir https://*.ihio.gov.ir; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
