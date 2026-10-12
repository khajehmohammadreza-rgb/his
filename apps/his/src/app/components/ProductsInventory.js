import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Barcode, Camera, CheckCircle2, Edit2, FileSpreadsheet, History, Package, Plus, Search, Trash2, X, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { formatCurrency, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { generateNextSequentialCode, validateAndConfirmManualCodeChange } from '../utils/codeGenerator.js?b=r24-514-1405';
import { CurrencyInput } from './CurrencyInput.js?b=r24-514-1405';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js?b=r24-514-1405';
import { WebcamScannerModal } from './WebcamScannerModal.js?b=r24-514-1405';
import { exportProductsToExcel, readExcelFile, processProductsExcelImport, } from '../utils/excelUtils.js?b=r24-514-1405';
import { generateUniqueClinicBarcode, normalizeBarcode } from '../utils/barcode.js?b=r24-514-1405';
const UNITS = ['عدد', 'بسته', 'سی‌سی', 'جعبه', 'آمپول', 'سرنگ', 'رول', 'متر', 'ویال', 'ست'];
export const ProductsInventory = ({ products = [], categories = [], warehouses = [], movements = [], currentUser, currencyUnit, onAddProduct, onUpdateProduct, onDeleteProduct, onOpenBarcodeModal, onOpenWebcamScanner, }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCat, setSelectedCat] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    // Modal State
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productToDelete, setProductToDelete] = useState(null);
    // Form Fields
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formUnit, setFormUnit] = useState('عدد');
    const [formBarcode, setFormBarcode] = useState('');
    const [formMinStock, setFormMinStock] = useState(5);
    const [formStockQuantity, setFormStockQuantity] = useState(0);
    const [printAfterSave, setPrintAfterSave] = useState(false);
    const [formLocation, setFormLocation] = useState('');
    const [formPurchasePrice, setFormPurchasePrice] = useState(0);
    const [formSalesPrice, setFormSalesPrice] = useState(0);
    // Cardex Modal
    const [selectedCardexProduct, setSelectedCardexProduct] = useState(null);
    // Camera Barcode Scanner State
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const [scanNotification, setScanNotification] = useState(null);
    const [formBarcodeMode, setFormBarcodeMode] = useState('auto_clinic');
    const [autoGenCode, setAutoGenCode] = useState('');
    const handleScanBarcodeResult = (scannedCode) => {
        setShowCameraScanner(false);
        const cleanBarcode = normalizeBarcode(scannedCode);
        if (!cleanBarcode)
            return;
        // Search for product with matching barcode or product code
        const foundProduct = products.find((p) => normalizeBarcode(p.barcode) === cleanBarcode || normalizeBarcode(p.code) === cleanBarcode);
        if (foundProduct) {
            openEditProductModal(foundProduct);
            setScanNotification({
                type: 'success',
                message: `کالای «${foundProduct.name}» با بارکد ${toPersianDigits(cleanBarcode)} شناسایی شد. پنجره ویرایش موجودی و مشخصات کالا باز گردید.`,
            });
            // Auto dismiss notification after 6 seconds
            setTimeout(() => setScanNotification(null), 6000);
        }
        else {
            const shouldCreate = window.confirm(`کالایی با بارکد «${toPersianDigits(cleanBarcode)}» در سیستم انبار یافت نشد.\n\nآیا تمایل دارید هم‌اکنون کالای جدیدی با این بارکد اختصاصی تعریف نمایید؟`);
            if (shouldCreate) {
                openNewProductModal();
                setFormBarcode(cleanBarcode);
                setFormBarcodeMode('scan');
            }
        }
    };
    const openNewProductModal = () => {
        setEditingProduct(null);
        setFormName('');
        const nextCode = generateNextSequentialCode('PRD-', products, 'code', 1001);
        setFormCode(nextCode);
        setAutoGenCode(nextCode);
        setFormCategoryId(categories[0]?.id || '');
        setFormUnit('عدد');
        setFormBarcodeMode('auto_clinic');
        setFormBarcode(generateUniqueClinicBarcode(products));
        setFormMinStock(5);
        setFormStockQuantity(0);
        setFormLocation(warehouses[0]?.name || 'قفسه اصلی');
        setFormPurchasePrice(0);
        setFormSalesPrice(0);
        setShowProductModal(true);
    };
    const openEditProductModal = (p) => {
        setEditingProduct(p);
        setFormName(p.name);
        setFormCode(p.code);
        setAutoGenCode(p.code);
        setFormCategoryId(p.categoryId);
        setFormUnit(p.unit);
        setFormBarcode(p.barcode || '');
        setFormMinStock(p.minStock);
        setFormStockQuantity(p.stockQuantity);
        setFormLocation(p.location || '');
        setFormPurchasePrice(p.purchasePrice);
        setFormSalesPrice(p.salesPrice);
        setShowProductModal(true);
    };
    const handleSaveProduct = (e) => {
        e.preventDefault();
        if (!formName.trim()) {
            alert('لطفاً نام کالا را وارد نمایید.');
            return;
        }
        const normalizedBarcode = normalizeBarcode(formBarcode);
        if (normalizedBarcode) {
            const duplicate = products.find(p => normalizeBarcode(p?.barcode) === normalizedBarcode && (!editingProduct || p.id !== editingProduct.id));
            if (duplicate) {
                alert(`این بارکد قبلاً برای کالای «${duplicate.name}» ثبت شده است. بارکد تکراری مجاز نیست.`);
                return;
            }
        }
        // Validate manual code change if user edited auto-generated code
        if (!editingProduct && autoGenCode && !validateAndConfirmManualCodeChange(autoGenCode, formCode, 'کد کالا')) {
            return;
        }
        const category = categories.find((c) => c.id === formCategoryId);
        if (editingProduct) {
            const updated = {
                ...editingProduct,
                name: formName,
                code: formCode,
                categoryId: formCategoryId,
                categoryName: category?.name || 'سایر',
                unit: formUnit,
                barcode: normalizedBarcode,
                minStock: formMinStock,
                stockQuantity: formStockQuantity,
                location: formLocation,
                purchasePrice: formPurchasePrice,
                salesPrice: formSalesPrice,
            };
            onUpdateProduct(updated);
            if (printAfterSave) onOpenBarcodeModal?.(updated);
        }
        else {
            const newProd = {
                id: 'prod-' + Date.now(),
                name: formName,
                code: formCode,
                categoryId: formCategoryId,
                categoryName: category?.name || 'سایر',
                unit: formUnit,
                barcode: normalizedBarcode,
                minStock: formMinStock,
                stockQuantity: formStockQuantity,
                location: formLocation,
                purchasePrice: formPurchasePrice,
                salesPrice: formSalesPrice,
                active: true,
                createdAt: new Date().toISOString(),
            };
            onAddProduct(newProd);
            if (printAfterSave) onOpenBarcodeModal?.(newProd);
        }
        setPrintAfterSave(false);
        setShowProductModal(false);
    };
    const filteredProducts = products.filter((p) => {
        const matchesSearch = (p?.name || '').includes(searchTerm) ||
            (p?.code || '').includes(searchTerm) ||
            (p?.barcode && p.barcode.includes(searchTerm));
        const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;
        const matchesStock = stockFilter === 'all' ||
            (stockFilter === 'low' && p.stockQuantity <= p.minStock) ||
            (stockFilter === 'instock' && p.stockQuantity > p.minStock);
        return matchesSearch && matchesCat && matchesStock;
    });
    const excelInputRef = React.useRef(null);
    const handleExcelImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const rawRows = await readExcelFile(file);
            if (!rawRows || rawRows.length === 0) {
                alert('هیچ ردیف یا داده‌ای در فایل اکسل یافت نشد.');
                return;
            }
            const { updatedProducts, updatedCount, createdCount, autoBarcodesCount, validRowsCount, skippedRowsCount, validationLogs, } = processProductsExcelImport(rawRows, products, categories, warehouses);
            // Save changes by updating or adding items
            updatedProducts.forEach((p) => {
                const existing = products.find((ex) => ex.id === p.id);
                if (existing) {
                    onUpdateProduct(p);
                }
                else {
                    onAddProduct(p);
                }
            });
            let reportMsg = `نتیجه پردازش و اعتبارسنجی فایل اکسل کالاها:\n\n` +
                `✅ تعداد کل ردیف‌های معتبر: ${toPersianDigits(validRowsCount)} ردیف\n` +
                `• تعداد ${toPersianDigits(updatedCount)} کالا به‌روزرسانی شد.\n` +
                `• تعداد ${toPersianDigits(createdCount)} کالای جدید با کد اختصاصی ثبت گردید.\n`;
            if (autoBarcodesCount > 0) {
                reportMsg += `• تعداد ${toPersianDigits(autoBarcodesCount)} بارکد داخلی یکتا (Code 128) برای ردیف‌های فاقد بارکد خودکار تولید و تخصیص داده شد.\n`;
            }
            if (skippedRowsCount > 0) {
                reportMsg += `⚠️ تعداد ${toPersianDigits(skippedRowsCount)} ردیف خالی یا نامعتبر نادیده گرفته شد.\n`;
            }
            if (validationLogs.length > 0) {
                reportMsg += `\nگزارش تصحیح و اعتبارسنجی داده‌ها:\n` + validationLogs.slice(0, 5).join('\n');
                if (validationLogs.length > 5) {
                    reportMsg += `\n... و ${toPersianDigits(validationLogs.length - 5)} مورد تصحیح دیگر.`;
                }
            }
            alert(reportMsg);
        }
        catch (err) {
            alert('خطا در خواندن یا پردازش فایل اکسل: ' + (err?.message || err));
        }
        finally {
            if (e.target)
                e.target.value = '';
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("input", { type: "file", ref: excelInputRef, onChange: handleExcelImportFile, accept: ".xlsx,.xls,.csv", className: "hidden" }), scanNotification && (_jsxs("div", { className: "bg-emerald-500/15 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in zoom-in duration-200 shadow-md", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-emerald-400 shrink-0" }), _jsx("span", { className: "font-bold", children: scanNotification.message })] }), _jsx("button", { onClick: () => setScanNotification(null), className: "text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20", children: _jsx(X, { className: "w-4 h-4" }) })] })), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse", children: [_jsx(Package, { className: "w-5 h-5 text-emerald-400" }), _jsx("span", { children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0627\u0644\u0627\u0647\u0627 \u0648 \u0627\u0646\u0628\u0627\u0631 \u0645\u0648\u062C\u0648\u062F\u06CC" })] }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u062A\u0639\u0631\u06CC\u0641 \u06A9\u0627\u0644\u0627\u060C \u0646\u0642\u0637\u0647 \u0633\u0641\u0627\u0631\u0634\u060C \u0627\u0633\u06A9\u0646 \u0647\u0648\u0634\u0645\u0646\u062F \u0628\u0627\u0631\u06A9\u062F\u060C \u062B\u0628\u062A \u0645\u0648\u062C\u0648\u062F\u06CC\u060C \u06A9\u0627\u0631\u062A\u06A9\u0633 \u06AF\u0631\u062F\u0634 \u06A9\u0627\u0644\u0627 \u0648 \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 w-full md:w-auto", children: [_jsxs("button", { onClick: () => setShowCameraScanner(true), className: "bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 border border-teal-400/30 cursor-pointer hover:scale-105 active:scale-95", title: "\u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F \u06A9\u0627\u0644\u0627 \u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646 \u06AF\u0648\u0634\u06CC \u0648 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0645\u0648\u062C\u0648\u062F\u06CC", children: [_jsx(Camera, { className: "w-4 h-4 text-teal-200" }), _jsx("span", { children: "\u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F \u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646" })] }), _jsxs("button", { onClick: () => exportProductsToExcel(filteredProducts, categories, warehouses), className: "bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5", title: "\u062E\u0631\u0648\u062C\u06CC \u062A\u0645\u0627\u0645 \u06A9\u0627\u0644\u0627\u0647\u0627 \u0628\u0627 \u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u06A9\u0634\u0648\u06CC\u06CC \u0628\u0647 \u0627\u06A9\u0633\u0644", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-teal-400" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("button", { onClick: () => exportProductsToExcel([], categories, warehouses), className: "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5", title: "\u062F\u0627\u0646\u0644\u0648\u062F \u0627\u0644\u06AF\u0648\u06CC \u062E\u0627\u0644\u06CC \u0648\u0631\u0648\u062F\u06CC \u0627\u06A9\u0633\u0644 \u0628\u0627 \u0644\u06CC\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0634\u0648\u06CC\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-amber-400" }), _jsx("span", { children: "\u062F\u0627\u0646\u0644\u0648\u062F \u0627\u0644\u06AF\u0648\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("button", { onClick: () => excelInputRef.current?.click(), className: "bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5", title: "\u0648\u0631\u0648\u062F\u06CC/\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u06A9\u0627\u0644\u0627\u0647\u0627 \u0627\u0632 \u0627\u06A9\u0633\u0644 (\u0628\u0627 \u0628\u0627\u0631\u06A9\u062F\u06AF\u06CC\u0631 \u062E\u0648\u062F\u06A9\u0627\u0631)", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: "\u0648\u0631\u0648\u062F\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("button", { onClick: openNewProductModal, className: "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md flex items-center space-x-2 space-x-reverse mr-auto", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u062A\u0639\u0631\u06CC\u0641 \u06A9\u0627\u0644\u0627\u06CC \u062C\u062F\u06CC\u062F" })] })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-2.5" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0627\u0644\u0627 \u0628\u0627 \u0646\u0627\u0645\u060C \u06A9\u062F \u06CC\u0627 \u0628\u0627\u0631\u06A9\u062F...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs pr-9 pl-9 py-2 rounded-xl focus:outline-none focus:border-emerald-500" }), _jsx("button", { onClick: () => setShowCameraScanner(true), className: "absolute left-2 top-1.5 p-1 text-teal-400 hover:text-teal-200 hover:bg-slate-700 rounded-lg transition", title: "\u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F \u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646 \u06AF\u0648\u0634\u06CC", children: _jsx(Camera, { className: "w-4 h-4" }) })] }), _jsxs("select", { value: selectedCat, onChange: (e) => setSelectedCat(e.target.value), className: "bg-slate-800 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500", children: [_jsx("option", { value: "all", children: "\u0647\u0645\u0647 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627" }), categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] }), _jsxs("div", { className: "flex items-center space-x-1 space-x-reverse bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs", children: [_jsx("button", { onClick: () => setStockFilter('all'), className: `flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'all' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300'}`, children: "\u0647\u0645\u0647" }), _jsx("button", { onClick: () => setStockFilter('low'), className: `flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'low' ? 'bg-amber-600 text-white font-bold' : 'text-slate-300'}`, children: "\u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u0633\u0641\u0627\u0631\u0634" }), _jsx("button", { onClick: () => setStockFilter('instock'), className: `flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'instock' ? 'bg-teal-600 text-white font-bold' : 'text-slate-300'}`, children: "\u0645\u0648\u062C\u0648\u062F \u06A9\u0627\u0641\u06CC" })] })] }), _jsx("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800/80 text-slate-400 border-b border-slate-700", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u06A9\u062F \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-3", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-3", children: "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC" }), _jsx("th", { className: "p-3", children: "\u0628\u0627\u0631\u06A9\u062F" }), _jsx("th", { className: "p-3", children: "\u0645\u0648\u062C\u0648\u062F\u06CC \u0641\u0639\u0644\u06CC" }), _jsx("th", { className: "p-3", children: "\u062D\u062F\u0627\u0642\u0644 \u0645\u062C\u0627\u0632" }), _jsx("th", { className: "p-3", children: "\u0642\u06CC\u0645\u062A \u062E\u0631\u06CC\u062F" }), _jsx("th", { className: "p-3", children: "\u0642\u06CC\u0645\u062A \u0641\u0631\u0648\u0634" }), _jsx("th", { className: "p-3", children: "\u0645\u062D\u0644 \u0627\u0646\u0628\u0627\u0631" }), _jsx("th", { className: "p-3 text-center", children: "\u0639\u0645\u0644\u06CC\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: filteredProducts.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 10, className: "p-8 text-center text-slate-400", children: "\u06A9\u0627\u0644\u0627\u06CC\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }) })) : (filteredProducts.map((p) => {
                                    const isLow = p.stockQuantity <= p.minStock;
                                    return (_jsxs("tr", { className: "hover:bg-slate-800/50", children: [_jsx("td", { className: "p-3 font-mono text-slate-400", children: toPersianDigits(p.code) }), _jsx("td", { className: "p-3 font-bold text-slate-100", children: p.name }), _jsx("td", { className: "p-3 text-slate-400", children: p.categoryName }), _jsx("td", { className: "p-3 font-mono text-slate-400", children: p.barcode ? toPersianDigits(p.barcode) : '-' }), _jsx("td", { className: "p-3", children: _jsxs("span", { className: `font-bold px-2 py-0.5 rounded-full text-[11px] ${isLow
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                        : 'bg-emerald-500/20 text-emerald-300'}`, children: [toPersianDigits(p.stockQuantity), " ", p.unit] }) }), _jsxs("td", { className: "p-3 text-slate-400", children: [toPersianDigits(p.minStock), " ", p.unit] }), _jsx("td", { className: "p-3 text-slate-300", children: formatCurrency(p.purchasePrice, currencyUnit) }), _jsx("td", { className: "p-3 font-bold text-emerald-400", children: formatCurrency(p.salesPrice, currencyUnit) }), _jsx("td", { className: "p-3 text-slate-400", children: p.location || '-' }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex items-center justify-center space-x-1.5 space-x-reverse", children: [_jsx("button", { onClick: () => setSelectedCardexProduct(p), title: "\u06A9\u0627\u0631\u062A\u06A9\u0633 \u06AF\u0631\u062F\u0634 \u06A9\u0627\u0644\u0627", className: "p-1.5 text-teal-400 hover:bg-teal-500/20 rounded-lg transition-colors", children: _jsx(History, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => onOpenBarcodeModal(p), title: "\u0686\u0627\u067E \u0644\u06CC\u0628\u0644 \u0628\u0627\u0631\u06A9\u062F", className: "p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors", children: _jsx(Barcode, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => openEditProductModal(p), title: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u06A9\u0627\u0644\u0627", className: "p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors", children: _jsx(Edit2, { className: "w-4 h-4" }) }), currentUser.role === 'admin' && (_jsx("button", { onClick: () => setProductToDelete(p), title: "\u062D\u0630\u0641 \u06A9\u0627\u0644\u0627 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631 \u0628\u0627 \u062A\u0627\u06CC\u06CC\u062F\u06CC\u0647 \u062F\u0648 \u0645\u0631\u062D\u0644\u0647\u200C\u0627\u06CC", className: "p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors", children: _jsx(Trash2, { className: "w-4 h-4" }) }))] }) })] }, p.id));
                                })) })] }) }) }), showProductModal && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsx("h3", { className: "font-bold text-slate-100 text-sm", children: editingProduct ? 'ویرایش اطلاعات کالا' : 'تعریف کالای جدید' }), _jsx("button", { onClick: () => setShowProductModal(false), className: "text-slate-400 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSaveProduct, className: "space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627:" }), _jsx("input", { type: "text", required: true, value: formName, onChange: (e) => setFormName(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u0628\u0648\u062A\u0627\u06A9\u0633 \u0645\u0635\u067E\u0648\u0631\u062A \u06F5\u06F0\u06F0 \u0648\u0627\u062D\u062F\u06CC", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u06A9\u062F \u06A9\u0627\u0644\u0627:" }), _jsx("input", { type: "text", required: true, value: formCode, onChange: (e) => setFormCode(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC:" }), _jsx("select", { value: formCategoryId, onChange: (e) => setFormCategoryId(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500", children: categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0648\u0627\u062D\u062F \u0634\u0645\u0627\u0631\u0634 \u06A9\u0627\u0644\u0627:" }), _jsx("select", { value: formUnit, onChange: (e) => setFormUnit(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500", children: UNITS.map((u) => (_jsx("option", { value: u, children: u }, u))) })] }), _jsxs("div", { className: "space-y-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80", children: [_jsxs("label", { className: "block text-slate-200 font-bold text-xs flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Barcode, { className: "w-4 h-4 text-emerald-400" }), "\u0627\u0646\u062A\u062E\u0627\u0628 \u0631\u0648\u0634 \u062B\u0628\u062A \u0628\u0627\u0631\u06A9\u062F \u06A9\u0627\u0644\u0627:"] }), _jsx("span", { className: "text-[10px] text-emerald-400 font-normal", children: formBarcodeMode === 'scan' ? 'اسکن بارکد خود کالا' : formBarcodeMode === 'auto_clinic' ? 'بارکد مرکز' : 'ورود دستی' })] }), _jsxs("div", { className: "grid grid-cols-3 gap-1.5 text-[11px] font-bold", children: [_jsx("button", { type: "button", onClick: () => {
                                                        setFormBarcodeMode('scan');
                                                        setFormBarcode('');
                                                    }, className: `p-2 rounded-lg border text-center transition ${formBarcodeMode === 'scan'
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`, children: "\uD83D\uDCF7 \u0627\u0633\u06A9\u0646 \u062E\u0648\u062F \u06A9\u0627\u0644\u0627" }), _jsx("button", { type: "button", onClick: () => {
                                                        setFormBarcodeMode('auto_clinic');
                                                        setFormBarcode(generateUniqueClinicBarcode(products));
                                                    }, className: `p-2 rounded-lg border text-center transition ${formBarcodeMode === 'auto_clinic'
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`, children: "\uD83C\uDFE2 \u0628\u0627\u0631\u06A9\u062F \u0645\u0631\u06A9\u0632 (\u067E\u06CC\u0634\u200C\u0641\u0631\u0636)" }), _jsx("button", { type: "button", onClick: () => setFormBarcodeMode('manual'), className: `p-2 rounded-lg border text-center transition ${formBarcodeMode === 'manual'
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}`, children: "\u270D\uFE0F \u0648\u0631\u0648\u062F \u062F\u0633\u062A\u06CC" })] }), _jsxs("div", { className: "flex items-center gap-2 pt-1", children: [_jsx("input", { type: "text", value: formBarcode, onChange: (e) => setFormBarcode(e.target.value), placeholder: formBarcodeMode === 'scan'
                                                        ? 'دستگاه بارکدخوان را روی جعبه کالا بزنید...'
                                                        : formBarcodeMode === 'auto_clinic'
                                                            ? 'بارکد ۱۳ رقمی مرکز'
                                                            : 'کد یا بارکد دستی...', autoFocus: formBarcodeMode === 'scan', className: "flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl font-mono text-xs focus:outline-none focus:border-emerald-500" }), _jsx("button", { type: "button", onClick: () => setFormBarcode('626' + Math.floor(1000000000 + Math.random() * 9000000000).toString()), title: "\u062A\u0648\u0644\u06CC\u062F \u0628\u0627\u0631\u06A9\u062F \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u0645\u0631\u06A9\u0632", className: "bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl font-bold text-xs shrink-0", children: "\u26A1 \u062A\u0648\u0644\u06CC\u062F \u0645\u0631\u06A9\u0632" }), _jsxs("button", { type: "button", onClick: () => setShowCameraScanner(true), title: "\u0627\u0633\u06A9\u0646 \u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646", className: "bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1", children: [_jsx(Barcode, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0627\u0633\u06A9\u0646" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0645\u0648\u062C\u0648\u062F\u06CC \u0641\u0639\u0644\u06CC:" }), _jsx("input", { type: "number", required: true, value: formStockQuantity, onChange: (e) => setFormStockQuantity(Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u062D\u062F\u0627\u0642\u0644 \u0645\u0648\u062C\u0648\u062F\u06CC (\u0646\u0642\u0637\u0647 \u0633\u0641\u0627\u0631\u0634):" }), _jsx("input", { type: "number", required: true, value: formMinStock, onChange: (e) => setFormMinStock(Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-emerald-500" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0642\u06CC\u0645\u062A \u062E\u0631\u06CC\u062F (\u062A\u0648\u0645\u0627\u0646/\u0631\u06CC\u0627\u0644):" }), _jsx(CurrencyInput, { value: formPurchasePrice, onChange: (val) => setFormPurchasePrice(val), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0642\u06CC\u0645\u062A \u0641\u0631\u0648\u0634:" }), _jsx(CurrencyInput, { value: formSalesPrice, onChange: (val) => setFormSalesPrice(val), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl font-mono focus:outline-none focus:border-emerald-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0645\u062D\u0644 \u0646\u06AF\u0647\u062F\u0627\u0631\u06CC \u062F\u0631 \u0627\u0646\u0628\u0627\u0631:" }), _jsx("select", { value: formLocation, onChange: (e) => setFormLocation(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500", children: warehouses.map((w) => (_jsxs("option", { value: w.name, children: [w.name, " (", w.code, ")"] }, w.id))) })] }), _jsxs("div", { className: "pt-3 flex flex-wrap justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowProductModal(false), className: "bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", onClick: () => setPrintAfterSave(false), className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl", children: "\u0630\u062E\u06CC\u0631\u0647 \u06A9\u0627\u0644\u0627" }), _jsx("button", { type: "submit", onClick: () => setPrintAfterSave(true), className: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl", children: "\u0630\u062E\u06CC\u0631\u0647 \u0648 \u0686\u0627\u067E \u0628\u0631\u0686\u0633\u0628" })] })] })] }) })), selectedCardexProduct && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("div", { children: [_jsxs("h3", { className: "font-bold text-slate-100 text-sm", children: ["\u06A9\u0627\u0631\u062A\u06A9\u0633 \u06AF\u0631\u062F\u0634 \u06A9\u0627\u0644\u0627: ", selectedCardexProduct.name] }), _jsxs("span", { className: "text-xs text-slate-400", children: ["\u0645\u0648\u062C\u0648\u062F\u06CC \u0641\u0639\u0644\u06CC: ", toPersianDigits(selectedCardexProduct.stockQuantity), " ", selectedCardexProduct.unit] })] }), _jsx("button", { onClick: () => setSelectedCardexProduct(null), className: "text-slate-400 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800/80 text-slate-400 border-b border-slate-700", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u062A\u0627\u0631\u06CC\u062E" }), _jsx("th", { className: "p-2.5", children: "\u0646\u0648\u0639 \u0631\u0648\u06CC\u062F\u0627\u062F" }), _jsx("th", { className: "p-2.5", children: "\u062A\u063A\u06CC\u06CC\u0631 \u0645\u0648\u062C\u0648\u062F\u06CC" }), _jsx("th", { className: "p-2.5", children: "\u0645\u0627\u0646\u062F\u0647 \u0642\u0628\u0644" }), _jsx("th", { className: "p-2.5", children: "\u0645\u0627\u0646\u062F\u0647 \u062C\u062F\u06CC\u062F" }), _jsx("th", { className: "p-2.5", children: "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: movements
                                            .filter((m) => m.productId === selectedCardexProduct.id)
                                            .map((mov) => (_jsxs("tr", { children: [_jsx("td", { className: "p-2.5 text-slate-400", children: mov.jalaliDate }), _jsxs("td", { className: "p-2.5", children: [mov.type === 'purchase' && 'خرید / ورود', mov.type === 'sale' && 'فروش به بیمار', mov.type === 'wastage' && 'ضایعات', mov.type === 'internal_consumption' && 'مصرف داخلی', mov.type === 'return' && 'مرجوعی', mov.type === 'adjustment' && 'اصلاح انبارگردانی'] }), _jsx("td", { className: "p-2.5 font-bold", children: mov.quantity > 0 ? (_jsxs("span", { className: "text-emerald-400", children: ["+", toPersianDigits(mov.quantity)] })) : (_jsx("span", { className: "text-rose-400", children: toPersianDigits(mov.quantity) })) }), _jsx("td", { className: "p-2.5 text-slate-400", children: toPersianDigits(mov.previousStock) }), _jsx("td", { className: "p-2.5 font-bold text-slate-100", children: toPersianDigits(mov.newStock) }), _jsx("td", { className: "p-2.5 text-slate-400", children: mov.userName })] }, mov.id))) })] }) })] }) })), _jsx(ConfirmDeleteModal, { isOpen: !!productToDelete, onClose: () => setProductToDelete(null), onConfirm: () => {
                    if (productToDelete) {
                        onDeleteProduct(productToDelete.id);
                        setProductToDelete(null);
                    }
                }, title: "\u062D\u0630\u0641 \u06A9\u0627\u0644\u0627 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631", itemName: productToDelete?.name || '', itemType: "\u06A9\u0627\u0644\u0627 \u0648 \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631", warningDetails: "\u0628\u0627 \u062D\u0630\u0641 \u0627\u06CC\u0646 \u06A9\u0627\u0644\u0627\u060C \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0645\u0648\u062C\u0648\u062F\u06CC\u060C \u06A9\u0627\u0631\u062A\u06A9\u0633 \u06AF\u0631\u062F\u0634 \u0648 \u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0642\u06CC\u0645\u062A\u200C\u06AF\u0630\u0627\u0631\u06CC \u0622\u0646 \u0628\u0647 \u06A9\u0644\u06CC \u067E\u0627\u06A9 \u062E\u0648\u0627\u0647\u062F \u0634\u062F." }), showCameraScanner && (_jsx(WebcamScannerModal, { products: products, onScanBarcode: handleScanBarcodeResult, onClose: () => setShowCameraScanner(false) }))] }));
};
