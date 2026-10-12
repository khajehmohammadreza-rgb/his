import {decodeCanvasImage,normalizeScannedCode,CODE128_WIDTHS} from './barcodeDecoder.js';
const $=id=>document.getElementById(id);
const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fnum=n=>Number(n||0).toLocaleString('fa-IR',{maximumFractionDigits:3});
const escAttr=h;
let user=null,ref={warehouses:[],suppliers:[],services:[]},catalog=[],currentProduct=null,scanTarget=null;
let currentCamera=null,scanning=false,busyDecode=false,scanTick=0,lastScanCode='',lastScanAt=0;
function notice(msg,problem=false){const x=$('toast');x.textContent=msg;x.style.background=problem?'#9a3543':'#102e4e';x.hidden=false;clearTimeout(notice.t);notice.t=setTimeout(()=>x.hidden=true,5000);}
async function req(url,{method='GET',body}={}){
  let response;
  try{response=await fetch(url,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});}
  catch(e){$('connectionText').textContent='ارتباط قطع شد';throw Error('ارتباط با سرور قطع است؛ ذخیره انجام نشد. اتصال شبکه را بررسی کنید.');}
  const data=await response.json().catch(()=>({ok:false,error:'پاسخ نامعتبر از سرور'}));
  if(response.status===401&&url!=='/api/login'){showLogin();throw Error('نشست تمام شده است؛ دوباره وارد شوید.');}
  if(!response.ok||!data.ok)throw Error(data.error||'خطای سرور');
  $('connectionText').textContent='متصل';return data;
}
const post=(url,body)=>req(url,{method:'POST',body});
function values(form){return Object.fromEntries([...new FormData(form).entries()].map(([k,v])=>[k,String(v).trim()]));}
function showLogin(){$('appView').hidden=true;$('loginView').hidden=false;stopCamera();}
function showApp(){$('loginView').hidden=true;$('appView').hidden=false;}
async function launch(){try{const x=await req('/api/me');user=x.user;showApp();$('adminUsers').hidden=user.role!=='admin';$('fullExport').hidden=user.role!=='admin';document.querySelectorAll('[data-export]').forEach(b=>b.hidden=user.role!=='admin');$('protocolStatus').textContent=x.https?'ارتباط HTTPS برقرار است؛ روی گوشی نیز باید گواهی محلی مرکز مورداعتماد باشد.':'ارتباط HTTP است؛ برای دوربین زنده موبایل و امنیت رمز عبور در LAN سرور را با HTTPS اجرا کنید.';await Promise.all([overview(),references(),searchCatalog(''),moves()]);}catch(e){showLogin();}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await post('/api/login',values(e.currentTarget));$('loginMsg').textContent='';await launch();}catch(err){$('loginMsg').textContent=err.message;}});
$('logout').onclick=async()=>{try{await post('/api/logout',{});}catch{}showLogin();};
function view(name){document.querySelectorAll('.view').forEach(x=>x.hidden=x.id!==name);document.querySelectorAll('nav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name!=='scanner')stopCamera();if(name==='stock')moves();if(name==='settings'&&user?.role==='admin')usersList();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
async function overview(){let x=await req('/api/overview');$('stats').innerHTML=[['کالاهای اصلی',x.data.products],['انواع شرکت‌ها',x.data.variants],['بارکدها',x.data.barcodes],['سری‌های موجودی',x.data.lots],['خدمات',x.data.services]].map(([n,v])=>`<div class="stat"><b>${fnum(v)}</b><span>${h(n)}</span></div>`).join('');$('rootCode').placeholder='کد بعدی: '+x.data.next_code;}
async function references(){const x=await req('/api/reference');ref=x;const w=$('stockWarehouse');w.innerHTML=x.warehouses.map(z=>`<option value="${z.id}">${h(z.name)}</option>`).join('');$('stockSupplier').innerHTML='<option value="">انتخاب نشده</option>'+x.suppliers.map(z=>`<option value="${z.id}">${h(z.name)}</option>`).join('');$('warehouseList').innerHTML=x.warehouses.map(z=>`<div class="entry">${h(z.name)} <small>${h(z.location)}</small></div>`).join('');$('supplierList').innerHTML=x.suppliers.map(z=>`<div class="entry">${h(z.name)} <small>${h(z.phone)}</small></div>`).join('');$('serviceList').innerHTML=x.services.slice(-60).map(z=>`<div class="entry">${h(z.title)} <small>${h(z.code||'')} — ${fnum(z.tariff_price)} تومان</small></div>`).join('');}
const debounce=(fn,ms)=>{let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};};
async function searchCatalog(text){const x=await req('/api/search?q='+encodeURIComponent(text)+'&limit=100');catalog=x.products;renderCatalog();return catalog;}
function renderCatalog(){const root=$('catalogRows');root.innerHTML=catalog.length?catalog.map(p=>`<div class="catalog-item"><div class="catalog-top"><div><span class="code-chip">${h(p.code)}</span> <strong>${h(p.name)}</strong><small> ${h(p.category)} · موجودی معادل ${fnum(p.stock_base_units)} ${h(p.unit)}</small></div><div class="button-row"><button class="small-btn" data-act="detail" data-pid="${p.id}">مشاهده انواع</button><button class="small-btn" data-act="new-variant" data-pid="${p.id}">افزودن نوع تجاری</button><button class="small-btn" data-act="rename" data-pid="${p.id}">ویرایش نام اصلی</button></div></div>${p.variants.map(v=>`<div class="variant-row"><div><strong>${h(v.name)}</strong> <small>${h(v.brand)} ${h(v.company)} · بسته ${fnum(v.package_count)}تایی · موجودی ${fnum(v.stock)} بسته</small><div><small>${h(v.barcodes.map(b=>b.code).join(' | '))}</small></div></div><button class="small-btn" data-act="variant" data-pid="${p.id}" data-vid="${v.id}">جزئیات / چاپ</button></div>`).join('')}</div>`).join(''):'<div class="empty-state">موردی یافت نشد. برای شروع یک کالا تعریف کنید.</div>';}
$('catalogSearch').addEventListener('input',debounce(e=>searchCatalog(e.target.value).catch(err=>notice(err.message,true)),240));
$('reloadCatalog').onclick=()=>searchCatalog($('catalogSearch').value).catch(err=>notice(err.message,true));
$('quickSearch').addEventListener('input',debounce(async e=>{try{const text=e.target.value.trim();if(!text){$('quickResults').innerHTML='';return;}const data=await req('/api/search?q='+encodeURIComponent(text)+'&limit=20');$('quickResults').innerHTML=data.products.map(p=>`<button data-act="detail-search" data-pid="${p.id}"><span class="code-chip">${h(p.code)}</span> ${h(p.name)} <small>(${p.variants.length} نوع)</small></button>`).join('')||'<div class="hint">کالایی یافت نشد.</div>';}catch(err){notice(err.message,true);}},230));
let editorRootId=null;
function fillRootSelect(list){$('rootId').innerHTML='<option value="">ایجاد کالای اصلی جدید</option>'+list.map(p=>`<option value="${p.id}">${h(p.code)} — ${h(p.name)}</option>`).join('');}
async function openEditor(pid=null,barcode=''){
  $('catalogForm').reset();$('variantBarcodes').value=barcode;$('rootCode').value='';editorRootId=pid;
  const roots=await req('/api/search?limit=200');fillRootSelect(roots.products);
  if(pid && !roots.products.some(x=>x.id===Number(pid))){
    // The existing root may be far beyond the first 200 products: fetch by immutable id.
    const p=(await req('/api/product?id='+encodeURIComponent(pid))).product;
    $('rootId').insertAdjacentHTML('beforeend',`<option value="${p.id}">${h(p.code)} — ${h(p.name)}</option>`);
  }
  $('rootId').value=pid||'';syncEditor();$('editorHeading').textContent=pid?'افزودن نوع تجاری به کالای اصلی':'ثبت کالای اصلی و یک نوع تجاری';$('catalogEditor').hidden=false;view('catalog');$('catalogEditor').scrollIntoView({behavior:'smooth',block:'start'});
}
function syncEditor(){const exists=!!$('rootId').value;$('rootFields').disabled=exists;$('rootFields').style.opacity=exists?'.55':'1';}
$('rootId').onchange=syncEditor;
$('rootFindButton').onclick=async()=>{
  const q=$('rootFindCode').value.trim();if(!q){notice('نام یا کد کالای اصلی را وارد کنید.',true);return;}
  try{
    const exact=await req('/api/lookup?code='+encodeURIComponent(q));
    const candidates=exact.product?[exact.product]:(await req('/api/search?q='+encodeURIComponent(q)+'&limit=100')).products;
    if(!candidates.length){notice('کالای اصلی پیدا نشد. آن را جدید تعریف کنید.',true);return;}
    const sel=$('rootId');sel.innerHTML='<option value="">ایجاد کالای اصلی جدید</option>'+candidates.map(p=>`<option value="${p.id}">${h(p.code)} — ${h(p.name)}</option>`).join('');
    if(candidates.length===1){sel.value=candidates[0].id;syncEditor();notice('کالای اصلی انتخاب شد؛ اکنون نوع تجاری جدید را ثبت کنید.');}
    else{sel.value='';syncEditor();notice(candidates.length+' کالای مشابه پیدا شد؛ از فهرست انتخاب کنید.');}
  }catch(err){notice(err.message,true);}
};
$('rootFindCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('rootFindButton').click();}});
$('newCatalog').onclick=()=>openEditor().catch(err=>notice(err.message,true));
$('resetEditor').onclick=()=>openEditor(editorRootId).catch(err=>notice(err.message,true));
$('closeEditor').onclick=()=>$('catalogEditor').hidden=true;
$('catalogForm').addEventListener('submit',async e=>{
  e.preventDefault();const d=values(e.currentTarget);
  const raw=d.barcodes||'';const codes=[...new Set(raw.split(/[\n,،;؛\s]+/).map(normalizeScannedCode).filter(Boolean))];
  try{
    const x=await post('/api/catalog',{root_id:$('rootId').value?Number($('rootId').value):null,root:{code:d.root_code,name:d.root_name,category:d.root_category,unit:d.root_unit,min_stock:d.root_min},variant:{name:d.variant_name,brand:d.brand,company:d.company,specification:d.specification,package_count:d.package_count,purchase_price:d.purchase_price,sale_price:d.sale_price,barcodes:codes}});
    notice('کالای اصلی و نوع تجاری در دیتابیس مرکزی ثبت شد.');$('catalogEditor').hidden=true;await Promise.all([overview(),searchCatalog($('catalogSearch').value)]);showDetail(x.product.id,x.variant_id);
  }catch(err){notice('ذخیره انجام نشد: '+err.message,true);}
});
function showDetail(pid,vid=null){const p=catalog.find(x=>x.id===Number(pid));if(!p){req('/api/product?id='+encodeURIComponent(pid)).then(x=>{catalog.push(x.product);showDetail(pid,vid);}).catch(err=>notice(err.message,true));return;}
 currentProduct=p;
 $('productDetail').hidden=false;
 $('productDetail').innerHTML=`<h3><span class="code-chip">${h(p.code)}</span> ${h(p.name)}</h3><p>گروه: ${h(p.category||'—')} · واحد پایه: ${h(p.unit)} · موجودی معادل کل: ${fnum(p.stock_base_units)} ${h(p.unit)} (موجودی هر نوع جدا ثبت می‌شود)</p><div class="button-row"><button data-act="new-variant" data-pid="${p.id}" class="primary">افزودن نوع / شرکت جدید</button><button data-act="rename" data-pid="${p.id}">ویرایش اطلاعات اصلی</button></div>${p.variants.map(v=>`<div class="variant-box" ${vid===v.id?'style="border:2px solid #1682be"':''}><strong>${h(v.name)}</strong> <span class="muted">#${v.id}</span><p>برند: ${h(v.brand||'—')} | شرکت: ${h(v.company||'—')} | ${h(v.specification||'')} | هر بسته ${fnum(v.package_count)} ${h(p.unit)} | موجودی ${fnum(v.stock)} بسته</p><p>خرید: ${fnum(v.purchase_price)} | فروش: ${fnum(v.sale_price)} تومان برای هر بسته</p>${v.barcodes.map(b=>`<div class="detail-barcode"><span>${h(b.code)} <small>(${b.kind==='internal'?'مرکز':'سازنده'})</small></span><div><button class="small-btn" data-act="print" data-pid="${p.id}" data-vid="${v.id}" data-bid="${b.id}">چاپ بارکد</button>${b.kind==='factory'?`<button class="small-btn warn" data-act="remove-code" data-bid="${b.id}">حذف بارکد</button>`:''}</div></div>`).join('')}<div class="row-actions"><button class="small-btn" data-act="add-code" data-pid="${p.id}" data-vid="${v.id}">افزودن بارکد این نوع</button><button class="small-btn" data-act="edit-variant" data-pid="${p.id}" data-vid="${v.id}">ویرایش نام و قیمت نوع</button><button class="small-btn" data-act="select-stock" data-vid="${v.id}" data-pid="${p.id}">عملیات موجودی</button></div></div>`).join('')}`;
 $('productDetail').scrollIntoView({behavior:'smooth',block:'start'});
}
async function refreshProduct(pid,vid=null){await searchCatalog($('catalogSearch').value);if(!catalog.some(p=>p.id===Number(pid))){const data=await req('/api/search?q='+encodeURIComponent(String(currentProduct?.code||'')));for(const p of data.products)if(!catalog.some(x=>x.id===p.id))catalog.push(p);}showDetail(pid,vid);}

document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const pid=Number(b.dataset.pid),vid=Number(b.dataset.vid),bid=Number(b.dataset.bid);const act=b.dataset.act;
  try{
    if(act==='detail'||act==='variant')showDetail(pid,vid||null);
    if(act==='detail-search'){view('catalog');await searchCatalog($('quickSearch').value);showDetail(pid);}
    if(act==='new-variant')await openEditor(pid);
    if(act==='rename'){
      const p=catalog.find(x=>x.id===pid)||currentProduct;if(!p)return;
      const name=prompt('نام اصلی / ریشه‌ای کالا:',p.name);if(name===null)return;
      const category=prompt('گروه کالا:',p.category||'');if(category===null)return;
      await post('/api/rename-root',{id:pid,name,category,unit:p.unit,min_stock:p.min_stock,notes:p.notes});await refreshProduct(pid);notice('نام اصلی اصلاح شد.');
    }
    if(act==='add-code'){
      const code=prompt('بارکد جدید برای همین نوع کالا (EAN یا Code 128):');if(!code)return;
      await post('/api/add-barcode',{variant_id:vid,code});await refreshProduct(pid,vid);notice('بارکد جدید متصل شد.');
    }
    if(act==='remove-code'){
      if(!confirm('این بارکد کارخانه از این نوع کالا برداشته شود؟'))return;
      await post('/api/remove-barcode',{id:bid});await refreshProduct(currentProduct.id);notice('بارکد برداشته شد.');
    }
    if(act==='edit-variant'){
      const p=catalog.find(x=>x.id===pid)||currentProduct,v=p?.variants.find(x=>x.id===vid);if(!v)return;
      let name=prompt('نام تجاری/نام روی کالا',v.name);if(name===null)return;
      let pack=prompt('تعداد واحد داخل هر بسته',String(v.package_count));if(pack===null)return;
      let sale=prompt('قیمت فروش هر بسته',String(v.sale_price));if(sale===null)return;
      await post('/api/update-variant',{...v,id:vid,name,package_count:pack,sale_price:sale});await refreshProduct(pid,vid);notice('مشخصات نوع کالا اصلاح شد.');
    }
    if(act==='print'){
      const p=catalog.find(x=>x.id===pid)||currentProduct,v=p?.variants.find(x=>x.id===vid),bc=v?.barcodes.find(x=>x.id===bid);
      if(bc)printLabel(p,v,bc.code);
    }
    if(act==='select-stock'){
      const p=catalog.find(x=>x.id===pid)||currentProduct,v=p?.variants.find(x=>x.id===vid);if(p&&v){selectStock(p,v);view('stock');}
    }
  }catch(err){notice(err.message,true);}
});
function code128Draw(canvas,value){const str=String(value);const data=[104];for(const char of str){const n=char.charCodeAt(0)-32;if(n<0||n>95)throw Error('برای چاپ Code128، بارکد باید حروف لاتین و اعداد استاندارد داشته باشد.');data.push(n);}let sum=104;data.slice(1).forEach((n,i)=>sum+=n*(i+1));data.push(sum%103,106);const widths=data.flatMap(n=>[...CODE128_WIDTHS[n]].map(Number));const cv=canvas.getContext('2d'),factor=(canvas.width-20)/widths.reduce((a,b)=>a+b,0);cv.fillStyle='#fff';cv.fillRect(0,0,canvas.width,canvas.height);let x=10;cv.fillStyle='#000';widths.forEach((w,i)=>{if(i%2===0)cv.fillRect(x,7,w*factor,canvas.height-14);x+=w*factor;});}
function printLabel(p,v,code){try{$('labelRoot').textContent=p.code+' - '+p.name;$('labelVariant').textContent=v.name+' | '+(v.brand||v.company||'');$('labelBarcode').textContent=code;code128Draw($('labelCanvas'),code);window.print();}catch(e){notice(e.message,true);}}
async function identify(code){code=normalizeScannedCode(code);if(!code){notice('کد یا بارکدی دریافت نشده است.',true);return;}
  stopCamera();$('manualCode').value=code;const out=$('scanResult');out.innerHTML='<h3>در حال شناسایی...</h3>';
  try{const x=await req('/api/lookup?code='+encodeURIComponent(code));
    if(!x.product){
      const matched=(await req('/api/search?q='+encodeURIComponent(code)+'&limit=25')).products;
      if(matched.length===1){x.product=matched[0];x.variant_id=matched[0].variants.length===1?matched[0].variants[0].id:null;}
      else if(matched.length>1){
        out.innerHTML='<h3>چند کالای مشابه پیدا شد</h3><p>کالای اصلی یا نوع دقیق را از فهرست انتخاب کنید.</p>'+matched.map(p=>`<button class="scan-choice" data-id="${p.id}"><b>${h(p.code)}</b> ${h(p.name)} · ${p.variants.length} نوع</button>`).join('');
        out.querySelectorAll('.scan-choice').forEach(button=>button.onclick=async()=>{const p=matched.find(a=>a.id===Number(button.dataset.id));view('catalog');await searchCatalog(p.code);showDetail(p.id);});
        view('scanner');return;
      }
    }
    if(x.product){const p=x.product,vid=x.variant_id,v=p.variants.find(a=>a.id===vid);
      out.innerHTML=`<h3>کالا شناسایی شد</h3><div class="result-good"><strong>${h(p.code)} · ${h(p.name)}</strong><p>${v?'نوع دقیق: '+h(v.name)+' | '+h(v.brand||v.company||''):'کد اصلی شناسایی شد؛ '+p.variants.length+' نوع برای انتخاب وجود دارد.'}</p><p>موجودی: ${v?fnum(v.stock)+' بسته':fnum(p.stock_base_units)+' '+h(p.unit)+' (معادل واحد پایه)'}</p></div><div class="button-row"><button class="primary" id="openScanned">مشاهده همه مشخصات</button>${v?'<button id="stockScanned">خرید / فروش / موجودی این نوع</button>':''}</div>`;
      $('openScanned').onclick=async()=>{view('catalog');await searchCatalog(p.code);showDetail(p.id,vid);};
      if(v)$('stockScanned').onclick=()=>{selectStock(p,v);view('stock');};
      if(navigator.vibrate)navigator.vibrate(60);
    }else{
      out.innerHTML=`<h3>بارکد جدید</h3><div class="result-unknown"><strong dir="ltr">${h(code)}</strong><p>این بارکد در بانک مرکز ثبت نشده است. بارکد استخراج شد؛ نام/برند/تعداد بسته را باید از روی کالا وارد کنید، چون خود بارکد لزوماً این اطلاعات را ندارد.</p></div><div class="button-row"><button class="primary" id="registerUnknown">ثبت کالای جدید یا نوع جدید</button><button id="attachKnown">اتصال به نوع تجاری ثبت‌شده</button></div>`;
      $('registerUnknown').onclick=()=>openEditor(null,code).catch(e=>notice(e.message,true));
      $('attachKnown').onclick=async()=>{const q=prompt('کد عددی کالای اصلی را وارد کنید:');if(!q)return;const r=await req('/api/lookup?code='+encodeURIComponent(q));if(!r.product){notice('کد اصلی پیدا نشد.',true);return;}const variants=r.product.variants;const chosen=variants.length===1?variants[0]:variants.find(v=>v.id===Number(prompt('شماره نوع تجاری (شناسه نوع):\n'+variants.map(v=>v.id+' - '+v.name).join('\n'))));if(!chosen){notice('نوع انتخاب نشده است.',true);return;}await post('/api/add-barcode',{variant_id:chosen.id,code});notice('بارکد به نوع تجاری موجود متصل شد.');await identify(code);};
    }
    view('scanner');
  }catch(e){out.innerHTML='<div class="error">'+h(e.message)+'</div>';notice(e.message,true);}
}
$('manualCode').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();identify(e.target.value);}};
$('identifyManual').onclick=()=>identify($('manualCode').value);
$('createUnmarked').onclick=()=>openEditor().catch(e=>notice(e.message,true));
async function decodedImage(source,deep=false){
  if('BarcodeDetector' in window){try{const formats=await BarcodeDetector.getSupportedFormats();const wanted=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'].filter(x=>formats.includes(x));if(wanted.length){const result=await new BarcodeDetector({formats:wanted}).detect(source);if(result.length)return result[0].rawValue;}}catch(e){/*local fallback*/}}
  return decodeCanvasImage(source,{deep});
}
async function stopCamera(){scanning=false;clearTimeout(scanTick);if(currentCamera){currentCamera.getTracks().forEach(t=>t.stop());currentCamera=null;}$('cameraVideo').srcObject=null;$('cameraPlaceholder').hidden=false;}
async function startCamera(){if(scanning)return;
  try{if(!navigator.mediaDevices?.getUserMedia)throw Error('این آدرس مجوز دوربین زنده ندارد. برای گوشی HTTPS معتبر نصب کنید یا از عکس استفاده کنید.');
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
    currentCamera=stream;$('cameraVideo').srcObject=stream;await $('cameraVideo').play();scanning=true;$('cameraPlaceholder').hidden=true;$('cameraStatus').textContent='دوربین روشن است؛ بارکد را در کادر نگه دارید.';
    async function tick(){if(!scanning)return;if(busyDecode){scanTick=setTimeout(tick,200);return;}busyDecode=true;try{const found=await decodedImage($('cameraVideo'));if(found){let s=normalizeScannedCode(found);if(s===lastScanCode&&Date.now()-lastScanAt<1800)return;lastScanCode=s;lastScanAt=Date.now();await identify(s);return;}}catch(e){$('cameraStatus').textContent='تلاش مجدد برای تشخیص بارکد...';}finally{busyDecode=false;}if(scanning)scanTick=setTimeout(tick,250);}
    tick();
  }catch(e){$('cameraStatus').textContent=e.message;notice(e.message,true);stopCamera();}
}
$('startCamera').onclick=startCamera;$('stopCamera').onclick=stopCamera;
async function capture(source){if(!source){notice('تصویر برای اسکن موجود نیست.',true);return;}try{$('cameraStatus').textContent='در حال اسکن دقیق چند ناحیه تصویر...';let code=await decodedImage(source,true);if(code){await identify(code);}else{notice('بارکد تشخیص داده نشد. تصویر با نور بهتر/فاصله کمتر بگیرید یا کد را دستی وارد کنید.',true);$('cameraStatus').textContent='بارکد تشخیص داده نشد.';}}catch(e){notice(e.message,true);}}
$('captureFrame').onclick=()=>capture($('cameraVideo').videoWidth?$('cameraVideo'):null);
$('photoInput').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const image=new Image();const u=URL.createObjectURL(file);image.onload=async()=>{await capture(image);URL.revokeObjectURL(u);e.target.value='';};image.onerror=()=>{notice('عکس باز نشد.',true);URL.revokeObjectURL(u);};image.src=u;};
function selectStock(p,v){$('stockVariantId').value=v.id;$('stockLookup').value=p.code+' — '+p.name+' — '+v.name;$('stockVariantHint').textContent=`نوع انتخاب‌شده: ${v.name} · ${v.brand||v.company||''} · هر بسته ${v.package_count} ${p.unit} · موجودی ${fnum(v.stock)} بسته`;loadLots(v.id);}
$('stockLookup').addEventListener('keydown',async e=>{if(e.key!=='Enter')return;e.preventDefault();const q=e.target.value.trim();try{let data=await req('/api/lookup?code='+encodeURIComponent(q));if(!data.product){const r=await req('/api/search?q='+encodeURIComponent(q)+'&limit=20');if(r.products.length===1)data.product=r.products[0];else if(r.products.length===0){notice('کالایی پیدا نشد. ابتدا آن را ثبت کنید.',true);return;}else{notice('چند کالا یافت شد؛ در فهرست کالاها، نوع دقیق را انتخاب کنید.',true);view('catalog');$('catalogSearch').value=q;await searchCatalog(q);return;}}const p=data.product;if(data.variant_id){selectStock(p,p.variants.find(x=>x.id===data.variant_id));return;}if(p.variants.length===1){selectStock(p,p.variants[0]);return;}const chosen=Number(prompt('نوع تجاری را انتخاب کنید (شناسه):\n'+p.variants.map(v=>v.id+' — '+v.name).join('\n')));const v=p.variants.find(v=>v.id===chosen);if(v)selectStock(p,v);else notice('نوع دقیقی انتخاب نشد.',true);}catch(err){notice(err.message,true);}});
async function loadLots(vid){if(!vid)return;try{const x=await req('/api/lots?variant_id='+vid);let filtered=x.lots.filter(l=>l.warehouse_id===Number($('stockWarehouse').value));$('lotSelect').innerHTML='<option value="">سری جدید (ورود / شمارش)</option>'+filtered.map(l=>`<option value="${l.id}">ردیف ${l.id}: ${fnum(l.qty)} بسته · ${h(l.batch||'بدون سری')} · ${h(l.expiry||'بدون انقضا')}</option>`).join('');}catch(err){notice(err.message,true);}}
$('stockWarehouse').onchange=()=>loadLots($('stockVariantId').value);$('lotSelect').onchange=e=>$('lotId').value=e.target.value;
$('stockForm').onsubmit=async e=>{e.preventDefault();const x=values(e.currentTarget);if(!x.variant_id){notice('نوع کالا را انتخاب کنید.',true);return;}x.lot_id=$('lotSelect').value||null;
 if(['sale','use'].includes(x.kind)&&!x.lot_id){notice('برای فروش یا مصرف باید سری موجودی دقیق انتخاب شود.',true);return;}
 if(!confirm(`ثبت عملیات ${$('stockKind').selectedOptions[0].text}، ${x.quantity} بسته؟`))return;
 try{const out=await post('/api/stock',x);notice('ثبت شد؛ موجودی سری: '+fnum(out.stock_after)+' بسته.');await Promise.all([moves(),loadLots(x.variant_id),overview(),searchCatalog($('catalogSearch').value)]);}catch(err){notice(err.message,true);}
};
async function moves(){try{const x=await req('/api/moves');const kinds={purchase:'ورود/خرید',sale:'فروش',use:'مصرف',count:'شمارش',adjust:'اصلاح'};$('stockMoves').innerHTML=x.moves.length?x.moves.slice(0,70).map(m=>`<div class="entry"><strong>${h(m.root_code)} ${h(m.root_name)}</strong><div>${h(m.variant_name)} · ${h(kinds[m.kind]||m.kind)} · ${fnum(m.delta)} بسته</div><small>${h(m.warehouse_name)} | ${h(m.created_at.slice(0,16).replace('T',' '))} UTC | ${h(m.actor)}</small></div>`).join(''):'<div class="empty-state">هنوز گردش انبار ثبت نشده است.</div>';}catch{}}
for(const [id,type] of [['warehouseForm','warehouse'],['supplierForm','supplier'],['serviceForm','service']])$(id).onsubmit=async e=>{e.preventDefault();try{await post('/api/reference',{...values(e.currentTarget),type});e.currentTarget.reset();await references();notice('اطلاعات ثبت شد.');}catch(err){notice(err.message,true);}};
function browserDownload(url,filename){const a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.append(a);a.click();a.remove();}
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>browserDownload('/api/export-csv?type='+encodeURIComponent(b.dataset.export),'bastiyan-'+b.dataset.export+'.csv'));
$('fullExport').onclick=()=>browserDownload('/api/export','bastiyan-catalog-full.json');
$('passwordForm').onsubmit=async e=>{e.preventDefault();try{await post('/api/change-password',values(e.currentTarget));notice('رمز تغییر کرد. دوباره وارد شوید.');showLogin();}catch(err){notice(err.message,true);}};
$('userForm').onsubmit=async e=>{e.preventDefault();try{await post('/api/create-user',values(e.currentTarget));e.currentTarget.reset();await usersList();notice('کاربر جدید ایجاد شد.');}catch(err){notice(err.message,true);}};
async function usersList(){try{const data=await req('/api/users');$('usersList').innerHTML=data.users.map(x=>`<div class="entry">${h(x.username)}<small>${x.role==='admin'?'مدیر':'ثبت اطلاعات'}</small></div>`).join('');}catch{}}
launch();

// Native Android scanner forwards decoded codes directly into the same catalog workflow.
window.addEventListener('bastiyan-native-scan', event => {
  const code=normalizeScannedCode(event.detail?.code||'');
  if(!code)return;
  try { $('manualCode').value=code; view('scanner'); identify(code).catch(e=>notice(e.message,true)); }
  catch(e){notice(e.message,true);}
});
// Ping only the public status endpoint, never create database writes during reconnect.
let wasOffline=false;
async function watchConnection(){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),2800);
    let r;try{r=await fetch('/api/status',{cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(timeout);}
    const status=await r.json();
    if(!r.ok||!status.ok)throw Error('health');
    $('connectionText').textContent='متصل به سرور';
    document.querySelector('.live-dot')?.classList.remove('offline');
    if(wasOffline){wasOffline=false;notice('اتصال به سرور دوباره برقرار شد؛ اطلاعات فرم جاری حفظ شده است.');}
  }catch(e){
    wasOffline=true;$('connectionText').textContent='در حال اتصال مجدد…';
    document.querySelector('.live-dot')?.classList.add('offline');
  }
}
setInterval(watchConnection,5000);
