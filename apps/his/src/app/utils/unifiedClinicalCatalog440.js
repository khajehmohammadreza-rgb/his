import { getServiceCommissionCategory, isMedicalVisitService, calculateServiceCommission, calculateProductProfitCommission, getUserDisplayName } from './clinicalWorkflow.js?b=r24-514-1405';
import { normalizeLiveText, hasNearDuplicate } from './liveSearch440.js?b=r24-514-1405';

export const SERVICE_GROUPS_440 = Object.freeze([
  { id: 'visit', code: 'VISIT', title: 'خدمات ویزیت', legacy: ['medical_visit', 'visit'] },
  { id: 'outpatient', code: 'OPD', title: 'خدمات و اعمال سرپایی داخل مرکز', legacy: ['clinic_service', 'outpatient', 'center'] },
  { id: 'hospital', code: 'HOSP', title: 'خدمات بیمارستانی / بیمارستان گنجی', legacy: ['hospital_surgery', 'hospital', 'ganji', 'hospital_ganj'] },
]);

export function classifyService440(service = {}) {
  const explicit = normalizeLiveText(service.clinicalType || service.serviceType || service.groupType || '');
  if (['visit','medical_visit'].includes(explicit)) return 'visit';
  if (['hospital','hospital_surgery','ganji','hospital_ganj'].includes(explicit)) return 'hospital';
  if (['outpatient','clinic_service','center'].includes(explicit)) return 'outpatient';
  const category = normalizeLiveText(service.category || service.group || service.categoryCode || '');
  if (category === 'medical_visit' || category.includes('visit') || category.includes('ویزیت')) return 'visit';
  if (category.includes('hospital') || category.includes('ganj') || category.includes('بیمارستان') || category.includes('گنجی')) return 'hospital';
  if (isMedicalVisitService(service)) return 'visit';
  if (getServiceCommissionCategory(service) === 'hospital') return 'hospital';
  return 'outpatient';
}

export function catalogLabel440(type) {
  return ({ visit: 'ویزیت', outpatient: 'خدمت سرپایی مرکز', hospital: 'عمل / خدمت بیمارستان گنجی', product: 'کالا / دارو' })[type] || 'مورد';
}

export function serviceGroupTitle440(type) {
  return SERVICE_GROUPS_440.find(x => x.id === type)?.title || catalogLabel440(type);
}

export function serviceInternalCodeNumber440(code = '') {
  const m = String(code || '').match(/(?:SRV|SVC|HIS|INT)[-_/ ]?(\d+)$/i) || String(code || '').match(/(\d+)$/);
  return m ? Number(m[1]) || 0 : 0;
}

export function nextServiceInternalCode440(services = []) {
  const max = Math.max(0, ...services.map(s => serviceInternalCodeNumber440(s.internalCode || s.code || '')));
  return `SRV-${String(max + 1).padStart(5, '0')}`;
}

export function nextProductInternalCode440(products = []) {
  const nums = (products || []).map(p => {
    const m = String(p.internalCode || p.code || '').match(/(\d+)$/);
    return m ? Number(m[1]) || 0 : 0;
  });
  return `PRD-${String(Math.max(0, ...nums) + 1).padStart(5, '0')}`;
}

export function validateUniqueService440(service = {}, services = [], ignoreId = '') {
  const internal = normalizeLiveText(service.internalCode || service.code || '');
  if (!internal) return { ok: false, error: 'کد داخلی خدمت الزامی است.' };
  const duplicateCode = services.find(s => String(s.id) !== String(ignoreId || service.id || '') && normalizeLiveText(s.internalCode || s.code || '') === internal);
  if (duplicateCode) return { ok: false, error: `کد داخلی «${service.internalCode || service.code}» قبلاً برای ${duplicateCode.title || duplicateCode.name} ثبت شده است.`, duplicate: duplicateCode };
  const normalizedTitle = normalizeLiveText(service.title || service.name || '');
  if (!normalizedTitle) return { ok: false, error: 'نام خدمت الزامی است.' };
  const exact = services.find(s => String(s.id) !== String(ignoreId || service.id || '') && normalizeLiveText(s.title || s.name || '') === normalizedTitle);
  if (exact) return { ok: false, error: `خدمت «${service.title || service.name}» قبلاً ثبت شده است.`, duplicate: exact };
  return { ok: true };
}

export function validateUniqueProduct440(product = {}, products = [], ignoreId = '') {
  const internal = normalizeLiveText(product.internalCode || product.code || '');
  if (!internal) return { ok: false, error: 'کد داخلی کالا الزامی است.' };
  const dupCode = products.find(p => String(p.id) !== String(ignoreId || product.id || '') && normalizeLiveText(p.internalCode || p.code || '') === internal);
  if (dupCode) return { ok: false, error: `کد داخلی «${product.internalCode || product.code}» قبلاً برای ${dupCode.name || dupCode.title} ثبت شده است.`, duplicate: dupCode };
  const barcode = normalizeLiveText(product.barcode || '');
  if (barcode) {
    const dupBar = products.find(p => String(p.id) !== String(ignoreId || product.id || '') && normalizeLiveText(p.barcode || '') === barcode);
    if (dupBar) return { ok: false, error: `بارکد «${product.barcode}» قبلاً برای ${dupBar.name || dupBar.title} ثبت شده است.`, duplicate: dupBar };
  }
  const title = normalizeLiveText(product.name || product.title || '');
  if (!title) return { ok: false, error: 'نام کالا الزامی است.' };
  const exact = products.find(p => String(p.id) !== String(ignoreId || product.id || '') && normalizeLiveText(p.name || p.title || '') === title);
  if (exact) return { ok: false, error: `کالای «${product.name || product.title}» قبلاً ثبت شده است.`, duplicate: exact };
  return { ok: true };
}

export function similarServices440(services = [], query = '', limit = 12) {
  return hasNearDuplicate(services.filter(s => s?.active !== false), query, s => `${s.title || s.name || ''} ${s.internalCode || s.code || ''} ${s.nationalCode || ''} ${serviceGroupTitle440(classifyService440(s))}`, limit);
}

export function similarProducts440(products = [], query = '', limit = 12) {
  return hasNearDuplicate(products.filter(p => p?.active !== false), query, p => `${p.name || p.title || ''} ${p.internalCode || p.code || ''} ${p.barcode || ''} ${p.categoryName || ''}`, limit);
}

export function normalizeServiceForCatalog440(service = {}, services = []) {
  const type = classifyService440(service);
  const internalCode = service.internalCode || service.code || nextServiceInternalCode440(services);
  return {
    ...service,
    internalCode,
    code: internalCode,
    clinicalType: type,
    serviceType: type,
    category: type === 'visit' ? 'medical_visit' : type === 'hospital' ? 'hospital_surgery' : 'clinic_service',
    groupType: type,
    groupTitle: serviceGroupTitle440(type),
    sourceType: service.sourceType || (service.nationalCode ? 'relative_value_book' : 'center_custom'),
    active: service.active !== false,
  };
}

export function normalizeProductForCatalog440(product = {}, products = []) {
  const internalCode = product.internalCode || product.code || nextProductInternalCode440(products);
  return {
    ...product,
    internalCode,
    code: internalCode,
    itemType: 'product',
    active: product.active !== false,
  };
}

export function makeCatalogEntry440(kind, item) {
  const type = kind === 'product' ? 'product' : classifyService440(item);
  const price = Number(kind === 'product'
    ? (item?.salesPrice ?? item?.price ?? item?.unitPrice ?? 0)
    : (item?.tariffPrice ?? item?.price ?? item?.unitPrice ?? 0)) || 0;
  return {
    key: `${kind}:${String(item?.id || item?.internalCode || item?.code || item?.barcode || '')}`,
    kind,
    type,
    item,
    id: item?.id || '',
    title: item?.title || item?.name || catalogLabel440(type),
    code: item?.internalCode || item?.code || item?.serviceCode || item?.productCode || item?.barcode || item?.id || '',
    price,
    stock: kind === 'product' ? Number(item?.stockQuantity ?? item?.stock ?? 0) : null,
  };
}

export function makeClinicalOrder440(service, actor, sourceStage = 'reception', patch = {}) {
  const type = classifyService440(service);
  return {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    serviceId: service.id,
    internalCode: service.internalCode || service.code || '',
    nationalCode: service.nationalCode || '',
    title: service.title || service.name || 'خدمت',
    category: service.category || '',
    serviceType: type,
    target: type === 'hospital' ? 'external' : (type === 'visit' ? 'doctor' : 'center'),
    timing: 'today',
    scheduledDate: '',
    scheduledTime: '',
    instructions: '',
    status: 'ordered',
    sourceStage,
    requestedAt: new Date().toISOString(),
    requestedById: actor?.id || '',
    requestedByName: getUserDisplayName(actor),
    requestedByRole: actor?.role || '',
    ...patch,
  };
}

export function makeFreeTextOrder440({ title = '', instructions = '', actor, sourceStage = 'doctor', target = 'nurse' }) {
  return {
    id: `ord-free-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    serviceId: '', internalCode: '', nationalCode: '',
    title: String(title || '').trim() || 'دستور آزاد پزشک',
    instructions: String(instructions || '').trim(),
    serviceType: 'free_text',
    target: target === 'discharge' ? 'discharge' : 'center',
    timing: 'today', status: 'ordered', sourceStage,
    isFreeText: true,
    requestedAt: new Date().toISOString(),
    requestedById: actor?.id || '', requestedByName: getUserDisplayName(actor), requestedByRole: actor?.role || '',
  };
}

export function makeServiceLine440(service, quantity = 1, actor, doctor = null, assistant = null, status = 'registered', patch = {}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const unitPrice = Number(service?.tariffPrice ?? service?.price ?? service?.unitPrice ?? 0) || 0;
  const commission = calculateServiceCommission(service, qty, doctor, assistant);
  const type = classifyService440(service);
  return {
    id: `srvline-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    serviceId: service.id,
    internalCode: service.internalCode || service.code || '',
    nationalCode: service.nationalCode || '',
    title: service.title || service.name || 'خدمت',
    category: service.category || '',
    clinicalType: type, serviceType: type,
    quantity: qty, unitPrice, price: unitPrice * qty,
    priceSnapshot: unitPrice,
    status,
    registeredAt: new Date().toISOString(),
    registeredById: actor?.id || '', registeredByName: getUserDisplayName(actor), registeredByRole: actor?.role || '',
    originalData: service,
    ...commission,
    ...patch,
  };
}

export function makeProductLine440(product, quantity = 1, actor, patch = {}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const unitPrice = Number(product?.salesPrice ?? product?.price ?? product?.unitPrice ?? product?.purchasePrice ?? 0) || 0;
  return {
    id: `prdline-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    productId: product.id,
    internalCode: product.internalCode || product.code || '',
    title: product.name || product.title || 'کالا', productName: product.name || product.title || 'کالا',
    quantity: qty, unitPrice, price: unitPrice * qty, priceSnapshot: unitPrice,
    unit: product.unit || 'عدد', barcode: product.barcode || '', status: 'registered',
    registeredAt: new Date().toISOString(),
    registeredById: actor?.id || '', registeredByName: getUserDisplayName(actor), registeredByRole: actor?.role || '',
    originalData: product,
    ...calculateProductProfitCommission(product, qty, actor),
    ...patch,
  };
}

export function makeAppointment440({ service, type = '', patient = null, actor = null, doctor = null, date = '', time = '', sourceStage = 'reception', note = '', facility = '' }) {
  const serviceType = type || classifyService440(service || {});
  return {
    id: `apt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    serviceId: service?.id || '',
    internalCode: service?.internalCode || service?.code || '',
    title: service?.title || service?.name || catalogLabel440(serviceType),
    type: serviceType,
    date, time,
    patientId: patient?.id || patient?.patientId || '',
    patientName: patient?.fullName || patient?.patientName || '',
    doctorId: doctor?.id || '', doctorName: getUserDisplayName(doctor),
    facility: facility || (serviceType === 'hospital' ? (service?.facilityName || 'بیمارستان گنجی') : 'مرکز'),
    status: 'scheduled', sourceStage, note,
    createdAt: new Date().toISOString(), createdById: actor?.id || '', createdByName: getUserDisplayName(actor),
  };
}

// Compatibility aliases. Build 440 components should prefer the suffixed names,
// but preserving these exports prevents regressions in unchanged healthy modules.
export const classifyService = classifyService440;
export const catalogLabel = catalogLabel440;
export const makeServiceLine = makeServiceLine440;
export const makeProductLine = makeProductLine440;
export const makeClinicalOrder = makeClinicalOrder440;
export const makeAppointment = makeAppointment440;
