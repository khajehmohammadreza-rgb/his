import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { MoneyInput450 } from './MoneyInput450.js?b=r24-514-1405';
import { PAYMENT_METHOD_LABELS_450 } from '../utils/financeClinical450.js?b=r24-514-1405';
import { JalaliDateField, TimeMinuteField } from './JalaliDateField.js?b=r24-514-1405';
import { SamanKishPosModal } from './SamanKishPosModal.js?b=r24-514-1405';
import { CreditCard, Wifi } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';

const h = React.createElement;
const DEFAULTS = Object.entries(PAYMENT_METHOD_LABELS_450).map(([id, name]) => ({ id, name, enabled: true }));
const code = x => String(x?.id ?? x?.code ?? x?.key ?? x?.value ?? '').trim();
const label = (x, c) => String(x?.name ?? x?.title ?? x?.label ?? PAYMENT_METHOD_LABELS_450[c] ?? c);
const methods = xs => {
  const m = new Map(DEFAULTS.map(x => [x.id, x]));
  for (const x of (Array.isArray(xs) ? xs : [])) {
    const c = code(x);
    if (c) m.set(c, { ...x, id: c, name: label(x, c), enabled: x?.enabled !== false && x?.active !== false });
  }
  return [...m.values()].filter(x => x.enabled !== false);
};
const bank = x => ['card', 'standalone_pos', 'bank_transfer', 'deposit_receipt', 'online_gateway', 'cheque', 'other'].includes(x);

export function PaymentMethodSelector453({
  methods: ms = [],
  value = 'cash',
  onChange,
  details = {},
  onDetailsChange,
  amount = 0,
  paidAmount = 0,
  onPaidAmountChange,
  showApply = false,
  onApply,
  applyLabel = 'ثبت پرداخت',
  settings = {},
  patientName = '',
}) {
  const list = methods(ms);
  const selected = list.some(x => x.id === value) ? value : (list[0]?.id || 'cash');
  const [showPosModal, setShowPosModal] = useState(false);

  const set = (k, v) => onDetailsChange?.({ ...details, [k]: v });

  const handlePosSuccess = (posResult) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayJalali = getJalaliDateString(now);

    onDetailsChange?.({
      ...details,
      transactionNumber: posResult.rrn || '',
      maskedPan: posResult.maskedPan || '',
      traceNumber: posResult.traceNumber || '',
      terminalId: posResult.terminalId || '21638385',
      posProvider: 'saman_kish',
      transactionDate: todayJalali,
      transactionTime: timeStr,
    });

    onChange?.('card');
  };

  const effectiveAmount = Number(paidAmount || amount || 0);

  return h('section', { className: 'bhis-payment-selector450', dir: 'rtl' },
    h('div', { className: 'bhis-payment-selector-title450' },
      h('strong', null, 'روش پرداخت'),
      h('small', null, `قابل دریافت ${Number(amount || 0).toLocaleString('fa-IR')} تومان • مبلغ پرداختی قابل ویرایش است`)
    ),
    h('div', { className: 'bhis-payment-methods450' },
      ...list.map(x => h('button', {
        key: x.id,
        type: 'button',
        className: `bhis-payment-method450 ${selected === x.id ? 'active' : ''}`,
        onClick: () => onChange?.(x.id),
      }, x.name))
    ),
    selected !== 'credit' ? h('div', { className: 'bhis-payment-details450' },
      h('label', { className: 'bhis-field' },
        h('span', null, 'مبلغ پرداختی'),
        h(MoneyInput450, { value: paidAmount, onChange: onPaidAmountChange, unit: 'تومان' })
      ),
      bank(selected) ? h(React.Fragment, null,
        // Saman Kish POS button
        ['card', 'standalone_pos'].includes(selected) ? h('div', { className: 'bhis-pos-action-container mb-3' },
          h('button', {
            type: 'button',
            onClick: () => setShowPosModal(true),
            className: 'w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2',
          },
            h(CreditCard, { className: 'w-4 h-4 text-blue-200' }),
            h('span', null, `ارسال مبلغ ${effectiveAmount.toLocaleString('fa-IR')} تومان به کارتخوان سامان‌کیش`),
            h('span', { className: 'text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono' }, 'SSP1126')
          )
        ) : null,
        h('label', { className: 'bhis-field' },
          h('span', null, selected === 'cheque' ? 'شماره چک / پیگیری' : 'شماره پیگیری / مرجع (RRN)'),
          h('input', {
            value: details?.transactionNumber || '',
            onChange: e => set('transactionNumber', e.target.value),
            placeholder: 'شماره پیگیری تراکنش بانکی',
          })
        ),
        details?.maskedPan ? h('div', { className: 'text-[11px] text-indigo-700 font-mono font-bold bg-indigo-50 p-2 rounded-lg border border-indigo-100' },
          `شماره کارت ماسک‌شده: ${details.maskedPan}`
        ) : null,
        h(JalaliDateField, { label: 'تاریخ تراکنش', value: details?.transactionDate || '', onChange: v => set('transactionDate', v) }),
        h(TimeMinuteField, { label: 'ساعت تراکنش', value: details?.transactionTime || '', onChange: v => set('transactionTime', v) })
      ) : null,
      showApply ? h('div', { className: 'bhis-inline-actions end' },
        h('button', {
          type: 'button',
          className: 'bhis-primary-button prominent',
          onClick: () => onApply?.({ method: selected, amount: Number(paidAmount || 0), details }),
        }, applyLabel)
      ) : null
    ) : h('div', { className: 'bhis-payment-credit-note450' },
      `این مراجعه به‌صورت اعتباری ثبت می‌شود. مانده قابل پرداخت: ${Number(amount || 0).toLocaleString('fa-IR')} تومان`,
      showApply ? h('button', {
        type: 'button',
        className: 'bhis-primary-button compact',
        onClick: () => onApply?.({ method: selected, amount: 0, details }),
      }, applyLabel) : null
    ),
    showPosModal && h(SamanKishPosModal, {
      isOpen: showPosModal,
      onClose: () => setShowPosModal(false),
      amount: effectiveAmount,
      settings: settings,
      patientName: patientName,
      onSuccess: handlePosSuccess,
    })
  );
}

export default PaymentMethodSelector453;
