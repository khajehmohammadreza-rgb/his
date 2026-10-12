<?php
/** DirectAdmin Cron watchdog: rolls back an unconfirmed update after its deadline. */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/updater.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$result = bastianUpdaterAutoRollbackIfExpired();
if (is_array($result) && !empty($result['expired'])) {
    fwrite(STDOUT, !empty($result['rollbackFailed']) ? "ROLLBACK_FAILED\n" : "ROLLED_BACK\n");
} else {
    fwrite(STDOUT, "NO_ACTION\n");
}