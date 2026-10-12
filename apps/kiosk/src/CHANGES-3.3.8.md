# Bastiyan Kiosk 3.3.8 - Windows Desktop Architecture

- حذف کامل VBS/PowerShell/Browser launcher از مسیر اصلی بسته‌های نصب.
- معماری Electron/Chromium مستقل برای Windows x64.
- نصب Per-user با NSIS و Setup.exe استاندارد.
- عدم نیاز سیستم مقصد به Node.js, PHP, Python, Java, Chrome, Edge یا WebView2.
- نشست مستقل برای هر مرکز و نقش.
- حالت Fullscreen و Autoplay اختصاصی Display.
- محدودسازی Navigation به دامنه سرور مرکز و بازکردن لینک خارجی فقط در مرورگر سیستم.
- نمایش خطای فارسی در قطع ارتباط، بدون خراب‌شدن نصب.
- چهار Build مستقل: Doctor / Secretary / Display / Super Admin.
- Build خودکار Setup.exe با GitHub Actions روی windows-latest.
- `download.php` فقط Setup.exe واقعی + client.json مرکز را تحویل می‌دهد و طراحی قدیمی را دیگر تولید نمی‌کند.
