/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Utility for auto-incrementing sequential codes/IDs for clinic entities
 * e.g., Patient (PAT-1001), Service (SRV-101), Product (PRD-1001), Group (GRP-101), etc.
 */
export function generateNextSequentialCode(prefix, existingList = [], codeFieldName = 'code', defaultStartNumber = 1001) {
    if (!existingList || existingList.length === 0) {
        return `${prefix}${defaultStartNumber}`;
    }
    let maxNum = 0;
    const cleanPrefix = prefix.toUpperCase();
    for (const item of existingList) {
        if (!item)
            continue;
        const rawCode = String(item[codeFieldName] || item.fileNumber || item.nationalCode || '').trim();
        if (!rawCode)
            continue;
        // Extract all numbers or suffix number
        const match = rawCode.match(/\d+/g);
        if (match) {
            // Take the last sequence of digits in the string
            const lastDigits = parseInt(match[match.length - 1], 10);
            if (!isNaN(lastDigits) && lastDigits > maxNum) {
                maxNum = lastDigits;
            }
        }
    }
    const nextNum = maxNum > 0 ? maxNum + 1 : defaultStartNumber;
    return `${prefix}${nextNum}`;
}
/**
 * Checks if user manually modified an auto-generated code and asks for confirmation
 * @returns true if code is valid to save, false if user canceled
 */
export function validateAndConfirmManualCodeChange(autoCode, userCode, entityLabel = 'شناسه') {
    const autoClean = autoCode.trim();
    const userClean = userCode.trim();
    if (!userClean) {
        alert(`لطفاً ${entityLabel} را وارد نمایید.`);
        return false;
    }
    if (autoClean && autoClean !== userClean) {
        const isConfirmed = window.confirm(`⚠️ هشدار تغییر دستی کد شناسه:\n\n` +
            `کد تولیدشده به‌صورت خودکار توسط سیستم «${autoClean}» بوده است، اما شما آن را به‌صورت دستی به «${userClean}» تغییر داده‌اید.\n\n` +
            `آیا از ثبت این کد دستی اختصاصی برای ${entityLabel} اطمینان دارید؟`);
        return isConfirmed;
    }
    return true;
}
