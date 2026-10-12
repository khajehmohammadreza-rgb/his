<?php
/** Disaster-recovery DB restore. CLI only.
 * New backup: php restore_backup_cli.php /path/database.bastiyanbak --confirm=RESTORE
 * Old v1 backups are also supported.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/config.php';
require_once __DIR__.'/recovery_lib.php';
$file=$argv[1]??'';$confirm=$argv[2]??'';
if(!$file||$confirm!=='--confirm=RESTORE'){fwrite(STDERR,"Usage: php restore_backup_cli.php /path/backup.bastiyanbak --confirm=RESTORE\n");exit(2);}
if(!is_file($file)){fwrite(STDERR,"Backup file not found.\n");exit(2);}
$env=json_decode((string)file_get_contents($file),true);
try {
    if(is_array($env)&&($env['format']??'')==='bastiyan-his-aes256gcm-recovery-v1'){
        $r=bastianRecoveryRestoreDatabase($file);
        echo "Restore completed: {$r['tables']} tables, {$r['rows']} rows.\n"; exit;
    }
    if(!is_array($env)||($env['format']??'')!=='bastian-his-aes256gcm-v1')throw new RuntimeException('Invalid backup envelope.');
    if(!defined('BASTIAN_BACKUP_KEY')||!BASTIAN_BACKUP_KEY)throw new RuntimeException('BASTIAN_BACKUP_KEY is missing.');
    $key=hash('sha256',BASTIAN_BACKUP_KEY,true);
    $plain=openssl_decrypt(base64_decode($env['data']??''),'aes-256-gcm',$key,OPENSSL_RAW_DATA,base64_decode($env['iv']??''),base64_decode($env['tag']??''),'BASTIYAN-HIS-BACKUP-V1');
    if($plain===false||!hash_equals((string)($env['sha256']??''),hash('sha256',$plain)))throw new RuntimeException('Backup authentication/decryption failed.');
    $data=json_decode($plain,true);if(!is_array($data)||empty($data['tables']))throw new RuntimeException('Backup payload invalid.');
    $pdo=bastianPdo();$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach($data['tables'] as $t=>$rows){
        if(!preg_match('/^bastian_[A-Za-z0-9_]+$/',(string)$t))continue;
        $quoted='`'.str_replace('`','``',(string)$t).'`';$pdo->exec('DELETE FROM '.$quoted);
        foreach((array)$rows as $row){if(!is_array($row)||!$row)continue;$cols=array_keys($row);$sql='INSERT INTO '.$quoted.' (`'.implode('`,`',$cols).'`) VALUES ('.implode(',',array_fill(0,count($cols),'?')).')';$st=$pdo->prepare($sql);$st->execute(array_values($row));}
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');echo "Legacy restore completed successfully.\n";
} catch(Throwable $e){try{if(isset($pdo))$pdo->exec('SET FOREIGN_KEY_CHECKS=1');}catch(Throwable $ignored){}fwrite(STDERR,"Restore failed: ".$e->getMessage()."\n");exit(6);}
