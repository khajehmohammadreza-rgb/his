/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Sends transaction amount to SamanKish PC-POS LAN/USB terminal via server API endpoint
 */
export async function sendAmountToSamanKishPos(request, settings) {
    const amount = Number(request.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, message: 'مبلغ پرداخت معتبر نیست.', errorCode: 'INVALID_AMOUNT' };
    }
    const posIp = (request.posIp || settings?.posIp || '').trim();
    const posPort = (request.posPort || settings?.posPort || '').trim();
    if (!posIp || !posPort) {
        return { success: false, message: 'IP و پورت کارتخوان در تنظیمات مرکز وارد نشده است.', errorCode: 'POS_NOT_CONFIGURED' };
    }
    const payload = {
        amount,
        currencyUnit: request.currencyUnit || settings?.currencyUnit || 'toman',
        invoiceNumber: request.invoiceNumber || 'INV-' + Date.now(),
        posIp,
        posPort,
        terminalId: request.terminalId || settings?.posTerminalId || '',
        merchantId: request.merchantId || settings?.posMerchantId || '',
        connectionType: request.connectionType || settings?.posConnectionType || 'ssp1126',
    };
    try {
        const res = await fetch('/api/pcpos/saman/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
            return {
                success: false,
                message: data.error || data.message || 'پاسخ تاییدشده‌ای از کارتخوان دریافت نشد.',
                errorCode: data.errorCode || `HTTP_${res.status}`,
                posNotice: data.posNotice,
                raw: data.raw,
                mode: data.mode,
            };
        }
        return {
            success: true,
            message: data.message || 'تراکنش کارتخوان تایید شد.',
            rrn: data.rrn,
            cardNumberMasked: data.cardNumberMasked,
            terminalId: data.terminalId,
            merchantId: data.merchantId,
            traceNo: data.traceNo,
            errorCode: data.errorCode,
            posNotice: data.posNotice,
            raw: data.raw,
            mode: data.mode || 'live',
        };
    }
    catch (err) {
        return {
            success: false,
            message: 'ارتباط با سرویس کارتخوان برقرار نشد. برای پرداخت LAN از Mother PC استفاده کنید.',
            errorCode: 'POS_NETWORK_ERROR',
            raw: { error: err?.message || String(err) },
        };
    }
}
/**
 * Tests connection status to SamanKish POS terminal or local service
 */
export async function testSamanKishPosConnection(posIp = '', posPort = '8080') {
    const cleanIp = posIp ? posIp.split('.').map(part => parseInt(part, 10).toString()).join('.') : '';
    try {
        const res = await fetch('/api/pcpos/saman/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ posIp: cleanIp, posPort }),
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
    catch (err) {
        return {
            success: false,
            connected: false,
            latencyMs: 0,
            message: 'خطا در شبکه یا عدم پاسخگویی سرور اصلی در بررسی وضعیت پوز: ' + err.message,
        };
    }
}
