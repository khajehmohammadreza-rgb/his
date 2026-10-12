import { getUserDisplayName } from './clinicalWorkflow.js?b=r24-514-1405';
import { parseMoney450 } from './money450.js?b=r24-514-1405';
import { toEnglishDigits, parseJalaliDate, jalaliToGregorian } from './jalali.js?b=r24-514-1405';

export const PAYMENT_METHOD_LABELS_450 = {
  cash:'نقدی', card:'کارتخوان متصل', standalone_pos:'کارتخوان مستقل', bank_transfer:'کارت‌به‌کارت / حواله بانکی',
  deposit_receipt:'فیش واریزی به حساب', online_gateway:'درگاه آنلاین', cheque:'چک', credit:'اعتباری', split:'ترکیبی', other:'سایر'
};
export const todayKey450 = (d=new Date()) => d.toLocaleDateString('en-CA');
const paymentDateParts450 = (details={}) => {
  const rawDate = toEnglishDigits(String(details.transactionDate||'').trim());
  const rawTime = toEnglishDigits(String(details.transactionTime||'').trim()) || '12:00';
  const [hhRaw='12',mmRaw='00'] = rawTime.split(':');
  const hh=Math.min(23,Math.max(0,Number(hhRaw)||0));
  const mm=Math.min(59,Math.max(0,Number(mmRaw)||0));
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) { const [gy,gm,gd]=rawDate.split('-').map(Number); return {gy,gm,gd,hh,mm,sourceDate:rawDate}; }
  if (/^(?:1[34]\d{2}|15\d{2})[\/.\-]\d{1,2}[\/.\-]\d{1,2}$/.test(rawDate) || /^(?:1[34]\d{6}|15\d{6})$/.test(rawDate)) { const {jy,jm,jd}=parseJalaliDate(rawDate); const {gy,gm,gd}=jalaliToGregorian(jy,jm,jd); return {gy,gm,gd,hh,mm,sourceDate:rawDate}; }
  const now=new Date(); return {gy:now.getFullYear(),gm:now.getMonth()+1,gd:now.getDate(),hh:now.getHours(),mm:now.getMinutes(),sourceDate:rawDate};
};
export const paymentLocalDateTime450 = (details={}) => {
  const {gy,gm,gd,hh,mm}=paymentDateParts450(details);
  const pad=n=>String(Number(n)||0).padStart(2,'0');
  return `${String(gy).padStart(4,'0')}-${pad(gm)}-${pad(gd)} ${pad(hh)}:${pad(mm)}:00`;
};
export const paymentOccurredAt450 = (details={}) => {
  const {gy,gm,gd,hh,mm}=paymentDateParts450(details);
  return new Date(gy,gm-1,gd,hh,mm,0,0).toISOString();
};
export function makePaymentReceipt450({encounter,patient,method,amount,details,actor,note=''}){
  const now=new Date().toISOString(); const occurredAt=paymentOccurredAt450(details); const occurredLocal=paymentLocalDateTime450(details);
  return {id:`pay450-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,encounterId:encounter?.id||'',patientId:patient?.id||encounter?.patientId||'',patientName:patient?.fullName||encounter?.patientName||'',patientCode:patient?.fileNumber||encounter?.patientCode||'',method,methodLabel:PAYMENT_METHOD_LABELS_450[method]||method,amount:Math.max(0,parseMoney450(amount)),trackingNumber:String(details?.transactionNumber||'').trim(),transactionDate:String(details?.transactionDate||'').trim(),transactionTime:String(details?.transactionTime||'').trim(),occurredAt,occurredLocal,reportDate:String(details?.transactionDate||'').trim(),recordedAt:now,recordedById:actor?.id||'',recordedByName:getUserDisplayName(actor),note:String(note||'').trim(),status:'posted',reportBucket:method==='deposit_receipt'?'deposit_receipt':method};
}
export function makeDiscount450({encounter,amount,reason,authorizer,actor}){
  const a=Math.max(0,parseMoney450(amount)); if(a<=0) throw new Error('مبلغ تخفیف باید بیشتر از صفر باشد.');
  if(!String(reason||'').trim()) throw new Error('دلیل تخفیف الزامی است.');
  if(!authorizer?.id) throw new Error('دستوردهنده / تأییدکننده تخفیف الزامی است.');
  return {id:`disc450-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,encounterId:encounter?.id||'',patientId:encounter?.patientId||'',type:'discount',amount:a,reason:String(reason).trim(),authorizerId:authorizer.id,authorizerName:getUserDisplayName(authorizer),recordedById:actor?.id||'',recordedByName:getUserDisplayName(actor),createdAt:new Date().toISOString(),reportCategory:'تخفیف'};
}
export function isVisitLine450(line={}) { const text=`${line.serviceType||''} ${line.clinicalType||''} ${line.category||''} ${line.title||''}`; return /visit|medical_visit|ویزیت/i.test(text); }
export function previousChargedVisit450(queue=[], patientId='', doctorId='', at=new Date()){
  const t=at.getTime(); return (queue||[]).filter(q=>String(q.patientId)===String(patientId)&&!['cancelled'].includes(q.status)).find(q=>{
    // Build451 policy: one chargeable physician visit per patient in any rolling 24-hour window, regardless of physician.
    if(!(q.services||[]).some(x=>isVisitLine450(x)&&Number(x.unitPrice??x.price??0)>0)) return false;
    const qt=new Date(q.registeredAt||q.createdAt||0).getTime(); return Number.isFinite(qt)&&qt>0&&(t-qt)>=0&&(t-qt)<86400000;
  })||null;
}
export function enforceRepeatVisit450(lines=[], previousVisit=null){
  if(!previousVisit) return {lines,isRepeat:false}; let changed=false;
  const next=(lines||[]).map(x=>{if(!changed&&isVisitLine450(x)){changed=true;return {...x,originalVisitPrice:Number(x.unitPrice??x.price??0),unitPrice:0,price:0,priceSnapshot:0,repeatVisitWithin24h:true,repeatVisitSourceEncounterId:previousVisit.id||'',reportCategory:'ویزیت مجدد ۲۴ ساعته بدون هزینه'};}return x;});
  return {lines:next,isRepeat:changed};
}
export async function postClinicalFinance450(route,payload){
  try{const res=await fetch(`/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok||data.success===false) throw new Error(data.error||`HTTP ${res.status}`);return data;}catch(err){console.warn(`[Bastiyan 4.5] ${route} sync failed`,err);return {success:false,error:String(err?.message||err)};}
}

export function validatePaymentDetails450(method, details = {}, amount = 0) {
  if (method === 'credit') return { ok: true };
  if (Number(amount || 0) < 0) return { ok:false, error:'مبلغ پرداخت نامعتبر است.' };
  if (method === 'deposit_receipt') {
    if (!String(details.transactionNumber || '').trim()) return { ok:false, error:'برای فیش واریزی، شماره پیگیری الزامی است.' };
    if (!String(details.transactionDate || '').trim()) return { ok:false, error:'برای فیش واریزی، تاریخ فیش الزامی است.' };
    if (!String(details.transactionTime || '').trim()) return { ok:false, error:'برای فیش واریزی، ساعت فیش الزامی است.' };
  }
  if (['card','standalone_pos','bank_transfer','online_gateway'].includes(method) && !String(details.transactionNumber || '').trim()) {
    return { ok:false, error:'شماره پیگیری/مرجع این پرداخت را وارد کنید.' };
  }
  return { ok:true };
}
