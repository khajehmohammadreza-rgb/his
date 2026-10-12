import React,{useState} from '../../client-vendor/react.js?b=r24-514-1405';
import {Send,CheckCircle2,AlertTriangle,MessageSquare} from '../../client-vendor/lucide-react.js?b=r24-514-1405';
const h=React.createElement;
const TYPES=[['tracking','کد پیگیری'],['lab','آزمایش'],['sonography','سونوگرافی'],['medicine','دارو / نسخه'],['other','سایر']];
const normalizeMobile=v=>String(v||'').trim();
export function TrackingCodeSmsPanel453({patient,item,settings={},currentUser,onUpdateQueueItem}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState(['tracking']),[code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const toggle=t=>setSelected(v=>v.includes(t)?v.filter(x=>x!==t):[...v,t]);
 const send=async()=>{
  const mobile=normalizeMobile(patient?.mobilePhone||item?.mobilePhone); if(!mobile){setResult({ok:false,text:'شماره همراه بیمار ثبت نشده است.'});return;}
  if(!code.trim()){setResult({ok:false,text:'کد پیگیری را وارد کنید.'});return;}
  const labels=TYPES.filter(([id])=>selected.includes(id)).map(([,label])=>label); if(!labels.length) labels.push('کد پیگیری');
  const typeText = labels.join('، ');
  const configuredTemplate = settings?.smsAutomation?.trackingCode?.template;
  let defaultMessage = `بیمار گرامی ${patient?.fullName||item?.patientName||''}، کد پیگیری ${typeText}: ${code.trim()}\n${settings?.centerName||settings?.clinicName||'مرکز درمانی'}`;
  if (configuredTemplate) {
    defaultMessage = String(configuredTemplate)
      .replaceAll('{patientName}', patient?.fullName || item?.patientName || '')
      .replaceAll('{type}', typeText)
      .replaceAll('{trackingCode}', code.trim())
      .replaceAll('{clinicName}', settings?.centerName || settings?.clinicName || 'مرکز درمانی');
  }
  const text=String(message||defaultMessage).trim(); setBusy(true);setResult(null);
  try{
   const r=await fetch('/api/sms/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobile,message:text})});
   const d=await r.json().catch(()=>({})); if(!r.ok||d.success===false)throw new Error(d.error||d.message||`HTTP ${r.status}`);
   const sentAt=new Date().toISOString();
   const smsEvent={id:`tracking-${item?.id||patient?.id}-${Date.now()}`,type:'tracking_code',patientId:patient?.id||item?.patientId||'',encounterId:item?.id||'',mobile,message:text,status:'sent',trackingCode:code.trim(),trackingTypes:selected,occurredAt:sentAt,actorId:currentUser?.id||'',actorName:currentUser?.name||currentUser?.fullName||''};
   const next={...item,trackingSmsHistory:[smsEvent,...(item?.trackingSmsHistory||[])],lastTrackingCode:code.trim(),lastTrackingSmsAt:sentAt}; onUpdateQueueItem?.(next);
   fetch('/api/communication/sms-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:smsEvent})}).catch(()=>{});
   setResult({ok:true,text:'کد پیگیری با موفقیت برای بیمار ارسال شد.'});setCode('');setMessage('');
  }catch(e){setResult({ok:false,text:String(e?.message||e)});}finally{setBusy(false);}
 };
 return h('section',{className:'bhis-tracking-sms-panel453'},
  h('button',{type:'button',className:open?'bhis-primary-button compact':'bhis-secondary-button compact',onClick:()=>setOpen(v=>!v)},h(MessageSquare,{className:'w-4 h-4'}),'ارسال کد پیگیری برای بیمار'),
  open?h('div',{className:'bhis-tracking-sms-body453'},
   h('div',{className:'bhis-tracking-sms-title'},h('div',null,h('strong',null,'ارسال کد پیگیری'),h('span',null,'برای آزمایش، سونوگرافی، دارو/نسخه یا سایر خدمات')),h('span',{className:'bhis-tracking-mobile453'},patient?.mobilePhone||item?.mobilePhone||'بدون موبایل')),
   h('div',{className:'bhis-tracking-checks453'},...TYPES.map(([id,label])=>h('label',{key:id,className:'bhis-tracking-check453'},h('input',{type:'checkbox',checked:selected.includes(id),onChange:()=>toggle(id)}),h('span',null,label)))),
   h('div',{className:'bhis-form-grid two'},h('label',{className:'bhis-field'},h('span',null,'کد پیگیری *'),h('input',{value:code,onChange:e=>setCode(e.target.value),placeholder:'مثلاً ۱۲۳۴۵۶۷۸۹',inputMode:'text'})),h('label',{className:'bhis-field'},h('span',null,'متن پیامک (اختیاری)'),h('input',{value:message,onChange:e=>setMessage(e.target.value),placeholder:'در صورت خالی بودن، متن پیش‌فرض ارسال می‌شود.'}))),
   h('div',{className:'bhis-tracking-default453'},'متن پیش‌فرض: کد پیگیری انتخاب‌شده + نام بیمار + نام مرکز.'),
   result?h('div',{className:`bhis-tracking-result453 ${result.ok?'ok':'error'}`},result.ok?h(CheckCircle2,{className:'w-4 h-4'}):h(AlertTriangle,{className:'w-4 h-4'}),result.text):null,
   h('button',{type:'button',className:'bhis-primary-button',disabled:busy,onClick:send},h(Send,{className:'w-4 h-4'}),busy?'در حال ارسال...':'ارسال پیامک کد پیگیری')
  ):null
 );
}
