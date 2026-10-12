import React,{useEffect,useMemo,useState} from '../../client-vendor/react.js?b=r24-514-1405';
import {Calendar,ChevronLeft,ChevronRight,Check,X,Clock} from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import {getJalaliDateString,parseJalaliDate,formatJalaliDate,toEnglishDigits,toPersianDigits,getDaysInJalaliMonth,getJalaliDayOfWeek,JALALI_MONTH_NAMES} from '../utils/jalali.js?b=r24-514-1405';
const h=React.createElement;
const pad=v=>String(v??'').padStart(2,'0');
const toNum=v=>Number(toEnglishDigits(String(v??'')).replace(/[^0-9]/g,''))||0;
function readDate(value){try{if(!value)return null;const x=parseJalaliDate(value);return {jy:Number(x.jy),jm:Number(x.jm),jd:Number(x.jd)}}catch{return null}}

export function JalaliDateField({label='تاریخ',value='',onChange,placeholder='۱۴۰۵/۰۱/۰۱',disabled=false,required=false,className='',allowParts=true}){
  const today=readDate(getJalaliDateString())||{jy:1405,jm:1,jd:1};
  const current=readDate(value)||today;
  const [open,setOpen]=useState(false);
  const [viewYear,setViewYear]=useState(current.jy);
  const [viewMonth,setViewMonth]=useState(current.jm);
  const [parts,setParts]=useState({y:String(current.jy),m:String(current.jm),d:String(current.jd)});
  useEffect(()=>{
    const p=readDate(value)||today;
    setViewYear(p.jy);setViewMonth(p.jm);setParts({y:String(p.jy),m:String(p.jm),d:String(p.jd)});
  },[value]);
  const maxDays=useMemo(()=>getDaysInJalaliMonth(viewYear,viewMonth),[viewYear,viewMonth]);
  const firstDay=useMemo(()=>getJalaliDayOfWeek(viewYear,viewMonth,1),[viewYear,viewMonth]);
  const cells=useMemo(()=>Array.from({length:firstDay},()=>null).concat(Array.from({length:maxDays},(_,i)=>i+1)),[firstDay,maxDays]);
  const emit=(y,m,d)=>{
    const yy=Math.max(1200,Math.min(1600,toNum(y)||today.jy));
    const mm=Math.max(1,Math.min(12,toNum(m)||today.jm));
    const max=getDaysInJalaliMonth(yy,mm);
    const dd=Math.max(1,Math.min(max,toNum(d)||1));
    onChange?.(formatJalaliDate(yy,mm,dd,true));
    setOpen(false);
  };
  const moveMonth=(delta)=>{
    let m=viewMonth+delta,y=viewYear;
    if(m>12){m=1;y+=1;} else if(m<1){m=12;y-=1;}
    setViewYear(Math.max(1200,Math.min(1600,y)));setViewMonth(m);
  };
  const commitParts=()=>emit(parts.y,parts.m,parts.d);
  const years=Array.from({length:201},(_,i)=>1200+i);
  return h('div',{className:`bhis-field bhis-jdate-field ${className}`},
    label?h('span',null,required?'* ':'',label):null,
    h('div',{className:'bhis-jdate-control'},
      h('input',{type:'text',value:value||'',placeholder,onChange:e=>onChange?.(e.target.value),onFocus:()=>!disabled&&setOpen(true),disabled,dir:'ltr','aria-label':label}),
      h('button',{type:'button',disabled,onClick:()=>setOpen(v=>!v),className:'bhis-jdate-trigger',title:'باز کردن تقویم'},h(Calendar,{className:'w-4 h-4'}))
    ),
    open?h('div',{className:'bhis-jdate-popover',dir:'rtl'},
      h('div',{className:'bhis-jdate-head'},
        h('button',{type:'button',onClick:()=>moveMonth(-1)},h(ChevronRight,{className:'w-4 h-4'})),
        h('select',{value:viewMonth,onChange:e=>setViewMonth(toNum(e.target.value))},...JALALI_MONTH_NAMES.map((name,i)=>h('option',{key:i,value:i+1},name))),
        h('select',{value:viewYear,onChange:e=>setViewYear(toNum(e.target.value))},...years.map(y=>h('option',{key:y,value:y},toPersianDigits(y)))),
        h('button',{type:'button',onClick:()=>moveMonth(1)},h(ChevronLeft,{className:'w-4 h-4'}))
      ),
      allowParts?h('div',{className:'bhis-jdate-parts'},
        h('input',{value:parts.y,onChange:e=>setParts(p=>({...p,y:e.target.value})),inputMode:'numeric',placeholder:'سال'}),
        h('input',{value:parts.m,onChange:e=>setParts(p=>({...p,m:e.target.value})),inputMode:'numeric',placeholder:'ماه'}),
        h('input',{value:parts.d,onChange:e=>setParts(p=>({...p,d:e.target.value})),inputMode:'numeric',placeholder:'روز'}),
        h('button',{type:'button',className:'bhis-primary-button compact',onClick:commitParts},h(Check,{className:'w-4 h-4'}),'ثبت تاریخ')
      ):null,
      h('div',{className:'bhis-jdate-week'},...['ش','ی','د','س','چ','پ','ج'].map(x=>h('span',{key:x},x))),
      h('div',{className:'bhis-jdate-grid'},...cells.map((day,i)=>day===null?h('span',{key:`e-${i}`,className:'bhis-jdate-empty'},''):h('button',{type:'button',key:`d-${day}`,className:day===current.jd&&viewMonth===current.jm&&viewYear===current.jy?'active':'',onClick:()=>emit(viewYear,viewMonth,day)},toPersianDigits(day)))),
      h('div',{className:'bhis-jdate-footer'},
        h('button',{type:'button',onClick:()=>emit(today.jy,today.jm,today.jd)},'امروز'),
        h('button',{type:'button',onClick:()=>{onChange?.('');setOpen(false)}},h(X,{className:'w-3.5 h-3.5'}),'پاک کردن')
      )
    ):null
  );
}

export function TimeMinuteField({label='ساعت',value='',onChange,disabled=false}){
  const now=new Date();
  const fallback=`${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const parts=String(value||fallback).split(':');
  const hh=pad(parts[0]||now.getHours());
  const mm=pad(parts[1]??now.getMinutes());
  const update=(h2,m2)=>onChange?.(`${pad(h2)}:${pad(m2)}`);
  return h('div',{className:'bhis-field bhis-time-field'},
    h('span',null,label),
    h('div',{className:'bhis-time-selects'},
      h(Clock,{className:'w-4 h-4'}),
      h('select',{value:hh,onChange:e=>update(e.target.value,mm),disabled,'aria-label':'ساعت'},...Array.from({length:24},(_,i)=>h('option',{key:i,value:pad(i)},pad(i)))),
      h('span',null,':'),
      h('select',{value:mm,onChange:e=>update(hh,e.target.value),disabled,'aria-label':'دقیقه'},...Array.from({length:60},(_,i)=>h('option',{key:i,value:pad(i)},pad(i))))
    )
  );
}
