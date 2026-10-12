<?php
/**
 * Bastiyan HIS secure in-app updater.
 * - SQL is allowed ONLY under database/migrations/*.sql
 * - sensitive local config is never accepted
 * - package version must match the version entered in the form
 * - file + DB-state backup is created before installation
 * - install enters PENDING state; Super Admin must COMMIT
 * - expired PENDING updates are automatically rolled back (cron/lazy fallback)
 */

function bastianUpdaterRoot(): string { return realpath(dirname(__DIR__)) ?: dirname(__DIR__); }
function bastianUpdaterBackupsDir(): string { return UPDATE_RUNTIME_DIR . 'backups/'; }
function bastianUpdaterStagingDir(): string { return UPDATE_RUNTIME_DIR . 'staging/'; }
function bastianUpdaterPendingFile(): string { return UPDATE_RUNTIME_DIR . 'pending.json'; }
function bastianUpdaterCommitTimeout(): int { return defined('BASTIAN_UPDATE_COMMIT_TIMEOUT') ? max(300, (int)BASTIAN_UPDATE_COMMIT_TIMEOUT) : 1800; }

function bastianUpdaterRemoveTree(string $path): void {
    if (!is_dir($path)) { if (is_file($path)) @unlink($path); return; }
    foreach (scandir($path) ?: [] as $item) {
        if ($item === '.' || $item === '..') continue;
        $child = $path . DIRECTORY_SEPARATOR . $item;
        if (is_dir($child) && !is_link($child)) bastianUpdaterRemoveTree($child); else @unlink($child);
    }
    @rmdir($path);
}

function bastianUpdaterIsMigrationPath(string $path): bool {
    return (bool)preg_match('#^database/migrations/[^/]+\.sql$#i', $path);
}

function bastianUpdaterIsProtectedRuntimePath(string $path): bool {
    $path=str_replace('\\','/',trim($path));
    foreach(['api/config.local.php','config.local.php','.env','api/data','uploads'] as $prefix){
        if($path===$prefix||str_starts_with($path,$prefix.'/'))return true;
    }
    return false;
}

function bastianUpdaterSafePath(string $path): ?string {
    $path = str_replace('\\', '/', trim($path));
    $path = preg_replace('#^\./+#', '', $path);
    if ($path === '' || str_starts_with($path, '/') || str_contains($path, "\0")) return null;
    foreach (explode('/', $path) as $part) if ($part === '' || $part === '.' || $part === '..') return null;

    $blocked = [
        'api/config.local.php', 'config.local.php', '.env', '.git', 'uploads', 'downloads', 'api/data'
    ];
    foreach ($blocked as $prefix) if ($path === $prefix || str_starts_with($path, $prefix . '/')) return null;

    // SQL is default-deny: only database/migrations/*.sql is permitted.
    if (str_ends_with(strtolower($path), '.sql')) return bastianUpdaterIsMigrationPath($path) ? $path : null;

    if ($path === 'checksum.sha256') return $path;
    if (!preg_match('/\.(?:php|js|mjs|css|json|html|htaccess|webmanifest|ini|svg|png|jpg|jpeg|webp|ico|woff|woff2|ttf|txt|md)$/i', $path)) return null;
    return $path;
}

function bastianUpdaterSafeRemovalPath(string $path): ?string {
    $safe = bastianUpdaterSafePath($path);
    if ($safe === null) return null;
    // Never allow deletion of runtime state, configuration, uploads or update metadata.
    $protected = ['api/config.local.php', 'api/data', 'api/runtime', 'database/migrations'];
    foreach ($protected as $prefix) if ($safe === $prefix || str_starts_with($safe, $prefix . '/')) return null;
    return $safe;
}

function bastianUpdaterValidateRemovalList(array $manifest): array {
    $items = [];
    foreach ((array)($manifest['removeFiles'] ?? []) as $raw) {
        $safe = bastianUpdaterSafeRemovalPath((string)$raw);
        if ($safe === null || $safe !== (string)$raw) throw new RuntimeException('مسیر حذف غیرمجاز در مانیفست: ' . (string)$raw);
        if (in_array($safe, ['index.html','portal.js','api/updater.php','version.json'], true)) throw new RuntimeException('حذف فایل هسته مجاز نیست: ' . $safe);
        $items[] = $safe;
    }
    return array_values(array_unique($items));
}

function bastianUpdaterValidateZipEntries(ZipArchive $zip): void {
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = (string)$zip->getNameIndex($i);
        if ($name === '' || str_ends_with($name, '/')) continue;
        // Package metadata is allowed to exist in the ZIP but is never installed by the file map.
        if (in_array($name, ['update-manifest.json','checksum.sha256'], true)) continue;
        if (bastianUpdaterIsProtectedRuntimePath($name)) continue;
        $safe = bastianUpdaterSafePath($name);
        if ($safe === null || $safe !== $name) {
            throw new RuntimeException('فایل یا مسیر غیرمجاز در ZIP پذیرفته نشد: ' . $name);
        }
        if (method_exists($zip, 'getExternalAttributesIndex')) {
            $opsys = 0; $attrs = 0;
            if ($zip->getExternalAttributesIndex($i, $opsys, $attrs) && (($attrs >> 16) & 0170000) === 0120000) {
                throw new RuntimeException('لینک نمادین در بسته مجاز نیست: ' . $name);
            }
        }
    }
}

function bastianUpdaterPending(): ?array {
    $raw = @file_get_contents(bastianUpdaterPendingFile());
    if ($raw === false || trim($raw) === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function bastianUpdaterWritePending(array $data): void {
    @mkdir(UPDATE_RUNTIME_DIR, 0755, true);
    if (@file_put_contents(bastianUpdaterPendingFile(), json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX) === false) {
        throw new RuntimeException('ثبت وضعیت pending به‌روزرسانی ممکن نشد.');
    }
}

function bastianUpdaterClearPending(): void { @unlink(bastianUpdaterPendingFile()); }

function bastianUpdaterDbBackup(string $reason, string $backupId): array {
    $result = [];
    if (!function_exists('bastianDbEnabled') || !bastianDbEnabled()) return $result;
    if (!function_exists('bastianDbCenters') || !function_exists('bastianDbBackupState')) return $result;
    foreach (bastianDbCenters(true) as $center) {
        $centerId = (string)($center['id'] ?? '');
        if ($centerId === '') continue;
        try {
            bastianDbBackupState($centerId, $reason, true);
            $st = bastianPdo()->prepare('SELECT id FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT 1');
            $st->execute([$centerId]);
            $dbBackupId = $st->fetchColumn();
            if ($dbBackupId !== false) $result[] = ['centerId'=>$centerId, 'backupId'=>(int)$dbBackupId];
        } catch (Throwable $e) {
            throw new RuntimeException('پشتیبان دیتابیس مرکز «' . (string)($center['name'] ?? $centerId) . '» ساخته نشد: ' . $e->getMessage());
        }
    }
    @file_put_contents(bastianUpdaterBackupsDir() . $backupId . '/db-backups.json', json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    return $result;
}

function bastianUpdaterDbRestore(string $backupDir): void {
    $raw = @file_get_contents($backupDir . '/db-backups.json');
    $items = json_decode((string)$raw, true);
    if (!is_array($items) || !function_exists('bastianDbRestoreBackup')) return;
    foreach ($items as $item) {
        $centerId = (string)($item['centerId'] ?? '');
        $backupId = (int)($item['backupId'] ?? 0);
        if ($centerId === '' || $backupId <= 0) continue;
        try { bastianDbRestoreBackup($centerId, $backupId, 'system-update-rollback'); } catch (Throwable $e) { throw new RuntimeException('بازگردانی دیتابیس مرکز ممکن نشد: ' . $e->getMessage()); }
    }
}

function bastianUpdaterAutoRollbackIfExpired(): ?array {
    $pending = bastianUpdaterPending();
    if (!$pending) return null;
    $deadline = strtotime((string)($pending['commitDeadline'] ?? ''));
    if (!$deadline || time() < $deadline) return null;
    $backupId = (string)($pending['backupId'] ?? '');
    if ($backupId === '') { bastianUpdaterClearPending(); return null; }
    $result = bastianUpdaterRollback($backupId, true);
    $result['autoRollback'] = true;
    return $result;
}

function bastianUpdaterStatus(): array {
    bastianUpdaterAutoRollbackIfExpired();
    $root = bastianUpdaterRoot();
    $backupRoot = bastianUpdaterBackupsDir();
    if (!is_dir($backupRoot)) @mkdir($backupRoot, 0755, true);
    $backups = [];
    foreach (array_reverse(glob($backupRoot . '*', GLOB_ONLYDIR) ?: []) as $dir) {
        $meta = json_decode((string)@file_get_contents($dir . '/backup.json'), true);
        if (is_array($meta)) $backups[] = [
            'id'=>basename($dir), 'fromVersion'=>(string)($meta['fromVersion'] ?? ''),
            'toVersion'=>(string)($meta['toVersion'] ?? ''), 'createdAt'=>(string)($meta['createdAt'] ?? ''),
            'committed'=>(bool)($meta['committed'] ?? false),
        ];
        if (count($backups) >= 5) break;
    }
    $pending = bastianUpdaterPending();
    return [
        'success'=>true,
        'currentVersion'=>bastianAppVersion(),
        'stableVersion'=>$pending ? (string)($pending['fromVersion'] ?? '') : bastianAppVersion(),
        'zipAvailable'=>class_exists('ZipArchive'), 'rootWritable'=>is_writable($root),
        'runtimeWritable'=>is_dir(UPDATE_RUNTIME_DIR) && is_writable(UPDATE_RUNTIME_DIR),
        'maxUploadBytes'=>(int)BASTIAN_UPDATE_MAX_BYTES,
        'phpUploadLimit'=>(string)ini_get('upload_max_filesize'), 'postLimit'=>(string)ini_get('post_max_size'),
        'commitTimeoutSeconds'=>bastianUpdaterCommitTimeout(), 'pendingUpdate'=>$pending, 'backups'=>$backups,
    ];
}

function bastianUpdaterReadManifest(ZipArchive $zip): array {
    $index = $zip->locateName('update-manifest.json', ZipArchive::FL_NOCASE);
    if ($index === false) throw new RuntimeException('فایل update-manifest.json باید دقیقاً در ریشه بسته باشد.');
    $raw = $zip->getFromIndex($index);
    $manifest = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($manifest)) throw new RuntimeException('مانیفست بسته معتبر نیست.');
    if (($manifest['product'] ?? ($manifest['name'] ?? '')) !== 'Bastiyan HIS') throw new RuntimeException('این بسته متعلق به نرم‌افزار Bastiyan HIS نیست.');
    $version = trim((string)($manifest['version'] ?? ''));
    if (!preg_match('/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/', $version)) throw new RuntimeException('نسخه بسته معتبر نیست.');
    if (!isset($manifest['files']) || !is_array($manifest['files']) || !$manifest['files']) throw new RuntimeException('فهرست فایل‌های بسته خالی است.');

    $installFiles=[];
    foreach ($manifest['files'] as $path=>$hash) {
        $path=(string)$path;
        if (in_array($path, ['update-manifest.json','checksum.sha256'], true)) continue;
        if (bastianUpdaterIsProtectedRuntimePath($path)) continue;
        $safe = bastianUpdaterSafePath($path);
        if ($safe === null || $safe !== $path) throw new RuntimeException('مسیر غیرمجاز در مانیفست: ' . $path);
        if (!preg_match('/^[a-f0-9]{64}$/i', (string)$hash)) throw new RuntimeException('هش نامعتبر برای: ' . $path);
        $installFiles[$path]=(string)$hash;
    }
    $manifest['files']=$installFiles;
    foreach (['version.json','index.html','portal.js','api/router.php','api/updater.php','app/utils/appVersion.js','app/main457-final.js','app/vendor-runtime.js'] as $required) {
        if (!isset($manifest['files'][$required])) throw new RuntimeException('بسته ناقص است: ' . $required);
    }
    return ['product'=>'Bastiyan HIS','version'=>$version,'files'=>$manifest['files'],'removeFiles'=>bastianUpdaterValidateRemovalList($manifest),'buildNumber'=>$manifest['buildNumber'] ?? null,'releaseDate'=>$manifest['releaseDate'] ?? null];
}

function bastianUpdaterExtractVerified(ZipArchive $zip, array $manifest, string $stage): array {
    if (!is_dir($stage) && !@mkdir($stage, 0755, true)) throw new RuntimeException('ساخت فضای موقت به‌روزرسانی ممکن نشد.');
    $files = []; $total = 0;
    foreach ($manifest['files'] as $rawPath=>$expectedHash) {
        if (in_array((string)$rawPath, ['update-manifest.json','checksum.sha256'], true)) continue;
        $path = bastianUpdaterSafePath((string)$rawPath);
        if ($path === null || $path !== (string)$rawPath) throw new RuntimeException('مسیر غیرمجاز در بسته: ' . $rawPath);
        $index = $zip->locateName($path, ZipArchive::FL_NOCASE);
        if ($index === false) throw new RuntimeException('فایل اعلام‌شده در بسته نیست: ' . $path);
        $stat = $zip->statIndex($index); $size = (int)($stat['size'] ?? 0); $total += $size;
        if ($total > 250 * 1024 * 1024) throw new RuntimeException('حجم بازشده بسته بیش از حد مجاز است.');
        $target = $stage . '/' . $path;
        if (!is_dir(dirname($target)) && !@mkdir(dirname($target), 0755, true)) throw new RuntimeException('ساخت پوشه موقت ممکن نشد.');
        $content = $zip->getFromIndex($index);
        if ($content === false || !is_string($content)) throw new RuntimeException('خواندن فایل بسته ممکن نشد: ' . $path);
        if (@file_put_contents($target, $content) === false) throw new RuntimeException('نوشتن فایل موقت ممکن نشد: ' . $path);
        $actual = hash_file('sha256', $target);
        if (!hash_equals(strtolower((string)$expectedHash), strtolower($actual))) throw new RuntimeException('صحت فایل تأیید نشد: ' . $path);
        $files[] = $path;
    }
    return $files;
}

function bastianUpdaterApplyMigrations(string $stage, array $files, string $targetVersion): array {
    $migrations = array_values(array_filter($files, 'bastianUpdaterIsMigrationPath'));
    if (!$migrations || !function_exists('bastianDbEnabled') || !bastianDbEnabled()) return [];
    $pdo = bastianPdo();
    $pdo->exec("CREATE TABLE IF NOT EXISTS system_migrations (id INT AUTO_INCREMENT PRIMARY KEY, migration_id VARCHAR(190) NOT NULL UNIQUE, version VARCHAR(30) NOT NULL, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP, checksum VARCHAR(64) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $applied = [];
    sort($migrations, SORT_STRING);
    foreach ($migrations as $path) {
        $id = pathinfo(basename($path), PATHINFO_FILENAME);
        $st = $pdo->prepare('SELECT id FROM system_migrations WHERE migration_id=? LIMIT 1');
        $st->execute([$id]);
        if ($st->fetchColumn() !== false) { $applied[] = ['path'=>$path,'status'=>'already_applied']; continue; }
        $sql = @file_get_contents($stage . '/' . $path);
        if (!is_string($sql) || trim($sql) === '') throw new RuntimeException('فایل migration خالی یا قابل خواندن نیست: ' . $path);
        try {
            $pdo->exec($sql);
            $pdo->prepare('INSERT IGNORE INTO system_migrations(migration_id,version,checksum) VALUES(?,?,?)')->execute([$id, $targetVersion, hash('sha256',$sql)]);
            $applied[] = ['path'=>$path,'status'=>'applied'];
        } catch (Throwable $e) {
            throw new RuntimeException('اجرای migration شکست خورد: ' . $path . ' — ' . $e->getMessage());
        }
    }
    return $applied;
}

function bastianUpdaterInstall(string $uploadedPath, string $enteredVersion = ''): array {
    if (!class_exists('ZipArchive')) throw new RuntimeException('افزونه ZipArchive روی هاست فعال نیست.');
    if (!is_file($uploadedPath) || filesize($uploadedPath) <= 0) throw new RuntimeException('فایل بسته دریافت نشد.');
    if (filesize($uploadedPath) > BASTIAN_UPDATE_MAX_BYTES) throw new RuntimeException('حجم بسته از سقف مجاز بیشتر است.');
    // R20: version is read from the signed package manifest. Manual typing is optional.
    // This makes a package received from Bastiyan directly installable with one confirmation.

    $root = bastianUpdaterRoot(); if (!is_writable($root)) throw new RuntimeException('ریشه برنامه مجوز نوشتن ندارد.');
    $zip = new ZipArchive(); $zipOpened = false; $openRes = $zip->open($uploadedPath, ZipArchive::RDONLY);
    if ($openRes !== true) { $errors = [ZipArchive::ER_EXISTS=>'ER_EXISTS',ZipArchive::ER_INCONS=>'ER_INCONS',ZipArchive::ER_INVAL=>'ER_INVAL',ZipArchive::ER_MEMORY=>'ER_MEMORY',ZipArchive::ER_NOENT=>'ER_NOENT',ZipArchive::ER_NOZIP=>'ER_NOZIP',ZipArchive::ER_OPEN=>'ER_OPEN',ZipArchive::ER_READ=>'ER_READ',ZipArchive::ER_SEEK=>'ER_SEEK']; throw new RuntimeException('فایل ZIP قابل باز شدن نیست. کد ZipArchive: ' . $openRes . (isset($errors[$openRes]) ? ' (' . $errors[$openRes] . ')' : '')); }
    $zipOpened = true;
    try {
        bastianUpdaterValidateZipEntries($zip);
        $manifest = bastianUpdaterReadManifest($zip);
        if ($enteredVersion !== '' && $enteredVersion !== $manifest['version']) throw new RuntimeException('نسخه واردشده با نسخه داخل بسته یکسان نیست.');
        $enteredVersion=$manifest['version'];
        if (version_compare($manifest['version'], bastianAppVersion(), '<')) throw new RuntimeException('نسخه بسته نمی‌تواند قدیمی‌تر از نسخه نصب‌شده باشد.');
        $pending = bastianUpdaterPending();
        if ($pending) throw new RuntimeException('یک به‌روزرسانی در وضعیت pending است. ابتدا آن را Commit یا Rollback کنید.');

        $fromVersion=bastianAppVersion();
        $id = date('Ymd_His') . '_' . bin2hex(random_bytes(3));
        $stage = bastianUpdaterStagingDir() . $id; $backup = bastianUpdaterBackupsDir() . $id;
        @mkdir($backup, 0755, true);
        $files=[]; $removeFiles=[]; $backedUp=[]; $removedBackedUp=[]; $newFiles=[]; $written=[];
        try {
            $files = bastianUpdaterExtractVerified($zip, $manifest, $stage);
            $removeFiles = $manifest['removeFiles'] ?? [];
            $stagedVersion = json_decode((string)@file_get_contents($stage . '/version.json'), true);
            if (!is_array($stagedVersion) || (string)($stagedVersion['version'] ?? '') !== $manifest['version']) throw new RuntimeException('نسخه version.json با مانیفست بسته یکسان نیست.');
            $jsVersionSource = (string)@file_get_contents($stage . '/app/utils/appVersion.js');
            if (!preg_match("/APP_VERSION\s*=\s*['\"]" . preg_quote($manifest['version'],'/') . "['\"];/", $jsVersionSource)) throw new RuntimeException('نسخه هسته JavaScript با مانیفست بسته یکسان نیست.');

            // Backup files first.
            foreach ($files as $path) {
                $target = $root . '/' . $path;
                if (is_file($target)) {
                    $backupFile = $backup . '/files/' . $path;
                    if (!is_dir(dirname($backupFile))) @mkdir(dirname($backupFile),0755,true);
                    if (!@copy($target,$backupFile)) throw new RuntimeException('ساخت پشتیبان فایل ممکن نشد: ' . $path);
                    $backedUp[]=$path;
                } else $newFiles[]=$path;
            }
            // Backup files that will be removed as part of cleanup.
            foreach ($removeFiles as $path) {
                $target = $root . '/' . $path;
                if (is_file($target)) {
                    $backupFile = $backup . '/files/' . $path;
                    if (!is_dir(dirname($backupFile))) @mkdir(dirname($backupFile),0755,true);
                    if (!@copy($target,$backupFile)) throw new RuntimeException('پشتیبان فایل حذف‌شونده ساخته نشد: ' . $path);
                    $removedBackedUp[] = $path;
                }
            }
            // DB state backup before any migration.
            $dbBackups = bastianUpdaterDbBackup('before_update', $id);
            // Apply SQL migrations before code replacement. The migration paths are already default-deny validated.
            $migrations = bastianUpdaterApplyMigrations($stage, $files, (string)$manifest['version']);

            // version.json is placed last so an interrupted copy never advertises the target version.
            usort($files, fn($a,$b)=>(($a==='version.json')?1:0)<=> (($b==='version.json')?1:0));
            foreach ($files as $path) {
                $target=$root.'/'.$path; if(!is_dir(dirname($target))&&!@mkdir(dirname($target),0755,true))throw new RuntimeException('ساخت پوشه مقصد ممکن نشد: '.$path);
                $tmp=$target.'.bastiyan-new-'.bin2hex(random_bytes(3));
                if(!@copy($stage.'/'.$path,$tmp)||!@rename($tmp,$target)){@unlink($tmp);throw new RuntimeException('جای‌گذاری فایل ممکن نشد: '.$path);}
                $written[]=$path;
            }
            foreach ($removeFiles as $path) {
                if (in_array($path, $written, true)) continue;
                if (is_file($root.'/'.$path) && !@unlink($root.'/'.$path)) throw new RuntimeException('حذف فایل قدیمی ممکن نشد: ' . $path);
            }
            $deadline = time()+bastianUpdaterCommitTimeout();
            $meta=['id'=>$id,'product'=>'Bastiyan HIS','fromVersion'=>$fromVersion,'toVersion'=>$manifest['version'],'createdAt'=>date('c'),'commitDeadline'=>date('c',$deadline),'backedUpFiles'=>array_values(array_unique(array_merge($backedUp,$removedBackedUp))),'removedFiles'=>$removeFiles,'newFiles'=>$newFiles,'dbBackups'=>$dbBackups,'migrations'=>$migrations,'committed'=>false];
            @file_put_contents($backup.'/backup.json',json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),LOCK_EX);
            bastianUpdaterWritePending(['backupId'=>$id,'fromVersion'=>$meta['fromVersion'],'toVersion'=>$meta['toVersion'],'createdAt'=>$meta['createdAt'],'commitDeadline'=>$meta['commitDeadline']]);
            bastianUpdaterRemoveTree($stage);
            $dirs=glob(bastianUpdaterBackupsDir().'*',GLOB_ONLYDIR)?:[]; rsort($dirs); foreach(array_slice($dirs,5) as $old)bastianUpdaterRemoveTree($old);
            return ['success'=>true,'installedVersion'=>$manifest['version'],'backupId'=>$id,'filesUpdated'=>count($files),'pending'=>true,'commitDeadline'=>$meta['commitDeadline'],'migrations'=>$migrations,'message'=>'به‌روزرسانی با موفقیت نصب شد و اکنون در وضعیت Pending است. پس از بررسی سامانه، «تأیید نهایی / Commit» را بزنید.'];
        } catch(Throwable $e) {
            foreach(array_reverse($written) as $path){$target=$root.'/'.$path;$saved=$backup.'/files/'.$path;if(is_file($saved))@copy($saved,$target);else @unlink($target);}
            try { bastianUpdaterDbRestore($backup); } catch(Throwable $ignored) {}
            bastianUpdaterRemoveTree($stage); @rmdir($backup); throw $e;
        }
    } finally {
        // Close exactly once; calling close() on an already closed/uninitialized ZipArchive
        // can raise 'Invalid or uninitialized Zip object' on some PHP/libzip versions.
        try { $zip->close(); } catch (Throwable $ignored) {}
    }
}


function bastianUpdaterPostInstallHealth(string $expectedVersion): array {
    $root=bastianUpdaterRoot();$checks=[];
    foreach(['index.html','portal.js','api/router.php','api/updater.php','app/main457-final.js','version.json'] as $file){
        $checks['file:'.$file]=is_file($root.'/'.$file)&&filesize($root.'/'.$file)>0;
    }
    $version=json_decode((string)@file_get_contents($root.'/version.json'),true);
    $checks['version']=is_array($version)&&(string)($version['version']??'')===$expectedVersion;
    $checks['php_sqlite']=extension_loaded('pdo_sqlite');
    try{
        $checks['database']=function_exists('bastianDbEnabled')&&bastianDbEnabled()&&((int)bastianPdo()->query('SELECT 1')->fetchColumn()===1);
    }catch(Throwable $e){$checks['database']=false;}
    $ok=!in_array(false,$checks,true);
    return ['success'=>$ok,'checks'=>$checks];
}

function bastianUpdaterAutoInstall(string $uploadedPath): array {
    $installed=bastianUpdaterInstall($uploadedPath,'');
    $backupId=(string)($installed['backupId']??'');
    $target=(string)($installed['installedVersion']??'');
    try{
        $health=bastianUpdaterPostInstallHealth($target);
        if(empty($health['success'])) throw new RuntimeException('تست سلامت پس از نصب ناموفق بود.');
        $commit=bastianUpdaterCommit($backupId);
        return array_merge($installed,[
            'pending'=>false,
            'autoCommitted'=>true,
            'health'=>$health,
            'message'=>'بسته با موفقیت پشتیبان‌گیری، نصب، تست و نهایی شد. اطلاعات مراکز و SQLite بدون تغییر حفظ شدند.'
        ],$commit);
    }catch(Throwable $e){
        try{$rollback=bastianUpdaterRollback($backupId,true);}catch(Throwable $rollbackError){
            throw new RuntimeException('نصب سلامت نبود و Rollback نیز ناموفق شد: '.$e->getMessage().' / '.$rollbackError->getMessage());
        }
        throw new RuntimeException('نصب سلامت نبود؛ نسخه قبلی خودکار بازیابی شد: '.$e->getMessage());
    }
}

function bastianUpdaterCommit(string $backupId): array {
    if (!preg_match('/^[A-Za-z0-9_-]+$/',$backupId)) throw new RuntimeException('شناسه پشتیبان معتبر نیست.');
    $pending=bastianUpdaterPending(); if(!$pending||$pending['backupId']!==$backupId)throw new RuntimeException('به‌روزرسانی pending مورد نظر یافت نشد.');
    $metaFile=bastianUpdaterBackupsDir().$backupId.'/backup.json'; $meta=json_decode((string)@file_get_contents($metaFile),true);
    if(!is_array($meta))throw new RuntimeException('اطلاعات پشتیبان ناقص است.');
    $meta['committed']=true; $meta['committedAt']=date('c');
    @file_put_contents($metaFile,json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),LOCK_EX);
    bastianUpdaterClearPending();
    return ['success'=>true,'committedVersion'=>(string)$meta['toVersion'],'message'=>'به‌روزرسانی با موفقیت تأیید نهایی (Commit) شد.'];
}

function bastianUpdaterRollback(string $backupId, bool $auto=false): array {
    if (!preg_match('/^[A-Za-z0-9_-]+$/',$backupId)) throw new RuntimeException('شناسه پشتیبان معتبر نیست.');
    $dir=bastianUpdaterBackupsDir().$backupId; $meta=json_decode((string)@file_get_contents($dir.'/backup.json'),true);
    if(!is_array($meta))throw new RuntimeException('پشتیبان به‌روزرسانی یافت نشد.');
    $root=bastianUpdaterRoot();
    foreach((array)($meta['backedUpFiles']??[]) as $path){$safe=bastianUpdaterSafePath((string)$path);if(!$safe)continue;$source=$dir.'/files/'.$safe;$target=$root.'/'.$safe;if(!is_file($source))throw new RuntimeException('فایل پشتیبان ناقص است: '.$safe);if(!is_dir(dirname($target)))@mkdir(dirname($target),0755,true);$tmp=$target.'.bastiyan-rollback';if(!@copy($source,$tmp)||!@rename($tmp,$target))throw new RuntimeException('بازیابی فایل ممکن نشد: '.$safe);}
    foreach((array)($meta['newFiles']??[]) as $path){$safe=bastianUpdaterSafePath((string)$path);if($safe)@unlink($root.'/'.$safe);}
    if(!empty($meta['dbBackups'])) bastianUpdaterDbRestore($dir);
    bastianUpdaterClearPending();
    return ['success'=>true,'restoredVersion'=>(string)($meta['fromVersion']??''),'autoRollback'=>$auto,'message'=>$auto?'مهلت تأیید نهایی تمام شد و نسخه قبلی به‌صورت خودکار Rollback شد.':'نسخه پشتیبان با موفقیت بازیابی شد.'];
}
