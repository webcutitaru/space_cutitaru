import { LEGAL_FILES, SERVICE_LINKS, SERVICE_PAGES } from "./content";
import type { LegalKey, Locale, PageType, ServiceKey } from "./types";

export const LOCALES: Locale[] = ["ro", "en", "ru"];

export const LOCALE_LABELS: Record<Locale, string> = {
  ro: "RO",
  en: "EN",
  ru: "RU",
};

const BASE = "/cutitaru";

export function homePath(locale: Locale): string {
  if (locale === "ro") return BASE;
  return `${BASE}/${locale}`;
}

export function slugWithoutHtml(filename: string): string {
  return filename.replace(/\.html$/, "");
}

export function servicePath(locale: Locale, key: ServiceKey): string {
  const file = SERVICE_PAGES[key][locale].file;
  const slug = slugWithoutHtml(file);
  if (locale === "ro") return `${BASE}/${slug}`;
  return `${BASE}/${locale}/${slug}`;
}

export function legalPath(locale: Locale, key: LegalKey): string {
  const file = LEGAL_FILES[key][locale];
  const slug = slugWithoutHtml(file);
  if (locale === "ro") return `${BASE}/${slug}`;
  return `${BASE}/${locale}/${slug}`;
}

export function serviceHref(locale: Locale, key: ServiceKey | null): string {
  if (!key) return `${homePath(locale)}#contact`;
  return servicePath(locale, key);
}

export function langSwitchHref(
  fromLocale: Locale,
  toLocale: Locale,
  pageType: PageType,
  pageKey?: ServiceKey | LegalKey,
): string {
  if (pageType === "home") return homePath(toLocale);
  if (pageType === "service" && pageKey) {
    return servicePath(toLocale, pageKey as ServiceKey);
  }
  if (pageType === "legal" && pageKey) {
    return legalPath(toLocale, pageKey as LegalKey);
  }
  return homePath(toLocale);
}

export function buildAllSlugs(): { locale: Locale; slug: string }[] {
  const entries: { locale: Locale; slug: string }[] = [];

  for (const locale of LOCALES) {
    for (const key of ["design", "shopify", "ads"] as ServiceKey[]) {
      const slug = slugWithoutHtml(SERVICE_LINKS[locale][key]);
      entries.push({ locale, slug });
    }
    for (const key of ["privacy", "cookies", "terms"] as LegalKey[]) {
      const slug = slugWithoutHtml(LEGAL_FILES[key][locale]);
      entries.push({ locale, slug });
    }
  }

  return entries;
}

export function allSitemapUrls(base: string): string[] {
  const urls = [base, `${base}/en`, `${base}/ru`];
  for (const { locale, slug } of buildAllSlugs()) {
    if (locale === "ro") urls.push(`${base}/${slug}`);
    else urls.push(`${base}/${locale}/${slug}`);
  }
  return urls;
}
