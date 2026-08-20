import type { ListingReport } from '../types/listing'

export type StrengthLabel = 'slab' | 'ok' | 'puternic' | 'referinta'

export interface ListingScore {
  listingId?: string
  title: string
  score: number
  strength: StrengthLabel
  reasons: string[]
  highlights: {
    price?: string
    favorites?: number
    inCart?: number
    rating?: number
    reviewCount?: number
    shopSales?: number
    badges: string[]
  }
}

export interface BenchmarkRange {
  label: string
  min?: number
  max?: number
  median?: number
  unit?: string
  note: string
}

export interface BenchmarkInsight {
  reports: ListingReport[]
  scores: ListingScore[]
  /** One plain-language headline for the whole set */
  headline: string
  /** Short bullets a non-expert can act on */
  plainBullets: string[]
  /** Shared SEO phrases worth copying as reference */
  sharedPhrases: string[]
  /** Numeric ranges that look coherent across listings */
  ranges: BenchmarkRange[]
  /** Whether the set looks like a usable niche reference */
  usableAsReference: boolean
  referenceNote: string
}
