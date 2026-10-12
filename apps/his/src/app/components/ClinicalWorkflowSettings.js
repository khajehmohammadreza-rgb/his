import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { normalizeServiceClinicalRules } from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const input = 'w-full border border-slate-300 rounded-xl p-2.5 bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500';
const lines = (v) => Array.isArray(v) ? v.join('\n') : String(v || '');
const parseLines = (v) => String(v || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

export function ClinicalWorkflowSettings({ medicalServices = [], settings = {}, onUpdateService, onUpdateSettings }) {
  const [serviceId, setServiceId] = useState(medicalServices[0]?.id || '');
  const selected = useMemo(() => medicalServices.find((s) => s.id === serviceId) || null, [medicalServices, serviceId]);
  const rule = useMemo(() => normalizeServiceClinicalRules(selected || {}), [selected]);
  const [requiresAssistant, setRequiresAssistant] = useState(rule.requiresAssistant);
  const [assistantPercent, setAssistantPercent] = useState(rule.assistantCommissionPercent);
  const [prep, setPrep] = useState(lines(rule.preparationChecklist));
  const [forms, setForms] = useState(lines(rule.requiredForms));
  const [facilityName, setFacilityName] = useState('');
  const [facilityForms, setFacilityForms] = useState('فرم ارجاع پزشک\nفرم پذیرش/تشکیل پرونده');
  const [facilityPrep, setFacilityPrep] = useState('مدارک هویتی و بیمه\nدستور پزشک و شرح خدمت');

  useEffect(() => {
    const n = normalizeServiceClinicalRules(selected || {});
    setRequiresAssistant(n.requiresAssistant);
    setAssistantPercent(n.assistantCommissionPercent);
    setPrep(lines(n.preparationChecklist));
    setForms(lines(n.requiredForms));
  }, [selected?.id, selected?.requiresAssistant, selected?.assistantCommissionPercent, selected?.preparationChecklist, selected?.requiredForms]);

  const saveServiceRule = () => {
    if (!selected) return;
    onUpdateService?.({
      ...selected,
      requiresAssistant: !!requiresAssistant,
      assistantCommissionPercent: requiresAssistant ? Math.max(0, Number(assistantPercent || 0)) : 0,
      preparationChecklist: parseLines(prep),
      requiredForms: parseLines(forms),
      workflowConfiguredAt: new Date().toISOString(),
    });
    alert('قواعد بالینی و دستیار برای این خدمت ذخیره شد.');
  };

  const facilities = Array.isArray(settings.referralFacilities) ? settings.referralFacilities : [];
  const addFacility = () => {
    if (!facilityName.trim()) {
      alert('نام بیمارستان/مرکز مقصد را وارد کنید.');
      return;
    }
    const next = [...facilities, {
      id: `facility-${Date.now()}`,
      name: facilityName.trim(),
      code: `REF-${Date.now().toString().slice(-6)}`,
      active: true,
      requiredForms: parseLines(facilityForms),
      preparationChecklist: parseLines(facilityPrep),
    }];
    onUpdateSettings?.({ ...settings, referralFacilities: next });
    setFacilityName('');
  };
  const removeFacility = (id) => onUpdateSettings?.({ ...settings, referralFacilities: facilities.filter((f) => f.id !== id) });
  const toggleFacility = (id) => onUpdateSettings?.({ ...settings, referralFacilities: facilities.map((f) => f.id === id ? { ...f, active: f.active === false } : f) });

  return h('div', { className: 'bg-slate-900 text-white rounded-2xl border border-teal-500/20 p-5 space-y-5', dir: 'rtl' },
    h('div', null,
      h('h2', { className: 'text-lg font-black' }, 'قواعد گردش‌کار بالینی خدمات و مراکز ارجاع'),
      h('p', { className: 'text-xs text-slate-400 mt-1' }, 'تعیین الزام دستیار، کارانه دستیار، فرم‌ها/چک‌لیست‌های آماده‌سازی و بیمارستان‌های قابل ارجاع. خدمات جدید به‌طور پیش‌فرض با دستیار هستند؛ ویزیت‌ها در مهاجرت اولیه بدون دستیار در نظر گرفته می‌شوند.')
    ),
    h('div', { className: 'grid lg:grid-cols-2 gap-4' },
      h('section', { className: 'bg-white text-slate-900 rounded-2xl p-4 space-y-3' },
        h('h3', { className: 'font-bold' }, 'تنظیم خدمت'),
        h('label', { className: 'text-xs font-bold' }, 'خدمت پزشکی',
          h('select', { className: `${input} mt-1`, value: serviceId, onChange: (e) => setServiceId(e.target.value) },
            ...medicalServices.map((s) => h('option', { key: s.id, value: s.id }, `${s.title} (${s.code || s.id})`))
          )
        ),
        selected && h('div', { className: 'space-y-3' },
          h('label', { className: 'flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 cursor-pointer' },
            h('input', { type: 'checkbox', checked: requiresAssistant, onChange: (e) => setRequiresAssistant(e.target.checked) }),
            h('div', null, h('b', { className: 'text-sm text-emerald-900' }, 'این خدمت با حضور پرستار/دستیار انجام می‌شود'), h('p', { className: 'text-[11px] text-emerald-700 mt-1' }, 'در حالت فعال، پذیرش بدون انتخاب دستیار اجازه ثبت این خدمت را نمی‌دهد.'))
          ),
          h('label', { className: 'text-xs font-bold' }, 'درصد کارانه دستیار', h('input', { type: 'number', min: 0, max: 100, disabled: !requiresAssistant, className: `${input} mt-1 disabled:bg-slate-100`, value: assistantPercent, onChange: (e) => setAssistantPercent(e.target.value) })),
          h('label', { className: 'text-xs font-bold' }, 'چک‌لیست آماده‌سازی بیمار (هر مورد یک خط)', h('textarea', { rows: 4, className: `${input} mt-1`, value: prep, onChange: (e) => setPrep(e.target.value), placeholder: 'کنترل علائم حیاتی\nبررسی حساسیت دارویی\nآماده‌سازی موضع' })),
          h('label', { className: 'text-xs font-bold' }, 'فرم‌های لازم (هر فرم یک خط)', h('textarea', { rows: 4, className: `${input} mt-1`, value: forms, onChange: (e) => setForms(e.target.value), placeholder: 'رضایت‌نامه انجام خدمت\nفرم ثبت علائم حیاتی' })),
          h('button', { onClick: saveServiceRule, className: 'w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold' }, 'ذخیره قواعد این خدمت')
        )
      ),
      h('section', { className: 'bg-white text-slate-900 rounded-2xl p-4 space-y-3' },
        h('h3', { className: 'font-bold' }, 'بیمارستان‌ها و مراکز ارجاع'),
        facilities.length > 0 && h('div', { className: 'space-y-2 max-h-44 overflow-y-auto' }, ...facilities.map((f) => h('div', { key: f.id, className: 'p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3' },
          h('div', null, h('b', { className: 'text-sm' }, f.name), h('div', { className: 'text-[10px] text-slate-500 mt-1' }, `${(f.requiredForms || []).length} فرم • ${(f.preparationChecklist || []).length} آماده‌سازی • ${f.active === false ? 'غیرفعال' : 'فعال'}`)),
          h('div', { className: 'flex gap-1' },
            h('button', { onClick: () => toggleFacility(f.id), className: 'text-[10px] px-2 py-1 rounded-lg bg-slate-100' }, f.active === false ? 'فعال‌سازی' : 'غیرفعال'),
            h('button', { onClick: () => removeFacility(f.id), className: 'text-[10px] px-2 py-1 rounded-lg bg-rose-50 text-rose-700' }, 'حذف')
          )
        ))),
        h('label', { className: 'text-xs font-bold' }, 'نام بیمارستان/مرکز جدید', h('input', { className: `${input} mt-1`, value: facilityName, onChange: (e) => setFacilityName(e.target.value), placeholder: 'مثال: بیمارستان گنجی' })),
        h('label', { className: 'text-xs font-bold' }, 'فرم‌های لازم برای ارجاع (هر خط یک فرم)', h('textarea', { rows: 3, className: `${input} mt-1`, value: facilityForms, onChange: (e) => setFacilityForms(e.target.value) })),
        h('label', { className: 'text-xs font-bold' }, 'آماده‌سازی/مدارک لازم (هر خط یک مورد)', h('textarea', { rows: 3, className: `${input} mt-1`, value: facilityPrep, onChange: (e) => setFacilityPrep(e.target.value) })),
        h('button', { onClick: addFacility, className: 'w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold' }, 'افزودن مرکز ارجاع')
      )
    )
  );
}
