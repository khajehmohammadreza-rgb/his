// Kavenegar SMS Configuration Module
// Values loaded securely from Environment Variables and official approved templates
export const OFFICIAL_KAVENEGAR_TEMPLATES = {
    HISVERIFY: {
        id: 1508750,
        name: 'HISVERIFY',
        purpose: 'Mobile Verification',
        content: 'کد تایید شما token\nاعتبار token2 دقیقه',
        enabled: true,
        requiredVariables: ['token', 'token2'],
    },
    HISwelcome: {
        id: 1488881,
        name: 'HISwelcome',
        purpose: 'Welcome Message',
        content: 'token عزیز\nبه سامانه خدمات درمانی خوش آمدید.\nاز اعتماد شما سپاسگزاریم.',
        enabled: true,
        requiredVariables: ['token'],
    },
    HISRESET: {
        id: 1508749,
        name: 'HISRESET',
        purpose: 'Password Reset',
        content: 'token عزیز\nکد بازیابی: token2\nاعتبار: token3 دقیقه',
        enabled: true,
        requiredVariables: ['token', 'token2', 'token3'],
    },
    HISINVOICE: {
        id: 1508748,
        name: 'HISINVOICE',
        purpose: 'Invoice',
        content: 'token عزیز\nصورتحساب شما صادر شد.\nمبلغ: token2',
        enabled: true,
        requiredVariables: ['token', 'token2'],
    },
    HISRECEIPT: {
        id: 1508747,
        name: 'HISRECEIPT',
        purpose: 'Payment Receipt',
        content: 'token عزیز\nپرداخت شما با موفقیت انجام شد.\nمبلغ: token2',
        enabled: true,
        requiredVariables: ['token', 'token2'],
    },
    HISPAYMENT: {
        id: 1508746,
        name: 'HISPAYMENT',
        purpose: 'Payment Request',
        content: 'token عزیز\nمبلغ قابل پرداخت: token2\nلینک پرداخت: token3',
        enabled: true,
        requiredVariables: ['token', 'token2', 'token3'],
    },
    HISPRESCRIPTION: {
        id: 1508745,
        name: 'HISPRESCRIPTION',
        purpose: 'Prescription',
        content: 'token عزیز\nنسخه شما توسط token2 ثبت گردید.',
        enabled: true,
        requiredVariables: ['token', 'token2'],
    },
    HISCHECKIN: {
        id: 1508744,
        name: 'HISCHECKIN',
        purpose: 'Patient Check-in',
        content: 'token عزیز\nپذیرش شما انجام شد.\nشماره پرونده: token2\nکد پذیرش: token3',
        enabled: true,
        requiredVariables: ['token', 'token2', 'token3'],
    },
    HISREMINDER: {
        id: 1508743,
        name: 'HISREMINDER',
        purpose: 'Appointment Reminder',
        content: 'یادآوری نوبت token\nپزشک: token2\nتاریخ: token3\nساعت: token4',
        enabled: true,
        requiredVariables: ['token', 'token2', 'token3', 'token4'],
    },
    HISAPPOINT: {
        id: 1508742,
        name: 'HISAPPOINT',
        purpose: 'Appointment Registration',
        content: 'token عزیز\nنوبت شما ثبت شد.\nپزشک: token2\nتاریخ: token3\nساعت: token4\nکد پذیرش: token5',
        enabled: true,
        requiredVariables: ['token', 'token2', 'token3', 'token4', 'token5'],
    },
    HISREGISTER: {
        id: 1508741,
        name: 'HISREGISTER',
        purpose: 'Patient Registration',
        content: 'token عزیز\nثبت‌نام شما با موفقیت انجام شد.\nشماره پرونده: token2',
        enabled: true,
        requiredVariables: ['token', 'token2'],
    },
    HISOTP: {
        id: 1508740,
        name: 'HISOTP',
        purpose: 'Login OTP',
        content: 'token عزیز\nکد ورود شما: token2\nاعتبار: token3 دقیقه',
        enabled: true,
        requiredVariables: ['token', 'token2', 'token3'],
    },
    pay: {
        id: 1503530,
        name: 'pay',
        purpose: 'Simple Payment',
        content: 'مبلغ قابل پرداخت: token',
        enabled: true,
        requiredVariables: ['token'],
    },
    code: {
        id: 1489201,
        name: 'code',
        purpose: 'Website Password Reset',
        content: 'کد بازیابی وب‌سایت: token',
        enabled: true,
        requiredVariables: ['token'],
    },
    'veryfi-code': {
        id: 1489207,
        name: 'veryfi-code',
        purpose: 'Website Verification',
        content: 'کد تایید وب‌سایت: token',
        enabled: true,
        requiredVariables: ['token'],
    },
};
export const KAVENEGAR_CONFIG = {
    apiKey: '',
    sender: '',
    baseUrl: '/api',
    timeout: 10000,
};
export const KAVENEGAR_ERROR_CODES = {
    200: 'درخواست با موفقیت انجام شد',
    400: 'پارامترهای ارسال پیامک صحیح نیست',
    401: 'کلید دسترسی کاوهنگار معتبر نیست',
    402: 'اعتبار پنل پیامکی کافی نیست',
    403: 'دسترسی ارسال پیامک محدود شده است',
    405: 'کد قالب (Template) در کاوهنگار یافت نشد',
    409: 'سرشماره ارسال پیامک معتبر نیست',
    411: 'شماره گیرنده نامعتبر است',
    412: 'ارسال پیامک به این شماره مسدود شده است (بلک‌لیست)',
    414: 'حجم ورودی بیشتر از حد مجاز است',
    417: 'تاریخ ارسال پیامک اشتباه است',
    418: 'اعتبار حساب شما تمام شده است',
    422: 'متن پیامک حاوی کلمات غیرمجاز است',
    431: 'کد ورودی با الگوی قالب مطابقت ندارد',
    500: 'خطای داخلی سرویس کاوهنگار',
};
/**
 * Get human-readable Persian error message from Kavenegar HTTP/API status code
 */
export function getKavenegarErrorMessage(statusCode, defaultMessage) {
    if (KAVENEGAR_ERROR_CODES[statusCode]) {
        return KAVENEGAR_ERROR_CODES[statusCode];
    }
    return defaultMessage || `خطای سرویس پیامک کاوهنگار (کد: ${statusCode})`;
}
