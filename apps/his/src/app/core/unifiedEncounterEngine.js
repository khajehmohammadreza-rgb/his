/**
 * Bastiyan HIS Unified Encounter / Transaction Engine
 * Version 1 - canonical write path for admission, services, products and settlement.
 *
 * Compatibility policy for 4.1.1:
 * - visitQueue remains a read/projection model for existing clinical screens.
 * - salesInvoices remains a reporting projection for existing financial reports.
 * - encounters + transactions + billingDocuments are the canonical engine ledger.
 */
export const UNIFIED_ENGINE_VERSION = 1;

const FINAL_STATUSES = new Set(['completed', 'discharged']);
const INACTIVE_STATUSES = new Set(['cancelled']);

function nowIso() { return new Date().toISOString(); }
function n(value) { const x = Number(value); return Number.isFinite(x) ? x : 0; }
function qty(value) { return Math.max(0, n(value || 1)); }
function cloneArray(value) { return Array.isArray(value) ? [...value] : []; }
function id(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function actorInfo(actor = {}) {
  return {
    userId: String(actor?.id || actor?.userId || 'system'),
    userName: String(actor?.name || actor?.fullName || actor?.username || 'سیستم'),
    userRole: String(actor?.role || actor?.userRole || 'system'),
  };
}
function lineUnitPrice(line = {}) {
  return n(line.unitPrice ?? line.tariffPrice ?? line.salesPrice ?? (qty(line.quantity) ? n(line.price) / qty(line.quantity) : line.price));
}
function lineTotal(line = {}) {
  const q = qty(line.quantity || 1);
  const explicit = n(line.price ?? line.totalPrice ?? line.totalAmount);
  return explicit > 0 ? explicit : lineUnitPrice(line) * q;
}
function queueTotal(item = {}) {
  const rows = [...(item.services || []), ...(item.products || [])];
  const calculated = rows.reduce((sum, row) => sum + lineTotal(row), 0);
  return n(item.totalCost) || calculated;
}
function queuePaid(item = {}) { return Math.max(0, n(item.paidAmount)); }
function effectiveBalance(item = {}) {
  if (INACTIVE_STATUSES.has(item.status)) return 0;
  return Math.max(0, queueTotal(item) - queuePaid(item));
}
function encounterIdForQueue(queueId) { return `enc-${String(queueId)}`; }
function lineKey(kind, line = {}, index = 0) {
  const primary = kind === 'PRODUCT' ? (line.productId || line.id) : (line.serviceId || line.id);
  return `${kind}:${String(line.id || primary || index)}`;
}
function comparableTransaction(tx = {}) {
  return JSON.stringify({
    kind: tx.kind,
    referenceId: tx.referenceId,
    sourceLineId: tx.sourceLineId,
    quantity: n(tx.quantity),
    unitAmount: n(tx.unitAmount),
    amount: n(tx.amount),
    title: tx.title || '',
    doctorId: tx.doctorId || '',
    assistantId: tx.assistantId || '',
  });
}
function makeItemTransaction(encounterId, queueItem, kind, line, index, actor, at) {
  const q = qty(line.quantity || 1);
  const unit = lineUnitPrice(line);
  const amount = lineTotal(line);
  const key = lineKey(kind, line, index);
  const a = actorInfo(actor);
  return {
    id: id('txn'),
    encounterId,
    kind,
    status: 'ACTIVE',
    lineKey: key,
    sourceLineId: String(line.id || ''),
    referenceType: kind === 'PRODUCT' ? 'product' : 'service',
    referenceId: String(kind === 'PRODUCT' ? (line.productId || line.id || '') : (line.serviceId || line.id || '')),
    title: String(line.title || line.productName || line.name || ''),
    quantity: q,
    unitAmount: unit,
    amount,
    doctorId: String(line.doctorId || queueItem.doctorId || ''),
    assistantId: String(line.assistantId || queueItem.assistantId || ''),
    source: 'UNIFIED_ENCOUNTER',
    createdAt: at,
    updatedAt: at,
    ...a,
  };
}
function makePaymentTransaction(encounterId, item, actor, at) {
  const amount = queuePaid(item);
  if (amount <= 0) return null;
  return {
    id: id('txn'), encounterId, kind: 'PAYMENT', status: 'ACTIVE', lineKey: 'PAYMENT:SETTLEMENT',
    referenceType: 'encounter', referenceId: encounterId, title: 'دریافت / تسویه بیمار', quantity: 1,
    unitAmount: amount, amount: -amount, paymentAmount: amount,
    paymentMethod: item.paymentMethod || '', posRrn: item.posRrn || '', source: 'UNIFIED_ENCOUNTER',
    createdAt: at, updatedAt: at, ...actorInfo(actor),
  };
}
function activeTransactionsFor(transactions, encounterId) {
  return (transactions || []).filter((tx) => tx.encounterId === encounterId && tx.status === 'ACTIVE');
}
function activeProductQuantityMap(transactions, encounterId) {
  const map = new Map();
  activeTransactionsFor(transactions, encounterId).filter((tx) => tx.kind === 'PRODUCT').forEach((tx) => {
    const key = String(tx.referenceId || '');
    if (key) map.set(key, (map.get(key) || 0) + n(tx.quantity));
  });
  return map;
}
function withAudit(state, action, details, actor, meta = {}) {
  const at = nowIso();
  const a = actorInfo(actor);
  const entry = {
    id: id('audit'), timestamp: at, jalaliDate: new Date(at).toLocaleString('fa-IR'),
    action, category: 'unified_encounter_engine', details, role: a.userRole,
    userId: a.userId, userName: a.userName, ...meta,
  };
  return { ...state, auditLogs: [entry, ...(state.auditLogs || [])].slice(0, 1000) };
}
function adjustPatientDebt(patients, patientId, delta) {
  if (!patientId || Math.abs(delta) < 0.000001) return patients;
  return (patients || []).map((p) => {
    if (String(p.id) !== String(patientId)) return p;
    const current = n(p?.creditConfig?.currentDebt);
    return { ...p, creditConfig: { ...(p.creditConfig || {}), currentDebt: Math.max(0, current + delta) } };
  });
}
function reconcileInventory(state, encounterId, oldTransactions, newTransactions, queueItem, actor, at) {
  const before = activeProductQuantityMap(oldTransactions, encounterId);
  const after = activeProductQuantityMap(newTransactions, encounterId);
  const keys = new Set([...before.keys(), ...after.keys()]);
  let products = cloneArray(state.products);
  const movements = [];
  for (const productId of keys) {
    const oldQ = before.get(productId) || 0;
    const newQ = after.get(productId) || 0;
    const deltaUsed = newQ - oldQ; // positive = consume stock; negative = return stock
    if (Math.abs(deltaUsed) < 0.000001) continue;
    const index = products.findIndex((p) => String(p.id) === String(productId));
    if (index < 0) throw new Error(`کالای ${productId} در موجودی مرکز یافت نشد.`);
    const product = products[index];
    const previousStock = n(product.stockQuantity);
    const nextStock = previousStock - deltaUsed;
    const canOverride = ['admin', 'superadmin'].includes(String(actor?.role || actor?.userRole || '')) && state?.settings?.allowNegativeStockWithAdmin === true;
    if (nextStock < 0 && !canOverride) throw new Error(`موجودی کالای «${product.name || productId}» کافی نیست.`);
    products[index] = { ...product, stockQuantity: nextStock };
    movements.push({
      id: id('mov'), productId, productName: product.name || '',
      type: deltaUsed > 0 ? 'encounter_use' : 'encounter_return',
      quantity: -deltaUsed, previousStock, newStock: nextStock,
      date: at, jalaliDate: new Date(at).toLocaleDateString('fa-IR'),
      referenceId: encounterId, encounterId, userId: actorInfo(actor).userId, userName: actorInfo(actor).userName,
      source: 'UNIFIED_ENCOUNTER', queueId: queueItem.id,
    });
  }
  return { products, stockMovements: [...movements, ...(state.stockMovements || [])] };
}
function syncTransactionSet(existingTransactions, encounterId, item, actor, at) {
  const transactions = (existingTransactions || []).map((tx) => ({ ...tx }));
  const active = activeTransactionsFor(transactions, encounterId);
  const byKey = new Map(active.filter((tx) => ['SERVICE', 'PRODUCT'].includes(tx.kind)).map((tx) => [tx.lineKey, tx]));
  const desired = [
    ...(item.services || []).map((line, i) => makeItemTransaction(encounterId, item, 'SERVICE', line, i, actor, at)),
    ...(item.products || []).map((line, i) => makeItemTransaction(encounterId, item, 'PRODUCT', line, i, actor, at)),
  ];
  const desiredKeys = new Set(desired.map((tx) => tx.lineKey));
  if (INACTIVE_STATUSES.has(item.status)) desiredKeys.clear();

  for (const old of active.filter((tx) => ['SERVICE', 'PRODUCT'].includes(tx.kind))) {
    const desiredTx = INACTIVE_STATUSES.has(item.status) ? null : desired.find((d) => d.lineKey === old.lineKey);
    if (!desiredTx) {
      const idx = transactions.findIndex((tx) => tx.id === old.id);
      transactions[idx] = { ...transactions[idx], status: 'VOID', voidedAt: at, updatedAt: at, voidedBy: actorInfo(actor).userId };
    }
  }
  if (!INACTIVE_STATUSES.has(item.status)) {
    for (const wanted of desired) {
      const old = byKey.get(wanted.lineKey);
      if (!old) { transactions.push(wanted); continue; }
      if (comparableTransaction(old) === comparableTransaction(wanted)) continue;
      const idx = transactions.findIndex((tx) => tx.id === old.id);
      transactions[idx] = { ...transactions[idx], status: 'SUPERSEDED', supersededAt: at, updatedAt: at, supersededBy: actorInfo(actor).userId };
      transactions.push({ ...wanted, supersedesTransactionId: old.id });
    }
  }

  const oldPayment = active.find((tx) => tx.kind === 'PAYMENT' && tx.lineKey === 'PAYMENT:SETTLEMENT');
  const wantedPayment = INACTIVE_STATUSES.has(item.status) ? null : makePaymentTransaction(encounterId, item, actor, at);
  if (oldPayment && (!wantedPayment || n(oldPayment.paymentAmount) !== n(wantedPayment.paymentAmount) || oldPayment.paymentMethod !== wantedPayment.paymentMethod || oldPayment.posRrn !== wantedPayment.posRrn)) {
    const idx = transactions.findIndex((tx) => tx.id === oldPayment.id);
    transactions[idx] = { ...transactions[idx], status: 'SUPERSEDED', supersededAt: at, updatedAt: at, supersededBy: actorInfo(actor).userId };
  }
  if (wantedPayment && (!oldPayment || oldPayment.status !== 'ACTIVE' || n(oldPayment.paymentAmount) !== n(wantedPayment.paymentAmount) || oldPayment.paymentMethod !== wantedPayment.paymentMethod || oldPayment.posRrn !== wantedPayment.posRrn)) {
    transactions.push({ ...wantedPayment, supersedesTransactionId: oldPayment?.id || undefined });
  }
  return transactions;
}
function upsertBillingProjection(state, encounter, item, at) {
  if (!FINAL_STATUSES.has(item.status)) return state;
  const totalAmount = queueTotal(item);
  const paidAmount = Math.min(totalAmount, queuePaid(item));
  const balance = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = balance <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'DUE';
  const invoiceNumber = `UE-${String(item.turnNumber || '').padStart(4, '0')}-${String(item.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8)}`;
  const serviceItems = (item.services || []).map((x) => ({
    id: x.id, itemType: 'service', serviceId: x.serviceId || x.id, productId: null,
    productName: x.title || '', title: x.title || '', qty: qty(x.quantity || 1), unitPrice: lineUnitPrice(x), total: lineTotal(x),
  }));
  const productItems = (item.products || []).map((x) => ({
    id: x.id, itemType: 'product', productId: x.productId || x.id, productName: x.title || x.productName || '', title: x.title || x.productName || '',
    qty: qty(x.quantity || 1), unitPrice: lineUnitPrice(x), total: lineTotal(x),
  }));
  const doc = {
    id: `bill-${encounter.id}`, encounterId: encounter.id, queueId: item.id, invoiceNumber,
    patientId: item.patientId, patientName: item.patientName, status: 'completed', paymentStatus,
    totalAmount, paidAmount, balance,
    paymentMethod: item.paymentMethod || 'settled', posRrn: item.posRrn || '',
    items: [...serviceItems, ...productItems], createdAt: encounter.openedAt || at, settledAt: item.finalSettlementAt || at,
    source: 'UNIFIED_ENCOUNTER', date: at, jalaliDate: new Date(at).toLocaleDateString('fa-IR'), payableAmount: totalAmount, total: totalAmount,
  };
  const billingDocuments = (state.billingDocuments || []).filter((x) => x.encounterId !== encounter.id);
  const salesInvoices = (state.salesInvoices || []).filter((x) => x.encounterId !== encounter.id);
  return { ...state, billingDocuments: [doc, ...billingDocuments], salesInvoices: [doc, ...salesInvoices] };
}

export function ensureUnifiedEngineState(input = {}) {
  let state = {
    ...input,
    encounters: cloneArray(input.encounters),
    transactions: cloneArray(input.transactions),
    billingDocuments: cloneArray(input.billingDocuments),
    engineMeta: { version: UNIFIED_ENGINE_VERSION, migratedAt: input?.engineMeta?.migratedAt || null, ...(input.engineMeta || {}) },
  };
  if (state.engineMeta.migratedAt) return state;
  const at = nowIso();
  // Non-destructive migration: represent legacy queue and legacy sales in the ledger,
  // but DO NOT touch stock or patient balances during upgrade.
  for (const item of state.visitQueue || []) {
    const encounterId = encounterIdForQueue(item.id);
    if (state.encounters.some((e) => e.id === encounterId)) continue;
    const encounter = {
      id: encounterId, queueId: item.id, patientId: item.patientId || '', patientName: item.patientName || '',
      type: 'CLINICAL', status: item.status || 'reception_review', openedAt: item.registeredAt || at,
      updatedAt: item.lastWorkflowAt || item.registeredAt || at, closedAt: FINAL_STATUSES.has(item.status) ? (item.finalSettlementAt || at) : null,
      totalAmount: queueTotal(item), paidAmount: queuePaid(item), balance: effectiveBalance(item), revision: 1,
      migratedFromLegacy: true,
    };
    state.encounters.push(encounter);
    const migrated = [
      ...(item.services || []).map((line, i) => ({ ...makeItemTransaction(encounterId, item, 'SERVICE', line, i, { id: 'migration', name: 'مهاجرت ۴.۱.۰', role: 'system' }, at), migratedFromLegacy: true })),
      ...(item.products || []).map((line, i) => ({ ...makeItemTransaction(encounterId, item, 'PRODUCT', line, i, { id: 'migration', name: 'مهاجرت ۴.۱.۰', role: 'system' }, at), migratedFromLegacy: true })),
    ];
    const payment = makePaymentTransaction(encounterId, item, { id: 'migration', name: 'مهاجرت ۴.۱.۰', role: 'system' }, at);
    if (payment) migrated.push({ ...payment, migratedFromLegacy: true });
    state.transactions.push(...migrated);
  }
  for (const invoice of state.salesInvoices || []) {
    if (invoice?.source === 'UNIFIED_ENCOUNTER') continue;
    const legacyId = `enc-legacy-sale-${String(invoice.id || invoice.invoiceNumber || id('legacy'))}`;
    if (state.encounters.some((e) => e.id === legacyId)) continue;
    state.encounters.push({
      id: legacyId, patientId: invoice.patientId || '', patientName: invoice.patientName || '', type: 'LEGACY_SALE',
      status: 'completed', openedAt: invoice.date || at, updatedAt: invoice.date || at, closedAt: invoice.date || at,
      totalAmount: n(invoice.payableAmount ?? invoice.total), paidAmount: n(invoice.payableAmount ?? invoice.total), balance: 0,
      revision: 1, migratedFromLegacy: true, readOnly: true,
    });
  }
  state.engineMeta = { ...(state.engineMeta || {}), version: UNIFIED_ENGINE_VERSION, migratedAt: at, migrationSource: '4.0.0' };
  return state;
}

export function registerEncounter(inputState, item, actor = {}) {
  const state = ensureUnifiedEngineState(inputState);
  if (!item?.id || !item?.patientId) throw new Error('اطلاعات پذیرش بیمار کامل نیست.');
  if ((state.visitQueue || []).some((q) => String(q.id) === String(item.id))) return updateEncounter(state, item, actor);
  const at = nowIso();
  const encounterId = encounterIdForQueue(item.id);
  const transactions = syncTransactionSet(state.transactions, encounterId, item, actor, at);
  const inventory = reconcileInventory(state, encounterId, state.transactions, transactions, item, actor, at);
  const encounter = {
    id: encounterId, queueId: item.id, patientId: item.patientId, patientName: item.patientName || '', type: 'CLINICAL',
    status: item.status || 'reception_review', openedAt: item.registeredAt || at, updatedAt: at,
    closedAt: FINAL_STATUSES.has(item.status) ? (item.finalSettlementAt || at) : null,
    totalAmount: queueTotal(item), paidAmount: queuePaid(item), balance: effectiveBalance(item), revision: 1,
    createdBy: actorInfo(actor).userId,
  };
  let next = {
    ...state, ...inventory, transactions, encounters: [encounter, ...(state.encounters || [])],
    visitQueue: [item, ...(state.visitQueue || [])],
    patients: adjustPatientDebt(state.patients, item.patientId, effectiveBalance(item)),
  };
  next = upsertBillingProjection(next, encounter, item, at);
  return withAudit(next, 'ثبت پذیرش یکپارچه', `Encounter ${encounterId} برای ${item.patientName || item.patientId} ثبت شد.`, actor, { encounterId, patientId: item.patientId });
}

export function updateEncounter(inputState, item, actor = {}) {
  const state = ensureUnifiedEngineState(inputState);
  if (!item?.id) throw new Error('شناسه پذیرش برای بروزرسانی موجود نیست.');
  const encounterId = encounterIdForQueue(item.id);
  const oldEncounter = (state.encounters || []).find((e) => e.id === encounterId);
  if (!oldEncounter) {
    const withoutQueue = { ...state, visitQueue: (state.visitQueue || []).filter((q) => String(q.id) !== String(item.id)) };
    return registerEncounter(withoutQueue, item, actor);
  }
  if (oldEncounter.readOnly) throw new Error('این رکورد تاریخی فقط خواندنی است.');
  const at = nowIso();
  const oldBalance = n(oldEncounter.balance);
  const transactions = syncTransactionSet(state.transactions, encounterId, item, actor, at);
  const inventory = reconcileInventory(state, encounterId, state.transactions, transactions, item, actor, at);
  const newBalance = effectiveBalance(item);
  const encounter = {
    ...oldEncounter, patientId: item.patientId || oldEncounter.patientId, patientName: item.patientName || oldEncounter.patientName,
    status: item.status || oldEncounter.status, updatedAt: at,
    closedAt: FINAL_STATUSES.has(item.status) ? (item.finalSettlementAt || at) : null,
    totalAmount: queueTotal(item), paidAmount: queuePaid(item), balance: newBalance, revision: n(oldEncounter.revision) + 1,
    updatedBy: actorInfo(actor).userId,
  };
  let next = {
    ...state, ...inventory, transactions,
    encounters: (state.encounters || []).map((e) => e.id === encounterId ? encounter : e),
    visitQueue: (state.visitQueue || []).map((q) => String(q.id) === String(item.id) ? item : q),
    patients: adjustPatientDebt(state.patients, item.patientId || oldEncounter.patientId, newBalance - oldBalance),
  };
  next = upsertBillingProjection(next, encounter, item, at);
  return withAudit(next, 'بروزرسانی Encounter', `Encounter ${encounterId} از مانده ${oldBalance} به ${newBalance} بروزرسانی شد.`, actor, { encounterId, patientId: encounter.patientId });
}

export function settlePatientDebt(inputState, patientId, amount, paymentMethod, posRrn, actor = {}) {
  const state = ensureUnifiedEngineState(inputState);
  const patient = (state.patients || []).find((p) => String(p.id) === String(patientId));
  if (!patient) throw new Error('بیمار برای تسویه یافت نشد.');
  const currentDebt = n(patient?.creditConfig?.currentDebt);
  const paid = Math.min(Math.max(0, n(amount)), currentDebt);
  if (paid <= 0) throw new Error('مبلغ تسویه معتبر نیست.');
  const at = nowIso();
  const encounterId = id('enc-debt');
  const encounter = {
    id: encounterId, patientId, patientName: patient.fullName || '', type: 'DEBT_SETTLEMENT', status: 'completed',
    openedAt: at, updatedAt: at, closedAt: at, totalAmount: paid, paidAmount: paid, balance: 0, revision: 1, createdBy: actorInfo(actor).userId,
  };
  const transaction = {
    id: id('txn'), encounterId, kind: 'PAYMENT', status: 'ACTIVE', lineKey: 'PAYMENT:LEGACY_DEBT', referenceType: 'patient_debt', referenceId: patientId,
    title: 'تسویه بدهی قبلی بیمار', quantity: 1, unitAmount: paid, amount: -paid, paymentAmount: paid,
    paymentMethod: paymentMethod || '', posRrn: posRrn || '', source: 'UNIFIED_ENCOUNTER', createdAt: at, updatedAt: at, ...actorInfo(actor),
  };
  let next = {
    ...state,
    encounters: [encounter, ...(state.encounters || [])], transactions: [transaction, ...(state.transactions || [])],
    patients: adjustPatientDebt(state.patients, patientId, -paid),
  };
  return withAudit(next, 'تسویه بدهی در Engine', `مبلغ ${paid} از بدهی ${patient.fullName || patientId} دریافت شد.`, actor, { encounterId, patientId });
}

export function getEncounterForQueue(state, queueId) {
  return (state?.encounters || []).find((e) => e.id === encounterIdForQueue(queueId)) || null;
}
