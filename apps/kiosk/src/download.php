<?php
/**
 * Bastiyan Healthcare Systems - Windows native client package generator v3.3.20
 * Windows-first architecture: real NSIS/Electron Setup.exe + center-bound client.json.
 * Legacy VBS/PowerShell/browser launchers are intentionally NOT generated anymore.
 */
header('X-Content-Type-Options: nosniff');
$dataDir=__DIR__.'/data';
$sessionsFile=$dataDir.'/sessions_store.json';
$storeFile=$dataDir.'/clinic_store.json';
function failDl(string $msg,int $code=400,array $extra=[]):void{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge(['success'=>false,'error'=>$msg],$extra),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    exit;
}
function bearerDl():string{
    $a=$_SERVER['HTTP_AUTHORIZATION']??'';
    if(stripos($a,'Bearer ')===0)return trim(substr($a,7));
    if(isset($_GET['token']))return trim((string)$_GET['token']);
    return trim((string)($_COOKIE['bastian_session']??''));
}
function adminSessionDl(string $sessionsFile):?array{
    $token=bearerDl();
    if($token===''||!is_file($sessionsFile))return null;
    $d=json_decode((string)@file_get_contents($sessionsFile),true);
    if(!is_array($d))return null;
    $now=time();
    foreach($d as $s)if(is_array($s)&&($s['role']??'')==='super_admin'&&(int)($s['expiresAt']??0)>$now&&isset($s['token'])&&hash_equals((string)$s['token'],$token))return $s;
    return null;
}
if(!adminSessionDl($sessionsFile))failDl('فقط سوپرادمین واردشده می‌تواند نسخه‌های نصب‌شونده را دریافت کند.',403);

$pkg=trim((string)($_GET['pkg']??''));
$centerId=trim((string)($_GET['centerId']??''));
$roles=['doctor','secretary','display','super_admin'];
if(!in_array($pkg,$roles,true))failDl('نوع نسخه نامعتبر است.');
if($centerId==='')failDl('مرکز مشخص نشده است.');
$store=is_file($storeFile)?json_decode((string)@file_get_contents($storeFile),true):null;
if(!is_array($store))failDl('داده مراکز قابل خواندن نیست.',500);
$center=null;
foreach($store['centers']??[] as $c)if((string)($c['id']??'')===$centerId){$center=$c;break;}
if(!$center)failDl('مرکز انتخاب‌شده پیدا نشد.',404);

function clientSecretDl(string $dataDir):string{
    $file=$dataDir.'/.client_package_secret';$lock=$file.'.lock';
    $read=function()use($file){if(!is_file($file))return '';$v=trim((string)@file_get_contents($file));return preg_match('/^[a-f0-9]{64}$/i',$v)?strtolower($v):'';};
    $v=$read();if($v!=='')return $v;
    $h=@fopen($lock,'c');
    if($h){@flock($h,LOCK_EX);$v=$read();if($v===''){$v=bin2hex(random_bytes(32));@file_put_contents($file,$v,LOCK_EX);@chmod($file,0640);}@flock($h,LOCK_UN);@fclose($h);return $v;}
    $v=bin2hex(random_bytes(32));@file_put_contents($file,$v,LOCK_EX);@chmod($file,0640);return $v;
}
function packageSigDl(string $dataDir,string $centerId,string $role):string{return hash_hmac('sha256','bastian-client-v1|'.$centerId.'|'.$role,clientSecretDl($dataDir));}
function zipDosTimeDl(?int $ts=null):array{
    $ts=$ts??time(); $d=getdate($ts); $year=max(1980,(int)$d['year']);
    $time=((int)$d['hours']<<11)|((int)$d['minutes']<<5)|((int)$d['seconds']>>1);
    $date=(($year-1980)<<9)|((int)$d['mon']<<5)|(int)$d['mday'];
    return [$time,$date];
}
function buildZipStoreDl(array $entries,string $target):void{
    [$dosTime,$dosDate]=zipDosTimeDl(); $offset=0; $central=''; $count=0;
    $fh=@fopen($target,'wb'); if(!$fh)throw new RuntimeException('ایجاد فایل ZIP موقت ممکن نشد.');
    try{
        foreach($entries as $name=>$data){
            $name=str_replace('\\','/',(string)$name); $data=(string)$data; $nameBytes=$name;
            $crc=(int)sprintf('%u',crc32($data)); $size=strlen($data); $nlen=strlen($nameBytes); $flags=0x0800;
            $local=pack('VvvvvvVVVvv',0x04034b50,20,$flags,0,$dosTime,$dosDate,$crc,$size,$size,$nlen,0).$nameBytes;
            if(fwrite($fh,$local)!==strlen($local)||($size>0&&fwrite($fh,$data)!==$size))throw new RuntimeException('نوشتن محتویات ZIP ناموفق بود.');
            $central.=pack('VvvvvvvVVVvvvvvVV',0x02014b50,20,20,$flags,0,$dosTime,$dosDate,$crc,$size,$size,$nlen,0,0,0,0,0,$offset).$nameBytes;
            $offset+=strlen($local)+$size; $count++;
        }
        $centralOffset=$offset; $centralSize=strlen($central);
        if($centralSize>0&&fwrite($fh,$central)!==$centralSize)throw new RuntimeException('نوشتن فهرست ZIP ناموفق بود.');
        $eocd=pack('VvvvvVVv',0x06054b50,0,0,$count,$count,$centralSize,$centralOffset,0);
        if(fwrite($fh,$eocd)!==strlen($eocd))throw new RuntimeException('تکمیل ZIP ناموفق بود.');
    } finally { fclose($fh); }
}
function baseUrlDl():string{
    $proto=strtolower(trim(explode(',',(string)($_SERVER['HTTP_X_FORWARDED_PROTO']??''))[0]??''));
    if(!in_array($proto,['http','https'],true))$proto=(!empty($_SERVER['HTTPS'])&&strtolower((string)$_SERVER['HTTPS'])!=='off')?'https':'http';
    $host=trim(explode(',',(string)($_SERVER['HTTP_X_FORWARDED_HOST']??$_SERVER['HTTP_HOST']??'localhost'))[0]);
    $host=preg_replace('/[^A-Za-z0-9.\-:\[\]]/','',$host);
    return $proto.'://'.$host;
}
$meta=[
 'doctor'=>['fa'=>'پزشک','en'=>'Doctor','desc'=>'پنل مستقل پزشک با ورود فارسی/نام کاربری و دسترسی نقش‌محور'],
 'secretary'=>['fa'=>'منشی','en'=>'Secretary','desc'=>'پنل مستقل منشی برای ثبت، مدیریت نوبت و صف'],
 'display'=>['fa'=>'نمایشگر','en'=>'Display','desc'=>'نمایشگر سالن با اعلان صوتی و اجرای تمام‌صفحه'],
 'super_admin'=>['fa'=>'سوپرادمین','en'=>'SuperAdmin','desc'=>'مدیریت کامل باستیان با دسترسی سوپرادمین']
][$pkg];
$base=baseUrlDl();
$sig=packageSigDl($dataDir,$centerId,$pkg);
$startUrl=$base.'/client.php?center='.rawurlencode($centerId).'&role='.rawurlencode($pkg).'&sig='.$sig;
$centerName=(string)($center['name']??$center['settings']['clinicName']??'مرکز درمانی');
$centerCode=preg_replace('/[^A-Za-z0-9_-]/','-',(string)($center['code']??$centerId));
if(trim($centerCode,'-_')==='')$centerCode=preg_replace('/[^A-Za-z0-9_-]/','-',$centerId);
$packageKey='Bastiyan-'.$centerCode.'-'.$meta['en'];
$displayName=($pkg==='doctor'?'فراخوان پزشک - باستیان':($pkg==='secretary'?'نوبت‌دهی - باستیان':($pkg==='display'?'نمایشگر - باستیان':'مدیریت - باستیان')));
$config=[
    'schema'=>2,
    'product'=>'Bastiyan Healthcare Systems',
    'version'=>'3.3.20',
    'desktopRuntime'=>'native-go-launcher+browser-fallback+runtime-update',
    'role'=>$pkg,
    'roleFa'=>$meta['fa'],
    'centerId'=>$centerId,
    'centerName'=>$centerName,
    'centerCode'=>$center['code']??'',
    'serverUrl'=>$base,
    'startUrl'=>$startUrl,
    'packageKey'=>$packageKey,
    'displayName'=>$displayName,
    'publisher'=>'Bastiyan Holding',
    'description'=>$meta['desc']
];
$configJson=json_encode($config,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT);

// Native Windows installer is shipped with the project and needs no PowerShell/VBS/.NET/Node/PHP on the destination PC.
$setup=__DIR__.'/windows-runtime/Bastiyan-Windows-Installer-x64.exe';
if(!is_file($setup) || filesize($setup)<500000){
    failDl('نصاب Native ویندوز داخل سامانه پیدا نشد. فایل windows-runtime/Bastiyan-Windows-Installer-x64.exe را بررسی کنید.',500,['code'=>'WINDOWS_NATIVE_INSTALLER_MISSING']);
}
$setupNames=[
 'doctor'=>'Install-Bastiyan-Doctor.exe',
 'secretary'=>'Install-Bastiyan-Secretary.exe',
 'display'=>'Install-Bastiyan-Display.exe',
 'super_admin'=>'Install-Bastiyan-Admin.exe'
];
$setupName=$setupNames[$pkg]??'Install-Bastiyan.exe';
$readme='<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>نصب باستیان در ویندوز</title><style>body{font-family:Tahoma;background:#07111c;color:#e7f4fb;max-width:820px;margin:45px auto;padding:30px;line-height:2;border:1px solid #28475b;border-radius:22px}h1{color:#7dd3fc}b{color:#a7f3d0}code{direction:ltr;background:#102536;padding:3px 7px;border-radius:6px}</style><h1>'.htmlspecialchars($displayName,ENT_QUOTES,'UTF-8').'</h1><p><b>مرکز:</b> '.htmlspecialchars($centerName,ENT_QUOTES,'UTF-8').'</p><p>۱) فایل ZIP را Extract کنید.<br>۲) فایل <b>'.htmlspecialchars($setupName,ENT_QUOTES,'UTF-8').'</b> و <b>client.json</b> باید کنار هم باقی بمانند.<br>۳) روی فایل نصب دوبار کلیک کنید.<br>۴) برنامه در LocalAppData نصب می‌شود و آیکن باستیان روی Desktop و Start Menu ساخته می‌شود.<br>۵) پس از نصب، پنل همان نقش خودکار اجرا می‌شود.</p><p>نصاب Native است و برای نصب به PowerShell، VBS، Node.js، PHP، Python، Java یا .NET Runtime نیاز ندارد. روی Windows 10/11 x64 اجرا می‌شود و برای نمایش پنل از Chrome یا Edge یا Firefox موجود در ویندوز استفاده می‌کند؛ برای چاپ مستقیم بدون دیالوگ در پنل منشی، Chrome/Edge و چاپگر پیش‌فرض ویندوز لازم است. اگر هیچ مرورگری روی دستگاه موجود نباشد، نصب یکی از آن‌ها ضروری خواهد بود.</p><p>در پنل پزشک ویندوز، F8 یا Ctrl+F8 دستیار شناور را بدون فراخوان ناخواسته نمایش یا مخفی می‌کند. پس از ورود پزشک امکان فراخوان، تکرار و پایان ویزیت با کلیک وجود دارد.</p><p>در پنل پزشک و منشی، ورود با انتخاب نام فارسی از فهرست و سپس رمز انجام می‌شود و نیازی به دانستن یا تایپ نام کاربری انگلیسی نیست.</p><p>نسخه: <code>3.3.20 Windows Native</code> — Bastiyan Holding</p></html>';

$tmp=tempnam(sys_get_temp_dir(),'bastiyan-win-');
if($tmp===false)failDl('ساخت فایل موقت ممکن نشد.',500);
@unlink($tmp);$tmp.='.zip';
try{
    $entries=[
        $setupName=>(string)@file_get_contents($setup),
        'client.json'=>$configJson,
        'Install-Guide.html'=>$readme
    ];
    if(is_file(__DIR__.'/image/icon.ico'))$entries['bastiyan.ico']=(string)@file_get_contents(__DIR__.'/image/icon.ico');
    if($entries[$setupName]==='')throw new RuntimeException('خواندن فایل نصاب Native ناموفق بود.');
    buildZipStoreDl($entries,$tmp);
}catch(Throwable $e){@unlink($tmp);failDl('ساخت بسته نصب ویندوز ناموفق بود: '.$e->getMessage(),500);}
if(!is_file($tmp))failDl('فایل بسته نصب ایجاد نشد.',500);
$filename='Bastiyan-'.$meta['en'].'-'.$centerCode.'-Windows-Setup-3.3.20.zip';
header('Content-Type: application/zip');
header("Content-Disposition: attachment; filename*=UTF-8''".rawurlencode($filename));
header('Content-Length: '.filesize($tmp));
header('Cache-Control: no-store');
readfile($tmp);@unlink($tmp);exit;
