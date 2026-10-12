import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useEffect, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { AlertTriangle, CheckCircle2, Download, KeyRound, Monitor, RefreshCw, RotateCcw, Save, Server, ShieldCheck, UploadCloud } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { APP_VERSION } from '../utils/appVersion.js?b=r24-514-1405';

const emptyProviders = {
    kavenegar: { apiKey: '', sender: '', configured: false, maskedKey: '', webhookUrl: '', webhookToken: '' },
    gemini: { apiKey: '', model: 'gemini-2.5-flash', configured: false, maskedKey: '' },
    identity: { apiKey: '', url: '', configured: false, maskedKey: '' },
};

async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', ...options });
    let data = {};
    try { data = await response.json(); } catch { data = { error: `HTTP ${response.status}` }; }
    if (!response.ok || data.success === false) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    return data;
}

async function clearApplicationCache() {
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.includes('bastiyan-his')).map((key) => caches.delete(key)));
        }
    }
    catch { }
}

const Field = ({ label, value, onChange, type = 'text', placeholder = '', help = '' }) => (_jsxs("label", { className: "block space-y-1.5", children: [_jsx("span", { className: "text-xs font-bold text-slate-200", children: label }), _jsx("input", { type: type, value: value, onChange: (event) => onChange(event.target.value), placeholder: placeholder, autoComplete: type === 'password' ? 'new-password' : 'off', className: "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500" }), help && _jsx("span", { className: "block text-[11px] leading-5 text-slate-500", children: help })] }));

export const AppPackageInstall = ({ userRole = 'admin', isSuperAdmin: isSuperAdminProp }) => {
    const isSuperAdmin = isSuperAdminProp ?? (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('bastiyan_superadmin_override') === '1' || sessionStorage.getItem('bastian_superadmin_override') === '1'));
    const [status, setStatus] = useState(null);
    const [packageFile, setPackageFile] = useState(null);
    const [busy, setBusy] = useState('');
    const [notice, setNotice] = useState(null);
    const [pending, setPending] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const load = async () => {
        if (!isSuperAdmin) return;
        setBusy('loading'); setNotice(null);
        try {
            const updateStatus = await api('./api/bastian/system/update');
            setStatus(updateStatus);
            setPending(updateStatus.pending?.pendingCommit ? updateStatus.pending : null);
        }
        catch (error) { setNotice({ type: 'error', text: error.message }); }
        finally { setBusy(''); }
    };

    useEffect(() => { load(); }, [isSuperAdmin]);

    useEffect(() => {
        if (!pending?.expiresAt) return undefined;
        const tick = () => setRemainingSeconds(Math.max(0, Number(pending.expiresAt) - Math.floor(Date.now() / 1000)));
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [pending]);

    const installUpdate = async () => {
        if (!packageFile) { setNotice({ type: 'error', text: 'ابتدا فایل ZIP دریافت‌شده را انتخاب کنید.' }); return; }
        if (!window.confirm(`بسته «${packageFile.name}» به‌صورت خودکار نصب شود؟ قبل از نصب از فایل‌ها و دیتابیس همه مراکز بکاپ گرفته می‌شود؛ api/data، uploads و config.local.php هرگز جایگزین نمی‌شوند.`)) return;
        setBusy('update'); setNotice(null);
        try {
            const form = new FormData();
            form.append('action', 'auto-install');
            form.append('package', packageFile);
            const result = await api('./api/bastian/system/update', { method: 'POST', body: form });
            setPending(null);
            setNotice({ type: 'success', text: result.message || `نسخه ${result.installedVersion} نصب و نهایی شد.` });
            await clearApplicationCache();
            setTimeout(() => window.location.replace(`./?updated=${Date.now()}`), 1200);
        }
        catch (error) { setNotice({ type: 'error', text: error.message }); setBusy(''); await load(); }
    };

    const commitUpdate = async () => {
        setBusy('commit'); setNotice(null);
        try { const result = await api('./api/bastian/system/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'commit', backupId: pending?.backupId }) }); setPending(null); setNotice({ type: 'success', text: result.message }); await clearApplicationCache(); setTimeout(() => window.location.replace(`./?updated=${Date.now()}`), 900); }
        catch (error) { setNotice({ type: 'error', text: error.message }); setBusy(''); await load(); }
    };

    const extendUpdate = async () => {
        setBusy('extend'); setNotice(null);
        try { const result = await api('./api/bastian/system/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extend', seconds: 180 }) }); setPending((current) => current ? { ...current, expiresAt: result.expiresAt || result.commitDeadline } : current); setNotice({ type: 'success', text: result.message }); }
        catch (error) { setNotice({ type: 'error', text: error.message }); setBusy(''); await load(); }
        finally { setBusy(''); }
    };

    const rollback = async () => {
        const backup = status?.backups?.[0];
        if (!backup || !window.confirm(`نسخه پشتیبان ${backup.fromVersion || 'قبلی'} بازیابی شود؟`)) return;
        setBusy('rollback'); setNotice(null);
        try {
            const result = await api('./api/bastian/system/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rollback', backupId: backup.id }) });
            setNotice({ type: 'success', text: result.message }); await clearApplicationCache();
            setTimeout(() => window.location.replace(`./?rollback=${Date.now()}`), 1400);
        }
        catch (error) { setNotice({ type: 'error', text: error.message }); setBusy(''); }
    };

    if (userRole !== 'admin' || !isSuperAdmin) return (_jsxs("div", { className: "rounded-2xl border border-rose-900/60 bg-rose-950/20 p-6 text-rose-100", children: [_jsx(ShieldCheck, { className: "mb-3 h-7 w-7 text-rose-400" }), _jsx("h3", { className: "font-black", children: "دسترسی فقط برای Super Admin" }), _jsx("p", { className: "mt-2 text-sm leading-7 text-rose-200/80", children: "نصب نسخه و مدیریت کلیدهای API فقط هنگام ورود مدیریت کل به پنل همین مرکز فعال است." })] }));

    return (_jsxs("div", { className: "space-y-5", dir: "rtl", children: [
        _jsxs("div", { className: "flex flex-col gap-3 rounded-2xl border border-teal-800/60 bg-gradient-to-l from-teal-950/50 to-slate-950 p-5 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-2xl border border-teal-700 bg-teal-500/10 p-3", children: _jsx(ShieldCheck, { className: "h-7 w-7 text-teal-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "font-black text-white", children: "مدیریت امن نسخه و سرویس‌های مرکز" }), _jsxs("p", { className: "mt-1 text-xs text-slate-400", children: ["نسخه واقعی نصب‌شده: ", _jsx("b", { className: "text-teal-300", children: status?.currentVersion || APP_VERSION })] })] })] }), _jsxs("button", { type: "button", onClick: load, disabled: !!busy, className: "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 disabled:opacity-50", children: [_jsx(RefreshCw, { className: `h-4 w-4 ${busy === 'loading' ? 'animate-spin' : ''}` }), "بررسی دوباره"] })] }),
        notice && _jsxs("div", { className: `flex items-start gap-2 rounded-xl border p-4 text-sm ${notice.type === 'success' ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200' : 'border-rose-800 bg-rose-950/30 text-rose-200'}`, children: [notice.type === 'success' ? _jsx(CheckCircle2, { className: "mt-0.5 h-5 w-5 shrink-0" }) : _jsx(AlertTriangle, { className: "mt-0.5 h-5 w-5 shrink-0" }), _jsx("span", { children: notice.text })] }),
            pending && _jsxs("section", { className: "rounded-2xl border border-amber-700/70 bg-amber-950/30 p-5", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-black text-amber-100", children: "نسخه در حال آزمایش" }), _jsxs("p", { className: "mt-1 text-xs text-amber-200/80", children: [pending.fromVersion, " ← ", pending.toVersion, " | بازگشت خودکار تا ", Math.floor(remainingSeconds / 60), ":", String(remainingSeconds % 60).padStart(2, '0')] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: commitUpdate, disabled: !!busy, className: "rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50", children: busy === 'commit' ? 'در حال نهایی‌سازی...' : 'اعمال نهایی' }), _jsx("button", { type: "button", onClick: extendUpdate, disabled: !!busy, className: "rounded-xl border border-amber-500 px-4 py-2 text-xs font-black text-amber-100 disabled:opacity-50", children: busy === 'extend' ? 'در حال افزایش...' : 'افزایش ۳ دقیقه' })] })] }), pending.notes?.length > 0 && _jsxs("div", { className: "mt-3 border-t border-amber-800/60 pt-3 text-xs leading-6 text-amber-100", children: [_jsx("b", { children: "تغییرات این نسخه:" }), pending.notes.map((note, index) => _jsxs("div", { children: ["• ", note] }, index))] })] }),
            _jsxs("section", { className: "rounded-2xl border border-slate-800 bg-slate-900/70 p-5", children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx(UploadCloud, { className: "h-6 w-6 text-sky-400" }), _jsxs("div", { children: [_jsx("h3", { className: "font-black text-white", children: "آپدیت و دیپلوی خودکار روی HIS چابکان" }), _jsx("p", { className: "text-xs leading-6 text-slate-400", children: "فقط ZIP را انتخاب و تأیید کنید؛ سامانه نسخه را از مانیفست می‌خواند، از فایل‌ها و SQLite همه مراکز بکاپ می‌گیرد، کد را روی سرویس فعلی چابکان جایگزین می‌کند، تست سلامت می‌زند و در صورت موفقیت خودکار Commit می‌کند. داده‌ها، لوگوهای آپلودی و config.local.php دست‌نخورده می‌مانند." })] })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx("div", { className: "rounded-xl bg-slate-950 p-3 text-xs text-slate-300", children: status?.zipAvailable ? '✓ ZipArchive فعال' : '✕ ZipArchive غیرفعال' }), _jsx("div", { className: "rounded-xl bg-slate-950 p-3 text-xs text-slate-300", children: status?.rootWritable ? '✓ ریشه قابل نوشتن' : '✕ مجوز ریشه ناکافی' }), _jsxs("div", { className: "rounded-xl bg-slate-950 p-3 text-xs text-slate-300", children: ["سقف PHP: ", status?.phpUploadLimit || '—'] })] }), _jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: [_jsx("input", { type: "file", accept: ".zip,application/zip", onChange: (event) => setPackageFile(event.target.files?.[0] || null), className: "min-w-0 rounded-xl border border-dashed border-slate-600 bg-slate-950 p-3 text-xs text-slate-300 file:ml-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-white" }), _jsxs("button", { type: "button", onClick: installUpdate, disabled: !!busy || !status?.zipAvailable || !status?.rootWritable || !!pending, className: "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white disabled:bg-slate-700", children: [_jsx(UploadCloud, { className: "h-5 w-5" }), busy === 'update' ? 'بکاپ، نصب، تست و نهایی‌سازی...' : 'آپدیت و دیپلوی خودکار'] })] }), status?.backups?.[0] && _jsxs("button", { type: "button", onClick: rollback, disabled: !!busy || !!pending, className: "mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-800 bg-rose-950/30 px-4 py-2 text-xs font-black text-rose-200 disabled:opacity-50", children: [_jsx(RotateCcw, { className: "h-4 w-4" }), "بازگردانی آخرین نسخه پایدار (", status.backups[0].fromVersion || 'قبلی', ")"] })] }),
        _jsxs("section", { className: "rounded-2xl border border-teal-800/60 bg-teal-950/20 p-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(KeyRound, { className: "h-6 w-6 text-teal-400" }), _jsxs("div", { children: [_jsx("h3", { className: "font-black text-white", children: "تنظیمات API یکپارچه شد" }), _jsx("p", { className: "text-xs leading-6 text-slate-400", children: "برای جلوگیری از چند محل متناقض، ویرایش کلیدهای کاوه‌نگار، هوش مصنوعی، بیمه و سرویس‌های خارجی فقط از مسیر «تنظیمات ← یکپارچه‌سازی و API» انجام می‌شود. این صفحه فقط وضعیت نصب و به‌روزرسانی را مدیریت می‌کند." })] })] })] }),
        _jsxs("section", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs("a", { href: "/downloads/Bastian_HIS_MotherPC_Offline_Server.zip", download: true, className: "rounded-2xl border border-sky-900 bg-slate-950 p-5 text-slate-200 hover:border-sky-600", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Server, { className: "h-6 w-6 text-sky-400" }), _jsx("b", { children: "Mother PC / سرور داخلی" })] }), _jsxs("span", { className: "mt-3 inline-flex items-center gap-2 text-xs text-sky-300", children: [_jsx(Download, { className: "h-4 w-4" }), "دریافت بسته نصب"] })] }), _jsxs("a", { href: "/downloads/Bastian_HIS_Client_LAN.zip", download: true, className: "rounded-2xl border border-violet-900 bg-slate-950 p-5 text-slate-200 hover:border-violet-600", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Monitor, { className: "h-6 w-6 text-violet-400" }), _jsx("b", { children: "Client LAN / سیستم‌های شبکه" })] }), _jsxs("span", { className: "mt-3 inline-flex items-center gap-2 text-xs text-violet-300", children: [_jsx(Download, { className: "h-4 w-4" }), "دریافت بسته نصب"] })] })] })
    ] }));
};
