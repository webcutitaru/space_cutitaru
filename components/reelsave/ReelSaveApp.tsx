"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { VideoPlayer } from "@/components/reelsave/VideoPlayer";
import { thumbnailProxyUrl, triggerDownload } from "@/lib/reelsave/client-download";
import type { ExtractResult } from "@/lib/reelsave/types";

type Status = "idle" | "loading" | "success" | "error";

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatResolution(width?: number, height?: number): string {
  if (!width || !height) return "—";
  return `${width}×${height}`;
}

function platformLabel(platform: ExtractResult["platform"]): string {
  return platform === "instagram" ? "Instagram" : "TikTok";
}

export function ReelSaveApp() {
  const [pageUrl, setPageUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const reduced = useReducedMotion() ?? false;

  async function handleExtract(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/reelsave/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Extraction failed.");
      }

      setResult(data as ExtractResult);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not process this link.");
    }
  }

  async function handleDownload() {
    if (!result) return;

    setDownloadBusy(true);
    setError(null);

    try {
      await triggerDownload(result.pageUrl, result.formatId, result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <motion.div
        className="glow-orb absolute -right-16 top-24 h-56 w-56 rounded-full bg-fuchsia-500/10"
        animate={reduced ? undefined : { y: [0, -16, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-3xl">
        <header className="mb-10">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.35em] text-indigo-300/70 transition-colors hover:text-indigo-200"
          >
            ← SPACE
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            ReelSave
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Paste an Instagram Reel or TikTok link — download the video without
            watermark in the best available quality.
          </p>
        </header>

        <motion.form
          onSubmit={handleExtract}
          className="rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <label className="block text-sm font-medium text-slate-300">
            Instagram or TikTok URL
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              required
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              placeholder="https://www.instagram.com/reel/… or https://www.tiktok.com/@…/video/…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Fetching…" : "Get video"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Supports public Instagram posts &amp; Reels, and TikTok videos
            (including vm.tiktok.com short links).
          </p>
        </motion.form>

        {status === "loading" && (
          <motion.div
            className="mt-8 rounded-2xl border border-indigo-400/15 bg-slate-950/50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
              Resolving video — this may take a few seconds…
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
              <Stat label="Platform" value={platformLabel(result.platform)} />
              <Stat label="Duration" value={formatDuration(result.durationSec)} />
              <Stat
                label="Resolution"
                value={formatResolution(result.width, result.height)}
              />
              <Stat label="Format" value={result.ext.toUpperCase()} />
            </div>

            {(result.title || result.uploader) && (
              <div className="rounded-2xl border border-indigo-400/15 bg-slate-950/50 p-4">
                {result.uploader && (
                  <p className="text-sm font-medium text-indigo-200">
                    {result.uploader}
                  </p>
                )}
                {result.title && (
                  <p className="mt-1 text-sm text-slate-300">{result.title}</p>
                )}
              </div>
            )}

            {result.warnings?.map((warning) => (
              <p key={warning} className="text-sm text-amber-200/90">
                {warning}
              </p>
            ))}

            <VideoPlayer
              pageUrl={result.pageUrl}
              formatId={result.formatId}
              filename={result.filename}
              poster={
                result.thumbnailUrl
                  ? thumbnailProxyUrl(result.thumbnailUrl)
                  : undefined
              }
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloadBusy}
                className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadBusy ? "Downloading…" : `Download ${result.ext.toUpperCase()}`}
              </button>
              <span className="text-xs text-slate-500">
                Resolved in {result.meta.durationMs}ms
              </span>
            </div>
          </motion.section>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-indigo-400/20 bg-slate-950/60 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-white">{value}</p>
    </div>
  );
}
