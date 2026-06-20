import * as cheerio from "cheerio";
import { fetchAlibabaPageHtml } from "../alibaba-browser";
import {
  extractBaxiaConfigImages,
  isAlibabaCaptchaPage,
} from "../alibaba-baxia";
import { extractGalleryFromHtml } from "../alibaba-detail-data";
import { alibabaUrlScore } from "../alibaba-urls";
import { filenameFromUrl } from "../download";
import { resolveUrl, uniqueImageUrls } from "../normalize";
import type { ExtractedImage, ExtractorOutput } from "../types";

const ALICDN_IMAGE_RE =
  /https?:\/\/[^"'\s]*alicdn\.com[^"'\s]*\.(?:jpe?g|png|webp|gif|avif)(?:\?[^"'\s]*)?/gi;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.alibaba.com/",
};

function isAlibabaImageCandidate(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\.(js|css|json|woff2?|ttf|svg)(?:\?|$)/i.test(lower)) return false;
  if (/\.(jpe?g|png|webp|gif|avif)(?:\?|$)/i.test(lower)) return true;
  return /\/(?:kf|imgextra|ibank)\//i.test(lower);
}

async function fetchAlibabaHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: BROWSER_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractFromScripts(html: string): string[] {
  const urls: string[] = [];
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) ?? [];

  for (const script of scripts) {
    const matches = script.match(ALICDN_IMAGE_RE) ?? [];
    urls.push(
      ...matches
        .map((url) => url.replace(/\\u002F/g, "/").replace(/\\/g, ""))
        .filter(isAlibabaImageCandidate),
    );
  }

  return urls;
}

function sortUrlsByScore(urls: string[]): string[] {
  return [...urls].sort((a, b) => alibabaUrlScore(b) - alibabaUrlScore(a));
}

function urlsFromSelector(
  $: cheerio.CheerioAPI,
  selector: string,
  pageUrl: URL,
): string[] {
  const urls: string[] = [];
  $(selector).each((_, el) => {
    const node = $(el);
    const src =
      node.attr("src") ??
      node.attr("data-src") ??
      node.attr("data-image") ??
      node.attr("data-zoom");
    if (src?.includes("alicdn")) urls.push(src);
  });
  return urls.map((url) => resolveUrl(url, pageUrl));
}

function toImages(urls: string[], sortStart: number): ExtractedImage[] {
  return uniqueImageUrls(urls).map((url, index) => {
    let filename: string;
    try {
      filename = filenameFromUrl(new URL(url));
    } catch {
      filename = `image-${sortStart + index + 1}.jpg`;
    }

    return {
      id: `img-${sortStart + index}`,
      url,
      filename,
      source: "html" as const,
      sortIndex: sortStart + index,
    };
  });
}

function shouldUseBrowser(html: string): boolean {
  if (process.env.LINK2PIC_ALIBABA_BROWSER === "0") return false;
  if (isAlibabaCaptchaPage(html)) return true;
  return extractGalleryFromHtml(html).images.length === 0;
}

async function loadAlibabaHtml(pageUrl: URL): Promise<{
  html: string;
  usedBrowser: boolean;
}> {
  let html = await fetchAlibabaHtml(pageUrl.href);

  if (!shouldUseBrowser(html)) {
    return { html, usedBrowser: false };
  }

  try {
    html = await fetchAlibabaPageHtml(pageUrl.href);
    return { html, usedBrowser: true };
  } catch {
    return { html, usedBrowser: false };
  }
}

export async function extractAlibabaImages(pageUrl: URL): Promise<ExtractorOutput> {
  const warnings: string[] = [
    "Alibaba pages may load images dynamically — results can be partial.",
  ];

  const { html, usedBrowser } = await loadAlibabaHtml(pageUrl);
  const $ = cheerio.load(html);

  const detailGallery = extractGalleryFromHtml(html);

  const title =
    detailGallery.title ||
    $("h1").first().text().trim() ||
    $('[class*="title"]').first().text().trim() ||
    $("title").text().trim() ||
    undefined;

  if (detailGallery.images.length > 0) {
    if (usedBrowser) {
      warnings.push(
        "Loaded full gallery via browser rendering (window.detailData.mediaItems).",
      );
    }

    const images = detailGallery.images.map((url, index) => {
      const resolved = resolveUrl(url, pageUrl);
      let filename: string;
      try {
        filename = filenameFromUrl(new URL(resolved));
      } catch {
        filename = `image-${index + 1}.jpg`;
      }

      return {
        id: `img-${index}`,
        url: resolved,
        filename,
        source: "html" as const,
        sortIndex: index,
      };
    });

    return { title, images, html, warnings };
  }

  const orderedGroups: string[][] = [];
  let sortOffset = 0;

  const baxia = isAlibabaCaptchaPage(html)
    ? extractBaxiaConfigImages(html)
    : null;

  if (baxia?.productImages.length) {
    orderedGroups.push(baxia.productImages.map((url) => resolveUrl(url, pageUrl)));
    warnings.push(
      "Alibaba returned a captcha page — showing the main product image from page config. Install Chrome and keep LINK2PIC_ALIBABA_BROWSER enabled for the full gallery.",
    );
  }

  orderedGroups.push(
    urlsFromSelector(
      $,
      '[class*="gallery"] img, [class*="main-image"] img, [class*="image-view"] img, [data-role="main-image"] img',
      pageUrl,
    ),
  );

  orderedGroups.push(
    urlsFromSelector(
      $,
      '[class*="slider"] img, [class*="product-image"] img',
      pageUrl,
    ),
  );

  orderedGroups.push(
    urlsFromSelector($, "img[src*='alicdn'], img[data-src*='alicdn']", pageUrl),
  );

  orderedGroups.push(
    urlsFromSelector(
      $,
      "[data-src*='alicdn'], [data-image*='alicdn'], [data-zoom*='alicdn']",
      pageUrl,
    ),
  );

  const scriptUrls = extractFromScripts(html).map((url) =>
    resolveUrl(url, pageUrl),
  );
  orderedGroups.push(sortUrlsByScore(scriptUrls));

  const seen = new Set<string>();
  const images: ExtractedImage[] = [];

  const logoUrls = new Set(
    (baxia?.logoImages ?? []).map((logo) => resolveUrl(logo, pageUrl)),
  );

  for (const group of orderedGroups) {
    for (const url of uniqueImageUrls(group)) {
      const key = url.split("?")[0] ?? url;
      if (seen.has(key)) continue;
      seen.add(key);

      if (logoUrls.has(url)) continue;

      images.push(
        ...toImages([url], sortOffset).map((img) => ({
          ...img,
          id: `img-${images.length}`,
          sortIndex: images.length,
        })),
      );
      sortOffset += 1;
    }
  }

  if (images.length === 0) {
    warnings.push(
      "No alicdn images found. The page may require JavaScript or block automated access.",
    );
  }

  return { title, images, html, warnings };
}
