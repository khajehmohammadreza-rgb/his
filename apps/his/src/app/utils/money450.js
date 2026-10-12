const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeMoneyDigits450(value = '') {
  return String(value ?? '')
    .replace(/[۰-۹]/g, d => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)));
}

export function parseMoney450(value = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = normalizeMoneyDigits450(value)
    .replace(/[\s,٬،_]/g, '')
    .replace(/[^0-9.-]/g, '');
  if (!raw || raw === '-' || raw === '.' || raw === '-.') return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

export function formatMoneyBare450(value = 0) {
  const num = parseMoney450(value);
  const rounded = Math.round(num);
  return rounded.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

export function formatMoney450(value = 0, unit = 'تومان') {
  const bare = formatMoneyBare450(value);
  return unit ? `${bare} ${unit}` : bare;
}
