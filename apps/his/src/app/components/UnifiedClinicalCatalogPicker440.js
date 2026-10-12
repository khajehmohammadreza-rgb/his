import React, { useEffect, useMemo, useRef, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Search, X, Stethoscope, Package, Activity, Building2, CheckCircle2, Camera, Plus, Minus, CheckSquare, CheckCircle2 as Keyboard } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { classifyService440, catalogLabel440 } from '../utils/unifiedClinicalCatalog440.js?b=r24-514-1405';
import { normalizeLiveText, latinDigits } from '../utils/liveSearch440.js?b=r24-514-1405';
import { BarcodeCameraScanner } from './BarcodeCameraScanner434.js?b=r24-514-1405';

const h = React.createElement;
const digits = v => latinDigits(v).replace(/[^0-9]/g, '');
const money = v => `${Number(v || 0).toLocaleString('fa-IR')} تومان`;

export function UnifiedClinicalCatalogPicker({
  open = false, medicalServices = [], products = [], onSelect, onSelectMany, onClose,
  allowedTypes = ['visit', 'outpatient', 'hospital', 'product'], title = 'فهرست یکپارچه خدمات و کالا',
  initialTab = 'all', autoStartScanner = false, multiService = false,
}) {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [quickMatch, setQuickMatch] = useState(null);
  const [quickQty, setQuickQty] = useState(1);
  const [scanControl, setScanControl] = useState(null);
  const [serviceSelection, setServiceSelection] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [createKind, setCreateKind] = useState('');
  const [createForm, setCreateForm] = useState({ title:'', code:'', price:'', barcode:'', stock:'', unit:'عدد' });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const startTab = allowedTypes.length === 1 ? allowedTypes[0] : (allowedTypes.includes(initialTab) || initialTab === 'all' ? initialTab : 'all');
    setTab(startTab); setQuery(''); setServiceSelection([]); setActiveIndex(0);
    setScannerOpen(Boolean(autoStartScanner && allowedTypes.includes('product')));
    setScanMessage(''); setQuickMatch(null); setQuickQty(1);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const key = e => { if (e.key === 'Escape' && !scannerOpen && !quickMatch) onClose?.(); };
    window.addEventListener('keydown', key);
    return () => { clearTimeout(t); window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [open, initialTab, autoStartScanner]);

  const allRows = useMemo(() => {
    const list = [];
    for (const s of medicalServices || []) {
      if (!s || s.active === false) continue;
      const type = classifyService440(s); if (!allowedTypes.includes(type)) continue;
      list.push({ kind: 'service', type, item: s, title: s.title || s.name || 'خدمت', code: s.code || s.serviceCode || s.id || '', price: Number(s.tariffPrice ?? s.price ?? 0) || 0, stock: null });
    }
    if (allowedTypes.includes('product')) for (const p of products || []) {
      if (!p || p.active === false) continue;
      list.push({ kind: 'product', type: 'product', item: p, title: p.name || p.title || 'کالا', code: p.code || p.productCode || p.barcode || p.id || '', price: Number(p.salesPrice ?? p.price ?? p.unitPrice ?? 0) || 0, stock: Number(p.stockQuantity ?? p.stock ?? 0) });
    }
    return list;
  }, [medicalServices, products, allowedTypes]);

  const rows = useMemo(() => {
    const q = normalizeLiveText(query), qd = digits(query);
    const base = allRows.filter(r => tab === 'all' || r.type === tab);
    if (!q && tab === 'all') return [];
    return base.filter(r => {
      if (!q) return true;
      const text = normalizeLiveText(`${r.title} ${r.code} ${r.item?.barcode || ''} ${r.item?.categoryName || r.item?.category || ''} ${r.item?.genericName || ''} ${r.item?.brand || ''} ${r.item?.unit || ''} ${r.item?.nationalCode || ''}`);
      return text.includes(q) || (qd && digits(`${r.code} ${r.item?.barcode || ''} ${r.item?.nationalCode || ''}`).includes(qd));
    }).slice(0, 600);
  }, [allRows, tab, query]);

  useEffect(() => { setActiveIndex(i => Math.max(0, Math.min(i, Math.max(0, rows.length - 1)))); }, [rows.length]);
  if (!open) return null;

  const tabs = [['all','همه'],['visit','ویزیت'],['outpatient','سرپایی مرکز'],['hospital','بیمارستان گنجی'],['product','کالا و دارو']].filter(([id]) => id === 'all' || allowedTypes.includes(id));
  const icon = type => type === 'product' ? Package : type === 'hospital' ? Building2 : type === 'outpatient' ? Activity : Stethoscope;
  const rowKey = r => `${r.kind}:${r.item?.id || r.code}`;
  const isPicked = r => serviceSelection.some(x => rowKey(x) === rowKey(r));
  const toggleService = r => setServiceSelection(prev => isPicked(r) ? prev.filter(x => rowKey(x) !== rowKey(r)) : [...prev, { ...r, quantity: 1 }]);

  const startProductQuantity = (row, control = null) => { setQuickMatch(row); setQuickQty(1); setScanControl(control); setScanMessage(`شناسایی شد: ${row.title}`); };
  const chooseRow = r => {
    if (r.kind === 'product') { startProductQuantity(r); return; }
    if (multiService) { toggleService(r); return; }
    onSelect?.({ ...r, quantity: 1 });
  };

  const confirmServices = () => {
    if (!serviceSelection.length) return;
    if (onSelectMany) onSelectMany(serviceSelection.map(x => ({ ...x, quantity: 1 })));
    else serviceSelection.forEach(x => onSelect?.({ ...x, quantity: 1 }));
    setServiceSelection([]); onClose?.();
  };

  const handleBarcode = (raw, control) => {
    const code = String(raw || '').trim(); if (!code) return false;
    const match = allRows.find(r => r.kind === 'product' && String(r.item?.barcode || r.code || '').trim() === code);
    if (match) { startProductQuantity(match, control || null); return false; }
    setTab('product'); setQuery(code); setScanMessage('بارکد خوانده شد اما کالا در مرکز تعریف نشده است؛ جستجوی دستی باز مانده است.'); control?.resume?.(); return false;
  };

  const confirmQuick = () => {
    if (!quickMatch) return;
    const qty = Math.max(1, Number(quickQty) || 1);
    if (Number.isFinite(quickMatch.stock) && quickMatch.stock >= 0 && qty > quickMatch.stock) { alert(`موجودی کافی نیست. موجودی فعلی: ${Number(quickMatch.stock).toLocaleString('fa-IR')}`); return; }
    onSelect?.({ ...quickMatch, quantity: qty, rapidScan: true });
    setScanMessage(`${quickMatch.title} × ${qty.toLocaleString('fa-IR')} ثبت شد؛ آماده ثبت بعدی.`);
    setQuickMatch(null); setQuickQty(1); scanControl?.resume?.(); setScanControl(null);
    if (!scannerOpen) setTimeout(() => inputRef.current?.focus(), 25);
  };


  const openQuickCreate = kind => {
    setCreateKind(kind);
    setCreateForm({ title: query || '', code: '', price: '', barcode: kind==='product'?query:'', stock: kind==='product'?'0':'', unit:'عدد' });
  };
  const saveQuickCreate = () => {
    const title = String(createForm.title || '').trim();
    if (!title) return alert(createKind==='product'?'نام کالا را وارد کنید.':'عنوان خدمت را وارد کنید.');
    if (createKind === 'product') {
      const duplicate = (products||[]).some(p => String(p.name||p.title||'').trim().toLowerCase()===title.toLowerCase() || (createForm.barcode && String(p.barcode||'')===String(createForm.barcode)));
      if (duplicate) return alert('کالایی با همین نام یا بارکد قبلاً ثبت شده است.');
      const item={ id:`prd-${Date.now()}`, name:title, title, code:String(createForm.code||'').trim()||`PRD-${Date.now().toString().slice(-6)}`, barcode:String(createForm.barcode||'').trim(), salesPrice:Math.max(0,Number(createForm.price||0)), price:Math.max(0,Number(createForm.price||0)), stockQuantity:Math.max(0,Number(createForm.stock||0)), minStock:5, unit:String(createForm.unit||'عدد').trim()||'عدد', active:true, createdFrom:'global_quick_create', createdAt:new Date().toISOString() };
      window.dispatchEvent(new CustomEvent('bastiyan:quick-catalog-create',{detail:{kind:'product',item}}));
      onSelect?.({kind:'product',type:'product',item,title:item.name,code:item.code,price:item.salesPrice,stock:item.stockQuantity,quantity:1,quickCreated:true});
    } else {
      const duplicate=(medicalServices||[]).some(x=>String(x.title||x.name||'').trim().toLowerCase()===title.toLowerCase());
      if(duplicate) return alert('خدمتی با همین عنوان قبلاً ثبت شده است.');
      const item={ id:`srv-${Date.now()}`, title, code:String(createForm.code||'').trim()||`SRV-${Date.now().toString().slice(-6)}`, category:'clinic_service', categoryName:'خدمات کلینیکی و سرپایی', tariffPrice:Math.max(0,Number(createForm.price||0)), price:Math.max(0,Number(createForm.price||0)), active:true, createdFrom:'global_quick_create', createdAt:new Date().toISOString() };
      window.dispatchEvent(new CustomEvent('bastiyan:quick-catalog-create',{detail:{kind:'service',item}}));
      if(multiService) setServiceSelection(prev=>[...prev,{kind:'service',type:'outpatient',item,title:item.title,code:item.code,price:item.tariffPrice,quantity:1}]); else onSelect?.({kind:'service',type:'outpatient',item,title:item.title,code:item.code,price:item.tariffPrice,quantity:1,quickCreated:true});
    }
    setCreateKind(''); setCreateForm({title:'',code:'',price:'',barcode:'',stock:'',unit:'عدد'});
  };

  const searchKey = e => {
    if (!rows.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(rows.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); chooseRow(rows[activeIndex]); }
  };

  return h('div', { className: 'bhis-picker-overlay', dir: 'rtl', role: 'dialog', 'aria-modal': 'true' },
    h('div', { className: 'bhis-picker-panel bhis-unified-picker bhis-picker-440', 'data-testid': 'unified-catalog-picker-440' },
      h('header', { className: 'bhis-picker-header' }, h('div', { className: 'bhis-picker-kind' }, h(Stethoscope, { className: 'w-5 h-5' })), h('div', { className: 'bhis-picker-heading' }, h('h2', null, title), h('p', null, multiService ? 'خدمات را با تیک انتخاب و یک‌جا ثبت کنید؛ کالا با Enter/بارکد و تعیین تعداد ثبت می‌شود.' : 'جستجوی زنده نام، کد، دسته و بارکد.')), h('button', { type: 'button', onClick: onClose, className: 'bhis-icon-button' }, h(X, { className: 'w-5 h-5' }))),
      h('div', { className: 'bhis-picker-toolbar' },
        h('div', { className: 'bhis-picker-searchbar' }, h(Search, { className: 'w-5 h-5' }), h('input', { ref: inputRef, value: query, onChange: e => { setQuery(e.target.value); setActiveIndex(0); setScanMessage(''); }, onKeyDown: searchKey, placeholder: tab === 'product' ? 'نام کالا/دارو، کد یا بارکد...' : 'نام، گروه، کد داخلی یا کد کتاب...', autoComplete: 'off' }), query ? h('button', { type: 'button', onClick: () => setQuery(''), className: 'bhis-clear-search' }, h(X, { className: 'w-4 h-4' })) : null),
        allowedTypes.includes('product') ? h('button', { type: 'button', className: 'bhis-camera-scan-button', onClick: () => { setTab('product'); setScannerOpen(true); } }, h(Camera, { className: 'w-4 h-4' }), 'بارکدخوان سریع') : null),
      scanMessage ? h('div', { className: 'bhis-picker-scan-message' }, scanMessage) : null,
      h('div', { className: 'bhis-picker-categories' }, ...tabs.map(([id,label]) => h('button', { key: id, type: 'button', className: tab === id ? 'active' : '', onClick: () => { setTab(id); setActiveIndex(0); } }, label))),
      h('div', { className: 'bhis-picker-result-meta' },
        h('span', null, `${rows.length.toLocaleString('fa-IR')} نتیجه`),
        h('div',{className:'bhis-r21-quick-create-actions'},
          tab !== 'product' ? h('button',{type:'button',onClick:()=>openQuickCreate('service')},h(Plus,{className:'w-3.5 h-3.5'}),'ثبت سریع خدمت') : null,
          tab === 'product' || tab === 'all' ? h('button',{type:'button',onClick:()=>openQuickCreate('product')},h(Plus,{className:'w-3.5 h-3.5'}),'ثبت سریع کالا') : null,
          h('span', null, h(Keyboard, { className: 'w-3.5 h-3.5' }), tab === 'product' ? '↑↓ انتخاب • Enter تعیین تعداد' : multiService ? 'تیک یا دوبل‌کلیک' : 'Enter یا دوبل‌کلیک')
        )),
      h('div', { className: 'bhis-picker-results', role: 'listbox' }, rows.length === 0 ? h('div', { className: 'bhis-picker-empty' }, h(Search, { className: 'w-8 h-8' }), h('strong', null, 'موردی پیدا نشد'), h('span', null, query ? 'عبارت جستجو را تغییر دهید.' : 'نام یا کد را تایپ یا دسته را انتخاب کنید.')) : rows.map((r, i) => {
        const Icon = icon(r.type), picked = isPicked(r);
        return h('button', { key: rowKey(r), type: 'button', className: `bhis-picker-row ${i === activeIndex ? 'keyboard-active' : ''} ${picked ? 'multi-selected' : ''}`, onMouseEnter: () => setActiveIndex(i), onClick: () => chooseRow(r), onDoubleClick: () => {
          if (r.kind === 'service' && multiService) {
            setServiceSelection(prev => isPicked(r) ? prev : [...prev, { ...r, quantity: 1 }]);
          } else {
            chooseRow(r);
          }
        }, role: 'option', 'aria-selected': picked },
          h('span', { className: `bhis-picker-row-icon ${r.kind === 'product' ? 'product' : 'service'}` }, multiService && r.kind === 'service' ? h(CheckSquare, { className: 'w-4 h-4' }) : h(Icon, { className: 'w-4 h-4' })),
          h('span', { className: 'bhis-picker-row-main' }, h('strong', null, r.title), h('span', { className: 'bhis-picker-row-sub' }, h('em', null, catalogLabel440(r.type)), r.code ? h('em', null, `کد داخلی: ${r.code}`) : null, r.item?.nationalCode ? h('em', null, `کد کتاب: ${r.item.nationalCode}`) : null, r.item?.barcode ? h('em', { className: 'barcode' }, `بارکد: ${r.item.barcode}`) : null)),
          h('span', { className: 'bhis-picker-row-aside' }, r.type === 'product' ? h('span', { className: `bhis-stock ${r.stock <= 0 ? 'empty' : r.stock <= 5 ? 'low' : ''}` }, `موجودی ${Number(r.stock || 0).toLocaleString('fa-IR')}`) : null, h('strong', null, money(r.price)), h('span', { className: 'bhis-select-mark' }, picked ? 'انتخاب شد' : r.kind === 'product' ? 'تعداد' : multiService ? 'تیک' : 'انتخاب')));
      })),
      multiService ? h('footer', { className: 'bhis-picker-multi-footer' }, h('span', null, `${serviceSelection.length.toLocaleString('fa-IR')} خدمت انتخاب شده`), h('button', { type: 'button', className: 'bhis-primary-button prominent', disabled: !serviceSelection.length, onClick: confirmServices }, h(CheckCircle2, { className: 'w-4 h-4' }), 'ثبت یک‌جای خدمات انتخاب‌شده')) : null,
      createKind ? h('div',{className:'bhis-r21-create-overlay',dir:'rtl'},h('div',{className:'bhis-r21-create-card'},
        h('div',{className:'bhis-r21-create-head'},h('div',null,h('strong',null,createKind==='product'?'ثبت سریع کالای جدید':'ثبت سریع خدمت جدید'),h('span',null,'پس از ذخیره، مورد در کل سامانه قابل استفاده است.')),h('button',{type:'button',onClick:()=>setCreateKind('')},'×')),
        h('div',{className:'bhis-r21-create-grid'},
          h('label',null,'عنوان / نام *',h('input',{autoFocus:true,value:createForm.title,onChange:e=>setCreateForm({...createForm,title:e.target.value})})),
          h('label',null,'کد داخلی',h('input',{value:createForm.code,onChange:e=>setCreateForm({...createForm,code:e.target.value})})),
          h('label',null,createKind==='product'?'قیمت فروش (تومان)':'تعرفه خدمت (تومان)',h('input',{type:'number',min:0,value:createForm.price,onChange:e=>setCreateForm({...createForm,price:e.target.value})})),
          createKind==='product'?h('label',null,'بارکد',h('input',{value:createForm.barcode,onChange:e=>setCreateForm({...createForm,barcode:e.target.value})})):null,
          createKind==='product'?h('label',null,'موجودی اولیه',h('input',{type:'number',min:0,value:createForm.stock,onChange:e=>setCreateForm({...createForm,stock:e.target.value})})):null,
          createKind==='product'?h('label',null,'واحد',h('input',{value:createForm.unit,onChange:e=>setCreateForm({...createForm,unit:e.target.value})})):null
        ),
        h('div',{className:'bhis-r21-create-footer'},h('button',{type:'button',className:'cancel',onClick:()=>setCreateKind('')},'انصراف'),h('button',{type:'button',className:'save',onClick:saveQuickCreate},'ثبت و استفاده'))
      )) : null,
      h(BarcodeCameraScanner, { open: scannerOpen, onDetected: handleBarcode, onClose: () => { setScannerOpen(false); setQuickMatch(null); }, continuous: true, title: 'ثبت سریع کالا / دارو' }),
      quickMatch ? h('div', { className: 'bhis-scan-qty-overlay', dir: 'rtl' }, h('div', { className: 'bhis-scan-qty-card' }, h('span', { className: 'bhis-success-icon' }, h(CheckCircle2, { className: 'w-7 h-7' })), h('div', { className: 'bhis-scan-product-title' }, h('strong', null, quickMatch.title), h('span', null, `بارکد ${quickMatch.item?.barcode || quickMatch.code || '—'} • موجودی ${Number(quickMatch.stock || 0).toLocaleString('fa-IR')} • ${money(quickMatch.price)}`)), h('label', { className: 'bhis-fast-qty-label' }, 'فقط تعداد را وارد کنید'), h('div', { className: 'bhis-fast-qty' }, h('button', { type: 'button', onClick: () => setQuickQty(q => Math.max(1, Number(q) - 1)) }, h(Minus, { className: 'w-4 h-4' })), h('input', { autoFocus: true, type: 'number', min: 1, value: quickQty, onChange: e => setQuickQty(Math.max(1, Number(e.target.value) || 1)), onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); confirmQuick(); } } }), h('button', { type: 'button', onClick: () => setQuickQty(q => Number(q) + 1) }, h(Plus, { className: 'w-4 h-4' }))), h('button', { type: 'button', className: 'bhis-primary-button prominent', onClick: confirmQuick }, 'تأیید؛ آماده ثبت بعدی'))) : null));
}
