import React, { useState, useRef, useEffect } from '../../client-vendor/react.js?b=r24-514-1405';
import { PenTool, RotateCcw, Check, X, ShieldCheck, Sparkles, FileText } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateTimeString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';

const h = React.createElement;

export function DigitalSignaturePad({
  isOpen = true,
  onClose,
  onSave,
  patient = {},
  title = 'امضای دیجیتال بیمار / ولی قانونی',
  formTitle = '',
  settings = {},
  initialSignature = null,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#1e293b'); // slate-800
  const [penWidth, setPenWidth] = useState(2.5);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert('لطفاً ابتدا امضا را با قلم یا لمس رسم نمایید.');
      return;
    }

    // Create an export canvas with security watermark
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');

    // Fill white background for print safety
    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw signature
    expCtx.drawImage(canvas, 0, 0);

    // Watermark footer
    const nowJalali = getJalaliDateTimeString();
    const patientName = patient.fullName || patient.name || 'بیمار محترم';
    const nationalId = patient.nationalId ? `کد ملی: ${patient.nationalId}` : '';
    const centerTitle = settings?.clinicName || 'سامانه جامع درمانی باستیان';

    expCtx.fillStyle = '#64748b';
    expCtx.font = '10px Tahoma, sans-serif';
    expCtx.textAlign = 'right';
    expCtx.direction = 'rtl';
    expCtx.fillText(`امضای تأییدشده الکترونیک • ${patientName} • ${nationalId}`, exportCanvas.width - 15, exportCanvas.height - 18);
    expCtx.fillText(`${nowJalali} • ${centerTitle}`, exportCanvas.width - 15, exportCanvas.height - 6);

    const dataUrl = exportCanvas.toDataURL('image/png', 0.9);
    onSave?.({
      dataUrl,
      createdAt: new Date().toISOString(),
      jalaliDate: nowJalali,
      patientName,
      patientNationalId: patient.nationalId || '',
      formTitle: formTitle || title,
    });
    onClose?.();
  };

  if (!isOpen) return null;

  return h('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200',
    dir: 'rtl',
  },
    h('div', {
      className: 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col text-right',
    },
      // Header
      h('div', {
        className: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 sm:p-5 flex items-center justify-between',
      },
        h('div', { className: 'flex items-center gap-3' },
          h('div', { className: 'p-2 bg-white/10 rounded-2xl border border-white/20' },
            h(PenTool, { className: 'w-6 h-6 text-emerald-200' })
          ),
          h('div', null,
            h('h3', { className: 'text-base font-extrabold' }, title),
            h('p', { className: 'text-xs text-emerald-100 mt-0.5' },
              patient.fullName ? `بیمار: ${patient.fullName} ${patient.nationalId ? `(کد ملی: ${toPersianDigits(patient.nationalId)})` : ''}` : 'امضای لمسی یا با قلم نوری تبلت'
            )
          )
        ),
        h('button', {
          onClick: onClose,
          className: 'text-white/70 hover:text-white p-1 rounded-xl hover:bg-white/10 transition',
        }, h(X, { className: 'w-5 h-5' }))
      ),

      // Canvas Box
      h('div', { className: 'p-5 space-y-4' },
        formTitle ? h('div', { className: 'p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium' },
          h('strong', { className: 'text-teal-800 ml-1' }, 'عنوان سند / رضایت‌نامه:'),
          formTitle
        ) : null,

        h('div', { className: 'relative border-2 border-dashed border-teal-300 rounded-2xl bg-teal-50/20 overflow-hidden shadow-inner' },
          h('canvas', {
            ref: canvasRef,
            width: 540,
            height: 220,
            className: 'w-full h-[220px] touch-none cursor-crosshair block bg-transparent',
            onMouseDown: startDrawing,
            onMouseMove: draw,
            onMouseUp: stopDrawing,
            onMouseLeave: stopDrawing,
            onTouchStart: startDrawing,
            onTouchMove: draw,
            onTouchEnd: stopDrawing,
          }),
          !hasDrawn && h('div', {
            className: 'absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5 opacity-60',
          },
            h(PenTool, { className: 'w-8 h-8 text-teal-600/60 animate-bounce' }),
            h('span', { className: 'text-xs font-bold text-slate-600' }, 'جهت ثبت امضا، با قلم، ماوس یا لمس انگشت در این کادر بنویسید'),
            h('span', { className: 'text-[11px] text-slate-400' }, 'قابلیت چرخش و امضای روان روی تمامی تبلت‌ها و گوشی‌های همراه')
          )
        ),

        // Controls
        h('div', { className: 'flex flex-wrap items-center justify-between gap-3 text-xs' },
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-slate-500 font-medium text-xs' }, 'رنگ قلم:'),
            h('div', { className: 'flex items-center gap-1.5' },
              ['#1e293b', '#1e40af', '#047857'].map((c) =>
                h('button', {
                  key: c,
                  type: 'button',
                  onClick: () => setPenColor(c),
                  style: { backgroundColor: c },
                  className: `w-5 h-5 rounded-full border-2 transition ${penColor === c ? 'scale-125 border-teal-500 shadow-sm' : 'border-white'}`
                })
              )
            )
          ),
          h('button', {
            type: 'button',
            onClick: handleClear,
            className: 'px-3 py-1.5 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-slate-50 hover:bg-rose-50',
          },
            h(RotateCcw, { className: 'w-3.5 h-3.5' }),
            'پاک کردن و رسم مجدد'
          )
        )
      ),

      // Footer
      h('div', {
        className: 'p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs',
      },
        h('div', { className: 'flex items-center gap-1.5 text-slate-500 text-[11px]' },
          h(ShieldCheck, { className: 'w-4 h-4 text-emerald-600' }),
          'ثبت قانونی با کد رهگیری و زمان شمسی'
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('button', {
            type: 'button',
            onClick: onClose,
            className: 'px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-200/60 transition',
          }, 'انصراف'),
          h('button', {
            type: 'button',
            onClick: handleConfirm,
            disabled: !hasDrawn,
            className: `px-6 py-2.5 rounded-xl text-white font-extrabold shadow-md transition flex items-center gap-2 ${hasDrawn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`,
          },
            h(Check, { className: 'w-4 h-4' }),
            'تأیید و الصاق امضا'
          )
        )
      )
    )
  );
}

export default DigitalSignaturePad;
