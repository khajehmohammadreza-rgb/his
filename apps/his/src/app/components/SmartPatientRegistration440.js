import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, UserPlus, UserCheck, AlertTriangle, X, Save, ChevronLeft, ShieldAlert } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { rankPatients, normalizeLiveText } from '../utils/liveSearch440.js?b=r24-514-1405';
import { calculateAgeFromJalali, calculateBirthDateFromAge, getJalaliDateString } from '../utils/jalali.js?b=r24-514-1405';
import { JalaliDateField } from './JalaliDateField.js?b=r24-514-1405';

const h = React.createElement;
const empty = () => ({ general: '', nationalId: '', firstName: '', lastName: '', mobilePhone: '', age: '', birthDate: '', insuranceProviderId:'', insuranceContractId:'', insurancePolicyNumber:'', insuranceOtherName:'', gender: '', address: '' });
const safeAge = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 130 ? n : ''; };
const nameOf = p => String(p?.fullName || `${p?.firstName || ''} ${p?.lastName || ''}`).trim() || 'بدون نام';
const displayAge = p => p?.age !== '' && p?.age != null ? `${Number(p.age).toLocaleString('fa-IR')} سال` : 'سن نامشخص';
function patientToForm(p = {}) {
  return { general: '', nationalId: p.nationalId || '', firstName: p.firstName || String(p.fullName || '').split(' ')[0] || '', lastName: p.lastName || String(p.fullName || '').split(' ').slice(1).join(' '), mobilePhone: p.mobilePhone || p.phone || '', age: p.age ?? '', birthDate: p.birthDate || p.dateOfBirth || '', insuranceProviderId:p.insuranceProviderId || p.insurance?.providerId || '', insuranceContractId:p.insuranceContractId || p.insurance?.contractId || '', insurancePolicyNumber:p.insurancePolicyNumber || p.insurance?.policyNumber || '', insuranceOtherName:p.insuranceOtherName || p.insurance?.otherName || '', gender: p.gender || '', address: p.address || '' };
}

export function SmartPatientRegistration({
  patients = [], selectedPatientId = '', onSelect, onCreate, onUpdate, onConfirmed, onClear, settings = {},
}) {
  const selected = (patients || []).find(p => String(p.id) === String(selectedPatientId)) || null;
  const [phase, setPhase] = useState(selected ? 'confirm' : 'search');
  const [form, setForm] = useState(() => selected ? patientToForm(selected) : empty());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (selected) { setForm(patientToForm(selected)); setPhase('confirm'); setDirty(false); }
    else { setPhase('search'); }
  }, [selectedPatientId]);

  const searchFields = useMemo(() => ({ general: form.general, nationalId: form.nationalId, firstName: form.firstName, lastName: form.lastName, mobilePhone: form.mobilePhone, age: form.age }), [form]);
  const results = useMemo(() => phase === 'search' ? rankPatients(patients, searchFields, 200) : [], [patients, searchFields, phase]);
  const anyTyped = Object.values(searchFields).some(v => String(v ?? '').trim());
  const exactNational = form.nationalId ? (patients || []).find(p => normalizeLiveText(p.nationalId) === normalizeLiveText(form.nationalId)) : null;

  const set = (key, value) => { setForm(prev => ({ ...prev, [key]: value })); setDirty(true); if (phase === 'confirm') return; if (selectedPatientId) onClear?.(); };
  const setAgeValue = value => { const age = Number(String(value).match(/\d+/)?.[0]); setForm(prev=>({...prev,age:Number.isFinite(age)&&age>=0&&age<=130?age:value,birthDate:Number.isFinite(age)&&age>=0&&age<=130?calculateBirthDateFromAge(age):prev.birthDate})); setDirty(true); };
  const setBirthDateValue = value => { const age=calculateAgeFromJalali(value); setForm(prev=>({...prev,birthDate:value,age:age===undefined?'':age})); setDirty(true); };
  const insurers = (settings?.insuranceCatalog?.insurers || []).filter(x=>x.active!==false);
  const contracts = (settings?.insuranceCatalog?.contracts || []).filter(x=>x.active!==false&&String(x.insurerId)===String(form.insuranceProviderId));
  const pick = p => { onSelect?.(p); setForm(patientToForm(p)); setPhase('confirm'); setDirty(false); };
  const reset = () => { onClear?.(); setForm(empty()); setPhase('search'); setDirty(false); };

  const buildPatient = (base = {}) => {
    const firstName = String(form.firstName || '').trim();
    const selectedInsurer = (settings?.insuranceCatalog?.insurers || []).find(x => String(x.id) === String(form.insuranceProviderId));
    const selectedInsuranceName = form.insuranceProviderId === 'other' ? String(form.insuranceOtherName || '').trim() : (selectedInsurer?.name || '');
    const lastName = String(form.lastName || '').trim();
    return {
      ...base,
      firstName, lastName, fullName: `${firstName} ${lastName}`.trim(),
      nationalId: String(form.nationalId || '').trim(),
      mobilePhone: String(form.mobilePhone || '').trim(),
      age: safeAge(form.age), birthDate:String(form.birthDate||'').trim(), insuranceProviderId:form.insuranceProviderId||'', insuranceProviderName:selectedInsuranceName, insuranceContractId:form.insuranceContractId||'', insurancePolicyNumber:String(form.insurancePolicyNumber||'').trim(), insuranceOtherName:String(form.insuranceOtherName||'').trim(), gender: form.gender || base.gender || '', address: String(form.address || '').trim(),
      updatedAt: new Date().toISOString(),
    };
  };

  const create = async () => {
    if (exactNational) { pick(exactNational); return; }
    if (!String(form.firstName).trim() || !String(form.lastName).trim()) { alert('برای ثبت بیمار جدید، نام و نام خانوادگی را کامل کنید.'); return; }
    const maxNo = Math.max(1000, ...(patients || []).map(p => Number(String(p.fileNumber || '').replace(/\D/g, '')) || 0));
    let patient = buildPatient({
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileNumber: `P-${maxNo + 1}`,
      identityCategory: 'iranian', type: 'regular', verificationStatus: 'unverified',
      createdAt: new Date().toISOString(), receptionStatus:'registered', receptionDate:'',
      creditConfig: { enabled: false, creditLimit: 0, currentDebt: 0, currentCredit: 0, maturityDays: 30 },
      persistentAlerts: [],
    });
    const welcomeConf = settings?.smsAutomation?.welcomeNewPatient;
    const isWelcomeEnabled = welcomeConf ? welcomeConf.enabled !== false : settings?.enableWelcomeSmsOnRegistration !== false;
    if (patient.mobilePhone && isWelcomeEnabled) {
      const template = welcomeConf?.template || settings?.welcomeSmsTemplate || 'مراجعه‌کننده گرامی {patientName}، به {clinicName} خوش آمدید.\nشماره پرونده شما: {fileNumber}\nبا آرزوی تندرستی.';
      const msg = String(template)
        .replaceAll('{patientName}', patient.fullName || '')
        .replaceAll('{patient_name}', patient.fullName || '')
        .replaceAll('{fileNumber}', patient.fileNumber || '')
        .replaceAll('{file_number}', patient.fileNumber || '')
        .replaceAll('{clinicName}', settings?.centerName || settings?.clinicName || 'کلینیک تخصصی')
        .replaceAll('{clinic_name}', settings?.centerName || settings?.clinicName || 'کلینیک تخصصی')
        .replaceAll('{clinicPhone}', settings?.centerPhone || settings?.clinicPhone || '');
      try {
        const r = await fetch('/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: patient.mobilePhone, message: msg }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d.success === false) throw new Error(d.error || d.message || `HTTP ${r.status}`);
        patient = { ...patient, welcomeSmsSentAt: new Date().toISOString(), welcomeSmsStatus: 'sent', welcomeSmsMessage: msg, welcomeSmsMobile: patient.mobilePhone };
      } catch (err) {
        patient = { ...patient, welcomeSmsStatus: 'failed', welcomeSmsError: String(err?.message || err), welcomeSmsLastAttemptAt: new Date().toISOString(), welcomeSmsMessage: msg, welcomeSmsMobile: patient.mobilePhone };
      }
    }
    onCreate?.(patient); onSelect?.(patient); setForm(patientToForm(patient)); setPhase('confirm'); setDirty(false);
  };
  const confirm = () => {
    if (!selected) return;
    const updated = buildPatient(selected);
    if (!updated.firstName || !updated.lastName) { alert('نام و نام خانوادگی بیمار الزامی است.'); return; }
    if (dirty) onUpdate?.(updated);
    onConfirmed?.(updated);
    setDirty(false);
  };

  const activeAlerts = (selected?.persistentAlerts || selected?.alerts || []).filter(a => a && a.active !== false);

  if (phase === 'confirm' && selected) {
    return h('section', { className: 'bhis-smart-patient-card bhis-patient-confirm-440', 'data-testid': 'patient-confirm-step' },
      h('div', { className: 'bhis-smart-patient-head' },
        h('div', null, h('span', { className: 'bhis-eyebrow' }, 'مرحله ۲ از ۵'), h('h2', null, 'مشاهده و تأیید مشخصات بیمار'), h('p', null, 'اطلاعات را کنترل یا ویرایش کنید؛ تغییرات با «تأیید و ادامه» واقعاً ذخیره می‌شوند.')),
        h('button', { type: 'button', className: 'bhis-secondary-button compact', onClick: reset }, h(ChevronLeft, { className: 'w-4 h-4' }), 'بازگشت به جستجو')),
      activeAlerts.length ? h('div', { className: 'bhis-patient-alerts-440' }, h(ShieldAlert, { className: 'w-5 h-5' }), h('div', null, h('strong', null, 'هشدار فعال بیمار'), ...activeAlerts.slice(0, 4).map((a, i) => h('p', { key: a.id || i }, a.text || a.message || String(a))))) : null,
      h('div', { className: 'bhis-confirm-patient-summary-440' },
        h('strong', null, nameOf(selected)),
        h('span', null, `پرونده ${selected.fileNumber || '—'} • کد ملی ${selected.nationalId || '—'} • ${displayAge(selected)}`)),
      h('div', { className: 'bhis-form-grid three bhis-confirm-grid-440' },
        h('label', { className: 'bhis-field' }, h('span', null, 'نام *'), h('input', { value: form.firstName, onChange: e => set('firstName', e.target.value) })),
        h('label', { className: 'bhis-field' }, h('span', null, 'نام خانوادگی *'), h('input', { value: form.lastName, onChange: e => set('lastName', e.target.value) })),
        h('label', { className: 'bhis-field' }, h('span', null, 'کد ملی'), h('input', { value: form.nationalId, onChange: e => set('nationalId', e.target.value), inputMode: 'numeric' })),
        h('label', { className: 'bhis-field' }, h('span', null, 'شماره همراه'), h('input', { value: form.mobilePhone, onChange: e => set('mobilePhone', e.target.value), inputMode: 'tel' })),
        h('label', { className: 'bhis-field bhis-age-field-440' }, h('span', null, 'سن'), h('input', { value: form.age, onChange: e => setAgeValue(e.target.value), placeholder:'مثلاً ۲۳ سال', inputMode:'numeric' }), h('small', { className:'bhis-age-sync-hint-440' }, 'با ورود سن، تاریخ تولد خودکار محاسبه می‌شود.')),
        h(JalaliDateField,{label:'تاریخ تولد',value:form.birthDate,onChange:setBirthDateValue,allowParts:true}),
        h('label', { className: 'bhis-field' }, h('span', null, 'جنسیت'), h('select', { value: form.gender, onChange: e => set('gender', e.target.value) }, h('option', { value: '' }, '—'), h('option', { value: 'male' }, 'مرد'), h('option', { value: 'female' }, 'زن'))),
        h('label',{className:'bhis-field'},h('span',null,'بیمه بیمار'),h('select',{value:form.insuranceProviderId,onChange:e=>setForm(prev=>({...prev,insuranceProviderId:e.target.value,insuranceContractId:''}))},h('option',{value:''},'بدون بیمه'),...insurers.map(x=>h('option',{key:x.id,value:x.id},`${x.name}${x.active===false?' — غیرفعال':''}`)),h('option',{value:'other'},'سایر'))),
        form.insuranceProviderId && form.insuranceProviderId!=='other' ? h('label',{className:'bhis-field'},h('span',null,'قرارداد بیمه'),h('select',{value:form.insuranceContractId,onChange:e=>set('insuranceContractId',e.target.value)},h('option',{value:''},'انتخاب قرارداد'),...contracts.map(x=>h('option',{key:x.id,value:x.id},`${x.title}${x.active===false?' — غیرفعال / آزاد':''}`)))):null,
        form.insuranceProviderId==='other'?h('label',{className:'bhis-field'},h('span',null,'نام بیمه سایر'),h('input',{value:form.insuranceOtherName,onChange:e=>set('insuranceOtherName',e.target.value),placeholder:'نام بیمه'})):null,form.insuranceProviderId && form.insuranceProviderId!=='other' ? h('div',{className:'bhis-insurance-status-440'},(()=>{const cs=(settings?.insuranceCatalog?.contracts||[]).filter(x=>String(x.insurerId)===String(form.insuranceProviderId));const chosen=form.insuranceContractId?cs.find(x=>String(x.id)===String(form.insuranceContractId)):null;const active=chosen ? chosen.active!==false && (!chosen.validFrom||chosen.validFrom<=getJalaliDateString()) && (!chosen.validTo||chosen.validTo>=getJalaliDateString()) : cs.some(x=>x.active!==false);return h(React.Fragment,null,h('strong',null,active?'قرارداد قابل اعمال':'ثبت بیمه بدون قرارداد فعال'),h('span',null,active?'در صورت وجود تعرفه بیمه، سهم بیمه و سهم بیمار خودکار محاسبه می‌شود.':'هزینه خدمت آزاد محاسبه می‌شود؛ نام بیمه در پرونده و قبض بیمار حفظ می‌شود.'))})()):null,
        h('label', { className: 'bhis-field' }, h('span', null, 'شماره بیمه'), h('input', { value: form.insurancePolicyNumber, onChange: e => set('insurancePolicyNumber', e.target.value) })),
        h('label', { className: 'bhis-field bhis-field-full' }, h('span', null, 'نشانی / توضیح هویتی'), h('input', { value: form.address, onChange: e => set('address', e.target.value) }))),
      h('div', { className: 'bhis-smart-patient-actions' },
        h('button', { type: 'button', className: 'bhis-primary-button prominent', onClick: confirm, 'data-testid': 'patient-confirm-continue' }, h(Save, { className: 'w-5 h-5' }), dirty ? 'ذخیره تغییرات و ادامه' : 'تأیید و ادامه')));
  }

  return h('section', { className: 'bhis-smart-patient-card bhis-patient-search-440', 'data-testid': 'patient-search-step' },
    h('div', { className: 'bhis-smart-patient-head' }, h('div', null, h('span', { className: 'bhis-eyebrow' }, 'مرحله ۱ از ۵'), h('h2', null, 'جستجو یا ثبت بیمار'), h('p', null, 'با اولین حرف یا رقم، مشابه‌ها در همان فرم نمایش داده و با ادامه تایپ محدودتر می‌شوند.'))),
    h('div', { className: 'bhis-patient-live-form' },
      h('label', { className: 'bhis-field bhis-field-full' }, h('span', null, 'جستجوی زنده در همه مشخصات'), h('div', { className: 'bhis-live-input' }, h(Search, { className: 'w-4 h-4' }), h('input', { value: form.general, onChange: e => set('general', e.target.value), placeholder: 'نام، نام خانوادگی، کد ملی، پرونده، موبایل یا سن...', autoFocus: true, 'data-testid': 'patient-general-live-search' }))),
      h('div', { className: 'bhis-form-grid five' },
        h('label', { className: 'bhis-field' }, h('span', null, 'کد ملی'), h('input', { value: form.nationalId, onChange: e => set('nationalId', e.target.value), inputMode: 'numeric', placeholder: 'مثلاً 3510185307' })),
        h('label', { className: 'bhis-field' }, h('span', null, 'نام'), h('input', { value: form.firstName, onChange: e => set('firstName', e.target.value) })),
        h('label', { className: 'bhis-field' }, h('span', null, 'نام خانوادگی'), h('input', { value: form.lastName, onChange: e => set('lastName', e.target.value) })),
        h('label', { className: 'bhis-field' }, h('span', null, 'شماره همراه'), h('input', { value: form.mobilePhone, onChange: e => set('mobilePhone', e.target.value), inputMode: 'tel' })),
        h('label', { className: 'bhis-field' }, h('span', null, 'سن'), h('input', { value: form.age, onChange: e => setAgeValue(e.target.value), placeholder:'مثلاً ۲۳ سال', inputMode:'numeric' }))),
      anyTyped ? h('div', { className: 'bhis-live-similar-wrap' },
        h('div', { className: 'bhis-live-similar-head' }, h('strong', null, `${results.length.toLocaleString('fa-IR')} بیمار مشابه`), h('span', null, 'حداکثر ۲۰۰ نتیجه؛ با هر کاراکتر فیلتر می‌شود')),
        h('div', { className: 'bhis-live-similar-results', 'data-testid': 'patient-live-results' },
          results.length ? results.map(p => h('button', { key: p.id, type: 'button', className: 'bhis-live-patient-row', onClick: () => pick(p) },
            h('span', { className: 'bhis-patient-avatar' }, h(UserCheck, { className: 'w-4 h-4' })),
            h('span', { className: 'main' }, h('strong', null, nameOf(p)), h('small', null, `پرونده ${p.fileNumber || '—'} • کد ملی ${p.nationalId || '—'} • ${p.mobilePhone || p.phone || 'بدون موبایل'} • ${displayAge(p)}`)), h('span', { className: 'choose' }, 'انتخاب'))) :
            h('div', { className: 'bhis-live-empty' }, h(AlertTriangle, { className: 'w-5 h-5' }), h('div', null, h('strong', null, 'بیمار مشابه پیدا نشد'), h('span', null, 'در صورت تکمیل نام و نام خانوادگی، همین اطلاعات را به‌عنوان بیمار جدید ثبت کنید.'))))) :
        h('div', { className: 'bhis-live-hint' }, 'یک حرف یا رقم هم برای شروع جستجو کافی است.'),
      h('div', { className: 'bhis-smart-patient-actions' }, h('button', { type: 'button', className: 'bhis-primary-button prominent', onClick: create, disabled: !String(form.firstName).trim() || !String(form.lastName).trim() }, h(UserPlus, { className: 'w-5 h-5' }), exactNational ? 'انتخاب بیمار موجود' : 'ثبت بیمار جدید با همین مشخصات'))));
}
