# Bastiyan HIS 5.1.2 — R22 Runtime Hardening

تاریخ: ۱۴۰۵/۰۷/۱۵ — 2026-10-07

## علت انتشار
در R21 امکان داشت هنگام ورود به مرکز، مرورگر در زمان دریافت یکی از ماژول‌های JavaScript با خطای نحوی مانند `missing ) after argument list` متوقف شود. بررسی بسته نشان داد فایل‌های روی دیسک از نظر Syntax سالم‌اند، اما دو عامل ریسک تکرار ایجاد می‌کردند: `index.html` هنوز شناسه نسخه R20 را برای پاک‌سازی کش نگه داشته بود و Boot رابط کاربری فقط به یک مسیر انتقال Runtime وابسته بود.

## اصلاحات R22
- نسخه و Build واقعی صفحه ورودی با نسخه بسته یکسان شد: `5.1.2 / 512-1405-r22`.
- تمام Cache Busterهای ماژول‌ها و Vendor shimها روی یک Build واحد یکسان‌سازی شدند.
- در ارتقای نسخه، Service Worker و Cacheهای قدیمی پاک می‌شوند تا فایل‌های R20/R21 با R22 مخلوط نشوند.
- Boot رابط کاربری دو مسیر مستقل دارد:
  1. Runtime Stream فعلی برای سازگاری با Reverse Proxy.
  2. Static Direct fallback در صورت هرگونه Syntax/Load/Transport failure.
- شکست مسیر اول دیگر بلافاصله صفحه خطا نشان نمی‌دهد؛ سامانه خودکار مسیر دوم را امتحان می‌کند.
- خطای Vendor Runtime نیز جداگانه تشخیص داده می‌شود و در صورت لزوم مسیر جایگزین استفاده می‌شود.
- هیچ Migration دیتابیس جدیدی در این Hotfix وجود ندارد.
- تمام قابلیت‌های R21 حفظ شده‌اند.

## تست‌های قبل از تحویل
- بررسی Syntax تمام فایل‌های JavaScript با Node.
- بررسی Syntax تمام فایل‌های PHP با `php -l`.
- Parse تمام JSONها.
- کنترل موجودبودن تمام Importهای نسبی JavaScript.
- بررسی Syntax اسکریپت Inline اصلی `index.html`.
- مقایسه byte-for-byte خروجی `api/runtime_asset.php` با فایل اصلی برای `main457-final.js` و `vendor-runtime.js`.
- کنترل یکسانی Version/Build و حذف Cache Tagهای قدیمی از Runtime فعال.
