"use client";

import type {
  RangeBarItem,
  ScoreSeriesItem,
  TagFrequencyItem,
  TagPresenceItem,
} from "@/lib/etsy-analyzer";

export type TagIntensity = "full" | "high" | "mid" | "low" | "unique";

export function tagIntensity(count: number, total: number): TagIntensity {
  if (total <= 0) return "unique";
  const ratio = count / total;
  if (ratio >= 1) return "full";
  if (ratio >= 0.7) return "high";
  if (ratio >= 0.4) return "mid";
  if (count >= 2) return "low";
  return "unique";
}

export function intensityClasses(intensity: TagIntensity): string {
  switch (intensity) {
    case "full":
      return "border-emerald-400/50 bg-emerald-950/50 text-emerald-100";
    case "high":
      return "border-teal-400/40 bg-teal-950/40 text-teal-100";
    case "mid":
      return "border-indigo-400/40 bg-indigo-950/40 text-indigo-100";
    case "low":
      return "border-amber-500/35 bg-amber-950/30 text-amber-100";
    default:
      return "border-slate-600/40 bg-slate-900/50 text-slate-400";
  }
}

export function barFillClass(intensity: TagIntensity): string {
  switch (intensity) {
    case "full":
      return "bg-emerald-400";
    case "high":
      return "bg-teal-400";
    case "mid":
      return "bg-indigo-400";
    case "low":
      return "bg-amber-400";
    default:
      return "bg-slate-500";
  }
}

function FrequencyBars({
  title,
  hint,
  items,
  maxItems = 16,
}: {
  title: string;
  hint: string;
  items: TagFrequencyItem[];
  maxItems?: number;
}) {
  const list = items.slice(0, maxItems);
  if (list.length === 0) return null;
  const maxCount = Math.max(...list.map((i) => i.count), 1);

  return (
    <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/60 p-5 sm:p-6">
      <h2 className="text-lg font-medium text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
      <ul className="mt-5 space-y-2.5">
        {list.map((item) => {
          const intensity = tagIntensity(item.count, item.total);
          const width = Math.max(8, Math.round((item.count / maxCount) * 100));
          return (
            <li key={item.phrase} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-slate-200">
                  {item.phrase}
                </span>
                <span className="shrink-0 font-mono text-slate-500">
                  {item.count}/{item.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className={`h-full rounded-full ${barFillClass(intensity)}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-500">
        <span className={`rounded-full border px-2 py-0.5 ${intensityClasses("full")}`}>
          pe toate
        </span>
        <span className={`rounded-full border px-2 py-0.5 ${intensityClasses("high")}`}>
          majoritate
        </span>
        <span className={`rounded-full border px-2 py-0.5 ${intensityClasses("mid")}`}>
          mediu
        </span>
        <span className={`rounded-full border px-2 py-0.5 ${intensityClasses("low")}`}>
          rar
        </span>
      </div>
    </section>
  );
}

function ScoreBars({ series }: { series: ScoreSeriesItem[] }) {
  if (series.length === 0) return null;
  return (
    <section className="rounded-2xl border border-indigo-400/20 bg-slate-950/60 p-5 sm:p-6">
      <h2 className="text-lg font-medium text-white">Comparativ scoruri</h2>
      <p className="mt-1 text-sm text-slate-400">
        Scor 0–100 pe fiecare listing din set.
      </p>
      <ul className="mt-5 space-y-3">
        {series.map((s, i) => (
          <li key={s.listingId || i} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-slate-200">
                {s.label}
                {!s.hasSeoTags && (
                  <span className="ml-2 text-amber-300/80">· fără tags</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-indigo-300">
                {s.score}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-full rounded-full bg-indigo-400"
                style={{ width: `${Math.min(100, Math.max(4, s.score))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RangeBars({ bars }: { bars: RangeBarItem[] }) {
  if (bars.length === 0) return null;
  return (
    <section className="rounded-2xl border border-indigo-400/15 bg-slate-950/50 p-5 sm:p-6">
      <h2 className="text-lg font-medium text-white">Intervale numerice</h2>
      <p className="mt-1 text-sm text-slate-400">
        Min–max cu mediană marcată pe fiecare metrică.
      </p>
      <ul className="mt-5 space-y-5">
        {bars.map((b) => {
          const span = b.max - b.min || 1;
          const medPos = Math.round(((b.median - b.min) / span) * 100);
          return (
            <li key={b.label}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-white">{b.label}</span>
                <span className="font-mono text-xs text-slate-400">
                  {b.min === b.max
                    ? `${b.min}${b.unit ? ` ${b.unit}` : ""}`
                    : `${b.min}–${b.max}${b.unit ? ` ${b.unit}` : ""} · med ${b.median}`}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-slate-800/80">
                <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-indigo-500/30" />
                <div
                  className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-indigo-200"
                  style={{ left: `calc(${medPos}% - 2px)` }}
                  title={`Mediană ${b.median}`}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{b.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ComparisonCharts({
  tagPresence,
  titleKeywordFrequency,
  scoreSeries,
  rangeBars,
}: {
  tagPresence: TagPresenceItem[];
  titleKeywordFrequency: TagFrequencyItem[];
  scoreSeries: ScoreSeriesItem[];
  rangeBars: RangeBarItem[];
}) {
  return (
    <div className="space-y-5">
      <FrequencyBars
        title="Taguri SEO comune"
        hint="Cât de des apare fiecare tag în setul analizat (X din N listinguri)."
        items={tagPresence}
      />
      <ScoreBars series={scoreSeries} />
      <FrequencyBars
        title="Cuvinte cheie din titlu"
        hint="N-grame / cuvinte din titluri care se repetă între listinguri."
        items={titleKeywordFrequency}
        maxItems={12}
      />
      <RangeBars bars={rangeBars} />
    </div>
  );
}

export function HighlightedTagChips({
  tags,
  presenceByPhrase,
  total,
}: {
  tags: string[];
  presenceByPhrase: Map<string, { count: number; total: number }>;
  total: number;
}) {
  if (tags.length === 0) {
    return (
      <p className="text-xs text-amber-200/90">
        Fără tag-uri SEO extrase pe acest listing.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const key = t.trim().toLowerCase().replace(/\s+/g, " ");
        const info = presenceByPhrase.get(key);
        const count = info?.count ?? 1;
        const tot = info?.total ?? total;
        const intensity = tagIntensity(count, tot);
        return (
          <span
            key={t}
            title={`Apare în ${count}/${tot} listinguri`}
            className={`rounded-full border px-2 py-0.5 text-xs ${intensityClasses(intensity)}`}
          >
            {t}
            <span className="ml-1 font-mono opacity-70">
              {count}/{tot}
            </span>
          </span>
        );
      })}
    </div>
  );
}
