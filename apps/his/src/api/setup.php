<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Tehran');
$configFile = __DIR__ . '/config.local.php';
$configExists = is_file($configFile);

function h(mixed $v): string { return htmlspecialchars((string)$v, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8'); }
function reqErrors(): array {
    $e=[];
    if (!extension_loaded('pdo')) $e[]='افزونه PDO فعال نیست.';
    if (!extension_loaded('pdo_sqlite')) $e[]='افزونه PDO_SQLite فعال نیست. در تنظیمات PHP چابکان آن را فعال کنید.';
    if (!extension_loaded('openssl')) $e[]='OpenSSL فعال نیست.';
    if (!extension_loaded('json')) $e[]='JSON فعال نیست.';
    if (version_compare(PHP_VERSION,'8.0.0','<')) $e[]='PHP باید نسخه ۸ یا بالاتر باشد.';
    return $e;
}
function writeLocal(string $file,string $username,string $hash,string $backupKey,string $dataKey,string $kv,string $gemini,string $identityUrl,string $identityKey): void {
    $c="<?php\n// Bastiyan HIS R10 SQLite setup — ".date('c')."\n";
    $c.="define('BASTIAN_DB_DRIVER','sqlite');\n";
    $c.="define('BASTIAN_SQLITE_PATH', getenv('BASTIAN_SQLITE_PATH') ?: __DIR__ . '/data/bastiyan.sqlite');\n";
    $c.="define('BASTIAN_SUPERADMIN_USERNAME',".var_export($username,true).");\n";
    $c.="define('BASTIAN_SUPERADMIN_PASSWORD_HASH',".var_export($hash,true).");\n";
    $c.="define('BASTIAN_BACKUP_KEY',".var_export($backupKey,true).");\n";
    $c.="define('BASTIAN_DATA_ENCRYPTION_KEY',".var_export($dataKey,true).");\n";
    $c.="define('KAVENEGAR_API_KEY',".var_export($kv,true).");\n";
    $c.="define('GEMINI_API_KEY',".var_export($gemini,true).");\n";
    $c.="define('IDENTITY_PROVIDER_URL',".var_export($identityUrl,true).");\n";
    $c.="define('IDENTITY_PROVIDER_API_KEY',".var_export($identityKey,true).");\n";
    if (@file_put_contents($file,$c,LOCK_EX)===false) throw new RuntimeException('امکان نوشتن api/config.local.php وجود ندارد.');
    @chmod($file,0640);
}

$errors=reqErrors(); $error=''; $ok=false; $details=[];
if ($configExists && !$errors) {
    try {
        require_once __DIR__.'/config.php';
        $pdo=bastianPdo(); bastianCreateSchema($pdo); $pdo->query('SELECT 1');
        $ok=true; $details=['driver'=>'SQLite','path'=>bastianSqlitePath(),'php'=>PHP_VERSION];
    } catch(Throwable $e) { $error=$e->getMessage(); }
}

if ($_SERVER['REQUEST_METHOD']==='POST' && ($_POST['_action']??'')==='install' && !$errors) {
    $u=trim((string)($_POST['username']??'admin')); $pw=(string)($_POST['password']??''); $cf=(string)($_POST['confirm']??'');
    $kv=trim((string)($_POST['kavenegar_key']??'')); $gm=trim((string)($_POST['gemini_key']??''));
    $iu=trim((string)($_POST['identity_url']??'')); $ik=trim((string)($_POST['identity_key']??''));
    if (!preg_match('/^[a-zA-Z0-9_@.\-]{3,50}$/',$u)) $error='نام کاربری مدیریت معتبر نیست.';
    elseif(strlen($pw)<10) $error='رمز مدیریت باید حداقل ۱۰ کاراکتر باشد.';
    elseif($pw!==$cf) $error='رمز و تکرار رمز یکسان نیستند.';
    elseif($iu!=='' && !str_starts_with(strtolower($iu),'https://')) $error='Identity Provider باید با https:// شروع شود.';
    else {
        try {
            $dir=__DIR__.'/data'; if(!is_dir($dir)) @mkdir($dir,0750,true);
            writeLocal($configFile,$u,password_hash($pw,PASSWORD_DEFAULT),bin2hex(random_bytes(32)),base64_encode(random_bytes(32)),$kv,$gm,$iu,$ik);
            require_once __DIR__.'/config.php';
            $pdo=bastianPdo(); bastianCreateSchema($pdo); $pdo->query('SELECT 1');
            $ok=true; $configExists=true; $details=['driver'=>'SQLite','path'=>bastianSqlitePath(),'php'=>PHP_VERSION];
        } catch(Throwable $e) { $error=$e->getMessage(); if(!$ok && is_file($configFile)) @unlink($configFile); }
    }
}

if ($_SERVER['REQUEST_METHOD']==='POST' && ($_POST['_action']??'')==='format' && $configExists) {
    $unlock=(string)(getenv('BASTIAN_SETUP_UNLOCK')?:''); $provided=(string)($_POST['unlock']??'');
    if($unlock==='' || !hash_equals($unlock,$provided)) $error='برای پاک‌سازی، متغیر BASTIAN_SETUP_UNLOCK را در چابکان تنظیم و همان مقدار را وارد کنید.';
    else try {
        require_once __DIR__.'/config.php'; $pdo=bastianPdo();
        $tables=$pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'bastian_%'")->fetchAll(PDO::FETCH_COLUMN);
        $pdo->exec('PRAGMA foreign_keys=OFF'); foreach($tables as $t){ if(preg_match('/^[A-Za-z0-9_]+$/',(string)$t))$pdo->exec('DROP TABLE IF EXISTS `'.$t.'`'); }
        $pdo->exec('PRAGMA foreign_keys=ON'); bastianCreateSchema($pdo); $ok=true; $details=['driver'=>'SQLite','path'=>bastianSqlitePath(),'php'=>PHP_VERSION];
    } catch(Throwable $e){$error=$e->getMessage();}
}
?><!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>راه‌اندازی Bastiyan HIS</title>
<style>body{font-family:Tahoma,Arial;background:#020617;color:#e2e8f0;margin:0}.w{max-width:760px;margin:40px auto;padding:16px}.c{background:#0f172a;border:1px solid #334155;border-radius:18px;padding:24px}.h{font-size:22px;font-weight:800}.s{color:#94a3b8;line-height:1.9}.ok,.er,.in{padding:14px;border-radius:12px;margin:14px 0;line-height:1.9}.ok{background:#052e2b;border:1px solid #0f766e}.er{background:#3f0b14;border:1px solid #be123c}.in{background:#082f49;border:1px solid #0369a1}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}.all{grid-column:1/-1}label{display:block;color:#94a3b8;font-size:12px;margin:8px 0 5px}input{box-sizing:border-box;width:100%;padding:11px;border-radius:10px;border:1px solid #334155;background:#020617;color:#fff}.b{width:100%;padding:13px;border:0;border-radius:11px;background:#0d9488;color:white;font-weight:800;margin-top:18px;cursor:pointer}.danger{background:#7f1d1d}.row{padding:8px 0;border-bottom:1px solid #1e293b}.tag{color:#5eead4;font-family:monospace;direction:ltr;display:inline-block}@media(max-width:620px){.g{grid-template-columns:1fr}}</style></head><body><div class="w"><div class="c">
<div class="h">Bastiyan HIS — نصب بدون MySQL</div><p class="s">نسخه R10 از SQLite داخلی استفاده می‌کند؛ هیچ دیتابیس ابری جداگانه‌ای لازم نیست.</p>
<?php if($errors): ?><div class="er"><b>پیش‌نیاز ناقص:</b><br><?=implode('<br>',array_map('h',$errors))?></div><?php endif; ?>
<?php if($error): ?><div class="er"><?=h($error)?></div><?php endif; ?>
<?php if($ok): ?><div class="ok"><b>سامانه آماده است.</b><br>درایور: <?=h($details['driver']??'SQLite')?> · PHP <?=h($details['php']??PHP_VERSION)?><br>فایل داده: <span class="tag"><?=h($details['path']??'')?></span></div>
<div class="row">✓ SQLite داخلی و WAL فعال</div><div class="row">✓ بدون MySQL/MariaDB</div><div class="row">✓ رمزگذاری داده‌های State با AES-256-GCM</div>
<a class="b" style="display:block;text-align:center;text-decoration:none" href="../">ورود به سامانه</a>
<div style="margin-top:28px;border-top:1px solid #334155;padding-top:18px"><p class="s">پاک‌سازی کامل فقط در حالت نگهداری:</p><form method="post"><input type="hidden" name="_action" value="format"><label>BASTIAN_SETUP_UNLOCK</label><input type="password" name="unlock"><button class="b danger">پاک‌سازی کامل SQLite</button></form></div>
<?php else: ?>
<div class="in">این نصب فقط یک سرویس PHP چابکان می‌خواهد. فرانت‌اند JavaScript به‌صورت فایل استاتیک توسط همان سرویس ارائه می‌شود و «زبان دوم» محسوب نمی‌شود.</div>
<div class="row">PDO: <?=extension_loaded('pdo')?'✓':'✗'?></div><div class="row">PDO_SQLite: <?=extension_loaded('pdo_sqlite')?'✓':'✗'?></div><div class="row">OpenSSL: <?=extension_loaded('openssl')?'✓':'✗'?></div>
<?php if(!$errors): ?><form method="post" autocomplete="off"><input type="hidden" name="_action" value="install"><div class="g"><div><label>نام کاربری مدیریت کل</label><input name="username" value="<?=h($_POST['username']??'admin')?>" required></div><div></div><div><label>رمز مدیریت (حداقل ۱۰ کاراکتر)</label><input type="password" name="password" minlength="10" required></div><div><label>تکرار رمز</label><input type="password" name="confirm" minlength="10" required></div><div><label>Kavenegar API Key — اختیاری</label><input type="password" name="kavenegar_key"></div><div><label>Gemini API Key — اختیاری</label><input type="password" name="gemini_key"></div><div><label>Identity Provider URL — اختیاری</label><input type="url" name="identity_url"></div><div><label>Identity Provider API Key — اختیاری</label><input type="password" name="identity_key"></div></div><button class="b">ساخت SQLite و فعال‌سازی سامانه</button></form><?php endif; ?>
<?php endif; ?></div></div></body></html>
