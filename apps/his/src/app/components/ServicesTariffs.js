import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { ClinicalWorkflowSettings } from './ClinicalWorkflowSettings.js?b=r24-514-1405';
import { normalizeServiceClinicalRules } from '../utils/clinicalWorkflow.js?b=r24-514-1405';
import { RELATIVE_VALUE_BOOK_SERVICES } from '../data/relativeValueBook.js?b=r24-514-1405';
import { generateNextSequentialCode, validateAndConfirmManualCodeChange } from '../utils/codeGenerator.js?b=r24-514-1405';
import { Stethoscope, Plus, Edit2, Trash2, Search, Activity, Calculator, FolderPlus, FileSpreadsheet, BookOpen, ArrowUpRight, ArrowDownRight, X, Lock } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { exportServicesToExcel, readExcelFile, processServicesExcelImport, } from '../utils/excelUtils.js?b=r24-514-1405';
import { toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { MoneyInput450 } from './MoneyInput450.js?b=r24-514-1405';
export const ServicesTariffs = ({ medicalServices = [], settings, serviceCategories = [], currentUser, onAddService, onUpdateService, onDeleteService, onUpdateServiceCategories, onUpdateSettings, }) => {
    // Search & Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    // Modals state
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showKRatesModal, setShowKRatesModal] = useState(false);
    const [showGroupsModal, setShowGroupsModal] = useState(false);
    const [showBookModal, setShowBookModal] = useState(false);
    // Editing service target
    const [editingService, setEditingService] = useState(null);
    // K-Factor Rates State (Synced with settings.kRates or defaults)
    const defaultKRates = {
        kProfessionalRate: settings.kRates?.kProfessionalRate || 140000, // 140,000 Toman
        kTechnicalRate: settings.kRates?.kTechnicalRate || 180000, // 180,000 Toman
        kAnesthesiaRate: settings.kRates?.kAnesthesiaRate || 120000, // 120,000 Toman
        tariffYear: settings.kRates?.tariffYear || '۱۴۰۴',
        tariffSector: settings.kRates?.tariffSector || 'private',
    };
    const [kRates, setKRates] = useState(defaultKRates);
    // Service Form State
    const [code, setCode] = useState(''); // کد داخلی کلینیک
    const [nationalCode, setNationalCode] = useState(''); // کد کتاب ارزش نسبی
    const [title, setTitle] = useState(''); // عنوان مصوب کلینیک
    const [originalNationalTitle, setOriginalNationalTitle] = useState(''); // عنوان اصلی کتاب ارزش نسبی
    const [category, setCategory] = useState('clinic_service');
    const [kProfessional, setKProfessional] = useState(1.0);
    const [kTechnical, setKTechnical] = useState(1.0);
    const [kAnesthesia, setKAnesthesia] = useState(0);
    const [tariffPrice, setTariffPrice] = useState(300000); // مبلغ مصوب داخلی کلینیک
    const [doctorCommissionPercent, setDoctorCommissionPercent] = useState(50);
    const [requiresAssistant, setRequiresAssistant] = useState(true);
    const [assistantCommissionPercent, setAssistantCommissionPercent] = useState(10);
    const [isMultiSession, setIsMultiSession] = useState(false);
    const [defaultSessions, setDefaultSessions] = useState(3);
    const [sessionIntervalDays, setSessionIntervalDays] = useState(7);
    const [preparationChecklistText, setPreparationChecklistText] = useState('');
    const [requiredFormsText, setRequiredFormsText] = useState('');
    const [description, setDescription] = useState('');
    // Service Groups Management State
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [groupNameInput, setGroupNameInput] = useState('');
    const [groupCodeInput, setGroupCodeInput] = useState('');
    const [groupDescInput, setGroupDescInput] = useState('');
    // Relative Value Book Modal Search State
    const [bookSearchTerm, setBookSearchTerm] = useState('');
    const [bookCategoryFilter, setBookCategoryFilter] = useState('all');
    // Check admin permission
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'accountant';
    // Calculate Relative Value Base Price from K-Factors
    const calculateBasePrice = (kProf, kTech, kAnes, rates) => {
        const profPart = (kProf || 0) * (rates.kProfessionalRate || 0);
        const techPart = (kTech || 0) * (rates.kTechnicalRate || 0);
        const anesPart = (kAnes || 0) * (rates.kAnesthesiaRate || 0);
        return Math.round(profPart + techPart + anesPart);
    };
    // Current calculated base price for form
    const computedBasePrice = calculateBasePrice(kProfessional, kTechnical, kAnesthesia, kRates);
    const computedDifference = (tariffPrice || 0) - computedBasePrice;
    const [autoGenServiceCode, setAutoGenServiceCode] = useState('');
    // Handle opening Create Modal
    const handleOpenCreate = () => {
        setEditingService(null);
        const nextCode = generateNextSequentialCode('SRV-', medicalServices, 'code', 101);
        setCode(nextCode);
        setAutoGenServiceCode(nextCode);
        setNationalCode('901000');
        setTitle('');
        setOriginalNationalTitle('');
        setCategory(serviceCategories[0]?.id || 'clinic_service');
        setKProfessional(1.0);
        setKTechnical(1.0);
        setKAnesthesia(0);
        const initialBase = calculateBasePrice(1.0, 1.0, 0, kRates);
        setTariffPrice(initialBase > 0 ? initialBase : 250000);
        setDoctorCommissionPercent(50);
        setRequiresAssistant(true);
        setAssistantCommissionPercent(10);
        setIsMultiSession(false);
        setDefaultSessions(3);
        setSessionIntervalDays(7);
        setPreparationChecklistText('');
        setRequiredFormsText('');
        setDescription('');
        setShowServiceModal(true);
    };
    // Handle opening Edit Modal
    const handleOpenEdit = (srv) => {
        setEditingService(srv);
        setCode(srv.code);
        setAutoGenServiceCode(srv.code);
        setNationalCode(srv.nationalCode || '');
        setTitle(srv.title);
        setOriginalNationalTitle(srv.originalNationalTitle || srv.title);
        setCategory(srv.category);
        setKProfessional(srv.kProfessional ?? 1.0);
        setKTechnical(srv.kTechnical ?? 1.0);
        setKAnesthesia(srv.kAnesthesia ?? 0);
        setTariffPrice(srv.tariffPrice);
        setDoctorCommissionPercent(srv.doctorCommissionPercent);
        const clinicalRule = normalizeServiceClinicalRules(srv);
        setRequiresAssistant(clinicalRule.requiresAssistant);
        setAssistantCommissionPercent(clinicalRule.assistantCommissionPercent);
        setIsMultiSession(srv.isMultiSession ?? false);
        setDefaultSessions(srv.defaultSessions ?? 3);
        setSessionIntervalDays(srv.sessionIntervalDays ?? 7);
        setPreparationChecklistText((clinicalRule.preparationChecklist || []).join('\n'));
        setRequiredFormsText((clinicalRule.requiredForms || []).join('\n'));
        setDescription(srv.description || '');
        setShowServiceModal(true);
    };
    // Import service from Relative Value Book
    const handleSelectFromBook = (item) => {
        setNationalCode(item.nationalCode);
        setOriginalNationalTitle(item.nationalTitle);
        if (!title.trim()) {
            setTitle(item.nationalTitle);
        }
        setKProfessional(item.kProfessional);
        setKTechnical(item.kTechnical);
        setKAnesthesia(item.kAnesthesia);
        const base = calculateBasePrice(item.kProfessional, item.kTechnical, item.kAnesthesia, kRates);
        setTariffPrice(base);
        if (item.description && !description) {
            setDescription(item.description);
        }
        setShowBookModal(false);
    };
    // Save Service Form Submit
    const handleSubmitService = (e) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('لطفاً عنوان مصوب خدمت را وارد کنید.');
            return;
        }
        if (!editingService && autoGenServiceCode && !validateAndConfirmManualCodeChange(autoGenServiceCode, code, 'کد خدمت')) {
            return;
        }
        const relValPrice = computedBasePrice;
        const diff = (tariffPrice || 0) - relValPrice;
        // Resolve category name
        const foundGroup = serviceCategories.find((c) => c.id === category || c.code === category);
        const catName = foundGroup ? foundGroup.name : getCategoryLabelText(category);
        if (editingService) {
            const updated = {
                ...editingService,
                code,
                nationalCode,
                title,
                originalNationalTitle: originalNationalTitle || title,
                category,
                categoryName: catName,
                tariffPrice,
                relativeValuePrice: relValPrice,
                priceDifference: diff,
                kProfessional,
                kTechnical,
                kAnesthesia,
                doctorCommissionPercent,
                requiresAssistant: !!requiresAssistant,
                assistantCommissionPercent: requiresAssistant ? Math.max(0, Number(assistantCommissionPercent || 0)) : 0,
                isMultiSession: !!isMultiSession,
                defaultSessions: isMultiSession ? Math.max(1, Number(defaultSessions || 1)) : 1,
                sessionIntervalDays: isMultiSession ? Math.max(1, Number(sessionIntervalDays || 1)) : 7,
                preparationChecklist: preparationChecklistText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
                requiredForms: requiredFormsText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
                description,
            };
            onUpdateService(updated);
        }
        else {
            const newSrv = {
                id: 'srv-' + Date.now(),
                code,
                nationalCode,
                title,
                originalNationalTitle: originalNationalTitle || title,
                category,
                categoryName: catName,
                tariffPrice,
                relativeValuePrice: relValPrice,
                priceDifference: diff,
                kProfessional,
                kTechnical,
                kAnesthesia,
                doctorCommissionPercent,
                requiresAssistant: !!requiresAssistant,
                assistantCommissionPercent: requiresAssistant ? Math.max(0, Number(assistantCommissionPercent || 0)) : 0,
                isMultiSession: !!isMultiSession,
                defaultSessions: isMultiSession ? Math.max(1, Number(defaultSessions || 1)) : 1,
                sessionIntervalDays: isMultiSession ? Math.max(1, Number(sessionIntervalDays || 1)) : 7,
                preparationChecklist: preparationChecklistText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
                requiredForms: requiredFormsText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean),
                description,
                active: true,
            };
            onAddService(newSrv);
        }
        setShowServiceModal(false);
    };
    // Save Annual K-Rates
    const handleSaveKRates = (e) => {
        e.preventDefault();
        if (onUpdateSettings) {
            onUpdateSettings({
                ...settings,
                kRates: kRates,
            });
        }
        setShowKRatesModal(false);
        alert('تنظیمات جدید ضرایب کا (K) با موفقیت در سیستم ذخیره گردید.');
    };
    // Service Group Form Save
    const handleSaveServiceGroup = (e) => {
        e.preventDefault();
        if (!groupNameInput.trim()) {
            alert('عنوان گروه خدمات را وارد نمایید.');
            return;
        }
        if (editingGroupId) {
            const updated = serviceCategories.map((c) => c.id === editingGroupId ? { ...c, name: groupNameInput, code: groupCodeInput, description: groupDescInput } : c);
            if (onUpdateServiceCategories)
                onUpdateServiceCategories(updated);
        }
        else {
            const newGrp = {
                id: 'scat-' + Date.now(),
                name: groupNameInput,
                code: groupCodeInput || 'GRP-' + Math.floor(100 + Math.random() * 900),
                description: groupDescInput,
            };
            if (onUpdateServiceCategories)
                onUpdateServiceCategories([...serviceCategories, newGrp]);
        }
        setEditingGroupId(null);
        setGroupNameInput('');
        setGroupCodeInput('');
        setGroupDescInput('');
    };
    const handleDeleteServiceGroup = (id) => {
        const hasServicesInGroup = medicalServices.some((s) => s.category === id);
        if (hasServicesInGroup) {
            if (!confirm('توجه: برخی از خدمات موجود در سیستم زیرمجموعه این گروه هستند. آیا از حذف این گروه اطمینان دارید؟')) {
                return;
            }
        }
        else {
            if (!confirm('آیا از حذف این گروه خدمات اطمینان دارید؟'))
                return;
        }
        if (onUpdateServiceCategories) {
            onUpdateServiceCategories(serviceCategories.filter((c) => c.id !== id));
        }
    };
    // Helper labels
    function getCategoryLabelText(cat) {
        switch (cat) {
            case 'medical_visit':
                return 'ویزیت و مشاوره پزشکی';
            case 'clinic_service':
                return 'خدمات کلینیکی و سرپایی';
            case 'hospital_surgery':
                return 'جراحی محدود اتاق عمل';
            case 'consumable':
                return 'دارو و اقلام مصرفی';
            default:
                const found = serviceCategories.find((c) => c.id === cat || c.code === cat);
                return found ? found.name : 'خدمات کلینیکی';
        }
    }
    const getCategoryBadge = (cat) => {
        const label = getCategoryLabelText(cat);
        switch (cat) {
            case 'medical_visit':
                return _jsx("span", { className: "bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold", children: label });
            case 'clinic_service':
                return _jsx("span", { className: "bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold", children: label });
            case 'hospital_surgery':
                return _jsx("span", { className: "bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold", children: label });
            case 'consumable':
                return _jsx("span", { className: "bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold", children: label });
            default:
                return _jsx("span", { className: "bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold", children: label });
        }
    };
    // Filtered Services
    const filteredServices = medicalServices.filter((srv) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (srv.title || '').toLowerCase().includes(term) ||
            (srv.originalNationalTitle || '').toLowerCase().includes(term) ||
            (srv.code || '').toLowerCase().includes(term) ||
            (srv.nationalCode || '').toLowerCase().includes(term);
        const matchesCategory = categoryFilter === 'all' || srv.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    // Filtered Book Services
    const filteredBookServices = RELATIVE_VALUE_BOOK_SERVICES.filter((item) => {
        const term = bookSearchTerm.toLowerCase();
        const matchesTerm = item.nationalCode.toLowerCase().includes(term) ||
            item.nationalTitle.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term);
        const matchesCat = bookCategoryFilter === 'all' || item.category === bookCategoryFilter;
        return matchesTerm && matchesCat;
    });
    const excelInputRef = React.useRef(null);
    const handleExcelImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const rawRows = await readExcelFile(file);
            if (!rawRows || rawRows.length === 0) {
                alert('هیچ ردیف یا داده‌ای در فایل اکسل خدمات یافت نشد.');
                return;
            }
            const { updatedServices, updatedCount, createdCount, validRowsCount, skippedRowsCount, } = processServicesExcelImport(rawRows, medicalServices);
            updatedServices.forEach((s) => {
                const existing = medicalServices.find((ex) => ex.id === s.id);
                if (existing) {
                    onUpdateService(s);
                }
                else {
                    onAddService(s);
                }
            });
            let reportMsg = `نتیجه پردازش و اعتبارسنجی اکسل خدمات و تعرفه‌ها:\n\n` +
                `✅ ردیف‌های معتبر: ${toPersianDigits(validRowsCount)} مورد\n` +
                `• تعداد ${toPersianDigits(updatedCount)} خدمت به‌روزرسانی شد.\n` +
                `• تعداد ${toPersianDigits(createdCount)} خدمت جدید با کد شناسایی اختصاص داده شد.`;
            if (skippedRowsCount > 0) {
                reportMsg += `\n⚠️ تعداد ${toPersianDigits(skippedRowsCount)} ردیف خالی نادیده گرفته شد.`;
            }
            alert(reportMsg);
        }
        catch (err) {
            alert('خطا در پردازش فایل اکسل خدمات: ' + (err?.message || err));
        }
        finally {
            if (e.target)
                e.target.value = '';
        }
    };
    return (_jsxs("div", { className: "space-y-6 text-right dir-rtl font-sans", dir: "rtl", children: [_jsx(ClinicalWorkflowSettings, { medicalServices: medicalServices, settings: settings, onUpdateService: onUpdateService, onUpdateSettings: onUpdateSettings }), _jsx("input", { type: "file", ref: excelInputRef, onChange: handleExcelImportFile, accept: ".xlsx,.xls,.csv", className: "hidden" }), _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3.5", children: [_jsx("div", { className: "p-3 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl shadow-md shadow-teal-900/20", children: _jsx(Activity, { className: "w-7 h-7" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-xl font-bold text-slate-800", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u062A\u0639\u0631\u0641\u0647 \u062E\u062F\u0645\u0627\u062A \u067E\u0632\u0634\u06A9\u06CC \u0648 \u06A9\u062A\u0627\u0628\u0686\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC" }), _jsxs("span", { className: "px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-mono font-bold", children: ["\u0633\u0627\u0644 ", kRates.tariffYear] })] }), _jsx("p", { className: "text-xs text-slate-500 mt-1 leading-relaxed", children: "\u062A\u0639\u0631\u06CC\u0641 \u062F\u0648 \u06A9\u062F\u0647 \u062E\u062F\u0645\u0627\u062A \u06A9\u0644\u06CC\u0646\u06CC\u06A9\u060C \u062A\u0646\u0638\u06CC\u0645 \u0636\u0631\u0627\u06CC\u0628 K \u0641\u0646\u06CC \u0648 \u062D\u0631\u0641\u0647\u200C\u0627\u06CC\u060C \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0627\u06A9\u0633\u0644 \u0648 \u0645\u062D\u0627\u0633\u0628\u0627\u062A \u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A \u0645\u0635\u0648\u0628" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 w-full lg:w-auto", children: [_jsxs("button", { onClick: () => exportServicesToExcel(filteredServices), className: "flex-1 lg:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 transition", title: "\u062E\u0631\u0648\u062C\u06CC \u062A\u0645\u0627\u0645 \u062E\u062F\u0645\u0627\u062A \u0628\u0647 \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-teal-600" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("button", { onClick: () => excelInputRef.current?.click(), className: "flex-1 lg:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 transition", title: "\u0648\u0631\u0648\u062F\u06CC/\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u062E\u062F\u0645\u0627\u062A \u0648 \u062A\u0639\u0631\u0641\u0647\u200C\u0647\u0627 \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-emerald-600" }), _jsx("span", { children: "\u0648\u0631\u0648\u062F\u06CC \u0627\u06A9\u0633\u0644 (\u0645\u0628\u0646\u0627\u06CC \u0645\u0631\u062C\u0639)" })] }), _jsxs("button", { onClick: () => setShowKRatesModal(true), className: "flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition", title: "\u062A\u0646\u0638\u06CC\u0645 \u0633\u0627\u0644\u0627\u0646\u0647 \u0646\u0631\u062E \u0631\u06CC\u0627\u0644\u06CC \u0636\u0631\u0627\u06CC\u0628 K", children: [_jsx(Calculator, { className: "w-4 h-4 text-teal-600" }), _jsx("span", { children: "\u0646\u0631\u062E K" })] }), _jsxs("button", { onClick: () => setShowGroupsModal(true), className: "flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition", title: "\u0627\u0635\u0644\u0627\u062D\u060C \u062D\u0630\u0641 \u06CC\u0627 \u0627\u0641\u0632\u0648\u062F\u0646 \u06AF\u0631\u0648\u0647 \u062C\u062F\u06CC\u062F \u062E\u062F\u0645\u0627\u062A", children: [_jsx(FolderPlus, { className: "w-4 h-4 text-purple-600" }), _jsx("span", { children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06AF\u0631\u0648\u0647 \u062E\u062F\u0645\u0627\u062A" })] }), _jsxs("button", { onClick: () => setShowBookModal(true), className: "flex-1 lg:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition", title: "\u06A9\u062A\u0627\u0628\u0686\u0647 \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u062E\u062F\u0645\u0627\u062A \u0633\u0644\u0627\u0645\u062A", children: [_jsx(BookOpen, { className: "w-4 h-4 text-blue-600" }), _jsx("span", { children: "\u06A9\u062A\u0627\u0628\u0686\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC" })] }), _jsxs("button", { onClick: handleOpenCreate, className: "flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-teal-900/20", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u062A\u0639\u0631\u06CC\u0641 \u062E\u062F\u0645\u062A / \u062A\u0639\u0631\u0641\u0647 \u062C\u062F\u06CC\u062F" })] })] })] }), _jsxs("div", { className: "bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300", children: _jsx(CoinsIcon, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsxs("span", { className: "font-bold text-slate-200", children: ["\u0646\u0631\u062E\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u0647 \u0636\u0631\u0627\u06CC\u0628 \u06A9\u0627 (K-Factor) \u0633\u0627\u0644 ", kRates.tariffYear, ":"] }), _jsx("span", { className: "text-[11px] text-slate-400 block mt-0.5", children: "\u0645\u0628\u0646\u0627\u06CC \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0645\u0628\u0644\u063A \u067E\u0627\u06CC\u0647 \u06A9\u062A\u0627\u0628 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u062F\u0631 \u06A9\u0644\u06CC\u0646\u06CC\u06A9" })] })] }), _jsxs("div", { className: "flex items-center gap-4 text-xs flex-wrap font-mono", children: [_jsxs("div", { className: "bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2", children: [_jsx("span", { className: "text-slate-400 text-[10px]", children: "K \u062D\u0631\u0641\u0647\u200C\u0627\u06CC:" }), _jsxs("span", { className: "font-bold text-teal-300", children: [kRates.kProfessionalRate.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("div", { className: "bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2", children: [_jsx("span", { className: "text-slate-400 text-[10px]", children: "K \u0641\u0646\u06CC:" }), _jsxs("span", { className: "font-bold text-emerald-300", children: [kRates.kTechnicalRate.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("div", { className: "bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2", children: [_jsx("span", { className: "text-slate-400 text-[10px]", children: "K \u0628\u06CC\u0647\u0648\u0634\u06CC:" }), _jsxs("span", { className: "font-bold text-cyan-300", children: [kRates.kAnesthesiaRate.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] })] })] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-3", children: [_jsxs("div", { className: "relative w-full sm:w-80", children: [_jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648 \u0628\u0627 \u0639\u0646\u0648\u0627\u0646 \u06A9\u0644\u06CC\u0646\u06CC\u06A9\u06CC\u060C \u0646\u0627\u0645 \u06A9\u062A\u0627\u0628 \u06CC\u0627 \u06A9\u062F\u0647\u0627\u06CC \u062E\u062F\u0645\u062A...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-3 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" }), _jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-3" })] }), _jsxs("div", { className: "flex items-center gap-1.5 overflow-x-auto text-xs w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar", children: [_jsxs("button", { onClick: () => setCategoryFilter('all'), className: `px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${categoryFilter === 'all'
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: ["\u0647\u0645\u0647 \u062E\u062F\u0645\u0627\u062A (", medicalServices.length, ")"] }), serviceCategories.map((grp) => (_jsx("button", { onClick: () => setCategoryFilter(grp.id), className: `px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${categoryFilter === grp.id
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: grp.name }, grp.id))), _jsx("button", { onClick: () => setCategoryFilter('medical_visit'), className: `px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${categoryFilter === 'medical_visit'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: "\u0648\u06CC\u0632\u06CC\u062A" }), _jsx("button", { onClick: () => setCategoryFilter('clinic_service'), className: `px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${categoryFilter === 'clinic_service'
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: "\u06A9\u0644\u06CC\u0646\u06CC\u06A9\u06CC" }), _jsx("button", { onClick: () => setCategoryFilter('hospital_surgery'), className: `px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${categoryFilter === 'hospital_surgery'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: "\u062C\u0631\u0627\u062D\u06CC \u0645\u062D\u062F\u0648\u062F" })] })] }), _jsx("div", { className: "overflow-x-auto border border-slate-200 rounded-2xl", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-50 text-slate-700 font-bold border-b border-slate-200", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u06A9\u062F \u0645\u0644\u06CC / \u06A9\u062F \u062F\u0627\u062E\u0644\u06CC" }), _jsx("th", { className: "p-3", children: "\u0639\u0646\u0648\u0627\u0646 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9 \u0648 \u0646\u0627\u0645 \u06A9\u062A\u0627\u0628 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC" }), _jsx("th", { className: "p-3", children: "\u06AF\u0631\u0648\u0647 \u062E\u062F\u0645\u062A" }), _jsx("th", { className: "p-3", children: "\u0636\u0631\u0627\u06CC\u0628 K (P/T)" }), _jsx("th", { className: "p-3", children: "\u0645\u0628\u0644\u063A \u067E\u0627\u06CC\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC (\u062A\u0648\u0645\u0627\u0646)" }), _jsx("th", { className: "p-3 bg-teal-50/80 text-teal-900 border-x border-teal-100", children: "\u0645\u0628\u0644\u063A \u0645\u0635\u0648\u0628 \u06A9\u0644\u06CC\u0646\u06CC\u06A9 (\u062A\u0648\u0645\u0627\u0646)" }), _jsx("th", { className: "p-3", children: "\u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A" }), _jsx("th", { className: "p-3", children: "\u0633\u0647\u0645 \u067E\u0632\u0634\u06A9 (%)" }), _jsx("th", { className: "p-3 text-center", children: "\u0639\u0645\u0644\u06CC\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 text-slate-800", children: filteredServices.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "p-8 text-center text-slate-400", children: "\u0647\u06CC\u0686 \u062E\u062F\u0645\u062A\u06CC \u0645\u0637\u0627\u0628\u0642 \u0628\u0627 \u0641\u06CC\u0644\u062A\u0631 \u06CC\u0627 \u062C\u0633\u062A\u062C\u0648\u06CC \u0634\u0645\u0627 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }) })) : (filteredServices.map((srv) => {
                                        const relValBase = srv.relativeValuePrice ?? calculateBasePrice(srv.kProfessional ?? 1, srv.kTechnical ?? 1, srv.kAnesthesia ?? 0, kRates);
                                        const diff = (srv.tariffPrice ?? 0) - relValBase;
                                        const doctorShare = ((srv.tariffPrice ?? 0) * (srv.doctorCommissionPercent ?? 0)) / 100;
                                        return (_jsxs("tr", { className: "hover:bg-slate-50 transition", children: [_jsx("td", { className: "p-3 font-mono", children: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsxs("span", { className: "text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10.5px] w-fit", children: ["\u0645\u0644\u06CC: ", srv.nationalCode || '---'] }), _jsxs("span", { className: "text-slate-500 text-[10px]", children: ["\u062F\u0627\u062E\u0644\u06CC: ", srv.code] })] }) }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "space-y-0.5", children: [_jsx("div", { className: "font-bold text-slate-900 text-[12.5px]", children: srv.title }), srv.originalNationalTitle && srv.originalNationalTitle !== srv.title && (_jsxs("div", { className: "text-[10px] text-slate-500 flex items-center gap-1", children: [_jsx(BookOpen, { className: "w-3 h-3 text-slate-400 shrink-0" }), _jsxs("span", { children: ["\u0631\u06CC\u0634\u0647 \u06A9\u062A\u0627\u0628: ", srv.originalNationalTitle] })] }))] }) }), _jsx("td", { className: "p-3", children: getCategoryBadge(srv.category) }), _jsx("td", { className: "p-3 font-mono text-[11px]", children: _jsxs("div", { className: "flex items-center gap-1.5 text-slate-700", children: [_jsxs("span", { title: "K \u062D\u0631\u0641\u0647\u200C\u0627\u06CC", children: ["P: ", _jsx("strong", { className: "text-teal-700", children: srv.kProfessional ?? 1 })] }), _jsx("span", { children: "|" }), _jsxs("span", { title: "K \u0641\u0646\u06CC", children: ["T: ", _jsx("strong", { className: "text-emerald-700", children: srv.kTechnical ?? 1 })] })] }) }), _jsx("td", { className: "p-3 font-bold text-slate-600 font-mono", children: relValBase.toLocaleString('fa-IR') }), _jsx("td", { className: "p-3 bg-teal-50/50 border-x border-teal-100 font-bold text-teal-800 text-[13px] font-mono", children: (srv.tariffPrice ?? 0).toLocaleString('fa-IR') }), _jsx("td", { className: "p-3 font-mono font-bold", children: diff > 0 ? (_jsxs("span", { className: "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 w-fit text-[11px]", children: [_jsx(ArrowUpRight, { className: "w-3 h-3" }), "+", diff.toLocaleString('fa-IR')] })) : diff < 0 ? (_jsxs("span", { className: "text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 w-fit text-[11px]", children: [_jsx(ArrowDownRight, { className: "w-3 h-3" }), diff.toLocaleString('fa-IR')] })) : (_jsx("span", { className: "text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]", children: "\u0628\u0631\u0627\u0628\u0631" })) }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "space-y-0.5", children: [_jsxs("span", { className: "bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10.5px]", children: [srv.doctorCommissionPercent, "%"] }), _jsxs("span", { className: "text-[10px] text-slate-500 block font-mono", children: [doctorShare.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }) }), _jsx("td", { className: "p-3 text-center", children: _jsxs("div", { className: "flex items-center justify-center gap-1.5", children: [_jsx("button", { onClick: () => handleOpenEdit(srv), className: "p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition", title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u06A9\u0627\u0645\u0644 \u062E\u062F\u0645\u062A", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => {
                                                                    if (confirm(`آیا از حذف خدمت «${srv.title}» اطمینان دارید؟`)) {
                                                                        onDeleteService(srv.id);
                                                                    }
                                                                }, className: "p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition", title: "\u062D\u0630\u0641 \u062E\u062F\u0645\u062A", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }) })] }, srv.id));
                                    })) })] }) })] }), _jsxs("div", { className: "bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3 text-xs", children: [_jsx(Lock, { className: "w-5 h-5 text-amber-600 shrink-0 mt-0.5" }), _jsxs("div", { className: "space-y-1", children: [_jsx("span", { className: "font-bold block", children: "\uD83D\uDD12 \u0645\u062D\u0631\u0645\u0627\u0646\u0647 \u0628\u0648\u062F\u0646 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0645\u0627\u0644\u06CC \u067E\u0627\u06CC\u0647 \u0648 \u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A \u062A\u0639\u0631\u0641\u0647:" }), _jsxs("p", { className: "text-[11.5px] text-amber-800 leading-relaxed", children: ["\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0646\u0631\u062E \u067E\u0627\u06CC\u0647 \u06A9\u062A\u0627\u0628 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC\u060C \u0636\u0631\u0627\u06CC\u0628 K \u0648 \u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A \u0645\u0635\u0648\u0628 \u0645\u0631\u06A9\u0632 \u0641\u0642\u0637 \u062F\u0631 \u0647\u0645\u06CC\u0646 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A \u062A\u0639\u0631\u0641\u0647 (\u062C\u0647\u062A \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u0648 \u062A\u0635\u0645\u06CC\u0645\u200C\u06AF\u06CC\u0631\u06CC \u0645\u062F\u06CC\u0631\u06CC\u062A\u06CC) \u0642\u0627\u0628\u0644 \u0645\u0634\u0627\u0647\u062F\u0647 \u0627\u0633\u062A. \u062F\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0635\u0627\u062F\u0631\u0647 \u0628\u0631\u0627\u06CC \u0628\u06CC\u0645\u0627\u0631\u060C \u0633\u06CC\u0633\u062A\u0645 \u067E\u0630\u06CC\u0631\u0634\u060C \u0635\u0646\u062F\u0648\u0642 PC-POS \u0648 \u0628\u0631\u06AF\u0647 \u062A\u0633\u0648\u06CC\u0647\u060C ", _jsx("strong", { children: "\u0641\u0642\u0637 \u0639\u0646\u0648\u0627\u0646 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9 \u0648 \u0645\u0628\u0644\u063A \u0645\u0635\u0648\u0628 \u062F\u0627\u062E\u0644\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9" }), " \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0634\u062F\u0647 \u0648 \u0647\u06CC\u0686 \u062F\u0627\u062F\u0647\u200C\u0627\u06CC \u0627\u0632 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u067E\u0627\u06CC\u0647 \u06CC\u0627 \u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A \u0628\u0647 \u0628\u06CC\u0645\u0627\u0631 \u0627\u0631\u0627\u0626\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F."] })] })] }), showServiceModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[92vh]", children: [_jsxs("div", { className: "bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-4 font-bold flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Stethoscope, { className: "w-5 h-5" }), _jsx("span", { children: editingService ? 'ویرایش تعرفه خدمت کلینیک' : 'تعریف خدمت / تعرفه جدید درمانگاه' })] }), _jsx("button", { onClick: () => setShowServiceModal(false), className: "w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleSubmitService, className: "p-5 overflow-y-auto space-y-4 text-xs", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx("span", { className: "font-bold text-slate-800 text-[12px] block", children: "\uD83D\uDCDA \u06A9\u062A\u0627\u0628\u0686\u0647 \u062C\u0627\u0645\u0639 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u062E\u062F\u0645\u0627\u062A \u0633\u0644\u0627\u0645\u062A:" }), _jsx("span", { className: "text-[10.5px] text-slate-600 block", children: "\u0627\u0645\u06A9\u0627\u0646 \u0627\u0646\u062A\u062E\u0627\u0628 \u062E\u062F\u0645\u062A \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u0628\u0627 \u06A9\u062F\u0647\u0627\u06CC K \u0641\u0646\u06CC \u0648 \u062D\u0631\u0641\u0647\u200C\u0627\u06CC \u0645\u0644\u06CC" })] }), _jsxs("button", { type: "button", onClick: () => setShowBookModal(true), className: "bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-1.5 transition shadow-sm shrink-0", children: [_jsx(Search, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062C\u0633\u062A\u062C\u0648 \u062F\u0631 \u06A9\u062A\u0627\u0628\u0686\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06A9\u062F \u0645\u0644\u06CC \u06A9\u062A\u0627\u0628 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC (National Code):" }), _jsx("input", { type: "text", value: nationalCode, onChange: (e) => setNationalCode(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: 901305", className: "w-full border border-slate-300 rounded-xl p-2.5 font-mono text-teal-800 font-bold" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06A9\u062F \u062F\u0627\u062E\u0644\u06CC \u062E\u062F\u0645\u062A \u062F\u0631 \u06A9\u0644\u06CC\u0646\u06CC\u06A9:" }), _jsx("input", { type: "text", value: code, onChange: (e) => setCode(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: SRV-102", className: "w-full border border-slate-300 rounded-xl p-2.5 font-mono font-bold", required: true })] })] }), _jsxs("div", { className: "space-y-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl", children: [_jsxs("div", { children: [_jsxs("label", { className: "block font-bold text-slate-700 mb-1 flex items-center justify-between", children: [_jsx("span", { children: "\u0646\u0627\u0645 \u0627\u0635\u0644\u06CC \u0637\u0628\u0642 \u06A9\u062A\u0627\u0628 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC (\u0631\u06CC\u0634\u0647 \u062E\u062F\u0645\u062A):" }), _jsx("span", { className: "text-[10px] text-slate-400 font-normal", children: "\u062C\u0647\u062A \u0634\u0646\u0627\u0633\u0627\u06CC\u06CC \u0645\u0627\u0647\u06CC\u062A \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u062E\u062F\u0645\u062A" })] }), _jsx("input", { type: "text", value: originalNationalTitle, onChange: (e) => setOriginalNationalTitle(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u062F\u0631\u0622\u0648\u0631\u062F\u0646 \u0648 \u062E\u0627\u0631\u062C \u06A9\u0631\u062F\u0646 \u062C\u0633\u0645 \u062E\u0627\u0631\u062C\u06CC \u0627\u0632 \u0628\u0627\u0641\u062A \u0646\u0631\u0645 \u0639\u0645\u06CC\u0642 \u0628\u0627 \u0628\u0631\u0634 \u062C\u0631\u0627\u062D\u06CC...", className: "w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-[11.5px]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-800 mb-1", children: "\u0639\u0646\u0648\u0627\u0646 \u0645\u0635\u0648\u0628 \u0648 \u0646\u0627\u0645 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9 (\u062C\u0647\u062A \u0635\u062F\u0627 \u0632\u062F\u0646 \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0648 \u067E\u0630\u06CC\u0631\u0634):" }), _jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u062E\u0627\u0631\u062C \u06A9\u0631\u062F\u0646 \u062C\u0633\u0645 \u062E\u0627\u0631\u062C\u06CC - \u0627\u062A\u0627\u0642 \u0639\u0645\u0644 \u0628\u0627\u0633\u062A\u06CC\u0627\u0646", className: "w-full bg-white border border-teal-500/60 focus:border-teal-600 rounded-xl p-2.5 font-bold text-slate-900 text-xs shadow-xs", required: true })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06AF\u0631\u0648\u0647 / \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u062E\u062F\u0645\u062A:" }), _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 font-medium", children: [_jsx("option", { value: "clinic_service", children: "\u062E\u062F\u0645\u0627\u062A \u0633\u0631\u067E\u0627\u06CC\u06CC \u0648 \u06A9\u0644\u06CC\u0646\u06CC\u06A9\u06CC" }), _jsx("option", { value: "medical_visit", children: "\u0648\u06CC\u0632\u06CC\u062A \u0639\u0645\u0648\u0645\u06CC / \u062A\u062E\u0635\u0635\u06CC" }), _jsx("option", { value: "hospital_surgery", children: "\u062C\u0631\u0627\u062D\u06CC \u0645\u062D\u062F\u0648\u062F \u0627\u062A\u0627\u0642 \u0639\u0645\u0644" }), _jsx("option", { value: "consumable", children: "\u062F\u0627\u0631\u0648 \u0648 \u0627\u0642\u0644\u0627\u0645 \u0645\u0635\u0631\u0641\u06CC" }), serviceCategories.map((sc) => (_jsx("option", { value: sc.id, children: sc.name }, sc.id)))] })] }), _jsxs("div", { className: "p-3.5 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-2", children: [_jsxs("div", { className: "font-bold text-teal-900 flex items-center justify-between text-[11.5px]", children: [_jsx("span", { children: "\u0636\u0631\u0627\u06CC\u0628 \u00AB\u06A9\u0627\u00BB (K-Factors) \u062E\u062F\u0645\u062A:" }), _jsxs("span", { className: "text-[10.5px] font-mono text-teal-700", children: ["\u0646\u0631\u062E K \u0633\u0627\u0644 ", kRates.tariffYear] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10.5px] text-slate-600 mb-1 font-semibold", children: "K \u062D\u0631\u0641\u0647\u200C\u0627\u06CC (P):" }), _jsx("input", { type: "number", step: 0.1, min: 0, value: kProfessional, onChange: (e) => setKProfessional(Number(e.target.value)), className: "w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-teal-800" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10.5px] text-slate-600 mb-1 font-semibold", children: "K \u0641\u0646\u06CC (T):" }), _jsx("input", { type: "number", step: 0.1, min: 0, value: kTechnical, onChange: (e) => setKTechnical(Number(e.target.value)), className: "w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-emerald-800" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10.5px] text-slate-600 mb-1 font-semibold", children: "K \u0628\u06CC\u0647\u0648\u0634\u06CC (Anes):" }), _jsx("input", { type: "number", step: 0.1, min: 0, value: kAnesthesia, onChange: (e) => setKAnesthesia(Number(e.target.value)), className: "w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold text-cyan-800" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsxs("div", { className: "p-3 bg-slate-100 border border-slate-300 rounded-2xl flex flex-col justify-between", children: [_jsx("span", { className: "text-[10.5px] text-slate-500 font-bold block mb-1", children: "\u0645\u0628\u0644\u063A \u067E\u0627\u06CC\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC (\u0645\u062D\u0627\u0633\u0628\u0647 K):" }), _jsxs("span", { className: "text-sm font-mono font-bold text-slate-800", children: [computedBasePrice.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("div", { className: "p-3 bg-teal-50 border border-teal-300 rounded-2xl flex flex-col justify-between", children: [_jsx("label", { className: "text-[10.5px] text-teal-900 font-bold block mb-1", children: "\u0645\u0628\u0644\u063A \u0645\u0635\u0648\u0628 \u062F\u0627\u062E\u0644\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9 (\u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u0628\u06CC\u0645\u0627\u0631):" }), _jsx(MoneyInput450, { value: tariffPrice, onChange: (v) => setTariffPrice(Number(v || 0)), unit: "تومان" })] }), _jsxs("div", { className: `p-3 border rounded-2xl flex flex-col justify-between ${computedDifference >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`, children: [_jsx("span", { className: "text-[10.5px] text-slate-600 font-bold block mb-1", children: "\u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A (\u062A\u0641\u0627\u0648\u062A \u062A\u0639\u0631\u0641\u0647 \u0645\u0631\u06A9\u0632):" }), _jsxs("span", { className: `text-sm font-mono font-bold ${computedDifference >= 0 ? 'text-emerald-800' : 'text-rose-800'}`, children: [computedDifference >= 0 ? '+' : '', computedDifference.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] })] }), _jsxs("div", { className: "p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-600 flex items-center gap-1.5", children: [_jsx(Lock, { className: "w-3.5 h-3.5 text-slate-500 shrink-0" }), _jsx("span", { children: "\u0645\u0627\u0628\u0647\u200C\u0627\u0644\u062A\u0641\u0627\u0648\u062A \u0648 \u0645\u0628\u0644\u063A \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u067E\u0627\u06CC\u0647 \u06A9\u0627\u0645\u0644\u0627\u064B \u0645\u062D\u0631\u0645\u0627\u0646\u0647 \u0628\u0648\u062F\u0647 \u0648 \u062F\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0628\u06CC\u0645\u0627\u0631 \u06CC\u0627 \u067E\u0630\u06CC\u0631\u0634 \u0646\u0634\u0627\u0646 \u062F\u0627\u062F\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 pt-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062F\u0631\u0635\u062F \u0633\u0647\u0645/\u06A9\u0645\u06CC\u0633\u06CC\u0648\u0646 \u067E\u0632\u0634\u06A9 (%):" }), _jsx("input", { type: "number", min: 0, max: 100, value: doctorCommissionPercent, onChange: (e) => setDoctorCommissionPercent(Number(e.target.value)), className: "w-full border border-slate-300 rounded-xl p-2.5 font-mono font-bold", required: true })] }), _jsxs("div", { className: "p-2.5 bg-slate-100 rounded-xl flex flex-col justify-center text-slate-700", children: [_jsx("span", { className: "text-[10px] text-slate-500", children: "\u0645\u0628\u0644\u063A \u062E\u0627\u0644\u0635 \u0633\u0647\u0645 \u067E\u0632\u0634\u06A9:" }), _jsxs("span", { className: "font-bold text-teal-800 font-mono text-xs", children: [(((tariffPrice || 0) * (doctorCommissionPercent || 0)) / 100).toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] })] }), _jsxs("div", { className: "rounded-2xl border border-emerald-200 bg-emerald-50 p-3 space-y-3", children: [_jsxs("label", { className: "flex items-start gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: requiresAssistant, onChange: (e) => setRequiresAssistant(e.target.checked), className: "mt-1" }), _jsxs("div", { children: [_jsx("span", { className: "font-bold text-emerald-950 block", children: "انجام خدمت با حضور پرستار/دستیار" }), _jsx("span", { className: "text-[10.5px] text-emerald-800 block mt-1", children: "به طور پیش‌فرض فعال است. اگر برای خدمتی مثل ویزیت دستیار لازم نیست، این گزینه را غیرفعال کنید؛ در پذیرش نیز انتخاب دستیار دیگر اجباری نخواهد بود." })] })] }), requiresAssistant && (_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "درصد کارانه دستیار (%):" }), _jsx("input", { type: "number", min: 0, max: 100, value: assistantCommissionPercent, onChange: (e) => setAssistantCommissionPercent(Number(e.target.value)), className: "w-full border border-emerald-300 rounded-xl p-2.5 font-mono font-bold bg-white" })] }), _jsxs("div", { className: "p-2.5 bg-white rounded-xl border border-emerald-200 flex flex-col justify-center", children: [_jsx("span", { className: "text-[10px] text-slate-500", children: "سهم تقریبی دستیار از این خدمت:" }), _jsxs("span", { className: "font-bold text-emerald-800 font-mono text-xs", children: [(((tariffPrice || 0) * (assistantCommissionPercent || 0)) / 100).toLocaleString('fa-IR'), " تومان"] })] })] }))] }), _jsxs("div", { className: "rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 space-y-3", children: [_jsxs("label", { className: "flex items-start gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: isMultiSession, onChange: (e) => setIsMultiSession(e.target.checked), className: "mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" }), _jsxs("div", { children: [_jsx("span", { className: "font-bold text-indigo-950 block", children: "خدمت چند جلسه‌ای / پروتکل درمانی دوره‌ای" }), _jsx("span", { className: "text-[10.5px] text-indigo-800 block mt-0.5", children: "برای درمان‌های چند جلسه‌ای (فیزیوتراپی، لیزر، ترمیم، پانسمان). یادآوری پیامکی ۴۸ و ۲۴ ساعت قبل و هشدار کارتابل منشی فعال می‌شود." })] })] }), isMultiSession && (_jsxs("div", { className: "grid grid-cols-2 gap-3 pt-2 border-t border-indigo-200", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "تعداد جلسات دوره:" }), _jsx("input", { type: "number", min: 1, max: 50, value: defaultSessions, onChange: (e) => setDefaultSessions(Number(e.target.value)), className: "w-full border border-indigo-300 rounded-xl p-2 font-mono font-bold bg-white text-center" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "فاصله بین هر جلسه (روز):" }), _jsx("input", { type: "number", min: 1, max: 90, value: sessionIntervalDays, onChange: (e) => setSessionIntervalDays(Number(e.target.value)), className: "w-full border border-indigo-300 rounded-xl p-2 font-mono font-bold bg-white text-center" })] })] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "چک‌لیست آماده‌سازی بیمار (هر خط یک مورد):" }), _jsx("textarea", { rows: 3, value: preparationChecklistText, onChange: (e) => setPreparationChecklistText(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5", placeholder: "کنترل علائم حیاتی\nبررسی حساسیت دارویی" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "فرم‌های همراه خدمت (هر خط یک فرم):" }), _jsx("textarea", { rows: 3, value: requiredFormsText, onChange: (e) => setRequiredFormsText(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5", placeholder: "رضایت‌نامه انجام خدمت\nفرم ثبت علائم حیاتی" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u067E\u0631\u0648\u062A\u06A9\u0644 \u0627\u0646\u062C\u0627\u0645 \u062E\u062F\u0645\u062A:" }), _jsx("textarea", { rows: 2, value: description, onChange: (e) => setDescription(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5", placeholder: "\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0642\u0628\u0644 \u06CC\u0627 \u0628\u0639\u062F \u0627\u0632 \u062E\u062F\u0645\u062A..." })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0", children: [_jsx("button", { type: "button", onClick: () => setShowServiceModal(false), className: "px-4 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700 font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-950/20", children: editingService ? 'ذخیره تغییرات خدمت' : 'افزودن خدمت به کلینیک' })] })] })] }) })), showKRatesModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-slate-900 text-white p-4 font-bold flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calculator, { className: "w-5 h-5 text-teal-400" }), _jsx("span", { children: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0633\u0627\u0644\u0627\u0646\u0647 \u0646\u0631\u062E \u0636\u0631\u0627\u06CC\u0628 \u06A9\u0627 (K-Factor Rates)" })] }), _jsx("button", { onClick: () => setShowKRatesModal(false), className: "text-slate-400 hover:text-white", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleSaveKRates, className: "p-5 space-y-4 text-xs", children: [_jsx("div", { className: "bg-teal-50 border border-teal-200 text-teal-900 p-3 rounded-2xl text-[11px] leading-relaxed", children: "\uD83D\uDCA1 \u0646\u0631\u062E\u200C\u0647\u0627\u06CC \u0631\u06CC\u0627\u0644\u06CC \u0636\u0631\u06CC\u0628 \u06A9\u0627 \u062A\u0648\u0633\u0637 \u0647\u06CC\u0626\u062A \u0648\u0632\u06CC\u0631\u0627\u0646 \u0633\u0627\u0644\u0627\u0646\u0647 \u0627\u0639\u0644\u0627\u0645 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0628\u0627 \u062A\u0646\u0638\u06CC\u0645 \u0646\u0631\u062E\u200C\u0647\u0627\u06CC \u0633\u0627\u0644 \u062C\u0627\u0631\u06CC\u060C \u0645\u0628\u0627\u0644\u063A \u067E\u0627\u06CC\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u062A\u0645\u0627\u0645\u06CC \u062E\u062F\u0645\u0627\u062A \u06A9\u0644\u06CC\u0646\u06CC\u06A9 \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u0647\u0648\u0634\u0645\u0646\u062F \u0628\u0647\u200C\u0631\u0648\u0632 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F." }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0633\u0627\u0644 \u062A\u0639\u0631\u0641\u0647 / \u0645\u0627\u0644\u06CC:" }), _jsx("input", { type: "text", value: kRates.tariffYear, onChange: (e) => setKRates({ ...kRates, tariffYear: e.target.value }), className: "w-full border border-slate-300 rounded-xl p-2.5 font-bold font-mono text-center", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0628\u062E\u0634 \u062A\u0639\u0631\u0641\u0647\u200C\u06AF\u0630\u0627\u0631\u06CC:" }), _jsxs("select", { value: kRates.tariffSector || 'private', onChange: (e) => setKRates({ ...kRates, tariffSector: e.target.value }), className: "w-full border border-slate-300 rounded-xl p-2.5 font-bold", children: [_jsx("option", { value: "private", children: "\u0628\u062E\u0634 \u062E\u0635\u0648\u0635\u06CC / \u06A9\u0644\u06CC\u0646\u06CC\u06A9\u200C\u0647\u0627\u06CC \u062C\u0631\u0627\u062D\u06CC" }), _jsx("option", { value: "public", children: "\u0628\u062E\u0634 \u062F\u0648\u0644\u062A\u06CC" }), _jsx("option", { value: "charity", children: "\u0628\u062E\u0634 \u062E\u06CC\u0631\u06CC\u0647 \u0648 \u0639\u0645\u0648\u0645\u06CC \u063A\u06CC\u0631\u062F\u0648\u0644\u062A\u06CC" })] })] })] }), _jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u0631\u062E \u0631\u06CC\u0627\u0644\u06CC \u0647\u0631 \u06F1 K \u062D\u0631\u0641\u0647\u200C\u0627\u06CC (Toman):" }), _jsx(MoneyInput450, { value: kRates.kProfessionalRate, onChange: (v) => setKRates({ ...kRates, kProfessionalRate: Number(v || 0) }), unit: "تومان" }), _jsxs("span", { className: "text-[10px] text-slate-500 block mt-0.5", children: ["\u0645\u0639\u0627\u062F\u0644: ", (kRates.kProfessionalRate * 10).toLocaleString('fa-IR'), " \u0631\u06CC\u0627\u0644"] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u0631\u062E \u0631\u06CC\u0627\u0644\u06CC \u0647\u0631 \u06F1 K \u0641\u0646\u06CC (Toman):" }), _jsx(MoneyInput450, { value: kRates.kTechnicalRate, onChange: (v) => setKRates({ ...kRates, kTechnicalRate: Number(v || 0) }), unit: "تومان" }), _jsxs("span", { className: "text-[10px] text-slate-500 block mt-0.5", children: ["\u0645\u0639\u0627\u062F\u0644: ", (kRates.kTechnicalRate * 10).toLocaleString('fa-IR'), " \u0631\u06CC\u0627\u0644"] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u0631\u062E \u0631\u06CC\u0627\u0644\u06CC \u0647\u0631 \u06F1 K \u0628\u06CC\u0647\u0648\u0634\u06CC (Toman):" }), _jsx(MoneyInput450, { value: kRates.kAnesthesiaRate, onChange: (v) => setKRates({ ...kRates, kAnesthesiaRate: Number(v || 0) }), unit: "تومان" }), _jsxs("span", { className: "text-[10px] text-slate-500 block mt-0.5", children: ["\u0645\u0639\u0627\u062F\u0644: ", (kRates.kAnesthesiaRate * 10).toLocaleString('fa-IR'), " \u0631\u06CC\u0627\u0644"] })] })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowKRatesModal(false), className: "px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow", children: "\u0630\u062E\u06CC\u0631\u0647 \u0648 \u0627\u0639\u0645\u0627\u0644 \u0646\u0631\u062E\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F" })] })] })] }) })), showGroupsModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "bg-purple-900 text-white p-4 font-bold flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(FolderPlus, { className: "w-5 h-5 text-purple-300" }), _jsx("span", { children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0648 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u06AF\u0631\u0648\u0647 \u062E\u062F\u0645\u0627\u062A \u06A9\u0644\u06CC\u0646\u06CC\u06A9" })] }), _jsx("button", { onClick: () => setShowGroupsModal(false), className: "text-purple-200 hover:text-white", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "p-5 overflow-y-auto space-y-5 text-xs", children: [_jsxs("form", { onSubmit: handleSaveServiceGroup, className: "p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3", children: [_jsx("span", { className: "font-bold text-purple-900 block text-xs", children: editingGroupId ? '✏️ ویرایش گروه خدمات انتخاب‌شده:' : '➕ افزودن گروه جدید خدمات:' }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-700 font-semibold mb-1", children: "\u0639\u0646\u0648\u0627\u0646 \u06AF\u0631\u0648\u0647 \u062E\u062F\u0645\u0627\u062A:" }), _jsx("input", { type: "text", value: groupNameInput, onChange: (e) => setGroupNameInput(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u062E\u062F\u0645\u0627\u062A \u0644\u06CC\u0632\u0631 \u0632\u06CC\u0628\u0627\u06CC\u06CC\u060C \u062C\u0631\u0627\u062D\u06CC \u0639\u0645\u06CC\u0642...", className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-700 font-semibold mb-1", children: "\u06A9\u062F \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u06AF\u0631\u0648\u0647:" }), _jsx("input", { type: "text", value: groupCodeInput, onChange: (e) => setGroupCodeInput(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: GRP-SURG", className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-mono" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-700 font-semibold mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC):" }), _jsx("input", { type: "text", value: groupDescInput, onChange: (e) => setGroupDescInput(e.target.value), placeholder: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC \u062F\u0631\u0628\u0627\u0631\u0647 \u0627\u06CC\u0646 \u06AF\u0631\u0648\u0647...", className: "w-full border border-slate-300 rounded-xl p-2 bg-white" })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [editingGroupId && (_jsx("button", { type: "button", onClick: () => {
                                                        setEditingGroupId(null);
                                                        setGroupNameInput('');
                                                        setGroupCodeInput('');
                                                        setGroupDescInput('');
                                                    }, className: "px-3 py-1.5 border border-slate-300 rounded-xl hover:bg-slate-100", children: "\u0627\u0646\u0635\u0631\u0627\u0641" })), _jsx("button", { type: "submit", className: "px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-sm", children: editingGroupId ? 'ذخیره تغییرات گروه' : 'افزودن گروه خدمات' })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("span", { className: "font-bold text-slate-800 block text-xs", children: "\u0644\u06CC\u0633\u062A \u06AF\u0631\u0648\u0647\u200C\u0647\u0627\u06CC \u062E\u062F\u0645\u0627\u062A \u062A\u0639\u0631\u06CC\u0641\u200C\u0634\u062F\u0647:" }), _jsx("div", { className: "border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100", children: serviceCategories.length === 0 ? (_jsx("div", { className: "p-4 text-center text-slate-400", children: "\u0647\u06CC\u0686 \u06AF\u0631\u0648\u0647 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." })) : (serviceCategories.map((grp) => (_jsxs("div", { className: "p-3 flex items-center justify-between hover:bg-slate-50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-mono bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10.5px]", children: grp.code }), _jsxs("div", { children: [_jsx("span", { className: "font-bold text-slate-800 text-xs block", children: grp.name }), grp.description && _jsx("span", { className: "text-[10px] text-slate-400", children: grp.description })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: () => {
                                                                    setEditingGroupId(grp.id);
                                                                    setGroupNameInput(grp.name);
                                                                    setGroupCodeInput(grp.code);
                                                                    setGroupDescInput(grp.description || '');
                                                                }, className: "p-1.5 text-slate-500 hover:text-purple-700 rounded hover:bg-slate-100", title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u06AF\u0631\u0648\u0647", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { type: "button", onClick: () => handleDeleteServiceGroup(grp.id), className: "p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100", title: "\u062D\u0630\u0641 \u06AF\u0631\u0648\u0647", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, grp.id)))) })] })] }), _jsx("div", { className: "p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0", children: _jsx("button", { type: "button", onClick: () => setShowGroupsModal(false), className: "px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl", children: "\u0628\u0633\u062A\u0646 \u067E\u0646\u062C\u0631\u0647" }) })] }) })), showBookModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "bg-blue-900 text-white p-4 font-bold flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BookOpen, { className: "w-5 h-5 text-blue-300" }), _jsx("span", { children: "\u06A9\u062A\u0627\u0628\u0686\u0647 \u0645\u0631\u062C\u0639 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u062E\u062F\u0645\u0627\u062A \u0633\u0644\u0627\u0645\u062A (\u062C\u0633\u062A\u062C\u0648 \u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u062E\u062F\u0645\u062A)" })] }), _jsx("button", { onClick: () => setShowBookModal(false), className: "text-blue-200 hover:text-white", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 shrink-0 text-xs", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u062F \u0645\u0644\u06CC \u06CC\u0627 \u0646\u0627\u0645 \u062E\u062F\u0645\u062A (\u0645\u062B\u0644\u0627\u064B: 901305 \u06CC\u0627 \u062C\u0633\u0645 \u062E\u0627\u0631\u062C\u06CC)...", value: bookSearchTerm, onChange: (e) => setBookSearchTerm(e.target.value), className: "w-full pl-3 pr-9 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500" }), _jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-3" })] }), _jsxs("select", { value: bookCategoryFilter, onChange: (e) => setBookCategoryFilter(e.target.value), className: "border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-bold", children: [_jsx("option", { value: "all", children: "\u0647\u0645\u0647 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u06CC \u06A9\u062A\u0627\u0628" }), _jsx("option", { value: "\u0648\u06CC\u0632\u06CC\u062A \u0648 \u0645\u0634\u0627\u0648\u0631\u0647", children: "\u0648\u06CC\u0632\u06CC\u062A \u0648 \u0645\u0634\u0627\u0648\u0631\u0647" }), _jsx("option", { value: "\u062A\u0632\u0631\u06CC\u0642\u0627\u062A \u0648 \u062E\u062F\u0645\u0627\u062A \u0633\u0631\u067E\u0627\u06CC\u06CC", children: "\u062A\u0632\u0631\u06CC\u0642\u0627\u062A \u0648 \u062E\u062F\u0645\u0627\u062A \u0633\u0631\u067E\u0627\u06CC\u06CC" }), _jsx("option", { value: "\u067E\u0627\u0646\u0633\u0645\u0627\u0646 \u0648 \u0645\u0631\u0627\u0642\u0628\u062A \u0632\u062E\u0645", children: "\u067E\u0627\u0646\u0633\u0645\u0627\u0646 \u0648 \u0645\u0631\u0627\u0642\u0628\u062A \u0632\u062E\u0645" }), _jsx("option", { value: "\u062C\u0631\u0627\u062D\u06CC\u200C\u0647\u0627\u06CC \u06A9\u0648\u0686\u06A9 \u0648 \u0633\u0631\u067E\u0627\u06CC\u06CC", children: "\u062C\u0631\u0627\u062D\u06CC\u200C\u0647\u0627\u06CC \u06A9\u0648\u0686\u06A9 \u0648 \u0633\u0631\u067E\u0627\u06CC\u06CC" }), _jsx("option", { value: "\u067E\u0648\u0633\u062A \u0648 \u0632\u06CC\u0628\u0627\u06CC\u06CC", children: "\u067E\u0648\u0633\u062A \u0648 \u0632\u06CC\u0628\u0627\u06CC\u06CC" }), _jsx("option", { value: "\u062C\u0631\u0627\u062D\u06CC \u0645\u062D\u062F\u0648\u062F \u0627\u062A\u0627\u0642 \u0639\u0645\u0644", children: "\u062C\u0631\u0627\u062D\u06CC \u0645\u062D\u062F\u0648\u062F \u0627\u062A\u0627\u0642 \u0639\u0645\u0644" })] })] }), _jsx("div", { className: "p-4 overflow-y-auto space-y-2.5 flex-1 text-xs", children: filteredBookServices.length === 0 ? (_jsx("div", { className: "p-12 text-center text-slate-400", children: "\u0647\u06CC\u0686 \u062E\u062F\u0645\u062A\u06CC \u062F\u0631 \u06A9\u062A\u0627\u0628\u0686\u0647 \u0627\u0631\u0632\u0634 \u0646\u0633\u0628\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." })) : (filteredBookServices.map((item) => {
                                const itemBasePrice = calculateBasePrice(item.kProfessional, item.kTechnical, item.kAnesthesia, kRates);
                                return (_jsxs("div", { className: "bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition shadow-xs", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "bg-blue-100 text-blue-900 border border-blue-200 font-mono font-bold px-2 py-0.5 rounded-lg text-[11px]", children: ["\u06A9\u062F \u0645\u0644\u06CC: ", item.nationalCode] }), _jsx("span", { className: "font-bold text-slate-900 text-xs", children: item.nationalTitle })] }), item.description && (_jsx("p", { className: "text-[10.5px] text-slate-500", children: item.description })), _jsxs("div", { className: "flex items-center gap-3 text-[10.5px] text-slate-600 font-mono pt-0.5", children: [_jsxs("span", { children: ["K \u062D\u0631\u0641\u0647\u200C\u0627\u06CC: ", _jsx("strong", { children: item.kProfessional })] }), _jsx("span", { children: "|" }), _jsxs("span", { children: ["K \u0641\u0646\u06CC: ", _jsx("strong", { children: item.kTechnical })] }), _jsx("span", { children: "|" }), _jsxs("span", { children: ["K \u0628\u06CC\u0647\u0648\u0634\u06CC: ", _jsx("strong", { children: item.kAnesthesia })] })] })] }), _jsxs("div", { className: "flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0", children: [_jsxs("div", { className: "text-left font-mono", children: [_jsxs("span", { className: "text-[10px] text-slate-400 block", children: ["\u0645\u0628\u0644\u063A \u067E\u0627\u06CC\u0647 (K \u0633\u0627\u0644 ", kRates.tariffYear, "):"] }), _jsxs("span", { className: "font-bold text-teal-800 text-xs", children: [itemBasePrice.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsx("button", { type: "button", onClick: () => handleSelectFromBook(item), className: "bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u06CC\u0646 \u062E\u062F\u0645\u062A" })] })] }, item.nationalCode));
                            })) }), _jsx("div", { className: "p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0", children: _jsx("button", { type: "button", onClick: () => setShowBookModal(false), className: "px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl", children: "\u0628\u0633\u062A\u0646 \u06A9\u062A\u0627\u0628\u0686\u0647" }) })] }) }))] }));
};
// Helper Coins icon component
const CoinsIcon = ({ className }) => (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: [_jsx("circle", { cx: "8", cy: "8", r: "6" }), _jsx("path", { d: "M18 8a6 6 0 0 1 0 12" }), _jsx("path", { d: "M8 14a6 6 0 0 0 10 0" })] }));
