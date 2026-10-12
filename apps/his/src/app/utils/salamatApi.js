export async function checkSalamatEligibility(nationalId, config) {
    try {
        const res = await fetch('/api/salamat/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nationalId: nationalId.trim(), environment: config?.environment || 'production' }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.eligibility)
            return data.eligibility;
        return { deserved: false, nationalId, fullName: '', insuranceBoxName: '', coveragePercent: 0, validUntilJalali: '', statusMessage: data.error || 'پاسخ معتبر از سرویس بیمه سلامت دریافت نشد.', inquiryDate: new Date().toISOString() };
    }
    catch (e) {
        return { deserved: false, nationalId, fullName: '', insuranceBoxName: '', coveragePercent: 0, validUntilJalali: '', statusMessage: 'عدم امکان اتصال به سرویس بیمه سلامت: ' + e.message, inquiryDate: new Date().toISOString() };
    }
}
