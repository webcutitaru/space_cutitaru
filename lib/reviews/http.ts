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
  return url;
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

export async function fetchJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SPACE-ReviewsExtractor/1.0",
        Accept: "application/json",
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
