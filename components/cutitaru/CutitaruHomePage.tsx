import { HOME, PARTNERS_ROW1, PARTNERS_ROW2, SERVICE_PAGES } from "@/lib/cutitaru/content";
import { homePath, servicePath } from "@/lib/cutitaru/i18n";
import type { Locale } from "@/lib/cutitaru/types";
import { CutitaruShell } from "./CutitaruShell";
import {
  FaqAccordion,
  PartnersMarquee,
  ServicesOverview,
  WorkSteps,
} from "./CutitaruSections";
import {
  DarkHeroStage,
  SplitContentSection,
  StatementSection,
  TintedFeatureCard,
} from "./LetterSections";
import { ContactForm } from "./ContactForm";

const RENDERS = {
  hero: "/cutitaru/renders/hero-chrome.webp",
  about: "/cutitaru/renders/about-split.webp",
  design: "/cutitaru/renders/card-design.webp",
  shopify: "/cutitaru/renders/card-shopify.webp",
  ads: "/cutitaru/renders/card-ads.webp",
  campaigns: "/cutitaru/renders/campaigns.webp",
};

export function CutitaruHomePage({ locale }: { locale: Locale }) {
  const c = HOME[locale];
  const talk = c.talk;

  const extraServices = c.services
    .filter(([, , , link]) => !link)
    .map(([, title, body]) => ({ title, body }));

  return (
    <CutitaruShell locale={locale} content={c}>
      <DarkHeroStage
        eyebrow={c.hero_eyebrow}
        title={c.hero_h1}
        lead={c.hero_lead}
        renderSrc={RENDERS.hero}
      />

      <SplitContentSection
        id="about"
        eyebrow={c.about_eyebrow}
        title={c.about_h2}
        paragraphs={[c.about_p1, c.about_p2]}
        renderSrc={RENDERS.about}
        renderAlt="About"
        cta={{
          href: `${homePath(locale)}#contact`,
          label: c.hero_cta,
          variant: "teal",
        }}
        ghost={{ href: `${homePath(locale)}#services`, label: talk, variant: "teal" }}
      />

      <section id="services-highlight" className="space-y-0" data-nav-theme="light">
        <TintedFeatureCard
          wall="peach"
          title={SERVICE_PAGES.design[locale].h1}
          body={SERVICE_PAGES.design[locale].lead}
          renderSrc={RENDERS.design}
          ctaHref={servicePath(locale, "design")}
          ctaLabel={SERVICE_PAGES.design[locale].cta}
          ghostHref={servicePath(locale, "design")}
          ghostLabel={talk}
          variant="teal"
        />
        <TintedFeatureCard
          wall="mint"
          title={SERVICE_PAGES.shopify[locale].h1}
          body={SERVICE_PAGES.shopify[locale].lead}
          renderSrc={RENDERS.shopify}
          ctaHref={servicePath(locale, "shopify")}
          ctaLabel={SERVICE_PAGES.shopify[locale].cta}
          ghostHref={servicePath(locale, "shopify")}
          ghostLabel={talk}
          variant="blue"
        />
        <TintedFeatureCard
          wall="lavender"
          title={SERVICE_PAGES.ads[locale].h1}
          body={SERVICE_PAGES.ads[locale].lead}
          renderSrc={RENDERS.ads}
          ctaHref={servicePath(locale, "ads")}
          ctaLabel={SERVICE_PAGES.ads[locale].cta}
          ghostHref={servicePath(locale, "ads")}
          ghostLabel={talk}
          variant="violet"
        />
      </section>

      <ServicesOverview
        eyebrow={c.services_eyebrow}
        title={c.services_h2}
        lead={c.services_lead}
        services={extraServices}
      />

      <StatementSection
        eyebrow={c.campaigns_eyebrow}
        title={c.campaigns_h2}
        paragraph={c.campaigns_p}
        items={c.campaigns_li}
        renderSrc={RENDERS.campaigns}
      />

      <PartnersMarquee
        eyebrow={c.partners_eyebrow}
        title={c.partners_h2}
        lead={c.partners_lead}
        row1={PARTNERS_ROW1}
        row2={PARTNERS_ROW2}
      />

      <WorkSteps
        eyebrow={c.work_eyebrow}
        title={c.work_h2}
        lead={c.work_lead}
        cards={c.work_cards}
      />

      <FaqAccordion eyebrow={c.faq_eyebrow} title={c.faq_h2} items={c.faq} />

      <ContactForm locale={locale} content={c} />
    </CutitaruShell>
  );
}
