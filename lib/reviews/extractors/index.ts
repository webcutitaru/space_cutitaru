import type { ProviderConfig, ProductInfo, Review } from "../types";
import { extractAirReviews } from "./air-reviews";
import { extractJudgeMeReviews } from "./judge-me";
import { extractLooxReviews } from "./loox";
import { extractOkendoReviews } from "./okendo";
import { extractStampedReviews } from "./stamped";
import { extractTrustooReviews } from "./trustoo";
import { extractYotpoReviews } from "./yotpo";

export { extractHtmlFallbackReviews } from "./html-fallback";
export { extractJudgeMeReviews } from "./judge-me";

export async function extractWithProviders(
  products: ProductInfo[],
  origin: string,
  config: ProviderConfig,
  options?: { productId?: string },
): Promise<Review[]> {
  const runners: Array<() => Promise<Review[]>> = [];

  if (config.judgeMe?.apiToken && config.judgeMe.shopDomain) {
    runners.push(() =>
      extractJudgeMeReviews(
        products,
        config.judgeMe!.shopDomain,
        config.judgeMe!.apiToken,
      ),
    );
  }

  if (config.trustoo?.shopId) {
    runners.push(() =>
      extractTrustooReviews(products, origin, config.trustoo!.shopId, {
        productId: options?.productId,
      }),
    );
  }

  if (config.loox?.publicStoreId) {
    runners.push(() => extractLooxReviews(products, config.loox!.publicStoreId));
  }

  if (config.airReviews) {
    runners.push(() =>
      extractAirReviews(products, origin, config.airReviews!.shopId),
    );
  }

  if (config.yotpo?.appKey) {
    runners.push(() => extractYotpoReviews(products, config.yotpo!.appKey));
  }

  if (config.stamped?.apiKey) {
    runners.push(() =>
      extractStampedReviews(
        products,
        config.stamped!.apiKey,
        config.stamped!.storeUrl,
      ),
    );
  }

  if (config.okendo?.userId) {
    runners.push(() => extractOkendoReviews(products, config.okendo!.userId));
  }

  for (const run of runners) {
    const reviews = await run();
    if (reviews.length > 0) return reviews;
  }

  return [];
}
