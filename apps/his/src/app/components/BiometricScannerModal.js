import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Fingerprint, CheckCircle2, XCircle, ShieldCheck, RefreshCw, X } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
export const BiometricScannerModal = ({ isOpen, onClose, onSuccess, users = [], title = 'اسکنر اثر انگشت بیومتریک (USB / Optical)', description = 'لطفاً انگشت خود را روی حسگر اثر انگشت قرار دهید تا تایید هویت بیومتریک انجام گردد.', }) => {
    const [scanning, setScanning] = useState(false);
    const [scanState, setScanState] = useState('idle');
    const [matchedUser, setMatchedUser] = useState(null);
    if (!isOpen)
        return null;
    const handleStartScan = () => {
        setScanning(true);
        setScanState('scanning');
        setMatchedUser(null);
        setTimeout(() => {
            setScanning(false);
            // Pick a random user or fallback to first active user / admin
            const activeUsers = users.filter((u) => u.active !== false);
            const selected = activeUsers.length > 0 ? activeUsers[Math.floor(Math.random() * activeUsers.length)] : null;
            if (selected) {
                setMatchedUser(selected);
                setScanState('success');
            }
            else {
                setScanState('error');
            }
        }, 2000);
    };
    const handleConfirm = () => {
        if (matchedUser) {
            onSuccess(matchedUser);
        }
        else {
            onSuccess();
        }
        onClose();
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-nazanin text-right", dir: "rtl", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl text-slate-100", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400", children: _jsx(Fingerprint, { className: "w-6 h-6 animate-pulse" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-titr text-base text-white", children: title }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: description })] })] }), _jsx("button", { onClick: onClose, className: "w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex flex-col items-center justify-center py-6 space-y-5", children: [_jsx("div", { className: `w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${scanState === 'scanning' ? 'border-teal-400 bg-teal-500/10 animate-ping' :
                                scanState === 'success' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
                                    scanState === 'error' ? 'border-rose-500 bg-rose-500/20 text-rose-400' :
                                        'border-slate-700 bg-slate-800 text-teal-400 hover:border-teal-500 cursor-pointer'}`, onClick: scanState === 'idle' ? handleStartScan : undefined, children: _jsx(Fingerprint, { className: `w-14 h-14 ${scanState === 'scanning' ? 'text-teal-300 animate-spin' : ''}` }) }), _jsxs("div", { className: "text-center space-y-1", children: [scanState === 'idle' && (_jsx("p", { className: "text-xs text-slate-300 font-bold", children: "\u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639 \u0627\u0633\u06A9\u0646 \u0628\u06CC\u0648\u0645\u062A\u0631\u06CC\u06A9\u060C \u0631\u0648\u06CC \u0646\u0645\u0627\u062F \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F \u06CC\u0627 \u0633\u0646\u0633\u0648\u0631 \u0631\u0627 \u0644\u0645\u0633 \u0646\u0645\u0627\u06CC\u06CC\u062F." })), scanState === 'scanning' && (_jsxs("p", { className: "text-xs text-teal-300 font-bold flex items-center justify-center gap-1.5", children: [_jsx(RefreshCw, { className: "w-4 h-4 animate-spin" }), "\u062F\u0631 \u062D\u0627\u0644 \u062E\u0648\u0627\u0646\u062F\u0646 \u0648 \u062A\u0637\u0628\u06CC\u0642 \u0646\u0645\u0648\u0646\u0647 \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u0628\u0627 \u0628\u0627\u0646\u06A9 \u062F\u0627\u062F\u0647 \u0627\u0645\u0646..."] })), scanState === 'success' && matchedUser && (_jsxs("div", { className: "space-y-1 bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-2xl w-full", children: [_jsxs("p", { className: "text-xs text-emerald-300 font-bold flex items-center justify-center gap-1", children: [_jsx(CheckCircle2, { className: "w-4 h-4" }), "\u0627\u062D\u0631\u0627\u0632 \u0647\u0648\u06CC\u062A \u0628\u06CC\u0648\u0645\u062A\u0631\u06CC\u06A9 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F!"] }), _jsxs("p", { className: "text-xs text-white font-titr", children: ["\u0646\u0627\u0645 \u067E\u0631\u0633\u0646\u0644 / \u0645\u0631\u0627\u062C\u0639: ", matchedUser.name] }), _jsxs("p", { className: "text-[11px] text-slate-400 font-mono", children: ["\u0646\u0642\u0634: ", matchedUser.role, " | \u0645\u0648\u0628\u0627\u06CC\u0644: ", toPersianDigits(matchedUser.mobile || '-')] })] })), scanState === 'error' && (_jsxs("p", { className: "text-xs text-rose-400 font-bold flex items-center justify-center gap-1", children: [_jsx(XCircle, { className: "w-4 h-4" }), "\u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u0645\u0637\u0627\u0628\u0642\u062A \u0646\u062F\u0627\u0634\u062A. \u0644\u0637\u0641\u0627\u064B \u0645\u062C\u062F\u062F\u0627\u064B \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F."] }))] })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 pt-4 border-t border-slate-800", children: [_jsx("button", { onClick: onClose, className: "px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), scanState === 'idle' && (_jsxs("button", { onClick: handleStartScan, disabled: scanning, className: "px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition", children: [_jsx(Fingerprint, { className: "w-4 h-4" }), "\u0634\u0631\u0648\u0639 \u0627\u0633\u06A9\u0646 \u0628\u06CC\u0648\u0645\u062A\u0631\u06CC\u06A9"] })), scanState === 'success' && (_jsxs("button", { onClick: handleConfirm, className: "px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition", children: [_jsx(ShieldCheck, { className: "w-4 h-4" }), "\u062A\u0627\u06CC\u06CC\u062F \u0648 \u062B\u0628\u062A \u0646\u0647\u0627\u06CC\u06CC"] })), scanState === 'error' && (_jsxs("button", { onClick: () => setScanState('idle'), className: "px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F \u0627\u0633\u06A9\u0646"] }))] })] }) }));
};
