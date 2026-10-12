import React,{useMemo,useState} from '../../client-vendor/react.js?b=r24-514-1405';
import {JalaliDateField} from './JalaliDateField.js?b=r24-514-1405';
const h=React.createElement;
const n=v=>Number(v||0);
const pct=v=>Math.max(0,Math.min(100,n(v)));
const blankI={name:'',code:'',type:'public',active:true,contact:'',address:'',notes:''};
const blankC={insurerId:'',title:'',contractCode:'',validFrom:'',validTo:'',patientSharePercent:30,insurerSharePercent:70,differencePercent:0,differenceAction:'patient',franchiseAmount:0,ceilingAmount:0,requiresReferral:false,requiresApproval:false,maxVisits:0,notes:'',active:true,groupRules:[]};
const blankR={contractId:'',scope:'kind',targetId:'service',coverageMode:'insured',patientSharePercent:30,insurerSharePercent:70,differencePercent:0,differenceAction:'patient',active:true};
const blankT={insurerId:'',contractId:'',itemKind:'service',serviceId:'',coverageMode:'custom',baseTariff:0,insuredTariff:0,patientSharePercent:30,insurerSharePercent:70,differencePercent:0,differenceAction:'patient',patientFixedAmount:0,insurerFixedAmount:0,overrideInsurerId:'',overrideContractId:'',active:true,notes:''};
const field=(label,value,onChange,extra={})=>h('label',{className:'bhis-field'},h('span',null,label),h('input',{...extra,value,onChange:e=>onChange(e.target.value)}));
const select=(label,value,onChange,rows)=>h('label',{className:'bhis-field'},h('span',null,label),h('select',{value,onChange:e=>onChange(e.target.value)},...rows));
const shareText=x=>`بیمار ${pct(x.patientSharePercent)}٪ • بیمه ${pct(x.insurerSharePercent)}٪ • مابه‌التفاوت ${pct(x.differencePercent)}٪ (${x.differenceAction==='discount'?'تخفیف':x.differenceAction==='insurer'?'بیمه':'بیمار'})`;

export function InsuranceManagement({settings={},onUpdateSettings,medicalServices=[],serviceCategories=[],products=[],productCategories=[]}){
  const catalog=settings.insuranceCatalog||{insurers:[],contracts:[],tariffs:[]};
  const insurers=catalog.insurers||[], contracts=catalog.contracts||[], tariffs=catalog.tariffs||[];
  const [tab,setTab]=useState('insurers');
  const [i,setI]=useState({...blankI});
  const [c,setC]=useState({...blankC});
  const [r,setR]=useState({...blankR});
  const [t,setT]=useState({...blankT});
  const save=(part,rows)=>onUpdateSettings?.({...settings,insuranceCatalog:{...catalog,[part]:rows}});
  const insurerNames=useMemo(()=>Object.fromEntries(insurers.map(x=>[String(x.id),x.name])),[insurers]);
  const contractNames=useMemo(()=>Object.fromEntries(contracts.map(x=>[String(x.id),x.title])),[contracts]);
  const activeInsurers=insurers.filter(x=>x.active!==false);

  const saveInsurer=()=>{
    if(!i.name.trim())return alert('نام بیمه الزامی است.');
    const row={...i,id:i.id||`ins-${Date.now()}`};
    save('insurers',i.id?insurers.map(x=>x.id===i.id?row:x):[row,...insurers]);setI({...blankI});
  };
  const saveContract=()=>{
    if(!c.insurerId||!c.title.trim())return alert('بیمه و عنوان قرارداد الزامی است.');
    const p=pct(c.patientSharePercent), ins=pct(c.insurerSharePercent), diff=pct(c.differencePercent);
    if(p+ins+diff>100.001)return alert('جمع سهم بیمار، بیمه و مابه‌التفاوت نمی‌تواند بیشتر از ۱۰۰٪ باشد.');
    const old=contracts.find(x=>x.id===c.id);
    const row={...c,patientSharePercent:p,insurerSharePercent:ins,differencePercent:diff,groupRules:c.groupRules||old?.groupRules||[],id:c.id||`con-${Date.now()}`};
    save('contracts',c.id?contracts.map(x=>x.id===c.id?row:x):[row,...contracts]);setC({...blankC});
  };
  const saveGroupRule=()=>{
    const con=contracts.find(x=>String(x.id)===String(r.contractId)); if(!con)return alert('قرارداد را انتخاب کنید.');
    if(!r.targetId)return alert('گروه یا نوع هدف را انتخاب کنید.');
    const rule={...r,id:r.id||`igr-${Date.now()}`,patientSharePercent:pct(r.patientSharePercent),insurerSharePercent:pct(r.insurerSharePercent),differencePercent:pct(r.differencePercent)};
    if(rule.patientSharePercent+rule.insurerSharePercent+rule.differencePercent>100.001)return alert('جمع درصدها بیشتر از ۱۰۰٪ است.');
    const rules=(con.groupRules||[]);
    const updated={...con,groupRules:r.id?rules.map(x=>x.id===r.id?rule:x):[rule,...rules]};
    save('contracts',contracts.map(x=>x.id===con.id?updated:x));setR({...blankR,contractId:con.id});
  };
  const saveOverride=()=>{
    if(!t.insurerId||!t.serviceId)return alert('بیمه و خدمت/کالا الزامی است.');
    const row={...t,id:t.id||`tar-${Date.now()}`,patientSharePercent:pct(t.patientSharePercent),insurerSharePercent:pct(t.insurerSharePercent),differencePercent:pct(t.differencePercent)};
    if(row.coverageMode==='custom'&&row.patientSharePercent+row.insurerSharePercent+row.differencePercent>100.001)return alert('جمع درصدها بیشتر از ۱۰۰٪ است.');
    save('tariffs',t.id?tariffs.map(x=>x.id===t.id?row:x):[row,...tariffs]);setT({...blankT});
  };

  const targetOptions=()=>{
    if(r.scope==='kind')return [h('option',{value:'service'},'همه خدمات'),h('option',{value:'product'},'همه کالاها')];
    if(r.scope==='type'){
      const types=Array.from(new Set((medicalServices||[]).map(s=>s.serviceType||s.type).filter(Boolean)));
      return types.map(x=>h('option',{key:x,value:x},x==='visit'?'ویزیت':x==='outpatient'?'خدمات سرپایی':x==='hospital'?'خدمات بیمارستانی/عمل':x));
    }
    const cats=[...(serviceCategories||[]).map(x=>({id:x.id,title:`خدمات — ${x.title||x.name}`})),...(productCategories||[]).map(x=>({id:x.id,title:`کالا — ${x.title||x.name}`}))];
    return cats.map(x=>h('option',{key:x.id,value:x.id},x.title));
  };
  const itemOptions=t.itemKind==='product'?products:medicalServices;
  const selectedItem=itemOptions.find(x=>String(x.id)===String(t.serviceId));
  const allRules=contracts.flatMap(con=>(con.groupRules||[]).map(rule=>({...rule,contractId:con.id,contractTitle:con.title,insurerId:con.insurerId})));

  const row=(title,sub,edit,del)=>h('div',{className:'bhis-admin-row'},h('div',null,h('strong',null,title),h('small',null,sub||'')),h('div',{className:'flex gap-2'},h('button',{type:'button',className:'bhis-secondary-button compact',onClick:edit},'ویرایش'),h('button',{type:'button',className:'bhis-danger-button compact',onClick:del},'حذف')));

  return h('div',{className:'bhis-build450 bhis-admin-module',dir:'rtl'},
    h('div',{className:'bhis-module-hero'},h('span',{className:'bhis-eyebrow'},'بیمه و قراردادها'),h('h1',null,'مدیریت حرفه‌ای بیمه، سهم‌ها و استثناهای خدمت'),h('p',null,'سهم پیش‌فرض قرارداد، پوشش گروهی و استثنای هر خدمت/کالا با اولویت دقیق؛ بیمه‌های فعال در پرونده بیمار قابل انتخاب هستند.')),
    h('div',{className:'bhis-admin-tabs'},
      ...[['insurers','بیمه‌ها'],['contracts','قرارداد و سهم پیش‌فرض'],['groups','پوشش گروه‌ها'],['exceptions','استثناهای خدمت/کالا']].map(([id,label])=>h('button',{key:id,type:'button',className:tab===id?'active':'',onClick:()=>setTab(id)},label))
    ),

    tab==='insurers'&&h(React.Fragment,null,
      h('div',{className:'bhis-admin-form'},
        field('نام بیمه *',i.name,v=>setI(x=>({...x,name:v}))),
        field('کد بیمه',i.code,v=>setI(x=>({...x,code:v}))),
        select('نوع بیمه',i.type,v=>setI(x=>({...x,type:v})),[h('option',{value:'public'},'دولتی'),h('option',{value:'social'},'تأمین اجتماعی'),h('option',{value:'supplementary'},'تکمیلی'),h('option',{value:'private'},'خصوصی'),h('option',{value:'other'},'سایر')]),
        field('تماس/شناسه قرارداد',i.contact,v=>setI(x=>({...x,contact:v}))),
        h('label',{className:'bhis-field'},h('span',null,'وضعیت'),h('select',{value:i.active===false?'0':'1',onChange:e=>setI(x=>({...x,active:e.target.value==='1'}))},h('option',{value:'1'},'فعال و قابل انتخاب'),h('option',{value:'0'},'غیرفعال'))),
        h('button',{className:'bhis-primary-button',onClick:saveInsurer},i.id?'ذخیره ویرایش':'افزودن بیمه')
      ),
      h('div',{className:'bhis-admin-list'},...insurers.map(x=>row(x.name,`${x.code||'بدون کد'} • ${x.active===false?'غیرفعال':'فعال'}`,()=>setI({...x}),()=>save('insurers',insurers.filter(y=>y.id!==x.id)))))
    ),

    tab==='contracts'&&h(React.Fragment,null,
      h('div',{className:'bhis-admin-form'},
        select('بیمه *',c.insurerId,v=>setC(x=>({...x,insurerId:v})),[h('option',{value:''},'انتخاب بیمه'),...activeInsurers.map(x=>h('option',{key:x.id,value:x.id},x.name))]),
        field('عنوان قرارداد *',c.title,v=>setC(x=>({...x,title:v}))),
        field('کد قرارداد',c.contractCode,v=>setC(x=>({...x,contractCode:v}))),
        h(JalaliDateField,{label:'شروع اعتبار',value:c.validFrom,onChange:v=>setC(x=>({...x,validFrom:v}))}),
        h(JalaliDateField,{label:'پایان اعتبار',value:c.validTo,onChange:v=>setC(x=>({...x,validTo:v}))}),
        field('سهم بیمار ٪',c.patientSharePercent,v=>setC(x=>({...x,patientSharePercent:v})),{type:'number',min:0,max:100}),
        field('سهم بیمه ٪',c.insurerSharePercent,v=>setC(x=>({...x,insurerSharePercent:v})),{type:'number',min:0,max:100}),
        field('مابه‌التفاوت ٪',c.differencePercent,v=>setC(x=>({...x,differencePercent:v})),{type:'number',min:0,max:100}),
        select('تکلیف مابه‌التفاوت',c.differenceAction,v=>setC(x=>({...x,differenceAction:v})),[
          h('option',{value:'patient'},'پرداخت بیمار'),h('option',{value:'discount'},'تخفیف مرکز'),h('option',{value:'insurer'},'افزودن به سهم بیمه')
        ]),
        field('فرانشیز ثابت بیمار',c.franchiseAmount,v=>setC(x=>({...x,franchiseAmount:v})),{type:'number',min:0}),
        field('سقف تعهد هر قلم',c.ceilingAmount,v=>setC(x=>({...x,ceilingAmount:v})),{type:'number',min:0}),
        h('label',null,h('input',{type:'checkbox',checked:!!c.requiresReferral,onChange:e=>setC(x=>({...x,requiresReferral:e.target.checked}))}),' ارجاع لازم است'),
        h('label',null,h('input',{type:'checkbox',checked:!!c.requiresApproval,onChange:e=>setC(x=>({...x,requiresApproval:e.target.checked}))}),' تأیید بیمه لازم است'),
        h('button',{className:'bhis-primary-button',onClick:saveContract},c.id?'ذخیره قرارداد':'افزودن قرارداد')
      ),
      h('div',{className:'bhis-admin-list'},...contracts.map(x=>row(`${insurerNames[String(x.insurerId)]||'بیمه'} — ${x.title}`,`${shareText(x)} • ${x.active===false?'غیرفعال':'فعال'}`,()=>setC({...blankC,...x,groupRules:x.groupRules||[]}),()=>save('contracts',contracts.filter(y=>y.id!==x.id)))))
    ),

    tab==='groups'&&h(React.Fragment,null,
      h('div',{className:'bhis-admin-form'},
        select('قرارداد',r.contractId,v=>setR(x=>({...x,contractId:v})),[h('option',{value:''},'انتخاب قرارداد'),...contracts.filter(x=>x.active!==false).map(x=>h('option',{key:x.id,value:x.id},`${insurerNames[String(x.insurerId)]||''} — ${x.title}`))]),
        select('سطح گروه',r.scope,v=>setR(x=>({...x,scope:v,targetId:v==='kind'?'service':''})),[h('option',{value:'kind'},'نوع کلی (خدمت/کالا)'),h('option',{value:'type'},'نوع خدمت'),h('option',{value:'category'},'گروه ثبت‌شده مرکز')]),
        select('گروه هدف',r.targetId,v=>setR(x=>({...x,targetId:v})),[h('option',{value:''},'انتخاب'),...targetOptions()]),
        select('نحوه پوشش',r.coverageMode,v=>setR(x=>({...x,coverageMode:v})),[h('option',{value:'insured'},'طبق درصد پیش‌فرض قرارداد'),h('option',{value:'custom'},'درصد اختصاصی این گروه'),h('option',{value:'free'},'آزاد / بدون بیمه')]),
        r.coverageMode==='custom'?field('سهم بیمار ٪',r.patientSharePercent,v=>setR(x=>({...x,patientSharePercent:v})),{type:'number'}):null,
        r.coverageMode==='custom'?field('سهم بیمه ٪',r.insurerSharePercent,v=>setR(x=>({...x,insurerSharePercent:v})),{type:'number'}):null,
        r.coverageMode==='custom'?field('مابه‌التفاوت ٪',r.differencePercent,v=>setR(x=>({...x,differencePercent:v})),{type:'number'}):null,
        r.coverageMode==='custom'?select('تکلیف مابه‌التفاوت',r.differenceAction,v=>setR(x=>({...x,differenceAction:v})),[h('option',{value:'patient'},'بیمار'),h('option',{value:'discount'},'تخفیف'),h('option',{value:'insurer'},'بیمه')]):null,
        h('button',{className:'bhis-primary-button',onClick:saveGroupRule},r.id?'ذخیره قانون':'افزودن قانون پوشش')
      ),
      h('div',{className:'bhis-admin-list'},...allRules.map(x=>row(`${insurerNames[String(x.insurerId)]||'بیمه'} — ${x.contractTitle}`,`${x.scope}:${x.targetId} • ${x.coverageMode==='free'?'آزاد':x.coverageMode==='custom'?shareText(x):'پیش‌فرض قرارداد'}`,()=>setR({...blankR,...x}),()=>{const con=contracts.find(c=>c.id===x.contractId);if(!con)return;save('contracts',contracts.map(c=>c.id===con.id?{...c,groupRules:(c.groupRules||[]).filter(y=>y.id!==x.id)}:c));})))
    ),

    tab==='exceptions'&&h(React.Fragment,null,
      h('div',{className:'bhis-admin-form'},
        select('بیمه',t.insurerId,v=>setT(x=>({...x,insurerId:v,contractId:'',overrideInsurerId:'',overrideContractId:''})),[h('option',{value:''},'انتخاب بیمه'),...activeInsurers.map(x=>h('option',{key:x.id,value:x.id},x.name))]),
        select('قرارداد',t.contractId,v=>setT(x=>({...x,contractId:v})),[h('option',{value:''},'همه قراردادهای بیمه'),...contracts.filter(x=>String(x.insurerId)===String(t.insurerId)).map(x=>h('option',{key:x.id,value:x.id},x.title))]),
        select('نوع قلم',t.itemKind,v=>setT(x=>({...x,itemKind:v,serviceId:''})),[h('option',{value:'service'},'خدمت'),h('option',{value:'product'},'کالا')]),
        select(t.itemKind==='product'?'کالای مرکز':'خدمت مرکز',t.serviceId,v=>setT(x=>({...x,serviceId:v})),[h('option',{value:''},'انتخاب'),...itemOptions.filter(x=>x.active!==false).map(x=>h('option',{key:x.id,value:x.id},x.title||x.name))]),
        select('حکم این قلم',t.coverageMode,v=>setT(x=>({...x,coverageMode:v})),[h('option',{value:'custom'},'درصد/تعرفه اختصاصی'),h('option',{value:'free'},'کاملاً آزاد'),h('option',{value:'other_insurer'},'اعمال بیمه/قرارداد دیگر')]),
        t.coverageMode==='other_insurer'?select('بیمه جایگزین',t.overrideInsurerId,v=>setT(x=>({...x,overrideInsurerId:v,overrideContractId:''})),[h('option',{value:''},'انتخاب'),...activeInsurers.map(x=>h('option',{key:x.id,value:x.id},x.name))]):null,
        t.coverageMode==='other_insurer'?select('قرارداد جایگزین',t.overrideContractId,v=>setT(x=>({...x,overrideContractId:v})),[h('option',{value:''},'پیش‌فرض بیمه'),...contracts.filter(x=>String(x.insurerId)===String(t.overrideInsurerId)).map(x=>h('option',{key:x.id,value:x.id},x.title))]):null,
        t.coverageMode==='custom'?field('تعرفه پایه/آزاد',t.baseTariff,v=>setT(x=>({...x,baseTariff:v})),{type:'number'}):null,
        t.coverageMode==='custom'?field('تعرفه مشمول بیمه',t.insuredTariff,v=>setT(x=>({...x,insuredTariff:v})),{type:'number'}):null,
        t.coverageMode==='custom'?field('سهم بیمار ٪',t.patientSharePercent,v=>setT(x=>({...x,patientSharePercent:v})),{type:'number'}):null,
        t.coverageMode==='custom'?field('سهم بیمه ٪',t.insurerSharePercent,v=>setT(x=>({...x,insurerSharePercent:v})),{type:'number'}):null,
        t.coverageMode==='custom'?field('مابه‌التفاوت ٪',t.differencePercent,v=>setT(x=>({...x,differencePercent:v})),{type:'number'}):null,
        t.coverageMode==='custom'?select('تکلیف مابه‌التفاوت',t.differenceAction,v=>setT(x=>({...x,differenceAction:v})),[h('option',{value:'patient'},'بیمار'),h('option',{value:'discount'},'تخفیف'),h('option',{value:'insurer'},'بیمه')]):null,
        h('button',{className:'bhis-primary-button',onClick:saveOverride},t.id?'ذخیره استثنا':'ثبت استثنای قلم')
      ),
      h('div',{className:'bhis-admin-list'},...tariffs.map(x=>{const items=x.itemKind==='product'?products:medicalServices;const item=items.find(s=>String(s.id)===String(x.serviceId));const mode=x.coverageMode==='free'?'آزاد':x.coverageMode==='other_insurer'?`بیمه جایگزین: ${insurerNames[String(x.overrideInsurerId)]||'—'}`:shareText(x);return row(`${insurerNames[String(x.insurerId)]||'بیمه'} — ${item?.title||item?.name||'قلم'}`,mode,()=>setT({...blankT,...x}),()=>save('tariffs',tariffs.filter(y=>y.id!==x.id)));}))
    )
  );
}
