import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REVIEWS_PER_PAGE } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

interface StampedReview {
  id?: number;
  rating?: number;
  title?: string;
  body?: string;
  author?: string;
  dateCreated?: string;
  verified?: boolean;
  reviewPhotos?: Array<{ photo?: string; image?: string; thumbnail?: string }>;
  images?: string[];
}

interface StampedResponse {
  data?: StampedReview[];
  page?: number;
  total?: number;
}

export async function extractStampedReviews(
  products: ProductInfo[],
  apiKey: string,
  storeUrl: string,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (const product of products) {
    if (!product.externalId) continue;

    let page = 1;

    while (page <= MAX_REVIEW_PAGES) {
      const params = new URLSearchParams({
        apiKey,
        storeUrl,
        productId: product.externalId,
        page: String(page),
        take: String(REVIEWS_PER_PAGE),
      });

      try {
        const response = await fetch(
          `https://stamped.io/api/widget/reviews?${params.toString()}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "SPACE-ReviewsExtractor/1.0",
            },
          },
        );

        if (!response.ok) break;

        const data = (await response.json()) as StampedResponse;
        const list = data.data ?? [];
        if (!list.length) break;

        for (const item of list) {
          const imageUrls = uniqueImageUrls([
            ...(item.images ?? []),
            ...(item.reviewPhotos ?? []).flatMap((photo) => [
              photo.photo,
              photo.image,
              photo.thumbnail,
            ]),
          ]);

          reviews.push(
            normalizeReview(
              {
                id: String(item.id ?? `${product.handle}-stamped-${reviews.length}`),
                productTitle: product.title,
                productHandle: product.handle,
                productUrl: product.url,
                rating: item.rating ?? 0,
                title: item.title ?? "",
                body: item.body ?? "",
                author: item.author ?? "Anonymous",
                date: item.dateCreated ?? "",
                verified: item.verified,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              },
              "stamped",
            ),
          );
        }

        if (list.length < REVIEWS_PER_PAGE) break;
      } catch {
        break;
      }

      page += 1;
    }
  }

  return reviews;
}
