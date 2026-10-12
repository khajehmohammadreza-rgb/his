import React, { useState, useRef } from '../../client-vendor/react.js?b=r24-514-1405';
import { Camera, Image as ImageIcon, Sliders, Calendar, Tag, Trash2, Plus, Sparkles, Printer, X, Download, Eye, ChevronLeft, ChevronRight } from '../../client-vendor/lucide-react.js?b=r24-514-1405';
import { getJalaliDateString, toPersianDigits } from '../utils/jalali.js?b=r24-514-1405';

const h = React.createElement;

export function ClinicalBeforeAfterGallery({
  isOpen = true,
  onClose,
  patient = {},
  records = [],
  onSaveRecords,
  settings = {},
  currentUser,
}) {
  const [items, setItems] = useState(() => {
    if (Array.isArray(records) && records.length) return records;
    if (Array.isArray(patient?.beforeAfterImages) && patient.beforeAfterImages.length) {
      return patient.beforeAfterImages;
    }
    return [];
  });

  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
  const [selectedRecordId, setSelectedRecordId] = useState(items[0]?.id || null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New record form state
  const [treatmentTitle, setTreatmentTitle] = useState('درمان تخصصی / جراحی');
  const [beforeDate, setBeforeDate] = useState(getJalaliDateString());
  const [afterDate, setAfterDate] = useState(getJalaliDateString());
  const [doctorNotes, setDoctorNotes] = useState('');
  const [beforeImg, setBeforeImg] = useState('');
  const [afterImg, setAfterImg] = useState('');

  const activeRecord = items.find((x) => x.id === selectedRecordId) || items[0];

  const handleFileUpload = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (target === 'before') setBeforeImg(dataUrl);
      else setAfterImg(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewRecord = () => {
    if (!beforeImg || !afterImg) {
      alert('لطفاً هر دو تصویر «قبل از درمان» و «بعد از درمان» را انتخاب یا بارگذاری نمایید.');
      return;
    }

    const newRecord = {
      id: 'ba-' + Date.now(),
      treatmentTitle: treatmentTitle.trim() || 'درمان بالینی',
      beforeDate,
      afterDate,
      doctorNotes,
      beforeImg,
      afterImg,
      doctorName: currentUser?.name || 'پزشک معالج',
      createdAt: new Date().toISOString(),
    };

    const next = [newRecord, ...items];
    setItems(next);
    setSelectedRecordId(newRecord.id);
    onSaveRecords?.(next);
    setShowAddModal(false);
    setBeforeImg('');
    setAfterImg('');
    setDoctorNotes('');
  };

  const handleDeleteRecord = (id) => {
    if (!confirm('آیا از حذف این رکورد مقایسه‌ای اطمینان دارید؟')) return;
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    if (selectedRecordId === id) setSelectedRecordId(next[0]?.id || null);
    onSaveRecords?.(next);
  };

  if (!isOpen) return null;

  return h('div', {
    className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200',
    dir: 'rtl',
  },
    h('div', {
      className: 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-right',
    },
      // Header
      h('div', {
        className: 'bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between',
      },
        h('div', { className: 'flex items-center gap-3' },
          h('div', { className: 'p-2.5 bg-white/10 rounded-2xl border border-white/20' },
            h(Sliders, { className: 'w-6 h-6 text-teal-200' })
          ),
          h('div', null,
            h('h3', { className: 'text-base font-extrabold' }, 'گالری هوشمند مقایسه تصاویر قبل و بعد درمان'),
            h('p', { className: 'text-xs text-teal-100 mt-0.5' },
              `پرونده: ${patient.fullName || 'بیمار'} • ${toPersianDigits(items.length)} پرونده تصویری ثبت‌شده`
            )
          )
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('button', {
            type: 'button',
            onClick: () => setShowAddModal(true),
            className: 'bg-white text-teal-800 hover:bg-teal-50 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm',
          },
            h(Plus, { className: 'w-4 h-4 text-teal-600' }),
            'ثبت مقایسه جدید'
          ),
          h('button', {
            type: 'button',
            onClick: onClose,
            className: 'text-white/70 hover:text-white p-1 rounded-xl hover:bg-white/10 transition',
          }, h(X, { className: 'w-5 h-5' }))
        )
      ),

      // Main Gallery Content
      h('div', { className: 'p-4 sm:p-6 overflow-y-auto flex-1 space-y-6' },
        // Record Selector Tabs
        items.length > 0 ? h('div', { className: 'flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200' },
          items.map((rec) =>
            h('button', {
              key: rec.id,
              type: 'button',
              onClick: () => setSelectedRecordId(rec.id),
              className: `px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${activeRecord?.id === rec.id
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`,
            },
              h(Tag, { className: 'w-3.5 h-3.5' }),
              rec.treatmentTitle,
              h('span', { className: 'text-[10px] opacity-75 font-mono' }, rec.afterDate)
            )
          )
        ) : null,

        activeRecord ? h('div', { className: 'space-y-4' },
          // Meta details
          h('div', { className: 'flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs' },
            h('div', { className: 'flex items-center gap-4' },
              h('div', null,
                h('span', { className: 'text-slate-400 block text-[10px]' }, 'عنوان درمان:'),
                h('strong', { className: 'text-slate-800 font-bold' }, activeRecord.treatmentTitle)
              ),
              h('div', null,
                h('span', { className: 'text-slate-400 block text-[10px]' }, 'تاریخ قبل:'),
                h('span', { className: 'font-mono text-slate-700 font-bold' }, activeRecord.beforeDate)
              ),
              h('div', null,
                h('span', { className: 'text-slate-400 block text-[10px]' }, 'تاریخ بعد:'),
                h('span', { className: 'font-mono text-emerald-700 font-bold' }, activeRecord.afterDate)
              ),
              activeRecord.doctorName ? h('div', null,
                h('span', { className: 'text-slate-400 block text-[10px]' }, 'پزشک:'),
                h('span', { className: 'text-slate-700' }, activeRecord.doctorName)
              ) : null
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: () => handleDeleteRecord(activeRecord.id),
                className: 'text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition',
                title: 'حذف این مقایسه',
              }, h(Trash2, { className: 'w-4 h-4' }))
            )
          ),

          // Interactive Split Slider Box
          h('div', {
            className: 'relative w-full max-w-2xl mx-auto h-[360px] sm:h-[440px] rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl select-none bg-slate-950',
          },
            // "After" Image (Background Full)
            h('img', {
              src: activeRecord.afterImg,
              alt: 'بعد از درمان',
              className: 'absolute inset-0 w-full h-full object-contain pointer-events-none',
            }),
            h('span', {
              className: 'absolute top-3 left-3 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md z-10 font-sans',
            }, 'بعد از درمان (After)'),

            // "Before" Image (Clipped Overlay)
            h('div', {
              style: { clipPath: `inset(0 0 0 ${100 - sliderPos}%)` },
              className: 'absolute inset-0 w-full h-full pointer-events-none',
            },
              h('img', {
                src: activeRecord.beforeImg,
                alt: 'قبل از درمان',
                className: 'absolute inset-0 w-full h-full object-contain',
              }),
              h('span', {
                className: 'absolute top-3 right-3 bg-amber-600/90 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md z-10 font-sans',
              }, 'قبل از درمان (Before)')
            ),

            // Vertical Divider Handle
            h('div', {
              style: { right: `${sliderPos}%` },
              className: 'absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20 pointer-events-none flex items-center justify-center',
            },
              h('div', {
                className: 'w-8 h-8 rounded-full bg-white text-slate-800 shadow-xl border-2 border-teal-600 flex items-center justify-center',
              },
                h(Sliders, { className: 'w-4 h-4 text-teal-700' })
              )
            ),

            // Invisible Range Input covering the slider
            h('input', {
              type: 'range',
              min: 0,
              max: 100,
              value: sliderPos,
              onChange: (e) => setSliderPos(Number(e.target.value)),
              className: 'absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30',
            })
          ),

          // Slider Instructions
          h('div', { className: 'text-center text-xs text-slate-500 font-medium' },
            'با کشیدن خط وسط به چپ و راست، تفاوت و نتایج درمان قبل و بعد را مقایسه کنید.'
          ),

          // Doctor notes
          activeRecord.doctorNotes ? h('div', {
            className: 'p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed',
          },
            h('strong', { className: 'block mb-0.5 font-bold' }, 'یادداشت پزشک معالج:'),
            activeRecord.doctorNotes
          ) : null
        ) : h('div', {
          className: 'text-center py-16 space-y-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl',
        },
          h(ImageIcon, { className: 'w-16 h-16 text-slate-300 mx-auto' }),
          h('div', { className: 'space-y-1' },
            h('h4', { className: 'text-base font-bold text-slate-700' }, 'هنوز تصویر قبل و بعدی ثبت نشده است'),
            h('p', { className: 'text-xs text-slate-400' }, 'برای ثبت عکس‌های بالینی و مقایسه‌ای بیمار، روی دکمه زیر کلیک نمایید.')
          ),
          h('button', {
            type: 'button',
            onClick: () => setShowAddModal(true),
            className: 'px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md inline-flex items-center gap-2',
          },
            h(Plus, { className: 'w-4 h-4' }),
            'افزودن اولین تصویر قبل و بعد'
          )
        )
      ),

      // Add New Modal
      showAddModal && h('div', {
        className: 'fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm',
      },
        h('div', {
          className: 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[90vh]',
        },
          h('div', { className: 'flex items-center justify-between border-b pb-3' },
            h('h4', { className: 'text-base font-bold text-slate-800' }, 'ثبت تصاویر جدید قبل و بعد'),
            h('button', { onClick: () => setShowAddModal(false), className: 'text-slate-400 hover:text-slate-600' }, h(X, { className: 'w-5 h-5' }))
          ),

          h('div', { className: 'space-y-3 text-xs' },
            h('div', null,
              h('label', { className: 'block font-bold text-slate-700 mb-1' }, 'عنوان درمان / پروسیجر:'),
              h('input', {
                type: 'text',
                value: treatmentTitle,
                onChange: (e) => setTreatmentTitle(e.target.value),
                placeholder: 'مثال: جراحی بینی، تزریق فیلر لب، کاشت مو...',
                className: 'w-full p-2.5 border border-slate-300 rounded-xl font-bold',
              })
            ),

            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'block font-bold text-slate-700 mb-1' }, 'تاریخ تصویر قبل:'),
                h('input', {
                  type: 'text',
                  value: beforeDate,
                  onChange: (e) => setBeforeDate(e.target.value),
                  className: 'w-full p-2.5 border border-slate-300 rounded-xl font-mono',
                })
              ),
              h('div', null,
                h('label', { className: 'block font-bold text-slate-700 mb-1' }, 'تاریخ تصویر بعد:'),
                h('input', {
                  type: 'text',
                  value: afterDate,
                  onChange: (e) => setAfterDate(e.target.value),
                  className: 'w-full p-2.5 border border-slate-300 rounded-xl font-mono',
                })
              )
            ),

            // Image pickers
            h('div', { className: 'grid grid-cols-2 gap-3 pt-2' },
              // Before
              h('div', { className: 'border border-dashed border-amber-300 rounded-2xl p-3 bg-amber-50/40 text-center space-y-2' },
                h('span', { className: 'block font-bold text-amber-900 text-xs' }, '۱. تصویر قبل (Before)'),
                beforeImg ? h('img', { src: beforeImg, className: 'h-24 w-full object-cover rounded-xl border' }) : null,
                h('label', { className: 'block cursor-pointer px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shadow-xs' },
                  h('input', { type: 'file', accept: 'image/*', className: 'hidden', onChange: (e) => handleFileUpload(e, 'before') }),
                  beforeImg ? 'تغییر تصویر' : 'انتخاب فایل عکس'
                )
              ),
              // After
              h('div', { className: 'border border-dashed border-emerald-300 rounded-2xl p-3 bg-emerald-50/40 text-center space-y-2' },
                h('span', { className: 'block font-bold text-emerald-900 text-xs' }, '۲. تصویر بعد (After)'),
                afterImg ? h('img', { src: afterImg, className: 'h-24 w-full object-cover rounded-xl border' }) : null,
                h('label', { className: 'block cursor-pointer px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-xs' },
                  h('input', { type: 'file', accept: 'image/*', className: 'hidden', onChange: (e) => handleFileUpload(e, 'after') }),
                  afterImg ? 'تغییر تصویر' : 'انتخاب فایل عکس'
                )
              )
            ),

            h('div', null,
              h('label', { className: 'block font-bold text-slate-700 mb-1' }, 'یادداشت پزشک معالج:'),
              h('textarea', {
                rows: 2,
                value: doctorNotes,
                onChange: (e) => setDoctorNotes(e.target.value),
                placeholder: 'توضیحات درمان، تکنیک انجام‌شده یا ماندگاری نتایج...',
                className: 'w-full p-2.5 border border-slate-300 rounded-xl',
              })
            )
          ),

          h('div', { className: 'flex justify-end gap-2 pt-3 border-t' },
            h('button', {
              type: 'button',
              onClick: () => setShowAddModal(false),
              className: 'px-4 py-2 border rounded-xl text-slate-600 font-bold',
            }, 'انصراف'),
            h('button', {
              type: 'button',
              onClick: handleSaveNewRecord,
              className: 'px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm',
            }, 'ذخیره در پرونده')
          )
        )
      )
    )
  );
}

export default ClinicalBeforeAfterGallery;
