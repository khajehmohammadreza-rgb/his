import React, { useEffect, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { moveQueueItem } from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;

export function ReceptionReferralReview({ item, currentUser, onUpdateQueueItem, onClose }) {
  const [forms, setForms] = useState([]);
  const [prep, setPrep] = useState([]);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    setForms((item?.forms || []).map((x) => typeof x === 'string' ? { title: x, status: 'pending' } : { ...x }));
    setPrep((item?.preparationChecklist || []).map((x) => typeof x === 'string' ? { title: x, done: false } : { ...x }));
    setNotes(item?.receptionReferralNotes || '');
  }, [item?.id]);
  if (!item) return null;
  const referral = item.hospitalReferral || {};
  const save = (finish = false) => {
    const patch = { forms, preparationChecklist: prep, receptionReferralNotes: notes, hospitalReferral: { ...referral, status: finish ? 'reception_completed' : 'reception_in_progress', receptionReviewedAt: new Date().toISOString() } };
    const next = finish ? 'ready_for_discharge' : 'reception_review';
    onUpdateQueueItem?.(moveQueueItem(item, next, finish ? 'تکمیل پذیرش/فرم‌های ارجاع بیمارستانی و ارسال به صندوق/ترخیص' : 'ثبت بررسی پذیرش برای ارجاع بیمارستانی', currentUser, patch));
    onClose?.();
  };
  const returnDoctor = () => {
    onUpdateQueueItem?.(moveQueueItem(item, 'waiting_doctor', 'بازگشت ارجاع بیمارستانی به پزشک برای اصلاح', currentUser, { forms, preparationChecklist: prep, receptionReferralNotes: notes }));
    onClose?.();
  };
  return h('div', { className: 'fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3', dir: 'rtl' },
    h('div', { className: 'w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200' },
      h('header', { className: 'bg-purple-900 text-white p-4 flex items-center justify-between gap-3' },
        h('div', null, h('h2', { className: 'font-black text-lg' }, 'پذیرش ارجاع بیمارستانی / تشکیل پرونده'), h('p', { className: 'text-xs text-purple-200 mt-1' }, `${item.patientName} • ${referral.facilityName || 'مرکز ارجاع'}`)),
        h('button', { onClick: onClose, className: 'px-3 py-2 rounded-xl bg-white/10 text-xs font-bold' }, 'بستن')
      ),
      h('div', { className: 'p-5 space-y-4' },
        h('section', { className: 'grid md:grid-cols-3 gap-3' },
          h('div', { className: 'p-3 rounded-xl bg-purple-50 border border-purple-200' }, h('div', { className: 'text-[10px] text-purple-700' }, 'مرکز مقصد'), h('b', { className: 'block mt-1' }, referral.facilityName || '—')),
          h('div', { className: 'p-3 rounded-xl bg-sky-50 border border-sky-200' }, h('div', { className: 'text-[10px] text-sky-700' }, 'خدمت ارجاعی'), h('b', { className: 'block mt-1' }, referral.serviceTitle || '—')),
          h('div', { className: 'p-3 rounded-xl bg-amber-50 border border-amber-200' }, h('div', { className: 'text-[10px] text-amber-700' }, 'جمع پرونده'), h('b', { className: 'block mt-1' }, money(item.totalCost)))
        ),
        referral.instructions && h('section', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-200' }, h('b', null, 'دستور پزشک برای ارجاع'), h('p', { className: 'mt-1 text-sm whitespace-pre-wrap' }, referral.instructions)),
        h('section', { className: 'grid md:grid-cols-2 gap-4' },
          h('div', { className: 'rounded-2xl border border-slate-200 p-4' }, h('h3', { className: 'font-bold mb-3' }, 'مدارک / آماده‌سازی'), prep.length === 0 ? h('p', { className: 'text-xs text-slate-400' }, 'موردی تعریف نشده است.') : h('div', { className: 'space-y-2' }, ...prep.map((x, i) => h('label', { key: `${x.title}-${i}`, className: 'flex items-center gap-2 p-2 bg-slate-50 rounded-xl border text-sm' }, h('input', { type: 'checkbox', checked: !!x.done, onChange: (e) => setPrep((p) => p.map((v, ix) => ix === i ? { ...v, done: e.target.checked, completedAt: e.target.checked ? new Date().toISOString() : null } : v)) }), h('span', null, x.title))))),
          h('div', { className: 'rounded-2xl border border-slate-200 p-4' }, h('h3', { className: 'font-bold mb-3' }, 'فرم‌های ارجاع / تشکیل پرونده'), forms.length === 0 ? h('p', { className: 'text-xs text-slate-400' }, 'فرمی تعریف نشده است.') : h('div', { className: 'space-y-2' }, ...forms.map((x, i) => h('label', { key: `${x.title}-${i}`, className: 'flex items-center gap-2 p-2 bg-slate-50 rounded-xl border text-sm' }, h('input', { type: 'checkbox', checked: x.status === 'completed', onChange: (e) => setForms((p) => p.map((v, ix) => ix === i ? { ...v, status: e.target.checked ? 'completed' : 'pending', completedAt: e.target.checked ? new Date().toISOString() : null } : v)) }), h('span', null, x.title)))))
        ),
        h('label', { className: 'block text-xs font-bold' }, 'یادداشت پذیرش / توضیح تشکیل پرونده', h('textarea', { rows: 3, value: notes, onChange: (e) => setNotes(e.target.value), className: 'mt-1 w-full border border-slate-300 rounded-xl p-3 text-sm', placeholder: 'مدارک دریافت‌شده، هماهنگی با بیمارستان، توضیحات مالی یا نکته لازم...' })),
        h('footer', { className: 'flex flex-wrap justify-end gap-2 pt-3 border-t' },
          h('button', { onClick: returnDoctor, className: 'px-4 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold' }, 'بازگشت به پزشک برای اصلاح'),
          h('button', { onClick: () => save(false), className: 'px-4 py-2.5 rounded-xl bg-slate-700 text-white text-xs font-bold' }, 'ذخیره موقت در پذیرش'),
          h('button', { onClick: () => save(true), className: 'px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black' }, 'تکمیل پذیرش و ارسال به صندوق/ترخیص')
        )
      )
    )
  );
}
