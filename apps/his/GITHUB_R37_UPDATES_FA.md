# Bastiyan HIS — انتشار R37 و بروزرسانی امن چابکان

- مخزن: `khajehmohammadreza-rgb/his`
- فایل‌های نرم‌افزار: `apps/his/src/`
- بسته آماده انتشار کد: `Bastiyan-HIS-R37-GITHUB-SOURCE-CODE-ONLY.zip` (بدون اطلاعات بیماران، دیتابیس، رمزها و قلم‌های دارای مجوز).
- **تا زمانی که `apps/his/src/version.json` روی GitHub نسخه 5.1.16 نشده، سورس R37 در مخزن بارگذاری نشده است و نباید از آن Deploy گرفت.**
- امکان Deploy دستی محافظت‌شده: `.github/workflows/his-chabokan-safe-deploy.yml` (به‌صورت `workflow_dispatch` و نه با هر Push).

## یک بار انتشار سورس R37

بسته انتشار همراه با `publish_r37.py` و `publish-r37.bat` را روی ویندوز باز کنید. وجود Git و Python 3 لازم است. فایل BAT پس از ورود GitHub به حساب، سورس را به شاخه `release/his-r37-20261014` می‌فرستد. Pull Request را بررسی و در `main` ادغام کنید. کلید خصوصی، اطلاعات مرکز و فونت‌ها منتقل نمی‌شوند.

## قبل از هر Deploy

1. **از دیتابیس فعال نسخه پشتیبان خارج از سرور بگیرید و قابلیت خواندن آن را بررسی کنید.**
2. در چابکان، مسیرهای دائمی فعال را با مسیر واقعی دیتابیس تطبیق دهید: معمولاً `/app/api/data`، `/app/uploads` و `/app/api/config.local.php`؛ اگر متغیر `BASTIAN_PERSIST_DIR` یا `BASTIAN_SQLITE_PATH` تنظیم شده، مسیرهای واقعیِ آن اولویت دارند.
3. فایل‌های قلم که در مخزن عمومی نیستند، در صورت نیاز باید از مسیر دارای مجوز به‌طور جداگانه تأمین و در `/app/fonts` به‌صورت دائمی حفظ شوند.
4. GitHub repo → Settings → Secrets and variables → Actions: secret `CHABOKAN_API_TOKEN`، variables `CHABOKAN_SERVICE_NAME` (main_name واقعی) و `HIS_PERSISTENCE_VERIFIED=true` را پس از تأیید مسیرها ثبت کنید.
5. Actions → `Bastiyan HIS — Safe Manual Chabokan Deploy` → Run workflow → version `5.1.16` و تأیید عبارت `BACKUP_AND_PERSISTENCE_VERIFIED`. سپس وضعیت Deploy و صفحه سلامت برنامه را بررسی کنید.

**توجه:** فرایند GitHub، بکاپ و حفظ دیتابیس را *به‌تنهایی تضمین نمی‌کند*. در Deploy عادی چابکان فایل‌های نسخه قبلی حذف می‌شوند؛ تنها مسیرهای دائمیِ تأییدشده محفوظ‌اند. تا زمان تأیید این مسیرها Deploy تولیدی انجام ندهید. همین‌طور تأیید GitHub به معنی تست کارت‌خوان واقعی نیست.

مستند رسمی: https://docs.chabokan.net/features/permanent-path/ و https://docs.chabokan.net/openapi/deploy/
