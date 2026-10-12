import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { PackageCheck, Plus, Trash2, Printer, History, FileText, Search, Camera, Image as ImageIcon, FileSpreadsheet, Upload, Download, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Barcode, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import {normalizeScannedCode} from '../utils/barcodeDecoder.js?b=r24-514-1405';
import {generateUniqueClinicBarcode} from '../utils/barcode.js?b=r24-514-1405';
import {BarcodePrintModal} from './BarcodePrintModal.js?b=r24-514-1405';
import { WebcamScannerModal } from './WebcamScannerModal.js?b=r24-514-1405';
import { formatCurrency, getJalaliDateTimeString, getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { PurchaseInvoicePrintModal } from './PurchaseInvoicePrintModal.js?b=r24-514-1405';
import { NumberInput } from './NumberInput.js?b=r24-514-1405';
import { exportToExcel, downloadSampleExcelTemplate, readExcelFile } from '../utils/excelUtils.js?b=r24-514-1405';
export const PurchaseEntry = ({ products = [], currentUser, currencyUnit, purchaseInvoices = [], settings, onAddPurchaseInvoice, onAddProduct, }) => {
    const activeFiscalYear = Number(settings?.activeFiscalYear || 1405);
    const [activeTab, setActiveTab] = useState('new_invoice');
    const [supplierName, setSupplierName] = useState('شرکت تجهیزات پزشکی آریا طب');
    const [supplierInvoiceNum, setSupplierInvoiceNum] = useState('');
    const [extraCosts, setExtraCosts] = useState(0);
    const [notes, setNotes] = useState('');
    const [invoiceImageUrl, setInvoiceImageUrl] = useState('');
    // Selected item inputs
    const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [quickCreateOpen,setQuickCreateOpen] = useState(false);
    const [quickBarcode,setQuickBarcode] = useState('');
    const [quickName,setQuickName] = useState('');
    const [quickUnit,setQuickUnit] = useState('عدد');
    const [quickCost,setQuickCost] = useState(0);
    const [quickSale,setQuickSale] = useState(0);
    const [printQuickProduct,setPrintQuickProduct] = useState(null);
    const [scanNotice,setScanNotice] = useState('');
    const startQuickCreate=(barcode='')=>{setQuickBarcode(normalizeScannedCode(barcode));setQuickName('');setQuickCost(0);setQuickSale(0);setQuickUnit('عدد');setQuickCreateOpen(true);};
    const saveQuickProduct=(e)=>{
       e.preventDefault();
       const barcode=normalizeScannedCode(quickBarcode)||generateUniqueClinicBarcode(products);
       if(!quickName.trim()) {alert('نام کالا الزامی است.');return;}
       if(products.some(p=>normalizeScannedCode(p.barcode)===barcode||normalizeScannedCode(p.code)===barcode)) {alert('این بارکد قبلاً ثبت شده است.');return;}
       const id=`prod-r24-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
       const created={id,name:quickName.trim(),code:`PRD-${Date.now()}`,barcode,unit:quickUnit.trim()||'عدد',categoryId:'',categoryName:'سایر',minStock:0,stockQuantity:0,location:'',purchasePrice:Math.max(0,Number(quickCost)||0),salesPrice:Math.max(0,Number(quickSale)||0),active:true,createdAt:new Date().toISOString()};
       if(typeof onAddProduct!=='function') {alert('برای ثبت کالای جدید دسترسی این صفحه برقرار نیست.');return;}
       onAddProduct(created);
       setSelectedProductId(id);setUnitPurchasePrice(created.purchasePrice);setBarcodeInput(barcode);
       setItems(prev=>[...prev,{productId:id,productName:created.name,barcode,qty:1,purchaseUnitPrice:created.purchasePrice,totalPrice:created.purchasePrice}]);
       setQuickCreateOpen(false);setPrintQuickProduct(created);
       setScanNotice(`کالای «${created.name}» با موجودی اولیه صفر تعریف شد و به فاکتور خرید اضافه گردید. در صورت نیاز برچسب آن را چاپ کنید.`);
    };
    const [qtyInput, setQtyInput] = useState(10);
    const [unitPurchasePrice, setUnitPurchasePrice] = useState(100000);
    // Items List
    const [items, setItems] = useState([]);
    // Print Modal State
    const [selectedPrintInvoice, setSelectedPrintInvoice] = useState(null);
    // Photo Attachment Preview Modal State
    const [viewAttachmentUrl, setViewAttachmentUrl] = useState(null);
    // History Search & Sort State
    const [historySearch, setHistorySearch] = useState('');
    const [sortField, setSortField] = useState('jalaliDate');
    const [sortDirection, setSortDirection] = useState('desc');
    // Excel Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    // Invoice Image Upload Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.size > 10 * 1024 * 1024) {
            alert('حجم تصویر انتخاب‌شده نباید بیشتر از ۱۰ مگابایت باشد.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result;
            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: file.name, fileData: base64 }),
                });
                const data = await res.json();
                if (data.success && data.url) {
                    setInvoiceImageUrl(data.url);
                }
                else {
                    setInvoiceImageUrl(base64);
                }
            }
            catch (err) {
                setInvoiceImageUrl(base64);
            }
        };
        reader.readAsDataURL(file);
    };
    const handleBarcodeLookup = (rawValue) => {
        const clean = normalizeScannedCode(rawValue);
        if (!clean) return false;
        const prod = products.find(p => normalizeScannedCode(p?.barcode) === clean || normalizeScannedCode(p?.code) === clean);
        if (!prod) {
            setShowBarcodeScanner(false);
            startQuickCreate(clean);
            return false;
        }
        setSelectedProductId(prod.id);
        setUnitPurchasePrice(Number(prod.purchasePrice || 0));
        setBarcodeInput(clean);
        return true;
    };
    const handleBarcodeKeyDown = (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (handleBarcodeLookup(barcodeInput)) {
            setTimeout(() => document.getElementById('purchase-add-item-btn')?.focus(), 0);
        }
    };
    const handleCameraBarcode = (code) => {
        if(!handleBarcodeLookup(code))return false;
        const product=products.find(p=>normalizeScannedCode(p?.barcode)===normalizeScannedCode(code)||normalizeScannedCode(p?.code)===normalizeScannedCode(code));
        // Camera adds a pending purchase invoice line (quantity=1). Purchase is NOT committed until explicit save.
        if(product)setItems(prev=>{
           const idx=prev.findIndex(it=>it.productId===product.id);
           if(idx>=0)return prev.map((it,i)=>i===idx?{...it,qty:Number(it.qty)+1,totalPrice:(Number(it.qty)+1)*Number(it.purchaseUnitPrice)}:it);
           const price=Number(product.purchasePrice)||0;
           return [...prev,{productId:product.id,productName:product.name,barcode:product.barcode,qty:1,purchaseUnitPrice:price,totalPrice:price}];
        });
        return true;
    };
    const handleAddItem = () => {
        const prod = products.find((p) => p.id === selectedProductId);
        if (!prod) { alert('ابتدا کالا را با بارکد یا از فهرست انتخاب کنید.'); return; }
        const newItem = {
            productId: prod.id,
            productName: prod.name,
            barcode: prod.barcode,
            qty: qtyInput,
            purchaseUnitPrice: unitPurchasePrice,
            totalPrice: qtyInput * unitPurchasePrice,
        };
        setItems([...items, newItem]);
    };
    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const netAmount = totalAmount + extraCosts;
    const handleSubmitPurchase = (e) => {
        e.preventDefault();
        if (items.length === 0) {
            alert('لطفاً حداقل یک کالا را به فاکتور خرید اضافه نمایید.');
            return;
        }
        const now = new Date();
        const newInvoice = {
            fiscalYear: activeFiscalYear,
            id: 'pur-' + Date.now(),
            invoiceNumber: supplierInvoiceNum || 'PUR-' + Math.floor(1000 + Math.random() * 9000),
            supplierName,
            date: now.toISOString(),
            jalaliDate: getJalaliDateTimeString(now),
            items: [...items],
            totalAmount,
            extraCosts,
            netAmount,
            createdByUserId: currentUser.id,
            createdByUserName: currentUser.name,
            notes,
            invoiceImageUrl: invoiceImageUrl || undefined,
        };
        onAddPurchaseInvoice(newInvoice);
        // Prompt operator to print invoice for inventory keeper
        setSelectedPrintInvoice(newInvoice);
        // Reset Form
        setItems([]);
        setSupplierInvoiceNum('');
        setNotes('');
        setInvoiceImageUrl('');
    };
    // Export Purchase Invoices to Excel
    const handleExportExcel = () => {
        const exportData = purchaseInvoices.map((inv) => ({
            'شماره فاکتور': inv.invoiceNumber,
            'تامین‌کننده / شرکت': inv.supplierName,
            'تعداد اقلام': inv.items.length,
            'مبلغ کل (تومان)': inv.totalAmount,
            'هزینه جانبی/حمل': inv.extraCosts,
            'خالص فاکتور (تومان)': inv.netAmount,
            'تاریخ ثبت': inv.jalaliDate,
            'ثبت‌کننده': inv.createdByUserName,
            'توضیحات': inv.notes || '-',
        }));
        exportToExcel(exportData, 'فاکتورهای_خرید_انبار');
    };
    // Sample Template Download
    const handleDownloadTemplate = () => {
        downloadSampleExcelTemplate({
            'شماره فاکتور': 'PUR-1002',
            'تامین‌کننده': 'شرکت تجهیزات پزشکی آریا طب',
            'نام کالا': 'سرم نمکی ۵۰۰ سی‌سی',
            'تعداد': '۵۰',
            'قیمت واحد خرید': '۴۵۰۰۰',
            'هزینه حمل': '۲۰۰۰۰',
            'توضیحات': 'خرید ماهانه انبار',
        }, 'الگوی_نمونه_فاکتورهای_خرید');
    };
    // Excel Import Handler
    const handleImportExcel = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setImporting(true);
        try {
            const rows = await readExcelFile(file);
            if (!rows || rows.length === 0) {
                alert('فایل اکسل انتخاب‌شده خالی است.');
                return;
            }
            let count = 0;
            rows.forEach((row) => {
                const supName = String(row['تامین‌کننده'] || row['supplierName'] || 'تامین‌کننده ناشناس');
                const invNum = String(row['شماره فاکتور'] || row['invoiceNumber'] || 'PUR-' + Math.floor(1000 + Math.random() * 9000));
                const productName = String(row['نام کالا'] || row['productName'] || 'کالای ورودی');
                const qty = Number(row['تعداد'] || row['qty'] || 1);
                const price = Number(row['قیمت واحد خرید'] || row['purchaseUnitPrice'] || 10000);
                const prod = products.find((p) => p.name.includes(productName)) || products[0];
                if (prod) {
                    const item = {
                        productId: prod.id,
                        productName: prod.name,
                        qty,
                        purchaseUnitPrice: price,
                        totalPrice: qty * price,
                    };
                    const newInv = {
                        fiscalYear: activeFiscalYear,
                        id: 'pur-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
                        invoiceNumber: invNum,
                        supplierName: supName,
                        date: new Date().toISOString(),
                        jalaliDate: getJalaliDateString(),
                        items: [item],
                        totalAmount: qty * price,
                        extraCosts: Number(row['هزینه حمل'] || 0),
                        netAmount: qty * price + Number(row['هزینه حمل'] || 0),
                        createdByUserId: currentUser.id,
                        createdByUserName: currentUser.name,
                        notes: String(row['توضیحات'] || 'ورود از فایل اکسل'),
                    };
                    onAddPurchaseInvoice(newInv);
                    count++;
                }
            });
            alert(`${count} فاکتور خرید با موفقیت از فایل اکسل بارگذاری و ثبت گردید.`);
            setShowImportModal(false);
        }
        catch (err) {
            alert('خطا در بارگذاری فایل اکسل: ' + err.message);
        }
        finally {
            setImporting(false);
        }
    };
    // Filter & Sort History List
    const filteredInvoices = purchaseInvoices
        .filter((inv) => Number(inv.fiscalYear || String(inv.jalaliDate || '').split('/')[0] || 0) === activeFiscalYear)
        .filter((inv) => {
        const q = historySearch.trim();
        if (!q)
            return true;
        return (inv.invoiceNumber.includes(q) ||
            inv.supplierName.includes(q) ||
            inv.createdByUserName.includes(q));
    })
        .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (sortField === 'netAmount') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
        }
        if (valA < valB)
            return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB)
            return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        }
        else {
            setSortField(field);
            setSortDirection('asc');
        }
    };
    const renderSortIcon = (field) => {
        if (sortField !== field)
            return _jsx(ArrowUpDown, { className: "w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" });
        return sortDirection === 'asc' ? (_jsx(ArrowUp, { className: "w-3.5 h-3.5 text-emerald-400" })) : (_jsx(ArrowDown, { className: "w-3.5 h-3.5 text-emerald-400" }));
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse", children: [_jsx(PackageCheck, { className: "w-5 h-5 text-emerald-400" }), _jsx("span", { children: "\u0648\u0631\u0648\u062F \u06A9\u0627\u0644\u0627 \u0628\u0647 \u0627\u0646\u0628\u0627\u0631 \u0648 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062E\u0631\u06CC\u062F \u0627\u0632 \u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u06AF\u0627\u0646" })] }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u062B\u0628\u062A \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0648\u0631\u0648\u062F\u06CC\u060C \u0635\u062F\u0648\u0631 \u0631\u0633\u06CC\u062F \u06A9\u0646\u062A\u0631\u0644 \u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631 \u0648 \u0628\u0647 \u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0645\u0648\u062C\u0648\u062F\u06CC" })] }), _jsxs("div", { className: "flex bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-300", children: [_jsx("button", { onClick: () => setActiveTab('new_invoice'), className: `px-4 py-2 rounded-lg transition ${activeTab === 'new_invoice' ? 'bg-emerald-600 text-white shadow' : 'hover:text-white'}`, children: "\u062B\u0628\u062A \u0641\u0627\u06A9\u062A\u0648\u0631 \u062C\u062F\u06CC\u062F" }), _jsxs("button", { onClick: () => setActiveTab('history'), className: `px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-emerald-600 text-white shadow' : 'hover:text-white'}`, children: [_jsx(History, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062B\u0628\u062A\u200C\u0634\u062F\u0647 (", purchaseInvoices.length, ")"] })] })] })] }), activeTab === 'new_invoice' ? (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-200", children: "\u0645\u0634\u062E\u0635\u0627\u062A \u0641\u0627\u06A9\u062A\u0648\u0631 \u0648 \u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0646\u0627\u0645 \u0634\u0631\u06A9\u062A / \u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647:" }), _jsx("input", { type: "text", value: supplierName, onChange: (e) => setSupplierName(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2.5 rounded-xl" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631 \u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647:" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627: F-9021", value: supplierInvoiceNum, onChange: (e) => setSupplierInvoiceNum(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2.5 rounded-xl font-mono" })] })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-200", children: "\u0627\u0641\u0632\u0648\u062F\u0646 \u06A9\u0627\u0644\u0627 \u0628\u0647 \u0644\u06CC\u0633\u062A \u062E\u0631\u06CC\u062F" }), _jsxs("div", { className: "bg-slate-800/70 border border-teal-700/50 rounded-xl p-3", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Barcode, { className: "w-4 h-4 text-teal-400" }), _jsx("span", { className: "font-bold text-slate-200", children: "ثبت سریع با بارکد کالا" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { value: barcodeInput, onChange: (e) => setBarcodeInput(e.target.value), onKeyDown: handleBarcodeKeyDown, placeholder: "بارکد را با بارکدخوان اسکن کنید و Enter بزنید...", className: "flex-1 bg-slate-900 border border-slate-700 text-slate-100 p-2.5 rounded-xl font-mono", autoComplete: "off" }), _jsx("button", { type: "button", onClick: () => setShowBarcodeScanner(true), className: "bg-teal-600 hover:bg-teal-500 text-white px-3 rounded-xl", title: "اسکن با دوربین", children: _jsx(Camera, { className: "w-4 h-4" }) })] }), _jsx("p", { className: "text-[10px] text-slate-500 mt-2", children: "با اسکن، یک ردیف به پیش‌نویس فاکتور خرید افزوده می‌شود؛ موجودی تنها پس از ثبت فاکتور تغییر می‌کند." }), _jsx("button",{type:"button",onClick:()=>startQuickCreate(barcodeInput),className:"mt-2 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs",children:"+ تعریف سریع کالای جدید / ساخت بارکد داخلی"})] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-2", children: [_jsxs("div", { className: "sm:col-span-2", children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0644\u0627:" }), _jsx("select", { value: selectedProductId, onChange: (e) => {
                                                            setSelectedProductId(e.target.value);
                                                            const p = products.find((pr) => pr.id === e.target.value);
                                                            if (p)
                                                                setUnitPurchasePrice(p.purchasePrice);
                                                        }, className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2.5 rounded-xl", children: products.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " (", p.unit, ")"] }, p.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u062A\u0639\u062F\u0627\u062F \u0648\u0631\u0648\u062F:" }), _jsx("input", { type: "number", min: 1, value: qtyInput, onChange: (e) => setQtyInput(Number(e.target.value)), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2.5 rounded-xl font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0642\u06CC\u0645\u062A \u062E\u0631\u06CC\u062F (\u0648\u0627\u062D\u062F):" }), _jsx(NumberInput, { value: unitPurchasePrice, onChange: (val) => setUnitPurchasePrice(val), currencyLabel: currencyUnit === 'toman' ? 'تومان' : 'ریال' })] })] }), _jsxs("button", { id: "purchase-add-item-btn", onClick: handleAddItem, className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 space-x-reverse text-xs", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0642\u0644\u0645 \u06A9\u0627\u0644\u0627 \u0628\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631" })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm", children: [_jsx("h3", { className: "font-bold text-slate-200 text-xs mb-3", children: "\u0644\u06CC\u0633\u062A \u0627\u0642\u0644\u0627\u0645 \u0648\u0631\u0648\u062F\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400 border-b border-slate-700", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-2.5 text-center", children: "\u062A\u0639\u062F\u0627\u062F" }), _jsx("th", { className: "p-2.5", children: "\u0642\u06CC\u0645\u062A \u0648\u0627\u062D\u062F" }), _jsx("th", { className: "p-2.5", children: "\u0645\u0628\u0644\u063A \u06A9\u0644" }), _jsx("th", { className: "p-2.5 text-center", children: "\u062D\u0630\u0641" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-6 text-center text-slate-500", children: "\u0647\u06CC\u0686 \u06A9\u0627\u0644\u0627\u06CC\u06CC \u0628\u0647 \u0644\u06CC\u0633\u062A \u0641\u0627\u06A9\u062A\u0648\u0631 \u0627\u0636\u0627\u0641\u0647 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." }) })) : (items.map((item, idx) => (_jsxs("tr", { children: [_jsx("td", { className: "p-2.5 font-bold text-slate-100", children: item.productName }), _jsx("td", { className: "p-2.5 text-center font-mono font-bold text-emerald-400", children: toPersianDigits(item.qty) }), _jsx("td", { className: "p-2.5", children: formatCurrency(item.purchaseUnitPrice, currencyUnit) }), _jsx("td", { className: "p-2.5 font-bold text-emerald-400", children: formatCurrency(item.totalPrice, currencyUnit) }), _jsx("td", { className: "p-2.5 text-center", children: _jsx("button", { onClick: () => removeItem(idx), className: "text-rose-400 hover:text-rose-300", children: _jsx(Trash2, { className: "w-4 h-4 mx-auto" }) }) })] }, idx)))) })] }) })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4", children: [_jsxs("div", { className: "space-y-3 text-xs", children: [_jsx("h3", { className: "font-bold text-slate-100 border-b border-slate-800 pb-2", children: "\u062E\u0644\u0627\u0635\u0647 \u0645\u0627\u0644\u06CC \u0648 \u0646\u0647\u0627\u06CC\u06CC\u200C\u0633\u0627\u0632\u06CC \u062E\u0631\u06CC\u062F" }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-400", children: "\u062C\u0645\u0639 \u06A9\u0644 \u06A9\u0627\u0644\u0627\u0647\u0627:" }), _jsx("span", { className: "font-bold text-slate-100", children: formatCurrency(totalAmount, currencyUnit) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u062C\u0627\u0646\u0628\u06CC (\u062D\u0645\u0644 \u0648 \u0628\u0627\u0631\u0628\u0631\u06CC):" }), _jsx(NumberInput, { value: extraCosts, onChange: (val) => setExtraCosts(val), currencyLabel: currencyUnit === 'toman' ? 'تومان' : 'ریال' })] }), _jsxs("div", { className: "flex justify-between pt-2 border-t border-slate-800 font-bold text-sm text-emerald-400", children: [_jsx("span", { children: "\u062E\u0627\u0644\u0635 \u0641\u0627\u06A9\u062A\u0648\u0631:" }), _jsx("span", { children: formatCurrency(netAmount, currencyUnit) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u062A\u0635\u0648\u06CC\u0631 \u06CC\u0627 \u0639\u06A9\u0633 \u0641\u0627\u06A9\u062A\u0648\u0631 \u062E\u0631\u06CC\u062F / \u0641\u0627\u06A9\u062A\u0648\u0631 \u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647:" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("label", { className: "flex-1 border border-dashed border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl p-2.5 text-center cursor-pointer transition flex items-center justify-center gap-2 text-xs font-bold", children: [_jsx(Camera, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: invoiceImageUrl ? 'تغییر عکس فاکتور خرید' : 'عکسبرداری با دوربین یا آپلود تصویر فاکتور' }), _jsx("input", { type: "file", accept: "image/*", capture: "environment", onChange: handleFileUpload, className: "hidden" })] }), invoiceImageUrl && (_jsx("button", { type: "button", onClick: () => setInvoiceImageUrl(''), className: "px-2.5 py-2.5 text-rose-400 hover:bg-rose-950/40 border border-rose-800 rounded-xl text-xs font-bold", title: "\u062D\u0630\u0641 \u0639\u06A9\u0633", children: "\u062D\u0630\u0641" }))] }), invoiceImageUrl && (_jsx("div", { className: "mt-2 text-center", children: _jsx("img", { src: invoiceImageUrl, alt: "\u0639\u06A9\u0633 \u0641\u0627\u06A9\u062A\u0648\u0631", className: "h-20 max-w-full rounded-lg object-contain border border-slate-700 mx-auto shadow-sm" }) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0641\u0627\u06A9\u062A\u0648\u0631:" }), _jsx("textarea", { rows: 2, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0627\u062E\u062A\u06CC\u0627\u0631\u06CC \u062E\u0631\u06CC\u062F...", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 p-2 rounded-xl" })] })] }), _jsxs("button", { onClick: handleSubmitPurchase, disabled: items.length === 0, className: "w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center space-x-2 space-x-reverse shadow-lg", children: [_jsx(PackageCheck, { className: "w-5 h-5" }), _jsx("span", { children: "\u062B\u0628\u062A \u0641\u0627\u06A9\u062A\u0648\u0631 \u062E\u0631\u06CC\u062F \u0648 \u067E\u0631\u06CC\u0646\u062A \u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631" })] })] })] })) : (
            /* History Tab */
            _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3", children: [_jsxs("div", { children: [_jsxs("h3", { className: "font-bold text-slate-100 flex items-center gap-2 text-sm", children: [_jsx(FileText, { className: "w-4 h-4 text-emerald-400" }), _jsxs("span", { children: ["\u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062E\u0631\u06CC\u062F \u062B\u0628\u062A\u200C\u0634\u062F\u0647 \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 (", purchaseInvoices.length, ")"] })] }), _jsx("p", { className: "text-slate-400 text-[11px] mt-0.5", children: "\u0642\u0627\u0628\u0644\u06CC\u062A \u0686\u0627\u067E \u06A9\u0644\u06CC\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u060C \u0645\u0634\u0627\u0647\u062F\u0647 \u062A\u0635\u0648\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631 \u062E\u0631\u06CC\u062F\u060C \u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644 \u0648 \u062B\u0628\u062A \u0633\u0631\u06CC\u0639" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "relative w-48 sm:w-64", children: [_jsx(Search, { className: "w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0634\u0645\u0627\u0631\u0647 \u06CC\u0627 \u0634\u0631\u06A9\u062A...", value: historySearch, onChange: (e) => setHistorySearch(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-200 pr-8 pl-2 py-1.5 rounded-xl text-xs" })] }), _jsxs("button", { onClick: handleExportExcel, className: "flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 px-3 py-1.5 rounded-xl transition font-bold", title: "\u062F\u0627\u0646\u0644\u0648\u062F \u062E\u0631\u0648\u062C\u06CC \u06A9\u0627\u0645\u0644 \u0627\u06A9\u0633\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062E\u0631\u06CC\u062F", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("button", { onClick: () => setShowImportModal(true), className: "flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 px-3 py-1.5 rounded-xl transition font-bold", title: "\u0648\u0631\u0648\u062F \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062E\u0631\u06CC\u062F \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644", children: [_jsx(Upload, { className: "w-4 h-4 text-indigo-400" }), _jsx("span", { children: "\u0648\u0631\u0648\u062F \u0627\u06A9\u0633\u0644" })] })] })] }), _jsx("div", { className: "overflow-x-auto border border-slate-800 rounded-xl", children: _jsxs("table", { className: "w-full text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400 font-bold border-b border-slate-700", children: _jsxs("tr", { children: [_jsx("th", { onClick: () => handleSort('invoiceNumber'), className: "p-3 cursor-pointer hover:bg-slate-700/70 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631" }), renderSortIcon('invoiceNumber')] }) }), _jsx("th", { onClick: () => handleSort('supplierName'), className: "p-3 cursor-pointer hover:bg-slate-700/70 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647 / \u0634\u0631\u06A9\u062A" }), renderSortIcon('supplierName')] }) }), _jsx("th", { className: "p-3", children: "\u062A\u0639\u062F\u0627\u062F \u0627\u0642\u0644\u0627\u0645" }), _jsx("th", { onClick: () => handleSort('netAmount'), className: "p-3 cursor-pointer hover:bg-slate-700/70 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u0645\u0628\u0644\u063A \u06A9\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631" }), renderSortIcon('netAmount')] }) }), _jsx("th", { className: "p-3", children: "\u0639\u06A9\u0633 \u0641\u0627\u06A9\u062A\u0648\u0631" }), _jsx("th", { onClick: () => handleSort('jalaliDate'), className: "p-3 cursor-pointer hover:bg-slate-700/70 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A" }), renderSortIcon('jalaliDate')] }) }), _jsx("th", { className: "p-3", children: "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647" }), _jsx("th", { className: "p-3 text-center", children: "\u0639\u0645\u0644\u06CC\u0627\u062A \u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631\u06CC" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: filteredInvoices.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-slate-500", children: "\u0647\u06CC\u0686 \u0641\u0627\u06A9\u062A\u0648\u0631 \u062E\u0631\u06CC\u062F\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }) })) : (filteredInvoices.map((inv, idx) => (_jsxs("tr", { className: `${idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'} hover:bg-slate-800 transition-colors`, children: [_jsx("td", { className: "p-3 font-mono font-bold text-emerald-400", children: inv.invoiceNumber }), _jsx("td", { className: "p-3 font-bold text-slate-100", children: inv.supplierName }), _jsxs("td", { className: "p-3 font-bold text-slate-200", children: [toPersianDigits(inv.items.length), " \u0642\u0644\u0645"] }), _jsx("td", { className: "p-3 font-bold text-emerald-400", children: formatCurrency(inv.netAmount, currencyUnit) }), _jsx("td", { className: "p-3", children: inv.invoiceImageUrl ? (_jsxs("button", { onClick: () => setViewAttachmentUrl(inv.invoiceImageUrl), className: "flex items-center gap-1 text-teal-300 hover:text-white bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 px-2 py-1 rounded-lg text-[11px] font-bold transition", children: [_jsx(ImageIcon, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0645\u0634\u0627\u0647\u062F\u0647" })] })) : (_jsx("span", { className: "text-slate-600 text-[11px]", children: "-" })) }), _jsx("td", { className: "p-3 text-slate-400 dir-ltr text-right", children: inv.jalaliDate }), _jsx("td", { className: "p-3 text-slate-400", children: inv.createdByUserName }), _jsx("td", { className: "p-3 text-center", children: _jsxs("button", { onClick: () => setSelectedPrintInvoice(inv), className: "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 mx-auto", children: [_jsx(Printer, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u067E\u0631\u06CC\u0646\u062A \u0627\u0646\u0628\u0627\u0631\u062F\u0627\u0631" })] }) })] }, inv.id)))) })] }) })] })), viewAttachmentUrl && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full p-4 space-y-3 text-slate-100", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2", children: [_jsxs("span", { className: "font-bold text-slate-200 flex items-center gap-2", children: [_jsx(ImageIcon, { className: "w-5 h-5 text-emerald-400" }), "\u062A\u0635\u0648\u06CC\u0631 \u0627\u0635\u0644 \u0641\u0627\u06A9\u062A\u0648\u0631 \u062E\u0631\u06CC\u062F \u062A\u0627\u0645\u06CC\u0646\u200C\u06A9\u0646\u0646\u062F\u0647"] }), _jsx("button", { onClick: () => setViewAttachmentUrl(null), className: "text-slate-400 hover:text-white font-black text-sm", children: "\u2715" })] }), _jsx("div", { className: "p-2 text-center overflow-auto max-h-[75vh]", children: _jsx("img", { src: viewAttachmentUrl, alt: "\u062A\u0635\u0648\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631", className: "max-w-full max-h-[70vh] rounded-xl mx-auto border border-slate-700 shadow" }) }), _jsx("div", { className: "text-left border-t border-slate-800 pt-2", children: _jsx("button", { onClick: () => setViewAttachmentUrl(null), className: "px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs", children: "\u0628\u0633\u062A\u0646" }) })] }) })), showImportModal && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-slate-100", children: [_jsxs("div", { className: "bg-indigo-900 text-white p-4 font-bold flex items-center justify-between border-b border-slate-800", children: [_jsxs("span", { className: "flex items-center gap-2 text-sm", children: [_jsx(Upload, { className: "w-4 h-4 text-indigo-300" }), "\u0648\u0631\u0648\u062F \u062F\u0633\u062A\u0647\u200C\u062C\u0645\u0639\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062E\u0631\u06CC\u062F \u0627\u0632 \u0627\u06A9\u0633\u0644"] }), _jsx("button", { onClick: () => setShowImportModal(false), className: "text-slate-400 hover:text-white", children: "\u2715" })] }), _jsxs("div", { className: "p-5 space-y-4 text-xs text-slate-300", children: [_jsx("p", { className: "leading-relaxed", children: "\u0634\u0645\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0644\u06CC\u0633\u062A \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0648\u0631\u0648\u062F\u06CC \u062E\u0631\u06CC\u062F \u0631\u0627 \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0646\u0645\u0627\u06CC\u06CC\u062F \u062A\u0627 \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631 \u0628\u0647 \u0634\u06A9\u0644 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0622\u067E\u062F\u06CC\u062A \u06AF\u0631\u062F\u062F." }), _jsxs("div", { className: "bg-amber-950/60 border border-amber-800/80 text-amber-200 p-3 rounded-xl flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-400 shrink-0 mt-0.5" }), _jsx("div", { children: "\u062C\u0647\u062A \u062C\u0644\u0648\u06AF\u06CC\u0631\u06CC \u0627\u0632 \u062E\u0637\u0627\u060C \u0627\u0628\u062A\u062F\u0627 \u0641\u0627\u06CC\u0644 \u0627\u0644\u06AF\u0648\u06CC \u0646\u0645\u0648\u0646\u0647 \u0631\u0627 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0646\u06CC\u062F \u0648 \u0633\u062A\u0648\u0646\u200C\u0647\u0627\u06CC \u0646\u0627\u0645 \u06A9\u0627\u0644\u0627\u060C \u062A\u0639\u062F\u0627\u062F \u0648 \u0642\u06CC\u0645\u062A \u062E\u0631\u06CC\u062F \u0631\u0627 \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F." })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("button", { onClick: handleDownloadTemplate, className: "w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl border border-slate-700 transition", children: [_jsx(Download, { className: "w-4 h-4 text-slate-400" }), _jsx("span", { children: "\u062F\u0627\u0646\u0644\u0648\u062F \u0627\u0644\u06AF\u0648\u06CC \u0633\u0627\u062E\u062A\u0627\u0631 \u0627\u06A9\u0633\u0644" })] }), _jsxs("label", { className: "w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition cursor-pointer shadow", children: [_jsx(Upload, { className: "w-4 h-4" }), _jsx("span", { children: importing ? 'در حال خوندن فایل اکسل...' : 'انتخاب و بارگذاری فایل اکسل' }), _jsx("input", { type: "file", accept: ".xlsx, .xls", onChange: handleImportExcel, className: "hidden", disabled: importing })] })] }), _jsx("div", { className: "pt-3 border-t border-slate-800 text-left", children: _jsx("button", { onClick: () => setShowImportModal(false), className: "px-4 py-2 border border-slate-700 rounded-xl hover:bg-slate-800 font-bold text-slate-300", children: "\u0628\u0633\u062A\u0646" }) })] })] }) })), showBarcodeScanner && (_jsx(WebcamScannerModal, { products: products, onScanBarcode: handleCameraBarcode, onClose: () => setShowBarcodeScanner(false), continuous: true })), selectedPrintInvoice && (_jsx(PurchaseInvoicePrintModal, { invoice: selectedPrintInvoice, settings: settings, onClose: () => setSelectedPrintInvoice(null) })),
    scanNotice && _jsx('p',{role:'status',className:'text-xs p-3 rounded-xl bg-teal-950 text-emerald-300',children:scanNotice}),
    quickCreateOpen && React.createElement('div',{className:'fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4',dir:'rtl'},
      React.createElement('form',{onSubmit:saveQuickProduct,className:'bg-slate-900 border border-slate-600 rounded-2xl p-5 space-y-3 w-full max-w-md text-slate-100 shadow-2xl'},
        React.createElement('h3',{className:'font-bold text-lg'},'تعریف سریع کالا در فاکتور خرید'),
        React.createElement('p',{className:'text-xs text-slate-300'},'کالای جدید به کاتالوگ مرکزی افزوده می‌شود؛ موجودی اولیه صفر است.'),
        ...[
          ['نام کالا',quickName,setQuickName,'text'],['بارکد (در صورت خالی‌بودن، بارکد مرکز ساخته می‌شود)',quickBarcode,setQuickBarcode,'text'],
          ['واحد',quickUnit,setQuickUnit,'text'],['بهای خرید',quickCost,setQuickCost,'number'],['بهای فروش',quickSale,setQuickSale,'number']
        ].map(([label,val,change,type])=>React.createElement('label',{key:label,className:'block text-xs'},label,
          React.createElement('input',{type,value:val,onChange:e=>change(type==='number'?Number(e.target.value):e.target.value),required:label==='نام کالا',min:type==='number'?0:undefined,dir:type==='number'?'ltr':'auto',className:'block mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-slate-100'}))),
        React.createElement('button',{type:'button',className:'text-xs text-amber-300 underline',onClick:()=>setQuickBarcode(generateUniqueClinicBarcode(products))},'ساخت بارکد اختصاصی مرکز (Code 128)'),
        React.createElement('div',{className:'flex gap-3 pt-2'},React.createElement('button',{type:'submit',className:'bg-emerald-600 px-4 py-2 rounded-lg text-white'},'ثبت کالا و افزودن به فاکتور'),
          React.createElement('button',{type:'button',onClick:()=>setQuickCreateOpen(false),className:'bg-slate-700 px-4 py-2 rounded-lg'},'انصراف')))),
    printQuickProduct && _jsx(BarcodePrintModal,{product:printQuickProduct,settings,onClose:()=>setPrintQuickProduct(null)})] }));
};
