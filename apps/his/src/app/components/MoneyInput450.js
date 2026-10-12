import React from '../../client-vendor/react.js?b=r24-514-1405';
import { formatMoneyBare450, parseMoney450 } from '../utils/money450.js?b=r24-514-1405';
const h = React.createElement;

export function MoneyInput450({ value = '', onChange, unit = 'تومان', className = '', disabled = false, min = 0, placeholder = '۰', name, id, required = false, autoFocus = false }) {
  const empty = value === '' || value === null || value === undefined;
  const shown = empty ? '' : formatMoneyBare450(value);
  const update = (event) => {
    const raw = event?.target?.value ?? '';
    if (String(raw).trim() === '') { onChange?.(''); return; }
    const parsed = parseMoney450(raw);
    onChange?.(Math.max(Number(min || 0), parsed));
  };
  return h('div', { className: `bhis-money-input450 ${className}`.trim(), dir: 'ltr' },
    h('input', {
      id, name, type: 'text', inputMode: 'numeric', autoComplete: 'off', value: shown,
      disabled, required, autoFocus, placeholder, onChange: update,
      'aria-label': unit ? `مبلغ به ${unit}` : 'مبلغ'
    }),
    unit ? h('span', { className: 'bhis-money-unit450' }, unit) : null
  );
}
