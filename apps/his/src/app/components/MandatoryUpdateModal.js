import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { RefreshCw, WifiOff, ArrowDownCircle, AlertTriangle, UploadCloud, ShieldCheck } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { useVersionCheck, CURRENT_CLIENT_VERSION } from '../hooks/useVersionCheck.js?b=r24-514-1405';
export { CURRENT_CLIENT_VERSION };

async function clearAppCaches() {
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch { }
}

export const MandatoryUpdateModal = () => {
    const { isOnline, serverVersion, updateRequired, checking, currentClientVersion } = useVersionCheck();
    const [packageFile, setPackageFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const handleApplyUpdate = async () => {
        setError(''); setInfo('');
        if (!packageFile) { setError('ابتدا فایل ZIP همین نسخه را انتخاب کنید.'); return; }
        const targetVersion = String(serverVersion?.version || '').trim();
        if (!targetVersion) { setError('نسخه مقصد از سرور دریافت نشد.'); return; }
        if (!packageFile.name.toLowerCase().endsWith('.zip')) { setError('فقط فایل ZIP بسته به‌روزرسانی مجاز است.'); return; }
        if (!window.confirm(`نسخه ${targetVersion} نصب شود؟ قبل از جایگزینی، پشتیبان خودکار ساخته می‌شود و نسخه جدید موقتاً آزمایشی خواهد بود.`)) return;
        setBusy(true);
        try {
            const form = new FormData();
            form.append('action', 'install');
            form.append('version', targetVersion);
            form.append('package', packageFile);
            const response = await fetch('./api/bastian/system/update', { method: 'POST', credentials: 'same-origin', body: form });
            let result = {};
            try { result = await response.json(); } catch { result = {}; }
            if (!response.ok || result.success === false) throw new Error(result.error || result.message || `HTTP ${response.status}`);
            setInfo(result.message || `نسخه ${result.installedVersion || targetVersion} نصب شد. در حال بارگذاری نسخه جدید...`);
            await clearAppCaches();
            window.setTimeout(() => window.location.replace(`./?update=${Date.now()}`), 700);
        } catch (e) {
            setError(e?.message || 'نصب نسخه جدید انجام نشد.');
        } finally { setBusy(false); }
    };

    if (checking && !serverVersion) return null;
    return (_jsxs(_Fragment, { children: [
        !isOnline && _jsxs("div", { className: "bg-amber-950/90 text-amber-200 border-b border-amber-800/80 px-4 py-1.5 text-xs flex items-center justify-between font-vazir z-50 sticky top-0 dir-rtl backdrop-blur-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(WifiOff, { className: "w-4 h-4 text-amber-400 animate-pulse" }), _jsx("span", { className: "font-bold", children: "حالت آفلاین" })] }), _jsx("span", { className: "bg-amber-900/60 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-700", children: `نسخه محلی: v${currentClientVersion}` })] }),
        isOnline && updateRequired && serverVersion && _jsx("div", { className: "fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 dir-rtl", children: _jsxs("div", { className: "bg-slate-900 border border-teal-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5", children: [
            _jsxs("div", { className: "flex items-center gap-3 border-b border-slate-800 pb-4", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400", children: _jsx(ArrowDownCircle, { className: "w-7 h-7" }) }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] font-bold bg-teal-950 text-teal-400 px-2.5 py-0.5 rounded-full border border-teal-800", children: "نسخه جدید آماده اعمال" }), _jsxs("h2", { className: "text-base font-extrabold text-white mt-1", children: ["نسخه جدید ", serverVersion.version, " آماده نصب است"] })] })] }),
            _jsxs("div", { className: "space-y-3 text-xs", children: [
                _jsxs("div", { className: "flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-800", children: [_jsx("span", { className: "text-slate-400", children: "نسخه فعلی مرورگر شما:" }), _jsxs("span", { className: "font-mono text-slate-300 font-bold", children: ["v", currentClientVersion] })] }),
                _jsxs("div", { className: "flex justify-between items-center bg-teal-950/40 p-3 rounded-2xl border border-teal-900", children: [_jsx("span", { className: "text-teal-300 font-bold", children: "نسخه منتشرشده روی هاست:" }), _jsxs("span", { className: "font-mono text-teal-400 font-extrabold", children: ["v", serverVersion.version] })] }),
                _jsxs("div", { className: "rounded-2xl border border-slate-700 bg-slate-950 p-3 space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-slate-200 font-bold", children: [_jsx(UploadCloud, { className: "w-4 h-4 text-teal-400" }), "فایل ZIP نسخه جدید را از کامپیوتر انتخاب کنید"] }), _jsx("input", { type: "file", accept: ".zip,application/zip", onChange: (event) => setPackageFile(event.target.files?.[0] || null), className: "w-full rounded-xl border border-dashed border-slate-600 bg-slate-900 p-3 text-xs text-slate-300 file:ml-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-white" }), packageFile && _jsx("div", { className: "text-[11px] text-emerald-300", children: `✓ ${packageFile.name}` })] }),
                _jsxs("div", { className: "p-3 bg-amber-950/50 border border-amber-800/60 rounded-2xl text-amber-200 text-[11px] flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-amber-400 shrink-0 mt-0.5" }), _jsx("span", { children: "با زدن «اعمال و نصب»، نسخه روی هاست واقعاً جایگزین می‌شود؛ سپس سامانه با نسخه جدید بالا می‌آید و زمان‌سنج آزمایشی فعال می‌شود. اگر زمان تمام شود و تأیید نهایی نزنید، نسخه قبلی برمی‌گردد." })] }),
                error && _jsx("div", { className: "rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-200", children: error }),
                info && _jsx("div", { className: "rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-200", children: info })
            ] }),
            _jsx("button", { onClick: handleApplyUpdate, disabled: busy, className: "w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50", children: busy ? _jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }), "در حال نصب و اعمال نسخه جدید..."] }) : _jsxs(_Fragment, { children: [_jsx(ShieldCheck, { className: "w-4 h-4" }), "اعمال و نصب نسخه جدید"] }) })
        ] }) })
    ] }));
};
