export type ReviewProvider =
  | "judge.me"
  | "loox"
  | "yotpo"
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

export const MAX_PRODUCTS = 50;
export const REQUEST_TIMEOUT_MS = 15000;
