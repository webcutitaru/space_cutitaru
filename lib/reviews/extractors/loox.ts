import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REVIEWS_PER_PAGE } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

interface LooxReview {
  id?: string | number;
  rating?: number;
  stars?: number;
  title?: string;
  review?: string;
  text?: string;
  name?: string;
  nickname?: string;
  created_at?: string;
  date?: string;
  verified?: boolean;
  img?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  photos?: string[];
  media?: Array<{ url?: string; src?: string }>;
}

interface LooxResponse {
  reviews?: LooxReview[];
  data?: LooxReview[];
  pagination?: { totalPages?: number; page?: number };
  totalPages?: number;
}

export async function extractLooxReviews(
  products: ProductInfo[],
  publicStoreId: string,
): Promise<Review[]> {
  const reviews: Review[] = [];
  const base = `https://storefront-api.loox.io/storefront/v1/store/${publicStoreId}/product-reviews`;

  for (const product of products) {
    if (!product.externalId) continue;

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= MAX_REVIEW_PAGES) {
      const params = new URLSearchParams({
        productId: product.externalId,
        page: String(page),
        limit: String(REVIEWS_PER_PAGE),
      });

      try {
        const response = await fetch(`${base}?${params.toString()}`, {
          headers: {
            Accept: "application/json",
            "User-Agent": "SPACE-ReviewsExtractor/1.0",
          },
        });

        if (!response.ok) break;

        const data = (await response.json()) as LooxResponse;
        const list = data.reviews ?? data.data ?? [];
        totalPages =
          data.pagination?.totalPages ?? data.totalPages ?? (list.length ? 1 : 0);

        for (const item of list) {
          const imageUrls = uniqueImageUrls([
            item.img,
            item.image,
            item.imageUrl,
            ...(item.images ?? []),
            ...(item.photos ?? []),
            ...(item.media ?? []).flatMap((media) => [media.url, media.src]),
          ]);

          reviews.push(
            normalizeReview(
              {
                id: String(item.id ?? `${product.handle}-${page}-${reviews.length}`),
                productTitle: product.title,
                productHandle: product.handle,
                productUrl: product.url,
                rating: item.rating ?? item.stars ?? 0,
                title: item.title ?? "",
                body: item.review ?? item.text ?? "",
                author: item.name ?? item.nickname ?? "Anonymous",
                date: item.created_at ?? item.date ?? "",
                verified: item.verified,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              },
              "loox",
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
