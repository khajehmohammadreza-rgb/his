import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * Kavenegar SMS Management & Testing UI Component
 * Enterprise Administration Panel for Kavenegar SMS Subsystem in HIS
 */
import React, { useState, useEffect } from '../../client-vendor/react.js?b=r24-514-1405';
import { Send, MessageSquare, ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, Phone, Settings, Database, Download, Sparkles } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { OFFICIAL_KAVENEGAR_TEMPLATES } from '../config/kavenegar.js?b=r24-514-1405';
import { SmsAutomationPanel } from './SmsAutomationPanel.js?b=r24-514-1405';
export const SmsManagementPanel = ({ settings = {}, patients = [], visitQueue = [], appointments = [], medicalServices = [], onUpdateSettings, currentUser }) => {
    const role=String(currentUser?.role||'');
    const canManageSettings=['admin','superadmin'].includes(role);
    const canViewLogs=['admin','superadmin','accountant','cashier'].includes(role);
    const [activeTab, setActiveTab] = useState('automation');
    const [webhookConfig, setWebhookConfig] = useState(null);
    const [loadingWebhook, setLoadingWebhook] = useState(false);
    const [webhookCopied, setWebhookCopied] = useState(false);
    const [inbox, setInbox] = useState([]);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const fetchWebhookConfig = async () => {
        setLoadingWebhook(true);
        try {
            const res = await fetch('/api/bastian/system/integrations', { credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.error || data.message || `HTTP ${res.status}`);
            setWebhookConfig(data.providers?.kavenegar || null);
        } catch (err) {
            setWebhookConfig({ error: err.message });
        } finally {
            setLoadingWebhook(false);
        }
    };
    const copyWebhookUrl = async () => {
        const url = webhookConfig?.webhookUrl;
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setWebhookCopied(true);
            setTimeout(() => setWebhookCopied(false), 1800);
        } catch {
            alert('کپی خودکار انجام نشد؛ URL را به‌صورت دستی کپی کنید.');
        }
    };
    const fetchInbox = async () => { setLoadingInbox(true); try { const res = await fetch('/api/sms/inbox?limit=200'); const data = await res.json(); if (data.success && Array.isArray(data.messages)) setInbox(data.messages); } catch (err) { console.error('Failed to fetch SMS inbox:', err); } finally { setLoadingInbox(false); } };
    // Settings state
    const [serverSmsConfigured, setServerSmsConfigured] = useState(null);
    const [senderNumber, setSenderNumber] = useState('');
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [defaultOrgName, setDefaultOrgName] = useState('مرکز درمانی');
    const [templatesConfig, setTemplatesConfig] = useState(OFFICIAL_KAVENEGAR_TEMPLATES);
    // Send Normal SMS Form
    const [sendMobile, setSendMobile] = useState('');
    const [sendMessage, setSendMessage] = useState('نوبت شما در کلینیک با موفقیت ثبت گردید.');
    const [sendSender, setSendSender] = useState('');
    const [sendingNormal, setSendingNormal] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    // Send Verify SMS Form
    const [verifyMobile, setVerifyMobile] = useState('');
    const [verifyToken, setVerifyToken] = useState('');
    const [verifyTemplate, setVerifyTemplate] = useState('HISOTP');
    const [verifyToken2, setVerifyToken2] = useState('پزشک معالج');
    const [verifyToken3, setVerifyToken3] = useState('3');
    const [sendingVerify, setSendingVerify] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    // Logs
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [filterMobile, setFilterMobile] = useState('');
    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const url = filterMobile
                ? `/api/sms/logs?mobile=${encodeURIComponent(filterMobile)}`
                : '/api/sms/logs';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && Array.isArray(data.logs)) {
                setLogs(data.logs);
            }
        }
        catch (err) {
            console.error('Failed to fetch SMS logs:', err);
        }
        finally {
            setLoadingLogs(false);
        }
    };
    useEffect(() => {
        fetchLogs();
        fetchInbox();
        fetchWebhookConfig();
    }, []);
    const handleSendNormalSMS = async (e) => {
        e.preventDefault();
        if (!sendMobile) {
            alert('لطفاً شماره موبایل گیرنده را وارد نمایید.');
            return;
        }
        setSendingNormal(true);
        setSendResult(null);
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: sendMobile,
                    message: sendMessage,
                    sender: sendSender || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSendResult({ success: true, message: data.message || 'پیامک با موفقیت ارسال شد' });
            }
            else {
                setSendResult({ success: false, message: data.message || 'خطا در ارسال پیامک' });
            }
            fetchLogs();
        }
        catch (err) {
            setSendResult({ success: false, message: 'خطا در شبکه: ' + err.message });
        }
        finally {
            setSendingNormal(false);
        }
    };
    const handleSendVerifySMS = async (e) => {
        e.preventDefault();
        if (!verifyMobile) {
            alert('لطفاً شماره موبایل را وارد کنید.');
            return;
        }
        if (!verifyToken) {
            alert('لطفاً کد تایید (token) را وارد کنید.');
            return;
        }
        if (!verifyTemplate) {
            alert('لطفاً نام قالب (template) کاوهنگار را وارد کنید.');
            return;
        }
        setSendingVerify(true);
        setVerifyResult(null);
        try {
            const res = await fetch('/api/sms/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: verifyMobile,
                    token: verifyToken,
                    template: verifyTemplate,
                    token2: verifyToken2 || undefined,
                    token3: verifyToken3 || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setVerifyResult({ success: true, message: data.message || 'پیامک کد تایید با موفقیت ارسال شد' });
            }
            else {
                setVerifyResult({ success: false, message: data.message || 'خطا در ارسال کد تایید' });
            }
            fetchLogs();
        }
        catch (err) {
            setVerifyResult({ success: false, message: 'خطا در شبکه: ' + err.message });
        }
        finally {
            setSendingVerify(false);
        }
    };
    const handleTestConnection = async () => {
        try {
            const res = await fetch('/api/sms/status');
            const data = await res.json();
            setServerSmsConfigured(!!data.configured);
            alert(data.configured
                ? 'کلید پیامک در سمت سرور تنظیم شده است. برای اطمینان نهایی، یک پیامک آزمایشی به شماره مجاز ارسال کنید.'
                : 'کلید پیامک برای این مرکز ثبت نشده است. Super Admin می‌تواند آن را از بخش «مدیریت نسخه و سرویس‌ها» تنظیم کند.');
        }
        catch (e) {
            alert('خطا در اتصال: ' + e.message);
        }
    };
    return (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs shadow-sm", children: [_jsxs("div", { className: "flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-3 gap-3", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse", children: [_jsx(MessageSquare, { className: "w-5 h-5 text-sky-400" }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-100 text-sm", children: "\u067E\u0646\u0644 \u0645\u0631\u06A9\u0632\u06CC \u0645\u062F\u06CC\u0631\u06CC\u062A \u067E\u06CC\u0627\u0645\u06A9 \u06A9\u0627\u0648\u0647\u0646\u06AF\u0627\u0631 (Kavenegar SMS Subsystem)" }), _jsx("p", { className: "text-[11px] text-slate-400 mt-0.5", children: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0642\u0627\u0644\u0628\u200C\u0647\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F\u0647\u060C \u0646\u0642\u0634\u0647 \u0628\u0631\u062F\u0627\u0631\u06CC \u0645\u062A\u063A\u06CC\u0631\u0647\u0627\u060C \u0635\u0641 \u0627\u0631\u0633\u0627\u0644 \u0648 \u062B\u0628\u062A \u06A9\u0627\u0645\u0644 \u062F\u0631 \u062C\u062F\u0648\u0644 SMS_LOG" })] })] }), _jsxs("div", { className: "flex items-center flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1", children: [_jsxs("button", { type: "button", onClick: () => setActiveTab('automation'), className: `px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${activeTab === 'automation' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-amber-300" }), _jsx("span", { children: "اتوماسیون هوشمند (۴۸ و ۲۴ ساعت)" })] }), _jsx("button", { type: "button", onClick: () => setActiveTab('send'), className: `px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'send' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: "\u0627\u0631\u0633\u0627\u0644 \u0639\u0627\u062F\u06CC" }), _jsx("button", { type: "button", onClick: () => setActiveTab('verify'), className: `px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'verify' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: "\u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F (Lookup)" }), _jsxs("button", { type: "button", onClick: () => setActiveTab('templates'), className: `px-3 py-1.5 rounded-lg font-bold transition ${activeTab === 'templates' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: ["\u0642\u0627\u0644\u0628\u200C\u0647\u0627\u06CC \u0645\u0635\u0648\u0628 (", Object.keys(templatesConfig).length, ")"] }), canManageSettings && (_jsxs("button", { type: "button", onClick: () => setActiveTab('settings'), className: `px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${activeTab === 'settings' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(Settings, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A API" })] })), canViewLogs && (_jsxs("button", { type: "button", onClick: () => {
                                    setActiveTab('logs');
                                    fetchLogs();
                                }, className: `px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${activeTab === 'logs' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(Database, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u06AF\u0632\u0627\u0631\u0634\u0627\u062A (SMS_LOG)" })] })) , _jsxs("button", { type: "button", onClick: () => { fetchWebhookConfig(); setActiveTab('webhook'); }, className: `px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${activeTab === 'webhook' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(Settings, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Webhook خط اختصاصی" })] }), _jsx("button", { type: "button", onClick: () => { setActiveTab('inbox'); fetchInbox(); }, className: `px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${activeTab === 'inbox' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`, children: [_jsx(MessageSquare, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "صندوق دریافتی" })] })] })] }), activeTab === 'webhook' && (_jsxs("div", { className: "space-y-4 max-w-3xl", children: [
    _jsxs("div", { className: "bg-slate-950 border border-orange-500/30 rounded-xl p-4 space-y-4", children: [
        _jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [
            _jsxs("div", { children: [
                _jsx("h4", { className: "font-bold text-slate-100 text-sm", children: "Webhook دریافت پیامک خط اختصاصی کاوه‌نگار" }),
                _jsx("p", { className: "text-[10px] text-slate-400 mt-1", children: "این آدرس را در پنل کاوه‌نگار برای درخواست POST پیامک دریافتی قرار دهید." })
            ] }),
            _jsx("button", { type: "button", onClick: fetchWebhookConfig, disabled: loadingWebhook, className: "bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold", children: loadingWebhook ? "در حال دریافت..." : "بازخوانی" })
        ] }),
        webhookConfig?.error ? _jsx("div", { className: "p-3 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-300 text-xs", children: webhookConfig.error }) : _jsxs("div", { className: "space-y-3", children: [
            _jsxs("div", { children: [
                _jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "آدرس Webhook (URL)" }),
                _jsxs("div", { className: "flex gap-2", children: [
                    _jsx("input", { readOnly: true, value: webhookConfig?.webhookUrl || "", className: "flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-[10px] dir-ltr" }),
                    _jsx("button", { type: "button", onClick: copyWebhookUrl, disabled: !webhookConfig?.webhookUrl, className: "bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs", children: webhookCopied ? "کپی شد ✓" : "کپی URL" })
                ] })
            ] }),
            _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-3", children: [
                    _jsx("div", { className: "font-bold text-slate-200 mb-2", children: "پارامترهای دریافتی" }),
                    _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs font-mono", children: [
                        _jsx("div", { className: "text-slate-300", children: "from ← فرستنده" }), _jsx("div", { className: "text-slate-300", children: "to ← خط مقصد" }),
                        _jsx("div", { className: "text-slate-300", children: "message ← متن پیام" }), _jsx("div", { className: "text-slate-300", children: "messageId ← شناسه پیام" })
                    ] })
                ] }),
                _jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-3", children: [
                    _jsx("div", { className: "font-bold text-slate-200 mb-2", children: "تنظیمات لازم در کاوه‌نگار" }),
                    _jsx("div", { className: "text-slate-300 text-xs leading-6 whitespace-pre-line", children: "Method: POST\nکانال: پیامک\nنوع: دریافتی\nفرمت: JSON" })
                ] })
            ] }),
            _jsx("div", { className: "rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 text-[10px] text-amber-200 leading-6", children: "پس از ذخیره URL در کاوه‌نگار، یک پیامک آزمایشی به خط اختصاصی ارسال کنید. پیام پس از دریافت در صندوق دریافتی HIS ثبت و در صورت تطابق شماره، به پرونده بیمار متصل می‌شود." })
        ] })
    ] })
] })),
activeTab === 'automation' && (_jsx(SmsAutomationPanel, { settings: settings, patients: patients, visitQueue: visitQueue, appointments: appointments, medicalServices: medicalServices, onUpdateSettings: onUpdateSettings, currentUser: currentUser })),
activeTab === 'inbox' && (_jsxs("div", { className: "space-y-3", children: [
    _jsxs("div", { className: "flex items-center justify-between", children: [
        _jsx("div", { className: "font-bold text-slate-200", children: "صندوق پیامک‌های دریافتی" }),
        _jsx("button", { type: "button", onClick: fetchInbox, disabled: loadingInbox, className: "bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold", children: loadingInbox ? "در حال دریافت..." : "بازخوانی" })
    ] }),
    _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-800 bg-slate-950", children: _jsxs("table", { className: "w-full text-right text-xs text-slate-300", children: [
        _jsx("thead", { className: "bg-slate-900 text-slate-400 font-bold", children: _jsxs("tr", { children: [
            _jsx("th", { className: "p-2.5", children: "زمان" }), _jsx("th", { className: "p-2.5", children: "فرستنده" }), _jsx("th", { className: "p-2.5", children: "متن پیام" }), _jsx("th", { className: "p-2.5", children: "بیمار" }), _jsx("th", { className: "p-2.5", children: "شناسه پیام" })
        ] }) }),
        _jsx("tbody", { className: "divide-y divide-slate-800", children: inbox.length === 0 ? _jsx("tr", { children: _jsx("td", { colSpan: 5, className: "p-6 text-center text-slate-500", children: loadingInbox ? "در حال دریافت..." : "پیامک دریافتی ثبت‌شده‌ای وجود ندارد." }) }) : inbox.map((msg) => _jsxs("tr", { className: "hover:bg-slate-900/50", children: [
            _jsx("td", { className: "p-2.5 whitespace-nowrap", children: msg.received_at ? new Date(msg.received_at).toLocaleString('fa-IR') : '-' }),
            _jsx("td", { className: "p-2.5 font-mono", children: msg.from_mobile || '-' }),
            _jsx("td", { className: "p-2.5 max-w-md", children: msg.message || '-' }),
            _jsx("td", { className: "p-2.5", children: msg.patient_name || (msg.patient_id ? `#${msg.patient_id}` : 'ناشناس') }),
            _jsx("td", { className: "p-2.5 font-mono text-[10px] text-slate-500", children: msg.message_id || '-' })
        ] }, `${msg.message_id || msg.id || ''}-${msg.received_at || ''}`)) })
    ] }) })
] })),
activeTab === 'send' && (_jsxs("form", { onSubmit: handleSendNormalSMS, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u06AF\u06CC\u0631\u0646\u062F\u0647 (receptor)" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "text", placeholder: "09123456789 \u06CC\u0627 +989123456789", value: sendMobile, onChange: (e) => setSendMobile(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-9 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono", required: true }), _jsx(Phone, { className: "w-4 h-4 text-slate-500 absolute top-2.5 right-3" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0641\u0631\u0633\u062A\u0646\u062F\u0647 (sender)" }), _jsx("input", { type: "text", placeholder: "9982001217", value: sendSender, onChange: (e) => setSendSender(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645\u06A9 \u0627\u0637\u0644\u0627\u0639\u200C\u0631\u0633\u0627\u0646\u06CC (message)" }), _jsx("textarea", { rows: 3, value: sendMessage, onChange: (e) => setSendMessage(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-sky-500", required: true })] }), sendResult && (_jsxs("div", { className: `p-3 rounded-xl border flex items-center gap-2 ${sendResult.success
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-800 text-rose-300'}`, children: [sendResult.success ? _jsx(CheckCircle, { className: "w-5 h-5 text-emerald-400 shrink-0" }) : _jsx(AlertTriangle, { className: "w-5 h-5 text-rose-400 shrink-0" }), _jsx("span", { children: sendResult.message })] })), _jsx("div", { className: "flex justify-end", children: _jsxs("button", { type: "submit", disabled: sendingNormal, className: "bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl transition flex items-center gap-2 shadow-sm", children: [sendingNormal ? _jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }) : _jsx(Send, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u0639\u0627\u062F\u06CC (POST /api/sms/send)" })] }) })] })), activeTab === 'verify' && (_jsxs("form", { onSubmit: handleSendVerifySMS, className: "space-y-4", children: [_jsx("div", { className: "bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-400 text-[11px] leading-relaxed", children: "\uD83D\uDCA1 \u0627\u0631\u0633\u0627\u0644 \u0628\u0627 \u0633\u0631\u0648\u06CC\u0633 Lookup \u0628\u0631\u0627\u06CC \u06A9\u062F\u0647\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F\u060C \u0646\u0648\u0628\u062A\u200C\u062F\u0647\u06CC \u0648 \u067E\u0630\u06CC\u0631\u0634 \u0628\u0627 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u0627\u0644\u06AF\u0648\u0647\u0627\u06CC \u0631\u0633\u0645\u06CC \u0645\u0635\u0648\u0628 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631 (\u0628\u062F\u0648\u0646 \u0645\u062D\u062F\u0648\u062F\u06CC\u062A \u0628\u0644\u06A9\u200C\u0644\u06CC\u0633\u062A)." }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644 \u06AF\u06CC\u0631\u0646\u062F\u0647 (receptor)" }), _jsx("input", { type: "text", placeholder: "09123456789", value: verifyMobile, onChange: (e) => setVerifyMobile(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0642\u0627\u0644\u0628 \u0645\u0635\u0648\u0628 (Template Name)" }), _jsx("select", { value: verifyTemplate, onChange: (e) => setVerifyTemplate(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono", children: Object.keys(templatesConfig).map((tplKey) => (_jsxs("option", { value: tplKey, children: [tplKey, " (\u0634\u0646\u0627\u0633\u0647: ", templatesConfig[tplKey].id, ") - ", templatesConfig[tplKey].purpose] }, tplKey))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0645\u062A\u063A\u06CC\u0631 \u0627\u0648\u0644 (%token%)" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627\u064B \u06A9\u062F \u062A\u0627\u06CC\u06CC\u062F \u06CC\u0627 \u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631...", value: verifyToken, onChange: (e) => setVerifyToken(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0645\u062A\u063A\u06CC\u0631 \u062F\u0648\u0645 (%token2%) - \u0627\u062E\u062A\u06CC\u0627\u0631\u06CC" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627\u064B \u0646\u0627\u0645 \u067E\u0632\u0634\u06A9 \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647...", value: verifyToken2, onChange: (e) => setVerifyToken2(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0645\u062A\u063A\u06CC\u0631 \u0633\u0648\u0645 (%token3%) - \u0627\u062E\u062A\u06CC\u0627\u0631\u06CC" }), _jsx("input", { type: "text", placeholder: "\u0645\u062B\u0644\u0627\u064B \u0627\u0639\u062A\u0628\u0627\u0631 \u062F\u0642\u06CC\u0642\u0647 \u06CC\u0627 \u062A\u0627\u0631\u06CC\u062E...", value: verifyToken3, onChange: (e) => setVerifyToken3(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono" })] })] }), verifyResult && (_jsxs("div", { className: `p-3 rounded-xl border flex items-center gap-2 ${verifyResult.success
                            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-800 text-rose-300'}`, children: [verifyResult.success ? _jsx(CheckCircle, { className: "w-5 h-5 text-emerald-400 shrink-0" }) : _jsx(AlertTriangle, { className: "w-5 h-5 text-rose-400 shrink-0" }), _jsx("span", { children: verifyResult.message })] })), _jsx("div", { className: "flex justify-end", children: _jsxs("button", { type: "submit", disabled: sendingVerify, className: "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl transition flex items-center gap-2 shadow-sm", children: [sendingVerify ? _jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }) : _jsx(ShieldCheck, { className: "w-4 h-4" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u0627\u0644\u06AF\u0648 Lookup (POST /api/sms/verify)" })] }) })] })), activeTab === 'templates' && (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 text-[11px] leading-relaxed", children: "\uD83D\uDCCB \u0644\u06CC\u0633\u062A \u06A9\u0627\u0645\u0644 \u06F1\u06F5 \u0642\u0627\u0644\u0628 \u0645\u0635\u0648\u0628 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631 \u062F\u0631 \u0633\u0627\u0645\u0627\u0646\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0645\u0631\u06A9\u0632 \u062F\u0631\u0645\u0627\u0646\u06CC. \u0627\u06CC\u0646 \u0642\u0627\u0644\u0628\u200C\u0647\u0627 \u0628\u0631\u0627\u06CC \u0627\u062D\u0631\u0627\u0632 \u0647\u0648\u06CC\u062A\u060C \u0646\u0648\u0628\u062A\u200C\u062F\u0647\u06CC\u060C \u067E\u0630\u06CC\u0631\u0634\u060C \u0635\u0648\u0631\u062A\u062D\u0633\u0627\u0628 \u0648 \u0646\u0633\u062E\u0647 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F." }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: Object.keys(templatesConfig).map((key) => {
                            const tpl = templatesConfig[key];
                            return (_jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-bold text-sky-400 font-mono text-xs", children: tpl.name }), _jsxs("span", { className: "bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]", children: ["ID: ", tpl.id] })] }), _jsx("div", { className: "text-[11px] text-slate-400 font-medium", children: tpl.purpose }), _jsx("div", { className: "bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-line", children: tpl.content }), _jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsxs("span", { className: "text-[10px] text-slate-500", children: ["\u0645\u062A\u063A\u06CC\u0631\u0647\u0627: ", tpl.requiredVariables.join(', ')] }), _jsx("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded ${tpl.enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`, children: tpl.enabled ? 'فعال' : 'غیرفعال' })] })] }, key));
                        }) })] })), activeTab === 'settings' && (_jsx("div", { className: "space-y-4 max-w-2xl", children: _jsxs("div", { className: "bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3", children: [_jsxs("h4", { className: "font-bold text-slate-200 text-xs flex items-center gap-1.5 border-b border-slate-800 pb-2", children: [_jsx(Settings, { className: "w-4 h-4 text-amber-400" }), _jsx("span", { children: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0627\u0631\u062A\u0628\u0627\u0637\u06CC \u062F\u0631\u06AF\u0627\u0647 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631 (Settings \u2192 SMS \u2192 Kavenegar)" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-900 p-3", children: [_jsx("div", { className: "font-bold text-slate-200", children: "\u06A9\u0644\u06CC\u062F API \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631 \u0641\u0642\u0637 \u062F\u0631 \u0633\u0631\u0648\u0631" }), _jsx("p", { className: "text-[10px] text-slate-500 mt-1 leading-5", children: "\u0628\u0631\u0627\u06CC \u062C\u0644\u0648\u06AF\u06CC\u0631\u06CC \u0627\u0632 \u0627\u0641\u0634\u0627\u06CC Credential\u060C \u06A9\u0644\u06CC\u062F API \u062F\u0631 \u0645\u0631\u0648\u0631\u06AF\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u06CC\u0627 \u0630\u062E\u06CC\u0631\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F. \u0622\u0646 \u0631\u0627 \u0647\u0646\u06AF\u0627\u0645 Setup \u06CC\u0627 \u062F\u0631 \u0641\u0627\u06CC\u0644 \u0645\u062D\u0627\u0641\u0638\u062A\u200C\u0634\u062F\u0647 api/config.local.php \u062A\u0646\u0638\u06CC\u0645 \u06A9\u0646\u06CC\u062F." }), serverSmsConfigured !== null && (_jsxs("div", { className: `mt-2 text-xs font-bold ${serverSmsConfigured ? 'text-emerald-400' : 'text-amber-400'}`, children: ["\u0648\u0636\u0639\u06CC\u062A \u0633\u0631\u0648\u0631: ", serverSmsConfigured ? 'کلید تنظیم شده است' : 'کلید تنظیم نشده است'] }))] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u062E\u0637 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 (Sender Number)" }), _jsx("input", { type: "text", value: senderNumber, onChange: (e) => setSenderNumber(e.target.value), className: "w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-bold mb-1", children: "\u0646\u0627\u0645 \u0633\u0627\u0632\u0645\u0627\u0646 / \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636" }), _jsx("input", { type: "text", value: defaultOrgName, onChange: (e) => setDefaultOrgName(e.target.value), className: "w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs" })] })] }), _jsxs("div", { className: "flex items-center justify-between pt-2", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: smsEnabled, onChange: (e) => setSmsEnabled(e.target.checked), className: "w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500" }), _jsx("span", { className: "text-slate-200 font-bold", children: "\u0641\u0639\u0627\u0644\u200C\u0633\u0627\u0632\u06CC \u06A9\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9 \u062F\u0631 \u0633\u0631\u0627\u0633\u0631 HIS" })] }), _jsxs("button", { type: "button", onClick: handleTestConnection, className: "bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5", children: [_jsx(RefreshCw, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062A\u0633\u062A \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0648\u0628\u200C\u0633\u0631\u0648\u06CC\u0633" })] })] })] })] }) })), activeTab === 'logs' && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 flex-1 max-w-sm", children: [_jsx("input", { type: "text", placeholder: "\u0641\u06CC\u0644\u062A\u0631 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644...", value: filterMobile, onChange: (e) => setFilterMobile(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs" }), _jsx("button", { type: "button", onClick: fetchLogs, className: "bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl transition shrink-0", children: "\u062C\u0633\u062A\u062C\u0648" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => {
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
                                            const downloadAnchor = document.createElement('a');
                                            downloadAnchor.setAttribute("href", dataStr);
                                            downloadAnchor.setAttribute("download", `sms_logs_${Date.now()}.json`);
                                            document.body.appendChild(downloadAnchor);
                                            downloadAnchor.click();
                                            downloadAnchor.remove();
                                        }, className: "bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 text-xs", children: [_jsx(Download, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062E\u0631\u0648\u062C\u06CC JSON" })] }), _jsxs("button", { type: "button", onClick: fetchLogs, disabled: loadingLogs, className: "text-slate-400 hover:text-slate-100 flex items-center gap-1.5 transition text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl", children: [_jsx(RefreshCw, { className: `w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}` }), _jsx("span", { children: "\u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC" })] })] })] }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-800 bg-slate-950", children: _jsxs("table", { className: "w-full text-right text-xs text-slate-300", children: [_jsx("thead", { className: "bg-slate-900 text-slate-400 font-bold border-b border-slate-800", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u0634\u0646\u0627\u0633\u0647 LOG" }), _jsx("th", { className: "p-2.5", children: "\u0645\u0627\u0698\u0648\u0644 / \u0642\u0627\u0644\u0628" }), _jsx("th", { className: "p-2.5", children: "\u0645\u0648\u0628\u0627\u06CC\u0644" }), _jsx("th", { className: "p-2.5", children: "\u0645\u062A\u0646 / \u062A\u0648\u06A9\u0646\u200C\u0647\u0627" }), _jsx("th", { className: "p-2.5 text-center", children: "\u06A9\u062F \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631" }), _jsx("th", { className: "p-2.5", children: "\u0648\u0636\u0639\u06CC\u062A \u062A\u062D\u0648\u06CC\u0644" }), _jsx("th", { className: "p-2.5", children: "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F" }), _jsx("th", { className: "p-2.5", children: "\u0632\u0645\u0627\u0646 \u062B\u0628\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: logs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "p-6 text-center text-slate-500", children: "\u0647\u06CC\u0686 \u062A\u0631\u0627\u06A9\u0646\u0634\u06CC \u062F\u0631 \u062C\u062F\u0648\u0644 SMS_LOG \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." }) })) : (logs.map((log) => (_jsxs("tr", { className: "hover:bg-slate-900/50", children: [_jsx("td", { className: "p-2.5 font-mono text-[10px] text-slate-500", children: log.id }), _jsxs("td", { className: "p-2.5", children: [_jsx("div", { className: "font-bold text-sky-300", children: log.module || 'عمومی' }), _jsx("div", { className: "text-[10px] font-mono text-slate-400", children: log.template_name ? `${log.template_name} (ID: ${log.template_id || '-'})` : 'متن آزاد' })] }), _jsx("td", { className: "p-2.5 font-mono text-slate-200", children: log.mobile }), _jsxs("td", { className: "p-2.5 max-w-xs truncate", title: log.message, children: [log.message, log.token_values && _jsxs("div", { className: "text-[10px] font-mono text-slate-500 mt-0.5", children: ["Tokens: ", log.token_values] })] }), _jsx("td", { className: "p-2.5 font-mono text-center text-slate-300", children: log.kavenegar_code }), _jsx("td", { className: "p-2.5", children: log.status === 'success' ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-emerald-400 font-bold", children: [_jsx(CheckCircle, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0645\u0648\u0641\u0642" })] })) : (_jsxs("span", { className: "inline-flex items-center gap-1 text-rose-400 font-bold", title: log.error_reason || 'خطا', children: [_jsx(AlertTriangle, { className: "w-3.5 h-3.5" }), _jsx("span", { children: log.error_reason || 'ناموفق' })] })) }), _jsxs("td", { className: "p-2.5 font-mono text-center text-slate-400", children: [log.retry_count || 0, " \u0628\u0627\u0631"] }), _jsxs("td", { className: "p-2.5 font-mono text-[11px] text-slate-400", children: [new Date(log.created_at).toLocaleTimeString('fa-IR'), " - ", new Date(log.created_at).toLocaleDateString('fa-IR')] })] }, log.id)))) })] }) })] }))] }));
};
