"use client";

import Image from "next/image";
import type { Partner } from "@/lib/cutitaru/types";

function partnerSrc(file: string): string {
  return `/cutitaru/partners/${encodeURIComponent(file)}`;
}

function MarqueeRow({ partners, reverse }: { partners: Partner[]; reverse?: boolean }) {
  const items = [...partners, ...partners];

  return (
    <div className="partners-marquee mb-8">
      <div className={`partners-marquee__track ${reverse ? "partners-marquee__track--reverse" : ""}`}>
        {items.map((p, i) => {
          const img = (
            <Image
              key={`${p.name}-${i}`}
              src={partnerSrc(p.file)}
              alt={p.name}
              width={p.w}
              height={p.h}
              className="h-10 w-auto object-contain opacity-80 grayscale md:h-12"
            />
          );
          if (p.url) {
            return (
              <a
                key={`${p.name}-${i}`}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                {img}
              </a>
            );
          }
          return (
            <span key={`${p.name}-${i}`} className="shrink-0">
              {img}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PartnersMarquee({
  eyebrow,
  title,
  lead,
  row1,
  row2,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  row1: Partner[];
  row2: Partner[];
}) {
  return (
    <section id="partners" className="letter-section bg-[var(--color-paper-white)]" data-nav-theme="light">
      <div className="letter-container mb-12">
        <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
          {eyebrow}
        </p>
        <h2 className="font-display text-heading mb-4">{title}</h2>
        <p className="text-body max-w-2xl text-[var(--color-fog-gray)]">{lead}</p>
      </div>
      <MarqueeRow partners={row1} />
      <MarqueeRow partners={row2} reverse />
    </section>
  );
}

export function WorkSteps({
  eyebrow,
  title,
  lead,
  cards,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  cards: [string, string][];
}) {
  return (
    <section id="work" className="letter-section bg-[var(--color-mist-white)]" data-nav-theme="light">
      <div className="letter-container">
        <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
          {eyebrow}
        </p>
        <h2 className="font-display text-heading mb-4">{title}</h2>
        <p className="text-body mb-12 max-w-2xl">{lead}</p>
        <div className="grid gap-8 md:grid-cols-2">
          {cards.map(([head, body]) => (
            <article
              key={head}
              className="border border-[var(--color-hairline)] bg-[var(--color-paper-white)] p-8"
            >
              <h3 className="font-display text-subheading mb-3">{head}</h3>
              <p className="text-body text-[var(--color-fog-gray)]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqAccordion({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: [string, string][];
}) {
  return (
    <section id="faq" className="letter-section bg-[var(--color-paper-white)]" data-nav-theme="light">
      <div className="letter-container max-w-3xl">
        <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
          {eyebrow}
        </p>
        <h2 className="font-display text-heading mb-8">{title}</h2>
        <div className="divide-y divide-[var(--color-hairline)]">
          {items.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="font-display text-subheading cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                {q}
              </summary>
              <p className="text-body mt-3 text-[var(--color-fog-gray)]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ServicesOverview({
  eyebrow,
  title,
  lead,
  services,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  services: { title: string; body: string }[];
}) {
  return (
    <section id="services" className="letter-section bg-[var(--color-paper-white)]" data-nav-theme="light">
      <div className="letter-container mb-12">
        <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
          {eyebrow}
        </p>
        <h2 className="font-display text-heading mb-4">{title}</h2>
        <p className="text-body max-w-2xl">{lead}</p>
      </div>
      <div className="letter-container grid gap-px bg-[var(--color-hairline)] md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article key={s.title} className="bg-[var(--color-paper-white)] p-8">
            <h3 className="font-display text-subheading mb-3">{s.title}</h3>
            <p className="text-body text-[var(--color-fog-gray)]">{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
