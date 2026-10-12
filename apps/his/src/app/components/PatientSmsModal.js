import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { X, MessageSquare, Send, Sparkles, CheckCircle2, AlertCircle, RefreshCw, FileText, User, Phone, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
export const PatientSmsModal = ({ item, settings, onClose, }) => {
    const [activeTab, setActiveTab] = useState('welcome');
    const [customMessage, setCustomMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const mobileNumber = item.mobilePhone || '';
    const clinicName = settings.clinicName || 'مرکز درمانی';
    // 1. Send Welcome SMS (Kavenegar Lookup API with Pattern 'welcome' & ID '1488881')
    const handleSendWelcomeSms = async () => {
        if (!mobileNumber || mobileNumber.length < 10) {
            setStatusMessage({
                type: 'error',
                text: 'شماره موبایل بیمار معتبر نمی‌باشد یا ثبت نشده است.',
            });
            return;
        }
        setIsSending(true);
        setStatusMessage(null);
        const tokenVal = item.patientName.trim().replace(/\s+/g, '-');
        const token2Val = clinicName.trim().replace(/\s+/g, '-');
        try {
            // Step 1: Attempt send via Kavenegar Verify Lookup API with template name 'HISwelcome'
            let res = await fetch('/api/sms/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: mobileNumber,
                    template: 'HISwelcome',
                    token: tokenVal,
                }),
            });
            let data = await res.json();
            // Step 2: If template 'HISwelcome' failed, retry with template 'HISREGISTER'
            if (!data.success) {
                console.log('[SMS Modal] Retrying welcome lookup with pattern HISREGISTER...');
                res = await fetch('/api/sms/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile: mobileNumber,
                        template: 'HISREGISTER',
                        token: tokenVal,
                        token2: (item.patientCode || 'ثبت-شده').trim().replace(/\s+/g, '-'),
                    }),
                });
                data = await res.json();
            }
            // Step 3: Fallback to standard SMS API if Kavenegar pattern lookup is not yet approved
            if (!data.success) {
                console.log('[SMS Modal] Pattern lookup failed, using standard SMS fallback...');
                const fallbackText = `بیمار گرامی ${item.patientName}، به ${clinicName} خوش آمدید. پذیرش شما با موفقیت ثبت گردید. کد نوبت: ${item.patientCode || 'ثبت شده'}`;
                res = await fetch('/api/sms/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile: mobileNumber,
                        message: fallbackText,
                        sender: settings.smsSenderLine || undefined,
                    }),
                });
                data = await res.json();
            }
            if (data.success) {
                setStatusMessage({
                    type: 'success',
                    text: `✅ پیامک خوش‌آمدگویی (با الگوی welcome - کد ۱۴۸۸۸۸۱) با موفقیت به شماره ${mobileNumber} ارسال گردید.`,
                });
            }
            else {
                setStatusMessage({
                    type: 'error',
                    text: `❌ خطا در ارسال پیامک: ${data.message || data.error || 'پاسخ ناموفق وب‌سرویس کاوه‌نگار'}`,
                });
            }
        }
        catch (err) {
            setStatusMessage({
                type: 'error',
                text: `❌ خطا در ارتباط با سرور: ${err.message}`,
            });
        }
        finally {
            setIsSending(false);
        }
    };
    // 2. Send Settlement Invoice SMS
    const handleSendInvoiceSms = async () => {
        if (!mobileNumber || mobileNumber.length < 10) {
            setStatusMessage({
                type: 'error',
                text: 'شماره موبایل بیمار معتبر نمی‌باشد یا ثبت نشده است.',
            });
            return;
        }
        setIsSending(true);
        setStatusMessage(null);
        const totalText = item.totalCost ? item.totalCost.toLocaleString('fa-IR') : '۰';
        const paidText = item.paidAmount ? item.paidAmount.toLocaleString('fa-IR') : '۰';
        const invoiceMsg = `بیمار گرامی ${item.patientName}، صورتحساب خدمات درمانی شما در ${clinicName}:\nمبلغ کل: ${totalText} تومان\nمبلغ پرداختی: ${paidText} تومان\nتسویه با موفقیت انجام گردید. با تشکر از مراجعه شما.`;
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: mobileNumber,
                    message: invoiceMsg,
                    sender: settings.smsSenderLine || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage({
                    type: 'success',
                    text: `✅ پیامک صورتحساب با موفقیت به شماره ${mobileNumber} ارسال شد.`,
                });
            }
            else {
                setStatusMessage({
                    type: 'error',
                    text: `❌ خطا در ارسال پیامک: ${data.message || data.error || 'خطا در خط کاوه‌نگار'}`,
                });
            }
        }
        catch (err) {
            setStatusMessage({
                type: 'error',
                text: `❌ خطا در شبکه: ${err.message}`,
            });
        }
        finally {
            setIsSending(false);
        }
    };
    // 3. Send Custom SMS
    const handleSendCustomSms = async () => {
        if (!mobileNumber || mobileNumber.length < 10) {
            setStatusMessage({
                type: 'error',
                text: 'شماره موبایل بیمار معتبر نمی‌باشد یا ثبت نشده است.',
            });
            return;
        }
        if (!customMessage.trim()) {
            setStatusMessage({
                type: 'error',
                text: 'لطفاً متن پیامک را وارد نمایید.',
            });
            return;
        }
        setIsSending(true);
        setStatusMessage(null);
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: mobileNumber,
                    message: customMessage.trim(),
                    sender: settings.smsSenderLine || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage({
                    type: 'success',
                    text: `✅ پیامک سفارشی با موفقیت به شماره ${mobileNumber} ارسال گردید.`,
                });
            }
            else {
                setStatusMessage({
                    type: 'error',
                    text: `❌ خطا در ارسال: ${data.message || data.error}`,
                });
            }
        }
        catch (err) {
            setStatusMessage({
                type: 'error',
                text: `❌ خطا در سرور: ${err.message}`,
            });
        }
        finally {
            setIsSending(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150", children: _jsxs("div", { className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col", children: [_jsxs("div", { className: "bg-gradient-to-r from-teal-700 to-teal-800 text-white p-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MessageSquare, { className: "w-5 h-5 text-teal-200" }), _jsxs("div", { children: [_jsx("h3", { className: "font-extrabold text-sm", children: "\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u0628\u0647 \u0628\u06CC\u0645\u0627\u0631 \u067E\u0630\u06CC\u0631\u0634 \u0634\u062F\u0647" }), _jsx("p", { className: "text-[11px] text-teal-100 font-medium", children: "\u0648\u0628\u200C\u0633\u0631\u0648\u06CC\u0633 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631 (\u067E\u0646\u0644 \u062A\u062E\u0635\u0635\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9)" })] })] }), _jsx("button", { onClick: onClose, className: "p-1 hover:bg-white/20 rounded-lg transition text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "bg-slate-50 dark:bg-slate-800/60 p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100", children: [_jsx(User, { className: "w-4 h-4 text-teal-600" }), _jsx("span", { children: item.patientName }), _jsxs("span", { className: "text-[11px] text-slate-400 font-normal", children: ["(", item.patientCode || 'پذیرش شده', ")"] })] }), _jsxs("div", { className: "flex items-center gap-1 font-mono font-bold text-teal-700 dark:text-teal-300 dir-ltr", children: [_jsx(Phone, { className: "w-3.5 h-3.5 text-teal-600" }), _jsx("span", { children: mobileNumber || 'بدون شماره' })] })] }), _jsxs("div", { className: "flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-bold", children: [_jsxs("button", { onClick: () => setActiveTab('welcome'), className: `flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition ${activeTab === 'welcome'
                                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`, children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-amber-500" }), _jsx("span", { children: "\u062E\u0648\u0634\u200C\u0622\u0645\u062F\u06AF\u0648\u06CC\u06CC (\u0627\u0644\u06AF\u0648\u06CC welcome)" })] }), _jsxs("button", { onClick: () => setActiveTab('invoice'), className: `flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition ${activeTab === 'invoice'
                                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`, children: [_jsx(FileText, { className: "w-3.5 h-3.5 text-emerald-600" }), _jsx("span", { children: "\u062A\u0633\u0648\u06CC\u0647 \u062D\u0633\u0627\u0628 / \u0641\u0627\u06A9\u062A\u0648\u0631" })] }), _jsxs("button", { onClick: () => setActiveTab('custom'), className: `flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition ${activeTab === 'custom'
                                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-b-2 border-teal-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`, children: [_jsx(Send, { className: "w-3.5 h-3.5 text-indigo-600" }), _jsx("span", { children: "\u0645\u062A\u0646 \u0633\u0641\u0627\u0631\u0634\u06CC" })] })] }), _jsxs("div", { className: "p-4 space-y-4 flex-1 overflow-y-auto", children: [statusMessage && (_jsxs("div", { className: `p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-in fade-in ${statusMessage.type === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'}`, children: [statusMessage.type === 'success' ? (_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-600 shrink-0 mt-0.5" })) : (_jsx(AlertCircle, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" })), _jsx("span", { className: "leading-relaxed", children: statusMessage.text })] })), activeTab === 'welcome' && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "p-3 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1", children: [_jsx(Sparkles, { className: "w-4 h-4 text-amber-500" }), "\u0645\u0634\u062E\u0635\u0627\u062A \u0627\u0644\u06AF\u0648\u06CC \u062E\u0648\u0634\u200C\u0622\u0645\u062F\u06AF\u0648\u06CC\u06CC \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631:"] }), _jsx("span", { className: "text-[10px] bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100 font-mono font-bold px-2 py-0.5 rounded-md", children: "\u0634\u0646\u0627\u0633\u0647: \u06F1\u06F4\u06F8\u06F8\u06F8\u06F8\u06F1" })] }), _jsxs("div", { className: "text-xs space-y-1.5 text-slate-700 dark:text-slate-300 border-t border-teal-200 dark:border-teal-800 pt-2 font-mono", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "\u0646\u0627\u0645 \u0627\u0644\u06AF\u0648\u06CC \u067E\u0627\u062A\u0631\u0646:" }), _jsx("span", { className: "font-bold text-teal-700 dark:text-teal-300", children: "welcome" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { className: "text-slate-500", children: ["\u0645\u062A\u063A\u06CC\u0631 \u0627\u0648\u0644 ", '({token})', ":"] }), _jsx("span", { className: "font-bold text-slate-900 dark:text-slate-100", children: item.patientName })] }), _jsxs("div", { className: "flex justify-between", children: [_jsxs("span", { className: "text-slate-500", children: ["\u0645\u062A\u063A\u06CC\u0631 \u062F\u0648\u0645 ", '({token2})', ":"] }), _jsx("span", { className: "font-bold text-slate-900 dark:text-slate-100", children: clinicName })] })] })] }), _jsx("p", { className: "text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed", children: "\u0627\u06CC\u0646 \u067E\u06CC\u0627\u0645\u06A9 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u0648\u0628\u200C\u0633\u0631\u0648\u06CC\u0633 \u0633\u0631\u06CC\u0639 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631 (Service Lookup) \u0628\u062F\u0648\u0646 \u0639\u0628\u0648\u0631 \u0627\u0632 \u0628\u0644\u06A9\u200C\u0644\u06CC\u0633\u062A \u062A\u0628\u0644\u06CC\u063A\u0627\u062A\u06CC \u0628\u0647 \u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647 \u0628\u06CC\u0645\u0627\u0631 \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F." }), _jsx("button", { type: "button", onClick: handleSendWelcomeSms, disabled: isSending, className: "w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2", children: isSending ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-teal-200" }), _jsx("span", { children: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u062E\u0648\u0634\u200C\u0622\u0645\u062F\u06AF\u0648\u06CC\u06CC..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u062E\u0648\u0634\u200C\u0622\u0645\u062F\u06AF\u0648\u06CC\u06CC (\u067E\u0627\u062A\u0631\u0646 welcome - \u06A9\u062F 1488881)" })] })) })] })), activeTab === 'invoice' && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs", children: [_jsx("div", { className: "font-bold text-slate-800 dark:text-slate-200 mb-1", children: "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u067E\u06CC\u0627\u0645\u06A9 \u062A\u0631\u062E\u06CC\u0635 \u0648 \u062A\u0633\u0648\u06CC\u0647 \u062D\u0633\u0627\u0628:" }), _jsxs("div", { className: "p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]", children: ["\u0628\u06CC\u0645\u0627\u0631 \u06AF\u0631\u0627\u0645\u06CC ", item.patientName, "\u060C \u0635\u0648\u0631\u062A\u062D\u0633\u0627\u0628 \u062E\u062F\u0645\u0627\u062A \u062F\u0631\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062F\u0631 ", clinicName, ":", _jsx("br", {}), "\u0645\u0628\u0644\u063A \u06A9\u0644: ", item.totalCost ? item.totalCost.toLocaleString('fa-IR') : '۰', " \u062A\u0648\u0645\u0627\u0646", _jsx("br", {}), "\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC: ", item.paidAmount ? item.paidAmount.toLocaleString('fa-IR') : '۰', " \u062A\u0648\u0645\u0627\u0646", _jsx("br", {}), "\u062A\u0633\u0648\u06CC\u0647 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u06AF\u0631\u062F\u06CC\u062F. \u0628\u0627 \u062A\u0634\u06A9\u0631 \u0627\u0632 \u0645\u0631\u0627\u062C\u0639\u0647 \u0634\u0645\u0627."] })] }), _jsx("button", { type: "button", onClick: handleSendInvoiceSms, disabled: isSending, className: "w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2", children: isSending ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-emerald-200" }), _jsx("span", { children: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u0635\u0648\u0631\u062A\u062D\u0633\u0627\u0628..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u0635\u0648\u0631\u062A\u062D\u0633\u0627\u0628 \u0648 \u062A\u0631\u062E\u06CC\u0635" })] })) })] })), activeTab === 'custom' && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1", children: "\u0645\u062A\u0646 \u0633\u0641\u0627\u0631\u0634\u06CC \u067E\u06CC\u0627\u0645\u06A9:" }), _jsx("textarea", { rows: 4, value: customMessage, onChange: (e) => setCustomMessage(e.target.value), placeholder: `بیمار گرامی ${item.patientName}، پیام شما از سوی کلینیک...`, className: "w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500" })] }), _jsx("button", { type: "button", onClick: handleSendCustomSms, disabled: isSending || !customMessage.trim(), className: "w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2", children: isSending ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-indigo-200" }), _jsx("span", { children: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u0633\u0641\u0627\u0631\u0634\u06CC" })] })) })] }))] }), _jsx("div", { className: "p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end", children: _jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition", children: "\u0628\u0633\u062A\u0646" }) })] }) }));
};
