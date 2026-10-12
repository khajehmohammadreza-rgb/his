import { jsx as _jsx, jsxs as _jsxs } from '../../client-vendor/react-jsx-runtime.js?b=r24-514-1405';
import React, { useEffect, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Bot, RefreshCw, CheckCircle2, AlertCircle, Activity, ShieldCheck } from '../../client-vendor/lucide-react.js?b=r24-514-1405';

// All communication is with the authenticated Bastiyan server. API keys never go to the AI provider from the browser.
export function BastiyanAiCenterPanel({config, meta, setConfig, onSave}) {
  const [status,setStatus]=useState(null),[models,setModels]=useState([]),[usage,setUsage]=useState(null),[busy,setBusy]=useState('');
  const [lastCheck,setLastCheck]=useState(null);
  const api=async(path,options={})=>{
    const res=await fetch('/api/bastian/ai/'+path,{credentials:'same-origin',cache:'no-store',...options});
    const content=await res.json().catch(()=>({}));
    if(!res.ok || !content.success)throw new Error(content.error||`خطای سرور (${res.status})`);
    return content;
  };
  const refreshStatus=async()=>{
    try {const d=await api('status');setStatus(d);setUsage(d.usage);}catch(e){setLastCheck({ok:false,text:e.message});}
  };
  useEffect(()=>{refreshStatus();},[]);
  const loadModels=async(refresh=false)=>{
    setBusy('models');setLastCheck(null);
    try {const d=await api('models'+(refresh?'?refresh=1':''));setModels(d.models||[]);setLastCheck({ok:true,text:`${d.count} مدل از فهرست سرویس دریافت شد.`});}
    catch(e){setLastCheck({ok:false,text:e.message});}
    finally{setBusy('');}
  };
  const test=async()=>{
    setBusy('test');setLastCheck(null);
    try {const d=await api('test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config?.defaultModel||''})});
      setLastCheck({ok:true,text:`اتصال برقرار شد؛ مدل ${d.model} پاسخ داد. ${d.reply||''}`});await refreshStatus();
    }catch(e){setLastCheck({ok:false,text:e.message});}
    finally{setBusy('');}
  };
  const put=(key,value)=>setConfig('chabokan_ai',key,value);
  const field='w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2 text-sm';
  return _jsxs('section',{dir:'rtl',className:'rounded-2xl border border-violet-500/40 bg-slate-950 p-4 space-y-4',children:[
    _jsxs('div',{className:'flex flex-wrap justify-between gap-3 items-start',children:[
      _jsxs('div',{className:'space-y-1',children:[_jsxs('h3',{className:'font-bold text-violet-200 text-lg text-right flex items-center gap-2',children:[_jsx(Bot,{className:'w-6 h-6'}),'مرکز مدیریت هوش مصنوعی باستیان']}),_jsx('p',{className:'text-xs text-slate-400',children:'کنترل متمرکز AI چابکان و دستیار لیلیان؛ مستقل از کلید پلتفرم چابکان و کلید Gemini'})]}),
      _jsx('span',{className:`rounded-full px-3 py-1 text-xs border ${status?.configured||meta?.configuredApiKey?'border-emerald-600 text-emerald-300':'border-amber-600 text-amber-300'}`,children:status?.configured||meta?.configuredApiKey?'کلید AI تنظیم شده':'کلید AI تنظیم نشده'})
    ]}),
    _jsxs('div',{className:'grid md:grid-cols-2 gap-3',children:[
      _jsxs('label',{className:'block space-y-1 text-xs text-slate-200',children:[_jsx('span',{children:'کلید مستقل هوش مصنوعی چابکان'}),_jsx('input',{type:'password',autoComplete:'new-password',value:config?.apiKey||'',onChange:e=>put('apiKey',e.target.value),placeholder:meta?.maskedKey||'کلید جدید؛ خالی = حفظ قبلی',className:field+' text-left',dir:'ltr'}),_jsx('small',{className:'text-slate-500',children:'کلید جدید فقط با دکمه «ذخیره امن تنظیمات» ذخیره می‌شود.'})]}),
      _jsxs('label',{className:'block space-y-1 text-xs text-slate-200',children:[_jsx('span',{children:'آدرس رسمی API (ثابت و امن)'}),_jsx('input',{type:'url',readOnly:true,value:'https://ai.chabokan.net/v1',className:field+' opacity-80 text-left',dir:'ltr'})]}),
      _jsxs('label',{className:'block space-y-1 text-xs text-slate-200',children:[_jsx('span',{children:'مدل پیش‌فرض لیلیان'}),_jsxs('select',{value:config?.defaultModel||'',onChange:e=>put('defaultModel',e.target.value),className:field,children:[_jsx('option',{value:'',children:'انتخاب خودکار از فهرست واقعی چابکان'}),...
        (config?.defaultModel && !models.some(m=>m.id===config.defaultModel)?[_jsx('option',{value:config.defaultModel,children:config.defaultModel})]:[]),
        ...models.map(m=>_jsx('option',{value:m.id,children:m.name?`${m.name} (${m.id})`:m.id},m.id))]})]}),
      _jsxs('label',{className:'block space-y-1 text-xs text-slate-200',children:[_jsx('span',{children:'حداکثر درخواست روزانه HIS (صفر = بدون محدودیت)'}),_jsx('input',{type:'number',min:0,max:10000,step:1,value:config?.dailyRequestLimit??100,onChange:e=>put('dailyRequestLimit',e.target.value),className:field,dir:'ltr'})]}),
    ]}),
    _jsx('p',{className:'text-xs text-slate-400 leading-6',children:'در حالت خودکار، لیلیان مدل را از فهرست واقعی حساب انتخاب می‌کند؛ شناسه مدل ساختگی یا ثابت استفاده نمی‌شود. ابتدا تنظیمات را ذخیره کنید؛ سپس مدل‌ها را دریافت یا تست کنید.'}),
    _jsxs('div',{className:'flex flex-wrap items-center gap-2',children:[
      _jsxs('button',{type:'button',disabled:!!busy,onClick:()=>loadModels(true),className:'bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-bold',children:[_jsx(RefreshCw,{className:'w-4 h-4'}),busy==='models'?'در حال دریافت...':'دریافت مدل‌های فعال']}),
      _jsxs('button',{type:'button',disabled:!!busy,onClick:test,className:'bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-bold',children:[_jsx(Activity,{className:'w-4 h-4'}),busy==='test'?'در حال آزمایش...':'تست واقعی اتصال']}),
      _jsxs('button',{type:'button',onClick:()=>{refreshStatus();},className:'border border-slate-700 text-slate-200 hover:bg-slate-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2',children:[_jsx(ShieldCheck,{className:'w-4 h-4'}),'بروزرسانی گزارش مصرف']}),
      _jsx('button',{type:'button',onClick:onSave,className:'border border-violet-500 text-violet-200 hover:bg-violet-900/40 rounded-lg px-3 py-2 text-xs font-bold',children:'ذخیره امن تنظیمات'}),
    ]}),
    lastCheck&&_jsxs('div',{role:'status',className:`p-3 rounded-xl border text-xs flex gap-2 items-start ${lastCheck.ok?'border-emerald-600/50 bg-emerald-950/30 text-emerald-200':'border-rose-600/50 bg-rose-950/30 text-rose-200'}`,children:[_jsx(lastCheck.ok?CheckCircle2:AlertCircle,{className:'w-4 h-4 shrink-0'}),_jsx('span',{children:lastCheck.text})]}),
    _jsxs('div',{className:'grid grid-cols-3 gap-2',children:[
      ...[['درخواست امروز',usage?.todayRequests??'—'],['توکن ورودی',usage?.todayInputTokens??'—'],['توکن خروجی',usage?.todayOutputTokens??'—']].map(([label,value])=>_jsxs('div',{className:'bg-slate-900 border border-slate-800 rounded-lg p-2 text-center',children:[_jsx('div',{className:'text-[11px] text-slate-400',children:label}),_jsx('div',{className:'text-lg font-bold text-slate-100',children:String(value)})]},label))
    ]}),
    models.length>0&&_jsxs('details',{className:'rounded-xl border border-slate-700 p-3',children:[_jsx('summary',{className:'cursor-pointer text-xs font-bold text-violet-200',children:`فهرست مدل‌ها (${models.length}) و مشخصات اعلام‌شده`}),_jsx('div',{className:'max-h-60 overflow-auto mt-2 space-y-1',children:models.map(m=>_jsxs('div',{className:'border-b border-slate-800 p-2 text-xs flex flex-wrap justify-between gap-2',children:[_jsx('span',{dir:'ltr',className:'font-mono text-slate-200',children:m.id}),_jsx('span',{className:'text-slate-400',children:`Context: ${m.context_length??'—'} | Max output: ${m.max_completion_tokens??'—'}`})]},m.id))})]}),
    _jsx('div',{className:'text-xs text-amber-200 border border-amber-800/40 rounded-xl bg-amber-950/20 p-3 leading-6',children:'برای داده‌های واقعی بیماران، پیش از فعال‌سازی ارسال اطلاعات به ارائه‌دهنده بیرونی، مجوز و الزامات محرمانگی را بررسی کنید. این پنل فقط درخواست آزمایشی ساختگی ارسال می‌کند. آمار مصرف داخلی جایگزین صورت‌حساب چابکان نیست.'})
  ]});
}
