import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REVIEWS_PER_PAGE } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

export async function extractJudgeMeReviews(
  products: ProductInfo[],
  shopDomain: string,
  apiToken: string,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (const product of products) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= MAX_REVIEW_PAGES) {
      const params = new URLSearchParams({
        shop_domain: shopDomain,
        api_token: apiToken,
        per_page: String(REVIEWS_PER_PAGE),
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
            picture_urls?: string[];
            pictures?: Array<{
              urls?: { original?: string; compact?: string; small?: string };
            }>;
          }>;
          total_pages?: number;
        };

        totalPages = data.total_pages ?? 1;

        for (const review of data.reviews ?? []) {
          const imageUrls = uniqueImageUrls([
            ...(review.picture_urls ?? []),
            ...(review.pictures ?? []).flatMap((picture) => [
              picture.urls?.original,
              picture.urls?.compact,
              picture.urls?.small,
            ]),
          ]);

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
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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
