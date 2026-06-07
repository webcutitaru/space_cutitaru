import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REVIEWS_PER_PAGE } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

interface AirReview {
  id?: string | number;
  rating?: number;
  star?: number;
  title?: string;
  content?: string;
  body?: string;
  author?: string;
  customer_name?: string;
  created_at?: string;
  date?: string;
  verified?: boolean;
  images?: string[];
  photos?: string[];
  image_urls?: string[];
  media?: Array<{ url?: string; src?: string; image?: string }>;
}

interface AirReviewsResponse {
  code?: number;
  data?: {
    reviews?: AirReview[];
    list?: AirReview[];
    page?: { total_page?: number };
  };
  reviews?: AirReview[];
}

const PROXY_PATHS = [
  "/apps/air-reviews/api/reviews",
  "/apps/air-product-reviews/api/reviews",
  "/apps/air-reviews/api/v1/reviews",
];

async function fetchAirReviewsPage(
  origin: string,
  path: string,
  params: Record<string, string>,
  page: number,
): Promise<AirReview[]> {
  const search = new URLSearchParams({
    ...params,
    page: String(page),
    limit: String(REVIEWS_PER_PAGE),
  });

  try {
    const response = await fetch(`${origin}${path}?${search.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SPACE-ReviewsExtractor/1.0",
      },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as AirReviewsResponse;
    if (data.code !== undefined && data.code !== 0) return [];

    return data.data?.reviews ?? data.data?.list ?? data.reviews ?? [];
  } catch {
    return [];
  }
}

export async function extractAirReviews(
  products: ProductInfo[],
  origin: string,
  shopId?: string,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (const path of PROXY_PATHS) {
    for (const product of products) {
      if (!product.externalId) continue;

      const params: Record<string, string> = {
        product_id: product.externalId,
      };
      if (shopId) params.shop_id = shopId;

      let page = 1;

      while (page <= MAX_REVIEW_PAGES) {
        const list = await fetchAirReviewsPage(origin, path, params, page);
        if (!list.length) break;

        for (const item of list) {
          const imageUrls = uniqueImageUrls([
            ...(item.images ?? []),
            ...(item.photos ?? []),
            ...(item.image_urls ?? []),
            ...(item.media ?? []).flatMap((media) => [
              media.url,
              media.src,
              media.image,
            ]),
          ]);

          reviews.push(
            normalizeReview(
              {
                id: String(item.id ?? `${product.handle}-air-${reviews.length}`),
                productTitle: product.title,
                productHandle: product.handle,
                productUrl: product.url,
                rating: item.rating ?? item.star ?? 0,
                title: item.title ?? "",
                body: item.content ?? item.body ?? "",
                author: item.author ?? item.customer_name ?? "Anonymous",
                date: item.created_at ?? item.date ?? "",
                verified: item.verified,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              },
              "air-reviews",
            ),
          );
        }

        if (list.length < REVIEWS_PER_PAGE) break;
        page += 1;
      }
    }

    if (reviews.length > 0) break;
  }

  return reviews;
}
