import { isAlibabaBannerUrl } from "./alibaba-baxia";
import {
  alibabaDedupeKey,
  isAlibabaNoiseUrl,
  isAlibabaProductUrl,
  pickBestAlibabaVariant,
} from "./alibaba-urls";
import { filenameFromUrl } from "./download";
import { isProductNoiseUrl, isSegmentNoiseUrl, isTinyImageUrl } from "./noise-patterns";
import { parseDimensionsFromUrl, pixelArea } from "./parse-dimensions";
import { scoreImageUrl, upgradeShopifyImageUrl } from "./normalize";
import type { ExtractedImage, Platform } from "./types";

const MIN_AREA = 200 * 200;

function normalizeImageUrl(url: string, platform: Platform): string {
  if (platform === "shopify") return upgradeShopifyImageUrl(url);
  return url;
}

function normalizeDedupeKey(url: string, platform: Platform): string {
  if (platform === "alibaba") return alibabaDedupeKey(url);

  const normalized = normalizeImageUrl(url, platform);
  try {
    const parsed = new URL(normalized);
    return `${parsed.origin}${parsed.pathname}`.toLowerCase();
  } catch {
    return normalized.split("?")[0]?.toLowerCase() ?? normalized.toLowerCase();
  }
}

function shouldDropImage(url: string, platform: Platform): boolean {
  if (platform === "alibaba") {
    if (isAlibabaNoiseUrl(url)) return true;
    if (isAlibabaProductUrl(url)) return false;
  }

  return isProductNoiseUrl(url);
}

function shouldDropPageImage(url: string, platform: Platform): boolean {
  if (isSegmentNoiseUrl(url)) return true;

  if (platform === "alibaba") {
    if (isAlibabaBannerUrl(url)) return true;
    if (/\.(js|css|json|woff2?|ttf|svg)(?:\?|$)/i.test(url)) return true;
  }

  return isTinyImageUrl(url, 120);
}

function passesMinArea(
  url: string,
  width?: number,
  height?: number,
  platform?: Platform,
): boolean {
  const area = pixelArea(width, height);
  if (area === undefined) {
    if (platform === "alibaba" && isAlibabaProductUrl(url)) return true;
    return true;
  }
  return area >= MIN_AREA;
}

function withFilename(image: ExtractedImage, index: number): ExtractedImage {
  let filename: string;
  try {
    filename = filenameFromUrl(new URL(image.url));
  } catch {
    filename = `image-${index + 1}.jpg`;
  }

  const parsed = parseDimensionsFromUrl(image.url);
  return {
    ...image,
    filename,
    width: image.width ?? parsed.width,
    height: image.height ?? parsed.height,
    id: `img-${index}`,
  };
}

function sortImages(
  images: ExtractedImage[],
  platform: Platform,
): ExtractedImage[] {
  const hasGalleryOrder = images.some((img) => img.sortIndex !== undefined);

  if ((platform === "shopify" || platform === "alibaba") && hasGalleryOrder) {
    return [...images].sort(
      (a, b) => (a.sortIndex ?? 999) - (b.sortIndex ?? 999),
    );
  }

  return [...images].sort((a, b) => {
    const areaA =
      pixelArea(a.width, a.height) ??
      pixelArea(
        parseDimensionsFromUrl(a.url).width,
        parseDimensionsFromUrl(a.url).height,
      ) ??
      0;
    const areaB =
      pixelArea(b.width, b.height) ??
      pixelArea(
        parseDimensionsFromUrl(b.url).width,
        parseDimensionsFromUrl(b.url).height,
      ) ??
      0;

    if (areaB !== areaA) return areaB - areaA;
    return scoreImageUrl(b.url) - scoreImageUrl(a.url);
  });
}

function dedupeImages(
  images: ExtractedImage[],
  platform: Platform,
): ExtractedImage[] {
  const map = new Map<string, ExtractedImage>();

  for (const image of images) {
    const key = normalizeDedupeKey(image.url, platform);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, image);
      continue;
    }

    if (platform === "alibaba") {
      const bestUrl = pickBestAlibabaVariant(existing.url, image.url);
      const best = bestUrl === image.url ? image : existing;
      map.set(key, {
        ...best,
        sortIndex: Math.min(
          existing.sortIndex ?? 999,
          image.sortIndex ?? 999,
        ),
      });
    }
  }

  return Array.from(map.values());
}

export function imageDedupeKey(url: string, platform: Platform): string {
  return normalizeDedupeKey(url, platform);
}

const PAGE_MIN_AREA = 120 * 120;

function passesPageMinArea(width?: number, height?: number): boolean {
  const area = pixelArea(width, height);
  if (area === undefined) return true;
  return area >= PAGE_MIN_AREA;
}

export function filterPageImages(
  images: ExtractedImage[],
  platform: Platform,
  excludeKeys: Set<string>,
): { images: ExtractedImage[]; removedCount: number } {
  const beforeCount = images.length;
  const candidates: ExtractedImage[] = [];

  for (const image of images) {
    const key = normalizeDedupeKey(image.url, platform);
    if (excludeKeys.has(key)) continue;
    if (shouldDropPageImage(image.url, platform)) continue;

    const dims = parseDimensionsFromUrl(image.url);
    const width = image.width ?? dims.width;
    const height = image.height ?? dims.height;

    if (!passesPageMinArea(width, height)) continue;

    candidates.push({
      ...image,
      url: normalizeImageUrl(image.url, platform),
      width,
      height,
    });
  }

  const deduped = dedupeImages(candidates, platform);
  const sorted = sortImages(deduped, platform);
  const finalImages = sorted.map(withFilename);

  return {
    images: finalImages,
    removedCount: beforeCount - finalImages.length,
  };
}

export function filterProductImages(
  images: ExtractedImage[],
  platform: Platform,
): { images: ExtractedImage[]; removedCount: number } {
  const beforeCount = images.length;
  const candidates: ExtractedImage[] = [];

  for (const image of images) {
    if (shouldDropImage(image.url, platform)) continue;

    const dims = parseDimensionsFromUrl(image.url);
    const width = image.width ?? dims.width;
    const height = image.height ?? dims.height;

    if (!passesMinArea(image.url, width, height, platform)) continue;

    candidates.push({
      ...image,
      url: normalizeImageUrl(image.url, platform),
      width,
      height,
    });
  }

  const deduped = dedupeImages(candidates, platform);
  const sorted = sortImages(deduped, platform);
  const finalImages = sorted.map(withFilename);

  return {
    images: finalImages,
    removedCount: beforeCount - finalImages.length,
  };
}
