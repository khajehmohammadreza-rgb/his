(function(){'use strict';
function text(el){return (el&&el.textContent||'').replace(/\s+/g,' ').trim()}
function removeLegacyTicker(){
  var markers=['افزودن پیام به زیرنویس','متن پیام زیرنویس سالن انتظار'];
  var nodes=document.querySelectorAll('button,input');
  for(var i=0;i<nodes.length;i++){
    var e=nodes[i],hit=(e.tagName==='INPUT'?(e.getAttribute('placeholder')||''):text(e));
    if(!markers.some(function(m){return hit.indexOf(m)>=0}))continue;
    var box=e;
    for(var j=0;j<7&&box.parentElement;j++){
      box=box.parentElement;var t=text(box);
      if(t.indexOf('افزودن پیام به زیرنویس')>=0&&(t.indexOf('پیام')>=0||t.indexOf('زیرنویس')>=0)){
        if(!box.closest('#display-settings-card')&&!box.closest('#ticker-manager')){box.style.display='none';box.setAttribute('aria-hidden','true');box.setAttribute('data-bastian-legacy-hidden','ticker');if('inert' in box)box.inert=true;break}
      }
    }
  }
}
function removeLegacyLaunchers(){
  var hs=document.querySelectorAll('h1,h2,h3,h4,h5,span');
  for(var i=0;i<hs.length;i++){
    var h=hs[i],t=text(h);
    if(t.indexOf('دانلود راه‌اندازها و میانبرهای دسکتاپ')<0)continue;
    var box=h;
    for(var j=0;j<7&&box.parentElement;j++){
      box=box.parentElement;var tx=text(box);
      if(tx.indexOf('دانلود وب‌لانچر دسکتاپ')>=0&&tx.indexOf('نصاب میانبر ویندوز')>=0){box.style.display='none';box.setAttribute('aria-hidden','true');box.setAttribute('data-bastian-legacy-hidden','launcher');if('inert' in box)box.inert=true;break}
    }
  }
}
function normalizeLabels(){
  var map=[['تیکر و اطلاعیه‌ها','زیرنویس نمایشگر'],['تیکر و اطلاعیه‌های نمایشگر','زیرنویس نمایشگر'],['زیرنویس و پیام‌های روان سالن','زیرنویس نمایشگر'],['پیام‌های روان سالن','زیرنویس نمایشگر'],['نمایش تیکر','نمایش زیرنویس نمایشگر'],['سرعت تیکر','زمان پیمایش زیرنویس'],['اطلاعیه درمانگاه','اطلاعیه']];
  var els=document.querySelectorAll('h1,h2,h3,h4,h5,label,button,a,p,span');
  for(var i=0;i<els.length;i++){var e=els[i];if(e.children.length>2)continue;var t=e.textContent||'',n=t;for(var j=0;j<map.length;j++)n=n.split(map[j][0]).join(map[j][1]);if(n!==t&&e.children.length===0)e.textContent=n}
}
var busy=false;function run(){if(busy)return;busy=true;requestAnimationFrame(function(){busy=false;removeLegacyTicker();removeLegacyLaunchers();normalizeLabels()})}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});run();
})();
