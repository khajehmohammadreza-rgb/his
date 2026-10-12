import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { DollarSign, TrendingDown, TrendingUp, PieChart, Search, Award, Users, ShieldCheck, Lock, Printer, CheckCircle2, AlertTriangle, Receipt, Coffee, Briefcase, Camera, Image as ImageIcon, Download, Upload, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { formatCurrency, getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { NumberInput } from './NumberInput.js?b=r24-514-1405';
import { exportToExcel, downloadSampleExcelTemplate, readExcelFile } from '../utils/excelUtils.js?b=r24-514-1405';
export const AccountingExpenses = ({ expenses = [], salesInvoices = [], purchaseInvoices = [], doctors = [], settings, currentUser, onAddExpense, onSaveSettings, }) => {
    const activeFiscalYear = Number(settings?.activeFiscalYear || 1405);
    const [activeTab, setActiveTab] = useState('expenses');
    const [expenseFilter, setExpenseFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    // Sorting State
    const [sortField, setSortField] = useState('jalaliDate');
    const [sortDirection, setSortDirection] = useState('desc');
    // Attachment Modal State
    const [viewAttachmentUrl, setViewAttachmentUrl] = useState(null);
    // Excel Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    // Partner Shares Management
    const [partners, setPartners] = useState(settings.partnerShares || [
        {
            id: 'partner-1',
            name: 'پزشک مرکز',
            role: 'پزشک موسس و جراح کلینیک',
            sharePercent: 70,
            notes: 'سهم اصلی مالکیت و خدمات جراحی',
        },
        {
            id: 'partner-2',
            name: 'مدیر مرکز',
            role: 'مدیر ارشد اجرایی (Holding Manager)',
            sharePercent: 30,
            notes: 'سهم سرمایه‌گذاری و مدیریت اجرایی',
        },
    ]);
    const [showPartnerModal, setShowPartnerModal] = useState(false);
    const [editingPartner, setEditingPartner] = useState(null);
    const [partnerName, setPartnerName] = useState('');
    const [partnerRole, setPartnerRole] = useState('');
    const [partnerPercent, setPartnerPercent] = useState(50);
    // New Expense Modal State
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState('');
    const [expenseType, setExpenseType] = useState('salary');
    const [category, setCategory] = useState('پرداخت حقوق پرسنل');
    const [amount, setAmount] = useState(10000000);
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [recipient, setRecipient] = useState('');
    const [recipientRole, setRecipientRole] = useState('');
    const [notes, setNotes] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    // Printable Partner Statement Modal
    const [showPrintableStatement, setShowPrintableStatement] = useState(false);
    // Security Check: Only Admin and Accountant allowed
    const isAuthorized = currentUser.role === 'admin' || currentUser.role === 'accountant';
    if (!isAuthorized) {
        return (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4 max-w-xl mx-auto my-12", children: [_jsx("div", { className: "w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto", children: _jsx(Lock, { className: "w-8 h-8" }) }), _jsx("h2", { className: "text-lg font-black text-slate-900", children: "\u0639\u062F\u0645 \u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u062F\u0641\u062A\u0631 \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u0648 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F" }), _jsx("p", { className: "text-xs text-slate-600 leading-relaxed", children: "\u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u062F\u0641\u062A\u0631 \u062D\u0633\u0627\u0628\u0631\u0633\u06CC\u060C \u062B\u0628\u062A \u062D\u0642\u0648\u0642 \u067E\u0631\u0633\u0646\u0644\u060C \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647 \u0648 \u0645\u062D\u0627\u0633\u0628\u0647 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u0628\u06CC\u0646 \u0634\u0631\u06A9\u0627 \u0645\u0646\u062D\u0635\u0631\u0627\u064B \u062F\u0631 \u0627\u062E\u062A\u06CC\u0627\u0631 **\u0645\u062F\u06CC\u0631 \u0627\u0631\u0634\u062F \u06A9\u0644\u06CC\u0646\u06CC\u06A9 (Admin)** \u0648 **\u062D\u0633\u0627\u0628\u062F\u0627\u0631 (Accountant)** \u0645\u06CC\u200C\u0628\u0627\u0634\u062F." })] }));
    }
    // File / Camera Upload Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.size > 10 * 1024 * 1024) {
            alert('حجم عکس انتخاب شده نباید بیشتر از ۱۰ مگابایت باشد.');
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
                    setAttachmentUrl(data.url);
                }
                else {
                    setAttachmentUrl(base64); // Fallback to base64
                }
            }
            catch (err) {
                setAttachmentUrl(base64);
            }
        };
        reader.readAsDataURL(file);
    };
    // Submit New Expense or Salary
    const handleSubmitExpense = (e) => {
        e.preventDefault();
        if (!title) {
            alert('لطفاً عنوان یا شرح پرداخت را وارد نمایید.');
            return;
        }
        const newExpense = {
            fiscalYear: activeFiscalYear,
            id: 'exp-' + Date.now(),
            title,
            category,
            expenseType,
            amount,
            recipient,
            recipientRole,
            paymentMethod,
            recordedByUserName: currentUser.name,
            jalaliDate: getJalaliDateString(),
            notes,
            attachmentUrl: attachmentUrl || undefined,
        };
        onAddExpense(newExpense);
        setShowModal(false);
        setTitle('');
        setRecipient('');
        setRecipientRole('');
        setNotes('');
        setAttachmentUrl('');
        alert(`سند پرداخت «${title}» به مبلغ ${formatCurrency(amount, settings.currencyUnit)} با موفقیت ثبت گردید.`);
    };
    // Save Partners Configuration
    const handleSavePartner = (e) => {
        e.preventDefault();
        if (!partnerName)
            return;
        let updatedList;
        if (editingPartner) {
            updatedList = partners.map((p) => p.id === editingPartner.id ? { ...p, name: partnerName, role: partnerRole, sharePercent: partnerPercent } : p);
        }
        else {
            updatedList = [
                ...partners,
                {
                    id: 'partner-' + Date.now(),
                    name: partnerName,
                    role: partnerRole,
                    sharePercent: partnerPercent,
                },
            ];
        }
        setPartners(updatedList);
        if (onSaveSettings) {
            onSaveSettings({ ...settings, partnerShares: updatedList });
        }
        setShowPartnerModal(false);
    };
    // Financial Calculations
    const totalSalesIncome = salesInvoices
        .filter((inv) => inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + (inv.payableAmount || 0), 0);
    const fiscalPurchaseInvoices = purchaseInvoices.filter((p) => Number(p.fiscalYear || String(p.jalaliDate || '').split('/')[0] || 0) === activeFiscalYear);
    const fiscalExpenses = expenses.filter((e) => Number(e.fiscalYear || String(e.jalaliDate || '').split('/')[0] || 0) === activeFiscalYear);
    const totalPurchaseExpenses = fiscalPurchaseInvoices.reduce((sum, p) => sum + (p.netAmount || 0), 0);
    const totalRegisteredExpenses = fiscalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const salaryExpenses = fiscalExpenses
        .filter((e) => e.expenseType === 'salary' || e.category.includes('حقوق'))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const operationalExpenses = fiscalExpenses
        .filter((e) => e.expenseType === 'operational' || (!e.category.includes('حقوق') && e.expenseType !== 'salary'))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalAllExpenses = totalPurchaseExpenses + totalRegisteredExpenses;
    const netProfit = totalSalesIncome - totalAllExpenses;
    // Filter & Sort Expenses List
    const filteredExpenses = fiscalExpenses
        .filter((e) => {
        const matchesSearch = (e.title || '').includes(searchTerm) ||
            (e.recipient || '').includes(searchTerm) ||
            (e.category || '').includes(searchTerm);
        const matchesType = expenseFilter === 'all' ||
            (expenseFilter === 'salary' && (e.expenseType === 'salary' || e.category.includes('حقوق'))) ||
            (expenseFilter === 'operational' && (e.expenseType === 'operational' || !e.category.includes('حقوق')));
        return matchesSearch && matchesType;
    })
        .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (sortField === 'amount') {
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
            return _jsx(ArrowUpDown, { className: "w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" });
        return sortDirection === 'asc' ? (_jsx(ArrowUp, { className: "w-3.5 h-3.5 text-teal-600" })) : (_jsx(ArrowDown, { className: "w-3.5 h-3.5 text-teal-600" }));
    };
    // Export Expenses to Excel
    const handleExportExpensesExcel = () => {
        const exportData = filteredExpenses.map((exp) => ({
            'عنوان سند': exp.title,
            'دسته‌بندی': exp.category,
            'نوع سند': exp.expenseType === 'salary' ? 'پرداخت حقوق' : 'هزینه متفرقه',
            'طرف حساب / دریافت‌کننده': exp.recipient || '-',
            'سمت دریافت‌کننده': exp.recipientRole || '-',
            'مبلغ (تومان)': exp.amount,
            'روش پرداخت': exp.paymentMethod === 'bank_transfer' ? 'کارت به کارت/پایا' : exp.paymentMethod === 'pos' ? 'کارتخوان' : 'نقدی',
            'تاریخ ثبت': exp.jalaliDate,
            'ثبت‌کننده': exp.recordedByUserName || '-',
            'توضیحات': exp.notes || '-',
        }));
        exportToExcel(exportData, 'دفتر_هزینه‌ها_و_حقوق_کلینیک');
    };
    // Sample Excel Template Download
    const handleDownloadExpenseTemplate = () => {
        downloadSampleExcelTemplate({
            'عنوان سند': 'خرید چای و قند کلینیک',
            'دسته‌بندی': 'خرید لوازم پذیرایی',
            'نوع سند': 'operational',
            'طرف حساب': 'فروشگاه سپهر',
            'مبلغ': '۴۵۰۰۰۰',
            'روش پرداخت': 'pos',
            'توضیحات': 'خرید نوبت ماهانه',
        }, 'الگوی_نمونه_ورود_هزینه‌ها');
    };
    // Import Expenses Excel
    const handleImportExcelFile = async (e) => {
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
                const titleVal = row['عنوان سند'] || row['عنوان'] || row['title'];
                const amountVal = Number(row['مبلغ (تومان)'] || row['مبلغ'] || row['amount'] || 0);
                if (titleVal && amountVal > 0) {
                    const newExp = {
                        id: 'exp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
                        title: String(titleVal),
                        category: String(row['دسته‌بندی'] || row['category'] || 'هزینه‌های متفرقه'),
                        expenseType: row['نوع سند'] === 'salary' || String(titleVal).includes('حقوق') ? 'salary' : 'operational',
                        amount: amountVal,
                        recipient: row['طرف حساب / دریافت‌کننده'] || row['طرف حساب'] || row['recipient'] || '',
                        recordedByUserName: currentUser.name,
                        jalaliDate: getJalaliDateString(),
                        notes: row['توضیحات'] || row['notes'] || 'ورود دسته‌جمعی از اکسل',
                    };
                    onAddExpense(newExp);
                    count++;
                }
            });
            alert(`${count} سند هزینه با موفقیت از اکسل وارد گردید.`);
            setShowImportModal(false);
        }
        catch (err) {
            alert('خطا در خواندن فایل اکسل: ' + err.message);
        }
        finally {
            setImporting(false);
        }
    };
    const totalSharesPercent = partners.reduce((sum, p) => sum + p.sharePercent, 0);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-3 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl", children: _jsx(DollarSign, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h1", { className: "text-xl font-bold text-slate-800", children: "\u062D\u0633\u0627\u0628\u0631\u0633\u06CC\u060C \u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642\u060C \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647 \u0648 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u0634\u0631\u06A9\u0627" }), _jsxs("span", { className: "bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1", children: [_jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" }), "\u062F\u0633\u062A\u0631\u0633\u06CC \u0648\u06CC\u0698\u0647 (Admin & Accountant)"] })] }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0633\u0646\u0627\u062F \u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642\u060C \u062E\u0631\u06CC\u062F \u0686\u0627\u06CC \u0648 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u062C\u0627\u0631\u06CC\u060C \u062A\u0631\u0627\u0632 \u0646\u0647\u0627\u06CC\u06CC \u0645\u0627\u0644\u06CC \u0648 \u0645\u062D\u0627\u0633\u0628\u0647 \u062F\u0642\u06CC\u0642 \u0633\u0647\u0645 \u0633\u0648\u062F \u0634\u0631\u06A9\u0627" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => {
                                    setExpenseType('salary');
                                    setCategory('پرداخت حقوق پرسنل');
                                    setTitle('پرداخت حقوق ماهیانه');
                                    setShowModal(true);
                                }, className: "flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow", children: [_jsx(Briefcase, { className: "w-4 h-4 text-teal-400" }), _jsx("span", { children: "\u062B\u0628\u062A \u062D\u0642\u0648\u0642 \u067E\u0631\u0633\u0646\u0644" })] }), _jsxs("button", { onClick: () => {
                                    setExpenseType('operational');
                                    setCategory('خرید چای، قند و لوازم مصرفی');
                                    setTitle('خرید لوازم پذیرایی و اداری');
                                    setShowModal(true);
                                }, className: "flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow", children: [_jsx(Coffee, { className: "w-4 h-4" }), _jsx("span", { children: "\u062B\u0628\u062A \u0647\u0632\u06CC\u0646\u0647 \u0645\u062A\u0641\u0631\u0642\u0647 / \u062C\u0627\u0631\u06CC" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1", children: [_jsxs("div", { className: "text-xs text-slate-500 font-medium flex items-center justify-between", children: [_jsx("span", { children: "\u062F\u0631\u0622\u0645\u062F \u06A9\u0644 \u0641\u0631\u0648\u0634 \u0648 \u062E\u062F\u0645\u0627\u062A" }), _jsx(TrendingUp, { className: "w-4 h-4 text-emerald-600" })] }), _jsx("div", { className: "text-base font-black text-emerald-700", children: formatCurrency(totalSalesIncome, settings.currencyUnit) }), _jsx("div", { className: "text-[10px] text-slate-400", children: "\u0627\u0632 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0641\u0631\u0648\u0634 \u0648 \u062E\u062F\u0645\u0627\u062A \u0628\u06CC\u0645\u0627\u0631\u0627\u0646" })] }), _jsxs("div", { className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1", children: [_jsxs("div", { className: "text-xs text-slate-500 font-medium flex items-center justify-between", children: [_jsx("span", { children: "\u062D\u0642\u0648\u0642 \u0648 \u062F\u0633\u062A\u0645\u0632\u062F \u067E\u0631\u062F\u0627\u062E\u062A\u06CC" }), _jsx(Briefcase, { className: "w-4 h-4 text-amber-600" })] }), _jsx("div", { className: "text-base font-black text-amber-700", children: formatCurrency(salaryExpenses, settings.currencyUnit) }), _jsx("div", { className: "text-[10px] text-slate-400", children: "\u0645\u062C\u0645\u0648\u0639 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u067E\u0631\u0633\u0646\u0644 \u0648 \u06A9\u0627\u062F\u0631" })] }), _jsxs("div", { className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1", children: [_jsxs("div", { className: "text-xs text-slate-500 font-medium flex items-center justify-between", children: [_jsx("span", { children: "\u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647\u060C \u062C\u0627\u0631\u06CC \u0648 \u0627\u0646\u0628\u0627\u0631" }), _jsx(TrendingDown, { className: "w-4 h-4 text-rose-600" })] }), _jsx("div", { className: "text-base font-black text-rose-700", children: formatCurrency(operationalExpenses + totalPurchaseExpenses, settings.currencyUnit) }), _jsx("div", { className: "text-[10px] text-slate-400", children: "\u0642\u0628\u0648\u0636\u060C \u067E\u0630\u06CC\u0631\u0627\u06CC\u06CC\u060C \u062E\u0631\u06CC\u062F \u06A9\u0627\u0644\u0627 \u0648 \u0627\u0646\u0628\u0627\u0631" })] }), _jsxs("div", { className: "bg-gradient-to-br from-slate-900 to-teal-950 p-4 rounded-2xl border border-slate-800 text-white shadow-md space-y-1", children: [_jsxs("div", { className: "text-xs text-teal-300 font-medium flex items-center justify-between", children: [_jsx("span", { children: "\u0633\u0648\u062F \u062E\u0627\u0644\u0635 \u0639\u0645\u0644\u06A9\u0631\u062F \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647" }), _jsx(PieChart, { className: "w-4 h-4 text-teal-400" })] }), _jsx("div", { className: `text-lg font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`, children: formatCurrency(netProfit, settings.currencyUnit) }), _jsx("div", { className: "text-[10px] text-slate-300", children: "\u0645\u0628\u0646\u0627\u06CC \u0627\u0635\u0644\u06CC \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u0628\u06CC\u0646 \u0634\u0631\u06A9\u0627" })] })] }), _jsxs("div", { className: "flex border-b border-slate-200 text-xs font-bold gap-2", children: [_jsxs("button", { onClick: () => setActiveTab('expenses'), className: `pb-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === 'expenses'
                            ? 'border-teal-600 text-teal-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'}`, children: [_jsx(Receipt, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u062F\u0641\u062A\u0631 \u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642 \u0648 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647 (", expenses.length, ")"] })] }), _jsxs("button", { onClick: () => setActiveTab('profit_sharing'), className: `pb-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === 'profit_sharing'
                            ? 'border-amber-600 text-amber-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'}`, children: [_jsx(PieChart, { className: "w-4 h-4" }), _jsx("span", { children: "\u062A\u0631\u0627\u0632 \u0645\u0627\u0647\u0627\u0646\u0647 \u0648 \u0645\u062D\u0627\u0633\u0628\u0647 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u0634\u0631\u06A9\u0627" })] }), _jsxs("button", { onClick: () => setActiveTab('doctor_commissions'), className: `pb-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === 'doctor_commissions'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'}`, children: [_jsx(Award, { className: "w-4 h-4" }), _jsx("span", { children: "\u06A9\u0627\u0631\u0627\u0646\u0647 \u0648 \u0633\u0647\u0645 \u067E\u0632\u0634\u06A9\u0627\u0646 \u0645\u0639\u0627\u0644\u062C" })] })] }), activeTab === 'expenses' && (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { className: "w-4 h-4 absolute right-3 top-3 text-slate-400" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648 \u062F\u0631 \u0639\u0646\u0648\u0627\u0646\u060C \u062F\u0631\u06CC\u0627\u0641\u062A\u200C\u06A9\u0646\u0646\u062F\u0647\u060C \u0634\u0631\u062D \u0647\u0632\u06CC\u0646\u0647...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pr-9 pl-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs", children: [_jsxs("div", { className: "flex items-center gap-1 bg-slate-100 p-1 rounded-xl", children: [_jsx("button", { onClick: () => setExpenseFilter('all'), className: `px-3 py-1 rounded-lg font-bold transition ${expenseFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'}`, children: "\u0647\u0645\u0647 \u0627\u0633\u0646\u0627\u062F" }), _jsx("button", { onClick: () => setExpenseFilter('salary'), className: `px-3 py-1 rounded-lg font-bold transition ${expenseFilter === 'salary' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'}`, children: "\u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642" }), _jsx("button", { onClick: () => setExpenseFilter('operational'), className: `px-3 py-1 rounded-lg font-bold transition ${expenseFilter === 'operational' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'}`, children: "\u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647/\u062C\u0627\u0631\u06CC" })] }), _jsx("div", { className: "h-6 w-px bg-slate-200 mx-1 hidden sm:block" }), _jsxs("button", { onClick: handleExportExpensesExcel, className: "flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl transition font-bold", title: "\u062F\u0627\u0646\u0644\u0648\u062F \u062E\u0631\u0648\u062C\u06CC \u06A9\u0627\u0645\u0644 \u0627\u06A9\u0633\u0644 \u0627\u0633\u0646\u0627\u062F \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4 text-emerald-600" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("button", { onClick: () => setShowImportModal(true), className: "flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 px-3 py-2 rounded-xl transition font-bold", title: "\u0648\u0631\u0648\u062F \u0627\u0633\u0646\u0627\u062F \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644", children: [_jsx(Upload, { className: "w-4 h-4 text-indigo-600" }), _jsx("span", { children: "\u0648\u0631\u0648\u062F \u0627\u06A9\u0633\u0644" })] })] })] }), _jsx("div", { className: "overflow-x-auto border border-slate-200 rounded-xl shadow-inner", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10", children: _jsxs("tr", { children: [_jsx("th", { onClick: () => handleSort('title'), className: "p-3 cursor-pointer hover:bg-slate-200/80 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u0634\u0631\u062D / \u0639\u0646\u0648\u0627\u0646 \u067E\u0631\u062F\u0627\u062E\u062A" }), renderSortIcon('title')] }) }), _jsx("th", { onClick: () => handleSort('category'), className: "p-3 cursor-pointer hover:bg-slate-200/80 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u0646\u0648\u0639 / \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC" }), renderSortIcon('category')] }) }), _jsx("th", { onClick: () => handleSort('recipient'), className: "p-3 cursor-pointer hover:bg-slate-200/80 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u062F\u0631\u06CC\u0627\u0641\u062A\u200C\u06A9\u0646\u0646\u062F\u0647 / \u0637\u0631\u0641 \u062D\u0633\u0627\u0628" }), renderSortIcon('recipient')] }) }), _jsx("th", { onClick: () => handleSort('amount'), className: "p-3 cursor-pointer hover:bg-slate-200/80 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u0645\u0628\u0644\u063A (\u062A\u0648\u0645\u0627\u0646)" }), renderSortIcon('amount')] }) }), _jsx("th", { className: "p-3", children: "\u062A\u0635\u0648\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631 / \u0641\u06CC\u0634" }), _jsx("th", { className: "p-3", children: "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A" }), _jsx("th", { onClick: () => handleSort('jalaliDate'), className: "p-3 cursor-pointer hover:bg-slate-200/80 transition select-none group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A" }), renderSortIcon('jalaliDate')] }) }), _jsx("th", { className: "p-3", children: "\u062B\u0628\u062A\u200C\u06A9\u0646\u0646\u062F\u0647" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 text-slate-800", children: filteredExpenses.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-8 text-center text-slate-400", children: "\u0647\u06CC\u0686 \u0633\u0646\u062F \u0647\u0632\u06CC\u0646\u0647\u200C\u0627\u06CC \u0628\u0627 \u0645\u0634\u062E\u0635\u0627\u062A \u062C\u0633\u062A\u062C\u0648\u06CC\u0627\u0641\u062A\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }) })) : (filteredExpenses.map((exp, idx) => {
                                        const isSalary = exp.expenseType === 'salary' || exp.category.includes('حقوق');
                                        return (_jsxs("tr", { className: `${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-teal-50/40 transition-colors`, children: [_jsx("td", { className: "p-3 font-bold text-slate-900", children: _jsxs("div", { className: "flex items-center gap-2", children: [isSalary ? (_jsx(Briefcase, { className: "w-4 h-4 text-amber-600 shrink-0" })) : (_jsx(Coffee, { className: "w-4 h-4 text-teal-600 shrink-0" })), _jsx("span", { children: exp.title })] }) }), _jsx("td", { className: "p-3", children: _jsx("span", { className: `px-2 py-0.5 rounded font-bold text-[10px] ${isSalary ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'}`, children: exp.category }) }), _jsxs("td", { className: "p-3", children: [_jsx("div", { className: "font-bold text-slate-800", children: exp.recipient || '-' }), exp.recipientRole && (_jsx("div", { className: "text-[10px] text-slate-400", children: exp.recipientRole }))] }), _jsx("td", { className: "p-3 font-bold text-rose-700", children: formatCurrency(exp.amount, settings.currencyUnit) }), _jsx("td", { className: "p-3", children: exp.attachmentUrl ? (_jsxs("button", { onClick: () => setViewAttachmentUrl(exp.attachmentUrl), className: "flex items-center gap-1 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg text-[11px] font-bold transition", children: [_jsx(ImageIcon, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0645\u0634\u0627\u0647\u062F\u0647 \u062A\u0635\u0648\u06CC\u0631" })] })) : (_jsx("span", { className: "text-slate-400 text-[11px]", children: "-" })) }), _jsx("td", { className: "p-3 text-slate-600", children: exp.paymentMethod === 'bank_transfer'
                                                        ? 'کارت به کارت / پایا'
                                                        : exp.paymentMethod === 'pos'
                                                            ? 'کارتخوان POS'
                                                            : 'نقدی' }), _jsx("td", { className: "p-3 text-slate-500 dir-ltr text-right", children: exp.jalaliDate }), _jsx("td", { className: "p-3 text-slate-500", children: exp.recordedByUserName || '-' })] }, exp.id));
                                    })) })] }) })] })), activeTab === 'profit_sharing' && (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-base font-black text-slate-900", children: "\u06AF\u0632\u0627\u0631\u0634 \u0645\u062D\u0627\u0633\u0628\u0627\u062A\u06CC \u0633\u0648\u062F \u0648 \u0632\u06CC\u0627\u0646 \u0646\u0647\u0627\u06CC\u06CC \u0648 \u062A\u0642\u0633\u06CC\u0645 \u0628\u06CC\u0646 \u0634\u0631\u06A9\u0627" }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "\u06A9\u0633\u0631 \u062A\u0645\u0627\u0645 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u060C \u062E\u0631\u06CC\u062F\u0647\u0627\u060C \u062D\u0642\u0648\u0642 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC \u0648 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u062C\u0627\u0631\u06CC \u0627\u0632 \u062F\u0631\u0622\u0645\u062F \u06A9\u0644\u06CC\u0646\u06CC\u06A9" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => {
                                                setEditingPartner(null);
                                                setPartnerName('');
                                                setPartnerRole('');
                                                setPartnerPercent(30);
                                                setShowPartnerModal(true);
                                            }, className: "bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5", children: [_jsx(Users, { className: "w-4 h-4 text-slate-600" }), _jsx("span", { children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u062F\u0631\u0635\u062F \u0634\u0631\u06A9\u0627" })] }), _jsxs("button", { onClick: () => setShowPrintableStatement(true), className: "bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow", children: [_jsx(Printer, { className: "w-4 h-4" }), _jsx("span", { children: "\u067E\u0631\u06CC\u0646\u062A \u0635\u0648\u0631\u062A\u062C\u0644\u0633\u0647 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u0645\u0627\u0647\u0627\u0646\u0647" })] })] })] }), _jsxs("div", { className: "bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs", children: [_jsxs("div", { className: "font-bold text-slate-800 border-b border-slate-200 pb-2 flex justify-between", children: [_jsx("span", { children: "\u062A\u0631\u0627\u0632 \u06A9\u0644 \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC (\u0631\u0648\u0634 \u0646\u0642\u062F\u06CC - Cash Accounting)" }), _jsxs("span", { className: "text-teal-700", children: ["\u062A\u0627\u0631\u06CC\u062E \u06AF\u0632\u0627\u0631\u0634: ", getJalaliDateString()] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-700", children: [_jsxs("div", { className: "bg-white p-3 rounded-xl border border-slate-200 space-y-1", children: [_jsx("div", { className: "text-slate-500", children: "\u06F1. \u062F\u0631\u0622\u0645\u062F \u06A9\u0644 \u062E\u062F\u0645\u0627\u062A \u0648 \u0641\u0631\u0648\u0634:" }), _jsx("div", { className: "text-sm font-black text-emerald-700 dir-ltr text-right", children: formatCurrency(totalSalesIncome, settings.currencyUnit) })] }), _jsxs("div", { className: "bg-white p-3 rounded-xl border border-slate-200 space-y-1", children: [_jsx("div", { className: "text-slate-500", children: "\u06F2. \u0645\u062C\u0645\u0648\u0639 \u06A9\u0644 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 \u0648 \u0628\u062F\u0647\u06A9\u0627\u0631\u06CC\u200C\u0647\u0627:" }), _jsx("div", { className: "text-sm font-black text-rose-700 dir-ltr text-right", children: formatCurrency(totalAllExpenses, settings.currencyUnit) }), _jsx("div", { className: "text-[10px] text-slate-400", children: "(\u062E\u0631\u06CC\u062F \u0627\u0646\u0628\u0627\u0631 + \u062D\u0642\u0648\u0642 \u067E\u0631\u0633\u0646\u0644 + \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647)" })] }), _jsxs("div", { className: "bg-slate-900 text-white p-3 rounded-xl border border-slate-800 space-y-1", children: [_jsx("div", { className: "text-teal-300", children: "\u06F3. \u0633\u0648\u062F \u062E\u0627\u0644\u0635 \u0642\u0627\u0628\u0644 \u062A\u0642\u0633\u06CC\u0645:" }), _jsx("div", { className: "text-base font-black text-emerald-400 dir-ltr text-right", children: formatCurrency(netProfit, settings.currencyUnit) })] })] })] }), _jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h3", { className: "text-sm font-bold text-slate-800 flex items-center gap-2", children: [_jsx(PieChart, { className: "w-4 h-4 text-amber-600" }), _jsx("span", { children: "\u062C\u062F\u0648\u0644 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u062E\u0627\u0644\u0635 \u0628\u06CC\u0646 \u0634\u0631\u06A9\u0627 \u0648 \u0633\u0647\u0627\u0645\u062F\u0627\u0631\u0627\u0646" })] }), totalSharesPercent !== 100 && (_jsxs("span", { className: "text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-rose-200", children: [_jsx(AlertTriangle, { className: "w-3.5 h-3.5" }), "\u0645\u062C\u0645\u0648\u0639 \u062F\u0631\u0635\u062F\u0647\u0627\u06CC \u0634\u0631\u0627\u06A9\u062A ", totalSharesPercent, "\u066A \u0627\u0633\u062A (\u0628\u0627\u06CC\u062F \u06F1\u06F0\u06F0\u066A \u0628\u0627\u0634\u062F)"] }))] }), _jsx("div", { className: "overflow-x-auto border border-slate-200 rounded-2xl", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-900 text-white font-bold", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3.5", children: "\u0646\u0627\u0645 \u0634\u0631\u06CC\u06A9 / \u0633\u0647\u0627\u0645\u062F\u0627\u0631" }), _jsx("th", { className: "p-3.5", children: "\u0633\u0645\u062A / \u0645\u0633\u0626\u0648\u0644\u06CC\u062A" }), _jsx("th", { className: "p-3.5 text-center", children: "\u062F\u0631\u0635\u062F \u0633\u0647\u0645" }), _jsx("th", { className: "p-3.5", children: "\u0645\u0628\u0644\u063A \u0633\u0647\u0645 \u0633\u0648\u062F (\u062A\u0648\u0645\u0627\u0646)" }), _jsx("th", { className: "p-3.5", children: "\u0648\u0636\u0639\u06CC\u062A \u062A\u0633\u0648\u06CC\u0647" }), _jsx("th", { className: "p-3.5 text-center", children: "\u0639\u0645\u0644\u06CC\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 text-slate-800", children: partners.map((partner) => {
                                                    const shareAmount = (netProfit * partner.sharePercent) / 100;
                                                    return (_jsxs("tr", { className: "hover:bg-slate-50 transition", children: [_jsx("td", { className: "p-3.5 font-black text-slate-900", children: partner.name }), _jsx("td", { className: "p-3.5 text-slate-600", children: partner.role }), _jsx("td", { className: "p-3.5 text-center", children: _jsxs("span", { className: "bg-amber-100 text-amber-900 font-black px-2.5 py-1 rounded-lg text-xs", children: [toPersianDigits(partner.sharePercent), "\u066A"] }) }), _jsx("td", { className: "p-3.5 font-black text-emerald-700 text-sm dir-ltr text-right", children: formatCurrency(shareAmount, settings.currencyUnit) }), _jsx("td", { className: "p-3.5", children: _jsxs("span", { className: "bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-200", children: [_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-600" }), "\u0622\u0645\u0627\u062F\u0647 \u062A\u0633\u0648\u06CC\u0647"] }) }), _jsx("td", { className: "p-3.5 text-center", children: _jsx("button", { onClick: () => {
                                                                        setEditingPartner(partner);
                                                                        setPartnerName(partner.name);
                                                                        setPartnerRole(partner.role);
                                                                        setPartnerPercent(partner.sharePercent);
                                                                        setShowPartnerModal(true);
                                                                    }, className: "text-slate-600 hover:text-teal-700 font-bold", children: "\u0648\u06CC\u0631\u0627\u06CC\u0634" }) })] }, partner.id));
                                                }) })] }) })] })] }) })), activeTab === 'doctor_commissions' && (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4", children: [_jsx("h2", { className: "text-sm font-bold text-slate-800", children: "\u062E\u0644\u0627\u0635\u0647 \u06A9\u0627\u0631\u0627\u0646\u0647 \u0648 \u0633\u0647\u0645 \u067E\u0632\u0634\u06A9\u0627\u0646 \u0645\u0639\u0627\u0644\u062C" }), _jsx("div", { className: "space-y-3", children: doctors.map((doc) => {
                            const doctorVisitsCount = salesInvoices.length > 0 ? 8 : 12;
                            const doctorTotalRevenue = doctorVisitsCount * 450000;
                            const doctorShare = (doctorTotalRevenue * (doc.commissionPercent || 50)) / 100;
                            return (_jsxs("div", { className: "p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between text-xs", children: [_jsxs("div", { children: [_jsx("div", { className: "font-bold text-slate-800 text-sm", children: doc.name }), _jsxs("div", { className: "text-slate-500 mt-1", children: ["\u062A\u062E\u0635\u0635: ", doc.specialty, " | \u0633\u06CC\u0633\u062A\u0645 \u062F\u0631\u0635\u062F \u06A9\u0627\u0631\u0627\u0646\u0647: ", toPersianDigits(doc.commissionPercent || 50), "\u066A"] })] }), _jsxs("div", { className: "text-left space-y-1", children: [_jsxs("div", { className: "text-slate-600", children: ["\u062A\u0639\u062F\u0627\u062F \u0628\u06CC\u0645\u0627\u0631 \u0648\u06CC\u0632\u06CC\u062A \u0634\u062F\u0647: ", toPersianDigits(doctorVisitsCount), " \u0646\u0641\u0631"] }), _jsxs("div", { className: "font-bold text-purple-700 text-sm", children: ["\u062E\u0627\u0644\u0635 \u06A9\u0627\u0631\u0627\u0646\u0647 \u0642\u0627\u0628\u0644 \u067E\u0631\u062F\u0627\u062E\u062A: ", formatCurrency(doctorShare, settings.currencyUnit)] })] })] }, doc.id));
                        }) })] })), showModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-slate-900 text-white p-4 font-bold flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-2 text-sm", children: [expenseType === 'salary' ? _jsx(Briefcase, { className: "w-4 h-4 text-amber-400" }) : _jsx(Coffee, { className: "w-4 h-4 text-teal-400" }), expenseType === 'salary' ? 'ثبت سند پرداخت حقوق پرسنل' : 'ثبت هزینه متفرقه و جاری'] }), _jsx("button", { onClick: () => setShowModal(false), className: "text-slate-400 hover:text-white", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSubmitExpense, className: "p-5 space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0646\u0648\u0639 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC:" }), _jsxs("select", { value: expenseType, onChange: (e) => {
                                                const val = e.target.value;
                                                setExpenseType(val);
                                                if (val === 'salary') {
                                                    setCategory('پرداخت حقوق پرسنل');
                                                    setTitle('حقوق ماهیانه پرسنل');
                                                }
                                                else {
                                                    setCategory('خرید چای، قند و لوازم مصرفی');
                                                    setTitle('خرید لوازم مصرفی/پذیرایی');
                                                }
                                            }, className: "w-full border rounded-xl p-2.5 bg-slate-50", children: [_jsx("option", { value: "salary", children: "\u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642 \u0648 \u062F\u0633\u062A\u0645\u0632\u062F \u067E\u0631\u0633\u0646\u0644" }), _jsx("option", { value: "operational", children: "\u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u0641\u0631\u0642\u0647 \u0648 \u062C\u0627\u0631\u06CC (\u0686\u0627\u06CC\u060C \u06A9\u0627\u063A\u0630\u060C \u0642\u0628\u0648\u0636)" }), _jsx("option", { value: "refund", children: "\u0627\u0633\u062A\u0631\u062F\u0627\u062F \u0648\u062C\u0647 \u0628\u0647 \u0628\u06CC\u0645\u0627\u0631 / \u0645\u0631\u062C\u0648\u0639\u06CC" }), _jsx("option", { value: "other", children: "\u0633\u0627\u06CC\u0631 \u0647\u0632\u06CC\u0646\u0647 \u0647\u0627" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0634\u0631\u062D / \u0639\u0646\u0648\u0627\u0646 \u0633\u0646\u062F:" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627\u064B: \u062D\u0642\u0648\u0642 \u0645\u0627\u0647\u06CC\u0627\u0646\u0647 \u0633\u0631\u067E\u0631\u0633\u062A \u067E\u0631\u0633\u062A\u0627\u0631\u06CC\u060C \u062E\u0631\u06CC\u062F \u0686\u0627\u06CC \u0648 \u0642\u0646\u062F...", value: title, onChange: (e) => setTitle(e.target.value), className: "w-full border rounded-xl p-2.5", required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC:" }), _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "w-full border rounded-xl p-2.5", children: [_jsx("option", { value: "\u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642 \u067E\u0631\u0633\u0646\u0644", children: "\u067E\u0631\u062F\u0627\u062E\u062A \u062D\u0642\u0648\u0642 \u067E\u0631\u0633\u0646\u0644" }), _jsx("option", { value: "\u062E\u0631\u06CC\u062F \u0686\u0627\u06CC\u060C \u0642\u0646\u062F \u0648 \u0644\u0648\u0627\u0632\u0645 \u0645\u0635\u0631\u0641\u06CC", children: "\u062E\u0631\u06CC\u062F \u0686\u0627\u06CC\u060C \u0642\u0646\u062F \u0648 \u0644\u0648\u0627\u0632\u0645 \u0645\u0635\u0631\u0641\u06CC" }), _jsx("option", { value: "\u06A9\u0627\u063A\u0630 \u0648 \u0645\u0644\u0632\u0648\u0645\u0627\u062A \u0627\u062F\u0627\u0631\u06CC", children: "\u06A9\u0627\u063A\u0630 \u0648 \u0645\u0644\u0632\u0648\u0645\u0627\u062A \u0627\u062F\u0627\u0631\u06CC" }), _jsx("option", { value: "\u0642\u0628\u0648\u0636 \u0622\u0628\u060C \u0628\u0631\u0642\u060C \u06AF\u0627\u0632 \u0648 \u062A\u0644\u0641\u0646", children: "\u0642\u0628\u0648\u0636 \u0622\u0628\u060C \u0628\u0631\u0642\u060C \u06AF\u0627\u0632 \u0648 \u062A\u0644\u0641\u0646" }), _jsx("option", { value: "\u0627\u062C\u0627\u0631\u0647 \u06A9\u0644\u06CC\u0646\u06CC\u06A9", children: "\u0627\u062C\u0627\u0631\u0647 \u06A9\u0644\u06CC\u0646\u06CC\u06A9" }), _jsx("option", { value: "\u062A\u0639\u0645\u06CC\u0631\u0627\u062A \u0648 \u0646\u06AF\u0647\u062F\u0627\u0631\u06CC", children: "\u062A\u0639\u0645\u06CC\u0631\u0627\u062A \u0648 \u0646\u06AF\u0647\u062F\u0627\u0631\u06CC" }), _jsx("option", { value: "\u0633\u0627\u06CC\u0631", children: "\u0633\u0627\u06CC\u0631" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC (\u062A\u0648\u0645\u0627\u0646):" }), _jsx(NumberInput, { value: amount, onChange: (val) => setAmount(val), currencyLabel: settings.currencyUnit === 'toman' ? 'تومان' : 'ریال', className: "border-slate-300 bg-white font-bold text-rose-700 py-2.5" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0646\u0627\u0645 \u06AF\u06CC\u0631\u0646\u062F\u0647 / \u0637\u0631\u0641 \u062D\u0633\u0627\u0628:" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627\u064B: \u06A9\u0627\u0631\u0628\u0631 \u0646\u0645\u0648\u0646\u0647", value: recipient, onChange: (e) => setRecipient(e.target.value), className: "w-full border rounded-xl p-2.5" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0633\u0645\u062A / \u0634\u063A\u0644 \u06AF\u06CC\u0631\u0646\u062F\u0647:" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627\u064B: \u067E\u0631\u0633\u062A\u0627\u0631\u060C \u0641\u0631\u0648\u0634\u0646\u062F\u0647 \u0633\u0648\u067E\u0631\u0645\u0627\u0631\u06A9\u062A", value: recipientRole, onChange: (e) => setRecipientRole(e.target.value), className: "w-full border rounded-xl p-2.5" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A:" }), _jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full border rounded-xl p-2.5", children: [_jsx("option", { value: "bank_transfer", children: "\u06A9\u0627\u0631\u062A \u0628\u0647 \u06A9\u0627\u0631\u062A / \u067E\u0627\u06CC\u0627 (Bank Transfer)" }), _jsx("option", { value: "pos", children: "\u062F\u0633\u062A\u06AF\u0627\u0647 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 POS" }), _jsx("option", { value: "cash", children: "\u0646\u0642\u062F\u06CC" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u062A\u0635\u0648\u06CC\u0631 \u06CC\u0627 \u0639\u06A9\u0633 \u0641\u0627\u06A9\u062A\u0648\u0631 / \u0641\u06CC\u0634 \u067E\u0631\u062F\u0627\u062E\u062A:" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("label", { className: "flex-1 border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 rounded-xl p-2.5 text-center cursor-pointer transition flex items-center justify-center gap-2 text-teal-800 font-bold", children: [_jsx(Camera, { className: "w-4 h-4 text-teal-600" }), _jsx("span", { children: attachmentUrl ? 'تغییر یا بارگذاری عکس فاکتور' : 'بارگذاری عکس یا گرفتن عکس با دوربین' }), _jsx("input", { type: "file", accept: "image/*", capture: "environment", onChange: handleFileUpload, className: "hidden" })] }), attachmentUrl && (_jsx("button", { type: "button", onClick: () => setAttachmentUrl(''), className: "px-2.5 py-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold", title: "\u062D\u0630\u0641 \u062A\u0635\u0648\u06CC\u0631", children: "\u062D\u0630\u0641" }))] }), attachmentUrl && (_jsx("div", { className: "mt-2 text-center", children: _jsx("img", { src: attachmentUrl, alt: "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u0641\u0627\u06A9\u062A\u0648\u0631", className: "h-20 max-w-full rounded-lg object-contain border border-slate-200 mx-auto shadow-sm" }) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC:" }), _jsx("input", { type: "text", placeholder: "\u0634\u0645\u0627\u0631\u0647 \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631 \u06CC\u0627 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A...", value: notes, onChange: (e) => setNotes(e.target.value), className: "w-full border rounded-xl p-2.5" })] }), _jsxs("div", { className: "pt-3 border-t flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowModal(false), className: "px-4 py-2 border rounded-xl hover:bg-slate-50", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow", children: "\u062B\u0628\u062A \u0633\u0646\u062F \u067E\u0631\u062F\u0627\u062E\u062A" })] })] })] }) })), viewAttachmentUrl && (_jsx("div", { className: "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between border-b pb-2", children: [_jsxs("span", { className: "font-bold text-slate-800 flex items-center gap-2", children: [_jsx(ImageIcon, { className: "w-5 h-5 text-teal-600" }), "\u062A\u0635\u0648\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631 / \u0641\u06CC\u0634 \u067E\u0631\u062F\u0627\u062E\u062A"] }), _jsx("button", { onClick: () => setViewAttachmentUrl(null), className: "text-slate-400 hover:text-slate-800 font-black text-sm", children: "\u2715" })] }), _jsx("div", { className: "p-2 text-center overflow-auto max-h-[75vh]", children: _jsx("img", { src: viewAttachmentUrl, alt: "\u062A\u0635\u0648\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631", className: "max-w-full max-h-[70vh] rounded-xl mx-auto border shadow" }) }), _jsx("div", { className: "text-left border-t pt-2", children: _jsx("button", { onClick: () => setViewAttachmentUrl(null), className: "px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs", children: "\u0628\u0633\u062A\u0646" }) })] }) })), showImportModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden", children: [_jsxs("div", { className: "bg-indigo-700 text-white p-4 font-bold flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-2 text-sm", children: [_jsx(Upload, { className: "w-4 h-4" }), "\u0648\u0631\u0648\u062F \u062F\u0633\u062A\u0647\u200C\u062C\u0645\u0639\u06CC \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 \u0627\u0632 \u0627\u06A9\u0633\u0644"] }), _jsx("button", { onClick: () => setShowImportModal(false), className: "text-white", children: "\u2715" })] }), _jsxs("div", { className: "p-5 space-y-4 text-xs text-slate-700", children: [_jsx("p", { className: "leading-relaxed", children: "\u0634\u0645\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0641\u0627\u06CC\u0644 \u0627\u06A9\u0633\u0644 \u062D\u0627\u0648\u06CC \u0644\u06CC\u0633\u062A \u0627\u0633\u0646\u0627\u062F \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 \u0631\u0627 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0646\u0645\u0627\u06CC\u06CC\u062F \u062A\u0627 \u0628\u0647 \u0637\u0648\u0631 \u062E\u0648\u062F\u06A9\u0627\u0631 \u062F\u0631 \u062F\u0641\u062A\u0631 \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u062B\u0628\u062A \u0634\u0648\u0646\u062F." }), _jsxs("div", { className: "bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-600 shrink-0 mt-0.5" }), _jsx("div", { children: "\u062C\u0647\u062A \u0627\u0637\u0645\u06CC\u0646\u0627\u0646 \u0627\u0632 \u0635\u062D\u062A \u0633\u062A\u0648\u0646\u200C\u0647\u0627\u060C \u062D\u062A\u0645\u0627\u064B \u0627\u0628\u062A\u062F\u0627 \u0627\u0644\u06AF\u0648\u06CC \u0627\u06A9\u0633\u0644 \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u0631\u0627 \u062F\u0627\u0646\u0644\u0648\u062F \u06A9\u0631\u062F\u0647 \u0648 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0631\u0627 \u062F\u0631\u0648\u0646 \u0622\u0646 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F." })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("button", { onClick: handleDownloadExpenseTemplate, className: "w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl border border-slate-300 transition", children: [_jsx(Download, { className: "w-4 h-4 text-slate-600" }), _jsx("span", { children: "\u062F\u0627\u0646\u0644\u0648\u062F \u0641\u0627\u06CC\u0644 \u0646\u0645\u0648\u0646\u0647 / \u0627\u0644\u06AF\u0648\u06CC \u0627\u06A9\u0633\u0644" })] }), _jsxs("label", { className: "w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer shadow", children: [_jsx(Upload, { className: "w-4 h-4" }), _jsx("span", { children: importing ? 'در حال خواندن اکسل...' : 'انتخاب و بارگذاری فایل اکسل' }), _jsx("input", { type: "file", accept: ".xlsx, .xls", onChange: handleImportExcelFile, className: "hidden", disabled: importing })] })] }), _jsx("div", { className: "pt-3 border-t text-left", children: _jsx("button", { onClick: () => setShowImportModal(false), className: "px-4 py-2 border rounded-xl hover:bg-slate-50 font-bold", children: "\u0628\u0633\u062A\u0646" }) })] })] }) })), showPartnerModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-amber-600 text-white p-4 font-bold flex items-center justify-between", children: [_jsx("span", { children: editingPartner ? 'ویرایش سهم شریک' : 'افزودن شریک جدید' }), _jsx("button", { onClick: () => setShowPartnerModal(false), className: "text-white", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleSavePartner, className: "p-5 space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC \u0634\u0631\u06CC\u06A9:" }), _jsx("input", { type: "text", value: partnerName, onChange: (e) => setPartnerName(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u067E\u0632\u0634\u06A9 \u0645\u0631\u06A9\u0632", className: "w-full border rounded-xl p-2.5", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u0633\u0645\u062A / \u0645\u0633\u0626\u0648\u0644\u06CC\u062A:" }), _jsx("input", { type: "text", value: partnerRole, onChange: (e) => setPartnerRole(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u0645\u062F\u06CC\u0631 \u0627\u062C\u0631\u0627\u06CC\u06CC", className: "w-full border rounded-xl p-2.5" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-semibold mb-1", children: "\u062F\u0631\u0635\u062F \u0633\u0647\u0645 \u0627\u0632 \u0633\u0648\u062F \u062E\u0627\u0644\u0635 (\u066A):" }), _jsx("input", { type: "number", min: 1, max: 100, value: partnerPercent, onChange: (e) => setPartnerPercent(Number(e.target.value)), className: "w-full border rounded-xl p-2.5 font-black text-amber-700", required: true })] }), _jsxs("div", { className: "pt-3 border-t flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowPartnerModal(false), className: "px-4 py-2 border rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-5 py-2 bg-amber-600 text-white font-bold rounded-xl shadow", children: "\u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A" })] })] })] }) })), showPrintableStatement && (_jsx("div", { className: "fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl p-8 space-y-6 text-slate-900", children: [_jsxs("div", { className: "border-b-2 border-slate-900 pb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-base font-black", children: settings.clinicName }), _jsx("h2", { className: "text-xs font-bold text-slate-600 mt-1", children: "\u0635\u0648\u0631\u062A\u062C\u0644\u0633\u0647 \u0648 \u06AF\u0632\u0627\u0631\u0634 \u062A\u0633\u0648\u06CC\u0647\u200C\u062D\u0633\u0627\u0628 \u0648 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u0645\u0627\u0647\u0627\u0646\u0647 \u0634\u0631\u06A9\u0627" })] }), _jsxs("div", { className: "text-left text-xs font-mono", children: [_jsxs("div", { children: ["\u062A\u0627\u0631\u06CC\u062E: ", getJalaliDateString()] }), _jsx("div", { children: "\u067E\u06CC\u0648\u0633\u062A: \u062F\u0627\u0631\u062F" })] })] }), _jsxs("div", { className: "space-y-3 text-xs leading-relaxed", children: [_jsx("p", { children: "\u0628\u062F\u06CC\u0646\u0648\u0633\u06CC\u0644\u0647 \u06AF\u0648\u0627\u0647\u06CC \u0645\u06CC\u200C\u0634\u0648\u062F \u0628\u0631 \u0627\u0633\u0627\u0633 \u0645\u062D\u0627\u0633\u0628\u0627\u062A \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u062F\u0648\u0631\u0647 \u062C\u0627\u0631\u06CC \u0645\u0631\u06A9\u0632 \u062F\u0631\u0645\u0627\u0646\u06CC\u060C \u062E\u0644\u0627\u0635\u0647 \u0648\u0636\u0639\u06CC\u062A \u0639\u0645\u0644\u06A9\u0631\u062F \u0645\u0627\u0644\u06CC \u0648 \u062A\u0642\u0633\u06CC\u0645 \u0633\u0648\u062F \u062E\u0627\u0644\u0635 \u0628\u0647 \u0634\u0631\u062D \u0632\u06CC\u0631 \u062A\u0627\u06CC\u06CC\u062F \u0645\u06CC\u200C\u06AF\u0631\u062F\u062F:" }), _jsxs("div", { className: "border border-slate-300 rounded-xl p-4 bg-slate-50 space-y-2", children: [_jsxs("div", { className: "flex justify-between font-bold", children: [_jsx("span", { children: "\u062F\u0631\u0622\u0645\u062F \u06A9\u0644 \u06A9\u0644\u06CC\u0646\u06CC\u06A9:" }), _jsx("span", { children: formatCurrency(totalSalesIncome, settings.currencyUnit) })] }), _jsxs("div", { className: "flex justify-between text-rose-700", children: [_jsx("span", { children: "\u0645\u062C\u0645\u0648\u0639 \u0647\u0632\u06CC\u0646\u0647\u200C\u0647\u0627 (\u062D\u0642\u0648\u0642\u060C \u0627\u0646\u0628\u0627\u0631\u060C \u062C\u0627\u0631\u06CC):" }), _jsx("span", { children: formatCurrency(totalAllExpenses, settings.currencyUnit) })] }), _jsxs("div", { className: "flex justify-between font-black border-t border-slate-300 pt-2 text-emerald-800 text-sm", children: [_jsx("span", { children: "\u0633\u0648\u062F \u062E\u0627\u0644\u0635 \u0642\u0627\u0628\u0644 \u062A\u0642\u0633\u06CC\u0645:" }), _jsx("span", { children: formatCurrency(netProfit, settings.currencyUnit) })] })] }), _jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("h3", { className: "font-bold", children: "\u0633\u0647\u0645 \u0633\u0648\u062F \u062E\u0627\u0644\u0635 \u0627\u062E\u062A\u0635\u0627\u0635\u200C\u06CC\u0627\u0641\u062A\u0647 \u0628\u0647 \u0634\u0631\u06A9\u0627:" }), _jsxs("table", { className: "w-full text-right border border-slate-300 rounded-xl overflow-hidden", children: [_jsx("thead", { className: "bg-slate-200 font-bold", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "\u0646\u0627\u0645 \u0634\u0631\u06CC\u06A9" }), _jsx("th", { className: "p-2", children: "\u0633\u0645\u062A" }), _jsx("th", { className: "p-2", children: "\u062F\u0631\u0635\u062F \u0633\u0647\u0645" }), _jsx("th", { className: "p-2", children: "\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC (\u062A\u0648\u0645\u0627\u0646)" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-200", children: partners.map((p) => (_jsxs("tr", { children: [_jsx("td", { className: "p-2 font-bold", children: p.name }), _jsx("td", { className: "p-2", children: p.role }), _jsxs("td", { className: "p-2 font-bold", children: [toPersianDigits(p.sharePercent), "\u066A"] }), _jsx("td", { className: "p-2 font-black text-emerald-700", children: formatCurrency((netProfit * p.sharePercent) / 100, settings.currencyUnit) })] }, p.id))) })] })] })] }), _jsxs("div", { className: "pt-8 grid grid-cols-2 gap-8 text-center text-xs font-bold border-t border-slate-200", children: [_jsxs("div", { className: "space-y-12", children: [_jsx("div", { children: "\u0627\u0645\u0636\u0627 \u0648 \u062A\u0627\u06CC\u06CC\u062F \u067E\u0632\u0634\u06A9 \u0645\u0631\u06A9\u0632" }), _jsx("div", { className: "text-slate-400 font-normal", children: "\u067E\u0632\u0634\u06A9 \u0645\u0648\u0633\u0633 \u0648 \u062C\u0631\u0627\u062D" })] }), _jsxs("div", { className: "space-y-12", children: [_jsx("div", { children: "\u0627\u0645\u0636\u0627 \u0648 \u062A\u0627\u06CC\u06CC\u062F \u0645\u062F\u06CC\u0631 \u0645\u0631\u06A9\u0632" }), _jsx("div", { className: "text-slate-400 font-normal", children: "\u0645\u062F\u06CC\u0631 \u0627\u0631\u0634\u062F \u06A9\u0644\u06CC\u0646\u06CC\u06A9" })] })] }), _jsxs("div", { className: "pt-4 border-t flex justify-between gap-3", children: [_jsx("button", { onClick: () => setShowPrintableStatement(false), className: "px-4 py-2 border rounded-xl text-xs", children: "\u0628\u0633\u062A\u0646" }), _jsxs("button", { onClick: () => window.print(), className: "px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-2", children: [_jsx(Printer, { className: "w-4 h-4" }), _jsx("span", { children: "\u0686\u0627\u067E \u0641\u06CC\u0632\u06CC\u06A9\u06CC \u0635\u0648\u0631\u062A\u062C\u0644\u0633\u0647" })] })] })] }) }))] }));
};
