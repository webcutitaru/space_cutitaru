import type { DiscoveredSignal, JsonValue } from '../types/listing'

const PATTERN =
  /rais|ris|badge|best|star|cart|favor|view|sold|signal|nudge|scarce|trend|boost|\bad\b|social|velocity|demand|popular|hot|rank|quality|lqs|conversion/i

function isInterestingScalar(value: JsonValue): boolean {
  if (typeof value === 'boolean') return true
  if (typeof value === 'number' && Number.isFinite(value)) return true
  if (typeof value === 'string') {
    const t = value.trim()
    if (!t || t.length > 120) return false
    if (/^(true|false)$/i.test(t)) return true
    if (/^-?\d+(\.\d+)?$/.test(t)) return true
    if (PATTERN.test(t)) return true
  }
  return false
}

function serializeValue(value: JsonValue): JsonValue {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v == null)) {
      return value.slice(0, 30)
    }
    return `[array:${value.length}]`
  }
  return `[object:${Object.keys(value).length}]`
}

export function discoverSignals(roots: JsonValue[]): DiscoveredSignal[] {
  const out: DiscoveredSignal[] = []
  const seen = new Set<string>()

  const visit = (value: JsonValue, path: string, depth: number) => {
    if (value == null || depth > 14) return

    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`, depth + 1))
      return
    }

    if (typeof value !== 'object') return

    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key
      const patternHit = PATTERN.test(key)
      const interesting = isInterestingScalar(child)

      if (patternHit || interesting) {
        const dedupeKey = `${childPath}|${JSON.stringify(serializeValue(child))}`
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey)
          out.push({
            path: childPath,
            key,
            value: serializeValue(child),
            reason: patternHit ? 'pattern' : 'interesting',
          })
        }
      }

      if (child && typeof child === 'object') {
        visit(child, childPath, depth + 1)
      }
    }
  }

  roots.forEach((root, i) => visit(root, `blob[${i}]`, 0))

  out.sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === 'pattern' ? -1 : 1
    return a.path.localeCompare(b.path)
  })

  return out.slice(0, 500)
}
