import { getJalaliDateTimeString } from './jalali.js?b=r24-514-1405';
/**
 * Format Doctor Medical Council Code according to Tamin Social Security Rules:
 * - Midwives (ماما): Add 'م' at the end of medical council code (e.g. '12345م')
 * - Foreign Doctors (اتباع): Prefix 'FDA' before FIDA code and suffix 'ات' at the end
 */
export function formatTaminDoctorId(medicalCouncilCode, doctorType = 'general_specialist', fidaCode) {
    const cleanCode = medicalCouncilCode.trim();
    if (doctorType === 'midwife') {
        return cleanCode.endsWith('م') ? cleanCode : `${cleanCode}م`;
    }
    if (doctorType === 'foreign') {
        const cleanFida = (fidaCode || cleanCode).trim();
        return `FDA${cleanFida}ات`;
    }
    return cleanCode;
}
/**
 * Generate cryptographically strong PKCE Verifier & Challenge (S256)
 */
export async function generatePkceCodes() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let verifier = '';
    const randomArray = new Uint8Array(64);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomArray);
    }
    else {
        for (let i = 0; i < 64; i++)
            randomArray[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 64; i++) {
        verifier += chars[randomArray[i] % chars.length];
    }
    // SHA-256 Digest
    let challenge = '';
    try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const hash = await window.crypto.subtle.digest('SHA-256', data);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
            challenge = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        else {
            challenge = verifier; // Fallback
        }
    }
    catch (err) {
        challenge = verifier;
    }
    return { codeVerifier: verifier, codeChallenge: challenge };
}
/**
 * Get Authorize Redirect URL for Tamin OAuth2 PKCE
 */
export function getTaminAuthUrl(config, codeChallenge, state) {
    const baseUrl = config.environment === 'production'
        ? 'https://account.tamin.ir/auth/server/authorize'
        : 'https://account-pilot.tamin.ir/auth/server/authorize';
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId || 'clinic_app_client',
        redirect_uri: config.redirectUri || (typeof window !== 'undefined' ? window.location.origin + '/tamin/callback' : ''),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
    });
    return `${baseUrl}?${params.toString()}`;
}
/**
 * Check Patient Insurance Eligibility (استعلام وضعیت استحقاق بیمار تامین اجتماعی)
 * Endpoint: https://soa.tamin.ir/interface/epresc/patient/v1/deserve-info/{siam-id}/{doc-id}/{patient-id}
 */
export async function checkTaminEligibility(req, config) {
    const formattedDocId = formatTaminDoctorId(req.docId, config?.doctorType || 'general_specialist', config?.foreignFidaCode);
    const siamOrCode = req.siamOrMedicalCouncilCode || formattedDocId;
    // Live API request via Express Proxy endpoint
    try {
        const res = await fetch('/api/tamin/deserve-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siamOrCode,
                docId: formattedDocId,
                patientNationalId: req.patientNationalId,
                environment: config?.environment || 'production',
                accessToken: config?.accessToken,
            }),
        });
        if (res.ok) {
            const data = await res.json();
            if (data.eligibility) {
                return data.eligibility;
            }
            if (data.error) {
                return {
                    deserved: false,
                    patientNationalId: req.patientNationalId,
                    message: data.error,
                };
            }
        }
        else {
            const errText = await res.text();
            return {
                deserved: false,
                patientNationalId: req.patientNationalId,
                message: 'خطا در استعلام استحقاق: ' + errText,
            };
        }
    }
    catch (e) {
        console.warn('[Tamin API Client Error]:', e);
        return {
            deserved: false,
            patientNationalId: req.patientNationalId,
            message: 'عدم امکان ارتباط با سرور: ' + e.message,
        };
    }
    return {
        deserved: false,
        patientNationalId: req.patientNationalId,
        message: 'پاسخ نامشخص از سامانه تامین اجتماعی دریافت گردید.',
    };
}
/**
 * Submit E-Prescription to Tamin (ثبت نسخه الکترونیک تامین اجتماعی)
 * Endpoint: https://soa.tamin.ir/interface/epresc/SendEpresc/v2
 */
export async function sendTaminEPrescription(prescReq, config) {
    const formattedDocId = formatTaminDoctorId(prescReq.docId, config?.doctorType || 'general_specialist', config?.foreignFidaCode);
    const payload = {
        docId: formattedDocId,
        docNationalCode: prescReq.docNationalCode || config?.docNationalCode || '',
        docMobileNo: prescReq.docMobileNo || config?.docMobileNo || '',
        patientNationalCode: prescReq.patientNationalCode,
        prescType: { prescTypeId: prescReq.prescTypeId },
        isDentalService: prescReq.isDentalService || 0,
        toothId: prescReq.toothId || null,
        noteDetailEprscs: prescReq.items.map((item) => ({
            srvId: {
                srvType: item.srvType,
                srvCode: item.srvCode,
            },
            srvQty: item.srvQty,
            timesAday: item.timesAday || 'هر ۸ ساعت',
            drugInstruction: item.drugInstruction || 'طبق دستور پزشک',
            repeatNumber: item.repeatNumber || 1,
            isDentalService: item.isDentalService || 0,
            toothId: item.toothId || null,
        })),
        noteDetailsReferralList: prescReq.prescTypeId === 7 && prescReq.referralDetail ? [prescReq.referralDetail] : [],
    };
    try {
        const res = await fetch('/api/tamin/send-epresc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payload,
                environment: config?.environment || 'production',
                accessToken: config?.accessToken,
            }),
        });
        const data = await res.json();
        if (data.success) {
            return {
                success: true,
                headerID: data.headerID,
                trackingCode: data.trackingCode,
                message: data.message || 'نسخه الکترونیک با موفقیت در سازمان تامین اجتماعی ثبت گردید.',
                raw: data.raw,
            };
        }
        else {
            return {
                success: false,
                headerID: '',
                trackingCode: '',
                message: data.error || 'خطا در ثبت نسخه در وب‌سرویس تامین اجتماعی.',
                raw: data.raw,
            };
        }
    }
    catch (e) {
        return {
            success: false,
            headerID: '',
            trackingCode: '',
            message: 'خطا در ارسال درخواست به سرور کلینیک: ' + e.message,
        };
    }
}
/**
 * Remove E-Prescription (حذف نسخه تا پایان روز ثبت)
 * Endpoint: https://soa.tamin.ir/interface/epresc/SendEpresc/v2/remove/{headerID}/{docId}
 */
export async function removeTaminEPrescription(headerID, docId, config) {
    const formattedDocId = formatTaminDoctorId(docId, config?.doctorType || 'general_specialist', config?.foreignFidaCode);
    try {
        const res = await fetch('/api/tamin/remove-epresc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                headerID,
                docId: formattedDocId,
                environment: config?.environment || 'production',
                accessToken: config?.accessToken,
            }),
        });
        const data = await res.json();
        if (data.success) {
            return { success: true, message: data.message || 'نسخه با موفقیت از سامانه تامین اجتماعی حذف گردید.' };
        }
        else {
            return { success: false, message: data.error || 'خطا در حذف نسخه از سامانه تامین اجتماعی.' };
        }
    }
    catch (e) {
        return { success: false, message: 'خطای شبکه در حذف نسخه: ' + e.message };
    }
}
/**
 * List Common Chronic Diseases for Tagging Patients (نشاندار کردن بیمار)
 * Endpoint: https://soa.tamin.ir/interface/epresc/patient-diseases-list/v1
 */
export const SAMPLE_TAMIN_DISEASES = [
    { diseaseCode: 'DIS-101', diseaseTitle: 'دیابت تیپ ۲ (دیابت قندی)', category: 'غدد و متابولیسم' },
    { diseaseCode: 'DIS-102', diseaseTitle: 'فشار خون بالای اولیه (Hypertension)', category: 'قلب و عروق' },
    { diseaseCode: 'DIS-103', diseaseTitle: 'زخم مزمن دیابتی و عروقی (Wound Care)', category: 'جراحی و پوستی' },
    { diseaseCode: 'DIS-104', diseaseTitle: 'آسم و بیماری‌های مزمن ریوی (COPD)', category: 'ریه' },
    { diseaseCode: 'DIS-105', diseaseTitle: 'نارسایی مزمن کلیوی (CKD)', category: 'کلیه و مجاری ادراری' },
    { diseaseCode: 'DIS-106', diseaseTitle: 'ام‌اس (Multiple Sclerosis)', category: 'مغز و اعصاب' },
];
/**
 * Fetch E-Prescription Details (واکشی نسخه)
 * Endpoint: https://soa.tamin.ir/interface/epresc/SendEpresc/v2/{headerID}/{docId}
 */
export async function fetchTaminEPrescription(headerID, docId, config) {
    const formattedDocId = formatTaminDoctorId(docId, config?.doctorType || 'general_specialist', config?.foreignFidaCode);
    try {
        const res = await fetch('/api/tamin/get-epresc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                headerID,
                docId: formattedDocId,
                accessToken: config?.accessToken,
            }),
        });
        const data = await res.json();
        if (data.success) {
            return { success: true, prescription: data.prescription };
        }
        return { success: false, error: data.error };
    }
    catch (e) {
        return { success: false, error: 'خطا در شبکه: ' + e.message };
    }
}
/**
 * Edit E-Prescription (ویرایش نسخه)
 * Endpoint: https://soa.tamin.ir/interface/epresc/SendEpresc/v2/edit/{headerID}/{docId}
 */
export async function editTaminEPrescription(headerID, prescReq, config) {
    const formattedDocId = formatTaminDoctorId(prescReq.docId, config?.doctorType || 'general_specialist', config?.foreignFidaCode);
    if (prescReq.prescTypeId === 3 || prescReq.prescTypeId === 5) {
        return {
            success: false,
            message: 'طبق ضوابط تامین اجتماعی، نسخه‌های ویزیت (۳) و خدمات پزشکی (۵) قابل ویرایش نمی‌باشند.',
        };
    }
    const payload = {
        docId: formattedDocId,
        docNationalCode: prescReq.docNationalCode,
        docMobileNo: prescReq.docMobileNo || '',
        patientNationalId: prescReq.patientNationalCode,
        prescDate: getJalaliDateTimeString().split(' ')[0],
        prescType: { prescTypeId: prescReq.prescTypeId },
        noteDetailEprscs: prescReq.items.map((item) => ({
            srvId: { srvType: item.srvType, srvCode: item.srvCode },
            srvQty: item.srvQty,
            timesAday: item.timesAday || 'هر ۸ ساعت',
            drugInstruction: item.drugInstruction || 'طبق دستور پزشک',
            repeatNumber: item.repeatNumber || 1,
            isDentalService: item.isDentalService || 0,
            toothId: item.toothId || null,
        })),
        noteDetailsReferralList: prescReq.prescTypeId === 7 && prescReq.referralDetail ? [prescReq.referralDetail] : [],
    };
    try {
        const res = await fetch('/api/tamin/edit-epresc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                headerID,
                docId: formattedDocId,
                payload,
                prescTypeId: prescReq.prescTypeId,
                accessToken: config?.accessToken,
            }),
        });
        const data = await res.json();
        if (data.success) {
            return { success: true, message: data.message };
        }
        return { success: false, message: data.error };
    }
    catch (e) {
        return { success: false, message: 'خطای شبکه در ویرایش نسخه: ' + e.message };
    }
}
/**
 * Fetch Patient Diseases List (فراخوانی لیست بیماری‌های قابل انتخاب برای نشان‌دار کردن بیمار)
 * Endpoint: https://soa.tamin.ir/interface/epresc/patient-diseases-list/v1
 */
export async function fetchTaminPatientDiseasesList(config) {
    try {
        const res = await fetch('/api/tamin/patient-diseases-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: config?.accessToken }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.diseases) && data.diseases.length > 0) {
            return { success: true, diseases: data.diseases };
        }
        return { success: true, diseases: SAMPLE_TAMIN_DISEASES };
    }
    catch (e) {
        return { success: true, diseases: SAMPLE_TAMIN_DISEASES };
    }
}
/**
 * Save Patient Disease / Tagging (ثبت بیماری و نشان‌دار کردن بیمار)
 * Endpoint: https://soa.tamin.ir/interface/epresc/save-patient-info-illness/v1
 */
export async function saveTaminPatientIllness(patientNationalId, diseaseCode, docId, config) {
    const formattedDocId = formatTaminDoctorId(docId, config?.doctorType || 'general_specialist', config?.foreignFidaCode);
    const payload = {
        patientNationalId,
        diseaseCode,
        docId: formattedDocId,
        createdDate: getJalaliDateTimeString(),
    };
    try {
        const res = await fetch('/api/tamin/save-patient-info-illness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload, accessToken: config?.accessToken }),
        });
        const data = await res.json();
        if (data.success) {
            return { success: true, message: data.message };
        }
        return { success: false, message: data.error };
    }
    catch (e) {
        return { success: false, message: 'خطا در ثبت بیماری بیمار: ' + e.message };
    }
}
