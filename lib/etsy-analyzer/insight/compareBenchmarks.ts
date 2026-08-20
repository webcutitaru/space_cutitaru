import type { ListingReport } from '../types/listing'
import { scoreListing } from './scoreListing'
import { buildTagFrequency } from './tagFrequency'
import type { BenchmarkInsight, BenchmarkRange } from './types'

function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]
}

function rangeOf(
  values: number[],
  label: string,
  unit: string | undefined,
  noteBuilder: (min: number, max: number, med: number) => string,
): BenchmarkRange | null {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const med = median(values)!
  return { label, min, max, median: med, unit, note: noteBuilder(min, max, med) }
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function buildBenchmarkInsight(reports: ListingReport[]): BenchmarkInsight {
  const scores = reports.map(scoreListing)
  const tagResult = buildTagFrequency(reports)
  const phrases = tagResult.tagFrequency
    .filter((t) => t.count >= Math.min(2, reports.length))
    .slice(0, 12)
    .map((t) => t.phrase)

  const prices = reports.map((r) => r.price.current).filter((n): n is number => n != null)
  const favs = reports.map((r) => r.knownSignals.favorites).filter((n): n is number => n != null)
  const carts = reports.map((r) => r.knownSignals.inCart).filter((n): n is number => n != null)
  const reviews = reports.map((r) => r.knownSignals.reviewCount).filter((n): n is number => n != null)

  const ranges: BenchmarkRange[] = []
  const priceR = rangeOf(prices, 'Preț', reports[0]?.price.currency, (min, max, med) => {
    if (min === max) return `Preț tipic în set: ${fmtNum(min)}.`
    return `Prețurile din set stau între ${fmtNum(min)} și ${fmtNum(max)} (mediană ~${fmtNum(med)}). Folosește zona mediană ca ancoră.`
  })
  if (priceR) ranges.push(priceR)

  const favR = rangeOf(favs, 'Favorite', undefined, (min, max, med) => {
    if (max < 20) return 'Favorite puține pe tot setul — semnal încă slab pentru „produs dovedit”.'
    return `Favorite între ${fmtNum(min)} și ${fmtNum(max)} (mediană ~${fmtNum(med)}). Țintește cel puțin zona mediană pe termen mediu.`
  })
  if (favR) ranges.push(favR)

  const cartR = rangeOf(carts, 'În coș acum', undefined, (min, max) => {
    if (max === 0) return 'Niciun listing nu arată coșuri active acum.'
    return `Coșuri active: ${fmtNum(min)}–${fmtNum(max)}. Dacă un produs are câteva coșuri, nișa are cumpărători „în decizie”.`
  })
  if (cartR) ranges.push(cartR)

  const revR = rangeOf(reviews, 'Review-uri listing', undefined, (min, max, med) => {
    return `Review-uri pe listing: ${fmtNum(min)}–${fmtNum(max)} (mediană ~${fmtNum(med)}).`
  })
  if (revR) ranges.push(revR)

  const bestCount = scores.filter((s) => s.strength === 'referinta' || s.strength === 'puternic').length
  const usableAsReference = bestCount >= 1 && (reports.length === 1 ? scores[0]!.score >= 45 : bestCount >= 1)

  const top = [...scores].sort((a, b) => b.score - a.score)[0]!
  const weak = scores.filter((s) => s.strength === 'slab')

  const headline =
    reports.length === 1
      ? usableAsReference
        ? `Acest listing arată ${top.strength === 'referinta' ? 'ca o referință solidă' : 'destul de bine'} pentru nișa lui.`
        : 'Datele sunt subțiri — nu-l trata încă drept „cum arată un winner”.'
      : usableAsReference
        ? `Din ${reports.length} listing-uri, ai ${bestCount} cu semnale clare — poți folosi setul ca punct de referință.`
        : `Ai ${reports.length} listing-uri, dar semnalele de cerere sunt mixte / slabe — referința e fragilă.`

  const plainBullets: string[] = []

  plainBullets.push(
    `Cel mai bun din set: „${truncate(top.title, 72)}” (scor ${top.score}/100 — ${labelStrength(top.strength)}).`,
  )

  if (top.highlights.inCart != null && top.highlights.inCart > 0) {
    plainBullets.push(
      `Acum oamenii pun produsul în coș (${top.highlights.inCart} pe lider) — semnal de interes real, nu doar vizite.`,
    )
  } else if (top.highlights.favorites != null && top.highlights.favorites >= 50) {
    plainBullets.push(
      `Favoritele pe lider (${top.highlights.favorites}) arată că produsul a fost salvat des — merită copiat stilul de ofertă, nu neapărat textul 1:1.`,
    )
  }

  if (phrases.length > 0) {
    plainBullets.push(
      reports.length === 1
        ? `Tag-uri SEO extrase: ${phrases.slice(0, 5).join(', ')}.`
        : `Tag-uri care se repetă la mai multe listing-uri: ${phrases.slice(0, 5).join(', ')}. Alege manual după relevanța produsului tău.`,
    )
  } else if (tagResult.listingsWithoutTags > 0) {
    plainBullets.push(
      `${tagResult.listingsWithoutTags} listing(uri) fără tag-uri SEO în HTML — View Source pe pagina de produs, nu pe search.`,
    )
  }

  if (priceR && priceR.min != null && priceR.max != null) {
    plainBullets.push(
      priceR.min === priceR.max
        ? `Preț de referință din set: ~${fmtNum(priceR.min)}${priceR.unit ? ` ${priceR.unit}` : ''}.`
        : `Zona de preț din set: ${fmtNum(priceR.min)}–${fmtNum(priceR.max)}${priceR.unit ? ` ${priceR.unit}` : ''}.`,
    )
  }

  if (weak.length > 0 && reports.length > 1) {
    plainBullets.push(
      `${weak.length} listing(uri) arată slab — folosește-le ca contrast (ce să eviți), nu ca model.`,
    )
  }

  if (plainBullets.length < 3) {
    plainBullets.push(
      'Verifică badges (Bestseller), coșuri, favorite și review-uri — astea spun dacă merită ca referință.',
    )
  }

  const referenceNote = usableAsReference
    ? 'Poți lua acest set ca ghid: ce badge-uri apar, ce prețuri țin, ce tag-uri se repetă. Alege expresiile relevante pentru produsul tău — nu copia tot 1:1.'
    : 'Adaugă încă 1–2 listing-uri cu Bestseller / multe favorite ca să ai o referință mai sigură.'

  return {
    reports,
    scores,
    headline,
    plainBullets: plainBullets.slice(0, 5),
    sharedPhrases: phrases,
    tagFrequency: tagResult.tagFrequency,
    frequencyGroups: tagResult.frequencyGroups,
    suggestions: tagResult.suggestions,
    listingsWithoutTags: tagResult.listingsWithoutTags,
    ranges,
    usableAsReference,
    referenceNote,
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}

function labelStrength(s: BenchmarkInsight['scores'][0]['strength']): string {
  if (s === 'referinta') return 'referință bună'
  if (s === 'puternic') return 'puternic'
  if (s === 'ok') return 'acceptabil'
  return 'slab'
}
