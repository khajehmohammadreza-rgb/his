/* Bastiyan Doctor Quick 3.3.20. All calls use the existing server-authorized doctor session. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const next=el('next'),repeat=el('repeat'),finish=el('finish');
let session=null, current=null, busy=false, online=false, lastActionAt=0;
let booting=false, pollTimer=null;
const getToken=()=>{try{return localStorage.getItem('bc_token')||''}catch(_){return ''}};
function notice(t,type='') {const e=el('status');e.textContent=t;e.className='status '+type}
function connection(up) {online=up;el('health').className='health'+(up?' online':'');el('healthText').textContent=up?'متصل':'قطع ارتباط'}
function controls() {
  const good=online&&session&&session.role==='doctor'&&!busy;
  next.disabled=!good;repeat.disabled=!good||!current;finish.disabled=!good||!current;
}
async function api(path,body,timeoutMs=7000){
  const token=getToken();if(!token)throw Error('ابتدا در پنل اصلی پزشک وارد شوید.');
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const resp=await fetch('/api/'+path,{
      method:body?'POST':'GET',
      headers:{'Authorization':'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined,cache:'no-store',signal:ctl.signal
    });
    const data=await resp.json().catch(()=>({}));
    if(!resp.ok||data.success===false)throw Error(data.error||'پاسخ معتبر از سرور دریافت نشد ('+resp.status+').');
    return data;
  }finally{clearTimeout(t)}
}
async function refresh(){
  if(busy||booting)return;
  booting=true;
  try{
    const token=getToken();if(!token){session=null;current=null;connection(false);el('doctorName').textContent='وارد پنل اصلی پزشک شوید';el('currentNumber').textContent='—';el('waitingNumber').textContent='—';notice('برای استفاده ابتدا وارد حساب پزشک در باستیان شوید.','error');return}
    if(!session){
      const me=await api('auth/me');
      if(me.role!=='doctor'||!me.doctorId)throw Error('این دستیار فقط برای حساب پزشک فعال است.');
      session={role:me.role,doctorId:String(me.doctorId),name:me.user?.name||me.user?.displayName||'پزشک'};
    }
    const state=await api('state');
    if(state.authRole!=='doctor'||String(state.authDoctor||'')!==session.doctorId)throw Error('نشست پزشک تغییر کرده است؛ پنل را باز کنید.');
    connection(true);
    const qs=Array.isArray(state.queues)?state.queues:[];
    const my=qs.filter(q=>String(q.doctorId||'')===session.doctorId&&q.isActive!==false);
    current=my.find(q=>q.status==='calling')||null;
    const waiting=my.filter(q=>q.status==='waiting').length;
    el('doctorName').textContent=(state.doctors?.[0]?.name||session.name)+' — '+(state.centerName||'مرکز درمانی');
    el('currentNumber').textContent=current?String(current.number):'—';
    el('waitingNumber').textContent=String(waiting);
    if(!el('status').classList.contains('ok'))notice('آماده فراخوان؛ برای اجرای فرمان روی دکمه بزنید.');
  }catch(e){
    current=null;connection(false);
    if(/401|403|نشست|ابتدا|حساب پزشک|Unauthorized/i.test(e.message||''))session=null;
    el('currentNumber').textContent='—';el('waitingNumber').textContent='—';
    notice(e.name==='AbortError'?'زمان دریافت پاسخ به پایان رسید.':e.message,'error');
  }finally{booting=false;controls()}
}
async function act(type){
  if(busy||!online||!session||Date.now()-lastActionAt<1300)return;
  const queueId=current?.id||null;
  if(type!=='next'&&!queueId)return;
  if(type==='finish'&&!window.confirm('ویزیت نوبت '+current.number+' پایان یافته است؟'))return;
  busy=true;lastActionAt=Date.now();controls();
  try{
    let data;
    if(type==='next')data=await api('queues/next',{});
    if(type==='repeat')data=await api('queues/call',{queueId});
    if(type==='finish')data=await api('queues/status',{queueId,status:'visited'});
    if(data.success!==true)throw Error(data.error||'ثبت فرمان تأیید نشد.');
    notice(type==='finish'?'پایان ویزیت ثبت شد.':data.item?'فراخوان شماره '+data.item.number+' ثبت شد.':data.message||'نوبت بعدی وجود ندارد.','ok');
    // Never retry a POST automatically: lost acknowledgements could otherwise duplicate calls.
  }catch(e){notice('نتیجه فرمان نامشخص یا ناموفق: '+(e.message||'خطای ارتباط')+'؛ پیش از تلاش دوباره صف را بررسی کنید.','error')}
  finally{busy=false;controls();await refresh()}
}
next.addEventListener('click',()=>act('next'));
repeat.addEventListener('click',()=>act('repeat'));
finish.addEventListener('click',()=>act('finish'));
el('openMain').addEventListener('click',()=>{
  let u='/';try{const v=localStorage.getItem('bc_installed_client_url');if(v&&new URL(v,location.origin).origin===location.origin)u=v}catch(_){}
  // Opening a full panel is explicit; no silent navigation of the working browser tab.
  window.open(u,'_blank','noopener');
});
window.addEventListener('storage',e=>{if(e.key==='bc_token'){session=null;refresh()}});
window.addEventListener('online',refresh);
pollTimer=setInterval(refresh,3000);
refresh();
})();
