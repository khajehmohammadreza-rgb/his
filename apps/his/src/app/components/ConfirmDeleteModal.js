import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2 } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
export const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title = 'تاییدیه حذف قطعی', itemName = 'این مورد', itemType = 'اطلاعات', warningDetails, }) => {
    const [isChecked, setIsChecked] = useState(false);
    const [doubleCheckStep, setDoubleCheckStep] = useState(false);
    if (!isOpen)
        return null;
    const handleClose = () => {
        setIsChecked(false);
        setDoubleCheckStep(false);
        onClose();
    };
    const handleFinalDelete = () => {
        if (!isChecked)
            return;
        if (!doubleCheckStep) {
            setDoubleCheckStep(true);
            return;
        }
        // Perform actual deletion
        onConfirm();
        handleClose();
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200", children: _jsxs("div", { className: "bg-slate-900 border border-red-500/30 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden dir-rtl", children: [_jsxs("div", { className: "bg-gradient-to-r from-red-950/80 to-slate-900 p-4 border-b border-red-500/20 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400", children: _jsx(ShieldAlert, { className: "w-6 h-6 animate-pulse" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-100 text-lg", children: title }), _jsx("p", { className: "text-xs text-red-300/80", children: "\u0647\u0634\u062F\u0627\u0631 \u0633\u06CC\u0633\u062A\u0645: \u0646\u06CC\u0627\u0632 \u0628\u0647 \u062A\u0627\u06CC\u06CC\u062F\u06CC\u0647 \u062F\u0648 \u0645\u0631\u062D\u0644\u0647\u200C\u0627\u06CC" })] })] }), _jsx("button", { onClick: handleClose, className: "text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-5", children: [_jsxs("div", { className: "bg-red-950/40 border border-red-800/50 rounded-xl p-4 flex gap-3 text-slate-200 text-sm leading-relaxed", children: [_jsx(AlertTriangle, { className: "w-6 h-6 text-red-400 shrink-0 mt-0.5" }), _jsxs("div", { children: ["\u0634\u0645\u0627 \u062F\u0631 \u062D\u0627\u0644 \u062D\u0630\u0641 ", _jsxs("strong", { className: "text-red-300 underline font-bold px-1", children: [itemType, " (", itemName, ")"] }), " \u0647\u0633\u062A\u06CC\u062F.", _jsx("p", { className: "text-xs text-slate-300 mt-2", children: warningDetails || 'با حذف این مورد، کلیه پرونده‌ها، سوابق و داده‌های مرتبط از سیستم پاک خواهد شد و قابل بازگشت نخواهد بود.' })] })] }), _jsx("div", { className: "bg-slate-800/60 rounded-xl p-4 border border-slate-700/50", children: _jsxs("label", { className: "flex items-start gap-3 cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: isChecked, onChange: (e) => {
                                            setIsChecked(e.target.checked);
                                            if (!e.target.checked)
                                                setDoubleCheckStep(false);
                                        }, className: "mt-1 w-5 h-5 accent-red-500 rounded cursor-pointer" }), _jsxs("span", { className: "text-sm font-medium text-slate-200", children: ["\u0627\u06CC\u0646\u062C\u0627\u0646\u0628 \u062A\u0645\u0627\u0645\u06CC \u0633\u0648\u0627\u0628\u0642 \u0645\u0631\u0628\u0648\u0637 \u0628\u0647 ", _jsx("strong", { className: "text-red-300", children: itemName }), " \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0631\u062F\u0647 \u0648 \u0645\u0633\u0626\u0648\u0644\u06CC\u062A \u062D\u0630\u0641 \u06A9\u0627\u0645\u0644 \u0622\u0646 \u0631\u0627 \u0645\u06CC\u200C\u067E\u0630\u06CC\u0631\u0645."] })] }) }), doubleCheckStep && (_jsxs("div", { className: "bg-amber-950/50 border border-amber-500/40 rounded-xl p-3 text-amber-200 text-xs flex items-center gap-2 animate-in zoom-in-95", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-amber-400 shrink-0" }), _jsx("span", { children: "\u0645\u0631\u062D\u0644\u0647 \u06F2 \u0627\u0632 \u06F2: \u0644\u0637\u0641\u0627\u064B \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u0646\u0647\u0627\u06CC\u06CC \u0645\u062C\u062F\u062F\u0627\u064B \u0631\u0648\u06CC \u062F\u06A9\u0645\u0647 \u00AB\u062D\u0630\u0641 \u0642\u0637\u0639\u06CC \u0648 \u0646\u0647\u0627\u06CC\u06CC\u00BB \u06A9\u0644\u06CC\u06A9 \u0646\u0645\u0627\u06CC\u06CC\u062F." })] }))] }), _jsxs("div", { className: "p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3", children: [_jsx("button", { type: "button", onClick: handleClose, className: "px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white font-medium text-sm transition", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "button", onClick: handleFinalDelete, disabled: !isChecked, className: `px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition ${!isChecked
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : doubleCheckStep
                                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border border-red-500 shadow-red-900/40'
                                    : 'bg-red-600/90 hover:bg-red-600 text-white border border-red-500'}`, children: [_jsx(Trash2, { className: "w-4 h-4" }), doubleCheckStep ? 'تایید نهایی و حذف قطعی' : 'مرحله بعد و حذف'] })] })] }) }));
};
