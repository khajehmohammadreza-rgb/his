import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Calendar, Plus, CheckCircle2, Send, Layers, RefreshCw, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';
import { PersianDatePicker } from './PersianDatePicker.js?b=r24-514-1405';
export const AppointmentsPlans = ({ treatmentPlans = [], appointments = [], patients = [], doctors = [], settings, onAddAppointment, onUpdateAppointment, onAddTreatmentPlan, onUpdateTreatmentPlan, onOpenPatientProfile, }) => {
    const [activeTab, setActiveTab] = useState('appointments');
    // Appointment Form Modal
    const [showAppModal, setShowAppModal] = useState(false);
    const [appPatientName, setAppPatientName] = useState('');
    const [appMobile, setAppMobile] = useState('');
    const [appDoctorId, setAppDoctorId] = useState(doctors[0]?.id || '');
    const [appJalaliDate, setAppJalaliDate] = useState(getJalaliDateString());
    const [appTimeSlot, setAppTimeSlot] = useState('۱۰:۳۰');
    const [appNotes, setAppNotes] = useState('');
    const [sendInstantSms, setSendInstantSms] = useState(true);
    const [isSendingSmsId, setIsSendingSmsId] = useState(null);
    // Treatment Plan Form Modal
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [planPatientId, setPlanPatientId] = useState(patients[0]?.id || '');
    const [planServiceTitle, setPlanServiceTitle] = useState('دوره درمان ۵ جلسه‌ای وکیوم پانسمان زخم');
    const [planSessionsCount, setPlanSessionsCount] = useState(5);
    const [planSessionCost, setPlanSessionCost] = useState(850000);
    // Submit Treatment Plan
    const handleCreatePlan = (e) => {
        e.preventDefault();
        const patient = patients.find(p => p.id === planPatientId);
        if (!patient) {
            alert('لطفاً یک بیمار معتبر انتخاب کنید.');
            return;
        }
        const totalSess = Number(planSessionsCount) || 3;
        const sessCost = Number(planSessionCost) || 500000;
        const sessions = Array.from({ length: totalSess }, (_, i) => ({
            sessionNumber: i + 1,
            jalaliDate: getJalaliDateString(),
            status: 'scheduled',
            cost: sessCost,
            paid: false,
        }));
        const newPlan = {
            id: 'plan-' + Date.now(),
            patientId: patient.id,
            patientName: patient.fullName,
            patientCode: patient.fileNumber,
            serviceTitle: planServiceTitle,
            totalSessions: totalSess,
            completedSessions: 0,
            status: 'active',
            sessions,
            createdAt: getJalaliDateString(),
        };
        onAddTreatmentPlan(newPlan);
        setShowPlanModal(false);
        alert(`طرح درمان چندجلسه‌ای برای بیمار ${patient.fullName} با موفقیت ثبت گردید.`);
    };
    // Submit Appointment
    const handleCreateAppointment = async (e) => {
        e.preventDefault();
        if (!appPatientName || !appMobile) {
            alert('لطفاً نام بیمار و شماره همراه را وارد کنید.');
            return;
        }
        const doc = doctors.find((d) => d.id === appDoctorId) || doctors[0];
        const newApp = {
            id: 'app-' + Date.now(),
            patientName: appPatientName,
            mobilePhone: appMobile,
            type: 'clinic_visit',
            doctorId: doc?.id,
            doctorName: doc?.name,
            date: new Date().toISOString().split('T')[0],
            jalaliDate: appJalaliDate,
            timeSlot: appTimeSlot,
            status: 'scheduled',
            notes: appNotes,
            smsReminderSent: false,
        };
        let smsSentSuccess = false;
        // Send Instant SMS if toggled (using Kavenegar pattern HISAPPOINT first)
        if (sendInstantSms) {
            try {
                const pToken = appPatientName.trim().replace(/\s+/g, '-');
                const dToken = (doc?.name || 'پزشک-معالج').trim().replace(/\s+/g, '-');
                const dateToken = (appJalaliDate || '').trim().replace(/\s+/g, '-');
                const timeToken = (appTimeSlot || '').trim().replace(/\s+/g, '-');
                let res = await fetch('/api/sms/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile: appMobile,
                        template: 'HISAPPOINT',
                        token: pToken,
                        token2: dToken,
                        token3: dateToken,
                        token4: timeToken,
                        token5: newApp.id,
                    }),
                });
                let smsResData = await res.json();
                if (!smsResData.success) {
                    const smsMsg = `بیمار گرامی ${appPatientName}، نوبت شما در ${settings.clinicName || 'مرکز درمانی'} برای تاریخ ${appJalaliDate} ساعت ${appTimeSlot} نزد ${doc?.name || 'پزشک معالج'} ثبت گردید.`;
                    res = await fetch('/api/sms/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mobile: appMobile,
                            message: smsMsg,
                            sender: settings.smsSenderLine || undefined,
                        }),
                    });
                    smsResData = await res.json();
                }
                if (smsResData.success) {
                    smsSentSuccess = true;
                    newApp.smsReminderSent = true;
                }
            }
            catch (err) {
                console.error('Instant SMS Error:', err);
            }
        }
        onAddAppointment(newApp);
        setShowAppModal(false);
        let alertMsg = `نوبت بیمار ${appPatientName} برای تاریخ ${appJalaliDate} ساعت ${appTimeSlot} با موفقیت ثبت گردید.`;
        if (sendInstantSms) {
            if (smsSentSuccess) {
                alertMsg += '\n\n✅ پیامک آنی نوبت نیز از طریق پنل کاوه‌نگار برای بیمار ارسال گردید.';
            }
            else {
                alertMsg += '\n\n⚠️ نوبت ثبت شد اما ارسال پیامک آنی با خطا مواجه گردید (لطفاً شارژ یا شماره را بررسی کنید).';
            }
        }
        alert(alertMsg);
    };
    // Trigger Instant SMS Delivery (using pattern HISREMINDER)
    const handleSendSmsReminder = async (app) => {
        setIsSendingSmsId(app.id);
        try {
            const pToken = app.patientName.trim().replace(/\s+/g, '-');
            const dToken = (app.doctorName || 'پزشک-معالج').trim().replace(/\s+/g, '-');
            const dateToken = (app.jalaliDate || '').trim().replace(/\s+/g, '-');
            const timeToken = (app.timeSlot || '').trim().replace(/\s+/g, '-');
            let res = await fetch('/api/sms/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: app.mobilePhone,
                    template: 'HISREMINDER',
                    token: pToken,
                    token2: dToken,
                    token3: dateToken,
                    token4: timeToken,
                }),
            });
            let data = await res.json();
            if (!data.success) {
                const smsMsg = `بیمار گرامی ${app.patientName}، یادآوری: نوبت شما در ${settings.clinicName || 'مرکز درمانی'} برای تاریخ ${app.jalaliDate} ساعت ${app.timeSlot} نزد ${app.doctorName || 'پزشک معالج'} می‌باشد.`;
                res = await fetch('/api/sms/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile: app.mobilePhone,
                        message: smsMsg,
                        sender: settings.smsSenderLine || undefined,
                    }),
                });
                data = await res.json();
            }
            if (data.success) {
                const updated = { ...app, smsReminderSent: true };
                onUpdateAppointment(updated);
                alert(`✅ پیامک یادآوری آنی با خط کاوه‌نگار برای بیمار ${app.patientName} به شماره ${app.mobilePhone} ارسال شد.`);
            }
            else {
                alert(`❌ خطا در ارسال پیامک: ${data.message || 'خطا در ارتباط با وب‌سرویس کاوه‌نگار'}`);
            }
        }
        catch (err) {
            alert(`❌ خطا در ارسال پیامک: ${err.message}`);
        }
        finally {
            setIsSendingSmsId(null);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-3 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl", children: _jsx(Calendar, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-800", children: "\u0646\u0648\u0628\u062A\u200C\u062F\u0647\u06CC \u0648 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0637\u0631\u062D \u062F\u0631\u0645\u0627\u0646\u200C\u0647\u0627\u06CC \u0686\u0646\u062F\u062C\u0644\u0633\u0647\u200C\u0627\u06CC" }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "\u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u062A\u0642\u0648\u06CC\u0645\u06CC\u060C \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u067E\u06CC\u0627\u0645\u06A9\u06CC\u060C \u0648 \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u062C\u0644\u0633\u0627\u062A \u0686\u0646\u062F\u0645\u0631\u062D\u0644\u0647\u200C\u0627\u06CC (PRP\u060C \u0648\u06A9\u06CC\u0648\u0645 \u062A\u0631\u0627\u067E\u06CC\u060C \u0644\u06CC\u0632\u0631)" })] })] }), _jsx("div", { className: "flex items-center gap-2", children: activeTab === 'appointments' ? (_jsxs("button", { onClick: () => setShowAppModal(true), className: "flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm", children: [_jsx(Plus, { className: "w-4 h-4" }), "\u062B\u0628\u062A \u0646\u0648\u0628\u062A \u062A\u0642\u0648\u06CC\u0645\u06CC \u062C\u062F\u06CC\u062F"] })) : (_jsxs("button", { onClick: () => setShowPlanModal(true), className: "flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm", children: [_jsx(Layers, { className: "w-4 h-4" }), "\u062A\u0639\u0631\u06CC\u0641 \u0637\u0631\u062D \u062F\u0631\u0645\u0627\u0646 \u062C\u062F\u06CC\u062F"] })) })] }), _jsxs("div", { className: "flex border-b border-slate-200 text-xs font-bold", children: [_jsxs("button", { onClick: () => setActiveTab('appointments'), className: `pb-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === 'appointments'
                            ? 'border-teal-600 text-teal-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'}`, children: [_jsx(Calendar, { className: "w-4 h-4" }), "\u0644\u06CC\u0633\u062A \u0646\u0648\u0628\u062A\u200C\u0647\u0627\u06CC \u0631\u0632\u0631\u0648 \u0634\u062F\u0647 (", appointments.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab('plans'), className: `pb-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === 'plans'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'}`, children: [_jsx(Layers, { className: "w-4 h-4" }), "\u0637\u0631\u062D\u200C\u0647\u0627\u06CC \u062F\u0631\u0645\u0627\u0646 \u0686\u0646\u062F\u062C\u0644\u0633\u0647\u200C\u0627\u06CC (", treatmentPlans.length, ")"] })] }), activeTab === 'appointments' ? (_jsx("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4", children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: appointments.map((app) => (_jsxs("div", { className: "p-4 border border-slate-200 hover:border-teal-300 rounded-xl bg-slate-50/60 space-y-3 transition", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-2", children: [_jsx("button", { type: "button", onClick: () => onOpenPatientProfile && onOpenPatientProfile(app.patientId || app.patientName), className: "font-bold text-teal-800 hover:text-teal-900 underline decoration-teal-400 hover:bg-teal-50 px-1.5 py-0.5 rounded transition text-right text-sm", title: "\u0645\u0634\u0627\u0647\u062F\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u06A9\u0627\u0645\u0644\u060C \u067E\u0630\u06CC\u0631\u0634 \u0645\u062C\u062F\u062F \u0648 \u0633\u0648\u0627\u0628\u0642 \u0628\u06CC\u0645\u0627\u0631", children: app.patientName }), _jsxs("span", { className: "text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-medium dir-ltr", children: [app.timeSlot, " - ", app.jalaliDate] })] }), _jsxs("div", { className: "text-xs text-slate-600 space-y-1", children: [_jsxs("div", { children: ["\u067E\u0632\u0634\u06A9: ", app.doctorName || 'پزشک معالج مرکز'] }), _jsxs("div", { children: ["\u062A\u0644\u0641\u0646 \u0647\u0645\u0631\u0627\u0647: ", app.mobilePhone] }), app.notes && _jsxs("div", { className: "text-slate-500 italic", children: ["\u062A\u0648\u0636\u06CC\u062D\u0627\u062A: ", app.notes] })] }), _jsx("div", { className: "pt-2 border-t border-slate-200 flex items-center justify-between text-xs", children: app.smsReminderSent ? (_jsxs("span", { className: "text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200", children: [_jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" }), _jsx("span", { children: "\u067E\u06CC\u0627\u0645\u06A9 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0627\u0631\u0633\u0627\u0644 \u0634\u062F\u0647" })] })) : (_jsx("button", { onClick: () => handleSendSmsReminder(app), disabled: isSendingSmsId === app.id, className: "text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shadow-2xs", title: "\u0627\u0631\u0633\u0627\u0644 \u0622\u0646\u06CC \u067E\u06CC\u0627\u0645\u06A9 \u062A\u0627\u06CC\u06CC\u062F \u0648 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0646\u0648\u0628\u062A \u0628\u0627 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631", children: isSendingSmsId === app.id ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin text-teal-600" }), _jsx("span", { children: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-3.5 h-3.5 text-teal-600" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u0622\u0646\u06CC \u067E\u06CC\u0627\u0645\u06A9 SMS" })] })) })) })] }, app.id))) }) })) : (_jsx("div", { className: "space-y-4", children: treatmentPlans.map((plan) => (_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-base font-bold text-slate-800 flex items-center gap-2", children: [_jsx("span", { children: plan.patientName }), _jsxs("span", { className: "text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal", children: ["\u06A9\u062F \u067E\u0631\u0648\u0646\u062F\u0647: ", plan.patientCode] })] }), _jsx("div", { className: "text-xs text-purple-700 font-semibold mt-1", children: plan.serviceTitle })] }), _jsxs("div", { className: "text-xs bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-lg font-bold", children: ["\u067E\u06CC\u0634\u0631\u0641\u062A: ", plan.completedSessions, " \u0627\u0632 ", plan.totalSessions, " \u062C\u0644\u0633\u0647 \u0627\u0646\u062C\u0627\u0645 \u0634\u062F\u0647"] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-3", children: plan.sessions.map((sess) => (_jsxs("div", { className: `p-3 rounded-xl border text-xs space-y-1.5 transition ${sess.status === 'completed'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'}`, children: [_jsxs("div", { className: "font-bold flex items-center justify-between", children: [_jsxs("span", { children: ["\u062C\u0644\u0633\u0647 ", sess.sessionNumber] }), sess.status === 'completed' && _jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" })] }), _jsx("div", { className: "text-[11px] text-slate-500", children: sess.jalaliDate }), _jsxs("div", { className: "font-bold text-slate-800", children: [(sess.cost ?? 0).toLocaleString('fa-IR'), " \u062A\u0648\u0645\u0627\u0646"] })] }, sess.sessionNumber))) })] }, plan.id))) })), showAppModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-teal-700 text-white p-4 font-bold flex items-center justify-between", children: [_jsx("span", { children: "\u062B\u0628\u062A \u0646\u0648\u0628\u062A \u062A\u0642\u0648\u06CC\u0645\u06CC \u062C\u062F\u06CC\u062F" }), _jsx("button", { onClick: () => setShowAppModal(false), className: "text-teal-100", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleCreateAppointment, className: "p-5 space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] font-bold mb-1 text-xs", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u062B\u0628\u062A\u200C\u0634\u062F\u0647 \u062F\u0631 \u0645\u0631\u06A9\u0632:" }), _jsxs("select", { onChange: (e) => {
                                                const found = patients.find(p => p.id === e.target.value);
                                                if (found) {
                                                    setAppPatientName(found.fullName);
                                                    setAppMobile(found.mobile);
                                                }
                                            }, className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold bg-slate-50 mb-2", children: [_jsx("option", { value: "", children: "-- \u0627\u0646\u062A\u062E\u0627\u0628 \u0628\u06CC\u0645\u0627\u0631 \u062B\u0628\u062A\u200C\u0634\u062F\u0647 \u062F\u0631 \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647 --" }), patients.map(p => (_jsxs("option", { value: p.id, children: [p.fullName, " (\u06A9\u062F \u067E\u0631\u0648\u0646\u062F\u0647: ", p.fileNumber, " - \u0645\u0648\u0628\u0627\u06CC\u0644: ", p.mobile, ")"] }, p.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] dark:text-slate-200 font-bold mb-1 text-xs", children: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC \u0628\u06CC\u0645\u0627\u0631:" }), _jsx("input", { type: "text", value: appPatientName, onChange: (e) => setAppPatientName(e.target.value), className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-teal-500", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] dark:text-slate-200 font-bold mb-1 text-xs", children: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647 (\u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9):" }), _jsx("input", { type: "text", value: appMobile, onChange: (e) => setAppMobile(e.target.value), className: "w-full border border-slate-300 rounded-lg p-2.5 dir-ltr text-right text-slate-900 font-bold focus:ring-2 focus:ring-teal-500", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] dark:text-slate-200 font-bold mb-1 text-xs", children: "\u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C:" }), _jsx("select", { value: appDoctorId, onChange: (e) => setAppDoctorId(e.target.value), className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-teal-500 bg-white", children: doctors.map((d) => (_jsx("option", { value: d.id, children: d.name }, d.id))) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsx(PersianDatePicker, { value: appJalaliDate, onChange: setAppJalaliDate, label: "\u062A\u0627\u0631\u06CC\u062E \u0634\u0645\u0633\u06CC \u0646\u0648\u0628\u062A:" }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] dark:text-slate-200 font-bold mb-1 text-xs", children: "\u0633\u0627\u0639\u062A \u0646\u0648\u0628\u062A:" }), _jsx("input", { type: "text", value: appTimeSlot, onChange: (e) => setAppTimeSlot(e.target.value), className: "w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-teal-500 dir-ltr text-right", placeholder: "\u06F1\u06F0:\u06F3\u06F0" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] dark:text-slate-200 font-bold mb-1 text-xs", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u0639\u0644\u062A \u0645\u0631\u0627\u062C\u0639\u0647:" }), _jsx("input", { type: "text", value: appNotes, onChange: (e) => setAppNotes(e.target.value), className: "w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-teal-500", placeholder: "\u0645\u062B\u0644\u0627: \u0645\u0639\u0627\u06CC\u0646\u0647 \u062B\u0627\u0646\u0648\u06CC\u0647 \u067E\u0627\u0646\u0633\u0645\u0627\u0646 \u0632\u062E\u0645" })] }), _jsxs("div", { className: "bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-3 rounded-xl flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "sendInstantSmsCheck", checked: sendInstantSms, onChange: (e) => setSendInstantSms(e.target.checked), className: "w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer" }), _jsxs("label", { htmlFor: "sendInstantSmsCheck", className: "text-xs font-bold text-teal-900 dark:text-teal-200 cursor-pointer flex items-center gap-1", children: [_jsx(Send, { className: "w-3.5 h-3.5 text-teal-600" }), _jsx("span", { children: "\u0627\u0631\u0633\u0627\u0644 \u0622\u0646\u06CC \u067E\u06CC\u0627\u0645\u06A9 \u062A\u0627\u06CC\u06CC\u062F \u0646\u0648\u0628\u062A \u067E\u0633 \u0627\u0632 \u062B\u0628\u062A" })] })] }), _jsx("span", { className: "text-[10px] text-teal-700 dark:text-teal-400 font-medium", children: "\u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631" })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowAppModal(false), className: "px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center gap-1.5", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u062B\u0628\u062A \u0631\u0632\u0631\u0648 \u0646\u0648\u0628\u062A" })] })] })] })] }) })), showPlanModal && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-purple-700 text-white p-4 font-bold flex items-center justify-between", children: [_jsx("span", { children: "\u062A\u0639\u0631\u06CC\u0641 \u0637\u0631\u062D \u062F\u0631\u0645\u0627\u0646 \u0686\u0646\u062F\u062C\u0644\u0633\u0647\u200C\u0627\u06CC \u062C\u062F\u06CC\u062F" }), _jsx("button", { onClick: () => setShowPlanModal(false), className: "text-purple-100", children: "\u2715" })] }), _jsxs("form", { onSubmit: handleCreatePlan, className: "p-5 space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] font-bold mb-1 text-xs", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0628\u06CC\u0645\u0627\u0631:" }), _jsx("select", { value: planPatientId, onChange: (e) => setPlanPatientId(e.target.value), className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold bg-slate-50", required: true, children: patients.map((p) => (_jsxs("option", { value: p.id, children: [p.fullName, " (\u06A9\u062F \u067E\u0631\u0648\u0646\u062F\u0647: ", p.fileNumber, ")"] }, p.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] font-bold mb-1 text-xs", children: "\u0639\u0646\u0648\u0627\u0646 \u062E\u062F\u0645\u062A / \u0646\u0648\u0639 \u0637\u0631\u062D \u062F\u0631\u0645\u0627\u0646:" }), _jsx("input", { type: "text", value: planServiceTitle, onChange: (e) => setPlanServiceTitle(e.target.value), className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold", required: true, placeholder: "\u0645\u062B\u0644\u0627: \u062F\u0648\u0631\u0647 \u062F\u0631\u0645\u0627\u0646 \u0648\u06A9\u06CC\u0648\u0645 \u067E\u0627\u0646\u0633\u0645\u0627\u0646 \u0632\u062E\u0645 \u0646\u0648\u06CC\u0646" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] font-bold mb-1 text-xs", children: "\u062A\u0639\u062F\u0627\u062F \u06A9\u0644 \u062C\u0644\u0633\u0627\u062A:" }), _jsx("input", { type: "number", min: "1", max: "30", value: planSessionsCount, onChange: (e) => setPlanSessionsCount(Number(e.target.value)), className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold text-center", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[#333333] font-bold mb-1 text-xs", children: "\u0647\u0632\u06CC\u0646\u0647 \u0647\u0631 \u062C\u0644\u0633\u0647 (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", step: "50000", value: planSessionCost, onChange: (e) => setPlanSessionCost(Number(e.target.value)), className: "w-full border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold", required: true })] })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowPlanModal(false), className: "px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center gap-1.5", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "\u062B\u0628\u062A \u0648 \u0627\u06CC\u062C\u0627\u062F \u0637\u0631\u062D \u062F\u0631\u0645\u0627\u0646" })] })] })] })] }) }))] }));
};
