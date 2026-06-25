export type Locale = "ro" | "en" | "ru";

export type PageType = "home" | "service" | "legal";

export type ServiceKey = "design" | "shopify" | "ads";

export type LegalKey = "privacy" | "cookies" | "terms";

export type HomeContent = {
  title: string;
  desc: string;
  skip: string;
  nav: [string, string][];
  hero_eyebrow: string;
  hero_h1: string;
  hero_lead: string;
  hero_cta: string;
  about_eyebrow: string;
  about_h2: string;
  about_p1: string;
  about_p2: string;
  services_eyebrow: string;
  services_h2: string;
  services_lead: string;
  features: [string, string][];
  campaigns_eyebrow: string;
  campaigns_h2: string;
  campaigns_p: string;
  campaigns_li: [string, string][];
  partners_eyebrow: string;
  partners_h2: string;
  partners_lead: string;
  work_eyebrow: string;
  work_h2: string;
  work_lead: string;
  work_cards: [string, string][];
  faq_eyebrow: string;
  faq_h2: string;
  faq: [string, string][];
  contact_eyebrow: string;
  contact_h2: string;
  contact_lead: string;
  form_name: string;
  form_email: string;
  form_phone: string;
  form_city: string;
  form_message: string;
  form_send: string;
  footer_cta_p: string;
  footer_cta_btn: string;
  footer_blurb: string;
  footer_explore: string;
  footer_services: string;
  footer_rights: string;
  footer_privacy: string;
  footer_terms: string;
  footer_cookies: string;
  back_top: string;
  cookie_label: string;
  cookie_text: string;
  cookie_link: string;
  cookie_accept: string;
  toast_ok: string;
  toast_err: string;
  toast_close: string;
  toast_btn: string;
  val_name: string;
  val_email: string;
  val_email_bad: string;
  val_message: string;
  services: [string, string, string, string | null, string][];
  talk: string;
  work_cta: string;
  return_to: string;
};

export type ServicePageContent = {
  file: string;
  title: string;
  desc: string;
  h1: string;
  lead: string;
  sections: [string, string][];
  cta: string;
  home: string;
};

export type Partner = {
  name: string;
  url: string | null;
  file: string;
  w: number;
  h: number;
  img_class?: string;
};

export type ResolvedRoute = {
  type: PageType;
  locale: Locale;
  slug: string;
  serviceKey?: ServiceKey;
  legalKey?: LegalKey;
};

export type LegalMeta = {
  title: string;
  desc: string;
  h1: string;
};
