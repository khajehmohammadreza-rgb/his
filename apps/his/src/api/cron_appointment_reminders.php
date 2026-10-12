<?php
/**
 * Bastiyan HIS automatic appointment reminder cron.
 * Recommended DirectAdmin cron: every 10 minutes.
 * CLI: php /full/path/to/api/cron_appointment_reminders.php
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/appointment_reminder_lib.php';

$cli = PHP_SAPI === 'cli';
$keyHeader = $_SERVER['HTTP_X_BACKUP_KEY'] ?? ($_GET['key'] ?? '');
if (!$cli && (!BASTIAN_BACKUP_KEY || !hash_equals(BASTIAN_BACKUP_KEY, (string)$keyHeader))) {
    http_response_code(403); exit('Forbidden');
}
header('Content-Type: application/json; charset=utf-8');
try {
    echo json_encode(bastiyanProcessAppointmentRemindersAllCenters(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>$e->getMessage(),'runAt'=>date('c')], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
