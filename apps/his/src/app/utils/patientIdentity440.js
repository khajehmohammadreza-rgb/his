function txt(v) { return String(v ?? '').trim(); }
function firstNonBlank(...values) { for (const value of values) { const out = txt(value); if (out) return out; } return ''; }

export function resolvePatientRecord(item = {}, patients = []) {
  const id = txt(item.patientId || item.patient?.id);
  if (id) { const byId = patients.find(p => txt(p?.id) === id); if (byId) return byId; }
  const code = txt(item.patientCode || item.fileNumber || item.patient?.fileNumber);
  if (code) { const byCode = patients.find(p => txt(p?.fileNumber || p?.patientCode) === code); if (byCode) return byCode; }
  const national = txt(item.nationalId || item.patient?.nationalId);
  if (national) { const byNational = patients.find(p => txt(p?.nationalId) === national); if (byNational) return byNational; }
  return item.patient && typeof item.patient === 'object' ? item.patient : null;
}

export function resolvePatientName(item = {}, patients = []) {
  const p = resolvePatientRecord(item, patients);
  return firstNonBlank(item.patientName, item.fullName, p?.fullName, p?.name, `${p?.firstName || ''} ${p?.lastName || ''}`) || 'بیمار بدون نام';
}

export function resolvePatientCode(item = {}, patients = []) {
  const p = resolvePatientRecord(item, patients);
  return firstNonBlank(item.patientCode, item.fileNumber, p?.fileNumber, p?.patientCode) || '—';
}

export function resolvePatientNationalId(item = {}, patients = []) {
  const p = resolvePatientRecord(item, patients);
  return firstNonBlank(item.nationalId, p?.nationalId);
}

export function resolvePatientAge(item = {}, patients = []) {
  const p = resolvePatientRecord(item, patients);
  const direct = Number(item.age ?? p?.age);
  if (Number.isFinite(direct) && direct >= 0 && direct <= 130) return direct || null;
  const birth = p?.birthDate || p?.dateOfBirth;
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

export function enrichQueuePatient(item = {}, patients = []) {
  const p = resolvePatientRecord(item, patients);
  return {
    ...item,
    patientName: resolvePatientName(item, patients),
    patientCode: resolvePatientCode(item, patients),
    nationalId: resolvePatientNationalId(item, patients),
    age: resolvePatientAge(item, patients),
    patient: p || item.patient,
  };
}

export function enrichQueuePatients(items = [], patients = []) { return items.map(item => enrichQueuePatient(item, patients)); }
