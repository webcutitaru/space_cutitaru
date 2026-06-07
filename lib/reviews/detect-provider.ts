import { fetchHtml } from "./http";
import type { ReviewProvider } from "./types";

const PROVIDER_PATTERNS: Array<{ provider: ReviewProvider; patterns: RegExp[] }> =
  [
    {
      provider: "judge.me",
      patterns: [/judge\.me/i, /jdgm-/i, /cdn\.judge\.me/i],
    },
    {
      provider: "loox",
      patterns: [/loox\.io/i, /loox-review/i],
    },
    {
      provider: "yotpo",
      patterns: [/yotpo/i, /staticw2\.yotpo\.com/i],
    },
    {
      provider: "shopify-native",
      patterns: [/shopify-product-reviews/i, /spr-container/i],
    },
  ];

export interface ProviderConfig {
  providers: ReviewProvider[];
  judgeMe?: {
    shopDomain: string;
    apiToken: string;
  };
}

export async function detectProviders(
  storeOrigin: string,
  shopDomain: string | null,
): Promise<ProviderConfig> {
  const html = await fetchHtml(storeOrigin);
  const providers = new Set<ReviewProvider>();

  for (const { provider, patterns } of PROVIDER_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(html))) {
      providers.add(provider);
    }
  }

  if (providers.size === 0) {
    providers.add("unknown");
  }

  const tokenMatch =
    html.match(/api_token['":\s]+['"]([a-zA-Z0-9_-]+)['"]/i) ??
    html.match(/jdgm\.(?:PUBLIC|SHOP)_TOKEN\s*=\s*['"]([^'"]+)['"]/i) ??
    html.match(/"public_token"\s*:\s*"([^"]+)"/i);

  const domainMatch =
    html.match(/shop_domain['":\s]+['"]([a-z0-9-]+\.myshopify\.com)['"]/i) ??
    (shopDomain ? [null, shopDomain] : null);

  const config: ProviderConfig = {
    providers: [...providers],
  };

  if (providers.has("judge.me") && tokenMatch?.[1]) {
    config.judgeMe = {
      shopDomain: domainMatch?.[1]?.toLowerCase() ?? shopDomain ?? "",
      apiToken: tokenMatch[1],
    };
  }

  return config;
}

export function primaryProvider(providers: ReviewProvider[]): ReviewProvider {
  const priority: ReviewProvider[] = [
    "judge.me",
    "loox",
    "yotpo",
    "shopify-native",
    "unknown",
  ];

  for (const provider of priority) {
    if (providers.includes(provider)) return provider;
  }

  return "unknown";
}
