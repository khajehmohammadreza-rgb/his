const key = () => `bastian_sms_audit_${localStorage.getItem('bastiyan_current_center_id') || localStorage.getItem('bastian_current_center_id') || 'center'}`;
function read() { try {
    const v = localStorage.getItem(key());
    return v ? JSON.parse(v) : [];
}
catch {
    return [];
} }
function write(v) { try {
    localStorage.setItem(key(), JSON.stringify(v.slice(0, 1000)));
}
catch { } }
export async function insertSmsLog(entry) {
    const row = { id: 'sms_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), created_at: new Date().toISOString(), module: entry.module || 'General', retry_count: entry.retry_count || 0, user: entry.user || 'System', ...entry, error_reason: entry.error_reason || null };
    const rows = read();
    rows.unshift(row);
    write(rows);
    return row;
}
export async function getSmsLogs(limit = 100, mobileFilter) { let rows = read(); if (mobileFilter)
    rows = rows.filter(x => x.mobile.includes(mobileFilter)); return rows.slice(0, limit); }
