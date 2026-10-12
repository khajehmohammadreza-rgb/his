(function(){
  'use strict';
  if(window.__BASTIYAN_NETWORK_RESILIENCE__) return;
  window.__BASTIYAN_NETWORK_RESILIENCE__=true;

  var nativeFetch=window.fetch.bind(window);
  var sleep=function(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});};

  function targetUrl(input){
    try{return new URL(typeof input==='string'?input:(input&&input.url)||'',location.href);}catch(e){return null;}
  }
  function methodOf(input,opts){
    return String((opts&&opts.method)||(input&&input.method)||'GET').toUpperCase();
  }
  function isOwnApi(u){
    return !!(u&&u.origin===location.origin&&(u.pathname.indexOf('/api/')===0||u.pathname==='/api.php'));
  }
  function fallbackUrl(u){
    if(!u||u.pathname.indexOf('/api/')!==0) return null;
    var route=u.pathname.slice('/api/'.length);
    if(!route) return null;
    var f=new URL('/api.php',location.origin);
    f.searchParams.set('route',route);
    u.searchParams.forEach(function(v,k){f.searchParams.append(k,v);});
    return f.toString();
  }
  function networkError(original){
    var e=new Error(navigator.onLine===false
      ? 'ارتباط شبکه قطع است. پس از برقراری شبکه، سامانه خودکار دوباره تلاش می‌کند.'
      : 'ارتباط با سرور باستیان برقرار نشد. سامانه به‌صورت خودکار دوباره تلاش کرد؛ اگر پیام باقی ماند اتصال شبکه یا سرویس چابکان را بررسی کنید.');
    e.name='BastiyanNetworkError';
    e.code='BASTIYAN_NETWORK';
    e.cause=original;
    return e;
  }

  async function robustFetch(input,opts){
    var u=targetUrl(input), method=methodOf(input,opts), ownApi=isOwnApi(u);
    if(!ownApi){return nativeFetch(input,opts);}

    var safeRetry=(method==='GET'||method==='HEAD');
    var maxAttempts=safeRetry?3:1;
    var lastErr=null;
    for(var attempt=0;attempt<maxAttempts;attempt++){
      try{
        var r=await nativeFetch(input,opts);
        if(safeRetry && (r.status===502||r.status===503||r.status===504) && attempt<maxAttempts-1){
          await sleep(180*(attempt+1));
          continue;
        }
        // Apache/Nginx rewrite may be unavailable on some deployments. Fallback once to api.php.
        if(safeRetry && attempt===0 && (r.status===404||r.status===405)){
          var fb=fallbackUrl(u);
          if(fb){
            var fr=await nativeFetch(fb,opts);
            if(fr.status!==404 && fr.status!==405) return fr;
          }
        }
        return r;
      }catch(err){
        lastErr=err;
        if(!safeRetry || attempt>=maxAttempts-1) break;
        await sleep(180*(attempt+1));
      }
    }
    throw networkError(lastErr);
  }

  window.fetch=robustFetch;

  // Small non-invasive connectivity notice. It does not alter page layout.
  var notice=null;
  function showNotice(text){
    if(!document.body) return;
    if(!notice){
      notice=document.createElement('div');
      notice.id='bastiyan-network-notice';
      notice.setAttribute('dir','rtl');
      notice.style.cssText='position:fixed;z-index:2147483646;left:16px;bottom:16px;max-width:min(520px,calc(100vw - 32px));background:#7f1d1d;color:#fff;border:1px solid #ef4444;border-radius:12px;padding:10px 14px;font:700 14px BNazanin,Tahoma,sans-serif;box-shadow:0 12px 32px #0007;display:none';
      document.body.appendChild(notice);
    }
    notice.textContent=text;
    notice.style.display='block';
  }
  function hideNotice(){if(notice) notice.style.display='none';}
  window.addEventListener('offline',function(){showNotice('ارتباط شبکه قطع شده است؛ اطلاعات موجود حفظ می‌شود و پس از اتصال مجدد سامانه ادامه می‌دهد.');});
  window.addEventListener('online',function(){hideNotice();});
})();
