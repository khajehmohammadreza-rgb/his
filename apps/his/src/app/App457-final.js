import { jsx as _jsx, jsxs as _jsxs } from "../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from "../client-vendor/react.js?b=r24-514-1405";
import { motion, AnimatePresence } from "./motion-shim.js?b=r24-514-1405";
import {
  loadAppState,
  resetToDefaultData,
  saveAppState,
  loadCenterAppState,
  saveCenterAppState,
  saveCurrentCenterId,
  loadCurrentCenterId,
} from "./utils/storage.js?b=r24-514-1405";
import { getJalaliDateTimeString, toPersianDigits } from "./utils/jalali.js?b=r24-514-1405";
import {
  ensureUnifiedEngineState,
  registerEncounter,
  updateEncounter,
  settlePatientDebt,
} from "./core/unifiedEncounterEngine.js?b=r24-514-1405";
// UI Components
import { Header } from "./components/Header.js?b=r24-514-1405";
import { InsuranceManagement } from "./components/InsuranceManagement.js?b=r24-514-1405";
import { DiscountManagement } from "./components/DiscountManagement.js?b=r24-514-1405";
import { AppointmentPlanningPanel } from "./components/AppointmentPlanningPanel.js?b=r24-514-1405";
import { Sidebar } from "./components/Sidebar.js?b=r24-514-1405";
import { Dashboard } from "./components/Dashboard.js?b=r24-514-1405";
import { ProductsInventory } from "./components/ProductsInventory.js?b=r24-514-1405";
import { PurchaseEntry } from "./components/PurchaseEntry.js?b=r24-514-1405";
import { PatientsCredit } from "./components/PatientsCredit.js?b=r24-514-1405";
import { InternalConsumptionComponent } from "./components/InternalConsumption.js?b=r24-514-1405";
import { ReturnsWastage } from "./components/ReturnsWastage.js?b=r24-514-1405";
import { ReportsFinancials } from "./components/ReportsFinancials.js?b=r24-514-1405";
import { AuditLogs } from "./components/AuditLogs.js?b=r24-514-1405";
import { SettingsBackup } from "./components/SettingsBackup.js?b=r24-514-1405";
import { AppPackageInstall } from "./components/AppPackageInstall.js?b=r24-514-1405";
import { ArchivedFeatures } from "./components/ArchivedFeatures.js?b=r24-514-1405";
import { UnifiedEncounterWorkflow } from "./components/UnifiedEncounterWorkflow457-final.js?b=r24-514-1405";
import { ServicesTariffs } from "./components/ServicesTariffs.js?b=r24-514-1405";
import { ConsentForms } from "./components/ConsentForms.js?b=r24-514-1405";
import { UserManagementRBAC } from "./components/UserManagementRBAC.js?b=r24-514-1405";
import { AccountingExpenses } from "./components/AccountingExpenses.js?b=r24-514-1405";
import { TaminEPrescriptionPanel } from "./components/TaminEPrescriptionPanel.js?b=r24-514-1405";
import { SmsManagementPanel } from "./components/SmsManagementPanel.js?b=r24-514-1405";
import { HrPayrollModule } from "./components/HrPayrollModule.js?b=r24-514-1405";
import { MyCartable } from "./components/MyCartable.js?b=r24-514-1405";
import { BarcodePrintModal } from "./components/BarcodePrintModal.js?b=r24-514-1405";
import { WebcamScannerModal } from "./components/WebcamScannerModal.js?b=r24-514-1405";
import { PrintableInvoiceModal } from "./components/PrintableInvoiceModal.js?b=r24-514-1405";
import { GroupingManagementModal } from "./components/GroupingManagementModal.js?b=r24-514-1405";
import { PatientProfileModal } from "./components/PatientProfileModal.js?b=r24-514-1405";
import { ClinicAiAssistant } from "./components/ClinicAiAssistant.js?b=r24-514-1405";
import { AppUpdateNotificationModal } from "./components/AppUpdateNotificationModal.js?b=r24-514-1405";
import { CentersManagementPanel } from "./components/CentersManagementPanel.js?b=r24-514-1405";
import { BastianLandingPortal } from "./components/BastianLandingPortal.js?b=r24-514-1405";
import { CenterRechargeErrorPage } from "./components/CenterRechargeErrorPage.js?b=r24-514-1405";
import { NotificationToastContainer } from "./components/NotificationToastContainer.js?b=r24-514-1405";
import { UserProfileModal } from "./components/UserProfileModal.js?b=r24-514-1405";
import { MandatoryUpdateModal } from "./components/MandatoryUpdateModal.js?b=r24-514-1405";
import { useVersionCheck } from "./hooks/useVersionCheck.js?b=r24-514-1405";
import { checkCenterLicense } from "./utils/license.js?b=r24-514-1405";
import { fiscalYearFromValue } from "./utils/fiscalYear.js?b=r24-514-1405";
import {
  resolvePortalCenterState,
  resolvePortalSessionUser,
} from "./utils/portalSession.js?b=r24-514-1405";
import {
  UserCheck,
  Stethoscope,
  Package,
  Menu,
  Home,
  ShieldAlert,
} from "../client-vendor/lucide-react.js?b=r24-514-1405";

const APP_COLLECTION_KEYS = [
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

function normalizeAppState(input) {
  const base = ensureUnifiedEngineState(resolvePortalCenterState(input || {}));
  const normalized = { ...base };
  for (const key of APP_COLLECTION_KEYS) {
    if (!Array.isArray(normalized[key])) normalized[key] = [];
  }
  normalized.settings =
    normalized.settings && typeof normalized.settings === "object"
      ? normalized.settings
      : {};
  const currentFiscalYear = Number(normalized.settings.activeFiscalYear) || fiscalYearFromValue(new Date().toISOString());
  normalized.settings.activeFiscalYear = currentFiscalYear;
  normalized.settings.fiscalYears = Array.from(new Set([...(normalized.settings.fiscalYears || []), currentFiscalYear])).sort((a,b)=>a-b);
  for (const key of ["salesInvoices","purchaseInvoices","expenses","paymentReceipts","discountRecords","payrolls","payrollAdjustments"]) {
    if (Array.isArray(normalized[key])) normalized[key] = normalized[key].map((row) => row && typeof row === "object" && !Number(row.fiscalYear) ? { ...row, fiscalYear: fiscalYearFromValue(row.jalaliDate || row.date || row.createdAt || row.timestamp) || currentFiscalYear } : row);
  }
  normalized.currentCenterId =
    normalized.currentCenterId || loadCurrentCenterId() || "cnt-1";
  return normalized;
}
export default function App() {
  useVersionCheck();
  const [appState, rawSetAppState] = useState(() =>
    normalizeAppState(loadAppState()),
  );
  const setAppState = (next) => {
    rawSetAppState((prev) =>
      normalizeAppState(typeof next === "function" ? next(prev) : next),
    );
  };
  useEffect(() => {
    const onQuickCatalogCreate = (event) => {
      const detail = event?.detail || {};
      if (detail.kind === 'service' && detail.item) {
        setAppState((prev) => ({ ...prev, medicalServices: [...(prev.medicalServices || []), detail.item] }));
      } else if (detail.kind === 'product' && detail.item) {
        setAppState((prev) => ({ ...prev, products: [...(prev.products || []), detail.item] }));
      }
    };
    window.addEventListener('bastiyan:quick-catalog-create', onQuickCatalogCreate);
    return () => window.removeEventListener('bastiyan:quick-catalog-create', onQuickCatalogCreate);
  }, []);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [appMode, setAppMode] = useState("center");
  const [isSuperAdminOverride] = useState(
    () =>
      sessionStorage.getItem("bastiyan_superadmin_override") === "1" ||
      sessionStorage.getItem("bastian_superadmin_override") === "1",
  );
  // Mobile Menu Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Modals state
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [barcodeProductModal, setBarcodeProductModal] = useState(null);
  const [showWebcamScanner, setShowWebcamScanner] = useState(false);
  const [printableInvoice, setPrintableInvoice] = useState(null);
  const [selectedPatientForProfile, setSelectedPatientForProfile] =
    useState(null);
  const [receptionAdmissionPatientId, setReceptionAdmissionPatientId] = useState("");
  const handleOpenPatientProfile = (patientIdOrName) => {
    if (!patientIdOrName) return;
    const found = appState.patients.find(
      (p) =>
        p.id === patientIdOrName ||
        p.fullName === patientIdOrName ||
        p.fileNumber === patientIdOrName ||
        (p.nationalId && p.nationalId === patientIdOrName) ||
        p.fullName.includes(patientIdOrName),
    );
    if (found) {
      setSelectedPatientForProfile(found);
    } else {
      const fallback = {
        id: "p-" + Date.now(),
        fileNumber: "P-" + Math.floor(10000 + Math.random() * 90000),
        identityCategory: "iranian",
        firstName: patientIdOrName,
        lastName: "",
        fullName: patientIdOrName,
        type: "regular",
        verificationStatus: "unverified",
        gender: "male",
        createdAt: new Date().toISOString(),
        creditConfig: {
          enabled: false,
          creditLimit: 0,
          currentDebt: 0,
          maturityDays: 30,
        },
      };
      setSelectedPatientForProfile(fallback);
    }
  };
  // Authentication is owned by the secure Bastian portal/server. Never auto-login a seeded user.
  const [currentUser, setCurrentUser] = useState(() =>
    resolvePortalSessionUser(appState.users || []),
  );
  const skipNextLocalSaveRef = useRef(false);

  // Live center-state hydration: all logged-in roles in the same center receive
  // the same SQLite-backed state without requiring logout/reload.
  useEffect(() => {
    const onServerState = (event) => {
      const detail = event?.detail || {};
      const activeCenterId = appState.currentCenterId || loadCurrentCenterId();
      if (!detail.state || !detail.centerId || detail.centerId !== activeCenterId) return;
      skipNextLocalSaveRef.current = true;
      const next = normalizeAppState(detail.state);
      setAppState(next);
      setCurrentUser((prev) =>
        resolvePortalSessionUser(next.users || []) || prev,
      );
    };
    window.addEventListener("bastiyan:server-state", onServerState);
    return () => window.removeEventListener("bastiyan:server-state", onServerState);
  }, [appState.currentCenterId]);

  // Sync to center-isolated local mirror; portal.js sends that mirror to the
  // authoritative center database. A state received from server must not be
  // posted back as a fake local edit.
  useEffect(() => {
    if (skipNextLocalSaveRef.current) {
      skipNextLocalSaveRef.current = false;
      return;
    }
    saveAppState(appState);
  }, [appState]);
  // Gemini API Health Check on Startup
  useEffect(() => {
    const checkGeminiHealth = async () => {
      try {
        const res = await fetch("/api/gemini/health");
        const data = await res.json();
        if (data.success && data.connected) {
          console.log("[Gemini AI] Service connected successfully.");
        } else {
          console.info(
            "[Gemini AI Note]:",
            data.error || "Gemini API key not configured or offline.",
          );
        }
      } catch (err) {
        console.warn("Gemini health check network error:", err);
      }
    };
    checkGeminiHealth();
  }, []);
  // Auto-redirect active tab if current user role does not have access to currentTab
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "admin") return; // Super admin has full access
    const roleTabPermissions = {
      doctor: [
        "dashboard",
        "my_cartable",
        "reception_queue",
        "consent_forms",
                "tamin_epresc",
        "services_tariffs",
        "appointments_plans",
      ],
      nurse: [
        "dashboard",
        "my_cartable",
        "reception_queue",
        "consent_forms",
                "tamin_epresc",
        "inventory",
        "internal_consumption",
      ],
      cashier: [
        "dashboard",
        "my_cartable",
        "reception_queue",
        "consent_forms",
        "tamin_epresc",
        "services_tariffs",
        "patients_credit",
        "reports",
        "returns_wastage",
        "appointments_plans", "insurance_management", "discount_management",
      ],
      inventory_manager: [
        "dashboard",
        "my_cartable",
        "inventory",
        "purchase",
        "internal_consumption",
        "returns_wastage",
      ],
      accountant: [
        "dashboard",
        "my_cartable",
        "reception_queue",
        "services_tariffs",
        "patients_credit",
        "accounting_expenses",
        "hr_payroll",
        "reports",
        "inventory",
        "purchase",
        "audit_logs",
        "archived_features",
        "appointments_plans",
        "insurance_management",
        "discount_management",
      ],
      purchaser: ["dashboard", "my_cartable", "inventory", "purchase"],
      operating_room_supervisor: [
        "dashboard",
        "my_cartable",
        "consent_forms",
                "internal_consumption",
      ],
      inspector: [
        "dashboard",
        "my_cartable",
        "reports",
        "audit_logs",
        "archived_features",
      ],
    };
    const defaultTabMap = {
      doctor: "reception_queue",
      nurse: "reception_queue",
      cashier: "reception_queue",
      inventory_manager: "inventory",
      accountant: "accounting_expenses",
      purchaser: "purchase",
      operating_room_supervisor: "consent_forms",
      inspector: "reports",
    };
    const userRoles = [currentUser.role, ...(currentUser.roles || [])];
    if (userRoles.includes("admin")) return; // Super admin has full access
    const allAllowedTabs = new Set();
    if (currentUser.allowedTabs && currentUser.allowedTabs.length > 0) {
      currentUser.allowedTabs.forEach((t) => allAllowedTabs.add(t));
    }
    userRoles.forEach((r) => {
      (roleTabPermissions[r] || []).forEach((t) => allAllowedTabs.add(t));
    });
    if (!allAllowedTabs.has(currentTab)) {
      const targetDefault = defaultTabMap[currentUser.role] || "dashboard";
      setCurrentTab(targetDefault);
    }
  }, [currentUser, currentTab]);
  // Log Helper
  const addAuditLog = (action, category, details) => {
    const now = new Date();
    const newLog = {
      id: "log-" + Date.now(),
      timestamp: now.toISOString(),
      jalaliDate: getJalaliDateTimeString(now),
      userId: currentUser?.id || "system",
      userName: currentUser?.name || "مهمان سیستم",
      role: currentUser?.role || "admin",
      action,
      category,
      details,
    };
    setAppState((prev) => ({
      ...prev,
      auditLogs: [newLog, ...(prev.auditLogs || [])],
    }));
  };
  // Logout Handler
  const handleLogout = async () => {
    if (currentUser) {
      addAuditLog(
        "خروج کاربر از سیستم",
        "user_access",
        `کاربر ${currentUser.name} از حساب کاربری خارج گردید.`,
      );
    }
    try {
      await fetch("/api/bastian/logout", { method: "POST" });
    } catch {}
    [
      "bastiyan_center_user",
      "bastiyan_center_session",
      "bastiyan_center_token",
      "bastiyan_superadmin_override",
      "bastian_center_user",
      "bastian_center_session",
      "bastian_center_token",
      "bastian_superadmin_override",
    ].forEach((key) => sessionStorage.removeItem(key));
    window.location.reload();
  };
  // Medical Center Database Switcher Handler
  const handleSwitchCenter = (center) => {
    if (!center || !center.id) return;
    // Save current active state before switching
    const activeCenterId = appState.currentCenterId || loadCurrentCenterId();
    saveCenterAppState(activeCenterId, appState);
    // Save target center ID
    saveCurrentCenterId(center.id);
    // Load isolated dataset for target center
    const newCenterState = loadCenterAppState(center.id);
    const updatedState = {
      ...newCenterState,
      currentCenterId: center.id,
      settings: {
        ...newCenterState.settings,
        clinicName: center.name || newCenterState.settings.clinicName,
        phone: center.phone || newCenterState.settings.phone,
      },
    };
    setAppState(updatedState);
    addAuditLog(
      "سوئیچ پایگاه داده مرکز",
      "settings",
      `ورود به مرکز «${center.name}» (کد: ${center.code}). دیتابیس، بیماران، نوبت‌ها و تنظیمات اختصاصی این مرکز بارگذاری گردید.`,
    );
    alert(
      `🏢 سوئیچ پایگاه داده با موفقیت انجام شد:\n\nنام مرکز: ${center.name}\nکد مرکز: ${center.code}\nشهر: ${center.city}\n\nاطلاعات، پرونده بیماران، صف نوبت و تنظیمات به صورت کاملاً مجزا و ایزوله بارگذاری گردیدند.`,
    );
    setCurrentTab("dashboard");
  };
  // Currency Toggle Handler
  const handleToggleCurrency = () => {
    const nextUnit =
      appState.settings.currencyUnit === "toman" ? "rial" : "toman";
    setAppState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        currencyUnit: nextUnit,
      },
    }));
  };
  // Role Switching Handler
  const handleUserChange = (u) => {
    setCurrentUser(u);
    addAuditLog(
      "تغییر کاربر آنلاین",
      "settings",
      `کاربر به ${u.name} (${u.role}) تغییر یافت.`,
    );
  };
  const handleApproveAllRequests = () => {
    setAppState((prev) => ({
      ...prev,
      supplyRequests: (prev.supplyRequests || []).map((req) =>
        req.status === "pending_approval"
          ? { ...req, status: "approved", approvedBy: currentUser.name }
          : req,
      ),
      attendanceRequests: (prev.attendanceRequests || []).map((req) =>
        req.status === "pending"
          ? { ...req, status: "approved", approverName: currentUser.name }
          : req,
      ),
    }));
    addAuditLog(
      "تایید دسته‌جمعی درخواست‌ها",
      "settings",
      "مدیر کل تمام درخواست‌های معلق انبار و حضور و غیاب را تایید نمود.",
    );
    alert(
      "تمام درخواست‌های معلق در کلینیک با موفقیت توسط مدیر ارشد تایید شدند.",
    );
  };
  // Product Add / Update / Delete Handlers
  const handleAddProduct = (prod) => {
    const initialStock = Math.max(0, Number(prod.initialStock ?? prod.stockQuantity ?? 0) || 0);
    const normalized = { ...prod, stockQuantity: initialStock, initialStock };
    setAppState((prev) => {
      const barcode = String(normalized.barcode || '').trim();
      if (barcode && (prev.products || []).some(p => String(p?.barcode || '').trim() === barcode)) {
        alert('این بارکد قبلاً در مرکز ثبت شده است و کالای تکراری ایجاد نمی‌شود.');
        return prev;
      }
      const movement = initialStock > 0 ? [{ id: 'mov-init-' + Date.now(), productId: normalized.id, productName: normalized.name, type: 'initial_stock', quantity: initialStock, previousStock: 0, newStock: initialStock, date: new Date().toISOString(), jalaliDate: getJalaliDateTimeString(new Date()), referenceId: normalized.code, userId: currentUser?.id || 'system', userName: currentUser?.name || 'سیستم' }] : [];
      return { ...prev, products: [normalized, ...(prev.products || [])], stockMovements: [...movement, ...(prev.stockMovements || [])] };
    });
    addAuditLog('تعریف کالای جدید', 'inventory', `کالای ${normalized.name} با کد ${normalized.code} تعریف شد. موجودی اولیه: ${initialStock}`);
  };
  const handleUpdateProduct = (updated) => {
    setAppState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
    }));
    addAuditLog(
      "ویرایش کالا",
      "inventory",
      `اطلاعات کالای ${updated.name} ویرایش گردید.`,
    );
  };
  const handleDeleteProduct = (productId) => {
    const prod = appState.products.find((p) => p.id === productId);
    setAppState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
    if (prod) {
      addAuditLog(
        "حذف کالا",
        "inventory",
        `کالای ${prod.name} از لیست کالاها حذف گردید.`,
      );
    }
  };
  // Patient Handlers
  const handleAddPatient = (patient) => {
    setAppState((prev) => ({
      ...prev,
      patients: [patient, ...prev.patients],
    }));
    addAuditLog(
      "ثبت بیمار جدید",
      "patient",
      `بیمار ${patient.fullName} با کد پرونده ${patient.fileNumber} ثبت شد.`,
    );
  };
  const handleUpdatePatient = (updated) => {
    setAppState((prev) => ({
      ...prev,
      patients: prev.patients.map((p) => (p.id === updated.id ? updated : p)),
    }));
    addAuditLog(
      "تغییر وضعیت/اعتبار بیمار",
      "credit",
      `تنظیمات اعتبار بیمار ${updated.fullName} بروزرسانی شد.`,
    );
  };
  // Queue Handlers
  const handleAddQueueItem = (item) => {
    setAppState((prev) => {
      try {
        return registerEncounter(prev, item, currentUser);
      } catch (error) {
        alert(error?.message || "ثبت پذیرش یکپارچه انجام نشد.");
        return prev;
      }
    });
  };
  const handleUpdateQueueItem = (updated) => {
    setAppState((prev) => {
      try {
        return updateEncounter(prev, updated, currentUser);
      } catch (error) {
        alert(error?.message || "بروزرسانی پرونده یکپارچه انجام نشد.");
        return prev;
      }
    });
  };
  // Medical Service Handlers
  const handleAddService = (srv) => {
    const normalizedService = {
      ...srv,
      requiresAssistant:
        typeof srv.requiresAssistant === "boolean"
          ? srv.requiresAssistant
          : !(srv.category === "medical_visit" || String(srv.title || "").includes("ویزیت")),
      assistantCommissionPercent:
        typeof srv.assistantCommissionPercent === "number"
          ? srv.assistantCommissionPercent
          : (srv.category === "medical_visit" || String(srv.title || "").includes("ویزیت") ? 0 : 10),
      preparationChecklist: Array.isArray(srv.preparationChecklist) ? srv.preparationChecklist : [],
      requiredForms: Array.isArray(srv.requiredForms) ? srv.requiredForms : [],
    };
    setAppState((prev) => ({
      ...prev,
      medicalServices: [normalizedService, ...prev.medicalServices],
    }));
    addAuditLog(
      "تعریف خدمت جدید",
      "settings",
      `خدمت ${normalizedService.title} تعریف گردید.`,
    );
  };
  const handleUpdateService = (updated) => {
    setAppState((prev) => ({
      ...prev,
      medicalServices: prev.medicalServices.map((s) =>
        s.id === updated.id ? updated : s,
      ),
    }));
  };
  const handleDeleteService = (id) => {
    setAppState((prev) => ({
      ...prev,
      medicalServices: prev.medicalServices.filter((s) => s.id !== id),
    }));
  };
  // Appointments & Plans Handlers
  const handleAddPaymentReceipt = (receipt) => {
    setAppState((prev) => ({ ...prev, paymentReceipts: [receipt, ...(prev.paymentReceipts || [])] }));
  };
  const handleAddDiscountRecord = (record) => {
    setAppState((prev) => ({ ...prev, discountRecords: [record, ...(prev.discountRecords || [])] }));
  };
  const handleAddAppointment = (app) => {
    setAppState((prev) => ({
      ...prev,
      appointments: [app, ...prev.appointments],
    }));
  };
  const handleUpdateAppointment = (updated) => {
    setAppState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) =>
        a.id === updated.id ? updated : a,
      ),
    }));
  };
  const handleAddTreatmentPlan = (plan) => {
    setAppState((prev) => ({
      ...prev,
      treatmentPlans: [plan, ...prev.treatmentPlans],
    }));
  };
  const handleUpdateTreatmentPlan = (updated) => {
    setAppState((prev) => ({
      ...prev,
      treatmentPlans: prev.treatmentPlans.map((p) =>
        p.id === updated.id ? updated : p,
      ),
    }));
  };
  // Consent Forms Handler
  const handleSaveSignedConsent = (consent) => {
    setAppState((prev) => ({
      ...prev,
      signedConsents: [consent, ...prev.signedConsents],
    }));
    addAuditLog(
      "ثبت رضایت‌نامه آگاهانه",
      "patient",
      `رضایت‌نامه ${consent.formTitle} جهت بیمار ${consent.patientName} ثبت شد.`,
    );
  };
  // RBAC User Handlers
  const handleAddUser = (user) => {
    setAppState((prev) => ({
      ...prev,
      users: [...prev.users, user],
    }));
    addAuditLog(
      "تعریف کاربر جدید",
      "settings",
      `کاربر ${user.name} با نقش ${user.role} ایجاد شد.`,
    );
  };
  const handleUpdateUser = (updated) => {
    setAppState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
    }));
  };
  // Grouping Management Handlers
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  const handleUpdateCategories = (categories) => {
    setAppState((prev) => ({ ...prev, categories }));
    addAuditLog(
      "بروزرسانی دسته‌بندی کالاها",
      "settings",
      "دسته‌بندی‌های کالا و داروها بروزرسانی شدند.",
    );
  };
  const handleUpdateWarehouses = (warehouses) => {
    setAppState((prev) => ({ ...prev, warehouses }));
    addAuditLog(
      "بروزرسانی انبارهای نگهداری",
      "settings",
      "محل‌های نگهداری و انبارها بروزرسانی شدند.",
    );
  };
  const handleUpdateServiceCategories = (serviceCategories) => {
    setAppState((prev) => ({ ...prev, serviceCategories }));
    addAuditLog(
      "بروزرسانی دسته‌بندی خدمات",
      "settings",
      "گروه‌بندی‌های خدمات پزشکی بروزرسانی شدند.",
    );
  };
  const handleUpdateReportCategories = (reportCategories) => {
    setAppState((prev) => ({ ...prev, reportCategories }));
    addAuditLog(
      "بروزرسانی دسته‌بندی گزارشات",
      "settings",
      "گروه‌بندی‌های گزارشات مالی و آماری بروزرسانی شدند.",
    );
  };
  // Accounting Expenses Handler
  const handleAddExpense = (expense) => {
    setAppState((prev) => ({
      ...prev,
      expenseRecords: [expense, ...prev.expenseRecords],
    }));
    addAuditLog(
      "ثبت سند هزینه",
      "accounting",
      `هزینه ${expense.title} به مبلغ ${expense.amount} ثبت شد.`,
    );
  };
  // ثبت فروش مستقل از نسخه ۴.۱.۰ حذف شده است؛ تمام اقلام و دریافت‌ها از Unified Encounter Engine عبور می‌کنند.
  // Add Purchase Invoice Handler
  const handleAddPurchaseInvoice = (purInvoice) => {
    setAppState((prev) => {
      const grouped = new Map();
      (purInvoice.items || []).forEach((it) => {
        const key = String(it.productId || '');
        if (!key) return;
        const row = grouped.get(key) || { qty: 0, purchaseUnitPrice: 0, productName: it.productName };
        row.qty += Math.max(0, Number(it.qty) || 0);
        row.purchaseUnitPrice = Number(it.purchaseUnitPrice ?? row.purchaseUnitPrice) || 0;
        grouped.set(key, row);
      });
      const movements = [];
      const updatedProducts = (prev.products || []).map((p) => {
        const item = grouped.get(String(p.id));
        if (!item || item.qty <= 0) return p;
        const previousStock = Number(p.stockQuantity) || 0;
        const newStock = previousStock + item.qty;
        movements.push({ id: 'mov-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), productId: p.id, productName: p.name, type: 'purchase', quantity: item.qty, previousStock, newStock, date: purInvoice.date, jalaliDate: purInvoice.jalaliDate, referenceId: purInvoice.invoiceNumber, userId: currentUser?.id || 'system', userName: currentUser?.name || 'سیستم' });
        return { ...p, stockQuantity: newStock, purchasePrice: item.purchaseUnitPrice || p.purchasePrice || 0 };
      });
      return { ...prev, purchaseInvoices: [purInvoice, ...(prev.purchaseInvoices || [])], products: updatedProducts, stockMovements: [...movements, ...(prev.stockMovements || [])] };
    });
    addAuditLog('ثبت خرید از تامین‌کننده', 'inventory', `فاکتور خرید ${purInvoice.invoiceNumber} از ${purInvoice.supplierName} ثبت و موجودی انبار به‌روزرسانی شد.`);
  };
  // Supply Request Handlers
  const handleCreateSupplyRequest = (req) => {
    setAppState((prev) => ({
      ...prev,
      supplyRequests: [req, ...(prev.supplyRequests || [])],
    }));
    addAuditLog(
      "ثبت درخواست کالای جدید",
      "inventory",
      `درخواست شماره ${req.requestNumber} توسط ${req.requestedByUserName} برای بخش ${req.department} ثبت شد.`,
    );
  };
  const handleUpdateSupplyRequest = (updated) => {
    setAppState((prev) => ({
      ...prev,
      supplyRequests: (prev.supplyRequests || []).map((r) =>
        r.id === updated.id ? updated : r,
      ),
    }));
    addAuditLog(
      "بروزرسانی درخواست کالا",
      "inventory",
      `وضعیت درخواست شماره ${updated.requestNumber} به ${updated.status} تغییر یافت.`,
    );
  };
  // Internal Consumption Handler
  const handleAddInternalConsumption = (record) => {
    const movements = record.items.map((it) => {
      const p = appState.products.find((pr) => pr.id === it.productId);
      const prevStock = p ? p.stockQuantity : 0;
      return {
        id: "mov-" + Date.now() + "-" + Math.random(),
        productId: it.productId,
        productName: it.productName,
        type: "internal_consumption",
        quantity: -it.qty,
        previousStock: prevStock,
        newStock: Math.max(0, prevStock - it.qty),
        date: record.date,
        jalaliDate: record.jalaliDate,
        referenceId: record.serviceName,
        userId: currentUser.id,
        userName: currentUser.name,
      };
    });
    setAppState((prev) => {
      const updatedProducts = prev.products.map((p) => {
        const consumed = record.items.find((it) => it.productId === p.id);
        if (consumed) {
          return {
            ...p,
            stockQuantity: Math.max(0, p.stockQuantity - consumed.qty),
          };
        }
        return p;
      });
      return {
        ...prev,
        internalConsumptions: [record, ...prev.internalConsumptions],
        products: updatedProducts,
        stockMovements: [...movements, ...prev.stockMovements],
      };
    });
    addAuditLog(
      "ثبت مصرف داخلی",
      "inventory",
      `مصرف داخلی اقلام برای ${record.serviceName} ثبت گردید.`,
    );
  };
  // Cancel Sales Invoice
  const handleCancelSalesInvoice = (invoiceId, reason) => {
    const inv = appState.salesInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    // Return stock
    const updatedProducts = appState.products.map((p) => {
      const itemInInv = inv.items.find((it) => it.productId === p.id);
      if (itemInInv) {
        return {
          ...p,
          stockQuantity: p.stockQuantity + itemInInv.qty,
        };
      }
      return p;
    });
    // Reduce patient debt if credit sale
    let updatedPatients = appState.patients;
    if (inv.paymentMethod === "credit" && inv.patientId) {
      updatedPatients = appState.patients.map((pat) => {
        if (pat.id === inv.patientId) {
          return {
            ...pat,
            creditConfig: {
              ...pat.creditConfig,
              currentDebt: Math.max(
                0,
                pat.creditConfig.currentDebt - inv.payableAmount,
              ),
            },
          };
        }
        return pat;
      });
    }
    const updatedInvoices = appState.salesInvoices.map((i) =>
      i.id === invoiceId
        ? { ...i, status: "cancelled", cancelReason: reason }
        : i,
    );
    setAppState((prev) => ({
      ...prev,
      salesInvoices: updatedInvoices,
      products: updatedProducts,
      patients: updatedPatients,
    }));
    addAuditLog(
      "ابطال فاکتور فروش",
      "cancellation",
      `فاکتور ${inv.invoiceNumber} ابطال شد. دلیل: ${reason}`,
    );
  };
  // Record Wastage Handler
  const handleRecordWastage = (record) => {
    const p = appState.products.find((pr) => pr.id === record.productId);
    const prevStock = p ? p.stockQuantity : 0;
    const movement = {
      id: "mov-" + Date.now(),
      productId: record.productId,
      productName: record.productName,
      type: "wastage",
      quantity: -record.qty,
      previousStock: prevStock,
      newStock: Math.max(0, prevStock - record.qty),
      date: record.date,
      jalaliDate: record.jalaliDate,
      referenceId: record.reasonType,
      userId: currentUser.id,
      userName: currentUser.name,
    };
    setAppState((prev) => {
      const updatedProducts = prev.products.map((prod) => {
        if (prod.id === record.productId) {
          return {
            ...prod,
            stockQuantity: Math.max(0, prod.stockQuantity - record.qty),
          };
        }
        return prod;
      });
      return {
        ...prev,
        wastageRecords: [record, ...prev.wastageRecords],
        products: updatedProducts,
        stockMovements: [movement, ...prev.stockMovements],
      };
    });
    addAuditLog(
      "ثبت ضایعات کالا",
      "inventory",
      `مقدار ${record.qty} از ${record.productName} به علت ${record.reasonType} ضایعات شد.`,
    );
  };
  // Patient Debt Settlement Handler
  const handleSettlePatientDebt = (
    patientId,
    amount,
    paymentMethod,
    posRrn,
  ) => {
    setAppState((prev) => {
      try {
        return settlePatientDebt(prev, patientId, amount, paymentMethod, posRrn, currentUser);
      } catch (error) {
        alert(error?.message || "ثبت تسویه بدهی انجام نشد.");
        return prev;
      }
    });
  };
  // Reset Data Handler
  const handleResetData = () => {
    const freshState = resetToDefaultData();
    setAppState(freshState);
    alert("اطلاعات سامانه انبار و فروش با موفقیت بازنشانی شد.");
  };
  // Export / Import Backup JSON
  const handleExportBackup = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `bastian_clinic_backup_${Date.now()}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
  const handleImportBackup = (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.products && parsed.settings) {
        setAppState(parsed);
        alert("اطلاعات پشتیبان با موفقیت بارگذاری شد.");
      } else {
        alert("فایل وارد شده ساختار معتبر سامانه انبار درمانگاه را ندارد.");
      }
    } catch (e) {
      alert("خطا در خوانی فایل JSON پشتیبان.");
    }
  };
  // Calculated badge counts
  const lowStockCount = (appState.products || []).filter(
    (p) => p.stockQuantity <= p.minStock && p.active,
  ).length;
  const debtorsCount = (appState.patients || []).filter(
    (p) => p.creditConfig?.currentDebt > 0,
  ).length;
  const pendingUsersCount = (appState.users || []).filter(
    (u) => u.status === "pending",
  ).length;
  // Bastian Landing Portal Mode
  if (appMode === "portal") {
    return _jsx(BastianLandingPortal, {
      onOpenSuperAdminPanel: () => {
        setAppMode("center");
        setCurrentTab("centers_management");
      },
      onOpenCenterApp: (username) => {
        setAppMode("center");
        setCurrentTab("dashboard");
      },
    });
  }
  // Direct access is blocked. Authentication must come from the secure landing portal.
  if (!currentUser) {
    return _jsx("div", {
      className:
        "min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6",
      dir: "rtl",
      children: _jsxs("div", {
        className:
          "max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-xl",
        children: [
          _jsx("h1", {
            className: "text-xl font-bold mb-3",
            children:
              "\u0646\u0634\u0633\u062A \u0645\u0639\u062A\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F",
          }),
          _jsx("p", {
            className: "text-slate-300 text-sm mb-5",
            children:
              "\u0628\u0631\u0627\u06CC \u062D\u0641\u0627\u0638\u062A \u0627\u0632 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0645\u0631\u06A9\u0632\u060C \u0648\u0631\u0648\u062F \u0641\u0642\u0637 \u0627\u0632 \u062F\u0631\u06AF\u0627\u0647 \u0627\u0645\u0646 \u0628\u0627\u0633\u062A\u06CC\u0627\u0646 \u0627\u0646\u062C\u0627\u0645 \u0645\u06CC\u200C\u0634\u0648\u062F.",
          }),
          _jsx("button", {
            className:
              "w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-3 font-bold",
            onClick: () => window.location.reload(),
            children:
              "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0635\u0641\u062D\u0647 \u0648\u0631\u0648\u062F",
          }),
        ],
      }),
    });
  }
  // Center License & Expiration Check Gate
  const currentCenterNode = (appState.medicalCenters || []).find(
    (c) => c.id === (appState.currentCenterId || loadCurrentCenterId()),
  );
  const licenseResult = checkCenterLicense(
    appState.settings,
    currentCenterNode,
  );
  if (licenseResult.isExpired && !isSuperAdminOverride) {
    return _jsx(CenterRechargeErrorPage, { centerNode: currentCenterNode });
  }
  const userPersonalSettings = currentUser?.personalSettings;
  const themeMode = userPersonalSettings?.themeMode || "dark_obsidian";
  const customBgColor = userPersonalSettings?.customBgColor;
  const fontScale = userPersonalSettings?.fontSizeScale || "standard";
  let customRootStyle = {};
  if (themeMode === "navy_blue") {
    customRootStyle = { backgroundColor: "#0a1128", color: "#f1f5f9" };
  } else if (themeMode === "emerald_dark") {
    customRootStyle = { backgroundColor: "#041f1a", color: "#f0fdf4" };
  } else if (themeMode === "midnight_violet") {
    customRootStyle = { backgroundColor: "#120a2a", color: "#faf5ff" };
  } else if (themeMode === "warm_sand") {
    customRootStyle = { backgroundColor: "#f7f5f0", color: "#1e293b" };
  } else if (themeMode === "clean_light") {
    customRootStyle = { backgroundColor: "#f1f5f9", color: "#0f172a" };
  } else if (themeMode === "custom" && customBgColor) {
    customRootStyle = {
      backgroundColor: customBgColor,
      color: userPersonalSettings?.customTextColor || "#ffffff",
    };
  }
  let fontScaleClass = "";
  if (fontScale === "large") fontScaleClass = "text-[105%]";
  if (fontScale === "xlarge") fontScaleClass = "text-[112%]";
  return _jsxs("div", {
    style: customRootStyle,
    className: `min-h-screen bg-slate-950 text-slate-100 flex flex-col font-vazir dir-rtl pb-16 lg:pb-0 transition-colors duration-300 ${fontScaleClass}`,
    children: [
      _jsx(MandatoryUpdateModal, {}),
      _jsx(Header, {
        settings: appState.settings,
        currentUser: currentUser,
        users: appState.users,
        onUserChange: handleUserChange,
        pendingRequestsCount:
          (appState.supplyRequests || []).filter(
            (s) => s.status === "pending_approval",
          ).length +
          (appState.attendanceRequests || []).filter(
            (a) => a.status === "pending",
          ).length,
        onApproveAllRequests: handleApproveAllRequests,
        onOpenCartable: () => setCurrentTab("my_cartable"),
        lowStockCount: lowStockCount,
        onOpenLowStock: () => setCurrentTab("inventory"),
        onToggleMobileMenu: () => setIsMobileMenuOpen(true),
        onLogout: handleLogout,
        onUpdateSettings: (s) =>
          setAppState((prev) => ({ ...prev, settings: s })),
        onOpenMyProfile: () => setIsUserProfileModalOpen(true),
        onOpenCentersManagement: () => setCurrentTab("centers_management"),
      }),
      currentUser &&
        currentUser.role !== "admin" &&
        (sessionStorage.getItem("bastiyan_superadmin_override") === "1" ||
          sessionStorage.getItem("bastian_superadmin_override") === "1") &&
        _jsxs("div", {
          className:
            "bg-amber-500 text-slate-950 px-4 py-2 font-bold text-xs flex flex-wrap items-center justify-between gap-2 border-b border-amber-600 shadow-sm z-30",
          dir: "rtl",
          children: [
            _jsxs("div", {
              className: "flex items-center gap-2",
              children: [
                _jsx(ShieldAlert, {
                  className: "w-4 h-4 text-slate-950 animate-bounce shrink-0",
                }),
                _jsxs("span", {
                  children: [
                    "\u062D\u0627\u0644\u062A \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u0646\u0642\u0634 ",
                    _jsxs("strong", {
                      children: [
                        "\u00AB",
                        currentUser.role === "doctor"
                          ? "پزشک / متخصص"
                          : currentUser.role === "nurse"
                            ? "پرستار"
                            : currentUser.role === "cashier"
                              ? "صندوقدار / پذیرش"
                              : currentUser.role === "inventory_manager"
                                ? "مسئول انبار"
                                : currentUser.role === "accountant"
                                  ? "حسابدار کلینیک"
                                  : currentUser.role === "purchaser"
                                    ? "مسئول خرید"
                                    : currentUser.role ===
                                        "operating_room_supervisor"
                                      ? "مسئول اتاق عمل"
                                      : "کاربر پرسنل",
                        "\u00BB",
                      ],
                    }),
                    " (\u06A9\u0627\u0631\u0628\u0631: ",
                    currentUser.name,
                    ") \u2014 \u0645\u0646\u0648\u06CC \u06A9\u0646\u0627\u0631\u06CC\u060C \u0627\u0645\u06A9\u0627\u0646\u0627\u062A \u0648 \u062F\u0633\u062A\u0631\u0633\u06CC\u200C\u0647\u0627 \u062F\u0642\u06CC\u0642\u0627 \u0645\u0637\u0627\u0628\u0642 \u0628\u0627 \u0646\u0642\u0634 \u0627\u06CC\u0646 \u06A9\u0627\u0631\u0628\u0631 \u0645\u062D\u062F\u0648\u062F \u06AF\u0634\u062A\u0647 \u0627\u0633\u062A.",
                  ],
                }),
              ],
            }),
            _jsx("button", {
              onClick: () => {
                const adminUsr =
                  appState.users.find((u) => u.role === "admin") ||
                  appState.users[0];
                if (adminUsr) setCurrentUser(adminUsr);
              },
              className:
                "bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-white px-3 py-1 rounded-lg text-[11px] font-bold transition shrink-0 shadow-sm",
              children:
                "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0645\u062F\u06CC\u0631 \u06A9\u0644 \u0633\u06CC\u0633\u062A\u0645 (Super Admin)",
            }),
          ],
        }),
      _jsxs("div", {
        className:
          "flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-2 sm:p-4 gap-4",
        children: [
          _jsx(Sidebar, {
            currentTab: currentTab,
            onTabChange: setCurrentTab,
            userRole: currentUser.role,
            currentUser: currentUser,
            lowStockCount: lowStockCount,
            debtorsCount: debtorsCount,
            pendingUsersCount: pendingUsersCount,
            isOpenOnMobile: isMobileMenuOpen,
            onCloseMobile: () => setIsMobileMenuOpen(false),
            logoUrl: appState.settings.logoUrl,
            clinicName: appState.settings.clinicName,
          }),
          _jsx("main", {
            className: "flex-1 min-w-0",
            children: _jsx(AnimatePresence, {
              mode: "wait",
              children: _jsxs(
                motion.div,
                {
                  initial: { opacity: 0, y: 8 },
                  animate: { opacity: 1, y: 0 },
                  exit: { opacity: 0, y: -6 },
                  transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] },
                  className: "w-full h-full",
                  children: [
                    currentTab === "dashboard" &&
                      _jsx(Dashboard, {
                        settings: appState.settings,
                        products: appState.products,
                        salesInvoices: appState.salesInvoices,
                        patients: appState.patients,
                        visitQueue: appState.visitQueue || [],
                        appointments: appState.appointments || [],
                        expenses: appState.expenses || [],
                        users: appState.users || [],
                        attendanceRecords: appState.attendanceRecords || [],
                        shifts:appState.shifts||[],
                        workSchedules:appState.workSchedules||[],
                        currentUser: currentUser,
                        onSaveAttendance: (att) => setAppState((prev) => ({ ...prev, attendanceRecords: att })),
                        onNavigateTab: setCurrentTab,
                      }),
                    (currentTab === "reception_queue" || currentTab === "cashier_module") &&
                      _jsx(UnifiedEncounterWorkflow, {
                        initialStage:
                          currentTab === "cashier_module"
                            ? "discharge"
                            : (currentUser?.role === "doctor" || currentUser?.roles?.includes("doctor"))
                              ? "doctor"
                              : ((currentUser?.role === "nurse" || currentUser?.roles?.includes("nurse")) ? "nurse" : "reception"),
                        patients: appState.patients,
                        visitQueue: appState.visitQueue || [],
                        doctors: appState.doctors || [],
                        users: appState.users || [],
                        staffAccounts: appState.staffAccounts || [],
                        medicalServices: appState.medicalServices || [],
                        serviceCategories: appState.serviceCategories || [],
                        products: appState.products || [],
                        currentUser: currentUser,
                        settings: appState.settings,
                        initialPatientId: receptionAdmissionPatientId,
                        onInitialPatientHandled: () => setReceptionAdmissionPatientId(""),
                        onAddPatient: handleAddPatient,
                        onUpdatePatient: handleUpdatePatient,
                        onAddQueueItem: handleAddQueueItem,
                        onUpdateQueueItem: handleUpdateQueueItem,
                        onAddService: handleAddService,
                        onNavigateToTab: setCurrentTab,
                        onSettleDebt: handleSettlePatientDebt,
                        onOpenPatientProfile: handleOpenPatientProfile,
                        onAddAppointment: handleAddAppointment,
                        onAddPaymentReceipt: handleAddPaymentReceipt,
                        onAddDiscountRecord: handleAddDiscountRecord,
                      }),
                    currentTab === "doctor_panel" &&
                      _jsx(UnifiedEncounterWorkflow, {
                        initialStage: (currentUser?.role === "nurse" || currentUser?.roles?.includes("nurse")) ? "nurse" : "doctor",
                        patients: appState.patients, visitQueue: appState.visitQueue || [], doctors: appState.doctors || [],
                        users: appState.users || [], staffAccounts: appState.staffAccounts || [], medicalServices: appState.medicalServices || [],
                        serviceCategories: appState.serviceCategories || [], products: appState.products || [], currentUser: currentUser, settings: appState.settings,
                        onAddPatient: handleAddPatient, onUpdatePatient: handleUpdatePatient, onAddQueueItem: handleAddQueueItem, onUpdateQueueItem: handleUpdateQueueItem,
                        onAddService: handleAddService, onNavigateToTab: setCurrentTab, onSettleDebt: handleSettlePatientDebt, onOpenPatientProfile: handleOpenPatientProfile, onAddAppointment: handleAddAppointment, onAddPaymentReceipt: handleAddPaymentReceipt, onAddDiscountRecord: handleAddDiscountRecord,
                      }),
                    currentTab === "tamin_epresc" &&
                      _jsx(TaminEPrescriptionPanel, {
                        state: appState,
                        onUpdateState: setAppState,
                        currentUserDoctor:
                          appState.doctors?.find(
                            (d) =>
                              d.medicalCouncilNumber ===
                              currentUser?.medicalCouncilNumber,
                          ) ||
                          appState.doctors?.[0] ||
                          null,
                      }),
                    currentTab === "sms_management" &&
                      _jsx(SmsManagementPanel, {
                        settings: appState.settings,
                        patients: appState.patients || [],
                        visitQueue: appState.visitQueue || [],
                        appointments: appState.appointments || [],
                        medicalServices: appState.medicalServices || [],
                        currentUser: currentUser,
                        onUpdateSettings: (s) => setAppState((prev) => ({ ...prev, settings: s })),
                      }),
                    currentTab === "appointments_plans" &&
                      _jsx(AppointmentPlanningPanel, {
                        appointments: appState.appointments || [],
                        patients: appState.patients || [],
                        doctors: appState.doctors || [],
                        users: appState.users || [],
                        medicalServices: appState.medicalServices || [],
                        serviceCategories: appState.serviceCategories || [],
                        settings: appState.settings,
                        onAddAppointment: handleAddAppointment,
                        onUpdateAppointment: handleUpdateAppointment,
                      }),
                    currentTab === "insurance_management" &&
                      _jsx(InsuranceManagement, { medicalServices: appState.medicalServices || [], serviceCategories: appState.serviceCategories || [], products: appState.products || [], productCategories: appState.categories || [], settings: appState.settings, onUpdateSettings: (s) => setAppState((prev) => ({ ...prev, settings: s })) }),
                    currentTab === "discount_management" &&
                      _jsx(DiscountManagement, { settings: appState.settings, onUpdateSettings: (s) => setAppState((prev) => ({ ...prev, settings: s })) }),
                    currentTab === "services_tariffs" &&
                      _jsx(ServicesTariffs, {
                        medicalServices: appState.medicalServices || [],
                        serviceCategories: appState.serviceCategories || [],
                        settings: appState.settings,
                        currentUser: currentUser,
                        onAddService: handleAddService,
                        onUpdateService: handleUpdateService,
                        onDeleteService: handleDeleteService,
                        onUpdateServiceCategories:
                          handleUpdateServiceCategories,
                        onUpdateSettings: (newSettings) =>
                          setAppState((prev) => ({
                            ...prev,
                            settings: newSettings,
                          })),
                      }),
                    currentTab === "consent_forms" &&
                      _jsx(ConsentForms, {
                        patients: appState.patients,
                        signedConsents: appState.signedConsents || [],
                        visitQueue: appState.visitQueue || [],
                        settings: appState.settings,
                        currentUser: currentUser,
                        onSaveSignedConsent: handleSaveSignedConsent,
                        formTemplates: appState.customFormTemplates,
                        onSaveFormTemplates: (tmpls) =>
                          setAppState((prev) => ({
                            ...prev,
                            customFormTemplates: tmpls,
                          })),
                        onOpenPatientProfile: handleOpenPatientProfile,
                      }),
                    currentTab === "my_cartable" &&
                      currentUser &&
                      _jsx(MyCartable, {
                        currentUser: currentUser,
                        users: appState.users,
                        attendanceRequests: appState.attendanceRequests || [],
                        onSaveAttendanceRequests: (reqs) =>
                          setAppState((prev) => ({
                            ...prev,
                            attendanceRequests: reqs,
                          })),
                        attendanceRecords: appState.attendanceRecords || [],
                        onSaveAttendance: (att) =>
                          setAppState((prev) => ({
                            ...prev,
                            attendanceRecords: att,
                          })),
                        shifts: appState.shifts || [],
                        settings: appState.settings,
                        supplyRequests: appState.supplyRequests || [],
                        products: appState.products || [],
                        onCreateSupplyRequest: handleCreateSupplyRequest,
                        onUpdateSupplyRequest: handleUpdateSupplyRequest,
                      }),
                    currentTab === "hr_payroll" &&
                      _jsx(HrPayrollModule, {
                        users: appState.users,
                        currentUser: currentUser,
                        settings: appState.settings,
                        shifts: appState.shifts || [],
                        attendanceRecords: appState.attendanceRecords || [],
                        attendanceRequests: appState.attendanceRequests || [],
                        payrolls: appState.payrolls || [],
                        staffAccounts: appState.staffAccounts || [],
                        workSchedules: appState.workSchedules || [],
                        payrollAdjustments: appState.payrollAdjustments || [],
                        visitQueue: appState.visitQueue || [],
                        medicalServices: appState.medicalServices || [],
                        products: appState.products || [],
                        onSaveShifts: (sh) =>
                          setAppState((prev) => ({ ...prev, shifts: sh })),
                        onSaveAttendance: (att) =>
                          setAppState((prev) => ({
                            ...prev,
                            attendanceRecords: att,
                          })),
                        onSaveAttendanceRequests: (reqs) =>
                          setAppState((prev) => ({
                            ...prev,
                            attendanceRequests: reqs,
                          })),
                        onSavePayrolls: (pay) =>
                          setAppState((prev) => ({ ...prev, payrolls: pay })),
                        onSaveStaffAccounts: (acc) =>
                          setAppState((prev) => ({
                            ...prev,
                            staffAccounts: acc,
                          })),
                        onSaveWorkSchedules: (rules) =>
                          setAppState((prev) => ({
                            ...prev,
                            workSchedules: rules,
                          })),
                        onSavePayrollAdjustments: (items) =>
                          setAppState((prev) => ({
                            ...prev,
                            payrollAdjustments: items,
                          })),
                        onAddExpense: handleAddExpense,
                      }),
                    currentTab === "rbac_users" &&
                      _jsx(UserManagementRBAC, {
                        users: appState.users,
                        currentUser: currentUser,
                        settings: appState.settings,
                        onAddUser: handleAddUser,
                        onUpdateUser: handleUpdateUser,
                      }),
                    currentTab === "accounting_expenses" &&
                      _jsx(AccountingExpenses, {
                        expenses: appState.expenses || [],
                        salesInvoices: appState.salesInvoices || [],
                        purchaseInvoices: appState.purchaseInvoices || [],
                        doctors: appState.doctors || [],
                        medicalServices: appState.medicalServices || [],
                        settings: appState.settings,
                        currentUser: currentUser,
                        onAddExpense: handleAddExpense,
                        onSaveSettings: (s) =>
                          setAppState((prev) => ({ ...prev, settings: s })),
                      }),
                    currentTab === "inventory" &&
                      _jsx(ProductsInventory, {
                        products: appState.products,
                        categories: appState.categories,
                        warehouses: appState.warehouses,
                        movements: appState.stockMovements,
                        currentUser: currentUser,
                        currencyUnit: appState.settings.currencyUnit,
                        onAddProduct: handleAddProduct,
                        onUpdateProduct: handleUpdateProduct,
                        onDeleteProduct: handleDeleteProduct,
                        onOpenBarcodeModal: (prod) =>
                          setBarcodeProductModal(prod),
                        onOpenWebcamScanner: () => setShowWebcamScanner(true),
                      }),
                    currentTab === "purchase" &&
                      _jsx(PurchaseEntry, {
                        products: appState.products,
                        currentUser: currentUser,
                        currencyUnit: appState.settings.currencyUnit,
                        purchaseInvoices: appState.purchaseInvoices || [],
                        settings: appState.settings,
                        onAddPurchaseInvoice: handleAddPurchaseInvoice,
                        onAddProduct: handleAddProduct,
                      }),
                    currentTab === "patients_credit" &&
                      _jsx(PatientsCredit, {
                        patients: appState.patients,
                        currentUser: currentUser,
                        currencyUnit: appState.settings.currencyUnit,
                        onAddPatient: handleAddPatient,
                        onUpdatePatient: handleUpdatePatient,
                        onSettleDebt: handleSettlePatientDebt,
                        onOpenPatientProfile: handleOpenPatientProfile,
                      }),
                    currentTab === "internal_consumption" &&
                      _jsx(InternalConsumptionComponent, {
                        products: appState.products,
                        currentUser: currentUser,
                        onAddInternalConsumption: handleAddInternalConsumption,
                      }),
                    currentTab === "returns_wastage" &&
                      _jsx(ReturnsWastage, {
                        products: appState.products,
                        salesInvoices: appState.salesInvoices,
                        currentUser: currentUser,
                        onCancelInvoice: handleCancelSalesInvoice,
                        onRecordWastage: handleRecordWastage,
                      }),
                    currentTab === "reports" &&
                      _jsx(ReportsFinancials, {
                        salesInvoices: appState.salesInvoices,
                        purchaseInvoices: appState.purchaseInvoices,
                        products: appState.products,
                        patients: appState.patients,
                        currencyUnit: appState.settings.currencyUnit,
                        state: appState,
                        currentUser: currentUser,
                        onSaveCustomReports: (customReports) =>
                          setAppState((prev) => ({ ...prev, customReports })),
                      }),
                    currentTab === "audit_logs" &&
                      _jsx(AuditLogs, { logs: appState.auditLogs }),
                    currentTab === "settings" &&
                      _jsx(SettingsBackup, {
                        settings: appState.settings,
                        users: appState.users,
                        onSaveSettings: (s) =>
                          setAppState((prev) => ({ ...prev, settings: s })),
                        onResetData: handleResetData,
                        onExportBackup: handleExportBackup,
                        onImportBackup: handleImportBackup,
                        onOpenGroupingModal: () => setShowGroupingModal(true),
                      }),
                    currentTab === "package_install" &&
                      _jsx(AppPackageInstall, {
                        settings: appState.settings,
                        userRole: currentUser?.role || "admin",
                      }),
                    currentTab === "centers_management" &&
                      _jsx(CentersManagementPanel, {
                        settings: appState.settings,
                        medicalCenters: appState.medicalCenters,
                        onSwitchCenter: handleSwitchCenter,
                        onRemoteSuperAdminLogin: handleSwitchCenter,
                        onUpdateCenters: (updatedCenters) => {
                          setAppState((prev) => ({
                            ...prev,
                            medicalCenters: updatedCenters,
                          }));
                        },
                      }),
                    currentTab === "archived_features" &&
                      _jsx(ArchivedFeatures, {
                        settings: appState.settings,
                        auditLogs: appState.auditLogs,
                        userRole: currentUser?.role || "admin",
                      }),
                  ],
                },
                currentTab,
              ),
            }),
          }),
        ],
      }),
      _jsx(GroupingManagementModal, {
        isOpen: showGroupingModal,
        onClose: () => setShowGroupingModal(false),
        categories: appState.categories,
        warehouses: appState.warehouses,
        serviceCategories: appState.serviceCategories || [],
        reportCategories: appState.reportCategories || [],
        onUpdateCategories: handleUpdateCategories,
        onUpdateWarehouses: handleUpdateWarehouses,
        onUpdateServiceCategories: handleUpdateServiceCategories,
        onUpdateReportCategories: handleUpdateReportCategories,
      }),
      barcodeProductModal &&
        _jsx(BarcodePrintModal, {
          product: barcodeProductModal,
          settings: appState.settings,
          onClose: () => setBarcodeProductModal(null),
        }),
      showWebcamScanner &&
        _jsx(WebcamScannerModal, {
          products: appState.products,
          onScanBarcode: (barcode) => {
            setShowWebcamScanner(false);
            const clean = barcode.trim();
            const found = appState.products.find(
              (p) => p.barcode === clean || p.code === clean,
            );
            if (found) {
              setCurrentTab("inventory");
              alert(
                `کالای «${found.name}» با بارکد ${toPersianDigits(clean)} شناسایی شد.`,
              );
            } else {
              alert(
                `کالایی با بارکد «${toPersianDigits(clean)}» در انبار سیستم یافت نشد.`,
              );
            }
          },
          onClose: () => setShowWebcamScanner(false),
        }),
      printableInvoice &&
        _jsx(PrintableInvoiceModal, {
          invoice: printableInvoice,
          settings: appState.settings,
          onClose: () => setPrintableInvoice(null),
        }),
      selectedPatientForProfile &&
        _jsx(PatientProfileModal, {
          patient: selectedPatientForProfile,
          patients: appState.patients,
          isOpen: Boolean(selectedPatientForProfile),
          onClose: () => setSelectedPatientForProfile(null),
          users: appState.users,
          medicalServices: appState.medicalServices || [],
          visitQueue: appState.visitQueue || [],
          appointments: appState.appointments || [],
          treatmentPlans: appState.treatmentPlans || [],
          signedConsents: appState.signedConsents || [],
          salesInvoices: appState.salesInvoices || [],
          onUpdatePatient: (updated) => {
            handleUpdatePatient(updated);
            setSelectedPatientForProfile(updated);
          },
          onAddQueueItem: handleAddQueueItem,
          onStartClinicalAdmission: (targetPatient) => {
            setReceptionAdmissionPatientId(targetPatient?.id || "");
            setSelectedPatientForProfile(null);
            setCurrentTab("reception_queue");
          },
          currentUser: currentUser,
        }),
      _jsxs("div", {
        className:
          "fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 lg:hidden z-30 px-2 py-1.5 flex items-center justify-around text-slate-400",
        children: [
          _jsxs("button", {
            onClick: () => setCurrentTab("dashboard"),
            className: `flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold ${currentTab === "dashboard" ? "text-teal-400" : "text-slate-400"}`,
            children: [
              _jsx(Home, { className: "w-5 h-5" }),
              _jsx("span", {
                children: "\u062F\u0627\u0634\u0628\u0648\u0631\u062F",
              }),
            ],
          }),
          _jsxs("button", {
            onClick: () => setCurrentTab("reception_queue"),
            className: `flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold ${currentTab === "reception_queue" ? "text-teal-400" : "text-slate-400"}`,
            children: [
              _jsx(UserCheck, { className: "w-5 h-5" }),
              _jsx("span", { children: "فرآیند بیمار" }),
            ],
          }),
          _jsxs("button", {
            onClick: () => setCurrentTab("inventory"),
            className: `flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold ${currentTab === "inventory" ? "text-teal-400" : "text-slate-400"}`,
            children: [
              _jsx(Package, { className: "w-5 h-5" }),
              _jsx("span", { children: "\u0627\u0646\u0628\u0627\u0631" }),
            ],
          }),
          _jsxs("button", {
            onClick: () => setIsMobileMenuOpen(true),
            className:
              "flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold text-teal-300",
            children: [
              _jsx(Menu, { className: "w-5 h-5" }),
              _jsx("span", { children: "\u0645\u0646\u0648 \u06A9\u0644" }),
            ],
          }),
        ],
      }),
      _jsx(AppUpdateNotificationModal, {}),
      _jsx(NotificationToastContainer, { onNavigateTab: setCurrentTab }),
      _jsx(ClinicAiAssistant, {
        patients: appState.patients,
        appointments: appState.appointments,
        doctors: appState.doctors,
        medicalServices: appState.medicalServices,
        visitQueue: appState.visitQueue,
        products: appState.products,
        salesInvoices: appState.salesInvoices,
        expenses: appState.expenses,
        currentUser: currentUser || undefined,
        isSuperAdmin: isSuperAdminOverride || currentUser?.role === 'superadmin',
      }),
      currentUser &&
        _jsx(UserProfileModal, {
          isOpen: isUserProfileModalOpen,
          onClose: () => setIsUserProfileModalOpen(false),
          currentUser: currentUser,
          onUpdateUser: handleUpdateUser,
          onLogout: handleLogout,
        }),
    ],
  });
}
