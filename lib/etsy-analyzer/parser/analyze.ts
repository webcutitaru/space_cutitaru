import { load } from 'cheerio'
import { extractMeta } from './extractMeta'
import { extractJsonLd } from './extractJsonLd'
import { extractAppState } from './extractAppState'
import { extractDom } from './extractDom'
import { normalizeReport } from './normalize'
import type { ListingReport } from '../types/listing'

export function analyzeEtsyHtml(html: string): ListingReport {
  if (!html.trim()) {
    throw new Error('HTML gol — lipește sau încarcă sursa paginii de produs Etsy.')
  }

  const $ = load(html)
  const meta = extractMeta($)
  const jsonLd = extractJsonLd($)
  const appState = extractAppState($)
  const dom = extractDom($)

  return normalizeReport({ meta, jsonLd, appState, dom })
}

export type { ListingReport }
