import * as XLSX from '../../client-vendor/xlsx.js?b=r24-514-1405';
import { generateNextSequentialCode } from './codeGenerator.js?b=r24-514-1405';
import { generateUniqueClinicBarcode } from './barcode.js?b=r24-514-1405';
import { toEnglishDigits, toPersianDigits } from './jalali.js?b=r24-514-1405';
/**
 * Clean and convert raw Excel cell value to a valid positive number
 * Strips English/Persian commas, non-numeric symbols, and currency names ("تومان", "ریال")
 */
export function cleanExcelNumericValue(val, defaultValue = 0) {
    if (val === null || val === undefined || val === '')
        return defaultValue;
    if (typeof val === 'number')
        return isNaN(val) ? defaultValue : Math.max(0, val);
    const rawStr = toEnglishDigits(String(val))
        .replace(/[,،\sتومانریال]/g, '')
        .trim();
    const num = parseFloat(rawStr);
    return isNaN(num) ? defaultValue : Math.max(0, num);
}
/**
 * Clean string value: converts digits to English if requested, trims whitespace
 */
export function cleanExcelStringValue(val, convertDigits = false) {
    if (val === null || val === undefined)
        return '';
    const str = String(val).trim();
    return convertDigits ? toEnglishDigits(str) : str;
}
/**
 * Clean boolean status from string (e.g. 'فعال', 'غیرفعال', '1', '0', 'true', 'false')
 */
export function cleanExcelBooleanValue(val, defaultValue = true) {
    if (val === null || val === undefined || val === '')
        return defaultValue;
    if (typeof val === 'boolean')
        return val;
    const str = String(val).trim().toLowerCase();
    if (str === 'فعال' ||
        str === 'بلی' ||
        str === 'آری' ||
        str === '1' ||
        str === 'true' ||
        str === 'active' ||
        str === 'yes') {
        return true;
    }
    if (str === 'غیرفعال' ||
        str === 'خیر' ||
        str === '0' ||
        str === 'false' ||
        str === 'inactive' ||
        str === 'no') {
        return false;
    }
    return defaultValue;
}
/**
 * Generic Excel / CSV Exporter using SheetJS (XLSX)
 */
export const exportDataToExcel = (data, fileName, sheetName = 'اطلاعات') => {
    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
    catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('خطا در صدور فایل اکسل.');
    }
};
export const exportToExcel = exportDataToExcel;
export const downloadSampleExcelTemplate = (sampleData, fileName = 'الگوی_نمونه_اکسل') => {
    exportDataToExcel([sampleData], fileName, 'الگوی نمونه');
};
/**
 * Generic Excel / CSV Reader
 */
export const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target?.result;
                if (!buffer) {
                    reject(new Error('فایل خالی یا نامعتبر است.'));
                    return;
                }
                const workbook = XLSX.read(buffer, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonResults = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                resolve(jsonResults);
            }
            catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
};
// ============================================================================
// 1. PRODUCTS (INVENTORY) IMPORT & EXPORT
// ============================================================================
export const exportProductsToExcel = (products, categories, warehouses) => {
    // Define selection lists for Data Validation
    const categoryNames = categories && categories.length > 0
        ? categories.map((c) => c.name)
        : ['عمومی', 'دارویی', 'تجهیزات مصرفی', 'آزمایشگاهی', 'جراحی'];
    const warehouseNames = warehouses && warehouses.length > 0
        ? warehouses.map((w) => w.name)
        : ['انبار اصلی', 'انبار دارویی', 'انبار جراحی', 'انبار تجهیزات'];
    const unitNames = ['عدد', 'بسته', 'سی‌سی', 'جعبه', 'آمپول', 'سرنگ', 'رول', 'متر', 'ویال', 'ست'];
    const rowsToExport = products && products.length > 0
        ? products.map((p) => ({
            'کد کالا': p.code || '',
            'نام کالا': p.name || '',
            'گروه کالا': p.categoryName || categoryNames[0],
            'واحد سنجش': p.unit || 'عدد',
            'موجودی فعلی': p.stockQuantity || 0,
            'حداقل موجودی': p.minStock || 0,
            'قیمت خرید (تومان)': p.purchasePrice || 0,
            'قیمت فروش (تومان)': p.salesPrice || 0,
            'محل انبار': p.location || warehouseNames[0],
            'کد بارکد': p.barcode || '',
            'وضعیت': p.active ? 'فعال' : 'غیرفعال',
        }))
        : [
            {
                'کد کالا': 'PRD-1001',
                'نام کالا': 'سرنگ ۲ سی‌سی (نمونه)',
                'گروه کالا': categoryNames[0],
                'واحد سنجش': 'عدد',
                'موجودی فعلی': 100,
                'حداقل موجودی': 20,
                'قیمت خرید (تومان)': 5000,
                'قیمت فروش (تومان)': 8000,
                'محل انبار': warehouseNames[0],
                'کد بارکد': '', // خالی جهت تست بارکدگیر خودکار ۶۲۶
                'وضعیت': 'فعال',
            },
            {
                'کد کالا': 'PRD-1002',
                'نام کالا': 'پد الکل ضدعفونی (نمونه)',
                'گروه کالا': categoryNames[1] || categoryNames[0],
                'واحد سنجش': 'بسته',
                'موجودی فعلی': 50,
                'حداقل موجودی': 10,
                'قیمت خرید (تومان)': 12000,
                'قیمت فروش (تومان)': 18000,
                'محل انبار': warehouseNames[0],
                'کد بارکد': '', // خالی جهت تست بارکدگیر خودکار ۶۲۶
                'وضعیت': 'فعال',
            },
        ];
    const worksheet = XLSX.utils.json_to_sheet(rowsToExport);
    // Add Excel Data Validation (Drop-down lists) for select columns
    worksheet['!dataValidation'] = [
        {
            sqref: 'C2:C2000',
            type: 'list',
            operator: 'equal',
            formula1: `"${categoryNames.join(',')}"`,
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: 'انتخاب از لیست کشویی',
            error: 'لطفاً یکی از گروه‌های کالای مجاز تعریف شده در کلینیک را انتخاب نمایید.',
        },
        {
            sqref: 'D2:D2000',
            type: 'list',
            operator: 'equal',
            formula1: `"${unitNames.join(',')}"`,
            allowBlank: true,
        },
        {
            sqref: 'I2:I2000',
            type: 'list',
            operator: 'equal',
            formula1: `"${warehouseNames.join(',')}"`,
            allowBlank: true,
            showErrorMessage: true,
            errorTitle: 'انتخاب انبار مجاز',
            error: 'لطفاً یکی از انبارهای تعریف شده را انتخاب کنید.',
        },
        {
            sqref: 'K2:K2000',
            type: 'list',
            operator: 'equal',
            formula1: '"فعال,غیرفعال"',
            allowBlank: true,
        },
    ];
    // Create Reference Sheet with valid options for easy viewing
    const optionsRows = [];
    const maxLen = Math.max(categoryNames.length, warehouseNames.length, unitNames.length);
    for (let i = 0; i < maxLen; i++) {
        optionsRows.push({
            'گروه‌های کالای مجاز (ستون C)': categoryNames[i] || '',
            'انبارهای نگهداری مجاز (ستون I)': warehouseNames[i] || '',
            'واحدهای سنجش مجاز (ستون D)': unitNames[i] || '',
        });
    }
    optionsRows.push({
        'گروه‌های کالای مجاز (ستون C)': '---',
        'انبارهای نگهداری مجاز (ستون I)': '---',
        'واحدهای سنجش مجاز (ستون D)': 'راهنما: در صورت خالی بودن ستون کد بارکد، سیستم هنگام ثبت، بارکد داخلی یکتای Code 128 با پیشوند BHS- تولید می‌کند.',
    });
    const refWorksheet = XLSX.utils.json_to_sheet(optionsRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'لیست کالاها');
    XLSX.utils.book_append_sheet(workbook, refWorksheet, 'راهنمای گزینه های کشویی');
    const fileName = products && products.length > 0 ? 'لیست_کالاهای_انبار_کلینیک' : 'الگوی_نمونه_ورودی_کالاها';
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
export const processProductsExcelImport = (rawRows, existingProducts, categories, warehouses) => {
    const productsList = [...existingProducts];
    let updatedCount = 0;
    let createdCount = 0;
    let autoBarcodesCount = 0;
    let skippedRowsCount = 0;
    let validRowsCount = 0;
    const validationLogs = [];
    const defaultCategory = categories[0] || { id: 'cat-gen', name: 'عمومی' };
    const defaultLocation = warehouses[0]?.name || 'انبار اصلی';
    // Set of all active barcodes for fast uniqueness checks during batch import
    const usedBarcodes = new Set();
    productsList.forEach((p) => {
        if (p.barcode) {
            usedBarcodes.add(cleanExcelStringValue(p.barcode, true));
        }
    });
    // Internal identifiers are Code128 (BHS-*), never fake commercial EAN/GS1 numbers.
    const generateClinicBarcode = () => {
        const code = generateUniqueClinicBarcode(Array.from(usedBarcodes, barcode => ({barcode})));
        usedBarcodes.add(code);
        autoBarcodesCount++;
        return code;
    };
    rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // Row number in Excel sheet (header is row 1)
        // Data Validation & Sanitization Layer
        const rawCode = (row['کد کالا'] || row['کد'] || row['code'] || row['Code'] || '').toString();
        const rawName = (row['نام کالا'] || row['عنوان'] || row['نام'] || row['name'] || row['Title'] || '').toString();
        const code = cleanExcelStringValue(rawCode, true);
        const name = cleanExcelStringValue(rawName, false);
        // Skip blank rows without name or code
        if (!name && !code) {
            skippedRowsCount++;
            return;
        }
        if (!name && code) {
            validationLogs.push(`ردیف ${toPersianDigits(rowNum)}: عنوان کالا خالی بود؛ عنوان بر اساس کد "${code}" ایجاد گردید.`);
        }
        const categoryNameInput = cleanExcelStringValue(row['گروه کالا'] || row['دسته بندی'] || row['گروه'] || row['categoryName'] || '', false);
        const matchedCategory = categories.find((c) => c.name.trim().toLowerCase() === categoryNameInput.toLowerCase()) || defaultCategory;
        const unitInput = cleanExcelStringValue(row['واحد سنجش'] || row['واحد'] || row['unit'] || 'عدد', false);
        const validUnits = ['عدد', 'بسته', 'سی‌سی', 'جعبه', 'آمپول', 'سرنگ', 'رول', 'متر', 'ویال', 'ست'];
        const unit = validUnits.includes(unitInput) ? unitInput : 'عدد';
        const stockQuantity = cleanExcelNumericValue(row['موجودی فعلی'] || row['موجودی'] || row['stockQuantity'], 0);
        const minStock = cleanExcelNumericValue(row['حداقل موجودی'] || row['minStock'], 5);
        const purchasePrice = cleanExcelNumericValue(row['قیمت خرید (تومان)'] || row['قیمت خرید'] || row['purchasePrice'], 0);
        const salesPrice = cleanExcelNumericValue(row['قیمت فروش (تومان)'] || row['قیمت فروش'] || row['salesPrice'], 0);
        const locationInput = cleanExcelStringValue(row['محل انبار'] || row['قفسه'] || row['location'], false);
        const matchedWarehouse = warehouses.find((w) => w.name.trim().toLowerCase() === locationInput.toLowerCase());
        const location = matchedWarehouse ? matchedWarehouse.name : (locationInput || defaultLocation);
        const active = cleanExcelBooleanValue(row['وضعیت'] || row['active'], true);
        const barcodeInput = cleanExcelStringValue(row['کد بارکد'] || row['بارکد'] || row['barcode'] || row['Barcode'], true);
        validRowsCount++;
        // Match existing product by code OR name match
        const existingIndex = productsList.findIndex((p) => (code && p.code.toLowerCase() === code.toLowerCase()) ||
            (name && p.name.trim().toLowerCase() === name.toLowerCase()));
        if (existingIndex >= 0) {
            // UPDATE EXISTING PRODUCT
            const prev = productsList[existingIndex];
            let finalBarcode = barcodeInput;
            if (!finalBarcode) {
                if (prev.barcode) {
                    finalBarcode = prev.barcode;
                }
                else {
                    finalBarcode = generateClinicBarcode();
                    validationLogs.push(`ردیف ${toPersianDigits(rowNum)} (${name || code}): بارکد اولیه وجود نداشت؛ بارکد اختصاصی داخلی Code 128 ایجاد شد.`);
                }
            }
            else {
                if (usedBarcodes.has(finalBarcode) && finalBarcode !== prev.barcode) {
                    validationLogs.push(`ردیف ${toPersianDigits(rowNum)} (${name || code}): بارکد ورودی ${toPersianDigits(finalBarcode)} تکراری بود؛ بارکد یکتای جدید تولید گردید.`);
                    finalBarcode = generateClinicBarcode();
                }
            }
            if (finalBarcode)
                usedBarcodes.add(finalBarcode);
            productsList[existingIndex] = {
                ...prev,
                name: name || prev.name,
                categoryId: matchedCategory.id,
                categoryName: matchedCategory.name,
                unit: unit || prev.unit,
                stockQuantity: stockQuantity,
                minStock: minStock,
                purchasePrice: purchasePrice,
                salesPrice: salesPrice,
                location: location,
                barcode: finalBarcode,
                active: active,
            };
            updatedCount++;
        }
        else {
            // CREATE NEW PRODUCT
            const newCode = code || generateNextSequentialCode('PRD-', productsList, 'code', 1001);
            let finalBarcode = barcodeInput;
            if (!finalBarcode) {
                finalBarcode = generateClinicBarcode();
                validationLogs.push(`ردیف ${toPersianDigits(rowNum)} (${name || newCode}): کد بارکد خالی بود؛ بارکد داخلی Code 128 به صورت خودکار تولید شد.`);
            }
            else if (usedBarcodes.has(finalBarcode)) {
                validationLogs.push(`ردیف ${toPersianDigits(rowNum)} (${name || newCode}): بارکد ${toPersianDigits(finalBarcode)} تکراری بود؛ بارکد یکتای جدید تولید شد.`);
                finalBarcode = generateClinicBarcode();
            }
            if (finalBarcode)
                usedBarcodes.add(finalBarcode);
            const newProduct = {
                id: 'prd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                code: newCode,
                name: name || `کالای جدید ${newCode}`,
                categoryId: matchedCategory.id,
                categoryName: matchedCategory.name,
                unit: unit,
                stockQuantity: stockQuantity,
                minStock: minStock,
                purchasePrice: purchasePrice,
                salesPrice: salesPrice,
                location: location,
                barcode: finalBarcode,
                active: active,
                createdAt: new Date().toISOString(),
            };
            productsList.push(newProduct);
            createdCount++;
        }
    });
    return {
        updatedProducts: productsList,
        updatedCount,
        createdCount,
        autoBarcodesCount,
        validRowsCount,
        skippedRowsCount,
        validationLogs,
    };
};
// ============================================================================
// 2. PATIENTS IMPORT & EXPORT
// ============================================================================
export const exportPatientsToExcel = (patients) => {
    const exportRows = patients.map((p) => ({
        'کد پرونده': p.fileNumber || '',
        'کد ملی': p.nationalId || '',
        'شماره پاسپورت/شناسه اتباع': p.passportNumber || '',
        'نام': p.firstName || '',
        'نام خانوادگی': p.lastName || '',
        'نام کامل': p.fullName || `${p.firstName} ${p.lastName}`,
        'نام پدر': p.fatherName || '',
        'شماره همراه': p.mobilePhone || '',
        'جنسیت': p.gender === 'female' ? 'خانم' : 'آقا',
        'تاریخ تولد': p.birthDate || '',
        'نوع بیمه': p.insuranceProvider || 'آزاد',
        'سقف اعتبار (تومان)': p.creditConfig?.creditLimit || 0,
        'مانده بدهی (تومان)': p.creditConfig?.currentDebt || 0,
    }));
    exportDataToExcel(exportRows, 'لیست_بیماران_کلینیک', 'بیماران');
};
export const processPatientsExcelImport = (rawRows, existingPatients) => {
    const patientList = [...existingPatients];
    let updatedCount = 0;
    let createdCount = 0;
    let skippedRowsCount = 0;
    let validRowsCount = 0;
    const validationLogs = [];
    rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const fileNumber = cleanExcelStringValue(row['کد پرونده'] || row['fileNumber'] || row['شماره پرونده'] || '', true);
        const nationalId = cleanExcelStringValue(row['کد ملی'] || row['nationalId'] || '', true);
        const passportNumber = cleanExcelStringValue(row['شماره پاسپورت/شناسه اتباع'] || row['passportNumber'] || '', true);
        const firstName = cleanExcelStringValue(row['نام'] || row['firstName'] || '', false);
        const lastName = cleanExcelStringValue(row['نام خانوادگی'] || row['lastName'] || '', false);
        const fullNameInput = cleanExcelStringValue(row['نام کامل'] || row['fullName'] || '', false);
        const fullName = fullNameInput || `${firstName} ${lastName}`.trim();
        const fatherName = cleanExcelStringValue(row['نام پدر'] || row['fatherName'] || '', false);
        const mobilePhone = cleanExcelStringValue(row['شماره همراه'] || row['شماره تماس'] || row['mobilePhone'] || '', true);
        const genderRaw = cleanExcelStringValue(row['جنسیت'] || row['gender'] || '', false);
        const gender = genderRaw.includes('خانم') || genderRaw.includes('female') ? 'female' : 'male';
        const birthDate = cleanExcelStringValue(row['تاریخ تولد'] || row['birthDate'] || '', true);
        const creditLimit = cleanExcelNumericValue(row['سقف اعتبار (تومان)'] || row['creditLimit'] || 0, 0);
        if (!fullName && !nationalId && !fileNumber) {
            skippedRowsCount++;
            return;
        }
        validRowsCount++;
        // Match existing patient by fileNumber OR nationalId
        const existingIndex = patientList.findIndex((p) => (fileNumber && p.fileNumber.toLowerCase() === fileNumber.toLowerCase()) ||
            (nationalId && p.nationalId === nationalId) ||
            (fullName && p.fullName.trim().toLowerCase() === fullName.toLowerCase()));
        if (existingIndex >= 0) {
            // UPDATE EXISTING PATIENT
            const prev = patientList[existingIndex];
            patientList[existingIndex] = {
                ...prev,
                firstName: firstName || prev.firstName,
                lastName: lastName || prev.lastName,
                fullName: fullName || prev.fullName,
                fatherName: fatherName || prev.fatherName,
                mobilePhone: mobilePhone || prev.mobilePhone,
                nationalId: nationalId || prev.nationalId,
                passportNumber: passportNumber || prev.passportNumber,
                birthDate: birthDate || prev.birthDate,
                gender: gender,
                creditConfig: {
                    ...prev.creditConfig,
                    creditLimit: creditLimit || prev.creditConfig?.creditLimit || 0,
                },
            };
            updatedCount++;
        }
        else {
            // CREATE NEW PATIENT
            const newFileNumber = fileNumber || generateNextSequentialCode('CL-', patientList, 'fileNumber', 10045);
            const newPatient = {
                id: 'pat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                fileNumber: newFileNumber,
                identityCategory: nationalId ? 'iranian' : passportNumber ? 'foreign' : 'unknown',
                nationalId: nationalId,
                passportNumber: passportNumber,
                firstName: firstName || fullName,
                lastName: lastName || '',
                fullName: fullName || `${firstName} ${lastName}`.trim(),
                fatherName: fatherName,
                mobilePhone: mobilePhone,
                gender: gender,
                birthDate: birthDate,
                type: 'regular',
                verificationStatus: 'verified',
                createdAt: new Date().toISOString(),
                creditConfig: {
                    enabled: creditLimit > 0,
                    creditLimit: creditLimit,
                    maturityDays: 30,
                    currentDebt: 0,
                },
            };
            patientList.push(newPatient);
            createdCount++;
        }
    });
    return {
        updatedPatients: patientList,
        updatedCount,
        createdCount,
        validRowsCount,
        skippedRowsCount,
        validationLogs,
    };
};
// ============================================================================
// 3. MEDICAL SERVICES & TARIFFS IMPORT & EXPORT
// ============================================================================
export const exportServicesToExcel = (services) => {
    const exportRows = services.map((s) => ({
        'کد خدمت': s.code || '',
        'کد ملی ارزش نسبی': s.nationalCode || '',
        'عنوان خدمت': s.title || '',
        'گروه خدمت': s.categoryName || s.category || '',
        'تعرفه مصوب کلینیک (تومان)': s.tariffPrice || 0,
        'ضریب کا حرفه‌ای': s.kProfessional || 0,
        'ضریب کا فنی': s.kTechnical || 0,
        'ضریب کا بیهوشی': s.kAnesthesia || 0,
        'درصد پورسانت پزشک': s.doctorCommissionPercent || 0,
        'توضیحات': s.description || '',
        'وضعیت': s.active ? 'فعال' : 'غیرفعال',
    }));
    exportDataToExcel(exportRows, 'تعرفه_و_خدمات_پزشکی_کلینیک', 'خدمات');
};
export const processServicesExcelImport = (rawRows, existingServices) => {
    const serviceList = [...existingServices];
    let updatedCount = 0;
    let createdCount = 0;
    let skippedRowsCount = 0;
    let validRowsCount = 0;
    const validationLogs = [];
    rawRows.forEach((row, idx) => {
        const code = cleanExcelStringValue(row['کد خدمت'] || row['کد'] || row['code'] || '', true);
        const nationalCode = cleanExcelStringValue(row['کد ملی ارزش نسبی'] || row['nationalCode'] || '', true);
        const title = cleanExcelStringValue(row['عنوان خدمت'] || row['عنوان'] || row['نام خدمت'] || row['title'] || '', false);
        const category = cleanExcelStringValue(row['گروه خدمت'] || row['category'] || 'clinic_service', false);
        const tariffPrice = cleanExcelNumericValue(row['تعرفه مصوب کلینیک (تومان)'] || row['تعرفه'] || row['tariffPrice'], 0);
        const kProfessional = cleanExcelNumericValue(row['ضریب کا حرفه‌ای'] || row['kProfessional'], 0);
        const kTechnical = cleanExcelNumericValue(row['ضریب کا فنی'] || row['kTechnical'], 0);
        const kAnesthesia = cleanExcelNumericValue(row['ضریب کا بیهوشی'] || row['kAnesthesia'], 0);
        const doctorCommissionPercent = cleanExcelNumericValue(row['درصد پورسانت پزشک'] || row['doctorCommissionPercent'], 0);
        const description = cleanExcelStringValue(row['توضیحات'] || row['description'] || '', false);
        const active = cleanExcelBooleanValue(row['وضعیت'] || row['active'], true);
        if (!title && !code && !nationalCode) {
            skippedRowsCount++;
            return;
        }
        validRowsCount++;
        // Match existing service by code OR title
        const existingIndex = serviceList.findIndex((s) => (code && s.code.toLowerCase() === code.toLowerCase()) ||
            (nationalCode && s.nationalCode === nationalCode) ||
            (title && s.title.trim().toLowerCase() === title.toLowerCase()));
        if (existingIndex >= 0) {
            // UPDATE EXISTING SERVICE
            const prev = serviceList[existingIndex];
            serviceList[existingIndex] = {
                ...prev,
                title: title || prev.title,
                nationalCode: nationalCode || prev.nationalCode,
                category: category || prev.category,
                tariffPrice: tariffPrice || prev.tariffPrice,
                kProfessional: kProfessional || prev.kProfessional,
                kTechnical: kTechnical || prev.kTechnical,
                kAnesthesia: kAnesthesia || prev.kAnesthesia,
                doctorCommissionPercent: doctorCommissionPercent || prev.doctorCommissionPercent,
                description: description || prev.description,
                active: active,
            };
            updatedCount++;
        }
        else {
            // CREATE NEW SERVICE
            const newCode = code || generateNextSequentialCode('SRV-', serviceList, 'code', 101);
            const newService = {
                id: 'srv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                code: newCode,
                nationalCode: nationalCode,
                title: title || `خدمت جدید ${newCode}`,
                category: category,
                tariffPrice: tariffPrice,
                kProfessional: kProfessional,
                kTechnical: kTechnical,
                kAnesthesia: kAnesthesia,
                doctorCommissionPercent: doctorCommissionPercent,
                description: description,
                active: active,
            };
            serviceList.push(newService);
            createdCount++;
        }
    });
    return {
        updatedServices: serviceList,
        updatedCount,
        createdCount,
        validRowsCount,
        skippedRowsCount,
        validationLogs,
    };
};
