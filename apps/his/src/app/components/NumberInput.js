import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from '../../client-vendor/react.js?b=r24-514-1405';
import { toEnglishDigits } from '../utils/jalali.js?b=r24-514-1405';
export const NumberInput = ({ value, onChange, currencyLabel = 'تومان', className = '', ...props }) => {
    const numericVal = typeof value === 'number' ? value : Number(String(value).replace(/[,،]/g, '')) || 0;
    const displayStr = numericVal === 0 && (value === '' || value === '0') ? '' : numericVal.toLocaleString('en-US');
    const handleChange = (e) => {
        const raw = toEnglishDigits(e.target.value).replace(/[,،\s]/g, '');
        if (raw === '') {
            onChange(0);
            return;
        }
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) {
            onChange(parsed);
        }
    };
    const defaultClasses = className.includes('bg-')
        ? className
        : `w-full text-left pl-14 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono text-sm transition-colors ${className}`;
    return (_jsxs("div", { className: "relative flex items-center w-full", children: [_jsx("input", { type: "text", value: displayStr, onChange: handleChange, className: defaultClasses, ...props }), currencyLabel && (_jsx("span", { className: "absolute left-3 text-xs text-slate-500 dark:text-slate-400 pointer-events-none font-medium", children: currencyLabel }))] }));
};
