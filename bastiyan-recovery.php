<?php
/**
 * Bastiyan HIS Standalone Emergency Recovery Console
 * This file intentionally does not bootstrap the HIS runtime.
 */

declare(strict_types=1);
@ini_set('display_errors', '0');
@set_time_limit(300);
$ROOT = __DIR__;
$DATA = $ROOT . '/api/data/disaster_recovery';
$SNAPSHOTS = $DATA . '/snapshots';
$LEGACY = $ROOT . '/api/data/update_runtime/backups';
$UNLOCK = $ROOT . '/BASTIYAN_RECOVERY_UNLOCK.txt';
$UNLOCK_MAGIC = 'BASTIYAN-RECOVERY-UNLOCK-V1';

function rr_norm(string $p): string { return ltrim(str_replace('\\','/',$p),'/'); }
function rr_managed(string $p): bool {
    $p=rr_norm($p);
    if($p===''||str_contains($p,"\0")||str_contains($p,'../'))return false;
    foreach(['api/config.local.php','api/data/','uploads/','downloads/','.git/','node_modules/','backup/','src/','deploy/','BASTIYAN_RECOVERY_UNLOCK.txt'] as $x){if($p===rtrim($x,'/')||str_starts_with($p,$x))return false;}
    foreach(['app/','vendor/','assets/','fonts/'] as $x)if(str_starts_with($p,$x))return true;
    if(str_starts_with($p,'api/'))return (bool)preg_match('/\.(?:php|htaccess|txt|json)$/i',$p)||str_ends_with($p,'/.htaccess');
    return in_array($p,['.htaccess','.user.ini','index.html','portal.js','portal.css','manifest.json','service-worker.js','server-center.html','install-client.html','center-logo-placeholder.svg','favicon.ico','logo.png','logo.jpg','icon.png','bastiyan-logo.png','version.json','bastiyan-recovery.php','BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt'],true);
}
function rr_scan(string $root): array {
    $out=[];
    $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::LEAVES_ONLY);
    foreach($it as $f){if(!$f->isFile()||$f->isLink())continue;$full=$f->getPathname();$rel=rr_norm(substr($full,strlen(rtrim($root,DIRECTORY_SEPARATOR))+1));if(rr_managed($rel))$out[$rel]=true;}
    return $out;
}
function rr_list(string $snapshots,string $legacy): array {
    $rows=[];
    foreach(glob($snapshots.'/*',GLOB_ONLYDIR)?:[] as $d){$m=json_decode((string)@file_get_contents($d.'/snapshot.json'),true);if(!is_array($m)||empty($m['complete']))continue;$rows[]=['id'=>basename($d),'type'=>'snapshot','version'=>(string)($m['version']??''),'to'=>(string)($m['targetVersion']??''),'reason'=>(string)($m['reason']??''),'createdAt'=>(string)($m['createdAt']??''),'runtime'=>!empty($m['runtimeIncluded']),'database'=>!empty($m['databaseIncluded']),'meta'=>$m];}
    foreach(glob($legacy.'/*',GLOB_ONLYDIR)?:[] as $d){$m=json_decode((string)@file_get_contents($d.'/backup.json'),true);if(!is_array($m))continue;$rows[]=['id'=>basename($d),'type'=>'legacy','version'=>(string)($m['fromVersion']??''),'to'=>(string)($m['toVersion']??''),'reason'=>'legacy_updater_backup','createdAt'=>(string)($m['createdAt']??''),'runtime'=>true,'database'=>false,'meta'=>$m];}
    usort($rows,fn($a,$b)=>strcmp($b['createdAt'],$a['createdAt']));return $rows;
}
function rr_restore_snapshot(string $root,string $snapshots,array $row): array {
    $id=$row['id'];if(!preg_match('/^[A-Za-z0-9_-]+$/',$id))throw new RuntimeException('شناسه پشتیبان نامعتبر است.');
    $dir=$snapshots.'/'.$id;$meta=json_decode((string)@file_get_contents($dir.'/snapshot.json'),true);if(!is_array($meta)||empty($meta['runtimeIncluded'])||!is_array($meta['runtimeManifest']??null))throw new RuntimeException('پشتیبان Runtime معتبر نیست.');
    $manifest=$meta['runtimeManifest'];
    foreach($manifest as $rel=>$fm){$src=$dir.'/runtime/'.rr_norm((string)$rel);if(!is_file($src))throw new RuntimeException('فایل پشتیبان موجود نیست: '.$rel);$h=hash_file('sha256',$src);if(!hash_equals((string)($fm['sha256']??''),$h))throw new RuntimeException('هش فایل پشتیبان معتبر نیست: '.$rel);}
    $current=rr_scan($root);$keep=array_fill_keys(array_keys($manifest),true);$keep['bastiyan-recovery.php']=true;$keep['BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt']=true;
    foreach(array_keys($current) as $rel){if(isset($keep[$rel]))continue;$target=$root.'/'.$rel;if(is_file($target))@unlink($target);}
    $count=0;
    foreach($manifest as $rel=>$fm){$rel=rr_norm((string)$rel);if(!rr_managed($rel))continue;$src=$dir.'/runtime/'.$rel;$dst=$root.'/'.$rel;if(!is_dir(dirname($dst)))@mkdir(dirname($dst),0755,true);$tmp=$dst.'.rr-'.bin2hex(random_bytes(3));if(!@copy($src,$tmp)||!@rename($tmp,$dst)){@unlink($tmp);throw new RuntimeException('بازیابی فایل انجام نشد: '.$rel);}if(!empty($fm['mode']))@chmod($dst,octdec((string)$fm['mode']));$count++;}
    return ['files'=>$count,'version'=>(string)($meta['version']??'')];
}
function rr_restore_legacy(string $root,string $legacy,array $row): array {
    $id=$row['id'];if(!preg_match('/^[A-Za-z0-9_-]+$/',$id))throw new RuntimeException('شناسه پشتیبان نامعتبر است.');$dir=$legacy.'/'.$id;$m=json_decode((string)@file_get_contents($dir.'/backup.json'),true);if(!is_array($m))throw new RuntimeException('پشتیبان قدیمی یافت نشد.');$count=0;
    foreach((array)($m['backedUpFiles']??[]) as $rel){$rel=rr_norm((string)$rel);$src=$dir.'/files/'.$rel;$dst=$root.'/'.$rel;if(!is_file($src))throw new RuntimeException('فایل پشتیبان ناقص است: '.$rel);if(!is_dir(dirname($dst)))@mkdir(dirname($dst),0755,true);$tmp=$dst.'.rrlegacy';if(!@copy($src,$tmp)||!@rename($tmp,$dst)){@unlink($tmp);throw new RuntimeException('بازیابی فایل انجام نشد: '.$rel);}$count++;}
    foreach((array)($m['newFiles']??[]) as $rel){$rel=rr_norm((string)$rel);if(in_array($rel,['bastiyan-recovery.php','BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt'],true))continue;if(rr_managed($rel))@unlink($root.'/'.$rel);}
    return ['files'=>$count,'version'=>(string)($m['fromVersion']??'')];
}
function rr_restore_db(string $root,string $snapshotId): array {
    // Database restore is intentionally delegated to the server-side recovery library.
    $config=$root.'/api/config.php';$lib=$root.'/api/recovery_lib.php';if(!is_file($config)||!is_file($lib))throw new RuntimeException('کتابخانه بازیابی دیتابیس در دسترس نیست.');
    require_once $config;require_once $lib;
    $file=$root.'/api/data/disaster_recovery/snapshots/'.$snapshotId.'/database.bastiyanbak';return bastianRecoveryRestoreDatabase($file);
}
function rr_unlocked(string $file,string $magic): bool {
    if(PHP_SAPI==='cli')return true;if(!is_file($file))return false;if(time()-((int)@filemtime($file))>1800)return false;$first=trim((string)strtok((string)@file_get_contents($file),"\r\n"));return hash_equals($magic,$first);
}
function rr_html(string $s): string{return htmlspecialchars($s,ENT_QUOTES,'UTF-8');}

if(!rr_unlocked($UNLOCK,$UNLOCK_MAGIC)){http_response_code(404);exit('Not Found');}
$rows=rr_list($SNAPSHOTS,$LEGACY);

if(PHP_SAPI==='cli'){
    $arg=$argv[1]??'--list';if($arg==='--list'){foreach($rows as $r)echo $r['id']."\t".$r['type']."\t".$r['version']."\t".$r['createdAt']."\n";exit;}
    $target='';if(str_starts_with($arg,'--restore='))$target=substr($arg,10);if($target==='latest'&&$rows)$target=$rows[0]['id'];$row=null;foreach($rows as $r)if($r['id']===$target){$row=$r;break;}if(!$row){fwrite(STDERR,"Backup not found\n");exit(2);}try{$res=$row['type']==='legacy'?rr_restore_legacy($ROOT,$LEGACY,$row):rr_restore_snapshot($ROOT,$SNAPSHOTS,$row);echo "Restored {$res['version']} ({$res['files']} files)\n";exit;}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(3);}
}

session_start();if(empty($_SESSION['bastiyan_recovery_csrf']))$_SESSION['bastiyan_recovery_csrf']=bin2hex(random_bytes(16));$csrf=$_SESSION['bastiyan_recovery_csrf'];$message='';$error='';
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
    try{
        if(!hash_equals($csrf,(string)($_POST['csrf']??'')))throw new RuntimeException('درخواست معتبر نیست.');$id=(string)($_POST['id']??'');$action=(string)($_POST['action']??'runtime');$row=null;foreach($rows as $r)if($r['id']===$id){$row=$r;break;}if(!$row)throw new RuntimeException('نسخه پشتیبان پیدا نشد.');
        if($action==='full'&&($row['type']!=='snapshot'||empty($row['database'])))throw new RuntimeException('این نسخه بکاپ دیتابیس ندارد.');
        if((string)($_POST['confirm']??'')!=='RESTORE')throw new RuntimeException('برای بازیابی عبارت RESTORE را وارد کنید.');
        $res=$row['type']==='legacy'?rr_restore_legacy($ROOT,$LEGACY,$row):rr_restore_snapshot($ROOT,$SNAPSHOTS,$row);if($action==='full')$db=rr_restore_db($ROOT,$id);@unlink($UNLOCK);$message='بازیابی نسخه '.($res['version']?:$id).' با موفقیت انجام شد. تعداد فایل: '.$res['files'].($action==='full'?' • دیتابیس نیز بازیابی شد.':' • دیتابیس فعلی دست‌نخورده ماند.');
    }catch(Throwable $e){$error=$e->getMessage();}
    $rows=rr_list($SNAPSHOTS,$LEGACY);
}
?><!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بازیابی اضطراری Bastiyan HIS</title><style>@font-face{font-family:BN;src:url('./fonts/BNazanin.woff')}@font-face{font-family:BT;src:url('./fonts/BTitr.woff')}*{box-sizing:border-box}body{margin:0;background:#020617;color:#e2e8f0;font-family:BN,Tahoma,sans-serif}.wrap{max-width:980px;margin:40px auto;padding:20px}.card{background:#0f172a;border:1px solid #334155;border-radius:22px;padding:24px;margin-bottom:18px}h1,h2{font-family:BT,BN,sans-serif;color:#fff}.ok{background:#064e3b;color:#d1fae5;padding:14px;border-radius:12px}.err{background:#7f1d1d;color:#fee2e2;padding:14px;border-radius:12px}.note{background:#172554;color:#dbeafe;padding:14px;border-radius:12px;line-height:2}.row{display:flex;gap:14px;align-items:center;justify-content:space-between;border-top:1px solid #334155;padding:16px 0}.meta{font-size:13px;color:#94a3b8}.btn{border:0;border-radius:10px;padding:10px 16px;background:#0f766e;color:#fff;font-family:BN;font-weight:bold;cursor:pointer}.danger{background:#b91c1c}.muted{background:#334155}input{background:#020617;border:1px solid #475569;color:#fff;border-radius:9px;padding:10px;width:110px}form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}@media(max-width:700px){.row{align-items:stretch;flex-direction:column}.wrap{margin:10px auto;padding:10px}}</style></head><body><div class="wrap"><div class="card"><h1>بازیابی اضطراری Bastiyan HIS</h1><div class="note">این صفحه مستقل از رابط HIS اجرا می‌شود. برای حالت معمول ابتدا «فقط فایل‌های برنامه» را بازیابی کنید؛ دیتابیس فقط زمانی بازیابی شود که خود اطلاعات دیتابیس هم آسیب دیده باشد. قفل اضطراری پس از بازیابی موفق خودکار حذف می‌شود.</div><?php if($message):?><p class="ok"><?=rr_html($message)?></p><p><a class="btn" href="./">بازگشت به سامانه</a></p><?php endif;?><?php if($error):?><p class="err"><?=rr_html($error)?></p><?php endif;?></div><div class="card"><h2>نسخه‌های قابل بازیابی</h2><?php if(!$rows):?><p>هیچ پشتیبانی پیدا نشد.</p><?php endif;?><?php foreach($rows as $r):?><div class="row"><div><b>نسخه <?=rr_html($r['version']?:'-')?></b> <span class="meta">← قبل از <?=rr_html($r['to']?:'-')?></span><div class="meta"><?=rr_html($r['createdAt']?:'-')?> • <?=rr_html($r['type']==='legacy'?'پشتیبان خودکار آپدیتر':'Snapshot کامل')?><?=!empty($r['database'])?' • دیتابیس دارد':''?></div></div><form method="post"><input type="hidden" name="csrf" value="<?=rr_html($csrf)?>"><input type="hidden" name="id" value="<?=rr_html($r['id'])?>"><input name="confirm" placeholder="RESTORE" autocomplete="off" required><button class="btn" name="action" value="runtime">فقط فایل‌های برنامه</button><?php if(!empty($r['database'])):?><button class="btn danger" name="action" value="full" onclick="return confirm('دیتابیس فعلی نیز با نسخه بکاپ جایگزین شود؟')">فایل‌ها + دیتابیس</button><?php endif;?></form></div><?php endforeach;?></div><div class="card"><h2>روش سریع از File Manager</h2><div class="note">برای فعال‌کردن این صفحه، فایل <b>BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt</b> را در همان پوشه کپی کنید و نام کپی را <b>BASTIYAN_RECOVERY_UNLOCK.txt</b> بگذارید، سپس bastiyan-recovery.php را باز کنید. فایل Unlock فقط ۳۰ دقیقه معتبر است.</div></div></div></body></html>
