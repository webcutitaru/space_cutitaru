export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface MetaExtract {
  title?: string
  description?: string
  canonicalUrl?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogUrl?: string
  ogPriceAmount?: string
  ogPriceCurrency?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  raw: Record<string, string>
}

export interface JsonLdExtract {
  products: Record<string, JsonValue>[]
  other: Record<string, JsonValue>[]
}

export interface DomExtract {
  listingId?: string
  title?: string
  description?: string
  priceText?: string
  shopName?: string
  shopUrl?: string
  images: { src: string; alt?: string }[]
  tags: string[]
  materials: string[]
  attributes: Record<string, string>
  categoryPath: string[]
  favoritesText?: string
  reviewsText?: string
  badges: string[]
}

export interface AppStateExtract {
  blobs: JsonValue[]
  listingCandidates: Record<string, JsonValue>[]
}

export interface KnownSignals {
  badges: string[]
  isBestseller?: boolean
  isStarSeller?: boolean
  isRising?: boolean
  isTopRated?: boolean
  isFreeShipping?: boolean
  isMadeToOrder?: boolean
  isDigital?: boolean
  isPersonalizable?: boolean
  isHandmade?: boolean
  isScarce?: boolean
  favorites?: number
  inCart?: number
  boughtIn24h?: number
  views?: number
  quantity?: number
  rating?: number
  reviewCount?: number
  shopSales?: number
  shopName?: string
  shopLocation?: string
  shopAgeYears?: number
}

export interface DiscoveredSignal {
  path: string
  key: string
  value: JsonValue
  reason: 'pattern' | 'interesting'
}

export interface KeywordCandidate {
  phrase: string
  count: number
  n: 1 | 2 | 3
}

export interface PriceInfo {
  current?: number
  original?: number
  currency?: string
  discountPercent?: number
  display?: string
}

export interface ListingReport {
  identity: {
    listingId?: string
    url?: string
    slug?: string
    title?: string
    description?: string
  }
  seo: {
    tags: string[]
    materials: string[]
    attributes: Record<string, string>
    categoryPath: string[]
  }
  price: PriceInfo
  media: { src: string; alt?: string }[]
  variants: { name: string; options: string[] }[]
  shipping: {
    freeShipping?: boolean
    processingMinDays?: number
    processingMaxDays?: number
    shipsFrom?: string
  }
  shop: {
    name?: string
    url?: string
    location?: string
    sales?: number
    rating?: number
    reviewCount?: number
  }
  knownSignals: KnownSignals
  discoveredSignals: DiscoveredSignal[]
  keywords: KeywordCandidate[]
  sources: {
    meta: MetaExtract
    jsonLd: JsonLdExtract
    appState: AppStateExtract
    dom: DomExtract
  }
  analyzedAt: string
}
