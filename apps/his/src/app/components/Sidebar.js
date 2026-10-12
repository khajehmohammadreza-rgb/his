import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Archive, Calendar, CreditCard, DollarSign, FileCheck, FileText, Home, Package, PackageCheck, PackageMinus, PieChart, Settings, ShieldCheck, Stethoscope, Syringe, UserCheck, Users, Briefcase, ChevronDown, ChevronLeft, X, Building2, Folder, FolderOpen, Receipt, Smartphone, History, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { APP_VERSION, formatPersianAppVersion } from '../utils/appVersion.js?b=r24-514-1405';
export const Sidebar = ({ activeTab, currentTab, onTabChange, userRole = 'admin', currentUser, lowStockCount = 0, debtorsCount = 0, pendingUsersCount = 0, isOpenOnMobile = false, onCloseMobile, clinicName = 'مرکز درمانی', isSuperAdmin = (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('bastiyan_superadmin_override') === '1' || sessionStorage.getItem('bastian_superadmin_override') === '1')), }) => {
    const selectedTab = currentTab || activeTab || 'dashboard';
    // Hierarchical Menu Tree structure grouped into clean primary categories
    const menuTree = [
        {
            groupKey: 'clinic_management',
            groupTitle: 'مدیریت درمانگاه و مراجعین',
            groupIcon: Building2,
            items: [
                {
                    id: 'dashboard',
                    label: 'داشبورد مدیریتی کلینیک',
                    icon: Home,
                },
                {
                    id: 'my_cartable',
                    label: 'کارتابل شخصی و درخواست‌های من',
                    icon: Briefcase,
                },
                {
                    id: 'reception_queue',
                    label: 'پذیرش، نوبت و تشکیل پرونده',
                    icon: UserCheck,
                    allowedRoles: ['admin', 'cashier', 'doctor', 'nurse', 'accountant'],
                },
                {
                    id: 'appointments_plans',
                    label: 'تقویم نوبت‌دهی و طرح درمان',
                    icon: Calendar,
                    allowedRoles: ['admin', 'cashier', 'doctor', 'nurse'],
                },
                {
                    id: 'consent_forms',
                    label: 'فرم‌ساز، گزارش‌ساز و رضایت‌نامه‌ها',
                    icon: FileCheck,
                    allowedRoles: ['admin', 'cashier', 'doctor', 'nurse', 'operating_room_supervisor'],
                },
                {
                    id: 'doctor_panel',
                    label: 'پانل معاینه و نسخه پزشک',
                    icon: Stethoscope,
                    allowedRoles: ['admin', 'doctor', 'nurse', 'operating_room_supervisor'],
                },
                {
                    id: 'tamin_epresc',
                    label: 'نسخه الکترونیک تامین اجتماعی',
                    icon: ShieldCheck,
                    allowedRoles: ['admin', 'doctor', 'nurse', 'cashier'],
                },
                {
                    id: 'sms_management',
                    label: 'مرکز پیامک و اطلاع‌رسانی',
                    icon: Smartphone,
                    allowedRoles: ['admin', 'cashier', 'doctor', 'nurse', 'accountant'],
                },
            ],
        },
        {
            groupKey: 'inventory_goods',
            groupTitle: 'انبار و مدیریت کالا',
            groupIcon: Package,
            items: [
                {
                    id: 'inventory',
                    label: 'کالاها و موجودی انبار',
                    icon: Package,
                    badge: lowStockCount > 0 ? lowStockCount : undefined,
                    badgeColor: 'bg-amber-500 text-slate-950 font-bold',
                    allowedRoles: ['admin', 'inventory_manager', 'nurse', 'accountant', 'purchaser'],
                },
                {
                    id: 'purchase',
                    label: 'فاکتور خرید و تامین‌کنندگان',
                    icon: PackageCheck,
                    allowedRoles: ['admin', 'inventory_manager', 'accountant', 'purchaser'],
                },
                {
                    id: 'internal_consumption',
                    label: 'مصرف داخلی بخش‌ها',
                    icon: Syringe,
                    allowedRoles: ['admin', 'nurse', 'operating_room_supervisor', 'inventory_manager', 'cashier'],
                },
                {
                    id: 'returns_wastage',
                    label: 'مرجوعی و ضایعات کالا',
                    icon: PackageMinus,
                    allowedRoles: ['admin', 'inventory_manager', 'accountant', 'cashier'],
                },
            ],
        },
        {
            groupKey: 'financial_affairs',
            groupTitle: 'امور مالی و پرسنلی',
            groupIcon: DollarSign,
            items: [
                {
                    id: 'cashier_module',
                    label: 'صندوق، تسویه حساب و ترخیص',
                    icon: Receipt,
                    allowedRoles: ['admin', 'cashier', 'accountant'],
                },
                {
                    id: 'services_tariffs',
                    label: 'تعرفه و کتاب ارزش نسبی',
                    icon: FileText,
                    allowedRoles: ['admin', 'accountant', 'cashier', 'doctor'],
                },
                {
                    id: 'insurance_management',
                    label: 'مدیریت بیمه و قراردادها',
                    icon: ShieldCheck,
                    allowedRoles: ['admin', 'accountant', 'cashier'],
                },
                {
                    id: 'discount_management',
                    label: 'مدیریت تخفیف و مجوزها',
                    icon: FileCheck,
                    allowedRoles: ['admin', 'accountant', 'cashier'],
                },
                {
                    id: 'patients_credit',
                    label: 'بیماران و تسویه بدهی معوق',
                    icon: CreditCard,
                    badge: debtorsCount > 0 ? debtorsCount : undefined,
                    badgeColor: 'bg-rose-500 text-white font-bold',
                    allowedRoles: ['admin', 'cashier', 'accountant'],
                },
                {
                    id: 'accounting_expenses',
                    label: 'دفتر حسابداری و هزینه‌ها',
                    icon: DollarSign,
                    allowedRoles: ['admin', 'accountant'],
                },
                {
                    id: 'hr_payroll',
                    label: 'حقوق، شیفت و تایمکس پرسنل',
                    icon: Briefcase,
                    allowedRoles: ['admin', 'accountant'],
                },
                {
                    id: 'reports',
                    label: 'گزارشات مالی و سود/زیان',
                    icon: PieChart,
                    allowedRoles: ['admin', 'accountant', 'inspector', 'cashier'],
                },
            ],
        },
        {
            groupKey: 'settings_security',
            groupTitle: 'تنظیمات و امنیت',
            groupIcon: Settings,
            items: [
                {
                    id: 'rbac_users',
                    label: 'مدیریت پرسنل و دسترسی‌ها',
                    icon: Users,
                    badge: pendingUsersCount > 0 ? pendingUsersCount : undefined,
                    badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
                    allowedRoles: ['admin'],
                },
                {
                    id: 'settings',
                    label: 'تنظیمات مرکز و پشتیبان‌گیری',
                    icon: Settings,
                    allowedRoles: ['admin'],
                },
                {
                    id: 'centers_management',
                    label: 'مدیریت مراکز تحت پوشش و شعب',
                    icon: Building2,
                    allowedRoles: ['admin'],
                },
                {
                    id: 'package_install',
                    label: 'مدیریت نسخه و سرویس‌ها',
                    icon: PackageCheck,
                    allowedRoles: ['admin'],
                    superAdminOnly: true,
                },
                {
                    id: 'audit_logs',
                    label: 'ثبت وقایع و لاگ‌های امنیتی',
                    icon: History,
                    allowedRoles: ['admin', 'inspector'],
                },
            ],
        },
        {
            groupKey: 'archived_dev_tools',
            groupTitle: 'بایگانی و ابزارهای توسعه',
            groupIcon: Archive,
            items: [
                {
                    id: 'archived_features',
                    label: 'بایگانی امکانات و پیامک / برنامه',
                    icon: Archive,
                    allowedRoles: ['admin', 'accountant', 'inspector'],
                },
            ],
        },
    ];
    // State to track expanded tree branches.
    const [expandedGroups, setExpandedGroups] = useState({
        clinic_management: true,
        inventory_goods: true,
        financial_affairs: true,
        settings_security: true,
        archived_dev_tools: false,
    });
    const toggleGroup = (key) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };
    const sidebarContent = (_jsxs("div", { className: "flex flex-col h-full bg-slate-900 text-slate-300 border-l border-slate-800 w-72 shrink-0 select-none", children: [_jsxs("div", { className: "p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3 overflow-hidden", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-white border border-teal-500/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-0.5", children: _jsx("img", { src: '/bastiyan-logo.png', alt: "\u0644\u0648\u06AF\u0648 \u0646\u0631\u0645\u200C\u0627\u0641\u0632\u0627\u0631 \u0628\u0627\u0633\u062A\u06CC\u0627\u0646", className: "w-full h-full object-cover rounded-lg", referrerPolicy: "no-referrer", onError: (e) => {
                                        e.currentTarget.style.display = 'none';
                                    } }) }), _jsxs("div", { className: "overflow-hidden", children: [_jsx("h2", { className: "text-xs font-bold text-white truncate leading-tight", children: clinicName }), _jsx("span", { className: "text-[10px] text-teal-400 font-medium block truncate", children: "\u0633\u06CC\u0633\u062A\u0645 \u062C\u0627\u0645\u0639 \u0645\u062F\u06CC\u0631\u06CC\u062A \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647" })] })] }), _jsx("button", { onClick: onCloseMobile, className: "p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition lg:hidden shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center", title: "\u0628\u0633\u062A\u0646 \u0645\u0646\u0648", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("nav", { className: "flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar", children: menuTree.map((group) => {
                    // Filter items based on user role and custom user permissions
                    const visibleItems = group.items.filter((item) => {
                        if (item.superAdminOnly && !isSuperAdmin)
                            return false;
                        if (!currentUser)
                            return true;
                        const userRoles = [currentUser.role, ...(currentUser.roles || [])];
                        if (userRoles.includes('admin') || userRole === 'admin')
                            return true;
                        if (currentUser.allowedTabs && currentUser.allowedTabs.length > 0) {
                            if (currentUser.allowedTabs.includes(item.id))
                                return true;
                        }
                        if (!item.allowedRoles)
                            return true;
                        return userRoles.some((r) => item.allowedRoles?.includes(r));
                    });
                    if (visibleItems.length === 0)
                        return null;
                    const isExpanded = expandedGroups[group.groupKey] !== false;
                    const GroupIcon = group.groupIcon;
                    // Check if active tab is inside this group
                    const hasActiveChild = visibleItems.some((item) => item.id === selectedTab);
                    return (_jsxs("div", { className: "rounded-xl bg-slate-950/40 border border-slate-800/80 overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => toggleGroup(group.groupKey), className: `w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold transition-all min-h-[44px] ${hasActiveChild
                                    ? 'text-teal-300 bg-teal-950/30'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`, children: [_jsxs("div", { className: "flex items-center gap-2", children: [isExpanded ? (_jsx(FolderOpen, { className: "w-4 h-4 text-teal-400 shrink-0" })) : (_jsx(Folder, { className: "w-4 h-4 text-slate-400 shrink-0" })), _jsx("span", { className: "truncate", children: group.groupTitle }), _jsx("span", { className: "text-[10px] font-normal text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full", children: toPersianDigits(visibleItems.length) })] }), _jsx("div", { className: "flex items-center gap-1.5", children: isExpanded ? (_jsx(ChevronDown, { className: "w-4 h-4 text-slate-400" })) : (_jsx(ChevronLeft, { className: "w-4 h-4 text-slate-400" })) })] }), isExpanded && (_jsx("div", { className: "pr-3 pl-1.5 py-1.5 space-y-1 border-r-2 border-teal-500/30 mr-3 mb-1", children: visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = selectedTab === item.id;
                                    return (_jsxs("button", { onClick: () => {
                                            onTabChange(item.id);
                                            if (onCloseMobile)
                                                onCloseMobile();
                                        }, className: `w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all min-h-[40px] ${isActive
                                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-md shadow-teal-900/40'
                                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`, children: [_jsxs("div", { className: "flex items-center gap-2.5 truncate", children: [_jsx(Icon, { className: `w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}` }), _jsx("span", { className: "truncate", children: item.label })] }), item.badge !== undefined && (_jsx("span", { className: `px-2 py-0.5 text-[10px] rounded-full shrink-0 ${item.badgeColor || 'bg-slate-700 text-white'}`, children: toPersianDigits(item.badge) }))] }, item.id));
                                }) }))] }, group.groupKey));
                }) }), _jsxs("div", { className: "p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 text-center space-y-0.5", children: [_jsx("div", { className: "font-semibold text-slate-300", children: "\u0647\u0644\u062F\u06CC\u0646\u06AF \u0628\u0627\u0633\u062A\u06CC\u0627\u0646 (Bastiyan)" }), _jsxs("div", { className: "text-[10px] text-slate-500", children: ["\u0646\u0633\u062E\u0647 ", formatPersianAppVersion(APP_VERSION), " \u0633\u06CC\u0633\u062A\u0645 \u062C\u0627\u0645\u0639 \u067E\u0632\u0634\u06A9\u06CC"] })] })] }));
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden lg:block shrink-0 h-full", children: sidebarContent }), isOpenOnMobile && (_jsxs("div", { className: "fixed inset-0 z-50 lg:hidden flex", dir: "rtl", children: [_jsx("div", { className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity", onClick: onCloseMobile }), _jsx("div", { className: "relative z-10 w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-right duration-200", children: sidebarContent })] }))] }));
};
