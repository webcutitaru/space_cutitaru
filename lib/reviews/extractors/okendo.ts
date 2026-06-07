import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

interface OkendoMedia {
  fullSizeUrl?: string;
  largeUrl?: string;
  thumbnailUrl?: string;
  url?: string;
}

interface OkendoReview {
  reviewId?: string;
  rating?: number;
  title?: string;
  body?: string;
  reviewer?: { displayName?: string };
  dateCreated?: string;
  isVerifiedBuyer?: boolean;
  media?: OkendoMedia[];
}

interface OkendoResponse {
  reviews?: OkendoReview[];
  nextUrl?: string | null;
}

export async function extractOkendoReviews(
  products: ProductInfo[],
  userId: string,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (const product of products) {
    if (!product.externalId) continue;

    let nextUrl: string | null =
      `https://api.okendo.io/v1/stores/${userId}/products/shopify-${product.externalId}/reviews?limit=25`;
    let pages = 0;

    while (nextUrl && pages < MAX_REVIEW_PAGES) {
      try {
        const response = await fetch(nextUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "SPACE-ReviewsExtractor/1.0",
          },
        });

        if (!response.ok) break;

        const data = (await response.json()) as OkendoResponse;
        const list = data.reviews ?? [];
        if (!list.length) break;

        for (const item of list) {
          const imageUrls = uniqueImageUrls(
            (item.media ?? []).flatMap((media) => [
              media.fullSizeUrl,
              media.largeUrl,
              media.thumbnailUrl,
              media.url,
            ]),
          );

          reviews.push(
            normalizeReview(
              {
                id: item.reviewId ?? `${product.handle}-okendo-${reviews.length}`,
                productTitle: product.title,
                productHandle: product.handle,
                productUrl: product.url,
                rating: item.rating ?? 0,
                title: item.title ?? "",
                body: item.body ?? "",
                author: item.reviewer?.displayName ?? "Anonymous",
                date: item.dateCreated ?? "",
                verified: item.isVerifiedBuyer,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              },
              "okendo",
            ),
          );
        }

        nextUrl = data.nextUrl ?? null;
        pages += 1;
      } catch {
        break;
      }
    }
  }

  return reviews;
}
