import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { generateNextSequentialCode } from '../utils/codeGenerator.js?b=r24-514-1405';

const h = React.createElement;
const inputClass = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 bg-white text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500';

export function QuickServiceCreateModal({
  isOpen,
  onClose,
  medicalServices = [],
  serviceCategories = [],
  onCreate,
  defaultCategory = 'clinic_service',
}) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [tariffPrice, setTariffPrice] = useState(0);
  const [doctorCommissionPercent, setDoctorCommissionPercent] = useState(50);
  const [requiresAssistant, setRequiresAssistant] = useState(true);
  const [assistantCommissionPercent, setAssistantCommissionPercent] = useState(10);
  const [description, setDescription] = useState('');

  const categoryOptions = useMemo(() => {
    const builtIn = [
      { id: 'medical_visit', name: 'ویزیت و مشاوره پزشکی' },
      { id: 'clinic_service', name: 'خدمات کلینیکی و سرپایی' },
      { id: 'hospital_surgery', name: 'خدمات بیمارستانی / جراحی' },
      { id: 'consumable', name: 'خدمت وابسته به اقلام مصرفی' },
    ];
    const map = new Map();
    [...builtIn, ...(serviceCategories || [])].forEach((item) => {
      const id = item?.id || item?.code;
      if (id && !map.has(id)) map.set(id, { id, name: item.name || item.title || id });
    });
    return [...map.values()];
  }, [serviceCategories]);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setCode(generateNextSequentialCode('SRV-', medicalServices, 'code', 101));
    setCategory(defaultCategory || 'clinic_service');
    setTariffPrice(0);
    setDoctorCommissionPercent(50);
    setRequiresAssistant((defaultCategory || 'clinic_service') !== 'medical_visit');
    setAssistantCommissionPercent((defaultCategory || 'clinic_service') === 'medical_visit' ? 0 : 10);
    setDescription('');
  }, [isOpen, defaultCategory, medicalServices]);

  useEffect(() => {
    if (category === 'medical_visit') {
      setRequiresAssistant(false);
      setAssistantCommissionPercent(0);
    }
  }, [category]);

  if (!isOpen) return null;

  const submit = (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert('عنوان خدمت را وارد کنید.');
      return;
    }
    const duplicate = medicalServices.some((s) => String(s.title || '').trim().toLowerCase() === cleanTitle.toLowerCase());
    if (duplicate) {
      alert('خدمتی با همین عنوان قبلاً تعریف شده است. از جستجوی خدمات استفاده کنید.');
      return;
    }
    const price = Math.max(0, Number(tariffPrice || 0));
    const newService = {
      id: 'srv-' + Date.now(),
      code: code.trim() || generateNextSequentialCode('SRV-', medicalServices, 'code', 101),
      nationalCode: '',
      title: cleanTitle,
      originalNationalTitle: cleanTitle,
      category,
      categoryName: categoryOptions.find((x) => x.id === category)?.name || 'خدمات کلینیکی',
      tariffPrice: price,
      relativeValuePrice: 0,
      priceDifference: price,
      kProfessional: 0,
      kTechnical: 0,
      kAnesthesia: 0,
      doctorCommissionPercent: Math.max(0, Math.min(100, Number(doctorCommissionPercent || 0))),
      requiresAssistant: !!requiresAssistant,
      assistantCommissionPercent: requiresAssistant ? Math.max(0, Math.min(100, Number(assistantCommissionPercent || 0))) : 0,
      preparationChecklist: [],
      requiredForms: [],
      description: description.trim(),
      active: true,
      createdFrom: 'doctor_quick_create',
      createdAt: new Date().toISOString(),
    };
    onCreate?.(newService);
    onClose?.();
  };

  return h('div', { className: 'bastiyan-submodal-overlay', dir: 'rtl', role: 'dialog', 'aria-modal': 'true' },
    h('div', { className: 'bastiyan-submodal-panel max-w-2xl' },
      h('div', { className: 'p-4 bg-slate-900 text-white flex items-center justify-between gap-3' },
        h('div', null,
          h('h3', { className: 'font-black text-base' }, 'تعریف سریع خدمت جدید'),
          h('p', { className: 'text-xs text-slate-300 mt-1' }, 'خدمت پس از ذخیره فوراً به فهرست خدمات مرکز اضافه می‌شود و در همین پنل قابل انتخاب خواهد بود.')
        ),
        h('button', { type: 'button', onClick: onClose, className: 'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold' }, 'بستن')
      ),
      h('form', { onSubmit: submit, className: 'p-5 space-y-4 overflow-y-auto min-h-0' },
        h('div', { className: 'grid md:grid-cols-2 gap-3' },
          h('label', { className: 'text-xs font-bold text-slate-700 md:col-span-2' }, 'عنوان خدمت *',
            h('input', { className: `${inputClass} mt-1`, value: title, onChange: (e) => setTitle(e.target.value), autoFocus: true, placeholder: 'مثلاً تزریق داخل ضایعه / پانسمان تخصصی...' })
          ),
          h('label', { className: 'text-xs font-bold text-slate-700' }, 'کد داخلی',
            h('input', { className: `${inputClass} mt-1`, value: code, onChange: (e) => setCode(e.target.value) })
          ),
          h('label', { className: 'text-xs font-bold text-slate-700' }, 'گروه خدمت',
            h('select', { className: `${inputClass} mt-1`, value: category, onChange: (e) => setCategory(e.target.value) },
              ...categoryOptions.map((c) => h('option', { key: c.id, value: c.id }, c.name))
            )
          ),
          h('label', { className: 'text-xs font-bold text-slate-700' }, 'تعرفه خدمت (تومان)',
            h('input', { type: 'number', min: 0, className: `${inputClass} mt-1`, value: tariffPrice, onChange: (e) => setTariffPrice(e.target.value) })
          ),
          h('label', { className: 'text-xs font-bold text-slate-700' }, 'درصد کارانه پزشک',
            h('input', { type: 'number', min: 0, max: 100, className: `${inputClass} mt-1`, value: doctorCommissionPercent, onChange: (e) => setDoctorCommissionPercent(e.target.value) })
          )
        ),
        h('div', { className: 'p-3 rounded-xl border border-emerald-200 bg-emerald-50' },
          h('label', { className: 'flex items-center gap-2 text-sm font-black text-emerald-900 cursor-pointer' },
            h('input', { type: 'checkbox', checked: requiresAssistant, disabled: category === 'medical_visit', onChange: (e) => setRequiresAssistant(e.target.checked), className: 'w-4 h-4' }),
            'این خدمت با حضور دستیار/پرستار انجام می‌شود'
          ),
          category === 'medical_visit' && h('div', { className: 'text-xs text-emerald-700 mt-1' }, 'برای گروه ویزیت، دستیار به‌صورت خودکار غیرفعال است.'),
          requiresAssistant && h('label', { className: 'block text-xs font-bold text-slate-700 mt-3 max-w-xs' }, 'درصد کارانه دستیار',
            h('input', { type: 'number', min: 0, max: 100, className: `${inputClass} mt-1`, value: assistantCommissionPercent, onChange: (e) => setAssistantCommissionPercent(e.target.value) })
          )
        ),
        h('label', { className: 'text-xs font-bold text-slate-700 block' }, 'توضیحات',
          h('textarea', { rows: 3, className: `${inputClass} mt-1`, value: description, onChange: (e) => setDescription(e.target.value), placeholder: 'توضیح کوتاه درباره خدمت؛ قابل تکمیل از بخش تعرفه خدمات' })
        ),
        h('div', { className: 'flex justify-end gap-2 pt-2 border-t border-slate-200' },
          h('button', { type: 'button', onClick: onClose, className: 'px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold' }, 'انصراف'),
          h('button', { type: 'submit', className: 'px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm' }, 'ثبت خدمت و افزودن به فهرست')
        )
      )
    )
  );
}
