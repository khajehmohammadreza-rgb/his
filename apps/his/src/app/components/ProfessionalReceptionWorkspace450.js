import React, { useEffect, useMemo, useRef, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { SmartPatientRegistration } from './SmartPatientRegistration440.js?b=r24-514-1405';
import { UnifiedClinicalCatalogPicker } from './UnifiedClinicalCatalogPicker440.js?b=r24-514-1405';
import { PersianAppointmentCalendar, todayIso, formatPersianAppointmentDate } from './PersianAppointmentCalendar440.js?b=r24-514-1405';
import { RoleUserSearchPicker } from './RoleUserSearchPicker.js?b=r24-514-1405';
import { getUsersByRole, getUserDisplayName, createWorkflowEvent } from '../utils/clinicalWorkflow.js?b=r24-514-1405';
import { makeClinicalOrder440, makeServiceLine440, makeProductLine440, makeAppointment440, catalogLabel440 } from '../utils/unifiedClinicalCatalog440.js?b=r24-514-1405';
import { transitionEncounter440, WorkflowStatus, makeActionKey440 } from '../utils/workflow440.js?b=r24-514-1405';
import { previousChargedVisit450, enforceRepeatVisit450, postClinicalFinance450, makePaymentReceipt450, validatePaymentDetails450 } from '../utils/financeClinical450.js?b=r24-514-1405';
import { PaymentMethodSelector450 } from './PaymentMethodSelector450.js?b=r24-514-1405';
import { applyInsuranceToServiceLine, applyInsuranceToProductLine } from '../utils/insuranceEngine450.js?b=r24-514-1405';
import { printVisitTicket450 } from '../utils/printCenter450.js?b=r24-514-1405';
import { Stethoscope, Package, Plus, Trash2, CheckCircle2, AlertTriangle, Calendar, Clock, UserCheck, FileText, Camera, Save, Activity as Route, Search as UserSearch, ClipboardCheck, CreditCard, Receipt } from '../../client-vendor/lucide-react.js?b=r24-514-1405';

const h = React.createElement;
const FINAL = new Set(['completed','discharged','cancelled']);
const RECEPTION = new Set(['patient_selected','patient_confirmed','reception_service_entry','reception_review']);
const money = v => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;
const rowPrice = r => Number(r?.price ?? (r?.kind === 'product' ? r?.item?.salesPrice : r?.item?.tariffPrice) ?? 0) || 0;
const lineTotal = x => Number(x?.unitPrice ?? x?.tariffPrice ?? x?.salesPrice ?? x?.price ?? 0) * Math.max(1, Number(x?.quantity || 1));
const insuranceSnapshot = (settings={}, patient={}, date='') => {
  const providerId=String(patient?.insuranceProviderId||patient?.insurance?.providerId||'');
  if(!providerId) return {providerId:'',insurerName:'آزاد',contractId:'',contractTitle:'',policyNumber:patient?.insurancePolicyNumber||patient?.insurance?.policyNumber||'',activeContract:false,billingMode:'free'};
  if(providerId==='other') return {providerId:'other',insurerName:patient?.insuranceOtherName||patient?.insurance?.otherName||'بیمه سایر',contractId:'',contractTitle:'',policyNumber:patient?.insurancePolicyNumber||'',activeContract:false,billingMode:'free'};
  const catalog=settings?.insuranceCatalog||{};
  const insurer=(catalog.insurers||[]).find(x=>String(x.id)===providerId);
  const selectedId=String(patient?.insuranceContractId||patient?.insurance?.contractId||'');
  const contracts=(catalog.contracts||[]).filter(x=>String(x.insurerId)===providerId);
  const selected=selectedId?contracts.find(x=>String(x.id)===selectedId):null;
  const activeContract=selected || contracts.find(x=>x.active!==false && (!x.validFrom||date>=x.validFrom) && (!x.validTo||date<=x.validTo));
  const active=Boolean(activeContract && activeContract.active!==false && (!activeContract.validFrom||date>=activeContract.validFrom) && (!activeContract.validTo||date<=activeContract.validTo));
  return {providerId,insurerName:insurer?.name||patient?.insuranceProviderName||'بیمه ثبت‌شده',contractId:activeContract?.id||selectedId||'',contractTitle:activeContract?.title||'',policyNumber:patient?.insurancePolicyNumber||patient?.insurance?.policyNumber||'',activeContract:active,billingMode:active?'contract':'free'};
};
const mergeBy = (oldRows, newRows, idKey) => {
  const out = [...(oldRows || [])];
  for (const row of newRows || []) {
    const key = String(row?.[idKey] || '');
    const i = out.findIndex(x => key && String(x?.[idKey] || '') === key && String(x?.status || '') === String(row?.status || ''));
    if (i >= 0 && idKey === 'productId') {
      const qty = Math.max(1, Number(out[i].quantity || 1)) + Math.max(1, Number(row.quantity || 1));
      out[i] = { ...out[i], quantity: qty, price: Number(out[i].unitPrice || 0) * qty };
    } else if (i < 0 || row?.allowMultiple === true) out.push(row);
  }
  return out;
};

function allPatientAppointments(visitQueue = [], appointments = [], patientId = '') {
  const rows = [], seen = new Set();
  for (const q of visitQueue || []) for (const a of q.appointments || []) {
    if (String(a?.patientId || q.patientId) !== String(patientId) || a?.status === 'cancelled') continue;
    const k = a.id || `${q.id}-${a.date}-${a.serviceId}-${a.time}`; if (seen.has(k)) continue; seen.add(k); rows.push(a);
  }
  for (const a of appointments || []) {
    if (String(a?.patientId || '') !== String(patientId) || a?.status === 'cancelled') continue;
    const k = a.id || `${a.date}-${a.serviceId}-${a.time}`; if (seen.has(k)) continue; seen.add(k); rows.push(a);
  }
  return rows.sort((a,b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
}

export function resolveReceptionNextStatus440(selected = [], routeOverride = '', fallback = WorkflowStatus.READY_DISCHARGE) {
  if (routeOverride) return routeOverride;
  if ((selected || []).some(x => x.type === 'visit' && x.timing !== 'future')) return WorkflowStatus.WAITING_DOCTOR;
  if ((selected || []).some(x => x.type === 'outpatient' && x.timing !== 'future')) return WorkflowStatus.WAITING_NURSE;
  return fallback || WorkflowStatus.READY_DISCHARGE;
}

function Stepper({ step = 1 }) {
  const rows = [
    ['جستجو / ثبت بیمار','انتخاب پرونده درست',UserSearch],
    ['تأیید مشخصات','کنترل و ذخیره اطلاعات',ClipboardCheck],
    ['ثبت خدمت اولیه','خدمت و کالا از کاتالوگ واحد',Stethoscope],
    ['تعیین مسیر','پزشک، دستیار / پرستار مسئول یا ترخیص',Route],
  ];
  return h('div', { className: 'bhis-reception-stepper-440', 'data-testid': 'reception-stepper' }, ...rows.map(([title,sub,Icon], i) => {
    const n = i + 1; return h('div', { key: title, className: `bhis-rstep-440 ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}` }, h('span', null, step > n ? h(CheckCircle2,{className:'w-4 h-4'}) : n.toLocaleString('fa-IR')), h('div', null, h('strong', null, title), h('small', null, sub)));
  }));
}

function careStaffIdentityPatch442(staff) {
  const id = staff?.id || '';
  const name = getUserDisplayName(staff);
  return {
    careStaffId:id, careStaffName:name, careStaffRole:'assistant_nurse',
    assistantId:id, assistantName:name,
    nurseId:id, nurseName:name,
    nurseCommissionPercent:0, nurseCommissionAmount:0, nurseCommissionSource:'unified_role_alias',
  };
}

export function ProfessionalReceptionWorkspace({
  patients = [], visitQueue = [], appointments = [], users = [], staffAccounts = [], medicalServices = [], products = [], currentUser, settings = {},
  onAddPatient, onUpdatePatient, onAddQueueItem, onUpdateQueueItem, onAddAppointment, onOpenPatientProfile, onSettleDebt,
  initialPatientId = '', onInitialPatientHandled, onAddPaymentReceipt, onMoveToStage,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientConfirmed, setPatientConfirmed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPreset, setPickerPreset] = useState({ tab:'all', scan:false });
  const [selected, setSelected] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [careStaffId, setCareStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('normal');
  const [scheduleIndex, setScheduleIndex] = useState(-1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [routeOverride, setRouteOverride] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastVisitTicket, setLastVisitTicket] = useState(null);
  const [receptionPaymentEnabled, setReceptionPaymentEnabled] = useState(false);
  const [receptionPaymentConfirmed, setReceptionPaymentConfirmed] = useState(false);
  const [receptionPaymentDraft, setReceptionPaymentDraft] = useState(null);
  const [receptionPaymentMethod, setReceptionPaymentMethod] = useState('cash');
  const [receptionPaidAmount, setReceptionPaidAmount] = useState(0);
  const [receptionPaymentDetails, setReceptionPaymentDetails] = useState({});
  const [priorDebtPaymentOpen, setPriorDebtPaymentOpen] = useState(false);
  const [priorDebtPaymentMethod, setPriorDebtPaymentMethod] = useState('deposit_receipt');
  const [priorDebtPaidAmount, setPriorDebtPaidAmount] = useState(0);
  const [priorDebtPaymentDetails, setPriorDebtPaymentDetails] = useState({});
  const [priorDebtSaving, setPriorDebtSaving] = useState(false);
  const draftIdRef = useRef('');

  const enrichedUsers = useMemo(() => { const map = new Map((staffAccounts || []).map(a => [a.userId,a])); return (users || []).map(u => ({...u,financialAccount:map.get(u.id)||null})); }, [users, staffAccounts]);
  const doctors = useMemo(() => getUsersByRole(enrichedUsers,'doctor'), [enrichedUsers]);
  const careStaff = useMemo(() => getUsersByRole(enrichedUsers,'nurse'), [enrichedUsers]);
  const selectedPatient = (patients || []).find(p => String(p.id) === String(selectedPatientId)) || null;
  const existingDraft = selectedPatient ? (visitQueue || []).find(q => String(q.patientId) === String(selectedPatient.id) && RECEPTION.has(q.status) && !FINAL.has(q.status)) || null : null;
  const otherActive = selectedPatient ? (visitQueue || []).find(q => String(q.patientId) === String(selectedPatient.id) && !FINAL.has(q.status) && !RECEPTION.has(q.status)) || null : null;

  useEffect(() => {
    if (initialPatientId && (patients || []).some(p => String(p.id) === String(initialPatientId))) {
      setSelectedPatientId(initialPatientId); setPatientConfirmed(false); onInitialPatientHandled?.();
    }
  }, [initialPatientId, patients]);
  useEffect(() => { draftIdRef.current = existingDraft?.id || ''; }, [existingDraft?.id]);
  useEffect(() => {
    if (!existingDraft) return;
    setDoctorId(existingDraft.doctorId || ''); setCareStaffId(existingDraft.careStaffId || existingDraft.assistantId || existingDraft.nurseId || ''); setReason(existingDraft.receptionNotes || existingDraft.chiefComplaint || ''); setPriority(existingDraft.priority || 'normal'); setRouteOverride(existingDraft.returnSuggestedStatus || '');
  }, [existingDraft?.id]);

  const selectedDoctor = doctors.find(d => String(d.id) === String(doctorId)) || null;
  const effectiveDoctor = selectedDoctor || (existingDraft ? doctors.find(d => String(d.id) === String(existingDraft.doctorId)) : null) || null;
  const selectedCareStaff = careStaff.find(u => String(u.id) === String(careStaffId)) || null;
  const existingCareStaffId = existingDraft?.careStaffId || existingDraft?.assistantId || existingDraft?.nurseId || '';
  const effectiveCareStaff = selectedCareStaff || (existingDraft ? careStaff.find(u => String(u.id) === String(existingCareStaffId)) : null) || null;
  const today = todayIso();
  const suggestedStatus = resolveReceptionNextStatus440(selected, '', existingDraft?.returnSuggestedStatus || WorkflowStatus.READY_DISCHARGE);
  const nextStatus = resolveReceptionNextStatus440(selected, routeOverride, suggestedStatus);
  const priorAppointments = useMemo(() => selectedPatient ? allPatientAppointments(visitQueue, appointments, selectedPatient.id) : [], [visitQueue,appointments,selectedPatientId]);
  const step = !selectedPatient ? 1 : !patientConfirmed ? 2 : (routeOverride ? 4 : 3);
  const selectedCurrentTotal = selected.reduce((sum,row)=>sum + rowPrice(row)*Math.max(1,Number(row.quantity||1)),0);

  const addCatalog = row => {
    if (!row?.rapidScan) setPickerOpen(false);
    const qty = Math.max(1, Number(row?.quantity || 1));
    setSelected(prev => {
      const idx = prev.findIndex(x => x.kind === row.kind && String(x.item?.id) === String(row.item?.id));
      if (idx >= 0) {
        if (row.kind === 'product') return prev.map((x,i) => i === idx ? {...x,quantity:Number(x.quantity||1)+qty} : x);
        return prev; // prevent accidental duplicate service
      }
      if (row.type === 'visit' && prev.some(x => x.type === 'visit')) { alert('برای یک مراجعه فقط یک خدمت ویزیت انتخاب کنید.'); return prev; }
      return [...prev, {...row,quantity:qty,timing:row.kind === 'service' ? 'today' : '',scheduledDate:'',scheduledTime:''}];
    });
  };
  const addManyServices = rows => { for (const row of rows || []) addCatalog({...row, rapidScan:true}); setPickerOpen(false); };
  const setToday = index => setSelected(prev => prev.map((x,i) => i === index ? {...x,timing:'today',scheduledDate:'',scheduledTime:''} : x));
  const applySchedule = ({date,time}) => { const idx=scheduleIndex; setScheduleIndex(-1); setCalendarOpen(false); setSelected(prev => prev.map((x,i) => i === idx ? {...x,timing:date===today?'today':'future',scheduledDate:date,scheduledTime:time} : x)); };

  const buildPatch = (base, status, queueId) => {
    const visitRows = selected.filter(x => x.type === 'visit');
    const outpatientRows = selected.filter(x => x.type === 'outpatient');
    const hospitalRows = selected.filter(x => x.type === 'hospital');
    const productRows = selected.filter(x => x.type === 'product');
    let addedServices = [
      ...visitRows.map(r => ({...{...makeServiceLine440(r.item,r.quantity||1,currentUser,effectiveDoctor,effectiveCareStaff,'registered_visit'),...careStaffIdentityPatch442(effectiveCareStaff),doctorId:effectiveDoctor?.id||'',doctorName:getUserDisplayName(effectiveDoctor)},timing:r.timing||'today',scheduledDate:r.scheduledDate||'',scheduledTime:r.scheduledTime||''})),
      ...hospitalRows.map(r => ({...{...makeServiceLine440(r.item,r.quantity||1,currentUser,effectiveDoctor,effectiveCareStaff,'registered_hospital_service'),...careStaffIdentityPatch442(effectiveCareStaff),doctorId:effectiveDoctor?.id||'',doctorName:getUserDisplayName(effectiveDoctor)},timing:r.timing||'today',scheduledDate:r.scheduledDate||'',scheduledTime:r.scheduledTime||''})),
      ...outpatientRows.filter(r => r.timing === 'future').map(r => ({...{...makeServiceLine440(r.item,r.quantity||1,currentUser,effectiveDoctor,effectiveCareStaff,'scheduled_outpatient_service'),...careStaffIdentityPatch442(effectiveCareStaff),doctorId:effectiveDoctor?.id||'',doctorName:getUserDisplayName(effectiveDoctor)},status:'scheduled_future',timing:'future',scheduledDate:r.scheduledDate||'',scheduledTime:r.scheduledTime||''})),
    ];
    const previousVisit = visitRows.length ? previousChargedVisit450(visitQueue, selectedPatient.id, effectiveDoctor?.id || '', new Date()) : null;
    const repeatResult = enforceRepeatVisit450(addedServices, previousVisit);
    addedServices = repeatResult.lines.map(line => {
      const source = selected.find(r => String(r.item?.id||'') === String(line.serviceId||''));
      return source ? applyInsuranceToServiceLine({line,service:source.item||{},settings,patient:selectedPatient,date:source.scheduledDate||today}) : line;
    });
    const addedOrders = outpatientRows.map(r => ({...makeClinicalOrder440(r.item,currentUser,'reception'),quantity:r.quantity||1,target:'center',timing:r.timing||'today',scheduledDate:r.scheduledDate||'',scheduledTime:r.scheduledTime||''}));
    const addedProducts = productRows.map(r => applyInsuranceToProductLine({line:makeProductLine440(r.item,r.quantity||1,currentUser,{sourceStage:'reception'}),product:r.item||{},settings,patient:selectedPatient,date:today}));
    const newAppointments = selected.filter(r => r.kind==='service' && r.timing==='future' && r.scheduledDate).map(r => makeAppointment440({service:r.item,type:r.type,patient:selectedPatient,actor:currentUser,doctor:effectiveDoctor,date:r.scheduledDate,time:r.scheduledTime,sourceStage:'reception',facility:r.type==='hospital'?'بیمارستان گنجی':'مرکز'})).map(a => ({...a,sourceEncounterId:queueId}));
    const services = mergeBy(base?.services || [], addedServices, 'serviceId');
    const productsLines = mergeBy(base?.products || [], addedProducts, 'productId');
    const orders = [...(base?.clinicalOrders || [])];
    for (const order of addedOrders) if (!orders.some(o => o.serviceId === order.serviceId && o.timing === order.timing && o.scheduledDate === order.scheduledDate && o.status !== 'cancelled')) orders.push(order);
    const appts = [...(base?.appointments || [])];
    for (const a of newAppointments) if (!appts.some(x => x.serviceId === a.serviceId && x.date === a.date && x.time === a.time && x.status !== 'cancelled')) appts.push(a);
    const total = [...services,...productsLines].reduce((s,x)=>s+lineTotal(x),0);
    return {
      patientId:selectedPatient.id, patientName:selectedPatient.fullName || `${selectedPatient.firstName||''} ${selectedPatient.lastName||''}`.trim(), patientCode:selectedPatient.fileNumber || '', nationalId:selectedPatient.nationalId || '', age:selectedPatient.age ?? '', mobilePhone:selectedPatient.mobilePhone || '', insurance:insuranceSnapshot(settings,selectedPatient,today), insuranceProviderId:selectedPatient.insuranceProviderId||'', insuranceProviderName:selectedPatient.insuranceProviderName||'', insuranceContractId:selectedPatient.insuranceContractId||'', insurancePolicyNumber:selectedPatient.insurancePolicyNumber||'',
      doctorId: status === WorkflowStatus.WAITING_DOCTOR ? (effectiveDoctor?.id || '') : (base?.doctorId || effectiveDoctor?.id || ''), doctorName: status === WorkflowStatus.WAITING_DOCTOR ? getUserDisplayName(effectiveDoctor) : (base?.doctorName || getUserDisplayName(effectiveDoctor)),
      careStaffId: effectiveCareStaff?.id || base?.careStaffId || base?.assistantId || base?.nurseId || '',
      careStaffName: getUserDisplayName(effectiveCareStaff) || base?.careStaffName || base?.assistantName || base?.nurseName || '',
      assistantId: effectiveCareStaff?.id || base?.assistantId || base?.nurseId || '', assistantName: getUserDisplayName(effectiveCareStaff) || base?.assistantName || base?.nurseName || '',
      nurseId: effectiveCareStaff?.id || base?.nurseId || base?.assistantId || '', nurseName: getUserDisplayName(effectiveCareStaff) || base?.nurseName || base?.assistantName || '',
      priority, chiefComplaint:reason.trim() || base?.chiefComplaint || '', receptionNotes:reason.trim() || base?.receptionNotes || '',
      services, products:productsLines, clinicalOrders:orders, appointments:appts,
      totalCost:total, remainingDebt:Math.max(0,total-Number(base?.paidAmount||0)), selectedVisitServiceId:visitRows[0]?.item?.id || base?.selectedVisitServiceId || '',
      currentStage:'reception', status, workflowSchema:'bastiyan-patient-flow-v4', workflowVersion:7, lastReceptionEditAt:new Date().toISOString(),
      repeatAdmissionWithin24h: Boolean(previousVisit), repeatVisitSourceEncounterId: previousVisit?.id || '', repeatVisitFeeWaived: Boolean(previousVisit && visitRows.length),
      _newAppointments:newAppointments,
    };
  };

  const validate = (continueFlow) => {
    if (!selectedPatient || !patientConfirmed) { alert('ابتدا بیمار را انتخاب و مشخصات او را تأیید کنید.'); return false; }
    if (otherActive) { alert(`این بیمار یک مراجعه فعال در مرحله دیگری دارد (نوبت ${Number(otherActive.turnNumber||0).toLocaleString('fa-IR')}). ابتدا همان مراجعه را ادامه دهید.`); return false; }
    const route = continueFlow ? nextStatus : WorkflowStatus.RECEPTION_SERVICE;
    if (continueFlow && !effectiveDoctor) { alert('پزشک مسئول را انتخاب کنید.'); return false; }
    if (continueFlow && !effectiveCareStaff) { alert('دستیار / پرستار مسئول این مراجعه را انتخاب کنید.'); return false; }
    for (const r of selected) if (r.kind==='service' && r.timing==='future' && !r.scheduledDate) { alert(`برای «${r.title}» تاریخ نوبت را مشخص کنید.`); return false; }
    return true;
  };

  const settlePriorDebt = async () => {
    if (!selectedPatient || priorDebtSaving) return;
    const debt = Math.max(0, Number(selectedPatient?.creditConfig?.currentDebt || 0));
    const paid = Math.min(debt, Math.max(0, Number(priorDebtPaidAmount || 0)));
    if (paid <= 0) { alert('مبلغ پرداخت بدهی قبلی را وارد کنید.'); return; }
    if (priorDebtPaymentMethod === 'credit') { alert('برای کاهش بدهی قبلی، روش اعتباری قابل استفاده نیست.'); return; }
    const paymentValidation = validatePaymentDetails450(priorDebtPaymentMethod, priorDebtPaymentDetails, paid);
    if (!paymentValidation.ok) { alert(paymentValidation.error); return; }
    setPriorDebtSaving(true);
    try {
      const receipt = {
        ...makePaymentReceipt450({patient:selectedPatient,method:priorDebtPaymentMethod,amount:paid,details:priorDebtPaymentDetails,actor:currentUser,note:'تسویه بدهی قبلی در پذیرش'}),
        encounterId:'DEBT-SETTLEMENT',
        sourceStage:'reception',
        reportCategory:'تسویه بدهی در پذیرش',
      };
      onSettleDebt?.(selectedPatient.id, paid, priorDebtPaymentMethod, priorDebtPaymentDetails.transactionNumber || '');
      onAddPaymentReceipt?.(receipt);
      const sync = await postClinicalFinance450('finance/payment-receipt',{receipt});
      if (sync?.success === false) console.warn('Bastiyan Build451: ثبت آنلاین فیش بدهی پذیرش ناموفق بود و رکورد محلی حفظ شد.',sync.error);
      setPriorDebtPaymentOpen(false);
      setPriorDebtPaidAmount(0);
      setPriorDebtPaymentDetails({});
      setPriorDebtPaymentMethod('deposit_receipt');
    } finally {
      setPriorDebtSaving(false);
    }
  };

  const saveInternal = (continueFlow, forcedStatus = '') => {
    if (submitting || !validate(continueFlow)) return;
    if (receptionPaymentEnabled && !receptionPaymentConfirmed) { alert('ابتدا روی «ثبت پرداخت» داخل بخش روش پرداخت کلیک کنید.'); setSubmitting(false); return; }
    const effectivePaymentMethod = receptionPaymentDraft?.method || receptionPaymentMethod;
    const effectivePaymentDetails = receptionPaymentDraft?.details || receptionPaymentDetails;
    const requestedReceptionPayment = receptionPaymentEnabled && effectivePaymentMethod !== 'credit' ? Math.max(0, Number(receptionPaymentDraft?.amount ?? receptionPaidAmount ?? 0)) : 0;
    if (receptionPaymentEnabled && effectivePaymentMethod !== 'credit') {
      if (requestedReceptionPayment <= 0) { alert('مبلغ دریافتی پذیرش را وارد کنید.'); return; }
      const paymentValidation = validatePaymentDetails450(effectivePaymentMethod, effectivePaymentDetails, requestedReceptionPayment);
      if (!paymentValidation.ok) { alert(paymentValidation.error); return; }
    }
    const repeatSource = selected.some(x=>x.type==='visit') ? previousChargedVisit450(visitQueue, selectedPatient?.id || '', effectiveDoctor?.id || '', new Date()) : null;
    if (repeatSource && continueFlow) alert('هشدار: این بیمار طی ۲۴ ساعت گذشته یک ویزیت دارای هزینه داشته است. پذیرش مجدد به صف پزشک ارسال می‌شود اما هزینه ویزیت جدید صفر محاسبه خواهد شد.');
    setSubmitting(true);
    try {
      const now = new Date();
      const base = existingDraft || null;
      const queueId = base?.id || draftIdRef.current || `q-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      draftIdRef.current = queueId;
      const status = continueFlow ? (forcedStatus || nextStatus) : WorkflowStatus.RECEPTION_SERVICE;
      const patch = buildPatch(base,status,queueId); const newAppointments = patch._newAppointments || []; delete patch._newAppointments;
      const selectedSignature = selected.map(r => [r.kind,r.item?.id||'',r.quantity||1,r.timing||'today',r.scheduledDate||'',r.scheduledTime||''].join(':')).sort().join('|');
      const operationKey = makeActionKey440(continueFlow?'reception-continue':'reception-save',queueId,`${status}:${doctorId||''}:${careStaffId||''}:${selectedSignature}`);
      let item;
      if (base) {
        item = transitionEncounter440({...base,...patch}, status, currentUser, {
          allowSame:true,
          reason: continueFlow ? 'ثبت و ادامه پذیرش' : 'ثبت خدمت اولیه و باقی‌ماندن در پذیرش',
          action: continueFlow ? `ثبت پذیرش و انتقال به ${status}` : 'ثبت خدمات اولیه پذیرش',
          actionKey: operationKey,
          patch,
        });
        onUpdateQueueItem?.(item);
      } else {
        const maxTurn = Math.max(0,...(visitQueue||[]).map(q=>Number(q.turnNumber||0)));
        item = {
          id:queueId, turnNumber:maxTurn+1, registeredAt:now.toISOString(), jalaliTime:now.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}), paidAmount:0, doctorNotes:'', diagnosis:'', prescription:'',
          ...patch,
          workflowHistory:[createWorkflowEvent(status, continueFlow ? `پذیرش ثبت و به ${status} منتقل شد` : 'مراجعه ایجاد و خدمات اولیه ذخیره شد', currentUser,{sourceStage:'reception',fromStatus:'',toStatus:status,reason:continueFlow?'ثبت و ادامه پذیرش':'ثبت اولیه'})],
          encounterAudit:[{id:`enc-audit-${Date.now()}`,type:'create_encounter',message:'ایجاد مراجعه جدید',at:now.toISOString(),userId:currentUser?.id||'',userName:getUserDisplayName(currentUser),userRole:currentUser?.role||'',previousValue:null,newValue:status,reason:continueFlow?'ثبت و ادامه':'ثبت'}],
          idempotencyKeys:[operationKey],
        };
        onAddQueueItem?.(item);
      }
      if (receptionPaymentEnabled && receptionPaymentMethod !== 'credit' && requestedReceptionPayment > 0) {
        const alreadyPaid = Number(item.paidAmount || 0);
        const dueNow = Math.max(0, Number(item.totalCost || 0) - alreadyPaid);
        const applied = Math.min(requestedReceptionPayment, dueNow);
        if (applied > 0) {
          const receipt = makePaymentReceipt450({ encounter:item, patient:selectedPatient, method:effectivePaymentMethod, amount:applied, details:effectivePaymentDetails, actor:currentUser, note:'دریافت در پذیرش' });
          receipt.paymentStage='reception_advance'; receipt.receiptType='advance'; receipt.title='علی‌الحساب پذیرش'; receipt.isAdvancePayment=true; item = { ...item, paymentReceipts:[receipt,...(item.paymentReceipts||[])], advancePayments:[receipt,...(item.advancePayments||[])], advancePaidAmount:Number(item.advancePaidAmount||0)+applied, paidAmount:alreadyPaid+applied, remainingDebt:Math.max(0,Number(item.totalCost||0)-(alreadyPaid+applied)), paymentMethod:effectivePaymentMethod, paymentMethodLabel:receipt.methodLabel, paymentReference:receipt.trackingNumber||'' };
          onUpdateQueueItem?.(item);
          onAddPaymentReceipt?.(receipt);
          postClinicalFinance450('finance/payment-receipt',{receipt});
        }
      }
      for (const a of newAppointments) onAddAppointment?.(a);
      if (continueFlow && forcedStatus === WorkflowStatus.READY_DISCHARGE) {
        onMoveToStage?.('discharge', selectedPatient.id);
      }
      if (continueFlow) {
        const visitLine=(item.services||[]).find(x=>/visit|medical_visit|ویزیت/i.test(`${x.serviceType||''} ${x.category||''} ${x.title||''}`));
        if (visitLine && settings?.thermalVisitTicketEnabled !== false) setLastVisitTicket({patient:selectedPatient,item,doctor:effectiveDoctor||{},service:visitLine});
        if (settings?.enableWelcomeSmsOnAdmission !== false && selectedPatient?.mobilePhone && !item.welcomeAdmissionSmsSentAt) {
          const msg=String(settings.welcomeAdmissionSmsTemplate||'مراجعه‌کننده گرامی {patient_name}، به {clinic_name} خوش آمدید. شماره پرونده شما: {file_number}.').replaceAll('{patient_name}',selectedPatient.fullName||'').replaceAll('{file_number}',selectedPatient.fileNumber||'').replaceAll('{clinic_name}',settings.clinicName||'مرکز درمانی');
          fetch('/api/sms/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobile:selectedPatient.mobilePhone,message:msg})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||d.message||`HTTP ${r.status}`);return d;}).then(()=>{const sentAt=new Date().toISOString();const smsEvent={id:`welcome-${item.id}-${Date.now()}`,type:'welcome_admission',patientId:selectedPatient.id,encounterId:item.id,mobile:selectedPatient.mobilePhone,message:msg,status:'sent',sentAt,actorName:getUserDisplayName(currentUser)};onUpdateQueueItem?.({...item,welcomeAdmissionSmsSentAt:sentAt,welcomeAdmissionSmsMessage:msg,welcomeAdmissionSmsMobile:selectedPatient.mobilePhone,welcomeAdmissionSmsStatus:'sent'});postClinicalFinance450('communication/sms-event',{event:smsEvent});}).catch(err=>{const failedAt=new Date().toISOString();const error=String(err?.message||err);onUpdateQueueItem?.({...item,welcomeAdmissionSmsStatus:'failed',welcomeAdmissionSmsError:error});postClinicalFinance450('communication/sms-event',{event:{id:`welcome-failed-${item.id}-${Date.now()}`,type:'welcome_admission',patientId:selectedPatient.id,encounterId:item.id,mobile:selectedPatient.mobilePhone,message:msg,status:'failed',sentAt:failedAt,actorName:getUserDisplayName(currentUser),error}});});
        }
      }
      setSelected([]);
      setReceptionPaymentEnabled(false); setReceptionPaidAmount(0); setReceptionPaymentDetails({}); setReceptionPaymentMethod('cash'); setReceptionPaymentConfirmed(false); setReceptionPaymentDraft(null);
      if (continueFlow) { setDoctorId(''); setCareStaffId(''); setReason(''); setPriority('normal'); setRouteOverride(''); setSelectedPatientId(''); setPatientConfirmed(false); draftIdRef.current=''; }
      else { setRouteOverride(''); }
    } finally { setTimeout(() => setSubmitting(false), 250); }
  };

  return h('div', { className:'bhis-reception-440', dir:'rtl' },
    h(Stepper,{step}),
    h(SmartPatientRegistration,{patients,settings,selectedPatientId,onSelect:p=>{setSelectedPatientId(p.id);setPatientConfirmed(false);},onCreate:p=>{onAddPatient?.(p);setSelectedPatientId(p.id);setPatientConfirmed(false);},onUpdate:onUpdatePatient,onConfirmed:p=>{onUpdatePatient?.(p);setSelectedPatientId(p.id);setPatientConfirmed(true);},onClear:()=>{setSelectedPatientId('');setPatientConfirmed(false);setSelected([]);}}),
    selectedPatient && patientConfirmed ? h('section',{className:'bhis-reception-encounter-440'},
      h('div',{className:'bhis-reception-summary-head'},h('div',null,h('span',{className:'bhis-eyebrow'},existingDraft?.status===WorkflowStatus.RECEPTION_REVIEW?'پرونده بازگشتی به پذیرش':'مرحله ۳ و ۴'),h('h2',null,selectedPatient.fullName),h('p',null,`پرونده ${selectedPatient.fileNumber||'—'} • کد ملی ${selectedPatient.nationalId||'—'} • سن ${selectedPatient.age!==''&&selectedPatient.age!=null?Number(selectedPatient.age).toLocaleString('fa-IR'):'—'}`)),h('button',{type:'button',className:'bhis-secondary-button compact',onClick:()=>onOpenPatientProfile?.(selectedPatient.id)},h(UserCheck,{className:'w-4 h-4'}),'سوابق')),
      Number(selectedPatient?.creditConfig?.currentDebt||0)>0?h(React.Fragment,null,
        h('div',{className:'bhis-debt-warning'},h(AlertTriangle,{className:'w-5 h-5'}),h('div',null,h('strong',null,'بیمار بدهی قبلی دارد'),h('span',null,money(selectedPatient.creditConfig.currentDebt))),h('button',{type:'button',className:'bhis-secondary-button compact',onClick:()=>{const next=!priorDebtPaymentOpen;setPriorDebtPaymentOpen(next);if(next&&Number(priorDebtPaidAmount||0)<=0)setPriorDebtPaidAmount(Number(selectedPatient.creditConfig.currentDebt||0));}},h(Receipt,{className:'w-4 h-4'}),priorDebtPaymentOpen?'بستن پرداخت بدهی':'ثبت پرداخت بدهی')),
        priorDebtPaymentOpen?h('div',{className:'bhis-debt-payment450 bhis-reception-debt-payment451'},h('div',{className:'bhis-clinical-section-title'},h(Receipt,{className:'w-5 h-5'}),h('div',null,h('h3',null,'پرداخت بدهی قبلی در پذیرش'),h('p',null,'فیش با شماره پیگیری و تاریخ/ساعت انتخابی در گزارش مالی ثبت و از بدهی بیمار کسر می‌شود.'))),h(PaymentMethodSelector450,{methods:settings.paymentMethods||[],value:priorDebtPaymentMethod,onChange:setPriorDebtPaymentMethod,details:priorDebtPaymentDetails,onDetailsChange:setPriorDebtPaymentDetails,amount:Number(selectedPatient.creditConfig.currentDebt||0),paidAmount:priorDebtPaidAmount,onPaidAmountChange:setPriorDebtPaidAmount,settings,patientName:selectedPatient?.fullName}),h('div',{className:'bhis-inline-actions end'},h('button',{type:'button',className:'bhis-secondary-button',disabled:priorDebtSaving,onClick:()=>setPriorDebtPaymentOpen(false)},'انصراف'),h('button',{type:'button',className:'bhis-primary-button',disabled:priorDebtSaving,onClick:settlePriorDebt},priorDebtSaving?'در حال ثبت...':'ثبت فیش / پرداخت و کاهش بدهی'))):null
      ):null,
      h('div',{className:'bhis-reception-meta-grid'},
        h('label',{className:'bhis-field'},h('span',null,'پزشک مسئول *'),h(RoleUserSearchPicker,{users:doctors,value:doctorId,onChange:setDoctorId,role:'doctor',required:true,allowEmpty:false,placeholder:'جستجو و انتخاب پزشک...'})),
        h('label',{className:'bhis-field'},h('span',null,'دستیار / پرستار مسئول *'),h(RoleUserSearchPicker,{users:careStaff,value:careStaffId,onChange:setCareStaffId,role:'nurse',required:true,allowEmpty:false,placeholder:'جستجو و انتخاب دستیار / پرستار مسئول...'})),
        h('label',{className:'bhis-field'},h('span',null,'اولویت'),h('select',{value:priority,onChange:e=>setPriority(e.target.value)},h('option',{value:'normal'},'عادی'),h('option',{value:'urgent'},'فوری'))),
        h('label',{className:'bhis-field bhis-field-wide'},h('span',null,'یادداشت کوتاه / مشکل بیمار'),h('input',{value:reason,onChange:e=>setReason(e.target.value),placeholder:'مثلاً درد شکم، مراجعه جهت بخیه، پیگیری نتیجه...'}))),
      h('section',{className:'bhis-clinical-section bhis-service-selection-section'},
        h('div',{className:'bhis-clinical-section-title with-action'},h('div',{className:'flex items-center gap-2'},h(Stethoscope,{className:'w-5 h-5'}),h('div',null,h('h3',null,'ثبت سریع خدمت و کالا'),h('p',null,'خدمات چندانتخابی؛ کالا با تعداد، صفحه‌کلید یا بارکد.'))),h('div',{className:'bhis-inline-actions'},h('button',{type:'button',className:'bhis-secondary-button compact',onClick:()=>{setPickerPreset({tab:'product',scan:true});setPickerOpen(true);}},h(Camera,{className:'w-4 h-4'}),'بارکد سریع'),h('button',{type:'button',className:'bhis-primary-button compact',onClick:()=>{setPickerPreset({tab:'all',scan:false});setPickerOpen(true);}},h(Plus,{className:'w-4 h-4'}),'انتخاب خدمت / کالا'))),
        selected.length?h('div',{className:'bhis-reception-selected-list'},...selected.map((r,index)=>h('div',{key:`${r.kind}-${r.item?.id}-${index}`,className:'bhis-reception-selected-row'},h('span',{className:`bhis-line-icon ${r.kind==='product'?'product':'service'}`},r.kind==='product'?h(Package,{className:'w-4 h-4'}):h(Stethoscope,{className:'w-4 h-4'})),h('div',{className:'main'},h('strong',null,r.title),h('small',null,`${catalogLabel440(r.type)} • ${r.code||'بدون کد'}${r.timing==='future'?` • ${formatPersianAppointmentDate(r.scheduledDate)} ${r.scheduledTime||''}`:''}`)),h('input',{className:'bhis-inline-qty',type:'number',min:1,value:r.quantity,onChange:e=>setSelected(prev=>prev.map((x,i)=>i===index?{...x,quantity:Math.max(1,Number(e.target.value)||1)}:x))}),r.kind==='service'?h('div',{className:'bhis-time-actions'},h('button',{type:'button',className:r.timing!=='future'?'active':'',onClick:()=>setToday(index)},h(Clock,{className:'w-3.5 h-3.5'}),'امروز'),r.type!=='visit'?h('button',{type:'button',className:r.timing==='future'?'active':'',onClick:()=>{setScheduleIndex(index);setCalendarOpen(true);}},h(Calendar,{className:'w-3.5 h-3.5'}),'تاریخ دیگر'):null):h('span',{className:'bhis-stock-inline'},`موجودی ${Number(r.item?.stockQuantity||0).toLocaleString('fa-IR')}`),h('strong',{className:'amount'},money(rowPrice(r)*Number(r.quantity||1))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>setSelected(prev=>prev.filter((_,i)=>i!==index))},h(Trash2,{className:'w-4 h-4'}))))):h('div',{className:'bhis-order-empty'},'هنوز خدمتی یا کالایی برای ثبت انتخاب نشده است.')),
      priorAppointments.length?h('section',{className:'bhis-upcoming-appointments'},h('div',{className:'bhis-clinical-section-title'},h(Calendar,{className:'w-5 h-5'}),h('div',null,h('h3',null,'نوبت‌های فعال بیمار'),h('p',null,'برای جلوگیری از تداخل زمانی'))),h('div',{className:'bhis-appointment-mini-list'},...priorAppointments.slice(-8).map(a=>h('div',{key:a.id},h('strong',null,a.title),h('span',null,`${formatPersianAppointmentDate(a.date)} • ${a.time||'بدون ساعت'}`))))):null,
      h('section',{className:'bhis-reception-payment451'},
        h('div',{className:'bhis-clinical-section-title with-action'},h('div',{className:'flex items-center gap-2'},h(CreditCard,{className:'w-5 h-5'}),h('div',null,h('h3',null,'پرداخت / ثبت فیش در پذیرش'),h('p',null,'دریافت اولیه در همان مراجعه و گزارش روش پرداخت ثبت می‌شود.'))),h('button',{type:'button',className:receptionPaymentEnabled?'bhis-primary-button compact':'bhis-secondary-button compact',onClick:()=>{const next=!receptionPaymentEnabled;setReceptionPaymentEnabled(next);if(next&&Number(receptionPaidAmount||0)<=0)setReceptionPaidAmount(selectedCurrentTotal);setReceptionPaymentConfirmed(false);}},h(Receipt,{className:'w-4 h-4'}),receptionPaymentEnabled?'فعال است':'ثبت پرداخت')),
        receptionPaymentEnabled?h(PaymentMethodSelector450,{methods:settings.paymentMethods||[],value:receptionPaymentMethod,onChange:m=>{setReceptionPaymentMethod(m);setReceptionPaymentConfirmed(false);setReceptionPaymentDraft(null)},details:receptionPaymentDetails,onDetailsChange:v=>{setReceptionPaymentDetails(v);setReceptionPaymentConfirmed(false);setReceptionPaymentDraft(null)},amount:selectedCurrentTotal,paidAmount:receptionPaidAmount,onPaidAmountChange:v=>{setReceptionPaidAmount(v);setReceptionPaymentConfirmed(false);setReceptionPaymentDraft(null)},settings,patientName:selectedPatient?.fullName,showApply:true,onApply:payload=>{const amount=Math.max(0,Number(payload?.amount||0));if(payload?.method!=='credit'&&amount<=0){alert('مبلغ پرداختی باید بیشتر از صفر باشد.');return;}setReceptionPaymentDraft({method:payload.method,amount,details:payload.details||{}});setReceptionPaymentConfirmed(true)},applyLabel:receptionPaymentConfirmed?'پرداخت علی‌الحساب ثبت شد':'ثبت پرداخت'}):null
      ),
      h('section',{className:'bhis-route-selector-440'},h('div',{className:'bhis-clinical-section-title'},h(Route,{className:'w-5 h-5'}),h('div',null,h('h3',null,'مرحله بعد بیمار'),h('p',null,'مسیر از نوع خدمت پیشنهاد می‌شود؛ می‌توان حتی بدون ثبت خدمت مسیر را صریح انتخاب کرد.'))),h('div',{className:'bhis-route-options-434'},h('button',{type:'button',className:nextStatus===WorkflowStatus.WAITING_DOCTOR?'active':'',onClick:()=>setRouteOverride(WorkflowStatus.WAITING_DOCTOR)},'صف ویزیت پزشک'),h('button',{type:'button',className:nextStatus===WorkflowStatus.WAITING_NURSE?'active':'',onClick:()=>setRouteOverride(WorkflowStatus.WAITING_NURSE)},'دستیار / پرستار مسئول'),h('button',{type:'button',className:nextStatus===WorkflowStatus.READY_DISCHARGE?'active':'',onClick:()=>setRouteOverride(WorkflowStatus.READY_DISCHARGE)},'پذیرش / ترخیص'),h('button',{type:'button',className:'reset',onClick:()=>setRouteOverride('')},'مسیر پیشنهادی'))),
      h('footer',{className:'bhis-reception-submit-bar bhis-reception-dual-actions-440'},h('div',null,h('strong',null,'مرحله بعد: '+(nextStatus===WorkflowStatus.WAITING_DOCTOR?'صف پزشک':nextStatus===WorkflowStatus.WAITING_NURSE?'دستیار / پرستار مسئول':'صندوق / ترخیص'))),h('div',{className:'bhis-dual-save-buttons-440'},h('button',{type:'button',disabled:submitting,className:'bhis-secondary-button prominent',onClick:()=>saveInternal(false)},'ذخیره پیش‌نویس'),h('button',{type:'button',disabled:submitting,className:'bhis-primary-button prominent',onClick:()=>saveInternal(true)},'ثبت پذیرش و انتقال'))),
    lastVisitTicket ? h('div',{className:'bhis-visit-ticket-ready450'},h('div',null,h('strong',null,lastVisitTicket.item.repeatAdmissionWithin24h?'پذیرش مجدد در ۲۴ ساعت':'نوبت ویزیت ثبت شد'),h('span',null,lastVisitTicket.item.repeatAdmissionWithin24h?'هزینه ویزیت جدید صفر است؛ بیمار به صف پزشک اضافه شد.':'در صورت نیاز برگه نوبت حرارتی را چاپ کنید.')),h('button',{type:'button',className:'bhis-primary-button compact',onClick:()=>printVisitTicket450({...lastVisitTicket,settings})},'چاپ نوبت و قبض'),h('button',{type:'button',className:'bhis-icon-button',onClick:()=>setLastVisitTicket(null)},'×')) : null,
    h(UnifiedClinicalCatalogPicker,{open:pickerOpen,medicalServices,products,onSelect:addCatalog,onSelectMany:addManyServices,onClose:()=>setPickerOpen(false),title:'انتخاب سریع خدمات و کالا',initialTab:pickerPreset.tab,autoStartScanner:pickerPreset.scan,multiService:true}),
    h(PersianAppointmentCalendar,{open:calendarOpen&&scheduleIndex>=0,visitQueue,appointments,service:selected[scheduleIndex]?.item,patient:selectedPatient,initialDate:selected[scheduleIndex]?.scheduledDate||'',initialTime:selected[scheduleIndex]?.scheduledTime||'09:00',title:selected[scheduleIndex]?.type==='hospital'?'نوبت عمل / خدمت بیمارستان گنجی':'نوبت خدمت سرپایی مرکز',onConfirm:applySchedule,onClose:()=>{setCalendarOpen(false);setScheduleIndex(-1);}})) : null);
}
