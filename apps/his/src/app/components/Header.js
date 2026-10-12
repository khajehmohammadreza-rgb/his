import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useEffect, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Bell, Calendar, Clock, Maximize2, Minimize2, ShieldCheck, UserCheck, Menu, LogOut, Camera, Users, Search, Check, X, Zap, Building2, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { getActiveFiscalYear, fiscalYearOptions } from '../utils/fiscalYear.js?b=r24-514-1405';
import { compressAndResizeImage } from '../utils/imageUtils.js?b=r24-514-1405';
const ROLE_NAMES = {
    admin: 'مدیر کل سیستم',
    doctor: 'پزشک / متخصص',
    nurse: 'پرستار',
    inventory_manager: 'مسئول انبار و کالا',
    accountant: 'حسابدار کلینیک',
    purchaser: 'مسئول خرید و تامین',
    operating_room_supervisor: 'مسئول اتاق عمل',
    cashier: 'صندوقدار / پذیرش',
    inspector: 'بازرس / ناظر',
};
export const Header = ({ settings, currentUser, users, allUsers, onUserChange, pendingRequestsCount = 0, onApproveAllRequests, onOpenCartable, lowStockCount = 0, onOpenLowStock, onToggleMobileMenu, onLogout, onUpdateSettings, onOpenMyProfile, onOpenCentersManagement, }) => {
    const userList = users || allUsers || [];
    const [timeStr, setTimeStr] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const logoInputRef = React.useRef(null);
    const handleLogoFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const res = await compressAndResizeImage(file, 400, 400, 0.85);
                if (onUpdateSettings) {
                    onUpdateSettings({
                        ...settings,
                        logoUrl: res.dataUrl,
                    });
                    alert(`لوگوی جدید با موفقیت (حجم ${res.sizeKb}KB) فشرده‌سازی و در تمام قسمت‌های سیستم اعمال گردید.`);
                }
            }
            catch (err) {
                alert(err.message || 'خطا در بارگذاری تصویر لوگو.');
            }
        }
    };
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const h = now.getHours().toString().padStart(2, '0');
            const m = now.getMinutes().toString().padStart(2, '0');
            const s = now.getSeconds().toString().padStart(2, '0');
            setTimeStr(toPersianDigits(`${h}:${m}:${s}`));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => console.error(e));
            setIsFullscreen(true);
        }
        else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };
    const filteredUsers = userList.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ROLE_NAMES[u.role]?.includes(searchQuery));
    const getCombinedRoleLabel = (u) => {
        const rolesList = [u.role, ...(u.roles || [])];
        const uniqueRoles = Array.from(new Set(rolesList));
        return uniqueRoles.map((r) => ROLE_NAMES[r] || r).join(' + ');
    };
    return (_jsxs("header", { className: "bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg", dir: "rtl", children: [_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center space-x-2 space-x-reverse shrink-0", children: [_jsx("button", { onClick: onToggleMobileMenu, className: "p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition lg:hidden", title: "\u0645\u0646\u0648\u06CC \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627", children: _jsx(Menu, { className: "w-5 h-5 text-teal-400" }) }), _jsxs("div", { className: "hidden lg:flex items-center space-x-2.5 space-x-reverse text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60", children: [_jsxs("div", { className: "flex items-center text-slate-300 space-x-1 space-x-reverse", children: [_jsx(Calendar, { className: "w-3.5 h-3.5 text-emerald-400" }), _jsx("span", { children: getJalaliDateString() })] }), _jsxs("div", { className: "flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/40 rounded-lg px-2 py-1", children: [_jsx("span", { className: "text-emerald-300 text-[10px] font-medium", children: "سال مالی" }), _jsx("select", { value: getActiveFiscalYear(settings), onChange: (e) => onUpdateSettings?.({ ...settings, activeFiscalYear: Number(e.target.value) }), className: "bg-transparent text-emerald-100 text-[11px] font-semibold outline-none", children: fiscalYearOptions(getActiveFiscalYear(settings)).map((y) => _jsx("option", { key: y, value: y, className: "text-slate-900", children: toPersianDigits(y) })) })] }), _jsx("div", { className: "h-3 w-px bg-slate-700" }), _jsxs("div", { className: "flex items-center text-slate-300 space-x-1 space-x-reverse", children: [_jsx(Clock, { className: "w-3.5 h-3.5 text-teal-400" }), _jsx("span", { className: "font-mono text-slate-200", children: timeStr })] })] })] }), _jsxs("div", { className: "flex items-center justify-center space-x-3 space-x-reverse mx-auto", children: [_jsx("input", { type: "file", ref: logoInputRef, onChange: handleLogoFileChange, accept: "image/*", className: "hidden" }), _jsxs("div", { onClick: () => logoInputRef.current?.click(), className: "w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-900/40 border-2 border-emerald-400 overflow-hidden shrink-0 p-0.5 cursor-pointer relative group transition-transform active:scale-95", title: "\u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F \u062C\u0647\u062A \u062A\u063A\u06CC\u06CC\u0631 \u0644\u0648\u06AF\u0648\u06CC \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647", children: [_jsx("img", { src: settings.logoUrl || '/center-logo-placeholder.svg', alt: settings.clinicName, className: "w-full h-full object-contain rounded-lg", referrerPolicy: "no-referrer", onError: (e) => {
                                            e.target.src = '/center-logo-placeholder.svg';
                                        } }), _jsx("div", { className: "absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg", children: _jsx(Camera, { className: "w-4 h-4 text-teal-300 animate-pulse" }) })] }), _jsxs("div", { className: "text-center sm:text-right", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("h1", { className: "font-extrabold text-base sm:text-lg text-white tracking-tight leading-snug", children: settings.clinicName }), onOpenCentersManagement && (_jsxs("button", { type: "button", onClick: onOpenCentersManagement, className: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs", title: "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0648 \u0633\u0648\u0626\u06CC\u0686 \u0628\u06CC\u0646 \u0645\u0631\u0627\u06A9\u0632 \u0645\u0633\u062A\u0642\u0644", children: [_jsx(Building2, { className: "w-3 h-3 text-emerald-400" }), _jsx("span", { children: "\u062F\u06CC\u062A\u0627\u0628\u06CC\u0633 \u0645\u0633\u062A\u0642\u0644 \u0645\u0631\u06A9\u0632" })] }))] }), _jsx("p", { className: "text-[10px] text-teal-300/90 hidden md:block font-medium", children: "\u0645\u0631\u06A9\u0632 \u062A\u062E\u0635\u0635\u06CC \u062C\u0631\u0627\u062D\u06CC \u0648 \u062E\u062F\u0645\u0627\u062A \u062F\u0631\u0645\u0627\u0646\u06CC \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647\u06CC" })] })] }), _jsxs("div", { className: "flex items-center space-x-2 space-x-reverse shrink-0", children: [pendingRequestsCount > 0 && (_jsxs("button", { onClick: onOpenCartable, className: "hidden sm:flex items-center bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold gap-2 transition active:scale-95 shadow-sm group cursor-pointer", title: "\u062C\u0647\u062A \u0628\u0631\u0631\u0633\u06CC\u060C \u0645\u0634\u0627\u0647\u062F\u0647 \u0648 \u062A\u0627\u06CC\u06CC\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0645\u0639\u0644\u0642 \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F", children: [_jsx(Zap, { className: "w-4 h-4 text-amber-400 animate-pulse group-hover:scale-110 transition-transform" }), _jsxs("span", { children: [toPersianDigits(pendingRequestsCount), " \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0645\u0639\u0644\u0642 \u06A9\u0627\u0631\u062A\u0627\u0628\u0644"] }), _jsx("span", { className: "bg-amber-500 text-slate-950 px-2 py-0.5 rounded-lg text-[10px] font-black group-hover:bg-amber-400 transition", children: "\u0645\u0634\u0627\u0647\u062F\u0647 \u06A9\u0627\u0631\u062A\u0627\u0628\u0644" })] })), _jsxs("button", { onClick: onOpenLowStock, className: "relative p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition", title: "\u0647\u0634\u062F\u0627\u0631\u0647\u0627\u06CC \u06A9\u0645\u0628\u0648\u062F \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631", children: [_jsx(Bell, { className: "w-4 h-4" }), lowStockCount > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse", children: toPersianDigits(lowStockCount) }))] }), onOpenMyProfile && (_jsx("button", { onClick: onOpenMyProfile, className: "p-2 text-teal-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition", title: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0634\u062E\u0635\u06CC \u06A9\u0627\u0631\u0628\u0631 \u0648 \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0646\u06AF \u067E\u0633\u200C\u0632\u0645\u06CC\u0646\u0647", children: _jsx(UserCheck, { className: "w-4 h-4 text-teal-400" }) })), _jsxs("button", { onClick: () => setIsSwitchModalOpen(true), className: "flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold border border-teal-400/40 shadow-md transition hover:scale-105", title: "\u062A\u0639\u0648\u06CC\u0636 \u0633\u0631\u06CC\u0639 \u06A9\u0627\u0631\u0628\u0631 \u0648 \u0646\u0642\u0634", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-200 shrink-0" }), _jsxs("div", { className: "text-right hidden sm:block", children: [_jsx("span", { className: "block font-bold text-[11px] leading-tight", children: currentUser.name }), _jsx("span", { className: "block text-[9px] text-teal-100 font-medium truncate max-w-[120px]", children: getCombinedRoleLabel(currentUser) })] }), _jsx(Users, { className: "w-3.5 h-3.5 text-teal-200" })] }), _jsx("button", { onClick: toggleFullscreen, className: "p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition hidden md:block", title: "\u062D\u0627\u0644\u062A \u062A\u0645\u0627\u0645 \u0635\u0641\u062D\u0647", children: isFullscreen ? _jsx(Minimize2, { className: "w-4 h-4" }) : _jsx(Maximize2, { className: "w-4 h-4" }) }), onLogout && (_jsx("button", { onClick: onLogout, className: "p-2 text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded-lg transition text-xs font-bold", title: "\u062E\u0631\u0648\u062C \u0627\u0632 \u0633\u06CC\u0633\u062A\u0645", children: _jsx(LogOut, { className: "w-4 h-4" }) }))] })] }), isSwitchModalOpen && (_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in", children: _jsxs("div", { className: "bg-slate-900 border border-teal-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-right", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300", children: _jsx(ShieldCheck, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-base font-black text-white", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631 \u0648 \u062A\u0639\u0648\u06CC\u0636 \u0633\u0631\u06CC\u0639 \u0646\u0642\u0634" }), _jsx("p", { className: "text-xs text-slate-400", children: "\u0648\u0631\u0648\u062F \u0622\u0646\u06CC \u0628\u0647 \u0639\u0646\u0648\u0627\u0646 \u0647\u0631 \u067E\u0631\u0633\u0646\u0644 \u0628\u0627 \u062D\u0641\u0638 \u0646\u0642\u0634\u200C\u0647\u0627\u06CC \u0686\u0646\u062F\u06AF\u0627\u0646\u0647 \u0648 \u062F\u0633\u062A\u0631\u0633\u06CC\u200C\u0647\u0627\u06CC \u062A\u062C\u0645\u06CC\u0639\u06CC" })] })] }), _jsx("button", { onClick: () => setIsSwitchModalOpen(false), className: "w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), onOpenMyProfile && (_jsxs("button", { onClick: () => {
                                setIsSwitchModalOpen(false);
                                onOpenMyProfile();
                            }, className: "w-full bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 p-3 rounded-xl text-xs font-bold flex items-center justify-between transition", children: [_jsxs("span", { children: ["\u0645\u0634\u0627\u0647\u062F\u0647 \u0648 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0645\u0627\u06CC\u0647 \u0634\u062E\u0635\u06CC \u06A9\u0627\u0631\u0628\u0631 \u0641\u0639\u0627\u0644 (", currentUser.name, ")"] }), _jsx(UserCheck, { className: "w-4 h-4 text-teal-400" })] })), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute right-3.5 top-3 w-4 h-4 text-slate-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u067E\u0631\u0633\u0646\u0644\u060C \u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627 \u0646\u0642\u0634...", className: "w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("span", { className: "text-[11px] text-slate-400 font-bold block", children: ["\u0644\u06CC\u0633\u062A \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0633\u06CC\u0633\u062A\u0645 (", filteredUsers.length, "):"] }), _jsx("div", { className: "max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar", children: filteredUsers.map((usr) => {
                                        const isCurrent = usr.id === currentUser.id;
                                        const combinedRoles = getCombinedRoleLabel(usr);
                                        return (_jsxs("div", { onClick: () => {
                                                onUserChange(usr);
                                                setIsSwitchModalOpen(false);
                                            }, className: `p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${isCurrent
                                                ? 'bg-teal-500/15 border-teal-500/40 text-white'
                                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-extrabold text-teal-300 text-xs", children: usr.name.charAt(0) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-bold text-sm text-white", children: usr.name }), _jsxs("span", { className: "px-2 py-0.5 rounded bg-slate-800 text-teal-300 text-[10px] font-mono", children: ["@", usr.username] })] }), _jsxs("span", { className: "text-[11px] text-slate-400", children: ["\u0646\u0642\u0634(\u0647\u0627): ", _jsx("strong", { className: "text-emerald-400", children: combinedRoles }), " | \u0628\u062E\u0634: ", usr.department || 'عمومی'] })] })] }), _jsx("div", { children: isCurrent ? (_jsxs("span", { className: "px-3 py-1 rounded-lg bg-teal-500 text-slate-950 text-xs font-black flex items-center gap-1", children: [_jsx(Check, { className: "w-3.5 h-3.5" }), "\u06A9\u0627\u0631\u0628\u0631 \u0641\u0639\u0627\u0644"] })) : (_jsx("span", { className: "px-3 py-1 rounded-lg bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition", children: "\u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0627\u0631\u0628\u0631" })) })] }, usr.id));
                                    }) })] }), _jsx("div", { className: "flex justify-end pt-2 border-t border-slate-800", children: _jsx("button", { onClick: () => setIsSwitchModalOpen(false), className: "px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition", children: "\u0628\u0633\u062A\u0646" }) })] }) }))] }));
};
