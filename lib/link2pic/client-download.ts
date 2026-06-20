import type { ExtractedImage } from "./types";

const CONCURRENCY = 5;

export async function fetchImageBlob(url: string): Promise<Blob> {
  const proxyUrl = `/api/link2pic/proxy?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Download failed (${response.status}).`);
  }

  return response.blob();
}

export async function downloadImage(url: string, filename: string) {
  const blob = await fetchImageBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function numberedFilename(image: ExtractedImage, index: number): string {
  const base = image.filename.replace(/\.[^.]+$/, "") || `image-${index + 1}`;
  const ext = image.filename.includes(".")
    ? image.filename.split(".").pop()
    : "jpg";
  return `${String(index + 1).padStart(2, "0")}-${base}.${ext ?? "jpg"}`;
}

export async function fetchImagesWithConcurrency(
  items: Array<{ url: string; filename: string }>,
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ name: string; blob: Blob }>> {
  const results: Array<{ name: string; blob: Blob }> = [];
  let done = 0;

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const blob = await fetchImageBlob(item.url);
        done += 1;
        onProgress?.(done, items.length);
        return { name: item.filename, blob };
      }),
    );
    results.push(...batchResults);
  }

  return results;
}
