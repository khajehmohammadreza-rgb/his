<?php
/**
 * Bastian Clinic Queue System - Multi-tenant PHP API
 * مدل جدید: هر مرکز کاملاً مستقل؛ پزشک = حساب کاربری پزشک؛ منشی = کاربر مرکز.
 * فقط super_admin سراسری است.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Token');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

$configFile = __DIR__ . '/config.php';
$pdo = null;
if (file_exists($configFile)) {
    require_once $configFile;
    try {
        $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . (defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4');
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    } catch (Throwable $e) { $pdo = null; }
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) @mkdir($dataDir, 0755, true);
$jsonDbFile = $dataDir . '/clinic_store.json';
$usersFile = $dataDir . '/users_store.json';
$sessionsFile = $dataDir . '/sessions_store.json';
if (!defined('APP_VERSION')) define('APP_VERSION', '3.3.16');


function jsonOut(array $data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function deny(string $msg='دسترسی غیرمجاز', int $code=403): void { jsonOut(['success'=>false,'error'=>$msg,'auth'=>false],$code); }
function hashPass(string $p): string { return hash('sha256', $p . 'bc_salt_v1'); }
function secureHash(string $p): string { return password_hash($p, PASSWORD_DEFAULT); }
function verifyStoredPass(string $plain, string $stored): bool {
    if ($stored === '') return false;
    if (preg_match('/^\$(2y|2a|2b)\$|^\$argon2/', $stored)) return password_verify($plain, $stored);
    return hash_equals($stored, hashPass($plain));
}
function normalizeLoginUsername($v): string { return preg_replace('/\s+/', ' ', trim((string)$v)); }
function clientPackageSecret(string $dataDir): string {
    $file=$dataDir.'/.client_package_secret';
    $lock=$file.'.lock';
    $read=function() use($file){ if(!is_file($file))return ''; $v=trim((string)@file_get_contents($file)); return preg_match('/^[a-f0-9]{64}$/i',$v)?strtolower($v):''; };
    $existing=$read(); if($existing!=='')return $existing;
    $h=@fopen($lock,'c');
    if($h){@flock($h,LOCK_EX);$existing=$read();if($existing===''){ $existing=bin2hex(random_bytes(32)); @file_put_contents($file,$existing,LOCK_EX); @chmod($file,0640); }@flock($h,LOCK_UN);@fclose($h);return $existing;}
    $existing=bin2hex(random_bytes(32));@file_put_contents($file,$existing,LOCK_EX);@chmod($file,0640);return $existing;
}
function clientPackageSignature(string $dataDir,string $centerId,string $role): string {
    $roles=['doctor','secretary','display','super_admin']; if(!in_array($role,$roles,true)||$centerId==='')return '';
    $secret=clientPackageSecret($dataDir); return hash_hmac('sha256','bastian-client-v1|'.$centerId.'|'.$role,$secret);
}
function validClientPackageSignature(string $dataDir,string $centerId,string $role,string $sig): bool {
    if($sig===''||strlen($sig)!==64)return false; $expected=clientPackageSignature($dataDir,$centerId,$role); return $expected!==''&&hash_equals($expected,strtolower($sig));
}
function normalizeRoom(string $r): string {
    $r=trim($r); if ($r==='') return 'اتاق ۱';
    $n=str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'],['0','1','2','3','4','5','6','7','8','9'],$r);
    return preg_match('/^\d+$/',$n) ? 'اتاق '.$r : $r;
}
function todayJalaliKey(): string { return date('Y-m-d'); }
function validLicense(array $c): bool { return !empty($c['isActive']) && (!empty($c['licenseUntil']) ? $c['licenseUntil'] >= todayJalaliKey() : true); }
function publicDoctor(array $d): array {
    $x=$d; unset($x['password'],$x['passwordHash']);
    $active=array_key_exists('active',$x)?(bool)$x['active']:(array_key_exists('isActive',$x)?(bool)$x['isActive']:true);
    $x['active']=$active; $x['isActive']=$active;
    return $x;
}
function publicSecretary(array $s): array { $x=$s; unset($x['password'],$x['passwordHash']); $active=array_key_exists('active',$x)?(bool)$x['active']:(bool)($x['isActive']??true); $x['active']=$active; $x['isActive']=$active; return $x; }
function getUsers(string $file): array {
    if (file_exists($file)) { $d=json_decode(file_get_contents($file),true); if(is_array($d)) return $d; }
    return ['schemaVersion'=>3,'users'=>[]];
}
function ensureDefaultSuperAdmin(string $file, array $users): array {
    if (!isset($users['users']) || !is_array($users['users'])) $users['users']=[];

    // اگر هر سوپرادمینی از قبل وجود دارد، مشخصات ورود او را عیناً حفظ کن.
    // فقط ساختار رمز قدیمی را به passwordHash مهاجرت می‌دهیم؛ username کاربر هرگز بازنویسی نمی‌شود.
    foreach ($users['users'] as &$u) {
        if (($u['role']??'')==='super_admin') {
            $changed=false;
            if (empty($u['id'])) { $u['id']='user-admin'; $changed=true; }
            if (!isset($u['displayName']) || trim((string)$u['displayName'])==='') { $u['displayName']='سوپر ادمین سیستم'; $changed=true; }
            if (!array_key_exists('isActive',$u)) { $u['isActive']=true; $changed=true; }
            if (empty($u['passwordHash']) && !empty($u['password'])) {
                $u['passwordHash']=secureHash((string)$u['password']);
                $changed=true;
            }
            if (isset($u['password'])) { unset($u['password']); $changed=true; }
            unset($u);
            if ($changed) saveUsers($file,$users);
            return $users;
        }
    }
    unset($u);

    // Chabokan deploy عمداً data/*.json را جایگزین نمی‌کند. در نصب تازه ممکن است users_store وجود نداشته باشد.
    // در این حالت فقط یک بار Seed هش‌شده نسخه اصلی پروژه را وارد می‌کنیم؛ اگر کاربر قبلی وجود داشته باشد هرگز بازنویسی نمی‌شود.
    $seedFile=__DIR__.'/bootstrap/admin-seed.json';
    if (is_file($seedFile)) {
        $seed=json_decode((string)@file_get_contents($seedFile),true);
        if (is_array($seed) && !empty($seed['username']) && !empty($seed['passwordHash'])) {
            $users['users'][]=[
                'id'=>(string)($seed['id']??'user-admin'),
                'username'=>(string)$seed['username'],
                'passwordHash'=>(string)$seed['passwordHash'],
                'role'=>'super_admin',
                'displayName'=>(string)($seed['displayName']??'سوپر ادمین سیستم'),
                'isActive'=>true
            ];
            saveUsers($file,$users);
        }
    }
    return $users;
}
function atomicWrite(string $file,string $contents):bool {
    $dir=dirname($file); if(!is_dir($dir)) @mkdir($dir,0755,true);
    $tmp=$file.'.tmp-'.bin2hex(random_bytes(4));
    $ok=@file_put_contents($tmp,$contents,LOCK_EX)!==false;
    if($ok) { @chmod($tmp,0640); $ok=@rename($tmp,$file); }
    if(!$ok) @unlink($tmp); return $ok;
}
function saveUsers(string $file,array $d):void { atomicWrite($file,json_encode($d,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)); }
function defaultDisplaySettings(): array {
    return [
        'style'=>'modern','mode'=>'queue','showClock'=>true,'showConnection'=>true,'showTicker'=>true,'showQr'=>true,
        'showBastianBrand'=>true,'showCenterLogo'=>true,'showDoctorPhoto'=>true,'repeatCount'=>2,'volume'=>0.9,
        'backgroundColor'=>'#07111f','headerColor'=>'#071725','cardColor'=>'#0f2232','doctorHeaderColor'=>'#0b2130',
        'doctorNameColor'=>'#ffffff','doctorSpecialtyColor'=>'#b9ceda','roomColor'=>'#8be7ff','numberColor'=>'#ffe071','patientColor'=>'#ffffff','hintColor'=>'#9db5c5','copyrightColor'=>'#7891a1','lineColor'=>'#294258',
        'callingColor'=>'#ffd76a','statusColor'=>'#8be9ad','tickerBackground'=>'#07131f','tickerLabelColor'=>'#8be7ff',
        'tickerTextColor'=>'#d9e9f1','tickerSpeed'=>34,'qrPosition'=>'left','qrSize'=>185,
        'cardRadius'=>22,'cardGap'=>12,'showPatientName'=>true,'showRoom'=>true,
        'headerScale'=>100,'numberScale'=>100,'doctorScale'=>100,'tickerScale'=>100,
        'qrCodes'=>[],'mediaPlaylist'=>[],'mediaMutedDuringCall'=>true,'mediaVolume'=>0.8
    ];
}
function defaultSettings(string $name): array {
    return ['clinicName'=>$name,'subtitle'=>'سامانه هوشمند فراخوان نوبت و مدیریت درمانگاه','repeatCount'=>2,'volume'=>0.9,'autoPrintOnCreate'=>false,'receiptMessage'=>'لطفاً تا زمان اعلام شماره نوبت در سالن انتظار شکیبا باشید.','showDoctorPhoto'=>true,'showLogo'=>true,'phone'=>'','address'=>'','lanIp'=>'','port'=>80,'appointmentUrl'=>'','appointmentSiteName'=>'','appointmentDescription'=>'برای دریافت نوبت آنلاین، QR را اسکن کنید.','appointmentLinks'=>[],'qrLinks'=>[],'displaySettings'=>defaultDisplaySettings()];
}
function getJsonStore(string $file): array {
    static $requestCache=[];
    if(isset($requestCache[$file])) return $requestCache[$file];
    $mtime=@filemtime($file) ?: 0;
    $key='bc_store_'.sha1($file);
    if(function_exists('apcu_fetch')) { $ok=false; $cached=apcu_fetch($key,$ok); if($ok && is_array($cached) && (int)($cached['_mtime']??-1)===$mtime){ unset($cached['_mtime']); return $requestCache[$file]=$cached; } }
    if(file_exists($file)) { $d=json_decode((string)@file_get_contents($file),true); if(is_array($d)){ if(function_exists('apcu_store')) { $tmp=$d; $tmp['_mtime']=$mtime; @apcu_store($key,$tmp,30); } return $requestCache[$file]=$d; } }
    return $requestCache[$file]=['schemaVersion'=>3,'version'=>1,'lastUpdated'=>round(microtime(true)*1000),'centers'=>[]];
}
function saveStore(string $file,array $d,?string $centerId=null):array {
    $now=round(microtime(true)*1000); $d['schemaVersion']=3;
    if($centerId && isset($d['centers'])) foreach($d['centers'] as &$c) if(($c['id']??'')===$centerId){$c['version']=(int)($c['version']??1)+1;$c['lastUpdated']=$now;break;} unset($c);
    $d['version']=(int)($d['version']??1)+1; $d['lastUpdated']=$now;
    atomicWrite($file,json_encode($d,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
    $key='bc_store_'.sha1($file); if(function_exists('apcu_delete')) @apcu_delete($key);
    return $d;
}
function withFileLock(string $lockFile, callable $callback) {
    $h=@fopen($lockFile,'c');
    if(!$h) return $callback();
    try { @flock($h,LOCK_EX); return $callback(); } finally { @flock($h,LOCK_UN); @fclose($h); }
}
function getSessions(string $file):array { if(file_exists($file)){ $d=json_decode(file_get_contents($file),true); if(is_array($d)) return $d; } return []; }
function saveSessions(string $file,array $d):void { atomicWrite($file,json_encode(array_values($d),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)); }
function cleanSessions(array $s):array { $n=time(); return array_values(array_filter($s,fn($x)=>(int)($x['expiresAt']??0)>$n)); }
function createSession(string $file,string $userId,string $role,?string $doctorId,?string $centerId):string { return withFileLock($file.'.lock',function() use($file,$userId,$role,$doctorId,$centerId){ $s=cleanSessions(getSessions($file)); $t=bin2hex(random_bytes(32)); $ttl=$role==='display'?30*24*3600:12*3600; $s[]=['token'=>$t,'userId'=>$userId,'role'=>$role,'doctorId'=>$doctorId,'centerId'=>$centerId,'expiresAt'=>time()+$ttl,'createdAt'=>date('c')]; saveSessions($file,$s); return $t; }); }
function resolveSession(string $file,string $token):?array { foreach(cleanSessions(getSessions($file)) as $s) if(hash_equals((string)$s['token'],$token)) return $s; return null; }
function destroySession(string $file,string $token):void { withFileLock($file.'.lock',function() use($file,$token){ saveSessions($file,array_values(array_filter(getSessions($file),fn($s)=>($s['token']??'')!==$token))); }); }
function bearer():string {
    $a=$_SERVER['HTTP_AUTHORIZATION']??($_SERVER['HTTP_X_SESSION_TOKEN']??'');
    if(!$a && isset($_GET['token'])) $a='Bearer '.trim((string)$_GET['token']);
    if(stripos($a,'Bearer ')===0)return trim(substr($a,7));
    $cookie=trim((string)($_COOKIE['bastian_session']??''));
    return $cookie;
}
function setSessionCookie(string $token, int $ttl=43200):void {
    $secure=(!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS'])!=='off') || (($_SERVER['HTTP_X_FORWARDED_PROTO']??'')==='https');
    setcookie('bastian_session',$token,[
        'expires'=>time()+$ttl,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict'
    ]);
}
function clearSessionCookie():void {
    $secure=(!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS'])!=='off') || (($_SERVER['HTTP_X_FORWARDED_PROTO']??'')==='https');
    setcookie('bastian_session','',[
        'expires'=>time()-3600,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict'
    ]);
}

function findCenter(array $store,?string $id):?array { if(!$id)return null; foreach(($store['centers']??[]) as $c)if(($c['id']??'')===$id)return $c; return null; }
function centerIndex(array $store,string $id):int { foreach(($store['centers']??[]) as $i=>$c)if(($c['id']??'')===$id)return $i; return -1; }
function isDefaultCenter(array $c):bool { return !empty($c['isDefault']) || (($c['id']??'')==='center-1'); }
function isDefaultStaff(array $u):bool { $id=(string)($u['id']??''); return !empty($u['isDefault']) || !empty($u['protectedDefault']) || in_array($id,['doc-1','sec-20260919041107-f4e4','sec-1','secretary-1'],true); }
function currentCenterOrDeny(array $session,array $store):array { $id=$session['centerId']??null; if(!$id)deny('مرکز برای این نشست انتخاب نشده است.',400); $c=findCenter($store,$id); if(!$c)deny('مرکز پیدا نشد.',404); if(!validLicense($c) && ($session['role']??'')!=='super_admin')deny('مرکز غیرفعال است یا تاریخ اعتبار آن به پایان رسیده است.',403); return $c; }
function uniqueUsername(array $store,array $users,string $username,?string $ignoreDoctor=null,?string $ignoreSecretary=null,?string $ignoreCenter=null):bool {
    foreach($users['users']??[] as $u) if(($u['username']??'')===$username && ($u['id']??'')!=='user-admin') return false;
    foreach($store['centers']??[] as $c){
        if(($c['username']??$c['displayUsername']??'')===$username && ($c['id']??'')!==$ignoreCenter)return false;
        foreach($c['doctors']??[] as $d)if(($d['username']??'')===$username && ($d['id']??'')!==$ignoreDoctor)return false;
        foreach($c['secretaries']??[] as $s)if(($s['username']??'')===$username && ($s['id']??'')!==$ignoreSecretary)return false;
    }
    return true;
}
function defaultRolePanelPermissions(string $role):array { if($role==='doctor') return ['doctor'=>true,'secretary'=>false,'tv'=>true,'settings'=>false,'users'=>false]; if($role==='secretary') return ['doctor'=>true,'secretary'=>true,'tv'=>true,'settings'=>false,'users'=>false]; return ['doctor'=>false,'secretary'=>false,'tv'=>false,'settings'=>false,'users'=>false]; }
function effectivePanelPermission(array $session,array $c,string $panel):bool { if(($session['role']??'')==='super_admin') return true; $u=findUnifiedUser($c,(string)($session['userId']??'')); $base=$c['permissionConfig']['panels'][$session['role']??''][$panel]??defaultRolePanelPermissions($session['role']??'')[$panel]??false; if($u && array_key_exists($panel,$u['panelPermissions']??[])) return (bool)$u['panelPermissions'][$panel]; return (bool)$base; }
function defaultRolePermissions(string $role):array {
    $common=['health'=>true,'server-info'=>true,'auth/me'=>true,'auth/logout'=>true,'state'=>true,'sync/poll'=>true,'sync/events'=>true,'state/sync'=>true];
    if($role==='doctor') return $common + ['queue-slots/get'=>true,'queues/call'=>true,'queues/next'=>true,'queues/finish-and-next'=>true,'queues/status'=>true,'queues/note'=>true,'queues/patient-update'=>false,'queues/patient-toggle-all'=>false,'secretary/call'=>true,'doctor/password'=>true,'auth/switch-to-display'=>true,'auth/restore-panel'=>true];
    if($role==='display') return $common + ['sync/events'=>true,'sync/poll'=>true,'queue-slots/get'=>true,'announcements/complete'=>true]; if($role==='secretary') return $common + ['queues/add'=>true,'queues/call'=>true,'queues/next'=>true,'queues/finish-and-next'=>true,'queues/status'=>true,'queues/delete'=>true,'queues/clear-all'=>true,'queues/note'=>true,'queues/patient-update'=>true,'queues/patient-toggle-all'=>true,'queue-slots/get'=>true,'queue-slots/save'=>true,'queue-slots/set'=>true,'queue-slots/bulk-set'=>true,'queue-slots/capacity'=>true,'doctors/booking-status'=>true,'tickers/save'=>true,'announcements/broadcast'=>true,'secretary/call'=>true,'auth/switch-to-display'=>true,'auth/restore-panel'=>true,'users/list'=>false,'users/add'=>false,'users/update'=>false,'users/delete'=>false];
    return $common;
}
function publicUser(array $u):array {
    $role=$u['role']??'secretary';
    return ['id'=>$u['id']??'','name'=>$u['name']??($u['displayName']??''),'username'=>$u['username']??'','role'=>$role,'isActive'=>$u['isActive']??($u['active']??true),'active'=>$u['active']??($u['isActive']??true),'specialty'=>$u['specialty']??null,'room'=>$u['room']??null,'photoUrl'=>$u['photoUrl']??null,'color'=>$u['color']??'indigo','permissions'=>$u['permissions']??[],'permissionMode'=>$u['permissionMode']??'inherit','panelPermissions'=>$u['panelPermissions']??[],'isDefault'=>isDefaultStaff($u)];
}
function syncUnifiedUsers(array &$store):bool {
    $changed=false;
    foreach($store['centers'] as &$c){
        if(!isset($c['users']) || !is_array($c['users'])) $c['users']=[];
        $byId=[]; foreach($c['users'] as $u) if(isset($u['id'])) $byId[$u['id']]=$u;
        foreach($c['doctors']??[] as $d){
            $id=$d['id']??('doc-'.bin2hex(random_bytes(3)));
            if(isset($byId[$id])){
                $u=$byId[$id];
                if(($u['role']??'doctor')!=='doctor') continue;
                foreach(['name','specialty','room','photoUrl','color','username','passwordHash','bookingClosed','bookingClosedAt','isDefault','protectedDefault'] as $k){
                    if(array_key_exists($k,$d) && ($u[$k]??null)!==$d[$k]){$u[$k]=$d[$k];$changed=true;}
                }
                $active=doctorActive($d);
                if(($u['isActive']??true)!==$active || ($u['active']??true)!==$active){$u['isActive']=$active;$u['active']=$active;$changed=true;}
                $byId[$id]=$u;
                continue;
            }
            $byId[$id]=['id'=>$id,'role'=>'doctor','name'=>$d['name']??'','username'=>$d['username']??'','passwordHash'=>$d['passwordHash']??'','isActive'=>doctorActive($d),'active'=>doctorActive($d),'specialty'=>$d['specialty']??'','room'=>$d['room']??'','photoUrl'=>$d['photoUrl']??null,'color'=>$d['color']??'indigo','bookingClosed'=>(bool)($d['bookingClosed']??false),'bookingClosedAt'=>$d['bookingClosedAt']??null,'permissions'=>[],'permissionMode'=>'inherit','panelPermissions'=>[],'isDefault'=>!empty($d['isDefault']),'protectedDefault'=>!empty($d['protectedDefault'])];
            $changed=true;
        }
        foreach($c['secretaries']??[] as $x){
            $id=$x['id']??('sec-'.bin2hex(random_bytes(3)));
            if(isset($byId[$id])){
                $u=$byId[$id];
                if(($u['role']??'secretary')!=='secretary') continue;
                foreach(['name','username','passwordHash','isDefault','protectedDefault'] as $k) if(array_key_exists($k,$x) && ($u[$k]??null)!==$x[$k]){$u[$k]=$x[$k];$changed=true;}
                $active=($x['isActive']??($x['active']??true));
                if(($u['isActive']??true)!==$active || ($u['active']??true)!==$active){$u['isActive']=$active;$u['active']=$active;$changed=true;}
                $byId[$id]=$u;
                continue;
            }
            $byId[$id]=['id'=>$id,'role'=>'secretary','name'=>$x['name']??'','username'=>$x['username']??'','passwordHash'=>$x['passwordHash']??'','isActive'=>$x['isActive']??($x['active']??true),'active'=>$x['active']??($x['isActive']??true),'permissions'=>[],'permissionMode'=>'inherit','panelPermissions'=>[],'isDefault'=>!empty($x['isDefault']),'protectedDefault'=>!empty($x['protectedDefault'])];
            $changed=true;
        }
        $c['users']=array_values($byId);
        $newDocs=[];$newSecs=[];
        foreach($c['users'] as $u){
            if(($u['role']??'')==='doctor') $newDocs[]=['id'=>$u['id'],'name'=>$u['name']??'','specialty'=>$u['specialty']??'','room'=>$u['room']??'','color'=>$u['color']??'indigo','isActive'=>$u['isActive']??($u['active']??true),'active'=>$u['active']??($u['isActive']??true),'photoUrl'=>$u['photoUrl']??null,'username'=>$u['username']??'','passwordHash'=>$u['passwordHash']??'','bookingClosed'=>(bool)($u['bookingClosed']??false),'bookingClosedAt'=>$u['bookingClosedAt']??null,'isDefault'=>isDefaultStaff($u),'protectedDefault'=>isDefaultStaff($u)];
            elseif(($u['role']??'')==='secretary') $newSecs[]=['id'=>$u['id'],'name'=>$u['name']??'','username'=>$u['username']??'','passwordHash'=>$u['passwordHash']??'','isActive'=>$u['isActive']??($u['active']??true),'active'=>$u['active']??($u['isActive']??true),'isDefault'=>isDefaultStaff($u),'protectedDefault'=>isDefaultStaff($u)];
        }
        if(json_encode($c['doctors']??[],JSON_UNESCAPED_UNICODE)!==json_encode($newDocs,JSON_UNESCAPED_UNICODE)){ $c['doctors']=$newDocs; $changed=true; }
        if(json_encode($c['secretaries']??[],JSON_UNESCAPED_UNICODE)!==json_encode($newSecs,JSON_UNESCAPED_UNICODE)){ $c['secretaries']=$newSecs; $changed=true; }
        if(!isset($c['permissionConfig'])||!is_array($c['permissionConfig'])){$c['permissionConfig']=['roles'=>['doctor'=>defaultRolePermissions('doctor'),'secretary'=>defaultRolePermissions('secretary')],'panels'=>['doctor'=>defaultRolePanelPermissions('doctor'),'secretary'=>defaultRolePanelPermissions('secretary')]];$changed=true;}
    } unset($c);
    return $changed;
}
function findUnifiedUser(array $c,string $id):?array { foreach($c['users']??[] as $u) if(($u['id']??'')===$id)return $u; return null; }
function permissionCatalog():array { return array_keys(['users/list'=>true,'users/add'=>true,'users/update'=>true,'users/delete'=>true,'queues/add'=>true,'queues/call'=>true,'queues/status'=>true,'queues/delete'=>true,'queues/clear-all'=>true,'queues/note'=>true,'queues/patient-update'=>true,'queues/patient-toggle-all'=>true,'queue-slots/get'=>true,'queue-slots/save'=>true,'queue-slots/set'=>true,'queue-slots/bulk-set'=>true,'queue-slots/capacity'=>true,'doctors/booking-status'=>true,'queues/next'=>true,'queues/finish-and-next'=>true,'tickers/save'=>true,'announcements/broadcast'=>true,'secretary/call'=>true,'auth/switch-to-display'=>true,'doctor/password'=>true,'state'=>true,'sync/poll'=>true,'sync/events'=>true,'state/sync'=>true]); }
function cleanPermissions($p):array { $out=[]; if(!is_array($p))return $out; foreach(permissionCatalog() as $k) if(array_key_exists($k,$p)) $out[$k]=(bool)$p[$k]; return $out; }
function effectivePermission(array $session,array $c,string $route):bool {
    if(($session['role']??'')==='super_admin') return true;
    $u=findUnifiedUser($c,(string)($session['userId']??'')); $role=$session['role']??'';
    $base=$c['permissionConfig']['roles'][$role][$route]??defaultRolePermissions($role)[$route]??false;
    if($u && array_key_exists($route,$u['permissions']??[])) return (bool)$u['permissions'][$route];
    return (bool)$base;
}
function syncUserToLegacyArrays(array &$c):void {
    $c['doctors']=[];$c['secretaries']=[];
    foreach($c['users']??[] as $u){
        if(($u['role']??'')==='doctor') $c['doctors'][]=['id'=>$u['id'],'name'=>$u['name']??'','specialty'=>$u['specialty']??'','room'=>$u['room']??'','color'=>$u['color']??'indigo','isActive'=>$u['isActive']??($u['active']??true),'active'=>$u['active']??($u['isActive']??true),'photoUrl'=>$u['photoUrl']??null,'username'=>$u['username']??'','passwordHash'=>$u['passwordHash']??'','bookingClosed'=>(bool)($u['bookingClosed']??false),'bookingClosedAt'=>$u['bookingClosedAt']??null,'isDefault'=>isDefaultStaff($u),'protectedDefault'=>isDefaultStaff($u)];
        elseif(($u['role']??'')==='secretary') $c['secretaries'][]=['id'=>$u['id'],'name'=>$u['name']??'','username'=>$u['username']??'','passwordHash'=>$u['passwordHash']??'','isActive'=>$u['isActive']??($u['active']??true),'active'=>$u['active']??($u['isActive']??true),'isDefault'=>isDefaultStaff($u),'protectedDefault'=>isDefaultStaff($u)];
    }
}
function safeCenter(array $c,bool $includeStaff=false):array {
    $out=['id'=>$c['id'],'code'=>$c['code']??$c['id'],'name'=>$c['name'],'username'=>$c['username']??$c['displayUsername']??'','licenseUntil'=>$c['licenseUntil']??null,'isActive'=>$c['isActive']??true,'createdAt'=>$c['createdAt']??null,'version'=>$c['version']??1,'lastUpdated'=>$c['lastUpdated']??null,'isDefault'=>isDefaultCenter($c)];
    if($includeStaff){$out['doctors']=array_map('publicDoctor',$c['doctors']??[]);$out['secretaries']=array_map('publicSecretary',$c['secretaries']??[]);$out['settings']=$c['settings']??[];$out['tickers']=$c['tickers']??[];}
    return $out;
}


function normalizeAppointmentUrl(string $u):string {
    $u=trim($u); if($u==='') return '';
    if(!preg_match('~^https?://~i',$u)) return '';
    return filter_var($u,FILTER_VALIDATE_URL)?$u:'';
}
function normalizeAppointmentLinks($links,array $legacy=[]):array {
    $out=[]; $seen=[];
    if(is_array($links)) foreach($links as $x){
        if(!is_array($x)) continue;
        $url=normalizeAppointmentUrl((string)($x['url']??$x['appointmentUrl']??'')); if($url==='') continue;
        $id=trim((string)($x['id']??'')); if($id===''||isset($seen[$id])) $id='link-'.bin2hex(random_bytes(4));
        $seen[$id]=1; $out[]=['id'=>$id,'name'=>trim((string)($x['name']??$x['title']??'دریافت نوبت آنلاین')),'url'=>$url,'description'=>trim((string)($x['description']??'برای دریافت نوبت آنلاین، QR را اسکن کنید.')),'active'=>array_key_exists('active',$x)?(bool)$x['active']:true];
        if(count($out)>=12) break;
    }
    if(!$out && !empty($legacy['appointmentUrl'])){
        $u=normalizeAppointmentUrl((string)$legacy['appointmentUrl']);
        if($u!=='') $out[]=['id'=>'appointment-default','name'=>trim((string)($legacy['appointmentSiteName']??''))?:'دریافت نوبت آنلاین','url'=>$u,'description'=>trim((string)($legacy['appointmentDescription']??''))?:'برای دریافت نوبت آنلاین، QR را اسکن کنید.','active'=>true];
    }
    return $out;
}
function normalizeHexColor($v,string $fallback):string { $x=trim((string)$v); return preg_match('/^#[0-9a-fA-F]{6}$/',$x)?strtolower($x):$fallback; }
function normalizeQrCodes($links):array {
    $out=[];$seen=[];
    if(is_array($links)) foreach($links as $x){
        if(!is_array($x)) continue;
        $id=trim((string)($x['id']??'')); if($id===''||isset($seen[$id])) $id='qr-'.bin2hex(random_bytes(4)); $seen[$id]=1;
        $url=normalizeAppointmentUrl((string)($x['url']??''));
        $imageUrl=trim((string)($x['imageUrl']??''));
        if($imageUrl!=='' && !preg_match('~^/api/media/qr\?~',$imageUrl)) $imageUrl='';
        $out[]=['id'=>$id,'name'=>trim((string)($x['name']??'QR نمایشگر'))?:'QR نمایشگر','url'=>$url,'description'=>trim((string)($x['description']??'')),'active'=>array_key_exists('active',$x)?(bool)$x['active']:true,'imageUrl'=>$imageUrl];
        if(count($out)>=12) break;
    }
    return $out;
}
function normalizeTickers($items):array {
    if(!is_array($items)) return [];
    $out=[];$seen=[];
    foreach($items as $x){
        if(!is_array($x)) continue;
        $text=trim((string)($x['text']??''));
        if($text==='') continue;
        if(function_exists('mb_substr')) $text=mb_substr($text,0,500,'UTF-8'); else $text=substr($text,0,1500);
        $id=trim((string)($x['id']??''));
        if($id===''||!preg_match('/^[A-Za-z0-9._:-]{1,100}$/',$id)||isset($seen[$id])) $id='tick-'.bin2hex(random_bytes(6));
        $seen[$id]=true;
        $out[]=['id'=>$id,'text'=>$text,'active'=>array_key_exists('active',$x)?(bool)$x['active']:true];
        if(count($out)>=100) break;
    }
    return $out;
}

function normalizeDisplaySettings($display, array $settings):array {
    $d=array_merge(defaultDisplaySettings(),is_array($display)?$display:[]);
    $d['style']=in_array(($d['style']??''),['modern','classic'],true)?$d['style']:'modern';
    $d['mode']=in_array(($d['mode']??''),['queue','media'],true)?$d['mode']:'queue';
    $d['mediaMutedDuringCall']=true; // فراخوان صوتی همیشه بر صدای رسانه اولویت دارد؛ رسانه موقتاً کاملاً بی‌صدا می‌شود.
    $d['mediaVolume']=max(0,min(1,(float)($d['mediaVolume']??0.8)));
    $rawMedia=is_array($d['mediaPlaylist']??null)?$d['mediaPlaylist']:[];$d['mediaPlaylist']=[];
    foreach($rawMedia as $m){
        if(!is_array($m))continue;$mid=preg_replace('/[^A-Za-z0-9_-]/','',(string)($m['id']??''));$url=trim((string)($m['url']??''));$type=(string)($m['type']??'');
        if($mid===''||!in_array($type,['image','video','audio','pdf','office'],true)||!preg_match('~^/api/media/file\?~',$url))continue;
        $d['mediaPlaylist'][]=['id'=>$mid,'name'=>trim((string)($m['name']??'رسانه'))?:'رسانه','type'=>$type,'url'=>$url,'duration'=>max(3,min(3600,(int)($m['duration']??12))),'active'=>array_key_exists('active',$m)?(bool)$m['active']:true,'extension'=>preg_replace('/[^A-Za-z0-9]/','',strtolower((string)($m['extension']??'')))];
    }
    foreach(['showClock','showConnection','showTicker','showQr','showBastianBrand','showCenterLogo','showDoctorPhoto','showPatientName','showRoom'] as $k) $d[$k]=array_key_exists($k,$d)?(bool)$d[$k]:defaultDisplaySettings()[$k];
    $defaults=defaultDisplaySettings();
    foreach(['backgroundColor','headerColor','cardColor','doctorHeaderColor','doctorNameColor','doctorSpecialtyColor','roomColor','numberColor','patientColor','hintColor','copyrightColor','lineColor','callingColor','statusColor','tickerBackground','tickerLabelColor','tickerTextColor',] as $k) $d[$k]=normalizeHexColor($d[$k]??$defaults[$k],$defaults[$k]);
    foreach(['tickerSpeed','qrSize','cardRadius','cardGap','headerScale','numberScale','doctorScale','tickerScale'] as $k){ $n=(int)($d[$k]??$defaults[$k]); $limits=['tickerSpeed'=>[12,120],'qrSize'=>[100,320],'cardRadius'=>[8,42],'cardGap'=>[4,32],'headerScale'=>[70,140],'numberScale'=>[60,150],'doctorScale'=>[70,150],'tickerScale'=>[60,150]]; [$mn,$mx]=$limits[$k]; $d[$k]=max($mn,min($mx,$n)); }
    $d['repeatCount']=max(1,min(3,(int)($d['repeatCount']??($settings['repeatCount']??2)))); $d['volume']=max(0,min(1,(float)($d['volume']??($settings['volume']??0.9))));
    $d['qrPosition']=in_array(($d['qrPosition']??''),['left','right'],true)?$d['qrPosition']:'left';
    $hasQrCodes=array_key_exists('qrCodes',is_array($display)?$display:[]); $sourceQr=$d['qrCodes']??[];
    if(!$hasQrCodes) $sourceQr=$settings['appointmentLinks']??($settings['qrLinks']??[]);
    $d['qrCodes']=normalizeQrCodes($sourceQr);
    return $d;
}
function normalizeCenterSettings(array $settings,string $name):array {
    $s=array_merge(defaultSettings($name),$settings);
    $sourceLinks=!empty($s['appointmentLinks'])?$s['appointmentLinks']:($s['qrLinks']??[]);
    $s['appointmentLinks']=normalizeAppointmentLinks($sourceLinks,$s);
    $s['qrLinks']=$s['appointmentLinks'];
    if($s['appointmentLinks']){
        $p=$s['appointmentLinks'][0]; $s['appointmentUrl']=$p['url']; $s['appointmentSiteName']=$p['name']; $s['appointmentDescription']=$p['description'];
    } else { $s['appointmentUrl']='';$s['appointmentSiteName']='';$s['appointmentDescription']='برای دریافت نوبت آنلاین، QR را اسکن کنید.'; }
    $s['displaySettings']=normalizeDisplaySettings($s['displaySettings']??[], $s);
    return $s;
}
function doctorActive(array $d):bool { return array_key_exists('active',$d)?(bool)$d['active']:(array_key_exists('isActive',$d)?(bool)$d['isActive']:true); }
function faDigits(string $s): string { return strtr($s,['0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹']); }
function todayQueueDayKey(): string { return date('Y-m-d'); }
function normalizeQueueDayKey(array $q): string {
    $k=trim((string)($q['dayKey']??''));
    if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$k)) return $k;
    $created=trim((string)($q['createdAt']??''));
    $ts=$created!==''?strtotime($created):false;
    return $ts?date('Y-m-d',$ts):todayQueueDayKey();
}
function queueIsCurrentDay(array $q): bool { return normalizeQueueDayKey($q)===todayQueueDayKey(); }
function queuePayload(array $q): array {
    $q['dayKey']=normalizeQueueDayKey($q);
    $q['isActive']=array_key_exists('isActive',$q)?(bool)$q['isActive']:true;
    $q['patientName']=trim((string)($q['patientName']??''))?:'بدون نام';
    $q['nationalId']=trim((string)($q['nationalId']??''));
    $history=[];
    if(is_array($q['callHistory']??null)){
        foreach($q['callHistory'] as $ev){
            if(!is_array($ev))continue;
            $at=trim((string)($ev['at']??''));
            if($at==='')continue;
            $history[]=[
                'at'=>$at,
                'action'=>trim((string)($ev['action']??'call'))?:'call',
                'callId'=>trim((string)($ev['callId']??'')),
            ];
        }
    }
    // داده‌های نسخه‌های قبلی فاقد callHistory بودند؛ calledAt را بدون تغییر دیتای قدیمی
    // به‌عنوان اولین سابقه قابل نمایش برمی‌گردانیم.
    if(!$history && !empty($q['calledAt'])){
        $history[]=['at'=>(string)$q['calledAt'],'action'=>'legacy','callId'=>''];
    }
    $q['callHistory']=$history;
    $q['callCount']=max((int)($q['callCount']??0),count($history));
    $q['lastCalledAt']=trim((string)($q['lastCalledAt']??($q['calledAt']??'')));
    return $q;
}
function appendQueueCallEvent(array &$q,string $action,array $input=[]): void {
    $normalized=queuePayload($q);
    $history=$normalized['callHistory'];
    $before=max((int)($q['callCount']??0),count($history));
    $at=date('c');
    $history[]=[
        'at'=>$at,
        'action'=>$action,
        'callId'=>trim((string)($input['callId']??'')),
    ];
    // صف روزانه است؛ برای جلوگیری از رشد غیرعادی، ۲۵۰ زمان آخر نگهداری می‌شود
    // و callCount تعداد واقعی کل فراخوان‌ها را مستقل حفظ می‌کند.
    if(count($history)>250)$history=array_slice($history,-250);
    $q['callHistory']=$history;
    $q['callCount']=$before+1;
    $q['calledAt']=$at;
    $q['lastCalledAt']=$at;
}
function doctorQueueLimit(array $c,string $doctorId): int {
    foreach(($c['appointmentPlans']??[]) as $p){ if(is_array($p) && ($p['dayKey']??'')===todayQueueDayKey() && ($p['doctorId']??'')===$doctorId) return max(0,min(999,(int)($p['maxAppointments']??0))); }
    return 0;
}
function findQueueIndex(array $queues,string $qid): int { foreach($queues as $i=>$q) if(($q['id']??'')===$qid) return $i; return -1; }
function normalizeAppointmentPlans(array &$c): bool {
    $changed=false;
    if(!isset($c['appointmentPlans'])||!is_array($c['appointmentPlans'])){$c['appointmentPlans']=[];$changed=true;}
    foreach($c['queues']??[] as $qi=>$_q){
        $n=queuePayload($_q);
        if(($c['queues'][$qi]['dayKey']??'')!==$n['dayKey']){$c['queues'][$qi]['dayKey']=$n['dayKey'];$changed=true;}
        if(($c['queues'][$qi]['patientName']??'')!==$n['patientName']){$c['queues'][$qi]['patientName']=$n['patientName'];$changed=true;}
        if(($c['queues'][$qi]['nationalId']??'')!==$n['nationalId']){$c['queues'][$qi]['nationalId']=$n['nationalId'];$changed=true;}
        if(($c['queues'][$qi]['isActive']??true)!==$n['isActive']){$c['queues'][$qi]['isActive']=$n['isActive'];$changed=true;}
    }
    foreach($c['appointmentPlans'] as &$p){
        if(!is_array($p)){ $p=['dayKey'=>todayQueueDayKey(),'doctorId'=>'','maxAppointments'=>0,'slots'=>[],'updatedAt'=>date('c')]; $changed=true; }
        $p['dayKey']=preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)($p['dayKey']??''))?(string)$p['dayKey']:todayQueueDayKey();
        $p['doctorId']=trim((string)($p['doctorId']??''));
        $p['maxAppointments']=max(0,min(999,(int)($p['maxAppointments']??0)));
        if(!isset($p['slots'])||!is_array($p['slots'])){$p['slots']=[];$changed=true;}
        $slots=[]; foreach($p['slots'] as $slot){ if(!is_array($slot)) continue; $num=(int)($slot['number']??0); if($num<1||$num>$p['maxAppointments']) continue; $slots[(string)$num]=['number'=>$num,'queueId'=>trim((string)($slot['queueId']??''))]; }
        ksort($slots,SORT_NUMERIC); $newSlots=array_values($slots); if(json_encode($p['slots'],JSON_UNESCAPED_UNICODE)!==json_encode($newSlots,JSON_UNESCAPED_UNICODE)){$p['slots']=$newSlots;$changed=true;}
    } unset($p);
    return $changed;
}
function activeQueuesForState(array $queues, ?string $doctorId=null): array {
    $out=[]; foreach($queues as $q){$q=queuePayload($q); if(!queueIsCurrentDay($q)) continue; if($doctorId!==null&&($q['doctorId']??'')!==$doctorId) continue; if(($q['isActive']??true)!==true) continue; $out[]=$q;} usort($out,function($a,$b){$na=(int)($a['number']??0);$nb=(int)($b['number']??0); return $na===$nb?strcmp((string)($a['createdAt']??''),(string)($b['createdAt']??'')):$na<=>$nb;}); return $out;
}
function allCurrentQueues(array $queues): array { $out=[]; foreach($queues as $q){$q=queuePayload($q); if(queueIsCurrentDay($q))$out[]=$q;} return $out; }

function announcementBusSnapshot(array $c): array {
    $b=is_array($c['announcementBus']??null)?$c['announcementBus']:[];
    $current=is_array($b['current']??null)?$b['current']:null;
    $seen=[];
    if($current && !empty($current['callId'])) $seen[(string)$current['callId']]=true;
    $queue=[];
    foreach(($b['queue']??[]) as $x){
        if(!is_array($x)||empty($x['callId'])) continue;
        $id=(string)$x['callId'];
        // Old 3.3.x clients could enqueue the same call twice (broadcast + queues/call).
        // Deduplicate here so one stale duplicate can never stall all later announcements.
        if(isset($seen[$id])) continue;
        $seen[$id]=true; $queue[]=$x;
    }
    return ['current'=>$current,'queue'=>$queue,'queueLength'=>count($queue)];
}
function normalizeAnnouncementBusForWrite(array &$c): void {
    // اعلان جاری فقط با تأیید نمایشگر جابه‌جا می‌شود؛ هیچ فراخوانی به‌علت timeout بی‌صدا حذف نمی‌شود.
    $b=announcementBusSnapshot($c); $cur=$b['current'];
    $c['announcementBus']=['current'=>$cur,'queue'=>array_values($b['queue'])];
    $c['triggerAnnouncement']=$cur;
}
function callAnnouncementTask(array $input,array $q,array $c,string $doctorId): array {
    $now=round(microtime(true)*1000);
    return [
        'callId'=>trim((string)($input['callId']??''))?:('call-'.bin2hex(random_bytes(6))),
        'senderClientId'=>trim((string)($input['senderClientId']??'')),
        'number'=>(int)($q['number']??1),
        'room'=>findRoom($c,$doctorId),
        'patientName'=>trim((string)($q['patientName']??'')),
        'doctorName'=>findDoctorName($c,$doctorId),
        'specialty'=>findDoctorSpec($c,$doctorId),
        'timestamp'=>$now,'createdAtMs'=>$now,'startedAtMs'=>null,'expiresAtMs'=>null
    ];
}
function enqueueAnnouncement(array &$c,array $task): array {
    normalizeAnnouncementBusForWrite($c); $b=$c['announcementBus']; $now=round(microtime(true)*1000);
    $callId=trim((string)($task['callId']??''));
    if($callId!==''){
        if(is_array($b['current']??null) && (string)($b['current']['callId']??'')===$callId){
            $c['announcementBus']=$b;$c['triggerAnnouncement']=$b['current'];
            return ['queued'=>false,'duplicate'=>true,'position'=>0,'currentCallId'=>$callId,'queueLength'=>count($b['queue'])];
        }
        foreach($b['queue'] as $idx=>$queuedTask){
            if(is_array($queuedTask) && (string)($queuedTask['callId']??'')===$callId){
                $c['announcementBus']=$b;$c['triggerAnnouncement']=$b['current'];
                return ['queued'=>true,'duplicate'=>true,'position'=>$idx+1,'currentCallId'=>$b['current']['callId']??null,'queueLength'=>count($b['queue'])];
            }
        }
    }
    if(empty($b['current'])){
        $task['startedAtMs']=$now;$task['expiresAtMs']=null;$b['current']=$task;$queued=false;$position=0;
    } else {
        $b['queue'][]=$task;$queued=true;$position=count($b['queue']);
    }
    $c['announcementBus']=$b;$c['triggerAnnouncement']=$b['current'];
    return ['queued'=>$queued,'duplicate'=>false,'position'=>$position,'currentCallId'=>$b['current']['callId']??null,'queueLength'=>count($b['queue'])];
}
function completeAnnouncement(array &$c,string $callId): array {
    normalizeAnnouncementBusForWrite($c); $b=$c['announcementBus'];
    if(!$b['current'] || ($b['current']['callId']??'')!==$callId) return ['completed'=>false]+announcementBusSnapshot($c);
    $next=$b['queue']?array_shift($b['queue']):null;
    if($next){$now=round(microtime(true)*1000);$next['startedAtMs']=$now;$next['expiresAtMs']=null;}
    $b['current']=$next;$c['announcementBus']=$b;$c['triggerAnnouncement']=$next;
    return ['completed'=>true]+announcementBusSnapshot($c);
}


$route=trim($_GET['route']??$_GET['action']??'','/');
if($route===''){ $uri=$_SERVER['REQUEST_URI']??''; if(strpos($uri,'/api/')!==false){$p=explode('/api/',$uri,2);$route=explode('?', $p[1])[0];} }
$input=json_decode(file_get_contents('php://input'),true)??$_POST;
$__storeWriteLock=null;
if(in_array($_SERVER['REQUEST_METHOD']??'GET',['POST','PUT','PATCH','DELETE'],true)){
    $__storeWriteLock=@fopen($dataDir.'/.store.lock','c');
    if($__storeWriteLock) @flock($__storeWriteLock,LOCK_EX);
}
$store=getJsonStore($jsonDbFile); $users=ensureDefaultSuperAdmin($usersFile,getUsers($usersFile));
if(!isset($store['centers']) || !is_array($store['centers'])) $store['centers']=[];
$displayMetaChanged=false; foreach($store['centers'] as &$__center){
    if(empty($__center['username'])){ $__center['username']=normalizeLoginUsername($__center['displayUsername']??'center'); $displayMetaChanged=true; }
    unset($__center['displayUsername']);
} unset($__center); if($displayMetaChanged) $store=saveStore($jsonDbFile,$store,null);
// مهاجرت خودکار یک‌باره از نسخه‌های قبلی به مدل چندمرکزی جدید.
if(empty($store['centers']) && (isset($store['doctors'])||isset($store['queues'])||isset($store['settings']))) {
    $c=['id'=>'center-1','code'=>'CENTER-1','name'=>$store['settings']['clinicName']??'مرکز باستیان','licenseUntil'=>date('Y-m-d',strtotime('+1 year')),'isActive'=>true,'createdAt'=>date('c'),'version'=>(int)($store['version']??1),'lastUpdated'=>(int)($store['lastUpdated']??round(microtime(true)*1000)),'doctors'=>[],'secretaries'=>[],'tickers'=>$store['tickers']??[],'queues'=>$store['queues']??[],'settings'=>array_merge(defaultSettings($store['settings']['clinicName']??'مرکز باستیان'),$store['settings']??[]),'username'=>'center','displayPasswordHash'=>secureHash('123'),'triggerAnnouncement'=>null,'announcementBus'=>['current'=>null,'queue'=>[]],'triggerSecretaryCall'=>$store['triggerSecretaryCall']??null,'appointmentPlans'=>[]];
    foreach(($store['doctors']??[]) as $d){unset($d['password']);$d['username']=null;$d['passwordHash']=null;$c['doctors'][]=$d;}
    foreach(($users['users']??[]) as $u) if(($u['role']??'')==='secretary') $c['secretaries'][]=['id'=>$u['id'],'name'=>$u['displayName']??$u['username'],'username'=>$u['username'],'passwordHash'=>$u['passwordHash']??$u['password']??null,'isActive'=>$u['isActive']??($u['active']??true),'active'=>$u['active']??($u['isActive']??true)];
    $store=['schemaVersion'=>3,'version'=>1,'lastUpdated'=>round(microtime(true)*1000),'centers'=>[$c]];
    saveStore($jsonDbFile,$store,null);
    $users['users']=array_values(array_filter($users['users']??[],fn($u)=>($u['role']??'')==='super_admin'));
    foreach($users['users'] as &$u) if(isset($u['password'])){$u['passwordHash']=secureHash('INVALID-ROTATE');unset($u['password']);}
    saveUsers($usersFile,$users);
}

$__settingsChanged=false;
foreach($store['centers'] as &$__cset){
    $old=$__cset['settings']??[]; $__cset['settings']=normalizeCenterSettings($old,$__cset['name']??'مرکز باستیان');
    if(json_encode($old,JSON_UNESCAPED_UNICODE)!==json_encode($__cset['settings'],JSON_UNESCAPED_UNICODE)) $__settingsChanged=true;
}
unset($__cset);
$__plansChanged=false;
foreach($store['centers'] as &$__pc){ if(normalizeAppointmentPlans($__pc)) $__plansChanged=true; if(!isset($__pc['announcementBus'])||!is_array($__pc['announcementBus'])){$legacyAnnouncement=is_array($__pc['triggerAnnouncement']??null)?$__pc['triggerAnnouncement']:null;$__pc['announcementBus']=['current'=>$legacyAnnouncement,'queue'=>[]];$__pc['triggerAnnouncement']=$legacyAnnouncement;$__plansChanged=true;} }
unset($__pc);
if($__settingsChanged || $__plansChanged) $store=saveStore($jsonDbFile,$store,null);


function mergeMissingAssoc(array $base,array $defaults):array {
    foreach($defaults as $k=>$v){
        if(!array_key_exists($k,$base) || $base[$k]===null || $base[$k]==='') $base[$k]=$v;
        elseif(is_array($v) && is_array($base[$k]) && !array_is_list($v) && !array_is_list($base[$k])) $base[$k]=mergeMissingAssoc($base[$k],$v);
    }
    return $base;
}
function baselineUserKey(array $u):string {
    foreach(['id','username','name'] as $k){$v=trim((string)($u[$k]??''));if($v!=='')return $k.':'.mb_strtolower($v,'UTF-8');}
    return '';
}
function mergeBaselineUsers(array &$target,array $defs,string $role):bool {
    $changed=false;
    if(!isset($target[$role==='doctor'?'doctors':'secretaries']) || !is_array($target[$role==='doctor'?'doctors':'secretaries'])){$target[$role==='doctor'?'doctors':'secretaries']=[];$changed=true;}
    $key=$role==='doctor'?'doctors':'secretaries';
    foreach($defs as $def){
        if(!is_array($def))continue;
        $found=-1;
        foreach($target[$key] as $i=>$cur){
            if(!is_array($cur))continue;
            if((!empty($def['id']) && ($cur['id']??'')===$def['id']) || (!empty($def['username']) && ($cur['username']??'')===$def['username']) || (!empty($def['name']) && ($cur['name']??'')===$def['name'])){$found=$i;break;}
        }
        if($found<0){$target[$key][]=$def;$changed=true;continue;}
        // Preserve operator changes and passwords, but repair structurally missing baseline fields.
        $before=$target[$key][$found];
        $target[$key][$found]=mergeMissingAssoc($target[$key][$found],$def);
        if(!empty($def['isDefault'])){$target[$key][$found]['isDefault']=true;$target[$key][$found]['protectedDefault']=true;}
        if(json_encode($before,JSON_UNESCAPED_UNICODE)!==json_encode($target[$key][$found],JSON_UNESCAPED_UNICODE))$changed=true;
    }
    return $changed;
}
function applyBackupPersistentProfile(array &$store):bool {
    $profileFile=__DIR__.'/bootstrap/clinic-profile-2026-09-19.json';
    if(!is_file($profileFile)) return false;
    $profile=jsonReadSafe($profileFile,[]); $src=$profile['center']??null; $version=trim((string)($profile['profileVersion']??''));
    if(!is_array($src)||$version==='')return false;
    if(!isset($store['centers'])||!is_array($store['centers']))$store['centers']=[];
    $idx=-1;
    foreach($store['centers'] as $i=>$c){
        if(($c['id']??'')===($src['id']??'center-1') || (($c['code']??'')!=='' && ($c['code']??'')===($src['code']??''))){$idx=$i;break;}
    }
    $changed=false;
    if($idx<0){
        // Restore the real configured default center without touching unrelated centers.
        $new=$src;
        $new['queues']=[];$new['calls']=[];$new['announcements']=[];$new['runtimeState']=[];
        $new['announcementBus']=['current'=>null,'queue'=>[]];$new['triggerAnnouncement']=null;$new['triggerSecretaryCall']=null;$new['appointmentPlans']=[];
        $new['isDefault']=true;$new['protectedDefault']=true;$new['backupProfileVersion']=$version;
        $store['centers'][]=$new;$idx=count($store['centers'])-1;$changed=true;
    }
    $c=&$store['centers'][$idx];
    if(($c['backupProfileVersion']??'')===$version){unset($c);return $changed;}
    // The center's identity must survive deploys; do not erase live queues/media/settings.
    foreach(['id','code','name','username'] as $k){if(empty($c[$k]) && !empty($src[$k])){$c[$k]=$src[$k];$changed=true;}}
    if(!array_key_exists('isActive',$c)){$c['isActive']=true;$changed=true;}
    if(empty($c['licenseUntil'])&&!empty($src['licenseUntil'])){$c['licenseUntil']=$src['licenseUntil'];$changed=true;}
    if(empty($c['displayPasswordHash'])&&!empty($src['displayPasswordHash'])){$c['displayPasswordHash']=$src['displayPasswordHash'];$changed=true;}
    $c['isDefault']=true;$c['protectedDefault']=true;
    if(mergeBaselineUsers($c,is_array($src['doctors']??null)?$src['doctors']:[],'doctor'))$changed=true;
    if(mergeBaselineUsers($c,is_array($src['secretaries']??null)?$src['secretaries']:[],'secretary'))$changed=true;
    if(!isset($c['settings'])||!is_array($c['settings'])){$c['settings']=[];$changed=true;}
    $oldSettings=$c['settings'];$c['settings']=mergeMissingAssoc($c['settings'],is_array($src['settings']??null)?$src['settings']:[]);
    if(json_encode($oldSettings,JSON_UNESCAPED_UNICODE)!==json_encode($c['settings'],JSON_UNESCAPED_UNICODE))$changed=true;
    // Keep current media playlist and current chosen display mode if they exist.
    if(!isset($c['tickers'])||!is_array($c['tickers']))$c['tickers']=[];
    $tickerIds=[];foreach($c['tickers'] as $t)if(is_array($t)&&!empty($t['id']))$tickerIds[(string)$t['id']]=true;
    foreach(is_array($src['tickers']??null)?$src['tickers']:[] as $t)if(is_array($t)&&empty($tickerIds[(string)($t['id']??'')])){$c['tickers'][]=$t;$changed=true;}
    $c['backupProfileVersion']=$version;$c['doctorRosterVersion']=$version;
    unset($c);
    return true;
}

function applyRequestedDoctorRoster(array &$store):bool {
    // Kept as compatibility hook. The authoritative roster is merged from the persistent profile above.
    return false;
}

$__profileChanged=applyBackupPersistentProfile($store); $__rosterChanged=applyRequestedDoctorRoster($store); $__uChanged=syncUnifiedUsers($store); if($__profileChanged || $__rosterChanged || $__uChanged) $store=saveStore($jsonDbFile,$store,null);


function saveCenterLogoValue(string $centerId,string $value):string {
    $value=trim($value); $prefix='center-logo-'.sha1($centerId); $base='/api/media/logo?centerId='.rawurlencode($centerId);
    // اگر همان لوگوی ذخیره‌شده دوباره از فرم ارسال شد، فایل قبلی را حذف نکن.
    if($value!=='' && preg_match('~^/api/media/logo\?centerId=([^&]+)~',$value,$mm) && rawurldecode($mm[1])===$centerId){
        $matches=glob($GLOBALS['dataDir'].'/'.$prefix.'.*') ?: [];
        return $matches ? $base.'&v='.@filemtime($matches[0]) : '';
    }
    if($value===''){ foreach(glob($GLOBALS['dataDir'].'/'.$prefix.'.*') ?: [] as $old) @unlink($old); return ''; }
    if(preg_match('~^data:image/(png|jpe?g|gif|webp);base64,(.+)$~is',$value,$m)){
        $raw=base64_decode(preg_replace('/\s+/','',$m[2]),true); if($raw===false||strlen($raw)>4*1024*1024) return '';
        $ext=strtolower($m[1]); if($ext==='jpeg')$ext='jpg'; $file=$GLOBALS['dataDir'].'/'.$prefix.'.'.$ext;
        // ابتدا فایل جدید را امن بنویس؛ فقط بعد از موفقیت نسخه‌های قدیمی با پسوند دیگر پاک شوند.
        if(!atomicWrite($file,$raw)) return '';
        foreach(glob($GLOBALS['dataDir'].'/'.$prefix.'.*') ?: [] as $old) if($old!==$file) @unlink($old);
        return $base.'&v='.@filemtime($file);
    }
    if(preg_match('~^https?://~i',$value) && filter_var($value,FILTER_VALIDATE_URL)) return $value;
    // ورودی نامعتبر نباید لوگوی سالم قبلی را از بین ببرد.
    $matches=glob($GLOBALS['dataDir'].'/'.$prefix.'.*') ?: [];
    return $matches ? $base.'&v='.@filemtime($matches[0]) : '';
}
function qrFilePrefix(string $centerId,string $qrId):string { return 'center-qr-'.sha1($centerId.'|'.$qrId); }
function saveCenterQrValue(string $centerId,string $qrId,string $value):string {
    $value=trim($value); $prefix=qrFilePrefix($centerId,$qrId);
    foreach(glob($GLOBALS['dataDir'].'/'.$prefix.'.*') ?: [] as $old) @unlink($old);
    if($value==='') return '';
    if(preg_match('~^data:image/(png|jpe?g|gif|webp);base64,(.+)$~is',$value,$m)){
        $raw=base64_decode(preg_replace('/\s+/','',$m[2]),true); if($raw===false||strlen($raw)>2*1024*1024) return '';
        $ext=strtolower($m[1]); if($ext==='jpeg')$ext='jpg'; $file=$GLOBALS['dataDir'].'/'.$prefix.'.'.$ext;
        if(atomicWrite($file,$raw)) return '/api/media/qr?centerId='.rawurlencode($centerId).'&qrId='.rawurlencode($qrId).'&v='.time(); return '';
    }
    return '';
}
function deleteCenterQrValue(string $centerId,string $qrId):void { $prefix=qrFilePrefix($centerId,$qrId); foreach(glob($GLOBALS['dataDir'].'/'.$prefix.'.*') ?: [] as $old) @unlink($old); }

// تبدیل خودکار لوگوهای قدیمی data-URI به فایل مستقل برای سازگاری بهتر مرورگرها و کش.
$__logoMigrated=false;
foreach($store['centers'] as &$__logoCenter){
    $lv=(string)($__logoCenter['settings']['logoUrl']??'');
    if(str_starts_with($lv,'data:image/')){
        $nv=saveCenterLogoValue((string)$__logoCenter['id'],$lv);
        if($nv!==''){$__logoCenter['settings']['logoUrl']=$nv;$__logoMigrated=true;}
    }
}
unset($__logoCenter);
if($__logoMigrated)$store=saveStore($jsonDbFile,$store,null);

function jsonReadSafe(string $file,array $fallback=[]):array { if(!is_file($file))return $fallback; $x=json_decode((string)@file_get_contents($file),true); return is_array($x)?$x:$fallback; }
function updateStatePath():string { return $GLOBALS['dataDir'].'/update_state.json'; }
function backupDir():string { $p=$GLOBALS['dataDir'].'/backups'; if(!is_dir($p))@mkdir($p,0755,true); return $p; }
function backupIndexPath():string { return backupDir().'/index.json'; }
function readBackupIndex():array { return jsonReadSafe(backupIndexPath(),[]); }
function writeBackupIndex(array $x):void { atomicWrite(backupIndexPath(),json_encode(array_values($x),JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)); }
function isSafeRelativePath(string $p):bool { $p=str_replace('\\','/',$p); return $p!==''&&!str_starts_with($p,'/')&&!preg_match('~(^|/)\.\.?(/|$)~',$p)&&strpos($p,"\0")===false; }
function isAllowedUpdateFile(string $p):bool {
    $p=str_replace('\\','/',trim($p));
    if($p==='') return false;
    if(preg_match('~\.sql$~i',$p)) return (bool)preg_match('~^database/migrations/[^/]+\.sql$~i',$p);
    if(preg_match('~(^|/)(config\.local\.php|\.env(?:\..*)?)$~i',$p)) return false;
    return true;
}
function zipDosTime():array { $t=getdate(); $time=(($t['hours']&31)<<11)|(($t['minutes']&63)<<5)|intdiv($t['seconds'],2); $date=((max(1980,(int)$t['year'])-1980)<<9)|(($t['mon']&15)<<5)|($t['mday']&31); return [$time,$date]; }
function createZipFromFiles(string $out,array $files):array {
    $fh=@fopen($out,'wb'); if(!$fh) throw new RuntimeException('امکان ساخت فایل ZIP وجود ندارد.'); $central=[];$offset=0;$count=0;$bytes=0; [$dtime,$ddate]=zipDosTime();
    try{ foreach($files as $name=>$path){ $name=str_replace('\\','/',$name); if(!isSafeRelativePath($name))throw new RuntimeException('مسیر فایل نامعتبر: '.$name); if(!is_file($path))continue; $raw=@file_get_contents($path); if($raw===false)throw new RuntimeException('خواندن فایل ناموفق بود: '.$name); $crc=crc32($raw); if($crc<0)$crc+=4294967296; $cmp=gzdeflate($raw,6); $method=8; if($cmp===false||strlen($cmp)>=strlen($raw)){ $cmp=$raw; $method=0; }
        $nl=strlen($name);$cs=strlen($cmp);$us=strlen($raw);
        $local=pack('VvvvvvVVVvv',0x04034b50,20,0x0800,$method,$dtime,$ddate,$crc,$cs,$us,$nl,0).$name.$cmp; fwrite($fh,$local);
        $central[]=pack('VvvvvvvVVVvvvvvVV',0x02014b50,20,20,0x0800,$method,$dtime,$ddate,$crc,$cs,$us,$nl,0,0,0,0,0,$offset).$name;
        $offset+=strlen($local);$bytes+=$us;$count++; }
        $centralOffset=$offset;$centralData=implode('',$central);fwrite($fh,$centralData);$offset+=$centralData!==''?strlen($centralData):0;$centralSize=strlen($centralData);fwrite($fh,pack('VvvvvVVv',0x06054b50,0,0,$count,$count,$centralSize,$centralOffset,0));fclose($fh);return ['files'=>$count,'bytes'=>$bytes,'path'=>$out];
    }catch(Throwable $e){@fclose($fh);@unlink($out);throw $e;}
}
function collectBackupFiles():array {
    $root=__DIR__; $out=[]; $skipDirs=['.git','node_modules']; $skipNames=['update_state.json'];
    $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST);
    foreach($it as $f){ $full=$f->getPathname(); $rel=str_replace('\\','/',substr($full,strlen($root)+1)); if(!$rel)continue; if(str_starts_with($rel,'data/backups/'))continue; if(str_starts_with($rel,'data/update-'))continue; if(in_array($rel,$skipNames,true))continue; foreach($skipDirs as $sd)if($rel===$sd||str_starts_with($rel,$sd.'/'))continue 2; if($f->isFile())$out[$rel]=$full; }
    return $out;
}
function purgeOldBackups(int $keep=10):void { $idx=readBackupIndex(); usort($idx,fn($a,$b)=>strcmp((string)($b['createdAt']??''),(string)($a['createdAt']??'')));$keepRows=array_slice($idx,0,$keep);$keepIds=array_fill_keys(array_map(fn($x)=>(string)($x['id']??''),$keepRows),true);foreach($idx as $x){$id=(string)($x['id']??'');if($id&&!isset($keepIds[$id]))@unlink(backupDir().'/'.$id.'.zip');}writeBackupIndex($keepRows); }
function createSystemBackup(string $description='پشتیبان خودکار سیستم'):array {
    $id='backup-'.date('Ymd-His').'-'.bin2hex(random_bytes(3)); $path=backupDir().'/'.$id.'.zip'; $files=collectBackupFiles(); $z=createZipFromFiles($path,$files); $meta=['id'=>$id,'description'=>$description,'createdAt'=>date('c'),'version'=>APP_VERSION,'filesCount'=>$z['files'],'sizeBytes'=>(int)@filesize($path),'downloadReady'=>true];$idx=readBackupIndex();$idx[]=$meta;writeBackupIndex($idx);purgeOldBackups(10);return $meta;
}
function deleteBackupById(string $id):bool { if(!preg_match('/^backup-[A-Za-z0-9._-]+$/',$id))return false; $idx=readBackupIndex();$found=false;$out=[];foreach($idx as $m){if(($m['id']??'')===$id){$found=true;@unlink(backupDir().'/'.$id.'.zip');continue;}$out[]=$m;}writeBackupIndex($out);return $found; }
function pharEntryName($file,string $zipPath):string { $archive=str_replace('\\','/',realpath($zipPath)?:$zipPath); $path=str_replace('\\','/',$file->getPathname()); $prefix='phar://'.$archive.'/'; return str_starts_with($path,$prefix)?substr($path,strlen($prefix)):ltrim($path,'/'); }
function listZipEntries(string $zipPath):array {
    if(!class_exists('PharData'))throw new RuntimeException('موتور خواندن ZIP در PHP فعال نیست.'); $phar=new PharData($zipPath);$out=[];
    foreach(new RecursiveIteratorIterator($phar) as $file){$name=pharEntryName($file,$zipPath);$out[]=['name'=>$name,'isDir'=>$file->isDir(),'isLink'=>method_exists($file,'isLink')?$file->isLink():false,'size'=>@filesize($file->getPathname())];}
    return $out;
}
function zipContentByName(string $zipPath,string $target):?string { $phar=new PharData($zipPath); foreach(new RecursiveIteratorIterator($phar) as $file){$name=pharEntryName($file,$zipPath); if($name===$target)return $file->getContent();} return null; }
function updateUploadId(string $id):bool { return (bool)preg_match('/^up-[A-Za-z0-9_-]{12,80}$/',$id); }
function updateUploadMetaPath(string $id):string { return $GLOBALS['dataDir'].'/update-'.$id.'.json'; }
function updateUploadPartPath(string $id,int $index):string { return $GLOBALS['dataDir'].'/update-'.$id.'-part-'.$index.'.bin'; }
function updateUploadFinalPath(string $id):string { return $GLOBALS['dataDir'].'/update-'.$id.'.zip'; }
function cleanupStaleUpdateUploads(int $maxAge=86400):void { foreach(glob($GLOBALS['dataDir'].'/update-up-*.json') ?: [] as $m){ if(@filemtime($m)!==false && @filemtime($m)<time()-$maxAge){$id=preg_replace('/^update-(up-[A-Za-z0-9_-]+)\.json$/','\1',basename($m)); if(updateUploadId((string)$id)){$meta=jsonReadSafe($m,[]);$total=(int)($meta['totalChunks']??0);for($i=0;$i<$total;$i++)@unlink(updateUploadPartPath($id,$i));@unlink(updateUploadFinalPath($id));}@unlink($m);}} }
function finalizeChunkedUpload(string $id):array {
    $metaFile=updateUploadMetaPath($id);$meta=jsonReadSafe($metaFile,[]);if(!$meta)throw new RuntimeException('شناسه آپلود پیدا نشد.');if(!empty($meta['finalized'])&&is_file(updateUploadFinalPath($id)))return ['id'=>$id,'path'=>updateUploadFinalPath($id),'name'=>$meta['name']??'update.zip','size'=>(int)@filesize(updateUploadFinalPath($id)),'sha256'=>hash_file('sha256',updateUploadFinalPath($id))];
    $total=(int)($meta['totalChunks']??0);$expected=(int)($meta['size']??0);if($total<1||$total>200)throw new RuntimeException('تعداد قطعات فایل آپدیت نامعتبر است.');$out=updateUploadFinalPath($id);$fh=@fopen($out,'wb');if(!$fh)throw new RuntimeException('امکان ساخت فایل آپدیت روی سرور وجود ندارد.');$written=0;try{for($i=0;$i<$total;$i++){ $part=updateUploadPartPath($id,$i);if(!is_file($part))throw new RuntimeException('قطعه شماره '.($i+1).' فایل آپلود نشده است.');$pf=@fopen($part,'rb');if(!$pf)throw new RuntimeException('خواندن قطعه شماره '.($i+1).' ناموفق است.');while(!feof($pf)){ $buf=fread($pf,1024*1024);if($buf===false)throw new RuntimeException('خطا در تجمیع فایل آپدیت.');$n=fwrite($fh,$buf);if($n===false)throw new RuntimeException('خطا در نوشتن فایل آپدیت.');$written+=$n;}fclose($pf);}fclose($fh);}catch(Throwable $e){@fclose($fh);@unlink($out);throw $e;}if($expected>0&&$written!==$expected){@unlink($out);throw new RuntimeException('حجم نهایی فایل آپدیت با مقدار اعلام‌شده مطابقت ندارد.');}$meta['finalized']=true;$meta['finalizedAt']=time();$meta['finalSize']=$written;$meta['sha256']=hash_file('sha256',$out);atomicWrite($metaFile,json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));for($i=0;$i<$total;$i++)@unlink(updateUploadPartPath($id,$i));return ['id'=>$id,'path'=>$out,'name'=>$meta['name']??'update.zip','size'=>$written,'sha256'=>$meta['sha256']];
}
function packageInfo(string $zipPath):array {
    if(!is_file($zipPath)||filesize($zipPath)<4)throw new RuntimeException('فایل ZIP خالی یا ناقص است.');$head=@file_get_contents($zipPath,false,null,0,4);if($head!=="PK\x03\x04"&&$head!=="PK\x05\x06"&&$head!=="PK\x07\x08")throw new RuntimeException('امضای فایل ZIP معتبر نیست.');
    $entries=listZipEntries($zipPath);$names=array_map(fn($e)=>$e['name'],$entries);$errors=[];$warnings=[];foreach($entries as $e){if(!isSafeRelativePath($e['name']))$errors[]='مسیر ناامن در ZIP: '.$e['name'];if($e['isLink'])$errors[]='لینک نمادین در ZIP مجاز نیست: '.$e['name'];if(str_starts_with($e['name'],'data/')||$e['name']==='data')$errors[]='بسته آپدیت نباید اطلاعات زنده پوشه data را شامل شود: '.$e['name'];}
    $manifestName=in_array('manifest.json',$names,true)?'manifest.json':null;if(!$manifestName){$cands=array_values(array_filter($names,fn($n)=>str_ends_with($n,'/manifest.json')));if(count($cands)===1)$manifestName=$cands[0];}
    $base='';if($manifestName&&str_contains($manifestName,'/'))$base=substr($manifestName,0,strrpos($manifestName,'/')+1);
    $has=function($n)use($names,$base){return in_array($base.$n,$names,true);};
    $manifest=[];if($manifestName){$raw=zipContentByName($zipPath,$manifestName);$manifest=json_decode((string)$raw,true);if(!is_array($manifest))$errors[]='manifest.json قابل خواندن نیست.';}
    $assetJs=false;$assetCss=false;$hasRouter=false; foreach($names as $n){$rel=$base===''?$n:(str_starts_with($n,$base)?substr($n,strlen($base)):$n);if(preg_match('~^assets/.*\.js$~i',$rel))$assetJs=true;if(preg_match('~^assets/.*\.css$~i',$rel))$assetCss=true;if($rel==='api/router.php'||$rel==='router.php')$hasRouter=true;}
    $required=['manifest.json'=>!!$manifestName,'api.php'=>$has('api.php'),'.htaccess'=>$has('.htaccess'),'index.html'=>$has('index.html'),'tv.html'=>$has('tv.html')];foreach($required as $f=>$ok)if(!$ok)$errors[]='فایل ضروری وجود ندارد: '.$f;if(!$assetJs)$errors[]='فایل JavaScript اصلی در assets پیدا نشد.';if(!$assetCss)$warnings[]='فایل CSS اصلی در assets پیدا نشد.';
    $version=(string)($manifest['version']??'');if($version==='')$warnings[]='نسخه در manifest.json درج نشده است.';
    if(count($errors)>0){} elseif(!$manifestName)$warnings[]='manifest.json پیدا نشد.';
    // قواعد ایمنی فایل‌های آپدیت را با مسیر نسبت به ریشه بسته اعمال کن.
    foreach($entries as $e){
        if(!empty($e['isDir'])) continue;
        $rel=$base!==''&&str_starts_with($e['name'],$base)?substr($e['name'],strlen($base)):$e['name'];
        if(!isAllowedUpdateFile($rel)) $errors[]='فایل غیرمجاز در بسته آپدیت: '.$rel;
    }
    $totalBytes=0;foreach($entries as $e)$totalBytes+=(int)($e['size']??0);
    return ['valid'=>!$errors,'errors'=>$errors,'warnings'=>$warnings,'totalFiles'=>count($entries),'totalBytes'=>$totalBytes,'version'=>$version,'manifest'=>$manifest,'base'=>$base,'requiredFiles'=>$required,'hasApiFile'=>$required['api.php'],'hasManifest'=>!!$manifestName,'hasRouter'=>$hasRouter,'hasAssetsJs'=>$assetJs,'hasAssetsCss'=>$assetCss,'sha256'=>hash_file('sha256',$zipPath),'stats'=>['hasSourceCode'=>$required['api.php'],'hasPackageJson'=>!!$manifestName,'hasServerFile'=>$hasRouter,'totalFiles'=>count($entries),'totalBytes'=>$totalBytes,'hasApiFile'=>$required['api.php'],'hasManifest'=>!!$manifestName,'hasRouter'=>$hasRouter,'hasAssetsJs'=>$assetJs,'hasAssetsCss'=>$assetCss]];
}
function extractPackageSafe(string $zipPath,string $stage,string $base):int {
    if(!class_exists('PharData'))throw new RuntimeException('موتور استخراج ZIP در PHP فعال نیست.');$phar=new PharData($zipPath);$count=0;foreach(new RecursiveIteratorIterator($phar) as $file){if($file->isDir())continue;$rawName=pharEntryName($file,$zipPath);$name=$base!==''&&str_starts_with($rawName,$base)?substr($rawName,strlen($base)):$rawName;if($name===''||str_starts_with($name,'data/')||$name==='data'||$name==='config.php'||str_starts_with($name,'.git/'))continue;if(!isSafeRelativePath($name))throw new RuntimeException('مسیر ناامن در فایل آپدیت: '.$name);if(!isAllowedUpdateFile($name))throw new RuntimeException('فایل غیرمجاز در فایل آپدیت: '.$name);$target=$stage.'/'.$name;$dir=dirname($target);if(!is_dir($dir))@mkdir($dir,0755,true);$contents=$file->getContent();if(atomicWrite($target,$contents))$count++;}
    return $count;
}
function installStage(string $stage):int { $count=0; $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($stage,FilesystemIterator::SKIP_DOTS)); foreach($it as $f){if(!$f->isFile())continue;$rel=str_replace('\\','/',substr($f->getPathname(),strlen($stage)+1));if(!isSafeRelativePath($rel))throw new RuntimeException('مسیر مرحله‌ای ناامن است.');if(str_starts_with($rel,'data/')||$rel==='data'||$rel==='config.php')continue;$dest=__DIR__.'/'.$rel;$dir=dirname($dest);if(!is_dir($dir))@mkdir($dir,0755,true);if(!@copy($f->getPathname(),$dest))throw new RuntimeException('خطا در جایگزینی فایل: '.$rel);$count++;}return $count; }
function restoreBackup(string $backupId):int { $path=backupDir().'/'.$backupId.'.zip';if(!is_file($path))throw new RuntimeException('نسخه پشتیبان پیدا نشد.');$phar=new PharData($path);$count=0;foreach(new RecursiveIteratorIterator($phar) as $file){if($file->isDir())continue;$name=pharEntryName($file,$path);if(str_starts_with($name,'data/backups/')||$name==='data/backups')continue;if(!isSafeRelativePath($name))throw new RuntimeException('مسیر ناامن در پشتیبان: '.$name);$dest=__DIR__.'/'.$name;if($name==='data/update_state.json')continue;$dir=dirname($dest);if(!is_dir($dir))@mkdir($dir,0755,true);if(!atomicWrite($dest,$file->getContent()))throw new RuntimeException('بازنشانی فایل ناموفق بود: '.$name);$count++;}return $count;}
function maybeAutoRollback():void { $state=jsonReadSafe(updateStatePath(),[]);if(!empty($state['active'])&&($state['expiresAt']??0)<time()&&!empty($state['backupId'])){try{restoreBackup((string)$state['backupId']);$state['active']=false;$state['autoRolledBackAt']=date('c');atomicWrite(updateStatePath(),json_encode($state,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));}catch(Throwable $e){error_log('Bastian auto rollback failed: '.$e->getMessage());}}}

maybeAutoRollback();
$token=bearer(); $session=$token?resolveSession($sessionsFile,$token):null; $role=$session['role']??null;

if($route==='media/logo'){
    $cid=trim((string)($_GET['centerId']??$input['centerId']??'')); if($cid==='') { http_response_code(404); exit; }
    $prefix='center-logo-'.sha1($cid);$matches=glob($dataDir.'/'.$prefix.'.*') ?: []; $file=$matches[0]??''; if(!$file||!is_file($file)){http_response_code(404);exit;}
    $ext=strtolower(pathinfo($file,PATHINFO_EXTENSION));$mime=['png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp'][$ext]??'application/octet-stream';header('Content-Type: '.$mime);header('Cache-Control: public, max-age=86400, immutable');header('ETag: "'.sha1($file.'|'.@filemtime($file)).'"');readfile($file);exit;
}

if($route==='media/file'){
    $cid=trim((string)($_GET['centerId']??''));$mid=preg_replace('/[^A-Za-z0-9_-]/','',(string)($_GET['mediaId']??''));if($cid===''||$mid===''){http_response_code(404);exit;}
    $prefix='center-media-'.sha1($cid).'-'.$mid;$matches=glob($dataDir.'/'.$prefix.'.*') ?: [];$file=$matches[0]??'';if(!$file||!is_file($file)){http_response_code(404);exit;}
    $ext=strtolower(pathinfo($file,PATHINFO_EXTENSION));
    $mime=[
        'png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp','avif'=>'image/avif','bmp'=>'image/bmp',
        'mp4'=>'video/mp4','m4v'=>'video/x-m4v','webm'=>'video/webm','ogv'=>'video/ogg','mov'=>'video/quicktime',
        'mp3'=>'audio/mpeg','wav'=>'audio/wav','ogg'=>'audio/ogg','oga'=>'audio/ogg','m4a'=>'audio/mp4','aac'=>'audio/aac','flac'=>'audio/flac',
        'pdf'=>'application/pdf','ppt'=>'application/vnd.ms-powerpoint','pptx'=>'application/vnd.openxmlformats-officedocument.presentationml.presentation','odp'=>'application/vnd.oasis.opendocument.presentation'
    ][$ext]??'application/octet-stream';
    $size=(int)@filesize($file);$start=0;$end=max(0,$size-1);$status=200;
    $range=(string)($_SERVER['HTTP_RANGE']??'');
    if($size>0 && preg_match('/bytes=(\d*)-(\d*)/i',$range,$m)){
        if($m[1]===''&&$m[2]!==''){$suffix=(int)$m[2];$start=max(0,$size-$suffix);}else{$start=$m[1]===''?0:(int)$m[1];$end=$m[2]===''?$end:min($end,(int)$m[2]);}
        if($start>$end||$start>=$size){header('Content-Range: bytes */'.$size);http_response_code(416);exit;}$status=206;
    }
    http_response_code($status);header('Content-Type: '.$mime);header('Content-Disposition: inline; filename="'.rawurlencode(basename($file)).'"');header('X-Content-Type-Options: nosniff');header('Accept-Ranges: bytes');header('Cache-Control: public, max-age=31536000, immutable');header('ETag: "'.sha1($file.'|'.@filemtime($file).'|'.$size).'"');header('Last-Modified: '.gmdate('D, d M Y H:i:s',(int)@filemtime($file)).' GMT');
    $length=max(0,$end-$start+1);header('Content-Length: '.$length);if($status===206)header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
    $fh=@fopen($file,'rb');if(!$fh){http_response_code(500);exit;}if($start>0)fseek($fh,$start);$left=$length;
    while($left>0&&!feof($fh)){ $buf=fread($fh,min(1024*1024,$left));if($buf===false)break;$n=strlen($buf);if($n===0)break;echo $buf;$left-=$n;if(connection_aborted())break; }fclose($fh);exit;
}

if($route==='media/qr'){
    $cid=trim((string)($_GET['centerId']??$input['centerId']??'')); $qid=trim((string)($_GET['qrId']??$input['qrId']??'')); if($cid===''||$qid===''){http_response_code(404);exit;}
    $prefix=qrFilePrefix($cid,$qid);$matches=glob($dataDir.'/'.$prefix.'.*') ?: []; $file=$matches[0]??''; if(!$file||!is_file($file)){http_response_code(404);exit;}
    $ext=strtolower(pathinfo($file,PATHINFO_EXTENSION));$mime=['png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp'][$ext]??'application/octet-stream';header('Content-Type: '.$mime);header('Cache-Control: public, max-age=86400, immutable');header('ETag: "'.sha1($file.'|'.@filemtime($file)).'"');readfile($file);exit;
}

$open=['health','server-info','auth/login','auth/display-login','client/login'];
if(!in_array($route,$open,true) && !$session) deny('توکن ارائه نشده یا منقضی شده است.',401);

$perms=[
  'super_admin'=>'*','doctor'=>defaultRolePermissions('doctor'),'secretary'=>defaultRolePermissions('secretary'),'display'=>['health'=>true,'server-info'=>true,'state'=>true,'sync/poll'=>true,'auth/logout'=>true]
];
if(!in_array($route,$open,true) && (($role??'')!=='super_admin')) {
    $pc=$session['centerId']?findCenter($store,$session['centerId']):null;
    if(!$pc || !effectivePermission($session,$pc,$route)) deny("دسترسی شما به مسیر «{$route}» فعال نیست.",403);
}

if($route==='backup/download'){
    if(($session['role']??'')!=='super_admin') deny('فقط مدیر سیستم مجاز است.',403);
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="bastian-backup-'.date('Ymd-His').'.json"');
    echo json_encode(['createdAt'=>date('c'),'store'=>$store,'users'=>$users],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
    exit;
}
if($route==='backup/check'){
    jsonOut(['success'=>true,'valid'=>is_array($store)&&isset($store['centers'])&&is_array($store['centers']),'centers'=>count($store['centers']??[]),'timestamp'=>time(),'version'=>APP_VERSION]);
}

if($route==='health') jsonOut(['status'=>'ok','service'=>'bastian_clinic_queue_system','engine'=>'PHP/Linux Chabokan','phpVersion'=>PHP_VERSION,'hasDatabase'=>$pdo!==null,'serverTime'=>date('c')]);
if($route==='server-info') { $doc=0;$q=0;foreach($store['centers']??[] as $c){$doc+=count($c['doctors']??[]);foreach($c['queues']??[] as $x)if(($x['status']??'')==='waiting')$q++;} jsonOut(['service'=>'bastian_clinic_queue_system','clinicName'=>'سامانه درمانگاه باستیان','version'=>defined('APP_VERSION')?APP_VERSION:'2.9.7','serverTime'=>date('c'),'centersCount'=>count($store['centers']??[]),'doctorsCount'=>$doc,'waitingCount'=>$q]); }

if($route==='client/login'){
    $cid=trim((string)($input['centerId']??''));$clientRole=trim((string)($input['role']??''));$sig=trim((string)($input['sig']??''));$password=(string)($input['password']??'');
    if(!validClientPackageSignature($dataDir,$cid,$clientRole,$sig))deny('این نسخه نصب‌شده معتبر نیست یا به مرکز دیگری تعلق دارد.',403);
    $c=findCenter($store,$cid);if(!$c)deny('مرکز این نسخه پیدا نشد.',404);
    if($clientRole!=='super_admin'&&!validLicense($c))deny('مرکز غیرفعال است یا اعتبار آن به پایان رسیده است.',403);
    if($password==='')deny('رمز عبور الزامی است.',400);
    $matched=null;
    if(in_array($clientRole,['doctor','secretary'],true)){
        $uid=trim((string)($input['userId']??''));$loginUsername=normalizeLoginUsername($input['username']??'');
        if($uid===''&&$loginUsername==='')deny('نام کاربری را وارد کنید یا کاربر را از فهرست انتخاب کنید.',400);
        foreach($c['users']??[] as $u){$idMatch=$uid!==''&&(string)($u['id']??'')===$uid;$userMatch=$loginUsername!==''&&normalizeLoginUsername($u['username']??'')===$loginUsername;if(($idMatch||$userMatch)&&($u['role']??'')===$clientRole&&($u['isActive']??true)&&verifyStoredPass($password,(string)($u['passwordHash']??''))){$matched=$u;break;}}
        if(!$matched){$list=$clientRole==='doctor'?($c['doctors']??[]):($c['secretaries']??[]);foreach($list as $u){$idMatch=$uid!==''&&(string)($u['id']??'')===$uid;$userMatch=$loginUsername!==''&&normalizeLoginUsername($u['username']??'')===$loginUsername;if(($idMatch||$userMatch)&&($u['isActive']??$u['active']??true)&&verifyStoredPass($password,(string)($u['passwordHash']??''))){$matched=$u;break;}}}
        if(!$matched)deny('نام کاربری/کاربر انتخاب‌شده یا رمز عبور صحیح نیست، یا حساب غیرفعال است.',401);
        $doctorId=$clientRole==='doctor'?(string)$matched['id']:null;$t=createSession($sessionsFile,(string)$matched['id'],$clientRole,$doctorId,$cid);setSessionCookie($t,12*3600);
        jsonOut(['success'=>true,'token'=>$t,'role'=>$clientRole,'doctorId'=>$doctorId,'centerId'=>$cid,'displayName'=>$matched['name']??'','startPath'=>$clientRole==='doctor'?'/doctor':'/secretary','expiresAt'=>time()+12*3600]);
    }
    if($clientRole==='display'){
        if(!verifyStoredPass($password,(string)($c['displayPasswordHash']??$c['passwordHash']??'')))deny('رمز ورود نمایشگر اشتباه است.',401);
        $t=createSession($sessionsFile,'display-'.$cid.'-'.bin2hex(random_bytes(3)),'display',null,$cid);setSessionCookie($t,30*24*3600);
        jsonOut(['success'=>true,'token'=>$t,'role'=>'display','doctorId'=>null,'centerId'=>$cid,'displayName'=>'نمایشگر '.$c['name'],'startPath'=>'/tv','expiresAt'=>time()+30*24*3600]);
    }
    if($clientRole==='super_admin'){
        $username=normalizeLoginUsername($input['username']??'');if($username==='')deny('نام کاربری سوپرادمین الزامی است.',400);
        foreach($users['users']??[] as $u){if(($u['role']??'')==='super_admin'&&($u['isActive']??true)&&normalizeLoginUsername($u['username']??'')===$username&&verifyStoredPass($password,(string)($u['passwordHash']??$u['password']??''))){$matched=$u;break;}}
        if(!$matched)deny('نام کاربری یا رمز سوپرادمین اشتباه است.',401);
        $t=createSession($sessionsFile,(string)($matched['id']??'user-admin'),'super_admin',null,$cid);setSessionCookie($t,12*3600);
        jsonOut(['success'=>true,'token'=>$t,'role'=>'super_admin','doctorId'=>null,'centerId'=>$cid,'displayName'=>$matched['displayName']??$username,'startPath'=>'/admin','expiresAt'=>time()+12*3600]);
    }
    deny('نوع نسخه نصب‌شده نامعتبر است.',400);
}

if($route==='auth/login'){
    $username=normalizeLoginUsername($input['username']??'');$password=(string)($input['password']??''); if(!$username||$password==='')deny('نام کاربری و رمز عبور الزامی است.',400);
    $matched=null;
    foreach($users['users']??[] as $u) if(($u['username']??'')===$username && ($u['isActive']??true) && ($u['role']??'')==='super_admin' && verifyStoredPass($password,$u['passwordHash']??$u['password']??'')){ $matched=['role'=>'super_admin','id'=>$u['id'],'name'=>$u['displayName']??$u['username'],'doctorId'=>null,'centerId'=>null]; break; }
    if(!$matched){ foreach($store['centers']??[] as $c){ if(!validLicense($c))continue; foreach($c['users']??[] as $u) if(($u['username']??'')===$username && ($u['isActive']??true) && verifyStoredPass($password,$u['passwordHash']??'')){ $matched=['role'=>$u['role'],'id'=>$u['id'],'name'=>$u['name']??$username,'doctorId'=>($u['role']==='doctor'?$u['id']:null),'centerId'=>$c['id']]; break 2; } } }
    if(!$matched)deny('نام کاربری یا رمز عبور اشتباه است یا حساب/مرکز غیرفعال است.',401);
    if(($matched['role']!=='super_admin') && isset($input['centerId']) && $input['centerId']!==$matched['centerId'])deny('این حساب فقط متعلق به مرکز خودش است.',403);
    $t=createSession($sessionsFile,$matched['id'],$matched['role'],$matched['doctorId'],$matched['centerId']); setSessionCookie($t,12*3600); jsonOut(['success'=>true,'token'=>$t,'role'=>$matched['role'],'doctorId'=>$matched['doctorId'],'centerId'=>$matched['centerId'],'displayName'=>$matched['name'],'expiresAt'=>time()+12*3600]);
}
if($route==='auth/restore-panel'){
    if(!in_array($role,['doctor','secretary','super_admin'],true)) deny('نشست اصلی پنل معتبر نیست.',403);
    $ttl=max(60, ((int)($session['expiresAt']??time()+3600))-time()); setSessionCookie($token,$ttl);
    jsonOut(['success'=>true,'role'=>$role,'centerId'=>$session['centerId']??null,'doctorId'=>$session['doctorId']??null]);
}
if($route==='auth/switch-to-display'){
    if(!in_array($role,['doctor','secretary','super_admin'],true)) deny('امکان ورود به نمایشگر از این نشست وجود ندارد.',403);
    $c=currentCenterOrDeny($session,$store); $cid=$c['id'];
    $t=createSession($sessionsFile,'display-'.$cid.'-'.bin2hex(random_bytes(3)),'display',null,$cid); setSessionCookie($t,30*24*3600);
    jsonOut(['success'=>true,'token'=>$t,'role'=>'display','centerId'=>$cid,'centerName'=>$c['name']??'']);
}
if($route==='auth/enter-center'){
    if($role!=='super_admin') deny('فقط سوپر ادمین می‌تواند وارد مرکز دیگری شود.',403);
    $cid=trim((string)($input['centerId']??'')); $c=findCenter($store,$cid); if(!$c) deny('مرکز پیدا نشد.',404); if(!validLicense($c)) deny('مرکز غیرفعال است یا اعتبار آن تمام شده است.',403);
    $t=createSession($sessionsFile,$session['userId']??'user-admin','super_admin',null,$cid); setSessionCookie($t);
    jsonOut(['success'=>true,'token'=>$t,'role'=>'super_admin','centerId'=>$cid,'centerName'=>$c['name']??'']);
}
if($route==='auth/display-login'){
    $user=normalizeLoginUsername($input['username']??'');$pass=(string)($input['password']??''); if(!$user||$pass==='')deny('نام کاربری مرکز و رمز عبور الزامی است.',400);
    $c=null; foreach($store['centers']??[] as $cc){$cu=normalizeLoginUsername($cc['username']??$cc['displayUsername']??''); if($cu===$user){$c=$cc;break;}}
    if(!$c)deny('نام کاربری مرکز پیدا نشد.',404); if(!validLicense($c))deny('مرکز غیرفعال است یا اعتبار آن تمام شده است.',403);
    if(!verifyStoredPass($pass,$c['displayPasswordHash']??$c['passwordHash']??''))deny('رمز عبور مرکز اشتباه است.',401);
    $t=createSession($sessionsFile,'display-'.$c['id'].'-'.bin2hex(random_bytes(3)),'display',null,$c['id']); setSessionCookie($t,30*24*3600);
    jsonOut(['success'=>true,'token'=>$t,'role'=>'display','centerId'=>$c['id'],'centerName'=>$c['name']??'','username'=>$user]);
}
if($route==='auth/logout'){if($token)destroySession($sessionsFile,$token);clearSessionCookie();jsonOut(['success'=>true]);}
if($route==='auth/me'){
    $c=$session['centerId']?findCenter($store,$session['centerId']):null; $displayName=''; $u=$c?findUnifiedUser($c,(string)($session['userId']??'')):null;
    if($role==='super_admin'){foreach($users['users']??[] as $x)if(($x['id']??'')===($session['userId']??'')){$displayName=$x['displayName']??$x['username']??'';break;}}
    elseif($u)$displayName=$u['name']??''; elseif($role==='display')$displayName='نمایشگر';
    jsonOut(['success'=>true,'role'=>$role,'doctorId'=>$session['doctorId']??null,'centerId'=>$session['centerId']??null,'center'=>$c?safeCenter($c,false):null,'user'=>$u?publicUser($u):['id'=>$session['userId'],'displayName'=>$displayName,'role'=>$role]]);
}

if(str_starts_with($route,'centers/')){
    if($role!=='super_admin')deny('فقط سوپرادمین به مدیریت مراکز دسترسی دارد.');
    if($route==='centers/list')jsonOut(['success'=>true,'centers'=>array_map(fn($c)=>safeCenter($c,false),$store['centers']??[])]);
    if($route==='centers/get'){ $c=findCenter($store,trim((string)($input['id']??$_GET['id']??'')));if(!$c)deny('مرکز پیدا نشد.',404);jsonOut(['success'=>true,'center'=>safeCenter($c,true)]); }
    if($route==='centers/select'){ $id=trim((string)($input['id']??''));$c=findCenter($store,$id);if(!$c)deny('مرکز پیدا نشد.',404); if(!validLicense($c))deny('این مرکز غیرفعال یا منقضی است.',403);withFileLock($sessionsFile.'.lock',function() use($sessionsFile,$token,$id){$ss=getSessions($sessionsFile);foreach($ss as &$x)if(($x['token']??'')===$token)$x['centerId']=$id;unset($x);saveSessions($sessionsFile,$ss);});jsonOut(['success'=>true,'center'=>safeCenter($c,false)]); }
    if($route==='centers/add'){ $name=trim((string)($input['name']??''));$code=trim((string)($input['code']??''));$license=trim((string)($input['licenseUntil']??date('Y-m-d',strtotime('+1 year'))));$un=normalizeLoginUsername($input['username']??'');$pw=(string)($input['password']??'');if(!$name||!$un||strlen($pw)<6)deny('نام مرکز، نام کاربری و رمز حداقل ۶ کاراکتری الزامی است.',400);$id='center-'.date('YmdHis').'-'.bin2hex(random_bytes(2));if(!$code)$code=strtoupper('C-'.substr(bin2hex(random_bytes(3)),0,6));foreach($store['centers']??[] as $c)if(strtolower($c['code']??'')===strtolower($code))deny('کد مرکز تکراری است.',409);if(!uniqueUsername($store,$users,$un,null,null,null))deny('این نام کاربری قبلاً استفاده شده است.',409);$c=['id'=>$id,'code'=>$code,'name'=>$name,'username'=>$un,'licenseUntil'=>$license,'isActive'=>true,'createdAt'=>date('c'),'version'=>1,'lastUpdated'=>round(microtime(true)*1000),'doctors'=>[],'secretaries'=>[],'tickers'=>[],'queues'=>[],'settings'=>defaultSettings($name),'displayPasswordHash'=>secureHash($pw),'triggerAnnouncement'=>null,'announcementBus'=>['current'=>null,'queue'=>[]],'triggerSecretaryCall'=>null,'appointmentPlans'=>[]];$store['centers'][]=$c;$store=saveStore($jsonDbFile,$store,null);jsonOut(['success'=>true,'center'=>safeCenter($c,true)]);}
    if($route==='centers/update'){ $id=trim((string)($input['id']??''));$i=centerIndex($store,$id);if($i<0)deny('مرکز پیدا نشد.',404);foreach(['name','code','licenseUntil'] as $k)if(isset($input[$k]))$store['centers'][$i][$k]=trim((string)$input[$k]);if(isset($input['isActive']))$store['centers'][$i]['isActive']=(bool)$input['isActive'];if(isset($input['username'])){ $un=normalizeLoginUsername($input['username']);if($un==='')deny('نام کاربری مرکز نمی‌تواند خالی باشد.',400);$old=$store['centers'][$i]['username']??$store['centers'][$i]['displayUsername']??'';if($un!==$old&&!uniqueUsername($store,$users,$un,null,null,$id))deny('این نام کاربری قبلاً استفاده شده است.',409);$store['centers'][$i]['username']=$un;unset($store['centers'][$i]['displayUsername']); }if(isset($input['password'])){ $pw=(string)$input['password'];if($pw!==''){if(strlen($pw)<6)deny('رمز جدید باید حداقل ۶ کاراکتر باشد.',400);$store['centers'][$i]['displayPasswordHash']=secureHash($pw);}}$store=saveStore($jsonDbFile,$store,$id);jsonOut(['success'=>true,'center'=>safeCenter($store['centers'][$i],true)]);}
    if($route==='centers/delete'){ $id=trim((string)($input['id']??''));$i=centerIndex($store,$id);if($i<0)deny('مرکز پیدا نشد.',404);if(isDefaultCenter($store['centers'][$i]))deny('مرکز پیش‌فرض سامانه قابل حذف نیست؛ می‌توانید مشخصات آن را ویرایش کنید.',409);$store['centers']=array_values(array_filter($store['centers'],fn($c)=>($c['id']??'')!==$id));$store=saveStore($jsonDbFile,$store,null);jsonOut(['success'=>true]);}
}

if($route==='state'){
    $c=currentCenterOrDeny($session,$store);$docs=array_map('publicDoctor',$c['doctors']??[]);
    if($role==='doctor'){ $my=(string)$session['doctorId'];$docs=array_values(array_filter($docs,fn($d)=>(string)($d['id']??'')===$my));$queues=activeQueuesForState($c['queues']??[],$my); }
    elseif($role==='secretary'||$role==='super_admin'){ $queues=allCurrentQueues($c['queues']??[]); }
    else { $queues=activeQueuesForState($c['queues']??[],null);foreach($queues as &$qq)unset($qq['doctorNote'],$qq['nationalId']);unset($qq); }
    jsonOut(['success'=>true,'version'=>(int)($c['version']??1),'lastUpdated'=>(int)($c['lastUpdated']??0),'displayMode'=>(($c['settings']['displaySettings']['mode']??'queue')==='media'?'media':'queue'),'doctors'=>$docs,'queues'=>$queues,'tickers'=>$c['tickers']??[],'settings'=>$c['settings']??[],'appointmentPlans'=>array_values(array_filter($c['appointmentPlans']??[],fn($p)=>is_array($p)&&($p['dayKey']??'')===todayQueueDayKey())),'authRole'=>$role,'authDoctor'=>$session['doctorId']??null,'centerId'=>$c['id'],'centerName'=>$c['name']??($c['settings']['clinicName']??''),'triggerAnnouncement'=>(announcementBusSnapshot($c)['current']??null),'announcementBus'=>announcementBusSnapshot($c),'triggerSecretaryCall'=>secretaryCallSnapshot($c)]);
}
if($route==='sync/poll'||$route==='poll'){
    $c=currentCenterOrDeny($session,$store);$v=(int)($_GET['version']??0);$cv=(int)($c['version']??1);$displayMode=(($c['settings']['displaySettings']['mode']??'queue')==='media')?'media':'queue';
    // Version may move backwards after a restore/deploy. Any mismatch must resync the display.
    if($v!==$cv){$docs=array_map('publicDoctor',$c['doctors']??[]);if($role==='doctor'){ $my=(string)$session['doctorId'];$docs=array_values(array_filter($docs,fn($d)=>(string)($d['id']??'')===$my));$queues=activeQueuesForState($c['queues']??[],$my); } elseif($role==='secretary'||$role==='super_admin'){ $queues=allCurrentQueues($c['queues']??[]); } else { $queues=activeQueuesForState($c['queues']??[],null);foreach($queues as &$qq)unset($qq['doctorNote'],$qq['nationalId']);unset($qq); }jsonOut(['hasUpdate'=>true,'version'=>$cv,'lastUpdated'=>$c['lastUpdated'],'displayMode'=>$displayMode,'doctors'=>$docs,'queues'=>$queues,'tickers'=>$c['tickers']??[],'settings'=>$c['settings']??[],'appointmentPlans'=>array_values(array_filter($c['appointmentPlans']??[],fn($p)=>is_array($p)&&($p['dayKey']??'')===todayQueueDayKey())),'triggerAnnouncement'=>(announcementBusSnapshot($c)['current']??null),'announcementBus'=>announcementBusSnapshot($c),'triggerSecretaryCall'=>secretaryCallSnapshot($c)]);}
    // Even with no version change, expose the authoritative mode AND current announcement.
    // This lets a display recover an announcement after a transient poll/network miss without waiting for another mutation.
    $bus=announcementBusSnapshot($c);
    jsonOut(['hasUpdate'=>false,'version'=>$cv,'lastUpdated'=>$c['lastUpdated'],'displayMode'=>$displayMode,'triggerAnnouncement'=>$bus['current']??null,'announcementBus'=>$bus]);
}
if($route==='sync/events'||$route==='events'){
    // SSE قبلی هر اتصال را تا ۱۵ ثانیه باز نگه می‌داشت و روی هاست اشتراکی workerهای PHP را اشغال می‌کرد.
    // از این نسخه، همگام‌سازی زنده با sync/poll انجام می‌شود و این endpoint عمداً بدون long-polling خاتمه می‌یابد.
    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}

if($route==='state/sync'){
    if($role!=='super_admin' && $role!=='secretary' && $role!=='doctor') deny('این مسیر فقط برای همگام‌سازی داخلی مرکز مجاز است.');
    $c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);$changed=false;
    // مهم: state/sync دیگر مالک صف نیست. صف فقط با APIهای اتمیک queues/* و queue-slots/* تغییر می‌کند.
    // این کار جلوی بازنویسی سرور با state قدیمی یک پنل دیگر را می‌گیرد.
    if(array_key_exists('tickers',$input) && is_array($input['tickers']) && $role!=='doctor' && json_encode($input['tickers'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)!==json_encode($store['centers'][$i]['tickers']??[],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)){$store['centers'][$i]['tickers']=normalizeTickers($input['tickers']);$changed=true;}
    if(array_key_exists('doctors',$input) && is_array($input['doctors'])){
        if(!isset($store['centers'][$i]['users'])||!is_array($store['centers'][$i]['users']))$store['centers'][$i]['users']=[];
        $existing=$store['centers'][$i]['users']; $incoming=$input['doctors']; $allowedIds=$role==='doctor'?[(string)($session['doctorId']??'')]:null;
        foreach($incoming as $d){
            if(!is_array($d)) continue; $id=trim((string)($d['id']??'')); if(!$id)continue;
            if($allowedIds!==null && !in_array($id,$allowedIds,true))continue;
            $found=false;
            foreach($existing as &$u) if(($u['id']??'')===$id && ($u['role']??'')==='doctor'){
                foreach(['name','specialty'] as $f) if(array_key_exists($f,$d)){$v=trim((string)$d[$f]);if(($u[$f]??'')!==$v){$u[$f]=$v;$changed=true;}}
                if(array_key_exists('room',$d)){$v=normalizeRoom((string)$d['room']);if(($u['room']??'')!==$v){$u['room']=$v;$changed=true;}}
                $active=doctorActive($d);if(($u['active']??($u['isActive']??true))!==$active||($u['isActive']??$active)!==$active){$u['active']=$active;$u['isActive']=$active;$changed=true;}
                foreach(['photoUrl','color'] as $f)if(array_key_exists($f,$d)&&($u[$f]??null)!==$d[$f]){$u[$f]=$d[$f];$changed=true;}
                $found=true;break;
            } unset($u);
            if(!$found){$existing[]=['id'=>$id,'role'=>'doctor','name'=>trim((string)($d['name']??'')),'username'=>(string)($d['username']??''),'passwordHash'=>(string)($d['passwordHash']??''),'isActive'=>doctorActive($d),'active'=>doctorActive($d),'specialty'=>trim((string)($d['specialty']??'')),'room'=>normalizeRoom((string)($d['room']??'')),'photoUrl'=>$d['photoUrl']??null,'color'=>$d['color']??'indigo','bookingClosed'=>(bool)($d['bookingClosed']??false),'bookingClosedAt'=>$d['bookingClosedAt']??null,'permissions'=>[],'permissionMode'=>'inherit','panelPermissions'=>[]];$changed=true;}
        }
        $store['centers'][$i]['users']=$existing; $before=json_encode($store['centers'][$i]['doctors']??[],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); syncUserToLegacyArrays($store['centers'][$i]); if($before!==json_encode($store['centers'][$i]['doctors']??[],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))$changed=true;
    }
    if($role==='super_admin' && array_key_exists('settings',$input) && is_array($input['settings'])){
        $safe=['clinicName','subtitle','phone','address','repeatCount','volume','autoPrintOnCreate','showDoctorPhoto','showLogo','lanIp','port','appointmentUrl','appointmentSiteName','appointmentDescription','appointmentLinks','logoUrl'];
        foreach($safe as $f) if(array_key_exists($f,$input['settings'])){
            $v=$input['settings'][$f]; if($f==='logoUrl')$v=saveCenterLogoValue($store['centers'][$i]['id'],(string)$v); if($f==='appointmentLinks')$v=normalizeAppointmentLinks($v, $store['centers'][$i]['settings']??[]); if(($store['centers'][$i]['settings'][$f]??null)!==$v){$store['centers'][$i]['settings'][$f]=$v;$changed=true;}
        }
        $ns=normalizeCenterSettings($store['centers'][$i]['settings']??[],$store['centers'][$i]['name']??'مرکز باستیان');if(json_encode($ns,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)!==json_encode($store['centers'][$i]['settings']??[],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)){$store['centers'][$i]['settings']=$ns;$changed=true;}
    }
    if($changed){$store=saveStore($jsonDbFile,$store,$c['id']);}
    $ci=findCenter($store,$c['id']); jsonOut(['success'=>true,'version'=>(int)($ci['version']??$c['version']??1),'lastUpdated'=>(int)($ci['lastUpdated']??$c['lastUpdated']??0),'changed'=>$changed]);
}

if($route!=='doctors/booking-status' && (str_starts_with($route,'users/') || str_starts_with($route,'doctors/') || str_starts_with($route,'secretaries/'))){
    $legacyDoctor=str_starts_with($route,'doctors/'); $legacySecretary=str_starts_with($route,'secretaries/');
    if($legacyDoctor)$route='users/'.substr($route,8); elseif($legacySecretary)$route='users/'.substr($route,12);
    $cid=$input['centerId']??$session['centerId']??null; if(!$cid)deny('ابتدا یک مرکز را انتخاب کنید.',400); $i=centerIndex($store,$cid); if($i<0)deny('مرکز پیدا نشد.',404); $c=&$store['centers'][$i];
    if(($session['role']??'')!=='super_admin' && ($session['centerId']??null)!==$cid)deny('این حساب فقط متعلق به مرکز خودش است.',403);
    if($route==='users/list'){ $roleFilter=$input['role']??$_GET['role']??null; $out=array_values(array_filter($c['users']??[],fn($u)=>!$roleFilter||($u['role']??'')===$roleFilter)); jsonOut(['success'=>true,'users'=>array_map('publicUser',$out),'doctors'=>array_map('publicDoctor',$c['doctors']??[]),'secretaries'=>array_map('publicSecretary',$c['secretaries']??[])]); }
    if($route==='users/permissions'){ if($session['role']!=='super_admin')deny('فقط سوپر ادمین می‌تواند الگوی دسترسی‌ها را تغییر دهد.',403); jsonOut(['success'=>true,'roles'=>$c['permissionConfig']['roles']??['doctor'=>defaultRolePermissions('doctor'),'secretary'=>defaultRolePermissions('secretary')],'panels'=>$c['permissionConfig']['panels']??['doctor'=>defaultRolePanelPermissions('doctor'),'secretary'=>defaultRolePanelPermissions('secretary')]]); }
    if($route==='users/permissions-update'){ if($session['role']!=='super_admin')deny('فقط سوپر ادمین می‌تواند دسترسی‌های کلی را تغییر دهد.',403); $roles=$input['roles']??null;if(!is_array($roles))deny('ساختار دسترسی نامعتبر است.',400); foreach(['doctor','secretary'] as $rr) if(isset($roles[$rr])&&is_array($roles[$rr])) $c['permissionConfig']['roles'][$rr]=cleanPermissions($roles[$rr]); if(isset($input['panels'])&&is_array($input['panels'])) foreach(['doctor','secretary'] as $rr) if(isset($input['panels'][$rr])&&is_array($input['panels'][$rr])) $c['permissionConfig']['panels'][$rr]=array_intersect_key(array_map('boolval',$input['panels'][$rr]),array_flip(['doctor','secretary','tv','settings','users'])); $store=saveStore($jsonDbFile,$store,$cid); jsonOut(['success'=>true,'roles'=>$c['permissionConfig']['roles']]); }
    if($route==='users/add'||$route==='users/update'||$route==='users/delete'){
        if(!effectivePermission($session,$c,$route))deny('این کاربر اجازه مدیریت حساب‌های کاربری را ندارد.',403);
        if($session['role']==='secretary' && (($input['role']??'doctor')!=='doctor')) deny('منشی فقط می‌تواند کاربران نوع «پزشک» را مدیریت کند.',403);
        if($route==='users/add'){
            $rr=$input['role']??''; $name=trim((string)($input['name']??'')); $un=normalizeLoginUsername($input['username']??''); $pw=(string)($input['password']??''); if(!in_array($rr,['doctor','secretary'],true)||!$name||!$un||strlen($pw)<6)deny('نوع کاربر، نام، نام کاربری و رمز حداقل ۶ کاراکتری الزامی است.',400);
            if($session['role']==='secretary'&&$rr!=='doctor')deny('منشی فقط اجازه ثبت پزشک دارد.',403); if(!uniqueUsername($store,$users,$un,null,null,null))deny('این نام کاربری قبلاً استفاده شده است.',409);
            $u=['id'=>($rr==='doctor'?'doc-':'sec-').date('YmdHis').'-'.bin2hex(random_bytes(2)),'role'=>$rr,'name'=>$name,'username'=>$un,'passwordHash'=>secureHash($pw),'isActive'=>true,'permissions'=>cleanPermissions($input['permissions']??[]),'panelPermissions'=>is_array($input['panelPermissions']??null)?array_intersect_key($input['panelPermissions'],array_flip(['doctor','secretary','tv','settings','users'])):[],'permissionMode'=>($input['permissions']??null)?'override':'inherit'];
            if($rr==='doctor'){$u['specialty']=trim((string)($input['specialty']??''));$u['room']=normalizeRoom((string)($input['room']??''));$u['color']=trim((string)($input['color']??'indigo'));$u['photoUrl']=$input['photoUrl']??null;if(!$u['specialty']||!$u['room'])deny('تخصص و شماره اتاق پزشک الزامی است.',400);}
            $c['users'][]=$u;syncUserToLegacyArrays($c);$store=saveStore($jsonDbFile,$store,$cid);jsonOut(['success'=>true,'user'=>publicUser($u)]);
        }
        $id=trim((string)($input['id']??''));$ui=-1;foreach($c['users']??[] as $ix=>$u)if(($u['id']??'')===$id){$ui=$ix;break;}if($ui<0)deny('کاربر پیدا نشد.',404);
        $u=&$c['users'][$ui]; if($session['role']==='secretary' && ($u['role']??'')!=='doctor') deny('منشی فقط می‌تواند کاربران نوع «پزشک» را مدیریت کند.',403); if($route==='users/update'){
            if(isset($input['role']) && $input['role']!==$u['role']){if($session['role']!=='super_admin')deny('تغییر نوع کاربر فقط توسط سوپر ادمین مجاز است.',403);if(!in_array($input['role'],['doctor','secretary'],true))deny('نوع کاربر نامعتبر است.',400);$u['role']=$input['role'];}
            foreach(['name','isActive','photoUrl','color'] as $k)if(array_key_exists($k,$input))$u[$k]=$k==='isActive'?(bool)$input[$k]:$input[$k];
            if(isset($input['username'])){$un=normalizeLoginUsername($input['username']);if(!$un)deny('نام کاربری نمی‌تواند خالی باشد.',400);if($un!==($u['username']??'')&&!uniqueUsername($store,$users,$un,$u['role']==='doctor'?$id:null,$u['role']==='secretary'?$id:null,null))deny('این نام کاربری قبلاً استفاده شده است.',409);$u['username']=$un;}
            if(!empty($input['password'])){if(strlen((string)$input['password'])<6)deny('رمز جدید باید حداقل ۶ کاراکتر باشد.',400);$u['passwordHash']=secureHash((string)$input['password']);}
            if($u['role']==='doctor'){foreach(['specialty','room'] as $k)if(array_key_exists($k,$input))$u[$k]=$k==='room'?normalizeRoom((string)$input[$k]):trim((string)$input[$k]);if(empty($u['specialty'])||empty($u['room']))deny('تخصص و شماره اتاق پزشک الزامی است.',400);}
            if(array_key_exists('panelPermissions',$input)){if($session['role']!=='super_admin')deny('تغییر دسترسی پنل‌ها فقط توسط سوپر ادمین مجاز است.',403);$u['panelPermissions']=is_array($input['panelPermissions'])?array_intersect_key(array_map('boolval',$input['panelPermissions']),array_flip(['doctor','secretary','tv','settings','users'])):[];} if(array_key_exists('permissions',$input)){if($session['role']!=='super_admin')deny('تغییر دسترسی کاربران فقط توسط سوپر ادمین مجاز است.',403);$u['permissions']=cleanPermissions($input['permissions']);$u['permissionMode']=empty($u['permissions'])?'inherit':'override';}
            $saved=$u;syncUserToLegacyArrays($c);$store=saveStore($jsonDbFile,$store,$cid);jsonOut(['success'=>true,'user'=>publicUser($saved)]);
        }
        if($route==='users/delete'){
            if(isDefaultStaff($u))deny(($u['role']??'')==='doctor'?'پزشک پیش‌فرض سامانه قابل حذف نیست؛ اطلاعات آن قابل ویرایش است.':'منشی پیش‌فرض سامانه قابل حذف نیست؛ اطلاعات آن قابل ویرایش است.',409);
            if($session['role']!=='super_admin' && ($u['role']!=='doctor'||$session['role']!=='secretary'))deny('این حساب اجازه حذف این کاربر را ندارد.',403);
            if($u['role']==='secretary'&&$session['role']!=='super_admin')deny('منشی نمی‌تواند منشی دیگری را حذف کند.',403);
            $c['users']=array_values(array_filter($c['users'],fn($x)=>($x['id']??'')!==$id));$c['queues']=array_values(array_filter($c['queues']??[],fn($q)=>($q['doctorId']??'')!==$id));syncUserToLegacyArrays($c);$store=saveStore($jsonDbFile,$store,$cid);jsonOut(['success'=>true]);
        }
    }
}


if($route==='doctors/booking-status'){
    $c=currentCenterOrDeny($session,$store);$cid=$c['id'];$i=centerIndex($store,$cid);$did=trim((string)($input['doctorId']??''));
    if($did==='')deny('پزشک مشخص نشده است.',400);$found=false;
    foreach($store['centers'][$i]['doctors'] as &$d){if((string)($d['id']??'')===$did){$d['bookingClosed']=(bool)($input['closed']??false);$d['bookingClosedAt']=$d['bookingClosed']?date('c'):null;$found=true;break;}}unset($d);
    if(!$found)deny('پزشک پیدا نشد.',404);
    foreach($store['centers'][$i]['users'] as &$u)if((string)($u['id']??'')===$did){$u['bookingClosed']=(bool)($input['closed']??false);$u['bookingClosedAt']=$u['bookingClosed']?date('c'):null;}unset($u);
    $store=saveStore($jsonDbFile,$store,$cid);jsonOut(['success'=>true,'closed'=>(bool)($input['closed']??false),'version'=>$store['centers'][$i]['version']]);
}

// v3.3.14: atomic single-row and bulk secretary appointment actions.
if($route==='queue-slots/set'||$route==='queue-slots/bulk-set'||$route==='queue-slots/capacity'){
    if(!in_array($role,['secretary','super_admin'],true))deny('مجوز مدیریت نوبت ندارید.',403);
    $c=currentCenterOrDeny($session,$store);$ci=centerIndex($store,$c['id']);
    $did=trim((string)($input['doctorId']??''));$day=todayQueueDayKey();$doc=null;
    foreach($c['doctors']??[] as $d)if((string)($d['id']??'')===$did){$doc=$d;break;}
    if(!$doc)deny('پزشک معتبر نیست.',404);
    $planIdx=-1;
    foreach($c['appointmentPlans']??[] as $j=>$p)if(($p['doctorId']??'')===$did&&($p['dayKey']??'')===$day){$planIdx=$j;break;}
    $plan=$planIdx>=0?$c['appointmentPlans'][$planIdx]:['dayKey'=>$day,'doctorId'=>$did,'maxAppointments'=>max(25,doctorQueueLimit($c,$did),array_reduce($c['queues']??[],function($mx,$q)use($did,$day){$qq=queuePayload($q);return ($qq['doctorId']??'')===$did&&($qq['dayKey']??'')===$day?max($mx,(int)$qq['number']):$mx;},0)),'slots'=>[]];
    if($route==='queue-slots/bulk-set'){
        $max=max(1,min(999,(int)($plan['maxAppointments']??25)));
        $incoming=$input['items']??[];
        if(!is_array($incoming)||count($incoming)<1)deny('حداقل یک نوبت برای ثبت گروهی انتخاب کنید.',400);
        if(count($incoming)>999)deny('تعداد نوبت‌های انتخاب‌شده بیش از حد مجاز است.',400);
        if(!empty($doc['bookingClosed']))deny('پذیرش جدید این پزشک پایان یافته است.',409);

        // همه آیتم‌ها ابتدا اعتبارسنجی می‌شوند و فقط در صورت سالم بودن کل درخواست، یکجا ذخیره می‌شوند.
        $existing=[];
        foreach($c['queues']??[] as $q){$qq=queuePayload($q);if(($qq['dayKey']??'')===$day&&($qq['doctorId']??'')===$did)$existing[(int)($qq['number']??0)]=true;}
        $seen=[];$prepared=[];
        foreach($incoming as $idx=>$raw){
            if(!is_array($raw))deny('ساختار یکی از نوبت‌های انتخاب‌شده نامعتبر است.',400);
            $n=(int)($raw['number']??0);
            if($n<1||$n>$max)deny('شماره '.faDigits((string)$n).' خارج از ظرفیت امروز است.',400);
            if(isset($seen[$n]))deny('شماره '.faDigits((string)$n).' بیش از یک بار در انتخاب گروهی ارسال شده است.',400);
            $seen[$n]=true;
            if(isset($existing[$n]))deny('شماره '.faDigits((string)$n).' قبلاً ثبت شده است؛ ثبت گروهی لغو شد و هیچ شماره جدیدی اضافه نشد.',409);
            $name=trim((string)($raw['patientName']??''));$name=function_exists('mb_substr')?mb_substr($name,0,120):substr($name,0,120);
            $nid=preg_replace('/[^0-9]/','',str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'],['0','1','2','3','4','5','6','7','8','9'],(string)($raw['nationalId']??'')));
            if($nid!==''&&strlen($nid)!==10)deny('کد ملی نوبت '.faDigits((string)$n).' باید دقیقاً ۱۰ رقمی باشد یا خالی بماند.',400);
            $note=trim((string)($raw['doctorNote']??''));$note=function_exists('mb_substr')?mb_substr($note,0,3000):substr($note,0,3000);
            $prepared[]=['number'=>$n,'patientName'=>$name?:'بدون نام','nationalId'=>$nid,'isActive'=>(bool)($raw['isActive']??false),'doctorNote'=>$note!==''?$note:null];
        }
        usort($prepared,fn($a,$b)=>$a['number']<=>$b['number']);
        $created=[];$activeCount=0;
        foreach($prepared as $row){
            $q=['id'=>'q-'.date('YmdHis').'-'.bin2hex(random_bytes(6)),'number'=>$row['number'],'doctorId'=>$did,'patientName'=>$row['patientName'],'nationalId'=>$row['nationalId'],'status'=>'waiting','isActive'=>$row['isActive'],'registrationSource'=>'managed-list-bulk','dayKey'=>$day,'createdAt'=>date('c'),'doctorNote'=>$row['doctorNote'],'idempotencyKey'=>'slot-'.$day.'-'.$did.'-'.$row['number']];
            $c['queues'][]=$q;$created[]=queuePayload($q);if($row['isActive'])$activeCount++;
        }
        $plan['updatedAt']=date('c');
        if($planIdx<0)$c['appointmentPlans'][]=$plan;else $c['appointmentPlans'][$planIdx]=$plan;
        $store['centers'][$ci]=$c;$store=saveStore($jsonDbFile,$store,$c['id']);
        jsonOut(['success'=>true,'count'=>count($created),'activeCount'=>$activeCount,'inactiveCount'=>count($created)-$activeCount,'items'=>$created,'version'=>$store['centers'][$ci]['version']]);
    }

    if($route==='queue-slots/capacity'){
        $max=(int)($input['maxAppointments']??0);if($max<1||$max>999)deny('ظرفیت باید بین ۱ تا ۹۹۹ باشد.',400);
        // ظرفیت نباید هیچ نوبت ثبت‌شده‌ای (فعال یا غیرفعال) را از جدول پنهان کند.
        $highest=0;foreach($c['queues']??[] as $q){$qq=queuePayload($q);if(($qq['doctorId']??'')===$did&&($qq['dayKey']??'')===$day)$highest=max($highest,(int)$qq['number']);}
        if($max<$highest)deny('شماره ثبت‌شده‌ای بالاتر از ظرفیت انتخابی وجود دارد. ابتدا آن نوبت را از فهرست نوبت‌های ثبت‌شده اصلاح یا لغو کنید.',409);
        $plan['maxAppointments']=$max;$plan['updatedAt']=date('c');
        if($planIdx<0)$c['appointmentPlans'][]=$plan;else $c['appointmentPlans'][$planIdx]=$plan;
        $store['centers'][$ci]=$c;$store=saveStore($jsonDbFile,$store,$c['id']);
        jsonOut(['success'=>true,'maxAppointments'=>$max,'version'=>$store['centers'][$ci]['version']]);
    }
    $n=(int)($input['number']??0);$max=max(1,min(999,(int)($plan['maxAppointments']??25)));
    if($n<1||$n>$max)deny('شماره خارج از ظرفیت امروز است.',400);
    $active=(bool)($input['isActive']??false);
    // registered=true یعنی منشی این ردیف را عمداً ثبت کرده است؛ فعال بودن برای فراخوان یک وضعیت مستقل است.
    // برای سازگاری با کلاینت‌های قدیمی، اگر registered ارسال نشده باشد رفتار قبلی (ثبت هنگام active=true) حفظ می‌شود.
    $registered=array_key_exists('registered',$input)?(bool)$input['registered']:$active;
    $name=(function_exists('mb_substr')?mb_substr(trim((string)($input['patientName']??'')),0,120):substr(trim((string)($input['patientName']??'')),0,120));
    $nid=preg_replace('/[^0-9]/','',str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'],['0','1','2','3','4','5','6','7','8','9'],(string)($input['nationalId']??'')));
    if($nid!=='' && strlen($nid)!==10)deny('کد ملی در صورت ورود باید ۱۰ رقمی باشد.',400);
    $note=trim((string)($input['doctorNote']??''));
    if(function_exists('mb_substr'))$note=mb_substr($note,0,3000);else $note=substr($note,0,3000);
    $qi=-1;foreach($c['queues']??[] as $k=>$q){$qq=queuePayload($q);if(($qq['dayKey']??'')===$day&&($qq['doctorId']??'')===$did&&(int)$qq['number']===$n){$qi=$k;break;}}
    // Occupied slots are immutable here, including inactive, visited and calling; registered list owns edits/cancellation.
    if($qi>=0)deny('این شماره قبلاً ثبت شده است. برای اصلاح، فعال/غیرفعال کردن یا آزادسازی از فهرست نوبت‌های ثبت‌شده استفاده کنید.',409);
    if(!$registered)jsonOut(['success'=>true,'unchanged'=>true,'version'=>(int)$c['version']]);
    if(!empty($doc['bookingClosed']))deny('پذیرش جدید این پزشک پایان یافته است.',409);
    $q=['id'=>'q-'.date('YmdHis').'-'.bin2hex(random_bytes(6)),'number'=>$n,'doctorId'=>$did,'patientName'=>$name?:'بدون نام','nationalId'=>$nid,'status'=>'waiting','isActive'=>$active,'registrationSource'=>'managed-list','dayKey'=>$day,'createdAt'=>date('c'),'doctorNote'=>$note!==''?$note:null,'idempotencyKey'=>'slot-'.$day.'-'.$did.'-'.$n];
    $c['queues'][]=$q;
    if($planIdx<0)$c['appointmentPlans'][]=$plan;
    $store['centers'][$ci]=$c;$store=saveStore($jsonDbFile,$store,$c['id']);
    jsonOut(['success'=>true,'item'=>queuePayload($q),'version'=>$store['centers'][$ci]['version']]);
}

if($route==='queue-slots/get'||$route==='queue-slots/save'){
    $c=currentCenterOrDeny($session,$store); $i=centerIndex($store,$c['id']); $day=trim((string)($input['dayKey']??$_GET['dayKey']??todayQueueDayKey()));
    if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$day)) deny('تاریخ نوبت نامعتبر است.',400);
    if($role==='doctor' && !effectivePanelPermission($session,$c,'secretary')) { /* پزشک فقط داده خودش را می‌بیند؛ مسیر get مجاز است. */ }
    $did=trim((string)($input['doctorId']??$_GET['doctorId']??'')); if($role==='doctor') $did=(string)($session['doctorId']??'');
    if($did==='') deny('پزشک انتخاب نشده است.',400);
    $doc=null; foreach($c['doctors']??[] as $d) if(($d['id']??'')===$did){$doc=$d;break;} if(!$doc) deny('پزشک انتخاب‌شده معتبر نیست.',404);
    $planIdx=-1; foreach($c['appointmentPlans']??[] as $k=>$pl) if(is_array($pl)&&($pl['dayKey']??'')===$day&&($pl['doctorId']??'')===$did){$planIdx=$k;break;}
    if($route==='queue-slots/get'){
        $plan=$planIdx>=0?$c['appointmentPlans'][$planIdx]:['dayKey'=>$day,'doctorId'=>$did,'maxAppointments'=>0,'slots'=>[],'updatedAt'=>null];
        $qmap=[]; foreach($c['queues']??[] as $q){$qq=queuePayload($q);if(($qq['dayKey']??'')===$day&&($qq['doctorId']??'')===$did)$qmap[(string)((int)$qq['number'])]=$qq;}
        $slots=[]; $max=max(0,min(999,(int)($plan['maxAppointments']??0))); for($n=1;$n<=$max;$n++){ $slotDef=null;foreach(($plan['slots']??[]) as $ss)if((int)($ss['number']??0)===$n){$slotDef=$ss;break;} $q=$qmap[(string)$n]??null; $slots[]=['number'=>$n,'queueId'=>$q['id']??null,'patientName'=>$q['patientName']??'','nationalId'=>$q['nationalId']??'','isActive'=>($q['isActive']??false)===true && ($q['status']??'waiting')!=='visited' && ($q['status']??'waiting')!=='absent','status'=>$q['status']??null]; }
        jsonOut(['success'=>true,'dayKey'=>$day,'doctor'=>publicDoctor($doc),'plan'=>['dayKey'=>$day,'doctorId'=>$did,'maxAppointments'=>$max,'slots'=>$slots,'updatedAt'=>$plan['updatedAt']??null],'version'=>(int)($c['version']??1),'lastUpdated'=>(int)($c['lastUpdated']??0)]);
    }
    if($role!=='secretary'&&$role!=='super_admin') deny('فقط منشی یا سوپرادمین اجازه تنظیم ظرفیت نوبت پزشک را دارد.',403);
    $max=(int)($input['maxAppointments']??0); if($max<1||$max>999) deny('حداکثر نوبت باید بین ۱ تا ۹۹۹ باشد.',400);
    $incoming=$input['slots']??[]; if(!is_array($incoming)) deny('ساختار ردیف‌های نوبت نامعتبر است.',400);
    $normalized=[]; for($n=1;$n<=$max;$n++) $normalized[$n]=['number'=>$n,'patientName'=>'','nationalId'=>'','isActive'=>false,'queueId'=>null];
    foreach($incoming as $slot){ if(!is_array($slot))continue;$n=(int)($slot['number']??0);if($n<1||$n>$max)continue;$normalized[$n]['patientName']=trim((string)($slot['patientName']??''));$normalized[$n]['nationalId']=trim((string)($slot['nationalId']??''));$normalized[$n]['isActive']=array_key_exists('isActive',$slot)?(bool)$slot['isActive']:false;$normalized[$n]['queueId']=trim((string)($slot['queueId']??''))?:null; }
    foreach($c['queues']??[] as $qi=>$_q){$q=queuePayload($_q);if(($q['doctorId']??'')===$did&&($q['dayKey']??'')===$day&&((int)($q['number']??0)>$max)&&(($c['queues'][$qi]['status']??'waiting')==='waiting'))$c['queues'][$qi]['isActive']=false;}
    foreach($normalized as $n=>$slot){
        $qi=-1; foreach($c['queues']??[] as $k=>$q){$qq=queuePayload($q);if(($qq['doctorId']??'')===$did&&($qq['dayKey']??'')===$day&&(int)($qq['number']??0)===$n){$qi=$k;break;}}
        if($slot['isActive']){
            if($qi<0 && !empty($doc['bookingClosed'])) deny('پذیرش نوبت جدید برای این پزشک پایان یافته است. برای فعال‌کردن بیمار جدید ابتدا پذیرش را دوباره باز کنید.',409);
            if($qi<0){$q=['id'=>'q-'.date('YmdHis').'-'.bin2hex(random_bytes(4)),'number'=>$n,'doctorId'=>$did,'patientName'=>$slot['patientName']?:'بدون نام','nationalId'=>$slot['nationalId'],'status'=>'waiting','isActive'=>true,'registrationSource'=>'managed-list','dayKey'=>$day,'createdAt'=>date('c'),'doctorNote'=>null,'idempotencyKey'=>'slot-'.$day.'-'.$did.'-'.$n];$c['queues'][]=$q;$normalized[$n]['queueId']=$q['id'];}
            else { if(($c['queues'][$qi]['status']??'')==='calling') deny('نوبت در حال فراخوان را از فهرست ثبت‌شده اصلاح کنید.',409); $c['queues'][$qi]['patientName']=$slot['patientName']?:'بدون نام';$c['queues'][$qi]['nationalId']=$slot['nationalId'];$c['queues'][$qi]['isActive']=true;$c['queues'][$qi]['registrationSource']='managed-list';if(($c['queues'][$qi]['status']??'')==='visited') deny('نوبت ویزیت‌شده را فقط از فهرست ثبت‌شده‌ها می‌توان به انتظار برگرداند.',409);if(($c['queues'][$qi]['status']??'')==='absent')$c['queues'][$qi]['status']='waiting';$normalized[$n]['queueId']=$c['queues'][$qi]['id']; }
        } else if($qi>=0){
            if(($c['queues'][$qi]['status']??'')==='calling') deny('نوبت جاری پزشک را نمی‌توان در لیست ظرفیت غیرفعال کرد.',409);
            $c['queues'][$qi]['isActive']=false; if($slot['patientName']!==''||$slot['nationalId']!==''){$c['queues'][$qi]['patientName']=$slot['patientName']?:'بدون نام';$c['queues'][$qi]['nationalId']=$slot['nationalId'];} $normalized[$n]['queueId']=$c['queues'][$qi]['id'];
        }
    }
    $plan=['dayKey'=>$day,'doctorId'=>$did,'maxAppointments'=>$max,'slots'=>array_values(array_map(fn($x)=>['number'=>$x['number'],'queueId'=>$x['queueId']],$normalized)),'updatedAt'=>date('c')];
    if($planIdx>=0)$c['appointmentPlans'][$planIdx]=$plan;else $c['appointmentPlans'][]=$plan;
    $store['centers'][$i]=$c; $store=saveStore($jsonDbFile,$store,$c['id']);
    $cc=$store['centers'][$i];
    jsonOut(['success'=>true,'dayKey'=>$day,'doctorId'=>$did,'plan'=>$plan,'version'=>$cc['version'],'lastUpdated'=>$cc['lastUpdated']]);
}

if($route==='queues/patient-update'||$route==='queues/patient-toggle-all'){
    $c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);
    if($role!=='secretary'&&$role!=='super_admin')deny('فقط منشی یا سوپرادمین اجازه مدیریت بیمار را دارد.',403);
    if($route==='queues/patient-toggle-all'){
        $active=array_key_exists('active',$input)?(bool)$input['active']:true;
        foreach($store['centers'][$i]['queues'] as $qidx=>$_q){ if(queueIsCurrentDay($_q) && (($store['centers'][$i]['queues'][$qidx]['status']??'waiting')!=='calling')) $store['centers'][$i]['queues'][$qidx]['isActive']=$active; }
        $store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'version'=>$store['centers'][$i]['version']]);
    }
    $qid=trim((string)($input['queueId']??''));if(!$qid)deny('شناسه نوبت الزامی است.',400);$qi=-1;
    foreach($store['centers'][$i]['queues']??[] as $k=>$qq)if(($qq['id']??'')===$qid){$qi=$k;break;}
    if($qi<0)deny('نوبت پیدا نشد.',404);
    if(array_key_exists('patientName',$input))$store['centers'][$i]['queues'][$qi]['patientName']=trim((string)$input['patientName'])?:'بدون نام';
    if(array_key_exists('nationalId',$input)){
        $nid=preg_replace('/[^0-9]/','',str_replace(['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'],['0','1','2','3','4','5','6','7','8','9'],(string)$input['nationalId']));
        if($nid!=='' && strlen($nid)!==10)deny('کد ملی در صورت ورود باید ۱۰ رقمی باشد.',400);
        $store['centers'][$i]['queues'][$qi]['nationalId']=$nid;
    }
    if(array_key_exists('isActive',$input)){
        $nextActive=(bool)$input['isActive']; if(!$nextActive && (($store['centers'][$i]['queues'][$qi]['status']??'waiting')==='calling')) deny('نوبت در حال ویزیت را نمی‌توان غیرفعال کرد.',409); $store['centers'][$i]['queues'][$qi]['isActive']=$nextActive;
    }
    $store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'item'=>$store['centers'][$i]['queues'][$qi],'version'=>$store['centers'][$i]['version']]);
}

if($route==='queues/add'||$route==='queues/call'||$route==='queues/next'||$route==='queues/finish-and-next'||$route==='queues/status'||$route==='queues/delete'||$route==='queues/clear-all'||$route==='queues/note'){
    $c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);
    if($route==='queues/add'){
        $did=trim((string)($input['doctorId']??''));if($role==='doctor')$did=$session['doctorId'];
        $doc=null;foreach($c['doctors']??[] as $d)if(($d['id']??'')===$did&&($d['isActive']??true))$doc=$d;if(!$doc)deny('پزشک انتخاب‌شده معتبر نیست.',404);
        $name=trim((string)($input['patientName']??''))?:'بدون نام';$key=trim((string)($input['idempotencyKey']??''));
        foreach($c['queues']??[] as $q)if($key!==''&&($q['idempotencyKey']??'')===$key)jsonOut(['success'=>true,'duplicate'=>true,'item'=>queuePayload($q)]);
        $limit=doctorQueueLimit($c,$did);$today=todayQueueDayKey();$used=[];$existingByNumber=[];
        foreach($c['queues']??[] as $qidx=>$qq){ $qq=queuePayload($qq); if(($qq['doctorId']??'')!==$did||($qq['dayKey']??'')!==$today)continue; $nq=(int)($qq['number']??0); if($nq<1)continue; $existingByNumber[$nq]=$qidx; if(($qq['isActive']??true)===true&&($qq['status']??'waiting')!=='visited'&&($qq['status']??'waiting')!=='absent')$used[$nq]=true; }
        $customProvided=array_key_exists('customNumber',$input)&&trim((string)$input['customNumber'])!=='';$num=$customProvided?(int)$input['customNumber']:1;if($num<1)$num=1;
        if($limit>0&&$num>$limit)deny('حداکثر نوبت این پزشک برای امروز '.faDigits((string)$limit).' است.',409);
        if(!$customProvided){while(isset($used[$num])&&(!$limit||$num<$limit))$num++;if($limit>0&&$num>$limit)deny('ظرفیت نوبت امروز این پزشک تکمیل شده است.',409);}
        if(!empty($doc['bookingClosed']) && !isset($existingByNumber[$num])) deny('پذیرش نوبت جدید برای این پزشک پایان یافته است. نوبت‌های ثبت‌شده قبلی همچنان قابل فراخوان و ویزیت هستند.',409);
        if(isset($existingByNumber[$num])){
            $qi=$existingByNumber[$num]; $status=(string)($c['queues'][$qi]['status']??'waiting');
            if(($c['queues'][$qi]['isActive']??true)===true&&$status!=='visited'&&$status!=='absent')deny('این شماره نوبت قبلاً برای این پزشک ثبت شده است. لطفاً شماره دیگری انتخاب کنید.',409);
            if($status==='calling')deny('نوبت در حال ویزیت است و قابل ثبت مجدد نیست.',409);
            $c['queues'][$qi]['patientName']=$name;$c['queues'][$qi]['nationalId']=trim((string)($input['nationalId']??''));$c['queues'][$qi]['status']='waiting';$c['queues'][$qi]['isActive']=true;$c['queues'][$qi]['registrationSource']='quick';$c['queues'][$qi]['dayKey']=$today;if(array_key_exists('doctorNote',$input))$c['queues'][$qi]['doctorNote']=trim((string)$input['doctorNote'])?:null;if($key!=='')$c['queues'][$qi]['idempotencyKey']=$key;
            $store['centers'][$i]=$c;$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'item'=>$c['queues'][$qi],'version'=>$store['centers'][$i]['version'],'reactivated'=>true]);
        }
        $q=['id'=>'q-'.date('YmdHis').'-'.bin2hex(random_bytes(3)),'number'=>$num,'doctorId'=>$did,'patientName'=>$name,'nationalId'=>trim((string)($input['nationalId']??'')),'status'=>'waiting','isActive'=>true,'registrationSource'=>'quick','dayKey'=>$today,'createdAt'=>date('c'),'doctorNote'=>trim((string)($input['doctorNote']??''))?:null,'idempotencyKey'=>$key];
        $store['centers'][$i]['queues'][]=$q;$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'item'=>$q,'version'=>$store['centers'][$i]['version']]);
    }

    // پاک‌سازی کل صف یک مسیر مستقل است و نباید قبل از آن queueId اجباری شود.
    if($route==='queues/clear-all'){
        if($role!=='secretary'&&$role!=='super_admin')deny('فقط منشی می‌تواند صف مرکز را پاک کند.');
        $store['centers'][$i]['queues']=[];
        $store=saveStore($jsonDbFile,$store,$c['id']);
        jsonOut(['success'=>true,'version'=>$store['centers'][$i]['version']]);
    }
    if($route==='queues/next'||$route==='queues/finish-and-next'){
        $did=$role==='doctor'?(string)$session['doctorId']:trim((string)($input['doctorId']??''));
        if($did==='')deny('پزشک مشخص نشده است.',400);

        // «فراخوان نفر بعد» هرگز پایان ویزیت نیست.
        // اگر بیماری در حال فراخوان باشد، فقط به صف انتظار برمی‌گردد و برای دور بعد محفوظ می‌ماند.
        $currentIndex=-1;$currentNumber=null;
        foreach($store['centers'][$i]['queues'] as $k=>$q){
            $qq=queuePayload($q);
            if((string)($qq['doctorId']??'')!==$did||!queueIsCurrentDay($qq)||($qq['isActive']??true)!==true)continue;
            if(($qq['status']??'waiting')==='calling'){
                if($currentIndex<0){$currentIndex=$k;$currentNumber=(int)($qq['number']??0);}
                $store['centers'][$i]['queues'][$k]['status']='waiting';
                $store['centers'][$i]['queues'][$k]['lastDeferredAt']=date('c');
            }
        }

        // تمام نوبت‌های فعال امروز که «پایان ویزیت» نگرفته‌اند، همچنان عضو چرخه فراخوان هستند.
        $candidates=[];
        foreach($store['centers'][$i]['queues'] as $k=>$q){
            $qq=queuePayload($q);
            if((string)($qq['doctorId']??'')!==$did||!queueIsCurrentDay($qq)||($qq['isActive']??true)!==true)continue;
            if(($qq['status']??'waiting')==='visited')continue;
            $candidates[]=['i'=>$k,'n'=>(int)($qq['number']??0),'created'=>(string)($qq['createdAt']??'')];
        }
        usort($candidates,function($a,$b){return $a['n']===$b['n']?strcmp($a['created'],$b['created']):$a['n']<=>$b['n'];});
        $pick=null;
        if($currentIndex>=0 && count($candidates)>1){
            // در همان کلیک، بیمار فعلی دوباره انتخاب نشود؛ ابتدا به شماره بعدی برو.
            $others=array_values(array_filter($candidates,fn($x)=>(int)$x['i']!==$currentIndex));
            foreach($others as $x)if($x['n']>$currentNumber){$pick=$x;break;}
            if(!$pick)$pick=$others[0]??null; // گردش انتهای صف به ابتدای صف
        } else {
            // وقتی بیمار جاری نداریم (مثلاً بعد از پایان ویزیت)، از ابتدای صف حل‌نشده شروع کن.
            $pick=$candidates[0]??null;
        }
        if(!$pick){
            $store=saveStore($jsonDbFile,$store,$c['id']);
            jsonOut(['success'=>true,'item'=>null,'message'=>'همه نوبت‌های فعال امروز پایان ویزیت خورده‌اند یا بیماری برای فراخوان وجود ندارد.','version'=>$store['centers'][$i]['version']]);
        }
        $k=$pick['i'];
        $store['centers'][$i]['queues'][$k]['status']='calling';
        $store['centers'][$i]['queues'][$k]['wasAbsent']=false;
        appendQueueCallEvent($store['centers'][$i]['queues'][$k],'next',$input);
        $q=$store['centers'][$i]['queues'][$k];
        $task=callAnnouncementTask($input,$q,$store['centers'][$i],$did);
        $announcement=enqueueAnnouncement($store['centers'][$i],$task);
        $store=saveStore($jsonDbFile,$store,$c['id']);
        jsonOut([
            'success'=>true,
            'item'=>queuePayload($q),
            'previousQueueId'=>$currentIndex>=0?($store['centers'][$i]['queues'][$currentIndex]['id']??null):null,
            'previousKeptWaiting'=>$currentIndex>=0,
            'legacyRoute'=>$route==='queues/finish-and-next',
            'announcement'=>$announcement,
            'version'=>$store['centers'][$i]['version']
        ]);
    }
    $qid=trim((string)($input['queueId']??''));$found=null;$qi=null;foreach($store['centers'][$i]['queues'] as $k=>$q)if($q['id']===$qid){$found=$q;$qi=$k;break;}if(!$found)deny('نوبت پیدا نشد.',404);if($route==='queues/call'&&($found['isActive']??true)!==true)deny('این بیمار غیرفعال است و قابل فراخوان نیست.',409);if($role==='doctor'&&($found['doctorId']??'')!==$session['doctorId'])deny('دسترسی به نوبت پزشک دیگر مجاز نیست.');
    if($route==='queues/call'){
        if(($found['status']??'waiting')==='visited')deny('ویزیت این نوبت قبلاً پایان یافته است. برای بازگرداندن آن ابتدا نوبت را به صف انتظار برگردانید.',409);
        $wasCurrent=(($found['status']??'waiting')==='calling');
        // فراخوان مستقیم یا مجدد یک بیمار، بیمار جاری دیگری را «ویزیت‌شده» نمی‌کند؛
        // او فقط برای گردش بعدی به انتظار برمی‌گردد.
        foreach($store['centers'][$i]['queues'] as $k=>$_q){
            $qq=queuePayload($store['centers'][$i]['queues'][$k]);
            if($k===$qi||(string)($qq['doctorId']??'')!==(string)($found['doctorId']??'')||!queueIsCurrentDay($qq))continue;
            if(($qq['status']??'')==='calling'){
                $store['centers'][$i]['queues'][$k]['status']='waiting';
                $store['centers'][$i]['queues'][$k]['lastDeferredAt']=date('c');
            }
        }
        $store['centers'][$i]['queues'][$qi]['status']='calling';
        $store['centers'][$i]['queues'][$qi]['wasAbsent']=false;
        appendQueueCallEvent($store['centers'][$i]['queues'][$qi],$wasCurrent?'repeat':'direct',$input);
        $task=callAnnouncementTask($input,$store['centers'][$i]['queues'][$qi],$store['centers'][$i],(string)$found['doctorId']);
        $announcement=enqueueAnnouncement($store['centers'][$i],$task);
        $store=saveStore($jsonDbFile,$store,$c['id']);
        jsonOut(['success'=>true,'item'=>queuePayload($store['centers'][$i]['queues'][$qi]),'announcement'=>$announcement,'repeated'=>$wasCurrent,'version'=>$store['centers'][$i]['version']]);
    }
    if($route==='queues/status'){
        $st=$input['status']??'waiting';
        if(!in_array($st,['waiting','calling','visited','absent'],true))deny('وضعیت نوبت نامعتبر است.',400);
        if($st==='calling'&&($found['isActive']??true)!==true)deny('این بیمار غیرفعال است و قابل فراخوان نیست.',409);
        if($st==='calling'){
            foreach($store['centers'][$i]['queues'] as $k=>$q){
                $qq=queuePayload($q);
                if($k!==$qi&&(string)($qq['doctorId']??'')===(string)($found['doctorId']??'')&&queueIsCurrentDay($qq)&&($qq['status']??'')==='calling'){
                    $store['centers'][$i]['queues'][$k]['status']='waiting';
                    $store['centers'][$i]['queues'][$k]['lastDeferredAt']=date('c');
                }
            }
            $store['centers'][$i]['queues'][$qi]['status']='calling';
            $store['centers'][$i]['queues'][$qi]['wasAbsent']=false;
            appendQueueCallEvent($store['centers'][$i]['queues'][$qi],'status-call',$input);
        } elseif($st==='visited'){
            $store['centers'][$i]['queues'][$qi]['status']='visited';
            $store['centers'][$i]['queues'][$qi]['visitedAt']=date('c');
            $store['centers'][$i]['queues'][$qi]['wasAbsent']=false;
        } elseif($st==='waiting'){
            $store['centers'][$i]['queues'][$qi]['status']='waiting';
            $store['centers'][$i]['queues'][$qi]['wasAbsent']=false;
            unset($store['centers'][$i]['queues'][$qi]['visitedAt']);
        } else {
            // «عدم حضور» پایان ویزیت محسوب نمی‌شود و در چرخه فراخوان قابل بازگشت است.
            $store['centers'][$i]['queues'][$qi]['status']='absent';
            $store['centers'][$i]['queues'][$qi]['wasAbsent']=true;
        }
        $store=saveStore($jsonDbFile,$store,$c['id']);
        jsonOut(['success'=>true,'item'=>queuePayload($store['centers'][$i]['queues'][$qi]),'version'=>$store['centers'][$i]['version']]);
    }
    if($route==='queues/delete'){array_splice($store['centers'][$i]['queues'],$qi,1);$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'version'=>$store['centers'][$i]['version']]);}
    if($route==='queues/note'){$store['centers'][$i]['queues'][$qi]['doctorNote']=trim((string)($input['doctorNote']??''))?:null;$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'version'=>$store['centers'][$i]['version']]);}
}
function findDoctorName(array $c,string $id):string{foreach($c['doctors']??[] as $d)if(($d['id']??'')===$id)return $d['name']??'';return '';}
function findDoctorSpec(array $c,string $id):string{foreach($c['doctors']??[] as $d)if(($d['id']??'')===$id)return $d['specialty']??'';return '';}
function findRoom(array $c,string $id):string{foreach($c['doctors']??[] as $d)if(($d['id']??'')===$id)return $d['room']??'اتاق پزشک';return 'اتاق پزشک';}

function secretaryCallSnapshot(array $c):?array {
    $x=$c['triggerSecretaryCall']??null;
    if(!is_array($x) || empty($x['id'])) return null;
    $exp=(int)($x['expiresAtMs']??0);
    if($exp>0 && $exp<round(microtime(true)*1000)) return null;
    return $x;
}
function secretaryDestinationForDoctor(array $d):string {
    $spec=trim((string)($d['specialty']??''));
    $room=trim((string)($d['room']??''));
    if($spec!=='') return 'به اتاق '.$spec;
    return $room!=='' ? 'به '.$room : 'به اتاق پزشک';
}

if($route==='announcements/broadcast'||$route==='secretary/call'){
    $c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);
    if($route==='announcements/broadcast'){
        $now=round(microtime(true)*1000);$task=['callId'=>trim((string)($input['callId']??''))?:('call-'.bin2hex(random_bytes(6))),'senderClientId'=>$input['senderClientId']??'','number'=>(int)($input['number']??1),'room'=>$input['room']??'','patientName'=>$input['patientName']??'','doctorName'=>$input['doctorName']??'','specialty'=>$input['specialty']??'','timestamp'=>$now,'createdAtMs'=>$now,'startedAtMs'=>null,'expiresAtMs'=>null];
        $announcement=enqueueAnnouncement($store['centers'][$i],$task);$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'announcement'=>$announcement]);
    }
    $doctorId=trim((string)($input['doctorId']??''));
    if(($session['role']??'')==='doctor') $doctorId=(string)($session['doctorId']??'');
    if($doctorId==='') deny('پزشک برای فراخوان منشی مشخص نشده است.',400);
    $doctor=null;
    foreach($c['doctors']??[] as $d) if((string)($d['id']??'')===$doctorId){$doctor=$d;break;}
    if(!$doctor) deny('پزشک موردنظر در این مرکز پیدا نشد.',404);
    $nowMs=round(microtime(true)*1000);
    $alert=[
        'id'=>'sc-'.$nowMs.'-'.bin2hex(random_bytes(3)),
        'doctorId'=>$doctorId,
        'doctorName'=>(string)($doctor['name']??''),
        'specialty'=>(string)($doctor['specialty']??''),
        'room'=>(string)($doctor['room']??''),
        'destination'=>secretaryDestinationForDoctor($doctor),
        'message'=>trim((string)($input['message']??''))?:'لطفاً به اتاق پزشک مراجعه فرمایید.',
        'timestamp'=>date('c'),
        'createdAtMs'=>$nowMs,
        'expiresAtMs'=>$nowMs+120000
    ];
    $store['centers'][$i]['triggerSecretaryCall']=$alert;
    $store=saveStore($jsonDbFile,$store,$c['id']);
    jsonOut(['success'=>true,'alert'=>$alert,'version'=>$store['centers'][$i]['version']]);
}
if($route==='announcements/complete'){
    if(!in_array($role,['display','super_admin'],true)) respond(['ok'=>false,'error'=>'این عملیات فقط از نمایشگر مرکز مجاز است.'],403);
    $c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);$callId=trim((string)($input['callId']??''));if($callId==='')deny('شناسه فراخوان الزامی است.',400);
    $result=completeAnnouncement($store['centers'][$i],$callId);if(!empty($result['completed']))$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'announcementBus'=>announcementBusSnapshot($store['centers'][$i])]+$result);
}
if($route==='tickers/save'){ $c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);if(!is_array($input['tickers']??null))deny('لیست تیکر نامعتبر است.',400);$store['centers'][$i]['tickers']=normalizeTickers($input['tickers']);$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'version'=>$store['centers'][$i]['version']]); }
if($route==='settings/update'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند تنظیمات مرکز را تغییر دهد.');$cid=$input['centerId']??$session['centerId']??null;if(!$cid)deny('ابتدا یک مرکز را انتخاب کنید.',400);$i=centerIndex($store,$cid);if($i<0)deny('مرکز پیدا نشد.',404);
    $allowed=['clinicName','subtitle','phone','address','repeatCount','volume','autoPrintOnCreate','showDoctorPhoto','showLogo','lanIp','port','appointmentUrl','appointmentSiteName','appointmentDescription','appointmentLinks','qrLinks','receiptMessage'];
    foreach($allowed as $k)if(array_key_exists($k,$input))$store['centers'][$i]['settings'][$k]=$input[$k];
    if(array_key_exists('receiptMessage',$input)) $store['centers'][$i]['settings']['receiptMessage']=(function_exists('mb_substr')?mb_substr(trim((string)$input['receiptMessage']),0,240):substr(trim((string)$input['receiptMessage']),0,240));
    if(array_key_exists('logoUrl',$input))$store['centers'][$i]['settings']['logoUrl']=saveCenterLogoValue($cid,(string)$input['logoUrl']);
    if(array_key_exists('showDoctorPhoto',$input))$store['centers'][$i]['settings']['showDoctorPhoto']=(bool)$input['showDoctorPhoto'];
    if(array_key_exists('repeatCount',$input))$store['centers'][$i]['settings']['repeatCount']=max(1,min(3,(int)$input['repeatCount']));
    if(array_key_exists('volume',$input))$store['centers'][$i]['settings']['volume']=max(0,min(1,(float)$input['volume']));
    if(array_key_exists('displaySettings',$input)){
        $incomingRaw=is_array($input['displaySettings'])?$input['displaySettings']:[];
        $existingDisplay=is_array($store['centers'][$i]['settings']['displaySettings']??null)?$store['centers'][$i]['settings']['displaySettings']:defaultDisplaySettings();
        // Treat displaySettings as a PATCH. Older panels may not know about `mode`; they must never reset it to queue.
        $incoming=array_merge($existingDisplay,$incomingRaw);
        if(array_key_exists('showDoctorPhoto',$incomingRaw))$store['centers'][$i]['settings']['showDoctorPhoto']=(bool)$incomingRaw['showDoctorPhoto']; if(array_key_exists('repeatCount',$incomingRaw))$store['centers'][$i]['settings']['repeatCount']=max(1,min(3,(int)$incomingRaw['repeatCount'])); if(array_key_exists('volume',$incomingRaw))$store['centers'][$i]['settings']['volume']=max(0,min(1,(float)$incomingRaw['volume']));
        if(array_key_exists('qrCodes',$incomingRaw)&&is_array($incomingRaw['qrCodes'])){
            $incoming['qrCodes']=$incomingRaw['qrCodes'];
            $oldQr=$store['centers'][$i]['settings']['displaySettings']['qrCodes']??[];
            $oldById=[]; foreach(is_array($oldQr)?$oldQr:[] as $q0) if(is_array($q0)&&!empty($q0['id'])) $oldById[(string)$q0['id']]=$q0;
            $newQr=[];
            foreach($incoming['qrCodes'] as $q0){
                if(!is_array($q0)) continue;
                $qid=trim((string)($q0['id']??'')); if($qid==='') $qid='qr-'.bin2hex(random_bytes(4));
                $item=['id'=>$qid,'name'=>trim((string)($q0['name']??'QR نمایشگر'))?:'QR نمایشگر','url'=>normalizeAppointmentUrl((string)($q0['url']??'')),'description'=>trim((string)($q0['description']??'')),'active'=>array_key_exists('active',$q0)?(bool)$q0['active']:true,'imageUrl'=>trim((string)($q0['imageUrl']??''))];
                if(!empty($q0['imageData'])){
                    $saved=saveCenterQrValue($cid,$qid,(string)$q0['imageData']); if($saved!=='') $item['imageUrl']=$saved;
                } elseif(array_key_exists('imageData',$q0)&&$q0['imageData']==='' && empty($item['imageUrl'])) {
                    deleteCenterQrValue($cid,$qid); $item['imageUrl']='';
                }
                if($item['imageUrl']!=='' && !preg_match('~^/api/media/qr\?~',$item['imageUrl'])) $item['imageUrl']='';
                $newQr[]=$item;
            }
            foreach($oldById as $qid=>$oldItem){$keep=false;foreach($newQr as $nq)if(($nq['id']??'')===$qid){$keep=true;break;}if(!$keep)deleteCenterQrValue($cid,$qid);}
            $incoming['qrCodes']=$newQr;
        }
        $store['centers'][$i]['settings']['displaySettings']=normalizeDisplaySettings($incoming,$store['centers'][$i]['settings']);
    }
    $store['centers'][$i]['settings']=normalizeCenterSettings($store['centers'][$i]['settings'],$store['centers'][$i]['name']);
    $store=saveStore($jsonDbFile,$store,$cid);jsonOut(['success'=>true,'centerId'=>$cid,'displayMode'=>(($store['centers'][$i]['settings']['displaySettings']['mode']??'queue')==='media'?'media':'queue'),'settings'=>$store['centers'][$i]['settings'],'version'=>$store['centers'][$i]['version'],'lastUpdated'=>$store['centers'][$i]['lastUpdated']]);
}
if($route==='doctor/password'){if($role!=='doctor')deny('فقط پزشک می‌تواند رمز خودش را تغییر دهد.');$c=currentCenterOrDeny($session,$store);$i=centerIndex($store,$c['id']);$p=(string)($input['password']??'');if(strlen($p)<6)deny('رمز جدید باید حداقل ۶ کاراکتر باشد.',400);foreach($store['centers'][$i]['doctors'] as &$d)if($d['id']===$session['doctorId']){$d['passwordHash']=secureHash($p);$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true]);}deny('پزشک پیدا نشد.',404);}

if($route==='media/upload' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط مدیر سیستم می‌تواند رسانه نمایشگر را بارگذاری کند.',403);$c=currentCenterOrDeny($session,$store);$f=$_FILES['media']??null;
    if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)deny('فایل رسانه دریافت نشد.',400);if((int)($f['size']??0)>200*1024*1024)deny('حجم هر رسانه حداکثر ۲۰۰ مگابایت است.',400);
    $orig=(string)($f['name']??'media');$ext=strtolower(pathinfo($orig,PATHINFO_EXTENSION));
    $allowed=[
      'png'=>'image','jpg'=>'image','jpeg'=>'image','gif'=>'image','webp'=>'image','avif'=>'image','bmp'=>'image',
      'mp4'=>'video','m4v'=>'video','webm'=>'video','ogv'=>'video','mov'=>'video',
      'mp3'=>'audio','wav'=>'audio','ogg'=>'audio','oga'=>'audio','m4a'=>'audio','aac'=>'audio','flac'=>'audio',
      'pdf'=>'pdf','ppt'=>'office','pptx'=>'office','odp'=>'office'
    ];
    if(!isset($allowed[$ext]))deny('فرمت پشتیبانی نمی‌شود. تصاویر، ویدئوها، فایل‌های صوتی، PDF و فایل‌های ارائه PPT/PPTX/ODP قابل بارگذاری هستند.',400);
    $id='m'.bin2hex(random_bytes(6));$dest=$dataDir.'/center-media-'.sha1($c['id']).'-'.$id.'.'.$ext;if(!@move_uploaded_file($f['tmp_name'],$dest)){if(!@copy($f['tmp_name'],$dest))deny('ذخیره رسانه ناموفق بود.',500);}@chmod($dest,0640);
    $duration=in_array($allowed[$ext],['audio','video'],true)?30:12;
    jsonOut(['success'=>true,'media'=>['id'=>$id,'name'=>$orig,'type'=>$allowed[$ext],'extension'=>$ext,'url'=>'/api/media/file?centerId='.rawurlencode($c['id']).'&mediaId='.$id,'duration'=>$duration,'active'=>true]]);
}
if($route==='media/delete' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط مدیر سیستم می‌تواند رسانه را حذف کند.',403);$c=currentCenterOrDeny($session,$store);$id=preg_replace('/[^A-Za-z0-9_-]/','',(string)($input['mediaId']??''));if($id==='')deny('شناسه رسانه نامعتبر است.',400);$prefix=$dataDir.'/center-media-'.sha1($c['id']).'-'.$id.'.*';foreach(glob($prefix)?:[] as $f)@unlink($f);
    $i=centerIndex($store,$c['id']);$pl=$store['centers'][$i]['settings']['displaySettings']['mediaPlaylist']??[];$pl=is_array($pl)?array_values(array_filter($pl,fn($x)=>!is_array($x)||($x['id']??'')!==$id)):[];$store['centers'][$i]['settings']['displaySettings']['mediaPlaylist']=$pl;$store=saveStore($jsonDbFile,$store,$c['id']);jsonOut(['success'=>true,'version'=>$store['centers'][$i]['version']]);
}

if($route==='update/status'){
    if($role!=='super_admin')deny('فقط سوپرادمین به بخش آپدیت دسترسی دارد.');$state=jsonReadSafe(updateStatePath(),[]);$backups=readBackupIndex();foreach($backups as &$bb)$bb['sizeBytes']=(int)($bb['sizeBytes']??0);unset($bb);$trial=$state+['active'=>(bool)($state['active']??false),'remainingSeconds'=>!empty($state['expiresAt'])?max(0,(int)$state['expiresAt']-time()):0];if(empty($trial['active']))$trial=['active'=>false,'remainingSeconds'=>0];jsonOut(['success'=>true,'currentVersion'=>APP_VERSION,'trialState'=>$trial,'backups'=>$backups,'systemInfo'=>['php'=>PHP_VERSION,'dataWritable'=>is_writable($dataDir),'backupDir'=>backupDir(),'zipEngine'=>'PHP ZIP writer داخلی','maxUploadBytes'=>100*1024*1024]]);
}
if(str_starts_with($route,'update/upload/') && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند فایل آپدیت بارگذاری کند.');cleanupStaleUpdateUploads();
    if($route==='update/upload/start'){
        $name=trim((string)($input['name']??'update.zip'));$size=(int)($input['size']??0);$total=(int)($input['totalChunks']??0);if($size<1||$size>100*1024*1024)deny('حجم فایل آپدیت باید بین ۱ بایت تا ۱۰۰ مگابایت باشد.',400);if($total<1||$total>200)deny('تعداد قطعات فایل نامعتبر است.',400);$id='up-'.bin2hex(random_bytes(10));$meta=['id'=>$id,'name'=>$name,'size'=>$size,'totalChunks'=>$total,'createdAt'=>time(),'finalized'=>false];if(!atomicWrite(updateUploadMetaPath($id),json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)))deny('ایجاد نشست آپلود ناموفق بود.',500);jsonOut(['success'=>true,'uploadId'=>$id,'chunkSize'=>1200*1024,'totalChunks'=>$total]);
    }
    if($route==='update/upload/chunk'){
        $id=trim((string)($_POST['uploadId']??''));$index=(int)($_POST['index']??-1);if(!updateUploadId($id))deny('شناسه آپلود نامعتبر است.',400);$meta=jsonReadSafe(updateUploadMetaPath($id),[]);$total=(int)($meta['totalChunks']??0);if($index<0||$index>=$total)deny('شماره قطعه نامعتبر است.',400);$f=$_FILES['chunk']??null;if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)deny('قطعه فایل دریافت نشد.',400);if((int)($f['size']??0)>1400*1024)deny('اندازه قطعه بیش از حد مجاز است.',400);$dest=updateUploadPartPath($id,$index);if(!@move_uploaded_file($f['tmp_name'],$dest)){if(!@copy($f['tmp_name'],$dest))deny('ذخیره قطعه فایل ناموفق بود.',500);}jsonOut(['success'=>true,'uploadId'=>$id,'index'=>$index,'receivedBytes'=>(int)@filesize($dest)]);
    }
    if($route==='update/upload/finalize'){
        $id=trim((string)($input['uploadId']??''));if(!updateUploadId($id))deny('شناسه آپلود نامعتبر است.',400);try{$r=finalizeChunkedUpload($id);jsonOut(['success'=>true,'uploadId'=>$id,'fileName'=>$r['name'],'size'=>$r['size'],'sha256'=>$r['sha256']]);}catch(Throwable $e){deny('تجمیع فایل آپدیت ناموفق بود: '.$e->getMessage(),400);}
    }
}
if($route==='update/precheck' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند فایل آپدیت را بررسی کند.');$uploadId=trim((string)($input['uploadId']??''));$tmp='';$owned=false;$sourceName='';if($uploadId!==''){if(!updateUploadId($uploadId))deny('شناسه آپلود نامعتبر است.',400);$meta=jsonReadSafe(updateUploadMetaPath($uploadId),[]);$tmp=updateUploadFinalPath($uploadId);$sourceName=(string)($meta['name']??'update.zip');if(empty($meta['finalized'])||!is_file($tmp)){try{$r=finalizeChunkedUpload($uploadId);$tmp=$r['path'];}catch(Throwable $e){deny('فایل آپدیت هنوز کامل بارگذاری نشده است: '.$e->getMessage(),400);}}}else{$f=$_FILES['zipFile']??null;if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)deny('فایل ZIP دریافت نشد.',400);if((int)($f['size']??0)>100*1024*1024)deny('حجم فایل آپدیت نباید بیشتر از ۱۰۰ مگابایت باشد.',400);$tmp=$dataDir.'/update-precheck-'.bin2hex(random_bytes(5)).'.zip';$sourceName=$f['name'];$owned=true;if(!@move_uploaded_file($f['tmp_name'],$tmp)){if(!@copy($f['tmp_name'],$tmp))deny('ذخیره فایل موقت آپدیت ناموفق بود.',500);}}
    try{$info=packageInfo($tmp);$info['sourceFile']=$sourceName;jsonOut(['success'=>true,'validation'=>$info,'uploadId'=>$uploadId?:null]);}catch(Throwable $e){if($owned)@unlink($tmp);deny($e->getMessage(),400);}finally{if($owned)@unlink($tmp);}
}
if($route==='update/apply' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند آپدیت را اعمال کند.');$uploadId=trim((string)($input['uploadId']??''));$ownsTmp=false;$sourceName='';if($uploadId!==''){if(!updateUploadId($uploadId))deny('شناسه آپلود نامعتبر است.',400);try{$r=finalizeChunkedUpload($uploadId);$tmp=$r['path'];$meta=jsonReadSafe(updateUploadMetaPath($uploadId),[]);$sourceName=(string)($meta['name']??$r['name']??'update.zip');}catch(Throwable $e){deny('فایل آپدیت هنوز کامل نیست: '.$e->getMessage(),400);}}else{$f=$_FILES['zipFile']??null;if(!$f||($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)deny('فایل ZIP آپدیت دریافت نشد.',400);if((int)($f['size']??0)>100*1024*1024)deny('حجم فایل آپدیت نباید بیشتر از ۱۰۰ مگابایت باشد.',400);$tmp=$dataDir.'/update-pending-'.bin2hex(random_bytes(5)).'.zip';$sourceName=$f['name'];$ownsTmp=true;if(!@move_uploaded_file($f['tmp_name'],$tmp)){if(!@copy($f['tmp_name'],$tmp))deny('ذخیره بسته آپدیت ناموفق بود.',500);}}
    $stage=$dataDir.'/update-stage-'.bin2hex(random_bytes(5));
    try{
        $info=packageInfo($tmp);if(!$info['valid'])throw new RuntimeException('فایل آپدیت دارای خطا است: '.implode(' | ',$info['errors']));
        $backup=createSystemBackup(trim((string)($input['description']??''))?:'پشتیبان خودکار قبل از آپدیت');
        @mkdir($stage,0755,true);$extracted=extractPackageSafe($tmp,$stage,$info['base']);$installed=installStage($stage);if($installed<1)throw new RuntimeException('هیچ فایل مجاز برای نصب در بسته یافت نشد.');
        $state=['active'=>true,'backupId'=>$backup['id'],'startedAt'=>time(),'expiresAt'=>time()+300,'description'=>trim((string)($input['description']??''))?:('آپدیت '.$sourceName),'sourceFile'=>$sourceName,'sourceSha256'=>$info['sha256'],'sourceVersion'=>APP_VERSION,'targetVersion'=>$info['version']?:APP_VERSION];atomicWrite(updateStatePath(),json_encode($state,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
        if($uploadId){@unlink(updateUploadFinalPath($uploadId));@unlink(updateUploadMetaPath($uploadId));}
        jsonOut(['success'=>true,'message'=>'آپدیت با موفقیت اعمال شد. سیستم در حالت آزمایشی ۵ دقیقه‌ای قرار گرفت؛ پس از تست حتماً «تایید سلامت و نهایی‌سازی» را بزنید.','extractedCount'=>$installed,'backupId'=>$backup['id'],'trialUntil'=>$state['expiresAt'],'validation'=>$info]);
    }catch(Throwable $e){
        try{ if(isset($backup['id']))restoreBackup($backup['id']); }catch(Throwable $rb){ error_log('Bastian update rollback: '.$rb->getMessage()); }
        deny('اعمال آپدیت ناموفق بود و سیستم به وضعیت پایدار قبل بازگردانده شد: '.$e->getMessage(),500);
    }finally{
        if(is_dir($stage)){ $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($stage,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $fi){$fi->isDir()?@rmdir($fi->getPathname()):@unlink($fi->getPathname());}@rmdir($stage); }
        if($ownsTmp)@unlink($tmp);
    }
}
if($route==='update/commit' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند آپدیت را نهایی کند.');$state=jsonReadSafe(updateStatePath(),[]);if(empty($state['active']))deny('هیچ آپدیت آزمایشی فعالی وجود ندارد.',409);$state['active']=false;$state['committedAt']=time();atomicWrite(updateStatePath(),json_encode($state,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));jsonOut(['success'=>true,'message'=>'آپدیت با موفقیت تایید و نهایی شد.']);
}
if($route==='update/rollback' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند سیستم را بازیابی کند.');$state=jsonReadSafe(updateStatePath(),[]);$id=trim((string)($input['backupId']??$state['backupId']??''));if(!$id)deny('نسخه پشتیبان برای بازیابی مشخص نشده است.',400);try{$count=restoreBackup($id);$state['active']=false;$state['rolledBackAt']=time();atomicWrite(updateStatePath(),json_encode($state,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));jsonOut(['success'=>true,'message'=>'سیستم با موفقیت از نسخه پشتیبان بازیابی شد.','restoredCount'=>$count,'backupId'=>$id]);}catch(Throwable $e){deny('بازیابی ناموفق بود: '.$e->getMessage(),500);}
}
if($route==='update/backup/create' && $_SERVER['REQUEST_METHOD']==='POST'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند پشتیبان تهیه کند.');try{$m=createSystemBackup(trim((string)($input['description']??''))?:'پشتیبان‌گیری دستی توسط مدیر سیستم');jsonOut(['success'=>true,'message'=>'نسخه پشتیبان کامل با موفقیت تهیه شد.','backup'=>$m]);}catch(Throwable $e){deny('تهیه پشتیبان ناموفق بود: '.$e->getMessage(),500);}
}
if(str_starts_with($route,'update/backup/download/')){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند پشتیبان را دانلود کند.');$id=substr($route,strlen('update/backup/download/'));if(!preg_match('/^backup-[A-Za-z0-9._-]+$/',$id))deny('شناسه پشتیبان نامعتبر است.',400);$file=backupDir().'/'.$id.'.zip';if(!is_file($file))deny('فایل پشتیبان پیدا نشد.',404);header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="'.rawurlencode($id).'.zip"');header('Content-Length: '.filesize($file));header('Cache-Control: no-store');readfile($file);exit;
}
if($route==='update/export-full-zip'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند بسته کامل را دریافت کند.');$tmp=sys_get_temp_dir().'/bastian-export-'.bin2hex(random_bytes(5)).'.zip';try{$z=createZipFromFiles($tmp,collectBackupFiles());header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="bastian-clinic-full-backup-'.date('Ymd-His').'.zip"');header('Content-Length: '.filesize($tmp));header('Cache-Control: no-store');readfile($tmp);@unlink($tmp);exit;}catch(Throwable $e){@unlink($tmp);deny('تولید بسته کامل ناموفق بود: '.$e->getMessage(),500);}
}
if($route==='update/backup/' && $_SERVER['REQUEST_METHOD']==='DELETE')deny('شناسه نسخه پشتیبان مشخص نشده است.',400);
if(str_starts_with($route,'update/backup/') && $_SERVER['REQUEST_METHOD']==='DELETE'){
    if($role!=='super_admin')deny('فقط سوپرادمین می‌تواند پشتیبان را حذف کند.');$id=substr($route,strlen('update/backup/'));if(!$id||strpos($id,'download/')===0)deny('شناسه پشتیبان نامعتبر است.',400);$state=jsonReadSafe(updateStatePath(),[]);if(($state['backupId']??'')===$id&&($state['active']??false))deny('نسخه پشتیبان مورد استفاده آپدیت آزمایشی را نمی‌توان حذف کرد.',409);if(!deleteBackupById($id))deny('نسخه پشتیبان پیدا نشد.',404);jsonOut(['success'=>true,'message'=>'نسخه پشتیبان حذف شد.']);
}
if($route==='update/check')jsonOut(['success'=>true,'currentVersion'=>APP_VERSION,'latestVersion'=>APP_VERSION,'hasUpdate'=>false,'releaseNotes'=>[
'ادغام کامل دو رابط فراخوان پزشک در یک پنل واحد',
'سه اقدام اصلی در کارت بیمار جاری: فراخوان نفر بعد، تکرار فراخوان و پایان ویزیت',
'فراخوان نفر بعد دیگر پایان ویزیت ثبت نمی‌کند و بیمار مراجعه‌نکرده را در چرخه انتظار نگه می‌دارد',
'گردش صف از اولین نوبتی که پایان ویزیت نخورده است',
'ثبت تعداد و زمان تمام فراخوان‌های هر شماره نوبت',
'بستن نوبت‌دهی به معنی پایان پذیرش جدید است و نوبت‌های ثبت‌شده قبلی همچنان فراخوان می‌شوند',
'دیپلوی کدمحور بدون بازنویسی data و بدون نیاز به نصب مجدد پنل‌های Windows'
]]);


// مسیرهای قدیمی کاربران عمداً بسته شده‌اند تا مدل قدیمی دوباره وارد سامانه نشود.

jsonOut(['success'=>false,'error'=>'API Route not found: '.$route],404);
