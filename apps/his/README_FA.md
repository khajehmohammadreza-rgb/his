# Bastiyan HIS — منبع نسخه 5.1.4 R24

- **کد قابل ویرایش:** `src/` (پس از تأیید import CI)
- **مبنای تأییدشده:** Bastiyan-HIS-5.1.4-R24-BARCODE-WORKFLOW-VALIDATED.zip
- **شناسه انتشار:** 20261010-514-r24-scanner-workflow
- **پشته:** PHP 8.4 + SQLite embedded و رابط JS modules.
- **نمونه تنظیمات صحیح:** `src/api/config.local.example.php`، پایگاه داده SQLite (نه MySQL).
- **کلیدها و دیتا:** محیط خصوصی سرور و `api/data/`، نه GitHub.
- **مهم:** این سورس، پس از حذف فایل‌های فونت اختصاصی و اصلاح قالب نمونه تنظیمات، بسته deploy امضاشده نیست. `src/update-manifest.json` و `src/checksum.sha256` را به‌عنوان نشانه نسخه اصلی نگه داشته‌ایم، ولی برای بسته نهاییِ قابل نصب باید مجدد بازتولید و اعتبارسنجی شوند.
- **آزمون رگرسیون:** `cd apps/his/src && node --experimental-default-type=module tests/r24-regression.mjs`
- **ممنوعیت:** اجرای مستقیم روی Production یا انتقال فایل دیتابیس بدون backup و تست.
