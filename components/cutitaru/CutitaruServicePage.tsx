import Link from "next/link";
import { HOME, SERVICE_PAGES } from "@/lib/cutitaru/content";
import { homePath } from "@/lib/cutitaru/i18n";
import type { Locale, ServiceKey } from "@/lib/cutitaru/types";
import { CutitaruShell } from "./CutitaruShell";

export function CutitaruServicePage({
  locale,
  serviceKey,
}: {
  locale: Locale;
  serviceKey: ServiceKey;
}) {
  const c = HOME[locale];
  const p = SERVICE_PAGES[serviceKey][locale];

  return (
    <CutitaruShell locale={locale} content={c} pageType="service" pageKey={serviceKey}>
      <section className="letter-section bg-[var(--color-paper-white)]" data-nav-theme="light">
        <div className="letter-container max-w-3xl">
          <p className="text-caption mb-4 text-[var(--color-fog-gray)]">
            <Link href={homePath(locale)} className="hover:underline">
              {p.home}
            </Link>
          </p>
          <h1 className="font-display text-heading mb-6">{p.h1}</h1>
          <p className="text-body mb-12 text-[var(--color-fog-gray)]">{p.lead}</p>

          {p.sections.map(([h, body]) => (
            <div key={h} className="mb-10">
              <h2 className="font-display text-subheading mb-3">{h}</h2>
              <p className="text-body">{body}</p>
            </div>
          ))}

          <Link href={`${homePath(locale)}#contact`} className="btn-letter btn-teal mt-4 inline-flex">
            {p.cta}
          </Link>
        </div>
      </section>
    </CutitaruShell>
  );
}
