import { isSegmentNoiseUrl } from "./noise-patterns";
import type { ExtractedImage, ImageSource } from "./types";

const TINY_DIM_RE = /(?:[?&](?:w|width|h|height)=(\d+))/i;

export function uniqueImageUrls(urls: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();

  return urls
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url))
    .map((url) => (url.startsWith("//") ? `https:${url}` : url))
    .filter((url) => /^https?:\/\//i.test(url))
    .filter((url) => {
      const key = url.split("?")[0] ?? url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function resolveUrl(raw: string, base: URL): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  try {
    return new URL(trimmed, base.origin).href;
  } catch {
    return trimmed;
  }
}

export function upgradeShopifyImageUrl(url: string): string {
  return url
    .replace(/_(?:pico|icon|thumb|small|compact|medium|large|grande|\d+x\d*|\d*x\d+)\./gi, ".")
    .replace(/([?&])width=\d+/gi, "$1width=4096")
    .replace(/([?&])height=\d+/gi, "");
}

export function isNoiseUrl(url: string): boolean {
  if (isSegmentNoiseUrl(url)) return true;

  const lower = url.toLowerCase();
  const dimMatch = lower.match(TINY_DIM_RE);
  if (dimMatch?.[1] && Number.parseInt(dimMatch[1], 10) <= 48) return true;

  return false;
}

export function scoreImageUrl(url: string): number {
  let score = 0;
  const lower = url.toLowerCase();

  if (lower.includes("thumb") || lower.includes("_small")) score -= 50;
  if (lower.includes("medium")) score -= 20;
  if (lower.includes("large") || lower.includes("original")) score += 30;
  if (lower.includes("4096") || lower.includes("2048")) score += 40;

  const widthMatch = lower.match(/(?:[?&]width=|\/)(\d{3,4})(?:x|\D|$)/);
  if (widthMatch?.[1]) {
    score += Math.min(Number.parseInt(widthMatch[1], 10), 2000) / 10;
  }

  return score;
}

type ToExtractedOptions = {
  skipNoise?: boolean;
};

export function toExtractedImages(
  urls: string[],
  source: ImageSource,
  base?: URL,
  options?: ToExtractedOptions,
): ExtractedImage[] {
  const resolved = base
    ? uniqueImageUrls(urls.map((u) => resolveUrl(u, base)))
    : uniqueImageUrls(urls);

  const filtered = options?.skipNoise
    ? resolved
    : resolved.filter((url) => !isNoiseUrl(url));

  return filtered
    .sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a))
    .map((url, index) => {
      let filename = `image-${index + 1}.jpg`;
      try {
        filename = new URL(url).pathname.split("/").pop() || filename;
        if (!/\.[a-z0-9]{2,5}$/i.test(filename)) {
          filename = `${filename.replace(/\.[^.]+$/, "") || `image-${index + 1}`}.jpg`;
        }
      } catch {
        /* keep default */
      }

      return {
        id: `img-${index}`,
        url,
        filename,
        source,
      };
    });
}

export function mergeImages(...groups: ExtractedImage[][]): ExtractedImage[] {
  const seen = new Set<string>();
  const merged: ExtractedImage[] = [];

  for (const group of groups) {
    for (const image of group) {
      const key = image.url.split("?")[0] ?? image.url;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        ...image,
        id: `img-${merged.length}`,
        filename:
          image.filename ||
          (() => {
            try {
              return new URL(image.url).pathname.split("/").pop() || `image-${merged.length + 1}.jpg`;
            } catch {
              return `image-${merged.length + 1}.jpg`;
            }
          })(),
      });
    }
  }

  return merged;
}

export function parseSrcset(srcset: string, base: URL): string[] {
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
    .map((url) => resolveUrl(url!, base));
}
