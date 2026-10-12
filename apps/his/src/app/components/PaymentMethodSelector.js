
import React, { useMemo, useState } from "../../client-vendor/react.js?b=r24-514-1405";
import { Plus, Settings, Trash2, X } from "../../client-vendor/lucide-react.js?b=r24-514-1405";
import { getJalaliDateString } from "../utils/jalali.js?b=r24-514-1405";
import { TimeMinuteField } from "./JalaliDateField.js?b=r24-514-1405";
import { normalizePaymentMethods } from "../utils/paymentMethods.js?b=r24-514-1405";
const inputClass =
  "w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-emerald-500";
function PaymentMethodSelector({
  methods,
  value,
  onChange,
  details,
  onDetailsChange,
  onMethodsChange,
  canManage = false,
  onConnectPcPos,
  posMerchantName,
  amount = 0,
  splitCashAmount = 0,
  splitCardAmount = 0,
  onSplitCashChange,
  onSplitCardChange,
}) {
  const normalized = useMemo(() => normalizePaymentMethods(methods), [methods]);
  const activeMethods = normalized.filter((method) => method.active !== false);
  const selected =
    normalized.find((method) => method.id === value) || activeMethods[0];
  const [managerOpen, setManagerOpen] = useState(false);
  const [draft, setDraft] = useState({
    label: "",
    kind: "custom",
    requiresReference: true,
    requiresDateTime: true,
  });
  const patchDetails = (patch) => onDetailsChange({ ...details, ...patch });
  const saveMethods = (next) => onMethodsChange?.(next);
  const toggleMethod = (id) =>
    saveMethods(
      normalized.map((item) =>
        item.id === id
          ? {
              ...item,
              active: item.system && id === "cash" ? true : !item.active,
            }
          : item,
      ),
    );
  const removeMethod = (id) =>
    saveMethods(normalized.filter((item) => item.id !== id || item.system));
  const addMethod = () => {
    if (!draft.label.trim()) return;
    const id = `custom_${Date.now()}`;
    saveMethods([
      ...normalized,
      {
        ...draft,
        id,
        label: draft.label.trim(),
        icon: "\u{1F4A0}",
        active: true,
        system: false,
      },
    ]);
    setDraft({
      label: "",
      kind: "custom",
      requiresReference: true,
      requiresDateTime: true,
    });
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "space-y-3" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "flex items-center justify-between gap-2" },
      /* @__PURE__ */ React.createElement(
        "label",
        { className: "block text-xs font-semibold text-slate-300" },
        "\u0631\u0648\u0634 \u067E\u0631\u062F\u0627\u062E\u062A:",
      ),
      canManage &&
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setManagerOpen(true),
            className:
              "text-[11px] text-teal-300 hover:text-teal-200 flex items-center gap-1",
          },
          /* @__PURE__ */ React.createElement(Settings, {
            className: "w-3.5 h-3.5",
          }),
          " \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0648\u0634\u200C\u0647\u0627",
        ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className:
          "grid grid-cols-2 gap-2 text-xs max-h-44 overflow-y-auto pr-0.5",
      },
      activeMethods.map((method) =>
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            key: method.id,
            onClick: () => {
              onChange(method.id);
              onDetailsChange({
                transactionDate: getJalaliDateString(),
                transactionTime: /* @__PURE__ */ new Date()
                  .toTimeString()
                  .slice(0, 5),
              });
            },
            className: `p-2 rounded-xl border text-right font-medium transition-colors ${value === method.id ? "bg-emerald-500/15 border-emerald-500 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-300"}`,
          },
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "ml-1" },
            method.icon || "\u{1F4A0}",
          ),
          method.label,
        ),
      ),
    ),
    selected?.kind === "pcpos" &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "bg-slate-800/60 p-2.5 rounded-xl border border-slate-700 space-y-2",
        },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "flex items-center justify-between text-xs" },
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "text-slate-300" },
            "\u062F\u0633\u062A\u06AF\u0627\u0647 \u0645\u062A\u0635\u0644:",
          ),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "font-bold text-teal-400" },
            posMerchantName || "PC-POS",
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: onConnectPcPos,
            className:
              "w-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-2 rounded-lg",
          },
          "\u0627\u0631\u0633\u0627\u0644 \u0645\u0628\u0644\u063A \u0648 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u0627\u0633\u062E \u0645\u0639\u062A\u0628\u0631 POS",
        ),
      ),
    selected?.kind === "split" &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700",
        },
        /* @__PURE__ */ React.createElement(
          "div",
          null,
          /* @__PURE__ */ React.createElement(
            "label",
            { className: "text-[10px] text-slate-400" },
            "\u0645\u0628\u0644\u063A \u0646\u0642\u062F\u06CC",
          ),
          /* @__PURE__ */ React.createElement("input", {
            type: "number",
            min: "0",
            className: inputClass,
            value: splitCashAmount || "",
            onChange: (e) => onSplitCashChange?.(Number(e.target.value) || 0),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          null,
          /* @__PURE__ */ React.createElement(
            "label",
            { className: "text-[10px] text-slate-400" },
            "\u0645\u0628\u0644\u063A PC-POS",
          ),
          /* @__PURE__ */ React.createElement("input", {
            type: "number",
            min: "0",
            className: inputClass,
            value: splitCardAmount || "",
            onChange: (e) => onSplitCardChange?.(Number(e.target.value) || 0),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `sm:col-span-2 text-[11px] ${splitCashAmount + splitCardAmount === amount ? "text-emerald-300" : "text-amber-300"}`,
          },
          "\u062C\u0645\u0639 \u067E\u0631\u062F\u0627\u062E\u062A: ",
          (splitCashAmount + splitCardAmount).toLocaleString("fa-IR"),
          " \u0627\u0632 ",
          Number(amount).toLocaleString("fa-IR"),
        ),
        splitCardAmount > 0 &&
          /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: onConnectPcPos,
              className:
                "sm:col-span-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-2 rounded-lg",
            },
            "\u0627\u0631\u0633\u0627\u0644 \u0633\u0647\u0645 \u06A9\u0627\u0631\u062A \u0628\u0647 PC-POS \u0648 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u0627\u0633\u062E \u0645\u0639\u062A\u0628\u0631",
          ),
      ),
    !["cash", "credit", "split", "pcpos"].includes(selected?.kind) &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700",
        },
        selected?.requiresReference !== false &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "sm:col-span-2" },
            /* @__PURE__ */ React.createElement(
              "label",
              { className: "text-[10px] text-slate-400" },
              "\u0634\u0645\u0627\u0631\u0647 \u062A\u0631\u0627\u06A9\u0646\u0634 / \u067E\u06CC\u06AF\u06CC\u0631\u06CC *",
            ),
            /* @__PURE__ */ React.createElement("input", {
              className: inputClass,
              value: details.transactionNumber || "",
              onChange: (e) =>
                patchDetails({ transactionNumber: e.target.value }),
            }),
          ),
        selected?.requiresDateTime !== false &&
          /* @__PURE__ */ React.createElement(
            React.Fragment,
            null,
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement(
                "label",
                { className: "text-[10px] text-slate-400" },
                "\u062A\u0627\u0631\u06CC\u062E \u062A\u0631\u0627\u06A9\u0646\u0634 *",
              ),
              /* @__PURE__ */ React.createElement("input", {
                className: inputClass,
                value: details.transactionDate || "",
                onChange: (e) =>
                  patchDetails({ transactionDate: e.target.value }),
                placeholder:
                  "\u06F1\u06F4\u06F0\u06F5/\u06F0\u06F5/\u06F2\u06F0",
              }),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement(
                "label",
                { className: "text-[10px] text-slate-400" },
                "\u0633\u0627\u0639\u062A \u062A\u0631\u0627\u06A9\u0646\u0634 *",
              ),
              /* @__PURE__ */ React.createElement("input", {
                type: "time",
                className: inputClass,
                value: details.transactionTime || "",
                onChange: (e) =>
                  patchDetails({ transactionTime: e.target.value }),
              }),
            ),
          ),
        [
          "standalone_pos",
          "bank_transfer",
          "online_gateway",
          "cheque",
        ].includes(selected?.kind) &&
          /* @__PURE__ */ React.createElement(
            React.Fragment,
            null,
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement(
                "label",
                { className: "text-[10px] text-slate-400" },
                "\u0628\u0627\u0646\u06A9 / \u062F\u0631\u06AF\u0627\u0647",
              ),
              /* @__PURE__ */ React.createElement("input", {
                className: inputClass,
                value: details.bankName || "",
                onChange: (e) => patchDetails({ bankName: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement(
                "label",
                { className: "text-[10px] text-slate-400" },
                "\u0634\u0645\u0627\u0631\u0647 \u067E\u0627\u06CC\u0627\u0646\u0647 / \u0686\u06A9",
              ),
              /* @__PURE__ */ React.createElement("input", {
                className: inputClass,
                value: details.terminalNumber || "",
                onChange: (e) =>
                  patchDetails({ terminalNumber: e.target.value }),
              }),
            ),
          ),
        selected?.kind === "standalone_pos" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "sm:col-span-2" },
            /* @__PURE__ */ React.createElement(
              "label",
              { className: "text-[10px] text-slate-400" },
              "\u0686\u0647\u0627\u0631 \u0631\u0642\u0645 \u0622\u062E\u0631 \u06A9\u0627\u0631\u062A (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)",
            ),
            /* @__PURE__ */ React.createElement("input", {
              maxLength: "4",
              className: inputClass,
              value: details.cardLast4 || "",
              onChange: (e) =>
                patchDetails({
                  cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                }),
            }),
          ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "sm:col-span-2" },
          /* @__PURE__ */ React.createElement(
            "label",
            { className: "text-[10px] text-slate-400" },
            "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A",
          ),
          /* @__PURE__ */ React.createElement("input", {
            className: inputClass,
            value: details.notes || "",
            onChange: (e) => patchDetails({ notes: e.target.value }),
          }),
        ),
      ),
    managerOpen &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-sm p-4 flex items-center justify-center",
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className:
              "bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4",
          },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "flex justify-between items-center" },
            /* @__PURE__ */ React.createElement(
              "div",
              null,
              /* @__PURE__ */ React.createElement(
                "h3",
                { className: "font-bold text-slate-100" },
                "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0648\u0634\u200C\u0647\u0627\u06CC \u067E\u0631\u062F\u0627\u062E\u062A \u0645\u0631\u06A9\u0632",
              ),
              /* @__PURE__ */ React.createElement(
                "p",
                { className: "text-[11px] text-slate-400 mt-1" },
                "\u0631\u0648\u0634\u200C\u0647\u0627\u06CC \u0641\u0639\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647 \u0635\u0646\u062F\u0648\u0642\u200C\u0647\u0627\u06CC \u0647\u0645\u06CC\u0646 \u0645\u0631\u06A9\u0632 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.",
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "button",
              { onClick: () => setManagerOpen(false) },
              /* @__PURE__ */ React.createElement(X, {
                className: "w-5 h-5 text-slate-400",
              }),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "space-y-2" },
            normalized.map((method) =>
              /* @__PURE__ */ React.createElement(
                "div",
                {
                  key: method.id,
                  className:
                    "flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3",
                },
                /* @__PURE__ */ React.createElement(
                  "span",
                  { className: "text-lg" },
                  method.icon || "\u{1F4A0}",
                ),
                /* @__PURE__ */ React.createElement(
                  "span",
                  { className: "flex-1 text-xs text-slate-200" },
                  method.label,
                ),
                /* @__PURE__ */ React.createElement(
                  "label",
                  {
                    className:
                      "flex items-center gap-1 text-[11px] text-slate-400",
                  },
                  /* @__PURE__ */ React.createElement("input", {
                    type: "checkbox",
                    checked: method.active !== false,
                    disabled: method.id === "cash",
                    onChange: () => toggleMethod(method.id),
                  }),
                  " \u0641\u0639\u0627\u0644",
                ),
                !method.system &&
                  /* @__PURE__ */ React.createElement(
                    "button",
                    {
                      onClick: () => removeMethod(method.id),
                      className: "text-rose-400",
                    },
                    /* @__PURE__ */ React.createElement(Trash2, {
                      className: "w-4 h-4",
                    }),
                  ),
              ),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            {
              className:
                "border-t border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-2",
            },
            /* @__PURE__ */ React.createElement("input", {
              className: `${inputClass} sm:col-span-2`,
              placeholder:
                "\u0646\u0627\u0645 \u0631\u0648\u0634 \u062C\u062F\u06CC\u062F\u061B \u0645\u062B\u0627\u0644: \u067E\u0631\u062F\u0627\u062E\u062A \u0633\u0627\u0632\u0645\u0627\u0646\u06CC",
              value: draft.label,
              onChange: (e) => setDraft({ ...draft, label: e.target.value }),
            }),
            /* @__PURE__ */ React.createElement(
              "select",
              {
                className: inputClass,
                value: draft.kind,
                onChange: (e) => setDraft({ ...draft, kind: e.target.value }),
              },
              /* @__PURE__ */ React.createElement("option", { value: "custom" }, "سفارشی / عمومی"),
              /* @__PURE__ */ React.createElement("option", { value: "standalone_pos" }, "کارتخوان مستقل POS"),
              /* @__PURE__ */ React.createElement("option", { value: "bank_transfer" }, "کارت‌به‌کارت / حواله"),
              /* @__PURE__ */ React.createElement("option", { value: "online_gateway" }, "درگاه آنلاین"),
              /* @__PURE__ */ React.createElement("option", { value: "cheque" }, "چک"),
            ),
            /* @__PURE__ */ React.createElement(
              "button",
              {
                onClick: addMethod,
                className:
                  "bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1",
              },
              /* @__PURE__ */ React.createElement(Plus, {
                className: "w-4 h-4",
              }),
              " \u0627\u0641\u0632\u0648\u062F\u0646 \u0631\u0648\u0634",
            ),
            /* @__PURE__ */ React.createElement(
              "label",
              {
                className: "text-[11px] text-slate-400 flex items-center gap-1",
              },
              /* @__PURE__ */ React.createElement("input", {
                type: "checkbox",
                checked: draft.requiresReference,
                onChange: (e) =>
                  setDraft({ ...draft, requiresReference: e.target.checked }),
              }),
              " \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u0634\u0645\u0627\u0631\u0647 \u067E\u06CC\u06AF\u06CC\u0631\u06CC",
            ),
            /* @__PURE__ */ React.createElement(
              "label",
              {
                className: "text-[11px] text-slate-400 flex items-center gap-1",
              },
              /* @__PURE__ */ React.createElement("input", {
                type: "checkbox",
                checked: draft.requiresDateTime,
                onChange: (e) =>
                  setDraft({ ...draft, requiresDateTime: e.target.checked }),
              }),
              " \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u062A\u0627\u0631\u06CC\u062E \u0648 \u0633\u0627\u0639\u062A",
            ),
          ),
        ),
      ),
  );
}
export { PaymentMethodSelector };
