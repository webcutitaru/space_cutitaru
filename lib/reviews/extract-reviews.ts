import { detectProviders, primaryProvider } from "./detect-provider";
import { extractHtmlFallbackReviews, extractJudgeMeReviews } from "./extractors";
import { fetchProducts } from "./fetch-products";
import {
  getShopDomain,
  normalizeStoreUrl,
  resolveMyshopifyDomain,
} from "./http";
import type { ExtractResult, Review } from "./types";
import { MAX_PRODUCTS } from "./types";

export async function extractStoreReviews(storeInput: string): Promise<ExtractResult> {
  const startedAt = Date.now();
  const storeUrl = normalizeStoreUrl(storeInput);
  const shopDomain =
    (await resolveMyshopifyDomain(storeUrl)) ?? getShopDomain(storeUrl);

  const [{ products, truncated }, providerConfig] = await Promise.all([
    fetchProducts(storeUrl.origin, MAX_PRODUCTS),
    detectProviders(storeUrl.origin, shopDomain.includes("myshopify.com") ? shopDomain : null),
  ]);

  if (products.length === 0) {
    throw new Error(
      "No products found. The store may block public product listings.",
    );
  }

  let reviews: Review[] = [];

  if (providerConfig.judgeMe?.apiToken && providerConfig.judgeMe.shopDomain) {
    reviews = await extractJudgeMeReviews(
      products,
      providerConfig.judgeMe.shopDomain,
      providerConfig.judgeMe.apiToken,
    );
  }

  const mainProvider = primaryProvider(providerConfig.providers);

  if (reviews.length === 0) {
    reviews = await extractHtmlFallbackReviews(products, mainProvider);
  }

  return {
    storeUrl: storeUrl.origin,
    shopDomain,
    provider: mainProvider,
    providers: providerConfig.providers,
    reviews,
    productCount: products.length,
    meta: {
      truncated,
      maxProducts: MAX_PRODUCTS,
      durationMs: Date.now() - startedAt,
    },
  };
}
