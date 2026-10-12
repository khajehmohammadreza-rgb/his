/**
 * Iranian Mobile Number Validation & Normalization Utility
 */
export function convertPersianDigitsToEnglish(str) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let result = str;
    for (let i = 0; i < 10; i++) {
        result = result
            .replace(new RegExp(persianDigits[i], 'g'), i.toString())
            .replace(new RegExp(arabicDigits[i], 'g'), i.toString());
    }
    return result;
}
/**
 * Validates and normalizes Iranian mobile numbers.
 * Supports:
 * - 09123456789
 * - +989123456789
 * - 00989123456789
 * - 989123456789
 * - 9123456789
 * - Persian/Arabic digits
 */
export function validateIranianMobile(mobile) {
    if (!mobile) {
        return {
            isValid: false,
            normalizedMobile: '',
            error: 'شماره موبایل الزامی است',
        };
    }
    let cleaned = convertPersianDigitsToEnglish(String(mobile)).trim();
    // Remove spaces, dashes, parentheses
    cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
    // Convert leading +98 or 0098 or 98
    if (cleaned.startsWith('+98')) {
        cleaned = '0' + cleaned.slice(3);
    }
    else if (cleaned.startsWith('0098')) {
        cleaned = '0' + cleaned.slice(4);
    }
    else if (cleaned.startsWith('98') && cleaned.length === 12) {
        cleaned = '0' + cleaned.slice(2);
    }
    else if (!cleaned.startsWith('0') && cleaned.length === 10 && cleaned.startsWith('9')) {
        cleaned = '0' + cleaned;
    }
    // Final check: Must be exactly 11 digits, starting with 09
    const mobileRegex = /^09[0-9]{9}$/;
    if (!mobileRegex.test(cleaned)) {
        return {
            isValid: false,
            normalizedMobile: cleaned,
            error: 'شماره موبایل وارد شده معتبر نمی‌باشد (نمونه معتبر: ۰۹۱۲۳۴۵۶۷۸۹)',
        };
    }
    return {
        isValid: true,
        normalizedMobile: cleaned,
    };
}
