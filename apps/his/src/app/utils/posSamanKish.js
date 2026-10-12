/**
 * Saman Kish (SEP) PC-POS Frontend Service
 * Protocol SSP1126 over TCP/IP LAN
 * Default Terminal: 21638385 | IP: 192.168.1.142 | Mask: 255.255.255.0 | Gateway: 192.168.1.1
 */

export const DEFAULT_POS_CONFIG = {
  provider: 'saman_kish',
  providerTitle: 'کارتخوان سامان‌کیش (SEP)',
  protocol: 'SSP1126',
  ip: '192.168.1.142',
  port: 1197,
  terminalId: '21638385',
  merchantId: '',
  merchantIdRequired: false,
  networkMode: 'server_tcp',
  subnetMask: '255.255.255.0',
  gateway: '192.168.1.1',
  timeoutSeconds: 65,
  allowSimulationFallback: false,
};

export const getStoredPosConfig = (settings = {}) => {
  const custom = settings?.posConfig || {};
  return {
    ...DEFAULT_POS_CONFIG,
    ...custom,
  };
};

export async function pingSamanKishPos(config = DEFAULT_POS_CONFIG) {
  try {
    const res = await fetch('/api/pos/saman-kish/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: config.ip || DEFAULT_POS_CONFIG.ip,
        port: Number(config.port) || DEFAULT_POS_CONFIG.port,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return {
      success: false,
      connected: false,
      error: 'خطا در برقراری ارتباط با سرویس سرور HIS: ' + (err?.message || err),
    };
  }
}

export async function requestSamanKishSale({
  amountToman = 0,
  invoiceNo = '',
  config = DEFAULT_POS_CONFIG,
  onStatusUpdate = null,
}) {
  const amount = Math.round(Number(amountToman) || 0);
  if (amount <= 0) {
    return { success: false, error: 'مبلغ تراکنش نامعتبر است.' };
  }

  const payload = {
    amount: amount,
    amountRials: amount * 10,
    invoiceNo: String(invoiceNo || Date.now()).slice(-6),
    ip: config.ip || DEFAULT_POS_CONFIG.ip,
    port: Number(config.port) || DEFAULT_POS_CONFIG.port,
    terminalId: config.terminalId || DEFAULT_POS_CONFIG.terminalId,
    timeout: Number(config.timeoutSeconds) || 65,
  };

  onStatusUpdate?.('در حال اتصال به پایانه پوز سامان‌کیش...');

  try {
    const res = await fetch('/api/pos/saman-kish/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    return {
      success: false,
      error: 'خطا در ارتباط با سرور HIS برای ارسال به پوز: ' + (err?.message || err),
    };
  }
}
