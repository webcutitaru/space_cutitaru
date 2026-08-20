import type { ListingReport } from '../types/listing'
import type { ListingScore, StrengthLabel } from './types'

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function strengthFromScore(score: number): StrengthLabel {
  if (score >= 75) return 'referinta'
  if (score >= 55) return 'puternic'
  if (score >= 35) return 'ok'
  return 'slab'
}

function priceLabel(report: ListingReport): string | undefined {
  const { display, current, currency } = report.price
  if (display) return display
  if (current == null) return undefined
  return currency ? `${current} ${currency}` : String(current)
}

/** Local heuristic score — no LLM. Interprets demand + trust signals. */
export function scoreListing(report: ListingReport): ListingScore {
  const s = report.knownSignals
  let score = 10
  const reasons: string[] = []

  if (s.isBestseller) {
    score += 22
    reasons.push('Are badge Bestseller — Etsy confirmă cerere reală.')
  }
  if (s.isStarSeller) {
    score += 10
    reasons.push('Shop-ul e Star Seller — semnal de încredere.')
  }
  if (s.isRising) {
    score += 8
    reasons.push('Semnal Rising — momentum recent.')
  }
  if (s.isTopRated) {
    score += 6
    reasons.push('Top Rated pe listing/shop.')
  }

  const carts = s.inCart
  if (carts != null && carts > 0) {
    if (carts >= 15) {
      score += 18
      reasons.push(`${carts} coșuri acum — interes foarte activ.`)
    } else if (carts >= 5) {
      score += 12
      reasons.push(`${carts} coșuri acum — interes clar.`)
    } else {
      score += 6
      reasons.push(`${carts} coș(uri) — ceva interes, nu încă saturat.`)
    }
  }

  const fav = s.favorites
  if (fav != null && fav > 0) {
    if (fav >= 200) {
      score += 14
      reasons.push(`${fav} favorite — produs validat în timp.`)
    } else if (fav >= 50) {
      score += 9
      reasons.push(`${fav} favorite — interes acumulat.`)
    } else if (fav >= 10) {
      score += 4
      reasons.push(`${fav} favorite — început de tracțiune.`)
    }
  }

  const rating = s.rating
  const reviews = s.reviewCount
  if (rating != null && reviews != null && reviews > 0) {
    if (rating >= 4.8 && reviews >= 20) {
      score += 12
      reasons.push(`Rating ${rating} din ${reviews} review-uri — dovadă socială solidă.`)
    } else if (rating >= 4.5 && reviews >= 5) {
      score += 7
      reasons.push(`Rating ${rating} (${reviews} review-uri) — ok, încă de crescut.`)
    } else if (reviews > 0) {
      score += 3
      reasons.push(`${reviews} review-uri — e ceva feedback, dar nu e încă „referință”.`)
    }
  }

  const sales = s.shopSales ?? report.shop.sales
  if (sales != null && sales > 0) {
    if (sales >= 10000) {
      score += 8
      reasons.push(`Shop cu ~${sales.toLocaleString('ro-RO')} vânzări — operațiune matură.`)
    } else if (sales >= 1000) {
      score += 5
      reasons.push(`Shop cu ~${sales.toLocaleString('ro-RO')} vânzări — experiență reală.`)
    } else if (sales >= 100) {
      score += 2
    }
  }

  if (s.isFreeShipping || report.shipping.freeShipping) {
    score += 3
    reasons.push('Free shipping — reduce fricțiunea la cumpărare.')
  }

  if (report.seo.tags.length >= 10) {
    score += 2
  }

  // Thin / missing signals
  if (!s.isBestseller && (carts == null || carts === 0) && (fav == null || fav < 10)) {
    reasons.push('Puține semnale de cerere vizibile — greu de folosit ca punct de referință singur.')
    score -= 5
  }

  score = clamp(Math.round(score), 0, 100)
  const strength = strengthFromScore(score)

  if (reasons.length === 0) {
    reasons.push('Date insuficiente pe pagină pentru un verdict clar.')
  }

  return {
    listingId: report.identity.listingId,
    title: report.identity.title || 'Fără titlu',
    score,
    strength,
    reasons: reasons.slice(0, 5),
    highlights: {
      price: priceLabel(report),
      favorites: fav,
      inCart: carts,
      rating,
      reviewCount: reviews,
      shopSales: sales,
      badges: s.badges.slice(0, 6),
    },
  }
}

export function strengthLabelRo(s: StrengthLabel): string {
  switch (s) {
    case 'referinta':
      return 'Referință bună'
    case 'puternic':
      return 'Puternic'
    case 'ok':
      return 'Acceptabil'
    case 'slab':
      return 'Slab ca referință'
  }
}
