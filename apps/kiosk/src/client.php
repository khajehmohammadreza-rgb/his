<?php
/**
 * Bastiyan role-locked installed client entrypoint.
 * Every generated Windows package is cryptographically bound to one center + one role.
 */
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
$dataDir=__DIR__.'/data';
$storeFile=$dataDir.'/clinic_store.json';
function escHtml($v):string{return htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');}
function clientSecretLocal(string $dataDir):string{
    $file=$dataDir.'/.client_package_secret';$lock=$file.'.lock';
    $read=function()use($file){if(!is_file($file))return '';$v=trim((string)@file_get_contents($file));return preg_match('/^[a-f0-9]{64}$/i',$v)?strtolower($v):'';};
    $v=$read();if($v!=='')return $v;$h=@fopen($lock,'c');if($h){@flock($h,LOCK_EX);$v=$read();if($v===''){$v=bin2hex(random_bytes(32));@file_put_contents($file,$v,LOCK_EX);@chmod($file,0640);}@flock($h,LOCK_UN);@fclose($h);return $v;}$v=bin2hex(random_bytes(32));@file_put_contents($file,$v,LOCK_EX);@chmod($file,0640);return $v;
}
function clientSigLocal(string $dataDir,string $centerId,string $role):string{return hash_hmac('sha256','bastian-client-v1|'.$centerId.'|'.$role,clientSecretLocal($dataDir));}
$centerId=trim((string)($_GET['center']??''));
$role=trim((string)($_GET['role']??''));
$sig=strtolower(trim((string)($_GET['sig']??'')));
$roles=['doctor','secretary','display','super_admin'];
$valid=in_array($role,$roles,true)&&$centerId!==''&&preg_match('/^[a-f0-9]{64}$/',$sig)&&hash_equals(clientSigLocal($dataDir,$centerId,$role),$sig);
$store=is_file($storeFile)?json_decode((string)@file_get_contents($storeFile),true):null;
$center=null;
if(is_array($store))foreach($store['centers']??[] as $c)if((string)($c['id']??'')===$centerId){$center=$c;break;}
if(!$center)$valid=false;
$labels=['doctor'=>'نسخه پزشک','secretary'=>'نسخه منشی','display'=>'نسخه نمایشگر','super_admin'=>'نسخه سوپرادمین'];
$icons=['doctor'=>'🩺','secretary'=>'🗂️','display'=>'📺','super_admin'=>'🛡️'];
$roleLabel=$labels[$role]??'نسخه نصب‌شده';
$roster=[];
if($valid&&in_array($role,['doctor','secretary'],true)){
    foreach($center['users']??[] as $u){if(($u['role']??'')===$role&&($u['isActive']??true))$roster[(string)$u['id']]=['id'=>(string)$u['id'],'name'=>(string)($u['name']??''),'specialty'=>(string)($u['specialty']??''),'room'=>(string)($u['room']??''),'username'=>(string)($u['username']??'')];}
    $fallback=$role==='doctor'?($center['doctors']??[]):($center['secretaries']??[]);
    foreach($fallback as $u){$active=$u['isActive']??$u['active']??true;if(!$active)continue;$id=(string)($u['id']??'');if($id!==''&&!isset($roster[$id]))$roster[$id]=['id'=>$id,'name'=>(string)($u['name']??''),'specialty'=>(string)($u['specialty']??''),'room'=>(string)($u['room']??''),'username'=>(string)($u['username']??'')];}
    $roster=array_values($roster);
    usort($roster,fn($a,$b)=>strnatcasecmp((string)($a['name']??''),(string)($b['name']??'')));
}
$centerName=$center['name']??($center['settings']['clinicName']??'مرکز درمانی');
?><!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title><?=escHtml($roleLabel)?> | باستیان</title>
<link rel="icon" type="image/png" href="/image/favicon.png"><link rel="stylesheet" href="/fonts.css?v=3.3.14">
<style>
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{font-family:"BNazanin",Tahoma,sans-serif;background:#07111c;color:#eef5fb;overflow-x:hidden}.bg{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 82% 5%,rgba(32,132,172,.22),transparent 34%),radial-gradient(circle at 8% 92%,rgba(57,70,170,.2),transparent 34%),linear-gradient(145deg,#061019,#0a1622 48%,#07111c)}.orb{position:fixed;border-radius:50%;filter:blur(55px);opacity:.16;pointer-events:none}.o1{width:280px;height:280px;background:#2dd4bf;right:-90px;top:18%}.o2{width:260px;height:260px;background:#6366f1;left:-90px;bottom:8%}.shell{position:relative;min-height:100vh;display:grid;grid-template-columns:minmax(320px,520px) minmax(320px,1fr);align-items:stretch}.hero{padding:54px 6vw;display:flex;flex-direction:column;justify-content:space-between;border-left:1px solid rgba(140,180,205,.14);background:rgba(3,12,20,.35);backdrop-filter:blur(10px)}.brand{display:flex;align-items:center;gap:14px}.brand img{width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 9px 22px rgba(0,0,0,.28))}.brand b{font-family:"BTitr";font-size:25px;letter-spacing:.1px}.brand small{display:block;color:#8aa2b5;font-size:14px;margin-top:3px}.heroMain{max-width:650px}.roleIcon{width:72px;height:72px;border-radius:22px;background:linear-gradient(145deg,rgba(45,212,191,.18),rgba(99,102,241,.2));border:1px solid rgba(92,210,204,.28);display:grid;place-items:center;font-size:34px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 15px 45px rgba(0,0,0,.25)}h1{font-family:"BTitr";font-size:42px;line-height:1.4;margin:20px 0 9px}.hero p{font-size:19px;line-height:2;color:#b7c8d4;margin:0}.features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:26px}.feature{border:1px solid rgba(116,148,172,.18);background:rgba(8,22,33,.58);padding:13px 14px;border-radius:14px;color:#a9bfce;font-size:15px}.feature strong{color:#e7f8ff;display:block;margin-bottom:2px}.foot{color:#587286;font-size:13px;line-height:1.8}.loginWrap{display:flex;align-items:center;justify-content:center;padding:34px 5vw}.card{width:min(490px,100%);background:linear-gradient(180deg,rgba(16,33,48,.94),rgba(9,24,35,.97));border:1px solid rgba(118,158,184,.2);box-shadow:0 34px 100px rgba(0,0,0,.38);border-radius:28px;padding:30px}.cardHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:20px;border-bottom:1px solid rgba(118,158,184,.13);margin-bottom:22px}.card h2{font-family:"BTitr";font-size:26px;margin:0 0 5px}.center{color:#82cfe6;font-size:15px;line-height:1.7}.secure{font-size:12px;color:#5fe0b2;background:rgba(6,78,59,.23);border:1px solid rgba(52,211,153,.2);border-radius:999px;padding:6px 9px;white-space:nowrap}.field{margin-bottom:16px}.field label{display:block;font-weight:700;font-size:15px;color:#afc0cc;margin:0 0 7px}.control{width:100%;border:1px solid #2e465a;background:#071620;color:#eef8ff;border-radius:13px;padding:13px 14px;font:17px "BNazanin";outline:none;transition:.18s}.control:focus{border-color:#38bdf8;box-shadow:0 0 0 4px rgba(56,189,248,.09)}select.control{cursor:pointer}.subline{font-size:13px;color:#6f8ca0;margin-top:6px;min-height:20px}.submit{width:100%;border:0;border-radius:14px;padding:13px 16px;margin-top:5px;background:linear-gradient(100deg,#0f8eb9,#2563eb);color:white;font:20px "BTitr";cursor:pointer;box-shadow:0 12px 26px rgba(37,99,235,.24);transition:.18s}.submit:hover{transform:translateY(-1px);filter:brightness(1.06)}.submit:disabled{opacity:.55;cursor:not-allowed;transform:none}.error,.notice{display:none;margin-top:14px;padding:11px 13px;border-radius:12px;font-size:14px;line-height:1.8}.error{background:#35151a;border:1px solid #7f1d2d;color:#fecdd3}.notice{background:#052e2b;border:1px solid #0f766e;color:#b9f6e9}.altLogin{margin:2px 0 16px;border:1px solid rgba(118,158,184,.16);border-radius:13px;background:#081722;padding:10px 12px}.altLogin summary{cursor:pointer;color:#7fa8bc;font-size:14px;font-weight:700}.altLogin[open] summary{color:#b9e6f7}.lockInfo{margin-top:18px;border-top:1px solid rgba(118,158,184,.13);padding-top:16px;color:#69879b;font-size:13px;line-height:1.85}.invalid{min-height:100vh;display:grid;place-items:center;padding:24px}.invalid .card{text-align:center}.invalid h1{font-size:30px;margin:10px}.invalid p{color:#9fb5c4;font-size:16px;line-height:2}.spinner{display:inline-block;width:17px;height:17px;border:2px solid rgba(255,255,255,.35);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;vertical-align:-4px;margin-left:6px}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:920px){.shell{grid-template-columns:1fr}.hero{display:none}.loginWrap{min-height:100vh;padding:22px}.card{padding:24px;border-radius:23px}}@media(max-width:460px){.cardHead{flex-direction:column}.features{grid-template-columns:1fr}.card{padding:20px}.loginWrap{padding:12px}}
</style>

<link rel="stylesheet" href="/assets/readability-3.3.19.css?v=3.3.19">
</head><body><div class="bg"></div><div class="orb o1"></div><div class="orb o2"></div>
<?php if(!$valid): ?>
<div class="invalid"><div class="card"><img src="/image/LOGO-BU-256.png" alt="Bastiyan" style="width:76px;height:76px;object-fit:contain"><h1>نسخه نصب‌شده معتبر نیست</h1><p>این میانبر برای مرکز یا نقش دیگری صادر شده، یا اطلاعات بسته تغییر کرده است.<br>نسخه صحیح را از تنظیمات همان مرکز دوباره دانلود و نصب کنید.</p></div></div>
<?php else: ?>
<div class="shell">
<section class="hero"><div class="brand"><img src="/image/LOGO-BU-256.png" alt="لوگوی باستیان"><div><b>هلدینگ باستیان</b><small>Bastiyan Healthcare Systems</small></div></div><div class="heroMain"><div class="roleIcon"><?=escHtml($icons[$role]??'◆')?></div><h1><?=escHtml($roleLabel)?></h1><p>نسخه اختصاصی و قفل‌شده برای <strong style="color:#e8f8ff"><?=escHtml($centerName)?></strong>. این برنامه فقط اجازه ورود نقش تعریف‌شده برای همین نسخه را می‌دهد.</p><div class="features"><div class="feature"><strong>ورود نقش‌محور</strong>عدم نمایش کاربران نامرتبط</div><div class="feature"><strong>اتصال امن</strong>اعتبارسنجی سمت سرور</div><div class="feature"><strong>نشست مستقل</strong>مخصوص همین نسخه ویندوز</div><div class="feature"><strong>رابط فارسی</strong>طراحی اختصاصی باستیان</div></div></div><div class="foot">ساخته‌شده توسط هلدینگ باستیان<br>سامانه فراخوان و مدیریت هوشمند مراکز درمانی</div></section>
<main class="loginWrap"><div class="card"><div class="cardHead"><div><h2>ورود به <?=escHtml($roleLabel)?></h2><div class="center"><?=escHtml($centerName)?></div></div><span class="secure">● اتصال امن</span></div>
<form id="loginForm">
<?php if(in_array($role,['doctor','secretary'],true)): ?>
<div class="field"><label><?= $role==='doctor'?'نام پزشک':'نام منشی' ?></label><select class="control" id="userId" required><option value="">— نام فارسی خود را انتخاب کنید —</option><?php foreach($roster as $u): ?><option value="<?=escHtml($u['id'])?>" data-sub="<?=escHtml(trim($u['specialty'].' '.$u['room']))?>"><?=escHtml($u['name'])?><?= $role==='doctor' && ($u['specialty']||$u['room'])?' — '.escHtml(trim($u['specialty'].' | '.$u['room'])):'' ?></option><?php endforeach; ?></select><div class="subline" id="userSub"><?=count($roster)?> کاربر فعال؛ نیازی به واردکردن نام کاربری انگلیسی نیست.</div></div>
<?php elseif($role==='super_admin'): ?>
<div class="field"><label>نام کاربری سوپرادمین</label><input class="control" id="username" autocomplete="username" required placeholder="نام کاربری مدیر سیستم"></div>
<?php else: ?>
<div class="field"><label>مرکز متصل</label><input class="control" value="<?=escHtml($centerName)?>" disabled></div>
<?php endif; ?>
<div class="field"><label>رمز عبور</label><input class="control" id="password" type="password" autocomplete="current-password" required placeholder="رمز عبور را وارد کنید"></div>
<button class="submit" id="submitBtn" type="submit">ورود به سامانه</button><?php if($role==='doctor'): ?><p style="margin:12px 0 0;color:#a4d9e8;font-size:15px;line-height:1.9">پس از ورود در نسخه ویندوز، با کلید <b dir="ltr">F8</b> یا <b dir="ltr">Ctrl + F8</b> دستیار شناور فراخوان را باز یا مخفی کنید؛ فشردن میانبر به‌تنهایی بیمار را فراخوان نمی‌کند.</p><?php endif; ?><div class="error" id="errorBox"></div><div class="notice" id="noticeBox"></div>
</form><div class="lockInfo">🔒 این نسخه به مرکز و نقش مشخص‌شده در زمان دانلود قفل شده است. تغییر آدرس، نقش یا شناسه مرکز باعث ردشدن ورود در سمت سرور می‌شود.</div></div></main>
</div>
<script>
(()=>{'use strict';
const profile={centerId:<?=json_encode($centerId,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)?>,role:<?=json_encode($role,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)?>,sig:<?=json_encode($sig,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)?>};
try{const u=new URL(location.href);u.hash='';localStorage.setItem('bc_installed_client_url',u.href);localStorage.setItem('bc_installed_client_role',profile.role);localStorage.setItem('bc_installed_client_center',profile.centerId);sessionStorage.setItem('bc_installed_client_url',u.href)}catch(_e){}
const form=document.getElementById('loginForm'),btn=document.getElementById('submitBtn'),err=document.getElementById('errorBox'),notice=document.getElementById('noticeBox'),sel=document.getElementById('userId'),sub=document.getElementById('userSub');
const staffKey='bc_client_last_staff_'+profile.centerId+'_'+profile.role;
if(sel&&sub){try{const last=localStorage.getItem(staffKey)||'';if(last&&Array.from(sel.options).some(o=>o.value===last))sel.value=last}catch(_e){}const syncStaffHint=()=>{const o=sel.options[sel.selectedIndex];sub.textContent=o&&o.dataset.sub?o.dataset.sub:(sel.value?'کاربر انتخاب شد':'کاربر را انتخاب کنید');try{if(sel.value)localStorage.setItem(staffKey,sel.value);else localStorage.removeItem(staffKey)}catch(_e){}};sel.addEventListener('change',syncStaffHint);syncStaffHint();}
function showError(x){err.textContent=x;err.style.display='block';notice.style.display='none'}
function showNotice(x){notice.textContent=x;notice.style.display='block';err.style.display='none'}
function showWelcomeOnce(){try{const k='bc_client_welcome_'+profile.centerId+'_'+profile.role;if(localStorage.getItem(k))return;const roleFa=profile.role==='doctor'?'پزشک':profile.role==='secretary'?'منشی':'کاربر';const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:#020817dd;z-index:99999;display:grid;place-items:center;padding:18px;backdrop-filter:blur(9px)';ov.innerHTML='<div style="width:min(520px,94vw);background:linear-gradient(145deg,#0b1b29,#0b1420);border:1px solid #35566d;border-radius:24px;padding:26px;color:#eaf7ff;box-shadow:0 30px 90px #000b"><div style="font:900 28px BTitr;margin-bottom:9px">خوش آمدید به ماژول فراخوان باستیان</div><div style="color:#9bc6d9;line-height:2;font-size:16px">این نسخه اختصاصی پنل '+roleFa+' است و فقط امکاناتی را نمایش می‌دهد که برای حساب شما تعریف شده است. برای ورود، فقط نام فارسی خود را از فهرست انتخاب کنید و سپس رمز عبور را وارد کنید. نیازی به دانستن یا تایپ نام کاربری انگلیسی نیست و انتخاب هر نام دقیقاً به همان حساب واقعی و سطح دسترسی ثبت‌شده متصل می‌شود.</div><div style="margin-top:14px;padding:12px;border-radius:13px;background:#07121c;border:1px solid #244357;color:#b7d1df;line-height:1.9">برای امنیت، رمز عبور داخل برنامه ذخیره نمی‌شود؛ در صورت تمایل از Password Manager سیستم استفاده کنید.</div><button id="welcomeOk" style="width:100%;margin-top:18px;padding:12px;border:0;border-radius:12px;background:#087ca6;color:white;font:900 18px BTitr;cursor:pointer">شروع کار</button></div>';document.body.appendChild(ov);ov.querySelector('#welcomeOk').onclick=()=>{localStorage.setItem(k,'1');ov.remove()};}catch(_e){}}
showWelcomeOnce();
form.addEventListener('submit',async e=>{e.preventDefault();err.style.display='none';notice.style.display='none';btn.disabled=true;const old=btn.textContent;btn.innerHTML='<span class="spinner"></span>در حال ورود امن…';try{const body={centerId:profile.centerId,role:profile.role,sig:profile.sig,password:document.getElementById('password').value};if(sel){body.userId=sel.value;if(!body.userId)throw new Error('نام فارسی خود را از فهرست انتخاب کنید.');}if(profile.role==='super_admin')body.username=document.getElementById('username').value.trim();const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);let r;try{r=await fetch('/api/client/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ac.signal})}finally{clearTimeout(tm)}const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||'ورود ناموفق بود.');
if(d.role==='display'){localStorage.setItem('bc_display_token',d.token);sessionStorage.setItem('bc_display_token',d.token);localStorage.setItem('bc_role','display')}else{localStorage.setItem('bc_token',d.token);localStorage.setItem('bc_role',d.role)}localStorage.setItem('bc_doctorId',d.doctorId||'');localStorage.setItem('bc_centerId',d.centerId||'');localStorage.setItem('bc_displayName',d.displayName||'');localStorage.setItem('bc_installed_client_role',profile.role);localStorage.setItem('bc_installed_client_center',profile.centerId);showNotice('ورود موفق؛ در حال انتقال به پنل…');setTimeout(()=>location.replace(d.startPath||'/'),220);
}catch(x){showError(x.name==='AbortError'?'پاسخ سرور بیش از حد طول کشید. اتصال شبکه را بررسی کنید.':x.message)}finally{btn.disabled=false;btn.textContent=old}});
})();
</script>
<?php endif; ?>
</body></html>
