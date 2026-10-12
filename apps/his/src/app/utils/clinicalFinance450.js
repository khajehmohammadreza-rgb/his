import { getUserDisplayName } from './clinicalWorkflow.js?b=r24-514-1405';
import { parseMoney450 } from './money450.js?b=r24-514-1405';

const clampPercent = v => Math.max(0, Math.min(100, Number(v) || 0));
const account = p => p?.financialAccount || p?.staffAccount || {};
const percentOf = p => clampPercent(account(p)?.commissionPercent ?? p?.commissionPercent ?? p?.commissionRate ?? 0);
const normalizeTitle = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const roundMoney = n => Math.round(Number(n) || 0);

export function isToday450(value, now = new Date()) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function makeFreeClinicalService450({ title, note = '', estimatedAmount = 0, doctor = null, careStaff = null, actor = null, sourceEncounterId = '' }) {
  const amount = Math.max(0, parseMoney450(estimatedAmount));
  const doctorPercent = percentOf(doctor);
  const carePercent = careStaff ? percentOf(careStaff) : 0;
  const doctorAmount = roundMoney(amount * doctorPercent / 100);
  const careAmount = roundMoney(amount * carePercent / 100);
  const now = new Date().toISOString();
  const doctorId = doctor?.id || doctor?.userId || '';
  const careId = careStaff?.id || careStaff?.userId || '';
  const doctorName = getUserDisplayName(doctor);
  const careName = getUserDisplayName(careStaff);
  const key = `${doctorId || 'doctor'}:${normalizeTitle(title)}`;
  return {
    id: `custom450-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customServiceKey: key,
    serviceId: '', code: '', clinicalType: 'custom_free_service', serviceType: 'custom_free_service', category: 'custom_free_service',
    title: String(title || '').trim(), description: String(note || '').trim(), instructions: String(note || '').trim(),
    quantity: 1, unitPrice: amount, price: amount, priceSnapshot: amount, estimatedAmount: amount, finalAmount: null,
    priceStatus: 'estimated', requiresFinalPriceConfirmation: true, isCustomFreeService: true,
    doctorId, doctorName, doctorCommissionPercent: doctorPercent, doctorCommissionAmount: doctorAmount,
    careStaffId: careId, careStaffName: careName, careStaffRole: careId ? 'assistant_nurse' : '',
    assistantId: careId, assistantName: careName, assistantCommissionPercent: carePercent, assistantCommissionAmount: careAmount,
    nurseId: careId, nurseName: careName, nurseCommissionPercent: 0, nurseCommissionAmount: 0, nurseCommissionSource: 'unified_role_alias',
    centerRevenue: Math.max(0, amount - doctorAmount - careAmount), centerProfitAmount: Math.max(0, amount - doctorAmount - careAmount),
    sourceEncounterId, status: 'ordered', registeredAt: now, createdAt: now,
    createdById: actor?.id || '', createdByName: getUserDisplayName(actor)
  };
}

export function finalizeFreeClinicalService450(line = {}, finalTitle = '', finalAmount = 0, actor = null) {
  const amount = Math.max(0, parseMoney450(finalAmount));
  const doctorPercent = clampPercent(line.doctorCommissionPercent || 0);
  const carePercent = clampPercent(line.assistantCommissionPercent || line.careStaffCommissionPercent || 0);
  const doctorAmount = roundMoney(amount * doctorPercent / 100);
  const careAmount = roundMoney(amount * carePercent / 100);
  const now = new Date().toISOString();
  return {
    ...line,
    title: String(finalTitle || line.title || '').trim(), unitPrice: amount, price: amount, priceSnapshot: amount, finalAmount: amount,
    priceStatus: 'final', requiresFinalPriceConfirmation: false, isCustomFreeService: true,
    doctorCommissionPercent: doctorPercent, doctorCommissionAmount: doctorAmount,
    assistantCommissionPercent: carePercent, assistantCommissionAmount: careAmount,
    nurseCommissionPercent: 0, nurseCommissionAmount: 0, nurseCommissionSource: 'unified_role_alias',
    centerRevenue: Math.max(0, amount - doctorAmount - careAmount), centerProfitAmount: Math.max(0, amount - doctorAmount - careAmount),
    status: line.status === 'cancelled' ? 'cancelled' : 'completed', finalizedAt: now,
    finalizedById: actor?.id || '', finalizedByName: getUserDisplayName(actor)
  };
}

export function updateCustomServiceLibrary450(library = [], service = {}, actor = null) {
  const title = String(service.title || '').trim(); if (!title) return Array.isArray(library) ? library : [];
  const doctorId = String(service.doctorId || actor?.id || '');
  const key = String(service.customServiceKey || `${doctorId || 'doctor'}:${normalizeTitle(title)}`);
  const rows = Array.isArray(library) ? [...library] : [];
  const index = rows.findIndex(x => String(x.customServiceKey || x.key || '') === key || (normalizeTitle(x.title) === normalizeTitle(title) && String(x.doctorId || '') === doctorId));
  const now = new Date().toISOString();
  const historyItem = {
    at: now,
    estimatedAmount: Math.max(0, parseMoney450(service.estimatedAmount ?? service.unitPrice ?? 0)),
    finalAmount: service.priceStatus === 'final' ? Math.max(0, parseMoney450(service.finalAmount ?? service.unitPrice ?? 0)) : null,
    encounterId: service.sourceEncounterId || service.encounterId || '',
    actorId: actor?.id || ''
  };
  const previous = index >= 0 ? rows[index] : {};
  const priceHistory = [historyItem, ...(Array.isArray(previous.priceHistory) ? previous.priceHistory : [])].slice(0, 30);
  const next = {
    ...previous,
    id: previous.id || `custom-lib450-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    key, customServiceKey: key, title, doctorId, doctorName: service.doctorName || previous.doctorName || getUserDisplayName(actor),
    lastEstimatedAmount: Math.max(0, parseMoney450(service.estimatedAmount ?? previous.lastEstimatedAmount ?? service.unitPrice ?? 0)),
    lastFinalAmount: service.priceStatus === 'final' ? Math.max(0, parseMoney450(service.finalAmount ?? service.unitPrice ?? 0)) : Number(previous.lastFinalAmount || 0),
    doctorCommissionPercent: Number(service.doctorCommissionPercent ?? previous.doctorCommissionPercent ?? 0),
    assistantCommissionPercent: Number(service.assistantCommissionPercent ?? previous.assistantCommissionPercent ?? 0),
    timesUsed: Number(previous.timesUsed || 0) + 1,
    priceHistory, active: previous.active !== false, createdAt: previous.createdAt || now, updatedAt: now
  };
  if (index >= 0) rows[index] = next; else rows.unshift(next);
  return rows;
}
