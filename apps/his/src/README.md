# Bastiyan HIS 5.1.3 — R23 Stability Baseline

نسخه R23 مبنای پایدار پس از ممیزی سراسری Runtime است.

- Version: 5.1.3
- Build: 513-1405-r23
- Target: Chabokan PHP 8.4 + SQLite embedded
- Database migration in this hotfix: none
- Rollback: supported through existing recovery/snapshot layer
- Frontend validation: Node syntax + Chromium parser + full ES-module graph smoke test
- Main navigation smoke test: all active primary modules render without ErrorBoundary/PageError in the packaged test harness

برای استقرار، از Updater موجود استفاده کنید و قبل از Commit اجازه دهید Snapshot خودکار کامل شود. فایل‌های داده و دیتابیس موجود با این Hotfix بازنویسی نمی‌شوند.


## نسخه R24 / 5.1.4

برای جزئیات به `R24_CHANGELOG_FA.md` و `R24_SCENARIO_AUDIT_FA.md` مراجعه کنید. پیش از استقرار واقعی از اطلاعات پشتیبان بگیرید، ابتدا در محیط آزمایشی نصب کنید و بارکدخوان گوشی را با HTTPS و اجازه دوربین آزمایش کنید.

آزمون‌ها (اختیاری؛ نیازمند Node.js): `node tests/r24-preflight.mjs` و `node --experimental-default-type=module tests/r24-regression.mjs`. نصب TypeScript جهانی یا محلی برای parser مستقل توصیه می‌شود.
