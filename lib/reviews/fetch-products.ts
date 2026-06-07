import { XMLParser } from "fast-xml-parser";
import { fetchHtml, fetchJson } from "./http";
import type { ProductInfo } from "./types";
import { MAX_PRODUCTS } from "./types";

interface ProductsJsonResponse {
  products: Array<{
    id: number;
    title: string;
    handle: string;
  }>;
}

function uniqueProducts(products: ProductInfo[]): ProductInfo[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.handle)) return false;
    seen.add(product.handle);
    return true;
  });
}

async function fetchFromProductsJson(
  origin: string,
): Promise<ProductInfo[] | null> {
  try {
    const data = await fetchJson<ProductsJsonResponse>(
      `${origin}/products.json?limit=250`,
    );

    return data.products.map((product) => ({
      handle: product.handle,
      title: product.title,
      url: `${origin}/products/${product.handle}`,
      externalId: String(product.id),
    }));
  } catch {
    return null;
  }
}

async function fetchFromSitemap(origin: string): Promise<ProductInfo[]> {
  const sitemapCandidates = [
    `${origin}/sitemap_products_1.xml`,
    `${origin}/sitemap.xml`,
  ];

  const parser = new XMLParser({ ignoreAttributes: false });
  const products: ProductInfo[] = [];

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const xml = await fetchHtml(sitemapUrl);
      const parsed = parser.parse(xml) as {
        urlset?: { url?: Array<{ loc?: string }> | { loc?: string } };
        sitemapindex?: {
          sitemap?: Array<{ loc?: string }> | { loc?: string };
        };
      };

      const urls: string[] = [];

      const urlset = parsed.urlset?.url;
      if (Array.isArray(urlset)) {
        for (const entry of urlset) {
          if (entry.loc) urls.push(entry.loc);
        }
      } else if (urlset?.loc) {
        urls.push(urlset.loc);
      }

      const nested = parsed.sitemapindex?.sitemap;
      if (Array.isArray(nested)) {
        for (const entry of nested) {
          if (entry.loc?.includes("products")) {
            const nestedXml = await fetchHtml(entry.loc);
            const nestedParsed = parser.parse(nestedXml) as {
              urlset?: { url?: Array<{ loc?: string }> | { loc?: string } };
            };
            const nestedUrls = nestedParsed.urlset?.url;
            if (Array.isArray(nestedUrls)) {
              for (const item of nestedUrls) {
                if (item.loc) urls.push(item.loc);
              }
            }
          }
        }
      }

      for (const loc of urls) {
        const match = loc.match(/\/products\/([^/?#]+)/i);
        if (!match) continue;
        const handle = decodeURIComponent(match[1]);
        products.push({
          handle,
          title: handle.replace(/-/g, " "),
          url: loc.startsWith("http") ? loc : `${origin}/products/${handle}`,
        });
      }

      if (products.length > 0) break;
    } catch {
      continue;
    }
  }

  return uniqueProducts(products);
}

export async function fetchProducts(
  storeOrigin: string,
  limit = MAX_PRODUCTS,
): Promise<{ products: ProductInfo[]; truncated: boolean }> {
  const fromJson = await fetchFromProductsJson(storeOrigin);
  const products = uniqueProducts(fromJson ?? (await fetchFromSitemap(storeOrigin)));

  return {
    products: products.slice(0, limit),
    truncated: products.length > limit,
  };
}
