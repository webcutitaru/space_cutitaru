import type { CheerioAPI } from 'cheerio'
import type { JsonLdExtract, JsonValue } from '../types/listing'

function asRecord(value: JsonValue): Record<string, JsonValue> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, JsonValue>
  }
  return null
}

function collectNodes(value: JsonValue, out: Record<string, JsonValue>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectNodes(item, out)
    return
  }
  const obj = asRecord(value)
  if (!obj) return
  out.push(obj)
  if (obj['@graph']) collectNodes(obj['@graph'], out)
}

function isProduct(obj: Record<string, JsonValue>): boolean {
  const type = obj['@type']
  if (typeof type === 'string') return /product/i.test(type)
  if (Array.isArray(type)) return type.some((t) => typeof t === 'string' && /product/i.test(t))
  return false
}

export function extractJsonLd($: CheerioAPI): JsonLdExtract {
  const products: Record<string, JsonValue>[] = []
  const other: Record<string, JsonValue>[] = []

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).html()?.trim()
    if (!text) return
    try {
      const parsed = JSON.parse(text) as JsonValue
      const nodes: Record<string, JsonValue>[] = []
      collectNodes(parsed, nodes)
      for (const node of nodes) {
        if (isProduct(node)) products.push(node)
        else other.push(node)
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  })

  return { products, other }
}
