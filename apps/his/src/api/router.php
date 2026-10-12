<?php
/**
 * Bastian HIS - Healthcare Information System
 * Backend API Router for NetAfraz / DirectAdmin PHP Shared Hosting
 */

require_once __DIR__ . '/config.php';
if (is_file(__DIR__ . '/recovery_lib.php')) require_once __DIR__ . '/recovery_lib.php';
if (is_file(__DIR__ . '/updater.php')) require_once __DIR__ . '/updater.php';
if (is_file(__DIR__ . '/appointment_reminder_lib.php')) require_once __DIR__ . '/appointment_reminder_lib.php';
if (is_file(__DIR__ . '/pos_samankish_lib.php')) require_once __DIR__ . '/pos_samankish_lib.php';

header('Content-Type: application/json; charset=utf-8');

// Parse request URI and route path
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove leading /api/ or /api if present
$route = $_GET['route'] ?? '';
if (empty($route)) {
    $route = preg_replace('#^.*/api/#', '', $uri);
    $route = trim($route, '/');
}

$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true) ?? [];

// Helper function to send cURL HTTP requests
function httpCurlRequest($url, $method = 'GET', $headers = [], $postData = null, $timeout = 15) {
    if (!function_exists('curl_init')) {
        return ['code' => 0, 'response' => '', 'error' => 'افزونه PHP cURL روی هاست فعال نیست.'];
    }
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($postData !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($postData) ? http_build_query($postData) : $postData);
        }
    } else if ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'response' => $response,
        'error' => $error
    ];
}



function bastianClientPublicBaseUrl(): string {
    $https = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || strtolower(trim((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))) === 'https';
    $scheme = $https ? 'https' : 'http';
    $host = trim((string)($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? ''));
    if (str_contains($host, ',')) $host = trim(explode(',', $host)[0]);
    if (!preg_match('/^[A-Za-z0-9.-]+(?::\d{1,5})?$/', $host)) {
        $host = preg_replace('/[^A-Za-z0-9.:-]/', '', (string)($_SERVER['SERVER_NAME'] ?? 'localhost')) ?: 'localhost';
    }
    $script = str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '/api/router.php'));
    $basePath = str_replace('\\', '/', dirname(dirname($script)));
    if ($basePath === '/' || $basePath === '.' || $basePath === '\\') $basePath = '';
    return rtrim($scheme . '://' . $host . '/' . trim($basePath, '/'), '/');
}

function bastianClientServerId(?string $serverUrl = null): string {
    $serverUrl = strtolower(rtrim((string)($serverUrl ?: bastianClientPublicBaseUrl()), '/'));
    return substr(hash('sha256', $serverUrl), 0, 16);
}

function bastianBuildStoredZip(array $entries): string {
    $local = '';
    $central = '';
    $offset = 0;
    $now = getdate();
    $dosTime = (($now['hours'] & 0x1f) << 11) | (($now['minutes'] & 0x3f) << 5) | ((int)($now['seconds'] / 2) & 0x1f);
    $dosDate = (((max(1980, $now['year']) - 1980) & 0x7f) << 9) | (($now['mon'] & 0x0f) << 5) | ($now['mday'] & 0x1f);
    $count = 0;
    foreach ($entries as $name => $content) {
        $name = str_replace('\\', '/', (string)$name);
        if ($name === '' || str_starts_with($name, '/') || str_contains($name, '..')) throw new RuntimeException('نام فایل ZIP نامعتبر است.');
        $content = (string)$content;
        $nameLen = strlen($name);
        $size = strlen($content);
        $crc = (int)hexdec(hash('crc32b', $content));
        $localHeader = pack('VvvvvvVVVvv', 0x04034b50, 20, 0, 0, $dosTime, $dosDate, $crc, $size, $size, $nameLen, 0);
        $local .= $localHeader . $name . $content;
        $centralHeader = pack('VvvvvvvVVVvvvvvVV', 0x02014b50, 20, 20, 0, 0, $dosTime, $dosDate, $crc, $size, $size, $nameLen, 0, 0, 0, 0, 0, $offset);
        $central .= $centralHeader . $name;
        $offset += strlen($localHeader) + $nameLen + $size;
        $count++;
    }
    $centralOffset = strlen($local);
    $centralSize = strlen($central);
    $end = pack('VvvvvVVv', 0x06054b50, 0, 0, $count, $count, $centralSize, $centralOffset, 0);
    return $local . $central . $end;
}

// Safe JSON file helpers
function readJsonFileSafe($path, $default = []) {
    if (!file_exists($path)) return $default;
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') return $default;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $default;
}

function writeJsonFileAtomic($path, $data) {
    $dir = dirname($path);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

function appendSmsLog($type, $mobile, $message, $success, $details = []) {
    global $REQUEST_SESSION;
    $path = DATA_DIR . 'sms_logs.json';
    $logs = readJsonFileSafe($path, []);
    array_unshift($logs, array_merge([
        'id' => 'sms-' . round(microtime(true) * 1000),
        'centerId' => (string)($REQUEST_SESSION['centerId'] ?? ''),
        'type' => $type,
        'mobile' => $mobile,
        'message' => $message,
        'success' => (bool)$success,
        'createdAt' => date('c'),
    ], $details));
    if (count($logs) > 2000) $logs = array_slice($logs, 0, 2000);
    writeJsonFileAtomic($path, $logs);
}

function taminHeaders($accessToken = '') {
    $headers = ['Accept: application/json', 'Content-Type: application/json'];
    $token = trim((string)$accessToken);
    if ($token !== '') {
        $headers[] = 'Authorization: ' . (strpos($token, 'Bearer ') === 0 ? $token : 'Bearer ' . $token);
    }
    return $headers;
}

function decodeRemoteJson($response) {
    $data = json_decode((string)$response, true);
    return is_array($data) ? $data : null;
}



function changedTopLevelStateKeys(array $current, array $next): array {
    $keys=array_unique(array_merge(array_keys($current),array_keys($next)));$changed=[];
    foreach($keys as $k){if($k==='users')continue;$a=$current[$k]??null;$b=$next[$k]??null;if(json_encode($a,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)!==json_encode($b,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))$changed[]=$k;}
    return $changed;
}
function enforceCenterStatePermissions(array $session, array $current, array $next): void {
    if(($session['role']??'')==='superadmin')return;
    $role=(string)($session['userRole']??'');if($role==='admin')return;
    $common=['attendanceRequests','attendanceRecords','supplyRequests','auditLogs'];
    $engine=['encounters','transactions','billingDocuments','engineMeta'];
    $map=[
      'doctor'=>array_merge($common,$engine,['patients','visitQueue','treatmentPlans','appointments','medicalServices','signedConsents','consentDocuments','taminPrescriptions','products','stockMovements','salesInvoices','customServiceLibrary']),
      'nurse'=>array_merge($common,$engine,['patients','visitQueue','treatmentPlans','appointments','signedConsents','consentDocuments','products','internalConsumptions','stockMovements','salesInvoices']),
      'cashier'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','wastageRecords','smsLogs','signedConsents','consentDocuments','paymentReceipts','discountRecords','customServiceLibrary']),
      'receptionist'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','smsLogs','paymentReceipts','discountRecords']),
      'secretary'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','smsLogs','paymentReceipts','discountRecords']),
      'front_desk'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','smsLogs','paymentReceipts','discountRecords']),
      'inventory_manager'=>array_merge($common,['products','categories','warehouses','stockMovements','purchaseInvoices','internalConsumptions','wastageRecords']),
      'accountant'=>array_merge($common,$engine,['expenses','salesInvoices','purchaseInvoices','patients','stockMovements','payrolls','staffAccounts','shifts','visitQueue','products','paymentReceipts','discountRecords','customServiceLibrary']),
      'purchaser'=>array_merge($common,['purchaseInvoices','products','stockMovements']),
      'operating_room_supervisor'=>array_merge($common,$engine,['patients','visitQueue','treatmentPlans','appointments','signedConsents','products','internalConsumptions','stockMovements','salesInvoices']),
      'inspector'=>$common,
    ];
    $allowed=$map[$role]??['auditLogs'];$changed=changedTopLevelStateKeys($current,$next);$denied=array_values(array_diff($changed,$allowed));
    if($denied){http_response_code(403);echo json_encode(['success'=>false,'error'=>'سطح دسترسی این کاربر اجازه تغییر این بخش‌ها را نمی‌دهد.','deniedKeys'=>$denied],JSON_UNESCAPED_UNICODE);exit;}
}

function bastianAllowedCenterStateKeys(array $session): ?array {
    if(($session['role']??'')==='superadmin') return null;
    $role=(string)($session['userRole']??'');
    if($role==='admin') return null;
    $common=['attendanceRequests','attendanceRecords','supplyRequests','auditLogs'];
    $engine=['encounters','transactions','billingDocuments','engineMeta'];
    $map=[
      'doctor'=>array_merge($common,$engine,['patients','visitQueue','treatmentPlans','appointments','medicalServices','signedConsents','consentDocuments','taminPrescriptions','products','stockMovements','salesInvoices','customServiceLibrary']),
      'nurse'=>array_merge($common,$engine,['patients','visitQueue','treatmentPlans','appointments','signedConsents','consentDocuments','products','internalConsumptions','stockMovements','salesInvoices']),
      'cashier'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','wastageRecords','smsLogs','signedConsents','consentDocuments','paymentReceipts','discountRecords','customServiceLibrary']),
      'receptionist'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','smsLogs','paymentReceipts','discountRecords']),
      'secretary'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','smsLogs','paymentReceipts','discountRecords']),
      'front_desk'=>array_merge($common,$engine,['patients','visitQueue','appointments','products','stockMovements','salesInvoices','smsLogs','paymentReceipts','discountRecords']),
      'inventory_manager'=>array_merge($common,['products','categories','warehouses','stockMovements','purchaseInvoices','internalConsumptions','wastageRecords']),
      'accountant'=>array_merge($common,$engine,['expenses','salesInvoices','purchaseInvoices','patients','stockMovements','payrolls','staffAccounts','shifts','workSchedules','payrollAdjustments','visitQueue','products','paymentReceipts','discountRecords','customServiceLibrary']),
      'purchaser'=>array_merge($common,['purchaseInvoices','products','stockMovements']),
      'operating_room_supervisor'=>array_merge($common,$engine,['patients','visitQueue','treatmentPlans','appointments','signedConsents','products','internalConsumptions','stockMovements','salesInvoices']),
      'inspector'=>$common,
    ];
    return array_values(array_unique($map[$role]??['auditLogs']));
}

function filterCenterStatePatchForSession(array $session,array $patch): array {
    $allowed=bastianAllowedCenterStateKeys($session);
    if($allowed===null) return ['patch'=>$patch,'ignored'=>[]];
    $safe=[];$ignored=[];
    foreach($patch as $key=>$value){
        if(in_array((string)$key,$allowed,true)) $safe[$key]=$value;
        else $ignored[]=(string)$key;
    }
    return ['patch'=>$safe,'ignored'=>$ignored];
}


function safeCenterId($centerId) {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$centerId);
    return $id !== '' ? $id : null;
}

function centerDataDirectory($centerId) {
    $id = safeCenterId($centerId);
    if (!$id) return null;
    $dir = CENTERS_DATA_DIR . $id . '/';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    if (!is_dir($dir . 'backups/')) @mkdir($dir . 'backups/', 0755, true);
    return $dir;
}

function bearerToken() {
    global $jsonInput;
    $bodyFallback = trim((string)($jsonInput['_bastiyanToken'] ?? ''));
    if ($bodyFallback !== '') return preg_replace('/^Bearer\s+/i', '', $bodyFallback);
    // Reliable fallback for NetAfraz/LiteSpeed security layers that remove
    // Authorization specifically from JSON POST requests.
    $fallback = trim((string)($_SERVER['HTTP_X_BASTIYAN_TOKEN'] ?? $_SERVER['HTTP_X_API_KEY'] ?? ''));
    if ($fallback !== '') return preg_replace('/^Bearer\s+/i', '', $fallback);
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? $_SERVER['HTTP_REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if (!$header && function_exists('getallheaders')) {
        $headers = getallheaders();
        $fallback = trim((string)($headers['X-Bastiyan-Token'] ?? $headers['x-bastiyan-token'] ?? $headers['X-API-Key'] ?? $headers['x-api-key'] ?? ''));
        if ($fallback !== '') return preg_replace('/^Bearer\s+/i', '', $fallback);
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', trim($header), $m)) return trim($m[1]);
    return (string)($_COOKIE[defined('BASTIAN_SESSION_COOKIE') ? BASTIAN_SESSION_COOKIE : 'bastian_session'] ?? '');
}

function loadSessions() {
    if (bastianDbEnabled()) return []; // SQLite-backed sessions are validated directly.
    $rows = readJsonFileSafe(SESSIONS_FILE, []);
    $now = time();
    $rows = array_values(array_filter($rows, function($s) use ($now) {
        return !empty($s['expiresAt']) && (int)$s['expiresAt'] > $now;
    }));
    return $rows;
}

function createAccessToken($role, $centerId = null, $userId = null) {
    if (bastianDbEnabled()) return bastianDbCreateSession($role, $centerId, $userId);
    $plain = bin2hex(random_bytes(32));
    $sessions = loadSessions();
    $sessions[] = [
        'hash' => hash('sha256', $plain), 'role' => $role, 'centerId' => $centerId, 'userId' => $userId,
        'createdAt' => time(), 'expiresAt' => time() + BASTIAN_ACCESS_TOKEN_TTL,
    ];
    if (count($sessions) > 300) $sessions = array_slice($sessions, -300);
    writeJsonFileAtomic(SESSIONS_FILE, $sessions);
    return $plain;
}

function validateAccessToken($allowedRoles = [], $centerId = null) {
    $plain = bearerToken();
    if ($plain === '') return null;
    if (bastianDbEnabled()) {
        try {
            $session = bastianDbValidateSession($plain, $allowedRoles, $centerId);
            if ($session) bastianSetSessionCookie($plain);
            return $session;
        } catch (Throwable $e) { return null; }
    }
    $hash = hash('sha256', $plain);
    foreach (loadSessions() as $s) {
        if (!hash_equals((string)($s['hash'] ?? ''), $hash)) continue;
        if ($allowedRoles && !in_array($s['role'] ?? '', $allowedRoles, true)) continue;
        if ($centerId && ($s['role'] ?? '') !== 'superadmin' && ($s['centerId'] ?? '') !== $centerId) continue;
        return $s;
    }
    return null;
}

function requireAccess($allowedRoles = [], $centerId = null) {
    $session = validateAccessToken($allowedRoles, $centerId);
    if (!$session) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'نشست معتبر نیست یا منقضی شده است. دوباره وارد شوید.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $session;
}

function gregorianToJalali($gy, $gm, $gd) {
    $gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
    $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
    $days = 355666 + (365 * $gy) + intdiv($gy2 + 3, 4) - intdiv($gy2 + 99, 100) + intdiv($gy2 + 399, 400) + $gd + $gdm[$gm - 1];
    $jy = -1595 + (33 * intdiv($days, 12053));
    $days %= 12053;
    $jy += 4 * intdiv($days, 1461);
    $days %= 1461;
    if ($days > 365) { $jy += intdiv($days - 1, 365); $days = ($days - 1) % 365; }
    if ($days < 186) { $jm = 1 + intdiv($days, 31); $jd = 1 + ($days % 31); }
    else { $jm = 7 + intdiv($days - 186, 30); $jd = 1 + (($days - 186) % 30); }
    return [$jy, $jm, $jd];
}

function currentJalaliDate() {
    [$jy,$jm,$jd] = gregorianToJalali((int)date('Y'), (int)date('n'), (int)date('j'));
    return sprintf('%04d/%02d/%02d', $jy, $jm, $jd);
}

function normalizeJalali($value) {
    $v = str_replace('-', '/', trim((string)$value));
    $p = explode('/', $v);
    if (count($p) !== 3) return $v;
    return sprintf('%04d/%02d/%02d', (int)$p[0], (int)$p[1], (int)$p[2]);
}

function backupCenterState($centerId, $force = false) {
    $dir = centerDataDirectory($centerId);
    if (!$dir) return false;
    $state = $dir . 'state.json';
    if (!file_exists($state)) return false;
    $backupDir = $dir . 'backups/';
    $latestMeta = $backupDir . 'latest.meta';
    $last = file_exists($latestMeta) ? (int)@file_get_contents($latestMeta) : 0;
    if (!$force && (time() - $last) < BASTIAN_BACKUP_INTERVAL) return true;
    $name = 'backup_' . date('Ymd_His') . '.json';
    if (!@copy($state, $backupDir . $name)) return false;
    @file_put_contents($latestMeta, (string)time(), LOCK_EX);
    $files = glob($backupDir . 'backup_*.json') ?: [];
    rsort($files);
    foreach (array_slice($files, BASTIAN_BACKUP_RETENTION) as $old) @unlink($old);
    return true;
}

function publicCenter($center) {
    $copy = $center;
    unset($copy['adminPasswordHash']);
    unset($copy['adminPassword']);
    if (isset($copy['users'])) {
        $copy['users'] = array_map(function($u) { unset($u['password']); return $u; }, $copy['users']);
    }
    return $copy;
}

function initialCenterState($center) {
    $id = (string)($center['id'] ?? '');
    $name = (string)($center['name'] ?? 'مرکز درمانی');
    $phone = (string)($center['phone'] ?? '');
    $endDate = (string)($center['endDate'] ?? '');
    $adminUser = [
        'id' => 'center-admin-' . $id,
        'name' => 'مدیر مرکز ' . $name,
        'username' => 'admin',
        'role' => 'admin',
        'status' => 'active',
        'active' => true,
        'department' => 'مدیریت مرکز',
    ];
    return [
        'currentCenterId' => $id,
        'medicalCenters' => [publicCenter($center)],
        'settings' => [
            'clinicName' => $name,
            'holdingName' => 'سامانه جامع پزشکی باستیان',
            'address' => (string)($center['address'] ?? ''),
            'phone' => $phone,
            'website' => '',
            'logoUrl' => '/logo.jpg',
            'currencyUnit' => 'toman',
            'enableSmsInvoice' => false,
            'printBarcodeOnInvoice' => true,
            'scannerModeDefault' => 'hardware',
            'allowNegativeStockWithAdmin' => true,
            'workingHoursStart' => '08:00',
            'workingHoursEnd' => '21:00',
            'autoTurnNumberResetDaily' => true,
            'requireDoctorSelection' => false,
            'allowDuplicatePatients' => false,
            'invoicePaperSize' => 'A5',
            'showClinicAddressOnInvoice' => true,
            'showDoctorMedicalCodeOnInvoice' => true,
            'invoiceNotes' => '',
            'taxPercentage' => 0,
            'enableTaminInsurance' => true,
            'enableSalamatInsurance' => true,
            'defaultPaymentMethod' => 'pos',
            'autoBackupIntervalHours' => 24,
            'requireConfirmOnDelete' => true,
            'partnerShares' => [],
            'licenseEndDate' => $endDate,
            'licenseStatus' => !empty($center['active']) ? 'active' : 'suspended',
            'licensePlanName' => (string)($center['planName'] ?? 'standard'),
            'licenseContactPhone' => '',
        ],
        'users' => [$adminUser],
        'doctors' => [], 'categories' => [], 'warehouses' => [],
        'serviceCategories' => [], 'reportCategories' => [], 'products' => [],
        'patients' => [], 'visitQueue' => [], 'medicalServices' => [],
        'treatmentPlans' => [], 'appointments' => [], 'signedConsents' => [],
        'expenses' => [], 'smsLogs' => [], 'stockMovements' => [],
        'salesInvoices' => [], 'encounters' => [], 'transactions' => [], 'billingDocuments' => [],
        'engineMeta' => ['version' => 1, 'migratedAt' => null], 'purchaseInvoices' => [], 'supplyRequests' => [],
        'internalConsumptions' => [], 'wastageRecords' => [], 'auditLogs' => [],
        'taminPrescriptions' => [], 'shifts' => [], 'attendanceRecords' => [],
        'attendanceRequests' => [], 'payrolls' => [], 'staffAccounts' => [],
    ];
}

function syncDbCenterMetadataIntoState($center) {
    if (!bastianDbEnabled()) return false;
    $id = (string)($center['id'] ?? '');
    if ($id === '') return false;
    // Center metadata is read directly from bastian_centers by online-data.
    // Touch the online revision so already-open clients immediately receive it.
    bastianDbOnlineTouch($id,'center-metadata');
    return true;
}

function ensureCenterState($center) {
    $dir = centerDataDirectory($center['id'] ?? '');
    if (!$dir) return false;
    $statePath = $dir . 'state.json';
    if (!file_exists($statePath)) return writeJsonFileAtomic($statePath, initialCenterState($center));
    return true;
}

function syncCenterMetadataIntoState($center) {
    $dir = centerDataDirectory($center['id'] ?? '');
    if (!$dir) return false;
    $statePath = $dir . 'state.json';
    if (!file_exists($statePath)) return ensureCenterState($center);
    $state = readJsonFileSafe($statePath, initialCenterState($center));
    $state['currentCenterId'] = $center['id'];
    $state['settings'] = array_merge($state['settings'] ?? [], [
        'clinicName' => (string)($center['name'] ?? ''),
        'phone' => (string)($center['phone'] ?? ''),
        'licenseEndDate' => (string)($center['endDate'] ?? ''),
        'licenseStatus' => !empty($center['active']) && empty($center['archived']) ? 'active' : 'suspended',
        'licensePlanName' => (string)($center['planName'] ?? 'standard'),
    ]);
    $state['medicalCenters'] = [publicCenter($center)];
    return writeJsonFileAtomic($statePath, $state);
}

// Helper to get/save Bastian Store JSON
function getBastianStore() {
    $filePath = DATA_DIR . 'bastian_cloud_store.json';
    $data = readJsonFileSafe($filePath, []);
    if (!isset($data['centers']) || !is_array($data['centers'])) $data['centers'] = [];
    if (!isset($data['tickets']) || !is_array($data['tickets'])) $data['tickets'] = [];
    return $data;
}

function saveBastianStore($data) {
    $filePath = DATA_DIR . 'bastian_cloud_store.json';
    return writeJsonFileAtomic($filePath, $data);
}

function sanitizeCenterStateForStorage(array $state, ?array $center=null): array {
    unset($state['users']);
    if(!isset($state['settings']) || !is_array($state['settings'])) $state['settings']=[];
    if(is_array($state['settings'])){
        unset($state['settings']['smsApiKey'],$state['settings']['identityInquiryApiKey'],$state['settings']['licenseKey']);
        if($center){
            $state['settings']['clinicName']=(string)($center['name']??'');
            $state['settings']['phone']=(string)($center['phone']??'');
            $state['settings']['address']=(string)($center['address']??'');
            $state['settings']['city']=(string)($center['city']??'');
            $state['settings']['centerCode']=(string)($center['code']??'');
            $state['settings']['centerType']=(string)($center['centerType']??'clinic');
            $state['settings']['licenseEndDate']=(string)($center['endDate']??'');
            $state['settings']['licenseStatus']=(!empty($center['active'])&&empty($center['archived']))?'active':'suspended';
            $state['settings']['licensePlanName']=(string)($center['planName']??'standard');
        }
    }
    if(isset($state['taminConfig'])&&is_array($state['taminConfig'])) unset($state['taminConfig']['accessToken'],$state['taminConfig']['refreshToken'],$state['taminConfig']['codeVerifier'],$state['taminConfig']['codeChallenge'],$state['taminConfig']['state']);
    if(isset($state['salamatConfig'])&&is_array($state['salamatConfig'])) unset($state['salamatConfig']['clientSecret'],$state['salamatConfig']['password'],$state['salamatConfig']['accessToken']);
    if($center) $state['medicalCenters']=[publicCenter($center)];
    return $state;
}

function bastianRequestCenterId(): string {
    global $REQUEST_SESSION;
    return (string)($REQUEST_SESSION['centerId'] ?? '');
}

function bastianServiceValue(string $provider, string $field, string $fallback=''): string {
    $centerId = bastianRequestCenterId();
    if ($centerId !== '' && bastianDbEnabled()) return bastianDbIntegrationValue($centerId, $provider, $field, $fallback);
    return $fallback;
}

function bastianMaskedSecret(string $value): string {
    $length = strlen($value);
    if ($length === 0) return '';
    return str_repeat('•', min(8, max(4, $length - 4))) . substr($value, -4);
}

function bastianNormalizeMobile(string $value): string {
    $v = trim($value);
    $v = strtr($v, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);
    $v = preg_replace('/[^0-9+]/', '', $v) ?? '';
    if (str_starts_with($v, '+98')) $v = '0' . substr($v, 3);
    if (str_starts_with($v, '0098')) $v = '0' . substr($v, 4);
    return $v;
}

function bastianKavenegarWebhookToken(string $centerId): string {
    $key = defined('BASTIAN_DATA_ENCRYPTION_KEY') ? (string)BASTIAN_DATA_ENCRYPTION_KEY : '';
    if ($key === '') $key = defined('KAVENEGAR_API_KEY') ? (string)KAVENEGAR_API_KEY : '';
    if ($key === '') $key = 'bastiyan-kavenegar-webhook';
    return substr(hash_hmac('sha256', 'kavenegar-incoming-v1|' . $centerId, $key), 0, 40);
}

function bastianKavenegarWebhookUrl(string $centerId): string {
    return rtrim(bastianClientPublicBaseUrl(), '/') . '/api/webhook/kavenegar/incoming?center=' . rawurlencode($centerId) . '&token=' . rawurlencode(bastianKavenegarWebhookToken($centerId));
}

function bastianFindCenterByKavenegarLine(string $toLine): array {
    $normalized = trim($toLine);
    if ($normalized === '' || !bastianDbEnabled()) return [];
    $matches = [];
    foreach (bastianDbCenters(false) as $center) {
        $id = (string)($center['id'] ?? '');
        if ($id === '') continue;
        $cfg = bastianDbIntegrationConfig($id, 'kavenegar');
        $sender = trim((string)($cfg['sender'] ?? ''));
        if ($sender !== '' && ($sender === $normalized || bastianNormalizeMobile($sender) === bastianNormalizeMobile($normalized))) $matches[] = $id;
    }
    return $matches;
}

// Default-deny protection for operational APIs. Only bootstrap/login endpoints are public.
$publicRoutes = ['health', 'system/version', 'local/status', 'client/bootstrap', 'client/download/windows', 'bastian/admin/login', 'bastian/license/validate', 'bastian/device/refresh', 'webhook/kavenegar/incoming'];
$REQUEST_SESSION = null;
if (!in_array($route, $publicRoutes, true)) {
    $REQUEST_SESSION = requireAccess(['center', 'superadmin']);
}

// ROUTER SWITCH

/* -------------------- Lilian AI Tool Engine R12 -------------------- */
function lilianNormalizeText(string $value): string {
    $v = mb_strtolower(trim($value), 'UTF-8');
    return str_replace(['ي','ك','‌'], ['ی','ک',' '], $v);
}
function lilianIsSuperAdmin(array $session): bool {
    return (($session['role'] ?? '') === 'superadmin');
}
function lilianUserRole(array $session): string {
    return (string)($session['userRole'] ?? ($session['role'] ?? ''));
}
function lilianCenterId(array $session): string {
    return safeCenterId((string)($session['centerId'] ?? '')) ?: '';
}
function lilianAllowedTools(array $session): array {
    $role = lilianUserRole($session);
    $commonRead = ['search_patients','today_patients','queue_status','appointments_today'];
    $map = [
      'doctor' => $commonRead,
      'nurse' => $commonRead,
      'cashier' => array_merge($commonRead,['financial_summary']),
      'receptionist' => $commonRead,
      'secretary' => $commonRead,
      'front_desk' => $commonRead,
      'inventory_manager' => ['inventory_search'],
      'accountant' => array_merge($commonRead,['financial_summary','inventory_search']),
      'admin' => array_merge($commonRead,['financial_summary','inventory_search','center_summary']),
    ];
    if (lilianIsSuperAdmin($session)) {
        return ['search_patients','today_patients','queue_status','appointments_today','financial_summary','inventory_search','center_summary','query_collection','patient_contacts','create_center_backup','create_system_snapshot'];
    }
    return $map[$role] ?? $commonRead;
}
function lilianCurrentState(array $session): array {
    $centerId = lilianCenterId($session);
    if ($centerId === '') return [];
    $online = bastianDbOnlineRead($centerId, true);
    $state = $online['state'] ?? [];
    return is_array($state) ? $state : [];
}
function lilianTodayMatch($value): bool {
    if (!$value) return false;
    $s = (string)$value;
    $ts = strtotime($s);
    if ($ts) return date('Y-m-d',$ts) === date('Y-m-d');
    return str_contains($s, currentJalaliDate());
}
function lilianPatientText(array $p): string {
    return lilianNormalizeText(implode(' ', [
      $p['fullName'] ?? '', $p['firstName'] ?? '', $p['lastName'] ?? '',
      $p['nationalId'] ?? '', $p['mobilePhone'] ?? ($p['mobile'] ?? ''),
      $p['fileNumber'] ?? ($p['patientCode'] ?? '')
    ]));
}
function lilianExecuteTool(string $tool,array $args,array $session): array {
    $allowed = lilianAllowedTools($session);
    if (!in_array($tool,$allowed,true)) throw new RuntimeException('LILIAN_TOOL_FORBIDDEN');
    $state = lilianCurrentState($session);
    $centerId = lilianCenterId($session);

    if ($tool === 'search_patients') {
        $q = lilianNormalizeText((string)($args['query'] ?? ''));
        $rows = array_values(array_filter((array)($state['patients'] ?? []), function($p) use($q) {
            return is_array($p) && ($q === '' || str_contains(lilianPatientText($p), $q));
        }));
        $rows = array_slice($rows,0,30);
        return ['tool'=>$tool,'count'=>count($rows),'patients'=>array_map(fn($p)=>[
          'id'=>$p['id']??'','fullName'=>$p['fullName']??trim(($p['firstName']??'').' '.($p['lastName']??'')),
          'fileNumber'=>$p['fileNumber']??($p['patientCode']??''),'nationalId'=>$p['nationalId']??'',
          'mobile'=>$p['mobilePhone']??($p['mobile']??''),'age'=>$p['age']??null,
          'debt'=>$p['creditConfig']['currentDebt']??0,'createdAt'=>$p['createdAt']??''
        ],$rows)];
    }
    if ($tool === 'today_patients') {
        $patients = (array)($state['patients'] ?? []);
        $queue = (array)($state['visitQueue'] ?? []);
        $ids = [];
        foreach($patients as $p) if(is_array($p) && lilianTodayMatch($p['createdAt']??$p['registeredAt']??'')) $ids[(string)($p['id']??'')]=$p;
        foreach($queue as $q) if(is_array($q) && lilianTodayMatch($q['registeredAt']??$q['createdAt']??'')) {
            $pid=(string)($q['patientId']??''); if($pid!=='') {
                foreach($patients as $p) if(is_array($p)&&(string)($p['id']??'')===$pid) {$ids[$pid]=$p;break;}
            }
        }
        $rows=array_values($ids);
        return ['tool'=>$tool,'date'=>currentJalaliDate(),'count'=>count($rows),'patients'=>array_map(fn($p)=>[
          'fullName'=>$p['fullName']??trim(($p['firstName']??'').' '.($p['lastName']??'')),
          'fileNumber'=>$p['fileNumber']??'','nationalId'=>$p['nationalId']??'',
          'mobile'=>$p['mobilePhone']??($p['mobile']??''),'createdAt'=>$p['createdAt']??''
        ],array_slice($rows,0,100))];
    }
    if ($tool === 'queue_status') {
        $rows = array_slice((array)($state['visitQueue'] ?? []),0,100);
        return ['tool'=>$tool,'count'=>count($rows),'queue'=>array_map(fn($q)=>[
          'patientName'=>$q['patientName']??'','status'=>$q['status']??'','doctorName'=>$q['doctorName']??'',
          'turnNumber'=>$q['turnNumber']??null,'registeredAt'=>$q['registeredAt']??''
        ],$rows)];
    }
    if ($tool === 'appointments_today') {
        $rows=array_values(array_filter((array)($state['appointments']??[]),fn($a)=>is_array($a)&&(
          lilianTodayMatch($a['createdAt']??'') || normalizeJalali($a['jalaliDate']??$a['date']??'')===currentJalaliDate()
        )));
        return ['tool'=>$tool,'date'=>currentJalaliDate(),'count'=>count($rows),'appointments'=>array_slice($rows,0,100)];
    }
    if ($tool === 'inventory_search') {
        $q=lilianNormalizeText((string)($args['query']??''));
        $rows=array_values(array_filter((array)($state['products']??[]),fn($p)=>is_array($p)&&($q===''||str_contains(lilianNormalizeText(($p['name']??'').' '.($p['code']??'').' '.($p['barcode']??'')),$q))));
        return ['tool'=>$tool,'count'=>count($rows),'products'=>array_map(fn($p)=>[
          'name'=>$p['name']??'','code'=>$p['code']??'','barcode'=>$p['barcode']??'','stockQuantity'=>$p['stockQuantity']??0,'unit'=>$p['unit']??''
        ],array_slice($rows,0,50))];
    }
    if ($tool === 'financial_summary') {
        $queue=(array)($state['visitQueue']??[]);
        $sales=(array)($state['salesInvoices']??[]);
        $todayQueue=array_values(array_filter($queue,fn($x)=>is_array($x)&&lilianTodayMatch($x['registeredAt']??'')));
        $total=0;$paid=0;$due=0;
        foreach($todayQueue as $x){$total+=floatval($x['totalCost']??0);$paid+=floatval($x['paidAmount']??0);$due+=max(0,floatval($x['totalCost']??0)-floatval($x['paidAmount']??0));}
        return ['tool'=>$tool,'date'=>currentJalaliDate(),'encounters'=>count($todayQueue),'total'=>$total,'paid'=>$paid,'remaining'=>$due,'salesInvoices'=>count($sales)];
    }
    if ($tool === 'center_summary') {
        return ['tool'=>$tool,'centerId'=>$centerId,'counts'=>[
          'patients'=>count((array)($state['patients']??[])),'queue'=>count((array)($state['visitQueue']??[])),
          'appointments'=>count((array)($state['appointments']??[])),'products'=>count((array)($state['products']??[])),
          'services'=>count((array)($state['medicalServices']??[])),'users'=>count((array)($state['users']??[]))
        ]];
    }
    if ($tool === 'patient_contacts') {
        if (!lilianIsSuperAdmin($session)) throw new RuntimeException('LILIAN_SUPERADMIN_REQUIRED');
        $gender=lilianNormalizeText((string)($args['gender']??''));
        $query=lilianNormalizeText((string)($args['query']??''));
        $rows=[];
        foreach((array)($state['patients']??[]) as $p){
            if(!is_array($p))continue;
            $g=lilianNormalizeText((string)($p['gender']??$p['sex']??''));
            $isFemale=in_array($g,['female','f','زن','خانم','مونث','مؤنث'],true) || str_contains($g,'زن') || str_contains($g,'خانم');
            $isMale=in_array($g,['male','m','مرد','آقا','مذکر'],true) || str_contains($g,'مرد') || str_contains($g,'آقا');
            if(in_array($gender,['female','زن','خانم','مونث','مؤنث'],true) && !$isFemale)continue;
            if(in_array($gender,['male','مرد','آقا','مذکر'],true) && !$isMale)continue;
            if($query!=='' && !str_contains(lilianPatientText($p),$query))continue;
            $mobile=trim((string)($p['mobilePhone']??$p['mobile']??$p['phone']??''));
            if(!empty($args['hasMobile']) && $mobile==='')continue;
            $rows[]=['id'=>$p['id']??'','fullName'=>$p['fullName']??trim(($p['firstName']??'').' '.($p['lastName']??'')),'mobile'=>$mobile,'fileNumber'=>$p['fileNumber']??($p['patientCode']??''),'gender'=>$p['gender']??$p['sex']??''];
        }
        return ['tool'=>$tool,'count'=>count($rows),'patients'=>array_slice($rows,0,500)];
    }
    if ($tool === 'query_collection') {
        if (!lilianIsSuperAdmin($session)) throw new RuntimeException('LILIAN_SUPERADMIN_REQUIRED');
        $key=(string)($args['collection']??'');
        $allowedCollections=['patients','visitQueue','appointments','medicalServices','products','salesInvoices','expenses','paymentReceipts','discountRecords','auditLogs','users','doctors','staffAccounts'];
        if(!in_array($key,$allowedCollections,true)) throw new RuntimeException('LILIAN_COLLECTION_FORBIDDEN');
        $rows=(array)($state[$key]??[]);
        $q=lilianNormalizeText((string)($args['query']??''));
        if($q!=='') $rows=array_values(array_filter($rows,fn($r)=>is_array($r)&&str_contains(lilianNormalizeText(json_encode($r,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)),$q)));
        return ['tool'=>$tool,'collection'=>$key,'count'=>count($rows),'rows'=>array_slice($rows,0,100)];
    }
    if ($tool === 'create_center_backup') {
        if (!lilianIsSuperAdmin($session)) throw new RuntimeException('LILIAN_SUPERADMIN_REQUIRED');
        $ok=bastianDbBackupState($centerId,'lilian_manual',true);
        $stats=bastianDbBackupStats($centerId);
        bastianAudit('lilian.backup.center',$centerId,'superadmin',$session['userId']??'superadmin','backup',null,['ok'=>$ok]);
        return ['tool'=>$tool,'success'=>(bool)$ok,'centerId'=>$centerId,'stats'=>$stats,'message'=>$ok?'بکاپ مرکز با موفقیت ثبت شد.':'ساخت بکاپ مرکز ناموفق بود.'];
    }
    if ($tool === 'create_system_snapshot') {
        if (!lilianIsSuperAdmin($session)) throw new RuntimeException('LILIAN_SUPERADMIN_REQUIRED');
        if (!function_exists('bastianRecoveryCreateSnapshot')) throw new RuntimeException('LILIAN_RECOVERY_UNAVAILABLE');
        $snap=bastianRecoveryCreateSnapshot('lilian_manual',['runtime'=>true,'database'=>true,'markStable'=>false]);
        bastianAudit('lilian.backup.system',null,'superadmin',$session['userId']??'superadmin','recovery',(string)($snap['id']??''),['version'=>$snap['version']??'']);
        return ['tool'=>$tool,'success'=>true,'snapshot'=>['id'=>$snap['id']??'','createdAt'=>$snap['createdAt']??date('c'),'version'=>$snap['version']??''],'message'=>'بکاپ کامل سیستم و دیتابیس با موفقیت ساخته و ذخیره شد.'];
    }
    throw new RuntimeException('LILIAN_UNKNOWN_TOOL');
}
function lilianFallbackPlan(string $prompt,array $allowed): array {
    $q=lilianNormalizeText($prompt);
    if((str_contains($q,'بکاپ')||str_contains($q,'پشتیبان')) && in_array('create_system_snapshot',$allowed,true))
        return ['kind'=>'tool','tool'=>'create_system_snapshot','args'=>[]];
    if(str_contains($q,'امروز') && str_contains($q,'بیمار') && in_array('today_patients',$allowed,true))
        return ['kind'=>'tool','tool'=>'today_patients','args'=>[]];
    if((str_contains($q,'شماره')||str_contains($q,'موبایل')||str_contains($q,'تماس')) && str_contains($q,'بیمار') && (str_contains($q,'خانم')||str_contains($q,'زن')||str_contains($q,'مونث')||str_contains($q,'مؤنث')) && in_array('patient_contacts',$allowed,true))
        return ['kind'=>'tool','tool'=>'patient_contacts','args'=>['gender'=>'female','hasMobile'=>true]];
    if((str_contains($q,'شماره')||str_contains($q,'پرونده')||str_contains($q,'موبایل')||str_contains($q,'کد ملی')) && str_contains($q,'بیمار') && in_array('search_patients',$allowed,true))
        return ['kind'=>'tool','tool'=>'search_patients','args'=>['query'=>preg_replace('/.*بیمار/u','',$prompt)]];
    if(str_contains($q,'موجودی') && in_array('inventory_search',$allowed,true))
        return ['kind'=>'tool','tool'=>'inventory_search','args'=>['query'=>preg_replace('/.*موجودی/u','',$prompt)]];
    return ['kind'=>'answer','reply'=>'درخواست شما دریافت شد. برای اجرای دقیق‌تر، نام بیمار، بخش موردنظر یا عملیات را مشخص کنید.'];
}
function lilianAiSystemPrompt(array $allowed): string {
    return "شما لیلیان، دستیار عملیاتی Bastiyan HIS هستید. فقط یک JSON معتبر برگردانید. ".
      "اگر برای پاسخ نیاز به داده یا عملیات سامانه است: {\"kind\":\"tool\",\"tool\":\"NAME\",\"args\":{...}}. ".
      "اگر پاسخ عمومی است: {\"kind\":\"answer\",\"reply\":\"...\"}. ابزارهای مجاز این نشست: ".implode(', ',$allowed).
      ". هرگز ابزاری خارج از این فهرست انتخاب نکن. عملیات حذف یا تغییر داده را انتخاب نکن. بکاپ فقط وقتی کاربر صریحاً درخواست بکاپ/پشتیبان کرده انتخاب شود. ".
      "برای فهرست تماس بیماران با فیلتر جنسیت از patient_contacts استفاده کن؛ برای نام/شماره بیمار از search_patients؛ بیماران امروز today_patients؛ بکاپ کامل create_system_snapshot.";
}
function lilianChooseChabokanModel(string $prompt,array $cfg): string {
    $fixed=trim((string)($cfg['defaultModel']??''));
    $auto=filter_var($cfg['autoModel']??true,FILTER_VALIDATE_BOOLEAN,FILTER_NULL_ON_FAILURE); if($auto===null)$auto=true;
    if(!$auto && $fixed!=='') return $fixed;
    $q=lilianNormalizeText($prompt);
    if($fixed!=='') return $fixed;
    // Admin can override this at any time. These are preference IDs, not a hard dependency.
    if(str_contains($q,'کد')||str_contains($q,'توسعه')||str_contains($q,'برنامه')||str_contains($q,'دیپلوی')) return 'openai/gpt-6.1-sol';
    if(str_contains($q,'تحلیل')||str_contains($q,'گزارش')||mb_strlen($prompt,'UTF-8')>900) return 'openai/gpt-6.1-sol';
    return 'openai/gpt-6-luna';
}
function lilianChabokanPlan(string $prompt,array $allowed,array $session): ?array {
    $centerId=lilianCenterId($session); if($centerId==='')return null;
    $cfg=bastianDbIntegrationConfig($centerId,'chabokan_ai');
    $apiKey=trim((string)($cfg['apiKey']??''));$base=rtrim(trim((string)($cfg['baseUrl']??'')),'/');
    if($apiKey===''||$base==='')return null;
    if(!preg_match('#^https://#i',$base))return null;
    $model=lilianChooseChabokanModel($prompt,$cfg);
    $payload=json_encode(['model'=>$model,'temperature'=>0.1,'response_format'=>['type'=>'json_object'],'messages'=>[['role'=>'system','content'=>lilianAiSystemPrompt($allowed)],['role'=>'user','content'=>$prompt]]],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    $res=httpCurlRequest($base.'/chat/completions','POST',['Content-Type: application/json','Authorization: Bearer '.$apiKey],$payload,35);
    if(($res['code']??0)<200||($res['code']??0)>=300)return null;
    $d=json_decode((string)($res['response']??''),true);$text=(string)($d['choices'][0]['message']['content']??'');$plan=json_decode($text,true);
    if(!is_array($plan))return null;
    if(($plan['kind']??'')==='tool'&&!in_array((string)($plan['tool']??''),$allowed,true))return null;
    return $plan;
}
function lilianGeminiPlan(string $prompt,array $allowed,array $session): array {
    $ch=lilianChabokanPlan($prompt,$allowed,$session); if(is_array($ch))return $ch;
    $apiKey=bastianServiceValue('gemini','apiKey',GEMINI_API_KEY);
    if(trim($apiKey)==='') return lilianFallbackPlan($prompt,$allowed);
    $model=bastianServiceValue('gemini','model','gemini-2.5-flash') ?: 'gemini-2.5-flash';
    $system=lilianAiSystemPrompt($allowed);
    $payload=json_encode(['system_instruction'=>['parts'=>[['text'=>$system]]],'contents'=>[['role'=>'user','parts'=>[['text'=>$prompt]]]],'generationConfig'=>['temperature'=>0.1,'responseMimeType'=>'application/json']],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    $url='https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($model).':generateContent?key='.urlencode($apiKey);
    $res=httpCurlRequest($url,'POST',['Content-Type: application/json'],$payload,25);
    if(($res['code']??0)<200||($res['code']??0)>=300) return lilianFallbackPlan($prompt,$allowed);
    $d=json_decode((string)($res['response']??''),true);
    $text=(string)($d['candidates'][0]['content']['parts'][0]['text']??'');
    $plan=json_decode($text,true);
    if(!is_array($plan)) return lilianFallbackPlan($prompt,$allowed);
    if(($plan['kind']??'')==='tool' && !in_array((string)($plan['tool']??''),$allowed,true)) return lilianFallbackPlan($prompt,$allowed);
    return $plan;
}
function lilianFormatToolResult(array $result): string {
    $tool=$result['tool']??'';
    if(isset($result['message'])) return (string)$result['message'];
    if($tool==='search_patients'||$tool==='today_patients'){
        $rows=$result['patients']??[]; if(!$rows) return 'بیماری مطابق درخواست پیدا نشد.';
        $out="نتیجه: ".count($rows)." بیمار\n";
        foreach($rows as $i=>$p){$out.=($i+1).". ".($p['fullName']??'—')." | پرونده: ".($p['fileNumber']??'—')." | کد ملی: ".($p['nationalId']??'—')." | تماس: ".($p['mobile']??'—')."\n";}
        return trim($out);
    }
    if($tool==='patient_contacts'){
        $rows=$result['patients']??[]; if(!$rows)return 'بیماری مطابق فیلتر پیدا نشد.';
        $out='فهرست تماس: '.count($rows)." بیمار\n";foreach($rows as $i=>$p)$out.=($i+1).'. '.($p['fullName']??'—').' | '.($p['mobile']??'—').' | پرونده: '.($p['fileNumber']??'—')."\n";return trim($out);
    }
    if($tool==='inventory_search'){
        $rows=$result['products']??[]; if(!$rows)return 'کالایی مطابق درخواست پیدا نشد.';
        $out="نتیجه موجودی:\n";foreach($rows as $p)$out.="• ".($p['name']??'—').": ".($p['stockQuantity']??0)." ".($p['unit']??'')."\n";return trim($out);
    }
    if($tool==='financial_summary') return "خلاصه مالی امروز: جمع ".number_format((float)($result['total']??0))." تومان، دریافت ".number_format((float)($result['paid']??0))." تومان، مانده ".number_format((float)($result['remaining']??0))." تومان.";
    if($tool==='queue_status') return 'تعداد پرونده‌های صف: '.(int)($result['count']??0);
    if($tool==='appointments_today') return 'تعداد نوبت‌های امروز: '.(int)($result['count']??0);
    if($tool==='center_summary') return 'خلاصه مرکز: '.json_encode($result['counts']??[],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if($tool==='query_collection') return 'تعداد نتایج: '.(int)($result['count']??0)."\n".json_encode($result['rows']??[],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
    return json_encode($result,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);
}
/* ------------------ /Lilian AI Tool Engine R12 ------------------- */


switch ($route) {

    case 'bastian/logout':
        $plain = bearerToken();
        if (bastianDbEnabled()) bastianDbRevokeSession($plain);
        setcookie(defined('BASTIAN_SESSION_COOKIE') ? BASTIAN_SESSION_COOKIE : 'bastian_session', '', ['expires'=>time()-3600,'path'=>'/','httponly'=>true,'samesite'=>'Lax']);
        echo json_encode(['success'=>true], JSON_UNESCAPED_UNICODE);
        break;


    // 1. Health Endpoint
    case 'health':
        echo json_encode([
            'status' => 'ok',
            'appName' => 'Bastiyan HIS Professional (PHP + Embedded SQLite)',
            'version' => bastianAppVersion(),
            'environment' => 'PHP + Embedded SQLite (Chabokan)',
            'phpVersion' => PHP_VERSION,
            'curlAvailable' => function_exists('curl_init'),
            'uploadsWritable' => is_writable(UPLOADS_DIR),
            'dataWritable' => is_writable(DATA_DIR),
            'databaseConfigured' => bastianDbEnabled(),
            'databaseConnected' => (function(){ try { if(!bastianDbEnabled()) return false; bastianPdo()->query('SELECT 1'); return true; } catch(Throwable $e){ return false; } })(),
            'timestamp' => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        break;

    case 'client/bootstrap':
        $clientServerUrl = bastianClientPublicBaseUrl();
        echo json_encode([
            'success' => true,
            'product' => 'Bastiyan HIS',
            'version' => bastianAppVersion(),
            'buildNumber' => (int)(bastianVersionMeta()['buildNumber'] ?? 334),
            'serverUrl' => $clientServerUrl,
            'serverId' => bastianClientServerId($clientServerUrl),
            'serverBinding' => 'download-bound',
            'serverTime' => date('c'),
            'https' => str_starts_with(strtolower($clientServerUrl), 'https://'),
            'localMode' => defined('BASTIAN_LOCAL_MODE') && BASTIAN_LOCAL_MODE,
            'loginPath' => './',
            'minimumClientVersion' => '3.3.1',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        break;

    case 'client/download/windows':
        $clientRoot = dirname(__DIR__) . '/clients/windows';
        $clientFiles = [
            'Setup-BastiyanHIS.cmd.txt' => 'Setup-BastiyanHIS.cmd',
            'Setup-BastiyanHIS.ps1.txt' => 'Setup-BastiyanHIS.ps1',
            'Launch-BastiyanHIS.ps1.txt' => 'Launch-BastiyanHIS.ps1',
            'Uninstall-BastiyanHIS.ps1.txt' => 'Uninstall-BastiyanHIS.ps1',
            'README_FA.txt' => 'README_FA.txt',
        ];
        $entries = [];
        foreach ($clientFiles as $sourceName => $downloadName) {
            $sourcePath = $clientRoot . '/' . $sourceName;
            if (!is_file($sourcePath)) {
                http_response_code(500);
                echo json_encode(['success'=>false, 'error'=>'فایل‌های بسته کلاینت ناقص است.'], JSON_UNESCAPED_UNICODE);
                break 2;
            }
            $entries[$downloadName] = (string)file_get_contents($sourcePath);
        }
        $clientServerUrl = bastianClientPublicBaseUrl();
        $clientServerId = bastianClientServerId($clientServerUrl);
        $entries['server-profile.json'] = json_encode([
            'format' => 'bastiyan-client-server-v1',
            'product' => 'Bastiyan HIS',
            'serverUrl' => $clientServerUrl,
            'serverId' => $clientServerId,
            'serverVersion' => bastianAppVersion(),
            'serverBuildNumber' => (int)(bastianVersionMeta()['buildNumber'] ?? 334),
            'generatedAt' => date('c'),
            'bindingMode' => 'download-bound',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        try {
            $zipBytes = bastianBuildStoredZip($entries);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success'=>false, 'error'=>'ساخت بسته اختصاصی کلاینت ممکن نشد: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
            break;
        }
        $downloadName = 'Bastiyan_HIS_Windows_Client_4.5.5_' . $clientServerId . '.zip';
        header_remove('Content-Type');
        header_remove('Content-Length');
        header_remove('Content-Encoding');
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('Cache-Control: no-store, private');
        echo $zipBytes;
        exit;


    // System version endpoint (the root /version.json is also served statically)
    case 'system/version':
        $versionPath = __DIR__ . '/../version.json';
        if (file_exists($versionPath)) {
            echo file_get_contents($versionPath);
        } else {
            echo json_encode([
                'version' => bastianAppVersion(),
                'buildNumber' => 334,
                'releaseDate' => '2026-08-10',
                'mandatory' => false,
                'title' => 'Bastiyan HIS ' . bastianAppVersion() . ' - NetAfraz Production'
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'local/status':
        echo json_encode([
            'success' => true,
            'localMode' => defined('BASTIAN_LOCAL_MODE') && BASTIAN_LOCAL_MODE,
            'centerName' => defined('BASTIAN_LOCAL_CENTER_NAME') ? BASTIAN_LOCAL_CENTER_NAME : '',
            'localRevision' => 0,
            'cloudRevision' => 0,
            'cloudReachable' => false,
        ], JSON_UNESCAPED_UNICODE);
        break;

    // Gemini connectivity/configuration check
    case 'gemini/health':
        $geminiApiKey = bastianServiceValue('gemini', 'apiKey', GEMINI_API_KEY);
        if ($geminiApiKey === '') {
            echo json_encode([
                'success' => false,
                'connected' => false,
                'error' => 'کلید Gemini برای این مرکز توسط Super Admin تنظیم نشده است.'
            ], JSON_UNESCAPED_UNICODE);
            break;
        }
        $healthUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . urlencode($geminiApiKey);
        $healthPayload = json_encode(['contents' => [['parts' => [['text' => 'Health check ping']]]]]);
        $healthRes = httpCurlRequest($healthUrl, 'POST', ['Content-Type: application/json'], $healthPayload, 12);
        $healthData = decodeRemoteJson($healthRes['response']);
        $connected = $healthRes['code'] >= 200 && $healthRes['code'] < 300 && !empty($healthData['candidates']);
        echo json_encode([
            'success' => $connected,
            'connected' => $connected,
            'message' => $connected ? 'اتصال به Gemini برقرار است.' : null,
            'error' => $connected ? null : ($healthData['error']['message'] ?? $healthRes['error'] ?? 'اتصال Gemini برقرار نشد.')
        ], JSON_UNESCAPED_UNICODE);
        break;

    // 2. Full application backup export (Super Admin only)
    case 'backup':
        requireAccess(['superadmin']);
        if(!bastianDbEnabled()){http_response_code(503);echo json_encode(['success'=>false,'error'=>'SQLite داخلی راه‌اندازی نشده است.'],JSON_UNESCAPED_UNICODE);break;}
        $export=bastianDbExportAll();
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="bastian_full_backup_'.date('Ymd_His').'.json"');
        echo json_encode($export,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);exit;

    // 3. Restore is intentionally guarded to avoid accidental destructive overwrite.
    case 'restore':
        requireAccess(['superadmin']);
        http_response_code(501);
        echo json_encode(['success'=>false,'error'=>'بازیابی کامل پایگاه داده از پنل عمومی غیرفعال است. برای جلوگیری از حذف ناخواسته اطلاعات، از نسخه پشتیبان داخلی SQLite یا ابزار بازیابی مدیریت‌شده استفاده کنید.'],JSON_UNESCAPED_UNICODE);
        break;

    // 4. File Upload Endpoint
    case 'upload':
        $uploadSession = requireAccess(['center','superadmin']);
        $uploadCenterId = safeCenterId($uploadSession['centerId'] ?? '');
        if (!$uploadCenterId) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'آپلود فایل فقط در نشست یک مرکز مجاز است.'], JSON_UNESCAPED_UNICODE); break; }
        $fileName = trim((string)($jsonInput['fileName'] ?? ''));
        $fileData = (string)($jsonInput['fileData'] ?? '');

        if ($fileName === '' || $fileData === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'fileName and fileData are required']);
            break;
        }

        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
        if (!in_array($extension, $allowedExtensions, true)) {
            http_response_code(415);
            echo json_encode(['success' => false, 'error' => 'نوع فایل مجاز نیست. فقط تصویر و PDF قابل بارگذاری است.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        $cleanFileName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', basename($fileName));
        $base64Data = preg_replace('#^data:[^;]+;base64,#', '', $fileData);
        $decoded = base64_decode($base64Data, true);
        if ($decoded === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'محتوای Base64 نامعتبر است.'], JSON_UNESCAPED_UNICODE);
            break;
        }
        if (strlen($decoded) > MAX_UPLOAD_BYTES) {
            http_response_code(413);
            echo json_encode(['success' => false, 'error' => 'حجم فایل بیشتر از ۱۰ مگابایت است.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        $centerUploadDir = PRIVATE_UPLOADS_DIR . $uploadCenterId . '/';
        if (!is_dir($centerUploadDir)) @mkdir($centerUploadDir, 0755, true);
        $targetFileName = date('Ymd_His') . '_' . bin2hex(random_bytes(8)) . '_' . $cleanFileName;
        $targetPath = $centerUploadDir . $targetFileName;
        if (@file_put_contents($targetPath, $decoded, LOCK_EX) !== false) {
            echo json_encode(['success' => true, 'url' => '/api/files/' . rawurlencode($uploadCenterId) . '/' . rawurlencode($targetFileName), 'fileName' => $cleanFileName], JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'امکان ذخیره فایل در پوشه uploads وجود ندارد. سطح دسترسی پوشه را بررسی کنید.'], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Authenticated private file delivery. Browser image/document requests use the HttpOnly session cookie.
    case (preg_match('#^files/([^/]+)/([^/]+)$#', $route, $m) ? true : false):
        $fileCenterId=safeCenterId($m[1]??'');requireAccess(['center','superadmin'],$fileCenterId);
        $fileName=basename(rawurldecode((string)($m[2]??'')));$path=PRIVATE_UPLOADS_DIR.$fileCenterId.'/'.$fileName;
        if(!$fileCenterId||!is_file($path)){http_response_code(404);echo json_encode(['success'=>false,'error'=>'فایل یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        $ext=strtolower(pathinfo($path,PATHINFO_EXTENSION));$types=['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif','pdf'=>'application/pdf'];
        header_remove('Content-Type');header_remove('Content-Length');header_remove('Content-Encoding');header('Content-Type: '.($types[$ext]??'application/octet-stream'));header('Cache-Control: private, max-age=300');header('Content-Disposition: inline; filename="'.str_replace('"','',basename($fileName)).'"');readfile($path);exit;

    // 5. Central Bastian Center Management (SQLite-backed, Super Admin only)
    case 'bastian/centers':
        requireAccess(['superadmin']);
        if (!bastianDbEnabled()) { http_response_code(503); echo json_encode(['success'=>false,'error'=>'پایگاه داده داخلی SQLite آماده نیست؛ /api/setup.php را یک‌بار اجرا کنید.'], JSON_UNESCAPED_UNICODE); break; }
        if ($method === 'GET') {
            echo json_encode(['success'=>true,'centers'=>bastianDbCenters(true)], JSON_UNESCAPED_UNICODE);
            break;
        }
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            $plainPassword = (string)($jsonInput['adminPassword'] ?? '');
            $center = bastianDbCreateOrUpdateCenter($jsonInput, $plainPassword);
            // syncDbCenterMetadataIntoState is non-critical: state init failure must NOT
            // roll back a successful center creation. Errors are logged but swallowed.
            try { syncDbCenterMetadataIntoState($center); } catch (Throwable $syncErr) {
                error_log('[Bastiyan] syncDbCenterMetadataIntoState failed for center '
                    .($center['id']??'?').': '.$syncErr->getMessage());
            }
            bastianAudit(
                empty($jsonInput['id']) ? 'center.create' : 'center.update',
                $center['id'] ?? null, 'superadmin', 'superadmin',
                'center', $center['id'] ?? null, ['name' => $center['name'] ?? '']
            );
            echo json_encode(['success'=>true,'center'=>$center,'centers'=>bastianDbCenters(true)], JSON_UNESCAPED_UNICODE);
        } catch (PDOException $e) {
            http_response_code(409);
            $msg = (strpos($e->getMessage(), 'uq_bastian_username') !== false
                 || strpos($e->getMessage(), 'Duplicate entry') !== false)
                ? 'نام کاربری یا کد مرکز قبلاً استفاده شده است.'
                : 'ذخیره مرکز در دیتابیس انجام نشد: ' . $e->getMessage();
            echo json_encode(['success'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['success'=>false,'error'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    case (preg_match('#^bastian/centers/([^/]+)/users(?:/([^/]+))?$#', $route, $m) ? true : false):
        requireAccess(['superadmin']);
        $targetCenterId=safeCenterId($m[1]??'');$targetUserId=preg_replace('/[^a-zA-Z0-9_-]/','',(string)($m[2]??''));
        if (!$targetCenterId || !bastianDbCenter($targetCenterId)) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            if ($method==='GET') { echo json_encode(['success'=>true,'users'=>bastianDbUsers($targetCenterId)], JSON_UNESCAPED_UNICODE); break; }
            if ($method==='POST') {
                $user=$jsonInput['user']??null;if(!is_array($user))throw new InvalidArgumentException('اطلاعات کاربر معتبر نیست.');
                $users=bastianDbUpsertUser($targetCenterId,$user);bastianAudit('user.upsert',$targetCenterId,'superadmin','superadmin','user',$user['id']??null,['username'=>$user['username']??'']);
                echo json_encode(['success'=>true,'users'=>$users], JSON_UNESCAPED_UNICODE);break;
            }
            if ($method==='DELETE') {
                $users=bastianDbDeleteUser($targetCenterId,$targetUserId);bastianAudit('user.disable',$targetCenterId,'superadmin','superadmin','user',$targetUserId);
                echo json_encode(['success'=>true,'users'=>$users], JSON_UNESCAPED_UNICODE);break;
            }
            http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'], JSON_UNESCAPED_UNICODE);
        } catch(PDOException $e){http_response_code(409);echo json_encode(['success'=>false,'error'=>'نام کاربری قبلاً استفاده شده است.'],JSON_UNESCAPED_UNICODE);} catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
        break;

    case (preg_match('#^bastian/centers/([^/]+)/clinical-bootstrap$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');$session=requireAccess(['superadmin','center'],$targetCenterId);
        if(!$targetCenterId||!bastianDbCenter($targetCenterId)){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            if($method==='GET'){
                $center=bastianDbCenter($targetCenterId);
                $bootstrap=bastianDbClinicalBootstrap($targetCenterId);
                echo json_encode(array_merge(['success'=>true,'centerId'=>$targetCenterId,'center'=>$center],$bootstrap),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
                break;
            }
            if($method==='POST'){
                $actor=(string)($session['userId']??($session['role']??'system'));
                $userRole=(string)($session['userRole']??'');
                $allowed=[];
                if(($session['role']??'')==='superadmin'||$userRole==='admin')$allowed=bastianClinicalCatalogKeys();
                elseif($userRole==='doctor')$allowed=['medicalServices','serviceCategories'];
                elseif($userRole==='inventory_manager')$allowed=['products','categories','warehouses'];
                $saved=[];
                foreach($allowed as $key){
                    if(!array_key_exists($key,$jsonInput)||!is_array($jsonInput[$key]))continue;
                    $saved[$key]=bastianDbCatalogPut($targetCenterId,$key,$jsonInput[$key],$actor);
                }
                if(!$saved){http_response_code(403);echo json_encode(['success'=>false,'error'=>'برای این نقش، داده قابل همگام‌سازی در درخواست وجود ندارد.'],JSON_UNESCAPED_UNICODE);break;}
                $bootstrap=bastianDbClinicalBootstrap($targetCenterId);
                bastianAudit('clinical.catalog.sync',$targetCenterId,$session['role']??'center',$actor,'clinical_catalog',$targetCenterId,['keys'=>array_keys($saved)]);
                echo json_encode(array_merge(['success'=>true,'saved'=>$saved],$bootstrap),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;
            }
            http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){
            error_log('[Bastiyan] clinical bootstrap failed for '.$targetCenterId.': '.$e->getMessage());
            http_response_code(503);
            echo json_encode(['success'=>false,'error'=>'فهرست بالینی مرکز در دسترس نیست. کد خطا: CLINICAL_BOOTSTRAP','diagnosticCode'=>'CLINICAL_BOOTSTRAP','detail'=>preg_replace('/[^A-Za-z0-9_:-]/','_',substr($e->getMessage(),0,80))],JSON_UNESCAPED_UNICODE);
        }
        break;


    // 3.3.10 authoritative online data store. This endpoint is the ONLY path
    // used by the web runtime for center data. It does not read/write the old
    // encrypted monolithic State during normal operation.
    case (preg_match('#^bastian/centers/([^/]+)/online-data$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');$session=requireAccess(['superadmin','center'],$targetCenterId);
        if(!$targetCenterId||!bastianDbCenter($targetCenterId)){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            if($method==='GET'){
                $online=bastianDbOnlineRead($targetCenterId,true);
                $state=$online['state']??[];$users=is_array($state['users']??null)?$state['users']:[];
                $roleCount=function(string $kind)use($users):int{
                    $n=0;foreach($users as $u){if(!is_array($u)||isset($u['active'])&&$u['active']===false)continue;$role=bastianOnlineNormalizeRoleText(($u['role']??'').' '.implode(' ',array_filter((array)($u['roles']??[]))));
                        if($kind==='doctor'){
                            if(str_contains($role,'دستیار')||str_contains($role,'پرستار')||str_contains($role,'assistant')||str_contains($role,'nurse'))continue;
                            if(str_contains($role,'doctor')||str_contains($role,'physician')||str_contains($role,'پزشک')||str_contains($role,'دکتر'))$n++;
                        }else if(str_contains($role,'assistant')||str_contains($role,'nurse')||str_contains($role,'پرستار')||str_contains($role,'دستیار'))$n++;
                    }return $n;
                };
                echo json_encode(array_merge(['success'=>true,'centerId'=>$targetCenterId,'source'=>'sqlite-embedded-store','counts'=>[
                    'users'=>count($users),'doctors'=>$roleCount('doctor'),'assistants'=>$roleCount('assistant'),
                    'services'=>is_array($state['medicalServices']??null)?count($state['medicalServices']):0,
                    'products'=>is_array($state['products']??null)?count($state['products']):0,
                    'patients'=>is_array($state['patients']??null)?count($state['patients']):0,
                ]],$online),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;
            }
            if($method==='POST'){
                $state=$jsonInput['state']??null;if(!is_array($state)){http_response_code(400);echo json_encode(['success'=>false,'error'=>'ساختار داده آنلاین مرکز معتبر نیست.'],JSON_UNESCAPED_UNICODE);break;}
                $current=bastianDbOnlineRead($targetCenterId,true);$mode=(string)($jsonInput['mode']??'patch');$isSeed=$mode==='seed'&&!empty($current['needsClientSeed']);$isDirectoryRecovery=$mode==='directory-recovery';$isRecovery=$mode==='recovery';$isPatch=$mode==='patch';
                if($isDirectoryRecovery){$state=['users'=>array_values(array_filter((array)($state['users']??[]),'is_array'))];}
                elseif($isRecovery){
                    $currentState=is_array($current['state']??null)?$current['state']:[];$recovered=[];
                    foreach($state as $k=>$v){
                        if($k==='users'){if(is_array($v)&&count($v))$recovered['users']=$v;continue;}
                        $serverValue=$currentState[$k]??null;$serverEmpty=$serverValue===null||(is_array($serverValue)&&count($serverValue)===0)||(is_string($serverValue)&&trim($serverValue)==='');
                        $incomingUseful=$v!==null&&(!(is_array($v))||count($v)>0)&&(!(is_string($v))||trim($v)!=='');
                        if($serverEmpty&&$incomingUseful)$recovered[$k]=$v;
                    }
                    $state=$recovered;
                    if(!$state){echo json_encode(array_merge(['success'=>true,'source'=>'sqlite-embedded-store','recoverySkipped'=>true],$current),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;}
                }
                elseif($isPatch){
                    $currentState=is_array($current["state"]??null)?$current["state"]:[];
                    $filtered=filterCenterStatePatchForSession($session,$state);
                    $patchState=$filtered['patch'];
                    $ignoredKeys=$filtered['ignored'];
                    $next=$currentState;
                    foreach($patchState as $k=>$v){if($k!=="users")$next[$k]=$v;}
                    $state=$next;
                }
                elseif(!$isSeed)enforceCenterStatePermissions($session,is_array($current["state"]??null)?$current["state"]:[],$state);
                $baseRevision=isset($jsonInput['baseRevision'])?(int)$jsonInput['baseRevision']:null;$actor=(string)($session['userId']??($session['role']??'system'));
                $saved=bastianDbOnlineSave($targetCenterId,$state,$baseRevision,$actor,$isSeed);
                if(!empty($saved['conflict'])){http_response_code(409);echo json_encode(['success'=>false,'conflict'=>true,'error'=>'اطلاعات مرکز همزمان در سیستم دیگری تغییر کرده است. نسخه جدید دریافت و بدون حذف اطلاعات ادغام خواهد شد.','current'=>$saved['current']],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;}
                bastianAudit($isSeed?'online.seed':($isDirectoryRecovery?'online.directory_recovery':($isRecovery?'online.recovery':($isPatch?'online.patch':'online.save'))),$targetCenterId,$session['role']??'center',$actor,'online_data',$targetCenterId,['revision'=>$saved['revision']??0,'backend'=>$saved['backend']??'']);
                $extra=[]; if(isset($ignoredKeys)&&is_array($ignoredKeys)&&count($ignoredKeys))$extra['ignoredKeys']=$ignoredKeys;
                echo json_encode(array_merge(['success'=>true,'source'=>'sqlite-embedded-store'],$extra,$saved),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;
            }
            http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){
            error_log('[Bastiyan] ONLINE_DATA_FATAL '.$targetCenterId.' '.$e->getMessage());http_response_code(503);
            echo json_encode(['success'=>false,'error'=>'پایگاه داده داخلی SQLite مرکز پاسخ نداد. کد تشخیص: SQLITE_DATA','diagnosticCode'=>'SQLITE_DATA','detail'=>preg_replace('/[^A-Za-z0-9_:\-.]/','_',substr($e->getMessage(),0,120))],JSON_UNESCAPED_UNICODE);
        }
        break;

    case (preg_match('#^bastian/centers/([^/]+)/state$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');$session=requireAccess(['superadmin','center'],$targetCenterId);
        if (!$targetCenterId || !bastianDbCenter($targetCenterId)) { http_response_code(404); echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            if ($method==='GET') {
                $stateStatus=bastianDbGetStateResilient($targetCenterId);
                $current=$stateStatus['current']??null;
                if(!$current){
                    $center=bastianDbCenter($targetCenterId);
                    // Only initialize when there is truly no existing state row. Never overwrite an unreadable/encrypted row.
                    if(($stateStatus['errorCode']??'')==='STATE_ROW_MISSING'){
                        $current=bastianDbInitializeState($targetCenterId,initialCenterState($center));
                        $stateStatus=['ok'=>true,'source'=>'initialized','degraded'=>false,'errorCode'=>null,'current'=>$current];
                    } else {
                        http_response_code(503);
                        echo json_encode([
                            'success'=>false,
                            'error'=>'داده اصلی مرکز موقتاً قابل خواندن نیست؛ فهرست کاربران، خدمات و کالا از مسیر مستقل مرکز قابل دریافت است.',
                            'diagnosticCode'=>'CENTER_STATE_READ',
                            'stateSource'=>$stateStatus['source']??'none',
                            'detail'=>preg_replace('/[^A-Za-z0-9_:-]/','_',substr((string)($stateStatus['errorCode']??'STATE_READ_FAILED'),0,80))
                        ],JSON_UNESCAPED_UNICODE);
                        break;
                    }
                }
                $center=bastianDbCenter($targetCenterId);
                $current['state']=sanitizeCenterStateForStorage($current['state'],$center);
                $current['state']['users']=bastianDbUsers($targetCenterId);
                // Critical pick-lists are overlaid from the independent SQLite catalog so a damaged monolithic
                // state can never make doctor/nurse/service/product selectors empty.
                try{
                    $clinical=bastianDbClinicalBootstrap($targetCenterId);
                    foreach(['medicalServices','products','categories','serviceCategories','warehouses'] as $key){
                        if(!empty($clinical[$key]) || empty($current['state'][$key])) $current['state'][$key]=$clinical[$key]??($current['state'][$key]??[]);
                    }
                }catch(Throwable $catalogErr){error_log('[Bastiyan] state catalog overlay failed: '.$catalogErr->getMessage());}
                echo json_encode([
                    'success'=>true,'centerId'=>$targetCenterId,'center'=>$center,'state'=>$current['state'],
                    'revision'=>$current['revision'],'checksum'=>$current['checksum'],'updatedAt'=>$current['updatedAt'],
                    'stateSource'=>$stateStatus['source']??'primary','degraded'=>!empty($stateStatus['degraded'])
                ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;
            }
            if ($method==='POST') {
                $state=$jsonInput['state']??null;if(!is_array($state)||!isset($state['settings'])){http_response_code(400);echo json_encode(['success'=>false,'error'=>'ساختار داده مرکز معتبر نیست.'],JSON_UNESCAPED_UNICODE);break;}
                $center=bastianDbCenter($targetCenterId);
                $state=sanitizeCenterStateForStorage($state,$center);
                $permissionCurrent=bastianDbGetState($targetCenterId);
                if($permissionCurrent) enforceCenterStatePermissions($session,$permissionCurrent['state'],$state);
                $baseRevision=isset($jsonInput['baseRevision'])?(int)$jsonInput['baseRevision']:null;
                $actor=(string)($session['userId']??($session['role']??'system'));
                $saved=bastianDbSaveState($targetCenterId,$state,$baseRevision,$actor,false);
                if(!empty($saved['conflict'])){http_response_code(409);echo json_encode(['success'=>false,'conflict'=>true,'error'=>'داده سرور پس از آخرین همگام‌سازی تغییر کرده است؛ هیچ اطلاعاتی بازنویسی نشد.','current'=>$saved['current']],JSON_UNESCAPED_UNICODE);break;}
                if(!empty($saved['missing'])){bastianDbInitializeState($targetCenterId,initialCenterState($center));$saved=bastianDbSaveState($targetCenterId,$state,1,$actor,true);}
                // Keep critical catalogs independently queryable from every role/session.
                $userRole=(string)($session['userRole']??'');
                if(($session['role']??'')==='superadmin'||$userRole==='admin'){
                    foreach(bastianClinicalCatalogKeys() as $key)if(isset($state[$key])&&is_array($state[$key]))bastianDbCatalogPut($targetCenterId,$key,$state[$key],$actor);
                }elseif($userRole==='doctor'){
                    foreach(['medicalServices','serviceCategories'] as $key)if(isset($state[$key])&&is_array($state[$key]))bastianDbCatalogPut($targetCenterId,$key,$state[$key],$actor);
                }elseif($userRole==='inventory_manager'){
                    foreach(['products','categories','warehouses'] as $key)if(isset($state[$key])&&is_array($state[$key]))bastianDbCatalogPut($targetCenterId,$key,$state[$key],$actor);
                }
                bastianAudit('state.save',$targetCenterId,$session['role']??'center',$actor,'center_state',$targetCenterId,['revision'=>$saved['revision']??null]);
                echo json_encode(array_merge(['success'=>true],$saved),JSON_UNESCAPED_UNICODE);break;
            }
            http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);
        } catch(Throwable $e) {
            error_log('[Bastiyan] center state route failed for '.$targetCenterId.': '.$e->getMessage());
            http_response_code(503);
            echo json_encode([
                'success'=>false,
                'error'=>'همگام‌سازی کامل مرکز موقتاً در دسترس نیست؛ مسیر مستقل کاربران/خدمات/کالا همچنان فعال است.',
                'diagnosticCode'=>'CENTER_STATE_ROUTE',
                'detail'=>preg_replace('/[^A-Za-z0-9_:-]/','_',substr($e->getMessage(),0,80))
            ],JSON_UNESCAPED_UNICODE);
        }
        break;

    case (preg_match('#^bastian/centers/([^/]+)/backups$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');requireAccess(['superadmin']);
        if($method!=='GET'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        if(!$targetCenterId||!bastianDbCenter($targetCenterId)){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        $limit=max(1,min(200,(int)($_GET['limit']??60)));echo json_encode(['success'=>true,'backups'=>bastianDbListBackups($targetCenterId,$limit)],JSON_UNESCAPED_UNICODE);break;

    case (preg_match('#^bastian/centers/([^/]+)/backups/(\d+)/restore$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');$backupId=(int)($m[2]??0);$session=requireAccess(['superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        if(!$targetCenterId||!bastianDbCenter($targetCenterId)||$backupId<=0){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز یا نسخه بکاپ یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        try{$restored=bastianDbRestoreBackup($targetCenterId,$backupId,(string)($session['userId']??'superadmin'));bastianAudit('backup.restore',$targetCenterId,'superadmin',$session['userId']??'superadmin','backup',(string)$backupId,$restored);echo json_encode($restored,JSON_UNESCAPED_UNICODE);}catch(Throwable $e){http_response_code($e->getMessage()==='BACKUP_NOT_FOUND'?404:500);echo json_encode(['success'=>false,'error'=>$e->getMessage()==='BACKUP_NOT_FOUND'?'نسخه بکاپ یافت نشد.':'بازیابی بکاپ انجام نشد.'],JSON_UNESCAPED_UNICODE);}break;

    case (preg_match('#^bastian/centers/([^/]+)/backup$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');$session=requireAccess(['superadmin','center'],$targetCenterId);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        $ok=bastianDbBackupState($targetCenterId,'manual',true);$stats=bastianDbBackupStats($targetCenterId);bastianAudit('backup.manual',$targetCenterId,$session['role']??'center',$session['userId']??null,'backup',null,$stats);
        echo json_encode(array_merge(['success'=>$ok],$stats),JSON_UNESCAPED_UNICODE);break;

    case (preg_match('#^bastian/centers/([^/]+)/database$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');requireAccess(['superadmin']);
        if(!$targetCenterId||!bastianDbCenter($targetCenterId)){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        echo json_encode(array_merge(['success'=>true,'centerId'=>$targetCenterId],bastianDbBackupStats($targetCenterId)),JSON_UNESCAPED_UNICODE);break;

    case (preg_match('#^bastian/centers/([^/]+)/audit$#', $route, $m) ? true : false):
        $targetCenterId=safeCenterId($m[1]??'');requireAccess(['superadmin']);$limit=max(1,min(200,(int)($_GET['limit']??50)));
        $st=bastianPdo()->prepare("SELECT action,actor_type,actor_id,entity_type,entity_id,details_json,created_at FROM bastian_audit_logs WHERE center_id=? ORDER BY id DESC LIMIT {$limit}");$st->execute([$targetCenterId]);$logs=$st->fetchAll();
        echo json_encode(['success'=>true,'logs'=>$logs],JSON_UNESCAPED_UNICODE);break;

    case (preg_match('#^bastian/centers/([^/]+)$#', $route, $m) ? true : false):
        requireAccess(['superadmin']);$targetId=safeCenterId($m[1]??'');
        if($method!=='DELETE'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        if(!$targetId||!bastianDbCenter($targetId)){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        bastianDbBackupState($targetId,'before_archive',true);bastianDbArchiveCenter($targetId);$c=bastianDbCenter($targetId);if($c)syncDbCenterMetadataIntoState($c);bastianAudit('center.archive',$targetId,'superadmin','superadmin','center',$targetId);
        echo json_encode(['success'=>true,'message'=>'مرکز آرشیو شد؛ هیچ داده، کاربر یا بکاپی حذف نشد.','centers'=>bastianDbCenters(true)],JSON_UNESCAPED_UNICODE);break;

    // Super Admin Login - password hash remains server-side; sessions live in embedded SQLite.
    case 'bastian/admin/login':
        if(!bastianDbEnabled()){http_response_code(503);echo json_encode(['success'=>false,'error'=>'ابتدا /api/setup.php را یک‌بار اجرا کنید تا SQLite داخلی آماده شود.'],JSON_UNESCAPED_UNICODE);break;}
        $username=trim((string)($jsonInput['username']??''));$password=(string)($jsonInput['password']??'');$loginKey=bastianLoginKey($username,'superadmin');
        if(!bastianCheckLoginLimit($loginKey)){http_response_code(429);echo json_encode(['success'=>false,'error'=>'تعداد تلاش ناموفق زیاد بوده است. ۱۵ دقیقه بعد دوباره امتحان کنید.'],JSON_UNESCAPED_UNICODE);break;}
        if(BASTIAN_SUPERADMIN_PASSWORD_HASH!==''&&hash_equals(BASTIAN_SUPERADMIN_USERNAME,$username)&&password_verify($password,BASTIAN_SUPERADMIN_PASSWORD_HASH)){
            bastianClearLoginLimit($loginKey);$token=createAccessToken('superadmin',null,'superadmin');bastianSetSessionCookie($token);bastianAudit('login.success',null,'superadmin','superadmin');
            echo json_encode(['success'=>true,'token'=>$token,'expiresIn'=>BASTIAN_ACCESS_TOKEN_TTL,'user'=>['id'=>'u-superadmin','name'=>'مدیریت کل باستیان','username'=>$username,'role'=>'admin','status'=>'active','active'=>true]],JSON_UNESCAPED_UNICODE);
        }else{bastianRecordLoginFailure($loginKey);bastianAudit('login.failure',null,'superadmin',$username);http_response_code(401);echo json_encode(['success'=>false,'error'=>'نام کاربری یا کلمه عبور مدیریت کل اشتباه است.'],JSON_UNESCAPED_UNICODE);}break;

    // Center/Staff Login + License Validation. Passwords are verified only against hashes in embedded SQLite.
    case 'bastian/license/validate':
        if(!bastianDbEnabled()){http_response_code(503);echo json_encode(['success'=>false,'error'=>'دیتابیس حرفه‌ای راه‌اندازی نشده است.'],JSON_UNESCAPED_UNICODE);break;}
        $username=trim((string)($jsonInput['username']??''));$password=(string)($jsonInput['password']??'');$deviceRegistration=!empty($jsonInput['deviceRegistration']);$deviceName=trim((string)($jsonInput['deviceName']??'Mother PC'));
        $loginKey=bastianLoginKey($username,'center');if(!bastianCheckLoginLimit($loginKey)){http_response_code(429);echo json_encode(['success'=>false,'error'=>'تعداد تلاش ناموفق زیاد بوده است. ۱۵ دقیقه بعد دوباره امتحان کنید.'],JSON_UNESCAPED_UNICODE);break;}
        $user=bastianDbFindUserByUsername($username);if(!$user||empty($user['active'])||!password_verify($password,(string)$user['password_hash'])){bastianRecordLoginFailure($loginKey);http_response_code(401);echo json_encode(['success'=>false,'error'=>'نام کاربری یا کلمه عبور صحیح نیست.'],JSON_UNESCAPED_UNICODE);break;}
        $center=bastianDbCenter((string)$user['center_id']);if(!$center||!empty($center['archived'])||empty($center['active'])){http_response_code(403);echo json_encode(['success'=>false,'error'=>'دسترسی این مرکز غیرفعال یا آرشیو شده است.'],JSON_UNESCAPED_UNICODE);break;}
        $today=currentJalaliDate();$endDate=normalizeJalali($center['endDate']??'');if($endDate!==''&&$endDate!=='نامحدود'&&$today>$endDate){http_response_code(403);echo json_encode(['success'=>false,'center'=>array_merge($center,['isExpired'=>true,'active'=>false]),'error'=>'اعتبار مرکز پایان یافته است.'],JSON_UNESCAPED_UNICODE);break;}
        bastianClearLoginLimit($loginKey);$token=createAccessToken('center',$center['id'],$user['id']);bastianSetSessionCookie($token);bastianPdo()->prepare('UPDATE bastian_users SET last_login_at=? WHERE id=?')->execute([bastianNow(),$user['id']]);
        $out=['success'=>true,'token'=>$token,'expiresIn'=>BASTIAN_ACCESS_TOKEN_TTL,'center'=>array_merge($center,['isExpired'=>false,'active'=>true]),'user'=>bastianDbUserPublic($user),'licenseMessage'=>'لایسنس و دسترسی کاربر معتبر است.'];
        if($deviceRegistration){$out['deviceToken']=bastianDbIssueDeviceToken($center['id'],$deviceName?:'Mother PC',$user['id']);}
        bastianAudit('login.success',$center['id'],'center',$user['id'],'user',$user['id']);echo json_encode($out,JSON_UNESCAPED_UNICODE);break;

    // Long-lived Mother PC refresh token -> short-lived cloud session.
    case 'bastian/device/refresh':
        if(!bastianDbEnabled()){http_response_code(503);echo json_encode(['success'=>false,'error'=>'دیتابیس راه‌اندازی نشده است.'],JSON_UNESCAPED_UNICODE);break;}
        $deviceToken=trim((string)($jsonInput['deviceToken']??''));$device=bastianDbRefreshDeviceToken($deviceToken);if(!$device){http_response_code(401);echo json_encode(['success'=>false,'error'=>'توکن دستگاه معتبر نیست یا لغو شده است.'],JSON_UNESCAPED_UNICODE);break;}
        $center=bastianDbCenter((string)$device['center_id']);if(!$center||empty($center['active'])||!empty($center['archived'])){http_response_code(403);echo json_encode(['success'=>false,'error'=>'مرکز فعال نیست.'],JSON_UNESCAPED_UNICODE);break;}
        $token=createAccessToken('center',$center['id'],!empty($device['user_id'])?$device['user_id']:'device:'.$device['id']);echo json_encode(['success'=>true,'token'=>$token,'expiresIn'=>BASTIAN_ACCESS_TOKEN_TTL,'center'=>$center],JSON_UNESCAPED_UNICODE);break;

    // Super Admin one-click entry into a center.
    case 'bastian/remote-login':
        requireAccess(['superadmin']);$centerId=safeCenterId($jsonInput['centerId']??'');$found=$centerId?bastianDbCenter($centerId):null;
        if(!$found){http_response_code(404);echo json_encode(['success'=>false,'error'=>'مرکز مورد نظر یافت نشد.'],JSON_UNESCAPED_UNICODE);break;}
        $token=createAccessToken('superadmin',$centerId,'superadmin');bastianSetSessionCookie($token);bastianAudit('superadmin.enter_center',$centerId,'superadmin','superadmin','center',$centerId);
        echo json_encode(['success'=>true,'token'=>$token,'center'=>$found,'centerName'=>$found['name'],'expiresInMinutes'=>720,'message'=>'دسترسی کامل مدیریت کل برای این مرکز صادر شد.'],JSON_UNESCAPED_UNICODE);break;

    // Disaster Recovery control plane. The standalone /bastiyan-recovery.php remains usable even if HIS UI fails.
    case 'bastian/system/recovery':
        $recoverySession=requireAccess(['superadmin']);
        try {
            if (!function_exists('bastianRecoveryStatus')) throw new RuntimeException('سامانه بازیابی اضطراری در دسترس نیست.');
            if ($method==='GET') { echo json_encode(bastianRecoveryStatus(),JSON_UNESCAPED_UNICODE); break; }
            if ($method!=='POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE); break; }
            $action=(string)($jsonInput['action']??'create');
            if ($action==='create') {
                $snap=bastianRecoveryCreateSnapshot('manual', ['runtime'=>true,'database'=>true,'markStable'=>!empty($jsonInput['markStable'])]);
                bastianAudit('system.recovery.create',null,'superadmin','superadmin','recovery',(string)($snap['id']??''),['version'=>$snap['version']??'']);
                echo json_encode(['success'=>true,'snapshot'=>$snap,'status'=>bastianRecoveryStatus()],JSON_UNESCAPED_UNICODE); break;
            }
            if ($action==='restore') {
                $id=(string)($jsonInput['id']??''); $type=(string)($jsonInput['type']??'disaster-snapshot'); $withDb=!empty($jsonInput['withDatabase']);
                try { bastianRecoveryCreateSnapshot('before_restore', ['runtime'=>true,'database'=>true]); } catch(Throwable $ignored) {}
                $result=$type==='legacy-updater' ? bastianRecoveryRestoreLegacyUpdaterBackup($id) : bastianRecoveryRestoreSnapshot($id,$withDb);
                bastianAudit('system.recovery.restore',null,'superadmin','superadmin','recovery',$id,['withDatabase'=>$withDb,'restoredVersion'=>$result['restoredVersion']??'']);
                echo json_encode($result,JSON_UNESCAPED_UNICODE); break;
            }
            throw new InvalidArgumentException('عملیات بازیابی معتبر نیست.');
        } catch(Throwable $e) { http_response_code(400); echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE); }
        break;


    // R20 — persistent center logo/media upload. Stored outside updater-managed code.
    case 'bastian/media/center-logo':
        $mediaSession=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $centerId=(string)($mediaSession['centerId']??'');
            if($centerId==='') throw new RuntimeException('مرکز نشست مشخص نیست.');
            $kind=(string)($jsonInput['kind']??'main');
            if(!in_array($kind,['main','invoice-footer'],true))$kind='main';
            $dataUrl=trim((string)($jsonInput['dataUrl']??''));
            if(!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\r\n]+)$#i',$dataUrl,$mm)) throw new InvalidArgumentException('فرمت تصویر لوگو معتبر نیست.');
            $mime=strtolower($mm[1]);$ext=$mime==='jpeg'||$mime==='jpg'?'jpg':($mime==='webp'?'webp':'png');
            $bytes=base64_decode(preg_replace('/\s+/','',$mm[2]),true);
            if($bytes===false||strlen($bytes)<32)throw new InvalidArgumentException('تصویر لوگو قابل خواندن نیست.');
            if(strlen($bytes)>2*1024*1024)throw new InvalidArgumentException('حجم لوگو پس از فشرده‌سازی نباید بیشتر از ۲ مگابایت باشد.');
            $safeCenter=preg_replace('/[^A-Za-z0-9_-]/','_',$centerId);
            $dir=dirname(__DIR__).'/uploads/center-logos';
            if(!is_dir($dir)&&!@mkdir($dir,0755,true))throw new RuntimeException('ساخت پوشه لوگوی مرکز ممکن نشد.');
            $file=$safeCenter.'-'.$kind.'.'.$ext;
            $target=$dir.'/'.$file;$tmp=$target.'.tmp-'.bin2hex(random_bytes(3));
            if(@file_put_contents($tmp,$bytes,LOCK_EX)===false||!@rename($tmp,$target)){@unlink($tmp);throw new RuntimeException('ذخیره دائمی لوگو روی هاست ممکن نشد.');}
            $url='./uploads/center-logos/'.rawurlencode($file).'?v='.time();
            bastianAudit('center.logo.update',$centerId,$mediaSession['role']??'center',$mediaSession['userId']??'system','center_logo',$kind,['bytes'=>strlen($bytes),'file'=>$file]);
            echo json_encode(['success'=>true,'url'=>$url,'kind'=>$kind,'bytes'=>strlen($bytes)],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
        break;

    // Secure root updater. Authorization is enforced server-side and uploaded packages are hash-verified.
    case 'bastian/system/update':
        $updateSession=requireAccess(['superadmin']);
        try {
            if($method==='GET'){echo json_encode(bastianUpdaterStatus(),JSON_UNESCAPED_UNICODE);break;}
            if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
            $action=(string)($_POST['action']??$jsonInput['action']??'install');
            if($action==='rollback'){
                $result=bastianUpdaterRollback((string)($jsonInput['backupId']??$_POST['backupId']??''));
                bastianAudit('system.update.rollback',(string)($updateSession['centerId']??'')?:null,'superadmin','superadmin','system_update',null,['restoredVersion'=>$result['restoredVersion']??'']);
                echo json_encode($result,JSON_UNESCAPED_UNICODE);break;
            }
            if($action==='commit') { $backupId=(string)($jsonInput['backupId']??$_POST['backupId']??''); $result=bastianUpdaterCommit($backupId); echo json_encode($result,JSON_UNESCAPED_UNICODE); break; }
            if($action==='extend') { echo json_encode(bastianUpdaterExtend((int)($jsonInput['seconds']??$_POST['seconds']??180)),JSON_UNESCAPED_UNICODE); break; }
            if(!in_array($action,['install','auto-install'],true)||!isset($_FILES['package']))throw new InvalidArgumentException('فایل بسته به‌روزرسانی انتخاب نشده است.');
            if((int)($_FILES['package']['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)throw new RuntimeException('آپلود فایل کامل نشد. کد خطا: '.(int)($_FILES['package']['error']??-1));
            $result=$action==='auto-install'
                ? bastianUpdaterAutoInstall((string)$_FILES['package']['tmp_name'])
                : bastianUpdaterInstall((string)$_FILES['package']['tmp_name'], (string)($_POST['version'] ?? ''));
            bastianAudit($action==='auto-install'?'system.update.auto_install':'system.update.install',(string)($updateSession['centerId']??'')?:null,'superadmin','superadmin','system_update',null,['installedVersion'=>$result['installedVersion']??'','filesUpdated'=>$result['filesUpdated']??0,'autoCommitted'=>$result['autoCommitted']??false]);
            echo json_encode($result,JSON_UNESCAPED_UNICODE);
        } catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
        break;

    // Per-center provider secrets. Plaintext secrets never leave the server.
    case 'bastian/system/integrations':
        $integrationSession=requireAccess(['superadmin']);$integrationCenter=(string)($integrationSession['centerId']??'');
        if($integrationCenter===''||!bastianDbCenter($integrationCenter)){http_response_code(403);echo json_encode(['success'=>false,'error'=>'ابتدا از پنل مدیریت کل وارد مرکز مورد نظر شوید.'],JSON_UNESCAPED_UNICODE);break;}
        try {
            bastianCreateSchema(bastianPdo());
            $providers=[
              'kavenegar'=>['fields'=>['apiKey','sender'],'secrets'=>['apiKey']],
              'gemini'=>['fields'=>['apiKey','model'],'secrets'=>['apiKey']],
              'identity'=>['fields'=>['apiKey','url'],'secrets'=>['apiKey']],
              'chabokan_ai'=>['fields'=>['apiKey','baseUrl','defaultModel','autoModel'],'secrets'=>['apiKey']],
              'chabokan_platform'=>['fields'=>['apiKey','serviceId','deployHookUrl'],'secrets'=>['apiKey']],
              'tamin'=>['fields'=>['mode','username','password','portalUrl'],'secrets'=>['password']],
              'salamat'=>['fields'=>['mode','username','password','portalUrl'],'secrets'=>['password']],
            ];
            if($method==='POST'){
                foreach($providers as $provider=>$def){
                    $existing=bastianDbIntegrationConfig($integrationCenter,$provider);
                    $incoming=is_array($jsonInput[$provider]??null)?$jsonInput[$provider]:[];
                    foreach($def['fields'] as $field){
                        if(array_key_exists($field,$incoming)){
                            $value=is_bool($incoming[$field])?($incoming[$field]?'true':'false'):trim((string)$incoming[$field]);
                            if($value!=='' || !in_array($field,$def['secrets'],true))$existing[$field]=$value;
                        }
                    }
                    foreach($def['secrets'] as $secret)if(!empty($incoming['clear'.ucfirst($secret)]))unset($existing[$secret]);
                    foreach(['url','baseUrl','deployHookUrl','portalUrl'] as $urlField){if(!empty($existing[$urlField])){$u=parse_url((string)$existing[$urlField]);if(!$u||strtolower((string)($u['scheme']??''))!=='https')throw new InvalidArgumentException('تمام آدرس‌های سرویس باید HTTPS باشند.');}}
                    if(in_array($provider,['tamin','salamat'],true) && isset($existing['mode']) && !in_array($existing['mode'],['portal_rpa','official_api'],true))throw new InvalidArgumentException('حالت اتصال بیمه معتبر نیست.');
                    bastianDbSetIntegrationConfig($integrationCenter,$provider,$existing,'superadmin');
                }
                bastianAudit('integration.update',$integrationCenter,'superadmin','superadmin','integration',$integrationCenter,['providers'=>array_keys($providers)]);
            } elseif($method!=='GET'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
            $out=[];$globalKeys=['kavenegar'=>KAVENEGAR_API_KEY,'gemini'=>GEMINI_API_KEY,'identity'=>IDENTITY_PROVIDER_API_KEY];
            foreach($providers as $provider=>$def){
                $cfg=bastianDbIntegrationConfig($integrationCenter,$provider);$public=[];
                foreach($def['fields'] as $field){if(in_array($field,$def['secrets'],true))continue;$public[$field]=(string)($cfg[$field]??($provider==='identity'&&$field==='url'?IDENTITY_PROVIDER_URL:''));}
                foreach($def['secrets'] as $secret){$val=(string)($cfg[$secret]??'');if($secret==='apiKey'&&$val===''&&isset($globalKeys[$provider]))$val=(string)$globalKeys[$provider];$public['configured'.ucfirst($secret)]=$val!=='';$public[$secret==='apiKey'?'maskedKey':'masked'.ucfirst($secret)]=bastianMaskedSecret($val);}
                $out[$provider]=$public;
            }
            $kvCfg=bastianDbIntegrationConfig($integrationCenter,'kavenegar');$out['kavenegar']['webhookUrl']=bastianKavenegarWebhookUrl($integrationCenter);$out['kavenegar']['webhookToken']=bastianKavenegarWebhookToken($integrationCenter);$out['kavenegar']['webhookMode']='token-or-line-match';$out['kavenegar']['webhookPath']='/api/webhook/kavenegar/incoming';
            echo json_encode(['success'=>true,'centerId'=>$integrationCenter,'providers'=>$out,'message'=>$method==='POST'?'تنظیمات سرویس‌های مرکز با موفقیت و به‌صورت رمزگذاری‌شده ذخیره شد.':null],JSON_UNESCAPED_UNICODE);
        } catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);}
        break;

    // 8. Bastian Tickets - SQLite backed and center-scoped
    case 'bastian/tickets':
        $session = $REQUEST_SESSION ?: requireAccess(['center','superadmin']);
        if (!bastianDbEnabled()) { http_response_code(503); echo json_encode(['success'=>false,'error'=>'دیتابیس راه‌اندازی نشده است.'],JSON_UNESCAPED_UNICODE); break; }
        if ($method === 'GET') {
            if (($session['role'] ?? '') === 'superadmin') {
                $st=bastianPdo()->query('SELECT * FROM bastian_tickets ORDER BY updated_at DESC LIMIT 300');
            } else {
                $st=bastianPdo()->prepare('SELECT * FROM bastian_tickets WHERE center_id=? ORDER BY updated_at DESC LIMIT 200');$st->execute([(string)($session['centerId']??'')]);
            }
            $rows=$st->fetchAll();$tickets=array_map(function($r){return ['id'=>$r['id'],'centerId'=>$r['center_id'],'subject'=>$r['subject'],'message'=>$r['message'],'priority'=>$r['priority'],'status'=>$r['status'],'createdBy'=>$r['created_by'],'replies'=>json_decode($r['replies_json']?:'[]',true)?:[],'createdAt'=>date('c',strtotime($r['created_at'])),'updatedAt'=>date('c',strtotime($r['updated_at']))];},$rows);
            echo json_encode(['success'=>true,'tickets'=>$tickets],JSON_UNESCAPED_UNICODE);break;
        }
        if ($method === 'POST') {
            $subject=trim((string)($jsonInput['subject']??''));$message=trim((string)($jsonInput['message']??''));if($subject===''||$message===''){http_response_code(400);echo json_encode(['success'=>false,'error'=>'موضوع و متن تیکت الزامی است.'],JSON_UNESCAPED_UNICODE);break;}
            $centerId=($session['role']??'')==='superadmin'?safeCenterId($jsonInput['centerId']??($session['centerId']??'')):(string)($session['centerId']??'');if(!$centerId){http_response_code(403);echo json_encode(['success'=>false,'error'=>'مرکز نشست مشخص نیست.'],JSON_UNESCAPED_UNICODE);break;}
            $id='tkt-'.time().'-'.bin2hex(random_bytes(4));$now=bastianNow();$creator=(string)($session['userId']??'system');$priority=(string)($jsonInput['priority']??'normal');if(!in_array($priority,['low','normal','high','urgent'],true))$priority='normal';
            $st=bastianPdo()->prepare("INSERT INTO bastian_tickets(id,center_id,subject,message,priority,status,created_by,replies_json,created_at,updated_at) VALUES(?,?,?,?,?,'open',?,'[]',?,?)");$st->execute([$id,$centerId,$subject,$message,$priority,$creator,$now,$now]);bastianAudit('ticket.create',$centerId,$session['role']??'center',$creator,'ticket',$id,['subject'=>$subject]);
            echo json_encode(['success'=>true,'ticket'=>['id'=>$id,'centerId'=>$centerId,'subject'=>$subject,'message'=>$message,'priority'=>$priority,'status'=>'open','createdBy'=>$creator,'replies'=>[],'createdAt'=>date('c',strtotime($now))],'message'=>'تیکت شما ثبت گردید.'],JSON_UNESCAPED_UNICODE);break;
        }
        http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;

    // 4.5.1 - Finance / clinical persistence endpoints. All are center-scoped and audited.
    case 'finance/payment-receipt':
        $session=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $centerId=(string)($session['centerId']??''); if($centerId==='') throw new RuntimeException('مرکز نشست مشخص نیست.');
            $r=is_array($jsonInput['receipt']??null)?$jsonInput['receipt']:$jsonInput;
            $id=trim((string)($r['id']??'')); if($id==='') $id='pay450-'.time().'-'.bin2hex(random_bytes(4));
            $amount=(float)($r['amount']??0); if($amount<=0) throw new InvalidArgumentException('مبلغ پرداخت معتبر نیست.');
            $occurredLocal=trim((string)($r['occurredLocal']??'')); $occurred=trim((string)($r['occurredAt']??'')); if(preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/',$occurredLocal)){$occurredSql=$occurredLocal;}else{$occurredSql=$occurred!==''?date('Y-m-d H:i:s',strtotime($occurred)):bastianNow();}
            $recorded=bastianNow(); $actor=(string)($session['userId']??'system');
            $st=bastianPdo()->prepare("INSERT INTO bastian_payment_receipts(center_id,receipt_id,encounter_id,patient_id,method,amount,tracking_no,occurred_at,recorded_at,actor_id,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE method=VALUES(method),amount=VALUES(amount),tracking_no=VALUES(tracking_no),occurred_at=VALUES(occurred_at),payload_json=VALUES(payload_json)");
            $st->execute([$centerId,$id,(string)($r['encounterId']??''),(string)($r['patientId']??''),(string)($r['method']??'cash'),$amount,(string)($r['trackingNumber']??''),$occurredSql,$recorded,$actor,json_encode($r,JSON_UNESCAPED_UNICODE)]);
            bastianAudit('finance.payment_receipt',$centerId,$session['role']??'center',$actor,'payment_receipt',$id,['amount'=>$amount,'method'=>$r['method']??'cash','occurredAt'=>$occurredSql,'trackingNumber'=>$r['trackingNumber']??'']);
            echo json_encode(['success'=>true,'receiptId'=>$id,'occurredAt'=>date('c',strtotime($occurredSql))],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);} break;

    case 'finance/discount':
        $session=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $centerId=(string)($session['centerId']??'');$d=is_array($jsonInput['discount']??null)?$jsonInput['discount']:$jsonInput;
            $id=trim((string)($d['id']??''));if($id==='')$id='disc450-'.time().'-'.bin2hex(random_bytes(4));
            $amount=(float)($d['amount']??0);$reason=trim((string)($d['reason']??''));$authId=trim((string)($d['authorizerId']??''));
            if($amount<=0||$reason===''||$authId==='')throw new InvalidArgumentException('مبلغ، دلیل و دستوردهنده تخفیف الزامی است.');
            $actor=(string)($session['userId']??'system');$now=bastianNow();
            $st=bastianPdo()->prepare("INSERT INTO bastian_discount_records(center_id,discount_id,encounter_id,patient_id,amount,reason,authorizer_id,authorizer_name,actor_id,created_at,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE amount=VALUES(amount),reason=VALUES(reason),authorizer_id=VALUES(authorizer_id),authorizer_name=VALUES(authorizer_name),payload_json=VALUES(payload_json)");
            $st->execute([$centerId,$id,(string)($d['encounterId']??''),(string)($d['patientId']??''),$amount,$reason,$authId,(string)($d['authorizerName']??''),$actor,$now,json_encode($d,JSON_UNESCAPED_UNICODE)]);
            bastianAudit('finance.discount',$centerId,$session['role']??'center',$actor,'discount',$id,['amount'=>$amount,'reason'=>$reason,'authorizerId'=>$authId]);
            echo json_encode(['success'=>true,'discountId'=>$id],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);} break;

    case 'clinical/custom-service':
        $session=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $centerId=(string)($session['centerId']??'');$x=is_array($jsonInput['service']??null)?$jsonInput['service']:$jsonInput;
            $title=trim((string)($x['title']??''));if($title==='')throw new InvalidArgumentException('عنوان خدمت خاص الزامی است.');
            $key=trim((string)($x['customServiceKey']??mb_strtolower($title,'UTF-8')));$now=bastianNow();$actor=(string)($session['userId']??'system');
            $estimated=(float)($x['estimatedAmount']??$x['unitPrice']??0);$final=($x['finalAmount']??null)!==null?(float)$x['finalAmount']:0;
            $st=bastianPdo()->prepare("INSERT INTO bastian_custom_service_library(center_id,service_key,title,doctor_id,last_estimated_amount,last_final_amount,times_used,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),doctor_id=VALUES(doctor_id),last_estimated_amount=VALUES(last_estimated_amount),last_final_amount=IF(VALUES(last_final_amount)>0,VALUES(last_final_amount),last_final_amount),times_used=times_used+1,payload_json=VALUES(payload_json),updated_at=VALUES(updated_at)");
            $st->execute([$centerId,$key,$title,(string)($x['doctorId']??''),$estimated,$final,json_encode($x,JSON_UNESCAPED_UNICODE),$now,$now]);
            $eventId=trim((string)($x['id']??''));if($eventId==='')$eventId='free450-'.time().'-'.bin2hex(random_bytes(4));
            $centerRevenue=max(0,($final>0?$final:$estimated)-(float)($x['doctorCommissionAmount']??0)-(float)($x['assistantCommissionAmount']??0));
            $ev=bastianPdo()->prepare("INSERT INTO bastian_custom_service_events(center_id,event_id,encounter_id,patient_id,service_key,estimated_amount,final_amount,doctor_commission,care_staff_commission,center_revenue,status,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE final_amount=VALUES(final_amount),doctor_commission=VALUES(doctor_commission),care_staff_commission=VALUES(care_staff_commission),center_revenue=VALUES(center_revenue),status=VALUES(status),payload_json=VALUES(payload_json),updated_at=VALUES(updated_at)");
            $ev->execute([$centerId,$eventId,(string)($x['sourceEncounterId']??$x['encounterId']??''),(string)($x['patientId']??''),$key,$estimated,$final>0?$final:null,(float)($x['doctorCommissionAmount']??0),(float)($x['assistantCommissionAmount']??0),$centerRevenue,(string)($x['priceStatus']??'estimated'),json_encode($x,JSON_UNESCAPED_UNICODE),$now,$now]);
            bastianAudit('clinical.custom_service',$centerId,$session['role']??'center',$actor,'custom_service',$eventId,['title'=>$title,'estimated'=>$estimated,'final'=>$final]);
            echo json_encode(['success'=>true,'serviceKey'=>$key,'eventId'=>$eventId],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);} break;

    case 'consent/upload':
        $session=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $centerId=(string)($session['centerId']??'');if($centerId==='')throw new RuntimeException('مرکز نشست مشخص نیست.');
            if(empty($_FILES['file'])||!is_uploaded_file($_FILES['file']['tmp_name']))throw new InvalidArgumentException('فایل اسکن رضایت‌نامه دریافت نشد.');
            $f=$_FILES['file'];if((int)$f['size']>12*1024*1024)throw new InvalidArgumentException('حداکثر حجم فایل ۱۲ مگابایت است.');
            $mime=(string)(mime_content_type($f['tmp_name'])?:$f['type']??'');$allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp','application/pdf'=>'pdf'];if(!isset($allowed[$mime]))throw new InvalidArgumentException('فرمت فایل رضایت‌نامه مجاز نیست.');
            $patientId=trim((string)($_POST['patientId']??''));$encounterId=trim((string)($_POST['encounterId']??''));$title=trim((string)($_POST['title']??'رضایت‌نامه امضاشده'));$formId=trim((string)($_POST['formId']??''));
            $doctorId=trim((string)($_POST['doctorId']??''));$doctorName=trim((string)($_POST['doctorName']??''));$careId=trim((string)($_POST['careStaffId']??''));$careName=trim((string)($_POST['careStaffName']??''));$companionName=trim((string)($_POST['companionName']??''));$id='cons450-'.time().'-'.bin2hex(random_bytes(5));
            $root=(defined('DATA_DIR')?DATA_DIR:(__DIR__.'/data/')).'consents/'.preg_replace('/[^a-zA-Z0-9_-]/','_',$centerId).'/';if(!is_dir($root)&&!mkdir($root,0750,true)&&!is_dir($root))throw new RuntimeException('ساخت پوشه اسناد انجام نشد.');
            $name=$id.'.'.$allowed[$mime];$path=$root.$name;if(!move_uploaded_file($f['tmp_name'],$path))throw new RuntimeException('ذخیره فایل اسکن انجام نشد.');
            $sha=hash_file('sha256',$path);$now=bastianNow();$actor=(string)($session['userId']??'system');
            $payload=['originalName'=>$f['name']??'','size'=>(int)$f['size'],'patientId'=>$patientId,'encounterId'=>$encounterId,'title'=>$title,'doctorId'=>$doctorId,'doctorName'=>$doctorName,'careStaffId'=>$careId,'careStaffName'=>$careName,'companionName'=>$companionName];
            $st=bastianPdo()->prepare("INSERT INTO bastian_consent_documents(center_id,document_id,patient_id,encounter_id,form_id,title,file_name,file_path,mime_type,sha256,doctor_id,care_staff_id,actor_id,created_at,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([$centerId,$id,$patientId,$encounterId,$formId,$title,$name,$path,$mime,$sha,$doctorId,$careId,$actor,$now,json_encode($payload,JSON_UNESCAPED_UNICODE)]);
            bastianAudit('consent.scan_upload',$centerId,$session['role']??'center',$actor,'consent_document',$id,['patientId'=>$patientId,'encounterId'=>$encounterId,'sha256'=>$sha]);
            echo json_encode(['success'=>true,'document'=>['id'=>$id,'patientId'=>$patientId,'encounterId'=>$encounterId,'title'=>$title,'mimeType'=>$mime,'sha256'=>$sha,'createdAt'=>date('c',strtotime($now)),'downloadUrl'=>'/api/consent/file/'.$id]],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);} break;

    case (preg_match('#^consent/file/([^/]+)$#',$route,$m)?true:false):
        $session=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        try{
            $centerId=(string)($session['centerId']??'');$id=preg_replace('/[^a-zA-Z0-9_-]/','',(string)$m[1]);
            $st=bastianPdo()->prepare('SELECT * FROM bastian_consent_documents WHERE center_id=? AND document_id=? LIMIT 1');$st->execute([$centerId,$id]);$r=$st->fetch();if(!$r){http_response_code(404);echo 'NOT_FOUND';break;}
            $path=(string)$r['file_path'];if(!is_file($path)){http_response_code(404);echo 'FILE_NOT_FOUND';break;}
            header_remove('Content-Length');header_remove('Content-Encoding');header('Content-Type: '.($r['mime_type']?:'application/octet-stream'));header('Content-Disposition: inline; filename="'.basename($r['file_name']).'"');readfile($path);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);} break;

    case 'communication/sms-event':
        $session=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'متد مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $centerId=(string)($session['centerId']??'');if($centerId==='')throw new RuntimeException('مرکز نشست مشخص نیست.');
            $x=is_array($jsonInput['event']??null)?$jsonInput['event']:$jsonInput;
            $id=trim((string)($x['id']??$x['eventId']??''));if($id==='')$id='sms450-'.time().'-'.bin2hex(random_bytes(5));
            $eventType=trim((string)($x['type']??$x['eventType']??'general'));$message=trim((string)($x['message']??''));
            if($message==='')throw new InvalidArgumentException('متن رویداد پیامک الزامی است.');
            $status=trim((string)($x['status']??'sent'));if(!in_array($status,['sent','failed','queued','skipped'],true))$status='sent';
            $occurred=trim((string)($x['occurredAt']??$x['sentAt']??''));$occurredSql=$occurred!==''?date('Y-m-d H:i:s',strtotime($occurred)):bastianNow();
            $actor=(string)($session['userId']??'system');$actorName=trim((string)($x['actorName']??$x['sentByName']??''));$now=bastianNow();
            $st=bastianPdo()->prepare("INSERT INTO bastian_sms_events(center_id,event_id,patient_id,encounter_id,event_type,mobile,message,status,amount,actor_id,actor_name,payload_json,occurred_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),mobile=VALUES(mobile),message=VALUES(message),amount=VALUES(amount),actor_id=VALUES(actor_id),actor_name=VALUES(actor_name),payload_json=VALUES(payload_json),occurred_at=VALUES(occurred_at)");
            $st->execute([$centerId,$id,(string)($x['patientId']??''),(string)($x['encounterId']??''),$eventType,(string)($x['mobile']??''),$message,$status,(float)($x['amount']??$x['debtAmount']??0),$actor,$actorName,json_encode($x,JSON_UNESCAPED_UNICODE),$occurredSql,$now]);
            bastianAudit('communication.sms_event',$centerId,$session['role']??'center',$actor,'sms_event',$id,['eventType'=>$eventType,'status'=>$status,'patientId'=>$x['patientId']??'','encounterId'=>$x['encounterId']??'']);
            echo json_encode(['success'=>true,'eventId'=>$id],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);} break;

    // Kavenegar Incoming SMS Webhook. This endpoint is intentionally public because Kavenegar calls it directly.
    // Security: a per-center deterministic token may be supplied in the URL/header; without it, the destination line
    // must uniquely match the configured Kavenegar sender of exactly one active center.
    case 'webhook/kavenegar/incoming':
        if($method!=='POST'){
            http_response_code(405);
            header('Allow: POST');
            echo json_encode(['success'=>false,'error'=>'METHOD_NOT_ALLOWED'],JSON_UNESCAPED_UNICODE);
            break;
        }
        try{
            $payload = is_array($jsonInput) && $jsonInput ? $jsonInput : $_POST;
            if(!is_array($payload)) $payload=[];
            $from=trim((string)($payload['from']??''));
            $to=trim((string)($payload['to']??''));
            $message=trim((string)($payload['message']??''));
            $messageId=trim((string)($payload['messageId']??$payload['messageid']??$payload['id']??''));
            // Kavenegar's webhook tester may send a probe without a body.
            // Answer immediately so the tester can validate reachability without a timeout.
            if($from==='' && $to==='' && $message===''){
                http_response_code(200);
                echo json_encode([
                    'success'=>true,
                    'webhook'=>true,
                    'test'=>true,
                    'message'=>'Webhook endpoint is reachable. ارسال پیام واقعی باید شامل from، to و message باشد.'
                ],JSON_UNESCAPED_UNICODE);
                break;
            }
            if($from===''||$to===''||$message===''){
                http_response_code(400);
                echo json_encode(['success'=>false,'error'=>'پارامترهای from، to و message الزامی هستند.'],JSON_UNESCAPED_UNICODE);
                break;
            }
            if($messageId==='') $messageId='kv-'.hash('sha256',$from.'|'.$to.'|'.$message.'|'.microtime(true));

            $requestedCenter=safeCenterId($_GET['center']??'');
            $providedToken=trim((string)($_GET['token']??($_SERVER['HTTP_X_BASTIYAN_WEBHOOK_KEY']??($_SERVER['HTTP_X_WEBHOOK_KEY']??''))));
            $centerId='';
            if($requestedCenter!==''){
                if(!bastianDbCenter($requestedCenter)){
                    http_response_code(404); echo json_encode(['success'=>false,'error'=>'مرکز وبهوک پیدا نشد.'],JSON_UNESCAPED_UNICODE); break;
                }
                $expected=bastianKavenegarWebhookToken($requestedCenter);
                if($providedToken!=='' && !hash_equals($expected,$providedToken)){
                    http_response_code(401); echo json_encode(['success'=>false,'error'=>'کلید وبهوک نامعتبر است.'],JSON_UNESCAPED_UNICODE); break;
                }
                $cfg=bastianDbIntegrationConfig($requestedCenter,'kavenegar');
                $sender=trim((string)($cfg['sender']??''));
                if($sender!=='' && !($sender===$to || bastianNormalizeMobile($sender)===bastianNormalizeMobile($to))){
                    http_response_code(409); echo json_encode(['success'=>false,'error'=>'خط مقصد پیامک با خط اختصاصی مرکز تطابق ندارد.'],JSON_UNESCAPED_UNICODE); break;
                }
                $centerId=$requestedCenter;
            } else {
                $matches=bastianFindCenterByKavenegarLine($to);
                if(count($matches)!==1){
                    http_response_code(409);
                    echo json_encode(['success'=>false,'error'=>count($matches)===0?'مرکز متناظر با خط مقصد پیدا نشد.':'خط مقصد بین چند مرکز مشترک است؛ URL وبهوک اختصاصی مرکز را استفاده کنید.'],JSON_UNESCAPED_UNICODE);
                    break;
                }
                $centerId=$matches[0];
                if($providedToken!=='' && !hash_equals(bastianKavenegarWebhookToken($centerId),$providedToken)){
                    http_response_code(401); echo json_encode(['success'=>false,'error'=>'کلید وبهوک نامعتبر است.'],JSON_UNESCAPED_UNICODE); break;
                }
            }

            $patientId=null; $patientName=null;
            try{
                $online=bastianDbOnlineRead($centerId,false);
                $patients=is_array($online['state']['patients']??null)?$online['state']['patients']:[];
                $fromNorm=bastianNormalizeMobile($from);
                foreach($patients as $patient){
                    if(!is_array($patient)) continue;
                    $phones=[$patient['mobilePhone']??'', $patient['mobile']??'', $patient['phone']??'', $patient['phoneNumber']??''];
                    foreach($phones as $phone){
                        if($fromNorm!=='' && $fromNorm===bastianNormalizeMobile((string)$phone)){
                            $patientId=(string)($patient['id']??'') ?: null;
                            $patientName=trim((string)($patient['fullName']??trim(($patient['firstName']??'').' '.($patient['lastName']??'')))) ?: null;
                            break 2;
                        }
                    }
                }
            }catch(Throwable $ignore){}

            $now=bastianNow();
            $check=bastianPdo()->prepare('SELECT 1 FROM bastian_kavenegar_incoming_sms WHERE center_id=? AND message_id=? LIMIT 1');
            $check->execute([$centerId,$messageId]);
            $duplicate=(bool)$check->fetchColumn();
            $st=bastianPdo()->prepare("INSERT INTO bastian_kavenegar_incoming_sms(center_id,message_id,from_mobile,to_line,message,received_at,patient_id,patient_name,status,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE from_mobile=VALUES(from_mobile),to_line=VALUES(to_line),message=VALUES(message),received_at=VALUES(received_at),patient_id=VALUES(patient_id),patient_name=VALUES(patient_name),status=VALUES(status),payload_json=VALUES(payload_json)");
            $st->execute([$centerId,$messageId,$from,$to,$message,$now,$patientId,$patientName,'received',json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$now]);
            if(!$duplicate) bastianAudit('communication.kavenegar_incoming',$centerId,'webhook','kavenegar','sms_inbox',$messageId,['from'=>$from,'to'=>$to,'patientId'=>$patientId,'messageId'=>$messageId]);
            http_response_code(200);
            echo json_encode(['success'=>true,'received'=>true,'duplicate'=>$duplicate,'messageId'=>$messageId,'patientMatched'=>$patientId!==null],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){
            error_log('[Bastiyan Kavenegar Webhook] '.$e->getMessage());
            http_response_code(500);
            echo json_encode(['success'=>false,'error'=>'خطا در ثبت پیامک دریافتی.'],JSON_UNESCAPED_UNICODE);
        }
        break;

    // Read incoming Kavenegar SMS inbox for the authenticated center.
    case 'sms/inbox':
        $inboxSession=$REQUEST_SESSION?:requireAccess(['center','superadmin']);
        if($method!=='GET'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'METHOD_NOT_ALLOWED'],JSON_UNESCAPED_UNICODE);break;}
        try{
            $limit=max(1,min(500,(int)($_GET['limit']??100)));
            $mobile=trim((string)($_GET['mobile']??''));
            $centerFilter=($inboxSession['role']??'')==='superadmin'?safeCenterId($_GET['centerId']??($inboxSession['centerId']??'')):(string)($inboxSession['centerId']??'');
            if($centerFilter===''){echo json_encode(['success'=>true,'messages'=>[]],JSON_UNESCAPED_UNICODE);break;}
            $sql='SELECT center_id,message_id,from_mobile,to_line,message,received_at,patient_id,patient_name,status,created_at FROM bastian_kavenegar_incoming_sms WHERE center_id=?';
            $args=[$centerFilter];
            if($mobile!==''){$sql.=' AND from_mobile LIKE ?';$args[]='%'.$mobile.'%';}
            $sql.=' ORDER BY received_at DESC LIMIT '.$limit;
            $st=bastianPdo()->prepare($sql);$st->execute($args);$rows=$st->fetchAll();
            $messages=array_map(function($r){return ['centerId'=>$r['center_id'],'messageId'=>$r['message_id'],'from'=>$r['from_mobile'],'to'=>$r['to_line'],'message'=>$r['message'],'receivedAt'=>date('c',strtotime($r['received_at'])),'patientId'=>$r['patient_id'],'patientName'=>$r['patient_name'],'status'=>$r['status'],'createdAt'=>date('c',strtotime($r['created_at']))];},$rows);
            echo json_encode(['success'=>true,'messages'=>$messages],JSON_UNESCAPED_UNICODE);
        }catch(Throwable $e){http_response_code(500);echo json_encode(['success'=>false,'error'=>'خواندن صندوق پیامک ممکن نشد.'],JSON_UNESCAPED_UNICODE);}
        break;

    // SMS configuration status; secret values never leave the server.
    case 'sms/status':
        $smsApiKey=bastianServiceValue('kavenegar','apiKey',KAVENEGAR_API_KEY);
        echo json_encode(['success'=>true,'configured'=>$smsApiKey!==''], JSON_UNESCAPED_UNICODE);
        break;

    // 9. SMS Send Endpoint (Kavenegar Integration)
    case 'sms/send':
        $mobile = $jsonInput['mobile'] ?? $jsonInput['receptor'] ?? '';
        $messageText = $jsonInput['message'] ?? '';
        $sender = bastianServiceValue('kavenegar','sender',(string)($jsonInput['sender'] ?? ''));
        $apiKey = bastianServiceValue('kavenegar','apiKey',KAVENEGAR_API_KEY);

        if (empty($mobile) || empty($messageText)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'شماره همراه و متن پیامک الزامی است.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        if (empty($apiKey)) {
            http_response_code(503);
            echo json_encode(['success'=>false,'message'=>'سرویس پیامک روی سرور پیکربندی نشده است.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        // Call Kavenegar API via cURL
        $url = "https://api.kavenegar.com/v1/{$apiKey}/sms/send.json";
        $postData = [
            'receptor' => $mobile,
            'message' => $messageText,
        ];
        if (!empty($sender)) {
            $postData['sender'] = $sender;
        }

        $res = httpCurlRequest($url, 'POST', [], $postData);
        $resData = json_decode($res['response'], true);

        if ($res['code'] === 200 && isset($resData['return']['status']) && $resData['return']['status'] === 200) {
            echo json_encode([
                'success' => true,
                'message' => 'پیامک با موفقیت ارسال شد',
                'entries' => $resData['entries'] ?? []
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => false,
                'message' => $resData['return']['message'] ?? 'خطا در ارسال پیامک کاوه‌نگار',
                'kavenegar_code' => $resData['return']['status'] ?? 0,
                'raw' => $resData
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    // 10. SMS Verify Endpoint (Kavenegar Lookup)
    case 'sms/verify':
        $mobile = $jsonInput['mobile'] ?? $jsonInput['receptor'] ?? '';
        $token = $jsonInput['token'] ?? '';
        $template = $jsonInput['template'] ?? '';
        $apiKey = bastianServiceValue('kavenegar','apiKey',KAVENEGAR_API_KEY);

        if (empty($mobile) || empty($token) || empty($template)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'شماره همراه، کد توکن و نام پترن الزامی است.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        if (empty($apiKey)) {
            http_response_code(503);
            echo json_encode(['success'=>false,'message'=>'سرویس پیامک روی سرور پیکربندی نشده است.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        $url = "https://api.kavenegar.com/v1/{$apiKey}/verify/lookup.json";
        $postData = [
            'receptor' => $mobile,
            'token' => $token,
            'template' => $template,
        ];
        foreach (['token2', 'token3', 'token10', 'token20'] as $tKey) {
            if (!empty($jsonInput[$tKey])) {
                $postData[$tKey] = $jsonInput[$tKey];
            }
        }

        $res = httpCurlRequest($url, 'POST', [], $postData);
        $resData = json_decode($res['response'], true);

        if ($res['code'] === 200 && isset($resData['return']['status']) && $resData['return']['status'] === 200) {
            echo json_encode([
                'success' => true,
                'message' => 'پیامک کد تایید با موفقیت ارسال شد',
                'entries' => $resData['entries'] ?? []
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                'success' => false,
                'message' => $resData['return']['message'] ?? 'خطا در ارسال کد تایید',
                'raw' => $resData
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    // 11. SMS Logs Endpoint
    case 'sms/logs':
        $logs = readJsonFileSafe(DATA_DIR . 'sms_logs.json', []);
        $smsSession = $REQUEST_SESSION ?: requireAccess(['center','superadmin']);
        if (($smsSession['role'] ?? '') !== 'superadmin') {
            $smsCenterId = (string)($smsSession['centerId'] ?? '');
            $logs = array_values(array_filter($logs, fn($log) => (string)($log['centerId'] ?? '') === $smsCenterId));
        }
        $limit = max(1, min(1000, (int)($_GET['limit'] ?? 100)));
        $mobileFilter = trim((string)($_GET['mobile'] ?? ''));
        if ($mobileFilter !== '') {
            $logs = array_values(array_filter($logs, function($log) use ($mobileFilter) { return strpos((string)($log['mobile'] ?? ''), $mobileFilter) !== false; }));
        }
        echo json_encode(['success' => true, 'logs' => array_slice($logs, 0, $limit)], JSON_UNESCAPED_UNICODE);
        break;

    // Automatic 24-hour appointment reminder processor for the current center.
    case 'sms/process-due-reminders':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'METHOD_NOT_ALLOWED']); break; }
        $smsReminderSession = $REQUEST_SESSION ?: requireAccess(['center','superadmin']);
        $smsReminderCenterId = (string)($smsReminderSession['centerId'] ?? ($jsonInput['centerId'] ?? ''));
        if ($smsReminderCenterId === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'مرکز فعال مشخص نیست.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            echo json_encode(bastiyanProcessAppointmentRemindersForCenter($smsReminderCenterId), JSON_UNESCAPED_UNICODE);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success'=>false,'error'=>'پردازش یادآوری نوبت انجام نشد.','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Persistent appointment reminder delivery history, stored separately from center state revisions.
    case 'sms/appointment-reminder-statuses':
        $smsReminderSession = $REQUEST_SESSION ?: requireAccess(['center','superadmin']);
        $smsReminderCenterId = (string)($smsReminderSession['centerId'] ?? ($_GET['centerId'] ?? ''));
        if ($smsReminderCenterId === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'مرکز فعال مشخص نیست.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            $rows = bastiyanReminderStatusRows($smsReminderCenterId, (int)($_GET['limit'] ?? 1500));
            echo json_encode(['success'=>true,'reminders'=>$rows], JSON_UNESCAPED_UNICODE);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success'=>false,'error'=>'خواندن سوابق یادآوری ممکن نشد.','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Register a new appointment in the persistent 24-hour reminder schedule immediately after booking.
    case 'sms/appointment-reminder/schedule':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'METHOD_NOT_ALLOWED']); break; }
        $smsReminderSession = $REQUEST_SESSION ?: requireAccess(['center','superadmin']);
        $smsReminderCenterId = (string)($smsReminderSession['centerId'] ?? '');
        $appointment = is_array($jsonInput['appointment'] ?? null) ? $jsonInput['appointment'] : [];
        if ($smsReminderCenterId === '' || empty($appointment['id'])) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'اطلاعات نوبت معتبر نیست.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            $row = bastiyanRecordAppointmentReminderResult($smsReminderCenterId, $appointment, 'pending', [
                'source'=>'scheduler',
                'scheduledAt'=>date('c'),
                'provider'=>'kavenegar',
                'hoursBefore'=>24,
            ]);
            echo json_encode(['success'=>true,'reminder'=>$row], JSON_UNESCAPED_UNICODE);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success'=>false,'error'=>'برنامه یادآوری نوبت ذخیره نشد.','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Record a manually-sent reminder so the automatic 24-hour scheduler will not duplicate it.
    case 'sms/appointment-reminder/record':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'METHOD_NOT_ALLOWED']); break; }
        $smsReminderSession = $REQUEST_SESSION ?: requireAccess(['center','superadmin']);
        $smsReminderCenterId = (string)($smsReminderSession['centerId'] ?? '');
        $appointment = is_array($jsonInput['appointment'] ?? null) ? $jsonInput['appointment'] : [];
        $status = in_array(($jsonInput['status'] ?? ''), ['sent','failed'], true) ? $jsonInput['status'] : 'sent';
        if ($smsReminderCenterId === '' || empty($appointment['id'])) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'اطلاعات نوبت معتبر نیست.'], JSON_UNESCAPED_UNICODE); break; }
        try {
            $row = bastiyanRecordAppointmentReminderResult($smsReminderCenterId, $appointment, $status, [
                'source'=>'manual',
                'attemptedAt'=>date('c'),
                'sentAt'=>$status === 'sent' ? date('c') : null,
                'provider'=>'kavenegar',
                'providerMessageId'=>$jsonInput['providerMessageId'] ?? null,
                'error'=>$jsonInput['error'] ?? null,
                'incrementAttempts'=>true,
                'hoursBefore'=>(int)($jsonInput['hoursBefore'] ?? 24),
            ]);
            echo json_encode(['success'=>true,'reminder'=>$row], JSON_UNESCAPED_UNICODE);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success'=>false,'error'=>'ثبت سابقه یادآوری ممکن نشد.','message'=>$e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        break;

    // Batch scheduled SMS reminders
    case 'sms/process-scheduled-reminders':
        $appointments = is_array($jsonInput['appointments'] ?? null) ? $jsonInput['appointments'] : [];
        $settings = is_array($jsonInput['settings'] ?? null) ? $jsonInput['settings'] : [];
        $template = $settings['smsRevisitTemplate'] ?? 'بیمار گرامی {patient_name}، نوبت شما در {clinic_name} برای تاریخ {date} ساعت {time} نزد {doctor_name} تنظیم شده است.';
        $clinicName = trim((string)($settings['clinicName'] ?? '')) ?: 'مرکز درمانی';
        $sender = bastianServiceValue('kavenegar','sender',(string)($settings['smsSenderLine'] ?? ''));
        $apiKey = bastianServiceValue('kavenegar','apiKey',KAVENEGAR_API_KEY);
        $results = [];
        $sentCount = 0;
        foreach ($appointments as $appointment) {
            if (!empty($appointment['smsReminderSent'])) continue;
            $mobile = trim((string)($appointment['mobilePhone'] ?? ''));
            if (strlen($mobile) < 10) continue;
            $text = strtr($template, [
                '{patient_name}' => $appointment['patientName'] ?? 'بیمار گرامی',
                '{clinic_name}' => $clinicName,
                '{date}' => $appointment['jalaliDate'] ?? '',
                '{time}' => $appointment['timeSlot'] ?? '',
                '{doctor_name}' => $appointment['doctorName'] ?? 'پزشک معالج',
            ]);
            if ($apiKey === '') {
                $ok = false;
                $error = 'کلید کاوه‌نگار روی سرور تنظیم نشده است.';
            } else {
                $url = 'https://api.kavenegar.com/v1/' . rawurlencode($apiKey) . '/sms/send.json';
                $postData = ['receptor' => $mobile, 'message' => $text];
                if ($sender !== '') $postData['sender'] = $sender;
                $sendRes = httpCurlRequest($url, 'POST', [], $postData);
                $sendData = decodeRemoteJson($sendRes['response']);
                $ok = $sendRes['code'] === 200 && (($sendData['return']['status'] ?? 0) === 200);
                $error = $ok ? null : ($sendData['return']['message'] ?? $sendRes['error'] ?? 'خطا در ارسال');
            }
            if ($ok) $sentCount++;
            appendSmsLog('scheduled', $mobile, $text, $ok, ['error' => $error]);
            $results[] = ['id' => $appointment['id'] ?? '', 'patientName' => $appointment['patientName'] ?? '', 'mobilePhone' => $mobile, 'success' => $ok, 'error' => $error];
        }
        echo json_encode(['success' => true, 'processedTotal' => count($appointments), 'sentCount' => $sentCount, 'results' => $results], JSON_UNESCAPED_UNICODE);
        break;

    // 12. Tamin Token Endpoint
    case 'tamin/token':
        $grantType = $jsonInput['grantType'] ?? 'authorization_code';
        $clientId = $jsonInput['clientId'] ?? 'clinic_app';
        $environment = $jsonInput['environment'] ?? 'production';
        $domain = $environment === 'production' ? 'account.tamin.ir' : 'account-pilot.tamin.ir';
        $tokenUrl = $grantType === 'refresh_token'
            ? "https://{$domain}/auth/server/v2/token"
            : "https://{$domain}/auth/server/token";

        $postParams = [];
        if ($grantType === 'authorization_code') {
            $postParams['grant_type'] = 'authorization_code';
            $postParams['client_id'] = $clientId;
            $postParams['code'] = $jsonInput['code'] ?? '';
            $postParams['code_verifier'] = $jsonInput['codeVerifier'] ?? '';
            $postParams['redirect_uri'] = $jsonInput['redirectUri'] ?? '';
        } else {
            $postParams['grant_type'] = 'refresh_token';
            $postParams['client_id'] = $clientId;
            $postParams['audience'] = $jsonInput['audience'] ?? '';
        }

        $res = httpCurlRequest($tokenUrl, 'POST', ['Content-Type: application/x-www-form-urlencoded'], $postParams);
        $data = json_decode($res['response'], true);

        if ($res['code'] === 200 && $data) {
            echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code($res['code'] ?: 400);
            echo json_encode([
                'success' => false,
                'error' => $data['error_description'] ?? $data['error'] ?? 'خطا در صدور توکن تامین اجتماعی',
                'raw' => $data ?: $res['response']
            ], JSON_UNESCAPED_UNICODE);
        }
        break;

    // 13. Tamin Eligibility Endpoint — live response only; no simulated eligibility.
    case 'tamin/deserve-info':
    case 'tamin/eligibility':
        $nationalId = trim((string)($jsonInput['nationalId'] ?? $jsonInput['patientNationalId'] ?? ''));
        $siamOrCode = trim((string)($jsonInput['siamOrCode'] ?? $jsonInput['siamId'] ?? ''));
        $docId = trim((string)($jsonInput['docId'] ?? ''));
        $accessToken = trim((string)($jsonInput['accessToken'] ?? ''));
        if (!preg_match('/^\d{10}$/',$nationalId)) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'کد ملی بیمار باید ۱۰ رقم باشد.'],JSON_UNESCAPED_UNICODE); break; }
        if ($siamOrCode==='' || $docId==='') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'شناسه سیام/نظام پزشکی و شناسه پزشک برای استعلام تأمین اجتماعی الزامی است.'],JSON_UNESCAPED_UNICODE); break; }
        $targetUrl='https://soa.tamin.ir/interface/epresc/patient/v1/deserve-info/'.rawurlencode($siamOrCode).'/'.rawurlencode($docId).'/'.rawurlencode($nationalId);
        $headers=['Accept: application/json','Content-Type: application/json']; if($accessToken!=='')$headers[]='Authorization: '.(str_starts_with($accessToken,'Bearer ')?$accessToken:'Bearer '.$accessToken);
        $res=httpCurlRequest($targetUrl,'GET',$headers,null,15);$data=decodeRemoteJson($res['response']);
        if($res['code']>=200&&$res['code']<300&&is_array($data)){
            $deserved=!empty($data['deserve'])||!empty($data['deserved'])||($data['resCode']??null)===0||($data['resCode']??null)==='0';
            echo json_encode(['success'=>true,'live'=>true,'eligibility'=>['deserved'=>$deserved,'patientNationalId'=>$nationalId,'fullName'=>$data['fullName']??'','insuredType'=>$data['insuredType']??'','coveragePercent'=>(float)($data['coveragePercent']??0),'validUntilJalali'=>$data['validUntilJalali']??'','insuranceBookletNumber'=>$data['insuranceBookletNumber']??$data['bookletNumber']??'','message'=>$data['message']??$data['resMsg']??($deserved?'استحقاق درمان در پاسخ سرویس تأیید شد.':'استحقاق درمان در پاسخ سرویس تأیید نشد.'),'rawResponse'=>$data]],JSON_UNESCAPED_UNICODE);
        } else { http_response_code(502); echo json_encode(['success'=>false,'live'=>false,'error'=>$data['message']??$data['resMsg']??$res['error']??'پاسخ معتبر از سرویس تأمین اجتماعی دریافت نشد.','remoteStatus'=>$res['code']],JSON_UNESCAPED_UNICODE); }
        break;

    // 14. Salamat Eligibility Endpoint — live response only; no generated coverage.
    case 'salamat/eligibility':
        $nationalId=trim((string)($jsonInput['nationalId']??''));$accessToken=trim((string)($jsonInput['accessToken']??''));$environment=(string)($jsonInput['environment']??'production');
        if(!preg_match('/^\d{10}$/',$nationalId)){http_response_code(400);echo json_encode(['success'=>false,'error'=>'کد ملی بیمار باید ۱۰ رقم باشد.'],JSON_UNESCAPED_UNICODE);break;}
        $domain=$environment==='sandbox'?'sandbox-eservices.ihio.gov.ir':'eservices.ihio.gov.ir';$targetUrl='https://'.$domain.'/api/v1/eligibility?nationalId='.rawurlencode($nationalId);
        $headers=['Accept: application/json','Content-Type: application/json'];if($accessToken!=='')$headers[]='Authorization: '.(str_starts_with($accessToken,'Bearer ')?$accessToken:'Bearer '.$accessToken);
        $res=httpCurlRequest($targetUrl,'GET',$headers,null,15);$data=decodeRemoteJson($res['response']);
        if($res['code']>=200&&$res['code']<300&&is_array($data)){
            $deserved=!empty($data['deserved'])||!empty($data['deserve']);
            echo json_encode(['success'=>true,'live'=>true,'eligibility'=>['deserved'=>$deserved,'nationalId'=>$nationalId,'fullName'=>$data['fullName']??'','insuranceBoxName'=>$data['insuranceBoxName']??'','insuranceBookletNumber'=>$data['insuranceBookletNumber']??$data['bookletNumber']??'','coveragePercent'=>(float)($data['coveragePercent']??0),'validUntilJalali'=>$data['validUntilJalali']??'','statusMessage'=>$data['statusMessage']??$data['message']??($deserved?'پوشش فعال در پاسخ سرویس تأیید شد.':'پوشش فعال در پاسخ سرویس تأیید نشد.'),'inquiryDate'=>date('c')]],JSON_UNESCAPED_UNICODE);
        } else {http_response_code(502);echo json_encode(['success'=>false,'live'=>false,'error'=>$data['message']??$res['error']??'پاسخ معتبر از سرویس بیمه سلامت دریافت نشد.','remoteStatus'=>$res['code']],JSON_UNESCAPED_UNICODE);}
        break;

    // Tamin e-prescription endpoints used by the React client
    case 'tamin/send-epresc':
        $payload = $jsonInput['payload'] ?? [];
        $accessToken = $jsonInput['accessToken'] ?? '';
        $res = httpCurlRequest('https://soa.tamin.ir/interface/epresc/SendEpresc/v2', 'POST', taminHeaders($accessToken), json_encode($payload, JSON_UNESCAPED_UNICODE), 15);
        $data = decodeRemoteJson($res['response']);
        if ($res['code'] >= 200 && $res['code'] < 300 && is_array($data)) {
            echo json_encode([
                'success' => true,
                'headerID' => $data['headerID'] ?? $data['id'] ?? null,
                'trackingCode' => $data['trackingCode'] ?? $data['trackCode'] ?? null,
                'message' => $data['message'] ?? $data['resMsg'] ?? 'نسخه الکترونیک در سامانه تامین اجتماعی ثبت گردید.',
                'raw' => $data
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['success' => false, 'status' => $res['code'], 'error' => $data['message'] ?? $data['resMsg'] ?? $data['error'] ?? $res['error'] ?? $res['response'] ?? 'خطا در ثبت نسخه', 'raw' => $data ?: $res['response']], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'tamin/remove-epresc':
        $headerID = trim((string)($jsonInput['headerID'] ?? ''));
        $docId = trim((string)($jsonInput['docId'] ?? ''));
        if ($headerID === '' || $docId === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'headerID و docId الزامی است.'], JSON_UNESCAPED_UNICODE); break; }
        $url = 'https://soa.tamin.ir/interface/epresc/SendEpresc/v2/remove/' . rawurlencode($headerID) . '/' . rawurlencode($docId);
        $res = httpCurlRequest($url, 'POST', taminHeaders($jsonInput['accessToken'] ?? ''), null, 15);
        $data = decodeRemoteJson($res['response']);
        $ok = $res['code'] >= 200 && $res['code'] < 300;
        echo json_encode($ok ? ['success'=>true,'message'=>$data['message'] ?? $data['resMsg'] ?? 'نسخه با موفقیت حذف گردید.'] : ['success'=>false,'error'=>$data['message'] ?? $data['resMsg'] ?? $res['error'] ?? $res['response']], JSON_UNESCAPED_UNICODE);
        break;

    case 'tamin/get-epresc':
        $headerID = trim((string)($jsonInput['headerID'] ?? ''));
        $docId = trim((string)($jsonInput['docId'] ?? ''));
        if ($headerID === '' || $docId === '') { http_response_code(400); echo json_encode(['success'=>false,'error'=>'headerID و docId الزامی است.'], JSON_UNESCAPED_UNICODE); break; }
        $url = 'https://soa.tamin.ir/interface/epresc/SendEpresc/v2/' . rawurlencode($headerID) . '/' . rawurlencode($docId);
        $res = httpCurlRequest($url, 'GET', taminHeaders($jsonInput['accessToken'] ?? ''), null, 15);
        $data = decodeRemoteJson($res['response']);
        $ok = $res['code'] >= 200 && $res['code'] < 300 && is_array($data);
        echo json_encode($ok ? ['success'=>true,'prescription'=>$data] : ['success'=>false,'error'=>$data['message'] ?? $data['resMsg'] ?? $res['error'] ?? $res['response']], JSON_UNESCAPED_UNICODE);
        break;

    case 'tamin/edit-epresc':
        $headerID = trim((string)($jsonInput['headerID'] ?? ''));
        $docId = trim((string)($jsonInput['docId'] ?? ''));
        $prescTypeId = (int)($jsonInput['prescTypeId'] ?? 0);
        if (in_array($prescTypeId, [3,5], true)) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'طبق ضوابط تامین اجتماعی، نسخه‌های ویزیت (۳) و خدمات پزشکی (۵) قابل ویرایش نیستند.'], JSON_UNESCAPED_UNICODE); break; }
        $url = 'https://soa.tamin.ir/interface/epresc/SendEpresc/v2/edit/' . rawurlencode($headerID) . '/' . rawurlencode($docId);
        $res = httpCurlRequest($url, 'POST', taminHeaders($jsonInput['accessToken'] ?? ''), json_encode($jsonInput['payload'] ?? [], JSON_UNESCAPED_UNICODE), 15);
        $data = decodeRemoteJson($res['response']);
        $ok = $res['code'] >= 200 && $res['code'] < 300;
        echo json_encode($ok ? ['success'=>true,'message'=>$data['message'] ?? $data['resMsg'] ?? 'نسخه با موفقیت ویرایش گردید.','raw'=>$data] : ['success'=>false,'error'=>$data['message'] ?? $data['resMsg'] ?? $res['error'] ?? $res['response']], JSON_UNESCAPED_UNICODE);
        break;

    case 'tamin/patient-diseases-list':
        $res = httpCurlRequest('https://soa.tamin.ir/interface/epresc/patient-diseases-list/v1', 'GET', taminHeaders($jsonInput['accessToken'] ?? ''), null, 15);
        $data = decodeRemoteJson($res['response']);
        if ($res['code'] >= 200 && $res['code'] < 300 && is_array($data)) {
            $diseases = array_is_list($data) ? $data : ($data['diseases'] ?? $data['list'] ?? []);
            echo json_encode(['success'=>true,'diseases'=>$diseases], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(['success'=>false,'error'=>$data['message'] ?? $res['error'] ?? $res['response'] ?? 'خطا در دریافت لیست بیماری‌ها'], JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'tamin/save-patient-info-illness':
        $res = httpCurlRequest('https://soa.tamin.ir/interface/epresc/save-patient-info-illness/v1', 'POST', taminHeaders($jsonInput['accessToken'] ?? ''), json_encode($jsonInput['payload'] ?? [], JSON_UNESCAPED_UNICODE), 15);
        $data = decodeRemoteJson($res['response']);
        $ok = $res['code'] >= 200 && $res['code'] < 300;
        echo json_encode($ok ? ['success'=>true,'message'=>$data['message'] ?? $data['resMsg'] ?? 'اطلاعات بیماری بیمار ثبت گردید.','raw'=>$data] : ['success'=>false,'error'=>$data['message'] ?? $data['resMsg'] ?? $res['error'] ?? $res['response']], JSON_UNESCAPED_UNICODE);
        break;

    // 15. Insurance Logs Endpoint
    case 'insurance/logs':
        $sess=$REQUEST_SESSION?:requireAccess(['center','superadmin']);$cid=(string)($sess['centerId']??'');$provider=trim((string)($jsonInput['providerCode']??''));$status=trim((string)($jsonInput['status']??''));bastianAudit('insurance.inquiry',$cid?:null,$sess['role']??'center',$sess['userId']??null,'insurance',$provider,['status'=>$status]);echo json_encode(['success'=>true,'message'=>'ثبت رویداد استعلام انجام شد.'],JSON_UNESCAPED_UNICODE);
        break;

    // 16. PC-POS SamanKish Pay & Status
    case 'pcpos/saman/pay':
        http_response_code(503);
        echo json_encode(['success'=>false,'error'=>'کارتخوان LAN از هاست اینترنتی قابل دسترسی مستقیم نیست. پرداخت را از Mother PC مرکز انجام دهید.','errorCode'=>'MOTHER_PC_REQUIRED','mode'=>'unavailable_on_cloud'],JSON_UNESCAPED_UNICODE);
        break;

    case 'pcpos/saman/status':
        http_response_code(503);
        echo json_encode(['success'=>false,'connected'=>false,'latencyMs'=>0,'message'=>'بررسی کارتخوان LAN فقط از Mother PC مرکز انجام می‌شود.','errorCode'=>'MOTHER_PC_REQUIRED'],JSON_UNESCAPED_UNICODE);
        break;


    // Lilian R12 — permission-aware operational AI
    case 'lilian/assistant':
        if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'عملیات مجاز نیست.'],JSON_UNESCAPED_UNICODE);break;}
        $session=requireAccess(['superadmin','center']);
        try{
            $prompt=trim((string)($jsonInput['prompt']??''));
            if($prompt==='')throw new InvalidArgumentException('متن درخواست خالی است.');
            $allowed=lilianAllowedTools($session);
            $plan=lilianGeminiPlan($prompt,$allowed,$session);
            if(($plan['kind']??'')==='tool'){
                $tool=(string)($plan['tool']??'');$args=is_array($plan['args']??null)?$plan['args']:[];
                $result=lilianExecuteTool($tool,$args,$session);
                bastianAudit('lilian.tool',lilianCenterId($session)?:null,$session['role']??'center',$session['userId']??null,'lilian',$tool,['args'=>$args,'userRole'=>lilianUserRole($session)]);
                echo json_encode(['success'=>true,'reply'=>lilianFormatToolResult($result),'tool'=>$tool,'result'=>$result,'permissions'=>$allowed,'isSuperAdmin'=>lilianIsSuperAdmin($session)],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);break;
            }
            echo json_encode(['success'=>true,'reply'=>(string)($plan['reply']??'درخواست دریافت شد.'),'permissions'=>$allowed,'isSuperAdmin'=>lilianIsSuperAdmin($session)],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        }catch(Throwable $e){
            http_response_code(400);
            echo json_encode(['success'=>false,'error'=>'لیلیان نتوانست این دستور را اجرا کند.','detail'=>preg_replace('/[^A-Za-z0-9_:\-.]/','_',substr($e->getMessage(),0,120))],JSON_UNESCAPED_UNICODE);
        }
        break;

    // 17. Clinical AI Assistant Endpoint (Google Gemini REST Call in PHP)
    case 'gemini/assistant':
        $prompt = trim($jsonInput['prompt'] ?? '');
        $role = $jsonInput['role'] ?? 'doctor';
        $mode = $jsonInput['mode'] ?? 'clinical';

        if (empty($prompt)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'لطفاً متن پرسش یا درخواست بالینی خود را وارد نمایید.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        $apiKey = bastianServiceValue('gemini','apiKey',GEMINI_API_KEY);

        if (empty($apiKey)) {
            echo json_encode([
                'success' => true,
                'reply' => "⚠️ کلید API هوش مصنوعی برای این مرکز تنظیم نشده است. Super Admin می‌تواند آن را از بخش مدیریت نسخه و سرویس‌ها ثبت کند.\n\nپاسخ بالینی پیش‌فرض:\n• جهت درخواست شما («" . (function_exists('mb_substr') ? mb_substr($prompt, 0, 50) : substr($prompt, 0, 50)) . "...»)، بررسی دقیق علائم حیاتی و سوابق دارویی بیمار توصیه می‌شود.",
                'mode' => $mode,
                'role' => $role,
            ], JSON_UNESCAPED_UNICODE);
            break;
        }

        $systemInstruction = "شما «مدیکال آی‌آی (Medical AI)» دستیار تخصصی کلینیک جراحی و زیبایی دکتر باستیان هستید. به زبان فارسی روان، علمی و ساختاریافته (با تیتربندی و بالت‌پوینت) پاسخ دهید.";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . urlencode($apiKey);

        $payload = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => "نقش من: {$role}\nحالت: {$mode}\n\nپرسش کاربر:\n{$prompt}"]
                    ]
                ]
            ],
            'systemInstruction' => [
                'parts' => [
                    ['text' => $systemInstruction]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.2
            ]
        ];

        $res = httpCurlRequest($url, 'POST', ['Content-Type: application/json'], json_encode($payload));
        $resData = json_decode($res['response'], true);

        $reply = $resData['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if ($reply) {
            echo json_encode([
                'success' => true,
                'reply' => $reply,
                'mode' => $mode,
                'role' => $role,
            ], JSON_UNESCAPED_UNICODE);
        } else {
            // Try fallback model if gemini-2.5-flash model name differs
            $fallbackUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . urlencode($apiKey);
            $res2 = httpCurlRequest($fallbackUrl, 'POST', ['Content-Type: application/json'], json_encode($payload));
            $resData2 = json_decode($res2['response'], true);
            $reply2 = $resData2['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if ($reply2) {
                echo json_encode([
                    'success' => true,
                    'reply' => $reply2,
                    'mode' => $mode,
                    'role' => $role,
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'خطا در دریافت پاسخ از مدل جمینای: ' . ($resData['error']['message'] ?? 'خطای ناشناخته'),
                    'raw' => $resData
                ], JSON_UNESCAPED_UNICODE);
            }
        }
        break;

    // 18. Patient Identity Check — server-side provider proxy; secret never reaches browser.
    case 'identity/check':
        $nationalId=trim((string)($jsonInput['nationalId']??''));$mobilePhone=trim((string)($jsonInput['mobilePhone']??''));
        if(!preg_match('/^\d{10}$/',$nationalId)){http_response_code(400);echo json_encode(['success'=>false,'message'=>'کد ملی نامعتبر است.'],JSON_UNESCAPED_UNICODE);break;}
        $identityUrl=bastianServiceValue('identity','url',IDENTITY_PROVIDER_URL);$identityKey=bastianServiceValue('identity','apiKey',IDENTITY_PROVIDER_API_KEY);
        if($identityUrl===''||$identityKey===''){http_response_code(503);echo json_encode(['success'=>false,'message'=>'سرویس استعلام هویت برای این مرکز پیکربندی نشده است.'],JSON_UNESCAPED_UNICODE);break;}
        $u=parse_url($identityUrl);if(!$u||strtolower((string)($u['scheme']??''))!=='https'){http_response_code(503);echo json_encode(['success'=>false,'message'=>'آدرس سرویس استعلام هویت باید HTTPS باشد.'],JSON_UNESCAPED_UNICODE);break;}
        $payload=json_encode(['nationalId'=>$nationalId,'mobilePhone'=>$mobilePhone],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$res=httpCurlRequest($identityUrl,'POST',['Content-Type: application/json','Accept: application/json','X-API-Key: '.$identityKey],$payload,15);$data=decodeRemoteJson($res['response']);
        if($res['code']>=200&&$res['code']<300&&is_array($data)&&(!array_key_exists('success',$data)||!empty($data['success']))){$pd=$data['patientData']??$data['data']??$data;echo json_encode(['success'=>true,'message'=>$data['message']??'استعلام هویت انجام شد.','patientData'=>$pd],JSON_UNESCAPED_UNICODE);}
        else{http_response_code(502);echo json_encode(['success'=>false,'message'=>$data['message']??$data['error']??$res['error']??'پاسخ معتبر از سرویس استعلام هویت دریافت نشد.'],JSON_UNESCAPED_UNICODE);}
        break;

    // 19. Saman Kish (SEP) PC-POS Driver Routes - Protocol SSP1126
    case 'pos/saman-kish/ping':
        $session=requireAccess(['superadmin','center']);
        $ip = trim((string)($jsonInput['ip'] ?? SAMANKISH_DEFAULT_IP));
        $port = intval($jsonInput['port'] ?? SAMANKISH_DEFAULT_PORT);
        if ($port <= 0) $port = SAMANKISH_DEFAULT_PORT;
        $res = pingSamanKishPos($ip, $port);
        echo json_encode($res, JSON_UNESCAPED_UNICODE);
        break;

    case 'pos/saman-kish/sale':
        $session=requireAccess(['superadmin','center']);
        $ip = trim((string)($jsonInput['ip'] ?? SAMANKISH_DEFAULT_IP));
        $port = intval($jsonInput['port'] ?? SAMANKISH_DEFAULT_PORT);
        if ($port <= 0) $port = SAMANKISH_DEFAULT_PORT;
        $terminalId = trim((string)($jsonInput['terminalId'] ?? SAMANKISH_DEFAULT_TERMINAL_ID));
        $amountToman = intval($jsonInput['amount'] ?? 0);
        $amountRials = intval($jsonInput['amountRials'] ?? ($amountToman * 10));
        $invoiceNo = trim((string)($jsonInput['invoiceNo'] ?? ''));
        $timeout = intval($jsonInput['timeout'] ?? 65);

        if ($amountRials <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'مبلغ تراکنش باید بزرگتر از صفر باشد.'], JSON_UNESCAPED_UNICODE);
            break;
        }

        $res = executeSamanKishSale($ip, $port, $terminalId, $amountRials, $invoiceNo, $timeout);
        echo json_encode($res, JSON_UNESCAPED_UNICODE);
        break;

    case 'pos/saman-kish/config':
        $session=requireAccess(['superadmin','center']);
        echo json_encode([
            'success' => true,
            'defaultIp' => SAMANKISH_DEFAULT_IP,
            'defaultPort' => SAMANKISH_DEFAULT_PORT,
            'defaultTerminalId' => SAMANKISH_DEFAULT_TERMINAL_ID,
            'protocol' => 'SSP1126',
            'provider' => 'Saman Kish (SEP)',
            'merchantIdRequired' => false,
            'recommendedTcpPort' => 1197,
            'networkRequirement' => 'Cloud HIS must have a secure route/VPN/local bridge to the POS LAN when POS uses a private IP.',
            'subnetMask' => '255.255.255.0',
            'gateway' => '192.168.1.1'
        ], JSON_UNESCAPED_UNICODE);
        break;

    // Default 404
    default:
        http_response_code(404);
        echo json_encode(['error' => 'API Endpoint Not Found', 'route' => $route], JSON_UNESCAPED_UNICODE);
        break;
}
