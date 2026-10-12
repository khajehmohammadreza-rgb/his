<?php
if (file_exists(__DIR__ . '/data/.install.lock')) { http_response_code(404); exit('Setup is locked.'); }
/**
 * Bastian Clinic - Setup & Installation Wizard (Host Version with Auth)
 * راه‌اندازی هاست + ساخت کاربر سوپرادمین اولیه
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

$configFile   = __DIR__ . '/config.php';
$usersFile    = __DIR__ . '/data/users_store.json';
$dataDir      = __DIR__ . '/data';
$isInstalled  = file_exists($configFile);
$step         = (int)($_GET['step'] ?? 1);
$errorMessage = '';
$successMsg   = '';

if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);

function hashPass(string $p): string { return hash('sha256', $p . 'bc_salt_v1'); }
function secureHash(string $p): string { return password_hash($p, PASSWORD_DEFAULT); }

function getUsers(string $file): array {
    if (file_exists($file)) {
        $d = json_decode(file_get_contents($file), true);
        if (is_array($d)) return $d;
    }
    return ['users' => []];
}
function saveUsers(string $file, array $d): void {
    @file_put_contents($file, json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// ── پردازش فرم نصب دیتابیس ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'install_db') {
    $dbHost    = trim($_POST['db_host']     ?? 'localhost');
    $dbPort    = trim($_POST['db_port']     ?? '3306');
    $dbName    = trim($_POST['db_name']     ?? '');
    $dbUser    = trim($_POST['db_user']     ?? '');
    $dbPass    = trim($_POST['db_pass']     ?? '');
    $clinicName= trim($_POST['clinic_name'] ?? 'درمانگاه تخصصی بیمارستان امام حسین (ع) اهرم');
    $adminUser = trim($_POST['admin_user']  ?? 'admin');
    $adminPass = trim($_POST['admin_pass']  ?? '');
    $centerUser = trim($_POST['center_user'] ?? 'ahram');
    $dispPass  = trim($_POST['disp_pass']   ?? '');

    if (empty($dbName) || empty($dbUser)) {
        $errorMessage = 'نام دیتابیس و نام کاربری دیتابیس الزامی است.';
    } elseif (strlen($adminPass) < 8) {
        $errorMessage = 'رمز سوپرادمین باید حداقل ۸ کاراکتر باشد.';
    } elseif (strlen($dispPass) < 6) {
        $errorMessage = 'رمز نمایشگر/مرکز باید حداقل ۶ کاراکتر باشد.';
    } else {
        try {
            $dsn = "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci");
            $pdo->exec("USE `{$dbName}`");

            // جداول
            $pdo->exec("CREATE TABLE IF NOT EXISTS `clinic_settings` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `clinicName` VARCHAR(255) NOT NULL DEFAULT 'درمانگاه باستیان',
                `subtitle` VARCHAR(255) DEFAULT 'سامانه هوشمند فراخوان نوبت',
                `repeatCount` INT DEFAULT 2, `volume` FLOAT DEFAULT 0.9,
                `autoPrintOnCreate` TINYINT(1) DEFAULT 0, `showDoctorPhoto` TINYINT(1) DEFAULT 1,
                `showLogo` TINYINT(1) DEFAULT 1, `phone` VARCHAR(50), `address` TEXT,
                `lanIp` VARCHAR(50) DEFAULT '192.168.1.100', `port` INT DEFAULT 80,
                `systemVersion` INT DEFAULT 1,
                `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci");

            $pdo->exec("CREATE TABLE IF NOT EXISTS `doctors` (
                `id` VARCHAR(50) PRIMARY KEY, `name` VARCHAR(150) NOT NULL,
                `specialty` VARCHAR(150) NOT NULL, `room` VARCHAR(50) NOT NULL,
                `color` VARCHAR(50) DEFAULT 'indigo', `isActive` TINYINT(1) DEFAULT 1,
                `photoUrl` TEXT DEFAULT NULL, `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci");

            $pdo->exec("CREATE TABLE IF NOT EXISTS `queues` (
                `id` VARCHAR(50) PRIMARY KEY, `number` INT NOT NULL,
                `doctorId` VARCHAR(50) NOT NULL, `patientName` VARCHAR(150) DEFAULT 'بدون نام',
                `nationalId` VARCHAR(50), `status` ENUM('waiting','calling','visited','absent') DEFAULT 'waiting',
                `wasAbsent` TINYINT(1) DEFAULT 0, `doctorNote` TEXT,
                `createdAt` VARCHAR(50) NOT NULL, `calledAt` VARCHAR(50), `visitedAt` VARCHAR(50),
                INDEX(`doctorId`), INDEX(`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci");

            $pdo->exec("CREATE TABLE IF NOT EXISTS `tickers` (
                `id` VARCHAR(50) PRIMARY KEY, `text` TEXT NOT NULL,
                `isActive` TINYINT(1) DEFAULT 1, `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci");

            $pdo->exec("CREATE TABLE IF NOT EXISTS `system_sync` (
                `id` INT PRIMARY KEY DEFAULT 1, `version` INT DEFAULT 1,
                `lastUpdated` BIGINT DEFAULT 0, `lastAnnouncement` TEXT, `lastSecretaryCall` TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci");

            // داده پیش‌فرض
            $stmt = $pdo->query("SELECT COUNT(*) as c FROM `clinic_settings`");
            if ($stmt->fetch()['c'] == 0) {
                $pdo->prepare("INSERT INTO `clinic_settings` (`clinicName`,`subtitle`,`phone`,`address`,`systemVersion`) VALUES (?,?,?,?,1)")
                    ->execute([$clinicName,'سامانه هوشمند فراخوان نوبت و مدیریت درمانگاه','۰۷۷-۳۵۲۲۲۰۰۰','بوشهر، شهرستان تنگستان، اهرم، بلوار امام خمینی']);
            }
            $stmt = $pdo->query("SELECT COUNT(*) as c FROM `doctors`");
            if ($stmt->fetch()['c'] == 0) {
                $ins = $pdo->prepare("INSERT INTO `doctors`(`id`,`name`,`specialty`,`room`,`color`) VALUES(?,?,?,?,?)");
                foreach([['doc-1','دکتر علیرضا باستیان','متخصص داخلی و گوارش','اتاق ۱','indigo'],
                          ['doc-2','دکتر مریم رضایی','فوق تخصص قلب و عروق','اتاق ۲','emerald'],
                          ['doc-3','دکتر امیرحسین مرادی','متخصص اطفال و نوزادان','اتاق ۳','sky'],
                          ['doc-4','دکتر فاطمه حسینی','جراح و متخصص ارتوپدی','اتاق ۴','amber']] as $d)
                    $ins->execute($d);
            }
            $pdo->exec("INSERT INTO `system_sync`(`id`,`version`,`lastUpdated`) VALUES(1,1,UNIX_TIMESTAMP()*1000) ON DUPLICATE KEY UPDATE `version`=`version`+1");

            // ذخیره config.php
            $configContent = "<?php\n// Bastian Clinic Auto-Generated Configuration\n// تولید شده خودکار توسط setup.php\n\n"
                . "define('DB_HOST', " . var_export($dbHost, true) . ");\n"
                . "define('DB_PORT', " . var_export($dbPort, true) . ");\n"
                . "define('DB_NAME', " . var_export($dbName, true) . ");\n"
                . "define('DB_USER', " . var_export($dbUser, true) . ");\n"
                . "define('DB_PASS', " . var_export($dbPass, true) . ");\n"
                . "define('DB_CHARSET', 'utf8mb4');\n"
                . "define('APP_VERSION', '3.3.14');\n"
                . "define('INSTALLED_AT', " . var_export(date('Y-m-d H:i:s'), true) . ");\n";
            file_put_contents($configFile, $configContent);

            // ذخیره کاربران
            $ud = getUsers($usersFile);
            $ud['displayPassword'] = $dispPass;
            // اگر admin از قبل وجود ندارد اضافه کن
            $hasAdmin = false;
            foreach ($ud['users'] as $u) { if ($u['role'] === 'super_admin') $hasAdmin = true; }
            if (!$hasAdmin) {
                $ud['users'][] = [
                    'id' => 'user-admin', 'username' => $adminUser,
                    'passwordHash' => secureHash($adminPass), 'role' => 'super_admin',
                    'displayName' => 'سوپر ادمین سیستم', 'doctorId' => null, 'isActive' => true,
                ];
            }
            saveUsers($usersFile, $ud);

            @file_put_contents($dataDir.'/.install.lock', 'locked '.date('c'), LOCK_EX);
            @chmod($dataDir.'/.install.lock', 0640);
            $successMsg  = 'نصب با موفقیت انجام شد!';
            $isInstalled = true;
            $step        = 3;
        } catch (Exception $e) {
            $errorMessage = 'خطا در اتصال دیتابیس: ' . $e->getMessage();
        }
    }
}

// ── پردازش فرم نصب بدون دیتابیس (JSON) ────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'install_json') {
    $clinicName = trim($_POST['clinic_name'] ?? 'درمانگاه تخصصی بیمارستان امام حسین (ع) اهرم');
    $adminUser  = trim($_POST['admin_user'] ?? 'admin');
    $adminPass  = trim($_POST['admin_pass'] ?? '');
    $centerUser = trim($_POST['center_user'] ?? 'ahram');
    $dispPass   = trim($_POST['disp_pass'] ?? '');
    if (strlen($adminPass) < 8) { $errorMessage='رمز سوپرادمین باید حداقل ۸ کاراکتر باشد.'; }
    elseif (strlen($dispPass) < 6) { $errorMessage='رمز نمایشگر/مرکز باید حداقل ۶ کاراکتر باشد.'; }
    else {
        $storeFile=$dataDir.'/clinic_store.json';
        $store=['schemaVersion'=>3,'version'=>1,'lastUpdated'=>round(microtime(true)*1000),'centers'=>[]];
        $centerId='center-'.date('YmdHis').'-'.bin2hex(random_bytes(2));
        $store['centers'][]=['id'=>$centerId,'code'=>'BASTIAN-001','name'=>$clinicName,'isDefault'=>true,'username'=>$centerUser,'licenseUntil'=>date('Y-m-d',strtotime('+1 year')),'isActive'=>true,'createdAt'=>date('c'),'version'=>1,'lastUpdated'=>round(microtime(true)*1000),'doctors'=>[],'secretaries'=>[],'tickers'=>[],'queues'=>[],'settings'=>['clinicName'=>$clinicName,'subtitle'=>'سامانه هوشمند فراخوان نوبت و مدیریت درمانگاه','repeatCount'=>2,'volume'=>0.9,'autoPrintOnCreate'=>false,'showDoctorPhoto'=>true,'showLogo'=>true,'phone'=>'','address'=>'','lanIp'=>'','port'=>80,'displaySettings'=>['mode'=>'queue','style'=>'modern','showClock'=>true,'showConnection'=>true,'showTicker'=>true,'showQr'=>true,'showCenterLogo'=>true,'mediaVolume'=>0.8,'mediaMutedDuringCall'=>true,'mediaPlaylist'=>[],'qrCodes'=>[]]],'displayPasswordHash'=>secureHash($dispPass),'announcementBus'=>['current'=>null,'queue'=>[]],'triggerAnnouncement'=>null,'triggerSecretaryCall'=>null];
        @file_put_contents($storeFile,json_encode($store,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),LOCK_EX);
        $ud=['schemaVersion'=>3,'users'=>[['id'=>'user-admin','username'=>$adminUser,'passwordHash'=>secureHash($adminPass),'role'=>'super_admin','displayName'=>'سوپر ادمین سیستم','isActive'=>true]]];
        saveUsers($usersFile,$ud);
        @file_put_contents($dataDir.'/.install.lock', 'locked '.date('c'), LOCK_EX);
        @chmod($dataDir.'/.install.lock', 0640);
        $successMsg='راه‌اندازی جدید با موفقیت انجام شد. مرکز اولیه ساخته شد و نصب قفل گردید.'; $isInstalled=true; $step=3;
    }
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>راه‌اندازی سامانه درمانگاه باستیان</title>

<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:"BNazanin"}
body{background:#0f172a;color:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.wrap{width:100%;max-width:680px;background:#1e293b;border-radius:1.25rem;border:1px solid #334155;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);overflow:hidden}
.hdr{background:linear-gradient(135deg,#1e1b4b,#312e81,#1e1b4b);padding:2rem 1.5rem;text-align:center;border-bottom:1px solid #4338ca}
.hdr h1{font-size:1.2rem;font-weight:900;color:#e0e7ff;margin-bottom:.5rem}
.hdr p{font-size:.78rem;color:#a5b4fc}
.body{padding:2rem 1.5rem}
.alert{padding:.85rem 1rem;border-radius:.6rem;font-size:.82rem;margin-bottom:1.25rem;font-weight:600}
.alert-err{background:rgba(127,29,29,.4);border:1px solid #ef4444;color:#fca5a5}
.alert-ok{background:rgba(6,78,59,.4);border:1px solid #10b981;color:#a7f3d0}
.alert-info{background:rgba(30,58,138,.4);border:1px solid #3b82f6;color:#bfdbfe}
.fg{margin-bottom:1rem}
label{display:block;font-size:.78rem;font-weight:700;color:#94a3b8;margin-bottom:.35rem}
input{width:100%;padding:.65rem .9rem;background:#0f172a;border:1px solid #334155;border-radius:.5rem;color:#fff;font-family:"BNazanin";font-size:.875rem;outline:none;transition:.2s}
input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.btn{width:100%;padding:.85rem;border:none;border-radius:.6rem;font-size:.9rem;font-weight:800;cursor:pointer;transition:.18s;margin-top:.5rem}
.btn-purple{background:linear-gradient(135deg,#4f46e5,#4338ca);color:#fff}
.btn-green{background:linear-gradient(135deg,#059669,#047857);color:#fff}
.btn-sky{background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff}
.sep{display:flex;align-items:center;gap:.75rem;margin:1.5rem 0;color:#475569;font-size:.75rem;font-weight:700}
.sep::before,.sep::after{content:'';flex:1;height:1px;background:#334155}
.tabs{display:flex;background:#0f172a;border-radius:.5rem;padding:.2rem;margin-bottom:1.5rem;gap:.2rem}
.tab{flex:1;padding:.5rem;text-align:center;border:none;background:transparent;color:#94a3b8;font-family:"BNazanin";font-size:.75rem;font-weight:700;cursor:pointer;border-radius:.4rem;transition:.15s}
.tab.active{background:rgba(99,102,241,.2);color:#a5b4fc}
.panel{display:none}
.panel.active{display:block}
.footer{padding:1rem 1.5rem;background:#0f172a;border-top:1px solid #334155;text-align:center;font-size:.7rem;color:#475569}
ul.feat{margin:.75rem 0;padding-right:1rem}
ul.feat li{font-size:.78rem;color:#94a3b8;margin-bottom:.4rem;list-style:none;display:flex;gap:.5rem}
ul.feat li::before{content:'✓';color:#10b981;font-weight:900}
</style>
<link rel="stylesheet" href="/fonts.css">

<link rel="stylesheet" href="/assets/readability-3.3.19.css?v=3.3.19">
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h1>⚙️ راه‌اندازی سامانه درمانگاه باستیان</h1>
    <p>نسخه هاست با احراز هویت | تنظیم کاربران و پایگاه داده</p>
  </div>
  <div class="body">
  <?php if ($errorMessage): ?>
    <div class="alert alert-err"><b>خطا:</b> <?= htmlspecialchars($errorMessage) ?></div>
  <?php endif; ?>
  <?php if ($successMsg): ?>
    <div class="alert alert-ok"><b>✓ موفق:</b> <?= htmlspecialchars($successMsg) ?></div>
  <?php endif; ?>

  <?php if ($isInstalled && $step === 3): ?>
    <div class="alert alert-ok">
      <b>سامانه با موفقیت نصب شد 🎉</b><br>
      <span style="font-size:.78rem">اکنون می‌توانید وارد پنل مدیریت شوید.</span>
    </div>
    <ul class="feat">
      <li>پایگاه داده و کاربران راه‌اندازی شدند</li>
      <li>سوپرادمین با یوزر و رمز مشخص‌شده ایجاد شد</li>
      <li>رمز نمایشگر تنظیم گردید</li>
    </ul>
    <a href="/" class="btn btn-green" style="display:block;text-align:center;text-decoration:none;padding:.85rem">ورود به سامانه</a>
    <p style="font-size:.72rem;color:#64748b;text-align:center;margin-top:.75rem">این فایل (setup.php) را از سرور حذف کنید.</p>
  <?php else: ?>

    <div class="alert alert-info">
      <b>راهنما:</b> ابتدا نصب سریع (JSON) را امتحان کنید. اگر MySQL دارید از تب دیتابیس استفاده نمایید.
    </div>

    <div class="tabs">
      <button class="tab active" onclick="sw('json')">⚡ نصب سریع (JSON)</button>
      <button class="tab"        onclick="sw('db')">🗄️ نصب با MySQL</button>
    </div>

    <!-- JSON (بدون نیاز به MySQL) -->
    <div class="panel active" id="p-json">
      <form method="POST" action="setup.php">
        <input type="hidden" name="action" value="install_json">
        <div class="fg"><label>نام درمانگاه / بیمارستان</label>
          <input name="clinic_name" value="درمانگاه تخصصی بیمارستان امام حسین (ع) اهرم"><div class="fg"><label>نام کاربری مرکز (همان نمایشگر)</label><input name="center_user" value="ahram" required></div></div>
        <div class="grid">
          <div class="fg"><label>یوزرنیم سوپرادمین</label><input name="admin_user" value="admin"></div>
          <div class="fg"><label>رمز سوپرادمین</label><input type="password" name="admin_pass" value="" placeholder="حداقل ۸ کاراکتر"></div>
        </div>
        <div class="fg"><label>رمز مرکز (همان نمایشگر)</label><input name="disp_pass" value="" placeholder="حداقل ۶ کاراکتر" required></div>
        <button type="submit" class="btn btn-purple">راه‌اندازی سریع</button>
      </form>
    </div>

    <!-- MySQL -->
    <div class="panel" id="p-db">
      <form method="POST" action="setup.php">
        <input type="hidden" name="action" value="install_db">
        <div class="grid">
          <div class="fg"><label>هاست دیتابیس</label><input name="db_host" value="localhost"></div>
          <div class="fg"><label>پورت</label><input name="db_port" value="3306"></div>
        </div>
        <div class="grid">
          <div class="fg"><label>نام دیتابیس</label><input name="db_name" placeholder="user_clinicdb" required></div>
          <div class="fg"><label>یوزر دیتابیس</label><input name="db_user" placeholder="user_clinicusr" required></div>
        </div>
        <div class="fg"><label>رمز دیتابیس</label><input type="password" name="db_pass" placeholder="رمز دیتابیس"></div>
        <div class="fg"><label>نام درمانگاه</label><input name="clinic_name" value="درمانگاه تخصصی بیمارستان امام حسین (ع) اهرم"></div>
        <div class="grid">
          <div class="fg"><label>یوزرنیم سوپرادمین</label><input name="admin_user" value="admin"></div>
          <div class="fg"><label>رمز سوپرادمین</label><input type="password" name="admin_pass" value="" placeholder="حداقل ۸ کاراکتر"></div>
        </div>
        <div class="grid"><div class="fg"><label>نام کاربری مرکز (همان نمایشگر)</label><input name="center_user" value="ahram" required></div><div class="fg"><label>رمز مرکز (همان نمایشگر)</label><input name="disp_pass" value="" placeholder="حداقل ۶ کاراکتر" required></div></div>
        <button type="submit" class="btn btn-sky">نصب با MySQL</button>
      </form>
    </div>

  <?php endif; ?>
  </div>
  <div class="footer">سامانه هوشمند نوبت‌دهی درمانگاه باستیان • هلدینگ باستیان</div>
</div>
<script>
function sw(n){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',i===(n==='json'?0:1)));
  document.getElementById('p-json').classList.toggle('active', n==='json');
  document.getElementById('p-db').classList.toggle('active',   n==='db');
}
</script>
</body>
</html>
