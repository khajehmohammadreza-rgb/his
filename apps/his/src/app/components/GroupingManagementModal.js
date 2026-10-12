import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { X, Plus, Edit2, Trash2, Layers, Warehouse as WarehouseIcon, FileText, Stethoscope } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
export const GroupingManagementModal = ({ isOpen, onClose, categories, warehouses, serviceCategories, reportCategories, onUpdateCategories, onUpdateWarehouses, onUpdateServiceCategories, onUpdateReportCategories, }) => {
    const [activeTab, setActiveTab] = useState('product_cats');
    // Form states for adding/editing
    const [editingId, setEditingId] = useState(null);
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formDesc, setFormDesc] = useState('');
    if (!isOpen)
        return null;
    const handleStartAdd = () => {
        setEditingId(null);
        setFormName('');
        setFormCode('GRP-' + Math.floor(100 + Math.random() * 900));
        setFormDesc('');
    };
    const handleStartEdit = (item) => {
        setEditingId(item.id);
        setFormName(item.name);
        setFormCode(item.code);
        setFormDesc(item.description || '');
    };
    const handleSaveItem = (e) => {
        e.preventDefault();
        if (!formName.trim()) {
            alert('لطفاً عنوان را وارد کنید.');
            return;
        }
        if (activeTab === 'product_cats') {
            if (editingId) {
                onUpdateCategories(categories.map((c) => (c.id === editingId ? { ...c, name: formName, code: formCode, description: formDesc } : c)));
            }
            else {
                const newItem = {
                    id: 'cat-' + Date.now(),
                    name: formName,
                    code: formCode,
                    description: formDesc,
                };
                onUpdateCategories([...categories, newItem]);
            }
        }
        else if (activeTab === 'warehouses') {
            if (editingId) {
                onUpdateWarehouses(warehouses.map((w) => (w.id === editingId ? { ...w, name: formName, code: formCode } : w)));
            }
            else {
                const newWh = {
                    id: 'wh-' + Date.now(),
                    name: formName,
                    code: formCode,
                };
                onUpdateWarehouses([...warehouses, newWh]);
            }
        }
        else if (activeTab === 'service_cats') {
            if (editingId) {
                onUpdateServiceCategories(serviceCategories.map((sc) => (sc.id === editingId ? { ...sc, name: formName, code: formCode, description: formDesc } : sc)));
            }
            else {
                const newSc = {
                    id: 'scat-' + Date.now(),
                    name: formName,
                    code: formCode,
                    description: formDesc,
                };
                onUpdateServiceCategories([...serviceCategories, newSc]);
            }
        }
        else if (activeTab === 'report_cats') {
            if (editingId) {
                onUpdateReportCategories(reportCategories.map((rc) => (rc.id === editingId ? { ...rc, name: formName, code: formCode, description: formDesc } : rc)));
            }
            else {
                const newRc = {
                    id: 'rcat-' + Date.now(),
                    name: formName,
                    code: formCode,
                    description: formDesc,
                };
                onUpdateReportCategories([...reportCategories, newRc]);
            }
        }
        handleStartAdd();
    };
    const handleDeleteItem = (id) => {
        if (!confirm('آیا از حذف این مورد اطمینان دارید؟'))
            return;
        if (activeTab === 'product_cats') {
            onUpdateCategories(categories.filter((c) => c.id !== id));
        }
        else if (activeTab === 'warehouses') {
            onUpdateWarehouses(warehouses.filter((w) => w.id !== id));
        }
        else if (activeTab === 'service_cats') {
            onUpdateServiceCategories(serviceCategories.filter((sc) => sc.id !== id));
        }
        else if (activeTab === 'report_cats') {
            onUpdateReportCategories(reportCategories.filter((rc) => rc.id !== id));
        }
    };
    const getCurrentList = () => {
        switch (activeTab) {
            case 'product_cats':
                return categories.map((c) => ({ id: c.id, name: c.name, code: c.code, description: c.description }));
            case 'warehouses':
                return warehouses.map((w) => ({ id: w.id, name: w.name, code: w.code, description: '' }));
            case 'service_cats':
                return serviceCategories;
            case 'report_cats':
                return reportCategories;
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50", children: [_jsxs("div", { className: "flex items-center space-x-3 space-x-reverse", children: [_jsx("div", { className: "p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl", children: _jsx(Layers, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold text-slate-100", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u062C\u0627\u0645\u0639 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u060C \u0627\u0646\u0628\u0627\u0631\u0647\u0627 \u0648 \u06AF\u0631\u0648\u0647\u200C\u0647\u0627" }), _jsx("p", { className: "text-xs text-slate-400", children: "\u0627\u0641\u0632\u0648\u062F\u0646\u060C \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0648 \u062D\u0630\u0641 \u062A\u0645\u0627\u0645\u06CC \u06AF\u0631\u0648\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u06CC \u06A9\u0627\u0644\u0627\u060C \u0627\u0646\u0628\u0627\u0631\u060C \u062E\u062F\u0645\u0627\u062A \u0648 \u06AF\u0632\u0627\u0631\u0634\u0627\u062A" })] })] }), _jsx("button", { onClick: onClose, className: "p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 overflow-x-auto", children: [_jsxs("button", { onClick: () => { setActiveTab('product_cats'); handleStartAdd(); }, className: `px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 space-x-reverse whitespace-nowrap ${activeTab === 'product_cats'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'}`, children: [_jsx(Layers, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u06A9\u0627\u0644\u0627\u0647\u0627 \u0648 \u062F\u0627\u0631\u0648\u200C\u0647\u0627 (", categories.length, ")"] })] }), _jsxs("button", { onClick: () => { setActiveTab('warehouses'); handleStartAdd(); }, className: `px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 space-x-reverse whitespace-nowrap ${activeTab === 'warehouses'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'}`, children: [_jsx(WarehouseIcon, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u0645\u062D\u0644\u200C\u0647\u0627\u06CC \u0646\u06AF\u0647\u062F\u0627\u0631\u06CC \u0648 \u0627\u0646\u0628\u0627\u0631\u0647\u0627 (", warehouses.length, ")"] })] }), _jsxs("button", { onClick: () => { setActiveTab('service_cats'); handleStartAdd(); }, className: `px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 space-x-reverse whitespace-nowrap ${activeTab === 'service_cats'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'}`, children: [_jsx(Stethoscope, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u06AF\u0631\u0648\u0647\u200C\u0628\u0646\u062F\u06CC \u062E\u062F\u0645\u0627\u062A \u0648 \u0648\u06CC\u0632\u06CC\u062A\u200C\u0647\u0627 (", serviceCategories.length, ")"] })] }), _jsxs("button", { onClick: () => { setActiveTab('report_cats'); handleStartAdd(); }, className: `px-4 py-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 space-x-reverse whitespace-nowrap ${activeTab === 'report_cats'
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'}`, children: [_jsx(FileText, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u06AF\u0631\u0648\u0647\u200C\u0628\u0646\u062F\u06CC \u06AF\u0632\u0627\u0631\u0634\u0627\u062A (", reportCategories.length, ")"] })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-1 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 h-fit space-y-4", children: [_jsxs("h3", { className: "text-sm font-bold text-slate-200 flex items-center space-x-2 space-x-reverse", children: [_jsx(Plus, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: editingId ? 'ویرایش مورد انتخاب‌شده' : 'افزودن مورد جدید' })] }), _jsxs("form", { onSubmit: handleSaveItem, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-300 mb-1.5", children: "\u0639\u0646\u0648\u0627\u0646 / \u0646\u0627\u0645 \u06AF\u0631\u0648\u0647" }), _jsx("input", { type: "text", required: true, value: formName, onChange: (e) => setFormName(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u062A\u062C\u0647\u06CC\u0632\u0627\u062A \u0627\u062A\u0627\u0642 \u0639\u0645\u0644...", className: "w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-300 mb-1.5", children: "\u06A9\u062F \u0627\u062E\u062A\u0635\u0627\u0635\u06CC" }), _jsx("input", { type: "text", required: true, value: formCode, onChange: (e) => setFormCode(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: OR-SURG", className: "w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-mono" })] }), activeTab !== 'warehouses' && (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-300 mb-1.5", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)" }), _jsx("textarea", { rows: 2, value: formDesc, onChange: (e) => setFormDesc(e.target.value), placeholder: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC...", className: "w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 resize-none" })] })), _jsxs("div", { className: "flex items-center space-x-2 space-x-reverse pt-2", children: [_jsx("button", { type: "submit", className: "flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md", children: editingId ? 'ذخیره تغییرات' : 'افزودن به لیست' }), editingId && (_jsx("button", { type: "button", onClick: handleStartAdd, className: "px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }))] })] })] }), _jsxs("div", { className: "lg:col-span-2 space-y-3", children: [_jsx("div", { className: "text-xs font-semibold text-slate-400 mb-2", children: "\u0644\u06CC\u0633\u062A \u0645\u0648\u0627\u0631\u062F \u0645\u0648\u062C\u0648\u062F (\u0642\u0627\u0628\u0644 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0648 \u062D\u0630\u0641):" }), _jsxs("div", { className: "space-y-2", children: [getCurrentList().map((item) => (_jsxs("div", { className: "bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex items-center justify-between gap-4 transition", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsx("span", { className: "text-xs font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700", children: item.code }), _jsx("span", { className: "text-sm font-bold text-slate-100", children: item.name })] }), item.description && _jsx("p", { className: "text-xs text-slate-400", children: item.description })] }), _jsxs("div", { className: "flex items-center space-x-1 space-x-reverse", children: [_jsx("button", { onClick: () => handleStartEdit(item), className: "p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition", title: "\u0648\u06CC\u0631\u0627\u06CC\u0634", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDeleteItem(item.id), className: "p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition", title: "\u062D\u0630\u0641", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, item.id))), getCurrentList().length === 0 && (_jsx("div", { className: "text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl", children: "\u0647\u06CC\u0686 \u0645\u0648\u0631\u062F\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A. \u0627\u0632 \u0641\u0631\u0645 \u0633\u0645\u062A \u0631\u0627\u0633\u062A \u0628\u0631\u0627\u06CC \u0627\u0641\u0632\u0648\u062F\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F." }))] })] })] }), _jsx("div", { className: "px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end", children: _jsx("button", { onClick: onClose, className: "bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-5 py-2 rounded-xl transition", children: "\u0628\u0633\u062A\u0646 \u067E\u0646\u062C\u0631\u0647" }) })] }) }));
};
