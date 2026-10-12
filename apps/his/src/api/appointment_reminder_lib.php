<?php
/**
 * Bastiyan HIS - automatic appointment SMS reminder engine.
 * Stores reminder delivery state outside the center JSON state to avoid revision conflicts.
 */

function bastiyanEnsureAppointmentReminderSchema(): void {
    if (!bastianDbEnabled()) return;
    $pdo = bastianPdo();
    $pdo->exec("CREATE TABLE IF NOT EXISTS bastian_appointment_reminders (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function bastiyanReminderDigitsToEnglish(string $value): string {
    return strtr($value, [
        '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
        '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
    ]);
}

function bastiyanReminderJalaliToGregorian(int $jy, int $jm, int $jd): array {
    $jy2 = $jy + 1595;
    $days = -355668 + 365 * $jy2 + intdiv($jy2, 33) * 8 + intdiv(($jy2 % 33) + 3, 4) + $jd;
    $days += $jm < 7 ? ($jm - 1) * 31 : (($jm - 7) * 30) + 186;
    $gy = 400 * intdiv($days, 146097);
    $days %= 146097;
    if ($days > 36524) {
        $days--;
        $gy += 100 * intdiv($days, 36524);
        $days %= 36524;
        if ($days >= 365) $days++;
    }
    $gy += 4 * intdiv($days, 1461);
    $days %= 1461;
    if ($days > 365) {
        $gy += intdiv($days - 1, 365);
        $days = ($days - 1) % 365;
    }
    $gd = $days + 1;
    $leap = (($gy % 4 === 0) && ($gy % 100 !== 0)) || ($gy % 400 === 0);
    $monthDays = [0,31,$leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
    $gm = 1;
    while ($gm <= 12 && $gd > $monthDays[$gm]) { $gd -= $monthDays[$gm]; $gm++; }
    return ['gy'=>$gy, 'gm'=>$gm, 'gd'=>$gd];
}

function bastiyanAppointmentTimestamp(array $appointment): ?int {
    $scheduledAt = trim((string)($appointment['scheduledAt'] ?? ''));
    if ($scheduledAt !== '') {
        $ts = strtotime($scheduledAt);
        if ($ts !== false) return $ts;
    }
    $date = trim(bastiyanReminderDigitsToEnglish((string)($appointment['jalaliDate'] ?? '')));
    $time = trim(bastiyanReminderDigitsToEnglish((string)($appointment['timeSlot'] ?? '')));
    if (preg_match('/^(\d{3,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/', $date, $m)) {
        $g = bastiyanReminderJalaliToGregorian((int)$m[1], (int)$m[2], (int)$m[3]);
        $hour = 0; $minute = 0;
        if (preg_match('/^(\d{1,2}):(\d{1,2})/', $time, $tm)) { $hour = min(23, (int)$tm[1]); $minute = min(59, (int)$tm[2]); }
        try {
            $dt = new DateTimeImmutable(sprintf('%04d-%02d-%02d %02d:%02d:00', $g['gy'], $g['gm'], $g['gd'], $hour, $minute), new DateTimeZone('Asia/Tehran'));
            return $dt->getTimestamp();
        } catch (Throwable $e) { return null; }
    }
    $gregorian = trim((string)($appointment['date'] ?? ''));
    if ($gregorian !== '') {
        $ts = strtotime($gregorian . ($time !== '' ? ' ' . $time : ''));
        if ($ts !== false) return $ts;
    }
    return null;
}

function bastiyanNormalizeIranianMobile(string $mobile): string {
    $m = preg_replace('/\D+/', '', bastiyanReminderDigitsToEnglish($mobile));
    if (str_starts_with($m, '0098')) $m = '0' . substr($m, 4);
    elseif (str_starts_with($m, '98') && strlen($m) === 12) $m = '0' . substr($m, 2);
    elseif (strlen($m) === 10 && str_starts_with($m, '9')) $m = '0' . $m;
    return preg_match('/^09\d{9}$/', $m) ? $m : '';
}

function bastiyanReminderHttpPost(string $url, array $postData, int $timeout = 12): array {
    if (!function_exists('curl_init')) return ['code'=>0,'response'=>'','error'=>'افزونه cURL روی PHP فعال نیست.'];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($postData),
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => min(5, $timeout),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    return ['code'=>$code, 'response'=>(string)$response, 'error'=>$error];
}

function bastiyanReminderAppendSmsLog(string $centerId, string $mobile, string $message, bool $success, array $details = []): void {
    $path = DATA_DIR . 'sms_logs.json';
    $fp = @fopen($path, 'c+');
    if (!$fp) return;
    try {
        if (!flock($fp, LOCK_EX)) return;
        rewind($fp);
        $raw = stream_get_contents($fp);
        $logs = $raw ? json_decode($raw, true) : [];
        if (!is_array($logs)) $logs = [];
        array_unshift($logs, array_merge([
            'id' => 'sms-' . round(microtime(true) * 1000) . '-' . bin2hex(random_bytes(2)),
            'centerId' => $centerId,
            'type' => 'appointment_reminder_24h',
            'mobile' => $mobile,
            'message' => $message,
            'success' => $success,
            'createdAt' => date('c'),
        ], $details));
        $logs = array_slice($logs, 0, 3000);
        ftruncate($fp, 0); rewind($fp);
        fwrite($fp, json_encode($logs, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
        fflush($fp);
        flock($fp, LOCK_UN);
    } finally { fclose($fp); }
}

function bastiyanReminderStatusRows(string $centerId, int $limit = 1000): array {
    if (!bastianDbEnabled() || $centerId === '') return [];
    bastiyanEnsureAppointmentReminderSchema();
    $limit = max(1, min(3000, $limit));
    $st = bastianPdo()->prepare("SELECT appointment_id,patient_id,patient_name,mobile,appointment_at,scheduled_for,reminder_type,status,attempts,provider,provider_message_id,last_error,last_attempt_at,sent_at,history_json,updated_at FROM bastian_appointment_reminders WHERE center_id=? ORDER BY updated_at DESC LIMIT {$limit}");
    $st->execute([$centerId]);
    return array_map(function($r) {
        $history = json_decode((string)($r['history_json'] ?? ''), true);
        return [
            'appointmentId'=>$r['appointment_id'], 'patientId'=>$r['patient_id'], 'patientName'=>$r['patient_name'], 'mobile'=>$r['mobile'],
            'appointmentAt'=>$r['appointment_at'] ? date('c', strtotime($r['appointment_at'])) : null,
            'scheduledFor'=>$r['scheduled_for'] ? date('c', strtotime($r['scheduled_for'])) : null,
            'reminderType'=>$r['reminder_type'], 'status'=>$r['status'], 'attempts'=>(int)$r['attempts'], 'provider'=>$r['provider'],
            'providerMessageId'=>$r['provider_message_id'], 'lastError'=>$r['last_error'],
            'lastAttemptAt'=>$r['last_attempt_at'] ? date('c', strtotime($r['last_attempt_at'])) : null,
            'sentAt'=>$r['sent_at'] ? date('c', strtotime($r['sent_at'])) : null,
            'history'=>is_array($history) ? $history : [], 'updatedAt'=>date('c', strtotime($r['updated_at'])),
        ];
    }, $st->fetchAll());
}

function bastiyanRecordAppointmentReminderResult(string $centerId, array $appointment, string $status, array $details = []): array {
    bastiyanEnsureAppointmentReminderSchema();
    $pdo = bastianPdo();
    $appointmentId = trim((string)($appointment['id'] ?? $details['appointmentId'] ?? ''));
    if ($appointmentId === '') throw new InvalidArgumentException('شناسه نوبت الزامی است.');
    $now = bastianNow();
    $appointmentTs = bastiyanAppointmentTimestamp($appointment);
    $hoursBefore = max(1, min(168, (int)($details['hoursBefore'] ?? 24)));
    $reminderType = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($details['reminderType'] ?? ($hoursBefore === 48 ? '48h' : '24h'))) ?: '24h';
    $scheduledFor = $appointmentTs ? date('Y-m-d H:i:s', $appointmentTs - $hoursBefore * 3600) : null;
    $mobile = bastiyanNormalizeIranianMobile((string)($appointment['mobilePhone'] ?? $details['mobile'] ?? ''));
    $existing = $pdo->prepare('SELECT history_json,attempts FROM bastian_appointment_reminders WHERE center_id=? AND appointment_id=? AND reminder_type=? LIMIT 1');
    $existing->execute([$centerId, $appointmentId, $reminderType]);
    $row = $existing->fetch() ?: [];
    $history = json_decode((string)($row['history_json'] ?? ''), true);
    if (!is_array($history)) $history = [];
    $isAttempt = !in_array($status, ['pending','scheduled'], true);
    $eventTime = $details['attemptedAt'] ?? date('c');
    $event = [
        'id'=>'rem-evt-' . round(microtime(true) * 1000) . '-' . bin2hex(random_bytes(2)),
        'status'=>$status,
        'source'=>$details['source'] ?? ($isAttempt ? 'automatic' : 'scheduler'),
        'attemptedAt'=>$isAttempt ? $eventTime : null,
        'scheduledAt'=>!$isAttempt ? ($details['scheduledAt'] ?? date('c')) : null,
        'sentAt'=>$status === 'sent' ? ($details['sentAt'] ?? date('c')) : null,
        'provider'=>$details['provider'] ?? 'kavenegar',
        'providerMessageId'=>$details['providerMessageId'] ?? null,
        'error'=>$details['error'] ?? null,
    ];
    $history[] = $event;
    if (count($history) > 50) $history = array_slice($history, -50);
    $attempts = max((int)($row['attempts'] ?? 0), (int)($details['attempts'] ?? 0));
    if (($details['incrementAttempts'] ?? false) === true) $attempts++;
    $sentAt = $status === 'sent' ? date('Y-m-d H:i:s', strtotime($event['sentAt'])) : null;
    $lastAttemptAt = $isAttempt && !empty($event['attemptedAt']) ? date('Y-m-d H:i:s', strtotime($event['attemptedAt'])) : null;
    $sql = "INSERT INTO bastian_appointment_reminders(center_id,appointment_id,patient_id,patient_name,mobile,appointment_at,scheduled_for,reminder_type,status,attempts,provider,provider_message_id,last_error,last_attempt_at,sent_at,history_json,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE patient_id=VALUES(patient_id),patient_name=VALUES(patient_name),mobile=VALUES(mobile),appointment_at=VALUES(appointment_at),scheduled_for=VALUES(scheduled_for),status=CASE WHEN status='sent' THEN status ELSE VALUES(status) END,attempts=VALUES(attempts),provider=VALUES(provider),provider_message_id=VALUES(provider_message_id),last_error=VALUES(last_error),last_attempt_at=COALESCE(VALUES(last_attempt_at),last_attempt_at),sent_at=COALESCE(VALUES(sent_at),sent_at),history_json=VALUES(history_json),updated_at=VALUES(updated_at)";
    $st = $pdo->prepare($sql);
    $st->execute([
        $centerId, $appointmentId, (string)($appointment['patientId'] ?? ''), (string)($appointment['patientName'] ?? ''), $mobile,
        $appointmentTs ? date('Y-m-d H:i:s', $appointmentTs) : null, $scheduledFor, $reminderType, $status, $attempts,
        $details['provider'] ?? 'kavenegar', $details['providerMessageId'] ?? null, $details['error'] ?? null, $lastAttemptAt, $sentAt,
        json_encode($history, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), $now, $now,
    ]);
    $rows = bastiyanReminderStatusRows($centerId, 3000);
    foreach ($rows as $r) if ($r['appointmentId'] === $appointmentId) return $r;
    return ['appointmentId'=>$appointmentId,'status'=>$status];
}

function bastiyanProcessAppointmentRemindersForCenter(string $centerId): array {
    if (!bastianDbEnabled()) return ['success'=>false,'error'=>'DATABASE_NOT_CONFIGURED','processed'=>0,'sent'=>0];
    bastiyanEnsureAppointmentReminderSchema();
    $lockPath = UPDATE_RUNTIME_DIR . 'appointment-reminder-' . preg_replace('/[^a-zA-Z0-9_-]/', '', $centerId) . '.lock';
    $lock = @fopen($lockPath, 'c+');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) { if ($lock) fclose($lock); return ['success'=>true,'busy'=>true,'processed'=>0,'sent'=>0]; }
    try {
        $current = bastianDbGetState($centerId);
        if (!$current || !is_array($current['state'] ?? null)) return ['success'=>true,'processed'=>0,'sent'=>0];
        $state = $current['state'];
        $settings = is_array($state['settings'] ?? null) ? $state['settings'] : [];
        if (array_key_exists('smsAppointmentReminderEnabled', $settings) && !$settings['smsAppointmentReminderEnabled']) return ['success'=>true,'disabled'=>true,'processed'=>0,'sent'=>0];
        // 4.5.5: fixed two-step appointment reminders: 48h and 24h before the appointment.
        // Keep the legacy setting as a master enable/disable switch for compatibility.
        $reminderOffsets = [48, 24];
        $now = time();
        $clinicName = trim((string)($settings['clinicName'] ?? '')) ?: 'مرکز درمانی';
        $template = trim((string)($settings['smsAppointmentReminderTemplate'] ?? ''));
        if ($template === '') $template = 'بیمار گرامی {patient_name}، یادآوری نوبت {appointment_type}: {service_name} در {clinic_name}، تاریخ {date} ساعت {time} نزد {doctor_name}. لطفاً در زمان مقرر مراجعه فرمایید.';
        $apiKey = bastianDbIntegrationValue($centerId, 'kavenegar', 'apiKey', defined('KAVENEGAR_API_KEY') ? KAVENEGAR_API_KEY : '');
        $sender = bastianDbIntegrationValue($centerId, 'kavenegar', 'sender', (string)($settings['smsSenderLine'] ?? ''));
        $existingRows = bastiyanReminderStatusRows($centerId, 3000);
        $existing = [];
        foreach ($existingRows as $row) $existing[$row['appointmentId']] = $row;
        $processed = 0; $sent = 0; $failed = 0; $skipped = 0; $results = [];
        foreach ((array)($state['appointments'] ?? []) as $appointment) {
            if (!is_array($appointment)) continue;
            $appointmentId = trim((string)($appointment['id'] ?? ''));
            if ($appointmentId === '') continue;
            $status = strtolower(trim((string)($appointment['status'] ?? 'scheduled')));
            if (in_array($status, ['cancelled','canceled','completed','discharged','no_show','noshow'], true)) { $skipped++; continue; }
            $appointmentTs = bastiyanAppointmentTimestamp($appointment);
            if (!$appointmentTs) { $skipped++; continue; }
            foreach ($reminderOffsets as $hoursBefore) {
                $reminderType = $hoursBefore === 48 ? '48h' : '24h';
                $secondsUntil = $appointmentTs - $now;
                // Run inside a +/-10 minute scheduler window around each target time.
                if ($secondsUntil <= 0 || $secondsUntil > ($hoursBefore * 3600) || $secondsUntil < (($hoursBefore * 3600) - 10 * 60)) continue;
                $previous = null;
                foreach (($existingRows ?? []) as $existingRow) {
                    if (($existingRow['appointmentId'] ?? '') === $appointmentId && ($existingRow['reminderType'] ?? '') === $reminderType) { $previous = $existingRow; break; }
                }
                if (($previous['status'] ?? '') === 'sent') continue;
                if (!empty($previous['lastAttemptAt']) && time() - strtotime((string)$previous['lastAttemptAt']) < 10 * 60) continue;
                $mobile = bastiyanNormalizeIranianMobile((string)($appointment['mobilePhone'] ?? ''));
                $processed++;
                $message = strtr($template, [
                '{patient_name}' => (string)($appointment['patientName'] ?? 'بیمار گرامی'),
                '{clinic_name}' => $clinicName,
                '{date}' => (string)($appointment['jalaliDate'] ?? ''),
                '{time}' => (string)($appointment['timeSlot'] ?? ''),
                '{doctor_name}' => (string)($appointment['doctorName'] ?? 'پزشک معالج'),
                '{service_name}' => (string)($appointment['title'] ?? $appointment['serviceName'] ?? $appointment['serviceTitle'] ?? 'خدمت / عمل'),
                '{appointment_type}' => ((string)($appointment['type'] ?? '') === 'hospital' ? 'عمل / خدمت بیمارستان گنجی' : 'نوبت خدمت سرپایی مرکز'),
            ]);
            $attemptedAt = date('c');
            if ($mobile === '') {
                $row = bastiyanRecordAppointmentReminderResult($centerId, $appointment, 'failed', ['source'=>'automatic','attemptedAt'=>$attemptedAt,'error'=>'شماره همراه بیمار معتبر نیست.','incrementAttempts'=>true,'hoursBefore'=>$hoursBefore,'reminderType'=>$reminderType]);
                $failed++; $results[] = $row; continue;
            }
            if ($apiKey === '') {
                $row = bastiyanRecordAppointmentReminderResult($centerId, $appointment, 'waiting_configuration', ['source'=>'automatic','attemptedAt'=>$attemptedAt,'error'=>'کلید سرویس پیامکی کاوه‌نگار برای مرکز تنظیم نشده است.','hoursBefore'=>$hoursBefore]);
                $failed++; $results[] = $row; continue;
            }
            $postData = ['receptor'=>$mobile, 'message'=>$message];
            if ($sender !== '') $postData['sender'] = $sender;
            $url = 'https://api.kavenegar.com/v1/' . rawurlencode($apiKey) . '/sms/send.json';
            $res = bastiyanReminderHttpPost($url, $postData, 12);
            $data = json_decode((string)$res['response'], true);
            $ok = $res['code'] === 200 && is_array($data) && (int)($data['return']['status'] ?? 0) === 200;
            $providerMessageId = null;
            if ($ok && !empty($data['entries'][0]['messageid'])) $providerMessageId = (string)$data['entries'][0]['messageid'];
            $error = $ok ? null : (string)($data['return']['message'] ?? $res['error'] ?? ('HTTP ' . $res['code']));
            $row = bastiyanRecordAppointmentReminderResult($centerId, $appointment, $ok ? 'sent' : 'failed', [
                'source'=>'automatic','attemptedAt'=>$attemptedAt,'sentAt'=>$ok ? date('c') : null,'provider'=>'kavenegar',
                'providerMessageId'=>$providerMessageId,'error'=>$error,'incrementAttempts'=>true,'hoursBefore'=>$hoursBefore,'reminderType'=>$reminderType,
            ]);
            bastiyanReminderAppendSmsLog($centerId, $mobile, $message, $ok, [
                'appointmentId'=>$appointmentId,'patientId'=>$appointment['patientId'] ?? null,'patientName'=>$appointment['patientName'] ?? '',
                'provider'=>'kavenegar','providerMessageId'=>$providerMessageId,'error'=>$error,'automatic'=>true,
            ]);
            if ($ok) $sent++; else $failed++;
            $results[] = $row;
            }
        }
        return ['success'=>true,'centerId'=>$centerId,'processed'=>$processed,'sent'=>$sent,'failed'=>$failed,'skipped'=>$skipped,'reminderOffsets'=>$reminderOffsets,'results'=>$results];
    } finally {
        flock($lock, LOCK_UN); fclose($lock);
    }
}

function bastiyanProcessAppointmentRemindersAllCenters(): array {
    if (!bastianDbEnabled()) return ['success'=>false,'error'=>'DATABASE_NOT_CONFIGURED','centers'=>[]];
    bastiyanEnsureAppointmentReminderSchema();
    $rows = bastianPdo()->query("SELECT id FROM bastian_centers WHERE active=1 AND archived=0")->fetchAll();
    $results = []; $sent = 0; $processed = 0;
    foreach ($rows as $row) {
        try {
            $r = bastiyanProcessAppointmentRemindersForCenter((string)$row['id']);
            $results[] = $r; $sent += (int)($r['sent'] ?? 0); $processed += (int)($r['processed'] ?? 0);
        } catch (Throwable $e) { $results[] = ['centerId'=>$row['id'],'success'=>false,'error'=>$e->getMessage()]; }
    }
    return ['success'=>true,'processed'=>$processed,'sent'=>$sent,'centers'=>$results,'runAt'=>date('c')];
}
