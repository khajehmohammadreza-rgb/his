/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export const RELATIVE_VALUE_BOOK_SERVICES = [
    // ویزیت و مشاوره پزشکی
    {
        nationalCode: '900100',
        nationalTitle: 'ویزیت و معاینه بالینی توسط پزشک عمومی',
        category: 'ویزیت و مشاوره',
        kProfessional: 1.0,
        kTechnical: 0.2,
        kAnesthesia: 0,
        description: 'معاینه بالینی اولیه، اخذ شرح حال و تجویز دارویی'
    },
    {
        nationalCode: '900105',
        nationalTitle: 'ویزیت و معاینه تخصصی توسط پزشک متخصص',
        category: 'ویزیت و مشاوره',
        kProfessional: 1.5,
        kTechnical: 0.3,
        kAnesthesia: 0,
        description: 'معاینه تخصصی توسط متخصص جراحی، داخلی یا زیبایی'
    },
    {
        nationalCode: '900110',
        nationalTitle: 'ویزیت فوق‌تخصصی / فلوشیپ پزشکی',
        category: 'ویزیت و مشاوره',
        kProfessional: 2.0,
        kTechnical: 0.4,
        kAnesthesia: 0,
        description: 'مشاوره و معاینه فوق‌تخصصی بیماری‌های پیچیده'
    },
    // خدمات سرپایی، اورژانس و تزریقات
    {
        nationalCode: '901005',
        nationalTitle: 'تزریق عضلانی، وریدی یا زیرجلدی',
        category: 'تزریقات و خدمات سرپایی',
        kProfessional: 0.2,
        kTechnical: 0.5,
        kAnesthesia: 0,
        description: 'تزریق انواع داروها با رعایت پروتکل ایمنی'
    },
    {
        nationalCode: '901010',
        nationalTitle: 'تزریق سرم و آنژیوکت با پایش علائم حیاتی',
        category: 'تزریقات و خدمات سرپایی',
        kProfessional: 0.3,
        kTechnical: 0.8,
        kAnesthesia: 0,
        description: 'رگ‌گیری، وصل سرم و مراقبت پرستاری'
    },
    {
        nationalCode: '901015',
        nationalTitle: 'شستشوی معده و سونداژ معده (NG Tube)',
        category: 'تزریقات و خدمات سرپایی',
        kProfessional: 0.8,
        kTechnical: 1.2,
        kAnesthesia: 0
    },
    {
        nationalCode: '901020',
        nationalTitle: 'سونداژ مجرای ادراری (فولی یا نلاتون)',
        category: 'تزریقات و خدمات سرپایی',
        kProfessional: 0.6,
        kTechnical: 1.0,
        kAnesthesia: 0
    },
    // پانسمان و مراقبت‌های زخم
    {
        nationalCode: '901200',
        nationalTitle: 'پانسمان ساده زخم‌های کوچک و سطحی',
        category: 'پانسمان و مراقبت زخم',
        kProfessional: 0.3,
        kTechnical: 0.7,
        kAnesthesia: 0
    },
    {
        nationalCode: '901205',
        nationalTitle: 'پانسمان پیچیده و دبریدمان زخم‌های عمیق یا سوختگی',
        category: 'پانسمان و مراقبت زخم',
        kProfessional: 1.2,
        kTechnical: 2.0,
        kAnesthesia: 0.3
    },
    {
        nationalCode: '901210',
        nationalTitle: 'پانسمان پیشرفته وکیوم تراپی (NPWT) و زخم پای دیابتی',
        category: 'پانسمان و مراقبت زخم',
        kProfessional: 2.0,
        kTechnical: 3.5,
        kAnesthesia: 0
    },
    // جراحی‌های سرپایی و خارج کردن جسم خارجی (Foreign Body Removal)
    {
        nationalCode: '901300',
        nationalTitle: 'خارج کردن جسم خارجی از بافت نرم سطحی بدون برش',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 0.8,
        kTechnical: 1.2,
        kAnesthesia: 0
    },
    {
        nationalCode: '901305',
        nationalTitle: 'درآوردن و خارج کردن جسم خارجی از بافت نرم عمیق با برش جراحی',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 2.5,
        kTechnical: 3.0,
        kAnesthesia: 0.5,
        description: 'خارج کردن جسم خارجی عمیق (پلیسه، شیشه، فلز) با بی‌حسی موضعی یا بلاک'
    },
    {
        nationalCode: '901310',
        nationalTitle: 'خارج کردن جسم خارجی از گوش، بینی یا چشم',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 1.5,
        kTechnical: 1.8,
        kAnesthesia: 0.2
    },
    {
        nationalCode: '901315',
        nationalTitle: 'بخیه و ترمیم زخم سطحی (کمتر از ۵ سانتی‌متر)',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 1.2,
        kTechnical: 1.5,
        kAnesthesia: 0.3
    },
    {
        nationalCode: '901320',
        nationalTitle: 'بخیه و ترمیم زخم‌های عمیق و لایه‌ای (بیشتر از ۵ سانتی‌متر)',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 2.8,
        kTechnical: 3.2,
        kAnesthesia: 0.8
    },
    {
        nationalCode: '901325',
        nationalTitle: 'کشیدن بخیه و منگنه جراحی (استپلر)',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 0.2,
        kTechnical: 0.4,
        kAnesthesia: 0
    },
    {
        nationalCode: '901330',
        nationalTitle: 'بیوپسی (نمونه‌برداری) از پوست یا بافت سطحی',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 1.8,
        kTechnical: 2.0,
        kAnesthesia: 0.3
    },
    {
        nationalCode: '901335',
        nationalTitle: 'تخلیه آبسه، کیست عفونی یا هماتوم زیرجلدی',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 1.5,
        kTechnical: 2.2,
        kAnesthesia: 0.4
    },
    {
        nationalCode: '901340',
        nationalTitle: 'خارج کردن کامل ناخن فرورفته در گوشت (Ingrown Nail)',
        category: 'جراحی‌های کوچک و سرپایی',
        kProfessional: 1.6,
        kTechnical: 2.0,
        kAnesthesia: 0.3
    },
    // خدمات پوست، مو و زیبایی کلینیکی (Aesthetic & Dermatology Procedures)
    {
        nationalCode: '902100',
        nationalTitle: 'تزریق سم بوتولینوم (بوتاکس) جهت جوانسازی یا رفع اسپاسم',
        category: 'پوست و زیبایی',
        kProfessional: 2.5,
        kTechnical: 3.0,
        kAnesthesia: 0,
        description: 'تزریق بوتاکس در نواحی صورت، پیشانی، دور چشم یا زیربغل'
    },
    {
        nationalCode: '902105',
        nationalTitle: 'تزریق ژل و فیلر هیالورونیک اسید (هر سی‌سی)',
        category: 'پوست و زیبایی',
        kProfessional: 3.0,
        kTechnical: 3.5,
        kAnesthesia: 0.2,
        description: 'حجم‌دهی و فرم‌دهی لب، گونه، چانه یا خط خنده'
    },
    {
        nationalCode: '902110',
        nationalTitle: 'مزوتراپی پوست، مو یا غبغب (هر جلسه)',
        category: 'پوست و زیبایی',
        kProfessional: 1.8,
        kTechnical: 2.2,
        kAnesthesia: 0
    },
    {
        nationalCode: '902115',
        nationalTitle: 'پی‌آرپی (PRP) پلاسما غنی از پلاکت (پوست و مو)',
        category: 'پوست و زیبایی',
        kProfessional: 2.8,
        kTechnical: 3.8,
        kAnesthesia: 0
    },
    {
        nationalCode: '902120',
        nationalTitle: 'لیزر آر اف فرکشنال / میکرونیدلینگ جوانسازی',
        category: 'پوست و زیبایی',
        kProfessional: 2.0,
        kTechnical: 4.0,
        kAnesthesia: 0
    },
    {
        nationalCode: '902125',
        nationalTitle: 'لیپوساکشن / تخلیه چربی غبغب با بی‌حسی',
        category: 'پوست و زیبایی',
        kProfessional: 8.0,
        kTechnical: 10.0,
        kAnesthesia: 2.0
    },
    {
        nationalCode: '902130',
        nationalTitle: 'کربکسی تراپی و فیشیال تخصصی کلینیکی',
        category: 'پوست و زیبایی',
        kProfessional: 1.0,
        kTechnical: 2.5,
        kAnesthesia: 0
    },
    // جراحی‌های محدود و اتاق عمل کلینیک (Operating Room Surgeries)
    {
        nationalCode: '903005',
        nationalTitle: 'جراحی بلفاروپلاستی پلک بالا یا پایین (پلاستیک پلک)',
        category: 'جراحی محدود اتاق عمل',
        kProfessional: 12.0,
        kTechnical: 15.0,
        kAnesthesia: 3.0
    },
    {
        nationalCode: '903010',
        nationalTitle: 'جراحی سانترال لب و لیفت زیبایی صورت',
        category: 'جراحی محدود اتاق عمل',
        kProfessional: 10.0,
        kTechnical: 12.0,
        kAnesthesia: 2.5
    },
    {
        nationalCode: '903015',
        nationalTitle: 'خارج کردن کیست سباسه یا لیپوم ضایعات بزرگ عمیق',
        category: 'جراحی محدود اتاق عمل',
        kProfessional: 4.0,
        kTechnical: 5.5,
        kAnesthesia: 1.0
    },
    {
        nationalCode: '903020',
        nationalTitle: 'جراحی فتق اینگوینال / نافی در مرکز جراحی محدود',
        category: 'جراحی محدود اتاق عمل',
        kProfessional: 15.0,
        kTechnical: 20.0,
        kAnesthesia: 5.0
    },
    {
        nationalCode: '903025',
        nationalTitle: 'جراحی ژنیکوماستی و پیکرتراشی محدود',
        category: 'جراحی محدود اتاق عمل',
        kProfessional: 18.0,
        kTechnical: 22.0,
        kAnesthesia: 6.0
    },
    // خدمات عمومی و نوار قلب / ارتوپدی سرپایی
    {
        nationalCode: '904005',
        nationalTitle: 'ثبت الکتروکاردیوگرام (نوار قلب ECG) با تفسیر',
        category: 'پاراکلینیک و تشخیص',
        kProfessional: 0.5,
        kTechnical: 1.0,
        kAnesthesia: 0
    },
    {
        nationalCode: '904010',
        nationalTitle: 'آتِل‌گیری و گچ‌گیری اندام آسیب‌دیده',
        category: 'ارتوپدی و جااندازی',
        kProfessional: 1.5,
        kTechnical: 2.0,
        kAnesthesia: 0.3
    },
    {
        nationalCode: '904015',
        nationalTitle: 'جااندازی بسته‌ی خلع مفصل کوچک یا شکستگی بدون جراحی',
        category: 'ارتوپدی و جااندازی',
        kProfessional: 2.2,
        kTechnical: 2.8,
        kAnesthesia: 0.8
    }
];
