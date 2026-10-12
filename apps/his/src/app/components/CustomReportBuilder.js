import React, { useMemo, useState } from "../../client-vendor/react.js?b=r24-514-1405";
import {
  Download,
  FilePlus2,
  Filter,
  Play,
  Save,
  Trash2,
} from "../../client-vendor/lucide-react.js?b=r24-514-1405";
import { exportDataToExcel } from "../utils/excelUtils.js?b=r24-514-1405";
const SOURCES = {
  serviceRecipients: {
    label:
      "\u062E\u062F\u0645\u0627\u062A \u0627\u0646\u062C\u0627\u0645\u200C\u0634\u062F\u0647 \u0628\u0631\u0627\u06CC \u0628\u06CC\u0645\u0627\u0631\u0627\u0646",
    columns: {
      patientName: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631",
      patientMobile:
        "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647",
      patientNationalId: "\u06A9\u062F \u0645\u0644\u06CC",
      serviceName: "\u062E\u062F\u0645\u062A / \u06A9\u0627\u0644\u0627",
      quantity: "\u062A\u0639\u062F\u0627\u062F",
      amount: "\u0645\u0628\u0644\u063A",
      date: "\u062A\u0627\u0631\u06CC\u062E",
      doctorName:
        "\u067E\u0632\u0634\u06A9 / \u0627\u0631\u0627\u0626\u0647\u200C\u062F\u0647\u0646\u062F\u0647",
      invoiceNumber:
        "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631",
      status: "\u0648\u0636\u0639\u06CC\u062A",
    },
  },
  patients: {
    label: "\u0628\u06CC\u0645\u0627\u0631\u0627\u0646",
    columns: {
      fullName: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631",
      mobilePhone:
        "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647",
      nationalId: "\u06A9\u062F \u0645\u0644\u06CC",
      fileNumber:
        "\u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647",
      lastVisitDate:
        "\u0622\u062E\u0631\u06CC\u0646 \u0645\u0631\u0627\u062C\u0639\u0647",
      currentDebt: "\u0628\u062F\u0647\u06CC \u062C\u0627\u0631\u06CC",
      verificationStatus:
        "\u0648\u0636\u0639\u06CC\u062A \u0647\u0648\u06CC\u062A",
    },
  },
  invoices: {
    label:
      "\u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0641\u0631\u0648\u0634",
    columns: {
      invoiceNumber:
        "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631",
      patientName: "\u0628\u06CC\u0645\u0627\u0631",
      patientMobile:
        "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647",
      jalaliDate: "\u062A\u0627\u0631\u06CC\u062E",
      payableAmount: "\u0645\u0628\u0644\u063A",
      paymentMethodLabel:
        "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A",
      createdByUserName:
        "\u0635\u0627\u062F\u0631\u06A9\u0646\u0646\u062F\u0647",
      status: "\u0648\u0636\u0639\u06CC\u062A",
    },
  },
  payments: {
    label:
      "\u062A\u0631\u0627\u06A9\u0646\u0634\u200C\u0647\u0627\u06CC \u0635\u0646\u062F\u0648\u0642",
    columns: {
      invoiceNumber:
        "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631",
      patientName: "\u0628\u06CC\u0645\u0627\u0631",
      methodLabel: "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A",
      amount: "\u0645\u0628\u0644\u063A",
      transactionNumber:
        "\u0634\u0645\u0627\u0631\u0647 \u062A\u0631\u0627\u06A9\u0646\u0634",
      transactionDate:
        "\u062A\u0627\u0631\u06CC\u062E \u062A\u0631\u0627\u06A9\u0646\u0634",
      transactionTime: "\u0633\u0627\u0639\u062A",
      bankName: "\u0628\u0627\u0646\u06A9 / \u062F\u0631\u06AF\u0627\u0647",
      terminalNumber: "\u067E\u0627\u06CC\u0627\u0646\u0647",
      cashier: "\u0635\u0646\u062F\u0648\u0642\u062F\u0627\u0631",
    },
  },
  appointments: {
    label: "\u0646\u0648\u0628\u062A\u200C\u0647\u0627",
    columns: {
      patientName: "\u0628\u06CC\u0645\u0627\u0631",
      patientMobile:
        "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647",
      doctorName: "\u067E\u0632\u0634\u06A9",
      serviceName: "\u062E\u062F\u0645\u062A",
      date: "\u062A\u0627\u0631\u06CC\u062E",
      time: "\u0633\u0627\u0639\u062A",
      status: "\u0648\u0636\u0639\u06CC\u062A",
    },
  },
  visitQueue: {
    label:
      "\u067E\u0630\u06CC\u0631\u0634 \u0648 \u0635\u0641 \u0645\u0631\u0627\u062C\u0639\u0647",
    columns: {
      patientName: "\u0628\u06CC\u0645\u0627\u0631",
      patientMobile:
        "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647",
      doctorName: "\u067E\u0632\u0634\u06A9",
      serviceName: "\u062E\u062F\u0645\u062A",
      jalaliDate: "\u062A\u0627\u0631\u06CC\u062E",
      turnNumber: "\u0634\u0645\u0627\u0631\u0647 \u0646\u0648\u0628\u062A",
      status: "\u0648\u0636\u0639\u06CC\u062A",
    },
  },
  products: {
    label:
      "\u06A9\u0627\u0644\u0627 \u0648 \u0645\u0648\u062C\u0648\u062F\u06CC",
    columns: {
      code: "\u06A9\u062F \u06A9\u0627\u0644\u0627",
      name: "\u0646\u0627\u0645",
      categoryName: "\u062F\u0633\u062A\u0647",
      stockQuantity: "\u0645\u0648\u062C\u0648\u062F\u06CC",
      minStock:
        "\u062D\u062F\u0627\u0642\u0644 \u0645\u0648\u062C\u0648\u062F\u06CC",
      purchasePrice: "\u0642\u06CC\u0645\u062A \u062E\u0631\u06CC\u062F",
      salesPrice: "\u0642\u06CC\u0645\u062A \u0641\u0631\u0648\u0634",
      activeLabel: "\u0648\u0636\u0639\u06CC\u062A",
    },
  },
  expenses: {
    label: "\u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627",
    columns: {
      title: "\u0639\u0646\u0648\u0627\u0646",
      category: "\u062F\u0633\u062A\u0647",
      amount: "\u0645\u0628\u0644\u063A",
      jalaliDate: "\u062A\u0627\u0631\u06CC\u062E",
      paymentMethod: "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A",
      description: "\u0634\u0631\u062D",
      createdByUserName:
        "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647",
    },
  },
  purchaseInvoices: {
    label:
      "\u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062E\u0631\u06CC\u062F",
    columns: {
      invoiceNumber: "\u0634\u0645\u0627\u0631\u0647",
      supplierName:
        "\u062A\u0623\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647",
      jalaliDate: "\u062A\u0627\u0631\u06CC\u062E",
      totalAmount: "\u0645\u0628\u0644\u063A \u06A9\u0644",
      createdByUserName:
        "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647",
      status: "\u0648\u0636\u0639\u06CC\u062A",
    },
  },
};
const DYNAMIC_SOURCE_LABELS = {
  doctors: "پزشکان و ارائه‌دهندگان خدمت",
  medicalServices: "خدمات و تعرفه‌های پزشکی",
  treatmentPlans: "برنامه‌های درمانی",
  signedConsents: "رضایت‌نامه‌های ثبت‌شده",
  smsLogs: "سوابق پیامک",
  stockMovements: "گردش موجودی انبار",
  supplyRequests: "درخواست‌های تامین کالا",
  internalConsumptions: "مصرف داخلی",
  wastageRecords: "مرجوعی و ضایعات",
  auditLogs: "رویدادها و لاگ‌های ممیزی",
  serviceCategories: "گروه‌های خدمات",
  reportCategories: "گروه‌های گزارش",
  warehouses: "انبارها",
  categories: "گروه‌های کالا",
  users: "کاربران و پرسنل",
  payrolls: "فیش‌ها و محاسبات حقوق",
  attendanceRecords: "حضور و غیاب",
  attendanceRequests: "درخواست‌های حضور و غیاب",
  staffAccounts: "حساب‌های پرسنلی",
  shifts: "شیفت‌های کاری",
};
const DYNAMIC_FIELD_LABELS = {
  id: "شناسه",
  name: "نام",
  fullName: "نام کامل",
  title: "عنوان",
  code: "کد",
  username: "نام کاربری",
  role: "نقش",
  department: "واحد / بخش",
  mobile: "شماره همراه",
  mobilePhone: "شماره همراه",
  nationalId: "کد ملی",
  status: "وضعیت",
  amount: "مبلغ",
  totalAmount: "مبلغ کل",
  date: "تاریخ",
  jalaliDate: "تاریخ شمسی",
  createdAt: "زمان ثبت",
  updatedAt: "زمان ویرایش",
  createdByUserName: "ثبت‌کننده",
  patientName: "نام بیمار",
  patientMobile: "شماره همراه بیمار",
  doctorName: "پزشک",
  serviceName: "خدمت",
  description: "شرح",
  action: "عملیات",
  category: "دسته",
  quantity: "تعداد",
};
const reportValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
};
const flattenReportRow = (row, prefix = "", output = {}, depth = 0) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    if (prefix) output[prefix] = reportValue(row);
    else output.value = reportValue(row);
    return output;
  }
  Object.entries(row).forEach(([key, value]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    const isPlainObject =
      value && typeof value === "object" && !Array.isArray(value);
    if (isPlainObject && depth < 3) flattenReportRow(value, field, output, depth + 1);
    else output[field] = reportValue(value);
  });
  return output;
};
function buildAvailableSources(state = {}) {
  const dynamic = {};
  Object.entries(state).forEach(([key, rows]) => {
    if (!Array.isArray(rows) || key === "customReports" || SOURCES[key]) return;
    const columns = {};
    rows.slice(0, 100).forEach((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return;
      Object.keys(flattenReportRow(row)).forEach((field) => {
        const leaf = field.split(".").pop();
        if (!columns[field])
          columns[field] = DYNAMIC_FIELD_LABELS[field] || DYNAMIC_FIELD_LABELS[leaf] || field;
      });
    });
    if (Object.keys(columns).length === 0) return;
    dynamic[`raw:${key}`] = {
      label: DYNAMIC_SOURCE_LABELS[key] || `داده‌های سیستم: ${key}`,
      columns,
      dynamic: true,
    };
  });
  return { ...SOURCES, ...dynamic };
}
const patientIndex = (patients = []) => new Map(patients.map((p) => [p.id, p]));
const compact = (value) => (value === null || value === void 0 ? "" : value);
function buildRows(source, state) {
  if (source.startsWith("raw:")) {
    const key = source.slice(4);
    return Array.isArray(state[key]) ? state[key].map(flattenReportRow) : [];
  }
  const patients = patientIndex(state.patients || []);
  const invoices = state.salesInvoices || [];
  if (source === "patients")
    return (state.patients || []).map((p) => ({
      ...p,
      currentDebt: p.creditConfig?.currentDebt || 0,
    }));
  if (source === "invoices")
    return invoices.map((inv) => ({
      ...inv,
      paymentMethodLabel:
        inv.payments?.[0]?.methodLabel ||
        {
          card: "PC-POS",
          cash: "\u0646\u0642\u062F\u06CC",
          credit: "\u0627\u0639\u062A\u0628\u0627\u0631\u06CC",
          split: "\u062A\u0631\u06A9\u06CC\u0628\u06CC",
        }[inv.paymentMethod] ||
        inv.paymentMethod,
    }));
  if (source === "payments")
    return invoices.flatMap((inv) =>
      (inv.payments || []).map((pay) => ({
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        cashier: inv.createdByUserName,
        methodLabel:
          pay.methodLabel ||
          {
            card: "PC-POS",
            cash: "\u0646\u0642\u062F\u06CC",
            credit: "\u0627\u0639\u062A\u0628\u0627\u0631\u06CC",
          }[pay.method] ||
          pay.method,
        amount: pay.amount,
        transactionNumber: pay.transactionNumber || pay.posReferenceCode || "",
        transactionDate:
          pay.transactionDate || pay.jalaliDate || inv.jalaliDate,
        transactionTime: pay.transactionTime || "",
        bankName: pay.bankName || "",
        terminalNumber: pay.terminalNumber || pay.posTerminalName || "",
      })),
    );
  if (source === "serviceRecipients") {
    const patientFields = (row) => {
      const patient = patients.get(row.patientId);
      return {
        patientName: row.patientName || patient?.fullName || "",
        patientMobile: row.patientMobile || patient?.mobilePhone || "",
        patientNationalId: row.patientNationalId || patient?.nationalId || "",
      };
    };
    const invoiceRows = invoices.flatMap((inv) =>
      (inv.items || []).map((item) => ({
        ...patientFields(inv),
        serviceName: item.serviceName || item.productName || item.name || "",
        quantity: item.qty || item.quantity || 1,
        amount: item.totalPrice || item.amount || item.unitPrice || 0,
        date: inv.jalaliDate || inv.date,
        doctorName: item.doctorName || inv.doctorName || "",
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
      })),
    );
    const queueRows = (state.visitQueue || []).map((row) => ({
      ...patientFields(row),
      serviceName:
        row.serviceName || row.serviceTitle || row.medicalServiceName || "",
      quantity: 1,
      amount: row.amount || row.tariffPrice || 0,
      date: row.jalaliDate || row.date,
      doctorName: row.doctorName || "",
      invoiceNumber: row.invoiceNumber || "",
      status: row.status || "",
    }));
    const appointmentRows = (state.appointments || []).map((row) => ({
      ...patientFields(row),
      serviceName: row.serviceName || row.serviceTitle || row.title || "",
      quantity: 1,
      amount: row.amount || 0,
      date: row.jalaliDate || row.date,
      doctorName: row.doctorName || "",
      invoiceNumber: row.invoiceNumber || "",
      status: row.status || "",
    }));
    const planRows = (state.treatmentPlans || []).flatMap((plan) => {
      const items = plan.services || plan.items || [plan];
      return items.map((item) => ({
        ...patientFields(plan),
        serviceName:
          item.serviceName ||
          item.serviceTitle ||
          item.title ||
          plan.title ||
          "",
        quantity: item.quantity || 1,
        amount: item.amount || item.price || 0,
        date: item.jalaliDate || plan.jalaliDate || plan.date,
        doctorName: item.doctorName || plan.doctorName || "",
        invoiceNumber: plan.invoiceNumber || "",
        status: item.status || plan.status || "",
      }));
    });
    return [
      ...invoiceRows,
      ...queueRows,
      ...appointmentRows,
      ...planRows,
    ].filter((row) => row.serviceName);
  }
  if (source === "appointments")
    return (state.appointments || []).map((row) => {
      const patient = patients.get(row.patientId);
      return {
        ...row,
        patientName: row.patientName || patient?.fullName || "",
        patientMobile: row.patientMobile || patient?.mobilePhone || "",
      };
    });
  if (source === "visitQueue")
    return (state.visitQueue || []).map((row) => {
      const patient = patients.get(row.patientId);
      return {
        ...row,
        patientName: row.patientName || patient?.fullName || "",
        patientMobile: row.patientMobile || patient?.mobilePhone || "",
      };
    });
  if (source === "products")
    return (state.products || []).map((p) => ({
      ...p,
      activeLabel:
        p.active === false
          ? "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644"
          : "\u0641\u0639\u0627\u0644",
    }));
  if (source === "expenses")
    return state.expenseRecords || state.expenses || [];
  if (source === "purchaseInvoices") return state.purchaseInvoices || [];
  return [];
}
function matches(row, filter) {
  const actual = String(compact(row[filter.field])).toLocaleLowerCase("fa");
  const expected = String(compact(filter.value)).toLocaleLowerCase("fa");
  if (!filter.field) return true;
  if (filter.operator === "contains") return actual.includes(expected);
  if (filter.operator === "not_contains") return !actual.includes(expected);
  if (filter.operator === "equals") return actual === expected;
  if (filter.operator === "not_equals") return actual !== expected;
  if (filter.operator === "starts") return actual.startsWith(expected);
  if (filter.operator === "greater")
    return Number(row[filter.field]) > Number(filter.value);
  if (filter.operator === "less")
    return Number(row[filter.field]) < Number(filter.value);
  if (filter.operator === "empty") return !actual;
  if (filter.operator === "not_empty") return Boolean(actual);
  return true;
}
const emptyDefinition = () => ({
  id: "",
  name: "",
  description: "",
  source: "serviceRecipients",
  columns: ["patientName", "patientMobile", "serviceName", "date"],
  filters: [{ field: "serviceName", operator: "contains", value: "" }],
});
function CustomReportBuilder({
  state = {},
  savedReports = [],
  onSaveReports,
  currentUser,
}) {
  const [definition, setDefinition] = useState(emptyDefinition);
  const [showBuilder, setShowBuilder] = useState(savedReports.length === 0);
  const sources = useMemo(() => buildAvailableSources(state), [state]);
  const sourceConfig = sources[definition.source] || SOURCES.serviceRecipients;
  const allRows = useMemo(
    () => buildRows(definition.source, state),
    [definition.source, state],
  );
  const filteredRows = useMemo(
    () =>
      allRows.filter((row) =>
        definition.filters.every((filter) => matches(row, filter)),
      ),
    [allRows, definition.filters],
  );
  const displayedRows = filteredRows.slice(0, 100);
  const setSource = (source) =>
    setDefinition({
      ...definition,
      source,
      columns: Object.keys(sources[source].columns).slice(0, 5),
      filters: [
        {
          field: Object.keys(sources[source].columns)[0],
          operator: "contains",
          value: "",
        },
      ],
    });
  const toggleColumn = (key) =>
    setDefinition({
      ...definition,
      columns: definition.columns.includes(key)
        ? definition.columns.filter((item) => item !== key)
        : [...definition.columns, key],
    });
  const updateFilter = (index, patch) =>
    setDefinition({
      ...definition,
      filters: definition.filters.map((filter, i) =>
        i === index ? { ...filter, ...patch } : filter,
      ),
    });
  const addFilter = () =>
    setDefinition({
      ...definition,
      filters: [
        ...definition.filters,
        {
          field: Object.keys(sourceConfig.columns)[0],
          operator: "contains",
          value: "",
        },
      ],
    });
  const removeFilter = (index) =>
    setDefinition({
      ...definition,
      filters: definition.filters.filter((_, i) => i !== index),
    });
  const saveReport = () => {
    if (!definition.name.trim())
      return alert(
        "\u0628\u0631\u0627\u06CC \u06AF\u0632\u0627\u0631\u0634 \u06CC\u06A9 \u0646\u0627\u0645 \u0645\u0634\u062E\u0635 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.",
      );
    if (definition.columns.length === 0)
      return alert(
        "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u0633\u062A\u0648\u0646 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.",
      );
    const saved = {
      ...definition,
      id: definition.id || `report-${Date.now()}`,
      name: definition.name.trim(),
      updatedAt: /* @__PURE__ */ new Date().toISOString(),
      updatedBy:
        currentUser?.name ||
        "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645",
    };
    const next = definition.id
      ? savedReports.map((item) => (item.id === definition.id ? saved : item))
      : [saved, ...savedReports];
    onSaveReports(next);
    setDefinition(saved);
    setShowBuilder(false);
  };
  const runSaved = (report) => {
    setDefinition({ ...report });
    setShowBuilder(false);
  };
  const editSaved = (report) => {
    setDefinition({ ...report });
    setShowBuilder(true);
  };
  const deleteSaved = (id) => {
    if (
      confirm(
        "\u0627\u06CC\u0646 \u06AF\u0632\u0627\u0631\u0634 \u0630\u062E\u06CC\u0631\u0647\u200C\u0634\u062F\u0647 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F",
      )
    )
      onSaveReports(savedReports.filter((item) => item.id !== id));
  };
  const exportRows = () =>
    exportDataToExcel(
      filteredRows.map((row) =>
        Object.fromEntries(
          definition.columns.map((key) => [
            sourceConfig.columns[key],
            compact(row[key]),
          ]),
        ),
      ),
      definition.name ||
        "\u06AF\u0632\u0627\u0631\u0634_\u0633\u0641\u0627\u0631\u0634\u06CC",
      "\u06AF\u0632\u0627\u0631\u0634",
    );
  const createBotoxTemplate = () => {
    setDefinition({
      id: "",
      name: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062A\u0632\u0631\u06CC\u0642 \u0628\u0648\u062A\u0627\u06A9\u0633",
      description:
        "\u0641\u0647\u0631\u0633\u062A \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062F\u0627\u0631\u0627\u06CC \u062E\u062F\u0645\u062A \u062A\u0632\u0631\u06CC\u0642 \u0628\u0648\u062A\u0627\u06A9\u0633 \u0628\u0647 \u0647\u0645\u0631\u0627\u0647 \u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647",
      source: "serviceRecipients",
      columns: [
        "patientName",
        "patientMobile",
        "patientNationalId",
        "serviceName",
        "date",
        "doctorName",
      ],
      filters: [
        {
          field: "serviceName",
          operator: "contains",
          value: "\u0628\u0648\u062A\u0627\u06A9\u0633",
        },
      ],
    });
    setShowBuilder(true);
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "space-y-5" },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-l from-teal-950/50 to-slate-900 border border-teal-800/40 rounded-2xl p-5 flex flex-col md:flex-row gap-3 md:items-center justify-between",
      },
      /* @__PURE__ */ React.createElement(
        "div",
        null,
        /* @__PURE__ */ React.createElement(
          "h2",
          { className: "font-black text-slate-100" },
          "\u06AF\u0632\u0627\u0631\u0634\u200C\u0633\u0627\u0632 \u062D\u0631\u0641\u0647\u200C\u0627\u06CC \u0628\u0627\u0633\u062A\u06CC\u0627\u0646",
        ),
        /* @__PURE__ */ React.createElement(
          "p",
          { className: "text-xs text-slate-400 mt-1" },
          "\u0645\u0646\u0628\u0639\u060C \u0633\u062A\u0648\u0646\u200C\u0647\u0627 \u0648 \u0641\u06CC\u0644\u062A\u0631\u0647\u0627 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F\u061B \u06AF\u0632\u0627\u0631\u0634 \u0631\u0627 \u062F\u0631 \u067E\u0646\u0644 \u0630\u062E\u06CC\u0631\u0647 \u0648 \u0647\u0631 \u0632\u0645\u0627\u0646 \u0627\u062C\u0631\u0627 \u06CC\u0627 \u0628\u0647 Excel \u0635\u0627\u062F\u0631 \u06A9\u0646\u06CC\u062F.",
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "flex flex-wrap gap-2" },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: createBotoxTemplate,
            className:
              "bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs px-3 py-2 rounded-xl",
          },
          "\u0646\u0645\u0648\u0646\u0647 \u0622\u0645\u0627\u062F\u0647: \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u0628\u0648\u062A\u0627\u06A9\u0633",
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setDefinition(emptyDefinition());
              setShowBuilder(true);
            },
            className:
              "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1",
          },
          /* @__PURE__ */ React.createElement(FilePlus2, {
            className: "w-4 h-4",
          }),
          " \u06AF\u0632\u0627\u0631\u0634 \u062C\u062F\u06CC\u062F",
        ),
      ),
    ),
    savedReports.length > 0 &&
      /* @__PURE__ */ React.createElement(
        "div",
        null,
        /* @__PURE__ */ React.createElement(
          "h3",
          { className: "text-xs font-bold text-slate-300 mb-2" },
          "\u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u0627\u0641\u0632\u0648\u062F\u0647\u200C\u0634\u062F\u0647 \u0628\u0647 \u067E\u0646\u0644 \u0645\u0646",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" },
          savedReports.map((report) =>
            /* @__PURE__ */ React.createElement(
              "div",
              {
                key: report.id,
                className:
                  "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3",
              },
              /* @__PURE__ */ React.createElement(
                "div",
                null,
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "font-bold text-slate-100 text-sm" },
                  report.name,
                ),
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "text-[11px] text-slate-500 mt-1" },
                  sources[report.source]?.label || report.source,
                  " \xB7 ",
                  report.columns.length,
                  " \u0633\u062A\u0648\u0646",
                ),
              ),
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "flex gap-2" },
                /* @__PURE__ */ React.createElement(
                  "button",
                  {
                    onClick: () => runSaved(report),
                    className:
                      "flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs py-2 rounded-lg flex justify-center gap-1",
                  },
                  /* @__PURE__ */ React.createElement(Play, {
                    className: "w-3.5 h-3.5",
                  }),
                  " \u0627\u062C\u0631\u0627",
                ),
                /* @__PURE__ */ React.createElement(
                  "button",
                  {
                    onClick: () => editSaved(report),
                    className:
                      "bg-slate-800 text-slate-300 text-xs px-3 rounded-lg",
                  },
                  "\u0648\u06CC\u0631\u0627\u06CC\u0634",
                ),
                /* @__PURE__ */ React.createElement(
                  "button",
                  {
                    onClick: () => deleteSaved(report.id),
                    className: "bg-rose-950/50 text-rose-400 px-2 rounded-lg",
                  },
                  /* @__PURE__ */ React.createElement(Trash2, {
                    className: "w-4 h-4",
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    showBuilder &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5",
        },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-3 gap-3" },
          /* @__PURE__ */ React.createElement(
            "div",
            null,
            /* @__PURE__ */ React.createElement(
              "label",
              { className: "text-[11px] text-slate-400" },
              "\u0646\u0627\u0645 \u06AF\u0632\u0627\u0631\u0634 *",
            ),
            /* @__PURE__ */ React.createElement("input", {
              className:
                "w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-3 py-2.5 rounded-xl",
              value: definition.name,
              onChange: (e) =>
                setDefinition({ ...definition, name: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "md:col-span-2" },
            /* @__PURE__ */ React.createElement(
              "label",
              { className: "text-[11px] text-slate-400" },
              "\u0645\u0646\u0628\u0639 \u062F\u0627\u062F\u0647",
            ),
            /* @__PURE__ */ React.createElement(
              "select",
              {
                className:
                  "w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-3 py-2.5 rounded-xl",
                value: definition.source,
                onChange: (e) => setSource(e.target.value),
              },
              Object.entries(sources).map(([key, config]) =>
                /* @__PURE__ */ React.createElement(
                  "option",
                  { key, value: key },
                  config.label,
                ),
              ),
            ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          null,
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "text-xs font-bold text-slate-300 mb-2" },
            "\u0633\u062A\u0648\u0646\u200C\u0647\u0627\u06CC \u062E\u0631\u0648\u062C\u06CC",
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "flex flex-wrap gap-2" },
            Object.entries(sourceConfig.columns).map(([key, label]) =>
              /* @__PURE__ */ React.createElement(
                "label",
                {
                  key,
                  className: `px-3 py-2 rounded-xl border text-xs cursor-pointer ${definition.columns.includes(key) ? "bg-emerald-500/15 border-emerald-500 text-emerald-300" : "bg-slate-950 border-slate-700 text-slate-400"}`,
                },
                /* @__PURE__ */ React.createElement("input", {
                  type: "checkbox",
                  className: "hidden",
                  checked: definition.columns.includes(key),
                  onChange: () => toggleColumn(key),
                }),
                label,
              ),
            ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          null,
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "flex justify-between items-center mb-2" },
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "text-xs font-bold text-slate-300 flex gap-1" },
              /* @__PURE__ */ React.createElement(Filter, {
                className: "w-4 h-4",
              }),
              " \u0641\u06CC\u0644\u062A\u0631\u0647\u0627 (\u0647\u0645\u0647 \u0634\u0631\u0648\u0637)",
            ),
            /* @__PURE__ */ React.createElement(
              "button",
              { onClick: addFilter, className: "text-xs text-teal-300" },
              "+ \u0627\u0641\u0632\u0648\u062F\u0646 \u0634\u0631\u0637",
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "space-y-2" },
            definition.filters.map((filter, index) =>
              /* @__PURE__ */ React.createElement(
                "div",
                {
                  key: index,
                  className:
                    "grid grid-cols-1 md:grid-cols-[1fr_180px_1fr_40px] gap-2",
                },
                /* @__PURE__ */ React.createElement(
                  "select",
                  {
                    className:
                      "bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg",
                    value: filter.field,
                    onChange: (e) =>
                      updateFilter(index, { field: e.target.value }),
                  },
                  Object.entries(sourceConfig.columns).map(([key, label]) =>
                    /* @__PURE__ */ React.createElement(
                      "option",
                      { key, value: key },
                      label,
                    ),
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "select",
                  {
                    className:
                      "bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg",
                    value: filter.operator,
                    onChange: (e) =>
                      updateFilter(index, { operator: e.target.value }),
                  },
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "contains" },
                    "\u0634\u0627\u0645\u0644 \u0628\u0627\u0634\u062F",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "not_contains" },
                    "\u0634\u0627\u0645\u0644 \u0646\u0628\u0627\u0634\u062F",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "equals" },
                    "\u0628\u0631\u0627\u0628\u0631 \u0628\u0627\u0634\u062F",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "not_equals" },
                    "\u0628\u0631\u0627\u0628\u0631 \u0646\u0628\u0627\u0634\u062F",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "starts" },
                    "\u0634\u0631\u0648\u0639 \u0634\u0648\u062F \u0628\u0627",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "greater" },
                    "\u0628\u0632\u0631\u06AF\u200C\u062A\u0631 \u0627\u0632",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "less" },
                    "\u06A9\u0648\u0686\u06A9\u200C\u062A\u0631 \u0627\u0632",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "empty" },
                    "\u062E\u0627\u0644\u06CC \u0628\u0627\u0634\u062F",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { value: "not_empty" },
                    "\u062E\u0627\u0644\u06CC \u0646\u0628\u0627\u0634\u062F",
                  ),
                ),
                /* @__PURE__ */ React.createElement("input", {
                  disabled: ["empty", "not_empty"].includes(filter.operator),
                  className:
                    "bg-slate-950 border border-slate-700 text-slate-200 text-xs px-2 py-2 rounded-lg",
                  value: filter.value,
                  onChange: (e) =>
                    updateFilter(index, { value: e.target.value }),
                }),
                /* @__PURE__ */ React.createElement(
                  "button",
                  {
                    onClick: () => removeFilter(index),
                    className: "bg-rose-950/50 text-rose-400 rounded-lg",
                  },
                  /* @__PURE__ */ React.createElement(Trash2, {
                    className: "w-4 h-4 mx-auto",
                  }),
                ),
              ),
            ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "flex flex-wrap justify-end gap-2" },
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setShowBuilder(false),
              className:
                "bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs",
            },
            "\u0628\u0633\u062A\u0646",
          ),
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: saveReport,
              className:
                "bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex gap-1",
            },
            /* @__PURE__ */ React.createElement(Save, { className: "w-4 h-4" }),
            " \u0630\u062E\u06CC\u0631\u0647 \u0648 \u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u067E\u0646\u0644",
          ),
        ),
      ),
    !showBuilder &&
      definition.name &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden",
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className:
              "p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-2 justify-between sm:items-center",
          },
          /* @__PURE__ */ React.createElement(
            "div",
            null,
            /* @__PURE__ */ React.createElement(
              "h3",
              { className: "font-bold text-slate-100" },
              definition.name,
            ),
            /* @__PURE__ */ React.createElement(
              "p",
              { className: "text-[11px] text-slate-400 mt-1" },
              filteredRows.length.toLocaleString("fa-IR"),
              " \u0631\u06A9\u0648\u0631\u062F \u06CC\u0627\u0641\u062A \u0634\u062F\u061B \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u062D\u062F\u0627\u06A9\u062B\u0631 \u06F1\u06F0\u06F0 \u0631\u062F\u06CC\u0641 \u0627\u0633\u062A.",
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: exportRows,
              className:
                "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1",
            },
            /* @__PURE__ */ React.createElement(Download, {
              className: "w-4 h-4",
            }),
            " \u062E\u0631\u0648\u062C\u06CC Excel \u06A9\u0627\u0645\u0644",
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "overflow-auto max-h-[560px]" },
          /* @__PURE__ */ React.createElement(
            "table",
            { className: "w-full text-xs text-right" },
            /* @__PURE__ */ React.createElement(
              "thead",
              { className: "bg-slate-800 text-slate-300 sticky top-0" },
              /* @__PURE__ */ React.createElement(
                "tr",
                null,
                definition.columns.map((key) =>
                  /* @__PURE__ */ React.createElement(
                    "th",
                    { key, className: "p-3 whitespace-nowrap" },
                    sourceConfig.columns[key],
                  ),
                ),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "tbody",
              { className: "divide-y divide-slate-800" },
              displayedRows.map((row, index) =>
                /* @__PURE__ */ React.createElement(
                  "tr",
                  { key: index, className: "hover:bg-slate-800/40" },
                  definition.columns.map((key) =>
                    /* @__PURE__ */ React.createElement(
                      "td",
                      {
                        key,
                        className: "p-3 text-slate-300 whitespace-nowrap",
                      },
                      String(compact(row[key])) || "\u2014",
                    ),
                  ),
                ),
              ),
              displayedRows.length === 0 &&
                /* @__PURE__ */ React.createElement(
                  "tr",
                  null,
                  /* @__PURE__ */ React.createElement(
                    "td",
                    {
                      colSpan: definition.columns.length,
                      className: "p-8 text-center text-slate-500",
                    },
                    "\u062F\u0627\u062F\u0647\u200C\u0627\u06CC \u0645\u0637\u0627\u0628\u0642 \u0641\u06CC\u0644\u062A\u0631\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.",
                  ),
                ),
            ),
          ),
        ),
      ),
  );
}
export { CustomReportBuilder };
