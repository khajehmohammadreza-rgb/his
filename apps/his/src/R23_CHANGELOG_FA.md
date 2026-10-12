# گزارش تغییرات Bastiyan HIS 5.1.3 — R23

تاریخ انتشار: 1405/07/15 (2026-10-07)

## هدف این نسخه
R23 یک Stability Baseline است؛ تمرکز آن رفع ریشه‌ای خطاهای بارگذاری مرورگر، یکسان‌سازی نسخه/کش و جلوگیری از تکرار خطاهای Runtime است. هیچ Migration جدیدی برای دیتابیس در این Hotfix اضافه نشده است.

## اصلاحات اصلی
- بازنویسی کامل Dashboard جدید برای حذف ساختار JavaScript ناسازگار با parser واقعی مرورگر که با وجود عبور از `node --check` در Chromium خطای `missing ) after argument list` ایجاد می‌کرد.
- افزودن Browser Parse Gate واقعی با Chromium به فرایند کنترل نسخه؛ تمام فایل‌های JavaScript علاوه بر Node توسط موتور مرورگر نیز parse می‌شوند.
- رفع Exportهای ناقص Bridge آیکن‌های Lucide شامل `CalendarCheck`، `Cloud`، `LogIn`، `PackageSearch` و `WalletCards`.
- تست Import واقعی کل گراف ماژول‌های رابط کاربری و رفع خطاهای Module Resolution/Named Export پیش از تحویل.
- تست Render مسیرهای اصلی منو در Chromium و کنترل ErrorBoundary/PageError.
- یکسان‌سازی نسخه و Build در Frontend، Portal، API config، Health Check، SQLite self-test و ابزار Runtime Transport.
- ارتقا نسخه به `5.1.3` و Build به `513-1405-r23`.
- یکسان‌سازی Cache Busting ماژول‌ها روی `r23-513-1405` برای جلوگیری از ترکیب فایل‌های قدیمی و جدید.
- حفظ Runtime fallback و پاک‌سازی کش نسخه‌های قبلی.
- عدم تغییر Schema دیتابیس در این نسخه پایداری.

## اصل پذیرش نسخه از R23 به بعد
هر نسخه قبل از بسته‌بندی باید حداقل این Gateها را بگذراند:
1. Node syntax check
2. Chromium JavaScript parse check
3. PHP lint
4. JSON parse
5. Relative-import integrity
6. Real browser ES-module graph import
7. Main navigation render smoke test
8. Runtime asset transport/hash validation
9. Health/version consistency
10. Update-manifest/checksum verification و ZIP integrity
