export function isValidIranianNationalId(code) { if (!code || code.length !== 10 || !/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code))
    return false; const check = parseInt(code[9], 10); let sum = 0; for (let i = 0; i < 9; i++)
    sum += parseInt(code[i], 10) * (10 - i); const r = sum % 11; return (r < 2 && check === r) || (r >= 2 && check === 11 - r); }
export async function queryPatientIdentity(request) {
    const nationalId = request.nationalId.trim(), mobilePhone = request.mobilePhone.trim();
    if (!isValidIranianNationalId(nationalId))
        return { success: false, message: 'کد ملی معتبر نیست.', errorCode: 'INVALID_NATIONAL_ID' };
    try {
        const res = await fetch('/api/identity/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId, mobilePhone }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.success)
            return { success: false, message: d.message || d.error || 'سرویس استعلام هویت در دسترس نیست.', errorCode: res.status === 503 ? 'DISABLED_IN_SETTINGS' : 'SERVICE_UNAVAILABLE' };
        const p = d.patientData || d;
        return { success: true, message: d.message || 'استعلام هویت انجام شد.', firstName: p.firstName, lastName: p.lastName, fullName: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' '), fatherName: p.fatherName, insuranceInfo: p.insuranceInfo };
    }
    catch (e) {
        return { success: false, message: 'عدم امکان اتصال به درگاه استعلام: ' + e.message, errorCode: 'NETWORK_ERROR' };
    }
}
