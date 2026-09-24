"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_FEES,
  DEFAULT_RATES,
  quoteSellPrice,
  type FeeSettings,
  type Quote,
  type Rates,
  type ShippingCurrency,
} from "@/lib/price-calculator/quote";

const STORAGE_KEY = "price-calculator-v1";

type ShippingMethod = {
  id: string;
  name: string;
  cost: string;
  currency: ShippingCurrency;
};

type Draft = {
  profit: string;
  product: string;
  rates: { cnyPerUsd: string; eurPerUsd: string };
  fees: Record<keyof FeeSettings, string>;
  methods: ShippingMethod[];
  selectedId: string;
};

const FEE_FIELDS: { key: keyof FeeSettings; label: string; step: string }[] = [
  { key: "finalValueFeePercent", label: "Final value fee %", step: "0.01" },
  { key: "internationalFeePercent", label: "International fee %", step: "0.01" },
  { key: "perOrderFeeUsd", label: "Per order over $10", step: "0.01" },
  { key: "perOrderFeeUnder10Usd", label: "Per order $10 or less", step: "0.01" },
  { key: "vatOnFeesPercent", label: "VAT on fees %", step: "0.01" },
  { key: "buyerTaxPercent", label: "Buyer tax %", step: "0.01" },
  { key: "buyerPostageUsd", label: "Postage charged to buyer", step: "0.01" },
];

function money(amount: number, currency: "USD" | "EUR" | "CNY"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function num(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function defaultDraft(): Draft {
  const id = "ship-1";
  return {
    profit: "5",
    product: "",
    rates: {
      cnyPerUsd: String(DEFAULT_RATES.cnyPerUsd),
      eurPerUsd: String(DEFAULT_RATES.eurPerUsd),
    },
    fees: {
      finalValueFeePercent: String(DEFAULT_FEES.finalValueFeePercent),
      internationalFeePercent: String(DEFAULT_FEES.internationalFeePercent),
      perOrderFeeUsd: String(DEFAULT_FEES.perOrderFeeUsd),
      perOrderFeeUnder10Usd: String(DEFAULT_FEES.perOrderFeeUnder10Usd),
      vatOnFeesPercent: String(DEFAULT_FEES.vatOnFeesPercent),
      buyerTaxPercent: String(DEFAULT_FEES.buyerTaxPercent),
      buyerPostageUsd: String(DEFAULT_FEES.buyerPostageUsd),
    },
    methods: [{ id, name: "Standard", cost: "", currency: "USD" }],
    selectedId: id,
  };
}

function loadDraft(): Draft {
  if (typeof window === "undefined") return defaultDraft();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDraft();
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed?.methods?.length || !parsed.fees || !parsed.rates) {
      return defaultDraft();
    }
    return parsed;
  } catch {
    return defaultDraft();
  }
}

let methodSeq = 1;

export function PriceCalculatorApp() {
  const reduced = useReducedMotion() ?? false;
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  const rates: Rates | null = useMemo(() => {
    const cnyPerUsd = num(draft.rates.cnyPerUsd);
    const eurPerUsd = num(draft.rates.eurPerUsd);
    if (!(cnyPerUsd > 0) || !(eurPerUsd > 0)) return null;
    return { cnyPerUsd, eurPerUsd };
  }, [draft.rates]);

  const fees: FeeSettings | null = useMemo(() => {
    const next = {} as FeeSettings;
    for (const field of FEE_FIELDS) {
      const value = num(draft.fees[field.key]);
      if (!Number.isFinite(value)) return null;
      next[field.key] = value;
    }
    return next;
  }, [draft.fees]);

  const profit = num(draft.profit);
  const product = num(draft.product);

  function quoteFor(method: ShippingMethod): Quote | { error: string } | null {
    if (!rates || !fees) return { error: "Check the rates and commission fields." };
    if (!Number.isFinite(profit) || !Number.isFinite(product)) return null;
    const cost = num(method.cost);
    if (!Number.isFinite(cost)) return null;
    return quoteSellPrice({
      desiredProfitEur: profit,
      productCostCny: product,
      shippingCost: cost,
      shippingCurrency: method.currency,
      rates,
      fees,
    });
  }

  const selected =
    draft.methods.find((method) => method.id === draft.selectedId) ??
    draft.methods[0];
  const selectedQuote = selected ? quoteFor(selected) : null;
  const selectedOk =
    selectedQuote && !("error" in selectedQuote) ? selectedQuote : null;
  const selectedError =
    selectedQuote && "error" in selectedQuote ? selectedQuote.error : null;

  function patch(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function addMethod() {
    methodSeq += 1;
    const id = `ship-${Date.now()}-${methodSeq}`;
    setDraft((prev) => ({
      ...prev,
      methods: [
        ...prev.methods,
        { id, name: "Method", cost: "", currency: "USD" },
      ],
      selectedId: id,
    }));
  }

  function updateMethod(id: string, partial: Partial<ShippingMethod>) {
    setDraft((prev) => ({
      ...prev,
      methods: prev.methods.map((method) =>
        method.id === id ? { ...method, ...partial } : method,
      ),
    }));
  }

  function removeMethod(id: string) {
    setDraft((prev) => {
      const methods = prev.methods.filter((method) => method.id !== id);
      if (methods.length === 0) return prev;
      const selectedId =
        prev.selectedId === id ? methods[0].id : prev.selectedId;
      return { ...prev, methods, selectedId };
    });
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <motion.div
        className="glow-orb absolute -left-20 top-16 h-56 w-56 rounded-full bg-indigo-500/15"
        animate={reduced ? undefined : { y: [0, 18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.35em] text-indigo-300/70 transition-colors hover:text-indigo-200"
          >
            ← SPACE
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Price Calculator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Enter the profit you want in euros, the product cost in yuan, then
            shipping and commission. The list price is in dollars. The payout
            is what lands in euros.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6">
              <h2 className="text-sm font-medium text-slate-200">Costs</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Profit you want"
                  suffix="EUR"
                  value={draft.profit}
                  onChange={(profit) => patch({ profit })}
                />
                <Field
                  label="Product cost"
                  suffix="CNY"
                  value={draft.product}
                  onChange={(product) => patch({ product })}
                />
                <Field
                  label="Yuan per dollar"
                  suffix="CNY"
                  value={draft.rates.cnyPerUsd}
                  onChange={(cnyPerUsd) =>
                    patch({ rates: { ...draft.rates, cnyPerUsd } })
                  }
                />
                <Field
                  label="Euros received per dollar"
                  suffix="EUR"
                  value={draft.rates.eurPerUsd}
                  onChange={(eurPerUsd) =>
                    patch({ rates: { ...draft.rates, eurPerUsd } })
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-slate-200">Shipping</h2>
                <button
                  type="button"
                  onClick={addMethod}
                  className="rounded-lg border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 transition hover:border-indigo-300/60"
                >
                  Add method
                </button>
              </div>
              <ul className="mt-4 space-y-3">
                {draft.methods.map((method) => {
                  const quote = quoteFor(method);
                  const ok = quote && !("error" in quote) ? quote : null;
                  const active = method.id === selected?.id;
                  return (
                    <li
                      key={method.id}
                      className={`rounded-xl border p-3 ${
                        active
                          ? "border-indigo-400/50 bg-indigo-500/10"
                          : "border-slate-700/80 bg-slate-900/40"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="block flex-1 text-xs text-slate-400">
                          Method
                          <input
                            value={method.name}
                            onChange={(event) =>
                              updateMethod(method.id, { name: event.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                          />
                        </label>
                        <label className="block w-full text-xs text-slate-400 sm:w-36">
                          Cost
                          <input
                            inputMode="decimal"
                            value={method.cost}
                            onChange={(event) =>
                              updateMethod(method.id, { cost: event.target.value })
                            }
                            placeholder="0.00"
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                          />
                        </label>
                        <label className="block w-full text-xs text-slate-400 sm:w-28">
                          Currency
                          <select
                            value={method.currency}
                            onChange={(event) =>
                              updateMethod(method.id, {
                                currency: event.target.value as ShippingCurrency,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                          >
                            <option value="USD">USD</option>
                            <option value="CNY">CNY</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => patch({ selectedId: method.id })}
                          className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-400"
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMethod(method.id)}
                          disabled={draft.methods.length === 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="mt-2 font-mono text-xs text-indigo-200/90">
                        {ok
                          ? `List ${money(ok.sellPriceUsd, "USD")} · receive ${money(ok.payoutEur, "EUR")}`
                          : "Enter a cost to see this method’s price."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6">
              <h2 className="text-sm font-medium text-slate-200">Commission</h2>
              <p className="mt-1 text-xs text-slate-500">
                Defaults match a normal sale: 13.6% plus 1.65% international,
                $0.40 per order over $10, and 19% VAT on those fees. Buyer tax
                increases the fee and is not paid to you.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {FEE_FIELDS.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    suffix={field.key.endsWith("Usd") ? "USD" : "%"}
                    value={draft.fees[field.key]}
                    onChange={(value) =>
                      patch({ fees: { ...draft.fees, [field.key]: value } })
                    }
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-2xl border border-indigo-400/30 bg-slate-950/80 p-5 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-300/80">
                {selected?.name || "Price"}
              </p>
              <h2 className="mt-3 text-sm text-slate-400">List at</h2>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
                {selectedOk ? money(selectedOk.sellPriceUsd, "USD") : "—"}
              </p>
              <h3 className="mt-5 text-sm text-slate-400">You receive</h3>
              <p className="mt-1 text-2xl font-semibold text-indigo-100">
                {selectedOk ? money(selectedOk.payoutEur, "EUR") : "—"}
              </p>
              {selectedError && (
                <p className="mt-4 text-sm text-rose-300">{selectedError}</p>
              )}
              {selectedOk && (
                <dl className="mt-5 space-y-2 border-t border-slate-800 pt-4 text-sm">
                  <Row label="Profit" value={money(selectedOk.profitEur, "EUR")} />
                  <Row label="Product" value={money(selectedOk.productEur, "EUR")} />
                  <Row label="Shipping" value={money(selectedOk.shippingEur, "EUR")} />
                  <Row label="Fees" value={money(selectedOk.feeEur, "EUR")} />
                  <Row
                    label="Fees in dollars"
                    value={money(selectedOk.feeUsd, "USD")}
                  />
                  <Row
                    label="Buyer tax kept aside"
                    value={money(selectedOk.buyerTaxUsd, "USD")}
                  />
                </dl>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <span className="mt-1 flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900/80 focus-within:border-indigo-400/60">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none"
        />
        <span className="flex items-center border-l border-slate-700 px-3 font-mono text-[10px] tracking-wide text-slate-500">
          {suffix}
        </span>
      </span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-200">{value}</dd>
    </div>
  );
}
