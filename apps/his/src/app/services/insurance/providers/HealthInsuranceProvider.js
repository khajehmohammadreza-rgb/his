export class HealthInsuranceProvider {
    async getToken() { throw new Error('توکن بیمه سلامت در مرورگر تولید نمی‌شود؛ اتصال باید از سرویس واقعی انجام شود.'); }
    async refreshToken() { return this.getToken(); }
    async checkEligibility(nationalCode) {
        try {
            const response = await fetch('/api/salamat/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId: nationalCode, environment: 'production' }) });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success || !data.eligibility)
                throw new Error(data.error || `HTTP ${response.status}`);
            return { active: !!data.eligibility.deserved, insuranceName: data.eligibility.insuranceBoxName || 'بیمه سلامت ایران', bookletNumber: data.eligibility.insuranceBookletNumber, expireDate: data.eligibility.validUntilJalali, patientName: data.eligibility.fullName, coveragePercent: Number(data.eligibility.coveragePercent || 0), message: data.eligibility.statusMessage || 'پاسخ استعلام دریافت شد.', inquiryDate: new Date().toISOString(), rawResponse: data };
        }
        catch (err) {
            return { active: false, insuranceName: 'بیمه سلامت ایران', coveragePercent: 0, message: 'نتیجه معتبر از سرویس بیمه سلامت دریافت نشد: ' + (err?.message || 'خطای ارتباط'), inquiryDate: new Date().toISOString() };
        }
    }
}
