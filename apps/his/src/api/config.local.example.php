<?php
/** Public, safe template for Bastiyan HIS 5.1.4 (R24), PHP 8.4 + SQLite.
 * Copy locally to api/config.local.php; never commit that file.
 * Application runtime database, backups and secrets are outside version control.
 */
define('BASTIAN_DB_DRIVER', 'sqlite');
// Optional: use a persistent, private volume path (not a source-controlled directory).
// define('BASTIAN_SQLITE_PATH', '/data/bastiyan/center.sqlite');
define('BASTIAN_SUPERADMIN_USERNAME', 'admin');
// Configure a bcrypt password hash and independent long random keys securely in the host environment.
define('BASTIAN_SUPERADMIN_PASSWORD_HASH', '');
define('BASTIAN_BACKUP_KEY', '');
define('BASTIAN_DATA_ENCRYPTION_KEY', '');
// Optional integrations: keep AI and Chabokan Platform API tokens independent.
define('KAVENEGAR_API_KEY', '');
define('GEMINI_API_KEY', '');
define('IDENTITY_PROVIDER_URL', '');
define('IDENTITY_PROVIDER_API_KEY', '');
