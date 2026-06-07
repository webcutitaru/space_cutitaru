import type { Review, ReviewProvider } from "../types";

export function normalizeReview(
  partial: Omit<Review, "provider">,
  provider: ReviewProvider,
): Review {
  return {
    ...partial,
    provider,
    id:
      partial.id ||
      `${provider}-${partial.productHandle}-${partial.author}-${partial.date}`.replace(
        /\s+/g,
        "-",
      ),
  };
}

export function parseRating(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function handleFromProductUrl(url: string): string {
  const match = url.match(/\/products\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

export function uniqueImageUrls(urls: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();

  return urls
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)))
    .filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

export function pickBestImageUrl(urls: string[]): string | undefined {
  return urls.find((url) => !url.includes("thumb") && !url.includes("_small")) ?? urls[0];
}
