import { OFFICIAL_KAVENEGAR_TEMPLATES } from '../config/kavenegar.js?b=r24-514-1405';
import { validateIranianMobile } from '../utils/smsValidator.js?b=r24-514-1405';
import { getSmsLogs } from '../db/smsLogDb.js?b=r24-514-1405';
export { OFFICIAL_KAVENEGAR_TEMPLATES };
function cleanToken(v) { if (v === undefined || v === null)
    return undefined; const s = String(v).trim(); return s ? s.replace(/\s+/g, '-') : undefined; }
async function jsonRequest(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.success)
        throw Object.assign(new Error(d.message || d.error || `HTTP ${r.status}`), { status: r.status, data: d });
    return d;
}
class KavenegarService {
    async Send(params) {
        const t = OFFICIAL_KAVENEGAR_TEMPLATES[params.templateName];
        if (!t || !t.enabled)
            return { status: false, success: false, message: 'قالب پیامک معتبر یا فعال نیست.', kavenegar_code: 405 };
        const d = params.data || {};
        return this.sendVerifySMS({ mobile: params.mobile, template: params.templateName, token: d.token ?? d.patientName ?? d.userName ?? d.name ?? '', token2: d.token2 ?? d.doctorName ?? d.otpCode ?? d.resetCode ?? d.amount ?? d.code, token3: d.token3 ?? d.visitDate ?? d.expireMinutes ?? d.paymentUrl ?? d.minutes, token10: d.token10, moduleName: params.moduleName, userName: params.userName });
    }
    async sendVerifySMS(params) {
        const v = validateIranianMobile(params.mobile);
        if (!v.isValid)
            return { status: false, success: false, message: v.error || 'شماره موبایل معتبر نیست.', kavenegar_code: 411 };
        if (!params.token)
            return { status: false, success: false, message: 'کد ورودی پیامک الزامی است.', kavenegar_code: 400 };
        try {
            const d = await jsonRequest('/api/sms/verify', { mobile: v.normalizedMobile, token: cleanToken(params.token), template: params.template, token2: cleanToken(params.token2), token3: cleanToken(params.token3), token10: cleanToken(params.token10), token20: cleanToken(params.token20) });
            return { status: true, success: true, message: d.message || 'پیامک ارسال شد.', kavenegar_code: d.kavenegar_code || 200, entries: d.entries || [] };
        }
        catch (e) {
            return { status: false, success: false, message: e.message || 'ارسال پیامک انجام نشد.', kavenegar_code: e.data?.kavenegar_code || e.status || 500, error: e.message };
        }
    }
    async sendSMS(params) {
        const v = validateIranianMobile(params.mobile);
        if (!v.isValid)
            return { status: false, success: false, message: v.error || 'شماره موبایل معتبر نیست.', kavenegar_code: 411 };
        if (!params.message?.trim())
            return { status: false, success: false, message: 'متن پیامک خالی است.', kavenegar_code: 400 };
        try {
            const d = await jsonRequest('/api/sms/send', { mobile: v.normalizedMobile, message: params.message, sender: params.sender || undefined });
            return { status: true, success: true, message: d.message || 'پیامک ارسال شد.', kavenegar_code: d.kavenegar_code || 200, entries: d.entries || [] };
        }
        catch (e) {
            return { status: false, success: false, message: e.message || 'ارسال پیامک انجام نشد.', kavenegar_code: e.data?.kavenegar_code || e.status || 500, error: e.message };
        }
    }
    async getLogs(limit = 100, mobileFilter) { return await getSmsLogs(limit, mobileFilter); }
}
export const kavenegarService = new KavenegarService();
export default kavenegarService;
