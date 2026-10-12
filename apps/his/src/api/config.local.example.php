<?php
/**
 * config.local.php - نمونه فایل تنظیمات محلی
 * 
 * این فایل را با اطلاعات هاست نت‌افراز خود پر کرده و به نام config.local.php ذخیره کنید.
 * پس از اجرای api/setup.php این فایل به‌صورت خودکار ساخته می‌شود.
 * هرگز این فایل را در مخزن کد عمومی قرار ندهید.
 */

// ─── دیتابیس ─────────────────────────────────────────────────
define('BASTIAN_DB_HOST', 'localhost');
define('BASTIAN_DB_PORT', 3306);
define('BASTIAN_DB_NAME', 'نام_دیتابیس_شما');    // مثال: u12345_his
define('BASTIAN_DB_USER', 'نام_کاربر_دیتابیس');   // مثال: u12345_hisuser
define('BASTIAN_DB_PASS', 'رمز_دیتابیس_شما');

// ─── سرویس‌های اختیاری ───────────────────────────────────────
define('KAVENEGAR_API_KEY', '');   // کلید API کاوه‌نگار برای پیامک
define('GEMINI_API_KEY', '');      // کلید Google Gemini برای هوش مصنوعی
define('IDENTITY_PROVIDER_URL', '');
define('IDENTITY_PROVIDER_API_KEY', '');

// ─── مدیریت کل (توسط setup.php تنظیم می‌شود) ─────────────────
define('BASTIAN_SUPERADMIN_USERNAME', 'admin');
define('BASTIAN_SUPERADMIN_PASSWORD_HASH', '');    // bcrypt hash
define('BASTIAN_BACKUP_KEY', '');                  // تولید خودکار
define('BASTIAN_DATA_ENCRYPTION_KEY', '');         // تولید خودکار
