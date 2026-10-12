import React, { useEffect, useMemo, useRef, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, X, Stethoscope, Package, Barcode, Check, Package as Boxes, AlertTriangle } from '../../client-vendor/lucide-react.js?b=r24-514-1405';

const h = React.createElement;
const normalize = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  .replace(/[أإٱ]/g, 'ا').replace(/ة/g, 'ه')
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/[\u200c\u200f\u200e]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const serviceText = (x) => [x?.title, x?.name, x?.code, x?.serviceCode, x?.systemCode, x?.internalCode, x?.id, x?.category, x?.groupTitle].filter(Boolean).join(' ');
const productText = (x) => [x?.name, x?.title, x?.code, x?.productCode, x?.systemCode, x?.internalCode, x?.id, x?.barcode, x?.sku, x?.category, x?.unit].filter(Boolean).join(' ');
const labelOf = (x, kind) => kind === 'product' ? (x?.name || x?.title || 'کالا') : (x?.title || x?.name || 'خدمت');
const codeOf = (x) => x?.code || x?.serviceCode || x?.productCode || x?.systemCode || x?.internalCode || x?.barcode || x?.id || '—';
const money = (v) => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;

export function ProfessionalCatalogPicker({
  open = false,
  kind = 'service',
  items = [],
  onSelect,
  onClose,
  title,
  subtitle,
  showPrice = false,
  showStock = true,
  initialQuery = '',
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const isProduct = kind === 'product';

  useEffect(() => {
    if (!open) return undefined;
    setQuery(initialQuery || '');
    setCategory('all');
    setActiveIndex(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', esc);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
  }, [open, initialQuery, onClose]);

  const categories = useMemo(() => {
    const names = new Map();
    for (const item of items || []) {
      if (!item || item.active === false) continue;
      const raw = String(item.categoryTitle || item.groupTitle || item.category || '').trim();
      if (!raw) continue;
      names.set(raw, (names.get(raw) || 0) + 1);
    }
    return [...names.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [items]);

  const results = useMemo(() => {
    const q = normalize(query);
    return (items || [])
      .filter((x) => x && x.active !== false)
      .filter((x) => category === 'all' || String(x.categoryTitle || x.groupTitle || x.category || '') === category)
      .map((item, index) => {
        const text = normalize(isProduct ? productText(item) : serviceText(item));
        const titleText = normalize(labelOf(item, kind));
        const codeText = normalize(codeOf(item));
        let score = 1;
        if (q) {
          if (titleText === q || codeText === q) score = 1000;
          else if (titleText.startsWith(q) || codeText.startsWith(q)) score = 700;
          else if (titleText.includes(q) || codeText.includes(q)) score = 500;
          else if (text.includes(q)) score = 250;
          else score = 0;
        }
        return { item, score, index };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 250)
      .map((x) => x.item);
  }, [items, query, category, isProduct, kind]);

  useEffect(() => {
    setActiveIndex(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query, category]);

  if (!open) return null;

  const choose = (item) => {
    onSelect?.(item);
  };
  const keyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      choose(results[activeIndex]);
    }
  };

  const Icon = isProduct ? Package : Stethoscope;
  return h('div', { className: 'bhis-picker-overlay', dir: 'rtl', role: 'dialog', 'aria-modal': 'true' },
    h('div', { className: 'bhis-picker-panel' },
      h('header', { className: 'bhis-picker-header' },
        h('div', { className: `bhis-picker-kind ${isProduct ? 'product' : 'service'}` }, h(Icon, { className: 'w-5 h-5' })),
        h('div', { className: 'bhis-picker-heading' },
          h('h2', null, title || (isProduct ? 'انتخاب دارو / کالا' : 'انتخاب خدمت')),
          h('p', null, subtitle || (isProduct ? 'جستجو با نام، کد داخلی یا بارکد؛ فهرست مستقل و قابل اسکرول است.' : 'جستجو با نام یا کد خدمت؛ انتخاب اینجا فقط یک مورد را به پرونده اضافه می‌کند.'))
        ),
        h('button', { type: 'button', onClick: onClose, className: 'bhis-icon-button', 'aria-label': 'بستن' }, h(X, { className: 'w-5 h-5' }))
      ),
      h('div', { className: 'bhis-picker-searchbar' },
        h(Search, { className: 'w-5 h-5' }),
        h('input', {
          ref: searchRef,
          value: query,
          onChange: (e) => setQuery(e.target.value),
          onKeyDown: keyDown,
          placeholder: isProduct ? 'نام کالا، کد، SKU یا بارکد...' : 'نام خدمت یا کد خدمت...',
          autoComplete: 'off',
          inputMode: 'search',
        }),
        query ? h('button', { type: 'button', onClick: () => setQuery(''), className: 'bhis-clear-search' }, h(X, { className: 'w-4 h-4' })) : null
      ),
      categories.length ? h('div', { className: 'bhis-picker-categories' },
        h('button', { type: 'button', className: category === 'all' ? 'active' : '', onClick: () => setCategory('all') }, `همه (${(items || []).filter(x => x && x.active !== false).length.toLocaleString('fa-IR')})`),
        ...categories.map(([name, count]) => h('button', { key: name, type: 'button', className: category === name ? 'active' : '', onClick: () => setCategory(name) }, `${name} (${count.toLocaleString('fa-IR')})`))
      ) : null,
      h('div', { className: 'bhis-picker-result-meta' },
        h('span', null, h(Boxes, { className: 'w-4 h-4' }), `${results.length.toLocaleString('fa-IR')} نتیجه`),
        h('span', null, '↑ ↓ حرکت • Enter انتخاب • Esc بستن')
      ),
      h('div', { ref: listRef, className: 'bhis-picker-results', tabIndex: 0, onKeyDown: keyDown },
        results.length === 0
          ? h('div', { className: 'bhis-picker-empty' }, h(Search, { className: 'w-8 h-8' }), h('strong', null, 'نتیجه‌ای پیدا نشد'), h('span', null, 'عبارت کوتاه‌تری وارد کنید یا دسته‌بندی را روی «همه» قرار دهید.'))
          : results.map((item, index) => {
              const stock = Number(item.stockQuantity ?? item.stock ?? 0);
              const price = Number(isProduct ? (item.salesPrice ?? item.price ?? item.purchasePrice ?? 0) : (item.tariffPrice ?? item.price ?? 0));
              const categoryLabel = item.categoryTitle || item.groupTitle || item.category || '';
              return h('button', {
                key: String(item.id || `${kind}-${index}`), type: 'button',
                className: `bhis-picker-row ${index === activeIndex ? 'active' : ''}`,
                onMouseEnter: () => setActiveIndex(index), onClick: () => choose(item),
              },
                h('span', { className: `bhis-picker-row-icon ${isProduct ? 'product' : 'service'}` }, isProduct ? h(Package, { className: 'w-4 h-4' }) : h(Stethoscope, { className: 'w-4 h-4' })),
                h('span', { className: 'bhis-picker-row-main' },
                  h('strong', null, labelOf(item, kind)),
                  h('span', { className: 'bhis-picker-row-sub' },
                    h('em', null, `کد: ${codeOf(item)}`),
                    categoryLabel ? h('em', null, categoryLabel) : null,
                    isProduct && item.barcode ? h('em', { className: 'barcode' }, h(Barcode, { className: 'w-3 h-3' }), String(item.barcode)) : null
                  )
                ),
                h('span', { className: 'bhis-picker-row-aside' },
                  isProduct && showStock ? h('span', { className: `bhis-stock ${stock <= 0 ? 'empty' : stock <= 5 ? 'low' : ''}` }, stock <= 0 ? h(AlertTriangle, { className: 'w-3.5 h-3.5' }) : null, `موجودی ${stock.toLocaleString('fa-IR')}`) : null,
                  showPrice ? h('strong', null, money(price)) : null,
                  h('span', { className: 'bhis-select-mark' }, h(Check, { className: 'w-4 h-4' }), 'انتخاب')
                )
              );
            })
      )
    )
  );
}
