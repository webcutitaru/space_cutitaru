import type {
  AppStateExtract,
  DomExtract,
  JsonLdExtract,
  JsonValue,
  KnownSignals,
  ListingReport,
  MetaExtract,
  PriceInfo,
} from '../types/listing'
import { discoverSignals } from './discoverSignals'
import { extractKeywords } from './keywords'

function asRecord(value: JsonValue | undefined): Record<string, JsonValue> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, JsonValue>
  return null
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return undefined
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^\d.-]/g, ''))
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function pickBool(...values: unknown[]): boolean | undefined {
  for (const v of values) {
    if (typeof v === 'boolean') return v
    if (v === 1 || v === '1' || v === 'true') return true
    if (v === 0 || v === '0' || v === 'false') return false
  }
  return undefined
}

function getCI(obj: Record<string, JsonValue>, ...keys: string[]): JsonValue | undefined {
  const lower = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]))
  for (const key of keys) {
    const real = lower.get(key.toLowerCase())
    if (real != null) return obj[real]
  }
  return undefined
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'string') return v.trim()
        const rec = asRecord(v)
        return pickString(rec?.name, rec?.value, rec?.title, rec?.tag) || ''
      })
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,|]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

function parsePriceFromText(text?: string): PriceInfo {
  if (!text) return {}
  const currencyMatch = text.match(/([€$£]|USD|EUR|GBP|RON)/i)
  const nums = [...text.matchAll(/(\d+[.,]\d+|\d+)/g)].map((m) => Number(m[1].replace(',', '.')))
  return {
    display: text,
    current: nums[0],
    original: nums[1],
    currency: currencyMatch?.[1]?.toUpperCase(),
  }
}

function priceFromListing(listing: Record<string, JsonValue> | null, meta: MetaExtract, dom: DomExtract): PriceInfo {
  const fromText = parsePriceFromText(dom.priceText)
  if (!listing) {
    return {
      ...fromText,
      current: pickNumber(meta.ogPriceAmount, fromText.current),
      currency: pickString(meta.ogPriceCurrency, fromText.currency),
    }
  }

  const priceObj = asRecord(getCI(listing, 'price', 'price_info', 'bid_price') as JsonValue)
  const amount =
    pickNumber(
      getCI(listing, 'price_value', 'priceValue', 'amount'),
      priceObj && getCI(priceObj, 'amount', 'value', 'low', 'high'),
      meta.ogPriceAmount,
      fromText.current,
    ) ?? undefined

  const currency = pickString(
    getCI(listing, 'currency_code', 'currencyCode', 'currency'),
    priceObj && getCI(priceObj, 'currency_code', 'currencyCode', 'currency'),
    meta.ogPriceCurrency,
    fromText.currency,
  )

  const original = pickNumber(
    getCI(listing, 'original_price', 'originalPrice', 'was_price'),
    priceObj && getCI(priceObj, 'original_price', 'originalPrice'),
    fromText.original,
  )

  let discountPercent = pickNumber(getCI(listing, 'discount_pct', 'discountPercent', 'percent_off'))
  if (discountPercent == null && amount != null && original != null && original > amount) {
    discountPercent = Math.round(((original - amount) / original) * 100)
  }

  return {
    current: amount,
    original,
    currency,
    discountPercent,
    display: fromText.display,
  }
}

function categoryFromListing(listing: Record<string, JsonValue> | null, dom: DomExtract): string[] {
  if (dom.categoryPath.length) return dom.categoryPath
  if (!listing) return []
  const path = getCI(listing, 'taxonomy_path', 'taxonomyPath', 'category_path', 'categoryPath')
  if (Array.isArray(path)) {
    return path
      .map((p) => {
        if (typeof p === 'string') return p
        const rec = asRecord(p)
        return pickString(rec?.name, rec?.title, rec?.path) || ''
      })
      .filter(Boolean)
  }
  const tax = asRecord(getCI(listing, 'taxonomy', 'category'))
  const name = pickString(tax?.name, tax?.path, tax?.title)
  return name ? [name] : []
}

function attributesFromListing(listing: Record<string, JsonValue> | null, dom: DomExtract): Record<string, string> {
  const out = { ...dom.attributes }
  if (!listing) return out

  const attrs = getCI(listing, 'attributes', 'attribute_map', 'property_values', 'properties')
  if (Array.isArray(attrs)) {
    for (const item of attrs) {
      const rec = asRecord(item)
      if (!rec) continue
      const key = pickString(rec.name, rec.property_name, rec.key)
      const val = pickString(rec.value, rec.values, Array.isArray(rec.values) ? rec.values.join(', ') : undefined)
      if (key && val) out[key] = val
    }
  } else {
    const rec = asRecord(attrs)
    if (rec) {
      for (const [k, v] of Object.entries(rec)) {
        const val = typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(', ') : pickString(v)
        if (val) out[k] = val
      }
    }
  }
  return out
}

function variantsFromListing(listing: Record<string, JsonValue> | null): { name: string; options: string[] }[] {
  if (!listing) return []
  const variations = getCI(listing, 'variations', 'inventory', 'listing_variations', 'options')
  const out: { name: string; options: string[] }[] = []

  const pushVar = (name: string, options: string[]) => {
    if (name && options.length) out.push({ name, options })
  }

  if (Array.isArray(variations)) {
    for (const v of variations) {
      const rec = asRecord(v)
      if (!rec) continue
      const name = pickString(rec.property_name, rec.name, rec.formatted_name) || 'Option'
      const options = asStringArray(getCI(rec, 'values', 'options', 'value'))
      pushVar(name, options)
    }
  }

  const inv = asRecord(getCI(listing, 'inventory'))
  const products = inv && getCI(inv, 'products')
  // skip deep product SKU expansion for v1
  void products

  return out
}

function imagesFromSources(
  listing: Record<string, JsonValue> | null,
  jsonLd: JsonLdExtract,
  meta: MetaExtract,
  dom: DomExtract,
): { src: string; alt?: string }[] {
  const images: { src: string; alt?: string }[] = [...dom.images]
  if (meta.ogImage && !images.some((i) => i.src === meta.ogImage)) {
    images.push({ src: meta.ogImage })
  }

  for (const product of jsonLd.products) {
    const img = product.image
    if (typeof img === 'string') images.push({ src: img })
    else if (Array.isArray(img)) {
      for (const i of img) {
        if (typeof i === 'string') images.push({ src: i })
        else {
          const rec = asRecord(i)
          const url = pickString(rec?.url, rec?.contentUrl)
          if (url) images.push({ src: url })
        }
      }
    }
  }

  if (listing) {
    const imgs = getCI(listing, 'images', 'image_urls', 'imageUrls', 'photos')
    if (Array.isArray(imgs)) {
      for (const i of imgs) {
        if (typeof i === 'string') images.push({ src: i })
        else {
          const rec = asRecord(i)
          const url = pickString(rec?.url_fullxfull, rec?.url, rec?.src, rec?.contentUrl)
          if (url) images.push({ src: url, alt: pickString(rec?.alt_text, rec?.alt) })
        }
      }
    }
  }

  const seen = new Set<string>()
  return images.filter((i) => {
    if (!i.src || seen.has(i.src)) return false
    seen.add(i.src)
    return true
  }).slice(0, 30)
}

function buildKnownSignals(
  listing: Record<string, JsonValue> | null,
  dom: DomExtract,
  shop: ListingReport['shop'],
): KnownSignals {
  const badges = [...dom.badges]
  const addBadge = (label: string, on?: boolean) => {
    if (on && !badges.some((b) => b.toLowerCase() === label.toLowerCase())) badges.push(label)
  }

  const isBestseller = pickBool(listing && getCI(listing, 'is_bestseller', 'isBestseller', 'bestseller'))
  const isStarSeller = pickBool(
    listing && getCI(listing, 'is_star_seller', 'isStarSeller', 'star_seller'),
    shop.name ? undefined : undefined,
  )
  const isRising = pickBool(listing && getCI(listing, 'is_rising', 'isRising', 'rising', 'raised', 'is_raised'))
  const isTopRated = pickBool(listing && getCI(listing, 'is_top_rated', 'isTopRated', 'top_rated'))
  const isFreeShipping = pickBool(
    listing && getCI(listing, 'is_free_shipping', 'isFreeShipping', 'free_shipping'),
  )
  const isMadeToOrder = pickBool(listing && getCI(listing, 'is_made_to_order', 'isMadeToOrder', 'made_to_order'))
  const isDigital = pickBool(listing && getCI(listing, 'is_digital', 'isDigital', 'digital'))
  const isPersonalizable = pickBool(
    listing && getCI(listing, 'is_personalizable', 'isPersonalizable', 'personalizable'),
  )
  const isHandmade = pickBool(listing && getCI(listing, 'is_handmade', 'isHandmade', 'handmade'))
  const isScarce = pickBool(listing && getCI(listing, 'is_scarce', 'isScarce', 'scarce', 'low_stock'))

  addBadge('Bestseller', isBestseller)
  addBadge('Star Seller', isStarSeller)
  addBadge('Rising', isRising)
  addBadge('Top Rated', isTopRated)
  addBadge('Free shipping', isFreeShipping)
  addBadge('Made to order', isMadeToOrder)
  addBadge('Digital', isDigital)
  addBadge('Personalizable', isPersonalizable)

  // Infer badges from DOM text
  for (const b of dom.badges) {
    if (/bestseller/i.test(b)) addBadge('Bestseller', true)
    if (/star seller/i.test(b)) addBadge('Star Seller', true)
    if (/rising|raised/i.test(b)) addBadge('Rising', true)
    if (/top rated/i.test(b)) addBadge('Top Rated', true)
    if (/free shipping/i.test(b)) addBadge('Free shipping', true)
  }

  const favorites =
    pickNumber(
      listing && getCI(listing, 'num_favorers', 'numFavorers', 'favorites', 'favorite_count', 'favorers'),
    ) ??
    pickNumber(dom.favoritesText?.match(/([\d,]+)/)?.[1]?.replace(/,/g, ''))

  const inCart = pickNumber(
    listing && getCI(listing, 'in_cart_count', 'inCartCount', 'carts', 'in_carts', 'num_carts'),
  )
  const boughtIn24h = pickNumber(
    listing && getCI(listing, 'bought_in_24h', 'boughtIn24h', 'purchases_last_day', 'recent_sales'),
  )
  const views = pickNumber(listing && getCI(listing, 'views', 'view_count', 'num_views', 'views_last_24h'))
  const quantity = pickNumber(listing && getCI(listing, 'quantity', 'qty', 'stock'))
  const rating = pickNumber(
    listing && getCI(listing, 'rating', 'average_rating', 'avg_rating'),
    shop.rating,
  )
  const reviewCount = pickNumber(
    listing && getCI(listing, 'review_count', 'reviewCount', 'num_reviews', 'listing_reviews'),
    shop.reviewCount,
    pickNumber(dom.reviewsText?.match(/([\d,]+)/)?.[1]?.replace(/,/g, '')),
  )

  return {
    badges,
    isBestseller: isBestseller ?? (/bestseller/i.test(badges.join(' ')) || undefined),
    isStarSeller: isStarSeller ?? (/star seller/i.test(badges.join(' ')) || undefined),
    isRising: isRising ?? (/rising|raised/i.test(badges.join(' ')) || undefined),
    isTopRated,
    isFreeShipping: isFreeShipping ?? (/free shipping/i.test(badges.join(' ')) || undefined),
    isMadeToOrder,
    isDigital,
    isPersonalizable,
    isHandmade,
    isScarce,
    favorites,
    inCart,
    boughtIn24h,
    views,
    quantity,
    rating,
    reviewCount,
    shopSales: shop.sales,
    shopName: shop.name,
    shopLocation: shop.location,
  }
}

function shopFromSources(
  listing: Record<string, JsonValue> | null,
  jsonLd: JsonLdExtract,
  dom: DomExtract,
  appState: AppStateExtract,
): ListingReport['shop'] {
  const shopRec = asRecord(listing && getCI(listing, 'shop', 'Shop', 'seller'))
  let name = pickString(shopRec && getCI(shopRec, 'shop_name', 'shopName', 'name'), dom.shopName)
  let url = pickString(shopRec && getCI(shopRec, 'url', 'shop_url'), dom.shopUrl)
  let location = pickString(shopRec && getCI(shopRec, 'location', 'shop_location', 'city'))
  let sales = pickNumber(shopRec && getCI(shopRec, 'transaction_sold_count', 'total_sales', 'sales_count', 'sales'))
  let rating = pickNumber(shopRec && getCI(shopRec, 'rating', 'average_rating'))
  let reviewCount = pickNumber(shopRec && getCI(shopRec, 'review_count', 'num_reviews', 'reviewCount'))

  for (const product of jsonLd.products) {
    const brand = asRecord(product.brand) || asRecord(product.seller)
    name = name || pickString(brand?.name)
    const agg = asRecord(product.aggregateRating)
    rating = rating ?? pickNumber(agg?.ratingValue)
    reviewCount = reviewCount ?? pickNumber(agg?.reviewCount, agg?.ratingCount)
  }

  // Fallback: scan blobs for shop-like objects
  if (!name || sales == null) {
    for (const blob of appState.blobs) {
      const walk = (v: JsonValue, d = 0) => {
        if (!v || typeof v !== 'object' || d > 8) return
        if (Array.isArray(v)) {
          v.forEach((i) => walk(i, d + 1))
          return
        }
        const o = v as Record<string, JsonValue>
        if (getCI(o, 'shop_name', 'shopName') && getCI(o, 'transaction_sold_count', 'total_sales', 'sales')) {
          name = name || pickString(getCI(o, 'shop_name', 'shopName', 'name'))
          sales = sales ?? pickNumber(getCI(o, 'transaction_sold_count', 'total_sales', 'sales'))
          location = location || pickString(getCI(o, 'location', 'shop_location'))
        }
        Object.values(o).forEach((c) => walk(c, d + 1))
      }
      walk(blob)
    }
  }

  return { name, url, location, sales, rating, reviewCount }
}

function descriptionFromJsonLd(jsonLd: JsonLdExtract): string | undefined {
  for (const p of jsonLd.products) {
    const d = pickString(p.description)
    if (d) return d
  }
  return undefined
}

function titleFromJsonLd(jsonLd: JsonLdExtract): string | undefined {
  for (const p of jsonLd.products) {
    const t = pickString(p.name)
    if (t) return t
  }
  return undefined
}

function bestListing(appState: AppStateExtract): Record<string, JsonValue> | null {
  if (!appState.listingCandidates.length) return null
  return [...appState.listingCandidates].sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0]
}

export function normalizeReport(input: {
  meta: MetaExtract
  jsonLd: JsonLdExtract
  appState: AppStateExtract
  dom: DomExtract
}): ListingReport {
  const { meta, jsonLd, appState, dom } = input
  const listing = bestListing(appState)

  const title =
    pickString(
      listing && getCI(listing, 'title', 'listing_title', 'name'),
      titleFromJsonLd(jsonLd),
      dom.title,
      meta.ogTitle,
      meta.title,
    ) || undefined

  const description =
    pickString(
      listing && getCI(listing, 'description', 'listing_description'),
      descriptionFromJsonLd(jsonLd),
      dom.description,
      meta.ogDescription,
      meta.description,
    ) || undefined

  const listingId = pickString(
    listing && getCI(listing, 'listing_id', 'listingId', 'id'),
    dom.listingId,
    meta.canonicalUrl?.match(/\/listing\/(\d+)/)?.[1],
    meta.ogUrl?.match(/\/listing\/(\d+)/)?.[1],
  )

  const url = pickString(meta.canonicalUrl, meta.ogUrl, listing && getCI(listing, 'url', 'listing_url'))
  const slug = url?.match(/\/listing\/\d+\/([^/?#]+)/)?.[1]

  const tags = (() => {
    const fromListing = listing ? asStringArray(getCI(listing, 'tags', 'tag_list', 'keywords')) : []
    return [...new Set([...fromListing, ...dom.tags])].slice(0, 30)
  })()

  const materials = (() => {
    const fromListing = listing ? asStringArray(getCI(listing, 'materials', 'material')) : []
    return [...new Set([...fromListing, ...dom.materials])]
  })()

  const shop = shopFromSources(listing, jsonLd, dom, appState)
  const knownSignals = buildKnownSignals(listing, dom, shop)
  const discoveredSignals = discoverSignals(appState.blobs.length ? appState.blobs : jsonLd.products)

  const shipping: ListingReport['shipping'] = {
    freeShipping: knownSignals.isFreeShipping,
    processingMinDays: pickNumber(listing && getCI(listing, 'min_processing_days', 'processing_min')),
    processingMaxDays: pickNumber(listing && getCI(listing, 'max_processing_days', 'processing_max')),
    shipsFrom: pickString(listing && getCI(listing, 'ships_from', 'origin_country_name', 'shop_location'), shop.location),
  }

  const keywords = extractKeywords({
    title,
    tags,
    materials,
    attributes: attributesFromListing(listing, dom),
    description,
  })

  return {
    identity: { listingId, url, slug, title, description },
    seo: {
      tags,
      materials,
      attributes: attributesFromListing(listing, dom),
      categoryPath: categoryFromListing(listing, dom),
    },
    price: priceFromListing(listing, meta, dom),
    media: imagesFromSources(listing, jsonLd, meta, dom),
    variants: variantsFromListing(listing),
    shipping,
    shop,
    knownSignals,
    discoveredSignals,
    keywords,
    sources: { meta, jsonLd, appState, dom },
    analyzedAt: new Date().toISOString(),
  }
}
