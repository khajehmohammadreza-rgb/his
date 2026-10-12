import { jsx as _jsx, jsxs as _jsxs } from "../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React from '../client-vendor/react.js?b=r24-514-1405';
export class ErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        this.state = {
            hasError: false,
            error: null,
        };
        this.handleReset = () => {
            try {
                ['bastiyan_client_version','bastiyan_client_build','bastiyan-sw-build','bastiyan_runtime_error'].forEach(k => localStorage.removeItem(k));
                if ('caches' in window) caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
                if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))).catch(() => {});
            } catch (e) { console.warn('Bastiyan recovery cleanup skipped:', e); }
            window.location.reload();
        };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (_jsx("div", { className: "min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-right dir-rtl font-sans", children: _jsxs("div", { className: "max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4", children: [_jsxs("div", { className: "flex items-center gap-3 text-amber-400", children: [_jsx("svg", { className: "w-8 h-8", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }), _jsx("h2", { className: "text-xl font-bold text-white", children: "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0633\u0627\u0645\u0627\u0646\u0647" })] }), _jsx("p", { className: "text-sm text-slate-300 leading-relaxed", children: "\u0645\u062A\u0623\u0633\u0641\u0627\u0646\u0647 \u062E\u0637\u0627\u06CC\u06CC \u062F\u0631 \u0646\u0645\u0627\u06CC\u0634 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0631\u062E \u062F\u0627\u062F\u0647 \u0627\u0633\u062A. \u0627\u06CC\u0646 \u0645\u0634\u06A9\u0644 \u0645\u0639\u0645\u0648\u0644\u0627\u064B \u0628\u0627 \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u062D\u0627\u0641\u0638\u0647 \u0645\u0648\u0642\u062A \u0648 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0645\u062C\u062F\u062F \u062D\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F." }), this.state.error && (_jsx("div", { className: "bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-red-400 overflow-x-auto max-h-32", children: this.state.error.message || String(this.state.error) })), _jsxs("div", { className: "flex items-center gap-3 pt-2", children: [_jsx("button", { onClick: this.handleReset, className: "flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-lg shadow-teal-950/50 text-xs", children: "\u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC \u062D\u0627\u0641\u0638\u0647 \u0648 \u0634\u0631\u0648\u200C\u0639 \u0645\u062C\u062F\u062F" }), _jsx("button", { onClick: () => window.location.reload(), className: "bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition text-xs", children: "\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F" })] })] }) }));
        }
        return this.props.children;
    }
}
