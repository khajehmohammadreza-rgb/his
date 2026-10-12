export class TaminInsuranceProvider {
    async getToken() { throw new Error('توکن تأمین اجتماعی باید از مسیر احراز هویت رسمی در پنل نسخه‌نویسی دریافت شود.'); }
    async refreshToken() { return this.getToken(); }
    async checkEligibility(nationalCode) {
        try {
            const response = await fetch('/api/tamin/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId: nationalCode }) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success || !data.eligibility)
                throw new Error(data.error || `HTTP ${response.status}`);
            return { active: !!data.eligibility.deserved, insuranceName: 'بیمه تأمین اجتماعی', bookletNumber: data.eligibility.insuranceBookletNumber, expireDate: data.eligibility.validUntilJalali, patientName: data.eligibility.fullName, coveragePercent: Number(data.eligibility.coveragePercent || 0), message: data.eligibility.message || data.eligibility.statusMessage || 'پاسخ استعلام دریافت شد.', inquiryDate: new Date().toISOString(), rawResponse: data };
        }
        catch (err) {
            return { active: false, insuranceName: 'بیمه تأمین اجتماعی', coveragePercent: 0, message: 'نتیجه معتبر از سرویس تأمین اجتماعی دریافت نشد: ' + (err?.message || 'خطای ارتباط'), inquiryDate: new Date().toISOString() };
        }
    }
}
