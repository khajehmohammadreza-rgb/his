import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { RoleUserSearchPicker } from './RoleUserSearchPicker.js?b=r24-514-1405';
import { getUsersByRole, createWorkflowEvent, getUserDisplayName } from '../utils/clinicalWorkflow.js?b=r24-514-1405';
import { Stethoscope, Activity, FileCheck as ClipboardCheck, X, AlertTriangle, User as UserRound, FileText, ArrowLeft } from '../../client-vendor/lucide-react.js?b=r24-514-1405';

const h = React.createElement;
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;

function enrichUsers(users = [], staffAccounts = []) {
  const accounts = new Map((staffAccounts || []).map((a) => [a.userId, a]));
  return (users || []).map((u) => ({ ...u, financialAccount: accounts.get(u.id) || null }));
}

const ROUTES = [
  { id: 'consultation', title: 'ویزیت پزشک', desc: 'بیمار مستقیماً وارد صف پزشک منتخب می‌شود.', icon: Stethoscope, status: 'waiting_doctor', doctorRequired: true },
  { id: 'direct_care', title: 'خدمت سرپایی مستقیم', desc: 'بدون فروش در پذیرش؛ بیمار وارد صف خدمات پرستار/دستیار می‌شود.', icon: Activity, status: 'waiting_nurse', doctorRequired: false },
  { id: 'discharge_only', title: 'پیگیری / صندوق', desc: 'برای مراجعه‌ای که اقدام بالینی جدید ندارد و باید به صندوق هدایت شود.', icon: ClipboardCheck, status: 'ready_for_discharge', doctorRequired: false },
];

export function ReceptionClinicalStage({
  patient,
  users = [],
  staffAccounts = [],
  visitQueue = [],
  currentUser,
  onAddQueueItem,
  onClose,
  onCreated,
  onOpenPatientProfile,
}) {
  const enrichedUsers = useMemo(() => enrichUsers(users, staffAccounts), [users, staffAccounts]);
  const doctorUsers = useMemo(() => getUsersByRole(enrichedUsers, 'doctor'), [enrichedUsers]);
  const [routeId, setRouteId] = useState('consultation');
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const route = ROUTES.find((x) => x.id === routeId) || ROUTES[0];
  const selectedDoctor = doctorUsers.find((u) => u.id === doctorId) || null;

  useEffect(() => {
    if (!patient) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [patient, onClose]);

  if (!patient) return null;

  const save = async () => {
    if (saving) return;
    if (route.doctorRequired && !selectedDoctor) {
      alert('برای ویزیت پزشک، پزشک معالج را انتخاب کنید.');
      return;
    }
    const duplicate = (visitQueue || []).find((q) => q.patientId === patient.id && !['cancelled', 'completed', 'discharged'].includes(q.status));
    if (duplicate) {
      alert(`برای این بیمار یک مراجعه فعال وجود دارد (نوبت ${Number(duplicate.turnNumber || 0).toLocaleString('fa-IR')}). همان پرونده را ادامه دهید.`);
      return;
    }
    setSaving(true);
    try {
      const maxTurn = Math.max(0, ...(visitQueue || []).map((q) => Number(q.turnNumber || 0)));
      const now = new Date();
      const item = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        turnNumber: maxTurn + 1,
        patientId: patient.id,
        patientName: patient.fullName,
        patientCode: patient.fileNumber,
        nationalId: patient.nationalId,
        mobilePhone: patient.mobilePhone,
        doctorId: selectedDoctor?.id || '',
        doctorName: getUserDisplayName(selectedDoctor),
        assistantId: '', assistantName: '',
        department: selectedDoctor?.specialty || 'مرکز درمانی',
        encounterRoute: routeId,
        status: route.status,
        priority,
        registeredAt: now.toISOString(),
        jalaliTime: now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        chiefComplaint: reason.trim(),
        receptionNotes: reason.trim(),
        doctorNotes: '', diagnosis: '', prescription: '',
        clinicalOrders: [],
        services: [], products: [],
        totalCost: 0, paidAmount: 0, remainingDebt: 0,
        workflowVersion: 2,
        workflowHistory: [createWorkflowEvent(route.status, `پذیرش حرفه‌ای بیمار با مسیر «${route.title}»`, currentUser, { routeId, doctorId: selectedDoctor?.id || '', priority })],
      };
      await Promise.resolve(onAddQueueItem?.(item));
      onCreated?.(item);
    } finally {
      setSaving(false);
    }
  };

  const debt = Number(patient?.creditConfig?.currentDebt || 0);
  return h('div', { className: 'bhis-admission-overlay', dir: 'rtl', role: 'dialog', 'aria-modal': 'true' },
    h('div', { className: 'bhis-admission-panel' },
      h('header', { className: 'bhis-admission-header' },
        h('div', { className: 'bhis-admission-patient' },
          h('span', { className: 'bhis-avatar' }, h(UserRound, { className: 'w-5 h-5' })),
          h('div', null,
            h('h2', null, 'پذیرش مراجعه جدید'),
            h('p', null, h('strong', null, patient.fullName), ' • ', `پرونده ${patient.fileNumber || '—'}`, patient.mobilePhone ? ` • ${patient.mobilePhone}` : '')
          )
        ),
        h('div', { className: 'bhis-admission-actions' },
          h('button', { type: 'button', onClick: () => onOpenPatientProfile?.(patient.id), className: 'bhis-secondary-button' }, 'سوابق بیمار'),
          h('button', { type: 'button', onClick: onClose, className: 'bhis-icon-button' }, h(X, { className: 'w-5 h-5' }))
        )
      ),
      h('div', { className: 'bhis-admission-body' },
        debt > 0 ? h('div', { className: 'bhis-debt-warning' }, h(AlertTriangle, { className: 'w-5 h-5' }), h('div', null, h('strong', null, 'بدهی قبلی بیمار'), h('span', null, money(debt)))) : null,
        h('section', { className: 'bhis-form-section' },
          h('div', { className: 'bhis-section-heading' }, h('span', null, '۱'), h('div', null, h('h3', null, 'مسیر این مراجعه'), h('p', null, 'در پذیرش هیچ خدمت یا کالایی فروخته نمی‌شود؛ فقط مسیر بیمار مشخص می‌شود.'))),
          h('div', { className: 'bhis-route-grid' },
            ...ROUTES.map((item) => {
              const Icon = item.icon;
              return h('button', { key: item.id, type: 'button', onClick: () => setRouteId(item.id), className: `bhis-route-card ${routeId === item.id ? 'active' : ''}` },
                h('span', { className: 'bhis-route-icon' }, h(Icon, { className: 'w-5 h-5' })),
                h('strong', null, item.title),
                h('small', null, item.desc)
              );
            })
          )
        ),
        h('section', { className: 'bhis-form-section' },
          h('div', { className: 'bhis-section-heading' }, h('span', null, '۲'), h('div', null, h('h3', null, 'اطلاعات مراجعه'), h('p', null, 'پزشک و علت مراجعه؛ اطلاعات بالینی بعداً در صفحه پزشک ثبت می‌شود.'))),
          h('div', { className: 'bhis-admission-grid' },
            h(RoleUserSearchPicker, { users: enrichedUsers, role: 'doctor', value: doctorId, onChange: setDoctorId, label: route.doctorRequired ? 'پزشک معالج *' : 'پزشک مرتبط (اختیاری)', required: route.doctorRequired, allowEmpty: true, emptyLabel: 'انتخاب نشده' }),
            h('label', { className: 'bhis-field' }, h('span', null, 'اولویت مراجعه'),
              h('select', { value: priority, onChange: (e) => setPriority(e.target.value) },
                h('option', { value: 'normal' }, 'عادی'),
                h('option', { value: 'priority' }, 'اولویت‌دار'),
                h('option', { value: 'urgent' }, 'فوری')
              )
            )
          ),
          h('label', { className: 'bhis-field bhis-field-full' }, h('span', null, 'علت مراجعه / توضیح پذیرش'),
            h('div', { className: 'bhis-textarea-wrap' }, h(FileText, { className: 'w-4 h-4' }), h('textarea', { value: reason, onChange: (e) => setReason(e.target.value), rows: 3, placeholder: 'مثلاً: درد شکم، پیگیری بعد از عمل، مراجعه جهت پانسمان...' }))
          )
        )
      ),
      h('footer', { className: 'bhis-admission-footer' },
        h('div', null, h('span', null, 'مرحله بعد'), h('strong', null, route.title === 'ویزیت پزشک' ? 'صف پزشک' : route.title === 'خدمت سرپایی مستقیم' ? 'صف خدمات پرستار' : 'صندوق / ترخیص')),
        h('div', { className: 'bhis-admission-footer-actions' },
          h('button', { type: 'button', onClick: onClose, className: 'bhis-secondary-button' }, 'انصراف'),
          h('button', { type: 'button', onClick: save, disabled: saving, className: 'bhis-primary-button' }, saving ? 'در حال ثبت...' : h(React.Fragment, null, 'ثبت پذیرش', h(ArrowLeft, { className: 'w-4 h-4' })))
        )
      )
    )
  );
}
