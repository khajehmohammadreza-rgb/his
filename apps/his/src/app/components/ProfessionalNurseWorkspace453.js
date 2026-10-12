import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { UnifiedClinicalCatalogPicker } from './UnifiedClinicalCatalogPicker440.js?b=r24-514-1405';
import { getUserDisplayName, calculateServiceCommission, calculateProductProfitCommission } from '../utils/clinicalWorkflow.js?b=r24-514-1405';
import { transitionEncounter440, returnEncounter440, WorkflowStatus, makeActionKey440 } from '../utils/workflow440.js?b=r24-514-1405';
import { rankLive } from '../utils/liveSearch440.js?b=r24-514-1405';
import { enrichQueuePatients as enrichQueuePatients440 } from '../utils/patientIdentity440.js?b=r24-514-1405';
import { isToday450 } from '../utils/clinicalFinance450.js?b=r24-514-1405';
import { Search, User as UserRound, FileCheck as ClipboardCheck, CheckCircle2, Plus, Package, Stethoscope, AlertTriangle, Trash2, PackageMinus as Minus, Activity, Save, ChevronLeft, History, Clock as Clock3, Package as Boxes, Barcode as ScanLine, ChevronRight as ArrowRight } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
const h = React.createElement;
const nurseStatuses = new Set(['waiting_nurse', 'nursing_in_progress']);
const norm = (v) => String(v || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;
function enrichUsers(users = [], staffAccounts = []) {
    const accounts = new Map((staffAccounts || []).map((a) => [a.userId, a]));
    return (users || []).map((u) => ({ ...u, financialAccount: accounts.get(u.id) || null }));
}
function lineTotal(x) { var _a, _b; return Number((_b = (_a = x === null || x === void 0 ? void 0 : x.unitPrice) !== null && _a !== void 0 ? _a : x === null || x === void 0 ? void 0 : x.price) !== null && _b !== void 0 ? _b : 0) * Math.max(1, Number((x === null || x === void 0 ? void 0 : x.quantity) || 1)); }
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

export function resolveNursePreviousStage440(item = {}) {
    const cameFromDoctor = Boolean(item.doctorCompletedAt) || (item.clinicalOrders || []).some(o => o.sourceStage === 'doctor' || o.requestedByRole === 'doctor');
    return cameFromDoctor ? { status: 'waiting_doctor', stage: 'doctor' } : { status: 'reception_review', stage: 'reception' };
}
function recompute(item, services, products) {
    const totalCost = [...services, ...products].reduce((s, x) => s + lineTotal(x), 0);
    return { ...item, services, products, totalCost, remainingDebt: Math.max(0, totalCost - Number(item.paidAmount || 0)) };
}
export function ProfessionalNurseWorkspace({ visitQueue = [], users = [], staffAccounts = [], medicalServices = [], products = [], patients = [], currentUser, initialPatientId = '', initialEncounterId = '', onUpdateQueueItem, onOpenPatientProfile, onMoveToStage, onUpdatePatient, onOpenConsent }) {
    var _a;
    const enrichedUsers = useMemo(() => enrichUsers(users, staffAccounts), [users, staffAccounts]);
    const currentStaff = enrichedUsers.find((u) => u.id === (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)) || currentUser || {};
    const isAdminLike = ['admin','superadmin','owner'].includes(String(currentUser?.role||'').toLowerCase()) || (currentUser?.roles||[]).some(r=>['admin','superadmin','owner'].includes(String(r).toLowerCase()));
    const queue = useMemo(() => enrichQueuePatients440((visitQueue || []).filter((q) => nurseStatuses.has(q.status)).filter((q) => isAdminLike || (!q.careStaffId && !q.nurseId && !q.assistantId) || String(q.careStaffId||q.assistantId||q.nurseId||'')===String(currentUser?.id||'')), patients).sort((a, b) => new Date(a.registeredAt || 0) - new Date(b.registeredAt || 0)), [visitQueue, patients, currentUser?.id, isAdminLike]);
    const sentToday = useMemo(() => enrichQueuePatients440((visitQueue||[]).filter(q => String(q.careStaffId||q.assistantId||q.nurseId||'')===String(currentUser?.id||'') && !nurseStatuses.has(q.status) && !['cancelled'].includes(q.status) && isToday450(q.nursingCompletedAt||q.lastWorkflowAt||q.registeredAt)), patients).sort((a,b)=>new Date(b.lastWorkflowAt||0)-new Date(a.lastWorkflowAt||0)).slice(0,40), [visitQueue,patients,currentUser?.id]);
    const [activeId, setActiveId] = useState('');
    const [queueQuery, setQueueQuery] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pendingItem, setPendingItem] = useState(null);
    const [pendingKind, setPendingKind] = useState('service');
    const [quantity, setQuantity] = useState(1);
    const [executionNotes, setExecutionNotes] = useState('');
    const [preparationStatus, setPreparationStatus] = useState('');
    const [nursingHistory, setNursingHistory] = useState('');
    const [careNotes, setCareNotes] = useState('');
    const [nursingDocuments, setNursingDocuments] = useState('');
    const [persistentAlert, setPersistentAlert] = useState('');
    const active = queue.find((q) => q.id === activeId) || null;
    const patient = active ? (patients || []).find((p) => p.id === active.patientId) : null;
    const activePatientAlerts = patient ? (patient.persistentAlerts || patient.alerts || []).filter((alert) => alert && alert.active !== false && String(alert.text || alert.note || '').trim()) : [];
    const filteredQueue = useMemo(() => queueQuery.trim() ? rankLive(queue, queueQuery, (x) => `${x.patientName || ''} ${x.patientCode || ''} ${x.nationalId || ''} ${x.turnNumber || ''} ${x.receptionNotes || x.chiefComplaint || ''}`, { limit: 100 }) : queue, [queue, queueQuery]);
    const openPatient = (item) => {
        setActiveId(item.id);
        setExecutionNotes(item.nursingExecutionNotes || '');
        setPreparationStatus(item.nursingPreparationStatus || '');
        setNursingHistory(item.nursingHistory || '');
        setCareNotes(item.careNotes || '');
        setNursingDocuments(item.nursingDocuments || '');
        setPersistentAlert('');
        setPendingItem(null);
        if (item.status === 'waiting_nurse')
            onUpdateQueueItem === null || onUpdateQueueItem === void 0 ? void 0 : onUpdateQueueItem(transitionEncounter440(item, WorkflowStatus.NURSING, currentUser, { action: 'دستیار / پرستار مسئول پرونده را از صف خدمات باز کرد', actionKey: makeActionKey440('open-nurse', item.id, item.status) }));
    };
    useEffect(() => {
        if (initialEncounterId) {
            const found = queue.find((q) => String(q.id) === String(initialEncounterId));
            if (found) { openPatient(found); return; }
        }
        if (initialPatientId) {
            const found = queue.find((q) => String(q.patientId) === String(initialPatientId));
            if (found) { openPatient(found); return; }
        }
    }, [initialEncounterId, initialPatientId, queue]);
    const baseNow = () => (visitQueue || []).find((q) => q.id === activeId) || active;
    const assignedCareStaffFor = (base) => {
        const id = base?.careStaffId || base?.assistantId || base?.nurseId || '';
        return enrichedUsers.find((u) => String(u.id) === String(id)) || (id ? {id,name:base?.careStaffName||base?.assistantName||base?.nurseName||''} : null);
    };

    const serviceById = (id) => (medicalServices || []).find((s) => String(s.id) === String(id));
    const productById = (id) => (products || []).find((p) => String(p.id) === String(id));
    const commit = (next, action = 'بروزرسانی اجرای خدمات') => {
        const base = baseNow();
        if (!base)
            return;
        onUpdateQueueItem?.({ ...next, nursingExecutionNotes: executionNotes, nursingPreparationStatus: preparationStatus, nursingHistory, careNotes, nursingDocuments, lastNursingEditAt: new Date().toISOString(), lastNursingAction: action });
    };
    const executeOrder = (order) => {
        var _a, _b;
        const base = baseNow();
        if (!base)
            return;
        if ((base.services || []).some((x) => x.orderId === order.id))
            return;
        if (order.linkedCustomServiceId) {
            const linked=(base.services||[]).find(x=>String(x.id)===String(order.linkedCustomServiceId));
            if (linked) {
                const clinicalOrders=(base.clinicalOrders||[]).map(o=>o.id===order.id?{...o,status:'executed',executedAt:new Date().toISOString(),executedById:currentStaff?.id||'',executedByName:getUserDisplayName(currentStaff)}:o);
                const services=(base.services||[]).map(x=>x.id===linked.id?{...x,status:'performed_by_nurse',performedAt:new Date().toISOString(),performedByAssistantId:currentStaff?.id||'',performedByAssistantName:getUserDisplayName(currentStaff)}:x);
                commit({...recompute(base,services,base.products||[]),clinicalOrders},`اجرای خدمت خاص ${order.title}`); return;
            }
        }
        const source = serviceById(order.serviceId);
        if (!source) {
            alert(`خدمت «${order.title}» در کاتالوگ فعال مرکز پیدا نشد. اگر این دستور خارج از فهرست است، آن را به‌عنوان خدمت خاص پزشک اجرا/تأیید کنید.`);
            return;
        }
        const qty = 1;
        const unit = Number((_b = (_a = source.tariffPrice) !== null && _a !== void 0 ? _a : source.price) !== null && _b !== void 0 ? _b : 0) || 0;
        const doctor = enrichedUsers.find((u) => u.id === base.doctorId) || { id: base.doctorId, name: base.doctorName };
        const assignedCareStaff = assignedCareStaffFor(base) || currentStaff;
        const commission = calculateServiceCommission(source, qty, doctor, assignedCareStaff);
        const line = {
            id: `svc-${order.id}`,
            orderId: order.id,
            serviceId: source.id,
            title: source.title || source.name,
            category: source.category || order.category || '',
            quantity: qty, unitPrice: unit, price: unit * qty,
            status: 'performed_by_nurse',
            doctorId: base.doctorId || '', doctorName: base.doctorName || '',
            ...careStaffIdentityPatch442(assignedCareStaff),
            performedAt: new Date().toISOString(), performedByAssistantId: (currentStaff === null || currentStaff === void 0 ? void 0 : currentStaff.id) || '',
            ...commission,
        };
        const services = [...(base.services || []), line];
        const clinicalOrders = (base.clinicalOrders || []).map((o) => o.id === order.id ? { ...o, status: 'executed', executedAt: new Date().toISOString(), executedById: (currentStaff === null || currentStaff === void 0 ? void 0 : currentStaff.id) || '', executedByName: getUserDisplayName(currentStaff) } : o);
        commit({ ...recompute(base, services, base.products || []), clinicalOrders }, `اجرای دستور ${order.title}`);
    };
    const undoExecutedOrder = (order) => {
        const base = baseNow();
        if (!base)
            return;
        const services = (base.services || []).filter((x) => x.orderId !== order.id);
        const clinicalOrders = (base.clinicalOrders || []).map((o) => o.id === order.id ? { ...o, status: 'ordered', executedAt: null, executedById: '', executedByName: '' } : o);
        commit({ ...recompute(base, services, base.products || []), clinicalOrders }, `لغو اجرای دستور ${order.title}`);
    };
    const pickCatalog = (row) => {
        var _a, _b, _c, _d, _e;
        if (row.kind === 'product' && row.rapidScan) {
            const base = baseNow();
            if (!base)
                return;
            const source = row.item;
            const qty = Math.max(1, Number(row.quantity || 1));
            const unit = Number((_c = (_b = (_a = source.salesPrice) !== null && _a !== void 0 ? _a : source.price) !== null && _b !== void 0 ? _b : source.purchasePrice) !== null && _c !== void 0 ? _c : 0) || 0;
            const commission = calculateProductProfitCommission(source, qty, currentStaff);
            const line = { id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, productId: source.id, title: source.name || source.title, category: source.category || 'consumable', quantity: qty, unitPrice: unit, price: unit * qty, purchaseUnitPrice: Number((_e = (_d = source.purchasePrice) !== null && _d !== void 0 ? _d : source.costPrice) !== null && _e !== void 0 ? _e : 0) || 0, itemType: 'product', status: 'used', unit: source.unit || 'عدد', barcode: source.barcode || '', performedAt: new Date().toISOString(), addedByNurse: true, ...commission };
            commit(recompute(base, base.services || [], [...(base.products || []), line]), `ثبت سریع کالای مصرفی ${line.title}`);
            return;
        }
        setPickerOpen(false);
        setPendingKind(row.kind);
        setPendingItem(row.item);
        setQuantity(Math.max(1, Number(row.quantity || 1)));
    };
    const confirmAdditional = () => {
        var _a, _b, _c, _d, _e, _f, _g;
        const base = baseNow();
        if (!base || !pendingItem)
            return;
        const qty = Math.max(1, Number(quantity || 1));
        if (pendingKind === 'service') {
            const source = pendingItem;
            const unit = Number((_b = (_a = source.tariffPrice) !== null && _a !== void 0 ? _a : source.price) !== null && _b !== void 0 ? _b : 0) || 0;
            const doctor = enrichedUsers.find((u) => u.id === base.doctorId) || { id: base.doctorId, name: base.doctorName };
            const assignedCareStaff = assignedCareStaffFor(base) || currentStaff;
            const commission = calculateServiceCommission(source, qty, doctor, assignedCareStaff);
            const line = {
                id: `svc-extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, serviceId: source.id,
                title: source.title || source.name, category: source.category || '', quantity: qty, unitPrice: unit, price: unit * qty,
                status: 'performed_by_nurse', addedByNurse: true, doctorId: base.doctorId || '', doctorName: base.doctorName || '',
                ...careStaffIdentityPatch442(assignedCareStaff), performedAt: new Date().toISOString(), ...commission,
            };
            commit(recompute(base, [...(base.services || []), line], base.products || []), `افزودن خدمت اجرایی ${line.title}`);
        }
        else {
            const source = pendingItem;
            const unit = Number((_e = (_d = (_c = source.salesPrice) !== null && _c !== void 0 ? _c : source.price) !== null && _d !== void 0 ? _d : source.purchasePrice) !== null && _e !== void 0 ? _e : 0) || 0;
            const commission = calculateProductProfitCommission(source, qty, currentStaff);
            const line = {
                id: `prd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, productId: source.id,
                title: source.name || source.title, category: source.category || 'consumable', quantity: qty, unitPrice: unit, price: unit * qty,
                purchaseUnitPrice: Number((_g = (_f = source.purchasePrice) !== null && _f !== void 0 ? _f : source.costPrice) !== null && _g !== void 0 ? _g : 0) || 0,
                itemType: 'product', status: 'used', unit: source.unit || 'عدد', barcode: source.barcode || '',
                performedAt: new Date().toISOString(), addedByNurse: true, ...commission,
            };
            commit(recompute(base, base.services || [], [...(base.products || []), line]), `ثبت کالای مصرفی ${line.title}`);
        }
        setPendingItem(null);
        setQuantity(1);
    };
    const removeLine = (kind, line) => {
        const base = baseNow();
        if (!base)
            return;
        if (kind === 'service') {
            const services = (base.services || []).filter((x) => x.id !== line.id);
            let clinicalOrders = base.clinicalOrders || [];
            if (line.orderId)
                clinicalOrders = clinicalOrders.map((o) => o.id === line.orderId ? { ...o, status: 'ordered', executedAt: null } : o);
            commit({ ...recompute(base, services, base.products || []), clinicalOrders }, `حذف خدمت ${line.title}`);
        }
        else {
            commit(recompute(base, base.services || [], (base.products || []).filter((x) => x.id !== line.id)), `حذف کالا ${line.title}`);
        }
    };
    const finish = () => {
        const base = baseNow();
        if (!base)
            return;
        const pendingToday = (base.clinicalOrders || []).filter((o) => o.target === 'center' && o.timing !== 'future' && o.status === 'ordered');
        if (pendingToday.length) {
            if (!confirm(`${pendingToday.length.toLocaleString('fa-IR')} دستور امروز هنوز اجرا نشده است. با این حال بیمار به پذیرش / ترخیص منتقل شود؟`))
                return;
        }
        onUpdateQueueItem === null || onUpdateQueueItem === void 0 ? void 0 : onUpdateQueueItem(transitionEncounter440(base, WorkflowStatus.READY_DISCHARGE, currentUser, { action: 'خدمات اجرایی تکمیل و بیمار به پذیرش / ترخیص منتقل شد', patch: { nursingExecutionNotes: executionNotes, nursingCompletedAt: new Date().toISOString(), nursingPreparationStatus: preparationStatus, nursingHistory, careNotes, nursingDocuments }, actionKey: makeActionKey440('nurse-discharge', base.id, base.status) }));
        setActiveId('');
    };
    const backToPrevious = () => {
        const base = baseNow();
        if (!base) return;
        const previous = resolveNursePreviousStage440(base);
        const reason = window.prompt('دلیل بازگرداندن بیمار به مرحله قبل را وارد کنید:');
        if (!reason || !reason.trim()) return;
        try {
            const updated = returnEncounter440({ ...base, nursingExecutionNotes: executionNotes, nursingPreparationStatus: preparationStatus, nursingHistory, careNotes, nursingDocuments }, previous.status, currentUser, reason.trim());
            onUpdateQueueItem?.(updated);
            setActiveId('');
            onMoveToStage?.(previous.stage, base.patientId);
        } catch (e) { alert(e?.message || 'بازگشت بیمار انجام نشد.'); }
    };
    const savePersistentAlert = () => {
        if (!patient || !persistentAlert.trim() || !onUpdatePatient) return;
        const alerts = [...(patient.alerts || []), { id: `alert-${Date.now()}`, text: persistentAlert.trim(), active: true, createdAt: new Date().toISOString(), createdById: currentUser?.id || '', createdByName: getUserDisplayName(currentUser) }];
        onUpdatePatient({ ...patient, alerts });
        setPersistentAlert('');
    };
    const orders = active ? (active.clinicalOrders || []).filter((o) => o.target === 'center' && o.timing !== 'future' && o.status !== 'cancelled') : [];
    const total = active ? [...(active.services || []), ...(active.products || [])].reduce((s, x) => s + lineTotal(x), 0) : 0;
    const debt = Number(((_a = patient === null || patient === void 0 ? void 0 : patient.creditConfig) === null || _a === void 0 ? void 0 : _a.currentDebt) || 0);
    const restoreToNurse = (item) => { if(!item||['discharged','completed','cancelled'].includes(item.status)) return; const updated=transitionEncounter440(item,WorkflowStatus.WAITING_NURSE,currentUser,{action:'دستیار / پرستار مسئول بیمار ارجاع‌شده امروز را برای تکمیل مجدد به صف خود بازگرداند',reason:'تکمیل یا اصلاح خدمت پرستاری',actionKey:makeActionKey440('nurse-restore-450',item.id,item.status),patch:{restoredToNurseAt:new Date().toISOString()}}); onUpdateQueueItem?.(updated); };
    const queuePanel = h('aside',{className:'bhis-worklist bhis-role-queue450'},
        h('div',{className:'bhis-worklist-header'},
            h('div',null,h('span',{className:'bhis-eyebrow'},'صف دستیار / پرستار مسئول'),h('h2',null,'مراجعین در انتظار خدمت'),h('p',null,'دستورهای پزشک و خدمات سرپایی امروز')),
            h('span',{className:'bhis-worklist-count'},queue.length.toLocaleString('fa-IR'))
        ),
        h('label',{className:'bhis-worklist-search'},h(Search,{className:'w-4 h-4'}),h('input',{value:queueQuery,onChange:e=>setQueueQuery(e.target.value),placeholder:'نام، پرونده یا توضیح پذیرش...'})),
        h('div',{className:'bhis-worklist-scroll'},
            ...(filteredQueue.length===0?[h('div',{key:'empty',className:'bhis-worklist-empty'},'بیماری در صف دستیار / پرستار مسئول نیست.')]:filteredQueue.map((item,i)=>h('button',{key:item.id,type:'button',onClick:()=>openPatient(item),className:`bhis-patient-row ${i%2?'alt':''} ${activeId===item.id?'active':''}`},
                h('span',{className:'bhis-patient-avatar nurse'},h(Activity,{className:'w-4 h-4'})),
                h('span',{className:'bhis-patient-row-main'},h('strong',null,item.patientName||'بیمار'),h('small',null,`${(item.clinicalOrders||[]).filter(o=>o.target==='center'&&o.status==='ordered').length.toLocaleString('fa-IR')} دستور باز • نوبت ${Number(item.turnNumber||0).toLocaleString('fa-IR')}`),h('em',{className:'bhis-reception-note'},item.receptionNotes||item.chiefComplaint||'بدون توضیح کوتاه پذیرش')),
                h('span',{className:`bhis-status-dot ${item.status==='nursing_in_progress'?'busy':''}`})
            )))
        ),
        h('section',{className:'bhis-doctor-sent450 nurse'},
            h('div',{className:'bhis-doctor-sent450-title'},h(History,{className:'w-4 h-4'}),h('strong',null,'ارجاع‌های امروز'),h('span',null,sentToday.length.toLocaleString('fa-IR'))),
            h('div',{className:'bhis-doctor-sent450-list'},...sentToday.map((x,i)=>h('div',{key:x.id,className:`bhis-sent-row450 ${i%2?'alt':''}`},
                h('span',null,h('strong',null,x.patientName||'بیمار'),h('small',null,x.status==='ready_for_discharge'||x.status==='waiting_payment'?'ارسال‌شده به ترخیص':x.status==='discharged'?'ترخیص‌شده':x.status)),
                !['discharged','completed','cancelled'].includes(x.status)?h('button',{type:'button',onClick:()=>restoreToNurse(x)},'بازگردانی به صف من'):null
            )))
        )
    );
    let chartBody = h('div',{className:'bhis-chart-empty'},h(Activity,{className:'w-12 h-12'}),h('h2',null,'یک بیمار را از صف انتخاب کنید'),h('p',null,'اجرای دستور پزشک، خدمت، کالا و رضایت‌نامه برای بیمار انتخاب‌شده نمایش داده می‌شود.'));
    if(active){
        const alerts = activePatientAlerts.length ? h('section',{className:'bhis-patient-alert-banner-440'},h(AlertTriangle,{className:'w-5 h-5'}),h('div',null,h('strong',null,'هشدار فعال بیمار'),...activePatientAlerts.map(a=>h('div',{key:a.id||a.createdAt||a.text},h('span',null,a.text||a.note))))) : null;
        const orderRows = orders.map((order,i)=>{
            const executed=order.status==='executed'||(active.services||[]).some(x=>x.orderId===order.id);
            return h('div',{key:order.id,className:`bhis-execution-row ${i%2?'alt':''} ${executed?'done':''}`},
                h('span',{className:'bhis-execution-check'},executed?h(CheckCircle2,{className:'w-5 h-5'}):h(ClipboardCheck,{className:'w-5 h-5'})),
                h('div',{className:'bhis-order-main'},h('strong',null,order.title),h('div',null,order.instructions?h('span',null,order.instructions):h('span',null,'بدون توضیح تکمیلی'))),
                executed?h('button',{type:'button',className:'bhis-secondary-button compact',onClick:()=>undoExecutedOrder(order)},'برگشت اجرا'):h('button',{type:'button',className:'bhis-primary-button compact',onClick:()=>executeOrder(order)},'ثبت انجام')
            );
        });
        const ordersSection = h('section',{className:'bhis-clinical-section'},
            h('div',{className:'bhis-clinical-section-title'},h(ClipboardCheck,{className:'w-5 h-5'}),h('div',null,h('h3',null,'دستورات پزشک برای امروز'),h('p',null,'خدمات خاص و دستورهای آزاد پزشک نیز همین‌جا دیده می‌شوند.'))),
            orders.length?h('div',{className:'bhis-execution-list'},...orderRows):h('div',{className:'bhis-order-empty'},'دستور اجرایی باز وجود ندارد.')
        );
        const billingRows = [
            ...(active.services||[]).map((line,i)=>h('div',{key:line.id,className:`bhis-billing-line ${i%2?'alt':''}`},h('span',{className:'bhis-line-icon service'},h(Stethoscope,{className:'w-4 h-4'})),h('div',null,h('strong',null,line.title),h('small',null,`خدمت • تعداد ${Number(line.quantity||1).toLocaleString('fa-IR')}`)),h('span',null,money(lineTotal(line))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeLine('service',line)},h(Trash2,{className:'w-4 h-4'})))),
            ...(active.products||[]).map((line,i)=>h('div',{key:line.id,className:`bhis-billing-line ${((active.services||[]).length+i)%2?'alt':''}`},h('span',{className:'bhis-line-icon product'},h(Package,{className:'w-4 h-4'})),h('div',null,h('strong',null,line.title),h('small',null,`کالا • ${Number(line.quantity||1).toLocaleString('fa-IR')} ${line.unit||'عدد'}`)),h('span',null,money(lineTotal(line))),h('button',{type:'button',className:'bhis-danger-icon',onClick:()=>removeLine('product',line)},h(Trash2,{className:'w-4 h-4'}))))
        ];
        const itemsSection = h('section',{className:'bhis-clinical-section'},
            h('div',{className:'bhis-clinical-section-title with-action'},h('div',null,h('h3',null,'خدمات و کالاهای انجام‌شده'),h('p',null,'فقط موارد انجام/مصرف‌شده وارد صورتحساب می‌شوند.')),h('button',{type:'button',className:'bhis-primary-button compact',onClick:()=>setPickerOpen(true)},h(Plus,{className:'w-4 h-4'}),'افزودن خدمت / کالا')),
            billingRows.length?h('div',{className:'bhis-billing-lines'},...billingRows):h('div',{className:'bhis-order-empty'},'هنوز خدمت یا کالایی ثبت نشده است.')
        );
        const pendingSection = pendingItem ? h('section',{className:'bhis-add-item-sheet'},
            h('div',{className:'bhis-add-item-main'},h('strong',null,pendingItem.title||pendingItem.name),h('small',null,pendingKind==='product'?`موجودی ${Number(pendingItem.stockQuantity||0).toLocaleString('fa-IR')}`:'خدمت اجرایی')),
            h('label',{className:'bhis-quantity-field'},h('span',null,'تعداد'),h('div',null,h('button',{type:'button',onClick:()=>setQuantity(q=>Math.max(1,Number(q||1)-1))},h(Minus,{className:'w-4 h-4'})),h('input',{type:'number',min:1,value:quantity,onChange:e=>setQuantity(Math.max(1,Number(e.target.value)||1))}),h('button',{type:'button',onClick:()=>setQuantity(q=>Number(q||1)+1)},h(Plus,{className:'w-4 h-4'})))),
            h('div',{className:'bhis-inline-actions end'},h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>setPendingItem(null)},'انصراف'),h('button',{type:'button',className:'bhis-primary-button',onClick:confirmAdditional},'ثبت در پرونده'))
        ) : null;
        const notesSection = h('section',{className:'bhis-clinical-section bhis-nursing-details'},
            h('div',{className:'bhis-clinical-section-title'},h('h3',null,'آماده‌سازی و مراقبت')),
            h('div',{className:'bhis-form-grid two'},
                h('label',{className:'bhis-field'},h('span',null,'وضعیت آماده‌سازی'),h('select',{value:preparationStatus,onChange:e=>setPreparationStatus(e.target.value)},h('option',{value:''},'انتخاب...'),h('option',{value:'preparing'},'در حال آماده‌سازی'),h('option',{value:'ready'},'آماده انجام خدمت'),h('option',{value:'completed'},'آماده‌سازی تکمیل شد'))),
                h('label',{className:'bhis-field'},h('span',null,'رضایت‌نامه / مدارک'),h('input',{value:nursingDocuments,onChange:e=>setNursingDocuments(e.target.value)})),
                h('label',{className:'bhis-field bhis-field-full'},h('span',null,'شرح حال / اطلاعات تکمیلی'),h('textarea',{rows:2,value:nursingHistory,onChange:e=>setNursingHistory(e.target.value)})),
                h('label',{className:'bhis-field bhis-field-full'},h('span',null,'توضیحات مراقبتی'),h('textarea',{rows:2,value:careNotes,onChange:e=>setCareNotes(e.target.value)})),
                h('label',{className:'bhis-field bhis-field-full'},h('span',null,'یادداشت اجرای دستیار / پرستار مسئول'),h('textarea',{rows:3,value:executionNotes,onChange:e=>setExecutionNotes(e.target.value)}))
            ),
            h('div',{className:'bhis-inline-actions'},h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>{const b=baseNow();if(b)commit(b,'ذخیره یادداشت اجرایی');}},h(Save,{className:'w-4 h-4'}),'ذخیره یادداشت'),h('button',{type:'button',className:'bhis-secondary-button consent450',onClick:()=>onOpenConsent?.(active.patientId,active.id)},h(ClipboardCheck,{className:'w-4 h-4'}),'رضایت‌نامه / اسکن')),
            h('div',{className:'bhis-persistent-alert-box'},h('label',{className:'bhis-field'},h('span',null,'هشدار دائمی بیمار'),h('input',{value:persistentAlert,onChange:e=>setPersistentAlert(e.target.value)})),h('button',{type:'button',className:'bhis-secondary-button',onClick:savePersistentAlert},'ثبت هشدار دائمی'))
        );
        chartBody = h(React.Fragment,null,
            h('header',{className:'bhis-patient-panel'},
                h('div',{className:'bhis-patient-panel-main'},h('span',{className:'bhis-avatar large nurse'},h(UserRound,{className:'w-6 h-6'})),h('div',null,h('h1',null,active.patientName),h('div',{className:'bhis-patient-meta'},h('span',null,`پزشک: ${active.doctorName||'—'}`),h('span',null,`دستیار / پرستار مسئول: ${active.careStaffName||active.assistantName||active.nurseName||'—'}`),h('span',null,`نوبت ${Number(active.turnNumber||0).toLocaleString('fa-IR')}`)))),
                h('div',{className:'bhis-patient-panel-actions'},debt>0?h('span',{className:'bhis-alert-chip'},h(AlertTriangle,{className:'w-4 h-4'}),'بدهی قبلی/جاری'):null,h('button',{type:'button',className:'bhis-secondary-button',onClick:backToPrevious},h(ArrowRight,{className:'w-4 h-4'}),'بازگشت به مرحله قبل'),h('button',{type:'button',className:'bhis-secondary-button',onClick:()=>onOpenPatientProfile?.(active.patientId)},h(History,{className:'w-4 h-4'}),'سوابق'))
            ),
            h('div',{className:'bhis-stage-actionbar-441'},h('div',{className:'bhis-stage-action-copy-441'},h('strong',null,'اقدام بعدی بیمار'),h('span',null,'پس از اجرای خدمت، بیمار را به ترخیص بفرستید یا برای اصلاح به مرحله قبل برگردانید.')),h('div',{className:'bhis-stage-action-buttons-441'},h('button',{type:'button',className:'bhis-secondary-button',onClick:backToPrevious},'مرحله قبل'),h('button',{type:'button',className:'bhis-primary-button prominent',onClick:finish},'ارسال به پذیرش / ترخیص'))),
            h('div',{className:'bhis-chart-scroll'},alerts,ordersSection,itemsSection,pendingSection,notesSection),
            h('footer',{className:'bhis-chart-footer'},h('div',null,h('span',null,'جمع اقلام این مراجعه'),h('strong',null,money(total))),h('button',{type:'button',className:'bhis-primary-button prominent',onClick:finish},h(CheckCircle2,{className:'w-4 h-4'}),((active.services||[]).length+(active.products||[]).length)===0?'ارسال بدون ثبت خدمت به پذیرش / ترخیص':'ثبت نهایی و ارسال به پذیرش / ترخیص'))
        );
    }
    return h('div',{className:'bhis-role-workspace bhis-nurse-workspace bhis-nurse-450',dir:'rtl'},
        queuePanel,
        h('main',{className:'bhis-clinical-chart'},chartBody),
        h(UnifiedClinicalCatalogPicker,{open:pickerOpen,medicalServices,products,onSelect:pickCatalog,onClose:()=>setPickerOpen(false),title:'فهرست یکپارچه خدمات، اعمال و کالا'})
    );
}
