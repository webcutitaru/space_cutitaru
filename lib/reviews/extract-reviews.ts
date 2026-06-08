import { buildExtractionHints, detectProviders, primaryProvider } from "./detect-provider";
import { extractHtmlFallbackReviews, extractWithProviders } from "./extractors";
import { enrichProductExternalIds, fetchProducts } from "./fetch-products";
import {
  fetchHtml,
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

  const extraHtmlPages: string[] = [];
  if (productHandle) {
    try {
      extraHtmlPages.push(await fetchHtml(`${origin}/products/${productHandle}`));
    } catch {
      // Product page HTML is optional for detection.
    }
  }

  const [{ products: rawProducts, truncated }, providerConfig] = await Promise.all([
    fetchProducts(origin, MAX_PRODUCTS),
    detectProviders(
      origin,
      shopDomain.includes("myshopify.com") ? shopDomain : null,
      extraHtmlPages,
    ),
  ]);

  if (rawProducts.length === 0) {
    throw new Error(
      "No products found. The store may block public product listings.",
    );
  }

  let products = prioritizeProducts(rawProducts, productHandle);
  const needsProductIds =
    providerConfig.loox ||
    providerConfig.yotpo ||
    providerConfig.okendo ||
    Boolean(productHandle);

  if (needsProductIds) {
    products = await enrichProductExternalIds(origin, products, productHandle ? 5 : 20);
    products = prioritizeProducts(products, productHandle);
  }

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

  const hints = buildExtractionHints(providerConfig, reviews.length);

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
      hints: hints.length > 0 ? hints : undefined,
    },
  };
}
