import type { LegalKey, LegalMeta, Locale } from "./types";

export const LEGAL_UPDATED: Record<Locale, string> = {
  ro: "5 iunie 2026",
  en: "5 June 2026",
  ru: "5 июня 2026",
};

export const LEGAL_PAGE_META: Record<LegalKey, Record<Locale, LegalMeta>> = {
  privacy: {
    ro: {
      title: "Politica de confidențialitate — cutitaru",
      desc: "Politica de confidențialitate cutitaru — cum sunt colectate și folosite datele personale pe acest site.",
      h1: "Politica de confidențialitate",
    },
    en: {
      title: "Privacy policy — cutitaru",
      desc: "Privacy policy for cutitaru — how personal data is collected and used on this site.",
      h1: "Privacy policy",
    },
    ru: {
      title: "Политика конфиденциальности — cutitaru",
      desc: "Политика конфиденциальности cutitaru — как собираются и используются персональные данные на этом сайте.",
      h1: "Политика конфиденциальности",
    },
  },
  cookies: {
    ro: {
      title: "Politica de cookie — cutitaru",
      desc: "Politica de cookie cutitaru — Microsoft Clarity, preferințe locale și opțiunile tale.",
      h1: "Politica de cookie",
    },
    en: {
      title: "Cookie policy — cutitaru",
      desc: "Cookie policy for cutitaru — Microsoft Clarity, local preferences, and your choices.",
      h1: "Cookie policy",
    },
    ru: {
      title: "Политика cookie — cutitaru",
      desc: "Политика cookie cutitaru — Microsoft Clarity, локальные настройки и ваш выбор.",
      h1: "Политика cookie",
    },
  },
  terms: {
    ro: {
      title: "Termeni și condiții — cutitaru",
      desc: "Termeni și condiții pentru utilizarea site-ului cutitaru.",
      h1: "Termeni și condiții",
    },
    en: {
      title: "Terms of service — cutitaru",
      desc: "Terms of service for using the cutitaru website.",
      h1: "Terms of service",
    },
    ru: {
      title: "Условия использования — cutitaru",
      desc: "Условия использования сайта cutitaru.",
      h1: "Условия использования",
    },
  },
};
