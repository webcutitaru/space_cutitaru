import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REVIEWS_PER_PAGE } from "../types";
import { handleFromProductUrl, normalizeReview, uniqueImageUrls } from "./normalize";

interface TrustooResource {
  src?: string;
  thumb_src?: string;
  resource_type?: number;
}

interface TrustooReview {
  id: string;
  star: number;
  author: string;
  title?: string;
  content?: string;
  commented_at?: string;
  verified_badge?: number;
  resources?: TrustooResource[];
  corresponding_product?: {
    product_id: string;
    product_name: string;
    product_url: string;
  };
}

interface TrustooResponse {
  code: number;
  data?: {
    page?: { total_page?: number };
    list?: TrustooReview[];
  };
}

async function fetchTrustooPage(
  origin: string,
  params: Record<string, string>,
  page: number,
): Promise<TrustooResponse | null> {
  const search = new URLSearchParams({
    ...params,
    limit: String(REVIEWS_PER_PAGE),
    page: String(page),
    sort_by: "1",
    scene: "3",
  });

  try {
    const response = await fetch(
      `${origin}/apps/trustoo/api/v1/reviews/get_product_reviews?${search.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "SPACE-ReviewsExtractor/1.0",
        },
      },
    );

    if (!response.ok) return null;
    return response.json() as Promise<TrustooResponse>;
  } catch {
    return null;
  }
}

function mapTrustooReview(review: TrustooReview, fallback: ProductInfo): Review {
  const productUrl = review.corresponding_product?.product_url ?? fallback.url;
  const handle = handleFromProductUrl(productUrl) || fallback.handle;
  const imageUrls = uniqueImageUrls(
    (review.resources ?? []).flatMap((resource) => [resource.src, resource.thumb_src]),
  );

  return normalizeReview(
    {
      id: review.id,
      productTitle: review.corresponding_product?.product_name ?? fallback.title,
      productHandle: handle,
      productUrl,
      rating: review.star ?? 0,
      title: review.title ?? "",
      body: review.content ?? "",
      author: review.author ?? "Anonymous",
      date: review.commented_at ?? "",
      verified: review.verified_badge === 1,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    },
    "trustoo",
  );
}

export async function extractTrustooReviews(
  products: ProductInfo[],
  origin: string,
  shopId: string,
  options?: { productId?: string },
): Promise<Review[]> {
  const reviews: Review[] = [];
  const fallback = products[0];

  const baseParams: Record<string, string> = { shop_id: shopId };
  if (options?.productId) {
    baseParams.product_id = options.productId;
  } else {
    baseParams.is_show_all = "1";
  }

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_REVIEW_PAGES) {
    const data = await fetchTrustooPage(origin, baseParams, page);
    if (!data || data.code !== 0 || !data.data?.list?.length) break;

    totalPages = data.data.page?.total_page ?? 1;

    for (const item of data.data.list) {
      reviews.push(mapTrustooReview(item, fallback));
    }

    page += 1;
  }

  return reviews;
}
