import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React from '../../client-vendor/react.js?b=r24-514-1405';
import { User } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
export const PatientNameLink = ({ name, onClick, fileNumber, className = '', showIcon = true, }) => {
    return (_jsxs("button", { type: "button", onClick: (e) => {
            e.stopPropagation();
            onClick();
        }, className: `inline-flex items-center gap-1.5 text-teal-800 hover:text-teal-900 hover:bg-teal-50/80 px-2 py-1 rounded-lg transition font-bold group cursor-pointer border border-transparent hover:border-teal-200 ${className}`, title: `مشاهده سوابق و پرونده کامل ${name}`, children: [showIcon && _jsx(User, { className: "w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition shrink-0" }), _jsx("span", { className: "underline decoration-teal-300 decoration-1 underline-offset-2 group-hover:decoration-teal-600 font-bold", children: name }), fileNumber && (_jsx("span", { className: "text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-mono font-bold shrink-0", children: fileNumber }))] }));
};
