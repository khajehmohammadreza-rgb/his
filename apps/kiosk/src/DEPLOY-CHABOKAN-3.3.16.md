# Deploy امن 3.3.16 روی چابکان

- این بسته کد-محور است و پوشه `data` داخل Release نهایی وجود ندارد.
- `data/clinic_store.json`، `data/users_store.json`، `data/sessions_store.json` و `data/.client_package_secret` نباید با Deploy جایگزین شوند.
- Windows Native Installer در 3.3.16 تغییر نکرده است؛ پنل‌های نصب‌شده پزشک، منشی و نمایشگر نیاز به نصب مجدد ندارند.
- پس از Deploy، پنل نصب‌شده در اولین اتصال فایل‌های وب 3.3.16 را از سرور می‌گیرد.
- در صورت Cache قدیمی، برنامه را یک بار ببندید و دوباره باز کنید؛ نصب مجدد لازم نیست.
