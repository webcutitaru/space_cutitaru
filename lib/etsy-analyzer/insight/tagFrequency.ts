import type { ListingReport } from '../types/listing'

export interface TagFrequencyItem {
  /** Original phrase (most common casing/spacing seen) — never rewritten */
  phrase: string
  /** How many listings contain this tag */
  count: number
  /** Total listings in the benchmark set */
  total: number
}

export interface TagPresenceItem extends TagFrequencyItem {
  /** Listing IDs (or synthetic index keys) that contain this phrase */
  listingIds: string[]
  /** 0-based report indices that contain this phrase */
  listingIndexes: number[]
}

export interface FrequencyGroup {
  /** Listings that share these tags (e.g. 9 of 10) */
  count: number
  total: number
  phrases: string[]
}

export interface TagSuggestions {
  /** Same phrases, ordered by frequency — for Etsy Tags field (unmodified) */
  forTags: TagFrequencyItem[]
  /** Same phrases, ordered by frequency — candidates for Title (unmodified) */
  forTitle: TagFrequencyItem[]
}

export interface TagFrequencyResult {
  tagFrequency: TagFrequencyItem[]
  tagPresence: TagPresenceItem[]
  frequencyGroups: FrequencyGroup[]
  suggestions: TagSuggestions
  /** Listings that had zero extractable SEO tags */
  listingsWithoutTags: number
  /** Indexes of reports with zero SEO tags */
  listingsWithoutTagsIndexes: number[]
}

function normKey(p: string): string {
  return p.trim().toLowerCase().replace(/\s+/g, ' ')
}

function reportKey(report: ListingReport, index: number): string {
  return report.identity.listingId || `idx:${index}`
}

/**
 * Aggregate SEO tags across listings by how many listings contain each phrase.
 * Phrases are never truncated or rewritten — only counted.
 */
export function buildTagFrequency(reports: ListingReport[]): TagFrequencyResult {
  const total = reports.length
  const listingsWithoutTagsIndexes = reports
    .map((r, i) => (r.seo.tags.length === 0 ? i : -1))
    .filter((i) => i >= 0)
  const listingsWithoutTags = listingsWithoutTagsIndexes.length

  // key → { display variants with votes, listing ids/indexes }
  const map = new Map<
    string,
    {
      count: number
      variants: Map<string, number>
      listingIds: string[]
      listingIndexes: number[]
    }
  >()

  reports.forEach((report, index) => {
    const seen = new Set<string>()
    const id = reportKey(report, index)
    for (const raw of report.seo.tags) {
      const key = normKey(raw)
      if (!key || seen.has(key)) continue
      seen.add(key)

      const display = raw.trim().replace(/\s+/g, ' ')
      let entry = map.get(key)
      if (!entry) {
        entry = {
          count: 0,
          variants: new Map(),
          listingIds: [],
          listingIndexes: [],
        }
        map.set(key, entry)
      }
      entry.count += 1
      entry.variants.set(display, (entry.variants.get(display) ?? 0) + 1)
      entry.listingIds.push(id)
      entry.listingIndexes.push(index)
    }
  })

  const tagPresence: TagPresenceItem[] = [...map.entries()]
    .map(([, entry]) => {
      let bestPhrase = ''
      let bestVotes = -1
      for (const [phrase, votes] of entry.variants) {
        if (votes > bestVotes || (votes === bestVotes && phrase.localeCompare(bestPhrase) < 0)) {
          bestPhrase = phrase
          bestVotes = votes
        }
      }
      return {
        phrase: bestPhrase,
        count: entry.count,
        total,
        listingIds: entry.listingIds,
        listingIndexes: entry.listingIndexes,
      }
    })
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))

  const tagFrequency: TagFrequencyItem[] = tagPresence.map(
    ({ phrase, count, total: t }) => ({ phrase, count, total: t }),
  )

  // Group by count descending (10/10, 9/10, …)
  const byCount = new Map<number, string[]>()
  for (const item of tagFrequency) {
    const list = byCount.get(item.count) ?? []
    list.push(item.phrase)
    byCount.set(item.count, list)
  }

  const frequencyGroups: FrequencyGroup[] = [...byCount.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([count, phrases]) => ({ count, total, phrases }))

  // Suggestions: same unmodified phrases, separate lists for Tags vs Title UX
  const suggestions: TagSuggestions = {
    forTags: tagFrequency,
    forTitle: tagFrequency,
  }

  return {
    tagFrequency,
    tagPresence,
    frequencyGroups,
    suggestions,
    listingsWithoutTags,
    listingsWithoutTagsIndexes,
  }
}

/**
 * Cross-listing frequency of title n-grams (1–3) across the set.
 */
export function buildTitleKeywordFrequency(
  reports: ListingReport[],
): TagFrequencyItem[] {
  const total = reports.length
  const map = new Map<
    string,
    { count: number; variants: Map<string, number> }
  >()

  for (const report of reports) {
    const seen = new Set<string>()
    const titlePhrases = report.keywords
      .filter((k) => k.n >= 1 && k.n <= 3)
      .slice(0, 40)
      .map((k) => k.phrase)

    // Prefer title tokens: re-extract simple tokens from title if present
    const fromTitle = (report.identity.title || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)

    const bigrams: string[] = []
    for (let i = 0; i < fromTitle.length - 1; i++) {
      bigrams.push(`${fromTitle[i]} ${fromTitle[i + 1]}`)
    }

    const phrases = [...new Set([...bigrams, ...fromTitle, ...titlePhrases])]

    for (const raw of phrases) {
      const key = normKey(raw)
      if (!key || key.length < 3 || seen.has(key)) continue
      // Skip ultra-common single stop-ish tokens already filtered loosely
      if (key.split(/\s+/).length === 1 && key.length < 4) continue
      seen.add(key)

      const display = raw.trim().replace(/\s+/g, ' ')
      let entry = map.get(key)
      if (!entry) {
        entry = { count: 0, variants: new Map() }
        map.set(key, entry)
      }
      entry.count += 1
      entry.variants.set(display, (entry.variants.get(display) ?? 0) + 1)
    }
  }

  return [...map.entries()]
    .map(([, entry]) => {
      let bestPhrase = ''
      let bestVotes = -1
      for (const [phrase, votes] of entry.variants) {
        if (votes > bestVotes || (votes === bestVotes && phrase.localeCompare(bestPhrase) < 0)) {
          bestPhrase = phrase
          bestVotes = votes
        }
      }
      return { phrase: bestPhrase, count: entry.count, total }
    })
    .filter((t) => t.count >= Math.min(2, total) || total === 1)
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, 24)
}
