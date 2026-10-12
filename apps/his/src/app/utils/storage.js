/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { getJalaliDateTimeString } from "./jalali.js?b=r24-514-1405";
import { DEFAULT_PAYMENT_METHODS } from "./paymentMethods.js?b=r24-514-1405";
// Storage Keys Helper - Center Isolated Storage Keys
export const CURRENT_CENTER_KEY = "bastiyan_current_center_id";
export const LEGACY_CURRENT_CENTER_KEY = "bastian_current_center_id";
export const loadCurrentCenterId = () => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored =
        localStorage.getItem(CURRENT_CENTER_KEY) ||
        localStorage.getItem(LEGACY_CURRENT_CENTER_KEY);
      if (stored) return stored;
    }
  } catch (e) {}
  return "cnt-1";
};
export const saveCurrentCenterId = (centerId) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(CURRENT_CENTER_KEY, centerId);
      // Keep legacy modules working while all deployed browsers migrate.
      localStorage.setItem(LEGACY_CURRENT_CENTER_KEY, centerId);
    }
  } catch (e) {}
};
export const getCenterKey = (keyName, centerId) => {
  const cid = centerId || loadCurrentCenterId() || "cnt-1";
  return `bastian_center_${cid}_${keyName}`;
};
export const getStorageKey = (keyName, centerId) => {
  return getCenterKey(keyName, centerId);
};
const STORAGE_KEYS = {
  SETTINGS: (cid) => getStorageKey("settings", cid),
  USERS: (cid) => getStorageKey("users", cid),
  DOCTORS: (cid) => getStorageKey("doctors", cid),
  CATEGORIES: (cid) => getStorageKey("categories", cid),
  WAREHOUSES: (cid) => getStorageKey("warehouses", cid),
  PRODUCTS: (cid) => getStorageKey("products", cid),
  PATIENTS: (cid) => getStorageKey("patients", cid),
  VISIT_QUEUE: (cid) => getStorageKey("visit_queue", cid),
  MEDICAL_SERVICES: (cid) => getStorageKey("medical_services", cid),
  TREATMENT_PLANS: (cid) => getStorageKey("treatment_plans", cid),
  APPOINTMENTS: (cid) => getStorageKey("appointments", cid),
  SIGNED_CONSENTS: (cid) => getStorageKey("signed_consents", cid),
  EXPENSES: (cid) => getStorageKey("expenses", cid),
  SMS_LOGS: (cid) => getStorageKey("sms_logs", cid),
  MOVEMENTS: (cid) => getStorageKey("movements", cid),
  SALES_INVOICES: (cid) => getStorageKey("sales_invoices", cid),
  PURCHASE_INVOICES: (cid) => getStorageKey("purchase_invoices", cid),
  SUPPLY_REQUESTS: (cid) => getStorageKey("supply_requests", cid),
  INTERNAL_CONSUMPTION: (cid) => getStorageKey("internal_consumption", cid),
  WASTAGE: (cid) => getStorageKey("wastage", cid),
  AUDIT_LOGS: (cid) => getStorageKey("audit_logs", cid),
  SERVICE_CATEGORIES: (cid) => getStorageKey("service_categories", cid),
  REPORT_CATEGORIES: (cid) => getStorageKey("report_categories", cid),
};
// Default Initial Clinic Settings with generated clinic logo
export const DEFAULT_CLINIC_SETTINGS = {
  clinicName: "مرکز درمانی",
  holdingName: "سامانه جامع پزشکی باستیان",
  address: "",
  phone: "",
  website: "",
  logoUrl: "/center-logo-placeholder.svg",
  currencyUnit: "toman",
  activeFiscalYear: 1405,
  fiscalYears: [1402, 1403, 1404, 1405],
  insuranceCatalog: { insurers: [{ id: "ins-tamin", name: "تامین اجتماعی", code: "TAMIN", type: "public", active: true }, { id: "ins-salamat", name: "بیمه سلامت", code: "SALAMAT", type: "public", active: true }, { id: "ins-armed", name: "نیروهای مسلح", code: "ARMED", type: "public", active: true }], contracts: [], tariffs: [] },
  discountCatalog: { policies: [] },
  enableSmsInvoice: true,
  printBarcodeOnInvoice: true,
  scannerModeDefault: "hardware",
  posMerchantName: "سامانکیش (SamanKish POS)",
  allowNegativeStockWithAdmin: true,
  workingHoursStart: "08:00",
  workingHoursEnd: "21:00",
  autoTurnNumberResetDaily: true,
  requireDoctorSelection: false,
  allowDuplicatePatients: false,
  invoicePaperSize: "A5",
  showClinicAddressOnInvoice: true,
  showDoctorMedicalCodeOnInvoice: true,
  invoiceNotes:
    "مراجعه‌کننده گرامی، لطفاً فاکتور را جهت ارائه به بیمه‌های تکمیلی نزد خود نگه دارید.",
  taxPercentage: 0,
  enableTaminInsurance: true,
  enableSalamatInsurance: true,
  defaultPaymentMethod: "pos",
  paymentMethods: DEFAULT_PAYMENT_METHODS.map((item) => ({ ...item })),
  autoBackupEnabled: true,
  autoBackupMode: "interval",
  autoBackupIntervalHours: 24,
  autoBackupTimes: ["02:00"],
  autoBackupRetentionCount: 30,
  requireConfirmOnDelete: true,
  posIp: "",
  posPort: "8080",
  posTerminalId: "",
  posMerchantId: "",
  posConnectionType: "ssp1126",
  posAutoRialConversion: true,
  smsApiKey: "",
  smsSenderLine: "",
  smsReminderDaysBefore: 2,
  smsAppointmentReminderEnabled: true,
  smsAppointmentReminderHoursBefore: 24,
  smsAppointmentReminderTemplate:
    "بیمار گرامی {patient_name}، یادآوری نوبت شما در {clinic_name}: تاریخ {date} ساعت {time} نزد {doctor_name}. لطفاً در زمان مقرر مراجعه فرمایید.",
  ganjiHospitalReminderDaysBefore: 3,
  smsRevisitTemplate:
    "مراجعه‌کننده گرامی {patient_name}، نوبت مراجعه مجدد شما برای تاریخ {date} تنظیم شده است. لطفاً ۱۰ دقیقه قبل در مرکز حضور داشته باشید.",
  ganjiHospitalMessageTemplate:
    "مراجعه‌کننده گرامی {patient_name}، نوبت شما جهت مراجعه به بیمارستان/مرکز جراحی برای تاریخ {date} ثبت گردیده است.",
  enableWelcomeSmsOnRegistration: true,
  enableWelcomeSmsOnAdmission: true,
  welcomeAdmissionSmsTemplate: "مراجعه‌کننده گرامی {patient_name}، به {clinic_name} خوش آمدید.\nشماره پرونده شما: {file_number}.",
  enableDebtorSms: true,
  debtorSmsTemplate: "مراجعه‌کننده گرامی {patient_name}، مانده بدهی پرونده {file_number} مبلغ {debt_amount} تومان است. لطفاً جهت تعیین تکلیف با مرکز تماس بگیرید.",
  thermalPrinterWidth: '80mm',
  thermalVisitTicketEnabled: true,
  invoiceHeaderText: '',
  invoiceFooterText: '',
  welcomeSmsTemplate:
    "مراجعه‌کننده گرامی {patient_name}، به مرکز درمانی خوش آمدید.\nشماره پرونده شما: {file_number}.\nبا آرزوی تندرستی.",
  partnerShares: [],
  licenseEndDate: "",
  licenseStatus: "active",
  licensePlanName: "",
  licenseContactPhone: "",
  referralFacilities: [
    {
      id: "facility-ganji",
      name: "بیمارستان گنجی",
      code: "GANJI",
      active: true,
      requiredForms: ["فرم ارجاع پزشک", "فرم پذیرش/تشکیل پرونده"],
      preparationChecklist: ["مدارک هویتی و بیمه", "دستور پزشک و شرح خدمت"],
    },
  ],
};
// Seed Super Admin & Users
const SEED_USERS = [];
// Seed Doctors
const SEED_DOCTORS = [];
// Seed Warehouses
const SEED_WAREHOUSES = [
  { id: "wh-main", name: "انبار مرکزی تجهیزات", code: "MAIN", isMain: true },
  { id: "wh-pharmacy", name: "داروخانه کلینیک", code: "PHARM" },
  { id: "wh-clinic", name: "انبار مصرفی اتاق عمل", code: "OR_ROOM" },
];
// Seed Medical Services
const SEED_MEDICAL_SERVICES = [
  {
    id: "srv-101",
    code: "SRV-101",
    title: "ویزیت عمومی پزشکی",
    category: "medical_visit",
    tariffPrice: 150000,
    doctorCommissionPercent: 70,
    requiresAssistant: false,
    assistantCommissionPercent: 0,
    active: true,
    description: "ویزیت اولیه پزشک عمومی و معاینه",
  },
  {
    id: "srv-102",
    code: "SRV-102",
    title: "ویزیت تخصصی جراحی و زخم",
    category: "medical_visit",
    tariffPrice: 350000,
    doctorCommissionPercent: 70,
    requiresAssistant: false,
    assistantCommissionPercent: 0,
    active: true,
    description: "ارزیابی تخصصی زخم‌های مزمن و دیابتی",
  },
  {
    id: "srv-103",
    code: "SRV-103",
    title: "پانسمان نوین و وکیوم زخم (تراپی)",
    category: "clinic_service",
    tariffPrice: 850000,
    doctorCommissionPercent: 40,
    requiresAssistant: true,
    assistantCommissionPercent: 10,
    active: true,
    description: "شستشو و پانسمان پیشرفته با الژینات نقره",
  },
  {
    id: "srv-104",
    code: "SRV-104",
    title: "تزریق بوتاکس مصپورت کل صورت",
    category: "clinic_service",
    tariffPrice: 1650000,
    doctorCommissionPercent: 50,
    requiresAssistant: true,
    assistantCommissionPercent: 10,
    active: true,
    description: "تزریق پیشانی، دور چشم و خط اخم",
  },
  {
    id: "srv-105",
    code: "SRV-105",
    title: "تزریق ژل فیلر لب و گونه (هر سی‌سی)",
    category: "clinic_service",
    tariffPrice: 2800000,
    doctorCommissionPercent: 50,
    requiresAssistant: true,
    assistantCommissionPercent: 10,
    active: true,
    description: "فرم‌دهی تخصصی لب با ماندگاری بالا",
  },
  {
    id: "srv-106",
    code: "SRV-106",
    title: "جراحی سرپایی خال و کیست سباسه",
    category: "clinic_service",
    tariffPrice: 1200000,
    doctorCommissionPercent: 60,
    requiresAssistant: true,
    assistantCommissionPercent: 10,
    active: true,
    description: "برداشتن با بخیه ظریف پلاستیک",
  },
  {
    id: "srv-107",
    code: "SRV-107",
    title: "رزرو اتاق عمل جراحی محدود بیمارستانی",
    category: "hospital_surgery",
    tariffPrice: 15000000,
    doctorCommissionPercent: 65,
    requiresAssistant: true,
    assistantCommissionPercent: 10,
    active: true,
    description: "عمل جراحی فتق، کیسه صفرا و ترمیمی",
  },
  {
    id: "srv-108",
    code: "SRV-108",
    title: "پی‌ارپی PRP درمانی پوست و مو",
    category: "clinic_service",
    tariffPrice: 1900000,
    doctorCommissionPercent: 50,
    requiresAssistant: true,
    assistantCommissionPercent: 10,
    active: true,
    description: "پلاسمای غنی از پلاکت با کیت استاندارد",
  },
];
// Seed Categories
const SEED_CATEGORIES = [
  {
    id: "cat-1",
    name: "مواد ژل و بوتاکس",
    code: "JEL",
    description: "انواع ژل، فیلر و بوتاکس‌های زیبایی",
  },
  {
    id: "cat-2",
    name: "اقلام یکبارمصرف جراحی",
    code: "SUR",
    description: "ابزار و ملزومات یکبارمصرف اتاق عمل",
  },
  {
    id: "cat-3",
    name: "پانسمان و ضدعفونی",
    code: "DRS",
    description: "گاز استریل، چسب، پد الکلی و ضدعفونی",
  },
  {
    id: "cat-4",
    name: "نخ و سوزن جراحی",
    code: "SUT",
    description: "نخ‌های امبولیک و لیفتینگ",
  },
  {
    id: "cat-5",
    name: "داروها و سرم‌های مصرفی",
    code: "MED",
    description: "بیحسی، نرمال سالین و داروها",
  },
];
// Seed Products
const SEED_PRODUCTS = [
  {
    id: "prod-101",
    code: "1001",
    name: "بوتاکس مصپورت ۵۰۰ واحدی",
    categoryId: "cat-1",
    categoryName: "مواد ژل و بوتاکس",
    unit: "ویال",
    barcode: "6261234567890",
    qrCode: "QR-MASPORT-500",
    internalCode: "INT-BOT-01",
    warehouseId: "wh-pharmacy",
    minStock: 5,
    stockQuantity: 18,
    location: "قفسه A-2 یخچال",
    purchasePrice: 680000,
    salesPrice: 950000,
    active: true,
    createdAt: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "prod-102",
    code: "1002",
    name: "ژل هیالورونیک اسید نورامیس ۱ سی‌سی",
    categoryId: "cat-1",
    categoryName: "مواد ژل و بوتاکس",
    unit: "سرنگ",
    barcode: "6269876543210",
    qrCode: "QR-NEURAMIS-1CC",
    internalCode: "INT-JEL-02",
    warehouseId: "wh-pharmacy",
    minStock: 8,
    stockQuantity: 14,
    location: "قفسه A-1 یخچال",
    purchasePrice: 1200000,
    salesPrice: 1850000,
    active: true,
    createdAt: "2026-06-02T10:00:00.000Z",
  },
  {
    id: "prod-103",
    code: "1003",
    name: "نخ لیفت کاگ دندانه‌دار G21",
    categoryId: "cat-4",
    categoryName: "نخ و سوزن جراحی",
    unit: "عدد",
    barcode: "6265544332211",
    internalCode: "INT-SUT-21",
    warehouseId: "wh-clinic",
    minStock: 10,
    stockQuantity: 32,
    location: "کمد B-3",
    purchasePrice: 140000,
    salesPrice: 220000,
    active: true,
    createdAt: "2026-06-05T10:00:00.000Z",
  },
  {
    id: "prod-104",
    code: "1004",
    name: "سرنگ انسولین گیج ۳۰ نارنجی (۱۰۰ عددی)",
    categoryId: "cat-2",
    categoryName: "اقلام یکبارمصرف جراحی",
    unit: "بسته",
    barcode: "6261122334455",
    warehouseId: "wh-main",
    minStock: 4,
    stockQuantity: 3, // Low stock for alert demonstration
    location: "انبار مصرفی قفسه C-1",
    purchasePrice: 120000,
    salesPrice: 180000,
    active: true,
    createdAt: "2026-06-10T10:00:00.000Z",
  },
  {
    id: "prod-105",
    code: "1005",
    name: "گاز استریل ۱۰*۱۰ طب‌سوزن",
    categoryId: "cat-3",
    categoryName: "پانسمان و ضدعفونی",
    unit: "بسته",
    barcode: "6266677889900",
    warehouseId: "wh-main",
    minStock: 20,
    stockQuantity: 45,
    location: "انبار اصلی قفسه D-1",
    purchasePrice: 18000,
    salesPrice: 30000,
    active: true,
    createdAt: "2026-06-12T10:00:00.000Z",
  },
];
// Seed Patients
const SEED_PATIENTS = [];
// Seed Visit Queue
const SEED_VISIT_QUEUE = [];
// Seed Treatment Plans
const SEED_TREATMENT_PLANS = [];
// Seed Appointments
const SEED_APPOINTMENTS = [];
// Seed Audit Logs
const SEED_AUDIT_LOGS = [];
// Safe Storage Helpers to prevent Security/Iframe or Parse exceptions from crashing the app
const safeGetStorage = (key) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch (e) {
    console.warn(`[Storage] Cannot read key ${key} from localStorage:`, e);
  }
  return null;
};
const safeSetStorage = (key, value) => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn(`[Storage] Cannot write key ${key} to localStorage:`, e);
  }
};
// Persistence Getters & Setters
// Persistence Getters & Setters (Strictly Center-Isolated)
export const getStoredSettings = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.SETTINGS(centerId));
    if (!data) return DEFAULT_CLINIC_SETTINGS;
    const parsed = JSON.parse(data);
    if (
      !parsed.logoUrl ||
      parsed.logoUrl === "" ||
      parsed.logoUrl === "/logo.jpg"
    ) {
      parsed.logoUrl = "/center-logo-placeholder.svg";
    }
    // Migration: Ensure POS IP is normalized and migrated away from default 127.0.0.1 to clinic LAN IP 192.168.1.142
    if (
      !parsed.posIp ||
      parsed.posIp === "127.0.0.1" ||
      parsed.posIp === "localhost"
    ) {
      parsed.posIp = "192.168.1.142";
    } else if (typeof parsed.posIp === "string") {
      parsed.posIp = parsed.posIp
        .split(".")
        .map((p) => parseInt(p, 10).toString())
        .join(".");
    }
    if (!parsed.posConnectionType) {
      parsed.posConnectionType = "ssp1126";
    }
    return { ...DEFAULT_CLINIC_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_CLINIC_SETTINGS;
  }
};
export const saveSettings = (settings, centerId) => {
  safeSetStorage(STORAGE_KEYS.SETTINGS(centerId), JSON.stringify(settings));
};
export const getStoredProducts = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.PRODUCTS(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.PRODUCTS(centerId),
        JSON.stringify(SEED_PRODUCTS),
      );
      return SEED_PRODUCTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_PRODUCTS;
  } catch (e) {
    return SEED_PRODUCTS;
  }
};
export const saveProducts = (products, centerId) => {
  safeSetStorage(STORAGE_KEYS.PRODUCTS(centerId), JSON.stringify(products));
};
export const getStoredCategories = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.CATEGORIES(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.CATEGORIES(centerId),
        JSON.stringify(SEED_CATEGORIES),
      );
      return SEED_CATEGORIES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_CATEGORIES;
  } catch (e) {
    return SEED_CATEGORIES;
  }
};
export const saveCategories = (categories, centerId) => {
  safeSetStorage(STORAGE_KEYS.CATEGORIES(centerId), JSON.stringify(categories));
};
export const SEED_SERVICE_CATEGORIES = [
  {
    id: "scat-1",
    name: "ویزیت و معاینه پزشکی",
    code: "VISIT",
    description: "انواع ویزیت‌های عمومی و تخصصی جراحی",
  },
  {
    id: "scat-2",
    name: "خدمات کلینیکی و سرپایی",
    code: "CLINIC",
    description: "پانسمان نوین، تزریقات، زیبایی و لیزر",
  },
  {
    id: "scat-3",
    name: "جراحی محدود بیمارستانی",
    code: "SURG",
    description: "عمل‌های جراحی در بیمارستان/مرکز جراحی و اتاق عمل",
  },
  {
    id: "scat-4",
    name: "اقلام و داروهای مصرفی",
    code: "CONS",
    description: "مواد مصرفی، سرنگ، گاز و داروهای حین درمان",
  },
];
export const SEED_REPORT_CATEGORIES = [
  {
    id: "rcat-1",
    name: "گزارشات مالی و صندوق",
    code: "FIN",
    description: "فروش روزانه، تفکیک وجه نقد، کارت‌خوان و اعتبار",
  },
  {
    id: "rcat-2",
    name: "گزارشات انبار و موجودی",
    code: "INV",
    description: "گردش کالا، نقطه سفارش، کارتکس و ضایعات",
  },
  {
    id: "rcat-3",
    name: "گزارشات بیماران و بدهکاران",
    code: "PAT",
    description: "لیست بیماران بدهکار، سوابق و پرونده‌ها",
  },
  {
    id: "rcat-4",
    name: "گزارشات سامانه پیامکی کاوه‌نگار",
    code: "SMS",
    description: "لاگ‌های ارسال پیامک‌های تایید، خوش‌آمدگویی و یادآوری",
  },
];
export const getStoredServiceCategories = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.SERVICE_CATEGORIES(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.SERVICE_CATEGORIES(centerId),
        JSON.stringify(SEED_SERVICE_CATEGORIES),
      );
      return SEED_SERVICE_CATEGORIES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_SERVICE_CATEGORIES;
  } catch (e) {
    return SEED_SERVICE_CATEGORIES;
  }
};
export const saveServiceCategories = (items, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.SERVICE_CATEGORIES(centerId),
    JSON.stringify(items),
  );
};
export const getStoredReportCategories = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.REPORT_CATEGORIES(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.REPORT_CATEGORIES(centerId),
        JSON.stringify(SEED_REPORT_CATEGORIES),
      );
      return SEED_REPORT_CATEGORIES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_REPORT_CATEGORIES;
  } catch (e) {
    return SEED_REPORT_CATEGORIES;
  }
};
export const saveReportCategories = (items, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.REPORT_CATEGORIES(centerId),
    JSON.stringify(items),
  );
};
export const getStoredPatients = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.PATIENTS(centerId));
    if (!data) {
      const defaultPatients = [];
      safeSetStorage(
        STORAGE_KEYS.PATIENTS(centerId),
        JSON.stringify(defaultPatients),
      );
      return defaultPatients;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const savePatients = (patients, centerId) => {
  safeSetStorage(STORAGE_KEYS.PATIENTS(centerId), JSON.stringify(patients));
};
export const getStoredVisitQueue = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.VISIT_QUEUE(centerId));
    if (!data) {
      const defaultQueue = [];
      safeSetStorage(
        STORAGE_KEYS.VISIT_QUEUE(centerId),
        JSON.stringify(defaultQueue),
      );
      return defaultQueue;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const saveVisitQueue = (queue, centerId) => {
  safeSetStorage(STORAGE_KEYS.VISIT_QUEUE(centerId), JSON.stringify(queue));
};
export const getStoredMedicalServices = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.MEDICAL_SERVICES(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.MEDICAL_SERVICES(centerId),
        JSON.stringify(SEED_MEDICAL_SERVICES),
      );
      return SEED_MEDICAL_SERVICES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_MEDICAL_SERVICES;
  } catch (e) {
    return SEED_MEDICAL_SERVICES;
  }
};
export const saveMedicalServices = (services, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.MEDICAL_SERVICES(centerId),
    JSON.stringify(services),
  );
};
export const getStoredUsers = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.USERS(centerId));
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const saveUsers = (users, centerId) => {
  safeSetStorage(STORAGE_KEYS.USERS(centerId), JSON.stringify(users));
};
export const getStoredDoctors = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.DOCTORS(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.DOCTORS(centerId),
        JSON.stringify(SEED_DOCTORS),
      );
      return SEED_DOCTORS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_DOCTORS;
  } catch (e) {
    return SEED_DOCTORS;
  }
};
export const saveDoctors = (doctors, centerId) => {
  safeSetStorage(STORAGE_KEYS.DOCTORS(centerId), JSON.stringify(doctors));
};
export const getStoredWarehouses = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.WAREHOUSES(centerId));
    if (!data) {
      safeSetStorage(
        STORAGE_KEYS.WAREHOUSES(centerId),
        JSON.stringify(SEED_WAREHOUSES),
      );
      return SEED_WAREHOUSES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : SEED_WAREHOUSES;
  } catch (e) {
    return SEED_WAREHOUSES;
  }
};
export const saveWarehouses = (warehouses, centerId) => {
  safeSetStorage(STORAGE_KEYS.WAREHOUSES(centerId), JSON.stringify(warehouses));
};
export const getStoredTreatmentPlans = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.TREATMENT_PLANS(centerId));
    if (!data) {
      const defaultPlans = [];
      safeSetStorage(
        STORAGE_KEYS.TREATMENT_PLANS(centerId),
        JSON.stringify(defaultPlans),
      );
      return defaultPlans;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const saveTreatmentPlans = (plans, centerId) => {
  safeSetStorage(STORAGE_KEYS.TREATMENT_PLANS(centerId), JSON.stringify(plans));
};
export const getStoredAppointments = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.APPOINTMENTS(centerId));
    if (!data) {
      const defaultAppointments = [];
      safeSetStorage(
        STORAGE_KEYS.APPOINTMENTS(centerId),
        JSON.stringify(defaultAppointments),
      );
      return defaultAppointments;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const saveAppointments = (apps, centerId) => {
  safeSetStorage(STORAGE_KEYS.APPOINTMENTS(centerId), JSON.stringify(apps));
};
export const getStoredExpenses = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.EXPENSES(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveExpenses = (expenses, centerId) => {
  safeSetStorage(STORAGE_KEYS.EXPENSES(centerId), JSON.stringify(expenses));
};
export const getStoredSmsLogs = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.SMS_LOGS(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveSmsLogs = (logs, centerId) => {
  safeSetStorage(STORAGE_KEYS.SMS_LOGS(centerId), JSON.stringify(logs));
};
export const getStoredSignedConsents = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.SIGNED_CONSENTS(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveSignedConsents = (consents, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.SIGNED_CONSENTS(centerId),
    JSON.stringify(consents),
  );
};
export const getStoredSalesInvoices = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.SALES_INVOICES(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveSalesInvoices = (invoices, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.SALES_INVOICES(centerId),
    JSON.stringify(invoices),
  );
};
export const getStoredPurchaseInvoices = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.PURCHASE_INVOICES(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const savePurchaseInvoices = (invoices, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.PURCHASE_INVOICES(centerId),
    JSON.stringify(invoices),
  );
};
export const getStoredMovements = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.MOVEMENTS(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveMovements = (movements, centerId) => {
  safeSetStorage(STORAGE_KEYS.MOVEMENTS(centerId), JSON.stringify(movements));
};
export const getStoredAuditLogs = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.AUDIT_LOGS(centerId));
    if (!data) {
      const defaultLogs = [];
      safeSetStorage(
        STORAGE_KEYS.AUDIT_LOGS(centerId),
        JSON.stringify(defaultLogs),
      );
      return defaultLogs;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const addAuditLog = (user, action, category, details, centerId) => {
  try {
    const cid = centerId || loadCurrentCenterId();
    const logs = getStoredAuditLogs(cid);
    const newLog = {
      id: "log-" + Date.now() + Math.random().toString(36).substring(2, 5),
      userId: user.id,
      userName: user.name,
      role: user.role,
      action,
      category,
      details,
      timestamp: new Date().toISOString(),
      jalaliDate: getJalaliDateTimeString(),
    };
    logs.unshift(newLog);
    safeSetStorage(
      STORAGE_KEYS.AUDIT_LOGS(cid),
      JSON.stringify(logs.slice(0, 300)),
    );
  } catch (e) {}
};
// Seed Sample Supply Requests
const SEED_SUPPLY_REQUESTS = [];
export const getStoredSupplyRequests = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.SUPPLY_REQUESTS(centerId));
    if (!data) {
      const defaultReqs = [];
      safeSetStorage(
        STORAGE_KEYS.SUPPLY_REQUESTS(centerId),
        JSON.stringify(defaultReqs),
      );
      return defaultReqs;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
export const saveSupplyRequests = (items, centerId) => {
  safeSetStorage(STORAGE_KEYS.SUPPLY_REQUESTS(centerId), JSON.stringify(items));
};
export const getStoredInternalConsumptions = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.INTERNAL_CONSUMPTION(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveInternalConsumptions = (items, centerId) => {
  safeSetStorage(
    STORAGE_KEYS.INTERNAL_CONSUMPTION(centerId),
    JSON.stringify(items),
  );
};
export const getStoredWastage = (centerId) => {
  try {
    const data = safeGetStorage(STORAGE_KEYS.WASTAGE(centerId));
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
export const saveWastage = (items, centerId) => {
  safeSetStorage(STORAGE_KEYS.WASTAGE(centerId), JSON.stringify(items));
};
export const getCenterStorageKey = (centerId) =>
  `bastiyan_center_isolated_${centerId}`;
export const getLegacyCenterStorageKey = (centerId) =>
  `bastian_center_isolated_${centerId}`;
export const saveCenterAppState = (centerId, state) => {
  if (!centerId) return;
  const normalized = {
    ...state,
    currentCenterId: centerId,
  };
  safeSetStorage(getCenterStorageKey(centerId), JSON.stringify(normalized));
  // R20: explicit online-sync event. This is independent of localStorage monkey-patching,
  // so every authenticated role (nurse, secretary, cashier, doctor, ...) reaches the
  // authoritative SQLite store after an application state change.
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bastiyan:center-state-save", {
        detail: { centerId, state: normalized, at: Date.now() },
      }));
    }
  } catch (e) {
    console.warn("[Storage] online sync event failed:", e);
  }
};
const CENTER_STATE_ARRAY_KEYS = [
  "users",
  "doctors",
  "categories",
  "warehouses",
  "serviceCategories",
  "reportCategories",
  "products",
  "patients",
  "paymentReceipts",
  "discountRecords",
  "customServiceLibrary",
  "consentDocuments",
  "visitQueue",
  "medicalServices",
  "treatmentPlans",
  "appointments",
  "signedConsents",
  "expenses",
  "expenseRecords",
  "smsLogs",
  "stockMovements",
  "salesInvoices",
  "encounters",
  "transactions",
  "billingDocuments",
  "purchaseInvoices",
  "supplyRequests",
  "internalConsumptions",
  "wastageRecords",
  "auditLogs",
  "customReports",
  "shifts",
  "attendanceRecords",
  "attendanceRequests",
  "payrolls",
  "staffAccounts",
  "payrollAdjustments",
  "workSchedules",
  "medicalCenters",
];

const normalizeLoadedCenterState = (state, centerId) => {
  const next = { ...(state || {}), currentCenterId: centerId };
  next.settings = next.settings && typeof next.settings === "object" ? next.settings : { ...DEFAULT_CLINIC_SETTINGS };
  CENTER_STATE_ARRAY_KEYS.forEach((key) => {
    if (!Array.isArray(next[key])) next[key] = [];
  });
  return next;
};

export const loadCenterAppState = (centerId) => {
  try {
    const raw =
      safeGetStorage(getCenterStorageKey(centerId)) ||
      safeGetStorage(getLegacyCenterStorageKey(centerId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        // مهاجرت غیرمخرب تنظیمات نسخه‌های قبلی: تنظیمات موجود مرکز حفظ می‌شوند
        // و فقط کلیدهای جدید گردش‌کار (مثل مراکز ارجاع) در صورت نبودن اضافه می‌شوند.
        const parsedSettings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};
        const migratedSettings = {
          ...DEFAULT_CLINIC_SETTINGS,
          ...parsedSettings,
          referralFacilities: Array.isArray(parsedSettings.referralFacilities)
            ? parsedSettings.referralFacilities
            : DEFAULT_CLINIC_SETTINGS.referralFacilities.map((item) => ({ ...item })),
          fiscalYears: Array.from(new Set([...(DEFAULT_CLINIC_SETTINGS.fiscalYears || []), ...(parsedSettings.fiscalYears || []), Number(parsedSettings.activeFiscalYear || 1405)])).sort((a,b)=>a-b),
          activeFiscalYear: Number(parsedSettings.activeFiscalYear || 1405),
          insuranceCatalog: { ...DEFAULT_CLINIC_SETTINGS.insuranceCatalog, ...(parsedSettings.insuranceCatalog || {}), insurers: Array.isArray(parsedSettings.insuranceCatalog?.insurers) ? parsedSettings.insuranceCatalog.insurers : DEFAULT_CLINIC_SETTINGS.insuranceCatalog.insurers },
          discountCatalog: { ...DEFAULT_CLINIC_SETTINGS.discountCatalog, ...(parsedSettings.discountCatalog || {}) },
        };
        return normalizeLoadedCenterState({
          ...parsed,
          settings: migratedSettings,
        }, centerId);
      }
    }
  } catch (e) {
    console.error(`Error loading isolated state for center ${centerId}:`, e);
  }
  // New centers always start with a clean isolated data set. Credentials are server-side only.
  const cleanState = {
    currentCenterId: centerId,
    settings: { ...DEFAULT_CLINIC_SETTINGS, clinicName: "مرکز درمانی" },
    users: [],
    doctors: [],
    categories: [],
    warehouses: [],
    serviceCategories: [],
    reportCategories: [],
    products: [],
    patients: [],
    paymentReceipts: [],
    discountRecords: [],
    customServiceLibrary: [],
    consentDocuments: [],
    visitQueue: [],
    medicalServices: [],
    treatmentPlans: [],
    appointments: [],
    signedConsents: [],
    expenses: [],
    smsLogs: [],
    stockMovements: [],
    salesInvoices: [],
    encounters: [],
    transactions: [],
    billingDocuments: [],
    engineMeta: { version: 1, migratedAt: null },
    purchaseInvoices: [],
    supplyRequests: [],
    internalConsumptions: [],
    wastageRecords: [],
    auditLogs: [],
    customReports: [],
    shifts: [],
    attendanceRecords: [],
    attendanceRequests: [],
    payrolls: [],
    staffAccounts: [],
    workSchedules: [],
    payrollAdjustments: [],
  };
  const normalizedCleanState = normalizeLoadedCenterState(cleanState, centerId);
  saveCenterAppState(centerId, normalizedCleanState);
  return normalizedCleanState;
};
export const loadAppState = () => {
  try {
    const activeCenterId = loadCurrentCenterId();
    return loadCenterAppState(activeCenterId);
  } catch (err) {
    console.error(
      "[App Storage] Failed to load app state, resetting to defaults:",
      err,
    );
    return loadCenterAppState("cnt-1");
  }
};
export const saveAppState = (state) => {
  const activeCenterId = state.currentCenterId || loadCurrentCenterId();
  saveCenterAppState(activeCenterId, state);
  // Sync strictly to center-isolated storage keys
  saveSettings(state.settings, activeCenterId);
  saveUsers(state.users, activeCenterId);
  if (state.doctors) saveDoctors(state.doctors, activeCenterId);
  if (state.categories) saveCategories(state.categories, activeCenterId);
  if (state.warehouses) saveWarehouses(state.warehouses, activeCenterId);
  if (state.serviceCategories)
    saveServiceCategories(state.serviceCategories, activeCenterId);
  if (state.reportCategories)
    saveReportCategories(state.reportCategories, activeCenterId);
  if (state.products) saveProducts(state.products, activeCenterId);
  if (state.patients) savePatients(state.patients, activeCenterId);
  if (state.visitQueue) saveVisitQueue(state.visitQueue, activeCenterId);
  if (state.medicalServices)
    saveMedicalServices(state.medicalServices, activeCenterId);
  if (state.treatmentPlans)
    saveTreatmentPlans(state.treatmentPlans, activeCenterId);
  if (state.appointments) saveAppointments(state.appointments, activeCenterId);
  if (state.signedConsents)
    saveSignedConsents(state.signedConsents, activeCenterId);
  if (state.expenses) saveExpenses(state.expenses, activeCenterId);
  if (state.smsLogs) saveSmsLogs(state.smsLogs, activeCenterId);
  if (state.stockMovements) saveMovements(state.stockMovements, activeCenterId);
  if (state.salesInvoices)
    saveSalesInvoices(state.salesInvoices, activeCenterId);
  if (state.purchaseInvoices)
    savePurchaseInvoices(state.purchaseInvoices, activeCenterId);
  if (state.supplyRequests)
    saveSupplyRequests(state.supplyRequests, activeCenterId);
  if (state.internalConsumptions)
    saveInternalConsumptions(state.internalConsumptions, activeCenterId);
  if (state.wastageRecords) saveWastage(state.wastageRecords, activeCenterId);
  if (state.auditLogs)
    safeSetStorage(
      STORAGE_KEYS.AUDIT_LOGS(activeCenterId),
      JSON.stringify(state.auditLogs.slice(0, 300)),
    );
  // Sync to Electron UserData directory if running as Desktop app
  if (
    typeof window !== "undefined" &&
    window.electron &&
    window.electron.saveUserDataState
  ) {
    window.electron
      .saveUserDataState(`app_state_${activeCenterId}`, state)
      .catch((err) => {
        console.warn("Electron state save notice:", err);
      });
  }
};
export const resetAllDataToDefaults = (centerId) => {
  const cid = centerId || loadCurrentCenterId();
  safeSetStorage(
    STORAGE_KEYS.SETTINGS(cid),
    JSON.stringify(DEFAULT_CLINIC_SETTINGS),
  );
  safeSetStorage(STORAGE_KEYS.USERS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.DOCTORS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.CATEGORIES(cid), JSON.stringify(SEED_CATEGORIES));
  safeSetStorage(STORAGE_KEYS.WAREHOUSES(cid), JSON.stringify(SEED_WAREHOUSES));
  safeSetStorage(STORAGE_KEYS.PRODUCTS(cid), JSON.stringify(SEED_PRODUCTS));
  safeSetStorage(STORAGE_KEYS.PATIENTS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.VISIT_QUEUE(cid), JSON.stringify([]));
  safeSetStorage(
    STORAGE_KEYS.MEDICAL_SERVICES(cid),
    JSON.stringify(SEED_MEDICAL_SERVICES),
  );
  safeSetStorage(STORAGE_KEYS.TREATMENT_PLANS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.APPOINTMENTS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.SIGNED_CONSENTS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.EXPENSES(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.SMS_LOGS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.MOVEMENTS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.SALES_INVOICES(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.PURCHASE_INVOICES(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.SUPPLY_REQUESTS(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.INTERNAL_CONSUMPTION(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.WASTAGE(cid), JSON.stringify([]));
  safeSetStorage(STORAGE_KEYS.AUDIT_LOGS(cid), JSON.stringify([]));
};
export const resetToDefaultData = () => {
  resetAllDataToDefaults();
  return loadAppState();
};
