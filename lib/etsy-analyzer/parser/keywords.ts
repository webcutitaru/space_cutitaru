import type { KeywordCandidate } from '../types/listing'

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'by', 'from', 'at',
  'is', 'are', 'this', 'that', 'it', 'as', 'be', 'your', 'you', 'our', 'we', 'will', 'can',
  'de', 'la', 'si', 'cu', 'din', 'pentru', 'un', 'o', 'în', 'pe',
  'etsy', 'shop', 'shipping', 'free', 'handmade', 'item', 'items', 'gift',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t))
}

function addNgrams(tokens: string[], n: 1 | 2 | 3, map: Map<string, { count: number; n: 1 | 2 | 3 }>) {
  for (let i = 0; i <= tokens.length - n; i++) {
    const phrase = tokens.slice(i, i + n).join(' ')
    const prev = map.get(phrase)
    if (prev) prev.count++
    else map.set(phrase, { count: 1, n })
  }
}

export function extractKeywords(parts: {
  title?: string
  tags?: string[]
  materials?: string[]
  attributes?: Record<string, string>
  description?: string
}): KeywordCandidate[] {
  const chunks: string[] = []
  if (parts.title) chunks.push(parts.title)
  if (parts.tags?.length) chunks.push(parts.tags.join(' '))
  if (parts.materials?.length) chunks.push(parts.materials.join(' '))
  if (parts.attributes) chunks.push(Object.values(parts.attributes).join(' '))
  if (parts.description) {
    const words = parts.description.split(/\s+/).slice(0, 250).join(' ')
    chunks.push(words)
  }

  const map = new Map<string, { count: number; n: 1 | 2 | 3 }>()
  for (const chunk of chunks) {
    const tokens = tokenize(chunk)
    addNgrams(tokens, 1, map)
    addNgrams(tokens, 2, map)
    addNgrams(tokens, 3, map)
  }

  // Boost exact tags
  for (const tag of parts.tags || []) {
    const phrase = tag.toLowerCase().trim()
    if (!phrase) continue
    const prev = map.get(phrase)
    if (prev) prev.count += 3
    else {
      const n = (phrase.split(/\s+/).length as 1 | 2 | 3) || 1
      map.set(phrase, { count: 3, n: n > 3 ? 3 : n })
    }
  }

  return [...map.entries()]
    .map(([phrase, { count, n }]) => ({ phrase, count, n }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, 80)
}
