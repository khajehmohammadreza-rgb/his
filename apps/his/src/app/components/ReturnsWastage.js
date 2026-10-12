import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { AlertOctagon, PackageMinus, RotateCcw } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { WebcamScannerModal } from './WebcamScannerModal.js?b=r24-514-1405';
import { normalizeScannedCode } from '../utils/barcodeDecoder.js?b=r24-514-1405';
import { getJalaliDateTimeString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
const WASTAGE_REASONS = [
    { type: 'breakage', label: 'شکستگی / آسیب دیدگی بستر' },
    { type: 'damaged', label: 'خرابی یا افت کیفیت اولیه' },
    { type: 'expired', label: 'انقضاء تاریخ مصرف' },
    { type: 'incorrect_usage', label: 'مصرف اشتباه یا ضایعات حین خدمت' },
];
export const ReturnsWastage = ({ products = [], salesInvoices = [], currentUser, onCancelInvoice, onRecordWastage, }) => {
    const [activeTab, setActiveTab] = useState('returns');
    // Cancel Invoice state
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [cancelReasonInput, setCancelReasonInput] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    // Wastage Form
    const [wastageProdId, setWastageProdId] = useState(products[0]?.id || '');
    const [wastageQty, setWastageQty] = useState(1);
    const [showWastageScanner,setShowWastageScanner] = useState(false);
    const [wastageScanNotice,setWastageScanNotice] = useState('');
    const selectByScan=(raw)=>{
      const value=normalizeScannedCode(raw);
      const product=products.find(p=>normalizeScannedCode(p.barcode)===value||normalizeScannedCode(p.code)===value);
      if(!product){setWastageScanNotice(`بارکد ${value} یافت نشد. هیچ ضایعاتی ثبت نشد.`);return false;}
      setWastageProdId(product.id);setShowWastageScanner(false);
      setWastageScanNotice(`کالای «${product.name}» انتخاب شد. مقدار و دلیل ضایعات را بررسی و تأیید کنید.`);return true;
    };
    const [wastageType, setWastageType] = useState('breakage');
    const [wastageDetails, setWastageDetails] = useState('');
    const handleExecuteCancelInvoice = (e) => {
        e.preventDefault();
        if (!selectedInvoice)
            return;
        if (!cancelReasonInput.trim()) {
            alert('لطفاً دلیل ابطال فاکتور را وارد نمایید.');
            return;
        }
        onCancelInvoice(selectedInvoice.id, cancelReasonInput);
        setSelectedInvoice(null);
        setCancelReasonInput('');
        alert('فاکتور فروش با موفقیت ابطال گردید و موجودی کالاها به انبار بازگشت.');
    };
    const handleExecuteWastage = (e) => {
        e.preventDefault();
        const prod = products.find((p) => p.id === wastageProdId);
        if (!prod)
            return;
        if (!Number.isInteger(wastageQty)||wastageQty<=0) {alert('مقدار ضایعات باید عدد صحیح مثبت باشد.');return;}
        if (wastageQty > prod.stockQuantity) {
            alert('مقدار ضایعات نمی‌تواند بیشتر از موجودی فعلی کالا باشد.');
            return;
        }
        const now = new Date();
        const record = {
            id: 'was-' + Date.now(),
            productId: prod.id,
            productName: prod.name,
            qty: wastageQty,
            unit: prod.unit,
            reasonType: wastageType,
            reasonDetails: wastageDetails,
            date: now.toISOString(),
            jalaliDate: getJalaliDateTimeString(now),
            staffName: currentUser.name,
        };
        onRecordWastage(record);
        setWastageDetails('');
        alert('ضایعات کالا با موفقیت ثبت شد و از موجودی کسر گردید.');
    };
    const filteredInvoices = salesInvoices.filter((inv) => inv.status === 'completed' &&
        ((inv?.invoiceNumber || '').includes(invoiceSearch) || (inv?.patientName || '').includes(invoiceSearch)));
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse", children: [_jsx(PackageMinus, { className: "w-5 h-5 text-amber-400" }), _jsx("span", { children: "\u0645\u0631\u062C\u0648\u0639\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631 \u0641\u0631\u0648\u0634 \u0648 \u062B\u0628\u062A \u0636\u0627\u06CC\u0639\u0627\u062A \u0627\u0646\u0628\u0627\u0631" })] }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u0627\u0628\u0637\u0627\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0645\u0631\u062C\u0648\u0639\u200C\u0634\u062F\u0647 \u0648 \u062B\u0628\u062A \u0627\u0642\u0644\u0627\u0645 \u0622\u0633\u06CC\u0628\u200C\u062F\u06CC\u062F\u0647 \u0628\u0627 \u062F\u0631\u062C \u0627\u0644\u0632\u0627\u0645\u06CC \u062F\u0644\u06CC\u0644 \u062F\u0631 \u0644\u0627\u06AF \u0639\u0645\u0644\u06CC\u0627\u062A" })] }), _jsxs("div", { className: "flex items-center space-x-1 space-x-reverse bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs", children: [_jsx("button", { onClick: () => setActiveTab('returns'), className: `px-4 py-2 rounded-lg transition-colors font-bold ${activeTab === 'returns' ? 'bg-amber-600 text-white' : 'text-slate-300'}`, children: "\u0645\u0631\u062C\u0648\u0639\u06CC / \u0627\u0628\u0637\u0627\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631" }), _jsx("button", { onClick: () => setActiveTab('wastage'), className: `px-4 py-2 rounded-lg transition-colors font-bold ${activeTab === 'wastage' ? 'bg-rose-600 text-white' : 'text-slate-300'}`, children: "\u062B\u0628\u062A \u0636\u0627\u06CC\u0639\u0627\u062A \u06A9\u0627\u0644\u0627" })] })] }), activeTab === 'returns' ? (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsx("div", { className: "lg:col-span-2 space-y-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3", children: [_jsx("h3", { className: "font-bold text-slate-200 text-xs", children: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631 \u062C\u0647\u062A \u0645\u0631\u062C\u0648\u0639\u06CC" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648 \u0628\u0627 \u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631 \u06CC\u0627 \u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631...", value: invoiceSearch, onChange: (e) => setInvoiceSearch(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs p-2.5 rounded-xl" }), _jsx("div", { className: "overflow-x-auto max-h-80 overflow-y-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u0634\u0645\u0627\u0631\u0647" }), _jsx("th", { className: "p-2.5", children: "\u062A\u0627\u0631\u06CC\u062E" }), _jsx("th", { className: "p-2.5", children: "\u0628\u06CC\u0645\u0627\u0631" }), _jsx("th", { className: "p-2.5", children: "\u0645\u0628\u0644\u063A" }), _jsx("th", { className: "p-2.5 text-center", children: "\u0627\u0646\u062A\u062E\u0627\u0628" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: filteredInvoices.map((inv) => (_jsxs("tr", { className: "hover:bg-slate-800/50", children: [_jsx("td", { className: "p-2.5 font-mono", children: toPersianDigits(inv.invoiceNumber) }), _jsx("td", { className: "p-2.5 text-slate-400", children: inv.jalaliDate }), _jsx("td", { className: "p-2.5 font-bold text-slate-100", children: inv.patientName }), _jsx("td", { className: "p-2.5 text-emerald-400", children: toPersianDigits(inv.payableAmount) }), _jsx("td", { className: "p-2.5 text-center", children: _jsx("button", { onClick: () => setSelectedInvoice(inv), className: "bg-amber-600/20 text-amber-300 border border-amber-500/30 text-[11px] px-2 py-0.5 rounded-lg", children: "\u0627\u0646\u062A\u062E\u0627\u0628" }) })] }, inv.id))) })] }) })] }) }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-100 border-b border-slate-800 pb-2", children: "\u062A\u0623\u06CC\u06CC\u062F \u0627\u0628\u0637\u0627\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631" }), selectedInvoice ? (_jsxs("form", { onSubmit: handleExecuteCancelInvoice, className: "space-y-3", children: [_jsxs("div", { className: "bg-slate-800 p-3 rounded-xl space-y-1", children: [_jsxs("div", { children: ["\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631: ", _jsx("span", { className: "font-mono font-bold text-slate-100", children: toPersianDigits(selectedInvoice.invoiceNumber) })] }), _jsxs("div", { children: ["\u0628\u06CC\u0645\u0627\u0631: ", _jsx("span", { className: "font-bold text-slate-100", children: selectedInvoice.patientName })] }), _jsxs("div", { children: ["\u0645\u0628\u0644\u063A: ", _jsx("span", { className: "font-bold text-emerald-400", children: toPersianDigits(selectedInvoice.payableAmount) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u062F\u0644\u06CC\u0644 \u0627\u0644\u0632\u0627\u0645\u06CC \u0645\u0631\u062C\u0648\u0639\u06CC/\u0627\u0628\u0637\u0627\u0644:" }), _jsx("textarea", { rows: 3, required: true, value: cancelReasonInput, onChange: (e) => setCancelReasonInput(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u0627\u0646\u0635\u0631\u0627\u0641 \u0628\u06CC\u0645\u0627\u0631 \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u062E\u062F\u0645\u062A \u06CC\u0627 \u0627\u0634\u062A\u0628\u0627\u0647 \u0635\u0646\u062F\u0648\u0642\u062F\u0627\u0631...", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl" })] }), _jsxs("button", { type: "submit", className: "w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 space-x-reverse", children: [_jsx(RotateCcw, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0628\u0637\u0627\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0648 \u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0627\u0646\u0628\u0627\u0631" })] })] })) : (_jsx("div", { className: "text-slate-400 text-center py-8", children: "\u06CC\u06A9 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0631\u0627 \u0627\u0632 \u062C\u062F\u0648\u0644 \u0633\u0645\u062A \u0631\u0627\u0633\u062A \u062C\u0647\u062A \u0627\u0628\u0637\u0627\u0644 \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0645\u0627\u06CC\u06CC\u062F." }))] })] })) : (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xl mx-auto space-y-4 text-xs shadow-lg", children: [_jsxs("h3", { className: "font-bold text-slate-100 text-sm border-b border-slate-800 pb-3 flex items-center space-x-2 space-x-reverse", children: [_jsx(AlertOctagon, { className: "w-5 h-5 text-rose-400" }), _jsx("span", { children: "\u0641\u0631\u0645 \u062B\u0628\u062A \u0636\u0627\u06CC\u0639\u0627\u062A \u0648 \u062E\u0633\u0627\u0631\u062A \u06A9\u0627\u0644\u0627" })] }), _jsxs("form", { onSubmit: handleExecuteWastage, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0644\u0627:" }), _jsx("select", { value: wastageProdId, onChange: (e) => setWastageProdId(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl", children: products.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " (\u0645\u0648\u062C\u0648\u062F\u06CC: ", toPersianDigits(p.stockQuantity), " ", p.unit, ")"] }, p.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u062A\u0639\u062F\u0627\u062F/\u0645\u0642\u062F\u0627\u0631 \u0636\u0627\u06CC\u0639\u0627\u062A:" }), _jsx("input", { type: "number", min: 1, value: wastageQty, onChange: (e) => setWastageQty(Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0639\u0644\u062A \u0636\u0627\u06CC\u0639\u0627\u062A:" }), _jsx("select", { value: wastageType, onChange: (e) => setWastageType(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl", children: WASTAGE_REASONS.map((r) => (_jsx("option", { value: r.type, children: r.label }, r.type))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC:" }), _jsx("textarea", { rows: 3, value: wastageDetails, onChange: (e) => setWastageDetails(e.target.value), placeholder: "\u062A\u0648\u0636\u06CC\u062D \u062C\u0632\u06CC\u06CC\u0627\u062A \u0639\u0644\u062A \u0636\u0627\u06CC\u0639\u0627\u062A...", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl" })] }), _jsx("button", { type: "submit", className: "w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition-colors", children: "\u062B\u0628\u062A \u0636\u0627\u06CC\u0639\u0627\u062A \u0648 \u06A9\u0633\u0631 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631" })] })] })),
    activeTab==='wastage' && _jsx('button',{type:'button',onClick:()=>setShowWastageScanner(true),className:'bg-cyan-800 text-white rounded-xl px-4 py-2 text-xs',children:'اسکن بارکد برای انتخاب کالای ضایعاتی'}),
    activeTab==='wastage' && wastageScanNotice && _jsx('p',{role:'status',className:'text-xs p-3 rounded-xl bg-slate-800 text-slate-100',children:wastageScanNotice}),
    showWastageScanner && _jsx(WebcamScannerModal,{products,onScanBarcode:selectByScan,onClose:()=>setShowWastageScanner(false)})] }));
};
