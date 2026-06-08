import { fetchHtml } from "./http";
import type { ProviderConfig, ReviewProvider } from "./types";

const PROVIDER_PATTERNS: Array<{ provider: ReviewProvider; patterns: RegExp[] }> =
  [
    {
      provider: "judge.me",
      patterns: [/judge\.me/i, /jdgm-/i, /cdn\.judge\.me/i],
    },
    {
      provider: "loox",
      patterns: [/loox\.io/i, /loox-review/i, /loox-rating/i, /data-id=.*loox/i],
    },
    {
      provider: "trustoo",
      patterns: [/trustoo\.io/i, /TrustooReviews/i, /data-app="trustoo"/i, /seal-review/i],
    },
    {
      provider: "air-reviews",
      patterns: [/air-reviews/i, /airReviews/i, /Air Reviews/i, /air_reviews/i],
    },
    {
      provider: "yotpo",
      patterns: [/yotpo/i, /staticw2\.yotpo\.com/i, /yotpoAppKey/i],
    },
    {
      provider: "stamped",
      patterns: [/stamped\.io/i, /stamped-reviews/i, /stampedApiKey/i],
    },
    {
      provider: "okendo",
      patterns: [/okendo\.io/i, /okeReviews/i, /okendoSubscriberId/i],
    },
    {
      provider: "shopify-native",
      patterns: [/shopify-product-reviews/i, /spr-container/i],
    },
  ];

function extractShopId(html: string): string | undefined {
  return (
    html.match(/shopId:\s*(\d+)/)?.[1] ??
    html.match(/"shopId"\s*:\s*"(\d+)"/)?.[1] ??
    html.match(/"shop_id"\s*:\s*"(\d+)"/)?.[1] ??
    html.match(/shop_id['":\s]+['"]?(\d+)/)?.[1]
  );
}

function extractLooxStoreId(html: string): string | undefined {
  return (
    html.match(/publicStoreId['":\s]+['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/public_store_id['":\s]+['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/looxSettings[\s\S]{0,400}?publicStoreId['":\s]+['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/storefront-api\.loox\.io[^"']*\/store\/([^/'"]+)/i)?.[1] ??
    html.match(/data-loox-store-id=['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/loox\.io\/widget\/([^/'"?]+)/i)?.[1]
  );
}

export function detectProvidersFromHtml(
  htmlPages: string[],
  shopDomain: string | null,
): ProviderConfig {
  const html = htmlPages.join("\n");
  const providers = new Set<ReviewProvider>();

  for (const { provider, patterns } of PROVIDER_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(html))) {
      providers.add(provider);
    }
  }

  if (providers.size === 0) {
    providers.add("unknown");
  }

  const shopId = extractShopId(html);

  const tokenMatch =
    html.match(/api_token['":\s]+['"]([a-zA-Z0-9_-]+)['"]/i) ??
    html.match(/jdgm\.(?:PUBLIC|SHOP)_TOKEN\s*=\s*['"]([^'"]+)['"]/i) ??
    html.match(/"public_token"\s*:\s*"([^"]+)"/i);

  const domainMatch =
    html.match(/shop_domain['":\s]+['"]([a-z0-9-]+\.myshopify\.com)['"]/i) ??
    (shopDomain ? [null, shopDomain] : null);

  const looxStoreId = extractLooxStoreId(html);

  const yotpoAppKey =
    html.match(/yotpoAppKey['":\s]+['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/staticw2\.yotpo\.com\/([^/'"]+)\//i)?.[1];

  const stampedApiKey =
    html.match(/stampedApiKey['":\s]+['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/apiKey['":\s]+['"]([a-f0-9-]{36})['"]/i)?.[1];

  const okendoUserId =
    html.match(/okendoSubscriberId['":\s]+['"]([^'"]+)['"]/i)?.[1] ??
    html.match(/api\.okendo\.io\/v1\/stores\/([^/'"]+)/i)?.[1] ??
    html.match(/"subscriberId"\s*:\s*"([^"]+)"/i)?.[1];

  const config: ProviderConfig = {
    providers: [...providers],
    shopId,
  };

  if (providers.has("judge.me") && tokenMatch?.[1]) {
    config.judgeMe = {
      shopDomain: domainMatch?.[1]?.toLowerCase() ?? shopDomain ?? "",
      apiToken: tokenMatch[1],
    };
  }

  if (providers.has("loox") && looxStoreId) {
    config.loox = { publicStoreId: looxStoreId };
  }

  if (providers.has("trustoo") && shopId) {
    config.trustoo = { shopId };
  }

  if (providers.has("air-reviews") && shopId) {
    config.airReviews = { shopId };
  }

  if (providers.has("yotpo") && yotpoAppKey) {
    config.yotpo = { appKey: yotpoAppKey };
  }

  if (providers.has("stamped") && stampedApiKey) {
    config.stamped = {
      apiKey: stampedApiKey,
      storeUrl: "",
    };
  }

  if (providers.has("okendo") && okendoUserId) {
    config.okendo = { userId: okendoUserId };
  }

  return config;
}

export async function detectProviders(
  storeOrigin: string,
  shopDomain: string | null,
  extraPages: string[] = [],
): Promise<ProviderConfig> {
  const homepageHtml = await fetchHtml(storeOrigin);
  const config = detectProvidersFromHtml([homepageHtml, ...extraPages], shopDomain);

  if (config.stamped) {
    config.stamped.storeUrl = storeOrigin;
  }

  return config;
}

export function buildExtractionHints(
  config: ProviderConfig,
  reviewCount: number,
): string[] {
  if (reviewCount > 0) return [];

  const hints: string[] = [];
  const providers = new Set(config.providers);

  if (providers.has("loox")) {
    if (!config.loox?.publicStoreId) {
      hints.push(
        "Loox detected, but publicStoreId was not found in the page HTML. Paste a direct product URL where Loox reviews are visible.",
      );
    } else {
      hints.push(
        "Loox does not need a merchant API secret for public reviews — only publicStoreId (found). If reviews are still empty, the store may load Loox only on product pages or block server access.",
      );
    }
  }

  if (providers.has("judge.me") && !config.judgeMe?.apiToken) {
    hints.push(
      "Judge.me detected, but no public API token was found in the theme. Judge.me requires api_token in the storefront HTML.",
    );
  }

  if (providers.has("trustoo") && !config.trustoo?.shopId) {
    hints.push("Trustoo detected, but shop_id was not found in the page HTML.");
  }

  if (providers.has("yotpo") && !config.yotpo?.appKey) {
    hints.push("Yotpo detected, but app key was not found in the page HTML.");
  }

  if (providers.has("stamped") && !config.stamped?.apiKey) {
    hints.push("Stamped detected, but API key was not found in the page HTML.");
  }

  if (providers.has("okendo") && !config.okendo?.userId) {
    hints.push("Okendo detected, but subscriber ID was not found in the page HTML.");
  }

  if (hints.length === 0) {
    hints.push(
      "No reviews returned from API or HTML fallback. Try a direct product URL, or the store may password-protect /products.json.",
    );
  }

  return hints;
}

export function primaryProvider(providers: ReviewProvider[]): ReviewProvider {
  const priority: ReviewProvider[] = [
    "judge.me",
    "trustoo",
    "loox",
    "air-reviews",
    "yotpo",
    "stamped",
    "okendo",
    "shopify-native",
    "unknown",
  ];

  for (const provider of priority) {
    if (providers.includes(provider)) return provider;
  }

  return "unknown";
}
