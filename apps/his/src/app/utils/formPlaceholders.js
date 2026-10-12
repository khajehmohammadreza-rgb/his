/**
 * Persian Variable Placeholders and Form Helper Utilities
 */
import { getJalaliDateString } from './jalali.js?b=r24-514-1405';
export const PERSIAN_PLACEHOLDERS = [
    { key: '[اسم بیمار]', label: 'اسم بیمار', description: 'نام و نام خانوادگی بیمار', example: 'بیمار نمونه', category: 'patient' },
    { key: '[نام پدر]', label: 'نام پدر', description: 'نام پدر بیمار', example: 'محمد', category: 'patient' },
    { key: '[کد ملی]', label: 'کد ملی', description: 'کد ملی ۱۰ رقمی بیمار', example: '۰۰۱۲۳۴۵۶۷۸', category: 'patient' },
    { key: '[شماره همراه]', label: 'شماره همراه', description: 'شماره تلفن همراه بیمار', example: '۰۹۱۲۳۴۵۶۷۸۹', category: 'patient' },
    { key: '[کد پرونده]', label: 'کد پرونده', description: 'شماره پرونده اختصاصی بیمار', example: 'CL-10042', category: 'patient' },
    { key: '[سن بیمار]', label: 'سن بیمار', description: 'سن محاسبه شده بیمار', example: '۳۲ سال', category: 'patient' },
    { key: '[جنسیت بیمار]', label: 'جنسیت بیمار', description: 'مرد / زن', example: 'مرد', category: 'patient' },
    { key: '[پزشک معالج]', label: 'پزشک معالج', description: 'نام و نام خانوادگی پزشک معالج', example: 'پزشک معالج مرکز', category: 'treatment' },
    { key: '[نوع خدمت]', label: 'نوع خدمت', description: 'نام خدمت، جراحی یا اقدام درمانی', example: 'تزریق فیلر و بوتاکس', category: 'treatment' },
    { key: '[مبلغ فاکتور]', label: 'مبلغ فاکتور', description: 'مبلغ کل یا تسویه شده به تومان', example: '۲,۵۰۰,۰۰۰ تومان', category: 'treatment' },
    { key: '[تاریخ امروز]', label: 'تاریخ امروز', description: 'تاریخ روز به شمسی', example: '۱۴۰۵/۰۵/۰۱', category: 'date' },
    { key: '[ساعت پذیرش]', label: 'ساعت پذیرش', description: 'ساعت جاری یا زمان پذیرش', example: '۱۰:۳۰', category: 'date' },
    { key: '[نام کلینیک]', label: 'نام کلینیک', description: 'نام مرکز یا درمانگاه تخصصی', example: 'مرکز درمانی', category: 'clinic' },
    { key: '[آدرس کلینیک]', label: 'آدرس کلینیک', description: 'نشانی و تلفن تماس مرکز', example: 'تهران - خیابان ولیعصر - ساختمان پزشکان', category: 'clinic' },
];
export function replacePersianPlaceholders(templateText, data) {
    if (!templateText)
        return '';
    let result = templateText;
    result = result
        .replace(/\[اسم بیمار\]|\{\{اسم بیمار\}\}|\[نام بیمار\]|\{\{نام بیمار\}\}/g, data.patientName || '....................')
        .replace(/\[کد ملی\]|\{\{کد ملی\}\}/g, data.nationalId || '....................')
        .replace(/\[نام پدر\]|\{\{نام پدر\}\}/g, data.fatherName || '....................')
        .replace(/\[شماره همراه\]|\{\{شماره همراه\}\}|\[تلفن همراه\]|\{\{تلفن همراه\}\}/g, data.mobilePhone || '....................')
        .replace(/\[کد پرونده\]|\{\{کد پرونده\}\}|\[شماره پرونده\]|\{\{شماره پرونده\}\}/g, data.fileNumber || '....................')
        .replace(/\[سن بیمار\]|\{\{سن بیمار\}\}/g, data.age ? `${data.age} سال` : '....................')
        .replace(/\[جنسیت بیمار\]|\{\{جنسیت بیمار\}\}/g, data.gender || '....................')
        .replace(/\[پزشک معالج\]|\{\{پزشک معالج\}\}|\[نام پزشک\]|\{\{نام پزشک\}\}/g, data.doctorName || '....................')
        .replace(/\[نوع خدمت\]|\{\{نوع خدمت\}\}|\[نام خدمت\]|\{\{نام خدمت\}\}/g, data.serviceName || '....................')
        .replace(/\[مبلغ فاکتور\]|\{\{مبلغ فاکتور\}\}|\[مبلغ کل\]|\{\{مبلغ کل\}\}/g, data.invoiceAmount || '....................')
        .replace(/\[تاریخ امروز\]|\{\{تاریخ امروز\}\}|\[تاریخ\]|\{\{تاریخ\}\}/g, data.todayJalali || getJalaliDateString())
        .replace(/\[ساعت پذیرش\]|\{\{ساعت پذیرش\}\}|\[ساعت\]|\{\{ساعت\}\}/g, data.receptionTime || new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))
        .replace(/\[نام کلینیک\]|\{\{نام کلینیک\}\}|\[نام درمانگاه\]|\{\{نام درمانگاه\}\}/g, data.clinicName || 'مرکز درمانی')
        .replace(/\[آدرس کلینیک\]|\{\{آدرس کلینیک\}\}/g, data.clinicAddress || 'بخش مرکزی کلینیک');
    return result;
}
export const DEFAULT_FORM_TEMPLATES = [
    {
        id: 'tmpl-1',
        title: 'رضایت‌نامه آگاهانه تزریق ژل، بوتاکس و فیلرهای زیبایی',
        category: 'رضایت‌نامه زیبایی',
        contentMarkdown: `اینجانب [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] و شماره همراه [شماره همراه] (کد پرونده: [کد پرونده]) با آگاهی کامل از عوارض احتمالی تزریق شامل کبودی موقت، تورم و نادراً حساسیت، رضایت کامل و آگاهانه خود را جهت انجام [نوع خدمت] توسط پزشک معالج [پزشک معالج] در [نام کلینیک] در تاریخ [تاریخ امروز] اعلام می‌نمایم.`,
        fields: [
            { id: 'f1', label: 'سابقه حساسیت دارویی یا غذایی دارید؟', type: 'select', options: ['خیر', 'بله (پنی‌سیلین/لیدوکائین)', 'بله (سایر)'], required: true },
            { id: 'f2', label: 'سابقه بیماری زمینه‌ای (دیابت، فشار خون، اختلال انعقادی):', type: 'text', required: false },
        ],
        requireSignature: true,
        requireFingerprint: true,
    },
    {
        id: 'tmpl-2',
        title: 'فرم ارزیابی تریاژ و علائم حیاتی بیمار',
        category: 'تریاژ و پرونده اولیه',
        contentMarkdown: `فرم سنجش اولیه و تریاژ بیمار [اسم بیمار] به شماره ملی [کد ملی] در تاریخ [تاریخ امروز] - ساعت [ساعت پذیرش] توسط بخش پذیرش و پرستاری [نام کلینیک] جهت ارائه خدمت [نوع خدمت] ثبت گردید. پزشک معالج: [پزشک معالج].`,
        fields: [
            { id: 'f_bp', label: 'فشار خون (Systolic/Diastolic):', type: 'text', required: true },
            { id: 'f_hr', label: 'ضربان قلب (Heart Rate):', type: 'number', required: true },
            { id: 'f_temp', label: 'درجه حرارت بدن (C°):', type: 'text', required: false },
            { id: 'f_spo2', label: 'سطح اکسیژن خون (SpO2%):', type: 'number', required: false },
            { id: 'f_triage_level', label: 'سطح تریاژ تعیین شده:', type: 'select', options: ['سطح ۱ - احیا و فوری', 'سطح ۲ - بسیار فوری', 'سطح ۳ - فوری', 'سطح ۴ - کم‌خطر', 'سطح ۵ - غیر اورژانس'], required: true },
        ],
        requireSignature: true,
        requireFingerprint: false,
    },
    {
        id: 'tmpl-3',
        title: 'رضایت‌نامه آگاهانه عمل جراحی سرپایی و برداشتن خال/کیست',
        category: 'جراحی سرپایی',
        contentMarkdown: `اینجانب [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] با آگاهی از روند جراحی سرپایی، بیحسی موضعی و احتمال اسکار خفیف، بدینوسیله رضایت کتبی و کامل خود را جهت انجام [نوع خدمت] توسط پزشک معالج [پزشک معالج] در [نام کلینیک] در تاریخ [تاریخ امروز] اعلام می‌دارم.`,
        fields: [
            { id: 'f_surgery_site', label: 'موضع دقیق جراحی / برداشتن خال:', type: 'text', required: true },
        ],
        requireSignature: true,
        requireFingerprint: true,
    },
    {
        id: 'tmpl-4',
        title: 'گزارش خلاصه پرونده و مفاصا حساب بیمار (گزارش‌ساز)',
        category: 'گزارش سفارشی',
        contentMarkdown: `گزارش رسمی خلاصه خدمات و تسویه حساب بیمار:
بدین‌وسیله گواهی می‌شود آقای/خانم [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] (شماره پرونده: [کد پرونده]) در تاریخ [تاریخ امروز] در [نام کلینیک] جهت دریافت خدمات [نوع خدمت] تحت نظر [پزشک معالج] مراجعه نموده و مبلغ [مبلغ فاکتور] تسویه گردید.`,
        fields: [],
        requireSignature: true,
        requireFingerprint: false,
    },
    {
        id: 'tmpl-5',
        title: 'گواهی استعلاجی و توصیه استراحت پزشکی',
        category: 'گواهی پزشکی',
        contentMarkdown: `بدین‌وسیله گواهی می‌شود آقای/خانم [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] در تاریخ [تاریخ امروز] به [نام کلینیک] مراجعه نموده و تحت معاینه [پزشک معالج] قرار گرفت. نامبرده به علت درمان [نوع خدمت] نیازمند استراحت پزشکی می‌باشد.`,
        fields: [
            { id: 'f_rest_days', label: 'تعداد روزهای استراحت استعلاجی:', type: 'number', required: true },
        ],
        requireSignature: true,
        requireFingerprint: false,
    }
];
