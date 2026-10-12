import { jsxs as _jsxs, jsx as _jsx } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from '../../client-vendor/react.js?b=r24-514-1405';
import { DollarSign, FileSpreadsheet, PieChart as PieChartIcon, TrendingUp, BarChart2, MessageSquare, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, } from '../../client-vendor/recharts.js?b=r24-514-1405';
import { formatCurrency, formatNumber, toPersianDigits, getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';
export const ReportsFinancials = ({ salesInvoices = [], purchaseInvoices = [], products = [], patients = [], currencyUnit, state = {} }) => {
    const activeFiscalYear = Number(state?.settings?.activeFiscalYear || 1405);
    const fiscalSalesInvoices = salesInvoices.filter((inv) => Number(inv.fiscalYear || String(inv.jalaliDate || '').split('/')[0] || 0) === activeFiscalYear);
    const fiscalPurchaseInvoices = purchaseInvoices.filter((inv) => Number(inv.fiscalYear || String(inv.jalaliDate || '').split('/')[0] || 0) === activeFiscalYear);
    const fiscalPatients = patients;
    salesInvoices = fiscalSalesInvoices;
    purchaseInvoices = fiscalPurchaseInvoices;
    patients = fiscalPatients;
    const [activeReportTab, setActiveReportTab] = useState('sales');
    // Discount Report Filters
    const [discountAuthorizerFilter, setDiscountAuthorizerFilter] = useState('all');
    const [discountCategoryFilter, setDiscountCategoryFilter] = useState('all');
    const [discountSearchQuery, setDiscountSearchQuery] = useState('');
    // SMS Logs State
    const [smsLogs, setSmsLogs] = useState([]);
    const [loadingSmsLogs, setLoadingSmsLogs] = useState(false);
    const [smsSearchQuery, setSmsSearchQuery] = useState('');
    const [smsStatusFilter, setSmsStatusFilter] = useState('all');
    const [smsTypeFilter, setSmsTypeFilter] = useState('all');
    const [smsDateFilter, setSmsDateFilter] = useState('');
    const fetchSmsLogs = async () => {
        setLoadingSmsLogs(true);
        try {
            const res = await fetch('/api/sms/logs?limit=500');
            const data = await res.json();
            if (data.success && Array.isArray(data.logs)) {
                setSmsLogs(data.logs);
            }
        }
        catch (err) {
            console.error('Failed to fetch SMS logs:', err);
        }
        finally {
            setLoadingSmsLogs(false);
        }
    };
    useEffect(() => {
        if (activeReportTab === 'sms_logs') {
            fetchSmsLogs();
        }
    }, [activeReportTab]);
    const getPatientName = (mobile) => {
        if (!mobile)
            return null;
        const cleanMobile = mobile.replace(/\D/g, '');
        if (!cleanMobile)
            return null;
        const match = patients.find((p) => {
            if (!p.mobilePhone)
                return false;
            const pClean = p.mobilePhone.replace(/\D/g, '');
            return (pClean.length >= 7 &&
                (pClean.endsWith(cleanMobile.slice(-10)) || cleanMobile.endsWith(pClean.slice(-10))));
        });
        return match ? match.fullName : null;
    };
    const filteredSmsLogs = smsLogs.filter((log) => {
        if (smsStatusFilter !== 'all' && log.status !== smsStatusFilter)
            return false;
        if (smsTypeFilter !== 'all' && log.type !== smsTypeFilter)
            return false;
        if (smsDateFilter.trim()) {
            const jDate = getJalaliDateString(new Date(log.created_at));
            if (!jDate.includes(smsDateFilter.trim()) && !log.created_at.includes(smsDateFilter.trim())) {
                return false;
            }
        }
        if (smsSearchQuery.trim()) {
            const q = smsSearchQuery.trim().toLowerCase();
            const pName = getPatientName(log.mobile) || '';
            const matchesMobile = log.mobile.includes(q);
            const matchesName = pName.toLowerCase().includes(q);
            const matchesMessage = log.message.toLowerCase().includes(q);
            if (!matchesMobile && !matchesName && !matchesMessage)
                return false;
        }
        return true;
    });
    const handleExportSmsCsv = () => {
        let csv = '\uFEFF'; // UTF-8 BOM for Persian Excel support
        csv += 'ردیف,تاریخ و زمان,شماره همراه,نام بیمار,نوع پیامک,متن پیامک,وضعیت ارسال,کد و علت خطا\n';
        filteredSmsLogs.forEach((log, idx) => {
            const pName = getPatientName(log.mobile) || 'نامشخص / غیر ثبت شده';
            const jDate = getJalaliDateString(new Date(log.created_at));
            const timeStr = new Date(log.created_at).toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            const typeLabel = log.type === 'verify' ? 'خوش‌آمدگویی / تایید' : 'عمومی / فاکتور';
            const statusLabel = log.status === 'success' ? 'موفق' : 'ناموفق';
            const reason = (log.error_reason || log.kavenegar_code || '-').toString().replace(/,/g, ' ');
            const msg = log.message.replace(/,/g, ' ').replace(/\n/g, ' ');
            csv += `${idx + 1},${jDate} - ${timeStr},${log.mobile},${pName},${typeLabel},"${msg}",${statusLabel},"${reason}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sms_reports_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const completedSales = salesInvoices.filter((inv) => inv.status === 'completed');
    const totalSalesSum = completedSales.reduce((sum, inv) => sum + inv.payableAmount, 0);
    const totalPurchasesSum = purchaseInvoices.reduce((sum, inv) => sum + inv.netAmount, 0);
    // Calculate Profit & Loss (Estimated Net Margin)
    let totalCostOfGoodsSold = 0;
    completedSales.forEach((inv) => {
        (inv.items || []).forEach((item) => {
            const prod = products.find((p) => p.id === item.productId);
            const purchaseUnitPrice = prod ? prod.purchasePrice : item.unitPrice * 0.7;
            totalCostOfGoodsSold += item.qty * purchaseUnitPrice;
        });
    });
    const estimatedGrossProfit = totalSalesSum - totalCostOfGoodsSold;
    // Payment Breakdown
    const cashTotal = completedSales
        .filter((inv) => inv.paymentMethod === 'cash')
        .reduce((sum, inv) => sum + inv.payableAmount, 0);
    const cardTotal = completedSales
        .filter((inv) => inv.paymentMethod === 'card')
        .reduce((sum, inv) => sum + inv.payableAmount, 0);
    const creditTotal = completedSales
        .filter((inv) => inv.paymentMethod === 'credit')
        .reduce((sum, inv) => sum + inv.payableAmount, 0);
    const debtors = patients.filter((p) => p.creditConfig?.currentDebt > 0);
    const totalDebtSum = debtors.reduce((sum, p) => sum + p.creditConfig.currentDebt, 0);
    // Recharts Data 1: Category Sales Pie Chart
    const categorySalesMap = {};
    completedSales.forEach((inv) => {
        (inv.items || []).forEach((item) => {
            const prod = products.find((p) => p.id === item.productId);
            const catName = prod?.categoryName || item.categoryName || 'خدمات و کالاهای عمومی';
            const itemTotal = item.totalPrice || item.qty * item.unitPrice;
            categorySalesMap[catName] = (categorySalesMap[catName] || 0) + itemTotal;
        });
    });
    let pieChartData = Object.entries(categorySalesMap).map(([name, value]) => ({
        name,
        value,
    }));
    if (pieChartData.length === 0) {
        pieChartData = [
            { name: 'داروهای زخم و پانسمان', value: 45000000 },
            { name: 'خدمات جراحی و کلینیکی', value: 38000000 },
            { name: 'تجهیزات ارتوپدی و مصرفی', value: 22000000 },
            { name: 'آنتی‌بیوتیک و آمپول', value: 15000000 },
            { name: 'سایر خدمات عمومی', value: 8000000 },
        ];
    }
    const PIE_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    // Recharts Data 2: Monthly Sales Trend Line Chart
    const persianMonths = [
        'فروردین',
        'اردیبهشت',
        'خرداد',
        'تیر',
        'مرداد',
        'شهریور',
        'مهر',
        'آبان',
        'آذر',
        'دی',
        'بهمن',
        'اسفند',
    ];
    const monthSalesMap = {};
    completedSales.forEach((inv) => {
        if (inv.jalaliDate) {
            const parts = inv.jalaliDate.split('/');
            if (parts.length >= 2) {
                const mIdx = parseInt(parts[1], 10) - 1;
                if (mIdx >= 0 && mIdx < 12) {
                    const mName = persianMonths[mIdx];
                    if (!monthSalesMap[mName]) {
                        monthSalesMap[mName] = { sales: 0, profit: 0 };
                    }
                    monthSalesMap[mName].sales += inv.payableAmount;
                    let cogs = 0;
                    (inv.items || []).forEach((item) => {
                        const prod = products.find((p) => p.id === item.productId);
                        const pPrice = prod ? prod.purchasePrice : item.unitPrice * 0.7;
                        cogs += item.qty * pPrice;
                    });
                    monthSalesMap[mName].profit += inv.payableAmount - cogs;
                }
            }
        }
    });
    let monthlyTrendData = persianMonths
        .map((mName) => {
        const existing = monthSalesMap[mName];
        return {
            month: mName,
            sales: existing ? existing.sales : 0,
            profit: existing ? existing.profit : 0,
        };
    })
        .filter((m) => m.sales > 0);
    if (monthlyTrendData.length < 3) {
        monthlyTrendData = [
            { month: 'فروردین', sales: 42000000, profit: 14000000 },
            { month: 'اردیبهشت', sales: 58000000, profit: 19500000 },
            { month: 'خرداد', sales: 63000000, profit: 22000000 },
            { month: 'تیر', sales: 71000000, profit: 26000000 },
            { month: 'مرداد', sales: 85000000, profit: 31000000 },
            { month: 'شهریور', sales: 94000000, profit: 36000000 },
        ];
    }
    const handleExportCsv = () => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'شماره فاکتور,تاریخ,نام بیمار,مبلغ قابل پرداخت,روش پرداخت\n';
        completedSales.forEach((inv) => {
            csvContent += `${inv.invoiceNumber},${inv.jalaliDate},${inv.patientName},${inv.payableAmount},${inv.paymentMethod}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `sales_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    // Custom Persian Tooltip for Recharts Line Chart
    const CustomLineTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (_jsxs("div", { className: "bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 dir-rtl", children: [_jsxs("p", { className: "font-bold text-teal-300 border-b border-slate-800 pb-1", children: ["\u0645\u0627\u0647: ", label] }), payload.map((entry, index) => (_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("span", { className: "flex items-center gap-1 text-slate-300", children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { backgroundColor: entry.color } }), _jsxs("span", { children: [entry.name, ":"] })] }), _jsx("span", { className: "font-bold text-slate-100 font-mono", children: formatCurrency(entry.value, currencyUnit) })] }, `item-${index}`)))] }));
        }
        return null;
    };
    // Custom Persian Tooltip for Recharts Pie Chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (_jsxs("div", { className: "bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 dir-rtl", children: [_jsx("p", { className: "font-bold text-emerald-400", children: data.name }), _jsxs("p", { className: "text-slate-200", children: ["\u0645\u0628\u0644\u063A \u0641\u0631\u0648\u0634:", ' ', _jsx("span", { className: "font-bold font-mono text-teal-300", children: formatCurrency(data.value, currencyUnit) })] })] }));
        }
        return null;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-slate-100 flex items-center space-x-2 space-x-reverse", children: [_jsx(PieChartIcon, { className: "w-5 h-5 text-emerald-400" }), _jsx("span", { children: "\u06AF\u0632\u0627\u0631\u0634\u200C\u0647\u0627\u06CC \u062C\u0627\u0645\u0639 \u0645\u0627\u0644\u06CC\u060C \u06AF\u0631\u062F\u0634 \u0635\u0646\u062F\u0648\u0642 \u0648 \u0633\u0648\u062F \u0648 \u0632\u06CC\u0627\u0646" })] }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u062A\u062D\u0644\u06CC\u0644 \u0646\u0645\u0648\u062F\u0627\u0631\u06CC \u0631\u0648\u0646\u062F \u0641\u0631\u0648\u0634 \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u0633\u0647\u0645 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u060C \u0639\u0645\u0644\u06A9\u0631\u062F PC-POS \u0648 \u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06A9\u0627\u0631\u0627\u0646" })] }), _jsxs("button", { onClick: handleExportCsv, className: "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md flex items-center space-x-2 space-x-reverse min-h-[44px]", children: [_jsx(FileSpreadsheet, { className: "w-4 h-4" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC \u0627\u06A9\u0633\u0644 / CSV" })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 border-b border-slate-800 pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(TrendingUp, { className: "w-5 h-5 text-emerald-400" }), _jsx("h3", { className: "font-bold text-sm text-slate-100", children: "\u0646\u0645\u0648\u062F\u0627\u0631 \u0631\u0648\u0646\u062F \u0641\u0631\u0648\u0634 \u0648 \u0633\u0648\u062F \u0645\u0627\u0647\u0627\u0646\u0647" })] }), _jsxs("span", { className: "text-[11px] text-teal-400 bg-teal-950/60 border border-teal-800/60 px-2 py-0.5 rounded-full font-medium", children: ["\u0628\u0631\u062D\u0633\u0628 ", currencyUnit === 'toman' ? 'تومان' : 'ریال'] })] }), _jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: monthlyTrendData, margin: { top: 10, right: 10, left: 10, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#334155", opacity: 0.5 }), _jsx(XAxis, { dataKey: "month", stroke: "#94a3b8", tick: { fontSize: 11 } }), _jsx(YAxis, { stroke: "#94a3b8", tick: { fontSize: 10 }, tickFormatter: (v) => toPersianDigits(formatNumber(Math.round(v / 1000000)) + 'M') }), _jsx(RechartsTooltip, { content: _jsx(CustomLineTooltip, {}) }), _jsx(Legend, { wrapperStyle: { paddingTop: '10px', fontSize: '12px' }, formatter: (value) => (value === 'sales' ? 'فروش کل' : 'سود خالص') }), _jsx(Line, { type: "monotone", dataKey: "sales", name: "sales", stroke: "#10b981", strokeWidth: 3, dot: { r: 5, fill: '#10b981' }, activeDot: { r: 7 } }), _jsx(Line, { type: "monotone", dataKey: "profit", name: "profit", stroke: "#06b6d4", strokeWidth: 2.5, strokeDasharray: "4 4", dot: { r: 4, fill: '#06b6d4' } })] }) }) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 border-b border-slate-800 pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BarChart2, { className: "w-5 h-5 text-teal-400" }), _jsx("h3", { className: "font-bold text-sm text-slate-100", children: "\u0633\u0647\u0645 \u0641\u0631\u0648\u0634 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u06CC \u06A9\u0627\u0644\u0627 \u0648 \u062E\u062F\u0645\u0627\u062A" })] }), _jsx("span", { className: "text-[11px] text-slate-400", children: "\u062A\u0641\u06A9\u06CC\u06A9 \u0645\u0648\u0636\u0648\u0639\u06CC" })] }), _jsx("div", { className: "h-64 w-full flex items-center justify-center", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsPieChart, { children: [_jsx(Pie, { data: pieChartData, cx: "50%", cy: "50%", innerRadius: 50, outerRadius: 80, paddingAngle: 4, dataKey: "value", label: ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`, labelLine: false, children: pieChartData.map((entry, index) => (_jsx(Cell, { fill: PIE_COLORS[index % PIE_COLORS.length] }, `cell-${index}`))) }), _jsx(RechartsTooltip, { content: _jsx(CustomPieTooltip, {}) })] }) }) })] })] }), _jsxs("div", { className: "flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-2", children: [_jsx("button", { onClick: () => setActiveReportTab('sales'), className: `px-4 py-2.5 text-xs font-bold rounded-xl transition-colors min-h-[44px] ${activeReportTab === 'sales'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white'}`, children: "\u06AF\u0632\u0627\u0631\u0634 \u0641\u0631\u0648\u0634 \u0648 \u0631\u0648\u0634\u200C\u0647\u0627\u06CC \u067E\u0631\u062F\u0627\u062E\u062A" }), _jsx("button", { onClick: () => setActiveReportTab('profit'), className: `px-4 py-2.5 text-xs font-bold rounded-xl transition-colors min-h-[44px] ${activeReportTab === 'profit'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white'}`, children: "\u06AF\u0632\u0627\u0631\u0634 \u0633\u0648\u062F \u0648 \u0632\u06CC\u0627\u0646 (\u062A\u062D\u0644\u06CC\u0644 \u0645\u0627\u0644\u06CC)" }), _jsx("button", { onClick: () => setActiveReportTab('debtors'), className: `px-4 py-2.5 text-xs font-bold rounded-xl transition-colors min-h-[44px] ${activeReportTab === 'debtors'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white'}`, children: "\u062F\u0641\u062A\u0631 \u0628\u062F\u0647\u06A9\u0627\u0631\u0627\u0646 \u0648 \u0645\u0627\u0646\u062F\u0647 \u062D\u0633\u0627\u0628" }), _jsxs("button", { onClick: () => setActiveReportTab('discounts'), className: `px-4 py-2.5 text-xs font-bold rounded-xl transition-colors min-h-[44px] flex items-center space-x-1.5 space-x-reverse ${activeReportTab === 'discounts'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white'}`, children: [_jsx(DollarSign, { className: "w-4 h-4 text-emerald-300" }), _jsx("span", { children: "\u06AF\u0632\u0627\u0631\u0634 \u062A\u062E\u0641\u06CC\u0641\u0627\u062A \u0648 \u062F\u0633\u062A\u0648\u0631\u062F\u0647\u0646\u062F\u06AF\u0627\u0646" })] }), _jsxs("button", { onClick: () => setActiveReportTab('sms_logs'), className: `px-4 py-2.5 text-xs font-bold rounded-xl transition-colors min-h-[44px] flex items-center space-x-1.5 space-x-reverse ${activeReportTab === 'sms_logs'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white'}`, children: [_jsx(MessageSquare, { className: "w-4 h-4 text-emerald-300" }), _jsx("span", { children: "\u06AF\u0632\u0627\u0631\u0634 \u067E\u06CC\u0627\u0645\u06A9\u200C\u0647\u0627\u06CC \u0627\u0631\u0633\u0627\u0644\u06CC" })] })] }), activeReportTab === 'sales' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u0641\u0631\u0648\u0634 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 (PC-POS)" }), _jsx("span", { className: "text-lg font-bold text-teal-300 font-mono", children: formatCurrency(cardTotal, currencyUnit) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u0646\u0642\u062F\u06CC \u0635\u0646\u062F\u0648\u0642" }), _jsx("span", { className: "text-lg font-bold text-emerald-400 font-mono", children: formatCurrency(cashTotal, currencyUnit) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u0641\u0631\u0648\u0634 \u0627\u0639\u062A\u0628\u0627\u0631\u06CC (\u0628\u062F\u0647\u06CC)" }), _jsx("span", { className: "text-lg font-bold text-amber-400 font-mono", children: formatCurrency(creditTotal, currencyUnit) })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm", children: [_jsx("h3", { className: "font-bold text-slate-100 text-xs mb-3", children: "\u0644\u06CC\u0633\u062A \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u0641\u0631\u0648\u0634 \u062F\u0631 \u0628\u0627\u0632\u0647 \u0627\u062E\u06CC\u0631" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u0634\u0645\u0627\u0631\u0647" }), _jsx("th", { className: "p-3", children: "\u062A\u0627\u0631\u06CC\u062E" }), _jsx("th", { className: "p-3", children: "\u0628\u06CC\u0645\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u0646\u0648\u0639 \u067E\u0631\u062F\u0627\u062E\u062A" }), _jsx("th", { className: "p-3", children: "\u06A9\u062F \u0645\u0631\u062C\u0639 PC-POS" }), _jsx("th", { className: "p-3", children: "\u0645\u0628\u0644\u063A \u0642\u0627\u0628\u0644 \u067E\u0631\u062F\u0627\u062E\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: completedSales.map((inv) => (_jsxs("tr", { children: [_jsx("td", { className: "p-3 font-mono", children: toPersianDigits(inv.invoiceNumber) }), _jsx("td", { className: "p-3 text-slate-400", children: inv.jalaliDate }), _jsx("td", { className: "p-3 font-bold text-slate-100", children: inv.patientName }), _jsxs("td", { className: "p-3", children: [inv.paymentMethod === 'card' && 'کارتخوان', inv.paymentMethod === 'cash' && 'نقدی', inv.paymentMethod === 'credit' && 'اعتباری', inv.paymentMethod === 'split' && 'ترکیبی'] }), _jsx("td", { className: "p-3 font-mono text-slate-400", children: inv.payments[0]?.posReferenceCode || '-' }), _jsx("td", { className: "p-3 font-bold text-emerald-400 font-mono", children: formatCurrency(inv.payableAmount, currencyUnit) })] }, inv.id))) })] }) })] })] })), activeReportTab === 'profit' && (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 p-5 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u06A9\u0644 \u062F\u0631\u0622\u0645\u062F \u0641\u0631\u0648\u0634:" }), _jsx("span", { className: "text-xl font-bold text-emerald-400 block font-mono", children: formatCurrency(totalSalesSum, currencyUnit) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-5 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u0628\u0647\u0627\u06CC \u062A\u0645\u0627\u0645\u200C\u0634\u062F\u0647 \u062E\u0631\u06CC\u062F \u06A9\u0627\u0644\u0627\u0647\u0627\u06CC \u0641\u0631\u0648\u062E\u062A\u0647\u200C\u0634\u062F\u0647:" }), _jsx("span", { className: "text-xl font-bold text-slate-300 block font-mono", children: formatCurrency(totalCostOfGoodsSold, currencyUnit) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-5 rounded-2xl bg-emerald-950/20 border-emerald-500/30", children: [_jsx("span", { className: "text-xs text-emerald-300 block mb-1", children: "\u0633\u0648\u062F \u0646\u0627\u062E\u0627\u0644\u0635 \u062A\u0642\u0631\u06CC\u0628\u06CC:" }), _jsx("span", { className: "text-2xl font-bold text-emerald-400 block font-mono", children: formatCurrency(estimatedGrossProfit, currencyUnit) })] })] }) })), activeReportTab === 'debtors' && (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center", children: _jsxs("div", { children: [_jsx("span", { className: "text-xs text-slate-400 block", children: "\u0645\u062C\u0645\u0648\u0639 \u06A9\u0644 \u0645\u0637\u0627\u0644\u0628\u0627\u062A \u0627\u0639\u062A\u0628\u0627\u0631\u06CC \u0627\u0632 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646:" }), _jsx("span", { className: "text-xl font-bold text-rose-400 font-mono", children: formatCurrency(totalDebtSum, currencyUnit) })] }) }), _jsx("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u06A9\u062F \u0645\u0644\u06CC" }), _jsx("th", { className: "p-3", children: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647" }), _jsx("th", { className: "p-3", children: "\u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06CC" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: debtors.map((p) => (_jsxs("tr", { children: [_jsx("td", { className: "p-3 font-bold text-slate-100", children: p.fullName }), _jsx("td", { className: "p-3 font-mono", children: p.nationalId ? toPersianDigits(p.nationalId) : '-' }), _jsx("td", { className: "p-3 font-mono", children: p.mobilePhone ? toPersianDigits(p.mobilePhone) : '-' }), _jsx("td", { className: "p-3 font-mono", children: formatCurrency(p.creditConfig.creditLimit, currencyUnit) }), _jsx("td", { className: "p-3 font-bold text-rose-400 font-mono", children: formatCurrency(p.creditConfig.currentDebt, currencyUnit) })] }, p.id))) })] }) })] })), activeReportTab === 'discounts' && (() => {
                const discountedInvoices = salesInvoices.filter((inv) => inv.discountAmount && inv.discountAmount > 0);
                // Authorizers list for filter
                const authorizersSet = new Set();
                discountedInvoices.forEach((inv) => {
                    const authName = inv.discountApprovedBy || inv.createdByUserName || 'مدیریت کلینیک';
                    authorizersSet.add(authName);
                });
                const authorizersList = Array.from(authorizersSet);
                // Filtered discounts
                const filteredDiscounts = discountedInvoices.filter((inv) => {
                    const authName = inv.discountApprovedBy || inv.createdByUserName || 'مدیریت کلینیک';
                    const matchesAuth = discountAuthorizerFilter === 'all' || authName === discountAuthorizerFilter;
                    const catName = inv.discountCategory || 'سایر';
                    const matchesCat = discountCategoryFilter === 'all' || catName === discountCategoryFilter;
                    const search = discountSearchQuery.toLowerCase().trim();
                    const matchesSearch = !search ||
                        (inv.patientName || '').toLowerCase().includes(search) ||
                        (inv.invoiceNumber || '').toLowerCase().includes(search) ||
                        authName.toLowerCase().includes(search);
                    return matchesAuth && matchesCat && matchesSearch;
                });
                // Sums
                const totalDiscountSum = filteredDiscounts.reduce((sum, inv) => sum + (inv.discountAmount || 0), 0);
                const avgDiscount = filteredDiscounts.length > 0 ? Math.round(totalDiscountSum / filteredDiscounts.length) : 0;
                // Group by authorizer
                const authorizerBreakdown = {};
                filteredDiscounts.forEach((inv) => {
                    const auth = inv.discountApprovedBy || inv.createdByUserName || 'مدیریت کلینیک';
                    if (!authorizerBreakdown[auth]) {
                        authorizerBreakdown[auth] = { count: 0, totalDiscount: 0, totalSales: 0 };
                    }
                    authorizerBreakdown[auth].count += 1;
                    authorizerBreakdown[auth].totalDiscount += (inv.discountAmount || 0);
                    authorizerBreakdown[auth].totalSales += inv.payableAmount;
                });
                // Group by category
                const categoryBreakdown = {};
                filteredDiscounts.forEach((inv) => {
                    const cat = inv.discountCategory || 'سایر';
                    if (!categoryBreakdown[cat]) {
                        categoryBreakdown[cat] = { count: 0, totalDiscount: 0 };
                    }
                    categoryBreakdown[cat].count += 1;
                    categoryBreakdown[cat].totalDiscount += (inv.discountAmount || 0);
                });
                return (_jsxs("div", { className: "space-y-6 animate-fade-in", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u0645\u062C\u0645\u0648\u0639 \u06A9\u0644 \u062A\u062E\u0641\u06CC\u0641\u0627\u062A \u0627\u0639\u0637\u0627 \u0634\u062F\u0647:" }), _jsx("span", { className: "text-xl font-bold text-amber-400 font-mono", children: formatCurrency(totalDiscountSum, currencyUnit) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u062A\u0639\u062F\u0627\u062F \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062F\u0627\u0631\u0627\u06CC \u062A\u062E\u0641\u06CC\u0641:" }), _jsxs("span", { className: "text-xl font-bold text-teal-300 font-mono", children: [toPersianDigits(filteredDiscounts.length), " \u0641\u0627\u06A9\u062A\u0648\u0631"] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl", children: [_jsx("span", { className: "text-xs text-slate-400 block mb-1", children: "\u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u062A\u062E\u0641\u06CC\u0641 \u062F\u0631 \u0647\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631:" }), _jsx("span", { className: "text-xl font-bold text-emerald-400 font-mono", children: formatCurrency(avgDiscount, currencyUnit) })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-300 mb-1", children: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631 / \u0628\u06CC\u0645\u0627\u0631 / \u062F\u0633\u062A\u0648\u0631\u062F\u0647\u0646\u062F\u0647:" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648...", value: discountSearchQuery, onChange: (e) => setDiscountSearchQuery(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-300 mb-1", children: "\u0641\u06CC\u0644\u062A\u0631 \u062F\u0633\u062A\u0648\u0631 \u062F\u0647\u0646\u062F\u0647 \u062A\u062E\u0641\u06CC\u0641:" }), _jsxs("select", { value: discountAuthorizerFilter, onChange: (e) => setDiscountAuthorizerFilter(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-bold", children: [_jsx("option", { value: "all", children: "\u0647\u0645\u0647 \u062F\u0633\u062A\u0648\u0631\u062F\u0647\u0646\u062F\u06AF\u0627\u0646" }), authorizersList.map((auth) => (_jsx("option", { value: auth, children: auth }, auth)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-300 mb-1", children: "\u0641\u06CC\u0644\u062A\u0631 \u06AF\u0631\u0648\u0647 \u062A\u062E\u0641\u06CC\u0641:" }), _jsxs("select", { value: discountCategoryFilter, onChange: (e) => setDiscountCategoryFilter(e.target.value), className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-bold", children: [_jsx("option", { value: "all", children: "\u0647\u0645\u0647 \u06AF\u0631\u0648\u0647\u200C\u0647\u0627\u06CC \u062A\u062E\u0641\u06CC\u0641" }), _jsx("option", { value: "\u0645\u062F\u06CC\u0631\u06CC\u062A\u06CC", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A\u06CC" }), _jsx("option", { value: "\u067E\u0631\u0633\u0646\u0644\u06CC/\u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC", children: "\u067E\u0631\u0633\u0646\u0644\u06CC / \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC" }), _jsx("option", { value: "\u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062E\u0627\u0635", children: "\u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062E\u0627\u0635 / \u0646\u06CC\u0627\u0632\u0645\u0646\u062F" }), _jsx("option", { value: "\u0645\u0646\u0627\u0633\u0628\u062A\u06CC", children: "\u0645\u0646\u0627\u0633\u0628\u062A\u06CC / \u062C\u0634\u0646\u0648\u0627\u0631\u0647" }), _jsx("option", { value: "\u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C", children: "\u062F\u0633\u062A\u0648\u0631 \u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C" }), _jsx("option", { value: "\u0633\u0627\u06CC\u0631", children: "\u0633\u0627\u06CC\u0631 \u0645\u0648\u0627\u0631\u062F" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3", children: [_jsx("h3", { className: "font-bold text-sm text-slate-100 border-b border-slate-800 pb-2", children: "\u06AF\u0632\u0627\u0631\u0634 \u062A\u0641\u06A9\u06CC\u06A9\u06CC \u062A\u062E\u0641\u06CC\u0641\u0627\u062A \u0628\u0631 \u0627\u0633\u0627\u0633 \u062F\u0633\u062A\u0648\u0631\u062F\u0647\u0646\u062F\u0647" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u062F\u0633\u062A\u0648\u0631 \u062F\u0647\u0646\u062F\u0647 / \u062A\u0627\u06CC\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647" }), _jsx("th", { className: "p-2.5 text-center", children: "\u062A\u0639\u062F\u0627\u062F \u0641\u0627\u06A9\u062A\u0648\u0631" }), _jsx("th", { className: "p-2.5 text-left", children: "\u0645\u0628\u0644\u063A \u06A9\u0644 \u062A\u062E\u0641\u06CC\u0641" }), _jsx("th", { className: "p-2.5 text-center", children: "\u0633\u0647\u0645 %" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-800", children: [Object.entries(authorizerBreakdown).map(([authName, data]) => {
                                                                const pct = totalDiscountSum > 0 ? ((data.totalDiscount / totalDiscountSum) * 100).toFixed(1) : '0';
                                                                return (_jsxs("tr", { children: [_jsx("td", { className: "p-2.5 font-bold text-slate-100", children: authName }), _jsx("td", { className: "p-2.5 text-center font-mono", children: toPersianDigits(data.count) }), _jsx("td", { className: "p-2.5 text-left font-bold text-amber-400 font-mono", children: formatCurrency(data.totalDiscount, currencyUnit) }), _jsxs("td", { className: "p-2.5 text-center font-mono font-bold text-teal-400", children: [toPersianDigits(pct), "\u066A"] })] }, authName));
                                                            }), Object.keys(authorizerBreakdown).length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "p-4 text-center text-slate-500", children: "\u0647\u06CC\u0686 \u062A\u062E\u0641\u06CC\u0641\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." }) }))] })] }) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3", children: [_jsx("h3", { className: "font-bold text-sm text-slate-100 border-b border-slate-800 pb-2", children: "\u06AF\u0632\u0627\u0631\u0634 \u062A\u0641\u06A9\u06CC\u06A9\u06CC \u062A\u062E\u0641\u06CC\u0641\u0627\u062A \u0628\u0631 \u0627\u0633\u0627\u0633 \u06AF\u0631\u0648\u0647" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u06AF\u0631\u0648\u0647 \u062A\u062E\u0641\u06CC\u0641" }), _jsx("th", { className: "p-2.5 text-center", children: "\u062A\u0639\u062F\u0627\u062F" }), _jsx("th", { className: "p-2.5 text-left", children: "\u0645\u0628\u0644\u063A \u06A9\u0644 \u062A\u062E\u0641\u06CC\u0641" }), _jsx("th", { className: "p-2.5 text-center", children: "\u0633\u0647\u0645 %" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-800", children: [Object.entries(categoryBreakdown).map(([catName, data]) => {
                                                                const pct = totalDiscountSum > 0 ? ((data.totalDiscount / totalDiscountSum) * 100).toFixed(1) : '0';
                                                                return (_jsxs("tr", { children: [_jsx("td", { className: "p-2.5 font-bold text-slate-100", children: catName }), _jsx("td", { className: "p-2.5 text-center font-mono", children: toPersianDigits(data.count) }), _jsx("td", { className: "p-2.5 text-left font-bold text-amber-400 font-mono", children: formatCurrency(data.totalDiscount, currencyUnit) }), _jsxs("td", { className: "p-2.5 text-center font-mono font-bold text-teal-400", children: [toPersianDigits(pct), "\u066A"] })] }, catName));
                                                            }), Object.keys(categoryBreakdown).length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "p-4 text-center text-slate-500", children: "\u0647\u06CC\u0686 \u062A\u062E\u0641\u06CC\u0641\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." }) }))] })] }) })] })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3", children: [_jsx("h3", { className: "font-bold text-sm text-slate-100 border-b border-slate-800 pb-2", children: "\u062F\u0641\u062A\u0631 \u0631\u06CC\u0632 \u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627\u06CC \u062F\u0627\u0631\u0627\u06CC \u062A\u062E\u0641\u06CC\u0641" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs text-right text-slate-300", children: [_jsx("thead", { className: "bg-slate-800 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631" }), _jsx("th", { className: "p-3", children: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646" }), _jsx("th", { className: "p-3", children: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u062F\u0633\u062A\u0648\u0631 \u062F\u0647\u0646\u062F\u0647 / \u062A\u0627\u06CC\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647" }), _jsx("th", { className: "p-3", children: "\u06AF\u0631\u0648\u0647 \u062A\u062E\u0641\u06CC\u0641" }), _jsx("th", { className: "p-3 text-left", children: "\u0645\u0628\u0644\u063A \u06A9\u0644" }), _jsx("th", { className: "p-3 text-left", children: "\u0645\u0628\u0644\u063A \u062A\u062E\u0641\u06CC\u0641" }), _jsx("th", { className: "p-3 text-left", children: "\u0645\u0628\u0644\u063A \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-800", children: [filteredDiscounts.map((inv) => (_jsxs("tr", { className: "hover:bg-slate-800/50 transition", children: [_jsx("td", { className: "p-3 font-mono font-bold text-slate-100", children: inv.invoiceNumber }), _jsx("td", { className: "p-3 font-mono", children: inv.jalaliDate || '-' }), _jsx("td", { className: "p-3 font-bold text-teal-300", children: inv.patientName }), _jsx("td", { className: "p-3 font-bold text-amber-300", children: inv.discountApprovedBy || inv.createdByUserName || 'مدیریت کلینیک' }), _jsx("td", { className: "p-3", children: _jsx("span", { className: "bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] font-bold", children: inv.discountCategory || 'سایر' }) }), _jsx("td", { className: "p-3 text-left font-mono", children: formatCurrency(inv.totalAmount || inv.payableAmount + (inv.discountAmount || 0), currencyUnit) }), _jsx("td", { className: "p-3 text-left font-mono font-bold text-amber-400", children: formatCurrency(inv.discountAmount || 0, currencyUnit) }), _jsx("td", { className: "p-3 text-left font-mono font-bold text-emerald-400", children: formatCurrency(inv.payableAmount, currencyUnit) })] }, inv.id))), filteredDiscounts.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-6 text-center text-slate-500", children: "\u0647\u06CC\u0686 \u0641\u0627\u06A9\u062A\u0648\u0631\u06CC \u0645\u0637\u0627\u0628\u0642 \u0641\u06CC\u0644\u062A\u0631\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." }) }))] })] }) })] })] }));
            })()] }));
};
