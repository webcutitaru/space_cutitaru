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

const STORAGE_KEY = "price-calculator-v2";

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
  fees: { commissionPercent: string; fixedFeeUsd: string };
  methods: ShippingMethod[];
  selectedId: string;
};

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
    profit: "",
    product: "",
    rates: {
      cnyPerUsd: String(DEFAULT_RATES.cnyPerUsd),
      eurPerUsd: String(DEFAULT_RATES.eurPerUsd),
    },
    fees: {
      commissionPercent: String(DEFAULT_FEES.commissionPercent),
      fixedFeeUsd: String(DEFAULT_FEES.fixedFeeUsd),
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
    const commissionPercent = num(draft.fees.commissionPercent);
    const fixedFeeUsd = num(draft.fees.fixedFeeUsd);
    if (!Number.isFinite(commissionPercent) || !Number.isFinite(fixedFeeUsd)) {
      return null;
    }
    return { commissionPercent, fixedFeeUsd };
  }, [draft.fees]);

  const profit = num(draft.profit);
  const product = num(draft.product);

  function quoteFor(method: ShippingMethod): Quote | { error: string } | null {
    if (!rates || !fees) return { error: "Verifică cursul și comisionul." };
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
      methods: [...prev.methods, { id, name: "Altă metodă", cost: "", currency: "USD" }],
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
      const selectedId = prev.selectedId === id ? methods[0].id : prev.selectedId;
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
          <p className="mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
            Completezi costul și cât vrei să rămână la tine. Primești prețul în
            dolari și câți euro îți intră.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Cât vrei să rămână la tine"
                  hint="profitul tău, în euro"
                  suffix="EUR"
                  value={draft.profit}
                  onChange={(profit) => patch({ profit })}
                />
                <Field
                  label="Cât te costă produsul"
                  hint="prețul din China, în yuani"
                  suffix="CNY"
                  value={draft.product}
                  onChange={(product) => patch({ product })}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-slate-200">Livrare</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Cât te costă să trimiți produsul. Poți compara mai multe metode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMethod}
                  className="shrink-0 rounded-lg border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 transition hover:border-indigo-300/60"
                >
                  Adaugă
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
                          Nume
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
                            placeholder="0"
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                          />
                        </label>
                        <label className="block w-full text-xs text-slate-400 sm:w-28">
                          Monedă
                          <select
                            value={method.currency}
                            onChange={(event) =>
                              updateMethod(method.id, {
                                currency: event.target.value as ShippingCurrency,
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/60"
                          >
                            <option value="USD">Dolari</option>
                            <option value="CNY">Yuani</option>
                          </select>
                        </label>
                        {draft.methods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => patch({ selectedId: method.id })}
                            className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-400"
                          >
                            Alege
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMethod(method.id)}
                          disabled={draft.methods.length === 1}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
                        >
                          Șterge
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-indigo-200/90">
                        {ok
                          ? `Cu livrarea asta vinzi cu ${money(ok.sellPriceUsd, "USD")}.`
                          : "Pune costul livrării."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6">
              <h2 className="text-sm font-medium text-slate-200">Comision</h2>
              <p className="mt-1 text-xs text-slate-500">
                Cât se oprește din vânzare. Valoarea de aici include deja taxa
                internațională și TVA-ul pe comision.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Procent din preț"
                  suffix="%"
                  value={draft.fees.commissionPercent}
                  onChange={(commissionPercent) =>
                    patch({ fees: { ...draft.fees, commissionPercent } })
                  }
                />
                <Field
                  label="Sumă fixă pe comandă"
                  suffix="USD"
                  value={draft.fees.fixedFeeUsd}
                  onChange={(fixedFeeUsd) =>
                    patch({ fees: { ...draft.fees, fixedFeeUsd } })
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 sm:p-6">
              <h2 className="text-sm font-medium text-slate-300">Cursuri</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Câți yuani face un dolar"
                  suffix="CNY"
                  value={draft.rates.cnyPerUsd}
                  onChange={(cnyPerUsd) =>
                    patch({ rates: { ...draft.rates, cnyPerUsd } })
                  }
                />
                <Field
                  label="Câți euro primești pe un dolar"
                  suffix="EUR"
                  value={draft.rates.eurPerUsd}
                  onChange={(eurPerUsd) =>
                    patch({ rates: { ...draft.rates, eurPerUsd } })
                  }
                />
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-2xl border border-indigo-400/30 bg-slate-950/80 p-5 backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-300/80">
                {selected?.name || "Preț"}
              </p>
              <h2 className="mt-3 text-sm text-slate-400">Pune prețul</h2>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
                {selectedOk ? money(selectedOk.sellPriceUsd, "USD") : "—"}
              </p>
              <h3 className="mt-5 text-sm text-slate-400">Îți intră</h3>
              <p className="mt-1 text-2xl font-semibold text-indigo-100">
                {selectedOk ? money(selectedOk.payoutEur, "EUR") : "—"}
              </p>
              {selectedError && (
                <p className="mt-4 text-sm text-rose-300">{selectedError}</p>
              )}
              {!selectedOk && !selectedError && (
                <p className="mt-4 text-sm text-slate-500">
                  Completează profitul, produsul și livrarea.
                </p>
              )}
              {selectedOk && (
                <dl className="mt-5 space-y-2 border-t border-slate-800 pt-4 text-sm">
                  <Row label="Rămâi cu" value={money(selectedOk.profitEur, "EUR")} />
                  <Row label="Produs" value={money(selectedOk.productEur, "EUR")} />
                  <Row label="Livrare" value={money(selectedOk.shippingEur, "EUR")} />
                  <Row label="Comision" value={money(selectedOk.feeEur, "EUR")} />
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
  hint,
  suffix,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      <span className="mt-2 flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900/80 focus-within:border-indigo-400/60">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none"
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
