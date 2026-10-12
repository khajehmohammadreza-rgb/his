import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
const PRESET_THEMES = [
    { mode: 'dark_obsidian', name: 'تیره آبسیدین (پیش‌فرض سیستم)', bg: '#090d16', text: '#f8fafc', previewClass: 'bg-slate-950 border-slate-700' },
    { mode: 'navy_blue', name: 'سرمه‌ای سلطنتی (Navy Blue)', bg: '#0a1128', text: '#f1f5f9', previewClass: 'bg-blue-950 border-blue-700' },
    { mode: 'emerald_dark', name: 'سبز زمردی درمانگاهی', bg: '#041f1a', text: '#f0fdf4', previewClass: 'bg-emerald-950 border-emerald-700' },
    { mode: 'midnight_violet', name: 'بنفش مینی‌مال (Midnight Violet)', bg: '#120a2a', text: '#faf5ff', previewClass: 'bg-purple-950 border-purple-700' },
    { mode: 'warm_sand', name: 'کرم ملایم و شنی (روشنی چشمنواز)', bg: '#f7f5f0', text: '#1e293b', previewClass: 'bg-stone-200 border-stone-400' },
    { mode: 'clean_light', name: 'طوسی روشن و مدرن (Modern Light)', bg: '#f1f5f9', text: '#0f172a', previewClass: 'bg-slate-200 border-slate-400' },
    { mode: 'custom', name: 'رنگ دلخواه سفارشی (Custom Hex)', bg: '#1e1b4b', text: '#ffffff', previewClass: 'bg-gradient-to-r from-teal-900 to-indigo-900 border-teal-500' },
];
const ACCENT_COLORS = [
    { id: 'teal', name: 'فیروزه‌ای درمانگاهی', colorHex: '#0d9488', bgClass: 'bg-teal-600' },
    { id: 'indigo', name: 'آبی کاربنی', colorHex: '#4f46e5', bgClass: 'bg-indigo-600' },
    { id: 'emerald', name: 'سبز زمردی', colorHex: '#059669', bgClass: 'bg-emerald-600' },
    { id: 'amber', name: 'طلایی / کهربایی', colorHex: '#d97706', bgClass: 'bg-amber-600' },
    { id: 'violet', name: 'بنفش یاقوتی', colorHex: '#7c3aed', bgClass: 'bg-violet-600' },
    { id: 'rose', name: 'سرخ روز', colorHex: '#e11d48', bgClass: 'bg-rose-600' },
];
const START_TABS = [
    { id: 'dashboard', title: 'داشبورد مدیریتی' },
    { id: 'reception_queue', title: 'پذیرش و صف نوبت‌دهی' },
    { id: 'doctor_panel', title: 'پانل پزشک و معاینه' },
    { id: 'sales_pos', title: 'صندوق و فروش اقلام (POS)' },
    { id: 'inventory', title: 'مدیریت انبار کالا' },
    { id: 'accounting_expenses', title: 'حسابداری و هزینه‌ها' },
];
export const UserProfileModal = ({ isOpen, onClose, currentUser, onUpdateUser, onLogout, }) => {
    if (!isOpen)
        return null;
    const initialSettings = currentUser.personalSettings || {
        themeMode: 'dark_obsidian',
        accentColor: 'teal',
        fontSizeScale: 'standard',
        density: 'comfortable',
        defaultStartTab: 'reception_queue',
        enableSoundAlerts: true,
        autoCollapseSidebar: false,
        showQuickBadges: true,
        customBgColor: '#090d16',
    };
    const [activeTab, setActiveTab] = useState('theme');
    const [personalSettings, setPersonalSettings] = useState(initialSettings);
    // Profile state
    const [name, setName] = useState(currentUser.name || '');
    const [mobile, setMobile] = useState(currentUser.mobile || '');
    const [email, setEmail] = useState(currentUser.email || '');
    const [nationalId, setNationalId] = useState(currentUser.nationalId || '');
    // Password state
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passError, setPassError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const handleSaveThemeAndPreferences = () => {
        const updatedUser = {
            ...currentUser,
            personalSettings,
        };
        onUpdateUser(updatedUser);
        setSuccessMsg('تنظیمات شخصی، پوسته و رنگ پس‌زمینه با موفقیت ذخیره شد.');
        setTimeout(() => {
            setSuccessMsg('');
            onClose();
        }, 1200);
    };
    const handleSaveProfileInfo = () => {
        const updatedUser = {
            ...currentUser,
            name,
            mobile,
            email,
            nationalId,
        };
        onUpdateUser(updatedUser);
        setSuccessMsg('اطلاعات مشخصات کاربری به روزرسانی شد.');
        setTimeout(() => {
            setSuccessMsg('');
        }, 2000);
    };
    const handleChangePassword = () => {
        setPassError('');
        if (!currentPass) {
            setPassError('لطفاً رمز عبور فعلی خود را وارد کنید.');
            return;
        }
        if (currentUser.password && currentPass !== currentUser.password) {
            setPassError('رمز عبور فعلی وارد شده نادرست است.');
            return;
        }
        if (newPass.length < 4) {
            setPassError('رمز عبور جدید باید حداقل ۴ کاراکتر باشد.');
            return;
        }
        if (newPass !== confirmPass) {
            setPassError('رمز عبور جدید و تکرار آن یکسان نیستند.');
            return;
        }
        const updatedUser = {
            ...currentUser,
            password: newPass,
        };
        onUpdateUser(updatedUser);
        setSuccessMsg('رمز عبور با موفقیت تغییر یافت.');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => {
            setSuccessMsg('');
        }, 2500);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md dir-rtl", children: _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xl", children: currentUser.name.charAt(0) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-white font-titr", children: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0634\u062E\u0635\u06CC \u06A9\u0627\u0631\u0628\u0631 \u0648 \u067E\u0648\u0633\u062A\u0647 \u0638\u0627\u0647\u0631\u06CC" }), _jsxs("p", { className: "text-xs text-slate-400 mt-0.5", children: [currentUser.name, " | ", currentUser.role === 'admin' ? 'مدیر ارشد' : currentUser.department || 'کادر درمانگاه'] })] })] }), _jsx("button", { onClick: onClose, className: "w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition", children: "\u2715" })] }), _jsxs("div", { className: "flex border-b border-slate-800 bg-slate-900/50 p-1.5 gap-1 text-xs font-medium", children: [_jsx("button", { onClick: () => setActiveTab('theme'), className: `flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${activeTab === 'theme'
                                ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-950'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`, children: "\uD83C\uDFA8 \u0631\u0646\u06AF \u067E\u0633\u200C\u0632\u0645\u06CC\u0646\u0647 \u0648 \u067E\u0648\u0633\u062A\u0647" }), _jsx("button", { onClick: () => setActiveTab('profile'), className: `flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${activeTab === 'profile'
                                ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-950'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`, children: "\uD83D\uDC64 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC" }), _jsx("button", { onClick: () => setActiveTab('security'), className: `flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${activeTab === 'security'
                                ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-950'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}`, children: "\uD83D\uDD10 \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0648 \u0627\u0645\u0646\u06CC\u062A" })] }), successMsg && (_jsxs("div", { className: "m-4 mb-0 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2", children: [_jsx("span", { children: "\u2713" }), " ", successMsg] })), _jsxs("div", { className: "p-6 overflow-y-auto flex-1 space-y-6", children: [activeTab === 'theme' && (_jsxs("div", { className: "space-y-6 text-sm", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-300 mb-3", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u067E\u0648\u0633\u062A\u0647 \u0648 \u0631\u0646\u06AF \u067E\u0633\u200C\u0632\u0645\u06CC\u0646\u0647 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u06A9\u0627\u0631\u0628\u0631:" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: PRESET_THEMES.map((item) => (_jsxs("div", { onClick: () => setPersonalSettings((prev) => ({
                                                    ...prev,
                                                    themeMode: item.mode,
                                                    customBgColor: item.mode === 'custom' ? prev.customBgColor || '#1e1b4b' : item.bg,
                                                })), className: `p-3 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${personalSettings.themeMode === item.mode
                                                    ? 'border-teal-500 bg-teal-950/20 shadow-lg shadow-teal-950/50 ring-2 ring-teal-500/30'
                                                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`, children: [_jsx("div", { className: `w-8 h-8 rounded-xl border ${item.previewClass} shadow-inner flex items-center justify-center text-xs`, children: personalSettings.themeMode === item.mode && _jsx("span", { className: "text-teal-400 font-bold", children: "\u2713" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-xs font-bold text-white truncate", children: item.name }), _jsxs("div", { className: "text-[10px] text-slate-400 truncate", children: ["\u06A9\u062F \u0631\u0646\u06AF: ", item.bg] })] })] }, item.mode))) })] }), personalSettings.themeMode === 'custom' && (_jsxs("div", { className: "p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3", children: [_jsx("label", { className: "block text-xs font-bold text-slate-300", children: "\u0631\u0646\u06AF \u067E\u0633\u200C\u0632\u0645\u06CC\u0646\u0647 \u062F\u0644\u062E\u0648\u0627\u0647 \u0633\u0641\u0627\u0631\u0634\u06CC (Hex Color):" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "color", value: personalSettings.customBgColor || '#090d16', onChange: (e) => setPersonalSettings((prev) => ({ ...prev, customBgColor: e.target.value })), className: "w-12 h-10 rounded-xl bg-transparent border-0 cursor-pointer" }), _jsx("input", { type: "text", value: personalSettings.customBgColor || '#090d16', onChange: (e) => setPersonalSettings((prev) => ({ ...prev, customBgColor: e.target.value })), placeholder: "#090d16", className: "flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white" })] })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-300 mb-3", children: "\u0631\u0646\u06AF \u0634\u0627\u062E\u0635 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627 \u0648 \u0647\u0627\u06CC\u0644\u0627\u06CC\u062A\u200C\u0647\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645 (Accent Color):" }), _jsx("div", { className: "flex flex-wrap gap-3", children: ACCENT_COLORS.map((accent) => (_jsxs("button", { type: "button", onClick: () => setPersonalSettings((prev) => ({ ...prev, accentColor: accent.id })), className: `py-2 px-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${personalSettings.accentColor === accent.id
                                                    ? 'border-white text-white font-bold bg-slate-800 ring-2 ring-teal-500/50'
                                                    : 'border-slate-800 text-slate-400 hover:text-white bg-slate-950'}`, children: [_jsx("span", { className: `w-3.5 h-3.5 rounded-full ${accent.bgClass}` }), accent.name] }, accent.id))) })] }), _jsxs("div", { className: "p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4", children: [_jsx("h3", { className: "text-xs font-bold text-teal-400", children: "\u062A\u0631\u062C\u06CC\u062D\u0627\u062A \u06A9\u0627\u0631\u0628\u0631\u062F\u06CC \u0648 \u062A\u0631\u062A\u06CC\u0628\u0627\u062A \u0648\u0631\u0648\u062F" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u0635\u0641\u062D\u0647 \u0627\u0648\u0644\u06CC\u0647 \u067E\u0633 \u0627\u0632 \u0648\u0631\u0648\u062F (\u062A\u0628 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636):" }), _jsx("select", { value: personalSettings.defaultStartTab || 'reception_queue', onChange: (e) => setPersonalSettings((prev) => ({ ...prev, defaultStartTab: e.target.value })), className: "w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white", children: START_TABS.map((t) => (_jsx("option", { value: t.id, children: t.title }, t.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u0627\u0646\u062F\u0627\u0632\u0647 \u0641\u0648\u0646\u062A \u0645\u062A\u0648\u0646 \u0633\u0627\u0645\u0627\u0646\u0647:" }), _jsxs("select", { value: personalSettings.fontSizeScale || 'standard', onChange: (e) => setPersonalSettings((prev) => ({
                                                                ...prev,
                                                                fontSizeScale: e.target.value,
                                                            })), className: "w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white", children: [_jsx("option", { value: "standard", children: "\u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F (\u067E\u06CC\u0634\u200C\u0641\u0631\u0636)" }), _jsx("option", { value: "large", children: "\u062F\u0631\u0634\u062A (+\u06F1\u06F0\u066A \u0628\u0632\u0631\u06AF\u062A\u0631)" }), _jsx("option", { value: "xlarge", children: "\u062E\u06CC\u0644\u06CC \u062F\u0631\u0634\u062A (+\u06F2\u06F0\u066A \u0628\u0632\u0631\u06AF\u062A\u0631)" })] })] })] }), _jsxs("div", { className: "pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs", children: [_jsxs("label", { className: "flex items-center gap-2 text-slate-300 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: personalSettings.enableSoundAlerts ?? true, onChange: (e) => setPersonalSettings((prev) => ({ ...prev, enableSoundAlerts: e.target.checked })), className: "rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-teal-500" }), "\u067E\u062E\u0634 \u0635\u062F\u0627 \u0647\u0646\u06AF\u0627\u0645 \u062B\u0628\u062A \u0646\u0648\u0628\u062A \u0648 \u0647\u0634\u062F\u0627\u0631\u0647\u0627"] }), _jsxs("label", { className: "flex items-center gap-2 text-slate-300 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: personalSettings.autoCollapseSidebar ?? false, onChange: (e) => setPersonalSettings((prev) => ({ ...prev, autoCollapseSidebar: e.target.checked })), className: "rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-teal-500" }), "\u067E\u0646\u0647\u0627\u0646\u200C\u0633\u0627\u0632\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0645\u0646\u0648\u06CC \u06A9\u0646\u0627\u0631\u06CC \u0647\u0646\u06AF\u0627\u0645 \u0648\u0631\u0648\u062F"] })] })] }), _jsx("div", { className: "pt-2 flex justify-end", children: _jsx("button", { type: "button", onClick: handleSaveThemeAndPreferences, className: "bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-lg shadow-teal-950 flex items-center gap-2", children: "\u2713 \u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u067E\u0648\u0633\u062A\u0647 \u0648 \u062A\u0631\u062C\u06CC\u062D\u0627\u062A" }) })] })), activeTab === 'profile' && (_jsxs("div", { className: "space-y-4 text-xs", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC:" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644:" }), _jsx("input", { type: "text", value: mobile, onChange: (e) => setMobile(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white dir-ltr text-right" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u06A9\u062F \u0645\u0644\u06CC:" }), _jsx("input", { type: "text", value: nationalId, onChange: (e) => setNationalId(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white dir-ltr text-right" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u067E\u0633\u062A \u0627\u0644\u06A9\u062A\u0631\u0648\u0646\u06CC\u06A9 (\u0627\u06CC\u0645\u06CC\u0644):" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white dir-ltr text-right" })] })] }), _jsxs("div", { className: "p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-1", children: [_jsxs("div", { children: ["\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC: ", _jsx("span", { className: "text-white font-mono", children: currentUser.username })] }), _jsxs("div", { children: ["\u0646\u0642\u0634 \u0633\u06CC\u0633\u062A\u0645: ", _jsx("span", { className: "text-teal-400 font-bold", children: currentUser.role === 'admin' ? 'مدیر کل (Super Admin)' : currentUser.role })] })] }), _jsx("div", { className: "pt-2 flex justify-end", children: _jsx("button", { type: "button", onClick: handleSaveProfileInfo, className: "bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-lg shadow-teal-950", children: "\u0630\u062E\u06CC\u0631\u0647 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062D\u0633\u0627\u0628" }) })] })), activeTab === 'security' && (_jsxs("div", { className: "space-y-4 text-xs max-w-md mx-auto", children: [passError && (_jsx("div", { className: "p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl", children: passError })), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0641\u0639\u0644\u06CC:" }), _jsx("input", { type: "password", value: currentPass, onChange: (e) => setCurrentPass(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F:" }), _jsx("input", { type: "password", value: newPass, onChange: (e) => setNewPass(e.target.value), placeholder: "\u062D\u062F\u0627\u0642\u0644 \u06F4 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 mb-1 font-medium", children: "\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F:" }), _jsx("input", { type: "password", value: confirmPass, onChange: (e) => setConfirmPass(e.target.value), placeholder: "\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F", className: "w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono" })] }), _jsx("div", { className: "pt-3", children: _jsx("button", { type: "button", onClick: handleChangePassword, className: "w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-teal-950", children: "\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631" }) })] }))] }), _jsxs("div", { className: "p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between", children: [_jsx("button", { onClick: onLogout, className: "text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-rose-950/30 transition", children: "\uD83D\uDEAA \u062E\u0631\u0648\u062C \u06A9\u0627\u0645\u0644 \u0627\u0632 \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC" }), _jsx("button", { onClick: onClose, className: "bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-5 rounded-xl text-xs transition", children: "\u0628\u0633\u062A\u0646" })] })] }) }));
};
