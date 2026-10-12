import React, { useEffect, useMemo, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Package, Stethoscope, Trash2, Plus, Layers, CheckCircle2 } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { SearchableItemSelector } from './SearchableItemSelector.js?b=r24-514-1405';
import { normalizeServiceClinicalRules } from '../utils/clinicalWorkflow.js?b=r24-514-1405';

const h = React.createElement;
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;
const lineQty = (line) => Math.max(1, Number(line?.quantity || 1));
const lineUnit = (line) => Number(line?.unitPrice ?? line?.price ?? 0) || 0;
const lineTotal = (line) => lineUnit(line) * lineQty(line);

function QuantityControl({ line, onChange, disabled = false }) {
  if (!onChange || disabled) return h('span', { className: 'clinical-qty-static' }, `${lineQty(line).toLocaleString('fa-IR')} عدد`);
  const qty = lineQty(line);
  return h('div', { className: 'clinical-qty-control' },
    h('button', { type: 'button', disabled: qty <= 1, onClick: () => onChange(line, Math.max(1, qty - 1)), 'aria-label': 'کاهش تعداد' }, h('span', null, '−')),
    h('input', { type: 'number', min: 1, value: qty, onChange: (e) => onChange(line, Math.max(1, Number(e.target.value) || 1)), 'aria-label': 'تعداد' }),
    h('button', { type: 'button', onClick: () => onChange(line, qty + 1), 'aria-label': 'افزایش تعداد' }, h(Plus, { className: 'w-4 h-4' }))
  );
}

function EmptyState() {
  return h('div', { className: 'clinical-empty-state clinical-empty-state-wide' },
    h(Layers, { className: 'w-8 h-8' }),
    h('strong', null, 'هنوز موردی برای بیمار ثبت نشده است'),
    h('span', null, 'از جستجوی بالا خدمت، دارو یا کالای مصرفی را انتخاب کنید.')
  );
}

export function UnifiedClinicalItemsEditor({
  medicalServices = [], products = [], serviceLines = [], productLines = [],
  onAddService, onAddProduct, onRemoveService, onRemoveProduct,
  onUpdateServiceQuantity, onUpdateProductQuantity,
  title = 'ثبت خدمات، دارو و کالای مصرفی', readOnly = false,
}) {
  const [activeTab, setActiveTab] = useState('service');
  const [serverCatalog, setServerCatalog] = useState({ medicalServices: [], products: [] });
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);

  const refreshServerCatalog = async () => {
    const session = globalThis?.__BASTIYAN_PORTAL_SESSION__;
    const centerId = session?.center?.id;
    if (!centerId || catalogRefreshing) return;
    setCatalogRefreshing(true);
    try {
      const response = await fetch(`./api/bastian/centers/${encodeURIComponent(centerId)}/online-data?catalogRefresh=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      const state = data?.state || {};
      setServerCatalog({
        medicalServices: Array.isArray(state.medicalServices) ? state.medicalServices : [],
        products: Array.isArray(state.products) ? state.products : [],
      });
    } catch (error) {
      console.warn('[Bastiyan] clinical catalog refresh failed', error);
    } finally {
      setCatalogRefreshing(false);
    }
  };

  useEffect(() => {
    if ((medicalServices?.length || 0) === 0 || (products?.length || 0) === 0) refreshServerCatalog();
  }, [medicalServices?.length, products?.length]);

  const effectiveServices = (medicalServices?.length || 0) > 0 ? medicalServices : serverCatalog.medicalServices;
  const effectiveProducts = (products?.length || 0) > 0 ? products : serverCatalog.products;

  const serviceItems = useMemo(() => effectiveServices.filter((s) => s && s.active !== false).map((s) => ({
    id: s.id, title: s.title || s.name, price: Number(s.tariffPrice ?? s.price ?? 0), code: s.code || s.serviceCode,
    systemCode: s.systemCode || s.internalCode || s.id, barcode: s.barcode || '',
    category: s.category, originalData: s,
  })), [effectiveServices]);
  const productItems = useMemo(() => effectiveProducts.filter((p) => p && p.active !== false).map((p) => ({
    id: p.id, title: p.name || p.title, price: Number(p.salesPrice ?? p.price ?? p.purchasePrice ?? 0),
    code: p.code || p.productCode || p.barcode, barcode: p.barcode || '', systemCode: p.systemCode || p.internalCode || p.id, sku: p.sku || '',
    unit: p.unit, stockQuantity: p.stockQuantity, category: p.category, originalData: p,
  })), [effectiveProducts]);

  const servicesTotal = serviceLines.reduce((sum, x) => sum + lineTotal(x), 0);
  const productsTotal = productLines.reduce((sum, x) => sum + lineTotal(x), 0);
  const total = servicesTotal + productsTotal;
  const count = serviceLines.length + productLines.length;
  const rows = [
    ...serviceLines.map((line) => ({ kind: 'service', line })),
    ...productLines.map((line) => ({ kind: 'product', line })),
  ];

  return h('section', { className: 'clinical-editor-shell' },
    h('div', { className: 'clinical-editor-header' },
      h('div', { className: 'clinical-editor-title' },
        h('span', { className: 'clinical-editor-icon' }, h(Layers, { className: 'w-5 h-5' })),
        h('div', null,
          h('h3', null, title),
          h('p', null, 'یک فرم واحد برای ثبت تمام خدمات و اقلام این مراجعه')
        )
      ),
      h('div', { className: 'clinical-editor-summary' },
        h('span', null, `${count.toLocaleString('fa-IR')} ردیف`),
        h('strong', null, money(total))
      )
    ),

    !readOnly && h('div', { className: 'clinical-editor-picker' },
      h('div', { className: 'clinical-editor-tabs', role: 'tablist', 'aria-label': 'نوع مورد قابل ثبت' },
        h('button', { type: 'button', className: activeTab === 'service' ? 'active' : '', onClick: () => setActiveTab('service') },
          h(Stethoscope, { className: 'w-4 h-4' }), 'خدمت', h('span', null, serviceItems.length.toLocaleString('fa-IR'))
        ),
        h('button', { type: 'button', className: activeTab === 'product' ? 'active' : '', onClick: () => setActiveTab('product') },
          h(Package, { className: 'w-4 h-4' }), 'دارو / کالا', h('span', null, productItems.length.toLocaleString('fa-IR'))
        )
      ),
      h('div', { className: 'clinical-editor-searchbox' },
        activeTab === 'service'
          ? h(SearchableItemSelector, { type: 'service', items: serviceItems, products: effectiveProducts, label: 'جستجو و افزودن خدمت', onAddItem: onAddService, onManualAdd: onAddService, allowManual: false, allowScanner: false })
          : h(SearchableItemSelector, { type: 'product', items: productItems, products: effectiveProducts, label: 'جستجو و افزودن دارو / کالا', onAddItem: onAddProduct, onManualAdd: onAddProduct, allowManual: false, allowScanner: true }),
        ((activeTab === 'service' ? serviceItems.length : productItems.length) === 0) && h('button', {
          type: 'button', onClick: refreshServerCatalog, disabled: catalogRefreshing, className: 'clinical-catalog-refresh-btn'
        }, catalogRefreshing ? 'در حال بازخوانی دیتابیس مرکز…' : 'بازخوانی مستقیم فهرست از دیتابیس مرکز')
      )
    ),

    h('div', { className: 'clinical-selected-section' },
      h('div', { className: 'clinical-selected-head' },
        h('div', null,
          h('strong', null, 'موارد ثبت‌شده برای بیمار'),
          h('span', null, 'خدمات و کالاها در یک فهرست واحد نمایش داده می‌شوند.')
        ),
        h('div', { className: 'clinical-selected-totals' },
          h('span', null, `خدمات ${money(servicesTotal)}`),
          h('span', null, `اقلام ${money(productsTotal)}`)
        )
      ),
      rows.length === 0 ? h(EmptyState) : h('div', { className: 'clinical-unified-lines' },
        ...rows.map(({ kind, line }) => {
          const isService = kind === 'service';
          const rule = isService ? normalizeServiceClinicalRules(line.originalData || line) : null;
          return h('div', { key: `${kind}-${line.id}`, className: 'clinical-unified-row' },
            h('div', { className: `clinical-type-icon ${isService ? 'service' : 'product'}` }, isService ? h(Stethoscope, { className: 'w-4 h-4' }) : h(Package, { className: 'w-4 h-4' })),
            h('div', { className: 'clinical-line-main' },
              h('div', { className: 'clinical-line-title' }, line.title),
              h('div', { className: 'clinical-line-meta' },
                h('span', null, isService ? 'خدمت' : 'دارو / کالا'),
                h('span', null, `قیمت واحد: ${money(lineUnit(line))}`),
                isService ? h('span', { className: rule.requiresAssistant ? 'assistant yes' : 'assistant no' }, rule.requiresAssistant ? 'با دستیار' : 'بدون دستیار') : null,
                isService && line.doctorName ? h('span', null, `پزشک: ${line.doctorName}`) : null,
                isService && line.assistantName ? h('span', null, `دستیار: ${line.assistantName}`) : null,
                !isService && line.unit ? h('span', null, `واحد: ${line.unit}`) : null
              )
            ),
            h('div', { className: 'clinical-line-actions' },
              h(QuantityControl, { line, onChange: isService ? onUpdateServiceQuantity : onUpdateProductQuantity, disabled: readOnly }),
              h('strong', { className: 'clinical-line-total' }, money(lineTotal(line))),
              !readOnly && (isService ? onRemoveService : onRemoveProduct) ? h('button', {
                type: 'button',
                onClick: () => (isService ? onRemoveService?.(line) : onRemoveProduct?.(line)),
                className: 'clinical-delete-btn', title: isService ? 'حذف خدمت' : 'حذف کالا',
              }, h(Trash2, { className: 'w-4 h-4' })) : null
            )
          );
        })
      )
    ),
    h('div', { className: 'clinical-editor-footer' },
      h('div', null, h(CheckCircle2, { className: 'w-4 h-4' }), h('span', null, 'اطلاعات از فهرست خدمات و انبار همین مرکز خوانده می‌شود.')),
      h('strong', null, `جمع کل: ${money(total)}`)
    )
  );
}
