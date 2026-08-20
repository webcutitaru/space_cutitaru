import type { CheerioAPI } from 'cheerio'
import type { AppStateExtract, JsonValue } from '../types/listing'

const ASSIGNMENT_PATTERNS = [
  /window\.__INITIAL_STATE__\s*=\s*/,
  /window\.__PRELOADED_STATE__\s*=\s*/,
  /window\.__NEXT_DATA__\s*=\s*/,
  /__INITIAL_STATE__\s*=\s*/,
  /__PRELOADED_STATE__\s*=\s*/,
]

function tryParseJson(text: string): JsonValue | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as JsonValue
  } catch {
    return null
  }
}

/** Extract a JSON value starting at `start` (first `{` or `[`). */
function extractJsonSlice(source: string, start: number): string | null {
  const open = source[start]
  if (open !== '{' && open !== '[') return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < source.length; i++) {
    const ch = source[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return null
}

function parseAssignedJson(scriptText: string): JsonValue[] {
  const found: JsonValue[] = []
  for (const pattern of ASSIGNMENT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null
    while ((match = re.exec(scriptText)) !== null) {
      const idx = match.index + match[0].length
      const slice = extractJsonSlice(scriptText, idx)
      if (!slice) break
      const parsed = tryParseJson(slice)
      if (parsed != null) found.push(parsed)
      break
    }
  }
  return found
}

function looksLikeListing(obj: Record<string, JsonValue>): boolean {
  const keys = new Set(Object.keys(obj).map((k) => k.toLowerCase()))
  const markers = [
    'listing_id',
    'listingid',
    'listing_title',
    'title',
    'tags',
    'materials',
    'taxonomy_path',
    'taxonomypath',
    'price',
    'description',
    'num_favorers',
    'numfavorers',
    'is_bestseller',
    'isbestseller',
  ]
  return markers.filter((k) => keys.has(k)).length >= 2
}

function walkForListings(value: JsonValue, out: Record<string, JsonValue>[], depth = 0): void {
  if (depth > 12 || value == null) return
  if (Array.isArray(value)) {
    for (const item of value) walkForListings(item, out, depth + 1)
    return
  }
  if (typeof value !== 'object') return
  const obj = value as Record<string, JsonValue>
  if (looksLikeListing(obj)) out.push(obj)
  for (const child of Object.values(obj)) walkForListings(child, out, depth + 1)
}

export function extractAppState($: CheerioAPI): AppStateExtract {
  const blobs: JsonValue[] = []

  $('script').each((_, el) => {
    const type = ($(el).attr('type') || '').toLowerCase()
    const text = $(el).html() || ''
    if (!text.trim()) return

    if (type.includes('json') && !type.includes('ld+json')) {
      const parsed = tryParseJson(text)
      if (parsed != null) blobs.push(parsed)
    }

    for (const blob of parseAssignedJson(text)) {
      blobs.push(blob)
    }
  })

  $('[data-initial-state], [data-app-state], [data-gte-spec]').each((_, el) => {
    for (const name of ['data-initial-state', 'data-app-state', 'data-gte-spec']) {
      const raw = $(el).attr(name)
      if (!raw) continue
      const parsed = tryParseJson(raw)
      if (parsed != null) blobs.push(parsed)
    }
  })

  $('script:not([src])').each((_, el) => {
    const text = $(el).html() || ''
    if (text.length < 200) return
    if (!/listing|bestseller|favorer|taxonomy|tags/i.test(text)) return
    if (/^\s*[{[]/.test(text)) {
      const parsed = tryParseJson(text)
      if (parsed != null) blobs.push(parsed)
    }
  })

  const blobSeen = new Set<string>()
  const uniqueBlobs = blobs.filter((b) => {
    let key: string
    try {
      key = JSON.stringify(b)
    } catch {
      return true
    }
    if (key.length > 200_000) key = key.slice(0, 200_000)
    if (blobSeen.has(key)) return false
    blobSeen.add(key)
    return true
  })

  const listingCandidates: Record<string, JsonValue>[] = []
  for (const blob of uniqueBlobs) {
    walkForListings(blob, listingCandidates)
  }

  const seen = new Set<string>()
  const unique = listingCandidates.filter((c) => {
    const id = String(c.listing_id ?? c.listingId ?? c.title ?? '')
    const key = id + '|' + Object.keys(c).sort().join(',')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { blobs: uniqueBlobs, listingCandidates: unique }
}
