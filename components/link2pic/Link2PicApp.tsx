"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageLightbox } from "@/components/link2pic/ImageLightbox";
import {
  downloadImage,
  fetchImagesWithConcurrency,
  numberedFilename,
} from "@/lib/link2pic/client-download";
import { slugFromPageUrl } from "@/lib/link2pic/download";
import type { ExtractResult, ExtractedImage } from "@/lib/link2pic/types";
import { formatBytes } from "@/lib/image-convert/format-bytes";
import { buildZip, downloadBlob } from "@/lib/image-convert/zip";

type Status = "idle" | "loading" | "success" | "error";

const NO_IMAGES_ERROR =
  "This link doesn't expose downloadable product images (page may be protected or unsupported).";

function formatExtractError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Could not check this link.";

  if (/no product images found/i.test(message)) {
    return NO_IMAGES_ERROR;
  }

  return message;
}

export function Link2PicApp() {
  const [pageUrl, setPageUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduced = useReducedMotion() ?? false;

  const allImages = useMemo(
    () =>
      result
        ? [...result.productImages, ...result.pageImages]
        : [],
    [result],
  );

  const allSelected = useMemo(() => {
    if (allImages.length === 0) return false;
    return allImages.every((img) => selected.has(img.id));
  }, [allImages, selected]);

  async function handleExtract(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setResult(null);
    setSelected(new Set());
    setLightboxIndex(null);

    try {
      const response = await fetch("/api/link2pic/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Extraction failed.");
      }

      const extractResult = data as ExtractResult;
      setResult(extractResult);
      setSelected(
        new Set(
          [
            ...extractResult.productImages,
            ...extractResult.pageImages,
          ].map((img) => img.id),
        ),
      );
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(formatExtractError(err));
    }
  }

  function toggleImage(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!result) return;
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allImages.map((img) => img.id)));
    }
  }

  const downloadZip = useCallback(
    async (images: ExtractedImage[]) => {
      if (images.length === 0) return;

      setDownloadBusy(true);
      setDownloadProgress(`0 / ${images.length}`);

      try {
        const items = images.map((img, index) => ({
          url: img.url,
          filename: numberedFilename(img, index),
        }));

        const entries = await fetchImagesWithConcurrency(items, (done, total) => {
          setDownloadProgress(`${done} / ${total}`);
        });

        const zip = await buildZip(
          entries.map((entry) => ({ name: entry.name, blob: entry.blob })),
        );

        const slug = result ? slugFromPageUrl(result.pageUrl) : "images";
        downloadBlob(zip, `link2pic-${slug}.zip`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed.");
      } finally {
        setDownloadBusy(false);
        setDownloadProgress(null);
      }
    },
    [result],
  );

  async function handleDownloadSelected() {
    if (!result) return;
    const images = allImages.filter((img) => selected.has(img.id));
    await downloadZip(images);
  }

  async function handleDownloadAll() {
    if (!result) return;
    await downloadZip(allImages);
  }

  async function handleDownloadOne(image: ExtractedImage, index: number) {
    setDownloadBusy(true);
    try {
      await downloadImage(image.url, numberedFilename(image, index));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadBusy(false);
    }
  }

  const selectedCount = selected.size;
  const lightboxImage =
    lightboxIndex !== null ? allImages[lightboxIndex] : null;

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <motion.div
        className="glow-orb absolute -left-20 top-20 h-56 w-56 rounded-full bg-indigo-500/15"
        animate={reduced ? undefined : { y: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-10">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.35em] text-indigo-300/70 transition-colors hover:text-indigo-200"
          >
            ← SPACE
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Link2Pic
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Paste a product link — we check if images are available, then you
            download them.
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
            Product or listing URL
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              required
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              placeholder="https://example.com/product/your-item"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Checking availability…" : "Check link"}
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
              Checking if product images are available…
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
              <Stat
                label="Product images"
                value={String(result.productImages.length)}
              />
              {result.pageImages.length > 0 && (
                <Stat
                  label="Other page images"
                  value={String(result.pageImages.length)}
                />
              )}
              <Stat label="Detected as" value={result.platform} />
              {result.title && <Stat label="Title" value={result.title} />}
              <Stat label="Duration" value={`${result.meta.durationMs}ms`} />
            </div>

            {result.warnings?.map((warning) => (
              <p key={warning} className="text-sm text-amber-200/90">
                {warning}
              </p>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleAll}
                disabled={downloadBusy}
                className="rounded-lg border border-indigo-400/30 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-300/50 disabled:opacity-60"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <button
                type="button"
                onClick={handleDownloadSelected}
                disabled={downloadBusy || selectedCount === 0}
                className="rounded-lg border border-indigo-400/30 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-300/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download selected ({selectedCount})
              </button>
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloadBusy}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download all (ZIP)
              </button>
              {downloadProgress && (
                <span className="font-mono text-xs text-slate-400">
                  Fetching {downloadProgress}…
                </span>
              )}
            </div>

            <ImageGroupCard
              title="Product gallery"
              description="Main product images from the listing."
              images={result.productImages}
              selected={selected}
              downloadBusy={downloadBusy}
              lightboxOffset={0}
              onToggle={toggleImage}
              onDownload={handleDownloadOne}
              onZoom={setLightboxIndex}
            />

            {result.pageImages.length > 0 && (
              <ImageGroupCard
                title="Other images on page"
                description="Description, specs, or extra visuals found on the same page."
                images={result.pageImages}
                selected={selected}
                downloadBusy={downloadBusy}
                lightboxOffset={result.productImages.length}
                onToggle={toggleImage}
                onDownload={handleDownloadOne}
                onZoom={setLightboxIndex}
              />
            )}
          </motion.section>
        )}
      </div>

      {lightboxImage && result && lightboxIndex !== null && (
        <ImageLightbox
          image={lightboxImage}
          index={lightboxIndex}
          total={allImages.length}
          onClose={() => setLightboxIndex(null)}
          onPrev={
            lightboxIndex > 0
              ? () => setLightboxIndex(lightboxIndex - 1)
              : undefined
          }
          onNext={
            lightboxIndex < allImages.length - 1
              ? () => setLightboxIndex(lightboxIndex + 1)
              : undefined
          }
        />
      )}
    </main>
  );
}

function ImageGroupCard({
  title,
  description,
  images,
  selected,
  downloadBusy,
  lightboxOffset,
  onToggle,
  onDownload,
  onZoom,
}: {
  title: string;
  description: string;
  images: ExtractedImage[];
  selected: Set<string>;
  downloadBusy: boolean;
  lightboxOffset: number;
  onToggle: (id: string) => void;
  onDownload: (image: ExtractedImage, index: number) => void;
  onZoom: (index: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/60">
      <div className="border-b border-slate-800/80 px-5 py-4">
        <h2 className="text-base font-medium text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3">Preview</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Dimensions</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.map((image, index) => (
              <ImageListRow
                key={image.id}
                image={image}
                index={index}
                selected={selected.has(image.id)}
                disabled={downloadBusy}
                onToggle={() => onToggle(image.id)}
                onDownload={() => onDownload(image, index)}
                onZoom={() => onZoom(lightboxOffset + index)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="max-w-xs rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-sm text-indigo-100">{value}</div>
    </div>
  );
}

function formatDimensions(width?: number, height?: number): string {
  if (width && height) return `${width} × ${height}`;
  if (width) return `${width} px wide`;
  if (height) return `${height} px tall`;
  return "—";
}

function ImageListRow({
  image,
  index,
  selected,
  disabled,
  onToggle,
  onDownload,
  onZoom,
}: {
  image: ExtractedImage;
  index: number;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onZoom: () => void;
}) {
  const [sizeBytes, setSizeBytes] = useState<number | undefined>(image.sizeBytes);
  const [width, setWidth] = useState<number | undefined>(image.width);
  const [height, setHeight] = useState<number | undefined>(image.height);

  const proxySrc = `/api/link2pic/proxy?url=${encodeURIComponent(image.url)}`;

  useEffect(() => {
    if (sizeBytes && width && height) return;

    let cancelled = false;

    async function loadMeta() {
      try {
        const response = await fetch(
          `/api/link2pic/meta?url=${encodeURIComponent(image.url)}`,
        );
        if (!response.ok || cancelled) return;
        const meta = (await response.json()) as {
          sizeBytes?: number;
          width?: number;
          height?: number;
        };
        if (cancelled) return;
        if (meta.sizeBytes) setSizeBytes(meta.sizeBytes);
        if (meta.width) setWidth(meta.width);
        if (meta.height) setHeight(meta.height);
      } catch {
        /* ignore */
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [image.url, sizeBytes, width, height]);

  return (
    <tr
      className={`border-t border-slate-800/80 text-slate-200 ${
        selected ? "bg-indigo-950/20" : ""
      }`}
    >
      <td className="px-3 py-3 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-indigo-500"
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <button
          type="button"
          onClick={onZoom}
          className="block overflow-hidden rounded-lg border border-slate-700 bg-slate-900/80 transition hover:border-indigo-400/40"
          title="Click to zoom"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxySrc}
            alt={image.filename}
            className="h-14 w-14 object-contain p-1"
            loading="lazy"
            onLoad={(event) => {
              const img = event.currentTarget;
              if (!width && img.naturalWidth) setWidth(img.naturalWidth);
              if (!height && img.naturalHeight) setHeight(img.naturalHeight);
            }}
          />
        </button>
      </td>
      <td className="max-w-[200px] px-4 py-3 align-middle">
        <div className="truncate font-medium text-white" title={image.filename}>
          {image.filename}
        </div>
        <div className="font-mono text-[10px] uppercase text-slate-500">
          {image.source}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-slate-300">
        {formatDimensions(width, height)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-slate-300">
        {sizeBytes ? formatBytes(sizeBytes) : "—"}
      </td>
      <td className="px-4 py-3 align-middle">
        <button
          type="button"
          onClick={onDownload}
          disabled={disabled}
          className="rounded-lg border border-indigo-400/30 px-3 py-1.5 text-xs text-indigo-100 transition hover:border-indigo-300/50 disabled:opacity-50"
        >
          Download
        </button>
      </td>
    </tr>
  );
}
