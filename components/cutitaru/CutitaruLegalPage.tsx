import Link from "next/link";
import { HOME } from "@/lib/cutitaru/content";
import { homePath } from "@/lib/cutitaru/i18n";
import { loadLegalHtml } from "@/lib/cutitaru/legal-html";
import { LEGAL_PAGE_META } from "@/lib/cutitaru/legal-meta";
import type { LegalKey, Locale } from "@/lib/cutitaru/types";
import { CutitaruShell } from "./CutitaruShell";

export function CutitaruLegalPage({
  locale,
  legalKey,
}: {
  locale: Locale;
  legalKey: LegalKey;
}) {
  const c = HOME[locale];
  const meta = LEGAL_PAGE_META[legalKey][locale];
  const html = loadLegalHtml(locale, legalKey);

  return (
    <CutitaruShell locale={locale} content={c} pageType="legal" pageKey={legalKey}>
      <section className="letter-section bg-[var(--color-paper-white)]" data-nav-theme="light">
        <div className="letter-container max-w-3xl">
          <p className="text-caption mb-4 text-[var(--color-fog-gray)]">
            <Link href={homePath(locale)} className="hover:underline">
              {c.footer_explore}
            </Link>
          </p>
          <h1 className="font-display text-heading mb-8">{meta.h1}</h1>
          <div
            className="legal-content text-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>
    </CutitaruShell>
  );
}
