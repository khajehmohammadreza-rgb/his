/**
 * Central Insurance Gateway
 * Orchestrates multiple insurance providers (Tamin, Salamat, etc.)
 */
import { TaminInsuranceProvider } from './providers/TaminInsuranceProvider.js?b=r24-514-1405';
import { HealthInsuranceProvider } from './providers/HealthInsuranceProvider.js?b=r24-514-1405';
export class InsuranceGateway {
    constructor() {
        this.taminProvider = new TaminInsuranceProvider();
        this.healthProvider = new HealthInsuranceProvider();
    }
    /**
     * Main unified checkInsurance method supporting multiple insurance types
     */
    async checkInsurance(providerCode, nationalCode, doctorCredentials) {
        const cleanNationalId = nationalCode.trim();
        if (!cleanNationalId || cleanNationalId.length !== 10) {
            throw new Error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
        }
        let result;
        if (providerCode === 'TAMIN') {
            result = await this.taminProvider.checkEligibility(cleanNationalId);
        }
        else if (providerCode === 'SALAMAT') {
            result = await this.healthProvider.checkEligibility(cleanNationalId, doctorCredentials);
        }
        else {
            throw new Error('نوع بیمه انتخاب شده معتبر نیست.');
        }
        // Save response audit log to backend/storage
        await this.saveResponse({
            nationalCode: cleanNationalId,
            providerCode,
            status: result.active ? 'SUCCESS' : 'NO_COVERAGE',
            resultJson: result,
        });
        return result;
    }
    async getToken(providerCode) {
        if (providerCode === 'TAMIN') {
            return this.taminProvider.getToken();
        }
        return this.healthProvider.getToken();
    }
    async refreshToken(providerCode) {
        if (providerCode === 'TAMIN') {
            return this.taminProvider.refreshToken();
        }
        return this.healthProvider.refreshToken();
    }
    async saveResponse(logData) {
        try {
            await fetch('/api/insurance/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...logData,
                    requestDate: new Date().toISOString(),
                }),
            });
        }
        catch (err) {
            // Non-blocking log persistence
            console.warn('[InsuranceGateway] Failed to save audit log to backend:', err);
        }
    }
}
export const insuranceGateway = new InsuranceGateway();
