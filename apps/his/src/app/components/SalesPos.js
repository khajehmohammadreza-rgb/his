import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { AlertCircle, Camera, CheckCircle2, CreditCard, Lock, Printer, QrCode, RefreshCw, Search, Send, ShieldCheck, ShoppingCart, Trash2, UserCheck, UserPlus, X, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { queryPatientIdentity } from '../utils/identityApi.js?b=r24-514-1405';
import { formatCurrency, formatNumber, getJalaliDateString, getJalaliDateTimeString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { NumberInput } from './NumberInput.js?b=r24-514-1405';
import { WebcamScannerModal } from './WebcamScannerModal.js?b=r24-514-1405';
import {normalizeScannedCode} from '../utils/barcodeDecoder.js?b=r24-514-1405';
import { sendAmountToSamanKishPos } from '../utils/pcpos.js?b=r24-514-1405';
export const SalesPos = ({ settings, products = [], patients = [], currentUser, onCompleteSale, onCreateSalesInvoice, onOpenWebcamScanner, lastScannedBarcode, onPrintInvoice, }) => {
    // Patient Selection & Verification State
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [showPatientSelectModal, setShowPatientSelectModal] = useState(false);
    const [showIdentityForm, setShowIdentityForm] = useState(false);
    // Identity Form State
    const [identityNationalId, setIdentityNationalId] = useState('');
    const [identityMobile, setIdentityMobile] = useState('');
    const [identityLoading, setIdentityLoading] = useState(false);
    const [identityResult, setIdentityResult] = useState(null);
    // Cart State
    const [cartItems, setCartItems] = useState([]);
    const [showSalesScanner,setShowSalesScanner]=useState(false);
    const [barcodeNotice,setBarcodeNotice]=useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [discountCategory, setDiscountCategory] = useState('مدیریتی');
    const [discountApprovedBy, setDiscountApprovedBy] = useState('');
    // Payment State
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [posRefCode, setPosRefCode] = useState('');
    const [posLoading, setPosLoading] = useState(false);
    const [posModalOpen, setPosModalOpen] = useState(false);
    const [posStatusMsg, setPosStatusMsg] = useState('');
    // Split payment state
    const [splitCashAmount, setSplitCashAmount] = useState(0);
    const [splitCardAmount, setSplitCardAmount] = useState(0);
    // Admin Override Modal (for credit exceed or negative stock)
    const [showAdminOverrideModal, setShowAdminOverrideModal] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideError, setOverrideError] = useState('');
    // Invoice Print Preview Modal
    const [createdInvoice, setCreatedInvoice] = useState(null);
    const [showPrintInvoiceModal, setShowPrintInvoiceModal] = useState(false);
    const [smsSent, setSmsSent] = useState(false);
    const barcodeInputRef = useRef(null);
    // Automatically add scanned product if lastScannedBarcode changes
    useEffect(() => {
        if (lastScannedBarcode) {
            const value=normalizeScannedCode(lastScannedBarcode);
            const match = products.find((p) => normalizeScannedCode(p.barcode) === value || normalizeScannedCode(p.code) === value);
            if (match) {
                addToCart(match);
            }
        }
    }, [lastScannedBarcode]);
    // Default select Guest Patient on load if none selected
    useEffect(() => {
        if (!selectedPatient && patients.length > 0) {
            const guest = patients.find((p) => p.type === 'guest') || patients[0];
            setSelectedPatient(guest);
        }
    }, [patients]);
    // Calculate Cart Totals
    const totalCartAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalPayableAmount = Math.max(0, totalCartAmount - discountAmount);
    // Check Stock Availability
    const stockErrors = cartItems.filter((item) => {
        const prod = products.find((p) => p.id === item.productId);
        return prod && prod.stockQuantity < item.qty;
    });
    // Check Patient Credit Validity
    let creditExceeded = false;
    let creditExceedMessage = '';
    if (paymentMethod === 'credit') {
        if (!selectedPatient || selectedPatient.type === 'guest') {
            creditExceeded = true;
            creditExceedMessage = 'فروش اعتباری برای بیمار متفرقه مجاز نیست. لطفاً ابتدا استعلام هویت بیمار را انجام دهید.';
        }
        else if (!selectedPatient.creditConfig?.enabled) {
            creditExceeded = true;
            creditExceedMessage = `حساب اعتباری برای بیمار «${selectedPatient.fullName}» فعال نگردیده است.`;
        }
        else {
            const newTotalDebt = (selectedPatient.creditConfig.currentDebt || 0) + finalPayableAmount;
            if (newTotalDebt > selectedPatient.creditConfig.creditLimit) {
                creditExceeded = true;
                creditExceedMessage = `مبلغ خرید (${formatCurrency(finalPayableAmount, settings.currencyUnit)}) + بدهی قبلی (${formatCurrency(selectedPatient.creditConfig.currentDebt, settings.currencyUnit)}) از سقف اعتبار بیمار (${formatCurrency(selectedPatient.creditConfig.creditLimit, settings.currencyUnit)}) تجاوز می‌کند.`;
            }
        }
    }
    // Scan adds a line to the *pending* cart; it does not bypass payment/checkout.
    const addToCart = (product) => {
        if(!product || product.active===false)return;
        setCartItems(prev=>{
            const existing=prev.find(item=>item.productId===product.id);
            if(existing)return prev.map(item=>item.productId===product.id?{...item,qty:item.qty+1,totalPrice:(item.qty+1)*item.unitPrice}:item);
            const unitPrice=Number(product.salesPrice)||0;
            return [...prev,{productId:product.id,productName:product.name,barcode:product.barcode,qty:1,unitPrice,totalPrice:unitPrice,unit:product.unit}];
        });
    };
    const handleSalesScan=(raw)=>{
        const code=normalizeScannedCode(raw);
        const product=products.find(p=>normalizeScannedCode(p.barcode)===code||normalizeScannedCode(p.code)===code);
        if(!product){setBarcodeNotice(`بارکد ${code} تعریف نشده است. برای جلوگیری از فروش اشتباه، کالا اضافه نشد.`);return false;}
        if(product.active===false){setBarcodeNotice('این کالا غیرفعال است و به فاکتور اضافه نشد.');return false;}
        addToCart(product);
        setBarcodeNotice(`«${product.name}» به فاکتور در حال تنظیم اضافه شد.`);
        setProductSearchTerm('');return true;
    };
    const updateCartQty = (productId, newQty) => {
        if (newQty <= 0) {
            setCartItems(cartItems.filter((i) => i.productId !== productId));
            return;
        }
        setCartItems(cartItems.map((item) => {
            if (item.productId === productId) {
                return {
                    ...item,
                    qty: newQty,
                    totalPrice: newQty * item.unitPrice,
                };
            }
            return item;
        }));
    };
    const removeFromCart = (productId) => {
        setCartItems(cartItems.filter((i) => i.productId !== productId));
    };
    // Execute Identity Query
    const handlePerformIdentityQuery = async (e) => {
        e.preventDefault();
        setIdentityLoading(true);
        setIdentityResult(null);
        // Check if patient already exists in clinic database first
        const existing = patients.find((p) => p.nationalId === identityNationalId);
        if (existing) {
            setSelectedPatient(existing);
            setIdentityLoading(false);
            setShowIdentityForm(false);
            return;
        }
        if (!settings.enableOnlineIdentityInquiry) {
            setIdentityResult({
                success: false,
                message: 'سرویس استعلام آنلاین هویت (ثبت احوال / شاهکار) تا زمان فعال‌سازی درگاه و ثبت کلید سرویس در بخش تنظیمات غیرفعال می‌باشد.',
            });
            setIdentityLoading(false);
            return;
        }
        try {
            const res = await queryPatientIdentity({
                nationalId: identityNationalId,
                mobilePhone: identityMobile,
            });
            setIdentityResult(res);
            if (res.success && res.fullName) {
                // Create or update verified patient
                const newPatient = {
                    id: 'pat-' + Date.now(),
                    fileNumber: 'CL-' + Math.floor(10000 + Math.random() * 90000),
                    identityCategory: 'iranian',
                    nationalId: identityNationalId,
                    mobilePhone: identityMobile,
                    firstName: res.firstName || '',
                    lastName: res.lastName || '',
                    fullName: res.fullName,
                    type: 'regular',
                    verificationStatus: 'verified',
                    creditConfig: {
                        enabled: true,
                        creditLimit: 5000000, // Default 5 million Toman limit upon verification
                        maturityDays: 30,
                        currentDebt: 0,
                    },
                    createdAt: new Date().toISOString(),
                    lastVisitDate: getJalaliDateString(),
                };
                setSelectedPatient(newPatient);
                patients.push(newPatient); // Add to local state
                setShowIdentityForm(false);
            }
        }
        catch (err) {
            setIdentityResult({
                success: false,
                message: 'خطا در ارتباط با سامانه استعلام آنلاین هویت.',
            });
        }
        finally {
            setIdentityLoading(false);
        }
    };
    // Connect to PC-POS SamanKish
    const handleConnectSamanKishPos = async (customAmount) => {
        let rawIp = settings.posIp ? settings.posIp.trim() : '192.168.1.142';
        if (rawIp === '127.0.0.1' || rawIp === 'localhost' || !rawIp) {
            rawIp = '192.168.1.142';
        }
        const cleanIp = rawIp.split('.').map(part => parseInt(part, 10).toString()).join('.');
        setPosModalOpen(true);
        setPosLoading(true);
        const rawAmount = customAmount !== undefined ? customAmount : (paymentMethod === 'split' ? splitCardAmount : finalPayableAmount);
        const amountToSend = (rawAmount && rawAmount > 0) ? rawAmount : 10000;
        setPosStatusMsg(`در حال ارسال مبلغ ${amountToSend.toLocaleString('fa-IR')} تومان به کارتخوان سامان‌کیش (${cleanIp}:${settings.posPort || '8080'})...`);
        try {
            const response = await sendAmountToSamanKishPos({
                amount: amountToSend,
                posIp: cleanIp,
                posPort: settings.posPort || '8080',
                terminalId: settings.posTerminalId || '',
                merchantId: settings.posMerchantId || '',
                connectionType: settings.posConnectionType || 'ssp1126',
            }, settings);
            if (response.success && response.rrn) {
                setPosRefCode(response.rrn);
                setPosStatusMsg(`مبلغ با موفقیت ارسال شد. کد پیگیری: ${response.rrn}`);
                setTimeout(() => {
                    setPosModalOpen(false);
                }, 1800);
            }
            else {
                setPosStatusMsg(response.message || 'خطا در پرداخت کارتخوان');
            }
        }
        catch (err) {
            setPosStatusMsg('خطا در برقراری ارتباط با پورت PC-POS');
        }
        finally {
            setPosLoading(false);
        }
    };
    // Finalize Sale
    const handleFinalizeSale = (ignoreCreditCheck = false) => {
        if (cartItems.length === 0)
            return;
        if (stockErrors.length > 0 && currentUser.role !== 'admin') {
            alert('موجودی انبار برای برخی اقلام کافی نیست. فقط کاربر مدیر مجاز به تایید است.');
            return;
        }
        if (paymentMethod === 'credit' && creditExceeded && !ignoreCreditCheck) {
            setShowAdminOverrideModal(true);
            return;
        }
        if (paymentMethod === 'card' && !posRefCode) {
            // Prompt user to connect POS or enter RRN
            handleConnectSamanKishPos();
            return;
        }
        const invoiceNum = '1405-' + Math.floor(10000 + Math.random() * 90000);
        const now = new Date();
        const paymentsList = [];
        if (paymentMethod === 'card') {
            paymentsList.push({
                id: 'pay-' + Date.now(),
                method: 'card',
                amount: finalPayableAmount,
                posReferenceCode: posRefCode || 'MANUAL-POS',
                posTerminalName: settings.posMerchantName,
                date: now.toISOString(),
                jalaliDate: getJalaliDateTimeString(now),
            });
        }
        else if (paymentMethod === 'cash') {
            paymentsList.push({
                id: 'pay-' + Date.now(),
                method: 'cash',
                amount: finalPayableAmount,
                date: now.toISOString(),
                jalaliDate: getJalaliDateTimeString(now),
            });
        }
        else if (paymentMethod === 'split') {
            paymentsList.push({
                id: 'pay-cash-' + Date.now(),
                method: 'cash',
                amount: splitCashAmount,
                date: now.toISOString(),
                jalaliDate: getJalaliDateTimeString(now),
            }, {
                id: 'pay-card-' + Date.now(),
                method: 'card',
                amount: splitCardAmount,
                posReferenceCode: posRefCode || 'MANUAL-POS',
                posTerminalName: settings.posMerchantName,
                date: now.toISOString(),
                jalaliDate: getJalaliDateTimeString(now),
            });
        }
        else if (paymentMethod === 'credit') {
            paymentsList.push({
                id: 'pay-credit-' + Date.now(),
                method: 'credit',
                amount: finalPayableAmount,
                notes: `افزایش بدهی به حساب اعتباری بیمار (${selectedPatient?.fullName})`,
                date: now.toISOString(),
                jalaliDate: getJalaliDateTimeString(now),
            });
            // Increase patient debt
            if (selectedPatient && selectedPatient.creditConfig) {
                selectedPatient.creditConfig.currentDebt += finalPayableAmount;
            }
        }
        const newInvoice = {
            id: 'inv-' + Date.now(),
            invoiceNumber: invoiceNum,
            date: now.toISOString(),
            jalaliDate: getJalaliDateTimeString(now),
            patientId: selectedPatient?.id || 'pat-guest',
            patientName: selectedPatient?.fullName || 'بیمار متفرقه',
            patientNationalId: selectedPatient?.nationalId,
            patientMobile: selectedPatient?.mobilePhone,
            patientType: selectedPatient?.type || 'guest',
            items: [...cartItems],
            totalAmount: totalCartAmount,
            discountAmount: discountAmount,
            discountCategory: discountAmount > 0 ? discountCategory : undefined,
            discountApprovedBy: discountAmount > 0 ? (discountApprovedBy.trim() || currentUser.name) : undefined,
            payableAmount: finalPayableAmount,
            paymentMethod,
            payments: paymentsList,
            status: 'completed',
            createdByUserId: currentUser.id,
            createdByUserName: currentUser.name,
            notes: ignoreCreditCheck ? `تایید تجاوز اعتبار توسط مدیر با دلیل: ${overrideReason}` : undefined,
        };
        if (onCreateSalesInvoice) {
            onCreateSalesInvoice(newInvoice);
        }
        else if (onCompleteSale) {
            onCompleteSale(newInvoice);
        }
        setCreatedInvoice(newInvoice);
        setShowPrintInvoiceModal(true);
        // Reset Form
        setCartItems([]);
        setDiscountAmount(0);
        setPosRefCode('');
        setShowAdminOverrideModal(false);
        setOverrideReason('');
    };
    const handleSendSmsInvoice = async () => {
        if (!createdInvoice?.patientMobile) {
            alert('برای این بیمار شماره موبایل ثبت نشده است.');
            return;
        }
        const message = `${settings.clinicName || 'مرکز درمانی'}\nفاکتور ${createdInvoice.invoiceNumber}\nمبلغ قابل پرداخت: ${formatCurrency(createdInvoice.payableAmount, settings.currencyUnit)}`;
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: createdInvoice.patientMobile, message }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false)
                throw new Error(data.message || data.error || 'ارسال پیامک تایید نشد.');
            setSmsSent(true);
            setTimeout(() => setSmsSent(false), 3000);
        }
        catch (error) {
            alert(error?.message || 'ارسال پیامک انجام نشد.');
        }
    };
    const filteredProducts = products.filter((p) => {
        const matchesSearch = (p?.name || '').includes(productSearchTerm) ||
            (p?.code || '').includes(productSearchTerm) ||
            (p?.barcode && p.barcode.includes(productSearchTerm));
        const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
        return matchesSearch && matchesCat && p.active;
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center space-x-3 space-x-reverse", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center", children: selectedPatient?.type === 'guest' ? _jsx(UserPlus, { className: "w-5 h-5 text-slate-400" }) : _jsx(ShieldCheck, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsx("span", { className: "text-xs text-slate-400", children: "\u0628\u06CC\u0645\u0627\u0631 \u062E\u0631\u06CC\u062F\u0627\u0631:" }), _jsx("span", { className: "font-bold text-slate-100 text-sm", children: selectedPatient?.fullName }), selectedPatient?.verificationStatus === 'verified' ? (_jsxs("span", { className: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 space-x-reverse font-medium", children: [_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-400" }), _jsx("span", { children: "\u0647\u0648\u06CC\u062A \u062A\u0623\u06CC\u06CC\u062F\u0634\u062F\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646" })] })) : (_jsx("span", { className: "bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700", children: "\u0628\u06CC\u0645\u0627\u0631 \u0645\u062A\u0641\u0631\u0642\u0647" }))] }), selectedPatient?.nationalId && (_jsxs("div", { className: "text-[11px] text-slate-400 flex items-center space-x-3 space-x-reverse mt-0.5", children: [_jsxs("span", { children: ["\u06A9\u062F \u0645\u0644\u06CC: ", _jsx("span", { className: "font-mono text-slate-300", children: toPersianDigits(selectedPatient.nationalId) })] }), _jsxs("span", { children: ["\u0647\u0645\u0631\u0627\u0647: ", _jsx("span", { className: "font-mono text-slate-300", children: toPersianDigits(selectedPatient.mobilePhone) })] })] }))] })] }), _jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsxs("button", { onClick: () => setShowIdentityForm(true), className: "flex items-center space-x-1.5 space-x-reverse bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm", children: [_jsx(UserCheck, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0647\u0648\u06CC\u062A \u0622\u0646\u0644\u0627\u06CC\u0646" })] }), _jsx("button", { onClick: () => {
                                    // Switch to guest patient
                                    const guest = patients.find((p) => p.type === 'guest') || {
                                        id: 'pat-guest',
                                        fullName: 'بیمار متفرقه',
                                        firstName: 'بیمار',
                                        lastName: 'متفرقه',
                                        type: 'guest',
                                        verificationStatus: 'unverified',
                                        creditConfig: { enabled: false, creditLimit: 0, maturityDays: 0, currentDebt: 0 },
                                        createdAt: new Date().toISOString(),
                                    };
                                    setSelectedPatient(guest);
                                }, className: "flex items-center space-x-1.5 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-3 py-2 rounded-xl transition-colors", children: _jsx("span", { children: "\u0628\u06CC\u0645\u0627\u0631 \u0645\u062A\u0641\u0631\u0642\u0647" }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3", children: [_jsxs("div", { className: "relative flex-1 w-full", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-2.5" }), _jsx("input", { type: "text", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0627\u0644\u0627 \u0628\u0627 \u0646\u0627\u0645\u060C \u06A9\u062F \u06A9\u0627\u0644\u0627 \u06CC\u0627 \u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F...", value: productSearchTerm, onChange: (e) => setProductSearchTerm(e.target.value), onKeyDown: e=>{if(e.key==='Enter'){const value=normalizeScannedCode(productSearchTerm);const match=products.find(p=>normalizeScannedCode(p.barcode)===value||normalizeScannedCode(p.code)===value);if(match){e.preventDefault();handleSalesScan(value);}}}, className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs pr-9 pl-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500" })] }), _jsxs("button", { onClick: () => setShowSalesScanner(true), className: "w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors shrink-0", title: "\u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F \u0628\u0627 \u062F\u0648\u0631\u0628\u06CC\u0646 / \u0648\u0628\u200C\u06A9\u0645", children: [_jsx(Camera, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0633\u06A9\u0646 \u0628\u0627\u0631\u06A9\u062F" })] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto p-1", children: filteredProducts.map((prod) => {
                                    const inCartQty = cartItems.find((i) => i.productId === prod.id)?.qty || 0;
                                    const isLowStock = prod.stockQuantity <= prod.minStock;
                                    return (_jsxs("div", { onClick: () => addToCart(prod), className: `bg-slate-900 border hover:border-emerald-500/60 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all shadow-sm ${inCartQty > 0 ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-slate-800'}`, children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-1", children: [_jsx("h4", { className: "font-bold text-slate-100 text-xs line-clamp-2 leading-snug", children: prod.name }), inCartQty > 0 && (_jsx("span", { className: "bg-emerald-500 text-slate-950 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0", children: toPersianDigits(inCartQty) }))] }), _jsx("span", { className: "text-[10px] text-slate-400 block mb-2", children: prod.categoryName })] }), _jsxs("div", { className: "pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-emerald-400 font-bold block", children: formatCurrency(prod.salesPrice, settings.currencyUnit) }), _jsxs("span", { className: "text-[10px] text-slate-400 block", children: ["\u0648\u0627\u062D\u062F: ", prod.unit] })] }), _jsx("div", { className: "text-left", children: _jsxs("span", { className: `text-[10px] font-medium block ${prod.stockQuantity <= 0
                                                                ? 'text-rose-400'
                                                                : isLowStock
                                                                    ? 'text-amber-400'
                                                                    : 'text-slate-400'}`, children: ["\u0645\u0648\u062C\u0648\u062F\u06CC: ", toPersianDigits(prod.stockQuantity)] }) })] })] }, prod.id));
                                }) })] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-4", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2.5", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsx(ShoppingCart, { className: "w-5 h-5 text-emerald-400" }), _jsx("h3", { className: "font-bold text-slate-100 text-sm", children: "\u0633\u0628\u062F \u0641\u0631\u0648\u0634 \u0628\u06CC\u0645\u0627\u0631" })] }), _jsxs("span", { className: "text-xs text-slate-400", children: [toPersianDigits(cartItems.length), " \u0642\u0644\u0645"] })] }), cartItems.length === 0 ? (_jsx("div", { className: "bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs", children: "\u0633\u0628\u062F \u0641\u0631\u0648\u0634 \u062E\u0627\u0644\u06CC \u0627\u0633\u062A. \u0627\u0642\u0644\u0627\u0645 \u0631\u0627 \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F \u06CC\u0627 \u0628\u0627\u0631\u06A9\u062F \u0631\u0627 \u0627\u0633\u06A9\u0646 \u0646\u0645\u0627\u06CC\u06CC\u062F." })) : (_jsx("div", { className: "space-y-2 max-h-[220px] overflow-y-auto pr-1", children: cartItems.map((item) => {
                                            const prod = products.find((p) => p.id === item.productId);
                                            const isInsufficient = prod && prod.stockQuantity < item.qty;
                                            return (_jsxs("div", { className: `bg-slate-800/80 border rounded-xl p-2.5 flex items-center justify-between gap-2 ${isInsufficient ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-700/60'}`, children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "font-medium text-slate-100 text-xs truncate block", children: item.productName }), _jsxs("div", { className: "text-[10px] text-slate-400 flex items-center space-x-2 space-x-reverse", children: [_jsxs("span", { children: ["\u0641\u06CC: ", formatCurrency(item.unitPrice, settings.currencyUnit)] }), isInsufficient && (_jsx("span", { className: "text-rose-400 font-bold", children: "\u06A9\u0645\u0628\u0648\u062F \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631!" }))] })] }), _jsxs("div", { className: "flex items-center space-x-1.5 space-x-reverse", children: [_jsx("button", { onClick: () => updateCartQty(item.productId, item.qty - 1), className: "w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center text-xs", children: "-" }), _jsx("span", { className: "font-bold text-xs text-slate-100 px-1", children: toPersianDigits(item.qty) }), _jsx("button", { onClick: () => updateCartQty(item.productId, item.qty + 1), className: "w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center text-xs", children: "+" }), _jsx("button", { onClick: () => removeFromCart(item.productId), className: "text-slate-400 hover:text-rose-400 p-1 mr-1", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] })] }, item.productId));
                                        }) }))] }), _jsxs("div", { className: "border-t border-slate-800 pt-3 space-y-3", children: [_jsxs("div", { className: "space-y-1.5 text-xs text-slate-300", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u062C\u0645\u0639 \u06A9\u0644 \u0627\u0642\u0644\u0627\u0645:" }), _jsx("span", { className: "font-bold text-slate-100", children: formatCurrency(totalCartAmount, settings.currencyUnit) })] }), _jsxs("div", { className: "space-y-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { children: "\u062A\u062E\u0641\u06CC\u0641 (\u062A\u0648\u0645\u0627\u0646/\u0631\u06CC\u0627\u0644):" }), _jsx("div", { className: "w-36", children: _jsx(NumberInput, { value: discountAmount, onChange: (val) => setDiscountAmount(val), currencyLabel: "", className: "py-1 text-xs" }) })] }), discountAmount > 0 && (_jsxs("div", { className: "grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 animate-fade-in", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[10px] text-teal-300 font-bold mb-0.5", children: "\u06AF\u0631\u0648\u0647 \u062A\u062E\u0641\u06CC\u0641:" }), _jsxs("select", { value: discountCategory, onChange: (e) => setDiscountCategory(e.target.value), className: "w-full bg-slate-950 border border-slate-700 text-slate-200 text-[11px] p-1 rounded-lg font-bold", children: [_jsx("option", { value: "\u0645\u062F\u06CC\u0631\u06CC\u062A\u06CC", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A\u06CC" }), _jsx("option", { value: "\u067E\u0631\u0633\u0646\u0644\u06CC/\u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC", children: "\u067E\u0631\u0633\u0646\u0644\u06CC / \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC" }), _jsx("option", { value: "\u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062E\u0627\u0635", children: "\u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062E\u0627\u0635 / \u0646\u06CC\u0627\u0632\u0645\u0646\u062F" }), _jsx("option", { value: "\u0645\u0646\u0627\u0633\u0628\u062A\u06CC", children: "\u0645\u0646\u0627\u0633\u0628\u062A\u06CC / \u062C\u0634\u0646\u0648\u0627\u0631\u0647" }), _jsx("option", { value: "\u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C", children: "\u062F\u0633\u062A\u0648\u0631 \u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C" }), _jsx("option", { value: "\u0633\u0627\u06CC\u0631", children: "\u0633\u0627\u06CC\u0631 \u0645\u0648\u0627\u0631\u062F" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[10px] text-teal-300 font-bold mb-0.5", children: "\u062F\u0633\u062A\u0648\u0631\u062F\u0647\u0646\u062F\u0647 / \u062A\u0627\u06CC\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647:" }), _jsx("input", { type: "text", value: discountApprovedBy, onChange: (e) => setDiscountApprovedBy(e.target.value), placeholder: `مثال: ${currentUser.name}`, className: "w-full bg-slate-950 border border-slate-700 text-slate-200 text-[11px] p-1 rounded-lg" })] })] }))] }), _jsxs("div", { className: "flex justify-between pt-1 border-t border-slate-800 font-bold text-sm text-emerald-400", children: [_jsx("span", { children: "\u0645\u0628\u0644\u063A \u0642\u0627\u0628\u0644 \u067E\u0631\u062F\u0627\u062E\u062A:" }), _jsx("span", { children: formatCurrency(finalPayableAmount, settings.currencyUnit) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate-300 mb-1.5", children: "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A:" }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [_jsx("button", { type: "button", onClick: () => setPaymentMethod('card'), className: `p-2 rounded-xl border text-right font-medium transition-colors ${paymentMethod === 'card'
                                                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                                            : 'bg-slate-800 border-slate-700 text-slate-300'}`, children: "\uD83D\uDCB3 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 (PC-POS)" }), _jsx("button", { type: "button", onClick: () => setPaymentMethod('cash'), className: `p-2 rounded-xl border text-right font-medium transition-colors ${paymentMethod === 'cash'
                                                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                                            : 'bg-slate-800 border-slate-700 text-slate-300'}`, children: "\uD83D\uDCB5 \u0646\u0642\u062F\u06CC" }), _jsx("button", { type: "button", onClick: () => setPaymentMethod('credit'), className: `p-2 rounded-xl border text-right font-medium transition-colors ${paymentMethod === 'credit'
                                                            ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                                                            : 'bg-slate-800 border-slate-700 text-slate-300'}`, children: "\uD83D\uDCDD \u0627\u0639\u062A\u0628\u0627\u0631\u06CC / \u0628\u062F\u0647\u06A9\u0627\u0631" }), _jsx("button", { type: "button", onClick: () => setPaymentMethod('split'), className: `p-2 rounded-xl border text-right font-medium transition-colors ${paymentMethod === 'split'
                                                            ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                                                            : 'bg-slate-800 border-slate-700 text-slate-300'}`, children: "\uD83D\uDD00 \u062A\u0631\u06A9\u06CC\u0628\u06CC (\u0646\u0642\u062F + \u06A9\u0627\u0631\u062A)" })] })] }), paymentMethod === 'card' && (_jsxs("div", { className: "bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "text-slate-300", children: "\u062F\u0633\u062A\u06AF\u0627\u0647 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646:" }), _jsx("span", { className: "font-bold text-teal-400", children: settings.posMerchantName })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", placeholder: "\u06A9\u062F \u0645\u0631\u062C\u0639 / \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646", value: posRefCode, onChange: (e) => setPosRefCode(e.target.value), className: "flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg font-mono dir-ltr text-right focus:outline-none focus:border-emerald-500" }), _jsx("button", { onClick: handleConnectSamanKishPos, className: "bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0", children: "\u0627\u0631\u0633\u0627\u0644 \u0628\u0647 POS" })] })] })), paymentMethod === 'credit' && creditExceeded && (_jsxs("div", { className: "bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-[11px] text-rose-300 leading-relaxed", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-rose-400 inline ml-1" }), creditExceedMessage] })), _jsxs("button", { onClick: () => handleFinalizeSale(false), disabled: cartItems.length === 0, className: "w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-emerald-900/30 transition-colors flex items-center justify-center space-x-2 space-x-reverse", children: [_jsx(ShoppingCart, { className: "w-5 h-5" }), _jsx("span", { children: "\u062B\u0628\u062A \u0646\u0647\u0627\u06CC\u06CC \u0648 \u0635\u062F\u0648\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631" })] })] })] })] }), showIdentityForm && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsx(UserCheck, { className: "w-5 h-5 text-emerald-400" }), _jsx("h3", { className: "font-bold text-slate-100 text-sm", children: "\u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0622\u0646\u0644\u0627\u06CC\u0646 \u0647\u0648\u06CC\u062A \u0628\u06CC\u0645\u0627\u0631" })] }), _jsx("button", { onClick: () => setShowIdentityForm(false), className: "text-slate-400 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handlePerformIdentityQuery, className: "space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u06A9\u062F \u0645\u0644\u06CC \u06F1\u06F0 \u0631\u0642\u0645\u06CC:" }), _jsx("input", { type: "text", required: true, maxLength: 10, value: identityNationalId, onChange: (e) => setIdentityNationalId(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: 3521234567", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-mono dir-ltr text-right" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647 \u0628\u06CC\u0645\u0627\u0631:" }), _jsx("input", { type: "text", required: true, maxLength: 11, value: identityMobile, onChange: (e) => setIdentityMobile(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: ", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-mono dir-ltr text-right" })] }), _jsx("div", { className: "pt-2", children: _jsx("button", { type: "submit", disabled: identityLoading, className: "w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-colors", children: identityLoading ? 'در حال دریافت اطلاعات از ثبت احوال...' : 'استعلام آنلاین و تایید هویت' }) })] }), identityResult && (_jsxs("div", { className: `p-3 rounded-xl border text-xs space-y-1 ${identityResult.success
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`, children: [_jsx("div", { className: "font-bold", children: identityResult.message }), identityResult.fullName && (_jsxs("div", { children: ["\u0646\u0627\u0645 \u062A\u0627\u06CC\u06CC\u062F\u0634\u062F\u0647: ", _jsx("span", { className: "font-bold text-white", children: identityResult.fullName })] }))] }))] }) })), showAdminOverrideModal && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse text-amber-400 border-b border-slate-800 pb-3", children: [_jsx(Lock, { className: "w-5 h-5" }), _jsx("h3", { className: "font-bold text-slate-100 text-sm", children: "\u0645\u062C\u0648\u0632 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0628\u0631\u0627\u06CC \u0641\u0631\u0648\u0634 \u0627\u0639\u062A\u0628\u0627\u0631\u06CC" })] }), _jsx("p", { className: "text-xs text-slate-300 leading-relaxed", children: "\u062E\u0631\u06CC\u062F \u0641\u0639\u0644\u06CC \u0627\u0632 \u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631 \u062A\u0639\u0631\u06CC\u0641\u200C\u0634\u062F\u0647 \u0628\u06CC\u0645\u0627\u0631 \u062A\u062C\u0627\u0648\u0632 \u0645\u06CC\u200C\u06A9\u0646\u062F. \u062C\u0647\u062A \u062B\u0628\u062A \u0646\u0647\u0627\u06CC\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631 \u0627\u0639\u062A\u0628\u0627\u0631\u06CC\u060C \u062B\u0628\u062A \u062F\u0644\u06CC\u0644 \u0648 \u0645\u062C\u0648\u0632 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-slate-300 mb-1", children: "\u062F\u0644\u06CC\u0644 \u0645\u0648\u0627\u0641\u0642\u062A \u0648 \u0645\u062C\u0648\u0632 \u0645\u062F\u06CC\u0631:" }), _jsx("textarea", { rows: 3, value: overrideReason, onChange: (e) => setOverrideReason(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u0645\u0648\u0627\u0641\u0642\u062A \u0645\u062F\u06CC\u0631\u06CC\u062A \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647 \u0628\u0627 \u062A\u0627\u06CC\u06CC\u062F \u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C...", className: "w-full bg-slate-800 border border-slate-700 text-slate-100 text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500" })] }), _jsxs("div", { className: "flex items-center justify-end space-x-2 space-x-reverse pt-2", children: [_jsx("button", { onClick: () => setShowAdminOverrideModal(false), className: "bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { onClick: () => handleFinalizeSale(true), disabled: !overrideReason.trim(), className: "bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors", children: "\u062A\u0623\u06CC\u06CC\u062F \u0648 \u062B\u0628\u062A \u0628\u0627 \u0645\u0633\u0626\u0648\u0644\u06CC\u062A \u0645\u062F\u06CC\u0631\u06CC\u062A" })] })] }) })), posModalOpen && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl", children: [_jsx("div", { className: "w-16 h-16 bg-teal-500/10 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto", children: _jsx(CreditCard, { className: "w-8 h-8 text-teal-400 animate-bounce" }) }), _jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "font-bold text-slate-100 text-base", children: "\u0627\u062A\u0635\u0627\u0644 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0628\u0647 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 \u0633\u0627\u0645\u0627\u0646\u200C\u06A9\u06CC\u0634" }), _jsxs("div", { className: "flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400", children: [_jsxs("span", { className: "bg-slate-800 px-2 py-0.5 rounded border border-slate-700", children: ["\u0622\u06CC\u200C\u067E\u06CC: ", (settings.posIp && settings.posIp !== '127.0.0.1' ? settings.posIp.split('.').map(p => parseInt(p, 10).toString()).join('.') : '192.168.1.142'), ":", settings.posPort || '8080'] }), _jsx("span", { className: "bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded", children: "\u067E\u0631\u0648\u062A\u0648\u06A9\u0644 SSP1126 (\u062A\u06A9\u200C\u062D\u0633\u0627\u0628\u06CC)" })] })] }), _jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1", children: [_jsx("div", { className: "text-xs text-slate-400", children: "\u0645\u0628\u0644\u063A \u0627\u0631\u0633\u0627\u0644\u06CC \u0631\u0648\u06CC \u0635\u0641\u062D\u0647 \u067E\u0648\u0632:" }), _jsxs("div", { className: "text-lg font-black text-teal-400 font-mono", children: [formatNumber((paymentMethod === 'split' ? splitCardAmount : finalPayableAmount) || 10000), " \u062A\u0648\u0645\u0627\u0646"] }), _jsxs("div", { className: "text-[10px] text-slate-500 font-mono", children: ["(", formatNumber(((paymentMethod === 'split' ? splitCardAmount : finalPayableAmount) || 10000) * 10), " \u0631\u06CC\u0627\u0644)"] })] }), _jsx("p", { className: "text-xs text-slate-300 leading-relaxed font-medium", children: posStatusMsg }), posLoading ? (_jsx("div", { className: "text-xs text-teal-400 font-mono animate-pulse bg-teal-950/40 border border-teal-900/60 p-2.5 rounded-xl", children: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644 \u062F\u0633\u062A\u0648\u0631 \u0628\u0647 \u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646... \u0644\u0637\u0641\u0627 \u06A9\u0627\u0631\u062A \u0628\u06A9\u0634\u06CC\u062F \u0648 \u0631\u0645\u0632 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F." })) : (_jsxs("div", { className: "flex flex-col gap-2 pt-2", children: [_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => handleConnectSamanKishPos(), className: "bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5", children: [_jsx(RefreshCw, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u0645\u0628\u0644\u063A \u0641\u0627\u06A9\u062A\u0648\u0631" })] }), _jsxs("button", { type: "button", onClick: () => handleConnectSamanKishPos(10000), className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-950", children: [_jsx(Send, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062A\u0633\u062A \u06F1\u06F0,\u06F0\u06F0\u06F0 \u062A\u0648\u0645\u0627\u0646 (\u06F1\u06F0\u06F0,\u06F0\u06F0\u06F0 \u0631\u06CC\u0627\u0644)" })] })] }), _jsx("button", { type: "button", onClick: () => setPosModalOpen(false), className: "bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs px-4 py-1.5 rounded-xl self-center", children: "\u0628\u0633\u062A\u0646" })] }))] }) })), showPrintInvoiceModal && createdInvoice && (_jsx("div", { className: "fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 overflow-y-auto p-4 flex justify-center", children: _jsxs("div", { className: "bg-white text-slate-900 rounded-2xl w-full max-w-3xl p-8 my-8 shadow-2xl space-y-6 dir-rtl print:m-0 print:p-0 print:shadow-none", children: [_jsxs("div", { className: "border-b-2 border-slate-900 pb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-black text-slate-900 tracking-tight", children: settings.clinicName }), _jsx("p", { className: "text-xs text-slate-600 mt-1", children: settings.address }), _jsxs("div", { className: "text-[11px] text-slate-500 mt-0.5 space-x-3 space-x-reverse", children: [_jsxs("span", { children: ["\u062A\u0644\u0641\u0646: ", settings.phone] }), _jsx("span", { children: "|" }), _jsxs("span", { children: ["\u0648\u0628\u200C\u0633\u0627\u06CC\u062A: ", settings.website] }), _jsx("span", { children: "|" }), _jsx("span", { children: settings.holdingName })] })] }), _jsxs("div", { className: "text-left font-mono text-xs text-slate-700 space-y-1", children: [_jsxs("div", { children: ["\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631: ", _jsx("span", { className: "font-bold text-slate-900", children: toPersianDigits(createdInvoice.invoiceNumber) })] }), _jsxs("div", { children: ["\u062A\u0627\u0631\u06CC\u062E: ", _jsx("span", { children: createdInvoice.jalaliDate })] }), _jsxs("div", { children: ["\u0635\u0627\u062F\u0631\u06A9\u0646\u0646\u062F\u0647: ", _jsx("span", { children: createdInvoice.createdByUserName })] })] })] }), _jsxs("div", { className: "bg-slate-100 rounded-xl p-3 text-xs flex justify-between items-center border border-slate-200", children: [_jsxs("div", { children: ["\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631: ", _jsx("span", { className: "font-bold text-slate-900 text-sm", children: createdInvoice.patientName }), createdInvoice.patientType === 'guest' ? ' (متفرقه)' : ' (تاییدشده آنلاین)'] }), createdInvoice.patientNationalId && (_jsxs("div", { className: "font-mono", children: ["\u06A9\u062F \u0645\u0644\u06CC: ", toPersianDigits(createdInvoice.patientNationalId)] }))] }), _jsxs("table", { className: "w-full text-xs border-collapse border border-slate-300", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-200 text-slate-800", children: [_jsx("th", { className: "border border-slate-300 p-2 text-right", children: "#" }), _jsx("th", { className: "border border-slate-300 p-2 text-right", children: "\u0634\u0631\u062D \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "border border-slate-300 p-2 text-center", children: "\u0628\u0627\u0631\u06A9\u062F" }), _jsx("th", { className: "border border-slate-300 p-2 text-center", children: "\u062A\u0639\u062F\u0627\u062F" }), _jsxs("th", { className: "border border-slate-300 p-2 text-left", children: ["\u0641\u06CC (", settings.currencyUnit === 'toman' ? 'تومان' : 'ریال', ")"] }), _jsx("th", { className: "border border-slate-300 p-2 text-left", children: "\u0645\u0628\u0644\u063A \u06A9\u0644" })] }) }), _jsx("tbody", { children: createdInvoice.items.map((item, idx) => (_jsxs("tr", { className: "border-b border-slate-200", children: [_jsx("td", { className: "border border-slate-300 p-2 text-center", children: toPersianDigits(idx + 1) }), _jsx("td", { className: "border border-slate-300 p-2 font-medium", children: item.productName }), _jsx("td", { className: "border border-slate-300 p-2 text-center font-mono text-[10px]", children: item.barcode ? toPersianDigits(item.barcode) : '-' }), _jsxs("td", { className: "border border-slate-300 p-2 text-center font-bold", children: [toPersianDigits(item.qty), " ", item.unit] }), _jsx("td", { className: "border border-slate-300 p-2 text-left", children: formatNumber(item.unitPrice) }), _jsx("td", { className: "border border-slate-300 p-2 text-left font-bold", children: formatNumber(item.totalPrice) })] }, idx))) })] }), _jsxs("div", { className: "flex justify-between items-start text-xs pt-2", children: [_jsxs("div", { className: "space-y-1 text-slate-600", children: [_jsxs("div", { children: ["\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A: ", _jsxs("span", { className: "font-bold text-slate-900", children: [createdInvoice.paymentMethod === 'card' && 'کارتخوان (PC-POS سامانکیش)', createdInvoice.paymentMethod === 'cash' && 'نقدی', createdInvoice.paymentMethod === 'credit' && 'حساب اعتباری', createdInvoice.paymentMethod === 'split' && 'پرداخت ترکیبی'] })] }), createdInvoice.payments[0]?.posReferenceCode && (_jsxs("div", { className: "font-mono", children: ["\u0634\u0645\u0627\u0631\u0647 \u067E\u06CC\u06AF\u06CC\u0631\u06CC/\u0645\u0631\u062C\u0639 POS: ", createdInvoice.payments[0].posReferenceCode] }))] }), _jsxs("div", { className: "text-left space-y-1.5 w-64 border-t border-slate-300 pt-2 font-bold", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u062C\u0645\u0639 \u06A9\u0644:" }), _jsx("span", { children: formatNumber(createdInvoice.totalAmount) })] }), _jsxs("div", { className: "flex justify-between text-rose-600", children: [_jsx("span", { children: "\u062A\u062E\u0641\u06CC\u0641:" }), _jsx("span", { children: formatNumber(createdInvoice.discountAmount) })] }), _jsxs("div", { className: "flex justify-between text-sm text-slate-900 border-t border-slate-900 pt-1", children: [_jsx("span", { children: "\u0645\u0628\u0644\u063A \u0646\u0647\u0627\u06CC\u06CC:" }), _jsx("span", { children: formatCurrency(createdInvoice.payableAmount, settings.currencyUnit) })] })] })] }), _jsxs("div", { className: "pt-8 border-t border-slate-300 flex justify-between items-end text-xs text-slate-500", children: [_jsxs("div", { children: [_jsx("span", { children: "\u0645\u0647\u0631 \u0648 \u0627\u0645\u0636\u0627\u06CC \u067E\u0630\u06CC\u0631\u0634 \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647" }), _jsx("div", { className: "h-12" })] }), _jsxs("div", { className: "text-center", children: [_jsx(QrCode, { className: "w-12 h-12 mx-auto text-slate-800 mb-1" }), _jsx("span", { className: "text-[10px] font-mono", children: settings.website || '—' })] })] }), _jsxs("div", { className: "print:hidden flex items-center justify-between border-t border-slate-200 pt-4", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsxs("button", { onClick: () => window.print(), className: "bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 space-x-reverse shadow-md", children: [_jsx(Printer, { className: "w-4 h-4" }), _jsx("span", { children: "\u0686\u0627\u067E \u0641\u0627\u06A9\u062A\u0648\u0631 \u0631\u0633\u0645\u06CC (A4)" })] }), _jsxs("button", { onClick: handleSendSmsInvoice, className: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 space-x-reverse", children: [_jsx(Send, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0628\u0647 \u0628\u06CC\u0645\u0627\u0631" })] }), smsSent && (_jsx("span", { className: "text-xs text-emerald-600 font-bold animate-pulse", children: "\u067E\u06CC\u0627\u0645\u06A9 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F!" }))] }), _jsx("button", { onClick: () => setShowPrintInvoiceModal(false), className: "bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs px-4 py-2.5 rounded-xl font-bold", children: "\u0628\u0633\u062A\u0646 \u067E\u0646\u062C\u0631\u0647" })] })] }) })) , barcodeNotice && _jsx("div",{role:"status",className:"fixed bottom-4 left-4 right-4 sm:right-auto bg-slate-900 border border-teal-500 p-3 rounded-xl text-sm text-emerald-200 z-30 shadow-xl",children:barcodeNotice}),
        showSalesScanner && _jsx(WebcamScannerModal,{products,onScanBarcode:handleSalesScan,onClose:()=>setShowSalesScanner(false),continuous:true})] }));
};
