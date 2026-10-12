import { getActiveCenterId, getUserDisplayName } from './clinicalWorkflow.js?b=r24-514-1405';

function text(value) {
  return String(value ?? '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
}
function keyText(value) { return text(value).toLowerCase(); }
function array(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function firstArray(source, keys) {
  for (const key of keys) if (Array.isArray(source?.[key])) return source[key];
  return [];
}
function identity(row, kind = 'generic') {
  if (!row) return '';
  const id = row.id || row.userId || row.code || row.barcode || row.username;
  if (id) return `id:${keyText(id)}`;
  if (kind === 'user') return `u:${keyText(row.username || getUserDisplayName(row))}`;
  if (kind === 'service') return `s:${keyText(row.title || row.name)}`;
  if (kind === 'product') return `p:${keyText(row.barcode || row.code || row.name || row.title)}`;
  return `x:${keyText(row.name || row.title)}`;
}
function mergeRows(localRows = [], remoteRows = [], kind = 'generic') {
  const map = new Map();
  for (const row of array(localRows)) {
    const k = identity(row, kind);
    if (k) map.set(k, { ...row });
  }
  for (const row of array(remoteRows)) {
    const k = identity(row, kind);
    if (!k) continue;
    map.set(k, { ...(map.get(k) || {}), ...row });
  }
  return [...map.values()];
}
function samePerson(a, b) {
  if (!a || !b) return false;
  const pairs = [
    [a.id, b.userId], [a.id, b.id], [a.userId, b.userId],
    [a.username, b.username], [a.username, b.userName],
  ];
  if (pairs.some(([x, y]) => x && y && keyText(x) === keyText(y))) return true;
  const an = keyText(getUserDisplayName(a));
  const bn = keyText(getUserDisplayName(b) || b.userName || b.staffName);
  return Boolean(an && bn && an === bn);
}
function roleHints(row = {}) {
  return [
    row.role, row.staffRole, row.clinicalRole, row.jobRole, row.position,
    row.jobTitle, row.profession, row.professionalRole, row.departmentRole,
    ...(Array.isArray(row.roles) ? row.roles : []),
    ...(Array.isArray(row.assignedRoles) ? row.assignedRoles : []),
  ].filter(Boolean);
}
function profileAsUser(row = {}, forcedRole = '', centerId = getActiveCenterId()) {
  const id = row.userId || row.user_id || row.id || row.username || '';
  const name = getUserDisplayName(row) || row.userName || row.staffName || row.doctorName || '';
  if (!id && !name) return null;
  const role = forcedRole || row.role || row.staffRole || row.clinicalRole || row.jobRole || '';
  return {
    ...row,
    id: id || `profile-${keyText(name).replace(/\s+/g, '-')}`,
    name,
    username: row.username || row.userName || '',
    centerId: row.centerId || row.center_id || centerId || '',
    role: role || 'staff',
    active: row.active !== false && row.status !== 'inactive' && row.status !== 'disabled',
  };
}

export function mergeClinicalUsers(users = [], doctors = [], staffAccounts = [], centerId = getActiveCenterId()) {
  const staff = array(staffAccounts);
  const doctorProfiles = array(doctors);
  const candidates = array(users).map((u) => ({ ...u }));

  // Legacy centers may have a personnel/doctor profile whose linked user row is
  // incomplete. Add it as a candidate only when there is no matching user; the
  // matcher below then collapses everything back to one clinical identity.
  for (const row of staff) {
    if (candidates.some((user) => samePerson(user, row))) continue;
    const candidate = profileAsUser(row, '', centerId);
    if (candidate) candidates.push(candidate);
  }
  for (const row of doctorProfiles) {
    if (candidates.some((user) => samePerson(user, row))) continue;
    const candidate = profileAsUser(row, 'doctor', centerId);
    if (candidate) candidates.push(candidate);
  }

  const output = candidates.map((user) => {
    const account = staff.find((row) => samePerson(user, row)) || null;
    const doctor = doctorProfiles.find((row) => samePerson(user, row)) || null;
    const roles = new Set([
      ...roleHints(user).map(keyText),
      ...(account ? roleHints(account).map(keyText) : []),
    ].filter(Boolean));
    if (doctor) roles.add('doctor');
    const accountRoleText = [...roles].join(' ');
    if (/پزشک|دکتر|doctor|physician/.test(accountRoleText)) roles.add('doctor');
    if (/پرستار|دستیار|nurse|assistant|nursing/.test(accountRoleText)) roles.add('nurse');
    return {
      ...user,
      centerId: user.centerId || user.center_id || centerId || '',
      roles: [...new Set([...(Array.isArray(user.roles) ? user.roles : []), ...roles])],
      financialAccount: account || user.financialAccount || null,
      doctorProfile: doctor || user.doctorProfile || null,
    };
  });

  // De-duplicate again because some old data sets use a profile id different from
  // the user id but have the same normalized display name. Prefer the real user.
  const deduped = [];
  for (const row of output) {
    const existingIndex = deduped.findIndex((item) => samePerson(item, row));
    if (existingIndex < 0) deduped.push(row);
    else deduped[existingIndex] = { ...row, ...deduped[existingIndex], roles: [...new Set([...(row.roles || []), ...(deduped[existingIndex].roles || [])])], financialAccount: deduped[existingIndex].financialAccount || row.financialAccount, doctorProfile: deduped[existingIndex].doctorProfile || row.doctorProfile };
  }
  return deduped;
}

function getCenterToken() {
  try {
    return sessionStorage.getItem('bastiyan_center_token') || sessionStorage.getItem('bastian_center_token') || '';
  } catch { return ''; }
}

export async function loadAuthoritativeClinicalContext({
  users = [], staffAccounts = [], doctors = [], medicalServices = [], products = [], centerId = getActiveCenterId(),
} = {}) {
  const fallbackUsers = mergeClinicalUsers(users, doctors, staffAccounts, centerId);
  const fallback = {
    centerId: centerId || '', center: null, revision: null, source: 'memory',
    users: fallbackUsers, staffAccounts: array(staffAccounts), doctors: array(doctors),
    medicalServices: array(medicalServices), products: array(products), error: null,
  };
  if (!centerId || typeof fetch !== 'function') return fallback;
  const token = getCenterToken();
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Bastiyan-Token'] = token;
  }
  try {
    const response = await fetch(`./api/bastian/centers/${encodeURIComponent(centerId)}/state?clinical=${Date.now()}`, {
      method: 'GET', credentials: 'same-origin', cache: 'no-store', headers,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const state = payload?.state && typeof payload.state === 'object' ? payload.state : {};
    const remoteUsers = firstArray(state, ['users', 'centerUsers', 'personnelUsers']);
    const remoteStaff = firstArray(state, ['staffAccounts', 'staff', 'personnelAccounts']);
    const remoteDoctors = firstArray(state, ['doctors', 'doctorProfiles']);
    const remoteServices = firstArray(state, ['medicalServices', 'services', 'serviceTariffs']);
    const remoteProducts = firstArray(state, ['products', 'inventoryProducts', 'items']);
    const mergedStaff = mergeRows(staffAccounts, remoteStaff, 'user');
    const mergedDoctors = mergeRows(doctors, remoteDoctors, 'user');
    const mergedUsers = mergeRows(users, remoteUsers, 'user');
    return {
      centerId: String(payload?.center?.id || centerId),
      center: payload?.center || state?.medicalCenters?.[0] || null,
      revision: Number.isFinite(Number(payload?.revision)) ? Number(payload.revision) : null,
      source: 'database',
      users: mergeClinicalUsers(mergedUsers, mergedDoctors, mergedStaff, String(payload?.center?.id || centerId)),
      staffAccounts: mergedStaff,
      doctors: mergedDoctors,
      medicalServices: mergeRows(medicalServices, remoteServices, 'service'),
      products: mergeRows(products, remoteProducts, 'product'),
      error: null,
    };
  } catch (error) {
    return { ...fallback, error: error?.message || 'خطا در دریافت اطلاعات مرکز' };
  }
}
