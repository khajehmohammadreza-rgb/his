/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { getJalaliDateString } from './jalali.js?b=r24-514-1405';
/**
 * Checks if the current clinic/center license has expired based on Settings or MedicalCenterNode
 */
export function checkCenterLicense(settings, centerNode) {
    if (!settings) {
        return {
            isExpired: false,
            endDate: 'تعیین نشده',
            reason: 'none',
        };
    }
    // 1. Check explicit license status in settings
    if (settings.licenseStatus === 'expired' || settings.licenseStatus === 'suspended') {
        return {
            isExpired: true,
            endDate: settings.licenseEndDate || centerNode?.endDate || 'تعیین نشده',
            reason: settings.licenseStatus === 'suspended' ? 'status_suspended' : 'status_expired',
        };
    }
    // 2. Check if center node is set to inactive
    if (centerNode && centerNode.active === false) {
        return {
            isExpired: true,
            endDate: centerNode.endDate || 'تعیین نشده',
            reason: 'center_inactive',
        };
    }
    // 3. Determine expiration date string (priority: settings.licenseEndDate -> centerNode.endDate)
    const endDateStr = settings.licenseEndDate || centerNode?.endDate;
    if (!endDateStr || endDateStr === 'نامحدود' || endDateStr === 'unlimited') {
        return {
            isExpired: false,
            endDate: 'نامحدود / دائمی',
            reason: 'none',
        };
    }
    // 4. Compare Jalali or Gregorian Date against current date
    const currentJalali = getJalaliDateString(); // Format: YYYY/MM/DD e.g. "1405/05/10"
    const cleanEndDate = endDateStr.replace(/-/g, '/').trim();
    const cleanCurrentDate = currentJalali.replace(/-/g, '/').trim();
    // If year starts with 13 or 14, compare as Jalali
    if (cleanEndDate.startsWith('13') || cleanEndDate.startsWith('14')) {
        const padDateStr = (str) => {
            const parts = str.split('/');
            if (parts.length === 3) {
                const y = parts[0];
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                return `${y}/${m}/${d}`;
            }
            return str;
        };
        const formattedEnd = padDateStr(cleanEndDate);
        const formattedCurrent = padDateStr(cleanCurrentDate);
        if (formattedCurrent > formattedEnd) {
            return {
                isExpired: true,
                endDate: endDateStr,
                reason: 'expired_date',
            };
        }
    }
    else {
        // Gregorian ISO comparison
        try {
            const endObj = new Date(endDateStr);
            const now = new Date();
            if (!isNaN(endObj.getTime()) && now > endObj) {
                return {
                    isExpired: true,
                    endDate: endDateStr,
                    reason: 'expired_date',
                };
            }
        }
        catch (e) {
            // Ignore invalid date strings
        }
    }
    return {
        isExpired: false,
        endDate: endDateStr,
        reason: 'none',
    };
}
