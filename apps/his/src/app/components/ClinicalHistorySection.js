import React from '../../client-vendor/react.js?b=r24-514-1405';
import { getWorkflowStatusLabel } from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const fa = (v) => String(v ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const money = (v) => Number(v || 0).toLocaleString('fa-IR');
const formatTime = (v) => {
  if (!v) return '---';
  try { return new Date(v).toLocaleString('fa-IR'); } catch { return String(v); }
};
const textOrDash = (v) => String(v || '').trim() || '---';

function SmallList({ title, items = [], render }) {
  if (!items.length) return null;
  return h('div', { className: 'rounded-xl border border-slate-200 bg-slate-50 p-3' },
    h('div', { className: 'font-bold text-slate-800 mb-2' }, title),
    h('div', { className: 'space-y-2' }, ...items.map((x, i) => h('div', { key: x.id || `${title}-${i}`, className: 'rounded-lg bg-white border border-slate-200 p-2.5' }, render(x, i))))
  );
}

export function ClinicalHistorySection({ patient, visitQueue = [] }) {
  const records = (visitQueue || [])
    .filter((q) => q && (q.patientId === patient?.id || (patient?.nationalId && q.nationalId === patient.nationalId) || (patient?.fileNumber && q.patientCode === patient.fileNumber)))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  if (!records.length) return null;

  return h('section', { className: 'space-y-3' },
    h('div', { className: 'flex items-center justify-between border-b border-slate-200 pb-2' },
      h('h3', { className: 'font-titr font-bold text-sm text-slate-900' }, 'گردش‌کار بالینی، دستورات، ارجاعات و اقدامات'),
      h('span', { className: 'text-[11px] text-slate-500' }, `${fa(records.length)} پرونده/مراجعه`)
    ),
    ...records.map((q) => h('article', { key: q.id, className: 'rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden' },
      h('div', { className: 'px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2' },
        h('div', null,
          h('b', { className: 'text-sm' }, `مراجعه ${fa(q.queueNumber || q.id || '')}`),
          h('div', { className: 'text-[10px] text-slate-300 mt-1' }, `پزشک: ${textOrDash(q.doctorName)} • دستیار: ${textOrDash(q.assistantName)}`)
        ),
        h('span', { className: 'rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-100 px-2.5 py-1 text-[10px] font-bold' }, getWorkflowStatusLabel(q.status))
      ),
      h('div', { className: 'p-4 space-y-3 text-[11px]' },
        (q.diagnosis || q.doctorNotes || q.prescription || q.nurseNotes) && h('div', { className: 'grid md:grid-cols-2 gap-2' },
          q.diagnosis && h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('b', null, 'تشخیص پزشک'), h('p', { className: 'mt-1 whitespace-pre-wrap' }, q.diagnosis)),
          q.doctorNotes && h('div', { className: 'rounded-xl bg-indigo-50 border border-indigo-200 p-3' }, h('b', null, 'دستور/یادداشت پزشک'), h('p', { className: 'mt-1 whitespace-pre-wrap' }, q.doctorNotes)),
          q.prescription && h('div', { className: 'rounded-xl bg-emerald-50 border border-emerald-200 p-3' }, h('b', null, 'نسخه/دستور دارویی'), h('p', { className: 'mt-1 whitespace-pre-wrap' }, q.prescription)),
          q.nurseNotes && h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3' }, h('b', null, 'گزارش پرستار/دستیار'), h('p', { className: 'mt-1 whitespace-pre-wrap' }, q.nurseNotes))
        ),
        h(SmallList, { title: 'خدمات ثبت‌شده', items: q.services || [], render: (s) => h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
          h('div', null, h('b', null, s.title || s.serviceName || 'خدمت'), h('div', { className: 'text-[10px] text-slate-500 mt-1' }, `پزشک: ${textOrDash(s.doctorName || q.doctorName)} • دستیار: ${s.requiresAssistant === false ? 'بدون دستیار' : textOrDash(s.assistantName || q.assistantName)}`)),
          h('span', { className: 'font-mono font-bold text-teal-800' }, `${money((s.price || s.tariffPrice || 0) * (s.quantity || 1))} تومان`)
        ) }),
        h(SmallList, { title: 'کالا/دارو/اقلام مصرفی', items: q.products || [], render: (x) => h('div', { className: 'flex items-center justify-between gap-2' },
          h('b', null, x.title || x.productName || x.name || 'کالا'), h('span', null, `تعداد: ${fa(x.quantity || 1)}`)
        ) }),
        h(SmallList, { title: 'دارو/خدمت خارج از مرکز و کد رهگیری', items: q.externalOrders || [], render: (x) => h('div', null,
          h('b', { className: 'text-emerald-800' }, `${x.type === 'drug' ? 'دارو' : x.type === 'service' ? 'خدمت' : 'پاراکلینیک'} خارج از مرکز`),
          h('p', { className: 'mt-1' }, textOrDash(x.description)),
          h('div', { className: 'mt-1 text-[10px] text-slate-500' }, `سامانه/بیمه: ${textOrDash(x.provider)} • کد رهگیری: ${textOrDash(x.trackingCode)}`)
        ) }),
        q.nursingOrder && h('div', { className: 'rounded-xl border border-cyan-200 bg-cyan-50 p-3' },
          h('b', { className: 'text-cyan-900' }, 'ارجاع به پرستار/دستیار برای خدمات سرپایی'),
          h('div', { className: 'mt-1' }, `دستیار: ${textOrDash(q.nursingOrder.assistantName || q.assistantName)}`),
          q.nursingOrder.instructions && h('p', { className: 'mt-1 whitespace-pre-wrap' }, q.nursingOrder.instructions)
        ),
        q.hospitalReferral && h('div', { className: 'rounded-xl border border-purple-200 bg-purple-50 p-3' },
          h('b', { className: 'text-purple-900' }, `ارجاع بیمارستانی: ${textOrDash(q.hospitalReferral.facilityName)}`),
          h('p', { className: 'mt-1' }, `خدمت: ${textOrDash(q.hospitalReferral.serviceTitle)}`),
          q.hospitalReferral.instructions && h('p', { className: 'mt-1 whitespace-pre-wrap' }, q.hospitalReferral.instructions)
        ),
        ((q.preparationChecklist || []).length || (q.forms || []).length) ? h('div', { className: 'grid md:grid-cols-2 gap-2' },
          h(SmallList, { title: 'چک‌لیست آماده‌سازی', items: q.preparationChecklist || [], render: (x) => h('div', null, `${(x.completed || x.done || x.status === 'completed') ? '✓' : '○'} ${x.title || x.label || String(x)}`) }),
          h(SmallList, { title: 'فرم‌های همراه', items: q.forms || [], render: (x) => h('div', null, `${(x.completed || x.done || x.status === 'completed') ? '✓' : '○'} ${x.title || x.name || String(x)}`) })
        ) : null,
        (q.workflowHistory || []).length > 0 && h('details', { className: 'rounded-xl border border-slate-200 p-3' },
          h('summary', { className: 'font-bold cursor-pointer text-slate-700' }, 'تاریخچه انتقال بین واحدها'),
          h('div', { className: 'mt-2 space-y-1.5' }, ...(q.workflowHistory || []).slice().reverse().map((e, i) => h('div', { key: e.id || i, className: 'flex flex-wrap gap-2 text-[10px] border-b border-slate-100 pb-1.5' },
            h('span', { className: 'font-bold' }, `${getWorkflowStatusLabel(e.fromStatus)} ← ${getWorkflowStatusLabel(e.toStatus)}`),
            h('span', { className: 'text-slate-500' }, textOrDash(e.reason || e.note)),
            h('span', { className: 'text-slate-400 mr-auto' }, formatTime(e.at || e.createdAt))
          )))
        )
      )
    ))
  );
}
