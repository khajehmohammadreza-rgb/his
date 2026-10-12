/* Bastiyan 3.3.16 — doctor/secretary intercom + one-shot TV destination announcement */
(function(){'use strict';
  const route=()=>((location.pathname||'').replace(/\/+$/,'')||'/');
  const center=()=>localStorage.getItem('bc_centerId')||'default';
  const seenKey=()=>`bastiyan_secretary_call_seen_${center()}`;
  let busy=false;
  function now(){return Date.now()}
  function valid(a){if(!a||!a.id)return false;const exp=Number(a.expiresAtMs||0);return !exp||exp>=now()}
  function destination(a){
    if(a&&String(a.destination||'').trim()) return String(a.destination).trim();
    const sp=String((a&&a.specialty)||'').trim(); if(sp) return 'به اتاق '+sp;
    const rm=String((a&&a.room)||'').trim(); if(rm) return /^اتاق/.test(rm)?'به '+rm:'به اتاق '+rm;
    return 'به اتاق پزشک';
  }
  function roomFallback(a){const m=String((a&&a.room)||'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).match(/\d+/);if(!m)return null;const n=parseInt(m[0],10);return n>=1&&n<=10?`/sounds/R${n}.mp3`:null}
  function saveMediaState(){return Array.from(document.querySelectorAll('video,audio')).map(el=>({el,muted:el.muted,volume:el.volume}));}
  function muteMedia(s){s.forEach(x=>{try{x.el.muted=true}catch{}})}
  function restoreMedia(s){s.forEach(x=>{try{x.el.muted=x.muted;x.el.volume=x.volume}catch{}})}
  function playAudio(src,volume=.9,timeout=3500){return new Promise(resolve=>{try{const a=new Audio(src);let done=false;const end=()=>{if(done)return;done=true;clearTimeout(t);resolve(true)};const fail=()=>{if(done)return;done=true;clearTimeout(t);resolve(false)};const t=setTimeout(fail,timeout);a.volume=Math.max(.1,Math.min(1,volume));a.onended=end;a.onerror=fail;const p=a.play();if(p&&p.catch)p.catch(fail)}catch{resolve(false)}})}
  function voices(){try{return window.speechSynthesis?window.speechSynthesis.getVoices():[]}catch{return[]}}
  async function speakFa(text){
    if(!('speechSynthesis' in window)||!text)return false;
    let vs=voices(); if(!vs.length) await new Promise(r=>setTimeout(r,350)); vs=voices();
    return new Promise(resolve=>{try{
      const u=new SpeechSynthesisUtterance(text);u.lang='fa-IR';u.rate=.88;u.pitch=1;u.volume=1;
      const v=vs.find(x=>/^fa([_-]|$)/i.test(x.lang||''))||vs.find(x=>/persian|farsi|dilara/i.test((x.name||'')+' '+(x.lang||'')));if(v)u.voice=v;
      let done=false;const finish=v=>{if(done)return;done=true;clearTimeout(t);resolve(v)};const t=setTimeout(()=>finish(false),6500);u.onend=()=>finish(true);u.onerror=()=>finish(false);window.speechSynthesis.cancel();window.speechSynthesis.speak(u)
    }catch{resolve(false)}})
  }
  async function handle(a){
    if(route()!=='/tv'||!valid(a)||busy)return;
    const id=String(a.id);if(localStorage.getItem(seenKey())===id)return;
    localStorage.setItem(seenKey(),id);busy=true;
    const media=saveMediaState();muteMedia(media);
    try{
      await playAudio('/sounds/secretary-chime.wav',.88,2500);
      await new Promise(r=>setTimeout(r,180));
      const phrase=destination(a);
      const ok=await speakFa(phrase);
      if(!ok){const f=roomFallback(a);if(f)await playAudio(f,.95,3000)}
    }finally{setTimeout(()=>restoreMedia(media),180);busy=false}
  }
  window.BastiyanSecretaryCallEnhancer={handle,destination};
  window.addEventListener('bastiyan:secretary-call',e=>handle(e.detail).catch(()=>{}));
  // Recover a fresh call if the TV page opened seconds after the doctor pressed the button.
  if(route()==='/tv')setTimeout(async()=>{try{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(j&&j.triggerSecretaryCall)await handle(j.triggerSecretaryCall)}catch{}},900);
})();
