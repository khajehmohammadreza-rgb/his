import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState, useEffect } from '../../client-vendor/react.js?b=r24-514-1405';
import { SalamatInsuranceModal } from './SalamatInsuranceModal.js?b=r24-514-1405';
import { ClinicalBeforeAfterGallery } from './ClinicalBeforeAfterGallery.js?b=r24-514-1405';
import { X, Phone, History, UserPlus, Edit3, Calendar, Stethoscope, FileCheck, AlertCircle, Save, Plus, Trash2, Check, ShieldCheck, Camera } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { toPersianDigits, toEnglishDigits, getJalaliDateTimeString, calculateAgeFromJalali, calculateBirthYearFromAge, } from '../utils/jalali.js?b=r24-514-1405';
export const PatientProfileModal = ({ patient, patients = [], isOpen, onClose, users = [], medicalServices = [], visitQueue = [], appointments = [], treatmentPlans = [], signedConsents = [], salesInvoices = [], onUpdatePatient, onAddQueueItem, currentUser, }) => {
    const [activeTab, setActiveTab] = useState('history');
    // Edit Patient Form State
    const [editFirstName, setEditFirstName] = useState(patient.firstName || '');
    const [editLastName, setEditLastName] = useState(patient.lastName || '');
    const [editNationalId, setEditNationalId] = useState(patient.nationalId || '');
    const [editMobilePhone, setEditMobilePhone] = useState(patient.mobilePhone || '');
    const [editFatherName, setEditFatherName] = useState(patient.fatherName || '');
    const [editBirthDate, setEditBirthDate] = useState(patient.birthDate || '');
    const [editAge, setEditAge] = useState(patient.age !== undefined
        ? String(patient.age)
        : calculateAgeFromJalali(patient.birthDate) !== undefined
            ? String(calculateAgeFromJalali(patient.birthDate))
            : '');
    const [editIsApproximateAge, setEditIsApproximateAge] = useState(patient.isApproximateAge ?? false);
    const [editGender, setEditGender] = useState(patient.gender || 'male');
    const [editEmergencyContact, setEditEmergencyContact] = useState(patient.emergencyContact || '');
    const [editMedicalHistory, setEditMedicalHistory] = useState(patient.medicalHistoryNotes || '');
    const [editCreditLimit, setEditCreditLimit] = useState(patient.creditConfig?.creditLimit || 0);
    // Re-Admission Form State
    const doctors = users.filter((u) => u.role === 'doctor' || u.medicalCouncilNumber);
    const [reAdmitDoctorId, setReAdmitDoctorId] = useState(doctors[0]?.id || 'u-doc-primary');
    const [reAdmitDepartment, setReAdmitDepartment] = useState('جراحی و کلینیک تخصصی');
    const [reAdmitSelectedServices, setReAdmitSelectedServices] = useState([]);
    const [reAdmitNotes, setReAdmitNotes] = useState('');
    const [showSalamatModal, setShowSalamatModal] = useState(false);
    // Sync state when selected patient changes or modal opens
    useEffect(() => {
        if (patient) {
            setEditFirstName(patient.firstName || '');
            setEditLastName(patient.lastName || '');
            setEditNationalId(patient.nationalId || '');
            setEditMobilePhone(patient.mobilePhone || '');
            setEditFatherName(patient.fatherName || '');
            setEditBirthDate(patient.birthDate || '');
            setEditAge(patient.age !== undefined
                ? String(patient.age)
                : calculateAgeFromJalali(patient.birthDate) !== undefined
                    ? String(calculateAgeFromJalali(patient.birthDate))
                    : '');
            setEditIsApproximateAge(patient.isApproximateAge ?? false);
            setEditGender(patient.gender || 'male');
            setEditEmergencyContact(patient.emergencyContact || '');
            setEditMedicalHistory(patient.medicalHistoryNotes || '');
            setEditCreditLimit(patient.creditConfig?.creditLimit || 0);
            setReAdmitSelectedServices([]);
            setReAdmitNotes('');
        }
    }, [patient?.id, isOpen]);
    const handleSavePatientInsurance = (patientId, insuranceRecord) => {
        const updated = {
            ...patient,
            insuranceProvider: 'salamat',
            salamatInsuranceInfo: insuranceRecord,
        };
        onUpdatePatient(updated);
    };
    if (!isOpen || !patient)
        return null;
    // Filter Records linked to this patient by ID, National ID, or File Number
    const patientVisits = visitQueue.filter((vq) => vq.patientId === patient.id ||
        (patient.nationalId && vq.nationalId === patient.nationalId) ||
        vq.patientCode === patient.fileNumber);
    const patientAppointments = appointments.filter((ap) => ap.patientId === patient.id ||
        ap.patientName.includes(patient.fullName) ||
        (patient.mobilePhone && ap.mobilePhone === patient.mobilePhone));
    const patientTreatmentPlans = treatmentPlans.filter((tp) => tp.patientId === patient.id ||
        tp.patientCode === patient.fileNumber ||
        tp.patientName.includes(patient.fullName));
    const patientConsents = signedConsents.filter((sc) => sc.patientId === patient.id ||
        (patient.nationalId && sc.patientNationalId === patient.nationalId) ||
        sc.archivedFileNumber === patient.fileNumber);
    const patientInvoices = salesInvoices.filter((inv) => inv.patientId === patient.id ||
        inv.patientCode === patient.fileNumber ||
        inv.patientName.includes(patient.fullName));
    // Handle Save Patient Edit
    const handleSaveEdit = (e) => {
        e.preventDefault();
        if (!editFirstName.trim() || !editLastName.trim()) {
            alert('لطفاً نام و نام خانوادگی بیمار را وارد کنید.');
            return;
        }
        // Check duplicate National ID
        const cleanNatId = editNationalId.trim();
        if (cleanNatId) {
            const existingWithSameId = patients.find((p) => p.id !== patient.id && p.nationalId === cleanNatId);
            if (existingWithSameId) {
                alert(`امکان ثبت وجود ندارد! بیمار دیگری به نام «${existingWithSameId.fullName}» با کد ملی (${toPersianDigits(cleanNatId)}) قبلاً در سیستم ثبت شده است.`);
                return;
            }
        }
        const numericAge = editAge ? parseInt(toEnglishDigits(editAge), 10) : calculateAgeFromJalali(editBirthDate);
        const calculatedBirthDate = editIsApproximateAge && numericAge !== undefined && !isNaN(numericAge)
            ? calculateBirthYearFromAge(numericAge)
            : editBirthDate;
        const updated = {
            ...patient,
            firstName: editFirstName.trim(),
            lastName: editLastName.trim(),
            fullName: `${editFirstName.trim()} ${editLastName.trim()}`,
            nationalId: editNationalId.trim() || undefined,
            mobilePhone: editMobilePhone.trim() || undefined,
            fatherName: editFatherName.trim() || undefined,
            birthDate: calculatedBirthDate.trim() || undefined,
            age: numericAge !== undefined && !isNaN(numericAge) ? numericAge : undefined,
            isApproximateAge: editIsApproximateAge,
            gender: editGender,
            emergencyContact: editEmergencyContact.trim() || undefined,
            medicalHistoryNotes: editMedicalHistory.trim() || undefined,
            creditConfig: {
                ...patient.creditConfig,
                creditLimit: editCreditLimit,
            },
        };
        onUpdatePatient(updated);
        alert(`اطلاعات شناسنامه‌ای بیمار «${updated.fullName}» با موفقیت بروزرسانی شد.`);
        setActiveTab('history');
    };
    // Handle Add Service to Re-Admit
    const handleAddServiceToReAdmit = (serviceId) => {
        const srv = medicalServices.find((s) => s.id === serviceId);
        if (!srv)
            return;
        // Check duplicate service
        const isDuplicate = reAdmitSelectedServices.some((s) => {
            if (s.serviceId === srv.id)
                return true;
            const t1 = s.title.trim().toLowerCase();
            const t2 = srv.title.trim().toLowerCase();
            return t1 === t2 || t1.startsWith(t2) || t2.startsWith(t1);
        });
        if (isDuplicate) {
            alert(`⚠️ خدمت تکراری:\nخدمت «${srv.title}» قبلاً برای این پذیرش انتخاب شده است.`);
            return;
        }
        const newItem = {
            id: 'srv-item-' + Date.now() + Math.random().toString(36).substring(2, 5),
            title: srv.title,
            category: srv.category,
            price: srv.tariffPrice,
            status: 'pending',
            serviceId: srv.id,
            quantity: 1,
            unitPrice: srv.tariffPrice,
        };
        setReAdmitSelectedServices((prev) => [...prev, newItem]);
    };
    // Remove Service from Re-Admit
    const handleRemoveServiceFromReAdmit = (id) => {
        setReAdmitSelectedServices((prev) => prev.filter((s) => s.id !== id));
    };
    // Submit Re-Admission
    const handleReAdmitSubmit = (e) => {
        e.preventDefault();
        const selectedDoc = users.find((u) => u.id === reAdmitDoctorId);
        const doctorName = selectedDoc ? selectedDoc.name : 'پزشک معالج مرکز';
        const now = new Date();
        const totalCost = reAdmitSelectedServices.reduce((sum, s) => sum + s.price, 0);
        const newQueueItem = {
            id: 'vq-' + Date.now(),
            patientId: patient.id,
            patientName: patient.fullName,
            patientCode: patient.fileNumber,
            nationalId: patient.nationalId,
            mobilePhone: patient.mobilePhone,
            doctorId: reAdmitDoctorId,
            doctorName,
            department: reAdmitDepartment,
            status: 'waiting',
            registeredAt: now.toISOString(),
            jalaliTime: getJalaliDateTimeString(now),
            services: reAdmitSelectedServices,
            doctorNotes: reAdmitNotes.trim() || undefined,
            totalCost,
            paidAmount: 0,
            remainingDebt: totalCost,
        };
        onAddQueueItem(newQueueItem);
        // Update patient last visit date
        onUpdatePatient({
            ...patient,
            lastVisitDate: now.toISOString(),
        });
        alert(`پذیرش مجدد بیمار «${patient.fullName}» با موفقیت در صف ثبت گردید.`);
        setReAdmitSelectedServices([]);
        setReAdmitNotes('');
        setActiveTab('history');
    };
    const calculateTotalPaid = () => {
        return patientInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    };
    return (_jsxs("div", { className: "fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 font-nazanin text-slate-800", dir: "rtl", children: [_jsxs("div", { className: "bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in duration-200", children: [_jsxs("div", { className: "bg-gradient-to-r from-teal-800 via-slate-800 to-slate-900 text-white p-5 shrink-0", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-titr font-bold text-lg shrink-0", children: patient.fullName.substring(0, 1) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "font-titr text-lg sm:text-xl font-bold", children: patient.fullName }), _jsxs("span", { className: "bg-teal-500/20 text-teal-200 border border-teal-500/40 text-[11px] px-2 py-0.5 rounded-full font-bold", children: ["\u067E\u0631\u0648\u0646\u062F\u0647 \u062F\u0627\u0626\u0645\u06CC: ", patient.fileNumber] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-xs text-teal-100 mt-1.5", children: [patient.nationalId && (_jsxs("span", { className: "flex items-center gap-1 font-mono", children: [_jsx("span", { className: "text-teal-300", children: "\u06A9\u062F \u0645\u0644\u06CC:" }), " ", toPersianDigits(patient.nationalId)] })), patient.mobilePhone && (_jsxs("span", { className: "flex items-center gap-1 font-mono", children: [_jsx(Phone, { className: "w-3.5 h-3.5 text-teal-300" }), " ", toPersianDigits(patient.mobilePhone)] })), (patient.age !== undefined || calculateAgeFromJalali(patient.birthDate) !== undefined) && (_jsxs("span", { className: "bg-slate-700/80 text-teal-200 border border-teal-500/30 px-2 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1", children: [_jsxs("span", { children: ["\u0633\u0646: ", toPersianDigits(patient.age ?? calculateAgeFromJalali(patient.birthDate)), " \u0633\u0627\u0644"] }), patient.isApproximateAge && _jsx("span", { className: "text-[10px] text-amber-300", children: "(\u062A\u0642\u0631\u06CC\u0628\u06CC)" })] })), patient.creditConfig?.currentDebt > 0 && (_jsxs("span", { className: "bg-rose-500/30 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-lg font-bold text-[11px]", children: ["\u0628\u062F\u0647\u06CC \u0645\u0639\u0648\u0642: ", toPersianDigits(patient.creditConfig.currentDebt.toLocaleString()), " \u062A\u0648\u0645\u0627\u0646"] }))] })] })] }), _jsx("button", { onClick: onClose, className: "text-slate-300 hover:text-white p-2 hover:bg-white/10 rounded-xl transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "flex items-center gap-2 mt-5 border-t border-slate-700/60 pt-3", children: [_jsxs("button", { onClick: () => setActiveTab('history'), className: `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'history'
                                            ? 'bg-teal-500 text-slate-900 shadow-md font-titr'
                                            : 'text-slate-300 hover:bg-slate-800'}`, children: [_jsx(History, { className: "w-4 h-4" }), "\u0633\u0648\u0627\u0628\u0642 \u067E\u0631\u0648\u0646\u062F\u0647 \u0648 \u0645\u0631\u0627\u062C\u0639\u0627\u062A (", toPersianDigits(patientVisits.length), ")"] }), _jsxs("button", { onClick: () => setActiveTab('re_admit'), className: `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 're_admit'
                                            ? 'bg-teal-500 text-slate-900 shadow-md font-titr'
                                            : 'text-slate-300 hover:bg-slate-800'}`, children: [_jsx(UserPlus, { className: "w-4 h-4" }), "\u067E\u0630\u06CC\u0631\u0634 \u0645\u062C\u062F\u062F \u062F\u0631 \u0635\u0641 \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647"] }), _jsxs("button", { onClick: () => setActiveTab('edit'), className: `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'edit'
                                            ? 'bg-teal-500 text-slate-900 shadow-md font-titr'
                                            : 'text-slate-300 hover:bg-slate-800'}`, children: [_jsx(Edit3, { className: "w-4 h-4" }), "\u0627\u0635\u0644\u0627\u062D \u0648 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0634\u0646\u0627\u0633\u0646\u0627\u0645\u0647\u200C\u0627\u06CC"] }), _jsxs("button", { onClick: () => setActiveTab('before_after'), className: `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'before_after' ? 'bg-teal-500 text-slate-900 shadow-md font-titr' : 'text-slate-300 hover:bg-slate-800'}`, children: [_jsx(Camera, { className: "w-4 h-4" }), "گالری قبل و بعد درمان"] }), _jsxs("button", { onClick: () => setShowSalamatModal(true), className: "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 transition", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-300" }), patient.salamatInsuranceInfo?.deserved ? 'بیمه سلامت: تاییدشده' : 'استعلام آنلاین بیمه سلامت'] })] })] }), _jsxs("div", { className: "p-6 overflow-y-auto flex-1 text-xs space-y-6", children: [activeTab === 'history' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [_jsxs("div", { className: "bg-teal-50 border border-teal-200 p-3 rounded-2xl", children: [_jsx("div", { className: "text-teal-700 font-medium", children: "\u062A\u0639\u062F\u0627\u062F \u06A9\u0644 \u0645\u0631\u0627\u062C\u0639\u0627\u062A" }), _jsxs("div", { className: "font-titr text-lg font-bold text-teal-900 mt-1", children: [toPersianDigits(patientVisits.length), " \u0646\u0648\u0628\u062A"] })] }), _jsxs("div", { className: "bg-emerald-50 border border-emerald-200 p-3 rounded-2xl", children: [_jsx("div", { className: "text-emerald-700 font-medium", children: "\u0645\u062C\u0645\u0648\u0639 \u067E\u0631\u062F\u0627\u062E\u062A\u200C\u0647\u0627" }), _jsxs("div", { className: "font-titr text-lg font-bold text-emerald-900 mt-1", children: [toPersianDigits(calculateTotalPaid().toLocaleString()), " \u062A\u0648\u0645\u0627\u0646"] })] }), _jsxs("div", { className: "bg-amber-50 border border-amber-200 p-3 rounded-2xl", children: [_jsx("div", { className: "text-amber-700 font-medium", children: "\u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0627\u0645\u0636\u0627 \u0634\u062F\u0647" }), _jsxs("div", { className: "font-titr text-lg font-bold text-amber-900 mt-1", children: [toPersianDigits(patientConsents.length), " \u0641\u0631\u0645"] })] }), _jsxs("div", { className: "bg-purple-50 border border-purple-200 p-3 rounded-2xl", children: [_jsx("div", { className: "text-purple-700 font-medium", children: "\u0637\u0631\u062D\u200C\u0647\u0627\u06CC \u062F\u0631\u0645\u0627\u0646 \u0641\u0639\u0627\u0644" }), _jsxs("div", { className: "font-titr text-lg font-bold text-purple-900 mt-1", children: [toPersianDigits(patientTreatmentPlans.length), " \u0645\u0648\u0631\u062F"] })] })] }), patient.medicalHistoryNotes && (_jsxs("div", { className: "bg-amber-50 border border-amber-300 text-amber-900 p-3.5 rounded-2xl flex items-start gap-2.5", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-amber-600 shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("span", { className: "font-bold text-xs block", children: "\u0633\u0648\u0627\u0628\u0642 \u067E\u0632\u0634\u06A9\u06CC\u060C \u062D\u0633\u0627\u0633\u06CC\u062A\u200C\u0647\u0627\u06CC \u062F\u0627\u0631\u0648\u06CC\u06CC \u0648 \u0645\u0644\u0627\u062D\u0638\u0627\u062A:" }), _jsx("p", { className: "text-xs mt-0.5 leading-relaxed font-medium", children: patient.medicalHistoryNotes })] })] })), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "font-titr text-sm text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between font-bold", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Stethoscope, { className: "w-4 h-4 text-teal-600" }), "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0645\u0631\u0627\u062C\u0639\u0627\u062A\u060C \u0645\u0639\u0627\u06CC\u0646\u0627\u062A \u0648 \u062E\u062F\u0645\u0627\u062A \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC"] }), _jsx("span", { className: "text-xs text-slate-500 font-normal", children: "\u0645\u0631\u062A\u0628\u200C\u0633\u0627\u0632\u06CC \u0627\u0632 \u062C\u062F\u06CC\u062F\u062A\u0631\u06CC\u0646 \u0645\u0631\u0627\u062C\u0639\u0627\u062A" })] }), patientVisits.length === 0 ? (_jsx("div", { className: "p-6 bg-slate-50 text-slate-500 text-center rounded-2xl border border-dashed border-slate-300", children: "\u0647\u06CC\u0686 \u0646\u0648\u0628\u062A \u0633\u0627\u0628\u0642\u0647 \u0648\u06CC\u0632\u06CC\u062A \u0642\u0628\u0644\u06CC \u062F\u0631 \u0635\u0641 \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647 \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0628\u06CC\u0645\u0627\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." })) : (_jsx("div", { className: "space-y-3", children: patientVisits.map((visit) => (_jsxs("div", { className: "bg-white border border-slate-200 hover:border-teal-300 rounded-2xl p-4 shadow-sm space-y-3 transition", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-lg font-bold font-mono", children: toPersianDigits(visit.jalaliTime || '') }), _jsxs("span", { className: "font-bold text-slate-900 text-xs", children: ["\u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C: ", visit.doctorName || 'پزشک معالج مرکز'] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-slate-500", children: "\u0647\u0632\u06CC\u0646\u0647 \u06A9\u0644:" }), _jsxs("span", { className: "font-bold text-slate-900 font-mono", children: [toPersianDigits(visit.totalCost.toLocaleString()), " \u062A\u0648\u0645\u0627\u0646"] }), visit.remainingDebt > 0 ? (_jsxs("span", { className: "bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold", children: ["\u0628\u062F\u0647\u06A9\u0627\u0631 (", toPersianDigits(visit.remainingDebt.toLocaleString()), ")"] })) : (_jsx("span", { className: "bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold", children: "\u062A\u0633\u0648\u06CC\u0647 \u0634\u062F\u0647" }))] })] }), visit.services && visit.services.length > 0 && (_jsxs("div", { children: [_jsx("span", { className: "text-slate-500 font-bold block mb-1", children: "\u062E\u062F\u0645\u0627\u062A \u0648 \u0627\u0642\u062F\u0627\u0645\u0627\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F\u0647:" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: visit.services.map((srv, idx) => (_jsxs("span", { className: "bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-medium", children: [srv.title, " (", toPersianDigits(srv.price.toLocaleString()), " \u062A\u0648\u0645\u0627\u0646)"] }, idx))) })] })), visit.diagnosis && (_jsxs("div", { className: "bg-teal-50/60 p-2.5 rounded-xl border border-teal-100", children: [_jsx("span", { className: "font-bold text-teal-800", children: "\u062A\u0634\u062E\u06CC\u0635 \u067E\u0632\u0634\u06A9:" }), " ", visit.diagnosis] })), visit.doctorNotes && (_jsxs("div", { className: "bg-slate-50 p-2.5 rounded-xl text-slate-700", children: [_jsx("span", { className: "font-bold text-slate-800", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u062F\u0633\u062A\u0648\u0631 \u062F\u0627\u0631\u0648\u06CC\u06CC:" }), ' ', visit.doctorNotes] }))] }, visit.id))) }))] }), patientAppointments.length > 0 && (_jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { className: "font-titr text-sm text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2 font-bold", children: [_jsx(Calendar, { className: "w-4 h-4 text-teal-600" }), "\u0646\u0648\u0628\u062A\u200C\u0647\u0627\u06CC \u062A\u0642\u0648\u06CC\u0645 \u0648 \u06A9\u0644\u06CC\u0646\u06CC\u06A9 / \u0628\u06CC\u0645\u0627\u0631\u0633\u062A\u0627\u0646/\u0645\u0631\u06A9\u0632 \u062C\u0631\u0627\u062D\u06CC (", toPersianDigits(patientAppointments.length), ")"] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: patientAppointments.map((ap) => (_jsxs("div", { className: "bg-slate-50 p-3 rounded-xl border border-slate-200", children: [_jsxs("div", { className: "flex justify-between font-bold text-slate-900", children: [_jsxs("span", { children: [toPersianDigits(ap.jalaliDate), " - \u0633\u0627\u0639\u062A ", toPersianDigits(ap.timeSlot)] }), _jsx("span", { className: "text-teal-700", children: ap.doctorName })] }), ap.isGanjiHospital && (_jsx("span", { className: "bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 inline-block", children: "\u0646\u0648\u0628\u062A \u0628\u06CC\u0645\u0627\u0631\u0633\u062A\u0627\u0646/\u0645\u0631\u06A9\u0632 \u062C\u0631\u0627\u062D\u06CC" }))] }, ap.id))) })] })), patientConsents.length > 0 && (_jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { className: "font-titr text-sm text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2 font-bold", children: [_jsx(FileCheck, { className: "w-4 h-4 text-teal-600" }), "\u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0627\u0645\u0636\u0627 \u0634\u062F\u0647 \u062A\u0628\u0644\u062A\u06CC (", toPersianDigits(patientConsents.length), ")"] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: patientConsents.map((sc) => (_jsxs("div", { className: "bg-amber-50/50 border border-amber-200 p-3 rounded-xl flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-bold text-slate-900", children: sc.formTitle }), _jsxs("div", { className: "text-slate-500 text-[11px] mt-0.5", children: ["\u062A\u0627\u0631\u06CC\u062E \u0627\u0645\u0636\u0627: ", toPersianDigits(sc.jalaliDate)] })] }), sc.signatureDataUrl && (_jsx("img", { src: sc.signatureDataUrl, alt: "Signature", className: "h-8 border border-slate-300 rounded bg-white p-0.5" }))] }, sc.id))) })] })) ] })), activeTab === 're_admit' && (_jsxs("form", { onSubmit: handleReAdmitSubmit, className: "space-y-5", children: [_jsxs("div", { className: "bg-teal-50 border border-teal-200 p-4 rounded-2xl", children: [_jsxs("h3", { className: "font-titr font-bold text-sm text-teal-900 mb-1", children: ["\u067E\u0630\u06CC\u0631\u0634 \u0645\u062C\u062F\u062F \u0648 \u062B\u0628\u062A \u0646\u0648\u0628\u062A \u062C\u062F\u06CC\u062F \u0628\u0631\u0627\u06CC: \u00AB", patient.fullName, "\u00BB"] }), _jsxs("p", { className: "text-slate-600", children: ["\u0634\u0646\u0627\u0633\u0647 \u06CC\u06A9\u062A\u0627\u06CC \u067E\u0631\u0648\u0646\u062F\u0647 (", patient.fileNumber, ") \u0628\u0647 \u0627\u06CC\u0646 \u0646\u0648\u0628\u062A \u0645\u062A\u0635\u0644 \u0634\u062F\u0647 \u0648 \u062A\u0645\u0627\u0645\u06CC \u0633\u0648\u0627\u0628\u0642 \u0628\u0631\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0645\u062D\u0641\u0648\u0638 \u0628\u0627\u0642\u06CC \u062E\u0648\u0627\u0647\u062F \u0645\u0627\u0646\u062F."] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C:" }), _jsx("select", { value: reAdmitDoctorId, onChange: (e) => setReAdmitDoctorId(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500", children: doctors.map((doc) => (_jsxs("option", { value: doc.id, children: [doc.name, " (", doc.specialty || 'پزشک کلینیک', ")"] }, doc.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0628\u062E\u0634 / \u062F\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647:" }), _jsx("input", { type: "text", value: reAdmitDepartment, onChange: (e) => setReAdmitDepartment(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block font-bold text-slate-700", children: "\u0627\u0641\u0632\u0648\u062F\u0646 \u062E\u062F\u0645\u0627\u062A \u0648 \u062A\u0639\u0631\u0641\u0647\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0646\u0648\u0628\u062A:" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { id: "serviceSelector", className: "flex-1 border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900", children: [_jsx("option", { value: "", children: "-- \u0627\u0646\u062A\u062E\u0627\u0628 \u062E\u062F\u0645\u062A \u067E\u0632\u0634\u06A9\u06CC \u06CC\u0627 \u062F\u0631\u0645\u0627\u0646\u06CC --" }), medicalServices.map((srv) => (_jsxs("option", { value: srv.id, children: [srv.title, " - ", toPersianDigits(srv.tariffPrice.toLocaleString()), " \u062A\u0648\u0645\u0627\u0646"] }, srv.id)))] }), _jsxs("button", { type: "button", onClick: () => {
                                                            const sel = document.getElementById('serviceSelector');
                                                            if (sel && sel.value) {
                                                                handleAddServiceToReAdmit(sel.value);
                                                                sel.value = '';
                                                            }
                                                        }, className: "px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1 shrink-0", children: [_jsx(Plus, { className: "w-4 h-4" }), "\u0627\u0641\u0632\u0648\u062F\u0646 \u062E\u062F\u0645\u062A"] })] }), reAdmitSelectedServices.length > 0 && (_jsxs("div", { className: "bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-2", children: [_jsx("span", { className: "font-bold text-slate-700 block text-xs", children: "\u062E\u062F\u0645\u0627\u062A \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647:" }), _jsx("div", { className: "space-y-1.5", children: reAdmitSelectedServices.map((srv) => (_jsxs("div", { className: "flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg text-xs", children: [_jsx("span", { className: "font-bold text-slate-900", children: srv.title }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "font-mono text-teal-800 font-bold", children: [toPersianDigits(srv.price.toLocaleString()), " \u062A\u0648\u0645\u0627\u0646"] }), _jsx("button", { type: "button", onClick: () => handleRemoveServiceFromReAdmit(srv.id), className: "text-rose-500 hover:text-rose-700 p-1", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, srv.id))) }), _jsxs("div", { className: "pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900", children: [_jsx("span", { children: "\u062C\u0645\u0639 \u0647\u0632\u06CC\u0646\u0647 \u06A9\u0644 \u0627\u06CC\u0646 \u0646\u0648\u0628\u062A:" }), _jsxs("span", { className: "font-mono text-teal-800", children: [toPersianDigits(reAdmitSelectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString()), ' ', "\u062A\u0648\u0645\u0627\u0646"] })] })] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06CC\u0627\u062F\u062F\u0627\u0634\u062A \u0648 \u0639\u0644\u062A \u0645\u0631\u0627\u062C\u0639\u0647 \u0641\u0639\u0644\u06CC:" }), _jsx("textarea", { rows: 2, placeholder: "\u0639\u0644\u0627\u0626\u0645\u060C \u0634\u0631\u062D \u062D\u0627\u0644 \u0628\u06CC\u0645\u0627\u0631 \u06CC\u0627 \u062F\u0633\u062A\u0648\u0631 \u0627\u0648\u0644\u06CC\u0647...", value: reAdmitNotes, onChange: (e) => setReAdmitNotes(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200 flex justify-end gap-3", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('history'), className: "px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2", children: [_jsx(Check, { className: "w-4 h-4" }), "\u062B\u0628\u062A \u0646\u0648\u0628\u062A \u067E\u0630\u06CC\u0631\u0634 \u062F\u0631 \u0635\u0641"] })] })] })), activeTab === 'edit' && (_jsxs("form", { onSubmit: handleSaveEdit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block font-bold text-slate-700 mb-1", children: ["\u0646\u0627\u0645: ", _jsx("span", { className: "text-rose-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: editFirstName, onChange: (e) => setEditFirstName(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block font-bold text-slate-700 mb-1", children: ["\u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC: ", _jsx("span", { className: "text-rose-500", children: "*" })] }), _jsx("input", { type: "text", required: true, value: editLastName, onChange: (e) => setEditLastName(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06A9\u062F \u0645\u0644\u06CC (\u06F1\u06F0 \u0631\u0642\u0645\u06CC):" }), _jsx("input", { type: "text", maxLength: 10, value: editNationalId, onChange: (e) => setEditNationalId(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 dir-ltr text-right" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647:" }), _jsx("input", { type: "text", value: editMobilePhone, onChange: (e) => setEditMobilePhone(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 dir-ltr text-right" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u0627\u0645 \u067E\u062F\u0631:" }), _jsx("input", { type: "text", value: editFatherName, onChange: (e) => setEditFatherName(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { className: "sm:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2", children: [_jsxs("label", { className: "text-xs font-bold text-slate-800 flex items-center gap-1.5", children: [_jsx(Calendar, { className: "w-4 h-4 text-teal-600" }), _jsx("span", { children: "\u0633\u0646 \u0648 \u062A\u0627\u0631\u06CC\u062E \u062A\u0648\u0644\u062F \u0628\u06CC\u0645\u0627\u0631:" })] }), _jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-semibold text-teal-800 bg-teal-100/70 hover:bg-teal-100 px-3 py-1 rounded-xl border border-teal-300/80 transition", children: [_jsx("input", { type: "checkbox", checked: editIsApproximateAge, onChange: (e) => {
                                                                            const checked = e.target.checked;
                                                                            setEditIsApproximateAge(checked);
                                                                            if (checked) {
                                                                                const calculated = calculateAgeFromJalali(editBirthDate);
                                                                                if (calculated !== undefined)
                                                                                    setEditAge(String(calculated));
                                                                            }
                                                                            else {
                                                                                const ageNum = parseInt(editAge, 10);
                                                                                if (!isNaN(ageNum) && ageNum >= 0) {
                                                                                    setEditBirthDate(calculateBirthYearFromAge(ageNum));
                                                                                }
                                                                            }
                                                                        }, className: "rounded text-teal-600 focus:ring-teal-500 w-4 h-4" }), _jsx("span", { children: "\u0633\u0646 \u062A\u0642\u0631\u06CC\u0628\u06CC (\u0648\u0631\u0648\u062F \u0639\u062F\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0633\u0646)" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [editIsApproximateAge ? (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate-700 mb-1", children: "\u0633\u0646 \u062A\u0642\u0631\u06CC\u0628\u06CC \u0628\u06CC\u0645\u0627\u0631 (\u0633\u0627\u0644):" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "number", min: 0, max: 120, placeholder: "\u0645\u062B\u0644\u0627\u064B \u06F3\u06F5", value: editAge, onChange: (e) => {
                                                                                    const val = e.target.value;
                                                                                    setEditAge(val);
                                                                                    const num = parseInt(val, 10);
                                                                                    if (!isNaN(num) && num >= 0) {
                                                                                        setEditBirthDate(calculateBirthYearFromAge(num));
                                                                                    }
                                                                                }, className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold font-mono text-slate-900 focus:ring-2 focus:ring-teal-500" }), _jsx("span", { className: "absolute left-3 top-2.5 text-xs text-slate-500 font-bold", children: "\u0633\u0627\u0644" })] })] })) : (_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-slate-700 mb-1", children: "\u062A\u0627\u0631\u06CC\u062E \u062A\u0648\u0644\u062F (\u0634\u0645\u0633\u06CC):" }), _jsx("input", { type: "text", placeholder: "\u06F1\u06F3\u06F6\u06F8/\u06F0\u06F5/\u06F1\u06F2", value: editBirthDate, onChange: (e) => {
                                                                            const val = e.target.value;
                                                                            setEditBirthDate(val);
                                                                            const computedAge = calculateAgeFromJalali(val);
                                                                            if (computedAge !== undefined) {
                                                                                setEditAge(String(computedAge));
                                                                            }
                                                                        }, className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 dir-ltr text-right" })] })), _jsx("div", { className: "flex flex-col justify-end", children: _jsxs("div", { className: "p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700", children: [_jsx("span", { className: "text-slate-500", children: "\u0633\u0646 \u0645\u062D\u0627\u0633\u0628\u0647\u200C\u0634\u062F\u0647:" }), _jsxs("span", { className: "font-bold font-mono text-sm text-teal-800", children: [editAge ? `${toPersianDigits(editAge)} سال` : 'نامشخص', editIsApproximateAge && editAge && _jsx("span", { className: "text-[10px] text-amber-600 mr-1", children: "(\u062A\u0642\u0631\u06CC\u0628\u06CC)" })] })] }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062C\u0646\u0633\u06CC\u062A:" }), _jsxs("select", { value: editGender, onChange: (e) => setEditGender(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500", children: [_jsx("option", { value: "male", children: "\u0645\u0631\u062F" }), _jsx("option", { value: "female", children: "\u0632\u0646" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0645\u0627\u0633 \u0627\u0636\u0637\u0631\u0627\u0631\u06CC:" }), _jsx("input", { type: "text", value: editEmergencyContact, onChange: (e) => setEditEmergencyContact(e.target.value), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 dir-ltr text-right" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0633\u0642\u0641 \u0627\u0639\u062A\u0628\u0627\u0631 \u0646\u0633\u06CC\u0647 (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", value: editCreditLimit, onChange: (e) => setEditCreditLimit(Number(e.target.value)), className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 dir-ltr text-right" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0633\u0648\u0627\u0628\u0642 \u067E\u0632\u0634\u06A9\u06CC\u060C \u0628\u06CC\u0645\u0627\u0631\u06CC\u200C\u0647\u0627\u06CC \u0632\u0645\u06CC\u0646\u0647\u200C\u0627\u06CC \u0648 \u062D\u0633\u0627\u0633\u06CC\u062A \u062F\u0627\u0631\u0648\u06CC\u06CC:" }), _jsx("textarea", { rows: 3, value: editMedicalHistory, onChange: (e) => setEditMedicalHistory(e.target.value), placeholder: "\u062F\u06CC\u0627\u0628\u062A\u060C \u0641\u0634\u0627\u0631 \u062E\u0648\u0646\u060C \u062D\u0633\u0627\u0633\u06CC\u062A \u0628\u0647 \u067E\u0646\u0633\u0644\u06CC\u0646...", className: "w-full border border-slate-300 rounded-xl p-2.5 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-teal-500" })] }), _jsxs("div", { className: "pt-3 border-t border-slate-200 flex justify-end gap-3", children: [_jsx("button", { type: "button", onClick: () => setActiveTab('history'), className: "px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsxs("button", { type: "submit", className: "px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2", children: [_jsx(Save, { className: "w-4 h-4" }), "\u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0645\u0634\u062E\u0635\u0627\u062A \u0628\u06CC\u0645\u0627\u0631"] })] })] })), activeTab === 'before_after' && (_jsx("div", { className: "p-2", children: _jsx(ClinicalBeforeAfterGallery, { isOpen: true, patient: patient, records: patient?.beforeAfterImages || [], onClose: () => setActiveTab('history'), currentUser: currentUser, onSaveRecords: (updatedRecords) => { onUpdatePatient({ ...patient, beforeAfterImages: updatedRecords }); } }) }))] })] }), _jsx(SalamatInsuranceModal, { isOpen: showSalamatModal, onClose: () => setShowSalamatModal(false), patient: patient, onSavePatientInsurance: handleSavePatientInsurance })] }));
};
