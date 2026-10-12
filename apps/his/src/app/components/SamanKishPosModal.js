import React, { useState, useEffect, useRef } from '../../client-vendor/react.js?b=r24-514-1405';
import { CreditCard, CheckCircle2, AlertTriangle, X, RefreshCw, Wifi, ShieldCheck, ArrowRight, Sparkles } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { requestSamanKishSale, pingSamanKishPos, DEFAULT_POS_CONFIG, getStoredPosConfig } from '../utils/posSamanKish.js?b=r24-514-1405';
import { toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';

const h = React.createElement;

export function SamanKishPosModal({
  isOpen,
  onClose,
  amount = 0,
  invoiceNo = '',
  patientName = '',
  settings = {},
  onSuccess,
}) {
  if (!isOpen) return null;

  const config = getStoredPosConfig(settings);
  const [step, setStep] = useState('connecting'); // 'connecting' | 'waiting_card' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('در حال اتصال به پوز سامان‌کیش...');
  const [countdown, setCountdown] = useState(65);
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);

  const startTransaction = async () => {
    cancelledRef.current = false;
    setStep('connecting');
    setStatusMessage(`در حال ارسال مبلغ به کارتخوان سامان‌کیش (${config.ip})...`);
    setErrorMessage('');
    setCountdown(65);

    try {
      setStep('waiting_card');
      setStatusMessage('مبلغ روی کارتخوان نشست. لطفاً کارت را بکشید و رمز را وارد فرمایید...');

      const res = await requestSamanKishSale({
        amountToman: amount,
        invoiceNo: invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
        config: config,
        onStatusUpdate: (msg) => {
          if (!cancelledRef.current) setStatusMessage(msg);
        },
      });

      if (cancelledRef.current) return;

      if (res.success) {
        setStep('success');
        setResultData(res);
        setStatusMessage('تراکنش با موفقیت انجام شد و رسید دریافت گردید.');
        setTimeout(() => {
          if (!cancelledRef.current && onSuccess) {
            onSuccess({
              rrn: res.rrn || '',
              maskedPan: res.maskedPan || '',
              traceNumber: res.traceNumber || '',
              terminalId: config.terminalId,
              amount: amount,
              method: 'card',
              provider: 'saman_kish',
            });
            onClose();
          }
        }, 1800);
      } else {
        setStep('error');
        setErrorMessage(res.error || res.message || 'تراکنش توسط کاربر لغو گردید یا ارتباط قطع شد.');
      }
    } catch (err) {
      if (cancelledRef.current) return;
      setStep('error');
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ارتباط با پوز سامان‌کیش.');
    }
  };

  useEffect(() => {
    startTransaction();
    return () => {
      cancelledRef.current = true;
    };
  }, [amount, invoiceNo]);

  useEffect(() => {
    if (step !== 'waiting_card' && step !== 'connecting') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep('error');
          setErrorMessage('زمان انتظار برای ورود رمز به پایان رسید (Timeout).');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  return h('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200',
    dir: 'rtl',
  },
    h('div', {
      className: 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-right flex flex-col',
    },
      // Header
      h('div', {
        className: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-center justify-between',
      },
        h('div', { className: 'flex items-center gap-3' },
          h('div', { className: 'p-2.5 bg-white/10 rounded-2xl border border-white/20' },
            h(CreditCard, { className: 'w-6 h-6 text-blue-200' })
          ),
          h('div', null,
            h('h3', { className: 'text-base font-extrabold' }, 'کارتخوان سامان‌کیش (SEP)'),
            h('p', { className: 'text-xs text-blue-200 mt-0.5' }, `پایانه: ${toPersianDigits(config.terminalId)} • پروتکل SSP1126`)
          )
        ),
        h('button', {
          onClick: () => { cancelledRef.current = true; onClose(); },
          className: 'text-white/70 hover:text-white p-1 rounded-xl hover:bg-white/10 transition',
        }, h(X, { className: 'w-5 h-5' }))
      ),

      // Body Content
      h('div', { className: 'p-6 space-y-5' },
        // Patient & Amount Card
        h('div', { className: 'bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5' },
          patientName && h('div', { className: 'flex items-center justify-between text-xs' },
            h('span', { className: 'text-slate-500 font-medium' }, 'بیمار / مراجعه‌کننده:'),
            h('strong', { className: 'text-slate-800 font-bold' }, patientName)
          ),
          h('div', { className: 'flex items-center justify-between text-xs' },
            h('span', { className: 'text-slate-500 font-medium' }, 'مبلغ قابل پرداخت:'),
            h('span', { className: 'text-lg font-black text-indigo-700 font-mono' },
              `${Number(amount || 0).toLocaleString('fa-IR')} تومان`
            )
          ),
          h('div', { className: 'flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60' },
            h('span', { className: 'text-slate-400' }, 'معادل ریالی در پوز:'),
            h('span', { className: 'font-mono font-bold text-slate-600' },
              `${(Number(amount || 0) * 10).toLocaleString('fa-IR')} ریال`
            )
          )
        ),

        // Live Status Display
        step === 'waiting_card' && h('div', {
          className: 'text-center py-5 space-y-3',
        },
          h('div', { className: 'relative mx-auto w-20 h-20 flex items-center justify-center' },
            h('div', { className: 'absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping opacity-70' }),
            h('div', { className: 'w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg' },
              h(CreditCard, { className: 'w-8 h-8 animate-pulse' })
            )
          ),
          h('div', { className: 'space-y-1' },
            h('p', { className: 'text-sm font-bold text-slate-800' }, statusMessage),
            h('div', { className: 'inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-mono font-bold mt-2' },
              h(RefreshCw, { className: 'w-3.5 h-3.5 animate-spin' }),
              `زمان باقیمانده: ${toPersianDigits(countdown)} ثانیه`
            )
          ),
          h('div', { className: 'text-[11px] text-slate-400 font-mono mt-1' },
            `IP: ${config.ip} • Port: ${config.port}`
          )
        ),

        step === 'connecting' && h('div', {
          className: 'text-center py-6 space-y-3',
        },
          h(RefreshCw, { className: 'w-10 h-10 text-indigo-600 animate-spin mx-auto' }),
          h('p', { className: 'text-sm font-bold text-slate-700' }, statusMessage)
        ),

        step === 'success' && h('div', {
          className: 'text-center py-5 space-y-3',
        },
          h('div', { className: 'w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm' },
            h(CheckCircle2, { className: 'w-10 h-10' })
          ),
          h('div', { className: 'space-y-1' },
            h('h4', { className: 'text-base font-bold text-emerald-700' }, 'پرداخت با موفقیت ثبت شد'),
            resultData?.rrn && h('p', { className: 'text-xs font-mono text-slate-600 font-bold' },
              `شماره پیگیری (RRN): ${toPersianDigits(resultData.rrn)}`
            ),
            resultData?.maskedPan && h('p', { className: 'text-xs font-mono text-slate-500' },
              `کارت: ${resultData.maskedPan}`
            )
          )
        ),

        step === 'error' && h('div', {
          className: 'text-center py-4 space-y-3 bg-rose-50 border border-rose-200 rounded-2xl p-4',
        },
          h(AlertTriangle, { className: 'w-10 h-10 text-rose-600 mx-auto' }),
          h('div', { className: 'space-y-1' },
            h('h4', { className: 'text-sm font-bold text-rose-800' }, 'خطا در ارتباط با دستگاه پوز'),
            h('p', { className: 'text-xs text-rose-600 leading-relaxed' }, errorMessage)
          ),
          h('div', { className: 'pt-2 flex items-center justify-center gap-2' },
            h('button', {
              type: 'button',
              onClick: startTransaction,
              className: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm',
            },
              h(RefreshCw, { className: 'w-3.5 h-3.5' }),
              'تلاش مجدد'
            ),
          )
        )
      ),

      // Footer
      h('div', {
        className: 'p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs',
      },
        h('div', { className: 'flex items-center gap-1.5 text-slate-500 text-[11px]' },
          h(ShieldCheck, { className: 'w-4 h-4 text-emerald-600' }),
          'تراکنش امن بانکی شاپرک'
        ),
        h('button', {
          type: 'button',
          onClick: () => { cancelledRef.current = true; onClose(); },
          className: 'px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-200/60 transition',
        }, 'انصراف')
      )
    )
  );
}
