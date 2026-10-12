export const CASHIER_MISC_SERVICE_ID_440 = 'internal-cashier-misc';
export const CASHIER_DISCOUNT_SERVICE_ID_440 = 'internal-cashier-discount';
const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export function billingLineTotal440(line = {}) {
  const q = Math.max(0, n(line.quantity || 1));
  const unit = n(line.unitPrice ?? line.tariffPrice ?? line.salesPrice ?? (q ? n(line.price) / q : line.price));
  if (line.adjustmentType) return unit * q;
  const explicit = n(line.price ?? line.totalPrice ?? line.totalAmount);
  return explicit !== 0 ? explicit : unit * q;
}

export function isCashierAdjustment440(line = {}) {
  return ['miscellaneous','cashier_discount'].includes(String(line.adjustmentType || '')) || [CASHIER_MISC_SERVICE_ID_440, CASHIER_DISCOUNT_SERVICE_ID_440].includes(String(line.serviceId || ''));
}

export function encounterBaseTotal440(item = {}) {
  return [...(item.services || []), ...(item.products || [])].filter(x => !isCashierAdjustment440(x)).reduce((s, x) => s + billingLineTotal440(x), 0);
}
export function encounterFinalTotal440(item = {}) { return [...(item.services || []), ...(item.products || [])].reduce((s, x) => s + billingLineTotal440(x), 0); }

export function adjustmentTotals440(item = {}) {
  return (item.services || []).reduce((a, line) => {
    const v = billingLineTotal440(line);
    if (line.adjustmentType === 'miscellaneous' || line.serviceId === CASHIER_MISC_SERVICE_ID_440) a.miscellaneous += Math.max(0, v);
    if (line.adjustmentType === 'cashier_discount' || line.serviceId === CASHIER_DISCOUNT_SERVICE_ID_440) a.discount += Math.abs(Math.min(0, v));
    return a;
  }, { miscellaneous: 0, discount: 0 });
}

function adjustmentLine440(type, amount, actor, item, reason = '') {
  const at = new Date().toISOString();
  const misc = type === 'miscellaneous';
  const signed = misc ? Math.max(0, n(amount)) : -Math.abs(n(amount));
  return {
    id: `cash-adj-${item?.id || 'enc'}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    serviceId: misc ? CASHIER_MISC_SERVICE_ID_440 : CASHIER_DISCOUNT_SERVICE_ID_440,
    title: misc ? 'متفرقه' : 'تخفیف',
    category: 'cashier_adjustment', clinicalType: 'cashier_adjustment', serviceType: 'cashier_adjustment',
    adjustmentType: type,
    quantity: 1, unitPrice: signed, price: signed, priceSnapshot: signed,
    status: 'registered', reason: String(reason || '').trim(),
    registeredAt: at,
    registeredById: actor?.id || '', registeredByName: actor?.name || actor?.fullName || '', registeredByRole: actor?.role || '',
    source: 'PROFESSIONAL_CASHIER_440', reportCategory: misc ? 'متفرقه' : 'تخفیف',
  };
}

export function applyFinalPayable440(item = {}, desiredValue = 0, actor = null, { discountReason = '', miscellaneousNote = '' } = {}) {
  const base = encounterBaseTotal440(item);
  const desired = Math.max(0, n(desiredValue));
  const clean = (item.services || []).filter(x => !isCashierAdjustment440(x));
  let services = clean;
  if (desired < base) {
    if (!String(discountReason || '').trim()) throw new Error('برای کاهش مبلغ نهایی، ثبت تخفیف و دلیل آن الزامی است.');
    services = [...clean, adjustmentLine440('cashier_discount', base - desired, actor, item, discountReason)];
  } else if (desired > base) {
    services = [...clean, adjustmentLine440('miscellaneous', desired - base, actor, item, miscellaneousNote)];
  }
  return {
    ...item,
    services,
    totalCost: desired,
    cashierBaseTotal: base,
    cashierFinalPayable: desired,
    cashierAdjustmentAmount: desired - base,
    lastCashierEditAt: new Date().toISOString(),
  };
}

function currentServicePrice(line, services = []) {
  const ref = services.find(s => String(s.id) === String(line.serviceId) || (line.internalCode && String(s.internalCode || s.code) === String(line.internalCode)));
  return ref ? n(ref.tariffPrice ?? ref.price ?? ref.unitPrice) : n(line.unitPrice ?? line.price);
}
function currentProductPrice(line, products = []) {
  const ref = products.find(p => String(p.id) === String(line.productId) || (line.internalCode && String(p.internalCode || p.code) === String(line.internalCode)));
  return ref ? n(ref.salesPrice ?? ref.price ?? ref.unitPrice) : n(line.unitPrice ?? line.price);
}

export function reclassifyMiscellaneous440(item = {}, medicalServices = [], products = [], actor = null) {
  const before = adjustmentTotals440(item);
  let miscRemaining = before.miscellaneous;
  const changes = [];
  const services = [];

  for (const line of item.services || []) {
    if (isCashierAdjustment440(line)) continue;
    const qty = Math.max(1, n(line.quantity || 1));
    const oldUnit = n(line.unitPrice ?? line.price / qty);
    const currentUnit = currentServicePrice(line, medicalServices);
    const desiredIncrease = Math.max(0, (currentUnit - oldUnit) * qty);
    const transfer = Math.min(miscRemaining, desiredIncrease);
    const effectiveUnit = oldUnit + (transfer / qty);
    if (transfer > 0) {
      changes.push({ kind: 'service', id: line.id, title: line.title, from: oldUnit * qty, to: effectiveUnit * qty, transferred: transfer });
      miscRemaining -= transfer;
    }
    services.push({ ...line, unitPrice: effectiveUnit, price: effectiveUnit * qty, reclassifiedAt: transfer > 0 ? new Date().toISOString() : line.reclassifiedAt });
  }
  const productLines = [];
  for (const line of item.products || []) {
    const qty = Math.max(1, n(line.quantity || 1));
    const oldUnit = n(line.unitPrice ?? line.price / qty);
    const currentUnit = currentProductPrice(line, products);
    const desiredIncrease = Math.max(0, (currentUnit - oldUnit) * qty);
    const transfer = Math.min(miscRemaining, desiredIncrease);
    const effectiveUnit = oldUnit + (transfer / qty);
    if (transfer > 0) {
      changes.push({ kind: 'product', id: line.id, title: line.title || line.productName, from: oldUnit * qty, to: effectiveUnit * qty, transferred: transfer });
      miscRemaining -= transfer;
    }
    productLines.push({ ...line, unitPrice: effectiveUnit, price: effectiveUnit * qty, reclassifiedAt: transfer > 0 ? new Date().toISOString() : line.reclassifiedAt });
  }
  const oldDiscountLines = (item.services || []).filter(x => x.adjustmentType === 'cashier_discount');
  if (miscRemaining > 0) services.push(adjustmentLine440('miscellaneous', miscRemaining, actor, item, 'باقیمانده متفرقه پس از محاسبه مجدد قیمت‌ها'));
  services.push(...oldDiscountLines);
  const next = { ...item, services, products: productLines, reclassificationHistory: [
    ...(item.reclassificationHistory || []),
    { id: `reclass-${Date.now()}`, at: new Date().toISOString(), actorId: actor?.id || '', actorName: actor?.name || actor?.fullName || '', miscBefore: before.miscellaneous, miscAfter: miscRemaining, changes }
  ] };
  next.totalCost = encounterFinalTotal440(next);
  next.cashierFinalPayable = next.totalCost;
  next.remainingDebt = Math.max(0, next.totalCost - n(next.paidAmount));
  return { item: next, changes, miscellaneousBefore: before.miscellaneous, miscellaneousAfter: miscRemaining };
}

export function paymentMethodLabel440(method) {
  return ({ card: 'کارتخوان', cash: 'نقدی', credit: 'اعتباری', mixed: 'ترکیبی' })[method] || 'ثبت نشده';
}
