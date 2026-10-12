(()=>{
'use strict';
const ADMIN_TOKEN_KEY='bastiyan_superadmin_token';
const CENTER_TOKEN_KEY='bastiyan_center_token';
const qs=new URLSearchParams(location.search);
const centerId=(qs.get('center')||'').trim();
const steps=document.getElementById('steps');
const loginBox=document.getElementById('loginBox');
const loginForm=document.getElementById('loginForm');
const actions=document.getElementById('actions');
const nativeFetch=window.fetch.bind(window);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const state={};
function step(key,label,status='run',detail=''){
  state[key]={label,status,detail};
  steps.innerHTML=Object.values(state).map(x=>`<div class="step ${x.status}"><span class="dot"></span><span>${esc(x.label)}${x.detail?` <small class="muted">— ${esc(x.detail)}</small>`:''}</span></div>`).join('');
}
async function api(path,options={},token=''){
  const headers={...(options.headers||{})};
  if(token){headers.Authorization=`Bearer ${token}`;headers['X-Bastiyan-Token']=token;}
  if(options.body && !(options.body instanceof FormData) && !headers['Content-Type'])headers['Content-Type']='application/json';
  const res=await nativeFetch(path,{credentials:'same-origin',cache:'no-store',...options,headers});
  let data={};try{data=await res.json()}catch{data={error:`HTTP ${res.status}`}}
  if(!res.ok)throw Object.assign(new Error(data.error||`HTTP ${res.status}`),{status:res.status,data});
  return data;
}
function minimalRuntime(center,users=[]){
  const cid=String(center.id||centerId);
  let runtime={};
  try{runtime=JSON.parse(localStorage.getItem(`bastiyan_center_isolated_${cid}`)||localStorage.getItem(`bastian_center_isolated_${cid}`)||'{}')||{}}catch{}
  runtime.currentCenterId=cid;
  runtime.medicalCenters=[center];
  runtime.settings={...(runtime.settings||{}),clinicName:center.name||'',phone:center.phone||'',address:center.address||'',city:center.city||'',centerCode:center.code||'',centerType:center.centerType||'clinic',licensePlanName:center.planName||'standard',licenseEndDate:center.endDate||'',licenseStatus:center.active===false||center.archived?'suspended':'active'};
  if(users.length)runtime.users=users;
  for(const k of ['users','medicalServices','products','categories','serviceCategories','warehouses','patients','visitQueue','appointments','treatmentPlans'])if(!Array.isArray(runtime[k]))runtime[k]=[];
  localStorage.setItem(`bastiyan_center_isolated_${cid}`,JSON.stringify(runtime));
  localStorage.setItem('bastiyan_current_center_id',cid);
  return runtime;
}
function installAuthFetch(token){
  window.fetch=(input,init={})=>{
    try{
      const raw=typeof input==='string'?input:input.url;
      const u=new URL(raw,location.href);
      if(u.origin===location.origin&&u.pathname.includes('/api/')){
        const h=new Headers(init.headers||(typeof input!=='string'?input.headers:undefined)||{});
        if(!h.has('Authorization'))h.set('Authorization',`Bearer ${token}`);
        if(!h.has('X-Bastiyan-Token'))h.set('X-Bastiyan-Token',token);
        init={...init,headers:h};
      }
    }catch{}
    return nativeFetch(input,init);
  };
}
async function loadHis(center,token,user,runtime){
  sessionStorage.setItem(CENTER_TOKEN_KEY,token);
  sessionStorage.setItem('bastiyan_center_session',JSON.stringify(center));
  sessionStorage.setItem('bastiyan_center_user',JSON.stringify(user));
  sessionStorage.setItem('bastiyan_superadmin_override','1');
  window.__BASTIYAN_PORTAL_SESSION__={center,token,user,fromSuperAdmin:true};
  installAuthFetch(token);
  document.body.innerHTML='<div id="root"></div><div id="directEntryStatus" style="position:fixed;bottom:14px;left:14px;z-index:999999;background:#064e3b;color:#d1fae5;border:1px solid #10b981;border-radius:12px;padding:8px 12px;font-family:B Nazanin,Tahoma,sans-serif;direction:rtl">ورود مستقیم Super Admin</div><a href="./" style="position:fixed;bottom:14px;right:14px;z-index:999999;background:#1e293b;color:#fff;border-radius:12px;padding:8px 12px;text-decoration:none;font-family:B Nazanin,Tahoma,sans-serif">بازگشت به درگاه</a>';
  if(!document.querySelector('link[data-direct-his-css]')){const l=document.createElement('link');l.rel='stylesheet';l.dataset.directHisCss='1';l.href=`./assets/index.css?v=406-${Date.now()}`;document.head.appendChild(l);}
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`./app/bastiyan-recovery-404.js?direct=406-${Date.now()}`;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('فایل رابط HIS از هاست بارگذاری نشد'));document.body.appendChild(s);});
}
async function run(adminToken){
  try{
    step('session','بررسی نشست مدیریت مرکزی','run');
    if(!adminToken){step('session','بررسی نشست مدیریت مرکزی','bad','نیاز به ورود مجدد');loginBox.style.display='block';return;}
    step('session','بررسی نشست مدیریت مرکزی','ok');
    if(!centerId){
      step('centers','دریافت فهرست مراکز','run');
      const d=await api('./api/bastian/centers',{},adminToken);
      const centers=Array.isArray(d.centers)?d.centers:[];
      step('centers','دریافت فهرست مراکز','ok',`${centers.length} مرکز`);
      const box=document.createElement('div');box.style.marginTop='16px';
      box.innerHTML='<div class="muted" style="margin-bottom:10px">مرکز را برای ورود مستقیم انتخاب کنید:</div>'+centers.filter(c=>c&&!c.archived).map(c=>`<a class="btn" style="display:block;margin:8px 0;text-align:center" href="./emergency-center-entry.html?center=${encodeURIComponent(c.id)}">${esc(c.name||c.id)}</a>`).join('');
      actions.before(box);return;
    }
    step('token','صدور دسترسی اختصاصی مرکز','run');
    const remote=await api('./api/bastian/remote-login',{method:'POST',body:JSON.stringify({centerId})},adminToken);
    const center=remote.center;
    const centerToken=remote.token;
    if(!center?.id||!centerToken)throw new Error('سرور توکن ورود مرکز را برنگرداند.');
    step('token','صدور دسترسی اختصاصی مرکز','ok',center.name||center.id);
    step('data','آماده‌سازی حداقل اطلاعات مرکز','run');
    let users=[];
    try{const ud=await Promise.race([api(`./api/bastian/centers/${encodeURIComponent(center.id)}/users`,{},centerToken),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),5000))]);users=Array.isArray(ud.users)?ud.users:[]}catch{}
    let runtime=minimalRuntime(center,users);
    step('data','آماده‌سازی حداقل اطلاعات مرکز','ok',users.length?`${users.length} کاربر`:'با کش موجود');
    step('ui','اجرای رابط HIS','run');
    const user={id:'bastiyan-superadmin',name:'مدیریت کل باستیان',username:'bastiyan_superadmin',role:'admin',status:'active',active:true};
    await loadHis(center,centerToken,user,runtime);
  }catch(err){
    console.error('[Bastiyan direct entry]',err);
    step('error','ورود مستقیم متوقف شد','bad',err.message||String(err));
    const a=document.createElement('button');a.className='btn';a.textContent='تلاش مجدد';a.onclick=()=>location.reload();actions.prepend(a);
  }
}
loginForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=new FormData(loginForm);
  try{
    const d=await api('./api/bastian/admin/login',{method:'POST',body:JSON.stringify({username:f.get('username'),password:f.get('password')})});
    sessionStorage.setItem(ADMIN_TOKEN_KEY,d.token);loginBox.style.display='none';await run(d.token);
  }catch(err){step('login','ورود مدیریت کل','bad',err.message||String(err));}
});
run(sessionStorage.getItem(ADMIN_TOKEN_KEY)||'');
})();
