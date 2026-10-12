<?php
// Server-side panel gate. HTML alone is never sufficient for protected panels.
declare(strict_types=1);
$token=trim((string)($_COOKIE['bastian_session']??''));
$sessionsFile=__DIR__.'/data/sessions_store.json';
$ok=false;$role='';$expires=0;
if($token && is_file($sessionsFile)){
  $raw=@file_get_contents($sessionsFile); $rows=json_decode((string)$raw,true);
  if(is_array($rows)){
    foreach($rows as $s){
      if(is_array($s) && isset($s['token']) && hash_equals((string)$s['token'],$token) && (int)($s['expiresAt']??0)>time()){
        $ok=true;$role=(string)($s['role']??'');$expires=(int)$s['expiresAt'];break;
      }
    }
  }
}
$page=preg_replace('/[^a-z-]/','',(string)($_GET['page']??''));
$map=[
 'admin'=>['file'=>'center-management.html','roles'=>['super_admin']],
 'center-settings'=>['file'=>'index.html','roles'=>['super_admin']],
 'users'=>['file'=>'user-management.html','roles'=>['super_admin']],
 'doctor'=>['file'=>'index.html','roles'=>['super_admin','doctor']],
 'secretary'=>['file'=>'index.html','roles'=>['super_admin','secretary']],
 'update'=>['file'=>'index.html','roles'=>['super_admin']],
 'tv'=>['file'=>'tv.html','roles'=>['display','super_admin','doctor','secretary']],
];
if(!$ok || !isset($map[$page]) || !in_array($role,$map[$page]['roles'],true)){
  http_response_code(302); header('Location: /?auth=required'); exit;
}
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
readfile(__DIR__.'/'.$map[$page]['file']);
