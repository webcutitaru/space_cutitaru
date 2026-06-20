import type { Platform } from "./types";

const SHOPIFY_DOMAIN_RE = /^[a-z0-9-]+\.myshopify\.com$/i;

export function detectPlatform(pageUrl: URL, html?: string): Platform {
  const host = pageUrl.hostname.replace(/^www\./i, "").toLowerCase();

  if (
    host.includes("alibaba.com") ||
    host.includes("1688.com") ||
    host.includes("aliexpress.com")
  ) {
    return "alibaba";
  }

  if (
    SHOPIFY_DOMAIN_RE.test(host) ||
    pageUrl.pathname.includes("/products/") ||
    (html &&
      (/Shopify\.shop\s*=/i.test(html) ||
        /["'][a-z0-9-]+\.myshopify\.com["']/i.test(html) ||
        /cdn\.shopify\.com/i.test(html)))
  ) {
    return "shopify";
  }

  return "generic";
}
