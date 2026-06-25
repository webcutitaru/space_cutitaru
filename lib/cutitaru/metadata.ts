import type { Metadata } from "next";
import { HOME, SERVICE_PAGES } from "@/lib/cutitaru/content";
import { homePath, legalPath, servicePath } from "@/lib/cutitaru/i18n";
import { LEGAL_PAGE_META } from "@/lib/cutitaru/legal-meta";
import type { LegalKey, Locale, ServiceKey } from "@/lib/cutitaru/types";

const SITE = "https://space.cutitaru.com";

export function homeMetadata(locale: Locale): Metadata {
  const c = HOME[locale];
  const url = `${SITE}${homePath(locale)}`;
  return {
    title: c.title,
    description: c.desc,
    openGraph: {
      title: c.title,
      description: c.desc,
      url,
      siteName: "cutitaru",
      locale: locale === "ro" ? "ro_MD" : locale === "ru" ? "ru_MD" : "en_US",
      images: [{ url: `${SITE}/cutitaru/renders/hero-chrome.webp` }],
    },
    alternates: {
      canonical: url,
      languages: {
        ro: `${SITE}${homePath("ro")}`,
        en: `${SITE}${homePath("en")}`,
        ru: `${SITE}${homePath("ru")}`,
      },
    },
  };
}

export function serviceMetadata(locale: Locale, key: ServiceKey): Metadata {
  const p = SERVICE_PAGES[key][locale];
  const url = `${SITE}${servicePath(locale, key)}`;
  return {
    title: p.title,
    description: p.desc,
    openGraph: { title: p.title, description: p.desc, url },
    alternates: { canonical: url },
  };
}

export function legalMetadata(locale: Locale, key: LegalKey): Metadata {
  const m = LEGAL_PAGE_META[key][locale];
  const url = `${SITE}${legalPath(locale, key)}`;
  return {
    title: m.title,
    description: m.desc,
    openGraph: { title: m.title, description: m.desc, url },
    alternates: { canonical: url },
  };
}
