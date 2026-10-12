import { createWorkflowEvent, getUserDisplayName, userHasRole } from './clinicalWorkflow.js?b=r24-514-1405';

export const WORKFLOW_SCHEMA_440 = 'bastiyan-patient-flow-v4';

export const WorkflowStatus = Object.freeze({
  PATIENT_SELECTED: 'patient_selected',
  PATIENT_CONFIRMED: 'patient_confirmed',
  RECEPTION_SERVICE: 'reception_service_entry',
  RECEPTION_REVIEW: 'reception_review',
  WAITING_DOCTOR: 'waiting_doctor',
  UNDER_DOCTOR: 'under_treatment',
  WAITING_NURSE: 'waiting_nurse',
  NURSING: 'nursing_in_progress',
  READY_DISCHARGE: 'ready_for_discharge',
  WAITING_PAYMENT: 'waiting_payment',
  SETTLING: 'settling',
  DISCHARGED: 'discharged',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const FINAL_STATUSES_440 = new Set([WorkflowStatus.DISCHARGED, WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED]);
export const RECEPTION_STATUSES_440 = new Set([WorkflowStatus.PATIENT_SELECTED, WorkflowStatus.PATIENT_CONFIRMED, WorkflowStatus.RECEPTION_SERVICE, WorkflowStatus.RECEPTION_REVIEW]);
export const DOCTOR_STATUSES_440 = new Set([WorkflowStatus.WAITING_DOCTOR, WorkflowStatus.UNDER_DOCTOR]);
export const NURSE_STATUSES_440 = new Set([WorkflowStatus.WAITING_NURSE, WorkflowStatus.NURSING]);
export const DISCHARGE_STATUSES_440 = new Set([WorkflowStatus.READY_DISCHARGE, WorkflowStatus.WAITING_PAYMENT, WorkflowStatus.SETTLING]);

const STATUS_LABELS = {
  [WorkflowStatus.PATIENT_SELECTED]: 'انتخاب بیمار',
  [WorkflowStatus.PATIENT_CONFIRMED]: 'تأیید مشخصات بیمار',
  [WorkflowStatus.RECEPTION_SERVICE]: 'ثبت خدمات اولیه',
  [WorkflowStatus.RECEPTION_REVIEW]: 'بازگشت به پذیرش برای اصلاح',
  [WorkflowStatus.WAITING_DOCTOR]: 'در انتظار پزشک',
  [WorkflowStatus.UNDER_DOCTOR]: 'در حال ویزیت پزشک',
  [WorkflowStatus.WAITING_NURSE]: 'در انتظار پرستار',
  [WorkflowStatus.NURSING]: 'در حال دریافت خدمات پرستاری',
  [WorkflowStatus.READY_DISCHARGE]: 'در انتظار ترخیص',
  [WorkflowStatus.WAITING_PAYMENT]: 'منتظر تسویه',
  [WorkflowStatus.SETTLING]: 'در حال تسویه',
  [WorkflowStatus.DISCHARGED]: 'ترخیص‌شده',
  [WorkflowStatus.COMPLETED]: 'تکمیل‌شده',
  [WorkflowStatus.CANCELLED]: 'لغوشده',
};

export function workflowStatusLabel440(status) { return STATUS_LABELS[status] || status || 'نامشخص'; }

export function stageForStatus440(status) {
  if (RECEPTION_STATUSES_440.has(status)) return 'reception';
  if (DOCTOR_STATUSES_440.has(status)) return 'doctor';
  if (NURSE_STATUSES_440.has(status)) return 'nurse';
  if (DISCHARGE_STATUSES_440.has(status)) return 'discharge';
  if (FINAL_STATUSES_440.has(status)) return 'closed';
  return 'reception';
}

export function canRoleOperateStage440(user, stage) {
  if (!user) return false;
  if (userHasRole(user, 'admin') || String(user.role || '').toLowerCase() === 'admin') return true;
  const roles = [user.role, ...(user.roles || [])].filter(Boolean).map(x => String(x).toLowerCase());
  if (stage === 'doctor') return userHasRole(user, 'doctor');
  if (stage === 'nurse') return userHasRole(user, 'nurse') || roles.some(r => r.includes('operating_room_supervisor'));
  if (stage === 'reception' || stage === 'discharge') return roles.some(r => ['cashier','accountant','receptionist','secretary','front_desk','پذیرش','منشی','صندوق'].some(x => r.includes(x)));
  return false;
}

export function actorSnapshot440(user = {}) {
  return {
    userId: user.id || '',
    userName: getUserDisplayName(user),
    userRole: user.role || '',
  };
}

function actionKeyExists(item, actionKey) {
  if (!actionKey) return false;
  return (item?.idempotencyKeys || []).includes(actionKey);
}

export function makeActionKey440(prefix, itemId, extra = '') {
  return `${prefix}:${String(itemId || 'new')}:${String(extra || '')}`;
}

export function appendEncounterAudit440(item = {}, type, message, user, meta = {}) {
  const at = new Date().toISOString();
  const actor = actorSnapshot440(user);
  const entry = {
    id: `enc-audit-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    type,
    message,
    at,
    ...actor,
    previousValue: meta.previousValue ?? null,
    newValue: meta.newValue ?? null,
    reason: meta.reason || '',
    fromStatus: meta.fromStatus || item.status || '',
    toStatus: meta.toStatus || item.status || '',
    entityType: meta.entityType || 'encounter',
    entityId: meta.entityId || item.id || '',
    ...meta.extra,
  };
  return { ...item, encounterAudit: [...(item.encounterAudit || []), entry] };
}

export function transitionEncounter440(item = {}, nextStatus, user, { reason = '', action = '', patch = {}, actionKey = '', allowSame = false } = {}) {
  if (!item?.id) throw new Error('پرونده مراجعه معتبر نیست.');
  if (!nextStatus) throw new Error('مرحله مقصد مشخص نشده است.');
  if (FINAL_STATUSES_440.has(item.status) && !['reception_review'].includes(nextStatus)) throw new Error('پرونده بسته است و برای تغییر باید ابتدا بازگشایی مجاز انجام شود.');
  if (!allowSame && String(item.status) === String(nextStatus)) return item;
  if (actionKeyExists(item, actionKey)) return item;
  const at = new Date().toISOString();
  const actor = actorSnapshot440(user);
  const event = {
    ...createWorkflowEvent(nextStatus, action || `انتقال به ${workflowStatusLabel440(nextStatus)}`, user, {
      fromStatus: item.status || '',
      toStatus: nextStatus,
      reason,
      schema: WORKFLOW_SCHEMA_440,
    }),
    ...actor,
  };
  let next = {
    ...item,
    ...patch,
    status: nextStatus,
    lastWorkflowStatus: nextStatus,
    lastWorkflowAt: at,
    workflowSchema: WORKFLOW_SCHEMA_440,
    workflowHistory: [...(item.workflowHistory || []), event],
    idempotencyKeys: actionKey ? [...(item.idempotencyKeys || []).filter(k => k !== actionKey).slice(-39), actionKey] : (item.idempotencyKeys || []),
  };
  next = appendEncounterAudit440(next, 'workflow_transition', event.action, user, {
    previousValue: item.status || '',
    newValue: nextStatus,
    reason,
    fromStatus: item.status || '',
    toStatus: nextStatus,
  });
  return next;
}

export function returnEncounter440(item = {}, targetStatus, user, reason = '') {
  if (!String(reason || '').trim()) throw new Error('ثبت دلیل بازگشت بیمار الزامی است.');
  return transitionEncounter440(item, targetStatus, user, {
    reason: String(reason).trim(),
    action: `بازگرداندن بیمار به ${workflowStatusLabel440(targetStatus)}`,
    patch: {
      returnedFromStage: stageForStatus440(item.status),
      returnReason: String(reason).trim(),
      returnSuggestedStatus: targetStatus,
      returnedAt: new Date().toISOString(),
    },
    actionKey: makeActionKey440('return', item.id, `${item.status}->${targetStatus}:${String(reason).trim()}`),
  });
}

export function previousStageStatus440(item = {}) {
  const history = item.workflowHistory || [];
  const current = item.status;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const from = history[i]?.fromStatus;
    if (from && from !== current && !FINAL_STATUSES_440.has(from)) return from;
  }
  if (DOCTOR_STATUSES_440.has(current)) return WorkflowStatus.RECEPTION_REVIEW;
  if (NURSE_STATUSES_440.has(current)) return WorkflowStatus.WAITING_DOCTOR;
  if (DISCHARGE_STATUSES_440.has(current)) return WorkflowStatus.WAITING_NURSE;
  return WorkflowStatus.RECEPTION_REVIEW;
}

export function activeQueueInvariant440(queue = []) {
  const seen = new Map();
  const duplicates = [];
  for (const item of queue || []) {
    if (!item || FINAL_STATUSES_440.has(item.status)) continue;
    const patient = String(item.patientId || '').trim();
    if (!patient) continue;
    if (seen.has(patient)) duplicates.push({ patientId: patient, firstId: seen.get(patient), secondId: item.id });
    else seen.set(patient, item.id);
  }
  return { ok: duplicates.length === 0, duplicates };
}

export function queuedOnlyInStage440(queue = [], stage) {
  return (queue || []).filter(item => !FINAL_STATUSES_440.has(item.status) && stageForStatus440(item.status) === stage);
}
