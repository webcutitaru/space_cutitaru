"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { convertClient } from "@/lib/image-convert/convert-client";
import { formatBytes, savingsPercent } from "@/lib/image-convert/format-bytes";
import {
  DEFAULT_PRESET,
  isPresetKey,
  PRESETS,
  type PresetKey,
} from "@/lib/image-convert/presets";
import type { ConvertJob } from "@/lib/image-convert/types";
import { PRESET_STORAGE_KEY } from "@/lib/image-convert/types";
import { buildZip, downloadBlob, webpFilename } from "@/lib/image-convert/zip";

let jobSeq = 0;

function nextJobId() {
  jobSeq += 1;
  return `job-${jobSeq}`;
}

function readStoredPreset(): PresetKey {
  if (typeof window === "undefined") return DEFAULT_PRESET;
  try {
    const saved = localStorage.getItem(PRESET_STORAGE_KEY);
    if (saved && isPresetKey(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_PRESET;
}

export function ImageConvertApp() {
  const reduced = useReducedMotion() ?? false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preset, setPreset] = useState<PresetKey>(DEFAULT_PRESET);
  const [jobs, setJobs] = useState<ConvertJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  useEffect(() => {
    setPreset(readStoredPreset());
  }, []);

  useEffect(() => {
    return () => {
      jobs.forEach((job) => {
        if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const readyJobs = jobs.filter((j) => j.status === "ready" && j.preview);

  const updateJob = useCallback((id: string, patch: Partial<ConvertJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const processFile = useCallback(
    async (file: File, jobId: string, activePreset: PresetKey) => {
      updateJob(jobId, { status: "previewing", error: undefined });
      try {
        const preview = await convertClient(file, activePreset);
        const previewUrl = URL.createObjectURL(preview.blob);
        updateJob(jobId, { status: "ready", preview, previewUrl });
      } catch (err) {
        updateJob(jobId, {
          status: "error",
          error: err instanceof Error ? err.message : "Conversion failed.",
        });
      }
    },
    [updateJob],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const newJobs: ConvertJob[] = list.map((file) => ({
        id: nextJobId(),
        file,
        status: "pending" as const,
        preset,
      }));

      setJobs((prev) => [...prev, ...newJobs]);
      newJobs.forEach((job) => {
        void processFile(job.file, job.id, preset);
      });
    },
    [preset, processFile],
  );

  function handlePresetChange(next: PresetKey) {
    setPreset(next);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function handleClear() {
    jobs.forEach((job) => {
      if (job.previewUrl) URL.revokeObjectURL(job.previewUrl);
    });
    setJobs([]);
  }

  async function handleExportHq(job: ConvertJob) {
    if (job.status !== "ready") return;
    updateJob(job.id, { status: "exporting", error: undefined });
    try {
      const fd = new FormData();
      fd.append("file", job.file);
      fd.append("preset", job.preset);
      const response = await fetch("/api/image-convert/export", {
        method: "POST",
        body: fd,
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Export failed.");
      }
      const blob = await response.blob();
      downloadBlob(blob, webpFilename(job.file.name));
      updateJob(job.id, { status: "ready" });
    } catch (err) {
      updateJob(job.id, {
        status: "ready",
        error: err instanceof Error ? err.message : "Export failed.",
      });
    }
  }

  function handleQuickSave(job: ConvertJob) {
    if (!job.preview) return;
    downloadBlob(job.preview.blob, webpFilename(job.file.name));
  }

  async function handleDownloadAllQuick() {
    if (readyJobs.length === 0) return;
    setBatchBusy(true);
    try {
      const zip = await buildZip(
        readyJobs.map((job) => ({
          name: webpFilename(job.file.name),
          blob: job.preview!.blob,
        })),
      );
      downloadBlob(zip, "images-webp.zip");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handleDownloadAllHq() {
    if (readyJobs.length === 0) return;
    setBatchBusy(true);
    try {
      const entries: { name: string; blob: Blob }[] = [];
      for (const job of readyJobs) {
        const fd = new FormData();
        fd.append("file", job.file);
        fd.append("preset", job.preset);
        const response = await fetch("/api/image-convert/export", {
          method: "POST",
          body: fd,
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? `Export failed for ${job.file.name}.`);
        }
        entries.push({
          name: webpFilename(job.file.name),
          blob: await response.blob(),
        });
      }
      const zip = await buildZip(entries);
      downloadBlob(zip, "images-webp-hq.zip");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Batch export failed.");
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <motion.div
        className="glow-orb absolute -right-16 top-24 h-56 w-56 rounded-full bg-violet-500/15"
        animate={reduced ? undefined : { y: [0, -18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
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
            Image Converter
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Convert JPEG and PNG to WebP. Instant preview in your browser — files stay
            local until you export high quality.
          </p>
        </header>

        <motion.section
          className="mb-6 rounded-2xl border border-indigo-400/20 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <fieldset>
            <legend className="text-sm font-medium text-slate-300">
              Compression strength
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Applies to each image when added. Higher quality keeps more detail.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
                const item = PRESETS[key];
                const checked = preset === key;
                return (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      checked
                        ? "border-indigo-400/50 bg-indigo-950/40"
                        : "border-slate-700/80 bg-slate-900/40 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="preset"
                      value={key}
                      checked={checked}
                      onChange={() => handlePresetChange(key)}
                      className="sr-only"
                    />
                    <div className="text-sm font-medium text-white">
                      {item.label}
                      {"recommended" in item && item.recommended && (
                        <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-indigo-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </motion.section>

        <motion.div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            dragOver
              ? "border-indigo-400/60 bg-indigo-950/30"
              : "border-slate-700/80 bg-slate-950/50 hover:border-indigo-400/40"
          }`}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          <p className="text-sm font-medium text-indigo-100">
            Drop images here or click to browse
          </p>
          <p className="mt-2 text-xs text-slate-500">JPEG & PNG · max 20 MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </motion.div>

        {jobs.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              {readyJobs.length} of {jobs.length} ready
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={readyJobs.length === 0 || batchBusy}
                onClick={() => void handleDownloadAllQuick()}
                className="rounded-lg border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 transition hover:border-indigo-300/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {batchBusy ? "Working…" : "Download all (Quick)"}
              </button>
              <button
                type="button"
                disabled={readyJobs.length === 0 || batchBusy}
                onClick={() => void handleDownloadAllHq()}
                className="rounded-lg border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 transition hover:border-indigo-300/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download all (HQ)
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-3">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onQuickSave={() => handleQuickSave(job)}
              onExportHq={() => void handleExportHq(job)}
            />
          ))}
        </ul>

        {jobs.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            No images yet. Add files to see instant WebP previews.
          </p>
        )}
      </div>
    </main>
  );
}

function JobRow({
  job,
  onQuickSave,
  onExportHq,
}: {
  job: ConvertJob;
  onQuickSave: () => void;
  onExportHq: () => void;
}) {
  const preview = job.preview;
  const savings =
    preview && preview.originalSize > 0
      ? savingsPercent(preview.originalSize, preview.optimizedSize)
      : null;

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/60 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
          {job.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : job.status === "previewing" || job.status === "exporting" ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
          ) : job.status === "error" ? (
            <span className="text-xs text-rose-400">!</span>
          ) : (
            <span className="text-xs text-slate-600">…</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{job.file.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {formatBytes(job.file.size)}
            {preview && (
              <>
                {" → "}
                <span className="text-indigo-300">{formatBytes(preview.optimizedSize)}</span>
                {savings !== null && savings > 0 && (
                  <span className="text-emerald-400/90"> (−{savings}%)</span>
                )}
              </>
            )}
          </div>
          {job.error && (
            <p className="mt-1 text-xs text-rose-300">{job.error}</p>
          )}
          {job.status === "previewing" && (
            <p className="mt-1 text-xs text-slate-500">Generating preview…</p>
          )}
          {job.status === "exporting" && (
            <p className="mt-1 text-xs text-slate-500">Exporting HQ…</p>
          )}
        </div>
      </div>

      {job.status === "ready" && preview && (
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onQuickSave}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400"
          >
            Quick save
          </button>
          <button
            type="button"
            onClick={onExportHq}
            className="rounded-lg border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 transition hover:border-indigo-300/50"
          >
            Export HQ
          </button>
        </div>
      )}
    </li>
  );
}
