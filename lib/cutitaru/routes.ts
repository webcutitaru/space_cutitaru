import { LEGAL_FILES, SERVICE_LINKS } from "./content";
import { slugWithoutHtml } from "./i18n";
import type { LegalKey, Locale, ResolvedRoute, ServiceKey } from "./types";

function matchLegal(locale: Locale, slug: string): LegalKey | null {
  for (const key of ["privacy", "cookies", "terms"] as LegalKey[]) {
    if (slugWithoutHtml(LEGAL_FILES[key][locale]) === slug) return key;
  }
  return null;
}

function matchService(locale: Locale, slug: string): ServiceKey | null {
  for (const key of ["design", "shopify", "ads"] as ServiceKey[]) {
    if (slugWithoutHtml(SERVICE_LINKS[locale][key]) === slug) return key;
  }
  return null;
}

export function resolveSlugRoute(locale: Locale, slug: string): ResolvedRoute | null {
  const legalKey = matchLegal(locale, slug);
  if (legalKey) {
    return { type: "legal", locale, slug, legalKey };
  }

  const serviceKey = matchService(locale, slug);
  if (serviceKey) {
    return { type: "service", locale, slug, serviceKey };
  }

  return null;
}

export function homeRoute(locale: Locale): ResolvedRoute {
  return { type: "home", locale, slug: "" };
}
