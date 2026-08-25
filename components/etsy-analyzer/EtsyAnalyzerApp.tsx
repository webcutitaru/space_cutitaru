"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type {
  BenchmarkInsight,
  FrequencyGroup,
  ListingReport,
  ListingScore,
  StrengthLabel,
  TagFrequencyItem,
  TagPresenceItem,
} from "@/lib/etsy-analyzer";
import {
  ComparisonCharts,
  HighlightedTagChips,
  intensityClasses,
  tagIntensity,
} from "@/components/etsy-analyzer/ComparisonCharts";

const MAX_SLOTS = 10;
const ETSY_TAG_MAX_CHARS = 20;

function strengthLabelRo(s: StrengthLabel): string {
  switch (s) {
    case "referinta":
      return "Referință bună";
    case "puternic":
      return "Puternic";
    case "ok":
      return "Acceptabil";
    case "slab":
      return "Slab ca referință";
  }
}

type HtmlSlot = { id: string; label: string; html: string };

function makeSlot(n: number, id: string): HtmlSlot {
  return { id, label: `Listing ${n}`, html: "" };
}

function money(report: ListingReport): string {
  const { current, original, currency, discountPercent, display } = report.price;
  if (display) return display;
  if (current == null) return "—";
  const cur = currency ? ` ${currency}` : "";
  const base = `${current}${cur}`;
  if (original != null && original !== current) {
    return `${base} (era ${original}${discountPercent != null ? `, −${discountPercent}%` : ""})`;
  }
  return base;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export function EtsyAnalyzerApp() {
  const uid = useId();
  const reduced = useReducedMotion() ?? false;
  const [slots, setSlots] = useState<HtmlSlot[]>(() => [
    makeSlot(1, `${uid}-1`),
    makeSlot(2, `${uid}-2`),
    makeSlot(3, `${uid}-3`),
    makeSlot(4, `${uid}-4`),
    makeSlot(5, `${uid}-5`),
  ]);
  const [insight, setInsight] = useState<BenchmarkInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const relabel = (list: HtmlSlot[]) =>
    list.map((s, i) => ({ ...s, label: `Listing ${i + 1}` }));

  const filled = slots.filter((s) => s.html.trim()).length;

  useEffect(() => {
    const EXT = "etsy-analyzer-extension";
    const APP = "etsy-analyzer-app";

    function applyHandoff(data: {
      htmls?: unknown;
      titles?: unknown;
      insight?: BenchmarkInsight | null;
      warnings?: string[] | null;
    }) {
      const htmls = Array.isArray(data.htmls)
        ? data.htmls.filter((h): h is string => typeof h === "string" && h.trim().length > 0)
        : [];
      if (htmls.length === 0) return;

      const titles = Array.isArray(data.titles) ? data.titles : [];
      const next = htmls.slice(0, MAX_SLOTS).map((html, i) => ({
        id: `${uid}-ext-${i + 1}`,
        label: `Listing ${i + 1}`,
        html,
      }));
      while (next.length < 5) {
        next.push(makeSlot(next.length + 1, `${uid}-ext-pad-${next.length + 1}`));
      }
      setSlots(relabel(next));

      if (data.insight && typeof data.insight === "object") {
        setInsight(data.insight);
        const warns = [...(data.warnings ?? [])];
        if (
          data.insight.listingsWithoutTags > 0 &&
          data.insight.listingsWithoutTags === data.insight.reports.length
        ) {
          warns.push(
            "Niciun listing nu are tag-uri SEO — recapturează de pe pagina de produs.",
          );
        } else if (data.insight.listingsWithoutTags > 0) {
          warns.push(
            `${data.insight.listingsWithoutTags}/${data.insight.reports.length} listing(uri) fără tag-uri SEO (restul sunt OK).`,
          );
        }
        setError(warns.length ? warns.join(" · ") : null);
      } else {
        setInsight(null);
        setError(
          `Primit ${htmls.length} listing(uri) din extensie${
            titles.filter(Boolean).length
              ? ` (${titles.filter((t) => typeof t === "string" && t).length} titluri)`
              : ""
          }. Apasă Analizează dacă vrei raportul pe site.`,
        );
      }

      window.requestAnimationFrame(() => {
        document
          .getElementById("etsy-analyzer-slots")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== EXT || data.type !== "HANDOFF") return;
      applyHandoff(data);
      window.postMessage({ source: APP, type: "HANDOFF_ACK" }, "*");
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ source: APP, type: "READY" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [uid]);

  function flashCopied(key: string) {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  async function handleCopy(key: string, text: string) {
    await copyText(text);
    flashCopied(key);
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const htmls = slots.map((s) => s.html).filter((h) => h.trim());
      if (htmls.length === 0) {
        throw new Error("Lipește cel puțin un HTML de listing.");
      }

      const response = await fetch("/api/etsy-analyzer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmls }),
      });
      const data = (await response.json()) as {
        insight?: BenchmarkInsight;
        warnings?: string[];
        error?: string;
      };

      if (!response.ok || !data.insight) {
        throw new Error(data.error ?? "Analiza a eșuat.");
      }

      setInsight(data.insight);
      const warns = [...(data.warnings ?? [])];
      if (
        data.insight.listingsWithoutTags > 0 &&
        data.insight.listingsWithoutTags === data.insight.reports.length
      ) {
        warns.push(
          "Niciun listing nu are tag-uri SEO — recapturează de pe pagina de produs.",
        );
      } else if (data.insight.listingsWithoutTags > 0) {
        warns.push(
          `${data.insight.listingsWithoutTags}/${data.insight.reports.length} listing(uri) fără tag-uri SEO (restul sunt OK).`,
        );
      }
      if (warns.length) {
        setError(warns.join(" · "));
      }
    } catch (e) {
      setInsight(null);
      setError(e instanceof Error ? e.message : "Eroare la analiză");
    } finally {
      setBusy(false);
    }
  }

  function exportJson() {
    if (!insight) return;
    const exportable = {
      headline: insight.headline,
      plainBullets: insight.plainBullets,
      sharedPhrases: insight.sharedPhrases,
      tagFrequency: insight.tagFrequency,
      tagPresence: insight.tagPresence,
      titleKeywordFrequency: insight.titleKeywordFrequency,
      scoreSeries: insight.scoreSeries,
      rangeBars: insight.rangeBars,
      frequencyGroups: insight.frequencyGroups,
      suggestions: insight.suggestions,
      listingsWithoutTags: insight.listingsWithoutTags,
      listingsWithoutTagsIndexes: insight.listingsWithoutTagsIndexes,
      ranges: insight.ranges,
      usableAsReference: insight.usableAsReference,
      referenceNote: insight.referenceNote,
      scores: insight.scores,
      listings: insight.reports.map((report) => ({
        identity: report.identity,
        seo: report.seo,
        price: report.price,
        shop: report.shop,
        knownSignals: report.knownSignals,
        keywords: report.keywords,
        discoveredSignals: report.discoveredSignals.slice(0, 80),
      })),
    };
    const blob = new Blob([JSON.stringify(exportable, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etsy-benchmark-${insight.reports.length}x.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <motion.div
        className="glow-orb absolute -left-16 top-24 h-56 w-56 rounded-full bg-indigo-500/10"
        animate={reduced ? undefined : { y: [0, -16, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="mb-10">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.35em] text-indigo-300/70 transition-colors hover:text-indigo-200"
          >
            ← SPACE
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Etsy Analyzer
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Lipește HTML-ul a 5–10 bestselleri din aceeași nișă. Vezi ce tag-uri SEO
            se repetă (10/10, 9/10…) și alege manual expresiile relevante pentru
            produsul tău.
          </p>
        </header>

        <section
          id="etsy-analyzer-slots"
          className="rounded-2xl border border-indigo-400/20 bg-slate-950/60 p-5 backdrop-blur-md sm:p-6"
        >
          <h2 className="text-lg font-medium text-white">Listing-uri de referință</h2>
          <p className="mt-1 text-sm text-slate-400">
            View Source / Save Page, încarcă .html — sau folosește extensia Chrome
            (Add listing → Analyze + send / Send to site).
          </p>

          <div className="mt-5 space-y-5">
            {slots.map((slot) => (
              <SlotBlock
                key={slot.id}
                slot={slot}
                canRemove={slots.length > 1}
                onChange={(html) =>
                  setSlots((prev) =>
                    prev.map((s) => (s.id === slot.id ? { ...s, html } : s)),
                  )
                }
                onRemove={() =>
                  setSlots((prev) =>
                    prev.length <= 1
                      ? prev
                      : relabel(prev.filter((s) => s.id !== slot.id)),
                  )
                }
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={busy || filled < 1}
              className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? "Analizez…"
                : filled > 1
                  ? `Analizează ${filled} listing-uri`
                  : "Analizează"}
            </button>
            <button
              type="button"
              onClick={() =>
                setSlots((prev) => {
                  if (prev.length >= MAX_SLOTS) return prev;
                  return relabel([
                    ...prev,
                    makeSlot(prev.length + 1, `${uid}-${Date.now()}`),
                  ]);
                })
              }
              disabled={slots.length >= MAX_SLOTS}
              className="rounded-full border border-indigo-400/30 bg-slate-900/80 px-4 py-2.5 text-sm text-indigo-100 transition hover:border-indigo-300/50 disabled:opacity-50"
            >
              + Adaugă listing
            </button>
            <span className="text-xs text-slate-500">
              {filled}/{slots.length} completate · max {MAX_SLOTS}
            </span>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {insight && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                {insight.reports.length} listing
                {insight.reports.length > 1 ? "-uri" : ""} ·{" "}
                {new Date().toLocaleString("ro-RO")}
              </span>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-full border border-indigo-400/30 px-4 py-2 text-sm text-indigo-100 hover:border-indigo-300/50"
              >
                Export JSON
              </button>
            </div>

            <VerdictBlock insight={insight} />

            <ComparisonCharts
              tagPresence={insight.tagPresence ?? []}
              titleKeywordFrequency={insight.titleKeywordFrequency ?? []}
              scoreSeries={insight.scoreSeries ?? []}
              rangeBars={insight.rangeBars ?? []}
            />

            {insight.frequencyGroups.length > 0 && (
              <FrequencyGroupsBlock
                groups={insight.frequencyGroups}
                copied={copied}
                onCopy={handleCopy}
              />
            )}

            {insight.suggestions.forTags.length > 0 && (
              <SuggestionListsBlock
                forTags={insight.suggestions.forTags}
                forTitle={insight.suggestions.forTitle}
                copied={copied}
                onCopy={handleCopy}
              />
            )}

            <h2 className="pt-2 text-lg font-medium text-white">
              Date pe fiecare listing
            </h2>
            {insight.reports.map((report, i) => (
              <ListingDetails
                key={report.identity.listingId || i}
                report={report}
                score={insight.scores[i]!}
                index={i}
                tagPresence={insight.tagPresence ?? []}
                totalListings={insight.reports.length}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SlotBlock({
  slot,
  canRemove,
  onChange,
  onRemove,
}: {
  slot: HtmlSlot;
  canRemove: boolean;
  onChange: (html: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-indigo-400/10 pt-4 first:border-t-0 first:pt-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-indigo-100">{slot.label}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-indigo-400/25 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-300/40"
          >
            Încarcă .html
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={!slot.html}
            className="rounded-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40"
          >
            Șterge text
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full px-3 py-1.5 text-xs text-rose-300/80 hover:text-rose-200"
            >
              Scoate slot
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".html,.htm,text/html"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onChange(await file.text());
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <textarea
        value={slot.html}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Lipește HTML-ul ${slot.label}…`}
        spellCheck={false}
        className="min-h-28 w-full resize-y rounded-xl border border-indigo-400/15 bg-slate-950/80 px-3 py-2 font-mono text-xs text-slate-200 outline-none focus:border-indigo-400/40"
      />
      {slot.html.trim() ? (
        <p className="mt-1 text-xs text-slate-500">
          {slot.html.length.toLocaleString("ro-RO")} caractere
        </p>
      ) : null}
    </div>
  );
}

function VerdictBlock({ insight }: { insight: BenchmarkInsight }) {
  const { headline, plainBullets, referenceNote, usableAsReference, scores } =
    insight;

  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        usableAsReference
          ? "border-emerald-500/30 bg-emerald-950/20"
          : "border-amber-500/30 bg-amber-950/20"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-300/80">
        {usableAsReference ? "Poți folosi ca referință" : "Referință încă slabă"}
      </p>
      <h2 className="mt-2 max-w-2xl text-xl font-semibold text-white sm:text-2xl">
        {headline}
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
        {plainBullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-400">{referenceNote}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {scores.map((s, i) => (
          <article
            key={s.listingId || i}
            className="rounded-xl border border-indigo-400/15 bg-slate-950/50 p-4"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-indigo-300">
                {s.score}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {strengthLabelRo(s.strength)}
              </span>
            </div>
            <h3 className="mt-1 line-clamp-2 text-sm font-medium text-white">
              {s.title}
            </h3>
            <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
              {s.highlights.price && <li>Preț: {s.highlights.price}</li>}
              {s.highlights.inCart != null && (
                <li>Coșuri: {s.highlights.inCart}</li>
              )}
              {s.highlights.favorites != null && (
                <li>Favorite: {s.highlights.favorites}</li>
              )}
              {s.highlights.rating != null && (
                <li>
                  Rating: {s.highlights.rating}
                  {s.highlights.reviewCount != null
                    ? ` (${s.highlights.reviewCount})`
                    : ""}
                </li>
              )}
            </ul>
            {s.highlights.badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.highlights.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-indigo-400/25 px-2 py-0.5 text-[11px] text-indigo-200"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function FrequencyGroupsBlock({
  groups,
  copied,
  onCopy,
}: {
  groups: FrequencyGroup[];
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Expresii pe frecvență</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tag-uri SEO neschimbate, grupate după câte listing-uri le conțin.
            Alege manual ce e relevant pentru produsul tău.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onCopy(
              "freq-all",
              groups
                .flatMap((g) =>
                  g.phrases.map((p) => `${p}\t${g.count}/${g.total}`),
                )
                .join("\n"),
            )
          }
          className="rounded-full border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 hover:border-indigo-300/50"
        >
          {copied === "freq-all" ? "Copiat" : "Copy CSV"}
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {groups.map((g) => {
          const key = `group-${g.count}`;
          return (
            <div key={key}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold text-indigo-200">
                  Apare în {g.count}/{g.total}
                  <span className="ml-2 font-sans text-xs font-normal text-slate-500">
                    ({g.phrases.length} expresii)
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => onCopy(key, g.phrases.join("\n"))}
                  className="rounded-full px-2.5 py-1 text-[11px] text-slate-400 hover:text-indigo-200"
                >
                  {copied === key ? "Copiat" : "Copy grup"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.phrases.map((p) => (
                  <PhraseChip
                    key={`${g.count}-${p}`}
                    phrase={p}
                    count={g.count}
                    total={g.total}
                    copied={copied}
                    copyKey={`p-${g.count}-${p}`}
                    onCopy={onCopy}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SuggestionListsBlock({
  forTags,
  forTitle,
  copied,
  onCopy,
}: {
  forTags: TagFrequencyItem[];
  forTitle: TagFrequencyItem[];
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SuggestionColumn
        title="Sugestii Tags"
        hint="Aceleași expresii, neschimbate. Etsy permite max 13 tag-uri · 20 caractere fiecare — alegi tu ce lipești."
        items={forTags}
        showCharWarn
        copied={copied}
        copyPrefix="sug-tags"
        onCopy={onCopy}
      />
      <SuggestionColumn
        title="Sugestii Title"
        hint="Aceleași expresii ca și candidate pentru titlu. Nu generăm titluri — compui manual din ce e relevant."
        items={forTitle}
        showCharWarn={false}
        copied={copied}
        copyPrefix="sug-title"
        onCopy={onCopy}
      />
    </div>
  );
}

function SuggestionColumn({
  title,
  hint,
  items,
  showCharWarn,
  copied,
  copyPrefix,
  onCopy,
}: {
  title: string;
  hint: string;
  items: TagFrequencyItem[];
  showCharWarn: boolean;
  copied: string | null;
  copyPrefix: string;
  onCopy: (key: string, text: string) => void;
}) {
  const allKey = `${copyPrefix}-all`;
  return (
    <section className="rounded-2xl border border-indigo-400/15 bg-slate-950/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-medium text-white">{title}</h2>
        <button
          type="button"
          onClick={() => onCopy(allKey, items.map((i) => i.phrase).join("\n"))}
          className="rounded-full border border-indigo-400/25 px-2.5 py-1 text-[11px] text-indigo-100 hover:border-indigo-300/40"
        >
          {copied === allKey ? "Copiat" : "Copy list"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <ul className="mt-4 max-h-80 space-y-1.5 overflow-auto">
        {items.map((item) => {
          const key = `${copyPrefix}-${item.phrase}`;
          const over =
            showCharWarn && item.phrase.length > ETSY_TAG_MAX_CHARS;
          return (
            <li
              key={key}
              className="flex items-center gap-2 rounded-lg border border-indigo-400/10 bg-slate-950/60 px-2.5 py-1.5"
            >
              <button
                type="button"
                onClick={() => onCopy(key, item.phrase)}
                className="min-w-0 flex-1 text-left text-sm text-slate-200 hover:text-white"
              >
                {item.phrase}
              </button>
              <span className="shrink-0 font-mono text-[11px] text-slate-500">
                {item.count}/{item.total}
              </span>
              {over && (
                <span
                  className="shrink-0 rounded border border-amber-500/40 px-1.5 py-0.5 text-[10px] text-amber-200"
                  title={`Etsy Tags: max ${ETSY_TAG_MAX_CHARS} caractere`}
                >
                  {item.phrase.length}c
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PhraseChip({
  phrase,
  count,
  total,
  copied,
  copyKey,
  onCopy,
}: {
  phrase: string;
  count?: number;
  total?: number;
  copied: string | null;
  copyKey: string;
  onCopy: (key: string, text: string) => void;
}) {
  const intensity =
    count != null && total != null ? tagIntensity(count, total) : "unique";
  return (
    <button
      type="button"
      onClick={() => onCopy(copyKey, phrase)}
      title={copied === copyKey ? "Copiat" : "Click to copy"}
      className={`rounded-full border px-2.5 py-1 text-xs transition hover:brightness-110 ${intensityClasses(intensity)}`}
    >
      {phrase}
      {count != null && total != null && (
        <span className="ml-1 font-mono opacity-70">
          {count}/{total}
        </span>
      )}
    </button>
  );
}

function ListingDetails({
  report,
  score,
  index,
  tagPresence,
  totalListings,
}: {
  report: ListingReport;
  score: ListingScore;
  index: number;
  tagPresence: TagPresenceItem[];
  totalListings: number;
}) {
  const title = report.identity.title || `Listing ${index + 1}`;
  const short = title.length > 80 ? `${title.slice(0, 79)}…` : title;
  const presenceByPhrase = new Map(
    tagPresence.map((t) => [
      t.phrase.trim().toLowerCase().replace(/\s+/g, " "),
      { count: t.count, total: t.total },
    ]),
  );

  return (
    <details className="rounded-2xl border border-indigo-400/15 bg-slate-950/50">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium text-white">Detalii — {short}</span>
        <span className="text-xs text-slate-500">
          scor {score.score} · {report.identity.listingId || "fără ID"}
          {report.seo.tags.length === 0 ? " · fără tags" : ""}
        </span>
      </summary>
      <div className="space-y-4 border-t border-indigo-400/10 px-5 py-4 text-sm">
        <p className="rounded-xl border border-indigo-400/15 bg-indigo-950/20 px-3 py-2 text-slate-300">
          <span className="font-semibold text-white">De ce scorul: </span>
          {score.reasons.join(" ")}
        </p>

        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          {report.media[0] && (
            <img
              src={report.media[0].src}
              alt={report.media[0].alt || title}
              className="h-[120px] w-[120px] rounded-xl border border-indigo-400/15 object-cover"
            />
          )}
          <dl className="grid gap-2">
            <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-indigo-400/10 py-1">
              <dt className="text-slate-500">Preț</dt>
              <dd className="text-slate-200">{money(report)}</dd>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-indigo-400/10 py-1">
              <dt className="text-slate-500">Shop</dt>
              <dd className="text-slate-200">{report.shop.name || "—"}</dd>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-indigo-400/10 py-1">
              <dt className="text-slate-500">Favorite</dt>
              <dd className="text-slate-200">
                {report.knownSignals.favorites ?? "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-indigo-400/10 py-1">
              <dt className="text-slate-500">În coș</dt>
              <dd className="text-slate-200">
                {report.knownSignals.inCart ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tags SEO ({report.seo.tags.length}) — evidențiate după frecvență în set
          </h4>
          <div className="mt-2">
            <HighlightedTagChips
              tags={report.seo.tags}
              presenceByPhrase={presenceByPhrase}
              total={totalListings}
            />
          </div>
        </div>

        {report.knownSignals.badges.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Badges
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.knownSignals.badges.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-indigo-400/30 px-2 py-0.5 text-xs text-indigo-200"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {report.discoveredSignals.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-slate-500">
              Semnale descoperite ({report.discoveredSignals.length})
            </summary>
            <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-indigo-400/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Key</th>
                    <th className="px-2 py-1.5">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.discoveredSignals.slice(0, 40).map((s) => (
                    <tr
                      key={`${s.path}:${s.key}`}
                      className="border-t border-indigo-400/10"
                    >
                      <td className="px-2 py-1 font-mono text-indigo-200/80">
                        {s.key}
                      </td>
                      <td className="max-w-[14rem] truncate px-2 py-1 text-slate-400">
                        {JSON.stringify(s.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </details>
  );
}
