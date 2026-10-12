import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from '../../client-vendor/react.js?b=r24-514-1405';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, X, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { JALALI_MONTH_NAMES, JALALI_WEEKDAYS, getDaysInJalaliMonth, getJalaliDayOfWeek, parseJalaliDate, formatJalaliDate, getJalaliDateString, toPersianDigits, addDaysToJalali, formatTypedJalaliInput, } from '../utils/jalali.js?b=r24-514-1405';
export const PersianDatePicker = ({ value, onChange, label, placeholder = 'انتخاب تاریخ شمسی (مثلاً ۱۴۰۵/۰۵/۰۱)', disabled = false, className = '', inputClassName = '', }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    // Today's Jalali Date
    const todayStr = getJalaliDateString();
    const todayParsed = parseJalaliDate(todayStr);
    // Current view state (year and month currently displayed in calendar)
    const initialParsed = parseJalaliDate(value || todayStr);
    const [viewYear, setViewYear] = useState(initialParsed.jy);
    const [viewMonth, setViewMonth] = useState(initialParsed.jm);
    // Sync view when value changes or when modal opens
    useEffect(() => {
        if (value) {
            const parsed = parseJalaliDate(value);
            setViewYear(parsed.jy);
            setViewMonth(parsed.jm);
        }
    }, [value, isOpen]);
    // Handle click outside to close popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    // Calendar Math calculations
    const totalDaysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
    const firstDayOfWeekIndex = getJalaliDayOfWeek(viewYear, viewMonth, 1); // 0 = Shanbeh, 6 = Jomeh
    // Previous month info for padding
    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    const daysInPrevMonth = getDaysInJalaliMonth(prevYear, prevMonth);
    // Year choices (from 1400 to 1420)
    const yearOptions = Array.from({ length: 21 }, (_, i) => 1400 + i);
    const handlePrevMonth = () => {
        if (viewMonth === 1) {
            setViewMonth(12);
            setViewYear(viewYear - 1);
        }
        else {
            setViewMonth(viewMonth - 1);
        }
    };
    const handleNextMonth = () => {
        if (viewMonth === 12) {
            setViewMonth(1);
            setViewYear(viewYear + 1);
        }
        else {
            setViewMonth(viewMonth + 1);
        }
    };
    const handleSelectDay = (day) => {
        const formatted = formatJalaliDate(viewYear, viewMonth, day, true);
        onChange(formatted);
        setIsOpen(false);
    };
    const handleQuickSelect = (daysOffset) => {
        const newDate = addDaysToJalali(todayStr, daysOffset);
        onChange(newDate);
        const parsed = parseJalaliDate(newDate);
        setViewYear(parsed.jy);
        setViewMonth(parsed.jm);
        setIsOpen(false);
    };
    // Selected date parsed
    const selectedParsed = parseJalaliDate(value || todayStr);
    return (_jsxs("div", { ref: containerRef, className: `relative ${className}`, children: [label && (_jsxs("label", { className: "block text-[#333333] dark:text-slate-200 font-bold mb-1 text-xs flex items-center justify-between", children: [_jsx("span", { children: label }), _jsx("span", { className: "text-[10px] text-teal-600 dark:text-teal-400 font-normal", children: "\u062A\u0642\u0648\u06CC\u0645 \u062A\u0639\u0627\u0645\u0644\u06CC \u0634\u0645\u0633\u06CC" })] })), _jsxs("div", { className: "relative flex items-center", children: [_jsx("input", { type: "text", value: value, onChange: (e) => onChange(e.target.value), onBlur: (e) => {
                            const formatted = formatTypedJalaliInput(e.target.value);
                            if (formatted)
                                onChange(formatted);
                        }, onKeyDown: (e) => {
                            if (e.key === 'Enter') {
                                const formatted = formatTypedJalaliInput(value);
                                if (formatted)
                                    onChange(formatted);
                                e.target.blur();
                            }
                        }, placeholder: placeholder, disabled: disabled, className: `w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 pr-9 text-slate-900 dark:text-slate-100 text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-teal-400 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName}` }), _jsx("button", { type: "button", onClick: () => !disabled && setIsOpen(!isOpen), className: "absolute right-2.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition", title: "\u0628\u0627\u0632 \u06A9\u0631\u062F\u0646 \u062A\u0642\u0648\u06CC\u0645 \u0634\u0645\u0633\u06CC", children: _jsx(CalendarIcon, { className: "w-4 h-4 text-teal-600" }) })] }), isOpen && (_jsxs("div", { className: "absolute z-50 mt-1 right-0 sm:right-auto w-[310px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: handlePrevMonth, className: "p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition", title: "\u0645\u0627\u0647 \u0642\u0628\u0644\u06CC", children: _jsx(ChevronRight, { className: "w-4 h-4" }) }), _jsx("button", { type: "button", onClick: handleNextMonth, className: "p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition", title: "\u0645\u0627\u0647 \u0628\u0639\u062F\u06CC", children: _jsx(ChevronLeft, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-100", children: [_jsx("select", { value: viewMonth, onChange: (e) => setViewMonth(Number(e.target.value)), className: "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-teal-700 dark:text-teal-300 focus:outline-none", children: JALALI_MONTH_NAMES.map((mName, idx) => (_jsx("option", { value: idx + 1, children: mName }, idx))) }), _jsx("select", { value: viewYear, onChange: (e) => setViewYear(Number(e.target.value)), className: "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none font-mono", children: yearOptions.map((yr) => (_jsx("option", { value: yr, children: toPersianDigits(yr) }, yr))) })] }), _jsx("button", { type: "button", onClick: () => setIsOpen(false), className: "p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "grid grid-cols-7 gap-1 text-center border-b border-slate-100 dark:border-slate-800 pb-1.5", children: JALALI_WEEKDAYS.map((day, idx) => (_jsx("span", { className: `text-[11px] font-bold ${idx === 6 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`, title: day.full, children: day.short }, idx))) }), _jsxs("div", { className: "grid grid-cols-7 gap-1 text-center", children: [Array.from({ length: firstDayOfWeekIndex }, (_, i) => {
                                const dayNum = daysInPrevMonth - firstDayOfWeekIndex + i + 1;
                                return (_jsx("div", { className: "p-1.5 text-[11px] font-mono text-slate-300 dark:text-slate-700 select-none", children: toPersianDigits(dayNum) }, `prev-${i}`));
                            }), Array.from({ length: totalDaysInMonth }, (_, i) => {
                                const day = i + 1;
                                const isToday = todayParsed.jy === viewYear &&
                                    todayParsed.jm === viewMonth &&
                                    todayParsed.jd === day;
                                const isSelected = selectedParsed.jy === viewYear &&
                                    selectedParsed.jm === viewMonth &&
                                    selectedParsed.jd === day;
                                const dayOfWeek = (firstDayOfWeekIndex + i) % 7;
                                const isFriday = dayOfWeek === 6;
                                return (_jsxs("button", { type: "button", onClick: () => handleSelectDay(day), className: `p-1.5 text-xs font-mono font-bold rounded-xl transition flex flex-col items-center justify-center relative ${isSelected
                                        ? 'bg-teal-600 text-white shadow-md scale-105 font-black'
                                        : isToday
                                            ? 'bg-teal-50 dark:bg-teal-950/60 border border-teal-500 text-teal-700 dark:text-teal-300 font-extrabold'
                                            : isFriday
                                                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`, children: [_jsx("span", { children: toPersianDigits(day) }), isToday && !isSelected && (_jsx("span", { className: "w-1 h-1 bg-teal-600 rounded-full mt-0.5" }))] }, `curr-${day}`));
                            })] }), _jsxs("div", { className: "pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5", children: [_jsxs("div", { className: "text-[10px] text-slate-400 font-bold flex items-center gap-1", children: [_jsx(Sparkles, { className: "w-3 h-3 text-teal-500" }), _jsx("span", { children: "\u0645\u06CC\u0627\u0646\u0628\u0631\u0647\u0627\u06CC \u0633\u0631\u06CC\u0639 \u062A\u0627\u0631\u06CC\u062E:" })] }), _jsxs("div", { className: "grid grid-cols-4 gap-1", children: [_jsx("button", { type: "button", onClick: () => handleQuickSelect(0), className: "px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg text-[10px] font-bold transition", children: "\u0627\u0645\u0631\u0648\u0632" }), _jsx("button", { type: "button", onClick: () => handleQuickSelect(1), className: "px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg text-[10px] font-bold transition", children: "\u0641\u0631\u062F\u0627" }), _jsx("button", { type: "button", onClick: () => handleQuickSelect(3), className: "px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg text-[10px] font-bold transition", children: "\u06F3 \u0631\u0648\u0632 \u0628\u0639\u062F" }), _jsx("button", { type: "button", onClick: () => handleQuickSelect(7), className: "px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-lg text-[10px] font-bold transition", children: "\u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647" })] })] })] }))] }));
};
