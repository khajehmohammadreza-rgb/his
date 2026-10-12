import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { UnifiedClinicalCatalogPicker } from './UnifiedClinicalCatalogPicker440.js?b=r24-514-1405';
import { PersianAppointmentCalendar, formatPersianAppointmentDate, todayIso } from './PersianAppointmentCalendar440.js?b=r24-514-1405';
import { getUserDisplayName, userHasRole, isMedicalVisitService } from '../utils/clinicalWorkflow.js?b=r24-514-1405';
import { transitionEncounter440, returnEncounter440, WorkflowStatus, makeActionKey440 } from '../utils/workflow440.js?b=r24-514-1405';
import { makeClinicalOrder440, makeFreeTextOrder440, makeServiceLine440, makeProductLine440, makeAppointment440, catalogLabel440 } from '../utils/unifiedClinicalCatalog440.js?b=r24-514-1405';
import { rankLive } from '../utils/liveSearch440.js?b=r24-514-1405';
import { enrichQueuePatients } from '../utils/patientIdentity440.js?b=r24-514-1405';
import { MoneyInput453 } from './MoneyInput453.js?b=r24-514-1405';
import { TrackingCodeSmsPanel453 } from './TrackingCodeSmsPanel453.js?b=r24-514-1405';
import { ClinicalBeforeAfterGallery } from './ClinicalBeforeAfterGallery.js?b=r24-514-1405';
import { makeFreeClinicalService450, updateCustomServiceLibrary450, isToday450 } from '../utils/clinicalFinance450.js?b=r24-514-1405';
import { postClinicalFinance450 } from '../utils/financeClinical450.js?b=r24-514-1405';
import { Search, Stethoscope, User as UserRound, Clock as Clock3, AlertTriangle, FileText, Plus, Trash2, Save, CheckCircle2, History, Activity, Package, Building2, ChevronLeft, Calendar, X, ArrowLeft, Receipt, Camera } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
const h = React.createElement;
const activeStatuses = new Set(['waiting_doctor', 'under_treatment']);
const norm = (v) => String(v || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;
const lineTotal = (x) => { var _a, _b; return Number((_b = (_a = x === null || x === void 0 ? void 0 : x.unitPrice) !== null && _a !== void 0 ? _a : x === null || x === void 0 ? void 0 : x.price) !== null && _b !== void 0 ? _b : 0) * Math.max(1, Number((x === null || x === void 0 ? void 0 : x.quantity) || 1)); };
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

export function resolveDoctorManualForward440(target = 'discharge') {
    return target === 'nurse' ? WorkflowStatus.WAITING_NURSE : WorkflowStatus.READY_DISCHARGE;
}
function canSee(item, user, doctors) {
    if (!item || !activeStatuses.has(item.status))
        return false;
    if (userHasRole(user, 'admin'))
        return true;
    const display = getUserDisplayName(user);
    const rec = (doctors || []).find(d => d.id === (user === null || user === void 0 ? void 0 : user.id) || (d.medicalCouncilNumber && d.medicalCouncilNumber === (user === null || user === void 0 ? void 0 : user.medicalCouncilNumber)));
    const ids = new Set([user === null || user === void 0 ? void 0 : user.id, rec === null || rec === void 0 ? void 0 : rec.id].filter(Boolean).map(String));
    if (!item.doctorId && !item.doctorName)
        return true;
    return ids.has(String(item.doctorId || '')) || item.doctorName === display || item.doctorName === getUserDisplayName(rec);
}
export function ProfessionalDoctorWorkspace({ visitQueue = [], appointments: globalAppointments = [], doctors = [], users = [], staffAccounts = [], medicalServices = [], products = [], patients = [], customServiceLibrary = [], currentUser, settings = {}, initialPatientId = '', initialEncounterId = '', onUpdateQueueItem, onAddAppointment, onUpdateAppointment, onOpenPatientProfile, onUpdatePatient, onMoveToStage, onUpdateCustomServiceLibrary }) {
    var _a;
    const queue = useMemo(() => enrichQueuePatients((visitQueue || []).filter(q => canSee(q, currentUser, doctors)), patients).sort((a, b) => new Date(a.registeredAt || 0) - new Date(b.registeredAt || 0)), [visitQueue, currentUser, doctors, patients]);
    const doctorIdentityIds = useMemo(() => { const rec=(doctors||[]).find(d=>String(d.id)===String(currentUser?.id||'')||(d.medicalCouncilNumber&&d.medicalCouncilNumber===currentUser?.medicalCouncilNumber)||String(d.userId||'')===String(currentUser?.id||'')); return new Set([currentUser?.id,rec?.id,rec?.userId].filter(Boolean).map(String)); }, [doctors,currentUser?.id,currentUser?.medicalCouncilNumber]);
    const sentToday = useMemo(() => enrichQueuePatients((visitQueue || []).filter(q => doctorIdentityIds.has(String(q.doctorId||q.doctorUserId||'')) && !activeStatuses.has(q.status) && !['cancelled'].includes(q.status) && isToday450(q.doctorCompletedAt||q.lastWorkflowAt||q.registeredAt)), patients).sort((a,b)=>new Date(b.lastWorkflowAt||0)-new Date(a.lastWorkflowAt||0)).slice(0,40), [visitQueue,doctorIdentityIds,patients]);
    const [activeId, setActiveId] = useState('');
    const [showGallery, setShowGallery] = useState(false);
    const [query, setQuery] = useState('');
    const [pickerMode, setPickerMode] = useState('');
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [doctorNotes, setDoctorNotes] = useState('');
    const [prescription, setPrescription] = useState('');
    const [orders, setOrders] = useState([]);
    const [services, setServices] = useState([]);
    const [productLines, setProductLines] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [pendingSchedule, setPendingSchedule] = useState(null);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [freeTextService, setFreeTextService] = useState('');
    const [freeTextNote, setFreeTextNote] = useState('');
    const [freeEstimatedAmount, setFreeEstimatedAmount] = useState(0);
    const [freeTarget, setFreeTarget] = useState('nurse');
    const active = queue.find(q => q.id === activeId) || null;
    const patient = active ? (patients || []).find(p => String(p.id) === String(active.patientId)) : null;
    const activePatientAlerts = patient ? (patient.persistentAlerts || patient.alerts || []).filter((alert) => alert && alert.active !== false && String(alert.text || alert.note || '').trim()) : [];
    const staffById = useMemo(() => {
        const accounts = new Map((staffAccounts||[]).map(a=>[String(a.userId),a]));
        return new Map((users||[]).map(u=>[String(u.id),{...u,financialAccount:accounts.get(String(u.id))||u.financialAccount||null}]));
    }, [users, staffAccounts]);
    const assignedCareStaffId = active?.careStaffId || active?.assistantId || active?.nurseId || '';
    const assignedCareStaff = active ? (staffById.get(String(assignedCareStaffId)) || (assignedCareStaffId ? {id:assignedCareStaffId,name:active.careStaffName||active.assistantName||active.nurseName||''} : null)) : null;
    const activeDoctorFinancial = staffById.get(String(currentUser?.id||'')) || currentUser;
    const withCareTeam = (service, line, qty=1) => ({...line,doctorId:currentUser?.id||active?.doctorId||'',doctorName:getUserDisplayName(currentUser)||active?.doctorName||'',...careStaffIdentityPatch442(assignedCareStaff)});

    const filtered = useMemo(() => query.trim() ? rankLive(queue, query, x => `${x.patientName || ''} ${x.patientCode || ''} ${x.nationalId || ''} ${x.turnNumber || ''} ${x.receptionNotes || x.chiefComplaint || ''}`, { limit: 100 }) : queue, [queue, query]);
    const today = todayIso();
    const select = (item) => {
        setActiveId(item.id);
        setChiefComplaint(item.chiefComplaint || item.receptionNotes || '');
        setDiagnosis(item.diagnosis || '');
        setDoctorNotes(item.doctorNotes || '');
        setPrescription(item.prescription || '');
        setOrders((item.clinicalOrders || []).filter(o => o.status !== 'cancelled'));
        setServices([...(item.services || [])]);
        setProductLines([...(item.products || [])]);
        setAppointments([...(item.appointments || [])]);
        setPendingSchedule(null);
        setCalendarOpen(false);
        setPickerMode('');
        setFreeTextService('');
        setFreeTextNote('');
        setFreeEstimatedAmount(0);
        setFreeTarget('nurse');
        if (item.status === 'waiting_doctor')
            onUpdateQueueItem?.(transitionEncounter440(item, WorkflowStatus.UNDER_DOCTOR, currentUser, { action: 'پزشک پرونده را از صف ویزیت باز کرد', actionKey: makeActionKey440('doctor-open', item.id, item.status) }));
    };
    useEffect(() => {
        if (initialEncounterId) {
            const found = queue.find(q => String(q.id) === String(initialEncounterId));
            if (found) { select(found); return; }
        }
        if (initialPatientId) {
            const found = queue.find(q => String(q.patientId) === String(initialPatientId));
            if (found) { select(found); return; }
        }
    }, [initialEncounterId, initialPatientId, queue]);
    const baseNow = () => (visitQueue || []).find(q => q.id === activeId) || active;
    const patch = (serviceRows = services) => ({
        chiefComplaint, diagnosis, doctorNotes, prescription, clinicalOrders: orders, services: serviceRows, products: productLines, appointments,
        totalCost: [...serviceRows, ...productLines].reduce((s, x) => s + lineTotal(x), 0), lastDoctorEditAt: new Date().toISOString(),
    });
    const save = () => {
        const b = baseNow();
        if (b)
            onUpdateQueueItem === null || onUpdateQueueItem === void 0 ? void 0 : onUpdateQueueItem({ ...b, ...patch() });
    };
    const startPick = (mode) => { setPickerMode(mode); };
    const allowedTypes = pickerMode === 'outpatient' ? ['outpatient'] : pickerMode === 'hospital' ? ['hospital'] : pickerMode === 'product' ? ['product'] : [];
    const pickerTitle = pickerMode === 'outpatient' ? 'انتخاب خدمت سرپایی مرکز' : pickerMode === 'hospital' ? 'انتخاب عمل / خدمت بیمارستان گنجی' : pickerMode === 'product' ? 'انتخاب کالا یا دارو' : 'انتخاب مورد';
    const addCatalog = (row) => {
        if (!(row === null || row === void 0 ? void 0 : row.rapidScan))
            setPickerMode('');
        if (!active)
            return;
        if (row.type === 'product') {
            setProductLines(prev => [...prev, makeProductLine440(row.item, Math.max(1, Number(row.quantity || 1)), currentUser)]);
            return;
        }
        if (row.type === 'outpatient' || row.type === 'hospital') {
            setPendingSchedule(row);
            return;
        }
    };
    const commitScheduled = (row, { date = today, time = '' }) => {
        if (!(row === null || row === void 0 ? void 0 : row.item))
            return;
        const future = String(date) !== String(today);
        if (row.type === 'outpatient') {
            const dup = orders.some(o => o.serviceId === row.item.id && o.status === 'ordered' && String(o.scheduledDate || '') === String(future ? date : ''));
            if (dup) {
                alert('این خدمت سرپایی با همین زمان‌بندی قبلاً ثبت شده است.');
                return;
            }
        }
        else if (row.type === 'hospital') {
            const dup = services.some(s => s.serviceId === row.item.id && s.status === 'registered_hospital_service' && String(s.scheduledDate || '') === String(future ? date : ''));
            if (dup) {
                alert('این عمل / خدمت بیمارستانی با همین زمان‌بندی قبلاً ثبت شده است.');
                return;
            }
        }
        const appointment = future ? makeAppointment440({ service: row.item, type: row.type, patient: patient || active, actor: currentUser, doctor: currentUser, date, time, sourceStage: 'doctor' }) : null;
        if (appointment) {
            setAppointments(prev => [...prev, appointment]);
            onAddAppointment?.({ ...appointment, sourceEncounterId: active?.id || '' });
        }
        if (row.type === 'outpatient') {
            const order = { ...makeClinicalOrder440(row.item, currentUser, 'doctor'), target: 'center', timing: future ? 'future' : 'today', scheduledDate: future ? date : '', scheduledTime: future ? time : '', appointmentId: (appointment === null || appointment === void 0 ? void 0 : appointment.id) || '' };
            setOrders(prev => [...prev, order]);
            if (future) {
                const scheduledLine = { ...withCareTeam(row.item, makeServiceLine440(row.item, 1, currentUser, currentUser, assignedCareStaff, 'scheduled_outpatient_service')), status:'scheduled_future', timing:'future', scheduledDate:date, scheduledTime:time, appointmentId:appointment?.id || '' };
                setServices(prev => [...prev, scheduledLine]);
            }
        }
        else if (row.type === 'hospital') {
            const line = { ...withCareTeam(row.item, makeServiceLine440(row.item, 1, currentUser, currentUser, assignedCareStaff, 'registered_hospital_service')), timing: future ? 'future' : 'today', scheduledDate: future ? date : '', scheduledTime: future ? time : '', appointmentId: (appointment === null || appointment === void 0 ? void 0 : appointment.id) || '' };
            setServices(prev => [...prev, line]);
        }
        setPendingSchedule(null);
        setCalendarOpen(false);
    };
    const removeOrder = (id) => {
        const row = orders.find(o => o.id === id);
        if (row?.appointmentId) {
            setAppointments(prev => prev.filter(a => a.id !== row.appointmentId));
            const global = (globalAppointments || []).find(a => a.id === row.appointmentId);
            if (global) onUpdateAppointment?.({ ...global, status:'cancelled', cancelledAt:new Date().toISOString(), cancelledById:currentUser?.id || '' });
        }
        setOrders(prev => prev.filter(o => o.id !== id));
    };
    const removeService = (id) => {
        const row = services.find(x => x.id === id);
        if (row?.appointmentId) {
            setAppointments(prev => prev.filter(a => a.id !== row.appointmentId));
            const global = (globalAppointments || []).find(a => a.id === row.appointmentId);
            if (global) onUpdateAppointment?.({ ...global, status:'cancelled', cancelledAt:new Date().toISOString(), cancelledById:currentUser?.id || '' });
        }
        setServices(prev => prev.filter(x => x.id !== id));
    };
    const removeProduct = (id) => setProductLines(prev => prev.filter(x => x.id !== id));
    const ensureVisitLine = () => {
        let finalServices = [...services];
        const base = baseNow();
        if ((base === null || base === void 0 ? void 0 : base.encounterRoute) === 'consultation') {
            const visit = (medicalServices || []).find(s => String(s.id) === String(base.selectedVisitServiceId)) || (medicalServices || []).find(s => s && s.active !== false && isMedicalVisitService(s));
            if (visit && !finalServices.some(x => String(x.serviceId) === String(visit.id)))
                finalServices.push(withCareTeam(visit, makeServiceLine440(visit, 1, currentUser, currentUser, assignedCareStaff, 'performed_by_doctor')));
        }
        return finalServices;
    };
    const finish = (forceDischarge = false) => {
        const base = baseNow();
        if (!base)
            return;
        const sameDayCenter = orders.filter(o => o.target === 'center' && o.status === 'ordered' && o.timing !== 'future');
        if (forceDischarge && sameDayCenter.length) {
            alert('برای امروز خدمت سرپایی ثبت شده است. ابتدا آن خدمت را حذف کنید یا بیمار را به دستیار / پرستار مسئول ارسال کنید.');
            return;
        }
        const finalServices = ensureVisitLine();
        const next = forceDischarge ? WorkflowStatus.READY_DISCHARGE : (sameDayCenter.length ? WorkflowStatus.WAITING_NURSE : WorkflowStatus.READY_DISCHARGE);
        const reasonText = forceDischarge ? 'پزشک معاینه را پایان داد و بیمار را مستقیم برای تسویه و ترخیص ارسال کرد' : sameDayCenter.length ? 'پزشک خدمت سرپایی امروز ثبت کرد و بیمار را برای آماده‌سازی به دستیار / پرستار مسئول ارسال کرد' : 'پزشک بیمار را برای تایید نهایی و تسویه به پذیرش/صندوق ارسال کرد';
        const updated = transitionEncounter440(base, next, currentUser, { action: reasonText, reason: reasonText, actionKey: makeActionKey440('doctor-finish', base.id, `${base.status}->${next}`), patch: { ...patch(finalServices), services: finalServices, totalCost: [...finalServices, ...productLines].reduce((s, x) => s + lineTotal(x), 0), doctorCompletedAt: new Date().toISOString() } });
        onUpdateQueueItem === null || onUpdateQueueItem === void 0 ? void 0 : onUpdateQueueItem(updated);
        setActiveId('');
    };
    const handoffWithoutNewItem = (target = 'nurse') => {
        const base = baseNow();
        if (!base)
            return;
        const finalServices = ensureVisitLine();
        const next = resolveDoctorManualForward440(target);
        const reasonText = target === 'nurse' ? 'پزشک بیمار را بدون ثبت خدمت جدید برای بررسی/آماده‌سازی به دستیار / پرستار مسئول ارسال کرد' : 'پزشک بیمار را بدون ثبت خدمت جدید برای پذیرش/ترخیص ارسال کرد';
        const updated = transitionEncounter440(base, next, currentUser, { action: reasonText, reason: reasonText, actionKey: makeActionKey440('doctor-manual', base.id, target), patch: { ...patch(finalServices), services: finalServices, totalCost: [...finalServices, ...productLines].reduce((sum, row) => sum + lineTotal(row), 0), doctorCompletedAt: new Date().toISOString(), manualDoctorHandoff: target } });
        onUpdateQueueItem?.(updated);
        setActiveId('');
        onMoveToStage?.(target === 'nurse' ? 'nurse' : 'discharge', base.patientId);
    };
    const sendFreeText = () => {
        const base = baseNow(); if (!base) return;
        const title = String(freeTextService || diagnosis || '').trim();
        if (!title) { alert('تشخیص یا خدمت مورد نیاز را به‌صورت متنی وارد کنید.'); return; }
        const at = new Date().toISOString();
        const freeOrder = makeFreeTextOrder440({ title, instructions:String(freeTextNote||doctorNotes||'').trim(), actor:currentUser, sourceStage:'doctor', target:freeTarget });
        const customLine = makeFreeClinicalService450({title,note:String(freeTextNote||doctorNotes||'').trim(),estimatedAmount:freeEstimatedAmount,doctor:activeDoctorFinancial,careStaff:assignedCareStaff,actor:currentUser,sourceEncounterId:base.id});
        const nextOrders=[...orders,{...freeOrder,linkedCustomServiceId:customLine.id,estimatedAmount:customLine.estimatedAmount}];
        const nextServices=[...services,customLine];
        const targetStatus=freeTarget==='nurse'?WorkflowStatus.WAITING_NURSE:WorkflowStatus.READY_DISCHARGE;
        const transferReason=freeTarget==='nurse'?'پزشک خدمت خاص خارج از فهرست با مبلغ تقریبی ثبت کرد و بیمار را به دستیار / پرستار مسئول فرستاد':'پزشک خدمت خاص خارج از فهرست ثبت کرد و بیمار را برای تأیید قیمت نهایی به ترخیص فرستاد';
        const updated=transitionEncounter440(base,targetStatus,currentUser,{action:transferReason,reason:transferReason,actionKey:makeActionKey440('doctor-free-service-450',base.id,`${targetStatus}:${title}:${freeEstimatedAmount}`),patch:{...patch(nextServices),services:nextServices,clinicalOrders:nextOrders,diagnosis:diagnosis||title,doctorNotes:[doctorNotes,freeTextNote].filter(Boolean).join('\n'),doctorCompletedAt:at,hasProvisionalCustomService:true,freeTextClinicalInstruction:{title,note:freeTextNote,target:freeTarget,estimatedAmount:Number(freeEstimatedAmount||0),at}}});
        onUpdateQueueItem?.(updated);
        const lib=updateCustomServiceLibrary450(customServiceLibrary,customLine,currentUser); onUpdateCustomServiceLibrary?.(lib);
        postClinicalFinance450('clinical/custom-service',{service:{...customLine,patientId:base.patientId,encounterId:base.id}});
        setActiveId(''); setFreeEstimatedAmount(0);
    };
    const restoreToDoctor = (item) => {
        if (!item || ['discharged','completed','cancelled'].includes(item.status)) return;
        const updated=transitionEncounter440(item,WorkflowStatus.WAITING_DOCTOR,currentUser,{action:'پزشک بیمار ارجاع‌شده امروز را برای ویرایش مجدد به صف خود بازگرداند',reason:'بازگشت مجاز پزشک برای تکمیل خدمت/یادداشت',actionKey:makeActionKey440('doctor-restore-450',item.id,item.status),patch:{restoredToDoctorAt:new Date().toISOString()}});
        onUpdateQueueItem?.(updated);
    };
    const backToReception = () => {
        const base = baseNow();
        if (!base)
            return;
        const reason = prompt('دلیل بازگشت بیمار به پذیرش را ثبت کنید:');
        if (!String(reason || '').trim()) return;
        const updated = returnEncounter440({ ...base, ...patch(), returnSuggestedStatus: WorkflowStatus.WAITING_DOCTOR }, WorkflowStatus.RECEPTION_REVIEW, currentUser, String(reason).trim());
        onUpdateQueueItem?.(updated);
        setActiveId('');
        onMoveToStage?.('reception', base.patientId);
    };
    const debt = Number(((_a = patient === null || patient === void 0 ? void 0 : patient.creditConfig) === null || _a === void 0 ? void 0 : _a.currentDebt) || 0);
    const sameDayOutpatient = orders.filter(o => o.target === 'center' && o.status === 'ordered' && o.timing !== 'future');
    const futureCount = [...orders, ...services].filter(x => x.timing === 'future' && x.scheduledDate).length;
    const scheduleRow = pendingSchedule;
    const queuePanel = h('aside',{className:'bhis-worklist bhis-role-queue450'},
        h('div',{className:'bhis-worklist-header'},
            h('div',null,h('span',{className:'bhis-eyebrow'},'صف ویزیت پزشک'),h('h2',null,'مراجعین امروز'),h('p',null,`${queue.length.toLocaleString('fa-IR')} بیمار در صف`)),
            h('span',{className:'bhis-worklist-count'},queue.length.toLocaleString('fa-IR'))
        ),
        h('label',{className:'bhis-worklist-search'},h(Search,{className:'w-4 h-4'}),h('input',{value:query,onChange:e=>setQuery(e.target.value),placeholder:'نام، پرونده، کد ملی یا توضیح پذیرش...'})),
        h('div',{className:'bhis-worklist-scroll'},
            ...(filtered.length===0?[h('div',{className:'bhis-worklist-empty',key:'empty'},'بیماری در صف ویزیت نیست.')]:filtered.map((item,i)=>h('button',{key:item.id,type:'button',onClick:()=>select(item),className:`bhis-patient-row ${i%2?'alt':''} ${activeId===item.id?'active':''}`},
                h('span',{className:'bhis-patient-avatar'},h(UserRound,{className:'w-4 h-4'})),
                h('span',{className:'bhis-patient-row-main'},h('strong',null,item.patientName||'بیمار'),h('small',null,`پرونده ${item.patientCode||'—'} • نوبت ${Number(item.turnNumber||0).toLocaleString('fa-IR')}`),item.repeatAdmissionWithin24h?h('small',{className:'bhis-repeat-admission451'},'پذیرش مجدد ۲۴ساعته • ویزیت بدون هزینه'):null,h('em',{className:'bhis-reception-note'},item.receptionNotes||item.chiefComplaint||'بدون توضیح کوتاه پذیرش')),
                h('span',{className:`bhis-status-dot ${item.status==='under_treatment'?'busy':''}`})
            )))
        ),
        h('section',{className:'bhis-doctor-sent450'},
            h('div',{className:'bhis-doctor-sent450-title'},h(History,{className:'w-4 h-4'}),h('strong',null,'ارجاع‌های امروز'),h('span',null,sentToday.length.toLocaleString('fa-IR'))),
            h('div',{className:'bhis-doctor-sent450-list'},...sentToday.map((x,i)=>h('div',{key:x.id,className:`bhis-sent-row450 ${i%2?'alt':''}`},
                h('span',null,h('strong',null,x.patientName||'بیمار'),h('small',null,x.status==='waiting_nurse'||x.status==='nursing_in_progress'?'ارسال‌شده به دستیار / پرستار مسئول':x.status==='ready_for_discharge'||x.status==='waiting_payment'?'ارسال‌شده به ترخیص':x.status==='discharged'?'ترخیص‌شده':x.status)),
                !['discharged','completed','cancelled'].includes(x.status)?h('button',{type:'button',onClick:()=>restoreToDoctor(x)},'بازگردانی به صف من'):null
            )))
        )
    );

    let chartBody = h('div',{className:'bhis-chart-empty'},h(Stethoscope,{className:'w-12 h-12'}),h('h2',null,'یک بیمار را از صف ویزیت انتخاب کنید'),h('p',null,'عملیات پزشکی فقط برای بیمار انتخاب‌شده نمایش داده می‌شود.'));
    if(active){
        const actionSection = h('section',{className:'bhis-clinical-section bhis-doctor-decision-section'},
            h('div',{className:'bhis-clinical-section-title'},h(Stethoscope,{className:'w-5 h-5'}),h('div',null,h('h3',null,'تصمیم بعد از معاینه'))),
            h('div',{className:'bhis-doctor-action-grid'},
                h('button',{type:'button','data-testid':'doctor-discharge',className:'bhis-doctor-action discharge',onClick:()=>finish(true)},h(CheckCircle2,{className:'w-6 h-6'}),h('strong',null,'معاینه و ترخیص'),h('span',null,'بدون خدمت جدید؛ مستقیم به ترخیص')),
                h('button',{type:'button','data-testid':'doctor-outpatient',className:'bhis-doctor-action outpatient',onClick:()=>startPick('outpatient')},h(Activity,{className:'w-6 h-6'}),h('strong',null,'خدمت سرپایی مرکز'),h('span',null,'امروز یا نوبت آینده')),
                h('button',{type:'button','data-testid':'doctor-hospital',className:'bhis-doctor-action hospital',onClick:()=>startPick('hospital')},h(Building2,{className:'w-6 h-6'}),h('strong',null,'عمل / خدمت بیمارستان گنجی'),h('span',null,'ثبت خدمت و زمان انجام')),
                h('button',{type:'button','data-testid':'doctor-product',className:'bhis-doctor-action product',onClick:()=>startPick('product')},h(Package,{className:'w-6 h-6'}),h('strong',null,'کالا / دارو'),h('span',null,'از کاتالوگ مشترک مرکز'))
            ),
            h('div',{className:'bhis-doctor-manual-handoff'},h('span',null,'انتقال بدون ثبت مورد جدید:'),h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>handoffWithoutNewItem('nurse')},'ارسال به دستیار / پرستار مسئول'),h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>handoffWithoutNewItem('discharge')},'ارسال به ترخیص'))
        );
        const clinicalSection = h('section',{className:'bhis-clinical-section'},
            h('div',{className:'bhis-clinical-section-title'},h(FileText,{className:'w-5 h-5'}),h('h3',null,'شرح معاینه')),
            h('div',{className:'bhis-form-grid two'},
                h('label',{className:'bhis-field'},h('span',null,'علت مراجعه'),h('input',{value:chiefComplaint,onChange:e=>setChiefComplaint(e.target.value)})),
                h('label',{className:'bhis-field'},h('span',null,'تشخیص'),h('input',{value:diagnosis,onChange:e=>setDiagnosis(e.target.value)})),
                h('label',{className:'bhis-field bhis-field-full'},h('span',null,'یادداشت پزشک'),h('textarea',{rows:3,value:doctorNotes,onChange:e=>setDoctorNotes(e.target.value)})),
                h('label',{className:'bhis-field bhis-field-full'},h('span',null,'نسخه / توصیه'),h('textarea',{rows:2,value:prescription,onChange:e=>setPrescription(e.target.value)}))
            ),
            h('button',{type:'button',className:'bhis-secondary-button',onClick:save},h(Save,{className:'w-4 h-4'}),'ذخیره یادداشت')
        );
        const customSection = h('section',{className:'bhis-clinical-section bhis-free-text-order'},
            h('div',{className:'bhis-clinical-section-title'},h(FileText,{className:'w-5 h-5'}),h('div',null,h('h3',null,'خدمت خاص / دستور آزاد'),h('p',null,'برای خدمات خارج از فهرست مرکز، نام، توضیح و مبلغ تقریبی ثبت کنید.'))),
            h('div',{className:'bhis-form-grid two'},
                h('label',{className:'bhis-field'},h('span',null,'نام خدمت خاص'),h('input',{list:'doctor-custom-services-450',value:freeTextService,onChange:e=>{const v=e.target.value;setFreeTextService(v);const hit=(customServiceLibrary||[]).find(x=>String(x.title||'').trim()===String(v).trim());if(hit)setFreeEstimatedAmount(Number(hit.lastFinalAmount||hit.lastEstimatedAmount||0));},placeholder:'نام خدمت را تایپ کنید...'}),h('datalist',{id:'doctor-custom-services-450'},...(customServiceLibrary||[]).filter(x=>x.active!==false).slice(0,100).map(x=>h('option',{key:x.id||x.key,value:x.title,label:`تقریبی ${money(x.lastFinalAmount||x.lastEstimatedAmount||0)}`})))),
                h('label',{className:'bhis-field'},h('span',null,'مبلغ تقریبی'),h(MoneyInput453,{value:freeEstimatedAmount,onChange:setFreeEstimatedAmount,unit:'تومان'})),
                h('label',{className:'bhis-field bhis-field-full'},h('span',null,'یادداشت برای مرحله بعد'),h('textarea',{rows:2,value:freeTextNote,onChange:e=>setFreeTextNote(e.target.value)}))
            ),
            h('div',{className:'bhis-free-targets'},h('button',{type:'button',className:freeTarget==='nurse'?'active':'',onClick:()=>setFreeTarget('nurse')},'دستیار / پرستار مسئول'),h('button',{type:'button',className:freeTarget==='discharge'?'active':'',onClick:()=>setFreeTarget('discharge')},'ترخیص'),h('button',{type:'button',className:'bhis-primary-button',onClick:sendFreeText},'ثبت و انتقال'))
        );
        const orderRows = [
            ...orders.map((x,i)=>h('div',{key:x.id,className:`bhis-billing-line ${i%2?'alt':''}`},h('span',{className:'bhis-line-icon service'},h(Activity,{className:'w-4 h-4'})),h('div',null,h('strong',null,x.title),h('small',null,x.timing==='future'?`نوبت ${formatPersianAppointmentDate(x.scheduledDate)} ${x.scheduledTime||''}`:'اجرای امروز')),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeOrder(x.id)},h(Trash2,{className:'w-4 h-4'})))),
            ...services.map((x,i)=>h('div',{key:x.id,className:`bhis-billing-line ${(orders.length+i)%2?'alt':''}`},h('span',{className:'bhis-line-icon service'},h(Stethoscope,{className:'w-4 h-4'})),h('div',null,h('strong',null,x.title),h('small',null,x.timing==='future'?`رزرو ${formatPersianAppointmentDate(x.scheduledDate)} ${x.scheduledTime||''}`:'خدمت ثبت‌شده')),h('span',null,money(lineTotal(x))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeService(x.id)},h(Trash2,{className:'w-4 h-4'})))),
            ...productLines.map((x,i)=>h('div',{key:x.id,className:`bhis-billing-line ${(orders.length+services.length+i)%2?'alt':''}`},h('span',{className:'bhis-line-icon product'},h(Package,{className:'w-4 h-4'})),h('div',null,h('strong',null,x.title),h('small',null,'کالا / دارو')),h('span',null,money(lineTotal(x))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeProduct(x.id)},h(Trash2,{className:'w-4 h-4'}))))
        ];
        const ordersSection = h('section',{className:'bhis-clinical-section'},h('div',{className:'bhis-clinical-section-title'},h(Calendar,{className:'w-5 h-5'}),h('div',null,h('h3',null,'خدمات، دستورات و نوبت‌ها'),h('p',null,`${sameDayOutpatient.length.toLocaleString('fa-IR')} خدمت امروز • ${futureCount.toLocaleString('fa-IR')} نوبت آینده`))),orderRows.length?h('div',{className:'bhis-billing-lines'},...orderRows):h('div',{className:'bhis-order-empty'},'موردی ثبت نشده است.'));
        const alerts = activePatientAlerts.length ? h('section',{className:'bhis-patient-alert-banner-440'},h(AlertTriangle,{className:'w-5 h-5'}),h('div',null,h('strong',null,'هشدار فعال بیمار'),...activePatientAlerts.map(a=>h('div',{key:a.id||a.createdAt||a.text},h('span',null,a.text||a.note))))) : null;
        chartBody = h(React.Fragment,null,
            h('header',{className:'bhis-patient-panel'},
                h('div',{className:'bhis-patient-panel-main'},h('span',{className:'bhis-avatar large'},h(UserRound,{className:'w-6 h-6'})),h('div',null,h('h1',null,active.patientName),h('div',{className:'bhis-patient-meta'},h('span',null,`پرونده ${active.patientCode||'—'}`),h('span',null,`دستیار / پرستار مسئول: ${active.careStaffName||active.assistantName||active.nurseName||'—'}`),h('span',null,`نوبت ${Number(active.turnNumber||0).toLocaleString('fa-IR')}`)))),
                h('div',{className:'bhis-patient-panel-actions'},debt>0?h('span',{className:'bhis-alert-chip'},h(AlertTriangle,{className:'w-4 h-4'}),`بدهی ${money(debt)}`):null,h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>setShowGallery(true),title:'تصاویر قبل و بعد درمان با اسلایدر مقایسه'},h(Camera,{className:'w-4 h-4'}),'گالری قبل/بعد'),h('button',{type:'button',className:'bhis-secondary-button',onClick:backToReception},'بازگشت به پذیرش'),h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>onOpenPatientProfile?.(active.patientId)},h(History,{className:'w-4 h-4'}),'سوابق'))
            ),
            h('div',{className:'bhis-chart-scroll'},alerts,actionSection,clinicalSection,customSection,ordersSection, h(TrackingCodeSmsPanel453,{patient,item:active,settings,currentUser,onUpdateQueueItem})),
            h('footer',{className:'bhis-chart-footer'},h('div',null,h('span',null,'مسیر بعدی'),h('strong',null,sameDayOutpatient.length?'دستیار / پرستار مسئول':futureCount?'ترخیص پس از رزرو':'ترخیص')),h('button',{type:'button','data-testid':'doctor-finish',className:'bhis-primary-button prominent',onClick:()=>finish(false)},sameDayOutpatient.length?'ارسال به دستیار / پرستار مسئول':'ارسال به پذیرش / ترخیص',h(ChevronLeft,{className:'w-4 h-4'})))
        );
    }
    const scheduleChoice = pendingSchedule && !calendarOpen ? h('div',{className:'bhis-picker-overlay',dir:'rtl',role:'dialog','aria-modal':'true'},
        h('div',{className:'bhis-schedule-choice-panel'},
            h('header',null,h('div',null,h('span',{className:'bhis-eyebrow'},'زمان انجام خدمت'),h('h2',null,pendingSchedule.title)),h('button',{type:'button',className:'bhis-icon-button',onClick:()=>setPendingSchedule(null)},h(X,{className:'w-5 h-5'}))),
            h('div',{className:'bhis-schedule-choice-grid'},
                h('button',{type:'button','data-testid':'doctor-schedule-today',onClick:()=>commitScheduled(pendingSchedule,{date:today,time:''})},h(Clock3,{className:'w-6 h-6'}),h('strong',null,'امروز'),h('span',null,'ثبت برای همین مراجعه')),
                h('button',{type:'button','data-testid':'doctor-schedule-future',onClick:()=>setCalendarOpen(true)},h(Calendar,{className:'w-6 h-6'}),h('strong',null,'تاریخ دیگر'),h('span',null,'تقویم فارسی و نوبت‌های ثبت‌شده'))
            ),
            h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>setPendingSchedule(null)},'انصراف')
        )
    ) : null;
    return h('div',{className:'bhis-role-workspace bhis-doctor-workspace bhis-doctor-450',dir:'rtl'},
        queuePanel,
        h('main',{className:'bhis-clinical-chart'},chartBody),
        h(UnifiedClinicalCatalogPicker,{open:Boolean(pickerMode),medicalServices,products,allowedTypes,onSelect:addCatalog,onClose:()=>setPickerMode(''),title:pickerTitle}),
        scheduleChoice,
        h(PersianAppointmentCalendar,{open:calendarOpen&&Boolean(scheduleRow),visitQueue,appointments:globalAppointments,service:scheduleRow?.item,patient:patient||active,initialDate:'',initialTime:'09:00',title:scheduleRow?.type==='hospital'?'تعیین نوبت عمل / خدمت بیمارستان گنجی':'تعیین نوبت خدمت سرپایی مرکز',onConfirm:({date,time})=>commitScheduled(scheduleRow,{date,time}),onClose:()=>setCalendarOpen(false)}),
        showGallery && patient ? h(ClinicalBeforeAfterGallery, {
            isOpen: showGallery,
            onClose: () => setShowGallery(false),
            patient,
            records: patient?.beforeAfterImages || [],
            settings,
            currentUser,
            onSaveRecords: (updatedRecords) => {
                if (onUpdatePatient) {
                    onUpdatePatient({ ...patient, beforeAfterImages: updatedRecords });
                }
            }
        }) : null
    );
}
