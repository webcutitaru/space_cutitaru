"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { downloadFile, reviewsToCsv } from "@/lib/reviews/export";
import type { ExtractResult } from "@/lib/reviews/types";

type Status = "idle" | "loading" | "success" | "error";

export function ReviewsExtractorApp() {
  const [storeUrl, setStoreUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const reduced = useReducedMotion() ?? false;

  const preview = useMemo(() => result?.reviews.slice(0, 25) ?? [], [result]);

  async function handleExtract(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/reviews/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Extraction failed.");
      }

      setResult(data as ExtractResult);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Extraction failed.");
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <motion.div
        className="glow-orb absolute -left-20 top-20 h-56 w-56 rounded-full bg-indigo-500/15"
        animate={reduced ? undefined : { y: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-[0.35em] text-indigo-300/70 transition-colors hover:text-indigo-200"
            >
              ← SPACE
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Reviews Extractor
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Paste a Shopify store URL and extract public product reviews — including
              Judge.me, Loox, Yotpo, and native widgets.
            </p>
          </div>
        </header>

        <motion.form
          onSubmit={handleExtract}
          className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <label className="block text-sm font-medium text-slate-300">
            Shopify store URL
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              required
              value={storeUrl}
              onChange={(event) => setStoreUrl(event.target.value)}
              placeholder="https://your-store.com or https://shop.myshopify.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Extracting…" : "Extract reviews"}
            </button>
          </div>
        </motion.form>

        {status === "loading" && (
          <motion.div
            className="mt-8 rounded-2xl border border-indigo-400/15 bg-slate-950/50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
              Scanning products and review providers…
            </div>
          </motion.div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-rose-400/30 bg-rose-950/30 p-5 text-sm text-rose-200">
            {error}
          </div>
        )}

        {result && (
          <motion.section
            className="mt-8 space-y-6"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Stat label="Reviews" value={String(result.reviews.length)} />
              <Stat label="Products scanned" value={String(result.productCount)} />
              <Stat label="Provider" value={result.provider} />
              <Stat label="Duration" value={`${result.meta.durationMs}ms`} />
            </div>

            {result.meta.truncated && (
              <p className="text-sm text-amber-200/90">
                Showing first {result.meta.maxProducts} products for speed. Re-run with
                fewer products or upgrade later for full-store exports.
              </p>
            )}

            {result.reviews.length === 0 ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-300">
                No public reviews found. The store may hide reviews, use a private app
                token, or block automated access.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        JSON.stringify(result, null, 2),
                        "reviews.json",
                        "application/json",
                      )
                    }
                    className="rounded-lg border border-indigo-400/30 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-300/50"
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        reviewsToCsv(result.reviews),
                        "reviews.csv",
                        "text/csv",
                      )
                    }
                    className="rounded-lg border border-indigo-400/30 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-300/50"
                  >
                    Download CSV
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/60">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Rating</th>
                          <th className="px-4 py-3">Review</th>
                          <th className="px-4 py-3">Author</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((review) => (
                          <tr
                            key={review.id}
                            className="border-t border-slate-800/80 text-slate-200"
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="font-medium">{review.productTitle}</div>
                              <div className="text-xs text-slate-500">
                                {review.productHandle}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">{review.rating}/5</td>
                            <td className="max-w-md px-4 py-3 align-top">
                              {review.title && (
                                <div className="font-medium text-white">
                                  {review.title}
                                </div>
                              )}
                              <div className="text-slate-400">{review.body}</div>
                            </td>
                            <td className="px-4 py-3 align-top">{review.author}</td>
                            <td className="px-4 py-3 align-top whitespace-nowrap text-slate-400">
                              {review.date ? review.date.slice(0, 10) : "—"}
                            </td>
                            <td className="px-4 py-3 align-top font-mono text-xs text-indigo-300/80">
                              {review.provider}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.reviews.length > preview.length && (
                    <p className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
                      Previewing {preview.length} of {result.reviews.length} reviews.
                      Download JSON/CSV for the full export.
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm text-indigo-100">{value}</div>
    </div>
  );
}
