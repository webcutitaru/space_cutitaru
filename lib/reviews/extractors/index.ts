import * as cheerio from "cheerio";
import { fetchHtml } from "../http";
import type { ProductInfo, Review, ReviewProvider } from "../types";

function parseRating(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeReview(
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

export async function extractJudgeMeReviews(
  products: ProductInfo[],
  shopDomain: string,
  apiToken: string,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (const product of products) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 5) {
      const params = new URLSearchParams({
        shop_domain: shopDomain,
        api_token: apiToken,
        per_page: "100",
        page: String(page),
      });

      if (product.externalId) {
        params.set("external_id", product.externalId);
      } else {
        params.set("handle", product.handle);
      }

      try {
        const response = await fetch(
          `https://judge.me/api/v1/reviews?${params.toString()}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "SPACE-ReviewsExtractor/1.0",
            },
          },
        );

        if (!response.ok) break;

        const data = (await response.json()) as {
          reviews?: Array<{
            id: number;
            rating: number;
            title?: string;
            body?: string;
            reviewer?: { name?: string };
            created_at?: string;
            verified?: string;
          }>;
          total_pages?: number;
        };

        totalPages = data.total_pages ?? 1;

        for (const review of data.reviews ?? []) {
          reviews.push(
            normalizeReview(
              {
                id: String(review.id),
                productTitle: product.title,
                productHandle: product.handle,
                productUrl: product.url,
                rating: review.rating ?? 0,
                title: review.title ?? "",
                body: review.body ?? "",
                author: review.reviewer?.name ?? "Anonymous",
                date: review.created_at ?? "",
                verified: review.verified === "verified-purchase",
              },
              "judge.me",
            ),
          );
        }
      } catch {
        break;
      }

      page += 1;
    }
  }

  return reviews;
}

export async function extractHtmlFallbackReviews(
  products: ProductInfo[],
  provider: ReviewProvider,
): Promise<Review[]> {
  const reviews: Review[] = [];
  const selectors: Record<string, string> = {
    "judge.me": ".jdgm-rev",
    loox: ".loox-review, [data-loox-review]",
    yotpo: ".yotpo-review, .yotpo-main",
    "shopify-native": ".spr-review",
    unknown: ".review, [itemprop='review']",
  };

  const selector = selectors[provider] ?? selectors.unknown;

  for (const product of products.slice(0, 20)) {
    try {
      const html = await fetchHtml(product.url);
      const $ = cheerio.load(html);
      const nodes = $(selector).slice(0, 50);

      nodes.each((index, element) => {
        const node = $(element);
        const rating =
          parseRating(node.find("[data-score]").attr("data-score")) ||
          parseRating(node.find(".jdgm-rev__rating").attr("data-score")) ||
          node.find("[aria-label*='star']").length ||
          0;

        reviews.push(
          normalizeReview(
            {
              id: `${product.handle}-${index}`,
              productTitle: product.title,
              productHandle: product.handle,
              productUrl: product.url,
              rating,
              title: node.find(".jdgm-rev__title, .review-title, h3").first().text().trim(),
              body: node
                .find(".jdgm-rev__body, .review-body, .yotpo-review-content")
                .first()
                .text()
                .trim(),
              author: node
                .find(".jdgm-rev__author, .review-author, .yotpo-user-name")
                .first()
                .text()
                .trim(),
              date: node.find("time").attr("datetime") ?? node.find("time").text().trim(),
            },
            provider,
          ),
        );
      });
    } catch {
      continue;
    }
  }

  return reviews.filter((review) => review.body || review.title);
}
