import React, { useEffect, useMemo, useRef, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, X, User, Check } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getUsersByRole, getUserDisplayName, getActiveCenterId } from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const normalize = (v) => String(v || '')
  .toLowerCase()
  .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  .replace(/[أإٱ]/g, 'ا').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ').trim();

export function RoleUserSearchPicker({
  users = [], role, value = '', onChange, label,
  placeholder, required = false, allowEmpty = true, emptyLabel = 'بدون انتخاب',
  accent = 'teal', disabled = false,
}) {
  const centerId = getActiveCenterId();
  const eligible = useMemo(() => getUsersByRole(users, role, centerId), [users, role, centerId]);
  const selected = eligible.find((u) => u.id === value) || null;
  const [query, setQuery] = useState(selected ? getUserDisplayName(selected) : '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const now = eligible.find((u) => u.id === value);
    setQuery(now ? getUserDisplayName(now) : '');
  }, [value, eligible]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const q = normalize(query);
  const filtered = !q || (selected && q === normalize(getUserDisplayName(selected)))
    ? eligible
    : eligible.filter((u) => {
        const hay = normalize([
          getUserDisplayName(u), u.username, u.specialty, u.mobile, u.mobilePhone,
          u.medicalCouncilNumber, u.employeeCode,
        ].filter(Boolean).join(' '));
        return hay.includes(q);
      });

  const choose = (u) => {
    onChange?.(u?.id || '');
    setQuery(u ? getUserDisplayName(u) : '');
    setOpen(false);
  };

  const border = required && !selected ? 'border-amber-400' : 'border-slate-300';
  return h('div', { ref, className: 'relative space-y-1.5' },
    label && h('label', { className: 'block text-sm font-bold text-slate-800' }, label, required ? ' *' : ''),
    h('div', { className: 'relative' },
      h(User, { className: `absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-${accent}-600 pointer-events-none` }),
      h('input', {
        type: 'text', value: query, disabled,
        placeholder: placeholder || (role === 'doctor' ? 'نام پزشک را تایپ کنید...' : 'نام پرستار/دستیار را تایپ کنید...'),
        className: `w-full pr-9 pl-9 py-3 bg-white border ${border} rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-${accent}-500 shadow-sm`,
        onFocus: () => setOpen(true),
        onClick: () => setOpen(true),
        onChange: (e) => { setQuery(e.target.value); setOpen(true); if (value) onChange?.(''); },
      }),
      query && !disabled && h('button', { type: 'button', onClick: () => { setQuery(''); onChange?.(''); setOpen(true); }, className: 'absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700' }, h(X, { className: 'w-4 h-4' }))
    ),
    open && !disabled && h('div', { className: 'clinical-inline-dropdown role-user-dropdown' },
      allowEmpty && h('button', { type: 'button', onClick: () => choose(null), className: 'w-full text-right px-3 py-2.5 hover:bg-slate-50 text-sm font-semibold text-slate-600 border-b' }, emptyLabel),
      filtered.length === 0
        ? h('div', { className: 'p-4 text-center text-sm font-semibold text-slate-500' }, `کاربر فعالی با نقش ${role === 'doctor' ? 'پزشک' : 'پرستار'} و این جستجو یافت نشد.`)
        : filtered.map((u) => h('button', { key: u.id, type: 'button', onClick: () => choose(u), className: 'w-full text-right px-3 py-3 hover:bg-teal-50 border-b border-slate-100 last:border-0 flex items-center justify-between gap-3' },
            h('div', null,
              h('div', { className: 'text-sm font-black text-slate-900' }, getUserDisplayName(u)),
              h('div', { className: 'text-xs font-semibold text-slate-500 mt-0.5' }, [u.specialty, u.username, role === 'doctor' ? 'نقش: پزشک' : 'نقش: پرستار/دستیار'].filter(Boolean).join(' • '))
            ),
            value === u.id ? h(Check, { className: 'w-4 h-4 text-emerald-600 shrink-0' }) : null
          ))
    ),
    h('div', { className: `text-xs font-bold ${eligible.length ? 'text-emerald-700' : 'text-rose-600'}` },
      eligible.length
        ? `${eligible.length.toLocaleString('fa-IR')} ${role === 'doctor' ? 'پزشک' : 'پرستار/دستیار'} فعال از کاربران همین مرکز قابل انتخاب است.`
        : `هیچ کاربر فعالی با نقش ${role === 'doctor' ? 'پزشک' : 'پرستار/دستیار'} در دیتابیس همین مرکز یافت نشد.`
    )
  );
}
