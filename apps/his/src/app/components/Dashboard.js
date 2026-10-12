import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Users, UserCheck, WalletCards, PackageSearch, CalendarDays, Activity, ArrowLeft, Clock3, LogIn, LogOut, AlertTriangle, TrendingUp, ShieldCheck } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';
import {resolveWorkPlan,calculateAttendanceMetrics} from './HrPayrollModule.js?b=r24-514-1405';
import { getActiveFiscalYear } from '../utils/fiscalYear.js?b=r24-514-1405';

const h = React.createElement;
const n = function (v) { return Number(v || 0); };
const money = function (v) { return n(v).toLocaleString('fa-IR') + ' تومان'; };
const roleOf = function (u) { return String((u && u.role) || '').toLowerCase(); };
const userName = function (u) { return (u && (u.name || u.fullName || u.username)) || 'کاربر'; };

function Card(props) {
  const Icon = props.icon;
  return h('button', {
    type: 'button',
    className: 'bhis-r21-kpi tone-' + (props.tone || 'teal'),
    onClick: props.onClick,
    disabled: !props.onClick
  }, [
    h('span', { className: 'bhis-r21-kpi-icon', key: 'icon' }, h(Icon, { className: 'w-5 h-5' })),
    h('span', { className: 'bhis-r21-kpi-body', key: 'body' }, [
      h('small', { key: 'label' }, props.label),
      h('strong', { key: 'value' }, props.value),
      props.sub ? h('em', { key: 'sub' }, props.sub) : null
    ]),
    props.onClick ? h(ArrowLeft, { className: 'w-4 h-4 bhis-r21-kpi-arrow', key: 'arrow' }) : null
  ]);
}

export function Dashboard(props) {
  props = props || {};
  const settings = props.settings || {};
  const products = props.products || [];
  const salesInvoices = props.salesInvoices || [];
  const patients = props.patients || [];
  const visitQueue = props.visitQueue || [];
  const appointments = props.appointments || [];
  const expenses = props.expenses || [];
  const users = props.users || [];
  const attendanceRecords = props.attendanceRecords || [];
  const shifts=props.shifts||[];const workSchedules=props.workSchedules||[];
  const currentUser = props.currentUser || {};
  const onSaveAttendance = props.onSaveAttendance;
  const onNavigateTab = props.onNavigateTab;

  const today = getJalaliDateString();
  const fiscalYear = getActiveFiscalYear(settings);
  const state = useState('');
  const staffId = state[0];
  const setStaffId = state[1];
  const roles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
  const allowedClockRoles = ['admin', 'receptionist', 'secretary', 'front_desk'];
  const canStaffClock = allowedClockRoles.indexOf(roleOf(currentUser)) >= 0 || roles.some(function (r) {
    return allowedClockRoles.indexOf(String(r).toLowerCase()) >= 0;
  });
  const activeUsers = users.filter(function (u) { return u && u.active !== false && u.id; });
  const isoToday = new Date().toISOString().slice(0, 10);
  const todayQueue = visitQueue.filter(function (x) {
    const localDate = String((x && (x.jalaliDate || x.date || x.registeredAt || x.createdAt)) || '');
    const registeredAt = String((x && x.registeredAt) || '');
    return localDate.indexOf(today) >= 0 || registeredAt.slice(0, 10) === isoToday;
  });
  const waiting = todayQueue.filter(function (x) {
    return ['waiting', 'queued', 'reception_done', 'doctor_waiting'].indexOf(String((x && x.status) || '')) >= 0;
  }).length;
  const inVisit = todayQueue.filter(function (x) {
    return ['in_visit', 'doctor', 'nurse'].indexOf(String((x && x.status) || '')) >= 0;
  }).length;
  const completed = todayQueue.filter(function (x) {
    return ['completed', 'discharged', 'done'].indexOf(String((x && x.status) || '')) >= 0;
  }).length;
  const todayAppointments = appointments.filter(function (a) {
    return String((a && (a.jalaliDate || a.date)) || '') === today;
  }).length;
  const lowStock = products.filter(function (p) {
    if (!p || p.active === false) return false;
    const stock = p.stockQuantity != null ? p.stockQuantity : p.stock;
    const min = p.minStock != null ? p.minStock : (p.minimumStock != null ? p.minimumStock : 5);
    return n(stock) <= n(min);
  });
  const todayRevenue = salesInvoices.filter(function (x) {
    return String((x && (x.jalaliDate || x.date || x.createdAt)) || '').indexOf(today) >= 0;
  }).reduce(function (sum, x) {
    const value = x && (x.totalAmount != null ? x.totalAmount : (x.netAmount != null ? x.netAmount : x.total));
    return sum + n(value);
  }, 0);
  const todayExpense = expenses.filter(function (x) {
    return String((x && (x.jalaliDate || x.date || x.createdAt)) || '').indexOf(today) >= 0;
  }).reduce(function (sum, x) { return sum + n(x && x.amount); }, 0);
  const openAttendance = attendanceRecords.filter(function (r) {
    return r && !r.clockOut;
  });
  const selected = activeUsers.find(function (u) { return String(u.id) === String(staffId); });
  const selectedOpen = openAttendance.find(function (r) { return String(r.userId) === String(staffId); });

  function punch(kind) {
    if (!selected) {
      window.alert('پرسنل را انتخاب کنید.');
      return;
    }
    const now = new Date();
    const tm = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (kind === 'in') {
      if (selectedOpen) {
        window.alert('برای این پرسنل ورود باز وجود دارد؛ ابتدا خروج را ثبت کنید.');
        return;
      }
      const rec = {
        id: 'att-' + Date.now(),
        userId: selected.id,
        userName: userName(selected),
        jalaliDate: today,
        clockIn: tm,
        clockOut: '',
        ...calculateAttendanceMetrics('', '', resolveWorkPlan(selected,today,shifts,workSchedules)),
        status: 'open',
        source: 'secretary_dashboard',
        registeredByUserId: currentUser.id || '',
        registeredByUserName: userName(currentUser),
        createdAt: now.toISOString()
      };
      if (typeof onSaveAttendance === 'function') onSaveAttendance([rec].concat(attendanceRecords));
      return;
    }
    if (!selectedOpen) {
      window.alert('برای این پرسنل ورود بازی وجود ندارد.');
      return;
    }
    if(selectedOpen.createdAt && Date.now()-new Date(selectedOpen.createdAt).getTime()>36*3600000){window.alert('این ورود مدت طولانی باز مانده است. مدیر باید آن را از تایمکس اصلاح کند.');return;}
    const plan=resolveWorkPlan(selected,selectedOpen.jalaliDate,shifts,workSchedules);
    const metrics=calculateAttendanceMetrics(selectedOpen.clockIn,tm,plan);
    if (typeof onSaveAttendance === 'function') {
      onSaveAttendance(attendanceRecords.map(function (r) {
        if (r.id !== selectedOpen.id) return r;
        return Object.assign({}, r, {
          clockOut: tm,
          status: 'closed',
          ...metrics,
          scheduleTitle:plan.title,scheduleSource:plan.source,scheduleLabel:plan.sourceLabel,
          workedHours:Number((metrics.actualMinutes/60).toFixed(2)),
          overtimeHours:Number((metrics.systemOvertimeMinutes/60).toFixed(2)),
          overtimeApprovalStatus:metrics.systemOvertimeMinutes>0&&plan.hasPlan?'pending':'none',
          closedByUserId: currentUser.id || '',
          closedByUserName: userName(currentUser),
          updatedAt: now.toISOString()
        });
      }));
    }
  }

  const quick = [
    ['پذیرش بیمار', 'reception_queue', UserCheck],
    ['تعرفه خدمات', 'services_tariffs', Activity],
    ['بیمه و قراردادها', 'insurance_management', ShieldCheck],
    ['انبار و کالا', 'inventory', PackageSearch],
    ['حسابداری', 'accounting_expenses', WalletCards],
    ['گزارش‌ها', 'reports', TrendingUp]
  ];

  const quickButtons = quick.map(function (item) {
    const label = item[0], id = item[1], Icon = item[2];
    return h('button', {
      key: id,
      type: 'button',
      onClick: function () { if (typeof onNavigateTab === 'function') onNavigateTab(id); }
    }, [h(Icon, { className: 'w-4 h-4', key: 'i' }), h('span', { key: 't' }, label), h(ArrowLeft, { className: 'w-4 h-4', key: 'a' })]);
  });

  const kpis = [
    h(Card, { key: 'patients', icon: Users, label: 'بیماران ثبت‌شده', value: patients.length.toLocaleString('fa-IR'), sub: todayQueue.length.toLocaleString('fa-IR') + ' مراجعه امروز', tone: 'teal', onClick: function () { if (typeof onNavigateTab === 'function') onNavigateTab('reception_queue'); } }),
    h(Card, { key: 'queue', icon: Clock3, label: 'صف فعال امروز', value: waiting.toLocaleString('fa-IR'), sub: inVisit.toLocaleString('fa-IR') + ' در ویزیت • ' + completed.toLocaleString('fa-IR') + ' تکمیل', tone: 'amber', onClick: function () { if (typeof onNavigateTab === 'function') onNavigateTab('reception_queue'); } }),
    h(Card, { key: 'appointments', icon: CalendarDays, label: 'نوبت‌های امروز', value: todayAppointments.toLocaleString('fa-IR'), sub: 'برنامه‌ریزی و یادآوری', tone: 'sky', onClick: function () { if (typeof onNavigateTab === 'function') onNavigateTab('appointments_plans'); } }),
    h(Card, { key: 'revenue', icon: WalletCards, label: 'درآمد امروز', value: money(todayRevenue), sub: 'هزینه ثبت‌شده ' + money(todayExpense), tone: 'emerald', onClick: function () { if (typeof onNavigateTab === 'function') onNavigateTab('reports'); } }),
    h(Card, { key: 'stock', icon: PackageSearch, label: 'اقلام کم‌موجود', value: lowStock.length.toLocaleString('fa-IR'), sub: lowStock.slice(0, 2).map(function (x) { return x.name || x.title; }).join('، ') || 'موجودی بحرانی ندارد', tone: lowStock.length ? 'rose' : 'teal', onClick: function () { if (typeof onNavigateTab === 'function') onNavigateTab('inventory'); } })
  ];

  const panels = h('section', { className: 'bhis-r21-grid' }, [
    h('div', { className: 'bhis-r21-panel', key: 'quick' }, [
      h('div', { className: 'bhis-r21-panel-head', key: 'head' }, [
        h('div', { key: 'txt' }, [h('h2', { key: 'h' }, 'عملیات سریع'), h('p', { key: 'p' }, 'مسیرهای پرتکرار بدون جستجو در منو')]),
        h(Activity, { className: 'w-5 h-5', key: 'icon' })
      ]),
      h('div', { className: 'bhis-r21-actions', key: 'actions' }, quickButtons)
    ]),
    h('div', { className: 'bhis-r21-panel', key: 'status' }, [
      h('div', { className: 'bhis-r21-panel-head', key: 'head' }, [
        h('div', { key: 'txt' }, [h('h2', { key: 'h' }, 'وضعیت عملیاتی امروز'), h('p', { key: 'p' }, 'نمای سریع صف و موجودی')]),
        h(TrendingUp, { className: 'w-5 h-5', key: 'icon' })
      ]),
      h('div', { className: 'bhis-r21-flow', key: 'flow' }, [
        h('div', { key: 'waiting' }, [h('span', { key: 's' }, 'در انتظار'), h('strong', { key: 'v' }, waiting.toLocaleString('fa-IR'))]),
        h('div', { key: 'visit' }, [h('span', { key: 's' }, 'در ویزیت'), h('strong', { key: 'v' }, inVisit.toLocaleString('fa-IR'))]),
        h('div', { key: 'done' }, [h('span', { key: 's' }, 'تکمیل'), h('strong', { key: 'v' }, completed.toLocaleString('fa-IR'))]),
        h('div', { key: 'stock' }, [h('span', { key: 's' }, 'کم‌موجود'), h('strong', { key: 'v' }, lowStock.length.toLocaleString('fa-IR'))])
      ]),
      lowStock.length ? h('div', { className: 'bhis-r21-alert', key: 'alert' }, [h(AlertTriangle, { className: 'w-4 h-4', key: 'i' }), h('span', { key: 't' }, lowStock.length.toLocaleString('fa-IR') + ' قلم به حداقل موجودی رسیده است.')]) : null
    ])
  ]);

  let attendancePanel = null;
  if (canStaffClock) {
    const optionNodes = [h('option', { value: '', key: 'none' }, 'انتخاب پرسنل...')].concat(activeUsers.map(function (u) {
      return h('option', { key: u.id, value: u.id }, userName(u) + ' — ' + (u.roleLabel || u.role || 'پرسنل'));
    }));
    attendancePanel = h('section', { className: 'bhis-r21-panel bhis-r21-attendance' }, [
      h('div', { className: 'bhis-r21-panel-head', key: 'head' }, [
        h('div', { key: 'txt' }, [h('h2', { key: 'h' }, 'ثبت ورود و خروج پرسنل توسط منشی'), h('p', { key: 'p' }, 'ثبت به نام کاربر انجام‌دهنده در سوابق تایمکس قابل رهگیری است.')]),
        h(Clock3, { className: 'w-5 h-5', key: 'icon' })
      ]),
      h('div', { className: 'bhis-r21-attendance-row', key: 'row' }, [
        h('select', { key: 'select', value: staffId, onChange: function (e) { setStaffId(e.target.value); } }, optionNodes),
        h('button', { key: 'in', type: 'button', className: 'entry', disabled: !staffId || !!selectedOpen, onClick: function () { punch('in'); } }, [h(LogIn, { className: 'w-4 h-4', key: 'i' }), 'ثبت ورود']),
        h('button', { key: 'out', type: 'button', className: 'exit', disabled: !staffId || !selectedOpen, onClick: function () { punch('out'); } }, [h(LogOut, { className: 'w-4 h-4', key: 'i' }), 'ثبت خروج']),
        h('span', { key: 'count', className: 'bhis-r21-open-count' }, openAttendance.length.toLocaleString('fa-IR') + ' ورود باز امروز')
      ])
    ]);
  }

  return h('div', { className: 'bhis-r21-dashboard', dir: 'rtl' }, [
    h('section', { className: 'bhis-r21-hero', key: 'hero' }, [
      h('div', { key: 'title' }, [
        h('span', { className: 'bhis-r21-eyebrow', key: 'year' }, 'سال مالی ' + fiscalYear.toLocaleString('fa-IR')),
        h('h1', { key: 'name' }, settings.clinicName || 'Bastiyan HIS'),
        h('p', { key: 'desc' }, 'مرکز فرماندهی روزانه؛ پذیرش، مالی، بیمه، انبار و منابع انسانی در یک نمای زنده.')
      ]),
      h('div', { className: 'bhis-r21-hero-date', key: 'date' }, [h(CalendarDays, { className: 'w-5 h-5', key: 'i' }), h('strong', { key: 'v' }, today)])
    ]),
    h('section', { className: 'bhis-r21-kpis', key: 'kpis' }, kpis),
    panels,
    attendancePanel
  ]);
}
