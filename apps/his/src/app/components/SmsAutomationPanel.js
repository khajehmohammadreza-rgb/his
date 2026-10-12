import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Smartphone, UserCheck, Calendar, Clock, Send, CheckCircle2, AlertTriangle, Sparkles, Settings, MessageSquare, Users, Eye, Edit3, Save, RefreshCw } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';

export const DEFAULT_SMS_AUTOMATION = {
  welcomeNewPatient: {
    enabled: true,
    template: 'بیمار گرامی {patientName} عزیز، به {clinicName} خوش آمدید. پرونده درمانی شما با موفقیت ثبت گردید. شماره پرونده: {fileNumber}\nتلفن هماهنگی: {clinicPhone}',
  },
  doctorTrackingCode: {
    enabled: true,
    template: 'بیمار گرامی {patientName}، کد رهگیری درمان شما ({serviceTitle}) توسط {doctorName}: {trackingCode}\n{clinicName}',
  },
  multiSessionReminder: {
    enabled: true,
    remind48HoursBefore: true,
    remind24HoursBefore: true,
    template: 'بیمار محترم {patientName}، نوبت جلسه {sessionNumber} از {totalSessions} درمان «{serviceTitle}» شما در {clinicName} در تاریخ {date} ساعت {time} رزرو شده است. لطفاً ۱۵ دقیقه قبل در کلینیک حضور داشته باشید.',
  },
  secretaryAlerts: {
    enabled: true,
    showUnbookedFollowups: true,
  },
};

export function SmsAutomationPanel({
  settings = {},
  patients = [],
  visitQueue = [],
  appointments = [],
  medicalServices = [],
  onUpdateSettings,
  currentUser,
}) {
  const role=String(currentUser?.role||'');
  const canManageAutomation=['admin','superadmin','accountant'].includes(role);
  const canBulkSend=['admin','superadmin','accountant','cashier','receptionist','secretary'].includes(role);
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'multi_session' | 'segmentation' | 'secretary_alerts'
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_SMS_AUTOMATION,
    ...(settings?.smsAutomation || {}),
  }));

  const [testMobile, setTestMobile] = useState(currentUser?.mobile || '09120000000');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Group segmentation state
  const [selectedGroup, setSelectedGroup] = useState('first_time'); // 'first_time' | 'multi_session' | 'tomorrow_appointments' | 'debtors'
  const [bulkMessageText, setBulkMessageText] = useState('سلام {patientName} گرامی، اطلاعیه مهم از طرف {clinicName}...');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const clinicName = settings?.clinicName || 'مرکز درمانی باستیان';
  const clinicPhone = settings?.phone || '۰۲۱-۸۸۸۸۸۸۸۸';

  const sendRealSms = async (mobile, message) => {
    const target = String(mobile || '').trim();
    if (!target) throw new Error('شماره موبایل بیمار ثبت نشده است.');
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ mobile: target, message: String(message || '') }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || data.message || 'ارسال پیامک ناموفق بود.');
    return data;
  };

  const sendSessionReminder = async (patient) => {
    const mobile = patient?.mobile || patient?.mobilePhone || '';
    const msg = `بیمار گرامی ${patient?.fullName || ''}، جهت هماهنگی جلسه بعدی درمان لطفاً با ${clinicName} تماس بگیرید. ${clinicPhone}`;
    try {
      await sendRealSms(mobile, msg);
      alert('پیامک یادآوری با موفقیت ارسال شد.');
    } catch (e) {
      alert(`ارسال پیامک ناموفق بود: ${e?.message || e}`);
    }
  };

  const resolveBulkRecipients = () => {
    if (selectedGroup === 'multi_session') return multiSessionPatients;
    if (selectedGroup === 'debtors') return patients.filter(p => Number(p?.creditConfig?.currentDebt || p?.currentDebt || 0) > 0);
    if (selectedGroup === 'tomorrow_appointments') {
      const now = new Date(); const tomorrow = new Date(now.getTime() + 86400000);
      const target = tomorrow.toISOString().slice(0,10);
      const ids = new Set((appointments || []).filter(a => String(a?.date || a?.gregorianDate || '').startsWith(target)).map(a => String(a?.patientId || '')));
      return patients.filter(p => ids.has(String(p?.id || '')));
    }
    return patients.filter(p => {
      const created = new Date(p?.createdAt || p?.registeredAt || 0);
      return Number.isFinite(created.getTime()) && (Date.now() - created.getTime()) <= 30 * 86400000;
    });
  };

  const sendBulkSms = async () => {
    if (!canBulkSend) { alert('ارسال گروهی در سطح دسترسی این کاربر مجاز نیست.'); return; }
    if (sendingBulk) return;
    const recipients = resolveBulkRecipients().filter(p => p?.mobile || p?.mobilePhone);
    if (!recipients.length) { alert('برای این گروه شماره موبایل معتبری پیدا نشد.'); return; }
    setSendingBulk(true); setBulkResult(null);
    let ok = 0, failed = 0;
    for (const p of recipients) {
      const msg = String(bulkMessageText || '')
        .replace(/\{patientName\}/g, p?.fullName || '')
        .replace(/\{clinicName\}/g, clinicName)
        .replace(/\{clinicPhone\}/g, clinicPhone);
      try { await sendRealSms(p?.mobile || p?.mobilePhone, msg); ok += 1; }
      catch (_) { failed += 1; }
    }
    setSendingBulk(false);
    setBulkResult({ ok, failed, total: recipients.length });
    alert(`ارسال گروهی پایان یافت. موفق: ${ok} | ناموفق: ${failed}`);
  };

  const handleSaveConfig = () => {
    if (!canManageAutomation) { alert('تغییر قوانین اتوماسیون فقط برای مدیر/سوپرادمین/حسابدار مجاز است.'); return; }
    const updatedSettings = {
      ...settings,
      smsAutomation: config,
    };
    onUpdateSettings?.(updatedSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSendTestSms = async (text) => {
    if (!testMobile.trim()) {
      alert('لطفاً شماره موبایل را جهت تست وارد نمایید.');
      return;
    }
    setSendingTest(true);
    setTestResult(null);

    const sampleFilled = text
      .replace(/\{patientName\}/g, 'علی رضایی')
      .replace(/\{clinicName\}/g, clinicName)
      .replace(/\{fileNumber\}/g, 'CL-1404')
      .replace(/\{clinicPhone\}/g, clinicPhone)
      .replace(/\{doctorName\}/g, 'دکتر باستیان')
      .replace(/\{trackingCode\}/g, '982341')
      .replace(/\{serviceTitle\}/g, 'لیزر و پوست')
      .replace(/\{sessionNumber\}/g, '۳')
      .replace(/\{totalSessions\}/g, '۶')
      .replace(/\{date\}/g, getJalaliDateString())
      .replace(/\{time\}/g, '۱۶:۳۰');

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: testMobile, message: sampleFilled }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setTestResult({ ok: true, text: 'پیامک تستی با موفقیت ارسال شد.' });
      } else {
        setTestResult({ ok: false, text: data.error || data.message || 'خطا در ارسال پیامک' });
      }
    } catch (err) {
      setTestResult({ ok: false, text: err?.message || 'خطای شبکه در ارسال پیامک' });
    } finally {
      setSendingTest(false);
    }
  };

  // Find Multi-Session Patients needing follow-up
  const multiSessionPatients = patients.filter((p) => {
    const hasPlan = Array.isArray(p.treatmentPlans) && p.treatmentPlans.some((plan) => (plan.totalSessions || 1) > 1);
    const hasQueue = visitQueue.some((q) => q.patientId === p.id && Array.isArray(q.services) && q.services.some((s) => (s.defaultSessions || 1) > 1 || s.isMultiSession));
    return hasPlan || hasQueue;
  });

  return _jsxs("div", { className: "space-y-6 text-right font-sans", dir: "rtl", children: [
    // Top Banner
    _jsxs("div", { className: "bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4", children: [
      _jsxs("div", { className: "flex items-center gap-3.5", children: [
        _jsx("div", { className: "p-3 bg-blue-600/30 rounded-2xl border border-blue-400/30 text-blue-300", children: _jsx(Smartphone, { className: "w-8 h-8 animate-pulse" }) }),
        _jsxs("div", { children: [
          _jsxs("div", { className: "flex items-center gap-2", children: [
            _jsx("h1", { className: "text-lg md:text-xl font-black", children: "اتوماسیون هوشمند پیامک و گردش‌کار درمان" }),
            _jsx("span", { className: "px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold", children: "Smart Workflow R12" })
          ] }),
          _jsx("p", { className: "text-xs text-slate-300 mt-1 leading-relaxed", children: "مدیریت پیامک خوش‌آمدگویی بیماران بار اول، ارسال کد رهگیری به صلاحدید پزشک، یادآوری ۴۸ و ۲۴ ساعته درمان‌های چند جلسه‌ای و هشدارهای منشی" })
        ] })
      ] }),
      _jsxs("div", { className: "flex items-center gap-2", children: [
        _jsxs("button", { type: "button", onClick: handleSaveConfig, disabled: !canManageAutomation, className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg transition", children: [
          _jsx(Save, { className: "w-4 h-4" }),
          savedSuccess ? "تنظیمات ذخیره شد ✓" : "ذخیره تغییرات اتوماسیون"
        ] })
      ] })
    ] }),

    // Sub Navigation Tabs
    _jsxs("div", { className: "flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto", children: [
      _jsxs("button", { type: "button", onClick: () => setActiveTab('rules'), className: `px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'rules' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: [
        _jsx(Settings, { className: "w-4 h-4" }),
        "قوانین و الگوهای خودکار"
      ] }),
      _jsxs("button", { type: "button", onClick: () => setActiveTab('multi_session'), className: `px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'multi_session' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: [
        _jsx(Calendar, { className: "w-4 h-4" }),
        "پیگیری درمان‌های چند جلسه‌ای (۴۸ و ۲۴ ساعت)"
      ] }),
      _jsxs("button", { type: "button", onClick: () => setActiveTab('secretary_alerts'), className: `px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'secretary_alerts' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: [
        _jsx(Smartphone, { className: "w-4 h-4" }),
        `هشدارهای فعال منشی (${multiSessionPatients.length})`
      ] }),
      _jsxs("button", { type: "button", onClick: () => setActiveTab('segmentation'), className: `px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'segmentation' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: [
        _jsx(Users, { className: "w-4 h-4" }),
        "گروه‌بندی دلخواه و پیامک اختصاصی"
      ] })
    ] }),

    // Tab 1: Rules & Custom Templates
    activeTab === 'rules' && _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
      // Rule 1: Welcome New Patient
      _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4", children: [
        _jsxs("div", { className: "flex items-center justify-between border-b pb-3", children: [
          _jsxs("div", { className: "flex items-center gap-2", children: [
            _jsx(UserCheck, { className: "w-5 h-5 text-emerald-600" }),
            _jsx("h3", { className: "font-bold text-slate-800 text-sm", children: "۱. پیامک خوش‌آمدگویی بیمار جدید (ثبت‌نام بار اول)" })
          ] }),
          _jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
            _jsx("input", { type: "checkbox", checked: config.welcomeNewPatient.enabled, onChange: (e) => setConfig({ ...config, welcomeNewPatient: { ...config.welcomeNewPatient, enabled: e.target.checked } }), className: "sr-only peer" }),
            _jsx("div", { className: "w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" })
          ] })
        ] }),
        _jsx("p", { className: "text-xs text-slate-500", children: "به محض اینکه بیمار جدید در پذیرش ثبت می‌شود، پیامک با متن دلخواه زیر به شماره همراه وی ارسال می‌گردد:" }),
        _jsx("textarea", { rows: 4, value: config.welcomeNewPatient.template, onChange: (e) => setConfig({ ...config, welcomeNewPatient: { ...config.welcomeNewPatient, template: e.target.value } }), className: "w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans" }),
        _jsxs("div", { className: "flex flex-wrap gap-1.5 text-[11px]", children: [
          _jsx("span", { className: "text-slate-400 font-bold", children: "متغیرهای مجاز:" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{patientName}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{fileNumber}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{clinicName}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{clinicPhone}" })
        ] }),
        _jsxs("div", { className: "pt-2 flex items-center justify-between", children: [
          _jsx("span", { className: "text-xs text-slate-400", children: "ارسال آزمایشی جهت بررسی لحن متن:" }),
          _jsxs("button", { type: "button", onClick: () => handleSendTestSms(config.welcomeNewPatient.template), disabled: sendingTest, className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5", children: [
            _jsx(Send, { className: "w-3.5 h-3.5" }),
            "تست ارسال"
          ] })
        ] })
      ] }),

      // Rule 2: Doctor On-Demand Tracking Code
      _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4", children: [
        _jsxs("div", { className: "flex items-center justify-between border-b pb-3", children: [
          _jsxs("div", { className: "flex items-center gap-2", children: [
            _jsx(MessageSquare, { className: "w-5 h-5 text-indigo-600" }),
            _jsx("h3", { className: "font-bold text-slate-800 text-sm", children: "۲. پیامک کد رهگیری درمان (به صلاحدید پزشک)" })
          ] }),
          _jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
            _jsx("input", { type: "checkbox", checked: config.doctorTrackingCode.enabled, onChange: (e) => setConfig({ ...config, doctorTrackingCode: { ...config.doctorTrackingCode, enabled: e.target.checked } }), className: "sr-only peer" }),
            _jsx("div", { className: "w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" })
          ] })
        ] }),
        _jsx("p", { className: "text-xs text-slate-500", children: "در پنل ویزیت پزشک، دکمه‌ای برای ارسال کد رهگیری آزمایش، سونوگرافی یا نسخه قرار دارد که تنها به صلاحدید پزشک برای بیمار ارسال می‌شود:" }),
        _jsx("textarea", { rows: 4, value: config.doctorTrackingCode.template, onChange: (e) => setConfig({ ...config, doctorTrackingCode: { ...config.doctorTrackingCode, template: e.target.value } }), className: "w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans" }),
        _jsxs("div", { className: "flex flex-wrap gap-1.5 text-[11px]", children: [
          _jsx("span", { className: "text-slate-400 font-bold", children: "متغیرهای مجاز:" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{patientName}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{trackingCode}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{serviceTitle}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{doctorName}" })
        ] }),
        _jsxs("div", { className: "pt-2 flex items-center justify-between", children: [
          _jsx("span", { className: "text-xs text-slate-400", children: "ارسال آزمایشی به شماره تستی:" }),
          _jsxs("button", { type: "button", onClick: () => handleSendTestSms(config.doctorTrackingCode.template), disabled: sendingTest, className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5", children: [
            _jsx(Send, { className: "w-3.5 h-3.5" }),
            "تست ارسال"
          ] })
        ] })
      ] }),

      // Rule 3: Multi-Session Timing Configuration
      _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 lg:col-span-2", children: [
        _jsxs("div", { className: "flex items-center justify-between border-b pb-3", children: [
          _jsxs("div", { className: "flex items-center gap-2", children: [
            _jsx(Calendar, { className: "w-5 h-5 text-blue-600" }),
            _jsx("h3", { className: "font-bold text-slate-800 text-sm", children: "۳. زمان‌بندی یادآوری خودکار درمان‌های چند جلسه‌ای (۴۸ ساعت و ۲۴ ساعت قبل)" })
          ] }),
          _jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
            _jsx("input", { type: "checkbox", checked: config.multiSessionReminder.enabled, onChange: (e) => setConfig({ ...config, multiSessionReminder: { ...config.multiSessionReminder, enabled: e.target.checked } }), className: "sr-only peer" }),
            _jsx("div", { className: "w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" })
          ] })
        ] }),
        _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs", children: [
          _jsxs("label", { className: "flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer font-bold", children: [
            _jsx("input", { type: "checkbox", checked: config.multiSessionReminder.remind48HoursBefore, onChange: (e) => setConfig({ ...config, multiSessionReminder: { ...config.multiSessionReminder, remind48HoursBefore: e.target.checked } }), className: "rounded text-blue-600" }),
            _jsx("span", { children: "ارسال یادآوری پیامکی ۴۸ ساعت قبل از موعد جلسه" })
          ] }),
          _jsxs("label", { className: "flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer font-bold", children: [
            _jsx("input", { type: "checkbox", checked: config.multiSessionReminder.remind24HoursBefore, onChange: (e) => setConfig({ ...config, multiSessionReminder: { ...config.multiSessionReminder, remind24HoursBefore: e.target.checked } }), className: "rounded text-blue-600" }),
            _jsx("span", { children: "ارسال یادآوری نهایی ۲۴ ساعت قبل از موعد جلسه" })
          ] })
        ] }),
        _jsx("textarea", { rows: 3, value: config.multiSessionReminder.template, onChange: (e) => setConfig({ ...config, multiSessionReminder: { ...config.multiSessionReminder, template: e.target.value } }), className: "w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed font-sans" }),
        _jsxs("div", { className: "flex flex-wrap gap-1.5 text-[11px]", children: [
          _jsx("span", { className: "text-slate-400 font-bold", children: "متغیرهای مجاز:" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{patientName}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{sessionNumber}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{totalSessions}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{serviceTitle}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{date}" }),
          _jsx("span", { className: "bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold", children: "{time}" })
        ] })
      ] })
    ] }),

    // Tab 2: Multi-Session Follow-Up Patients
    activeTab === 'multi_session' && _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4", children: [
      _jsxs("div", { className: "flex items-center justify-between", children: [
        _jsxs("div", { children: [
          _jsx("h3", { className: "text-base font-bold text-slate-800", children: "لیست بیماران تحت درمان‌های چند جلسه‌ای" }),
          _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "بیمارانی که خدمات دارای جلسات متعدد (لیزر، فیزیوتراپی، ارتودنسی، تزریق چند مرحله‌ای) دریافت می‌کنند" })
        ] }),
        _jsx("span", { className: "px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold font-mono", children: `${toPersianDigits(multiSessionPatients.length)} پرونده فعال چند جلسه‌ای` })
      ] }),
      _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right", children: [
        _jsx("thead", { className: "bg-slate-50 text-slate-600 font-bold border-b", children: _jsxs("tr", { children: [
          _jsx("th", { className: "p-3", children: "نام بیمار" }),
          _jsx("th", { className: "p-3", children: "شماره پرونده / تماس" }),
          _jsx("th", { className: "p-3", children: "وضعیت جلسات" }),
          _jsx("th", { className: "p-3", children: "یادآوری ۴۸ و ۲۴ ساعت" }),
          _jsx("th", { className: "p-3", children: "عملیات پیگیری" })
        ] }) }),
        _jsx("tbody", { className: "divide-y divide-slate-100", children: multiSessionPatients.length === 0 ? _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-6 text-center text-slate-400 font-bold", children: "در حال حاضر بیماری با خدمت چند جلسه‌ای در این مرکز ثبت نشده است." }) }) : (
          multiSessionPatients.map((p) => _jsxs("tr", { className: "hover:bg-slate-50", children: [
            _jsx("td", { className: "p-3 font-bold text-slate-800", children: p.fullName }),
            _jsxs("td", { className: "p-3 font-mono text-slate-500", children: [p.fileNumber, " • ", p.mobile || p.mobilePhone || '—'] }),
            _jsx("td", { className: "p-3", children: _jsx("span", { className: "px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]", children: "جلسه در حال اجرا" }) }),
            _jsx("td", { className: "p-3", children: _jsx("span", { className: "px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]", children: "خودکار فعال" }) }),
            _jsx("td", { className: "p-3", children: _jsxs("button", { type: "button", onClick: () => sendSessionReminder(p), className: "px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 text-xs flex items-center gap-1", children: [
              _jsx(Send, { className: "w-3 h-3" }),
              "ارسال فوری یادآوری"
            ] }) })
          ] }, p.id))
        ) })
      ] }) })
    ] }),

    // Tab 3: Secretary Alerts
    activeTab === 'secretary_alerts' && _jsxs("div", { className: "space-y-4", children: [
      _jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between", children: [
        _jsxs("div", { className: "flex items-center gap-2 text-amber-900 font-bold text-xs", children: [
          _jsx(AlertTriangle, { className: "w-5 h-5 text-amber-600" }),
          _jsx("span", { children: "هشدارهای نیاز به تماس و رزرو جلسه بعد (نمایش زنده در پنل منشی)" })
        ] }),
        _jsx("span", { className: "text-xs text-amber-800 font-bold", children: "پیگیری به موقع = رضایت حداکثری و تداوم درمان" })
      ] }),
      _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: multiSessionPatients.map((p) => _jsxs("div", { key: p.id, className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3", children: [
        _jsxs("div", { className: "flex items-center justify-between", children: [
          _jsx("strong", { className: "text-slate-800 text-sm", children: p.fullName }),
          _jsx("span", { className: "font-mono text-xs text-slate-500", children: p.mobile || 'بدون تماس' })
        ] }),
        _jsxs("div", { className: "text-xs text-slate-600 leading-relaxed", children: [
          "این بیمار دارای خدمت چند جلسه‌ای فعال است و طبق پروتکل درمانی، نوبت جلسه بعدی باید هماهنگ شود."
        ] }),
        _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t", children: [
          _jsxs("a", { href: `tel:${p.mobile}`, className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1", children: [
            _jsx(Smartphone, { className: "w-3.5 h-3.5 text-emerald-600" }),
            "تماس با بیمار"
          ] }),
          _jsxs("button", { type: "button", onClick: () => sendSessionReminder(p), className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm", children: [
            _jsx(Send, { className: "w-3.5 h-3.5" }),
            "ارسال پیامک هماهنگی"
          ] })
        ] })
      ] }, p.id)) })
    ] }),

    // Tab 4: Custom Segmentation
    activeTab === 'segmentation' && _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5", children: [
      _jsxs("div", { children: [
        _jsx("h3", { className: "text-base font-bold text-slate-800", children: "ارسال پیامک گروهی بر اساس دسته‌بندی دلخواه بیماران" }),
        _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "انتخاب گروه هدف، ویرایش پیامک دلخواه و ارسال گروهی هوشمند" })
      ] }),
      _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold", children: [
        _jsxs("button", { type: "button", onClick: () => setSelectedGroup('first_time'), className: `p-3 rounded-xl border text-center transition ${selectedGroup === 'first_time' ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`, children: [
          _jsx(UserCheck, { className: "w-5 h-5 mx-auto mb-1 text-blue-600" }),
          "بیماران بار اول (جدید)"
        ] }),
        _jsxs("button", { type: "button", onClick: () => setSelectedGroup('multi_session'), className: `p-3 rounded-xl border text-center transition ${selectedGroup === 'multi_session' ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`, children: [
          _jsx(Calendar, { className: "w-5 h-5 mx-auto mb-1 text-indigo-600" }),
          "بیماران چند جلسه‌ای"
        ] }),
        _jsxs("button", { type: "button", onClick: () => setSelectedGroup('tomorrow_appointments'), className: `p-3 rounded-xl border text-center transition ${selectedGroup === 'tomorrow_appointments' ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`, children: [
          _jsx(Clock, { className: "w-5 h-5 mx-auto mb-1 text-amber-600" }),
          "نوبت‌های فردا (یادآوری ۲۴س)"
        ] }),
        _jsxs("button", { type: "button", onClick: () => setSelectedGroup('debtors'), className: `p-3 rounded-xl border text-center transition ${selectedGroup === 'debtors' ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`, children: [
          _jsx(AlertTriangle, { className: "w-5 h-5 mx-auto mb-1 text-rose-600" }),
          "بیماران دارای مانده بدهی"
        ] })
      ] }),
      _jsxs("div", { className: "space-y-2", children: [
        _jsx("label", { className: "block text-xs font-bold text-slate-700", children: "متن پیامک گروهی (با متغیرهای خودکار):" }),
        _jsx("textarea", { rows: 4, value: bulkMessageText, onChange: (e) => setBulkMessageText(e.target.value), className: "w-full p-3 border border-slate-300 rounded-xl text-xs leading-relaxed" })
      ] }),
      _jsxs("div", { className: "flex items-center justify-between pt-2 border-t", children: [
        _jsx("span", { className: "text-xs text-slate-500 font-bold", children: "ارسال همزمان با سامانه پیامکی کاوه‌نگار" }),
        _jsxs("button", { type: "button", onClick: sendBulkSms, disabled: !canBulkSend || sendingBulk, className: "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center gap-2", children: [
          _jsx(Send, { className: "w-4 h-4" }),
          sendingBulk ? "در حال ارسال..." : "شروع ارسال پیامک گروهی"
        ] })
      ] })
    ] })
  ] });
}

export default SmsAutomationPanel;
