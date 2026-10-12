import React, { useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { UnifiedClinicalItemsEditor } from './UnifiedClinicalItemsEditor.js?b=r24-514-1405';
import {
  normalizeServiceClinicalRules,
  calculateServiceCommission,
  calculateProductProfitCommission,
  moveQueueItem,
  getWorkflowStatusLabel,
  getUserDisplayName,
} from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;
const inputClass = 'w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500';

export function NursePanel({
  visitQueue = [],
  users = [],
  staffAccounts = [],
  medicalServices = [],
  products = [],
  currentUser,
  onUpdateQueueItem,
  onOpenPatientProfile,
}) {
  const financialAccountMap = useMemo(() => new Map((staffAccounts || []).map((a) => [a.userId, a])), [staffAccounts]);
  const enrichedUsers = useMemo(() => (users || []).map((u) => ({ ...u, financialAccount: financialAccountMap.get(u.id) || null })), [users, financialAccountMap]);
  const effectiveCurrentUser = useMemo(() => ({ ...(currentUser || {}), financialAccount: financialAccountMap.get(currentUser?.id) || currentUser?.financialAccount || null }), [currentUser, financialAccountMap]);
  const queue = useMemo(() => (visitQueue || []).filter((q) => {
    if (!['waiting_nurse', 'nursing_in_progress', 'operating_room'].includes(q.status)) return false;
    if (!q.assistantId) return true;
    return q.assistantId === currentUser?.id || q.assistantName === getUserDisplayName(effectiveCurrentUser);
  }), [visitQueue, currentUser]);
  const [activeId, setActiveId] = useState('');
  const active = queue.find((q) => q.id === activeId) || null;
  const [notes, setNotes] = useState('');
  const [localServices, setLocalServices] = useState([]);
  const [localProducts, setLocalProducts] = useState([]);
  const [prep, setPrep] = useState([]);
  const [forms, setForms] = useState([]);

  const choose = (q) => {
    setActiveId(q.id);
    setNotes(q.nurseNotes || '');
    setLocalServices([...(q.services || [])]);
    setLocalProducts([...(q.products || [])]);
    setPrep((q.preparationChecklist || q.nursingOrder?.preparationChecklist || []).map((x) => typeof x === 'string' ? { title: x, done: false } : { ...x }));
    setForms((q.forms || q.nursingOrder?.requiredForms || []).map((x) => typeof x === 'string' ? { title: x, status: 'pending' } : { ...x }));
    if (q.status === 'waiting_nurse') onUpdateQueueItem?.(moveQueueItem(q, 'nursing_in_progress', 'پرستار/دستیار بیمار را از صف انتخاب کرد', currentUser));
  };

  const serviceItems = medicalServices.filter((s) => s.active !== false).map((s) => ({
    id: s.id, title: s.title, price: Number(s.tariffPrice ?? s.price ?? 0), code: s.code, category: s.category, originalData: s,
  }));
  const productItems = products.filter((p) => p.active !== false).map((p) => ({
    id: p.id, title: p.name || p.title, price: Number(p.salesPrice ?? p.price ?? p.purchasePrice ?? 0), code: p.code || p.barcode, category: p.category, originalData: p,
  }));

  const addService = (item, qty = 1) => {
    const src = item.originalData || item;
    const doctor = enrichedUsers.find((u) => u.id === active?.doctorId) || { id: active?.doctorId, name: active?.doctorName };
    const assistant = effectiveCurrentUser;
    const rule = normalizeServiceClinicalRules({ ...src, requiresAssistant: true });
    const assistantService = { ...src, requiresAssistant: true };
    const commission = calculateServiceCommission(assistantService, qty, doctor, assistant);
    const newLine = {
      id: `qs-nurse-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      serviceId: src.id || item.id,
      title: item.title,
      category: src.category || item.category,
      quantity: Number(qty || 1),
      unitPrice: Number(item.price || 0),
      price: Number(item.price || 0) * Number(qty || 1),
      status: 'performed_by_nurse',
      requiresAssistant: true,
      doctorId: active?.doctorId || doctor?.id || '',
      doctorName: active?.doctorName || getUserDisplayName(doctor),
      assistantId: effectiveCurrentUser?.id || '',
      assistantName: getUserDisplayName(effectiveCurrentUser),
      preparationChecklist: rule.preparationChecklist,
      requiredForms: rule.requiredForms,
      ...commission,
    };
    setLocalServices((p) => [...p, newLine]);
  };

  const addProduct = (item, qty = 1) => {
    const product = item.originalData || item;
    const productId = product.id || item.id;
    const addQty = Math.max(1, Number(qty || 1));
    const unitPrice = Number(item.price || product.salesPrice || 0);
    setLocalProducts((rows) => {
      const found = rows.find((row) => String(row.productId || row.id) === String(productId));
      if (found) return rows.map((row) => {
        if (String(row.productId || row.id) !== String(productId)) return row;
        const nextQty = Number(row.quantity || 1) + addQty;
        const commission = calculateProductProfitCommission({ ...product, salesPrice: Number(row.unitPrice ?? unitPrice) }, nextQty, effectiveCurrentUser);
        return { ...row, quantity: nextQty, unitPrice: Number(row.unitPrice ?? unitPrice), price: Number(row.unitPrice ?? unitPrice) * nextQty, purchaseUnitPrice: Number(product.purchasePrice ?? product.costPrice ?? row.purchaseUnitPrice ?? 0) || 0, ...commission };
      });
      const commission = calculateProductProfitCommission({ ...product, salesPrice: unitPrice }, addQty, effectiveCurrentUser);
      return [...rows, {
        id: `qp-nurse-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId,
        title: item.title,
        category: item.category || 'consumable',
        quantity: addQty,
        unitPrice,
        price: unitPrice * addQty,
        purchaseUnitPrice: Number(product.purchasePrice ?? product.costPrice ?? 0) || 0,
        status: 'used_by_nurse',
        itemType: 'product',
        assistantId: effectiveCurrentUser?.id || '',
        assistantName: getUserDisplayName(effectiveCurrentUser),
        productCommissionStaffId: effectiveCurrentUser?.id || '',
        productCommissionStaffName: getUserDisplayName(effectiveCurrentUser),
        ...commission,
      }];
    });
  };

  const currentBase = () => visitQueue.find((q) => q.id === activeId) || active;
  const totals = () => {
    const total = [...localServices, ...localProducts].reduce((sum, x) => sum + Number(x.price ?? (Number(x.unitPrice || 0) * Number(x.quantity || 1))), 0);
    return { total, debt: total - Number(active?.paidAmount || 0) };
  };

  const persist = (status = 'nursing_in_progress', action = 'ثبت تغییرات خدمات پرستاری') => {
    const base = currentBase();
    if (!base) return null;
    const { total, debt } = totals();
    const finalizedServices = status === 'ready_for_discharge'
      ? localServices.map((line) => (line.assistantId === currentUser?.id || line.requiresAssistant)
        ? { ...line, status: 'performed_by_nurse', performedAt: line.performedAt || new Date().toISOString(), assistantId: line.assistantId || effectiveCurrentUser?.id || '', assistantName: line.assistantName || getUserDisplayName(effectiveCurrentUser) }
        : line)
      : localServices;
    const updated = moveQueueItem(base, status, action, currentUser, {
      services: finalizedServices,
      products: localProducts,
      nurseNotes: notes,
      assistantId: currentUser?.id || base.assistantId || '',
      assistantName: getUserDisplayName(effectiveCurrentUser) || base.assistantName || '',
      preparationChecklist: prep,
      forms,
      totalCost: total,
      remainingDebt: debt,
    });
    onUpdateQueueItem?.(updated);
    return updated;
  };

  const returnDoctor = () => {
    persist('waiting_doctor', 'بازگشت بیمار از پرستاری به پزشک برای بررسی/اصلاح');
    setActiveId('');
  };
  const sendDischarge = () => {
    persist('ready_for_discharge', 'اتمام خدمات سرپایی و ارسال به پذیرش/صندوق/ترخیص');
    setActiveId('');
  };

  return h('div', { className: 'space-y-5', dir: 'rtl' },
    h('div', { className: 'bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between gap-4' },
      h('div', null, h('h1', { className: 'text-xl font-black' }, 'سامانه پرستار / دستیار'), h('p', { className: 'text-xs text-slate-400 mt-1' }, 'دستور پزشک، آماده‌سازی، فرم‌ها، ثبت خدمات و اقلام مصرفی')),
      h('span', { className: 'text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' }, `${queue.length.toLocaleString('fa-IR')} بیمار`)
    ),
    h('div', { className: 'grid lg:grid-cols-[320px_1fr] gap-5 items-start' },
      h('div', { className: 'bg-white border border-slate-200 rounded-2xl overflow-hidden' },
        h('div', { className: 'p-4 font-bold bg-slate-50 border-b' }, 'صف خدمات سرپایی'),
        queue.length === 0 ? h('div', { className: 'p-8 text-center text-sm text-slate-400' }, 'بیماری برای این واحد ارجاع نشده است.') :
          h('div', { className: 'divide-y' }, ...queue.map((q) => h('button', { key: q.id, onClick: () => choose(q), className: `w-full text-right p-4 hover:bg-emerald-50 ${activeId === q.id ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''}` },
            h('div', { className: 'font-bold' }, q.patientName),
            h('div', { className: 'text-[11px] text-slate-500 mt-1' }, `${q.doctorName || 'پزشک'} • ${getWorkflowStatusLabel(q.status)}`),
            h('div', { className: 'text-[11px] text-slate-400 mt-1 truncate' }, q.nursingOrder?.instructions || 'بدون توضیح ویژه')
          )))
      ),
      !active ? h('div', { className: 'bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500' }, 'بیمار را از صف انتخاب کنید.') :
        h('div', { className: 'space-y-4' },
          h('section', { className: 'bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap justify-between gap-3' },
            h('div', null, h('h2', { className: 'text-lg font-black' }, active.patientName), h('p', { className: 'text-xs text-slate-500 mt-1' }, `پزشک ارجاع‌دهنده: ${active.doctorName || '—'} • دستیار: ${getUserDisplayName(effectiveCurrentUser) || '—'}`)),
            h('div', { className: 'flex gap-2' },
              h('button', { onClick: () => onOpenPatientProfile?.(active.patientId), className: 'px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold' }, 'سوابق کامل بیمار'),
              h('button', { onClick: returnDoctor, className: 'px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold' }, 'بازگشت به پزشک')
            )
          ),
          active.nursingOrder && h('section', { className: 'bg-emerald-50 border border-emerald-200 rounded-2xl p-4' },
            h('h3', { className: 'font-bold text-emerald-900' }, 'دستور پزشک'),
            h('p', { className: 'text-sm text-emerald-950 mt-2 whitespace-pre-wrap' }, active.nursingOrder.instructions || '—')
          ),
          h('section', { className: 'grid md:grid-cols-2 gap-4' },
            h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-4' },
              h('h3', { className: 'font-bold mb-3' }, 'چک‌لیست آماده‌سازی بیمار'),
              prep.length === 0 ? h('p', { className: 'text-xs text-slate-400' }, 'چک‌لیست خاصی برای این خدمت تعریف نشده است.') :
                h('div', { className: 'space-y-2' }, ...prep.map((x, i) => h('label', { key: `${x.title}-${i}`, className: 'flex items-center gap-2 p-2 rounded-xl bg-slate-50 border text-sm' },
                  h('input', { type: 'checkbox', checked: !!x.done, onChange: (e) => setPrep((p) => p.map((v, ix) => ix === i ? { ...v, done: e.target.checked, completedAt: e.target.checked ? new Date().toISOString() : null } : v)) }),
                  h('span', null, x.title)
                )))
            ),
            h('div', { className: 'bg-white border border-slate-200 rounded-2xl p-4' },
              h('h3', { className: 'font-bold mb-3' }, 'فرم‌های همراه ارجاع'),
              forms.length === 0 ? h('p', { className: 'text-xs text-slate-400' }, 'فرم خاصی برای این خدمت تعریف نشده است.') :
                h('div', { className: 'space-y-2' }, ...forms.map((x, i) => h('label', { key: `${x.title}-${i}`, className: 'flex items-center gap-2 p-2 rounded-xl bg-slate-50 border text-sm' },
                  h('input', { type: 'checkbox', checked: x.status === 'completed', onChange: (e) => setForms((p) => p.map((v, ix) => ix === i ? { ...v, status: e.target.checked ? 'completed' : 'pending', completedAt: e.target.checked ? new Date().toISOString() : null } : v)) }),
                  h('span', null, x.title)
                )))
            )
          ),
          h(UnifiedClinicalItemsEditor, {
            title: 'ثبت یکپارچه خدمات و اقلام انجام‌شده توسط پرستار/دستیار',
            medicalServices, products, serviceLines: localServices, productLines: localProducts,
            onAddService: addService, onAddProduct: addProduct,
            onRemoveService: (line) => setLocalServices((p) => p.filter((x) => x.id !== line.id)),
            onRemoveProduct: (line) => setLocalProducts((p) => p.filter((x) => x.id !== line.id)),
            onUpdateServiceQuantity: (line, quantity) => setLocalServices((p) => p.map((x) => x.id === line.id ? { ...x, quantity } : x)),
            onUpdateProductQuantity: (line, quantity) => setLocalProducts((p) => p.map((x) => x.id === line.id ? { ...x, quantity } : x)),
          }),
          h('section', { className: 'bg-white border border-slate-200 rounded-2xl p-4' },
            h('label', { className: 'text-xs font-bold' }, 'گزارش پرستار / دستیار', h('textarea', { className: `${inputClass} mt-1`, rows: 4, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: 'اقدامات انجام‌شده، وضعیت بیمار، عوارض، علائم حیاتی یا توضیحات...' }))
          ),
          h('section', { className: 'bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3' },
            h('div', null, h('div', { className: 'text-xs text-slate-400' }, 'جمع خدمات و اقلام پرونده'), h('div', { className: 'font-black text-xl text-amber-300 mt-1' }, money(totals().total))),
            h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { onClick: () => persist(), className: 'px-4 py-2 bg-slate-700 rounded-xl text-xs font-bold' }, 'ذخیره موقت'),
              h('button', { onClick: sendDischarge, className: 'px-5 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black' }, 'اتمام و ارسال به پذیرش/صندوق/ترخیص')
            )
          )
        )
    )
  );
}
