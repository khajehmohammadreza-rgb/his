import React from '../../client-vendor/react.js?b=r24-514-1405';
import { getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';
import { getUserDisplayName, calculateServiceCommission, calculateProductProfitCommission, getServiceCommissionCategory } from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;

export function ClinicalCommissionSummary({ users = [], staffAccounts = [], visitQueue = [], medicalServices = [], products = [] }) {
  const currentMonthKey = getJalaliDateString(new Date()).slice(0, 7);
  const accounts = new Map((staffAccounts || []).map((a) => [String(a.userId), a]));
  const userById = new Map((users || []).map((u) => [String(u.id), { ...u, financialAccount: accounts.get(String(u.id)) || u.financialAccount || null }]));
  const rows = new Map();
  const ensure = (id, name, role) => {
    const key = id || `name:${name}`;
    if (!rows.has(key)) rows.set(key, { id, name: name || 'پرسنل', role, count: 0, amount: 0, outpatient: 0, hospital: 0, productProfit: 0 });
    return rows.get(key);
  };
  const inCurrentMonth = (raw) => {
    const date = raw ? new Date(raw) : null;
    const month = date && !Number.isNaN(date.getTime()) ? getJalaliDateString(date).slice(0, 7) : '';
    return !month || month === currentMonthKey;
  };

  (visitQueue || []).forEach((q) => {
    if (q.status === 'cancelled') return;
    (q.services || []).forEach((line) => {
      const performed = ['performed_by_doctor', 'performed_by_nurse', 'completed', 'hospital_referral_pending_reception'].includes(line.status) || ['ready_for_discharge', 'waiting_reception_referral', 'completed', 'discharged'].includes(q.status);
      if (!performed || !inCurrentMonth(line.performedAt || q.finalSettlementAt || q.registeredAt)) return;
      const source = medicalServices.find((s) => String(s.id) === String(line.serviceId)) || line;
      const service = { ...source, ...line, id: source.id || line.serviceId, tariffPrice: Number(line.unitPrice ?? source.tariffPrice ?? source.price ?? 0), commissionCategory: line.commissionCategory || source.commissionCategory, commissionFacilityName: line.commissionFacilityName || q.hospitalReferral?.facilityName };
      const qty = Math.max(1, Number(line.quantity || 1));
      const category = getServiceCommissionCategory(service);
      if (line.doctorId || line.doctorName) {
        const known = userById.get(String(line.doctorId || q.doctorId || '')) || { id: line.doctorId || q.doctorId, name: line.doctorName || q.doctorName };
        const calc = calculateServiceCommission(service, qty, known, null);
        const amount = Number(calc.doctorCommissionAmount || 0);
        if (amount > 0) {
          const r = ensure(known.id, getUserDisplayName(known) || line.doctorName || q.doctorName, 'doctor');
          r.amount += amount; r.count += 1; r[category === 'hospital' ? 'hospital' : 'outpatient'] += amount;
        }
      }
      if (line.assistantId || line.assistantName) {
        const known = userById.get(String(line.assistantId || q.assistantId || '')) || { id: line.assistantId || q.assistantId, name: line.assistantName || q.assistantName };
        const calc = calculateServiceCommission({ ...service, requiresAssistant: true }, qty, null, known);
        const amount = Number(calc.assistantCommissionAmount || 0);
        if (amount > 0) {
          const r = ensure(known.id, getUserDisplayName(known) || line.assistantName || q.assistantName, 'nurse');
          r.amount += amount; r.count += 1; r[category === 'hospital' ? 'hospital' : 'outpatient'] += amount;
        }
      }
    });
    (q.products || []).forEach((line) => {
      if (!inCurrentMonth(line.performedAt || q.finalSettlementAt || q.registeredAt)) return;
      const staffId = line.productCommissionStaffId || line.assistantId || q.doctorId || '';
      const staffName = line.productCommissionStaffName || line.assistantName || q.doctorName || '';
      if (!staffId && !staffName) return;
      const known = userById.get(String(staffId)) || { id: staffId, name: staffName };
      const product = products.find((p) => String(p.id) === String(line.productId)) || line;
      const calc = calculateProductProfitCommission({ ...product, ...line, salesPrice: Number(line.unitPrice ?? product.salesPrice ?? 0), purchasePrice: Number(line.purchaseUnitPrice ?? product.purchasePrice ?? product.costPrice ?? 0) }, Math.max(1, Number(line.quantity || 1)), known);
      const amount = Number(calc.productCommissionAmount || 0);
      if (amount > 0) {
        const r = ensure(staffId, getUserDisplayName(known) || staffName, line.assistantId ? 'nurse' : 'doctor');
        r.amount += amount; r.count += 1; r.productProfit += amount;
      }
    });
  });

  const result = [...rows.values()].sort((a, b) => b.amount - a.amount);
  const total = result.reduce((s, r) => s + r.amount, 0);
  return h('div', { className: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white', dir: 'rtl' },
    h('div', { className: 'flex flex-wrap items-center justify-between gap-3 mb-4' },
      h('div', null, h('h3', { className: 'font-black' }, 'کارانه و سهم درآمد پرسنل'), h('p', { className: 'text-[11px] text-slate-400 mt-1' }, `ماه جاری ${currentMonthKey} • خدمات سرپایی، اعمال بیمارستانی و سهم سود کالا`)),
      h('div', { className: 'text-left' }, h('div', { className: 'text-[10px] text-slate-400' }, 'جمع سهم ثبت‌شده'), h('div', { className: 'text-lg font-black text-amber-300' }, money(total)))
    ),
    result.length === 0 ? h('div', { className: 'p-4 text-center text-xs text-slate-400 bg-slate-950/30 rounded-xl' }, 'هنوز ردیف قابل محاسبه‌ای برای ماه جاری ثبت نشده است.') :
      h('div', { className: 'grid md:grid-cols-2 xl:grid-cols-3 gap-2' }, ...result.map((r) => h('div', { key: r.id || r.name, className: 'bg-slate-900/80 border border-slate-700 rounded-xl p-3' },
        h('div', { className: 'flex justify-between gap-2' },
          h('div', { className: 'min-w-0' }, h('b', { className: 'text-sm block truncate' }, r.name), h('div', { className: 'text-[10px] text-slate-400 mt-1' }, `${r.role === 'doctor' ? 'پزشک' : 'پرستار/دستیار'} • ${r.count.toLocaleString('fa-IR')} ردیف`)),
          h('span', { className: 'font-black text-emerald-300 text-sm shrink-0' }, money(r.amount))
        ),
        h('div', { className: 'grid grid-cols-3 gap-1 mt-3 text-[9px]' },
          h('div', { className: 'bg-slate-950/50 rounded-lg p-1.5 text-center' }, h('span', { className: 'block text-slate-500' }, 'سرپایی'), h('b', { className: 'text-teal-300' }, money(r.outpatient))),
          h('div', { className: 'bg-slate-950/50 rounded-lg p-1.5 text-center' }, h('span', { className: 'block text-slate-500' }, 'بیمارستانی'), h('b', { className: 'text-purple-300' }, money(r.hospital))),
          h('div', { className: 'bg-slate-950/50 rounded-lg p-1.5 text-center' }, h('span', { className: 'block text-slate-500' }, 'سود کالا'), h('b', { className: 'text-amber-300' }, money(r.productProfit)))
        )
      )))
  );
}
