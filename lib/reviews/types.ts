export type ReviewProvider =
  | "judge.me"
  | "loox"
  | "trustoo"
  | "air-reviews"
  | "yotpo"
  | "stamped"
  | "okendo"
  | "shopify-native"
  | "unknown";

export interface Review {
  id: string;
  productTitle: string;
  productHandle: string;
  productUrl: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  date: string;
  provider: ReviewProvider;
  verified?: boolean;
  imageUrls?: string[];
}

export interface ExtractResult {
  storeUrl: string;
  shopDomain: string;
  provider: ReviewProvider;
  providers: ReviewProvider[];
  reviews: Review[];
  productCount: number;
  meta: {
    truncated: boolean;
    maxProducts: number;
    durationMs: number;
  };
}

export interface ProductInfo {
  handle: string;
  title: string;
  url: string;
  externalId?: string;
}

export interface ProviderConfig {
  providers: ReviewProvider[];
  shopId?: string;
  judgeMe?: {
    shopDomain: string;
    apiToken: string;
  };
  loox?: {
    publicStoreId: string;
  };
  trustoo?: {
    shopId: string;
  };
  airReviews?: {
    shopId?: string;
  };
  yotpo?: {
    appKey: string;
  };
  stamped?: {
    apiKey: string;
    storeUrl: string;
  };
  okendo?: {
    userId: string;
  };
}

export const MAX_PRODUCTS = 50;
export const MAX_REVIEW_PAGES = 10;
export const REVIEWS_PER_PAGE = 100;
export const REQUEST_TIMEOUT_MS = 15000;
