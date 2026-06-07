import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REVIEWS_PER_PAGE } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

interface YotpoImage {
  original_url?: string;
  thumb_url?: string;
}

interface YotpoReview {
  id?: number;
  score?: number;
  title?: string;
  content?: string;
  created_at?: string;
  user?: { display_name?: string };
  verified_buyer?: boolean;
  images_data?: YotpoImage[];
}

interface YotpoResponse {
  response?: {
    reviews?: YotpoReview[];
    pagination?: { page?: number; per_page?: number; total?: number };
  };
}

export async function extractYotpoReviews(
  products: ProductInfo[],
  appKey: string,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (const product of products) {
    if (!product.externalId) continue;

    let page = 1;

    while (page <= MAX_REVIEW_PAGES) {
      const url = `https://api-cdn.yotpo.com/v1/widget/${appKey}/products/${product.externalId}/reviews.json?per_page=${REVIEWS_PER_PAGE}&page=${page}`;

      try {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "SPACE-ReviewsExtractor/1.0",
          },
        });

        if (!response.ok) break;

        const data = (await response.json()) as YotpoResponse;
        const list = data.response?.reviews ?? [];
        if (!list.length) break;

        for (const item of list) {
          const imageUrls = uniqueImageUrls(
            (item.images_data ?? []).flatMap((image) => [
              image.original_url,
              image.thumb_url,
            ]),
          );

          reviews.push(
            normalizeReview(
              {
                id: String(item.id ?? `${product.handle}-yotpo-${reviews.length}`),
                productTitle: product.title,
                productHandle: product.handle,
                productUrl: product.url,
                rating: item.score ?? 0,
                title: item.title ?? "",
                body: item.content ?? "",
                author: item.user?.display_name ?? "Anonymous",
                date: item.created_at ?? "",
                verified: item.verified_buyer,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              },
              "yotpo",
            ),
          );
        }

        const total = data.response?.pagination?.total ?? 0;
        const perPage = data.response?.pagination?.per_page ?? REVIEWS_PER_PAGE;
        if (page * perPage >= total) break;
      } catch {
        break;
      }

      page += 1;
    }
  }

  return reviews;
}
