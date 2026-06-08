const SHOPIFY_DOMAIN_RE = /^[a-z0-9-]+\.myshopify\.com$/i;

export function normalizeStoreUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Store URL is required.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Invalid store URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Store URL must use http or https.");
  }

  url.hash = "";
  url.search = "";
  return new URL(url.origin);
}

export function parseStoreInput(input: string): {
  storeUrl: URL;
  origin: string;
  productHandle?: string;
} {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Invalid store URL.");
  }

  const productMatch = parsed.pathname.match(/\/products\/([^/?#]+)/i);
  const productHandle = productMatch
    ? decodeURIComponent(productMatch[1])
    : undefined;

  const storeUrl = normalizeStoreUrl(input);

  return {
    storeUrl,
    origin: storeUrl.origin,
    productHandle,
  };
}

export function getShopDomain(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "");

  if (SHOPIFY_DOMAIN_RE.test(host)) {
    return host.toLowerCase();
  }

  return host.toLowerCase();
}

export async function resolveMyshopifyDomain(
  storeUrl: URL,
): Promise<string | null> {
  const host = storeUrl.hostname.replace(/^www\./i, "");
  if (SHOPIFY_DOMAIN_RE.test(host)) {
    return host.toLowerCase();
  }

  try {
    const response = await fetch(storeUrl.origin, {
      redirect: "follow",
      headers: {
        "User-Agent": "SPACE-ReviewsExtractor/1.0",
        Accept: "text/html",
      },
    });

    const html = await response.text();
    const match =
      html.match(/["']([a-z0-9-]+\.myshopify\.com)["']/i) ??
      html.match(/Shopify\.shop\s*=\s*["']([a-z0-9-]+\.myshopify\.com)["']/i);

    return match?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SPACE-ReviewsExtractor/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(
  url: string,
  timeoutMs = 15000,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SPACE-ReviewsExtractor/1.0",
        Accept: "application/json",
        ...extraHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/** Headers that satisfy Loox Storefront API CORS checks (server-side fetch). */
export function storeOriginHeaders(storeOrigin: string): Record<string, string> {
  return {
    Origin: storeOrigin,
    Referer: `${storeOrigin}/`,
  };
}

export function prioritizeProducts<T extends { handle: string }>(
  items: T[],
  productHandle?: string,
): T[] {
  if (!productHandle) return items;

  const index = items.findIndex((item) => item.handle === productHandle);
  if (index <= 0) return items;

  const copy = [...items];
  const [target] = copy.splice(index, 1);
  copy.unshift(target);
  return copy;
}
