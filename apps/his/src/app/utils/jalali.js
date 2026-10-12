/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Helper utility for converting Gregorian dates to Jalali (Shamsi) and formatting text
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export function toPersianDigits(str) {
    if (str === undefined || str === null)
        return '';
    const val = String(str);
    return val.replace(/\d/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}
export function toEnglishDigits(str) {
    if (str === undefined || str === null)
        return '';
    let val = String(str);
    for (let i = 0; i < 10; i++) {
        val = val.replace(new RegExp(PERSIAN_DIGITS[i], 'g'), ENGLISH_DIGITS[i]);
    }
    return val;
}
/**
 * Gregorian to Jalali converter algorithm
 */
export function gregorianToJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * (Math.floor(days / 1461));
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let jm;
    let jd;
    if (days < 186) {
        jm = 1 + Math.floor(days / 31);
        jd = 1 + (days % 31);
    }
    else {
        jm = 7 + Math.floor((days - 186) / 30);
        jd = 1 + ((days - 186) % 30);
    }
    return { jy, jm, jd };
}
export function getJalaliDateString(dateObj = new Date()) {
    const gy = dateObj.getFullYear();
    const gm = dateObj.getMonth() + 1;
    const gd = dateObj.getDate();
    const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
    const mm = jm < 10 ? `0${jm}` : `${jm}`;
    const dd = jd < 10 ? `0${jd}` : `${jd}`;
    return `${jy}/${mm}/${dd}`;
}
export const JALALI_MONTH_NAMES = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
];
export const JALALI_WEEKDAYS = [
    { short: 'ش', full: 'شنبه' },
    { short: 'ی', full: 'یکشنبه' },
    { short: 'د', full: 'دوشنبه' },
    { short: 'س', full: 'سه‌شنبه' },
    { short: 'چ', full: 'چهارشنبه' },
    { short: 'پ', full: 'پنج‌شنبه' },
    { short: 'ج', full: 'جمعه' },
];
/**
 * Jalali to Gregorian converter algorithm
 */
export function jalaliToGregorian(jy, jm, jd) {
    const jy1 = jy - 979;
    let gy = 1600;
    let days = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor(((jy1 % 33) + 3) / 4);
    for (let i = 0; i < jm - 1; ++i) {
        days += (i < 6) ? 31 : 30;
    }
    days += jd - 1;
    gy += 400 * Math.floor(days / 146097);
    days %= 146097;
    let leap = true;
    if (days >= 36525) {
        days--;
        gy += 100 * Math.floor(days / 36524);
        days %= 36524;
        if (days >= 365)
            days++;
        else
            leap = false;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days >= 366) {
        leap = false;
        days--;
        gy += Math.floor(days / 365);
        days %= 365;
    }
    const g_d_m = [0, 31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    while (days >= g_d_m[gm]) {
        days -= g_d_m[gm];
        gm++;
    }
    const gd = days + 1;
    return { gy, gm, gd };
}
/**
 * Check if Jalali year is a leap year
 */
export function isJalaliLeapYear(jy) {
    const g1 = jalaliToGregorian(jy, 1, 1);
    const g2 = jalaliToGregorian(jy + 1, 1, 1);
    const d1 = new Date(g1.gy, g1.gm - 1, g1.gd).getTime();
    const d2 = new Date(g2.gy, g2.gm - 1, g2.gd).getTime();
    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diffDays === 366;
}
/**
 * Get total days in a Jalali month
 */
export function getDaysInJalaliMonth(jy, jm) {
    if (jm >= 1 && jm <= 6)
        return 31;
    if (jm >= 7 && jm <= 11)
        return 30;
    if (jm === 12)
        return isJalaliLeapYear(jy) ? 30 : 29;
    return 30;
}
/**
 * Get Persian Day of Week for a Jalali date (0 = Shanbeh, 1 = Yekshanbeh, ..., 6 = Jomeh)
 */
export function getJalaliDayOfWeek(jy, jm, jd) {
    const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
    const d = new Date(gy, gm - 1, gd);
    const jsDay = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    return (jsDay + 1) % 7;
}
/**
 * Parse Jalali string e.g. "1405/05/01" or "۱۴۰۵/۰۵/۰۱" into numbers
 */
export function parseJalaliDate(jalaliStr) {
    const clean = toEnglishDigits(jalaliStr).trim();
    // Check if it's 8 consecutive digits like 13710223
    if (/^\d{8}$/.test(clean)) {
        const jy = parseInt(clean.substring(0, 4), 10);
        const jm = Math.min(12, Math.max(1, parseInt(clean.substring(4, 6), 10)));
        const jd = Math.min(getDaysInJalaliMonth(jy, jm), Math.max(1, parseInt(clean.substring(6, 8), 10)));
        return { jy, jm, jd };
    }
    const parts = clean.split(/[/.-]/);
    const now = getJalaliDateString();
    if (parts.length < 3) {
        const todayJalali = parseJalaliDate(now);
        return todayJalali;
    }
    const jy = parseInt(parts[0], 10) || 1405;
    const jm = Math.min(12, Math.max(1, parseInt(parts[1], 10) || 1));
    const maxDays = getDaysInJalaliMonth(jy, jm);
    const jd = Math.min(maxDays, Math.max(1, parseInt(parts[2], 10) || 1));
    return { jy, jm, jd };
}
export function formatTypedJalaliInput(inputStr) {
    const clean = toEnglishDigits(inputStr).trim();
    if (!clean)
        return '';
    // If 8 digits like 13710223
    if (/^\d{8}$/.test(clean)) {
        const jy = clean.substring(0, 4);
        const jm = clean.substring(4, 6);
        const jd = clean.substring(6, 8);
        return toPersianDigits(`${jy}/${jm}/${jd}`);
    }
    try {
        const { jy, jm, jd } = parseJalaliDate(clean);
        return formatJalaliDate(jy, jm, jd, true);
    }
    catch {
        return inputStr;
    }
}
/**
 * Format Jalali date into string (e.g., "1405/05/01" or "۱۴۰۵/۰۵/۰۱")
 */
export function formatJalaliDate(jy, jm, jd, convertToPersianDigits = true) {
    const mm = jm < 10 ? `0${jm}` : `${jm}`;
    const dd = jd < 10 ? `0${jd}` : `${jd}`;
    const str = `${jy}/${mm}/${dd}`;
    return convertToPersianDigits ? toPersianDigits(str) : str;
}
/**
 * Add / subtract days to a Jalali date string
 */
export function addDaysToJalali(jalaliStr, days) {
    const { jy, jm, jd } = parseJalaliDate(jalaliStr);
    const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
    const d = new Date(gy, gm - 1, gd);
    d.setDate(d.getDate() + days);
    const { jy: ny, jm: nm, jd: nd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return formatJalaliDate(ny, nm, nd, true);
}
export function getJalaliDateTimeString(dateObj = new Date()) {
    const dateStr = getJalaliDateString(dateObj);
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${dateStr} - ${hours}:${minutes}`;
}
export function formatCurrency(amount, currencyUnit = 'toman') {
    const num = Number(amount ?? 0);
    if (isNaN(num))
        return '۰ تومان';
    const displayVal = currencyUnit === 'rial' ? num * 10 : num;
    const formatted = (displayVal || 0).toLocaleString('fa-IR');
    const label = currencyUnit === 'rial' ? 'ریال' : 'تومان';
    return `${toPersianDigits(formatted)} ${label}`;
}
export function formatNumber(num) {
    const val = Number(num ?? 0);
    if (isNaN(val))
        return '۰';
    return toPersianDigits((val || 0).toLocaleString('fa-IR'));
}
export function numberToPersianWords(num) {
    if (!num || num === 0)
        return 'صفر';
    if (num < 0)
        return 'منفی ' + numberToPersianWords(Math.abs(num));
    const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
    const dahha = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
    const dahYek = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
    const sadha = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
    const pasvand = ['', ' هزار', ' میلیون', ' میلیارد', ' تریلیون'];
    function convertThreeDigits(n) {
        let result = '';
        const sad = Math.floor(n / 100);
        const dah = Math.floor((n % 100) / 10);
        const yek = n % 10;
        if (sad > 0) {
            result += sadha[sad];
        }
        if (dah === 1) {
            if (result)
                result += ' و ';
            result += dahYek[yek];
        }
        else {
            if (dah > 0) {
                if (result)
                    result += ' و ';
                result += dahha[dah];
            }
            if (yek > 0) {
                if (result)
                    result += ' و ';
                result += yekan[yek];
            }
        }
        return result;
    }
    const parts = [];
    let temp = Math.floor(num);
    let i = 0;
    while (temp > 0) {
        const chunk = temp % 1000;
        if (chunk > 0) {
            const chunkWords = convertThreeDigits(chunk);
            parts.unshift(chunkWords + pasvand[i]);
        }
        temp = Math.floor(temp / 1000);
        i++;
    }
    return parts.join(' و ');
}
/**
 * Calculate age in years from Jalali birth date string (e.g. "1370/05/12" or "1370")
 */
export function calculateAgeFromJalali(birthDateStr, baseDate = getJalaliDateString()) {
    if (!birthDateStr)
        return undefined;
    const cleanStr = toEnglishDigits(birthDateStr).trim();
    const match = cleanStr.match(/^(\d{4})/);
    if (!match)
        return undefined;
    const birthYear = parseInt(match[1], 10);
    if (isNaN(birthYear) || birthYear < 1250 || birthYear > 1500)
        return undefined;
    const currentJalaliStr = baseDate || getJalaliDateString();
    const currentYear = parseInt(toEnglishDigits(String(currentJalaliStr)).split('/')[0], 10);
    let age = currentYear - birthYear;
    // When a full date is provided, reduce one year when birthday has not occurred yet.
    if (cleanStr.includes('/')) {
        try {
            const parts = cleanStr.split('/').map(Number);
            const baseParts = toEnglishDigits(String(baseDate || getJalaliDateString())).split('/').map(Number);
            if (parts.length >= 3 && baseParts.length >= 3 && (baseParts[1] < parts[1] || (baseParts[1] === parts[1] && baseParts[2] < parts[2]))) age -= 1;
        } catch {}
    }
    return age >= 0 ? age : undefined;
}
/**
 * Calculate an exact Jalali birth date from an age, using today's month/day by default.
 * This intentionally assumes the patient has just had their birthday when only age is supplied.
 */
export function calculateBirthDateFromAge(ageYears, baseDate = getJalaliDateString()) {
    const clean = toEnglishDigits(String(ageYears ?? '')).trim();
    const match = clean.match(/\d+/);
    const age = match ? Number(match[0]) : NaN;
    if (!Number.isFinite(age) || age < 0 || age > 130) return '';
    const parts = toEnglishDigits(String(baseDate || getJalaliDateString())).split('/').map(Number);
    const jy = Number(parts[0]), jm = Number(parts[1]), jd = Number(parts[2]);
    if (!jy || !jm || !jd) return '';
    const by = jy - age;
    const last = getDaysInJalaliMonth(by, jm);
    return `${by}/${String(jm).padStart(2,'0')}/${String(Math.min(jd,last)).padStart(2,'0')}`;
}
/**
 * Calculate approximate Jalali birth date string from age in years (e.g. 35 -> "1370/01/01")
 */
export function calculateBirthYearFromAge(ageYears) {
    const currentJalaliStr = getJalaliDateString();
    const currentYear = parseInt(currentJalaliStr.split('/')[0], 10);
    const birthYear = currentYear - Math.max(0, ageYears);
    return `${birthYear}/01/01`;
}
