import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Briefcase, Clock, Calendar, CheckCircle2, Plus, Send, ShieldCheck, FileText, Check, X, Building2, ShoppingBag, Trash2, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';
import { notificationService } from '../utils/webNotification.js?b=r24-514-1405';
const SUPPLY_STATUS_CONFIG = {
    pending_approval: { label: 'در انتظار تایید مدیریت / حسابدار', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    approved: { label: 'تایید شده (در حال آماده‌سازی)', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    sent_to_buyer: { label: 'ارسال شده به مسئول خرید', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    fulfilled: { label: 'خریداری و تحویل انبار شده', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    rejected: { label: 'رد شده توسط مدیریت', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};
export const MyCartable = ({ currentUser, users, attendanceRequests = [], onSaveAttendanceRequests, attendanceRecords = [], onSaveAttendance, shifts = [], settings, supplyRequests = [], products = [], onCreateSupplyRequest, onUpdateSupplyRequest, }) => {
    const [activeTab, setActiveTab] = useState('my_requests');
    // Bastian Ticket State
    const [bastianTicketSubject, setBastianTicketSubject] = useState('');
    const [bastianTicketMessage, setBastianTicketMessage] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    const handleSendBastianTicket = async (e) => {
        e.preventDefault();
        if (!bastianTicketSubject.trim() || !bastianTicketMessage.trim()) {
            alert('لطفاً موضوع و متن تیکت را وارد کنید.');
            return;
        }
        setIsSubmittingTicket(true);
        try {
            const res = await fetch('/api/bastian/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    centerId: JSON.parse(sessionStorage.getItem('bastiyan_center_session')||'null')?.id || '',
                    centerName: settings.clinicName,
                    senderName: currentUser.name,
                    senderRole: currentUser.role,
                    subject: bastianTicketSubject.trim(),
                    message: bastianTicketMessage.trim(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMessage('تیکت شما با موفقیت به پشتیبانی مرکزی شرکت باستیان ارسال گردید.');
                setBastianTicketSubject('');
                setBastianTicketMessage('');
            }
            else {
                alert(data.error || 'خطا در ارسال تیکت');
            }
        }
        catch (err) {
            alert('خطا در ارتباط با سرور باستیان: ' + err.message);
        }
        finally {
            setIsSubmittingTicket(false);
        }
    };
    // Attendance Request Form State
    const [requestType, setRequestType] = useState('forgot_clock_in');
    const [jalaliDate, setJalaliDate] = useState(getJalaliDateString());
    const [requestedClockIn, setRequestedClockIn] = useState('08:00');
    const [requestedClockOut, setRequestedClockOut] = useState('16:00');
    const [reason, setReason] = useState('');
    const [successMessage, setSuccessMessage] = useState(null);
    // Supply Request Form State
    const [supplyDepartment, setSupplyDepartment] = useState(currentUser.department || 'انبار مصرفی کلینیک');
    const [supplyRequestItems, setSupplyRequestItems] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [inputQty, setInputQty] = useState(1);
    const [itemNotes, setItemNotes] = useState('');
    // Manager Review State
    const [rejectionNotes, setRejectionNotes] = useState({});
    const [selectedRequestIdForAction, setSelectedRequestIdForAction] = useState(null);
    const [selectedSupplyIdForAction, setSelectedSupplyIdForAction] = useState(null);
    const [supplyRejectionNotes, setSupplyRejectionNotes] = useState({});
    // Is current user a manager / admin / supervisor / accountant?
    const isManager = currentUser.role === 'admin' ||
        currentUser.role === 'accountant' ||
        currentUser.role === 'operating_room_supervisor' ||
        currentUser.role === 'inventory_manager' ||
        currentUser.role === 'doctor';
    // Handle submitting attendance request
    const handleSubmitAttendanceRequest = (e) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('لطفاً دلیل یا توضیح درخواست را وارد نمایید.');
            return;
        }
        const newReq = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            jalaliDate: jalaliDate || getJalaliDateString(),
            requestType,
            requestedClockIn: requestType === 'forgot_clock_out' ? '-' : requestedClockIn,
            requestedClockOut: requestType === 'forgot_clock_in' ? '-' : requestedClockOut,
            reason,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        const updated = [newReq, ...attendanceRequests];
        onSaveAttendanceRequests(updated);
        setSuccessMessage('درخواست تایممیکس و حضور و غیاب شما با موفقیت ثبت و به کارتابل مدیر ارسال شد.');
        setReason('');
        setTimeout(() => {
            setSuccessMessage(null);
            setActiveTab('my_requests');
        }, 2000);
    };
    // Handle adding item to supply request draft
    const handleAddItemToSupplyDraft = () => {
        if (!selectedProductId) {
            alert('لطفاً کالا را انتخاب نمایید.');
            return;
        }
        if (inputQty <= 0) {
            alert('تعداد درخواستی باید بزرگتر از صفر باشد.');
            return;
        }
        const existing = supplyRequestItems.findIndex((i) => i.productId === selectedProductId);
        if (existing >= 0) {
            const copy = [...supplyRequestItems];
            copy[existing].requestedQty += inputQty;
            setSupplyRequestItems(copy);
        }
        else {
            setSupplyRequestItems([
                ...supplyRequestItems,
                { productId: selectedProductId, requestedQty: inputQty, notes: itemNotes },
            ]);
        }
        setSelectedProductId('');
        setInputQty(1);
        setItemNotes('');
    };
    const handleRemoveSupplyItemDraft = (index) => {
        setSupplyRequestItems(supplyRequestItems.filter((_, i) => i !== index));
    };
    // Submit Supply Request
    const handleSubmitSupplyRequest = (e) => {
        e.preventDefault();
        if (supplyRequestItems.length === 0) {
            alert('لطفاً حداقل یک کالا به درخواست خرید/تدارکات اضافه کنید.');
            return;
        }
        const items = supplyRequestItems.map((item) => {
            const prod = products.find((p) => p.id === item.productId);
            return {
                productId: item.productId,
                productName: prod?.name || 'کالای نامشخص',
                code: prod?.code,
                requestedQty: item.requestedQty,
                approvedQty: item.requestedQty,
                unit: prod?.unit || 'عدد',
                notes: item.notes,
            };
        });
        const newSupplyReq = {
            id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            requestNumber: `SR-${Math.floor(1000 + Math.random() * 9000)}`,
            requestedByUserId: currentUser.id,
            requestedByUserName: currentUser.name,
            department: supplyDepartment,
            date: new Date().toISOString().split('T')[0],
            jalaliDate: getJalaliDateString(),
            items,
            status: 'pending_approval',
            adminNotes: 'ثبت شده از طریق کارتابل اختصاصی پرسنل',
            createdAt: new Date().toISOString(),
        };
        if (onCreateSupplyRequest) {
            onCreateSupplyRequest(newSupplyReq);
        }
        notificationService.notify('درخواست خرید و تدارکات جدید', `درخواست شماره ${newSupplyReq.requestNumber} توسط ${currentUser.name} ثبت شد و در انتظار تایید مدیریت است.`, 'cartable', 'my_supply_requests');
        setSuccessMessage('درخواست کالا و تدارکات شما با موفقیت ثبت و برای مدیر/حسابدار ارسال شد.');
        setSupplyRequestItems([]);
        setTimeout(() => {
            setSuccessMessage(null);
            setActiveTab('my_supply_requests');
        }, 2000);
    };
    // Manager approving attendance request — merge missing clock with the real record when possible.
    const handleApproveAttendance = (reqId) => {
        const req = attendanceRequests.find((r) => r.id === reqId);
        if (!req)
            return;
        const sameDay = attendanceRecords.find((a) => a.userId === req.userId && a.jalaliDate === req.jalaliDate);
        const validTime = (v) => /^\d{1,2}:\d{2}$/.test(String(v || ''));
        let clockIn = validTime(req.requestedClockIn) ? req.requestedClockIn : (sameDay?.clockIn || '');
        let clockOut = validTime(req.requestedClockOut) ? req.requestedClockOut : (sameDay?.clockOut || '');
        if (!clockIn || !clockOut) {
            alert('برای اعمال درخواست، هر دو ساعت ورود و خروج باید قابل تشخیص باشند. لطفاً درخواست را با ساعت کامل اصلاح کنید.');
            return;
        }
        const toMin = (v) => {
            const [hh, mm] = String(v).split(':').map(Number);
            return hh * 60 + mm;
        };
        let diff = toMin(clockOut) - toMin(clockIn);
        if (diff < 0)
            diff += 1440;
        const merged = {
            ...(sameDay || {}),
            id: sameDay?.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            userId: req.userId,
            userName: req.userName,
            userRole: req.userRole,
            jalaliDate: req.jalaliDate,
            isoDate: sameDay?.isoDate || new Date().toISOString().split('T')[0],
            clockIn,
            clockOut,
            status: 'closed',
            source: 'manager_approved_request',
            actualMinutes: diff,
            workedHours: Number((diff / 60).toFixed(2)),
            deviceLocation: 'تایید شده از کارتابل مدیریت (' + currentUser.name + ')',
            approvedBy: currentUser.name,
            notes: `تایید شده بابت درخواست: ${req.reason}`,
        };
        const updatedAttendance = sameDay
            ? attendanceRecords.map((a) => a.id === sameDay.id ? merged : a)
            : [merged, ...attendanceRecords];
        onSaveAttendance(updatedAttendance);
        onSaveAttendanceRequests(attendanceRequests.map((r) => r.id === reqId ? {
            ...r,
            status: 'approved',
            reviewedByUserName: currentUser.name,
            reviewedAt: new Date().toISOString(),
        } : r));
    };
    const handleRejectAttendance = (reqId) => {
        const note = rejectionNotes[reqId] || 'رد شد توسط مدیریت';
        const updated = attendanceRequests.map((r) => {
            if (r.id === reqId) {
                return {
                    ...r,
                    status: 'rejected',
                    reviewedByUserName: currentUser.name,
                    reviewedAt: new Date().toISOString(),
                    rejectionReason: note,
                };
            }
            return r;
        });
        onSaveAttendanceRequests(updated);
        setSelectedRequestIdForAction(null);
    };
    // Manager approving supply request
    const handleApproveSupply = (req) => {
        if (onUpdateSupplyRequest) {
            const updated = {
                ...req,
                status: 'approved',
                approvedByUserName: currentUser.name,
                approvedAt: new Date().toISOString(),
            };
            onUpdateSupplyRequest(updated);
            notificationService.notify('تایید درخواست تدارکات', `درخواست تدارکات شماره ${req.requestNumber} توسط ${currentUser.name} تایید شد.`, 'cartable', 'my_supply_requests');
        }
    };
    const handleRejectSupply = (req) => {
        const note = supplyRejectionNotes[req.id] || 'رد شد توسط مدیریت';
        if (onUpdateSupplyRequest) {
            const updated = {
                ...req,
                status: 'rejected',
                approvedByUserName: currentUser.name,
                approvedAt: new Date().toISOString(),
                adminNotes: `${req.adminNotes || ''} | علت رد: ${note}`,
            };
            onUpdateSupplyRequest(updated);
        }
        setSelectedSupplyIdForAction(null);
    };
    // Filtered lists for current user
    const myAttendanceRequests = attendanceRequests.filter((r) => r.userId === currentUser.id);
    const mySupplyRequests = supplyRequests.filter((s) => s.requestedByUserId === currentUser.id);
    const myShifts = shifts.filter((s) => s.userId === currentUser.id);
    // Pending items for manager approval
    const pendingAttendanceManager = attendanceRequests.filter((r) => r.status === 'pending');
    const pendingSupplyManager = supplyRequests.filter((s) => s.status === 'pending_approval');
    const totalPendingManager = pendingAttendanceManager.length + pendingSupplyManager.length;
    return (_jsxs("div", { className: "space-y-6 pb-12 font-sans dir-rtl", dir: "rtl", children: [_jsxs("div", { className: "bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4", children: [_jsx("div", { className: "space-y-2 z-10", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner", children: _jsx(Briefcase, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("h1", { className: "text-2xl font-black text-white tracking-tight", children: ["\u06A9\u0627\u0631\u062A\u0627\u0628\u0644 \u0634\u062E\u0635\u06CC \u0648 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0645\u0646: ", currentUser.name] }), _jsx("span", { className: "px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono", children: currentUser.role })] }), _jsx("p", { className: "text-xs text-teal-200/80 mt-0.5", children: "\u0645\u062D\u0644 \u0645\u062A\u0645\u0631\u06A9\u0632 \u062B\u0628\u062A \u0648 \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u06A9\u0644\u06CC\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u067E\u0631\u0633\u0646\u0644\u06CC (\u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633\u060C \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628\u060C \u06A9\u0627\u0644\u0627 \u0648 \u062A\u062F\u0627\u0631\u06A9\u0627\u062A) \u0648 \u0634\u06CC\u0641\u062A\u200C\u0647\u0627" })] })] }) }), _jsxs("div", { className: "flex items-center gap-2 z-10 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs", children: [_jsx(Building2, { className: "w-4 h-4 text-teal-400" }), _jsxs("span", { className: "text-slate-300", children: ["\u0634\u0639\u0628\u0647: ", _jsx("strong", { className: "text-white", children: settings.clinicName })] })] })] }), successMessage && (_jsxs("div", { className: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center gap-3 shadow-lg animate-fade-in", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-emerald-400 shrink-0" }), _jsx("span", { className: "font-bold text-xs", children: successMessage })] })), _jsxs("div", { className: "flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar", children: [_jsxs("button", { onClick: () => setActiveTab('my_requests'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'my_requests'
                            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(FileText, { className: "w-4 h-4" }), "\u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u0648 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628 \u0645\u0646 (", myAttendanceRequests.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab('submit_attendance_request'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'submit_attendance_request'
                            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(Plus, { className: "w-4 h-4" }), "\u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062C\u062F\u06CC\u062F \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633"] }), _jsxs("button", { onClick: () => setActiveTab('my_supply_requests'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'my_supply_requests'
                            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(ShoppingBag, { className: "w-4 h-4" }), "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0644\u0627 \u0648 \u062E\u0631\u06CC\u062F \u0645\u0646 (", mySupplyRequests.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab('submit_supply_request'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'submit_supply_request'
                            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(Plus, { className: "w-4 h-4" }), "\u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0627\u0644\u0627\u06CC \u062C\u062F\u06CC\u062F"] }), _jsxs("button", { onClick: () => setActiveTab('my_shifts'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'my_shifts'
                            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(Calendar, { className: "w-4 h-4" }), "\u0634\u06CC\u0641\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0631\u06CC \u0645\u0646 (", myShifts.length, ")"] }), isManager && (_jsxs("button", { onClick: () => setActiveTab('manager_approval'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'manager_approval'
                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(ShieldCheck, { className: "w-4 h-4" }), "\u06A9\u0627\u0631\u062A\u0627\u0628\u0644 \u062A\u0627\u06CC\u06CC\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A", totalPendingManager > 0 && (_jsx("span", { className: "bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse", children: totalPendingManager }))] })), _jsxs("button", { onClick: () => setActiveTab('bastian_ticket'), className: `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition relative ${activeTab === 'bastian_ticket'
                            ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-900/40'
                            : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'}`, children: [_jsx(Send, { className: "w-4 h-4" }), "\u0627\u0631\u0633\u0627\u0644 \u062A\u06CC\u06A9\u062A \u0628\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0628\u0627\u0633\u062A\u06CC\u0627\u0646"] })] }), activeTab === 'my_requests' && (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("h3", { className: "font-bold text-sm text-white flex items-center gap-2", children: [_jsx(Clock, { className: "w-4 h-4 text-teal-400" }), "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u0648 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F\u0647"] }), _jsxs("button", { onClick: () => setActiveTab('submit_attendance_request'), className: "bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "\u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633"] })] }), myAttendanceRequests.length === 0 ? (_jsx("div", { className: "text-center py-12 text-slate-500 text-xs", children: "\u0647\u0646\u0648\u0632 \u0647\u06CC\u0686 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u06CC\u0627 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628\u06CC \u062B\u0628\u062A \u0646\u06A9\u0631\u062F\u0647\u200C\u0627\u06CC\u062F." })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-950 text-slate-400 border-b border-slate-800", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u062A\u0627\u0631\u06CC\u062E \u062F\u0631\u062E\u0648\u0627\u0633\u062A" }), _jsx("th", { className: "p-3", children: "\u0646\u0648\u0639 \u062F\u0631\u062E\u0648\u0627\u0633\u062A" }), _jsx("th", { className: "p-3", children: "\u0633\u0627\u0639\u0627\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC" }), _jsx("th", { className: "p-3", children: "\u062F\u0644\u06CC\u0644 \u0648 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A" }), _jsx("th", { className: "p-3", children: "\u0648\u0636\u0639\u06CC\u062A \u0628\u0631\u0631\u0633\u06CC" }), _jsx("th", { className: "p-3", children: "\u067E\u0627\u0633\u062E \u0645\u062F\u06CC\u0631" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800/60", children: myAttendanceRequests.map((req) => (_jsxs("tr", { className: "hover:bg-slate-800/40 transition", children: [_jsx("td", { className: "p-3 font-mono font-bold text-slate-200", children: toPersianDigits(req.jalaliDate) }), _jsx("td", { className: "p-3 font-medium text-teal-300", children: req.requestType === 'forgot_clock_in'
                                                    ? 'فراموشی ساعت ورود'
                                                    : req.requestType === 'forgot_clock_out'
                                                        ? 'فراموشی ساعت خروج'
                                                        : req.requestType === 'clock_in_out'
                                                            ? 'تایم‌میکس کامل'
                                                            : 'مرخصی / ماموریت' }), _jsxs("td", { className: "p-3 font-mono text-slate-300", children: ["\u0648\u0631\u0648\u062F: ", toPersianDigits(req.requestedClockIn), " | \u062E\u0631\u0648\u062C: ", toPersianDigits(req.requestedClockOut)] }), _jsx("td", { className: "p-3 text-slate-300 max-w-xs truncate", title: req.reason, children: req.reason }), _jsxs("td", { className: "p-3", children: [req.status === 'pending' && (_jsx("span", { className: "px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold", children: "\u23F3 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0627\u06CC\u06CC\u062F" })), req.status === 'approved' && (_jsx("span", { className: "px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold", children: "\u2705 \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F\u0647" })), req.status === 'rejected' && (_jsx("span", { className: "px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold", children: "\u274C \u0631\u062F \u0634\u062F\u0647" }))] }), _jsx("td", { className: "p-3 text-slate-400 text-[11px]", children: req.reviewedByUserName ? (_jsxs("span", { children: ["\u0628\u0631\u0631\u0633\u06CC \u062A\u0648\u0633\u0637 ", _jsx("strong", { className: "text-white", children: req.reviewedByUserName }), req.rejectionReason && _jsxs("span", { className: "text-rose-400 block", children: ["\u0639\u0644\u062A: ", req.rejectionReason] })] })) : (_jsx("span", { className: "text-slate-500", children: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0646\u062A\u0638\u0627\u0631" })) })] }, req.id))) })] }) }))] })), activeTab === 'submit_attendance_request' && (_jsxs("div", { className: "max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6", children: [_jsxs("div", { className: "border-b border-slate-800 pb-4", children: [_jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [_jsx(Plus, { className: "w-5 h-5 text-teal-400" }), "\u0641\u0631\u0645 \u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u0648 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "\u062C\u0647\u062A \u0627\u0635\u0644\u0627\u062D \u0633\u0627\u0639\u062A \u0648\u0631\u0648\u062F/\u062E\u0631\u0648\u062C \u06CC\u0627 \u0641\u0631\u0627\u0645\u0648\u0634\u06CC \u062F\u0633\u062A\u06AF\u0627\u0647 \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A\u060C \u0641\u0631\u0645 \u0632\u06CC\u0631 \u0631\u0627 \u062A\u06A9\u0645\u06CC\u0644 \u06A9\u0646\u06CC\u062F \u062A\u0627 \u0628\u0647 \u06A9\u0627\u0631\u062A\u0627\u0628\u0644 \u0645\u062F\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u06AF\u0631\u062F\u062F." })] }), _jsxs("form", { onSubmit: handleSubmitAttendanceRequest, className: "space-y-4 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u0646\u0648\u0639 \u062F\u0631\u062E\u0648\u0627\u0633\u062A" }), _jsxs("select", { value: requestType, onChange: (e) => setRequestType(e.target.value), className: "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 font-bold focus:outline-none focus:border-teal-500", children: [_jsx("option", { value: "forgot_clock_in", children: "\u0641\u0631\u0627\u0645\u0648\u0634\u06CC \u062B\u0628\u062A \u0633\u0627\u0639\u062A \u0648\u0631\u0648\u062F" }), _jsx("option", { value: "forgot_clock_out", children: "\u0641\u0631\u0627\u0645\u0648\u0634\u06CC \u062B\u0628\u062A \u0633\u0627\u0639\u062A \u062E\u0631\u0648\u062C" }), _jsx("option", { value: "clock_in_out", children: "\u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u06A9\u0627\u0645\u0644 \u0634\u06CC\u0641\u062A" }), _jsx("option", { value: "full_day", children: "\u0645\u0631\u062E\u0635\u06CC / \u0645\u0627\u0645\u0648\u0631\u06CC\u062A \u0631\u0648\u0632\u0627\u0646\u0647" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u062A\u0627\u0631\u06CC\u062E (\u0634\u0645\u0633\u06CC)" }), _jsx("input", { type: "text", value: jalaliDate, onChange: (e) => setJalaliDate(e.target.value), placeholder: "1405/05/10", className: "w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-100 font-mono text-center font-bold", required: true })] }), requestType !== 'forgot_clock_out' && (_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u0633\u0627\u0639\u062A \u0648\u0631\u0648\u062F" }), _jsx("input", { type: "text", value: requestedClockIn, onChange: (e) => setRequestedClockIn(e.target.value), placeholder: "08:00", className: "w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-teal-300 font-mono text-center font-bold" })] })), requestType !== 'forgot_clock_in' && (_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u0633\u0627\u0639\u062A \u062E\u0631\u0648\u062C" }), _jsx("input", { type: "text", value: requestedClockOut, onChange: (e) => setRequestedClockOut(e.target.value), placeholder: "16:00", className: "w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-emerald-300 font-mono text-center font-bold" })] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u0639\u0644\u062A \u0648 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC (\u0627\u0644\u0632\u0627\u0645\u06CC)" }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), rows: 4, placeholder: "\u0645\u062B\u0644\u0627\u064B: \u0642\u0637\u0639 \u0628\u0631\u0642 \u062F\u0633\u062A\u06AF\u0627\u0647 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628 / \u0645\u0627\u0646\u062F\u0646 \u062F\u0631 \u0627\u062A\u0627\u0642 \u0639\u0645\u0644 \u062A\u0627 \u062F\u06CC\u0631\u0648\u0642\u062A...", className: "w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500", required: true })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('my_requests'), className: "px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-black shadow-lg transition flex items-center gap-2", children: [_jsx(Send, { className: "w-4 h-4" }), "\u0627\u0631\u0633\u0627\u0644 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633"] })] })] })] })), activeTab === 'my_supply_requests' && (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [_jsxs("h3", { className: "font-bold text-sm text-white flex items-center gap-2", children: [_jsx(ShoppingBag, { className: "w-4 h-4 text-teal-400" }), "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0644\u0627 \u0648 \u062E\u0631\u06CC\u062F \u0627\u0631\u0633\u0627\u0644 \u0634\u062F\u0647"] }), _jsxs("button", { onClick: () => setActiveTab('submit_supply_request'), className: "bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "\u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0627\u0644\u0627\u06CC \u062C\u062F\u06CC\u062F"] })] }), mySupplyRequests.length === 0 ? (_jsx("div", { className: "text-center py-12 text-slate-500 text-xs", children: "\u0647\u0646\u0648\u0632 \u0647\u06CC\u0686 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0627\u0644\u0627\u06CC\u06CC \u062B\u0628\u062A \u0646\u06A9\u0631\u062F\u0647\u200C\u0627\u06CC\u062F." })) : (_jsx("div", { className: "space-y-4", children: mySupplyRequests.map((req) => {
                            const statusCfg = SUPPLY_STATUS_CONFIG[req.status] || { label: req.status, badgeClass: 'bg-slate-800 text-slate-300' };
                            return (_jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-bold text-teal-300 font-mono text-xs", children: req.requestNumber }), _jsxs("span", { className: "text-xs text-slate-300", children: ["\u0628\u062E\u0634: ", _jsx("strong", { className: "text-white", children: req.department })] }), _jsxs("span", { className: "font-mono text-xs text-slate-400", children: ["(", toPersianDigits(req.jalaliDate), ")"] })] }), _jsx("span", { className: `px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusCfg.badgeClass}`, children: statusCfg.label })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-900 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-2", children: "\u06A9\u062F \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-2", children: "\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC" }), _jsx("th", { className: "p-2", children: "\u062A\u0639\u062F\u0627\u062F \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F\u0647" }), _jsx("th", { className: "p-2", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-900", children: req.items.map((it, idx) => (_jsxs("tr", { className: "hover:bg-slate-900/50", children: [_jsx("td", { className: "p-2 text-white font-medium", children: it.productName }), _jsx("td", { className: "p-2 font-mono text-slate-400", children: it.code || '-' }), _jsxs("td", { className: "p-2 font-mono text-teal-300 font-bold", children: [toPersianDigits(it.requestedQty), " ", it.unit] }), _jsxs("td", { className: "p-2 font-mono text-emerald-400 font-bold", children: [toPersianDigits(it.approvedQty || 0), " ", it.unit] }), _jsx("td", { className: "p-2 text-slate-400", children: it.notes || '-' })] }, idx))) })] }) }), req.approvedByUserName && (_jsxs("div", { className: "text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex items-center justify-between", children: [_jsxs("span", { children: ["\u0628\u0631\u0631\u0633\u06CC\u200C\u06A9\u0646\u0646\u062F\u0647: ", _jsx("strong", { className: "text-white", children: req.approvedByUserName })] }), req.adminNotes && _jsx("span", { className: "text-amber-300", children: req.adminNotes })] }))] }, req.id));
                        }) }))] })), activeTab === 'submit_supply_request' && (_jsxs("div", { className: "max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6", children: [_jsxs("div", { className: "border-b border-slate-800 pb-4", children: [_jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [_jsx(ShoppingBag, { className: "w-5 h-5 text-teal-400" }), "\u0641\u0631\u0645 \u062B\u0628\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0627\u0644\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645\u06CC \u0648 \u062E\u0631\u06CC\u062F (\u062A\u062F\u0627\u0631\u06A9\u0627\u062A)"] }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "\u06A9\u0627\u0644\u0627\u0647\u0627\u06CC \u0645\u0648\u0631\u062F \u0646\u06CC\u0627\u0632 \u0628\u062E\u0634 \u062E\u0648\u062F \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0631\u062F\u0647 \u0648 \u0644\u06CC\u0633\u062A \u0631\u0627 \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A \u0648 \u0648\u0627\u062D\u062F \u062E\u0631\u06CC\u062F \u0627\u0631\u0633\u0627\u0644 \u0646\u0645\u0627\u06CC\u06CC\u062F." })] }), _jsxs("form", { onSubmit: handleSubmitSupplyRequest, className: "space-y-5 text-xs", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u0628\u062E\u0634 / \u0648\u0627\u062D\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u06A9\u0646\u0646\u062F\u0647" }), _jsx("input", { type: "text", value: supplyDepartment, onChange: (e) => setSupplyDepartment(e.target.value), className: "w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-medium mb-1.5", children: "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A" }), _jsx("input", { type: "text", value: getJalaliDateString(), disabled: true, className: "w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-400 font-mono text-center font-bold" })] })] }), _jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3", children: [_jsx("h4", { className: "font-bold text-slate-200", children: "\u0627\u0641\u0632\u0648\u062F\u0646 \u06A9\u0627\u0644\u0627 \u0628\u0647 \u0644\u06CC\u0633\u062A \u062F\u0631\u062E\u0648\u0627\u0633\u062A" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3 items-end", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-slate-400 mb-1 text-[11px]", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0644\u0627" }), _jsxs("select", { value: selectedProductId, onChange: (e) => setSelectedProductId(e.target.value), className: "w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium", children: [_jsx("option", { value: "", children: "-- \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0627\u0644\u0627 \u0627\u0632 \u0627\u0646\u0628\u0627\u0631 \u06A9\u0644\u06CC\u0646\u06CC\u06A9 --" }), products.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " (\u0645\u0648\u062C\u0648\u062F\u06CC: ", p.stock, ")"] }, p.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1 text-[11px]", children: "\u062A\u0639\u062F\u0627\u062F" }), _jsx("input", { type: "number", min: "1", value: inputQty, onChange: (e) => setInputQty(Number(e.target.value)), className: "w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-center" })] }), _jsx("div", { children: _jsxs("button", { type: "button", onClick: handleAddItemToSupplyDraft, className: "w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold p-2.5 rounded-xl transition flex items-center justify-center gap-1", children: [_jsx(Plus, { className: "w-4 h-4" }), "\u0627\u0641\u0632\u0648\u062F\u0646"] }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-400 mb-1 text-[11px]", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062C\u0632\u0626\u06CC \u06A9\u0627\u0644\u0627 (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)" }), _jsx("input", { type: "text", value: itemNotes, onChange: (e) => setItemNotes(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B \u0628\u0631\u0646\u062F \u062E\u0627\u0635\u060C \u0633\u0627\u06CC\u0632 \u06CC\u0627 \u0648\u06CC\u0698\u06AF\u06CC \u0645\u0648\u0631\u062F \u0646\u06CC\u0627\u0632...", className: "w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white" })] })] }), supplyRequestItems.length > 0 && (_jsx("div", { className: "overflow-x-auto border border-slate-800 rounded-xl", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-950 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2.5", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-2.5", children: "\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC" }), _jsx("th", { className: "p-2.5", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A" }), _jsx("th", { className: "p-2.5 text-center", children: "\u062D\u0630\u0641" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-800", children: supplyRequestItems.map((item, idx) => {
                                                const prod = products.find((p) => p.id === item.productId);
                                                return (_jsxs("tr", { className: "hover:bg-slate-950", children: [_jsx("td", { className: "p-2.5 text-white font-medium", children: prod?.name || 'کالای نامشخص' }), _jsx("td", { className: "p-2.5 font-mono text-teal-300 font-bold", children: toPersianDigits(item.requestedQty) }), _jsx("td", { className: "p-2.5 text-slate-400", children: item.notes || '-' }), _jsx("td", { className: "p-2.5 text-center", children: _jsx("button", { type: "button", onClick: () => handleRemoveSupplyItemDraft(idx), className: "text-rose-400 hover:text-rose-300 p-1", children: _jsx(Trash2, { className: "w-4 h-4" }) }) })] }, idx));
                                            }) })] }) })), _jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('my_supply_requests'), className: "px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold transition", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-black shadow-lg transition flex items-center gap-2", children: [_jsx(Send, { className: "w-4 h-4" }), "\u0627\u0631\u0633\u0627\u0644 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062E\u0631\u06CC\u062F \u06A9\u0627\u0644\u0627 \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A"] })] })] })] })), activeTab === 'my_shifts' && (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl", children: [_jsxs("h3", { className: "font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3", children: [_jsx(Calendar, { className: "w-4 h-4 text-teal-400" }), "\u0628\u0631\u0646\u0627\u0645\u0647 \u0634\u06CC\u0641\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0631\u06CC \u0634\u0645\u0627 \u062F\u0631 \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647"] }), myShifts.length === 0 ? (_jsx("div", { className: "text-center py-12 text-slate-500 text-xs", children: "\u0647\u06CC\u0686 \u0634\u06CC\u0641\u062A \u06A9\u0627\u0631\u06CC \u0641\u0639\u0627\u0644\u06CC \u0628\u0631\u0627\u06CC \u0634\u0645\u0627 \u062F\u0631 \u062A\u0642\u0648\u06CC\u0645 \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: myShifts.map((shift) => (_jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-bold text-teal-300 text-xs", children: shift.shiftTitle }), _jsx("span", { className: "font-mono text-emerald-400 text-xs", children: toPersianDigits(shift.jalaliDate) })] }), _jsxs("div", { className: "flex justify-between text-xs text-slate-400", children: [_jsx("span", { children: "\u0633\u0627\u0639\u062A \u06A9\u0627\u0631\u06CC:" }), _jsxs("span", { className: "font-mono text-white", children: [toPersianDigits(shift.startTime), " \u0627\u0644\u06CC ", toPersianDigits(shift.endTime)] })] }), shift.notes && _jsx("p", { className: "text-[11px] text-slate-400 pt-1 border-t border-slate-900", children: shift.notes })] }, shift.id))) }))] })), isManager && activeTab === 'manager_approval' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl", children: [_jsxs("h3", { className: "font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3", children: [_jsx(Clock, { className: "w-4 h-4 text-amber-400" }), "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u0648 \u062D\u0636\u0648\u0631 \u0648 \u063A\u06CC\u0627\u0628 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0627\u06CC\u06CC\u062F (", pendingAttendanceManager.length, ")"] }), pendingAttendanceManager.length === 0 ? (_jsx("div", { className: "text-center py-6 text-slate-500 text-xs", children: "\u0647\u06CC\u0686 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u0627\u06CC\u0645\u200C\u0645\u06CC\u06A9\u0633 \u0645\u0639\u0644\u0642\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F." })) : (_jsx("div", { className: "space-y-3", children: pendingAttendanceManager.map((req) => (_jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-bold text-white text-sm", children: req.userName }), _jsx("span", { className: "px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-[10px]", children: req.userRole }), _jsxs("span", { className: "font-mono text-xs text-slate-400", children: ["(", toPersianDigits(req.jalaliDate), ")"] })] }), _jsxs("p", { className: "text-xs text-slate-300", children: ["\u0646\u0648\u0639: ", _jsx("strong", { className: "text-teal-300", children: req.requestType }), " | \u0633\u0627\u0639\u0627\u062A: ", _jsxs("span", { className: "font-mono text-emerald-400", children: [toPersianDigits(req.requestedClockIn), " \u0627\u0644\u06CC ", toPersianDigits(req.requestedClockOut)] })] }), _jsxs("p", { className: "text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800", children: ["\uD83D\uDCAC ", req.reason] })] }), _jsx("div", { className: "flex items-center gap-2 shrink-0", children: selectedRequestIdForAction === req.id ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", placeholder: "\u0639\u0644\u062A \u0631\u062F...", value: rejectionNotes[req.id] || '', onChange: (e) => setRejectionNotes({ ...rejectionNotes, [req.id]: e.target.value }), className: "bg-slate-900 border border-rose-500 text-xs rounded-xl px-3 py-1.5 text-white" }), _jsx("button", { onClick: () => handleRejectAttendance(req.id), className: "bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs", children: "\u062A\u0627\u06CC\u06CC\u062F \u0631\u062F" }), _jsx("button", { onClick: () => setSelectedRequestIdForAction(null), className: "bg-slate-800 text-slate-300 px-2 py-1.5 rounded-xl text-xs", children: "\u0627\u0646\u0635\u0631\u0627\u0641" })] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleApproveAttendance(req.id), className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition hover:scale-105", children: [_jsx(Check, { className: "w-4 h-4" }), "\u062A\u0627\u06CC\u06CC\u062F"] }), _jsxs("button", { onClick: () => setSelectedRequestIdForAction(req.id), className: "bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition", children: [_jsx(X, { className: "w-4 h-4" }), "\u0631\u062F"] })] })) })] }, req.id))) }))] }), _jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl", children: [_jsxs("h3", { className: "font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3", children: [_jsx(ShoppingBag, { className: "w-4 h-4 text-teal-400" }), "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u06A9\u0627\u0644\u0627 \u0648 \u062E\u0631\u06CC\u062F \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u062A\u0627\u06CC\u06CC\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A (", pendingSupplyManager.length, ")"] }), pendingSupplyManager.length === 0 ? (_jsx("div", { className: "text-center py-6 text-slate-500 text-xs", children: "\u0647\u06CC\u0686 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0627\u0644\u0627\u06CC \u0645\u0639\u0644\u0642\u06CC \u0628\u0631\u0627\u06CC \u062A\u0627\u06CC\u06CC\u062F \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F." })) : (_jsx("div", { className: "space-y-4", children: pendingSupplyManager.map((req) => (_jsxs("div", { className: "bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-bold text-teal-300 font-mono text-xs", children: req.requestNumber }), _jsxs("span", { className: "text-xs text-white font-bold", children: ["\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u06A9\u0646\u0646\u062F\u0647: ", req.requestedByUserName] }), _jsxs("span", { className: "text-xs text-slate-400", children: ["\u0628\u062E\u0634: ", req.department] }), _jsxs("span", { className: "font-mono text-xs text-slate-400", children: ["(", toPersianDigits(req.jalaliDate), ")"] })] }), _jsx("span", { className: "px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold", children: "\u23F3 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0631\u0631\u0633\u06CC \u0645\u062F\u06CC\u0631\u06CC\u062A" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-right text-xs", children: [_jsx("thead", { className: "bg-slate-900 text-slate-400", children: _jsxs("tr", { children: [_jsx("th", { className: "p-2", children: "\u0646\u0627\u0645 \u06A9\u0627\u0644\u0627" }), _jsx("th", { className: "p-2", children: "\u062A\u0639\u062F\u0627\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC" }), _jsx("th", { className: "p-2", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-900", children: req.items.map((it, idx) => (_jsxs("tr", { className: "hover:bg-slate-900/50", children: [_jsx("td", { className: "p-2 text-white font-medium", children: it.productName }), _jsxs("td", { className: "p-2 font-mono text-teal-300 font-bold", children: [toPersianDigits(it.requestedQty), " ", it.unit] }), _jsx("td", { className: "p-2 text-slate-400", children: it.notes || '-' })] }, idx))) })] }) }), _jsx("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-900", children: selectedSupplyIdForAction === req.id ? (_jsxs("div", { className: "flex items-center gap-2 w-full sm:w-auto", children: [_jsx("input", { type: "text", placeholder: "\u0639\u0644\u062A \u0631\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u06A9\u0627\u0644\u0627...", value: supplyRejectionNotes[req.id] || '', onChange: (e) => setSupplyRejectionNotes({ ...supplyRejectionNotes, [req.id]: e.target.value }), className: "bg-slate-900 border border-rose-500 text-xs rounded-xl px-3 py-1.5 text-white flex-1" }), _jsx("button", { onClick: () => handleRejectSupply(req), className: "bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs", children: "\u062A\u0627\u06CC\u06CC\u062F \u0631\u062F" }), _jsx("button", { onClick: () => setSelectedSupplyIdForAction(null), className: "bg-slate-800 text-slate-300 px-2 py-1.5 rounded-xl text-xs", children: "\u0627\u0646\u0635\u0631\u0627\u0641" })] })) : (_jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [_jsxs("button", { onClick: () => handleApproveSupply(req), className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition hover:scale-105", children: [_jsx(Check, { className: "w-4 h-4" }), "\u062A\u0627\u06CC\u06CC\u062F \u0648 \u0627\u0631\u062C\u0627\u0639 \u0628\u0647 \u0648\u0627\u062D\u062F \u062E\u0631\u06CC\u062F"] }), _jsxs("button", { onClick: () => setSelectedSupplyIdForAction(req.id), className: "bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition", children: [_jsx(X, { className: "w-4 h-4" }), "\u0631\u062F \u062F\u0631\u062E\u0648\u0627\u0633\u062A"] })] })) })] }, req.id))) }))] })] })), activeTab === 'bastian_ticket' && (_jsxs("div", { className: "bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl", children: [_jsxs("div", { className: "flex items-center gap-3 border-b border-slate-800 pb-4", children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300", children: _jsx(Send, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-extrabold text-white text-base", children: "\u0627\u0631\u0633\u0627\u0644 \u062A\u06CC\u06A9\u062A \u0645\u0633\u062A\u0642\u06CC\u0645 \u0628\u0647 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC \u0645\u0631\u06A9\u0632\u06CC \u0634\u0631\u06A9\u062A \u0628\u0627\u0633\u062A\u06CC\u0627\u0646" }), _jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "\u062A\u06CC\u06A9\u062A\u200C\u0647\u0627\u06CC \u0634\u0645\u0627 \u0645\u0633\u062A\u0642\u06CC\u0645\u0627\u064B \u062A\u0648\u0633\u0637 \u06A9\u0627\u0631\u0634\u0646\u0627\u0633\u0627\u0646 \u0634\u0631\u06A9\u062A \u0628\u0627\u0633\u062A\u06CC\u0627\u0646 \u0628\u0631\u0631\u0633\u06CC \u0648 \u067E\u0627\u0633\u062E \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F." })] })] }), _jsxs("form", { onSubmit: handleSendBastianTicket, className: "space-y-4 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-semibold mb-1", children: "\u0645\u0648\u0636\u0648\u0639 \u062A\u06CC\u06A9\u062A \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC:" }), _jsx("input", { type: "text", required: true, placeholder: "\u0645\u062B\u0627\u0644: \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0631\u0627\u0647\u0646\u0645\u0627\u06CC\u06CC \u062F\u0631 \u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC \u0633\u0627\u0645\u0627\u0646\u0647 \u0628\u06CC\u0645\u0647 \u06CC\u0627 \u0633\u0648\u0627\u0644 \u0641\u0646\u06CC...", value: bastianTicketSubject, onChange: (e) => setBastianTicketSubject(e.target.value), className: "w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-slate-300 font-semibold mb-1", children: "\u0645\u062A\u0646 \u06A9\u0627\u0645\u0644 \u062A\u06CC\u06A9\u062A:" }), _jsx("textarea", { rows: 5, required: true, placeholder: "\u0634\u0631\u062D \u06A9\u0627\u0645\u0644 \u0645\u0633\u0626\u0644\u0647 \u06CC\u0627 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062E\u0648\u062F \u0631\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F...", value: bastianTicketMessage, onChange: (e) => setBastianTicketMessage(e.target.value), className: "w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed" })] }), _jsxs("div", { className: "flex items-center justify-between pt-2", children: [_jsxs("span", { className: "text-[11px] text-slate-400", children: ["\u0645\u0631\u06A9\u0632: ", _jsx("strong", { className: "text-teal-300", children: settings.clinicName }), " | \u0641\u0631\u0633\u062A\u0646\u062F\u0647: ", _jsx("strong", { className: "text-teal-300", children: currentUser.name })] }), _jsxs("button", { type: "submit", disabled: isSubmittingTicket, className: "bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2", children: [_jsx(Send, { className: "w-4 h-4" }), _jsx("span", { children: isSubmittingTicket ? 'در حال ارسال تیکت...' : 'ارسال تیکت به باستیان' })] })] })] })] }))] }));
};
