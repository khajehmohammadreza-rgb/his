import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState, useEffect, useRef } from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, Plus, Package, Stethoscope, X, Check, Hash, Barcode } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { WebcamScannerModal } from './WebcamScannerModal.js?b=r24-514-1405';
export const SearchableItemSelector = ({ type, items, products = [], placeholder, onAddItem, onManualAdd, label, }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedItemForQty, setSelectedItemForQty] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualTitle, setManualTitle] = useState('');
    const [manualPrice, setManualPrice] = useState(100000);
    const [manualCategory, setManualCategory] = useState(type === 'service' ? 'clinic_service' : 'consumable');
    const [manualQty, setManualQty] = useState(1);
    const [showScanner, setShowScanner] = useState(false);
    const containerRef = useRef(null);
    const qtyInputRef = useRef(null);
    // Close list on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // Auto focus quantity input when item selected
    useEffect(() => {
        if (selectedItemForQty && qtyInputRef.current) {
            qtyInputRef.current.focus();
            qtyInputRef.current.select();
        }
    }, [selectedItemForQty]);
    // Live filtered items based on typed words, code, or ID
    const filteredItems = query.trim() === ''
        ? items
        : items.filter((item) => {
            const q = query.toLowerCase().trim();
            const matchesTitle = item.title.toLowerCase().includes(q);
            const matchesCode = item.code ? item.code.toLowerCase().includes(q) : false;
            const matchesId = item.id ? item.id.toLowerCase().includes(q) : false;
            const matchesCat = item.category ? item.category.toLowerCase().includes(q) : false;
            return matchesTitle || matchesCode || matchesId || matchesCat;
        });
    const handleSelectItem = (item) => {
        setSelectedItemForQty(item);
        setQuantity(1);
        setIsOpen(false);
    };
    const handleConfirmQty = (e) => {
        if (e)
            e.preventDefault();
        if (!selectedItemForQty)
            return;
        const finalQty = Math.max(1, quantity || 1);
        onAddItem(selectedItemForQty, finalQty);
        setSelectedItemForQty(null);
        setQuery('');
        setQuantity(1);
    };
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (!manualTitle.trim()) {
            alert('لطفاً عنوان خدمت یا کالا را وارد کنید.');
            return;
        }
        const customItem = {
            id: 'manual-' + Date.now(),
            title: manualTitle.trim(),
            price: Number(manualPrice) || 0,
            category: manualCategory,
            code: 'MANUAL-' + Math.floor(1000 + Math.random() * 9000),
        };
        const finalQ = Math.max(1, Number(manualQty) || 1);
        if (onManualAdd) {
            onManualAdd(customItem, finalQ);
        }
        else {
            onAddItem(customItem, finalQ);
        }
        setShowManualModal(false);
        setManualTitle('');
        setManualPrice(100000);
        setManualQty(1);
    };
    const handleScanBarcodeResult = (barcode) => {
        const cleanBarcode = barcode.trim();
        if (!cleanBarcode)
            return;
        // Search in items list first
        let found = items.find((it) => {
            const matchCode = it.code === cleanBarcode;
            const matchId = it.id === cleanBarcode;
            const matchOrig = it.originalData && (it.originalData.barcode === cleanBarcode ||
                it.originalData.code === cleanBarcode ||
                it.originalData.id === cleanBarcode);
            return matchCode || matchId || matchOrig;
        });
        // If not found in items, search products list if provided
        if (!found && products.length > 0) {
            const prodMatch = products.find((p) => p.barcode === cleanBarcode || p.code === cleanBarcode || p.id === cleanBarcode);
            if (prodMatch) {
                found = {
                    id: prodMatch.id,
                    title: prodMatch.name,
                    price: prodMatch.salesPrice || prodMatch.purchasePrice || 0,
                    code: prodMatch.code || prodMatch.barcode,
                    unit: prodMatch.unit,
                    stockQuantity: prodMatch.stockQuantity,
                    category: prodMatch.category,
                    originalData: prodMatch,
                };
            }
        }
        if (found) {
            setSelectedItemForQty(found);
            setQuantity(1);
            setIsOpen(false);
            setShowScanner(false);
        }
        else {
            alert(`کالا/خدمت با بارکد «${cleanBarcode}» در سیستم یافت نشد. می‌توانید آن را به صورت دستی ثبت نمایید.`);
            setQuery(cleanBarcode);
            setShowScanner(false);
            setShowManualModal(true);
            setManualTitle(`خدمت/کالای بارکد ${cleanBarcode}`);
        }
    };
    return (_jsxs("div", { className: "space-y-2 relative", ref: containerRef, children: [label && (_jsxs("label", { className: "block text-xs font-bold text-slate-800 flex items-center gap-1.5", children: [type === 'service' ? (_jsx(Stethoscope, { className: "w-4 h-4 text-teal-600" })) : (_jsx(Package, { className: "w-4 h-4 text-amber-600" })), _jsx("span", { children: label })] })), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" }), _jsx("input", { type: "text", value: query, onChange: (e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }, onFocus: () => setIsOpen(true), onKeyDown: (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const cleanQuery = query.trim().toLowerCase();
                                if (!cleanQuery)
                                    return;
                                // Check if query is an exact barcode/code match or single filtered result
                                const exact = items.find((it) => {
                                    const matchCode = it.code?.toLowerCase() === cleanQuery;
                                    const matchId = it.id?.toLowerCase() === cleanQuery;
                                    const matchOrig = it.originalData && ((it.originalData.barcode && it.originalData.barcode.toLowerCase() === cleanQuery) ||
                                        (it.originalData.code && it.originalData.code.toLowerCase() === cleanQuery));
                                    return matchCode || matchId || matchOrig;
                                });
                                if (exact) {
                                    handleSelectItem(exact);
                                }
                                else if (filteredItems.length === 1) {
                                    handleSelectItem(filteredItems[0]);
                                }
                            }
                        }, placeholder: placeholder ||
                            (type === 'service'
                                ? 'جستجو و انتخاب خدمت پزشکی (تایپ نام یا کد/بارکد)...'
                                : 'جستجو و انتخاب وسایل مصرفی (پد، سرم، سرنگ/بارکد...)...'), className: "w-full pr-9 pl-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs" }), query && (_jsx("button", { type: "button", onClick: () => {
                            setQuery('');
                            setIsOpen(false);
                        }, className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1", children: _jsx(X, { className: "w-3.5 h-3.5" }) }))] }), _jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsxs("button", { type: "button", onClick: () => setShowScanner(true), className: "text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition", children: [_jsx(Barcode, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F" })] }), _jsxs("button", { type: "button", onClick: () => setShowManualModal(true), className: "text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062B\u0628\u062A \u062F\u0633\u062A\u06CC (\u062E\u0627\u0631\u062C \u0627\u0632 \u0644\u06CC\u0633\u062A)" })] })] }), isOpen && (_jsx("div", { className: "absolute z-30 right-0 left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100", children: filteredItems.length === 0 ? (_jsxs("div", { className: "p-3 text-center text-xs text-slate-400 font-medium space-y-2", children: [_jsx("p", { children: "\u0647\u06CC\u0686 \u0645\u0648\u0631\u062F\u06CC \u0645\u0637\u0627\u0628\u0642 \u0628\u0627 \u062C\u0633\u062A\u062C\u0648 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }), _jsxs("button", { type: "button", onClick: () => {
                                setIsOpen(false);
                                setShowManualModal(true);
                                setManualTitle(query);
                            }, className: "px-3 py-1.5 bg-teal-600 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["\u062B\u0628\u062A \u062F\u0633\u062A\u06CC \u00AB", query || 'خدمت جدید', "\u00BB"] })] })] })) : (filteredItems.map((item) => (_jsxs("button", { type: "button", onClick: () => handleSelectItem(item), className: "w-full text-right p-2.5 hover:bg-teal-50/70 transition flex items-center justify-between group text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${type === 'service'
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'bg-amber-100 text-amber-700'}`, children: type === 'service' ? (_jsx(Stethoscope, { className: "w-3.5 h-3.5" })) : (_jsx(Package, { className: "w-3.5 h-3.5" })) }), _jsxs("div", { children: [_jsx("span", { className: "font-bold text-slate-800 group-hover:text-teal-900", children: item.title }), item.code && (_jsxs("span", { className: "text-[10px] text-slate-400 font-mono mr-2", children: ["\u06A9\u062F: ", item.code] })), type === 'consumable' && item.unit && (_jsxs("span", { className: "text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mr-2", children: ["\u0648\u0627\u062D\u062F: ", item.unit, " | \u0645\u0648\u062C\u0648\u062F\u06CC: ", item.stockQuantity ?? 'نامشخص'] }))] })] }), _jsxs("div", { className: "text-left font-mono font-bold text-slate-700 shrink-0", children: [item.price.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }, item.id)))) })), selectedItemForQty && (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Hash, { className: "w-5 h-5 text-teal-600" }), _jsx("h4", { className: "font-bold text-sm text-slate-800", children: "\u062A\u0639\u06CC\u06CC\u0646 \u062A\u0639\u062F\u0627\u062F / \u0645\u0642\u062F\u0627\u0631 \u062B\u0628\u062A \u062E\u062F\u0645\u062A" })] }), _jsx("button", { type: "button", onClick: () => setSelectedItemForQty(null), className: "text-slate-400 hover:text-slate-600 p-1", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "p-3 bg-teal-50/80 border border-teal-200 rounded-xl space-y-1 text-xs", children: [_jsxs("span", { className: "text-teal-700 font-bold block flex items-center gap-1", children: [_jsx(Check, { className: "w-3.5 h-3.5 text-teal-600" }), "\u0634\u0646\u0627\u0633\u0627\u06CC\u06CC \u0634\u062F:"] }), _jsx("span", { className: "font-bold text-slate-900 text-sm block", children: selectedItemForQty.title }), _jsxs("span", { className: "text-teal-800 font-mono font-bold block", children: ["\u0642\u06CC\u0645\u062A \u0648\u0627\u062D\u062F: ", selectedItemForQty.price.toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("form", { onSubmit: handleConfirmQty, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-700 mb-1", children: "\u062A\u0639\u062F\u0627\u062F / \u0645\u0642\u062F\u0627\u0631 \u062E\u062F\u0645\u062A \u06CC\u0627 \u06A9\u0627\u0644\u0627 (\u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u06F1):" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { ref: qtyInputRef, type: "number", min: 1, max: selectedItemForQty.stockQuantity || 999, value: quantity, onChange: (e) => setQuantity(Number(e.target.value)), onKeyDown: (e) => {
                                                        if (e.key === 'Enter') {
                                                            handleConfirmQty(e);
                                                        }
                                                    }, className: "w-full text-center text-xl font-bold text-teal-900 bg-white border border-teal-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500 shadow-inner" }), selectedItemForQty.unit && (_jsx("span", { className: "text-xs font-bold text-slate-600 shrink-0", children: selectedItemForQty.unit }))] }), _jsx("p", { className: "text-[10px] text-slate-500 mt-1.5 font-medium", children: "\uD83D\uDCA1 \u062C\u0647\u062A \u062B\u0628\u062A \u0633\u0631\u06CC\u0639 \u06F1 \u0639\u062F\u062F \u06A9\u0644\u06CC\u062F Enter \u06CC\u0627 \u062F\u06A9\u0645\u0647 \u0632\u06CC\u0631 \u0631\u0627 \u0641\u0634\u0627\u0631 \u062F\u0647\u06CC\u062F\u060C \u06CC\u0627 \u0639\u062F\u062F \u062C\u062F\u06CC\u062F \u0631\u0627 \u062A\u0627\u06CC\u067E \u0646\u0645\u0627\u06CC\u06CC\u062F." })] }), _jsxs("div", { className: "p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800", children: [_jsx("span", { children: "\u0645\u0628\u0644\u063A \u06A9\u0644:" }), _jsxs("span", { className: "font-mono text-sm text-teal-700", children: [(selectedItemForQty.price * (quantity || 1)).toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setSelectedItemForQty(null), className: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u062A\u0623\u06CC\u06CC\u062F \u0648 \u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u0644\u06CC\u0633\u062A (", quantity || 1, " \u0639\u062F\u062F)"] })] })] })] })] }) })), showManualModal && (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Plus, { className: "w-5 h-5 text-teal-600" }), _jsx("h4", { className: "font-bold text-sm text-slate-800", children: type === 'service' ? 'ثبت دستی خدمت پزشکی (خارج از لیست)' : 'ثبت دستی کالای مصرفی' })] }), _jsx("button", { type: "button", onClick: () => setShowManualModal(false), className: "text-slate-400 hover:text-slate-600 p-1", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleManualSubmit, className: "space-y-4 text-xs", children: [_jsxs("div", { children: [_jsxs("label", { className: "block font-bold text-slate-700 mb-1", children: ["\u0639\u0646\u0648\u0627\u0646 ", type === 'service' ? 'خدمت' : 'کالا', ":"] }), _jsx("input", { type: "text", required: true, value: manualTitle, onChange: (e) => setManualTitle(e.target.value), placeholder: "\u0645\u062B\u0627\u0644: \u0648\u06CC\u0632\u06CC\u062A \u0627\u0648\u0631\u0698\u0627\u0646\u0633 \u06CC\u0627 \u062A\u0632\u0631\u06CC\u0642 \u062A\u062E\u0635\u0635\u06CC...", className: "w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0645\u0628\u0644\u063A (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", step: "1000", required: true, value: manualPrice, onChange: (e) => setManualPrice(Number(e.target.value)), className: "w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0639\u062F\u0627\u062F / \u0645\u0642\u062F\u0627\u0631:" }), _jsx("input", { type: "number", min: 1, required: true, value: manualQty, onChange: (e) => setManualQty(Number(e.target.value)), className: "w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" })] })] }), _jsxs("div", { className: "p-2.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between font-bold text-teal-900", children: [_jsx("span", { children: "\u0645\u0628\u0644\u063A \u06A9\u0644:" }), _jsxs("span", { className: "font-mono text-sm", children: [(Number(manualPrice || 0) * Number(manualQty || 1)).toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setShowManualModal(false), className: "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u062B\u0628\u062A \u0648 \u0627\u0641\u0632\u0648\u062F\u0646" })] })] })] })] }) })), showScanner && (_jsx(WebcamScannerModal, { products: products, onScanBarcode: handleScanBarcodeResult, onClose: () => setShowScanner(false) }))] }));
};
