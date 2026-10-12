import React,{useMemo,useState} from '../../client-vendor/react.js?b=r24-514-1405';
import {JalaliDateField,TimeMinuteField} from './JalaliDateField.js?b=r24-514-1405';
import {getJalaliDateString} from '../utils/jalali.js?b=r24-514-1405';
const h=React.createElement;
const money=v=>Number(v||0).toLocaleString('fa-IR');

export function AppointmentPlanningPanel({appointments=[],patients=[],doctors=[],users=[],medicalServices=[],serviceCategories=[],settings={},onAddAppointment,onUpdateAppointment}){
  const [q,setQ]=useState('');
  const [date,setDate]=useState(getJalaliDateString());
  const registeredDoctors=useMemo(()=>{
    const map=new Map();
    for(const d of doctors||[]) if(d&&d.active!==false) map.set(String(d.id),d);
    for(const u of users||[]) if(u&&u.active!==false&&(u.role==='doctor'||(u.roles||[]).includes('doctor'))) {
      if(!map.has(String(u.id))) map.set(String(u.id),{...u,name:u.name||u.fullName||'پزشک'});
    }
    return [...map.values()].sort((a,b)=>String(a.name||a.fullName||'').localeCompare(String(b.name||b.fullName||''),'fa'));
  },[doctors,users]);
  const registeredServices=useMemo(()=>(medicalServices||[]).filter(s=>s&&s.active!==false&&s.status!=='inactive').slice().sort((a,b)=>String(a.title||a.name||'').localeCompare(String(b.title||b.name||''),'fa')),[medicalServices]);
  const categoryNames=useMemo(()=>Object.fromEntries((serviceCategories||[]).map(c=>[String(c.id),c.title||c.name||'گروه خدمت'])),[serviceCategories]);
  const [form,setForm]=useState({patientId:'',doctorId:'',serviceId:'',date,time:'09:00',type:'outpatient',notes:''});
  const rows=useMemo(()=>appointments.filter(a=>!q||`${a.patientName||''} ${a.doctorName||''} ${a.title||''}`.includes(q)).filter(a=>!date||a.date===date).sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),[appointments,q,date]);
  const add=()=>{
    const p=patients.find(x=>x.id===form.patientId);
    const d=registeredDoctors.find(x=>String(x.id)===String(form.doctorId));
    const s=registeredServices.find(x=>String(x.id)===String(form.serviceId));
    if(!form.patientId||!form.doctorId||!form.serviceId||!form.date||!form.time){alert('بیمار، پزشک، خدمت، تاریخ و ساعت الزامی است');return;}
    onAddAppointment?.({...form,id:`apt-${Date.now()}`,patientName:p?.fullName||'',doctorName:d?.name||d?.fullName||'',serviceId:s?.id||'',title:s?.title||s?.name||'خدمت',serviceTitle:s?.title||s?.name||'',serviceCategoryId:s?.categoryId||s?.serviceCategoryId||'',serviceCategoryName:categoryNames[String(s?.categoryId||s?.serviceCategoryId||'')]||'',amount:Number(s?.tariffPrice??s?.price??0)||0,status:'scheduled',fiscalYear:Number(settings.activeFiscalYear)||Number(String(form.date).slice(0,4))});
    setForm(v=>({...v,notes:''}));
  };
  return h('div',{className:'bhis-build450 bhis-admin-module',dir:'rtl'},
    h('div',{className:'bhis-module-hero'},h('span',{className:'bhis-eyebrow'},'برنامه‌ریزی'),h('h1',null,'تقویم نوبت‌دهی و عمل'),h('p',null,'نوبت‌های سرپایی، عمل و بستری با تاریخ و ساعت قابل ویرایش.')),
    h('div',{className:'bhis-admin-form'},
      h('select',{value:form.patientId,onChange:e=>setForm(v=>({...v,patientId:e.target.value}))},h('option',{value:''},'بیمار'),...patients.map(x=>h('option',{key:x.id,value:x.id},x.fullName))),
      h('select',{value:form.doctorId,onChange:e=>setForm(v=>({...v,doctorId:e.target.value}))},h('option',{value:''},registeredDoctors.length?'انتخاب پزشک ثبت‌شده':'پزشک فعالی در مرکز ثبت نشده'),...registeredDoctors.map(x=>h('option',{key:x.id,value:x.id},`${x.name||x.fullName}${x.specialty?` — ${x.specialty}`:''}`))),
      h('select',{value:form.serviceId,onChange:e=>{const id=e.target.value;const s=registeredServices.find(x=>String(x.id)===String(id));setForm(v=>({...v,serviceId:id,type:s?.type||s?.serviceType||v.type}));}},h('option',{value:''},registeredServices.length?'انتخاب خدمت ثبت‌شده':'خدمت فعالی در مرکز ثبت نشده'),...registeredServices.map(x=>h('option',{key:x.id,value:x.id},`${x.title||x.name}${categoryNames[String(x.categoryId||x.serviceCategoryId||'')]?` — ${categoryNames[String(x.categoryId||x.serviceCategoryId||'')]}`:''}${Number(x.tariffPrice??x.price??0)>0?` — ${money(x.tariffPrice??x.price)} تومان`:''}`))),
      h('select',{value:form.type,onChange:e=>setForm(v=>({...v,type:e.target.value}))},h('option',{value:'outpatient'},'سرپایی'),h('option',{value:'hospital'},'بستری / عمل')),
      h(JalaliDateField,{label:'تاریخ',value:form.date,onChange:v=>setForm(x=>({...x,date:v})),required:true}),
      h(TimeMinuteField,{label:'ساعت',value:form.time,onChange:v=>setForm(x=>({...x,time:v}))}),
      h('input',{placeholder:'توضیحات',value:form.notes,onChange:e=>setForm(v=>({...v,notes:e.target.value}))}),
      h('button',{className:'bhis-primary-button',onClick:add},'ثبت نوبت')
    ),
    h('div',{className:'bhis-admin-toolbar'},
      h('input',{value:q,onChange:e=>setQ(e.target.value),placeholder:'جستجوی بیمار، پزشک یا خدمت'}),
      h(JalaliDateField,{label:'فیلتر تاریخ',value:date,onChange:setDate})
    ),
    h('div',{className:'bhis-admin-list'},...rows.map(a=>h('div',{className:'bhis-admin-row',key:a.id},
      h('div',null,h('strong',null,`${a.patientName||'بیمار'} — ${a.title||'نوبت'}`),h('small',null,`${a.doctorName||'پزشک'} • ${a.date} • ${a.time} • ${a.type==='hospital'?'بستری/عمل':'سرپایی'}`)),
      h('div',{className:'flex items-center gap-2'},
        h('span',{className:'text-[10px] text-slate-500'},money(a.amount||0)),
        h('select',{value:a.status||'scheduled',onChange:e=>onUpdateAppointment?.({...a,status:e.target.value})},h('option',{value:'scheduled'},'فعال'),h('option',{value:'completed'},'انجام شد'),h('option',{value:'cancelled'},'لغو'))
      )
    )))
  );
}
