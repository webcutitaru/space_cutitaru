"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_AD_VAT_PERCENT,
  DEFAULT_PLATFORM_PERCENT,
  DEFAULT_RATES,
  quoteSellPrice,
  type AdMode,
  type MoneyCurrency,
  type Quote,
  type Rates,
} from "@/lib/price-calculator/quote";

const STORAGE_KEY = "price-calculator-v4";

type ShippingMethod = {
  id: string;
  name: string;
  cost: string;
  currency: MoneyCurrency;
};

type Draft = {
  profit: string;
  product: string;
  productCurrency: MoneyCurrency;
  agentPercent: string;
  platformPercent: string;
  adMode: AdMode;
  adPercent: string;
  adVatPercent: string;
  dailyAdUsd: string;
  salesPerDay: string;
  rates: { cnyPerUsd: string; eurPerUsd: string; conversionPercent: string };
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

function minus(amount: number): string {
  return `−${money(amount, "EUR")}`;
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
    productCurrency: "CNY",
    agentPercent: "0",
    platformPercent: String(DEFAULT_PLATFORM_PERCENT),
    adMode: "percent",
    adPercent: "0",
    adVatPercent: String(DEFAULT_AD_VAT_PERCENT),
    dailyAdUsd: "",
    salesPerDay: "",
    rates: {
      cnyPerUsd: String(DEFAULT_RATES.cnyPerUsd),
      eurPerUsd: String(DEFAULT_RATES.eurPerUsd),
      conversionPercent: String(DEFAULT_RATES.conversionPercent),
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
    if (!parsed?.methods?.length || !parsed.rates) return defaultDraft();
    return { ...defaultDraft(), ...parsed, rates: { ...defaultDraft().rates, ...parsed.rates } };
  } catch {
    return defaultDraft();
  }
}

let methodSeq = 1;

export function PriceCalculatorApp() {
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [ready, setReady] = useState(false);
  const [rateNote, setRateNote] = useState("Se actualizează cursul…");

  useEffect(() => {
    setDraft(loadDraft());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function loadRates() {
      try {
        const response = await fetch("/api/price-calculator/rates");
        const data = (await response.json()) as {
          cnyPerUsd?: number;
          eurPerUsd?: number;
          date?: string;
          error?: string;
        };
        const cnyPerUsd = data.cnyPerUsd;
        const eurPerUsd = data.eurPerUsd;
        if (
          !response.ok ||
          cnyPerUsd == null ||
          eurPerUsd == null ||
          cnyPerUsd <= 0 ||
          eurPerUsd <= 0
        ) {
          throw new Error(data.error || "failed");
        }
        if (cancelled) return;
        setDraft((prev) => ({
          ...prev,
          rates: {
            ...prev.rates,
            cnyPerUsd: String(cnyPerUsd),
            eurPerUsd: String(eurPerUsd),
          },
        }));
        setRateNote(data.date ? `Curs din ${data.date}` : "Curs actualizat");
      } catch {
        if (!cancelled) setRateNote("Cursul nu s-a putut actualiza.");
      }
    }

    void loadRates();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  const rates: Rates | null = useMemo(() => {
    const cnyPerUsd = num(draft.rates.cnyPerUsd);
    const eurPerUsd = num(draft.rates.eurPerUsd);
    const conversionPercent = num(draft.rates.conversionPercent);
    if (!(cnyPerUsd > 0) || !(eurPerUsd > 0) || !Number.isFinite(conversionPercent)) {
      return null;
    }
    return { cnyPerUsd, eurPerUsd, conversionPercent };
  }, [draft.rates]);

  const profit = num(draft.profit);
  const product = num(draft.product);
  const agentPercent = num(draft.agentPercent);
  const platformPercent = num(draft.platformPercent);
  const adPercent = num(draft.adPercent);
  const adVatPercent = num(draft.adVatPercent);
  const dailyAdUsd = num(draft.dailyAdUsd);
  const salesPerDay = num(draft.salesPerDay);

  function quoteFor(method: ShippingMethod): Quote | { error: string } | null {
    if (!rates) return { error: "Verifică cursul." };
    if (!Number.isFinite(profit) || !Number.isFinite(product)) return null;
    if (!Number.isFinite(agentPercent) || !Number.isFinite(platformPercent)) {
      return { error: "Verifică procentele." };
    }
    const cost = num(method.cost);
    if (!Number.isFinite(cost)) return null;
    if (draft.adMode === "percent" && (!Number.isFinite(adPercent) || !Number.isFinite(adVatPercent))) {
      return null;
    }
    if (draft.adMode === "daily" && (!Number.isFinite(dailyAdUsd) || !Number.isFinite(salesPerDay))) {
      return null;
    }
    return quoteSellPrice({
      desiredProfitEur: profit,
      productCost: product,
      productCurrency: draft.productCurrency,
      agentPercent,
      shippingCost: cost,
      shippingCurrency: method.currency,
      platformPercent,
      adMode: draft.adMode,
      adPercent: Number.isFinite(adPercent) ? adPercent : 0,
      adVatPercent: Number.isFinite(adVatPercent) ? adVatPercent : 0,
      dailyAdUsd: Number.isFinite(dailyAdUsd) ? dailyAdUsd : 0,
      salesPerDay: Number.isFinite(salesPerDay) ? salesPerDay : 0,
      rates,
    });
  }

  const selected =
    draft.methods.find((method) => method.id === draft.selectedId) ?? draft.methods[0];
  const selectedQuote = selected ? quoteFor(selected) : null;
  const selectedOk = selectedQuote && !("error" in selectedQuote) ? selectedQuote : null;
  const selectedError = selectedQuote && "error" in selectedQuote ? selectedQuote.error : null;

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
    <main className="relative min-h-dvh px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="relative mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
            Înapoi
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            Price Calculator
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
            Completezi costul, livrarea și cât vrei să rămână la tine. Primești
            prețul în dolari și câți euro îți intră.
          </p>

          <ol className="mt-10 space-y-4">
            <Step n={1} title="Prețul produsului">
              <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <Field
                  label="Sumă"
                  suffix={draft.productCurrency}
                  value={draft.product}
                  onChange={(product) => patch({ product })}
                />
                <CurrencySelect
                  value={draft.productCurrency}
                  onChange={(productCurrency) => patch({ productCurrency })}
                />
              </div>
            </Step>

            <Step n={2} title="Agent" note="Procent pentru procesarea comenzii.">
              <Field
                label="Procent"
                suffix="%"
                value={draft.agentPercent}
                onChange={(agentPercent) => patch({ agentPercent })}
              />
            </Step>

            <Step
              n={3}
              title="Livrare"
              note="Cât te costă să trimiți produsul. Poți compara mai multe metode."
              action={
                <button
                  type="button"
                  onClick={addMethod}
                  className="text-sm text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white"
                >
                  Adaugă o metodă
                </button>
              }
            >
              <ul className="space-y-4">
                {draft.methods.map((method) => {
                  const quote = quoteFor(method);
                  const ok = quote && !("error" in quote) ? quote : null;
                  const active = method.id === selected?.id;
                  return (
                    <li
                      key={method.id}
                      className={`rounded-xl border p-3 ${
                        active
                          ? "border-indigo-400/60 bg-indigo-500/10"
                          : "border-slate-800"
                      }`}
                    >
                      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.4fr)_8rem_9rem]">
                        <TextField
                          label="Nume"
                          value={method.name}
                          onChange={(name) => updateMethod(method.id, { name })}
                        />
                        <Field
                          label="Cost"
                          suffix={method.currency}
                          value={method.cost}
                          onChange={(cost) => updateMethod(method.id, { cost })}
                        />
                        <CurrencySelect
                          value={method.currency}
                          onChange={(currency) => updateMethod(method.id, { currency })}
                        />
                      </div>
                      <div className="mt-3 flex gap-4">
                        {draft.methods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => patch({ selectedId: method.id })}
                            className={`text-sm ${active ? "text-indigo-300" : "text-slate-400 hover:text-white"}`}
                          >
                            {active ? "Aleasă" : "Alege"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMethod(method.id)}
                          disabled={draft.methods.length === 1}
                          className="text-sm text-slate-500 hover:text-slate-300 disabled:opacity-40"
                        >
                          Șterge
                        </button>
                      </div>
                      <p className={`mt-2 text-sm ${active ? "text-indigo-200" : "text-slate-500"}`}>
                        {ok
                          ? `Cu livrarea asta vinzi cu ${money(ok.sellPriceUsd, "USD")}.`
                          : "Pune costul livrării."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Step>

            <Step n={4} title="Platformă" note="Procent oprit din prețul de vânzare.">
              <Field
                label="Procent"
                suffix="%"
                value={draft.platformPercent}
                onChange={(platformPercent) => patch({ platformPercent })}
              />
            </Step>

            <Step n={5} title="Reclamă">
              <div className="flex gap-4">
                <ModeButton
                  active={draft.adMode === "percent"}
                  onClick={() => patch({ adMode: "percent" })}
                >
                  Procent din vânzare
                </ModeButton>
                <ModeButton
                  active={draft.adMode === "daily"}
                  onClick={() => patch({ adMode: "daily" })}
                >
                  Sumă pe zi
                </ModeButton>
              </div>
              {draft.adMode === "percent" ? (
                <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
                  <Field
                    label="Procent"
                    hint="din prețul de vânzare"
                    suffix="%"
                    value={draft.adPercent}
                    onChange={(adPercent) => patch({ adPercent })}
                  />
                  <Field
                    label="TVA pe reclamă"
                    suffix="%"
                    value={draft.adVatPercent}
                    onChange={(adVatPercent) => patch({ adVatPercent })}
                  />
                </div>
              ) : (
                <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
                  <Field
                    label="Sumă pe zi"
                    suffix="USD"
                    value={draft.dailyAdUsd}
                    onChange={(dailyAdUsd) => patch({ dailyAdUsd })}
                  />
                  <Field
                    label="Vânzări pe zi"
                    hint="suma se împarte la ele"
                    suffix="buc"
                    value={draft.salesPerDay}
                    onChange={(salesPerDay) => patch({ salesPerDay })}
                  />
                </div>
              )}
            </Step>

            <Step n={6} title="Cât vrei să rămână la tine" note="După toate costurile, în euro.">
              <Field
                label="Sumă"
                suffix="EUR"
                value={draft.profit}
                onChange={(profit) => patch({ profit })}
              />
            </Step>
          </ol>

          <section className="mt-4 rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5">
            <h2 className="text-base text-slate-300">Cursuri</h2>
            <p className="mt-1 text-sm text-slate-500">{rateNote}</p>
            <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
              <Field
                label="Câți yuani face un dolar"
                suffix="CNY"
                value={draft.rates.cnyPerUsd}
                onChange={(cnyPerUsd) => patch({ rates: { ...draft.rates, cnyPerUsd } })}
              />
              <Field
                label="Câți euro face un dolar"
                suffix="EUR"
                value={draft.rates.eurPerUsd}
                onChange={(eurPerUsd) => patch({ rates: { ...draft.rates, eurPerUsd } })}
              />
              <Field
                label="Conversie"
                hint="se oprește la schimbul în euro"
                suffix="%"
                value={draft.rates.conversionPercent}
                onChange={(conversionPercent) =>
                  patch({ rates: { ...draft.rates, conversionPercent } })
                }
              />
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-indigo-400/30 bg-slate-950/80 p-5 lg:sticky lg:top-8">
          <p className="text-sm text-slate-400">{selected?.name || "Preț"}</p>
          <h2 className="mt-3 text-sm text-slate-400">Pune prețul</h2>
          <p className="mt-1 text-5xl font-semibold tracking-tight text-indigo-200 tabular-nums">
            {selectedOk ? money(selectedOk.sellPriceUsd, "USD") : "—"}
          </p>
          <h3 className="mt-6 text-sm text-slate-400">Îți intră</h3>
          <p className="mt-1 text-xl text-slate-100 tabular-nums">
            {selectedOk ? money(selectedOk.payoutEur, "EUR") : "—"}
          </p>
          {selectedError && <p className="mt-4 text-sm text-rose-300">{selectedError}</p>}
          {!selectedOk && !selectedError && (
            <p className="mt-4 text-sm text-slate-500">
              Completează produsul, livrarea și profitul.
            </p>
          )}
          {selectedOk && (
            <div className="mt-6 border-t border-slate-800 pt-4 text-sm">
              <dl className="space-y-2">
                <Row label="Subtotal" value={money(selectedOk.subtotalEur, "EUR")} />
                <Row label="Conversie" value={minus(selectedOk.conversionEur)} />
                <Row label="Platformă" value={minus(selectedOk.platformEur)} />
                <Row label="Reclamă" value={minus(selectedOk.adEur)} />
                {draft.adMode === "percent" && (
                  <Row label="TVA pe reclamă" value={minus(selectedOk.adVatEur)} />
                )}
                <Row label="Agent" value={minus(selectedOk.agentEur)} />
                <Row label="Produs" value={minus(selectedOk.productEur)} />
                <Row label="Livrare" value={minus(selectedOk.shippingEur)} />
              </dl>
              <dl className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                <Row label="Rămâi cu" value={money(selectedOk.profitEur, "EUR")} />
              </dl>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  note,
  action,
  children,
}: {
  n: number;
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-base text-slate-100">
          <span className="mr-2 text-slate-500">{n}.</span>
          {title}
        </h2>
        {action}
      </div>
      {note && <p className="mb-3 max-w-prose text-sm leading-6 text-slate-500">{note}</p>}
      {children}
    </li>
  );
}

function Field({
  label,
  hint,
  suffix,
  value,
  onChange,
}: {
  label?: string;
  hint?: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block h-5 truncate text-xs leading-5 text-slate-400">
        {label ?? "\u00a0"}
        {hint ? <span className="text-slate-500"> · {hint}</span> : null}
      </span>
      <span className="flex h-11 items-center rounded-lg border border-slate-700 bg-slate-900/80 px-3 focus-within:border-indigo-400/60">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full w-full bg-transparent text-sm text-white outline-none"
        />
        <span className="shrink-0 pl-3 text-xs leading-none text-slate-500">{suffix}</span>
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block h-5 text-xs leading-5 text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white outline-none focus:border-indigo-400/60"
      />
    </label>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: MoneyCurrency;
  onChange: (value: MoneyCurrency) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block h-5 text-xs leading-5 text-slate-400">Monedă</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as MoneyCurrency)}
        className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-white outline-none focus:border-indigo-400/60"
      >
        <option value="USD">Dolari</option>
        <option value="CNY">Yuani</option>
      </select>
    </label>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b py-1 text-sm ${
        active
          ? "border-slate-200 text-white"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-200 tabular-nums">{value}</dd>
    </div>
  );
}
