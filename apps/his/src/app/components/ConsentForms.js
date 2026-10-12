import { jsx as _jsx, jsxs as _jsxs } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
import React, { useState, useRef } from '../../client-vendor/react.js?b=r24-514-1405';
import { FileCheck, PenTool, Fingerprint, Printer, CheckCircle2, Plus, Trash2, Edit3, Layers, X, FileText, Info, } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';
import { PERSIAN_PLACEHOLDERS, DEFAULT_FORM_TEMPLATES, replacePersianPlaceholders, } from '../utils/formPlaceholders.js?b=r24-514-1405';
import { DigitalSignaturePad } from './DigitalSignaturePad.js?b=r24-514-1405';
export const ConsentForms = ({ patients = [], signedConsents = [], visitQueue = [], settings, currentUser, onSaveSignedConsent, formTemplates: propsFormTemplates, onSaveFormTemplates, onOpenPatientProfile, }) => {
    // Navigation Tabs: 'fill' (Fill & Sign), 'builder' (Form Builder - Admin), 'archive' (Archived Forms)
    const [activeTab, setActiveTab] = useState('fill');
    // Form Templates List State (Load from props, localStorage or defaults)
    const [templates, setTemplates] = useState(() => {
        if (propsFormTemplates && propsFormTemplates.length > 0)
            return propsFormTemplates;
        try {
            const saved = localStorage.getItem('clinic_custom_form_templates');
            if (saved)
                return JSON.parse(saved);
        }
        catch (e) {
            console.error(e);
        }
        return DEFAULT_FORM_TEMPLATES;
    });
    const saveTemplates = (newTemplates) => {
        setTemplates(newTemplates);
        try {
            localStorage.setItem('clinic_custom_form_templates', JSON.stringify(newTemplates));
        }
        catch (e) {
            console.error(e);
        }
        if (onSaveFormTemplates) {
            onSaveFormTemplates(newTemplates);
        }
    };
    // Filter Admitted Patients (بیماران پذیرش شده تا قبل از ترخیص)
    const admittedQueueItems = visitQueue.filter((q) => q.status !== 'discharged' && q.status !== 'cancelled');
    // Patient Selection for Filling
    const [selectedQueueItemId, setSelectedQueueItemId] = useState(admittedQueueItems[0]?.id || '');
    const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
    // Currently Selected Template & Patient
    const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    const activeQueueItem = admittedQueueItems.find((q) => q.id === selectedQueueItemId);
    const activePatient = patients.find((p) => p.id === (activeQueueItem?.patientId || selectedPatientId)) ||
        patients[0];
    // Dynamic Form Field Values (e.g., Triage vitals)
    const [fieldValues, setFieldValues] = useState({});
    // Canvas Signature state
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [fingerprintCaptured, setFingerprintCaptured] = useState(false);
    const [showTabletPad, setShowTabletPad] = useState(false);
    const [externalSignature, setExternalSignature] = useState(null);
    // Print Preview Modal State
    const [printModalData, setPrintModalData] = useState(null);
    // Canvas Drawing Handlers
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
    };
    const draw = (e) => {
        if (!isDrawing)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
        setHasSignature(true);
    };
    const stopDrawing = () => {
        setIsDrawing(false);
    };
    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };
    // Rendered Form Text with Persian Variables Replaced
    const renderedFormText = activeTemplate
        ? replacePersianPlaceholders(activeTemplate.contentMarkdown, {
            patientName: activePatient?.fullName,
            nationalId: activePatient?.nationalId,
            fatherName: activePatient?.fatherName,
            mobilePhone: activePatient?.mobilePhone,
            fileNumber: activePatient?.fileNumber,
            doctorName: activeQueueItem?.doctorName || 'پزشک معالج مرکز',
            serviceName: activeQueueItem?.services?.map((s) => s.title).join('، ') || 'ارائه خدمات درمانی',
            todayJalali: getJalaliDateString(),
            receptionTime: activeQueueItem?.jalaliTime || new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            clinicName: settings.clinicName || 'مرکز درمانی',
        })
        : '';
    // Save Signed Consent
    const handleSaveConsent = () => {
        const centerMandatory = settings?.forceDigitalSignature === true;
        const templateMandatory = activeTemplate?.requireSignature !== false;
        const hasAnySig = hasSignature || fingerprintCaptured || Boolean(externalSignature?.dataUrl);
        if ((centerMandatory || templateMandatory) && !hasAnySig) {
            alert(centerMandatory
                ? 'طبق سیاست‌های الزامی این مرکز درمانی، ثبت امضای دیجیتال یا اثر انگشت برای این فرم اجباری است.'
                : 'لطفاً امضای دیجیتال یا اثر انگشت بیمار را ثبت نمایید.');
            return;
        }
        const canvas = canvasRef.current;
        const signatureDataUrl = externalSignature?.dataUrl || (hasSignature && canvas ? canvas.toDataURL() : undefined);
        const newSigned = {
            id: 'sc-' + Date.now(),
            patientId: activePatient?.id || 'pat-guest',
            patientName: activePatient?.fullName || 'بیمار',
            patientNationalId: activePatient?.nationalId || '',
            formTitle: activeTemplate?.title || 'فرم رضایت‌نامه',
            formCategory: activeTemplate?.category || 'عمومی',
            filledText: renderedFormText,
            fieldValues: fieldValues,
            signedAt: new Date().toISOString(),
            jalaliDate: getJalaliDateString(),
            signatureDataUrl,
            fingerprintDataUrl: fingerprintCaptured ? 'FINGERPRINT_STAMP' : undefined,
            archivedFileNumber: activePatient?.fileNumber || 'CL-000',
            signedByUserName: currentUser.name,
        };
        onSaveSignedConsent(newSigned);
        // Open Print Modal Option
        setPrintModalData({
            title: activeTemplate?.title || 'فرم رضایت‌نامه',
            patientName: activePatient?.fullName || 'بیمار',
            fileNumber: activePatient?.fileNumber || 'CL-000',
            nationalId: activePatient?.nationalId || '---',
            bodyText: renderedFormText,
            fieldValues: fieldValues,
            signatureDataUrl,
            fingerprintCaptured,
            date: getJalaliDateString(),
        });
        clearSignature();
        setExternalSignature(null);
        setFingerprintCaptured(false);
        setFieldValues({});
    };
    // ========================================================
    // FORM BUILDER (ADMIN PANEL) STATE & HANDLERS
    // ========================================================
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [builderTitle, setBuilderTitle] = useState('');
    const [builderCategory, setBuilderCategory] = useState('رضایت‌نامه');
    const [builderBodyText, setBuilderBodyText] = useState('');
    const [builderFields, setBuilderFields] = useState([]);
    const [builderRequireSignature, setBuilderRequireSignature] = useState(true);
    const [builderRequireFingerprint, setBuilderRequireFingerprint] = useState(true);
    // Start creating new form
    const handleNewTemplate = () => {
        setEditingTemplateId('new');
        setBuilderTitle('فرم جدید - ');
        setBuilderCategory('رضایت‌نامه');
        setBuilderBodyText('اینجانب [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی]، رضایت خود را در تاریخ [تاریخ امروز] جهت انجام [نوع خدمت] توسط [پزشک معالج] در [نام کلینیک] اعلام می‌نمایم.');
        setBuilderFields([]);
        setBuilderRequireSignature(true);
        setBuilderRequireFingerprint(true);
    };
    // Start editing existing form
    const handleEditTemplate = (tmpl) => {
        setEditingTemplateId(tmpl.id);
        setBuilderTitle(tmpl.title);
        setBuilderCategory(tmpl.category || 'عمومی');
        setBuilderBodyText(tmpl.contentMarkdown);
        setBuilderFields(tmpl.fields || []);
        setBuilderRequireSignature(tmpl.requireSignature !== false);
        setBuilderRequireFingerprint(tmpl.requireFingerprint !== false);
    };
    // Textarea Ref for cursor insertion
    const textareaRef = useRef(null);
    // Insert Persian Placeholder at Cursor Position
    const handleInsertPlaceholder = (placeholderKey) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = builderBodyText.substring(0, start);
            const after = builderBodyText.substring(end);
            const newText = before + ' ' + placeholderKey + ' ' + after;
            setBuilderBodyText(newText);
            setTimeout(() => {
                textarea.focus();
                const nextPos = start + placeholderKey.length + 2;
                textarea.setSelectionRange(nextPos, nextPos);
            }, 50);
        }
        else {
            setBuilderBodyText((prev) => prev + ' ' + placeholderKey + ' ');
        }
    };
    // Add Dynamic Custom Field
    const handleAddCustomField = () => {
        const newField = {
            id: 'f_' + Date.now(),
            label: 'عنوان فیلد جدید',
            type: 'text',
            required: false,
        };
        setBuilderFields([...builderFields, newField]);
    };
    // Save Form Template in Admin Panel
    const handleSaveTemplate = (e) => {
        e.preventDefault();
        if (!builderTitle.trim()) {
            alert('لطفاً عنوان فرم را وارد کنید.');
            return;
        }
        if (editingTemplateId === 'new') {
            const newTmpl = {
                id: 'tmpl-' + Date.now(),
                title: builderTitle,
                category: builderCategory,
                contentMarkdown: builderBodyText,
                fields: builderFields,
                requireSignature: builderRequireSignature,
                requireFingerprint: builderRequireFingerprint,
                createdAt: getJalaliDateString(),
            };
            saveTemplates([newTmpl, ...templates]);
            alert(`فرم «${builderTitle}» با موفقیت ساخته شد.`);
        }
        else {
            const updated = templates.map((t) => t.id === editingTemplateId
                ? {
                    ...t,
                    title: builderTitle,
                    category: builderCategory,
                    contentMarkdown: builderBodyText,
                    fields: builderFields,
                    requireSignature: builderRequireSignature,
                    requireFingerprint: builderRequireFingerprint,
                }
                : t);
            saveTemplates(updated);
            alert(`فرم «${builderTitle}» بروزرسانی گردید.`);
        }
        setEditingTemplateId(null);
    };
    // Delete Template
    const handleDeleteTemplate = (id, title) => {
        if (confirm(`آیا از حذف قالب فرم «${title}» اطمینان دارید؟`)) {
            const filtered = templates.filter((t) => t.id !== id);
            saveTemplates(filtered);
            if (selectedTemplateId === id) {
                setSelectedTemplateId(filtered[0]?.id || '');
            }
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-3 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl", children: _jsx(FileCheck, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-slate-800", children: "\u0633\u0627\u0645\u0627\u0646\u0647 \u0641\u0631\u0645\u200C\u0633\u0627\u0632 \u0648 \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0633\u0641\u0627\u0631\u0634\u06CC \u0627\u0644\u06A9\u062A\u0631\u0648\u0646\u06CC\u06A9" }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: "\u0633\u0627\u062E\u062A \u0622\u0633\u0627\u0646 \u0641\u0631\u0645 \u0628\u0627 \u0645\u062A\u063A\u06CC\u0631\u0647\u0627\u06CC \u0641\u0627\u0631\u0633\u06CC\u060C \u0627\u062E\u0630 \u0627\u0645\u0636\u0627\u06CC \u062F\u06CC\u062C\u06CC\u062A\u0627\u0644/\u0627\u062B\u0631\u0627\u0646\u06AF\u0634\u062A \u0628\u06CC\u0645\u0627\u0631\u0627\u0646 \u067E\u0630\u06CC\u0631\u0634 \u0634\u062F\u0647 \u0648 \u067E\u0631\u06CC\u0646\u062A \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F" })] })] }), _jsxs("div", { className: "flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200", children: [_jsxs("button", { type: "button", onClick: () => setActiveTab('fill'), className: `px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeTab === 'fill' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(PenTool, { className: "w-4 h-4" }), _jsx("span", { children: "\u062A\u06A9\u0645\u06CC\u0644 \u0648 \u0627\u062E\u0630 \u0627\u0645\u0636\u0627" })] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('builder'), className: `px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeTab === 'builder' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(Layers, { className: "w-4 h-4" }), _jsx("span", { children: "\u067E\u0646\u0644 \u0627\u062F\u0645\u06CC\u0646 (\u0641\u0631\u0645\u200C\u0633\u0627\u0632)" })] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('archive'), className: `px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${activeTab === 'archive' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(FileText, { className: "w-4 h-4" }), _jsxs("span", { children: ["\u0628\u0627\u06CC\u06AF\u0627\u0646\u06CC \u0641\u0631\u0645\u200C\u0647\u0627 (", signedConsents.length, ")"] })] })] })] }), activeTab === 'fill' && (_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6", children: [_jsxs("div", { className: "lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0628\u06CC\u0645\u0627\u0631 \u067E\u0630\u06CC\u0631\u0634 \u0634\u062F\u0647 (\u0642\u0628\u0644 \u0627\u0632 \u062A\u0631\u062E\u06CC\u0635):" }), _jsx("select", { value: selectedQueueItemId, onChange: (e) => {
                                            setSelectedQueueItemId(e.target.value);
                                            const q = admittedQueueItems.find((item) => item.id === e.target.value);
                                            if (q)
                                                setSelectedPatientId(q.patientId);
                                        }, className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 bg-teal-50/50", children: admittedQueueItems.length === 0 ? (_jsx("option", { value: "", children: "\u0647\u06CC\u0686 \u0628\u06CC\u0645\u0627\u0631 \u062A\u0631\u062E\u06CC\u0635\u200C\u0646\u0634\u062F\u0647\u200C\u0627\u06CC \u0645\u0648\u062C\u0648\u062F \u0646\u06CC\u0633\u062A" })) : (admittedQueueItems.map((q) => (_jsxs("option", { value: q.id, children: [q.patientName, " (\u067E\u0632\u0634\u06A9: ", q.doctorName || 'عمومی', ") - ", q.jalaliTime] }, q.id)))) }), admittedQueueItems.length === 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("label", { className: "block text-[11px] font-bold text-slate-600 mb-1", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 \u06A9\u0644 \u0644\u06CC\u0633\u062A \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u0628\u06CC\u0645\u0627\u0631\u0627\u0646:" }), _jsx("select", { value: selectedPatientId, onChange: (e) => setSelectedPatientId(e.target.value), className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2", children: patients.map((p) => (_jsxs("option", { value: p.id, children: [p.fullName, " (\u06A9\u062F \u067E\u0631\u0648\u0646\u062F\u0647: ", p.fileNumber, ")"] }, p.id))) })] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0648\u0639 \u0641\u0631\u0645 / \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647:" }), _jsx("div", { className: "space-y-2 max-h-[380px] overflow-y-auto pr-1", children: templates.map((tmpl) => (_jsxs("button", { onClick: () => setSelectedTemplateId(tmpl.id), className: `w-full text-right p-3 rounded-xl border text-xs transition ${selectedTemplateId === tmpl.id
                                                ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`, children: [_jsx("div", { className: "font-bold", children: tmpl.title }), _jsxs("div", { className: "text-[10px] text-slate-500 mt-1 flex items-center justify-between", children: [_jsxs("span", { children: ["\u062F\u0633\u062A\u0647: ", tmpl.category] }), tmpl.fields && tmpl.fields.length > 0 && (_jsxs("span", { className: "bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded", children: [tmpl.fields.length, " \u0641\u06CC\u0644\u062F \u0648\u0631\u0648\u062F\u06CC"] }))] })] }, tmpl.id))) })] })] }), _jsxs("div", { className: "lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6", children: [_jsxs("div", { className: "border-b border-slate-200 pb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold text-slate-900", children: activeTemplate?.title }), _jsxs("div", { className: "text-xs text-slate-600 mt-1 flex items-center gap-3", children: [_jsxs("span", { children: ["\u0628\u06CC\u0645\u0627\u0631: ", _jsx("strong", { className: "text-slate-900 font-bold", children: activePatient?.fullName })] }), _jsxs("span", { children: ["\u06A9\u062F \u0645\u0644\u06CC: ", _jsx("strong", { className: "text-slate-900 font-bold", children: activePatient?.nationalId || '---' })] }), _jsxs("span", { children: ["\u067E\u0631\u0648\u0646\u062F\u0647: ", _jsx("strong", { className: "text-slate-900 font-bold", children: activePatient?.fileNumber })] })] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("button", { type: "button", onClick: () => setPrintModalData({
                                                title: activeTemplate?.title || 'فرم رضایت‌نامه',
                                                patientName: activePatient?.fullName || 'بیمار',
                                                fileNumber: activePatient?.fileNumber || 'CL-000',
                                                nationalId: activePatient?.nationalId || '---',
                                                bodyText: renderedFormText,
                                                fieldValues,
                                                date: getJalaliDateString(),
                                            }), className: "flex items-center gap-1.5 text-xs font-bold border border-slate-300 hover:bg-slate-100 p-2 rounded-lg", children: [_jsx(Printer, { className: "w-4 h-4 text-slate-700" }), "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u0686\u0627\u067E"] }) })] }), _jsx("div", { className: "p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 font-medium whitespace-pre-line", children: renderedFormText }), activeTemplate?.fields && activeTemplate.fields.length > 0 && (_jsxs("div", { className: "p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3", children: [_jsxs("h4", { className: "text-xs font-bold text-purple-900 flex items-center gap-1.5", children: [_jsx(Info, { className: "w-4 h-4 text-purple-600" }), "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC \u0627\u06CC\u0646 \u0641\u0631\u0645 (\u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u0633\u0641\u0627\u0631\u0634\u06CC):"] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: activeTemplate.fields.map((f) => (_jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1", children: [f.label, " ", f.required && _jsx("span", { className: "text-rose-600", children: "*" }), ":"] }), f.type === 'select' ? (_jsxs("select", { value: fieldValues[f.id] || '', onChange: (e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value }), className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white", children: [_jsx("option", { value: "", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F..." }), f.options?.map((opt, i) => (_jsx("option", { value: opt, children: opt }, i)))] })) : f.type === 'textarea' ? (_jsx("textarea", { rows: 2, value: fieldValues[f.id] || '', onChange: (e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value }), className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white" })) : (_jsx("input", { type: f.type === 'number' ? 'number' : 'text', value: fieldValues[f.id] || '', onChange: (e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value }), className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white" }))] }, f.id))) })] })), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2", children: [_jsxs("div", { className: "border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-bold text-slate-800", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(PenTool, { className: "w-4 h-4 text-teal-600" }), "\u0645\u062D\u0644 \u0627\u0645\u0636\u0627\u06CC \u062F\u06CC\u062C\u06CC\u062A\u0627\u0644 \u0628\u06CC\u0645\u0627\u0631:"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowTabletPad(true), className: "text-[10px] text-teal-700 font-bold hover:underline", children: "امضا با تبلت / قلم" }), _jsx("button", { type: "button", onClick: () => { clearSignature(); setExternalSignature(null); }, className: "text-[10px] text-rose-600 font-bold hover:underline", children: "\u067E\u0627\u06A9 \u06A9\u0631\u062F\u0646 \u0627\u0645\u0636\u0627" })] })] }), _jsx("canvas", { ref: canvasRef, width: 300, height: 120, onMouseDown: startDrawing, onMouseMove: draw, onMouseUp: stopDrawing, onMouseLeave: stopDrawing, className: "w-full h-28 bg-white border border-dashed border-slate-300 rounded-lg cursor-crosshair touch-none" })] }), _jsxs("div", { className: "border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2 flex flex-col justify-between", children: [_jsx("div", { className: "flex items-center justify-between text-xs font-bold text-slate-800", children: _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Fingerprint, { className: "w-4 h-4 text-teal-600" }), "\u062B\u0628\u062A \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u0628\u06CC\u0648\u0645\u062A\u0631\u06CC\u06A9:"] }) }), _jsx("div", { className: "h-28 bg-white border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-2 text-center", children: fingerprintCaptured ? (_jsxs("div", { className: "text-emerald-700 text-xs font-bold flex flex-col items-center gap-1", children: [_jsx(Fingerprint, { className: "w-8 h-8 text-emerald-600" }), _jsx("span", { children: "\u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F" })] })) : (_jsxs("button", { type: "button", onClick: () => setFingerprintCaptured(true), className: "flex flex-col items-center gap-1 text-slate-400 hover:text-teal-600 text-xs transition font-bold", children: [_jsx(Fingerprint, { className: "w-8 h-8" }), _jsx("span", { children: "\u062C\u0647\u062A \u0627\u0633\u06A9\u0646 \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F" })] })) })] })] }), _jsx("div", { className: "pt-4 border-t border-slate-200 flex justify-end gap-3", children: _jsxs("button", { onClick: handleSaveConsent, className: "flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md", children: [_jsx(CheckCircle2, { className: "w-4 h-4" }), "\u062A\u0623\u06CC\u06CC\u062F \u0646\u0647\u0627\u06CC\u06CC\u060C \u062B\u0628\u062A \u062F\u06CC\u062C\u06CC\u062A\u0627\u0644 \u0648 \u0686\u0627\u067E \u0641\u0631\u0645"] }) })] })] })), activeTab === 'builder' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between bg-purple-900 text-white p-4 rounded-xl shadow-sm", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-sm", children: "\u067E\u0646\u0644 \u0633\u0627\u062E\u062A \u0648 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0642\u0627\u0644\u0628\u200C\u0647\u0627\u06CC \u0641\u0631\u0645 \u0648 \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647 (\u0648\u06CC\u0698\u0647 \u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645)" }), _jsx("p", { className: "text-xs text-purple-200 mt-0.5", children: "\u0637\u0631\u0627\u062D\u06CC \u0627\u0646\u0648\u0627\u0639 \u0641\u0631\u0645 \u0628\u0627 \u06A9\u0644\u06CC\u06A9 \u0631\u0648\u06CC \u0645\u062A\u063A\u06CC\u0631\u0647\u0627\u06CC \u0641\u0627\u0631\u0633\u06CC\u060C \u0627\u0641\u0632\u0648\u062F\u0646 \u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u062F\u0644\u062E\u0648\u0627\u0647 \u0648 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0627\u0645\u0636\u0627" })] }), _jsxs("button", { type: "button", onClick: handleNewTemplate, className: "bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition shadow", children: [_jsx(Plus, { className: "w-4 h-4" }), "\u0627\u06CC\u062C\u0627\u062F \u0641\u0631\u0645 / \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647 \u062C\u062F\u06CC\u062F"] })] }), editingTemplateId ? (_jsxs("form", { onSubmit: handleSaveTemplate, className: "bg-white rounded-xl border border-slate-200 p-6 space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [_jsx("h4", { className: "font-bold text-slate-900 text-sm", children: editingTemplateId === 'new' ? 'ساخت فرم جدید' : 'ویرایش فرم موجود' }), _jsx("button", { type: "button", onClick: () => setEditingTemplateId(null), className: "text-slate-500 hover:text-slate-800 text-xs font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641 \u2715" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1", children: "\u0639\u0646\u0648\u0627\u0646 \u0641\u0631\u0645 / \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647:" }), _jsx("input", { type: "text", value: builderTitle, onChange: (e) => setBuilderTitle(e.target.value), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647 \u0622\u06AF\u0627\u0647\u0627\u0646\u0647 \u062A\u0632\u0631\u06CC\u0642 \u0698\u0644", className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1", children: "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u0641\u0631\u0645:" }), _jsx("input", { type: "text", value: builderCategory, onChange: (e) => setBuilderCategory(e.target.value), placeholder: "\u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647 / \u062A\u0631\u06CC\u0627\u0698 / \u0645\u0627\u0644\u06CC / \u0639\u0645\u0648\u0645\u06CC", className: "w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5", required: true })] })] }), _jsxs("div", { className: "bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("label", { className: "block text-xs font-bold text-slate-800 flex items-center gap-1.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-teal-500" }), _jsx("span", { children: "\u0644\u06CC\u0633\u062A \u0645\u062A\u063A\u06CC\u0631\u0647\u0627\u06CC \u0639\u0645\u0648\u0645\u06CC \u0628\u0647 \u0632\u0628\u0627\u0646 \u0633\u0627\u062F\u0647 (\u0631\u0648\u06CC \u0647\u0631 \u0645\u062A\u063A\u06CC\u0631 \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F \u062A\u0627 \u062F\u0631 \u0645\u062D\u0644 \u0645\u06A9\u0627\u0646\u200C\u0646\u0645\u0627 \u062F\u0631\u062C \u0634\u0648\u062F):" })] }), _jsxs("div", { className: "flex items-center gap-1.5 text-[11px]", children: [_jsx("span", { className: "text-slate-500 font-bold hidden sm:inline", children: "\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0633\u0631\u06CC\u0639 \u0627\u0644\u06AF\u0648:" }), _jsx("button", { type: "button", onClick: () => {
                                                            setBuilderTitle('رضایت‌نامه آگاهانه خدمات درمانی و زیبایی');
                                                            setBuilderCategory('رضایت‌نامه');
                                                            setBuilderBodyText('اینجانب [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] و شماره همراه [شماره همراه] (کد پرونده: [کد پرونده]) با آگاهی کامل و رضایت کتبی، درخواست انجام خدمت [نوع خدمت] توسط پزشک معالج [پزشک معالج] در [نام کلینیک] در تاریخ [تاریخ امروز] را دارم.');
                                                        }, className: "bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-300 transition text-[10px]", children: "\u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647 \u0646\u0645\u0648\u0646\u0647" }), _jsx("button", { type: "button", onClick: () => {
                                                            setBuilderTitle('گزارش خلاصه پرونده و مفاصا حساب مالی');
                                                            setBuilderCategory('گزارش مالی');
                                                            setBuilderBodyText('گزارش رسمی خلاصه خدمات و تسویه حساب بیمار:\nبدین‌وسیله گواهی می‌شود آقای/خانم [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] در تاریخ [تاریخ امروز] - ساعت [ساعت پذیرش] به [نام کلینیک] مراجعه نموده و بابت [نوع خدمت] مبلغ [مبلغ فاکتور] تسویه گردید.');
                                                        }, className: "bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-300 transition text-[10px]", children: "\u06AF\u0632\u0627\u0631\u0634 \u0645\u0627\u0644\u06CC \u0646\u0645\u0648\u0646\u0647" }), _jsx("button", { type: "button", onClick: () => {
                                                            setBuilderTitle('گواهی استعلاجی و استراحت پزشکی');
                                                            setBuilderCategory('گواهی پزشکی');
                                                            setBuilderBodyText('بدین‌وسیله گواهی می‌شود آقای/خانم [اسم بیمار] فرزند [نام پدر] به شماره ملی [کد ملی] در تاریخ [تاریخ امروز] در [نام کلینیک] تحت معاینه [پزشک معالج] قرار گرفتند.');
                                                        }, className: "bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300 transition text-[10px]", children: "\u06AF\u0648\u0627\u0647\u06CC \u067E\u0632\u0634\u06A9\u06CC" })] })] }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: PERSIAN_PLACEHOLDERS.map((p) => {
                                            let badgeBg = 'bg-teal-50 hover:bg-teal-100 border-teal-300 text-teal-900';
                                            if (p.category === 'patient')
                                                badgeBg = 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-900';
                                            if (p.category === 'treatment')
                                                badgeBg = 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900';
                                            if (p.category === 'date')
                                                badgeBg = 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900';
                                            if (p.category === 'clinic')
                                                badgeBg = 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-900';
                                            return (_jsxs("button", { type: "button", onClick: () => handleInsertPlaceholder(p.key), className: `border font-bold text-xs px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 ${badgeBg}`, title: `${p.description} (نمونه: ${p.example})`, children: [_jsx(Plus, { className: "w-3 h-3 opacity-70" }), _jsx("span", { children: p.label }), _jsxs("span", { className: "text-[10px] opacity-60 font-mono", children: ["(", p.key, ")"] })] }, p.key));
                                        }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1", children: "\u0645\u062A\u0646 \u0627\u0635\u0644\u06CC \u0641\u0631\u0645 \u06CC\u0627 \u06AF\u0632\u0627\u0631\u0634 (\u062D\u0627\u0648\u06CC \u0645\u062A\u063A\u06CC\u0631\u0647\u0627):" }), _jsx("textarea", { ref: textareaRef, rows: 8, value: builderBodyText, onChange: (e) => setBuilderBodyText(e.target.value), placeholder: "\u0645\u062A\u0646 \u0641\u0631\u0645 \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u062A\u0627\u06CC\u067E \u06A9\u0646\u06CC\u062F \u0648 \u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u0645\u062A\u063A\u06CC\u0631 \u0628\u0627\u0644\u0627 \u062C\u0647\u062A \u062F\u0631\u062C \u0622\u0633\u0627\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0646\u0645\u0627\u06CC\u06CC\u062F...", className: "w-full text-xs font-bold border border-slate-300 rounded-xl p-3 leading-relaxed text-slate-800 focus:ring-2 focus:ring-purple-500 bg-white", required: true }), _jsx("p", { className: "text-[11px] text-slate-500 mt-1", children: "\uD83D\uDCA1 \u0628\u0627 \u06A9\u0644\u06CC\u06A9 \u0631\u0648\u06CC \u0647\u0631 \u0645\u062A\u063A\u06CC\u0631 \u0628\u0627\u0644\u0627\u06CC \u06A9\u0627\u062F\u0631\u060C \u0639\u0628\u0627\u0631\u062A \u0645\u0631\u0628\u0648\u0637\u0647 \u0628\u0647 \u0637\u0648\u0631 \u062E\u0648\u062F\u06A9\u0627\u0631 \u062F\u0642\u06CC\u0642\u0627\u064B \u062F\u0631 \u0645\u062D\u0644 \u0686\u0634\u0645\u06A9\u200C\u0632\u0646 \u0642\u0644\u0645 \u062A\u0627\u06CC\u067E \u0645\u06CC\u200C\u06AF\u0631\u062F\u062F." })] }), _jsxs("div", { className: "bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 flex flex-col justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2 mb-2", children: [_jsxs("span", { className: "text-xs font-bold text-teal-400 flex items-center gap-1.5", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-teal-400" }), "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u0632\u0646\u062F\u0647 \u062E\u0631\u0648\u062C\u06CC (\u0628\u0627 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0646\u0645\u0648\u0646\u0647 \u0628\u06CC\u0645\u0627\u0631):"] }), _jsx("span", { className: "text-[10px] bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded", children: "\u0645\u0634\u0627\u0647\u062F\u0647 \u0644\u062D\u0638\u0647\u200C\u0627\u06CC" })] }), _jsx("div", { className: "text-xs leading-relaxed text-slate-200 whitespace-pre-line bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 font-medium", children: replacePersianPlaceholders(builderBodyText, {
                                                            patientName: 'بیمار نمونه',
                                                            nationalId: '۰۰۱۲۳۴۵۶۷۸',
                                                            fatherName: 'محمد',
                                                            mobilePhone: '۰۹۱۲۳۴۵۶۷۸۹',
                                                            fileNumber: 'CL-10042',
                                                            age: '۳۲',
                                                            gender: 'مرد',
                                                            doctorName: 'پزشک معالج مرکز',
                                                            serviceName: 'تزریق ژل و بوتاکس زیبایی',
                                                            invoiceAmount: '۲,۵۰۰,۰۰۰ تومان',
                                                            todayJalali: getJalaliDateString(),
                                                            receptionTime: '۱۰:۳۰',
                                                            clinicName: settings.clinicName || 'مرکز درمانی',
                                                            clinicAddress: settings.address || 'تهران، خیابان ولیعصر',
                                                        }) || _jsx("span", { className: "text-slate-500 italic", children: "\u0645\u062A\u0646 \u0641\u0631\u0645 \u062E\u0627\u0644\u06CC \u0627\u0633\u062A..." }) })] }), _jsxs("div", { className: "text-[10px] text-slate-400 pt-3 mt-3 border-t border-slate-800 flex items-center justify-between", children: [_jsx("span", { children: "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u0628\u0627 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0646\u0645\u0648\u0646\u0647 \u0628\u06CC\u0645\u0627\u0631 \u00AB\u0628\u06CC\u0645\u0627\u0631 \u0646\u0645\u0648\u0646\u0647\u00BB" }), _jsx("span", { children: "\u0627\u0645\u0636\u0627 \u0648 \u0627\u062B\u0631\u0627\u0646\u06AF\u0634\u062A \u0628\u06CC\u0645\u0627\u0631 \u062F\u0631 \u0632\u0645\u0627\u0646 \u067E\u0630\u06CC\u0631\u0634 \u0627\u062E\u0630 \u0645\u06CC\u200C\u0634\u0648\u062F" })] })] })] }), _jsxs("div", { className: "border-t border-slate-200 pt-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-bold text-slate-800", children: "\u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u0633\u0641\u0627\u0631\u0634\u06CC \u0648\u0631\u0648\u062F\u06CC (\u062F\u0631 \u0635\u0648\u0631\u062A \u0646\u06CC\u0627\u0632 \u0628\u0647 \u062F\u0631\u06CC\u0627\u0641\u062A \u0639\u062F\u062F/\u0645\u062A\u0646/\u0627\u0646\u062A\u062E\u0627\u0628):" }), _jsxs("button", { type: "button", onClick: handleAddCustomField, className: "text-xs font-bold text-purple-700 hover:text-purple-900 border border-purple-200 bg-purple-50 px-3 py-1 rounded-lg flex items-center gap-1", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "\u0627\u0641\u0632\u0648\u062F\u0646 \u0641\u06CC\u0644\u062F \u062C\u062F\u06CC\u062F"] })] }), builderFields.length > 0 && (_jsx("div", { className: "space-y-2", children: builderFields.map((field, idx) => (_jsxs("div", { className: "flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs", children: [_jsx("input", { type: "text", value: field.label, onChange: (e) => {
                                                        const copy = [...builderFields];
                                                        copy[idx].label = e.target.value;
                                                        setBuilderFields(copy);
                                                    }, placeholder: "\u0639\u0646\u0648\u0627\u0646 \u0641\u06CC\u0644\u062F...", className: "flex-1 border rounded p-1.5 font-bold" }), _jsxs("select", { value: field.type, onChange: (e) => {
                                                        const copy = [...builderFields];
                                                        copy[idx].type = e.target.value;
                                                        setBuilderFields(copy);
                                                    }, className: "border rounded p-1.5 font-bold", children: [_jsx("option", { value: "text", children: "\u0645\u062A\u0646 \u062A\u06A9\u200C\u062E\u0637\u06CC" }), _jsx("option", { value: "number", children: "\u0639\u062F\u062F\u06CC" }), _jsx("option", { value: "textarea", children: "\u0645\u062A\u0646 \u0686\u0646\u062F\u062E\u0637\u06CC" }), _jsx("option", { value: "select", children: "\u0645\u0646\u0648\u06CC \u06A9\u0634\u0648\u06CC\u06CC" })] }), _jsx("button", { type: "button", onClick: () => setBuilderFields(builderFields.filter((_, i) => i !== idx)), className: "text-rose-600 hover:text-rose-800 p-1", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }, field.id))) }))] }), _jsxs("div", { className: "flex justify-end gap-2 border-t border-slate-200 pt-4", children: [_jsx("button", { type: "button", onClick: () => setEditingTemplateId(null), className: "px-4 py-2 border rounded-lg text-xs font-bold text-slate-600", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow", children: "\u0630\u062E\u06CC\u0631\u0647 \u0642\u0627\u0644\u0628 \u0641\u0631\u0645" })] })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: templates.map((tmpl) => (_jsxs("div", { className: "bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-bold text-slate-900 text-xs", children: tmpl.title }), _jsx("span", { className: "text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full mt-1 inline-block", children: tmpl.category })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => handleEditTemplate(tmpl), className: "p-1 text-slate-500 hover:text-purple-700", title: "\u0648\u06CC\u0631\u0627\u06CC\u0634", children: _jsx(Edit3, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDeleteTemplate(tmpl.id, tmpl.title), className: "p-1 text-slate-500 hover:text-rose-600", title: "\u062D\u0630\u0641", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }), _jsx("p", { className: "text-[11px] text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed font-medium", children: tmpl.contentMarkdown }), _jsxs("div", { className: "text-[10px] text-slate-400 font-bold border-t pt-2 flex justify-between", children: [_jsxs("span", { children: ["\u0641\u06CC\u0644\u062F\u0647\u0627\u06CC \u0627\u062E\u062A\u0635\u0627\u0635\u06CC: ", tmpl.fields?.length || 0] }), _jsx("span", { children: "\u0627\u0645\u0636\u0627/\u0627\u062B\u0631\u0627\u0646\u06AF\u0634\u062A: \u0641\u0639\u0627\u0644" })] })] }, tmpl.id))) }))] })), activeTab === 'archive' && (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 p-5 space-y-4", children: [_jsx("h3", { className: "font-bold text-slate-800 text-sm", children: "\u0644\u06CC\u0633\u062A \u0641\u0631\u0645\u200C\u0647\u0627 \u0648 \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u062B\u0628\u062A\u200C\u0634\u062F\u0647" }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-slate-200", children: _jsxs("table", { className: "w-full text-right text-xs text-slate-700", children: [_jsx("thead", { className: "bg-slate-100 text-slate-800 font-bold border-b border-slate-200", children: _jsxs("tr", { children: [_jsx("th", { className: "p-3", children: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631" }), _jsx("th", { className: "p-3", children: "\u06A9\u062F \u0645\u0644\u06CC / \u067E\u0631\u0648\u0646\u062F\u0647" }), _jsx("th", { className: "p-3", children: "\u0639\u0646\u0648\u0627\u0646 \u0641\u0631\u0645" }), _jsx("th", { className: "p-3", children: "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A" }), _jsx("th", { className: "p-3", children: "\u0627\u0645\u0636\u0627 / \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A" }), _jsx("th", { className: "p-3", children: "\u0639\u0645\u0644\u06CC\u0627\u062A" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-200", children: signedConsents.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "p-6 text-center text-slate-500 font-bold", children: "\u0647\u0646\u0648\u0632 \u0647\u06CC\u0686 \u0641\u0631\u0645 \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u062B\u0628\u062A \u0646\u06AF\u0631\u062F\u06CC\u062F\u0647 \u0627\u0633\u062A." }) })) : (signedConsents.map((sc) => (_jsxs("tr", { className: "hover:bg-slate-50", children: [_jsx("td", { className: "p-3 font-bold text-slate-900", children: _jsx("button", { type: "button", onClick: () => onOpenPatientProfile && onOpenPatientProfile(sc.patientId || sc.patientName), className: "text-teal-800 hover:text-teal-900 underline decoration-teal-400 font-bold hover:bg-teal-50 px-1.5 py-0.5 rounded transition text-right", title: "\u0645\u0634\u0627\u0647\u062F\u0647 \u0634\u0646\u0627\u0633\u0646\u0627\u0645\u0647\u060C \u067E\u0630\u06CC\u0631\u0634 \u0645\u062C\u062F\u062F \u0648 \u0633\u0648\u0627\u0628\u0642 \u0628\u06CC\u0645\u0627\u0631", children: sc.patientName }) }), _jsx("td", { className: "p-3 font-mono", children: sc.archivedFileNumber }), _jsx("td", { className: "p-3 font-bold", children: sc.formTitle }), _jsx("td", { className: "p-3 font-mono text-slate-500", children: sc.jalaliDate }), _jsx("td", { className: "p-3", children: _jsx("span", { className: "text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200", children: "\u062B\u0628\u062A \u0634\u062F\u0647" }) }), _jsx("td", { className: "p-3", children: _jsxs("button", { type: "button", onClick: () => setPrintModalData({
                                                        title: sc.formTitle,
                                                        patientName: sc.patientName,
                                                        fileNumber: sc.archivedFileNumber,
                                                        nationalId: sc.patientNationalId || '---',
                                                        bodyText: sc.filledText || 'متن فرم بوسیله سیستم بایگانی گردیده است.',
                                                        signatureDataUrl: sc.signatureDataUrl,
                                                        fingerprintCaptured: !!sc.fingerprintDataUrl,
                                                        date: sc.jalaliDate,
                                                    }), className: "flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-2.5 py-1 rounded border border-teal-300", children: [_jsx(Printer, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0686\u0627\u067E \u0646\u0633\u062E\u0647" })] }) })] }, sc.id)))) })] }) })] })), printModalData && (_jsx("div", { className: "fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col", children: [_jsxs("div", { className: "bg-slate-900 text-white p-4 font-bold flex items-center justify-between", children: [_jsx("span", { children: "\u0646\u0633\u062E\u0647 \u0631\u0633\u0645\u06CC \u062C\u0647\u062A \u0686\u0627\u067E \u0648 \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u06CC\u0645\u0627\u0631" }), _jsx("button", { onClick: () => setPrintModalData(null), className: "text-slate-300 hover:text-white", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-6 overflow-y-auto flex-1 font-serif", id: "printableFormDoc", children: [_jsxs("div", { className: "border-b-2 border-slate-800 pb-4 text-center space-y-1", children: [_jsx("h2", { className: "text-lg font-bold text-slate-900", children: settings.clinicName || 'مرکز درمانی' }), _jsxs("div", { className: "text-xs text-slate-600 font-sans", children: [settings.address || 'تهران، خیابان ولیعصر', " | \u062A\u0644\u0641\u0646: ", settings.phone || '۰۲۱-۸۸۸۸۸۸۸۸'] }), _jsx("div", { className: "text-sm font-bold text-slate-800 pt-2", children: printModalData.title })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-300 text-xs font-sans", children: [_jsxs("div", { children: ["\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631: ", _jsx("strong", { children: printModalData.patientName })] }), _jsxs("div", { children: ["\u06A9\u062F \u0645\u0644\u06CC: ", _jsx("strong", { children: printModalData.nationalId })] }), _jsxs("div", { children: ["\u06A9\u062F \u067E\u0631\u0648\u0646\u062F\u0647: ", _jsx("strong", { children: printModalData.fileNumber })] }), _jsxs("div", { children: ["\u062A\u0627\u0631\u06CC\u062E: ", _jsx("strong", { children: printModalData.date })] })] }), _jsx("div", { className: "text-xs leading-relaxed text-slate-800 text-justify font-sans whitespace-pre-line border-b pb-4", children: printModalData.bodyText }), _jsxs("div", { className: "grid grid-cols-2 gap-6 pt-4 text-xs font-sans", children: [_jsxs("div", { className: "border border-slate-300 p-3 rounded text-center space-y-2", children: [_jsx("div", { className: "font-bold", children: "\u0627\u0645\u0636\u0627 \u0648 \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A \u0628\u06CC\u0645\u0627\u0631 / \u0648\u0644\u06CC \u0642\u0627\u0646\u0648\u0646\u06CC:" }), printModalData.signatureDataUrl ? (_jsx("img", { src: printModalData.signatureDataUrl, alt: "\u0627\u0645\u0636\u0627", className: "h-16 mx-auto object-contain" })) : (_jsx("div", { className: "h-16 flex items-center justify-center text-slate-400 font-bold", children: "\u0627\u0645\u0636\u0627\u06CC \u062F\u06CC\u062C\u06CC\u062A\u0627\u0644 \u062B\u0628\u062A \u0634\u062F" }))] }), _jsxs("div", { className: "border border-slate-300 p-3 rounded text-center space-y-2", children: [_jsx("div", { className: "font-bold", children: "\u0645\u0647\u0631 \u0648 \u0627\u0645\u0636\u0627\u06CC \u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C / \u062F\u0631\u0645\u0627\u0646\u06AF\u0627\u0647:" }), _jsx("div", { className: "h-16 flex items-center justify-center text-slate-400 italic font-bold", children: "[\u0645\u0647\u0631 \u0645\u0631\u06A9\u0632 \u062F\u0631\u0645\u0627\u0646\u06CC]" })] })] })] }), _jsxs("div", { className: "p-4 bg-slate-100 border-t flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setPrintModalData(null), className: "px-4 py-2 border rounded-lg text-xs font-bold bg-white", children: "\u0628\u0633\u062A\u0646" }), _jsxs("button", { type: "button", onClick: () => window.print(), className: "px-5 py-2 bg-teal-600 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow", children: [_jsx(Printer, { className: "w-4 h-4" }), "\u067E\u0631\u06CC\u0646\u062A \u0641\u0631\u0645 \u0631\u0633\u0645\u06CC"] })] })] }) })), showTabletPad && _jsx(DigitalSignaturePad, {
        isOpen: showTabletPad,
        onClose: () => setShowTabletPad(false),
        patient: activePatient || {},
        formTitle: activeTemplate?.title || 'فرم رضایت‌نامه',
        settings,
        onSave: (sig) => {
            setExternalSignature(sig);
            setHasSignature(true);
        },
    })] }));
};
