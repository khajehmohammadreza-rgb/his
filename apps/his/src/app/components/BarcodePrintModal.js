/** Bastiyan HIS barcode/label printing - 4.5.7 */
import React, { useEffect, useRef, useState } from '../../client-vendor/react.js?b=r24-514-1405';
import { Barcode, Printer, QrCode, X } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { QRCodeSVG } from '../../client-vendor/qrcode-react.js?b=r24-514-1405';
import { renderBarcode } from '../utils/barcode.js?b=r24-514-1405';
import { formatCurrency, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';

const h = React.createElement;
const sizes = {
  small: { label: 'کوچک 40×25mm', w: 40, hh: 25 },
  standard: { label: 'استاندارد 50×30mm', w: 50, hh: 30 },
  large: { label: 'بزرگ 60×40mm', w: 60, hh: 40 },
};

function BarcodeSvg({ value }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) renderBarcode(ref.current, value, { height: 34, width: 1.45, fontSize: 10 }); }, [value]);
  return h('svg', { ref, className: 'barcode-svg', style: {display:'block', maxWidth:'100%', width:'100%', height:'auto', maxHeight:48}, preserveAspectRatio:'xMidYMid meet', 'aria-label': `بارکد ${value}` });
}

export const BarcodePrintModal = ({ product, settings = {}, onClose }) => {
  const [labelCount, setLabelCount] = useState(10);
  const [showPrice, setShowPrice] = useState(false);
  const [labelSize, setLabelSize] = useState('standard');
  const [labelType, setLabelType] = useState('barcode');
  const size = sizes[labelSize] || sizes.standard;
  const value = String(product?.barcode || product?.code || '').trim();
  const count = Math.min(500, Math.max(1, Number(labelCount) || 1));
  const labels = Array.from({ length: count }, (_, i) => i);

  if (!product) return null;
  return h('div', { className: 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4' },
    h('style', null, `
      @media print {
        body * { visibility:hidden !important; }
        .bastiyan-label-print-root, .bastiyan-label-print-root * { visibility:visible !important; }
        .bastiyan-label-print-root { position:absolute !important; inset:0 !important; background:#fff !important; padding:0 !important; margin:0 !important; }
        .bastiyan-label-grid { display:block !important; }
        .bastiyan-label { width:${size.w}mm !important; height:${size.hh}mm !important; margin:0 !important; page-break-after:always !important; break-after:page !important; box-shadow:none !important; border:0 !important; }
        @page { size:${size.w}mm ${size.hh}mm; margin:0; }
        .bastiyan-label-controls { display:none !important; }
      }
    `),
    h('div', { className: 'bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl' },
      h('div', { className: 'p-4 border-b border-slate-800 flex items-center justify-between' },
        h('div', { className: 'flex items-center gap-2 text-slate-100 font-bold' }, h(labelType === 'qr' ? QrCode : Barcode, { className: 'w-5 h-5 text-amber-400' }), 'چاپ برچسب کالا'),
        h('button', { onClick: onClose, className: 'text-slate-400 hover:text-white' }, h(X, { className: 'w-5 h-5' }))
      ),
      h('div', { className: 'bastiyan-label-print-root p-4' },
        h('div', { className: 'bastiyan-label-controls bg-slate-800/70 border border-slate-700 rounded-xl p-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs' },
          h('div', null, h('label', { className: 'block text-slate-300 mb-1' }, 'تعداد برچسب'), h('input', { type: 'number', min: 1, max: 500, value: labelCount, onChange: e => setLabelCount(e.target.value), className: 'w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 font-mono' })),
          h('div', null, h('label', { className: 'block text-slate-300 mb-1' }, 'نوع کد'), h('select', { value: labelType, onChange: e => setLabelType(e.target.value), className: 'w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2' }, h('option', { value: 'barcode' }, 'بارکد یک‌بعدی Code 128 (شناسه داخلی/تجاری)'), h('option', { value: 'qr' }, 'QR Code دو بعدی'))),
          h('div', null, h('label', { className: 'block text-slate-300 mb-1' }, 'اندازه'), h('select', { value: labelSize, onChange: e => setLabelSize(e.target.value), className: 'w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2' }, Object.entries(sizes).map(([k,v]) => h('option', { key:k, value:k }, v.label)))),
          h('label', { className: 'flex items-center gap-2 text-slate-300 mt-5' }, h('input', { type: 'checkbox', checked: showPrice, onChange: e => setShowPrice(e.target.checked) }), 'قیمت روی برچسب'),
          h('div', { className: 'flex items-end' }, h('button', { onClick: () => window.print(), className: 'w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded-lg flex items-center justify-center gap-2' }, h(Printer, { className: 'w-4 h-4' }), 'چاپ لیبل'))
        ),
        h('div', { className: 'bastiyan-label-controls mt-2 text-[11px] text-slate-400' }, `کالا: ${product.name} | کد: ${product.code || '-'} | بارکد: ${toPersianDigits(value)} — برای چاپگر لیبل، همین پنجره را روی چاپگر لیبل مرکز ارسال کنید.`),
        h('div', { className: 'bastiyan-label-grid mt-4 flex flex-wrap gap-2 justify-center bg-slate-100 p-3 rounded-xl' },
          labels.map(i => h('div', { key:i, className: 'bastiyan-label bg-white border border-slate-300 rounded-lg p-2 flex flex-col items-center justify-center text-center overflow-hidden', style: { width: `${size.w}mm`, minHeight: `${size.hh}mm` } },
            h('div', { className: 'font-bold text-[9px] text-slate-900 truncate w-full' }, product.name),
            labelType === 'qr' ? h(QRCodeSVG, { value, size: Math.min(64, size.hh * 2), level: 'M', includeMargin: false }) : h(BarcodeSvg, { value }),
            h('div', { className: 'text-[8px] font-mono text-slate-700' }, toPersianDigits(value)),
            showPrice && h('div', { className: 'text-[8px] font-bold text-slate-900' }, formatCurrency(product.salesPrice, settings.currencyUnit))
          ))
        )
      )
    )
  );
};
