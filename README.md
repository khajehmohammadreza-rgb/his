# Bastiyan HIS 5.1.0

سامانه جامع و یکپارچه مدیریت اطلاعات بیمارستانی، کلینیک، جراحی محدود، پذیرش و ترخیص باستیان.

## ساختار اصلی

- `app/` رابط کاربری و ماژول‌های اصلی
- `api/` API، احراز هویت، تنظیمات و updater
- `controllers/` کنترلرهای سمت سرور Node.js
- `routes/` مسیرهای API
- `database/migrations/` migrationهای SQL
- `views/` صفحات و viewها
- `public/` فایل‌های عمومی
- `vendor/` کتابخانه‌های فرانت‌اند vendored
- `fonts/` فونت‌های مورد استفاده رابط کاربری

## اجرا

```bash
npm install
npm start
```

برای توسعه:

```bash
npm run dev
```

تنظیمات Node را از `.env.example` به `.env` منتقل کنید. تنظیمات PHP/دیتابیس را از `api/config.local.example.php` ساخته و به `api/config.local.php` تبدیل کنید. فایل‌های واقعی تنظیمات عمداً در Git نگه‌داری نمی‌شوند.

## نکته امنیتی

`api/data/` و `uploads/` مسیرهای runtime هستند و نباید شامل backup، snapshot، داده بیمار، فایل آپلودی یا اطلاعات محیط واقعی در GitHub باشند.

## وضعیت نسخه

این بسته با نام `5.1.0` آماده انتقال شده است، اما در فایل‌های داخلی موجود در بسته چند متادیتای نسخه متفاوت دیده می‌شود؛ پیش از ایجاد Release نهایی GitHub، نسخه‌های `package.json`، `manifest.json`، `update-manifest.json` و `version.json` باید یکسان‌سازی شوند.
