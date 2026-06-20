import { detectPlatform } from "./detect-platform";
import { enrichImageMetadata } from "./enrich-metadata";
import { extractAlibabaImages } from "./extractors/alibaba";
import { extractGenericImages } from "./extractors/generic";
import { extractShopifyImages } from "./extractors/shopify";
import {
  filterPageImages,
  filterProductImages,
  imageDedupeKey,
} from "./filter-product-images";
import { fetchHtml, parsePageUrl } from "./http";
import { extractPageImagesFromHtml } from "./extract-page-images";
import type { ExtractResult, ExtractedImage, ExtractorOutput } from "./types";
import { MAX_IMAGES, MAX_PAGE_IMAGES } from "./types";

function assignIds(images: ExtractedImage[], prefix: string): ExtractedImage[] {
  return images.map((img, index) => ({
    ...img,
    id: `${prefix}-${index}`,
    sortIndex: index,
  }));
}

async function enrichGroup(images: ExtractedImage[]): Promise<ExtractedImage[]> {
  if (images.length === 0) return [];
  return enrichImageMetadata(images);
}

export async function extractPageImages(input: string): Promise<ExtractResult> {
  const started = Date.now();
  const pageUrl = parsePageUrl(input);

  let html: string | undefined;
  try {
    html = await fetchHtml(pageUrl.href);
  } catch {
    /* platform detection may still work from URL alone */
  }

  const platform = detectPlatform(pageUrl, html);
  const warnings: string[] = [];

  let extractorResult: ExtractorOutput;

  switch (platform) {
    case "shopify": {
      extractorResult = await extractShopifyImages(pageUrl);
      break;
    }
    case "alibaba": {
      extractorResult = await extractAlibabaImages(pageUrl);
      break;
    }
    default: {
      extractorResult = await extractGenericImages(pageUrl, html);
      break;
    }
  }

  const { title, images: rawImages, html: extractorHtml, warnings: extractorWarnings } =
    extractorResult;
  warnings.push(...extractorWarnings);

  const pageHtml = extractorHtml ?? html;
  const rawCount = rawImages.length;
  const { images: filteredProduct, removedCount } = filterProductImages(
    rawImages,
    platform,
  );

  if (filteredProduct.length === 0) {
    throw new Error(
      "No product images found. This link may be protected or unsupported.",
    );
  }

  if (removedCount > 0) {
    warnings.push(
      `${filteredProduct.length} product image${filteredProduct.length === 1 ? "" : "s"} found (${removedCount} icon/UI asset${removedCount === 1 ? "" : "s"} removed from ${rawCount}).`,
    );
  }

  let productImages = filteredProduct;
  const productTruncated = productImages.length > MAX_IMAGES;
  if (productTruncated) {
    warnings.push(`Showing first ${MAX_IMAGES} product images.`);
    productImages = productImages.slice(0, MAX_IMAGES);
  }

  const productKeys = new Set(
    productImages.map((img) => imageDedupeKey(img.url, platform)),
  );

  let pageImages: ExtractedImage[] = [];
  if (pageHtml) {
    const rawPageImages = extractPageImagesFromHtml(pageHtml, pageUrl, platform);
    const { images: filteredPage, removedCount: pageRemoved } = filterPageImages(
      rawPageImages,
      platform,
      productKeys,
    );

    if (filteredPage.length > 0) {
      pageImages = filteredPage;
      if (pageRemoved > 0) {
        warnings.push(
          `${filteredPage.length} additional page image${filteredPage.length === 1 ? "" : "s"} found (${pageRemoved} duplicate or low-quality asset${pageRemoved === 1 ? "" : "s"} skipped).`,
        );
      }
    }
  }

  const pageTruncated = pageImages.length > MAX_PAGE_IMAGES;
  if (pageTruncated) {
    warnings.push(`Showing first ${MAX_PAGE_IMAGES} additional page images.`);
    pageImages = pageImages.slice(0, MAX_PAGE_IMAGES);
  }

  productImages = assignIds(await enrichGroup(productImages), "product");
  pageImages = assignIds(await enrichGroup(pageImages), "page");

  return {
    pageUrl: pageUrl.href,
    platform,
    title,
    productImages,
    pageImages,
    warnings: warnings.length > 0 ? warnings : undefined,
    meta: { durationMs: Date.now() - started },
  };
}
