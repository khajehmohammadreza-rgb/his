import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { WebcamScannerModal } from './WebcamScannerModal.js?b=r24-514-1405';
import {normalizeScannedCode} from '../utils/barcodeDecoder.js?b=r24-514-1405';
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Plus, Syringe, Trash2 } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateTimeString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
export const InternalConsumptionComponent = ({ products = [], currentUser, onAddInternalConsumption, }) => {
    const [serviceName, setServiceName] = useState('تزریق بوتاکس زیبایی اتاق ۱');
    const [patientName, setPatientName] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
    const [qtyInput, setQtyInput] = useState(1);
    const [items, setItems] = useState([]);
    const [showConsumptionScanner,setShowConsumptionScanner]=useState(false);
    const [scanNote,setScanNote]=useState('');
    const handleConsumptionScan=(raw)=>{
       const code=normalizeScannedCode(raw);
       const p=products.find(x=>normalizeScannedCode(x.barcode)===code||normalizeScannedCode(x.code)===code);
       if(!p){setScanNote(`کد ${code} در انبار ثبت نشده است. مصرفی اضافه نشد.`);return false;}
       setItems(prev=>{
         const idx=prev.findIndex(item=>item.productId===p.id);
         if(idx>=0)return prev.map((it,i)=>i===idx?{...it,qty:Number(it.qty)+1}:it);
         return [...prev,{productId:p.id,productName:p.name,qty:1,unit:p.unit}];
       });
       setSelectedProductId(p.id);setScanNote(`«${p.name}» به لیست مصرف در انتظار تایید افزوده شد.`);
       return true;
    };
    const handleAddItem = () => {
        const prod = products.find((p) => p.id === selectedProductId);
        if (!prod)
            return;
        const newItem = {
            productId: prod.id,
            productName: prod.name,
            qty: qtyInput,
            unit: prod.unit,
        };
        setItems([...items, newItem]);
    };
    const removeItem = (idx) => {
        setItems(items.filter((_, i) => i !== idx));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (items.length === 0) {
            alert('لطفاً حداقل یک کالا را اضافه نمایید.');
            return;
        }
        const now = new Date();
        const newRecord = {
            id: 'int-' + Date.now(),
            serviceName,
            patientName: patientName || undefined,
            date: now.toISOString(),
            jalaliDate: getJalaliDateTimeString(now),
            items: [...items],
            staffName: currentUser.name,
            notes,
        };
        onAddInternalConsumption(newRecord);
        setItems([]);
        setNotes('');
        alert('مصرف داخلی با موفقیت ثبت گردید و از موجودی انبار کسر گردید.');
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm", children: [_jsxs("h2", { className: "text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse", children: [_jsx(Syringe, { className: "w-5 h-5 text-emerald-400" }), _jsx("span", { children: "\u062B\u0628\u062A \u0645\u0635\u0631\u0641 \u062F\u0627\u062E\u0644\u06CC \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647 (\u0627\u062A\u0627\u0642 \u0639\u0645\u0644 / \u0627\u062A\u0627\u0642 \u062E\u062F\u0645\u0627\u062A)" })] }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u06A9\u0633\u0631 \u0627\u0642\u0644\u0627\u0645 \u0645\u0635\u0631\u0641\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647\u200C\u0634\u062F\u0647 \u062F\u0631 \u062E\u062F\u0645\u0627\u062A \u062F\u0631\u0645\u0627\u0646\u06CC/\u0632\u06CC\u0628\u0627\u06CC\u06CC \u0628\u062F\u0648\u0646 \u0641\u0631\u0648\u0634 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0641\u0627\u06A9\u062A\u0648\u0631" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-200", children: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062E\u062F\u0645\u062A \u0648 \u067E\u0631\u0633\u062A\u0627\u0631/\u067E\u0632\u0634\u06A9" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0646\u0648\u0639 \u062E\u062F\u0645\u062A / \u0628\u062E\u0634:" }), _jsx("input", { type: "text", value: serviceName, onChange: (e) => setServiceName(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u062E\u062F\u0645\u0627\u062A \u06A9\u0627\u0634\u062A \u0627\u0628\u0631\u0648 \u06CC\u0627 \u0627\u062A\u0627\u0642 \u0639\u0645\u0644 \u06F3", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631/\u067E\u0631\u0648\u0646\u062F\u0647 (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC):" }), _jsx("input", { type: "text", value: patientName, onChange: (e) => setPatientName(e.target.value), placeholder: "\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl" })] })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-200", children: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0627\u0642\u0644\u0627\u0645 \u0645\u0635\u0631\u0641\u200C\u0634\u062F\u0647" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2", children: [_jsxs("div", { className: "sm:col-span-2", children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u06A9\u0627\u0644\u0627:" }), _jsx("select", { value: selectedProductId, onChange: (e) => setSelectedProductId(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl", children: products.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " (\u0645\u0648\u062C\u0648\u062F\u06CC: ", toPersianDigits(p.stockQuantity), " ", p.unit, ")"] }, p.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u062A\u0639\u062F\u0627\u062F/\u0645\u0642\u062F\u0627\u0631 \u0645\u0635\u0631\u0641:" }), _jsx("input", { type: "number", min: 1, value: qtyInput, onChange: (e) => setQtyInput(Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl font-mono" })] })] }), _jsx("button",{type:"button",onClick:()=>setShowConsumptionScanner(true),className:"bg-teal-700 text-white font-bold py-2 px-4 rounded-xl mb-2",children:"اسکن بارکد کالای مصرفی"}), _jsxs("button", { onClick: handleAddItem, className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 space-x-reverse", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u0644\u06CC\u0633\u062A \u0645\u0635\u0631\u0641" })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm", children: [_jsx("h3", { className: "font-bold text-slate-200 text-xs mb-3", children: "\u0627\u0642\u0644\u0627\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647 \u062C\u0647\u062A \u06A9\u0633\u0631 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631" }), _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400 border-b border-slate-700", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-2.5", children: "\u062A\u0639\u062F\u0627\u062F \u0645\u0635\u0631\u0641" }), _jsx("th", { className: "p-2.5 text-center", children: "\u062D\u0630\u0641" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: items.map((it, idx) => (_jsxs("tr", { children: [_jsx("td", { className: "p-2.5 font-bold text-slate-100", children: it.productName }), _jsxs("td", { className: "p-2.5 font-mono", children: [toPersianDigits(it.qty), " ", it.unit] }), _jsx("td", { className: "p-2.5 text-center", children: _jsx("button", { onClick: () => removeItem(idx), className: "text-rose-400 hover:text-rose-300", children: _jsx(Trash2, { className: "w-4 h-4 mx-auto" }) }) })] }, idx))) })] })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-4", children: [_jsxs("div", { className: "space-y-3 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-100 border-b border-slate-800 pb-2", children: "\u062B\u0628\u062A \u0646\u0647\u0627\u06CC\u06CC \u0645\u0635\u0631\u0641 \u062F\u0627\u062E\u0644\u06CC" }), _jsx("p", { className: "text-slate-400 leading-relaxed", children: "\u0628\u0627 \u062B\u0628\u062A \u0627\u06CC\u0646 \u0641\u0631\u0645\u060C \u0627\u0642\u0644\u0627\u0645 \u062F\u0631\u062C \u0634\u062F\u0647 \u0641\u0648\u0631\u0627\u064B \u0627\u0632 \u06A9\u0627\u0631\u062A\u06A9\u0633 \u0627\u0646\u0628\u0627\u0631 \u06A9\u0633\u0631 \u0634\u062F\u0647 \u0648 \u062F\u0644\u06CC\u0644 \u0622\u0646 \u00AB\u0645\u0635\u0631\u0641 \u062F\u0627\u062E\u0644\u06CC \u062E\u062F\u0645\u062A\u00BB \u062F\u0631\u062C \u0645\u06CC\u200C\u06AF\u0631\u062F\u062F." }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u06CC\u0627\u062F\u062F\u0627\u0634\u062A \u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647:" }), _jsx("textarea", { rows: 3, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0627\u062E\u062A\u06CC\u0627\u0631\u06CC...", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl" })] })] }), _jsxs("button", { onClick: handleSubmit, disabled: items.length === 0, className: "w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 space-x-reverse", children: [_jsx(Syringe, { className: "w-5 h-5" }), _jsx("span", { children: "\u062B\u0628\u062A \u06A9\u0633\u0631 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631" })] })] })] }) , scanNote && _jsx("div",{role:"status",className:"text-xs bg-teal-950 text-emerald-200 p-3 rounded-xl",children:scanNote}),
    showConsumptionScanner && _jsx(WebcamScannerModal,{products,onScanBarcode:handleConsumptionScan,onClose:()=>setShowConsumptionScanner(false),continuous:true})] }));
};
