export const APP_VERSION = '5.1.4';
export const APP_BUILD = 514;
export const APP_RELEASE = '20261010-514-r24-scanner-workflow';
export const APP_BUILD_NUMBER = APP_BUILD;
export const APP_RELEASE_DATE = '2026-10-10';
export function formatPersianAppVersion(version = APP_VERSION) {
  const digits = '۰۱۲۳۴۵۶۷۸۹';
  return String(version).replace(/\d/g, digit => digits[Number(digit)]);
}
