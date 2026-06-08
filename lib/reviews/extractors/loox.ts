import { storeOriginHeaders } from "../http";
import type { ProductInfo, Review } from "../types";
import { MAX_REVIEW_PAGES, REQUEST_TIMEOUT_MS, REVIEWS_PER_PAGE } from "../types";
import { normalizeReview, uniqueImageUrls } from "./normalize";

interface LooxReviewer {
  name?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
}

interface LooxMedia {
  type?: string;
  url?: string;
  src?: string;
}

interface LooxReview {
  id?: string | number;
  rating?: number;
  stars?: number;
  title?: string;
  review?: string;
  text?: string;
  body?: string;
  name?: string;
  nickname?: string;
  reviewer?: LooxReviewer;
  created_at?: string;
  createdAt?: string;
  date?: string;
  verified?: boolean;
  img?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  photos?: string[];
  media?: LooxMedia[];
  product?: {
    id?: string | number;
    name?: string;
    url?: string;
  };
}

interface LooxPagination {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  totalPages?: number;
}

interface LooxResponse {
  reviews?: LooxReview[];
  data?: LooxReview[];
  pagination?: LooxPagination;
  totalPages?: number;
}

function resolveProduct(
  item: LooxReview,
  products: ProductInfo[],
  productById: Map<string, ProductInfo>,
): ProductInfo | null {
  const productId = item.product?.id;
  if (productId !== undefined) {
    const match = productById.get(String(productId));
    if (match) return match;
  }

  if (item.product?.name) {
    const byTitle = products.find(
      (product) =>
        product.title.toLowerCase() === item.product!.name!.toLowerCase(),
    );
    if (byTitle) return byTitle;
  }

  return products[0] ?? null;
}

function mapLooxReview(item: LooxReview, product: ProductInfo): Review {
  const imageUrls = uniqueImageUrls([
    item.img,
    item.image,
    item.imageUrl,
    ...(item.images ?? []),
    ...(item.photos ?? []),
    ...(item.media ?? []).flatMap((media) => [media.url, media.src]),
  ]);

  const reviewerName = [item.reviewer?.firstName, item.reviewer?.lastName]
    .filter(Boolean)
    .join(" ");
  const author =
    item.reviewer?.name ??
    (reviewerName || undefined) ??
    item.name ??
    item.nickname ??
    item.reviewer?.nickname ??
    "Anonymous";

  return normalizeReview(
    {
      id: String(item.id ?? `${product.handle}-loox-${author}`),
      productTitle: product.title,
      productHandle: product.handle,
      productUrl: product.url,
      rating: item.rating ?? item.stars ?? 0,
      title: item.title ?? "",
      body: item.body ?? item.review ?? item.text ?? "",
      author,
      date: item.date ?? item.created_at ?? item.createdAt ?? "",
      verified: item.verified,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    },
    "loox",
  );
}

async function fetchLooxPage(
  publicStoreId: string,
  storeOrigin: string,
  params: URLSearchParams,
): Promise<LooxResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://storefront-api.loox.io/storefront/v1/store/${publicStoreId}/product-reviews?${params.toString()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "SPACE-ReviewsExtractor/1.0",
          ...storeOriginHeaders(storeOrigin),
        },
      },
    );

    if (!response.ok) return null;
    return (await response.json()) as LooxResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractLooxReviews(
  products: ProductInfo[],
  publicStoreId: string,
  storeOrigin: string,
  preferredProductId?: string,
): Promise<Review[]> {
  if (products.length === 0) return [];

  const reviews: Review[] = [];
  const productById = new Map(
    products
      .filter((product) => product.externalId)
      .map((product) => [product.externalId!, product]),
  );

  const targets =
    preferredProductId && productById.has(preferredProductId)
      ? [productById.get(preferredProductId)!]
      : products.filter((product) => product.externalId);

  if (targets.length > 0) {
    for (const product of targets) {
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= MAX_REVIEW_PAGES) {
        const params = new URLSearchParams({
          productId: product.externalId!,
          page: String(page),
          limit: String(REVIEWS_PER_PAGE),
        });

        const data = await fetchLooxPage(publicStoreId, storeOrigin, params);
        if (!data) break;

        const list = data.reviews ?? data.data ?? [];
        for (const item of list) {
          reviews.push(mapLooxReview(item, product));
        }

        hasMore =
          data.pagination?.hasMore ??
          (data.pagination?.totalPages
            ? page < data.pagination.totalPages
            : list.length === REVIEWS_PER_PAGE);
        page += 1;
      }
    }

    if (reviews.length > 0) return reviews;
  }

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_REVIEW_PAGES) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(REVIEWS_PER_PAGE),
    });

    const data = await fetchLooxPage(publicStoreId, storeOrigin, params);
    if (!data) break;

    const list = data.reviews ?? data.data ?? [];
    for (const item of list) {
      const product = resolveProduct(item, products, productById);
      if (!product) continue;
      reviews.push(mapLooxReview(item, product));
    }

    hasMore =
      data.pagination?.hasMore ??
      (data.pagination?.totalPages
        ? page < data.pagination.totalPages
        : list.length === REVIEWS_PER_PAGE);
    page += 1;
  }

  return reviews;
}
