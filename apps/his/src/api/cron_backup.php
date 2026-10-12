<?php
/**
 * Bastiyan HIS R21 scheduled backup runner.
 * Run frequently (recommended every 5-15 minutes); each center decides whether a backup is due.
 * DirectAdmin/Chabokan cron example: php /full/path/public_html/api/cron_backup.php
 */
require_once __DIR__.'/config.php';
require_once __DIR__.'/recovery_lib.php';
$cli = PHP_SAPI === 'cli';
$keyHeader = $_SERVER['HTTP_X_BACKUP_KEY'] ?? ($_GET['key'] ?? '');
if (!$cli && (!defined('BASTIAN_BACKUP_KEY') || !BASTIAN_BACKUP_KEY || !hash_equals((string)BASTIAN_BACKUP_KEY,(string)$keyHeader))) { http_response_code(403); exit('Forbidden'); }
if (!bastianDbEnabled()) { http_response_code(503); exit('Database not configured'); }
header('Content-Type: application/json; charset=utf-8');

function bastianBackupParseTimes($raw): array {
    if(is_string($raw)) $raw=preg_split('/\s*,\s*/',$raw,-1,PREG_SPLIT_NO_EMPTY);
    if(!is_array($raw))$raw=[];$out=[];
    foreach($raw as $v){$v=trim((string)$v);if(preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/',$v))$out[]=$v;}
    return array_values(array_unique($out));
}
function bastianBackupDue(array $settings, ?string $lastAt, DateTimeImmutable $now): array {
    $enabled=array_key_exists('autoBackupEnabled',$settings)?(bool)$settings['autoBackupEnabled']:true;
    if(!$enabled)return [false,'disabled'];
    $lastTs=$lastAt?strtotime($lastAt):0;$mode=(string)($settings['autoBackupMode']??'interval');
    if($mode==='times'){
        $times=bastianBackupParseTimes($settings['autoBackupTimes']??['02:00']);if(!$times)$times=['02:00'];
        foreach($times as $t){[$h,$m]=array_map('intval',explode(':',$t));$scheduled=$now->setTime($h,$m,0);if($scheduled<=$now && $lastTs<$scheduled->getTimestamp())return [true,'daily_'.$t];}
        return [false,'not_due'];
    }
    $hours=max(1,min(720,(int)($settings['autoBackupIntervalHours']??24)));
    return [!$lastTs || ($now->getTimestamp()-$lastTs)>=($hours*3600),'interval_'.$hours.'h'];
}
function bastianBackupPruneCenter(string $centerId,int $retention): void {
    $retention=max(1,min(365,$retention));$pdo=bastianPdo();
    $st=$pdo->prepare("DELETE FROM bastian_center_backups WHERE center_id=? AND id NOT IN (SELECT id FROM (SELECT id FROM bastian_center_backups WHERE center_id=? ORDER BY id DESC LIMIT {$retention}) keepers)");$st->execute([$centerId,$centerId]);
}
try {
    $tz=new DateTimeZone('Asia/Tehran');$now=new DateTimeImmutable('now',$tz);$results=[];$created=0;
    foreach(bastianDbCenters(false) as $center){
        $centerId=(string)($center['id']??'');if($centerId==='')continue;
        $online=bastianDbOnlineRead($centerId,true);$state=(array)($online['state']??[]);$settings=(array)($state['settings']??[]);$stats=bastianDbBackupStats($centerId);
        [$due,$reason]=bastianBackupDue($settings,$stats['lastBackupDate']??null,$now);
        if($due){$ok=bastianDbBackupState($centerId,'scheduled_'.$reason,true);if($ok){$created++;bastianBackupPruneCenter($centerId,(int)($settings['autoBackupRetentionCount']??30));}}
        $results[]=['centerId'=>$centerId,'centerName'=>$center['name']??'','due'=>$due,'created'=>$due?($ok??false):false,'reason'=>$reason,'lastBackupDate'=>$stats['lastBackupDate']??null];
    }
    // One encrypted database disaster-recovery snapshot per cron run only when at least one center was due.
    $snapshot=null;
    if($created>0){
        $snapshot=bastianRecoveryCreateSnapshot('scheduled', ['runtime'=>false,'database'=>true]);
        $dbPath=bastianRecoverySnapshotsDir().$snapshot['id'].'/database.bastiyanbak';
        if(is_file($dbPath)&&defined('FULL_BACKUPS_DIR')){$compat=FULL_BACKUPS_DIR.'bastiyan_full_'.date('Ymd_His').'.bastianbak';@copy($dbPath,$compat);@chmod($compat,0640);$files=glob(FULL_BACKUPS_DIR.'bastiyan_full_*.bastianbak')?:[];rsort($files);$ret=defined('BASTIAN_FULL_BACKUP_RETENTION')?(int)BASTIAN_FULL_BACKUP_RETENTION:30;foreach(array_slice($files,max(1,$ret)) as $old)@unlink($old);}
        if(function_exists('bastianAudit'))bastianAudit('backup.full',null,'system','cron','backup',(string)$snapshot['id'],['centersBackedUp'=>$created]);
    }
    echo json_encode(['success'=>true,'serverTime'=>$now->format(DATE_ATOM),'timezone'=>'Asia/Tehran','centersBackedUp'=>$created,'snapshotId'=>$snapshot['id']??null,'centers'=>$results],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
} catch(Throwable $e) { http_response_code(500); echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE); }
