import React,{useEffect,useMemo,useState} from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, Receipt, AlertTriangle, CheckCircle2, Plus, Trash2, Printer, History, User, Package, Stethoscope, DollarSign, FileCheck } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { transitionEncounter440, WorkflowStatus, makeActionKey440, appendEncounterAudit440 } from '../utils/workflow440.js?b=r24-514-1405';
import { UnifiedClinicalCatalogPicker } from './UnifiedClinicalCatalogPicker440.js?b=r24-514-1405';
import { makeServiceLine440, makeProductLine440 } from '../utils/unifiedClinicalCatalog440.js?b=r24-514-1405';
import { encounterBaseTotal440, encounterFinalTotal440, applyFinalPayable440, adjustmentTotals440, billingLineTotal440, reclassifyMiscellaneous440 } from '../utils/cashierSettlement440.js?b=r24-514-1405';
import { enrichQueuePatients } from '../utils/patientIdentity440.js?b=r24-514-1405';
import { rankLive } from '../utils/liveSearch440.js?b=r24-514-1405';
import { MoneyInput453 } from './MoneyInput453.js?b=r24-514-1405';
import { PaymentMethodSelector453 } from './PaymentMethodSelector453.js?b=r24-514-1405';
import { formatMoney450 } from '../utils/money450.js?b=r24-514-1405';
import { finalizeFreeClinicalService450, updateCustomServiceLibrary450 } from '../utils/clinicalFinance450.js?b=r24-514-1405';
import { makePaymentReceipt450, makeDiscount450, postClinicalFinance450, PAYMENT_METHOD_LABELS_450, validatePaymentDetails450 } from '../utils/financeClinical450.js?b=r24-514-1405';
import { printSettlement450 } from '../utils/printCenter450.js?b=r24-514-1405';
import { applyInsuranceToServiceLine, applyInsuranceToProductLine } from '../utils/insuranceEngine450.js?b=r24-514-1405';
const h=React.createElement; const OPEN=new Set(['ready_for_discharge','waiting_payment']);
const totalLine=x=>Number(x?.unitPrice??x?.price??0)*Math.max(1,Number(x?.quantity||1));
export function ProfessionalCashierModule({visitQueue=[],patients=[],medicalServices=[],products=[],salesInvoices=[],users=[],settings={},customServiceLibrary=[],currentUser,initialPatientId='',initialEncounterId='',onUpdateQueueItem,onSettleDebt,onOpenPatientProfile,onAddPaymentReceipt,onAddDiscountRecord,onUpdateCustomServiceLibrary}){
 const queue=useMemo(()=>enrichQueuePatients((visitQueue||[]).filter(x=>OPEN.has(x.status)),patients).sort((a,b)=>new Date(a.registeredAt||0)-new Date(b.registeredAt||0)),[visitQueue,patients]);
 const [query,setQuery]=useState('');const [activeId,setActiveId]=useState('');const [pickerOpen,setPickerOpen]=useState(false);const [finalPayable,setFinalPayable]=useState(0);const [method,setMethod]=useState('card');const [paidNow,setPaidNow]=useState(0);const [details,setDetails]=useState({});const [discountReason,setDiscountReason]=useState('');const [discountAuthorizerId,setDiscountAuthorizerId]=useState('');const [miscNote,setMiscNote]=useState('');const [note,setNote]=useState('');const [lastSettled,setLastSettled]=useState(null);
 const filtered=useMemo(()=>query.trim()?rankLive(queue,query,x=>`${x.patientName||''} ${x.patientCode||''} ${x.nationalId||''} ${x.receptionNotes||x.chiefComplaint||''}`,{limit:100}):queue,[queue,query]);
 const active=(visitQueue||[]).find(x=>x.id===activeId)||queue.find(x=>x.id===activeId)||null;const patient=active?(patients||[]).find(p=>String(p.id)===String(active.patientId)):null;
 const insuranceLines=[...(active?.services||[]),...(active?.products||[])].filter(x=>x?.insuranceApplied);
 const insuranceInsurerTotal=insuranceLines.reduce((s,x)=>s+Number(x?.insuranceInsurerShare||0),0);
 const insurancePatientTotal=insuranceLines.reduce((s,x)=>s+Number(x?.insurancePatientShare||0),0);
 const insuranceDiscountTotal=insuranceLines.reduce((s,x)=>s+Number(x?.insuranceDiscountShare||0),0);
 const base=active?encounterBaseTotal440(active):0;const advanceReceipts=(active?.paymentReceipts||[]).filter(r=>r?.isAdvancePayment||r?.paymentStage==='reception_advance'||r?.receiptType==='advance');const advancePaid=advanceReceipts.reduce((s,r)=>s+Number(r?.amount||0),0);const paidBefore=Number(active?.paidAmount||0);const desired=Math.max(0,Number(finalPayable||0));const delta=desired-base;const due=Math.max(0,desired-paidBefore);const authorizers=(users||[]).filter(u=>u.active!==false);
 const provisional=(active?.services||[]).filter(x=>x.isCustomFreeService&&x.requiresFinalPriceConfirmation);
 const select=item=>{setActiveId(item.id);const t=encounterFinalTotal440(item);setFinalPayable(t);setPaidNow(Math.max(0,t-Number(item.paidAmount||0)));setMethod('card');setDetails({});setDiscountReason('');setDiscountAuthorizerId('');setMiscNote('');setNote(item.cashierNote||'');if(item.status==='ready_for_discharge')onUpdateQueueItem?.(transitionEncounter440(item,WorkflowStatus.WAITING_PAYMENT,currentUser,{action:'پرونده در صندوق باز شد',actionKey:makeActionKey440('cash450-open',item.id,item.status)}));};
 useEffect(() => {
   if (initialEncounterId) {
     const found = (visitQueue || []).find((q) => String(q.id) === String(initialEncounterId));
     if (found) { select(found); return; }
   }
   if (initialPatientId) {
     const found = (visitQueue || []).find((q) => String(q.patientId) === String(initialPatientId) && (OPEN.has(q.status) || !['completed','discharged','cancelled'].includes(q.status)));
     if (found) { select(found); return; }
   }
 }, [initialEncounterId, initialPatientId, visitQueue]);
 const baseNow=()=> (visitQueue||[]).find(x=>x.id===activeId)||active;
 const updateLine=(lineId,patch)=>{const b=baseNow();if(!b)return;const services=(b.services||[]).map(x=>x.id===lineId?{...x,...patch}:x);const n={...b,services,totalCost:[...services,...(b.products||[])].reduce((s,x)=>s+totalLine(x),0),lastCashierEditAt:new Date().toISOString()};onUpdateQueueItem?.(n);setFinalPayable(encounterFinalTotal440(n));};
 const finalizeCustom=line=>{const b=baseNow();if(!b)return;const title=String(line._editTitle||line.title||'').trim();const amount=Number(line._editFinalAmount??line.finalAmount??line.estimatedAmount??line.unitPrice??0);if(!title||amount<0){alert('نام و مبلغ نهایی خدمت خاص را کنترل کنید.');return;}const final=finalizeFreeClinicalService450(line,title,amount,currentUser);const services=(b.services||[]).map(x=>x.id===line.id?final:x);let n={...b,services,hasProvisionalCustomService:services.some(x=>x.isCustomFreeService&&x.requiresFinalPriceConfirmation),totalCost:[...services,...(b.products||[])].reduce((s,x)=>s+totalLine(x),0)};n=appendEncounterAudit440(n,'custom_service_finalize',`تأیید قیمت نهایی خدمت خاص: ${title}`,currentUser,{previousValue:{title:line.title,amount:line.estimatedAmount},newValue:{title,amount},reason:'تأیید ترخیص'});onUpdateQueueItem?.(n);const lib=updateCustomServiceLibrary450(customServiceLibrary,final,currentUser);onUpdateCustomServiceLibrary?.(lib);postClinicalFinance450('clinical/custom-service',{service:{...final,patientId:b.patientId,encounterId:b.id}});setFinalPayable(encounterFinalTotal440(n));};
 const addItem=row=>{const b=baseNow();if(!b)return;const qty=Math.max(1,Number(row.quantity||1));const services=[...(b.services||[])],goods=[...(b.products||[])];if(row.kind==='product'){const line=makeProductLine440(row.item,qty,currentUser);goods.push(applyInsuranceToProductLine({line,product:row.item||{},settings,patient,date:new Date().toISOString().slice(0,10)}));}else{const line=makeServiceLine440(row.item,qty,currentUser,null,null,'registered_by_cashier');services.push(applyInsuranceToServiceLine({line,service:row.item||{},settings,patient,date:new Date().toISOString().slice(0,10)}));}const n={...b,services,products:goods,totalCost:[...services,...goods].reduce((s,x)=>s+totalLine(x),0)};onUpdateQueueItem?.(n);setFinalPayable(encounterFinalTotal440(n));setPaidNow(Math.max(0,encounterFinalTotal440(n)-Number(n.paidAmount||0)));if(!row.rapidScan)setPickerOpen(false);};
 const removeLine=(kind,id)=>{const b=baseNow();if(!b)return;const reason=prompt('دلیل حذف/ابطال ردیف:');if(!String(reason||'').trim())return;const source=kind==='service'?(b.services||[]):(b.products||[]);const line=source.find(x=>x.id===id);if(!line)return;let n={...b,services:kind==='service'?(b.services||[]).filter(x=>x.id!==id):(b.services||[]),products:kind==='product'?(b.products||[]).filter(x=>x.id!==id):(b.products||[]),voidedClinicalLines:[...(b.voidedClinicalLines||[]),{...line,kind,status:'voided',voidReason:reason,voidedAt:new Date().toISOString(),voidedById:currentUser?.id||''}]};n.totalCost=[...(n.services||[]),...(n.products||[])].reduce((s,x)=>s+totalLine(x),0);onUpdateQueueItem?.(appendEncounterAudit440(n,'financial_edit',`ابطال ${line.title||'ردیف'}`,currentUser,{previousValue:line,newValue:null,reason}));setFinalPayable(encounterFinalTotal440(n));};
 const confirm=async()=>{let b=baseNow();if(!b)return;const paymentValidation=validatePaymentDetails450(method,details,paidNow);if(!paymentValidation.ok){alert(paymentValidation.error);return;}if((b.services||[]).some(x=>x.isCustomFreeService&&x.requiresFinalPriceConfirmation)){alert('ابتدا نام و قیمت نهایی تمام خدمات خاص خارج از فهرست را تأیید کنید.');return;}const auth=authorizers.find(u=>String(u.id)===String(discountAuthorizerId));let discountRecord=null;if(delta<0){try{discountRecord=makeDiscount450({encounter:b,amount:Math.abs(delta),reason:discountReason,authorizer:auth,actor:currentUser});}catch(e){alert(e.message);return;}}
   try{b=applyFinalPayable440(b,finalPayable,currentUser,{discountReason,miscellaneousNote:miscNote});}catch(e){alert(e?.message||'مبلغ نهایی معتبر نیست.');return;}
   const total=encounterFinalTotal440(b),oldPaid=Number(b.paidAmount||0),currentDue=Math.max(0,total-oldPaid),nowPaid=method==='credit'?0:Math.max(0,Math.min(currentDue,Number(paidNow||0)));if(method!=='credit'&&currentDue>0&&nowPaid<=0){alert('مبلغ دریافتی را وارد کنید.');return;}const receipt=nowPaid>0?makePaymentReceipt450({encounter:b,patient,method,amount:nowPaid,details,actor:currentUser,note}):null;const paid=oldPaid+nowPaid,remaining=Math.max(0,total-paid),adj=adjustmentTotals440(b);
   const patch={...b,totalCost:total,paidAmount:paid,remainingDebt:remaining,paymentMethod:method,paymentMethodLabel:PAYMENT_METHOD_LABELS_450[method]||method,paymentReference:details.transactionNumber||'',cashierNote:note,cashierBaseTotal:encounterBaseTotal440(b),cashierFinalPayable:total,miscellaneousAmount:adj.miscellaneous,cashierDiscountAmount:adj.discount,discountAuthorizerId:auth?.id||'',discountAuthorizerName:auth?.name||auth?.fullName||'',discountReason:discountReason||'',paymentReceipts:[...(b.paymentReceipts||[]),...(receipt?[receipt]:[])],discountRecords:[...(b.discountRecords||[]),...(discountRecord?[discountRecord]:[])],finalSettlementAt:new Date().toISOString(),dischargePayment:{method,paidNow:nowPaid,totalPaid:paid,remainingDebt:remaining,trackingNumber:details.transactionNumber||'',occurredAt:receipt?.occurredAt||new Date().toISOString(),note}};
   const updated=transitionEncounter440(patch,WorkflowStatus.DISCHARGED,currentUser,{action:remaining>0?'ترخیص با مانده بدهی ثبت شد':'پرداخت و ترخیص نهایی ثبت شد',actionKey:makeActionKey440('cash450-final',b.id,`${paid}:${total}:${receipt?.id||'credit'}`)});onUpdateQueueItem?.(updated);if(receipt){onAddPaymentReceipt?.(receipt);await postClinicalFinance450('finance/payment-receipt',{receipt});}if(discountRecord){onAddDiscountRecord?.(discountRecord);await postClinicalFinance450('finance/discount',{discount:discountRecord});}
   setLastSettled({item:updated,patient});setActiveId('');};
 const reclassify=()=>{const b=baseNow();if(!b)return;const r=reclassifyMiscellaneous440(b,medicalServices,products,currentUser);if(!r.changes.length){alert('مابه‌التفاوت قابل انتقالی پیدا نشد.');return;}onUpdateQueueItem?.(appendEncounterAudit440(r.item,'financial_reclassification','تبدیل متفرقه به مابه‌التفاوت قیمت',currentUser,{previousValue:r.miscellaneousBefore,newValue:r.miscellaneousAfter,reason:'محاسبه مجدد مجاز'}));setFinalPayable(encounterFinalTotal440(r.item));};
 const settledBanner = lastSettled ? h('section',{className:'bhis-print-after450'},
   h('strong',null,`ترخیص ${lastSettled.patient?.fullName||lastSettled.item.patientName} ثبت شد.`),
   h('div',null,
      h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>printSettlement450({settings,patient:lastSettled.patient||{},item:lastSettled.item,mode:'thermal',receipt:true})},h(Printer,{className:'w-4 h-4'}),'رسید حرارتی'),
      h('button',{type:'button',className:'bhis-primary-button',onClick:()=>printSettlement450({settings,patient:lastSettled.patient||{},item:lastSettled.item,mode:'a5',receipt:false})},h(Printer,{className:'w-4 h-4'}),'فاکتور لیزری / A5'),
      h('button',{type:'button',className:'bhis-icon-button',onClick:()=>setLastSettled(null)},'×')
   )
 ) : null;
 const queuePanel = h('aside',{className:'bhis-cashier-side'},
   h('div',{className:'bhis-cashier-side-head'},h('h2',null,'در انتظار تسویه'),h('span',null,queue.length.toLocaleString('fa-IR'))),
   h('label',{className:'bhis-global-live-search compact'},h(Search,{className:'w-4 h-4'}),h('input',{value:query,onChange:e=>setQuery(e.target.value),placeholder:'نام، پرونده، کد ملی یا توضیح...'})),
   h('div',{className:'bhis-cashier-queue'},...filtered.map((x,i)=>h('button',{
      key:x.id,type:'button',className:`bhis-cashier-patient ${i%2?'alt':''} ${activeId===x.id?'active':''}`,onClick:()=>select(x)
   },h('span',{className:'bhis-patient-avatar cashier'},h(Receipt,{className:'w-4 h-4'})),h('span',null,h('strong',null,x.patientName||'بیمار'),h('small',null,`پرونده ${x.patientCode||'—'} • ${x.receptionNotes||x.chiefComplaint||'بدون توضیح'}`)),h('b',null,formatMoney450(encounterFinalTotal440(x))))))
 );
 let detailPanel = h('div',{className:'bhis-chart-empty'},h(DollarSign,{className:'w-12 h-12'}),h('h2',null,'یک پرونده را از صف انتخاب کنید'),h('p',null,'تسویه، تخفیف، فیش پرداختی، چاپ و تأیید خدمات خاص در این صفحه انجام می‌شود.'));
 if(active){
   const currentServices=active.services||[];
   const currentProducts=active.products||[];
   const finalAdj=adjustmentTotals440(active||{});
   const provisionalSection = provisional.length ? h('section',{className:'bhis-provisional-services450'},
      h('div',{className:'bhis-clinical-section-title'},h(FileCheck,{className:'w-5 h-5'}),h('div',null,h('h3',null,'خدمات خاص خارج از فهرست — نیازمند تأیید ترخیص'),h('p',null,'قیمت ثبت‌شده توسط پزشک تقریبی است و باید پیش از صدور فاکتور نهایی تأیید شود.'))),
      ...provisional.map(x=>h('div',{key:x.id,className:'bhis-provisional-row450'},
         h('label',{className:'bhis-field'},h('span',null,'نام نهایی خدمت'),h('input',{value:x._editTitle??x.title,onChange:e=>updateLine(x.id,{_editTitle:e.target.value})})),
         h('label',{className:'bhis-field'},h('span',null,`تقریبی ${formatMoney450(x.estimatedAmount||0)} — مبلغ نهایی`),h(MoneyInput453,{value:x._editFinalAmount??x.estimatedAmount??x.unitPrice,onChange:v=>updateLine(x.id,{_editFinalAmount:v}),unit:'تومان'})),
         h('button',{type:'button',className:'bhis-primary-button compact',onClick:()=>finalizeCustom((baseNow()?.services||[]).find(s=>s.id===x.id)||x)},'تأیید نام و قیمت نهایی')
      ))
   ) : null;
   const invoiceRows = [
      ...currentServices.map((x,i)=>h('div',{key:x.id,className:`bhis-invoice-row ${i%2?'alt':''} ${x.isCustomFreeService?'custom450':''}`},
         h('span',null,h(Stethoscope,{className:'w-4 h-4'}),h('strong',null,x.title),x.isCustomFreeService?h('small',null,x.priceStatus==='estimated'?'خدمت خاص • قیمت تقریبی':'خدمت خاص • تأییدشده'):null,x.insuranceApplied?h('small',{className:'text-teal-700'},`بیمه ${x.insurance?.insurerName||''} • سهم بیمه ${formatMoney450(x.insuranceInsurerShare||0)} • سهم بیمار ${formatMoney450(x.insurancePatientShare||0)}${Number(x.insuranceDiscountShare||0)>0?` • تخفیف ${formatMoney450(x.insuranceDiscountShare)}`:''}`):null),
         h('span',null,Number(x.quantity||1).toLocaleString('fa-IR')),
         h('span',{className:'bhis-invoice-amount-actions'},h('b',null,formatMoney450(billingLineTotal440(x))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeLine('service',x.id)},h(Trash2,{className:'w-4 h-4'})))
      )),
      ...currentProducts.map((x,i)=>h('div',{key:x.id,className:`bhis-invoice-row ${(currentServices.length+i)%2?'alt':''}`},
         h('span',null,h(Package,{className:'w-4 h-4'}),h('strong',null,x.title||x.productName),x.insuranceApplied?h('small',{className:'text-teal-700'},`پوشش بیمه • سهم بیمه ${formatMoney450(x.insuranceInsurerShare||0)} • سهم بیمار ${formatMoney450(x.insurancePatientShare||0)}`):null),
         h('span',null,Number(x.quantity||1).toLocaleString('fa-IR')),
         h('span',{className:'bhis-invoice-amount-actions'},h('b',null,formatMoney450(billingLineTotal440(x))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeLine('product',x.id)},h(Trash2,{className:'w-4 h-4'})))
      ))
   ];
   const invoiceSection = h('section',{className:'bhis-clinical-section'},
      h('div',{className:'bhis-clinical-section-title with-action'},h('div',null,h('h3',null,'ریز صورتحساب'),h('p',null,'تمام خدمات، کالاها و خدمات خاص تأییدشده')),h('button',{type:'button',className:'bhis-primary-button compact',onClick:()=>setPickerOpen(true)},h(Plus,{className:'w-4 h-4'}),'افزودن ردیف')),
      h('div',{className:'bhis-invoice-table strong'},h('div',{className:'bhis-invoice-head'},h('span',null,'شرح'),h('span',null,'تعداد'),h('span',null,'مبلغ')),...invoiceRows)
   );
   const discountFields = delta<0 ? h('div',{className:'bhis-discount450'},
      h('label',{className:'bhis-field'},h('span',null,'دلیل تخفیف *'),h('input',{value:discountReason,onChange:e=>setDiscountReason(e.target.value)})),
      h('label',{className:'bhis-field'},h('span',null,'دستوردهنده / تأییدکننده تخفیف *'),h('select',{value:discountAuthorizerId,onChange:e=>setDiscountAuthorizerId(e.target.value)},h('option',{value:''},'انتخاب...'),...authorizers.map(u=>h('option',{key:u.id,value:u.id},u.name||u.fullName||u.username||u.id))))
   ) : null;
   const miscField = delta>0 ? h('label',{className:'bhis-field'},h('span',null,'توضیح متفرقه'),h('input',{value:miscNote,onChange:e=>setMiscNote(e.target.value),placeholder:'علت دریافت اضافه...'})) : null;
   const settlementSection = h('section',{className:'bhis-cashier-settlement-card'},
      h('div',{className:'bhis-settlement-summary'},
         h('div',null,h('span',null,'جمع سیستمی'),h('strong',null,formatMoney450(base))),
         h('div',null,h('span',null,'علی‌الحساب پذیرش'),h('strong',null,formatMoney450(advancePaid||paidBefore))),
         h('div',null,h('span',null,'مانده قبل از دریافت'),h('strong',null,formatMoney450(due))),
         insuranceLines.length?h('div',null,h('span',null,'سهم بیمه / قرارداد'),h('strong',null,formatMoney450(insuranceInsurerTotal))):null,
         insuranceLines.length?h('div',null,h('span',null,'تخفیف بیمه‌ای / مابه‌التفاوت'),h('strong',null,formatMoney450(insuranceDiscountTotal))):null
      ),
      h('label',{className:'bhis-final-payable-field'},h('span',null,'مبلغ نهایی این مراجعه'),h(MoneyInput453,{value:finalPayable,onChange:v=>{setFinalPayable(v);setPaidNow(Math.max(0,v-paidBefore));},unit:'تومان'}),h('small',null,delta>0?`${formatMoney450(delta)} به‌عنوان «متفرقه» ثبت می‌شود.`:delta<0?`${formatMoney450(Math.abs(delta))} فقط با تخفیف مجاز ثبت می‌شود.`:'برابر جمع سیستمی')),
      discountFields,miscField,
      finalAdj.miscellaneous>0?h('button',{type:'button',className:'bhis-secondary-button',onClick:reclassify},'محاسبه مجدد و تبدیل متفرقه به مابه‌التفاوت'):null,
      advanceReceipts.length?h('div',{className:'bhis-advance-receipts-r12'},h('strong',null,'علی‌الحساب‌های ثبت‌شده در پذیرش'),...advanceReceipts.map(r=>h('div',{key:r.id||r.receiptId,className:'bhis-advance-receipt-row-r12'},h('span',null,r.methodLabel||r.method||'پرداخت'),h('span',null,r.trackingNumber?`پیگیری ${r.trackingNumber}`:'بدون شماره پیگیری'),h('b',null,formatMoney450(r.amount||0))))):null,
      h(PaymentMethodSelector453,{methods:settings.paymentMethods||[],value:method,onChange:m=>{setMethod(m);setPaidNow(m==='credit'?0:due);},details,onDetailsChange:setDetails,amount:due,paidAmount:paidNow,onPaidAmountChange:setPaidNow,settings,patientName:active?.patientName}),
      h('label',{className:'bhis-field'},h('span',null,'یادداشت صندوق'),h('input',{value:note,onChange:e=>setNote(e.target.value)})),
      h('div',{className:'bhis-cashier-actionbar'},h('div',null,h('span',null,'قابل دریافت'),h('strong',null,formatMoney450(due))),h('button',{type:'button',className:'bhis-primary-button prominent',onClick:confirm},h(CheckCircle2,{className:'w-5 h-5'}),method==='credit'?'ثبت بدهی و ترخیص':'ثبت پرداخت و ترخیص'))
   );
   detailPanel = h(React.Fragment,null,
      h('header',{className:'bhis-patient-panel'},
         h('div',{className:'bhis-patient-panel-main'},h('span',{className:'bhis-avatar large cashier'},h(User,{className:'w-6 h-6'})),h('div',null,h('h1',null,active.patientName),h('div',{className:'bhis-patient-meta'},h('span',null,`پرونده ${active.patientCode||'—'}`),h('span',null,`پزشک ${active.doctorName||'—'}`),h('span',null,active.receptionNotes||active.chiefComplaint||'بدون توضیح پذیرش')))),
         h('div',{className:'bhis-patient-panel-actions'},h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>onOpenPatientProfile?.(active.patientId)},h(History,{className:'w-4 h-4'}),'سوابق'),h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>printSettlement450({settings,patient:patient||{},item:active,mode:'thermal'})},h(Printer,{className:'w-4 h-4'}),'پیش‌چاپ حرارتی'))
      ),
      h('div',{className:'bhis-cashier-scroll'},provisionalSection,invoiceSection,settlementSection)
   );
 }
 return h('div',{className:'bhis-cashier-module bhis-cashier450',dir:'rtl'},
   h('section',{className:'bhis-module-hero cashier'},h('div',null,h('span',{className:'bhis-eyebrow'},'ترخیص و تسویه'),h('h1',null,'صندوق حرفه‌ای و کنترل نهایی فاکتور'),h('p',null,'قیمت خدمات خاص، تخفیف مجاز، متفرقه، روش پرداخت و چاپ فاکتور در این مرحله نهایی می‌شوند.'))),
   settledBanner,
   h('div',{className:'bhis-cashier-layout'},queuePanel,h('main',{className:'bhis-cashier-main'},detailPanel)),
   h(UnifiedClinicalCatalogPicker,{open:pickerOpen,medicalServices,products,onSelect:addItem,onClose:()=>setPickerOpen(false),title:'افزودن از کاتالوگ واحد مرکز'})
 );
}
