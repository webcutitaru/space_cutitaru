import type { CheerioAPI } from 'cheerio'
import type { DomExtract } from '../types/listing'

function textOf($: CheerioAPI, selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const t = $(sel).first().text().replace(/\s+/g, ' ').trim()
    if (t) return t
  }
  return undefined
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const cleaned = v.replace(/\s+/g, ' ').trim()
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue
    seen.add(cleaned.toLowerCase())
    out.push(cleaned)
  }
  return out
}

export function extractDom($: CheerioAPI): DomExtract {
  const listingId =
    $('[data-listing-id]').first().attr('data-listing-id') ||
    $('link[rel="canonical"]').attr('href')?.match(/\/listing\/(\d+)/)?.[1] ||
    undefined

  const title = textOf($, [
    'h1[data-buy-box-listing-title]',
    'h1[data-testid="listing-page-title"]',
    'h1.listing-page-title',
    'h1',
  ])

  const description = textOf($, [
    '[data-product-details-description-text-content]',
    '[data-id="description-text"]',
    '#description-text',
    '.wt-content-toggle__body',
  ])

  const priceText = textOf($, [
    '[data-buy-box-region] [data-buy-box-price]',
    '[data-testid="listing-page-price"]',
    '.currency-value',
    '[data-buy-box] p.wt-text-title-larger',
  ])

  const shopName = textOf($, [
    '[data-shop-name]',
    'a[href*="/shop/"] span',
    '.shop-name',
  ])

  const shopHref = $('a[href*="/shop/"]').first().attr('href')
  const shopUrl = shopHref
    ? shopHref.startsWith('http')
      ? shopHref
      : `https://www.etsy.com${shopHref}`
    : undefined

  const images: { src: string; alt?: string }[] = []
  $('img[src*="etsystatic"], img[data-src*="etsystatic"], img[srcset*="etsystatic"]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src')
    if (!src || src.includes('sprite') || src.includes('icon')) return
    const alt = $(el).attr('alt') || undefined
    if (!images.some((i) => i.src === src)) images.push({ src, alt })
  })

  const tags: string[] = []
  $('a[href*="/market/"], a[href*="/search?q="], [data-clg-id="wt-tag"] a').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t && t.length <= 40) tags.push(t)
  })

  const materials: string[] = []
  $('[data-product-details] li, .wt-product-details li, [data-appears-component-name="product_details"] li').each(
    (_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      if (/material/i.test(t)) {
        const m = t.split(/material[s]?:/i)[1]?.trim()
        if (m) materials.push(...m.split(/,\s*/))
      }
    },
  )

  const attributes: Record<string, string> = {}
  $('th, dt').each((_, el) => {
    const key = $(el).text().replace(/\s+/g, ' ').trim()
    if (!key) return
    const val = $(el).next('td, dd').text().replace(/\s+/g, ' ').trim()
    if (val) attributes[key] = val
  })

  const categoryPath: string[] = []
  $('nav[aria-label*="breadcrumb" i] a, [data-clg-id="wt-breadcrumb"] a, .wt-breadcrumb a').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t && !/^etsy$/i.test(t)) categoryPath.push(t)
  })

  let favoritesText = textOf($, ['[data-favorers-count]'])
  let reviewsText: string | undefined
  $('span, p, button, a').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (!favoritesText && /\d[\d,]*.*favorit/i.test(t) && t.length < 80) {
      favoritesText = t
    }
    if (!reviewsText && /\d[\d,]*.*review/i.test(t) && t.length < 80) {
      reviewsText = t
    }
  })

  const badges: string[] = []
  const badgePatterns = [
    /bestseller/i,
    /star seller/i,
    /etsy'?s? pick/i,
    /rising/i,
    /top rated/i,
    /free shipping/i,
    /made to order/i,
    /digital download/i,
    /personaliz/i,
  ]
  $('span, div, p, a, li').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (!t || t.length > 60) return
    for (const re of badgePatterns) {
      if (re.test(t) && !badges.some((b) => b.toLowerCase() === t.toLowerCase())) {
        badges.push(t)
        break
      }
    }
  })

  return {
    listingId,
    title,
    description,
    priceText,
    shopName,
    shopUrl,
    images: images.slice(0, 20),
    tags: uniqueStrings(tags).slice(0, 30),
    materials: uniqueStrings(materials),
    attributes,
    categoryPath: uniqueStrings(categoryPath),
    favoritesText,
    reviewsText,
    badges: uniqueStrings(badges).slice(0, 20),
  }
}
