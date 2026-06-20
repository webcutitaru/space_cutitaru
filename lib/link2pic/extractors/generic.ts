import * as cheerio from "cheerio";
import { fetchHtml } from "../http";
import { filenameFromUrl } from "../download";
import { resolveUrl, uniqueImageUrls } from "../normalize";
import type { ExtractedImage, ExtractorOutput } from "../types";

function collectProductJsonLdImages(data: unknown, urls: string[]): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    data.forEach((item) => collectProductJsonLdImages(item, urls));
    return;
  }

  const obj = data as Record<string, unknown>;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  const isProduct = types.some(
    (t) => typeof t === "string" && /product/i.test(t),
  );

  if (isProduct) {
    if (typeof obj.image === "string") {
      urls.push(obj.image);
    } else if (Array.isArray(obj.image)) {
      for (const item of obj.image) {
        if (typeof item === "string") urls.push(item);
        else if (item && typeof item === "object" && "url" in item) {
          urls.push(String((item as { url: string }).url));
        }
      }
    } else if (obj.image && typeof obj.image === "object" && "url" in obj.image) {
      urls.push(String((obj.image as { url: string }).url));
    }
  }

  if (obj["@graph"]) collectProductJsonLdImages(obj["@graph"], urls);
}

function isExcludedElement($: cheerio.CheerioAPI, el: unknown): boolean {
  const node = $(el as never);
  if (node.closest("header, footer, nav").length > 0) return true;

  const cls = (node.attr("class") ?? "").toLowerCase();
  const id = (node.attr("id") ?? "").toLowerCase();
  const combined = `${cls} ${id}`;

  return /(?:icon|logo|payment|badge|avatar|social|banner|promo|newsletter|cart|checkout|review|rating|star|widget)/.test(
    combined,
  );
}

function toImages(urls: string[], pageUrl: URL, source: ExtractedImage["source"]): ExtractedImage[] {
  return uniqueImageUrls(urls.map((u) => resolveUrl(u, pageUrl))).map((url, index) => {
    let filename: string;
    try {
      filename = filenameFromUrl(new URL(url));
    } catch {
      filename = `image-${index + 1}.jpg`;
    }

    return {
      id: `img-${index}`,
      url,
      filename,
      source,
      sortIndex: index,
    };
  });
}

export async function extractGenericImages(
  pageUrl: URL,
  preloadedHtml?: string,
): Promise<ExtractorOutput> {
  const html = preloadedHtml ?? (await fetchHtml(pageUrl.href));
  const $ = cheerio.load(html);
  const jsonLdUrls: string[] = [];
  const metaUrls: string[] = [];
  const scopedUrls: string[] = [];

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    undefined;

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) metaUrls.push(ogImage);

  $('meta[property="og:image:url"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content) metaUrls.push(content);
  });

  $('link[rel="image_src"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) metaUrls.push(href);
  });

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "");
      collectProductJsonLdImages(json, jsonLdUrls);
    } catch {
      /* ignore */
    }
  });

  const scopedSelectors = [
    '[itemtype*="Product"] img',
    '[class*="product-gallery"] img',
    '[class*="product-media"] img',
    '[class*="product-image"] img',
    '[id*="product"] img',
    "main img",
  ].join(", ");

  $(scopedSelectors).each((_, el) => {
    if (isExcludedElement($, el)) return;
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    if (src && !src.startsWith("data:")) scopedUrls.push(src);
  });

  const images: ExtractedImage[] = [
    ...toImages(jsonLdUrls, pageUrl, "json-ld"),
    ...toImages(metaUrls, pageUrl, "meta"),
    ...toImages(scopedUrls, pageUrl, "html"),
  ];

  const seen = new Set<string>();
  const deduped = images.filter((img) => {
    const key = img.url.split("?")[0] ?? img.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((img, index) => ({ ...img, id: `img-${index}`, sortIndex: index }));

  const warnings: string[] = [];
  if (deduped.length === 0) {
    warnings.push("No product images found on this page.");
  }

  return { title, images: deduped, html, warnings };
}
