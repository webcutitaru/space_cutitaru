import * as cheerio from "cheerio";
import { parseDetailDataFromHtml } from "./alibaba-detail-data";
import { filenameFromUrl } from "./download";
import { resolveUrl, uniqueImageUrls } from "./normalize";
import { isSegmentNoiseUrl } from "./noise-patterns";
import type { ExtractedImage, Platform } from "./types";

function extractAlibabaDescriptionUrls(html: string): string[] {
  const detailData = parseDetailDataFromHtml(html);
  const product = detailData?.globalData?.product as
    | Record<string, unknown>
    | undefined;
  if (!product) return [];

  const urls: string[] = [];
  const fields = ["description", "productDescription", "detailDescription"];

  for (const field of fields) {
    const value = product[field];
    if (typeof value !== "string") continue;

    const matches = value.matchAll(
      /https?:\/\/[^"'\s<>]*alicdn\.com[^"'\s<>]*/gi,
    );
    urls.push(...matches.map((match) => match[0]));
  }

  return urls;
}

const PAGE_SELECTORS: Record<Platform, string[]> = {
  shopify: [
    ".product__description img",
    ".product-description img",
    ".rte img",
    '[class*="product-single"] [class*="description"] img',
    '[class*="product-content"] img',
  ],
  alibaba: [
    '[class*="description"] img',
    '[class*="detail-desc"] img',
    '[class*="detail-description"] img',
    '[class*="product-desc"] img',
    '[class*="specification"] img',
    '[class*="detail-content"] img',
    '[id*="description"] img',
  ],
  generic: [
    '[class*="description"] img',
    '[class*="product-desc"] img',
    '[class*="detail"] img',
    '[class*="specification"] img',
    ".rte img",
    "article img",
    '[itemtype*="Product"] [class*="description"] img',
  ],
};

function isExcludedElement($: cheerio.CheerioAPI, el: unknown): boolean {
  const node = $(el as never);
  if (node.closest("header, footer, nav").length > 0) return true;

  const cls = (node.attr("class") ?? "").toLowerCase();
  const id = (node.attr("id") ?? "").toLowerCase();
  const combined = `${cls} ${id}`;

  return /(?:icon|logo|payment|badge|avatar|social|banner|promo|newsletter|cart|checkout|review|rating|star|widget|gallery|main-image|slider|thumb)/.test(
    combined,
  );
}

function isPageImageUrl(url: string, platform: Platform): boolean {
  if (isSegmentNoiseUrl(url)) return false;
  if (url.startsWith("data:")) return false;

  if (platform === "alibaba") {
    if (!/alicdn\.com/i.test(url)) return false;
    if (/\.(js|css|json|woff2?|ttf|svg)(?:\?|$)/i.test(url)) return false;
  }

  return /\.(jpe?g|png|webp|avif)(?:\?|$)/i.test(url) || /\/(?:kf|imgextra|ibank|cdn)\//i.test(url);
}

export function extractPageImagesFromHtml(
  html: string,
  pageUrl: URL,
  platform: Platform,
): ExtractedImage[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const selectors = PAGE_SELECTORS[platform];

  if (platform === "alibaba") {
    urls.push(...extractAlibabaDescriptionUrls(html));
  }

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      if (isExcludedElement($, el)) return;

      const node = $(el);
      const src =
        node.attr("src") ??
        node.attr("data-src") ??
        node.attr("data-original") ??
        node.attr("data-lazy-src");

      if (!src || src.startsWith("data:")) return;
      if (!isPageImageUrl(src, platform)) return;

      urls.push(src);
    });
  }

  return uniqueImageUrls(urls.map((url) => resolveUrl(url, pageUrl))).map(
    (url, index) => {
      let filename: string;
      try {
        filename = filenameFromUrl(new URL(url));
      } catch {
        filename = `page-image-${index + 1}.jpg`;
      }

      return {
        id: `page-${index}`,
        url,
        filename,
        source: "html" as const,
        sortIndex: index,
      };
    },
  );
}
