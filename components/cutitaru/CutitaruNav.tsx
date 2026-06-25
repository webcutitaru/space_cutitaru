import Link from "next/link";
import type { HomeContent, Locale } from "@/lib/cutitaru/types";
import {
  homePath,
  langSwitchHref,
  legalPath,
  LOCALES,
  LOCALE_LABELS,
} from "@/lib/cutitaru/i18n";
import type { PageType, LegalKey, ServiceKey } from "@/lib/cutitaru/types";
import Image from "next/image";

type NavProps = {
  locale: Locale;
  content: HomeContent;
  variant: "dark" | "light";
  pageType?: PageType;
  pageKey?: ServiceKey | LegalKey;
};

export function CutitaruNav({
  locale,
  content,
  variant,
  pageType = "home",
  pageKey,
}: NavProps) {
  const isDark = variant === "dark";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isDark
          ? "border-transparent bg-[var(--color-vault-ink)] text-[var(--color-paper-white)]"
          : "border-[var(--color-hairline)] bg-[var(--color-paper-white)] text-[var(--color-vault-ink)]"
      }`}
    >
      <div className="letter-container flex items-center justify-between gap-4 py-4">
        <Link href={homePath(locale)} className="flex shrink-0 items-center gap-3">
          <Image src="/cutitaru/logo.png" alt="cutitaru" width={32} height={32} />
          <span className="font-display text-subheading hidden sm:inline">cutitaru</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {content.nav.map(([label, href]) => (
            <Link
              key={href}
              href={`${homePath(locale)}${href}`}
              className={`text-caption px-[23px] py-2 font-medium transition-opacity hover:opacity-70 ${
                isDark ? "text-[var(--color-paper-white)]" : "text-[var(--color-vault-ink)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-caption">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={langSwitchHref(locale, l, pageType, pageKey)}
                className={`px-2 py-1 ${
                  l === locale
                    ? isDark
                      ? "text-[var(--color-paper-white)]"
                      : "text-[var(--color-vault-ink)]"
                    : "text-[var(--color-fog-gray)]"
                }`}
                aria-current={l === locale ? "page" : undefined}
              >
                {LOCALE_LABELS[l]}
              </Link>
            ))}
          </div>
          <Link
            href={`${homePath(locale)}#contact`}
            className={`btn-letter hidden sm:inline-flex ${
              isDark ? "btn-ghost-nav" : "btn-dark-fill"
            }`}
          >
            {content.hero_cta}
          </Link>
          <Link
            href={`${homePath(locale)}#contact`}
            className={`text-caption hidden font-medium lg:inline ${
              isDark ? "text-[var(--color-paper-white)]" : "text-[var(--color-vault-ink)]"
            }`}
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}

export function CutitaruFooter({
  locale,
  content,
}: {
  locale: Locale;
  content: HomeContent;
}) {
  return (
    <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-vault-ink)] text-[var(--color-paper-white)]">
      <div className="letter-section letter-container">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-body mb-4 max-w-md text-[var(--color-fog-gray)]">{content.footer_cta_p}</p>
            <Link href={`${homePath(locale)}#contact`} className="btn-letter btn-teal">
              {content.footer_cta_btn}
            </Link>
          </div>
          <p className="text-caption max-w-sm text-[var(--color-fog-gray)]">{content.footer_blurb}</p>
        </div>

        <div className="grid gap-8 border-t border-white/10 pt-8 md:grid-cols-3">
          <div>
            <p className="text-caption mb-3 uppercase tracking-widest text-[var(--color-fog-gray)]">
              {content.footer_explore}
            </p>
            <ul className="space-y-2 text-caption">
              {content.nav.map(([label, href]) => (
                <li key={href}>
                  <Link href={`${homePath(locale)}${href}`} className="hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption text-[var(--color-fog-gray)]">{content.footer_services}</p>
          </div>
          <div className="flex flex-col gap-2 text-caption">
            <Link href={legalPath(locale, "privacy")}>{content.footer_privacy}</Link>
            <Link href={legalPath(locale, "terms")}>{content.footer_terms}</Link>
            <Link href={legalPath(locale, "cookies")}>{content.footer_cookies}</Link>
          </div>
        </div>

        <p className="text-caption mt-8 text-[var(--color-fog-gray)]">
          © {new Date().getFullYear()} cutitaru. {content.footer_rights}
        </p>
      </div>
    </footer>
  );
}

export function SpaceBackLink() {
  return (
    <Link
      href="/"
      className="fixed bottom-4 left-4 z-[60] text-caption rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper-white)] px-3 py-2 text-[var(--color-vault-ink)] opacity-80 hover:opacity-100"
    >
      ← SPACE
    </Link>
  );
}
