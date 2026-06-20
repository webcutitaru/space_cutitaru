import * as cheerio from "cheerio";
import { fetchHtml, fetchJson } from "../http";
import { filenameFromUrl } from "../download";
import { uniqueImageUrls, upgradeShopifyImageUrl } from "../normalize";
import type { ExtractedImage, ExtractorOutput } from "../types";

interface ProductJsonResponse {
  product: {
    title: string;
    images: Array<{ src: string; width?: number; height?: number }>;
  };
}

function productHandleFromUrl(pageUrl: URL): string | undefined {
  const match = pageUrl.pathname.match(/\/products\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function extractFromProductJson(data: ProductJsonResponse): {
  title?: string;
  images: ExtractedImage[];
} {
  const images: ExtractedImage[] = data.product.images.map((img, index) => {
    const url = upgradeShopifyImageUrl(img.src);
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
      width: img.width,
      height: img.height,
      source: "json" as const,
      sortIndex: index,
    };
  });

  return { title: data.product.title, images };
}

function extractFromHtml(html: string, pageUrl: URL): {
  title?: string;
  images: ExtractedImage[];
} {
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim() || $("title").text().trim() || undefined;
  const urls: string[] = [];
  let index = 0;

  $("[data-media-id] img, .product__media img, .product-gallery img, .product-media img").each(
    (_, el) => {
      const src = $(el).attr("src") ?? $(el).attr("data-src");
      if (src) urls.push(upgradeShopifyImageUrl(src));
    },
  );

  const images: ExtractedImage[] = uniqueImageUrls(urls).map((url) => {
    let filename: string;
    try {
      filename = filenameFromUrl(new URL(url));
    } catch {
      filename = `image-${index + 1}.jpg`;
    }
    const image: ExtractedImage = {
      id: `img-${index}`,
      url,
      filename,
      source: "html",
      sortIndex: index,
    };
    index += 1;
    return image;
  });

  return { title, images };
}

export async function extractShopifyImages(pageUrl: URL): Promise<ExtractorOutput> {
  const warnings: string[] = [];
  const handle = productHandleFromUrl(pageUrl);

  if (handle) {
    try {
      const data = await fetchJson<ProductJsonResponse>(
        `${pageUrl.origin}/products/${handle}.json`,
      );
      const fromJson = extractFromProductJson(data);
      if (fromJson.images.length > 0) {
        let html: string | undefined;
        try {
          html = await fetchHtml(pageUrl.href);
        } catch {
          /* page images optional */
        }
        return { ...fromJson, html, warnings };
      }
    } catch {
      warnings.push("Shopify product JSON unavailable; falling back to HTML parsing.");
    }
  }

  const html = await fetchHtml(pageUrl.href);
  const fromHtml = extractFromHtml(html, pageUrl);

  if (fromHtml.images.length === 0 && !handle) {
    warnings.push("No product handle in URL. Try a direct /products/... link for best results.");
  }

  return { ...fromHtml, html, warnings };
}
