import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { CheckCircle2, CreditCard, FileSpreadsheet, Search, X, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { formatCurrency, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { MoneyInput450 } from './MoneyInput450.js?b=r24-514-1405';
import { exportPatientsToExcel, readExcelFile, processPatientsExcelImport, } from '../utils/excelUtils.js?b=r24-514-1405';
export const PatientsCredit = ({ patients = [], currentUser, currencyUnit, onAddPatient, onUpdatePatient, onSettleDebt, onOpenPatientProfile, }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    // Edit Credit Modal
    const [editingPatient, setEditingPatient] = useState(null);
    const [creditEnabled, setCreditEnabled] = useState(true);
    const [creditLimitInput, setCreditLimitInput] = useState(5000000);
    const [maturityDaysInput, setMaturityDaysInput] = useState(30);
    // Settlement Modal
    const [settlingPatient, setSettlingPatient] = useState(null);
    const [settleAmount, setSettleAmount] = useState(0);
    const [settleMethod, setSettleMethod] = useState('card');
    const [settlePosRrn, setSettlePosRrn] = useState('');
    const openCreditModal = (pat) => {
        setEditingPatient(pat);
        setCreditEnabled(pat.creditConfig?.enabled || false);
        setCreditLimitInput(pat.creditConfig?.creditLimit || 5000000);
        setMaturityDaysInput(pat.creditConfig?.maturityDays || 30);
    };
    const handleSaveCreditConfig = (e) => {
        e.preventDefault();
        if (!editingPatient)
            return;
        if (editingPatient.verificationStatus !== 'verified') {
            alert('تنظیم اعتبار فقط برای بیمارانی که استعلام هویت آن‌ها تایید شده است مجاز می‌باشد.');
            return;
        }
        const updated = {
            ...editingPatient,
            creditConfig: {
                ...editingPatient.creditConfig,
                enabled: creditEnabled,
                creditLimit: creditLimitInput,
                maturityDays: maturityDaysInput,
            },
        };
        onUpdatePatient(updated);
        setEditingPatient(null);
    };
    const openSettlementModal = (pat) => {
        setSettlingPatient(pat);
        setSettleAmount(pat.creditConfig.currentDebt);
        setSettlePosRrn('');
    };
    const handleExecuteSettlement = (e) => {
        e.preventDefault();
        if (!settlingPatient)
            return;
        if (settleAmount <= 0) {
            alert('مبلغ تسویه باید بزرگتر از صفر باشد.');
            return;
        }
        onSettleDebt(settlingPatient.id, settleAmount, settleMethod, settlePosRrn);
        setSettlingPatient(null);
        alert('تسویه حساب اعتباری بیمار با موفقیت ثبت شد.');
    };
    const filteredPatients = patients.filter((p) => {
        const matchesSearch = (p?.fullName || '').includes(searchTerm) ||
            (p?.nationalId && p.nationalId.includes(searchTerm)) ||
            (p?.mobilePhone && p.mobilePhone.includes(searchTerm));
        const matchesFilter = filterType === 'all' ||
            (filterType === 'verified' && p.verificationStatus === 'verified') ||
            (filterType === 'debtors' && p.creditConfig?.currentDebt > 0) ||
            (filterType === 'creditors' && p.creditConfig?.currentDebt < 0);
        return matchesSearch && matchesFilter;
    });
    const excelInputRef = React.useRef(null);
    const handleExcelImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const rawRows = await readExcelFile(file);
            if (!rawRows || rawRows.length === 0) {
                alert('هیچ ردیف یا داده‌ای در فایل اکسل بیماران یافت نشد.');
                return;
            }
            const { updatedPatients, updatedCount, createdCount, validRowsCount, skippedRowsCount, } = processPatientsExcelImport(rawRows, patients);
            updatedPatients.forEach((p) => {
                const existing = patients.find((ex) => ex.id === p.id);
                if (existing) {
                    onUpdatePatient(p);
                }
                else if (onAddPatient) {
                    onAddPatient(p);
                }
            });
            let reportMsg = `نتیجه پردازش و اعتبارسنجی اکسل بیماران:\n\n` +
                `✅ ردیف‌های معتبر: ${toPersianDigits(validRowsCount)} مورد\n` +
                `• تعداد ${toPersianDigits(updatedCount)} پرونده به‌روزرسانی شد.\n` +
                `• تعداد ${toPersianDigits(createdCount)} پرونده بیمار جدید ثبت گردید.`;
            if (skippedRowsCount > 0) {
                reportMsg += `\n⚠️ تعداد ${toPersianDigits(skippedRowsCount)} ردیف خالی نادیده گرفته شد.`;
            }
            alert(reportMsg);
        }
        catch (err) {
            alert('خطا در پردازش فایل اکسل بیماران: ' + (err?.message || err));
        }
        finally {
            if (e.target)
                e.target.value = '';
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("input", { type: "file", ref: excelInputRef, onChange: handleExcelImportFile, accept: ".xlsx,.xls,.csv", className: "hidden" }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse", children: [_jsx(CreditCard, { className: "w-5 h-5 text-emerald-400" }), _jsx("span", { children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0628\u06CC\u0645\u0627\u0631\u0627\u0646\u060C \u0647\u0648\u06CC\u062A \u062A\u0627\u06CC\u06CC\u062F\u0634\u062F\u0647 \u0648 \u062D\u0633\u0627\u0628 \u0627\u0639\u062A\u0628\u0627\u0631\u06CC (\u0628\u062F\u0647\u06A9\u0627\u0631 / \u0628\u0633\u062A\u0627\u0646\u06A9\u0627\u0631)" })] }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u0645\u0634\u0627\u0647\u062F\u0647 \u0648\u0636\u0639\u06CC\u062A \u0645\u0627\u0644\u06CC \u0648 \u0645\u0627\u0646\u062F\u0647 \u062D\u0633\u0627\u0628 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646\u060C \u062A\u0646\u0638\u06CC\u0645 \u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631\u060C \u062A\u0633\u0648\u06CC\u0647 \u0648 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("button", { onClick: () => exportPatientsToExcel(filteredPatients), className: "bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5", title: "\u062E\u0631\u0648\u062C\u06CC \u062A\u0645\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u0628\u0647 \u0627\u06A9\u0633\u0644", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-teal-400" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646" })] }), _jsxs("button", { onClick: () => excelInputRef.current?.click(), className: "bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5", title: "\u0648\u0631\u0648\u062F\u06CC/\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: "\u0648\u0631\u0648\u062F\u06CC \u0627\u06A9\u0633\u0644 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 (\u0645\u0628\u0646\u0627\u06CC \u0645\u0631\u062C\u0639)" })] })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-2.5" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0628\u06CC\u0645\u0627\u0631 \u0628\u0627 \u0646\u0627\u0645\u060C \u06A9\u062F \u0645\u0644\u06CC \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs pr-9 pl-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { className: "flex items-center space-x-1 space-x-reverse bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs overflow-x-auto", children: [_jsx("button", { onClick: () => setFilterType('all'), className: `flex-1 py-1 px-2 rounded-lg text-center transition-colors whitespace-nowrap ${filterType === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300'}`, children: "\u0647\u0645\u0647 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646" }), _jsx("button", { onClick: () => setFilterType('verified'), className: `flex-1 py-1 px-2 rounded-lg text-center transition-colors whitespace-nowrap ${filterType === 'verified' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300'}`, children: "\u062A\u0623\u06CC\u06CC\u062F\u0634\u062F\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646" }), _jsx("button", { onClick: () => setFilterType('debtors'), className: `flex-1 py-1 px-2 rounded-lg text-center transition-colors whitespace-nowrap ${filterType === 'debtors' ? 'bg-rose-600 text-white font-bold' : 'text-slate-300'}`, children: "\u0628\u062F\u0647\u06A9\u0627\u0631\u0627\u0646" }), _jsx("button", { onClick: () => setFilterType('creditors'), className: `flex-1 py-1 px-2 rounded-lg text-center transition-colors whitespace-nowrap ${filterType === 'creditors' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300'}`, children: "\u0628\u0633\u062A\u0627\u0646\u06A9\u0627\u0631\u0627\u0646" })] })] }), _jsx("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800/80 text-slate-400 border-b border-slate-700", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC" }), _jsx("th", { className: "p-3", children: "\u06A9\u062F \u0645\u0644\u06CC" }), _jsx("th", { className: "p-3", children: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647" }), _jsx("th", { className: "p-3", children: "\u0648\u0636\u0639\u06CC\u062A \u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0647\u0648\u06CC\u062A" }), _jsx("th", { className: "p-3", children: "\u0648\u0636\u0639\u06CC\u062A \u062D\u0633\u0627\u0628 \u0627\u0639\u062A\u0628\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u0645\u0647\u0644\u062A \u062A\u0633\u0648\u06CC\u0647" }), _jsx("th", { className: "p-3", children: "\u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06CC" }), _jsx("th", { className: "p-3 text-center", children: "\u0639\u0645\u0644\u06CC\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: filteredPatients.map((pat) => {
                                    const isVerified = pat.verificationStatus === 'verified';
                                    const hasCredit = pat.creditConfig?.enabled;
                                    const debt = pat.creditConfig?.currentDebt || 0;
                                    return (_jsxs("tr", { className: "hover:bg-slate-800/50", children: [_jsx("td", { className: "p-3 font-bold text-slate-100", children: _jsx("button", { type: "button", onClick: () => onOpenPatientProfile && onOpenPatientProfile(pat.id), className: "text-teal-300 hover:text-teal-200 underline decoration-teal-500 font-bold hover:bg-slate-800 px-1.5 py-0.5 rounded transition text-right", title: "\u0645\u0634\u0627\u0647\u062F\u0647 \u0634\u0646\u0627\u0633\u0646\u0627\u0645\u0647\u060C \u067E\u0630\u06CC\u0631\u0634 \u0645\u062C\u062F\u062F \u0648 \u0633\u0648\u0627\u0628\u0642 \u0645\u0631\u0627\u062C\u0639\u0627\u062A \u0628\u06CC\u0645\u0627\u0631", children: pat.fullName }) }), _jsx("td", { className: "p-3 font-mono text-slate-400", children: pat.nationalId ? toPersianDigits(pat.nationalId) : '-' }), _jsx("td", { className: "p-3 font-mono text-slate-400", children: pat.mobilePhone ? toPersianDigits(pat.mobilePhone) : '-' }), _jsx("td", { className: "p-3", children: isVerified ? (_jsxs("span", { className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full inline-flex items-center space-x-1 space-x-reverse font-medium", children: [_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-400" }), _jsx("span", { children: "\u062A\u0623\u06CC\u06CC\u062F \u0622\u0646\u0644\u0627\u06CC\u0646 \u062B\u0628\u062A \u0627\u062D\u0648\u0627\u0644" })] })) : (_jsx("span", { className: "bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full", children: "\u0628\u06CC\u0645\u0627\u0631 \u0645\u062A\u0641\u0631\u0642\u0647" })) }), _jsx("td", { className: "p-3", children: hasCredit ? (_jsx("span", { className: "bg-teal-500/20 text-teal-300 text-[10px] px-2 py-0.5 rounded-full font-medium", children: "\u0627\u0639\u062A\u0628\u0627\u0631 \u0641\u0639\u0627\u0644" })) : (_jsx("span", { className: "text-slate-500", children: "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644" })) }), _jsx("td", { className: "p-3 font-bold text-slate-200", children: hasCredit ? formatCurrency(pat.creditConfig.creditLimit, currencyUnit) : '-' }), _jsx("td", { className: "p-3 text-slate-400", children: hasCredit ? `${toPersianDigits(pat.creditConfig.maturityDays)} روز` : '-' }), _jsx("td", { className: "p-3 font-bold", children: debt > 0 ? (_jsxs("span", { className: "text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20", children: [formatCurrency(debt, currencyUnit), " \u0628\u062F\u0647\u06A9\u0627\u0631"] })) : debt < 0 ? (_jsxs("span", { className: "text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20", children: [formatCurrency(Math.abs(debt), currencyUnit), " \u0628\u0633\u062A\u0627\u0646\u06A9\u0627\u0631"] })) : (_jsx("span", { className: "text-slate-500", children: "\u062A\u0633\u0648\u06CC\u0647 \u06A9\u0627\u0645\u0644 (\u06F0)" })) }), _jsx("td", { className: "p-3 text-center", children: _jsxs("div", { className: "flex items-center justify-center space-x-2 space-x-reverse", children: [isVerified && (_jsx("button", { onClick: () => openCreditModal(pat), title: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631", className: "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] px-2.5 py-1 rounded-lg transition-colors", children: "\u062A\u0646\u0638\u06CC\u0645 \u0627\u0639\u062A\u0628\u0627\u0631" })), debt > 0 && (_jsx("button", { onClick: () => openSettlementModal(pat), className: "bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-sm transition-colors", children: "\u062A\u0633\u0648\u06CC\u0647 \u0628\u062F\u0647\u06CC" }))] }) })] }, pat.id));
                                }) })] }) }) }), editingPatient && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("h3", { className: "font-bold text-slate-100 text-sm", children: ["\u062A\u0646\u0638\u06CC\u0645 \u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631 \u0628\u06CC\u0645\u0627\u0631: ", editingPatient.fullName] }), _jsx("button", { onClick: () => setEditingPatient(null), className: "text-slate-400 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSaveCreditConfig, className: "space-y-3 text-xs", children: [_jsx("div", { className: "bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-2", children: _jsxs("label", { className: "flex items-center space-x-2 space-x-reverse cursor-pointer font-bold text-slate-200", children: [_jsx("input", { type: "checkbox", checked: creditEnabled, onChange: (e) => setCreditEnabled(e.target.checked), className: "rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0" }), _jsx("span", { children: "\u0641\u0639\u0627\u0644\u200C\u0633\u0627\u0632\u06CC \u0641\u0631\u0648\u0634 \u0627\u0639\u062A\u0628\u0627\u0631\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0628\u06CC\u0645\u0627\u0631" })] }) }), creditEnabled && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-slate-300 mb-1", children: ["\u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631 \u0645\u062C\u0627\u0632 (", currencyUnit === 'toman' ? 'تومان' : 'ریال', "):"] }), _jsx(MoneyInput450, { value: creditLimitInput, onChange: (v) => setCreditLimitInput(Number(v || 0)), unit: currencyUnit === 'toman' ? 'تومان' : 'ریال' })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0645\u0647\u0644\u062A \u062A\u0633\u0648\u06CC\u0647 \u062D\u0633\u0627\u0628 (\u0631\u0648\u0632):" }), _jsx("input", { type: "number", required: true, value: maturityDaysInput, onChange: (e) => setMaturityDaysInput(Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl font-mono" })] })] })), _jsxs("div", { className: "pt-2 flex justify-end space-x-2 space-x-reverse", children: [_jsx("button", { type: "button", onClick: () => setEditingPatient(null), className: "bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl", children: "\u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0627\u0639\u062A\u0628\u0627\u0631" })] })] })] }) })), settlingPatient && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("h3", { className: "font-bold text-slate-100 text-sm", children: ["\u062A\u0633\u0648\u06CC\u0647 \u062D\u0633\u0627\u0628 \u0628\u062F\u0647\u06CC \u0628\u06CC\u0645\u0627\u0631: ", settlingPatient.fullName] }), _jsx("button", { onClick: () => setSettlingPatient(null), className: "text-slate-400 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleExecuteSettlement, className: "space-y-3 text-xs", children: [_jsx("div", { className: "bg-slate-800/80 p-3 rounded-xl text-slate-300 space-y-1", children: _jsxs("div", { children: ["\u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06CC \u0641\u0639\u0644\u06CC: ", _jsx("span", { className: "font-bold text-rose-400", children: formatCurrency(settlingPatient.creditConfig.currentDebt, currencyUnit) })] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC \u062C\u0647\u062A \u062A\u0633\u0648\u06CC\u0647:" }), _jsx(MoneyInput450, { value: settleAmount, onChange: (v) => setSettleAmount(Number(v || 0)), unit: currencyUnit === 'toman' ? 'تومان' : 'ریال' })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0631\u0648\u0634 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u0628\u0644\u063A:" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("button", { type: "button", onClick: () => setSettleMethod('card'), className: `p-2 rounded-xl border text-center transition-colors ${settleMethod === 'card'
                                                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                                                        : 'bg-slate-800 border-slate-700 text-slate-300'}`, children: "\u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 (PC-POS)" }), _jsx("button", { type: "button", onClick: () => setSettleMethod('cash'), className: `p-2 rounded-xl border text-center transition-colors ${settleMethod === 'cash'
                                                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                                                        : 'bg-slate-800 border-slate-700 text-slate-300'}`, children: "\u0646\u0642\u062F\u06CC" })] })] }), settleMethod === 'card' && (_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u067E\u06CC\u06AF\u06CC\u0631\u06CC / \u06A9\u062F \u0645\u0631\u062C\u0639 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646:" }), _jsx("input", { type: "text", value: settlePosRrn, onChange: (e) => setSettlePosRrn(e.target.value), placeholder: "\u0645\u062B\u0644\u0627 902138402910", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl font-mono dir-ltr text-right" })] })), _jsxs("div", { className: "pt-2 flex justify-end space-x-2 space-x-reverse", children: [_jsx("button", { type: "button", onClick: () => setSettlingPatient(null), className: "bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl", children: "\u062B\u0628\u062A \u067E\u0631\u062F\u0627\u062E\u062A \u0648 \u062A\u0633\u0648\u06CC\u0647" })] })] })] }) }))] }));
};
