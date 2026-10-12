export const APP_VERSION = '5.1.4';
export const APP_BUILD = 514;
export const APP_RELEASE = '20261011-514-r25-ai-center';
export const APP_BUILD_NUMBER = APP_BUILD;
export const APP_RELEASE_DATE = '2026-10-11';
export function formatPersianAppVersion(version = APP_VERSION) {
  const digits = '۰۱۲۳۴۵۶۷۸۹';
  return String(version).replace(/\d/g, digit => digits[Number(digit)]);
}
