import { detectProviders, primaryProvider } from "./detect-provider";
import { extractHtmlFallbackReviews, extractWithProviders } from "./extractors";
import { fetchProducts } from "./fetch-products";
import {
  getShopDomain,
  parseStoreInput,
  prioritizeProducts,
  resolveMyshopifyDomain,
} from "./http";
import type { ExtractResult, Review } from "./types";
import { MAX_PRODUCTS } from "./types";

export async function extractStoreReviews(storeInput: string): Promise<ExtractResult> {
  const startedAt = Date.now();
  const { storeUrl, origin, productHandle } = parseStoreInput(storeInput);
  const shopDomain =
    (await resolveMyshopifyDomain(storeUrl)) ?? getShopDomain(storeUrl);

  const [{ products: rawProducts, truncated }, providerConfig] = await Promise.all([
    fetchProducts(origin, MAX_PRODUCTS),
    detectProviders(
      origin,
      shopDomain.includes("myshopify.com") ? shopDomain : null,
    ),
  ]);

  if (rawProducts.length === 0) {
    throw new Error(
      "No products found. The store may block public product listings.",
    );
  }

  const products = prioritizeProducts(rawProducts, productHandle);
  const targetProduct = products[0];

  let reviews: Review[] = await extractWithProviders(
    products,
    origin,
    providerConfig,
    targetProduct?.externalId && productHandle
      ? { productId: targetProduct.externalId }
      : undefined,
  );

  const mainProvider = primaryProvider(providerConfig.providers);

  if (reviews.length === 0) {
    reviews = await extractHtmlFallbackReviews(products, mainProvider);
  }

  return {
    storeUrl: origin,
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
