import React,{useMemo,useState} from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, Users, Stethoscope, Activity, Receipt, CheckCircle2, Clock } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { isToday450 } from '../utils/clinicalFinance450.js?b=r24-514-1405';
const h=React.createElement;
const statusLabel=s=>({patient_selected:'انتخاب بیمار',patient_confirmed:'تأیید مشخصات',reception_service_entry:'ثبت اولیه',waiting_doctor:'منتظر پزشک',under_treatment:'در حال ویزیت',waiting_nurse:'منتظر دستیار/پرستار',under_nurse:'در حال خدمت',ready_for_discharge:'منتظر ترخیص',waiting_payment:'در حال تسویه',discharged:'ترخیص‌شده',completed:'تکمیل',cancelled:'لغو'}[s]||s||'—');
const icon=s=>s==='discharged'||s==='completed'?CheckCircle2:s==='waiting_doctor'||s==='under_treatment'?Stethoscope:s==='waiting_nurse'||s==='under_nurse'?Activity:s==='ready_for_discharge'||s==='waiting_payment'?Receipt:Clock;
export function DailyPatientStatus453({visitQueue=[],patients=[],onSelect}){
 const [q,setQ]=useState('');
 const rows=useMemo(()=>{
   const pmap=new Map((patients||[]).map(p=>[String(p.id),p]));
   return (visitQueue||[]).filter(x=>isToday450(x.registeredAt||x.createdAt||x.finalSettlementAt)).map(x=>{const p=pmap.get(String(x.patientId));return {...x,patientName:x.patientName||p?.fullName||'بیمار',patientCode:x.patientCode||p?.fileNumber||'—'};}).filter(x=>!q.trim()||`${x.patientName} ${x.patientCode} ${x.nationalId||''} ${x.receptionNotes||x.chiefComplaint||''} ${statusLabel(x.status)}`.toLowerCase().includes(q.trim().toLowerCase())).sort((a,b)=>new Date(b.registeredAt||0)-new Date(a.registeredAt||0));
 },[visitQueue,patients,q]);
 return h('section',{className:'bhis-daily-patients450'},
   h('header',null,h('div',null,h('span',{className:'bhis-eyebrow'},'کنترل پایان روز'),h('h2',null,'بیماران امروز و وضعیت نهایی'),h('p',null,'همه مراجعات امروز در یک لیست؛ پرونده قابل انتخاب است.')),h('span',{className:'bhis-count450'},rows.length.toLocaleString('fa-IR'))),
   h('label',{className:'bhis-global-live-search'},h(Search,{className:'w-4 h-4'}),h('input',{value:q,onChange:e=>setQ(e.target.value),placeholder:'جستجوی نام، پرونده، وضعیت یا توضیح...'})),
   h('div',{className:'bhis-daily-list450'},rows.length?rows.map((x,i)=>{const Icon=icon(x.status);return h('button',{type:'button',key:x.id,className:`bhis-daily-row450 ${i%2?'alt':''}`,onClick:()=>onSelect?.(x)},h('span',{className:'avatar'},h(Icon,{className:'w-4 h-4'})),h('span',{className:'main'},h('strong',null,x.patientName),h('small',null,`پرونده ${x.patientCode} • ${x.doctorName?`پزشک ${x.doctorName}`:'بدون پزشک'}`),h('em',null,x.receptionNotes||x.chiefComplaint||'بدون توضیح پذیرش')),h('span',{className:`status ${x.status}`},statusLabel(x.status)));}):h('div',{className:'bhis-worklist-empty'},h(Users,{className:'w-8 h-8'}),'مراجعه‌ای برای امروز ثبت نشده است.'))
 );
}
