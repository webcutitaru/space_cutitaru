import { RenderImage } from "./LetterButtons";

export function DarkHeroStage({
  eyebrow,
  title,
  lead,
  renderSrc,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  renderSrc: string;
}) {
  return (
    <section
      id="home"
      className="relative bg-[var(--color-vault-ink)] text-[var(--color-paper-white)]"
      data-nav-theme="dark"
    >
      <div className="letter-container letter-section pb-16 pt-24 text-center md:pt-32">
        <p className="text-caption mb-6 text-[var(--color-fog-gray)]">{eyebrow}</p>
        <h1 className="font-display text-display mx-auto mb-6 max-w-4xl">{title}</h1>
        <p className="font-display text-subheading mx-auto max-w-2xl opacity-70">{lead}</p>
      </div>
      <div className="letter-container flex justify-center pb-24 md:pb-32">
        <RenderImage
          src={renderSrc}
          alt=""
          priority
          className="h-auto w-full max-w-3xl object-contain md:max-h-[60vh]"
        />
      </div>
    </section>
  );
}

export function SplitContentSection({
  id,
  eyebrow,
  title,
  paragraphs,
  renderSrc,
  renderAlt,
  background = "white",
  cta,
  ghost,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  renderSrc?: string;
  renderAlt?: string;
  background?: "white" | "mist";
  cta?: { href: string; label: string; variant: "teal" | "violet" | "blue" };
  ghost?: { href: string; label: string; variant: "teal" | "violet" | "blue" };
}) {
  const bg =
    background === "mist"
      ? "bg-[var(--color-mist-white)]"
      : "bg-[var(--color-paper-white)]";

  return (
    <section id={id} className={`letter-section ${bg}`} data-nav-theme="light">
      <div className="letter-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          {eyebrow && (
            <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-heading mb-6">{title}</h2>
          {paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="text-body mb-4 text-[var(--color-vault-ink)]">
              {p}
            </p>
          ))}
          {(cta || ghost) && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              {cta && (
                <a href={cta.href} className={`btn-letter btn-${cta.variant}`}>
                  {cta.label}
                </a>
              )}
              {ghost && (
                <a href={ghost.href} className={`ghost-link ghost-link-${ghost.variant} ml-2`}>
                  {ghost.label}
                </a>
              )}
            </div>
          )}
        </div>
        {renderSrc && (
          <RenderImage src={renderSrc} alt={renderAlt ?? ""} className="mx-auto h-auto w-full object-contain" />
        )}
      </div>
    </section>
  );
}

export function TintedFeatureCard({
  wall,
  title,
  body,
  renderSrc,
  ctaHref,
  ctaLabel,
  ghostHref,
  ghostLabel,
  variant,
}: {
  wall: "peach" | "mint" | "lavender";
  title: string;
  body: string;
  renderSrc: string;
  ctaHref: string;
  ctaLabel: string;
  ghostHref: string;
  ghostLabel: string;
  variant: "teal" | "violet" | "blue";
}) {
  const wallColor = {
    peach: "bg-[var(--color-peach-wall)]",
    mint: "bg-[var(--color-mint-wall)]",
    lavender: "bg-[var(--color-lavender-wall)]",
  }[wall];

  return (
    <article className={`${wallColor} p-8 md:p-[var(--spacing-32)]`}>
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-subheading mb-4">{title}</h3>
          <p className="text-body mb-8">{body}</p>
          <div className="flex flex-wrap items-center gap-2">
            <a href={ctaHref} className={`btn-letter btn-${variant}`}>
              {ctaLabel}
            </a>
            <a href={ghostHref} className={`ghost-link ghost-link-${variant} ml-2`}>
              {ghostLabel}
            </a>
          </div>
        </div>
        <RenderImage src={renderSrc} alt="" className="mx-auto h-auto w-full object-contain" />
      </div>
    </article>
  );
}

export function StatementSection({
  eyebrow,
  title,
  paragraph,
  items,
  renderSrc,
}: {
  eyebrow: string;
  title: string;
  paragraph: string;
  items: [string, string][];
  renderSrc: string;
}) {
  return (
    <section className="letter-section bg-[var(--color-mist-white)]" data-nav-theme="light">
      <div className="letter-container grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
            {eyebrow}
          </p>
          <h2 className="font-display text-heading mb-6">{title}</h2>
          <p className="text-body mb-8">{paragraph}</p>
          <ul className="space-y-4">
            {items.map(([head, desc]) => (
              <li key={head}>
                <p className="font-medium">{head}</p>
                <p className="text-caption text-[var(--color-fog-gray)]">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
        <RenderImage src={renderSrc} alt="" className="mx-auto h-auto w-full object-contain" />
      </div>
    </section>
  );
}
