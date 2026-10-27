# اتصال GitHub و Chabokan برای Bastiyan HIS

این مخزن در حال حاضر **عمومی** است و نسخه `apps/his/src/version.json` الزاماً نسخه نصب‌شده روی چابکان نیست. استقرار این مخزن تا خصوصی‌سازی، هماهنگ‌سازی سورس، بکاپ بازیابی‌پذیر و آزمون پایداری داده‌ها **ممنوع** است.

## وضعیت اتصال
- بررسی فقط‌خواندنی: `.github/workflows/chabokan-connection-check.yml`
- استقرار صرفاً دستی و محافظت‌شده: `.github/workflows/his-chabokan-safe-deploy.yml`
- **هیچ استقرار خودکاری با push فعال نیست.**
- ورک‌فلو استقرار فقط در مخزن خصوصی اجرا می‌شود و پیش از استقرار نیاز به تأیید نسخه، بکاپ و فضای پایدار دارد.
- استقرار از CLI رسمی چابکان: `@chabokan.net/cli`، `chabok login -t` و `chabok deploy --path ... --service his`.

## پیکربندی محرمانه
از پنل چابکان مدیریت API Token بسازید؛ توکن را **هرگز داخل کد، README، issue یا چت عمومی** نگذارید.
در GitHub از مسیر `Settings > Secrets and variables > Actions > New repository secret` یک Secret به نام `CHABOKAN_API_TOKEN` ایجاد کنید.
این نام به‌عمد با ورک‌فلو موجود HIS یکسان است؛ نام `CHABOKAN_TOKEN` در مستند رسمی نمونه‌ای قابل تغییر است.

برای استقرار، Repository Variables:
- `CHABOKAN_SERVICE_NAME=his`
- `HIS_PERSISTENCE_VERIFIED=true` **فقط پس از بررسی واقعی** ماندگاری `/app/api/data`، `/app/uploads` و `/app/api/config.local.php`

در صورت نیاز محیط محافظت‌شده `chabokan-production` با reviewer و قواعد مورد توافق ساخته شود.

## قبل از هر استقرار
1. مخزن HIS را خصوصی و سابقه توکن‌های قدیمی را بررسی و در صورت نیاز rotate کنید.
2. سورس عملیاتی و نسخه دقیق چابکان را با GitHub همسان کنید؛ سورس فعلی ممکن است قدیمی باشد.
3. بکاپ مستقل و قابل بازیابی از دیتابیس و فایل‌ها ثبت و آزمون کنید.
4. محیط آزمایشی و بازگشت نسخه را آماده کنید.
5. از Actions تنها بعد از این موارد استقرار دستی را اجرا کنید؛ در پایان سلامت سرویس و داده‌های بیماران را بررسی کنید.

مستند رسمی: https://docs.chabokan.net/cicd/github/
