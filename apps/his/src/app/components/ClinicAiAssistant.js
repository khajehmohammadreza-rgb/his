import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "../../client-vendor/react-jsx-runtime.js?b=r24-514-1405";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from '../../client-vendor/react.js?b=r24-514-1405';
import { Bot, X, Send, Sparkles, Stethoscope, HeartPulse, UserCheck, Pill, Copy, Check, Volume2, Maximize2, Minimize2, FileText, ChevronDown, ChevronUp, Mic, MicOff } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { formatCurrency } from '../utils/jalali.js?b=r24-514-1405';
export const ClinicAiAssistant = ({ patients = [], appointments = [], doctors = [], medicalServices = [], visitQueue = [], products = [], salesInvoices = [], expenses = [], currentUser, isSuperAdmin = false, }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [assistantPos, setAssistantPos] = useState(() => { try { const p = JSON.parse(localStorage.getItem('bastiyan_lilian_pos') || 'null'); return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : { x: 20, y: Math.max(80, window.innerHeight - 92) }; } catch { return { x: 20, y: Math.max(80, window.innerHeight - 92) }; }});
    const dragRef = useRef({ dragging:false, dx:0, dy:0 });
    const beginAssistantDrag = (e) => { if (e.button !== 0) return; e.preventDefault(); dragRef.current = { dragging:true, dx:e.clientX-assistantPos.x, dy:e.clientY-assistantPos.y }; const move=(ev)=>{ if(!dragRef.current.dragging) return; const x=Math.max(8,Math.min(window.innerWidth-90,ev.clientX-dragRef.current.dx)); const y=Math.max(8,Math.min(window.innerHeight-58,ev.clientY-dragRef.current.dy)); setAssistantPos({x,y}); }; const up=()=>{ dragRef.current.dragging=false; localStorage.setItem('bastiyan_lilian_pos', JSON.stringify(assistantPos)); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); }; window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); };
    useEffect(() => { try { localStorage.setItem('bastiyan_lilian_pos', JSON.stringify(assistantPos)); } catch {} }, [assistantPos]);
    const [activeRole, setActiveRole] = useState('doctor');
    const [activeMode, setActiveMode] = useState('clinical');
    const [showPatientDrawer, setShowPatientDrawer] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    // Patient Context State
    const [patientCtx, setPatientCtx] = useState({
        patientName: '',
        age: '',
        gender: 'زن',
        chiefComplaint: '',
        history: '',
        currentMeds: '',
        allergies: '',
        vitals: { bp: '', hr: '', temp: '', spo2: '' },
        labResults: '',
    });
    const [input, setInput] = useState('');
    // Speech Recognition State
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const recognitionRef = useRef(null);
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechSupported(false);
        }
    }, []);
    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('متأسفانه مرورگر شما از قابلیت تایپ صوتی (Web Speech API) پشتیبانی نمی‌کند. لطفاً از مرورگر Google Chrome یا Edge استفاده نمایید.');
            return;
        }
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            return;
        }
        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'fa-IR'; // Persian Speech Dictation
            recognition.continuous = true;
            recognition.interimResults = true;
            const baseText = input;
            recognition.onstart = () => {
                setIsListening(true);
            };
            recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                    else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                const dictated = finalTranscript || interimTranscript;
                if (dictated) {
                    setInput((baseText ? baseText + ' ' : '') + dictated);
                }
            };
            recognition.onerror = (event) => {
                console.warn('Speech recognition event error:', event.error);
                if (event.error !== 'no-speech') {
                    setIsListening(false);
                }
            };
            recognition.onend = () => {
                setIsListening(false);
            };
            recognitionRef.current = recognition;
            recognition.start();
        }
        catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsListening(false);
        }
    };
    const [messages, setMessages] = useState([
        {
            id: 'welcome_msg',
            sender: 'ai',
            text: `سلام! من **لیلیان (Lilian)**، دستیار هوشمند عملیاتی Bastiyan HIS هستم. 🌸✨

💡 **قابلیت‌های من در سیستم کلینیک:**
• 🔍 **جستجوی هوشمند بیماران:** بپرسید: *«شماره پرونده بیمار را بده»* یا *«پرونده بیمار نمونه»*
• 📅 **استعلام نوبت‌ها و صف پذیرش:** بپرسید: *«امروز چه بیمارانی وقت دارند؟»*
• 🩺 **مشاوره بالینی و پزشکی:** بررسی تشخیص افتراقی، تداخل دارویی، دوزسنجی و دستورات عمل.
• 💰 **تعرفه خدمات و انبار:** بپرسید: *«هزینه تزریق بوتاکس چقدره؟»* یا *«موجودی سرم»*
• 🎙️ **تایپ صوتی (Dictation):** می‌توانید با کلیک روی آیکون میکروفون صوتی صحبت کنید.

چگونه می‌توانم به شما کمک کنم؟`,
            time: 'اکنون',
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    // Keyboard shortcut Ctrl + K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isLoading]);
    const hasPatientData = Boolean(patientCtx.patientName || patientCtx.chiefComplaint || patientCtx.history || patientCtx.currentMeds);
    // Search Clinic Database Locally for Instant Context Match
    const searchClinicDatabaseLocal = (query) => {
        const q = query.trim().toLowerCase();
        if (!q)
            return null;
        // Search Patients
        const matchedPatients = patients.filter((p) => (p.fullName && p.fullName.toLowerCase().includes(q)) ||
            (p.mobile && p.mobile.includes(q)) ||
            (p.nationalId && p.nationalId.includes(q)) ||
            q.includes(p.fullName.split(' ')[1] || p.fullName) ||
            p.fullName.split(' ').some((part) => part.length > 2 && q.includes(part.toLowerCase())));
        let report = '';
        if (matchedPatients.length > 0) {
            report += `🔍 **نتایج جستجوی پرونده بیماران در کلینیک توسط لیلیان (${matchedPatients.length} مورد یافت شد):**\n\n`;
            matchedPatients.forEach((p, index) => {
                const pAppts = appointments.filter((a) => a.patientId === p.id || a.patientName === p.fullName);
                const pQueue = visitQueue.filter((v) => v.patientId === p.id || v.patientName === p.fullName);
                report += `**${index + 1}. بیمار ${p.fullName}**\n`;
                report += `• 📞 **شماره تماس:** ${p.mobile || 'ثبت نشده'}\n`;
                report += `• 🆔 **کد ملی:** ${p.nationalId || 'ثبت نشده'}\n`;
                report += `• 🎂 **سن / جنسیت:** ${p.age || '-'} ساله | ${p.gender || 'نامشخص'}\n`;
                if (p.creditConfig?.currentDebt) {
                    report += `• 💳 **مانده بدهی:** ${formatCurrency(p.creditConfig.currentDebt, 'toman')}\n`;
                }
                if (pQueue.length > 0) {
                    report += `• 🏥 **وضعیت پذیرش امروز:** ${pQueue[0].status === 'waiting' ? 'در انتظار ویزیت' : pQueue[0].status === 'in_visit' ? 'در حال ویزیت پزشک' : 'تکمیل شده'} (پزشک: ${pQueue[0].doctorName})\n`;
                }
                if (pAppts.length > 0) {
                    report += `• 📅 **سابقه نوبت‌ها:** ${pAppts.map((a) => `${a.jalaliDate} - ${a.serviceName || 'ویزیت/عمل'} (پزشک: ${a.doctorName || 'دکتر باستیان'})`).join('؛ ')}\n`;
                }
                if (p.surgicalHistory || p.medicalHistory) {
                    report += `• 📝 **سابقه جراحی و درمان:** ${p.surgicalHistory || p.medicalHistory}\n`;
                }
                report += `\n`;
            });
            return report;
        }
        // Search Services
        const matchedServices = medicalServices.filter((s) => s.title.toLowerCase().includes(q) || (s.code && s.code.includes(q)));
        if (matchedServices.length > 0) {
            report += `🩺 **تعرفه و مشخصات خدمات کلینیک:**\n\n`;
            matchedServices.forEach((s) => {
                report += `• **${s.title}** (کد: ${s.code || '-'}): ${formatCurrency(s.price, 'toman')}\n`;
            });
            return report;
        }
        // Search Products
        const matchedProducts = products.filter((p) => p.name.toLowerCase().includes(q) || (p.code && p.code.includes(q)));
        if (matchedProducts.length > 0) {
            report += `📦 **موجودی انبار درمانگاه:**\n\n`;
            matchedProducts.forEach((p) => {
                report += `• **${p.name}**: موجودی ${p.stockQuantity} ${p.unit || 'عدد'} (حداقل حد مجاز: ${p.minStock})\n`;
            });
            return report;
        }
        return null;
    };
    const handleSend = async (customPrompt) => {
        const query = (customPrompt || input).trim();
        if (!query || isLoading)
            return;
        const userMsgId = `user_${Date.now()}`;
        const userMsg = {
            id: userMsgId,
            sender: 'user',
            text: query,
            time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            role: activeRole,
            mode: activeMode,
        };
        setMessages((prev) => [...prev, userMsg]);
        if (!customPrompt)
            setInput('');
        setIsLoading(true);
        try {
            const clinicSnapshot = {
                patientsSummary: patients.slice(0, 30).map((p) => ({
                    id: p.id,
                    name: p.fullName,
                    mobile: p.mobile,
                    nationalId: p.nationalId,
                    age: p.age,
                    debt: p.creditConfig?.currentDebt || 0,
                    surgicalHistory: p.surgicalHistory || '',
                    medicalHistory: p.medicalHistory || '',
                })),
                queueSummary: visitQueue.map((v) => ({
                    patientName: v.patientName,
                    doctorName: v.doctorName,
                    serviceName: v.serviceName,
                    status: v.status,
                })),
                servicesSummary: medicalServices.slice(0, 20).map((s) => ({
                    title: s.title,
                    price: s.price,
                    code: s.code,
                })),
                productsSummary: products.slice(0, 20).map((pr) => ({
                    name: pr.name,
                    stock: pr.stockQuantity,
                    unit: pr.unit,
                })),
                doctorsSummary: doctors.map((d) => ({ name: d.name, specialty: d.specialty })),
            };
            const historyPayload = messages.slice(-8).map((m) => ({
                sender: m.sender,
                text: m.text,
            }));
            const res = await fetch('/api/lilian/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query, role: activeRole, mode: activeMode, history: historyPayload }),
            });
            const data = await res.json();
            if (res.ok && data.success && data.reply) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `ai_${Date.now()}`,
                        sender: 'ai',
                        text: data.reply,
                        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                        role: activeRole,
                        mode: activeMode,
                    },
                ]);
            }
            else {
                const localMatch = searchClinicDatabaseLocal(query);
                const replyText = localMatch ||
                    `اطلاعات درخواستی «${query}» پردازش گردید.\n\n` +
                        (data.reply || 'پاسخ هوشمند لیلیان آماده است.');
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `ai_${Date.now()}`,
                        sender: 'ai',
                        text: replyText,
                        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                        role: activeRole,
                        mode: activeMode,
                    },
                ]);
            }
        }
        catch (err) {
            console.error('[ClinicAiAssistant] Call failed:', err);
            const localMatch = searchClinicDatabaseLocal(query);
            setMessages((prev) => [
                ...prev,
                {
                    id: `ai_${Date.now()}`,
                    sender: 'ai',
                    text: localMatch ||
                        `⚠️ **لیلیان (منشی هوشمند):**\nمتأسفانه در حال حاضر ارتباط با شبکه قطع شده است، اما می‌توانید مستقیم از دیتابیس کلینیک استفاده فرمایید.`,
                    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                    error: !localMatch,
                },
            ]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCopy = (id, text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };
    const handleSpeak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*#`_~]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'fa-IR';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    };
    const resetPatientData = () => {
        setPatientCtx({
            patientName: '',
            age: '',
            gender: 'زن',
            chiefComplaint: '',
            history: '',
            currentMeds: '',
            allergies: '',
            vitals: { bp: '', hr: '', temp: '', spo2: '' },
            labResults: '',
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed z-50 bhis-lilian-trigger", style: { left: `${assistantPos.x}px`, top: `${assistantPos.y}px` }, onPointerDown: beginAssistantDrag, children: _jsxs("button", { onClick: () => setIsOpen(!isOpen), className: "group relative flex items-center gap-2 bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 border border-teal-300/30 font-bold text-xs", title: "\u062F\u0633\u062A\u06CC\u0627\u0631 \u0647\u0648\u0634\u0645\u0646\u062F \u0644\u06CC\u0644\u06CC\u0627\u0646 (Ctrl + K)", children: [_jsx("div", { className: "w-7 h-7 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner", children: _jsx(Sparkles, { className: "w-4 h-4 animate-spin-slow text-amber-300" }) }), _jsxs("div", { className: "flex flex-col text-right hidden sm:flex", children: [_jsx("span", { className: "font-bold text-xs text-white", children: "\u062F\u0633\u062A\u06CC\u0627\u0631 \u0644\u06CC\u0644\u06CC\u0627\u0646 (Lilian)" }), _jsx("span", { className: "text-[9px] text-teal-200 font-mono", children: "\u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9" })] }), _jsx("span", { className: "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" })] }) }), isOpen && (_jsxs("div", { className: `fixed z-50 bhis-lilian-panel bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-right transition-all duration-300 dir-rtl ${isExpanded
                    ? 'inset-4 sm:inset-8'
                    : 'bottom-16 left-3 sm:left-6 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] h-[490px] max-h-[calc(100vh-5rem)]'}`, dir: "rtl", children: [_jsxs("div", { className: "bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 text-white p-3 border-b border-slate-800 flex items-center justify-between shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow", children: _jsx(Bot, { className: "w-4 h-4 text-teal-300" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("h3", { className: "font-bold text-xs text-white", children: "\u062F\u0633\u062A\u06CC\u0627\u0631 \u0644\u06CC\u0644\u06CC\u0627\u0646 (Lilian)" }), _jsx("span", { className: "px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[8.5px] font-mono", children: "AI" })] }), _jsxs("p", { className: "text-[9.5px] text-slate-400 flex items-center gap-1 mt-0.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" }), _jsx("span", { children: "\u0645\u062A\u0635\u0644 \u0628\u0647 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u06A9\u0644\u06CC\u0646\u06CC\u06A9 \u0628\u0627\u0633\u062A\u06CC\u0627\u0646" })] })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => setIsExpanded(!isExpanded), className: "w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-800", title: isExpanded ? 'کوچک کردن' : 'بزرگنمایی کامل', children: isExpanded ? _jsx(Minimize2, { className: "w-3.5 h-3.5" }) : _jsx(Maximize2, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => setIsOpen(false), className: "w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-800", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] })] }), _jsxs("div", { className: "bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-bold shrink-0", children: "\u0646\u0642\u0634 \u0634\u0645\u0627:" }), _jsxs("button", { onClick: () => { setActiveRole('doctor'); setActiveMode('clinical'); }, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition text-[11px] font-medium shrink-0 ${activeRole === 'doctor'
                                    ? 'bg-teal-600 text-white shadow-md font-bold'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`, children: [_jsx(Stethoscope, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u067E\u0632\u0634\u06A9" })] }), _jsxs("button", { onClick: () => { setActiveRole('nurse'); setActiveMode('nursing_protocol'); }, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition text-[11px] font-medium shrink-0 ${activeRole === 'nurse'
                                    ? 'bg-emerald-600 text-white shadow-md font-bold'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`, children: [_jsx(HeartPulse, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u067E\u0631\u0633\u062A\u0627\u0631" })] }), _jsxs("button", { onClick: () => { setActiveRole('receptionist'); setActiveMode('software_guide'); }, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition text-[11px] font-medium shrink-0 ${activeRole === 'receptionist'
                                    ? 'bg-cyan-600 text-white shadow-md font-bold'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`, children: [_jsx(UserCheck, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0645\u0646\u0634\u06CC / \u067E\u0630\u06CC\u0631\u0634" })] }), _jsxs("button", { onClick: () => { setActiveRole('pharmacy'); setActiveMode('drug_interaction'); }, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition text-[11px] font-medium shrink-0 ${activeRole === 'pharmacy'
                                    ? 'bg-purple-600 text-white shadow-md font-bold'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`, children: [_jsx(Pill, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u062F\u0627\u0631\u0648\u062E\u0627\u0646\u0647 \u0648 \u0627\u0646\u0628\u0627\u0631" })] }), isSuperAdmin && (_jsxs("button", { onClick: () => { setActiveRole('development'); setActiveMode('development'); }, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition text-[11px] font-medium shrink-0 ${activeRole === 'development' ? 'bg-fuchsia-600 text-white shadow-md font-bold' : 'bg-slate-800 text-fuchsia-300 hover:bg-slate-700'}`, title: "حالت توسعه فقط برای سوپرادمین", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "توسعه" })] }))] }), _jsxs("div", { className: "bg-slate-900/60 border-b border-slate-800 px-3.5 py-2 flex items-center justify-between text-xs shrink-0", children: [_jsxs("button", { onClick: () => setShowPatientDrawer(!showPatientDrawer), className: "flex items-center gap-2 text-teal-400 hover:text-teal-300 font-bold transition text-[11px]", children: [_jsx(FileText, { className: "w-3.5 h-3.5" }), _jsx("span", { children: hasPatientData
                                            ? `📄 پرونده فعال: ${patientCtx.patientName || 'بیمار بدون نام'} (${patientCtx.age || '-'} ساله)`
                                            : '➕ افزودن/تنظیم پرونده بیمار فعلی (جهت تحلیل تخصصی)' }), showPatientDrawer ? _jsx(ChevronUp, { className: "w-3.5 h-3.5" }) : _jsx(ChevronDown, { className: "w-3.5 h-3.5" })] }), hasPatientData && (_jsx("button", { onClick: resetPatientData, className: "text-[10px] text-rose-400 hover:text-rose-300 transition", children: "\u067E\u0627\u06A9\u0633\u0627\u0632\u06CC \u067E\u0631\u0648\u0646\u062F\u0647" }))] }), showPatientDrawer && (_jsxs("div", { className: "bg-slate-900 p-3.5 border-b border-slate-800 space-y-2.5 text-xs text-slate-200 animate-in slide-in-from-top-2 duration-200 shrink-0", children: [_jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-slate-400 block mb-1", children: "\u0646\u0627\u0645 \u0628\u06CC\u0645\u0627\u0631:" }), _jsx("input", { type: "text", value: patientCtx.patientName, onChange: (e) => setPatientCtx({ ...patientCtx, patientName: e.target.value }), placeholder: "\u0645\u062B\u0644\u0627\u064B: \u0628\u06CC\u0645\u0627\u0631 \u0646\u0645\u0648\u0646\u0647", className: "w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-slate-400 block mb-1", children: "\u0633\u0646:" }), _jsx("input", { type: "text", value: patientCtx.age, onChange: (e) => setPatientCtx({ ...patientCtx, age: e.target.value }), placeholder: "\u0645\u062B\u0644\u0627\u064B: 38", className: "w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-slate-400 block mb-1", children: "\u062C\u0646\u0633\u06CC\u062A:" }), _jsxs("select", { value: patientCtx.gender, onChange: (e) => setPatientCtx({ ...patientCtx, gender: e.target.value }), className: "w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white", children: [_jsx("option", { value: "\u0632\u0646", children: "\u0632\u0646" }), _jsx("option", { value: "\u0645\u0631\u062F", children: "\u0645\u0631\u062F" })] })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-slate-400 block mb-1", children: "\u0634\u06A9\u0627\u06CC\u062A \u0627\u0635\u0644\u06CC (Chief Complaint):" }), _jsx("input", { type: "text", value: patientCtx.chiefComplaint, onChange: (e) => setPatientCtx({ ...patientCtx, chiefComplaint: e.target.value }), placeholder: "\u062F\u0631\u062F \u062D\u0627\u062F \u0634\u06A9\u0645\u06CC\u060C \u062A\u0648\u0631\u0645 \u067E\u0633 \u0627\u0632 \u062C\u0631\u0627\u062D\u06CC...", className: "w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] text-slate-400 block mb-1", children: "\u062F\u0627\u0631\u0648\u0647\u0627\u06CC \u0645\u0635\u0631\u0641\u06CC \u0648 \u062D\u0633\u0627\u0633\u06CC\u062A\u200C\u0647\u0627:" }), _jsx("input", { type: "text", value: patientCtx.currentMeds, onChange: (e) => setPatientCtx({ ...patientCtx, currentMeds: e.target.value }), placeholder: "\u0648\u0627\u0631\u0641\u0627\u0631\u06CC\u0646\u060C \u0645\u062A\u0641\u0648\u0631\u0645\u06CC\u0646\u060C \u0622\u0644\u0631\u0698\u06CC \u0628\u0647 \u067E\u0646\u06CC\u200C\u0633\u06CC\u0644\u06CC\u0646...", className: "w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white" })] })] }), _jsxs("div", { className: "grid grid-cols-4 gap-2 pt-1", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-400 block", children: "\u0641\u0634\u0627\u0631 \u062E\u0648\u0646 (BP):" }), _jsx("input", { type: "text", value: patientCtx.vitals.bp || '', onChange: (e) => setPatientCtx({ ...patientCtx, vitals: { ...patientCtx.vitals, bp: e.target.value } }), placeholder: "120/80", className: "w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white font-mono" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-400 block", children: "\u0636\u0631\u0628\u0627\u0646 (HR):" }), _jsx("input", { type: "text", value: patientCtx.vitals.hr || '', onChange: (e) => setPatientCtx({ ...patientCtx, vitals: { ...patientCtx.vitals, hr: e.target.value } }), placeholder: "78", className: "w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white font-mono" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-400 block", children: "\u062A\u0628 (Temp):" }), _jsx("input", { type: "text", value: patientCtx.vitals.temp || '', onChange: (e) => setPatientCtx({ ...patientCtx, vitals: { ...patientCtx.vitals, temp: e.target.value } }), placeholder: "37.2", className: "w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white font-mono" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[9px] text-slate-400 block", children: "\u0627\u06A9\u0633\u06CC\u0698\u0646 (SpO2):" }), _jsx("input", { type: "text", value: patientCtx.vitals.spo2 || '', onChange: (e) => setPatientCtx({ ...patientCtx, vitals: { ...patientCtx.vitals, spo2: e.target.value } }), placeholder: "98%", className: "w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white font-mono" })] })] }), _jsx("div", { className: "flex justify-end pt-1", children: _jsx("button", { onClick: () => setShowPatientDrawer(false), className: "bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded-lg text-xs font-bold", children: "\u062A\u0623\u06CC\u06CC\u062F \u0648 \u0628\u0633\u062A\u0646 \u06A9\u0627\u062F\u0631 \u067E\u0631\u0648\u0646\u062F\u0647" }) })] })), _jsxs("div", { className: "flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/90 text-xs", children: [messages.map((m) => (_jsxs("div", { className: `flex flex-col ${m.sender === 'user' ? 'items-start' : 'items-end'}`, children: [_jsxs("div", { className: `group relative max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 leading-relaxed whitespace-pre-line shadow-md ${m.sender === 'user'
                                            ? 'bg-teal-600 text-white rounded-tr-none'
                                            : m.error
                                                ? 'bg-rose-950/80 text-rose-200 border border-rose-800 rounded-tl-none'
                                                : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'}`, children: [m.sender === 'ai' && (_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-[10px] text-slate-400", children: [_jsxs("div", { className: "flex items-center gap-1 text-teal-400 font-bold", children: [_jsx(Sparkles, { className: "w-3 h-3" }), _jsx("span", { children: "\u0645\u062F\u06CC\u06A9\u0627\u0644 \u0622\u06CC\u200C\u0622\u06CC" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => handleSpeak(m.text), className: "p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition", title: "\u0642\u0631\u0627\u0626\u062A \u0635\u0648\u062A\u06CC", children: _jsx(Volume2, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => handleCopy(m.id, m.text), className: "p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition flex items-center gap-0.5", title: "\u06A9\u067E\u06CC \u0645\u062A\u0646", children: copiedId === m.id ? (_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-400" })) : (_jsx(Copy, { className: "w-3.5 h-3.5" })) })] })] })), m.text] }), _jsx("span", { className: "text-[9px] text-slate-500 mt-1 px-1 font-mono", children: m.time })] }, m.id))), isLoading && (_jsxs("div", { className: "flex items-center gap-2.5 bg-slate-900 border border-teal-500/30 text-teal-300 p-3.5 rounded-2xl w-fit text-xs animate-pulse", children: [_jsx(Bot, { className: "w-4 h-4 animate-spin text-teal-400" }), _jsx("span", { children: "\u062F\u0633\u062A\u06CC\u0627\u0631 \u0647\u0648\u0634\u0645\u0646\u062F \u062F\u0631 \u062D\u0627\u0644 \u062A\u062D\u0644\u06CC\u0644 \u0628\u0627\u0644\u06CC\u0646\u06CC \u0648 \u062A\u062F\u0648\u06CC\u0646 \u067E\u0627\u0633\u062E..." })] })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "bg-slate-900 border-t border-slate-800 px-3 py-2 flex gap-1.5 overflow-x-auto text-[10.5px] shrink-0 no-scrollbar", children: [activeRole === 'doctor' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleSend('لطفا تداخلات دارویی و هشدارهای مصرف همزمان داروها را برای بیمار تحلیل کن.'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDC8A \u0628\u0631\u0631\u0633\u06CC \u062A\u062F\u0627\u062E\u0644\u0627\u062A \u062F\u0627\u0631\u0648\u06CC\u06CC" }), _jsx("button", { onClick: () => handleSend('پیشنهاد تشخیصی و آزمایش‌های درخواستی برای شکایت بیمار چیست؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83E\uDE7A \u062A\u0634\u062E\u06CC\u0635 \u0627\u0641\u062A\u0631\u0627\u0642\u06CC \u0648 \u067E\u0627\u0631\u0627\u06A9\u0644\u06CC\u0646\u06CC\u06A9" }), _jsx("button", { onClick: () => handleSend('خلاصه سیر بیمار و Progress Note استاندارد برای پرونده بنویس.'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDCDD \u062B\u0628\u062A Progress Note \u067E\u0631\u0648\u0646\u062F\u0647" })] })), activeRole === 'nurse' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleSend('پروتکل دقیق پانسمان زخم و مراقبت‌های پرستاری پس از جراحی چیست؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83E\uDE79 \u062F\u0633\u062A\u0648\u0631\u0627\u0644\u0639\u0645\u0644 \u067E\u0627\u0646\u0633\u0645\u0627\u0646 \u0648 \u0645\u0631\u0627\u0642\u0628\u062A" }), _jsx("button", { onClick: () => handleSend('نحوه محاسبه سرعت قطرات سرم و دوز تزریق داروهای وریدی را توضیح بده.'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDCA7 \u0645\u062D\u0627\u0633\u0628\u0647 \u0642\u0637\u0631\u0627\u062A \u0633\u0631\u0645 \u0648 \u062A\u0632\u0631\u06CC\u0642" }), _jsx("button", { onClick: () => handleSend('علائم خطر (Red Flags) که باید فوراً به پزشک معالج گزارش دهم چیست؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDEA8 \u0639\u0644\u0627\u0626\u0645 \u062E\u0637\u0631 \u062D\u06CC\u0627\u062A\u06CC" })] })), activeRole === 'receptionist' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleSend('مراحل استحقاق‌سنجی بیمه آنلاین و تایید استحقاق درمان چگونه است؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDD0D \u0627\u0633\u062A\u062D\u0642\u0627\u0642\u200C\u0633\u0646\u062C\u06CC \u0628\u06CC\u0645\u0647" }), _jsx("button", { onClick: () => handleSend('طرح درمان چندجلسه‌ای و صورتحساب اقساطی بیمار چگونه ثبت می‌شود؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDCCB \u062B\u0628\u062A \u0637\u0631\u062D \u062F\u0631\u0645\u0627\u0646 \u0648 \u0627\u0642\u0633\u0627\u0637" }), _jsx("button", { onClick: () => handleSend('چگونه رضایت‌نامه الکترونیک را با اثر انگشت ثبت کنم؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDC46 \u0631\u0636\u0627\u06CC\u062A\u200C\u0646\u0627\u0645\u0647 \u0648 \u0627\u0633\u06A9\u0646\u0631 \u0627\u062B\u0631 \u0627\u0646\u06AF\u0634\u062A" })] })), activeRole === 'pharmacy' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleSend('شرایط نگهداری و هشدارهای انقضای اقلام مصرفی اتاق عمل را توضیح دهید.'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDCE6 \u06A9\u0646\u062A\u0631\u0644 \u0627\u0646\u0642\u0636\u0627 \u0648 \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631" }), _jsx("button", { onClick: () => handleSend('معادل‌ها و برندهای جایگزین برای داروهای کمیاب کلینیک چیست؟'), className: "px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg whitespace-nowrap border border-slate-700 transition", children: "\uD83D\uDC8A \u062F\u0627\u0631\u0648\u06CC \u0645\u0639\u0627\u062F\u0644 \u0648 \u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646" })] }))] }), isListening && (_jsxs("div", { className: "bg-rose-950/90 border-t border-rose-800 px-3.5 py-2 flex items-center justify-between text-xs text-rose-200 shrink-0 animate-pulse", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "relative flex h-3 w-3", children: [_jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" }), _jsx("span", { className: "relative inline-flex rounded-full h-3 w-3 bg-rose-500" })] }), _jsx("span", { className: "font-bold text-[11px]", children: "\u062F\u0631 \u062D\u0627\u0644 \u0634\u0646\u06CC\u062F\u0646 \u0648 \u062A\u0627\u06CC\u067E \u0635\u0648\u062A\u06CC (\u0632\u0628\u0627\u0646 \u0641\u0627\u0631\u0633\u06CC)... \u0635\u062D\u0628\u062A \u06A9\u0646\u06CC\u062F" })] }), _jsx("button", { type: "button", onClick: toggleListening, className: "bg-rose-800 hover:bg-rose-700 text-white px-2 py-0.5 rounded text-[10px] font-bold", children: "\u062A\u0648\u0642\u0641 \u0636\u0628\u0637" })] })), _jsxs("form", { onSubmit: (e) => {
                            e.preventDefault();
                            handleSend();
                        }, className: "p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0", children: [_jsx("button", { type: "button", onClick: toggleListening, className: `p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${isListening
                                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-900/50'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`, title: isListening ? 'توقف تایپ صوتی' : 'تایپ صوتی (دیکته کردن متن شرح حال یا پرسش بالینی)', children: isListening ? (_jsx(MicOff, { className: "w-4 h-4 text-white animate-bounce" })) : (_jsx(Mic, { className: "w-4 h-4 text-teal-400" })) }), _jsx("input", { type: "text", value: input, onChange: (e) => setInput(e.target.value), placeholder: isListening
                                    ? 'در حال ضبط صدا... در حال تبدیل کلام به متن...'
                                    : activeRole === 'doctor'
                                        ? 'سوال بالینی، تداخل دارویی یا درخواست تشخیصی...'
                                        : activeRole === 'nurse'
                                            ? 'پروتکل پرستاری، مراقبت زخم، محاسبات دوز...'
                                            : activeRole === 'receptionist'
                                                ? 'راهنمای بیمه، ثبت بیمار، صورتحساب...'
                                                : activeRole === 'development' ? 'درخواست تحلیل داده، گزارش، بکاپ یا توسعه سامانه...' : 'سوال درباره داروها، انبار و موجودی...', className: `flex-1 bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 ${isListening ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-teal-500'}`, disabled: isLoading }), _jsx("button", { type: "submit", disabled: isLoading || !input.trim(), className: "bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center transition shadow-lg shadow-teal-950/50", children: _jsx(Send, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "bg-slate-950 px-3 py-1.5 border-t border-slate-800 text-[9px] text-slate-500 text-center shrink-0", children: "\u26A0\uFE0F \u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06CC \u062C\u0647\u062A \u062A\u0635\u0645\u06CC\u0645\u200C\u06CC\u0627\u0631\u06CC (Decision Support) \u0627\u0633\u062A. \u0645\u0633\u0626\u0648\u0644\u06CC\u062A \u0646\u0647\u0627\u06CC\u06CC \u062A\u0634\u062E\u06CC\u0635\u06CC \u0648 \u062F\u0631\u0645\u0627\u0646\u06CC \u0628\u0627 \u06A9\u0627\u062F\u0631 \u0645\u0639\u0627\u0644\u062C \u0645\u06CC\u200C\u0628\u0627\u0634\u062F." })] }))] }));
};
