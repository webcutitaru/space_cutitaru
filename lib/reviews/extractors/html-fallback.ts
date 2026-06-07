import * as cheerio from "cheerio";
import { fetchHtml } from "../http";
import type { ProductInfo, Review, ReviewProvider } from "../types";
import { MAX_PRODUCTS } from "../types";
import { normalizeReview, parseRating, uniqueImageUrls } from "./normalize";

const SELECTORS: Record<ReviewProvider, string> = {
  "judge.me": ".jdgm-rev",
  loox: ".loox-review, [data-loox-review], .loox-reviews-item",
  trustoo: ".review-item, .review-item__text",
  "air-reviews":
    ".air-review-item, [class*='air-review'], .air-reviews-item, .airReviews-item",
  yotpo: ".yotpo-review, .yotpo-main, .yotpo-review-wrapper",
  stamped: ".stamped-review, .stamped-reviews .review",
  okendo: ".okeReviews-review, .okendo-review",
  "shopify-native": ".spr-review",
  unknown:
    ".review-item, .review-item__text, .review, [itemprop='review'], [data-review-id]",
};

function extractImageUrlsFromNode(
  $: cheerio.CheerioAPI,
  node: ReturnType<ReturnType<typeof cheerio.load>>,
): string[] {
  const urls: string[] = [];

  node.find("img[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (src) urls.push(src);
  });

  node.find("[data-src], [data-image], [data-photo]").each((_, element) => {
    const el = $(element);
    const src =
      el.attr("data-src") ?? el.attr("data-image") ?? el.attr("data-photo");
    if (src) urls.push(src);
  });

  return uniqueImageUrls(urls).filter(
    (url) =>
      !url.includes("avatar") &&
      !url.includes("placeholder") &&
      !url.endsWith(".svg"),
  );
}

function extractFromNode(
  $: cheerio.CheerioAPI,
  node: ReturnType<ReturnType<typeof cheerio.load>>,
  product: ProductInfo,
  provider: ReviewProvider,
  index: number,
): Review | null {
  const body =
    node.find(".jdgm-rev__body, .review-body, .yotpo-review-content, .review-item__text").first().text().trim() ||
    (node.hasClass("review-item__text") ? node.text().trim() : "");

  const title = node
    .find(".jdgm-rev__title, .review-title, h3, .review-item__title")
    .first()
    .text()
    .trim();

  if (!body && !title) return null;

  const rating =
    parseRating(node.find("[data-score]").attr("data-score")) ||
    parseRating(node.find(".jdgm-rev__rating").attr("data-score")) ||
    parseRating(node.attr("data-rating")) ||
    node.find(".star.filled, .star-icon--full, [aria-label*='star']").length ||
    0;

  const imageUrls = extractImageUrlsFromNode($, node);

  return normalizeReview(
    {
      id: `${product.handle}-${provider}-${index}`,
      productTitle: product.title,
      productHandle: product.handle,
      productUrl: product.url,
      rating,
      title,
      body,
      author: node
        .find(".jdgm-rev__author, .review-author, .yotpo-user-name, .review-item__author")
        .first()
        .text()
        .trim() || "Anonymous",
      date:
        node.find("time").attr("datetime") ??
        node.find("time").text().trim() ??
        "",
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    },
    provider,
  );
}

export async function extractHtmlFallbackReviews(
  products: ProductInfo[],
  provider: ReviewProvider,
): Promise<Review[]> {
  const reviews: Review[] = [];
  const selector = SELECTORS[provider] ?? SELECTORS.unknown;
  const slice = products.slice(0, MAX_PRODUCTS);

  for (const product of slice) {
    try {
      const html = await fetchHtml(product.url);
      const $ = cheerio.load(html);

      if (provider === "trustoo" || provider === "unknown") {
        $(".review-item__text").each((index, element) => {
          const review = extractFromNode($, $(element), product, provider, index);
          if (review) reviews.push(review);
        });
      }

      const nodes = $(selector).slice(0, 100);
      nodes.each((index, element) => {
        const review = extractFromNode($, $(element), product, provider, index);
        if (review) reviews.push(review);
      });
    } catch {
      continue;
    }
  }

  const seen = new Set<string>();
  return reviews.filter((review) => {
    const key = `${review.productHandle}-${review.body.slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(review.body || review.title);
  });
}
