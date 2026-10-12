export const DEFAULT_PAYMENT_METHODS = [
  {
    id: "card",
    label: "کارتخوان متصل (PC-POS)",
    kind: "pcpos",
    icon: "💳",
    active: true,
    system: true,
    requiresReference: true,
  },
  {
    id: "standalone_pos",
    label: "کارتخوان مستقل (POS)",
    kind: "standalone_pos",
    icon: "🏧",
    active: true,
    system: true,
    requiresReference: true,
    requiresDateTime: true,
  },
  {
    id: "cash",
    label: "نقدی",
    kind: "cash",
    icon: "💵",
    active: true,
    system: true,
  },
  {
    id: "bank_transfer",
    label: "کارت‌به‌کارت / حواله بانکی",
    kind: "bank_transfer",
    icon: "🏦",
    active: true,
    system: true,
    requiresReference: true,
    requiresDateTime: true,
  },
  {
    id: "online_gateway",
    label: "درگاه پرداخت آنلاین",
    kind: "online_gateway",
    icon: "🌐",
    active: true,
    system: true,
    requiresReference: true,
  },
  {
    id: "cheque",
    label: "چک",
    kind: "cheque",
    icon: "🧾",
    active: true,
    system: true,
    requiresReference: true,
    requiresDateTime: true,
  },
  {
    id: "credit",
    label: "اعتباری / بدهکار بیمار",
    kind: "credit",
    icon: "📝",
    active: true,
    system: true,
  },
  {
    id: "split",
    label: "ترکیبی (نقد + PC-POS)",
    kind: "split",
    icon: "🔀",
    active: true,
    system: true,
  },
];

export const normalizePaymentMethods = (methods) => {
  if (!Array.isArray(methods) || methods.length === 0) {
    return DEFAULT_PAYMENT_METHODS.map((item) => ({ ...item }));
  }
  const byId = new Map(methods.map((item) => [item.id, item]));
  const system = DEFAULT_PAYMENT_METHODS.map((item) => ({
    ...item,
    ...(byId.get(item.id) || {}),
    system: true,
  }));
  const custom = methods.filter(
    (item) => !DEFAULT_PAYMENT_METHODS.some((base) => base.id === item.id),
  );
  return [...system, ...custom];
};

export const getPaymentReference = (details = {}) =>
  String(
    details.transactionNumber ||
      details.trackingNumber ||
      details.chequeNumber ||
      details.reference ||
      "",
  ).trim();
