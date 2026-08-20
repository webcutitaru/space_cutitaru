import type { ListingReport } from '../types/listing'

export interface TagFrequencyItem {
  /** Original phrase (most common casing/spacing seen) — never rewritten */
  phrase: string
  /** How many listings contain this tag */
  count: number
  /** Total listings in the benchmark set */
  total: number
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
  frequencyGroups: FrequencyGroup[]
  suggestions: TagSuggestions
  /** Listings that had zero extractable SEO tags */
  listingsWithoutTags: number
}

function normKey(p: string): string {
  return p.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Aggregate SEO tags across listings by how many listings contain each phrase.
 * Phrases are never truncated or rewritten — only counted.
 */
export function buildTagFrequency(reports: ListingReport[]): TagFrequencyResult {
  const total = reports.length
  const listingsWithoutTags = reports.filter((r) => r.seo.tags.length === 0).length

  // key → { display variants with votes, listing count }
  const map = new Map<
    string,
    { count: number; variants: Map<string, number> }
  >()

  for (const report of reports) {
    const seen = new Set<string>()
    for (const raw of report.seo.tags) {
      const key = normKey(raw)
      if (!key || seen.has(key)) continue
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

  const tagFrequency: TagFrequencyItem[] = [...map.entries()]
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
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))

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

  return { tagFrequency, frequencyGroups, suggestions, listingsWithoutTags }
}
