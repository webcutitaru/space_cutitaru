import type { ListingReport } from '../types/listing'
import type {
  FrequencyGroup,
  TagFrequencyItem,
  TagSuggestions,
} from './tagFrequency'

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
  /** Shared SEO tag phrases (from tag frequency, unmodified) */
  sharedPhrases: string[]
  /** Tag frequency across listings (phrase intact) */
  tagFrequency: TagFrequencyItem[]
  /** Buckets: appears in 10/10, 9/10, … */
  frequencyGroups: FrequencyGroup[]
  /** Separate suggestion lists for Tags vs Title fields — phrases unmodified */
  suggestions: TagSuggestions
  listingsWithoutTags: number
  /** Numeric ranges that look coherent across listings */
  ranges: BenchmarkRange[]
  /** Whether the set looks like a usable niche reference */
  usableAsReference: boolean
  referenceNote: string
}
