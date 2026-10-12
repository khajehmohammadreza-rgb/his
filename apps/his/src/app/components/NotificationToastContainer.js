import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Bell, CheckCircle2, UserPlus, Zap, Volume2, VolumeX, X, ShieldAlert, ArrowLeft, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { notificationService } from '../utils/webNotification.js?b=r24-514-1405';
export const NotificationToastContainer = ({ onNavigateTab }) => {
    const [toasts, setToasts] = useState([]);
    const [permissionState, setPermissionState] = useState(notificationService.getPermissionState());
    const [soundEnabled, setSoundEnabled] = useState(notificationService.isSoundEnabled());
    const [showPermissionBanner, setShowPermissionBanner] = useState(permissionState === 'default');
    useEffect(() => {
        // Subscribe to new notifications
        const unsubscribe = notificationService.subscribe((notif) => {
            setToasts((prev) => [notif, ...prev].slice(0, 4));
            // Auto dismiss after 7 seconds
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== notif.id));
            }, 7000);
        });
        return () => unsubscribe();
    }, []);
    const handleRequestPermission = async () => {
        const granted = await notificationService.requestPermission();
        setPermissionState(notificationService.getPermissionState());
        setShowPermissionBanner(false);
        if (granted) {
            notificationService.notify('اطلاع‌رسانی سیستم فعال شد', 'از این پس هشدارهای پذیرش بیمار و کارتابل روی مرورگر نمایش داده می‌شوند.', 'system');
        }
    };
    const handleToggleSound = () => {
        const nextState = !soundEnabled;
        setSoundEnabled(nextState);
        notificationService.setSoundEnabled(nextState);
        if (nextState) {
            notificationService.playChimeSound('system');
        }
    };
    const dismissToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };
    const getIcon = (type) => {
        switch (type) {
            case 'patient':
                return _jsx(UserPlus, { className: "w-5 h-5 text-emerald-400" });
            case 'cartable':
                return _jsx(CheckCircle2, { className: "w-5 h-5 text-amber-400" });
            case 'inventory':
                return _jsx(ShieldAlert, { className: "w-5 h-5 text-rose-400" });
            default:
                return _jsx(Bell, { className: "w-5 h-5 text-teal-400" });
        }
    };
    const getBadgeStyle = (type) => {
        switch (type) {
            case 'patient':
                return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
            case 'cartable':
                return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
            case 'inventory':
                return 'bg-rose-500/20 border-rose-500/30 text-rose-300';
            default:
                return 'bg-teal-500/20 border-teal-500/30 text-teal-300';
        }
    };
    return (_jsxs("div", { className: "fixed bottom-5 left-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none", dir: "rtl", children: [showPermissionBanner && permissionState === 'default' && (_jsxs("div", { className: "pointer-events-auto bg-slate-900/95 text-white border border-teal-500/40 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2.5 animate-bounce-short", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "p-1.5 bg-teal-500/20 text-teal-300 rounded-lg", children: _jsx(Bell, { className: "w-4 h-4 animate-pulse" }) }), _jsx("span", { className: "font-bold text-xs text-teal-200", children: "\u0641\u0639\u0627\u0644\u200C\u0633\u0627\u0632\u06CC \u0646\u0648\u062A\u06CC\u0641\u06CC\u06A9\u06CC\u0634\u0646 \u0645\u0631\u0648\u0631\u06AF\u0631" })] }), _jsx("button", { onClick: () => setShowPermissionBanner(false), className: "text-slate-400 hover:text-white p-1 rounded-lg transition", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }), _jsx("p", { className: "text-[11px] text-slate-300 leading-relaxed", children: "\u062C\u0647\u062A \u062F\u0631\u06CC\u0627\u0641\u062A \u0647\u0634\u062F\u0627\u0631 \u0641\u0648\u0631\u06CC \u0647\u0646\u06AF\u0627\u0645 \u00AB\u067E\u0630\u06CC\u0631\u0634 \u0628\u06CC\u0645\u0627\u0631 \u062C\u062F\u06CC\u062F\u00BB \u06CC\u0627 \u00AB\u062A\u0627\u06CC\u06CC\u062F \u06A9\u0627\u0631\u062A\u0627\u0628\u0644\u00BB\u060C \u062F\u0633\u062A\u0631\u0633\u06CC \u0627\u0639\u0644\u0627\u0646 \u0645\u0631\u0648\u0631\u06AF\u0631 \u0631\u0627 \u062A\u0627\u06CC\u06CC\u062F \u06A9\u0646\u06CC\u062F." }), _jsx("div", { className: "flex items-center gap-2 justify-end pt-1", children: _jsxs("button", { onClick: handleRequestPermission, className: "bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer", children: [_jsx(Zap, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0627\u062C\u0627\u0632\u0647 \u0646\u0648\u062A\u06CC\u0641\u06CC\u06A9\u06CC\u0634\u0646 \u0645\u0631\u0648\u0631\u06AF\u0631" })] }) })] })), toasts.map((toast) => (_jsxs("div", { className: "pointer-events-auto bg-slate-900/95 text-white border border-slate-700/80 p-4 rounded-2xl shadow-2xl backdrop-blur-lg flex flex-col gap-2 border-r-4 border-r-teal-500 transition-all duration-300 animate-slide-in-left", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: `p-2 rounded-xl border ${getBadgeStyle(toast.type)}`, children: getIcon(toast.type) }), _jsxs("div", { children: [_jsx("h4", { className: "font-bold text-xs text-slate-100", children: toast.title }), _jsx("span", { className: "text-[10px] text-slate-400 font-mono", children: toast.timestamp })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: handleToggleSound, className: "p-1 text-slate-400 hover:text-slate-200 rounded-lg transition", title: soundEnabled ? 'غیرفعال کردن صدای هشدار' : 'فعال کردن صدای هشدار', children: soundEnabled ? (_jsx(Volume2, { className: "w-3.5 h-3.5 text-teal-400" })) : (_jsx(VolumeX, { className: "w-3.5 h-3.5 text-slate-500" })) }), _jsx("button", { onClick: () => dismissToast(toast.id), className: "p-1 text-slate-400 hover:text-white rounded-lg transition", children: _jsx(X, { className: "w-4 h-4" }) })] })] }), _jsx("p", { className: "text-xs text-slate-300 leading-relaxed pr-1", children: toast.body }), toast.linkTab && onNavigateTab && (_jsx("div", { className: "flex justify-end pt-1", children: _jsxs("button", { onClick: () => {
                                onNavigateTab(toast.linkTab);
                                dismissToast(toast.id);
                            }, className: "text-[11px] text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/30 transition cursor-pointer", children: [_jsx("span", { children: "\u0645\u0634\u0627\u0647\u062F\u0647 \u062F\u0631 \u0628\u062E\u0634 \u0645\u0631\u0628\u0648\u0637\u0647" }), _jsx(ArrowLeft, { className: "w-3 h-3" })] }) }))] }, toast.id)))] }));
};
