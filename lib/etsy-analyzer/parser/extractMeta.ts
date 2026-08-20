import type { CheerioAPI } from 'cheerio'
import type { MetaExtract } from '../types/listing'

function attr($: CheerioAPI, selector: string, name = 'content'): string | undefined {
  const value = $(selector).attr(name)?.trim()
  return value || undefined
}

export function extractMeta($: CheerioAPI): MetaExtract {
  const raw: Record<string, string> = {}

  $('meta[name], meta[property]').each((_, el) => {
    const key = $(el).attr('property') || $(el).attr('name')
    const content = $(el).attr('content')
    if (key && content != null && content !== '') {
      raw[key] = content
    }
  })

  return {
    title: $('title').first().text().trim() || undefined,
    description: attr($, 'meta[name="description"]'),
    canonicalUrl: attr($, 'link[rel="canonical"]', 'href'),
    ogTitle: attr($, 'meta[property="og:title"]'),
    ogDescription: attr($, 'meta[property="og:description"]'),
    ogImage: attr($, 'meta[property="og:image"]'),
    ogUrl: attr($, 'meta[property="og:url"]'),
    ogPriceAmount: attr($, 'meta[property="product:price:amount"]') || attr($, 'meta[property="og:price:amount"]'),
    ogPriceCurrency:
      attr($, 'meta[property="product:price:currency"]') || attr($, 'meta[property="og:price:currency"]'),
    twitterTitle: attr($, 'meta[name="twitter:title"]'),
    twitterDescription: attr($, 'meta[name="twitter:description"]'),
    twitterImage: attr($, 'meta[name="twitter:image"]'),
    raw,
  }
}
