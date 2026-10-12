import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Clock as Clock3 } from '../../client-vendor/lucide-react.js?b=r24-514-1405';

const h = React.createElement;
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (date) => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const atNoon = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
const addDays = (date, days) => { const d=atNoon(date); d.setDate(d.getDate()+days); return d; };
const faNumber = (n) => Number(n || 0).toLocaleString('fa-IR', { useGrouping:false });
const PARTS = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year:'numeric', month:'numeric', day:'numeric' });
const MONTH_TITLE = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year:'numeric', month:'long' });
const FULL_DATE = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

function persianParts(date) {
  const parts = Object.fromEntries(PARTS.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return { year:Number(parts.year), month:Number(parts.month), day:Number(parts.day) };
}
function firstOfPersianMonth(seed) {
  const target=persianParts(seed); let d=addDays(seed,-38);
  for(let i=0;i<80;i+=1){ const p=persianParts(d); if(p.year===target.year&&p.month===target.month&&p.day===1)return d; d=addDays(d,1); }
  return atNoon(seed);
}
function monthDays(first) {
  const target=persianParts(first); const days=[]; let d=atNoon(first);
  for(let i=0;i<32;i+=1){ const p=persianParts(d); if(p.year!==target.year||p.month!==target.month)break; days.push(d); d=addDays(d,1); }
  return days;
}
function nextMonth(first){ const days=monthDays(first); return firstOfPersianMonth(addDays(days[days.length-1]||first,1)); }
function prevMonth(first){ return firstOfPersianMonth(addDays(first,-1)); }
function appointmentRows(visitQueue=[]){
  const out=[]; const seen=new Set();
  for(const q of visitQueue||[]){
    for(const a of q.appointments||[]){
      if(!a?.date||a.status==='cancelled')continue;
      const key=a.id||`${q.id}-${a.date}-${a.serviceId}-${a.time||''}`; if(seen.has(key))continue; seen.add(key);
      out.push({...a,patientName:a.patientName||q.patientName||'',sourceEncounterId:q.id});
    }
    for(const o of q.clinicalOrders||[]){
      if(o?.timing!=='future'||!o.scheduledDate||o.status==='cancelled')continue;
      const key=`order-${o.id}`; if(seen.has(key))continue; seen.add(key);
      out.push({id:key,date:o.scheduledDate,time:o.scheduledTime||'',serviceId:o.serviceId,title:o.title,type:o.serviceType||'outpatient',patientName:q.patientName||'',status:o.status||'scheduled',sourceEncounterId:q.id});
    }
  }
  return out;
}

export function PersianAppointmentCalendar({open=false,visitQueue=[],service=null,patient=null,initialDate='',initialTime='',title='انتخاب تاریخ نوبت',onConfirm,onClose}){
  const today=useMemo(()=>atNoon(new Date()),[]);
  const parsedInitial=useMemo(()=>{ if(!initialDate)return today; const [y,m,d]=initialDate.split('-').map(Number); return y&&m&&d?new Date(y,m-1,d,12):today; },[initialDate,today]);
  const [viewFirst,setViewFirst]=useState(()=>firstOfPersianMonth(parsedInitial));
  const [selectedDate,setSelectedDate]=useState(initialDate||isoLocal(today));
  const [selectedTime,setSelectedTime]=useState(initialTime||'09:00');
  useEffect(()=>{ if(open){setViewFirst(firstOfPersianMonth(parsedInitial));setSelectedDate(initialDate||isoLocal(today));setSelectedTime(initialTime||'09:00');} },[open,initialDate,initialTime]);
  const allAppointments=useMemo(()=>appointmentRows(visitQueue),[visitQueue]);
  const counts=useMemo(()=>{const map=new Map();for(const a of allAppointments)map.set(a.date,(map.get(a.date)||0)+1);return map;},[allAppointments]);
  const selectedRows=useMemo(()=>allAppointments.filter(a=>a.date===selectedDate).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))),[allAppointments,selectedDate]);
  const days=useMemo(()=>monthDays(viewFirst),[viewFirst]);
  const offset=(viewFirst.getDay()+1)%7;
  if(!open)return null;
  const selectedObj=(()=>{const [y,m,d]=selectedDate.split('-').map(Number);return y?new Date(y,m-1,d,12):today;})();
  const times=[]; for(let hour=7;hour<=20;hour+=1){times.push(`${pad(hour)}:00`); if(hour<20)times.push(`${pad(hour)}:30`);}
  return h('div',{className:'bhis-picker-overlay',dir:'rtl',role:'dialog','aria-modal':'true'},
    h('div',{'data-testid':'persian-appointment-calendar',className:'bhis-calendar-panel'},
      h('header',{className:'bhis-calendar-head'},
        h('div',null,h('strong',null,title),h('span',null,service?`${service.title||service.name||'خدمت'} • ${patient?.fullName||patient?.patientName||''}`:'تقویم نوبت‌دهی مرکز')),
        h('button',{type:'button',className:'bhis-icon-button',onClick:onClose},h(X,{className:'w-5 h-5'}))
      ),
      h('div',{className:'bhis-calendar-body'},
        h('section',{className:'bhis-calendar-main'},
          h('div',{className:'bhis-calendar-nav'},
            h('button',{type:'button',onClick:()=>setViewFirst(prevMonth(viewFirst)),title:'ماه قبل'},h(ChevronRight,{className:'w-5 h-5'})),
            h('div',null,h('strong',null,MONTH_TITLE.format(viewFirst)),h('button',{type:'button',onClick:()=>{setViewFirst(firstOfPersianMonth(today));setSelectedDate(isoLocal(today));}},'امروز')),
            h('button',{type:'button',onClick:()=>setViewFirst(nextMonth(viewFirst)),title:'ماه بعد'},h(ChevronLeft,{className:'w-5 h-5'}))
          ),
          h('div',{className:'bhis-calendar-weekdays'},...['ش','ی','د','س','چ','پ','ج'].map(x=>h('span',{key:x},x))),
          h('div',{className:'bhis-calendar-grid'},
            ...Array.from({length:offset},(_,i)=>h('span',{key:`empty-${i}`,className:'empty'})),
            ...days.map(date=>{const iso=isoLocal(date),p=persianParts(date),count=counts.get(iso)||0,isToday=iso===isoLocal(today),selected=iso===selectedDate,past=date<addDays(today,0);return h('button',{key:iso,type:'button',disabled:past,className:`bhis-calendar-day ${selected?'selected':''} ${isToday?'today':''} ${count?'has-appointments':''}`,onClick:()=>setSelectedDate(iso)},h('strong',null,faNumber(p.day)),count?h('em',null,faNumber(count)):null);})
          )
        ),
        h('aside',{className:'bhis-calendar-side'},
          h('div',{className:'bhis-calendar-selected'},h('span',null,'تاریخ انتخابی'),h('strong',null,FULL_DATE.format(selectedObj))),
          h('label',{className:'bhis-field'},h('span',null,'ساعت نوبت'),h('select',{'data-testid':'appointment-time',value:selectedTime,onChange:e=>setSelectedTime(e.target.value)},...times.map(t=>h('option',{key:t,value:t},t)))),
          h('div',{className:'bhis-calendar-load'},h('div',{className:'bhis-calendar-load-title'},h(Clock3,{className:'w-4 h-4'}),h('strong',null,'نوبت‌های ثبت‌شده این روز'),h('span',null,faNumber(selectedRows.length))),selectedRows.length===0?h('p',null,'برای این روز نوبت ثبت‌شده‌ای وجود ندارد.'):h('div',{className:'bhis-calendar-load-list'},...selectedRows.map(a=>h('div',{key:a.id||`${a.date}-${a.time}-${a.patientName}`},h('strong',null,a.time||'بدون ساعت'),h('span',null,a.title||'خدمت'),h('small',null,a.patientName||'—'))))),
          h('button',{type:'button','data-testid':'appointment-confirm',className:'bhis-primary-button prominent',onClick:()=>onConfirm?.({date:selectedDate,time:selectedTime,jalaliLabel:FULL_DATE.format(selectedObj),persian:persianParts(selectedObj)})},h(CheckCircle2,{className:'w-4 h-4'}),'ثبت این تاریخ و ساعت')
        )
      )
    )
  );
}

export function formatPersianAppointmentDate(iso=''){
  if(!iso)return '';
  const [y,m,d]=String(iso).split('-').map(Number); if(!y||!m||!d)return iso;
  return FULL_DATE.format(new Date(y,m-1,d,12));
}
export function todayIso(){ return isoLocal(new Date()); }
