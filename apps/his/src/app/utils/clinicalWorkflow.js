export const CLINICAL_WORKFLOW_VERSION = 1;

export function getUserDisplayName(user) {
  return String(user?.name || user?.fullName || user?.displayName || user?.username || '').trim();
}

const ROLE_ALIASES = {
  doctor: new Set(['doctor', 'physician', 'medical_doctor', 'specialist_doctor', 'پزشک', 'پزشك', 'دکتر', 'دكتر', 'پزشک متخصص', 'پزشك متخصص']),
  nurse: new Set(['nurse', 'assistant', 'nursing', 'nurse_assistant', 'assistant_nurse', 'medical_assistant', 'پرستار', 'دستیار', 'دستيار', 'دستیار پزشک', 'دستيار پزشك', 'پرستار/دستیار', 'پرستار / دستیار']),
};

function normalizeRoleValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getActiveCenterId() {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const ss = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
    const ls = typeof localStorage !== 'undefined' ? localStorage : null;
    const portalId = w?.__BASTIYAN_PORTAL_SESSION__?.center?.id;
    if (portalId) return String(portalId);
    const raw = ss?.getItem('bastiyan_center_session') || ss?.getItem('bastian_center_session');
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.id) return String(parsed.id);
    return String(ls?.getItem('bastiyan_current_center_id') || ls?.getItem('bastian_current_center_id') || '');
  } catch {
    return '';
  }
}

export function userBelongsToCenter(user, centerId = getActiveCenterId()) {
  if (!user || !centerId) return true;
  const declared = [user.centerId, user.center_id, user.clinicId, user.branchId].filter(Boolean).map(String);
  return declared.length === 0 || declared.includes(String(centerId));
}

export function userHasRole(user, role) {
  if (!user || !role) return false;
  const requested = normalizeRoleValue(role);
  const aliases = ROLE_ALIASES[requested] || new Set([requested]);
  const roles = [
    user.role,
    user.roleName,
    user.roleTitle,
    ...(Array.isArray(user.roles) ? user.roles : []),
    ...(Array.isArray(user.assignedRoles) ? user.assignedRoles : []),
    ...(Array.isArray(user.permissions?.roles) ? user.permissions.roles : []),
  ].filter(Boolean).map(normalizeRoleValue);
  if (roles.some((r) => aliases.has(r))) return true;
  // Older centers sometimes stored descriptive/custom role labels instead of the canonical code.
  // Accept only unambiguous medical-role words so real center users are not hidden by a legacy label.
  if (requested === 'doctor') return roles.some((r) => {
    if (r.includes('دستیار') || r.includes('پرستار') || r.includes('منشی') || /(^|[\s/_-])(assistant|nurse|nursing|secretary)([\s/_-]|$)/.test(r)) return false;
    return /(^|[\s/_-])(doctor|physician)([\s/_-]|$)/.test(r) || r.includes('پزشک') || r.includes('دکتر');
  });
  if (requested === 'nurse') return roles.some((r) => /(^|[\s/_-])(nurse|assistant|nursing)([\s/_-]|$)/.test(r) || r.includes('پرستار') || r.includes('دستیار'));
  return false;
}

export function getUsersByRole(users = [], role, centerId = getActiveCenterId()) {
  const seen = new Set();
  return (users || [])
    .filter((u) => u && u.active !== false && u.status !== 'disabled' && u.status !== 'inactive')
    .filter((u) => userBelongsToCenter(u, centerId))
    .filter((u) => userHasRole(u, role))
    .filter((u) => {
      const key = String(u.id || u.username || getUserDisplayName(u));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'fa'));
}

export function isMedicalVisitService(service) {
  if (!service) return false;
  const category = String(service.category || '').toLowerCase();
  const title = String(service.title || '').trim();
  return category === 'medical_visit' || /ویزیت/.test(title);
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n|،|,/).map((v) => v.trim()).filter(Boolean);
  return [];
}

export function normalizeServiceClinicalRules(service = {}) {
  const defaultRequiresAssistant = !isMedicalVisitService(service);
  const requiresAssistant = typeof service.requiresAssistant === 'boolean'
    ? service.requiresAssistant
    : defaultRequiresAssistant;
  return {
    ...service,
    requiresAssistant,
    assistantCommissionPercent: requiresAssistant
      ? Number(service.assistantCommissionPercent ?? 10) || 0
      : 0,
    doctorCommissionPercent: Number(service.doctorCommissionPercent ?? 0) || 0,
    preparationChecklist: asStringArray(service.preparationChecklist),
    requiredForms: asStringArray(service.requiredForms),
  };
}

function asPercent(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export function getServiceCommissionCategory(service = {}) {
  const explicit = String(service.commissionCategory || service.commissionType || '').toLowerCase().trim();
  if (['hospital', 'hospital_surgery', 'ganji', 'referral_hospital'].includes(explicit)) return 'hospital';
  const category = String(service.category || '').toLowerCase();
  const facility = String(service.facilityName || service.commissionFacilityName || service.referralFacilityName || '').toLowerCase();
  const title = String(service.title || '').toLowerCase();
  if (category === 'hospital_surgery' || category.includes('hospital') || facility.includes('گنجی') || title.includes('بیمارستان گنجی')) return 'hospital';
  return 'outpatient';
}

function serviceOverridePercent(account = {}, service = {}) {
  const overrides = account.serviceCommissionOverrides && typeof account.serviceCommissionOverrides === 'object'
    ? account.serviceCommissionOverrides
    : {};
  const keys = [service.id, service.serviceId, service.code, service.nationalCode].filter(Boolean).map(String);
  for (const key of keys) {
    const raw = overrides[key];
    const value = raw && typeof raw === 'object' ? raw.percent : raw;
    const parsed = asPercent(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function contractCommissionPercent(user, role, service, servicePercent, defaultPercent = 0) {
  const account = user?.financialAccount || {};
  const override = serviceOverridePercent(account, service);
  if (override !== null) return { percent: override, source: 'staff_service_override' };

  const category = getServiceCommissionCategory(service);
  const categoryValue = category === 'hospital'
    ? (account.hospitalCommissionPercent ?? account.hospitalSurgeryCommissionPercent ?? account.ganjiCommissionPercent)
    : account.outpatientCommissionPercent;
  const categoryPercent = asPercent(categoryValue);
  if (categoryPercent !== null) return { percent: categoryPercent, source: category === 'hospital' ? 'staff_hospital' : 'staff_outpatient' };

  const roleSpecific = role === 'doctor'
    ? (account.doctorCommissionPercent ?? user?.doctorCommissionPercent)
    : (account.assistantCommissionPercent ?? user?.assistantCommissionPercent);
  const rolePercent = asPercent(roleSpecific);
  if (rolePercent !== null) return { percent: rolePercent, source: 'staff_role_default' };

  const generic = asPercent(account.commissionPercent ?? user?.commissionRate ?? user?.commissionPercent);
  if (generic !== null) return { percent: generic, source: 'staff_default' };

  const serviceFallback = asPercent(servicePercent);
  if (serviceFallback !== null) return { percent: serviceFallback, source: 'service_default' };
  return { percent: asPercent(defaultPercent) ?? 0, source: 'default' };
}

export function calculateServiceCommission(service, quantity = 1, doctor, assistant) {
  const normalized = normalizeServiceClinicalRules(service);
  const unitPrice = Number(service.tariffPrice ?? service.price ?? service.unitPrice ?? 0) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  const lineTotal = unitPrice * qty;
  const doctorRule = contractCommissionPercent(doctor, 'doctor', service, service.doctorCommissionPercent, normalized.doctorCommissionPercent);
  const assistantRule = normalized.requiresAssistant
    ? contractCommissionPercent(assistant, 'assistant', service, service.assistantCommissionPercent, normalized.assistantCommissionPercent)
    : { percent: 0, source: 'not_required' };
  return {
    commissionCategory: getServiceCommissionCategory(service),
    doctorCommissionPercent: doctorRule.percent,
    doctorCommissionAmount: doctor ? Math.round(lineTotal * doctorRule.percent / 100) : 0,
    assistantCommissionPercent: assistantRule.percent,
    assistantCommissionAmount: normalized.requiresAssistant && assistant
      ? Math.round(lineTotal * assistantRule.percent / 100)
      : 0,
    commissionSource: {
      doctor: doctorRule.source,
      assistant: assistantRule.source,
    },
  };
}

export function calculateProductProfitCommission(product, quantity = 1, staff) {
  const account = staff?.financialAccount || {};
  const overrides = account.productCommissionOverrides && typeof account.productCommissionOverrides === 'object'
    ? account.productCommissionOverrides
    : {};
  const keys = [product?.id, product?.productId, product?.code, product?.barcode].filter(Boolean).map(String);
  let override = null;
  for (const key of keys) {
    const raw = overrides[key];
    const value = raw && typeof raw === 'object' ? raw.percent : raw;
    const parsed = asPercent(value);
    if (parsed !== null) { override = parsed; break; }
  }
  const basePercent = asPercent(account.productProfitCommissionPercent ?? account.productCommissionPercent) ?? 0;
  const percent = override !== null ? override : basePercent;
  const qty = Math.max(1, Number(quantity) || 1);
  const saleUnit = Number(product?.salesPrice ?? product?.salePrice ?? product?.price ?? product?.unitPrice ?? 0) || 0;
  const costUnit = Number(product?.purchasePrice ?? product?.costPrice ?? product?.buyPrice ?? product?.lastPurchasePrice ?? 0) || 0;
  const profitPerUnit = Math.max(0, saleUnit - costUnit);
  const profitBase = profitPerUnit * qty;
  return {
    productCommissionPercent: percent,
    productCommissionProfitBase: profitBase,
    productCommissionAmount: staff ? Math.round(profitBase * percent / 100) : 0,
    productCommissionSource: override !== null ? 'staff_product_override' : (percent > 0 ? 'staff_product_profit' : 'none'),
  };
}

export function createWorkflowEvent(status, action, user, meta = {}) {
  return {
    id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status,
    action,
    at: new Date().toISOString(),
    userId: user?.id || '',
    userName: getUserDisplayName(user),
    userRole: user?.role || '',
    ...meta,
  };
}

export function moveQueueItem(item, nextStatus, action, user, patch = {}) {
  const history = Array.isArray(item?.workflowHistory) ? item.workflowHistory : [];
  return {
    ...item,
    ...patch,
    status: nextStatus,
    workflowVersion: CLINICAL_WORKFLOW_VERSION,
    workflowHistory: [...history, createWorkflowEvent(nextStatus, action, user, { fromStatus: item?.status || '', toStatus: nextStatus, ...(patch.workflowEventMeta || {}) })],
    lastWorkflowStatus: nextStatus,
    lastWorkflowAt: new Date().toISOString(),
  };
}

export function getPreviousWorkflowStatus(item) {
  const history = Array.isArray(item?.workflowHistory) ? item.workflowHistory : [];
  if (history.length < 2) return 'reception_review';
  const current = item.status;
  for (let i = history.length - 2; i >= 0; i -= 1) {
    if (history[i]?.status && history[i].status !== current) return history[i].status;
  }
  return 'reception_review';
}

export function getWorkflowStatusLabel(status) {
  const labels = {
    reception_service_entry: 'ثبت خدمات و اقلام در پذیرش',
    reception_review: 'بازگشت به پذیرش برای اصلاح',
    waiting_doctor: 'در صف پزشک',
    under_treatment: 'در حال ویزیت پزشک',
    waiting_nurse: 'در صف پرستار / دستیار',
    nursing_in_progress: 'در حال انجام خدمات سرپایی',
    waiting_reception_referral: 'ارجاع بیمارستانی - منتظر پذیرش',
    ready_for_discharge: 'آماده صندوق / ترخیص',
    waiting_payment: 'منتظر تسویه',
    completed: 'تکمیل شده',
    discharged: 'ترخیص نهایی',
    cancelled: 'لغو شده',
  };
  return labels[status] || status || 'نامشخص';
}

export function getReferralFacilities(settings = {}) {
  const configured = Array.isArray(settings.referralFacilities) ? settings.referralFacilities : [];
  return configured.filter((f) => f && f.active !== false);
}

export function collectClinicalRequirements(services = []) {
  const preparationChecklist = [];
  const requiredForms = [];
  services.forEach((service) => {
    const n = normalizeServiceClinicalRules(service.originalData || service);
    n.preparationChecklist.forEach((v) => { if (!preparationChecklist.includes(v)) preparationChecklist.push(v); });
    n.requiredForms.forEach((v) => { if (!requiredForms.includes(v)) requiredForms.push(v); });
  });
  return { preparationChecklist, requiredForms };
}
