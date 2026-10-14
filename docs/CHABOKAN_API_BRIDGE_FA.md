<div dir="rtl" align="right">

# اتصال امن API چابکان (Bridge)

**وضعیت: کدنویسی و آزمون آفلاین تکمیل شده؛ احراز هویت زنده، استقرار و اتصال مستقیم ChatGPT هنوز تأیید نشده‌اند.**

این ابزار بر اساس فهرست عملیات OpenAPI 1.3.0 چابکان، بخش **GET /v1/services/** را فقط برای بررسی دسترسی فعال می‌کند. با کد یا دیتابیس HIS و ClinicSite تداخلی ندارد. به هیچ وجه به معنای اتصال مستقیم ChatGPT به حساب چابکان نیست؛ برای آن یک اتصال‌دهنده/ابزار مجاز در محیط ChatGPT لازم است.

## گام نهایی راه‌اندازی

1. در [پنل چابکان](https://hub.chabokan.net/fa/api-token/) یک توکن محدود و قابل‌ابطال بسازید.
2. آن را **فقط** در GitHub → مخزن `his` → Settings → Secrets and variables → Actions → New repository secret با نام `CHABOKAN_API_TOKEN` ذخیره کنید. **هرگز داخل گفتگو، Issue، کد یا لاگ نفرستید.**
3. به Actions → «Chabokan API connection check (read-only)» → Run workflow بروید و `all` یا نام سرویس را انتخاب کنید.
4. پس از تأیید موفق، مشخصات دقیق استقرار و آزمون نسخه معتبر هر محصول به‌صورت جداگانه تعیین خواهد شد.

API base پیش‌فرض مطابق ابزار CLI رسمی چابکان `https://apihub.chabokan.net/fa/api/v1/` است. اگر نسخه حساب شما از آدرس دیگری استفاده می‌کند، `CHABOKAN_API_BASE_URL` را به‌صورت متغیر محیطی با URL امن و منتهی به `/v1/` بدهید. آدرس‌ها باید از دامنه‌های مجاز چابکان باشند.

## اجرای اختیاری روی رایانه مطمئن

```bash
export CHABOKAN_API_TOKEN="(only in local secure environment)"
python3 tools/chabokan_bridge.py --service website
python3 -m unittest discover -s tools/tests -v
```

فایل `tools/chabokan_bridge.py` فقط GET می‌زند و هیچ درخواست Deploy، Restart، Stop، Resize یا حذف صادر نمی‌کند؛ اطلاعات محرمانه پاسخ را چاپ نمی‌کند، Redirect دامنه دیگر را مسدود کرده و HTTPS را الزام می‌کند. در GitHub Actions جزئیات حساب/سرویس در لاگ عمومی چاپ نمی‌شود.

**استقرار خودکار فعال نیست**: سورس عمومی فعلی `apps/his/src/` مبنای تأییدشده آخرین نسخه HIS نیست؛ ClinicSite نیز هنوز مخزن مستقل ندارد. باید ابتدا نسخه مرجع، بکاپ و بسته قابل استقرار از نظر سلامت تأیید شوند. API استقرار `POST /v1/services/{main_name}/deploy/` در مستندات وجود دارد اما بدون داده ورودی معتبر و تأیید اتصال، فراخوانی نشده است.

</div>
