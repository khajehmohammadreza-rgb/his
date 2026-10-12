import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useEffect, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { CheckCircle2, Sparkles, X } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { APP_VERSION } from '../utils/appVersion.js?b=r24-514-1405';

const STORAGE_KEY_VERSION = 'bastiyan_last_seen_version';

export const AppUpdateNotificationModal = ({ onDismiss }) => {
    const [showModal, setShowModal] = useState(false);
    const [serverChanges, setServerChanges] = useState([]);
    useEffect(() => {
        try { setShowModal(localStorage.getItem(STORAGE_KEY_VERSION) !== APP_VERSION); }
        catch { setShowModal(false); }
        fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : null)
            .then((meta) => { if (Array.isArray(meta?.notes)) setServerChanges(meta.notes); })
            .catch(() => { });
    }, []);
    const close = () => {
        try { localStorage.setItem(STORAGE_KEY_VERSION, APP_VERSION); } catch { }
        setShowModal(false); if (onDismiss) onDismiss();
    };
    if (!showModal) return null;
    const fallbackChanges = [
        'نصب امن فایل به‌روزرسانی از داخل پنل Super Admin با پشتیبان و امکان بازگشت',
        'اصلاح قطعی ارتباط نام و مشخصات مرکز با رکورد ثبت‌شده در مدیریت کل',
        'مدیریت رمزگذاری‌شده کلیدهای کاوه‌نگار، Gemini و استعلام هویت برای هر مرکز',
        'حذف وابستگی زمان اجرا به client-vendor/cache و پاک‌سازی خودکار کش نسخه‌های قدیمی',
    ];
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md", dir: "rtl", children: _jsxs("div", { className: "w-full max-w-lg overflow-hidden rounded-3xl border border-teal-700/50 bg-slate-900 text-slate-100 shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 bg-gradient-to-l from-teal-900 to-slate-950 p-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-2xl border border-teal-600/50 bg-teal-500/10 p-3", children: _jsx(Sparkles, { className: "h-6 w-6 text-teal-300" }) }), _jsxs("div", { children: [_jsxs("h3", { className: "font-black text-white", children: ["Bastiyan HIS نسخه ", APP_VERSION] }), _jsx("p", { className: "mt-1 text-xs text-teal-200", children: "این نسخه اکنون روی سامانه فعال است." })] })] }), _jsx("button", { type: "button", onClick: close, className: "rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white", title: "بستن", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "space-y-4 p-5", children: [_jsx("p", { className: "text-sm leading-7 text-slate-300", children: "مهم‌ترین اصلاحات این انتشار:" }), _jsx("ul", { className: "space-y-3", children: (serverChanges.length ? serverChanges : fallbackChanges).map((item) => _jsxs("li", { className: "flex items-start gap-2 text-xs leading-6 text-slate-200", children: [_jsx(CheckCircle2, { className: "mt-1 h-4 w-4 shrink-0 text-emerald-400" }), _jsx("span", { children: item })] }, item)) }), _jsx("button", { type: "button", onClick: close, className: "w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white hover:bg-teal-500", children: "متوجه شدم؛ ورود به سامانه" })] })] }) }));
};
