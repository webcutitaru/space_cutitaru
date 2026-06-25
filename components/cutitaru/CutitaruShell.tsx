"use client";

import { Suspense, useEffect, useState } from "react";
import type { HomeContent, Locale } from "@/lib/cutitaru/types";
import type { LegalKey, PageType, ServiceKey } from "@/lib/cutitaru/types";
import { CutitaruFooter, CutitaruNav, SpaceBackLink } from "./CutitaruNav";
import { CookieBanner } from "./CookieBanner";
import { ContactToast } from "./ContactToast";

export function CutitaruShell({
  locale,
  content,
  children,
  pageType = "home",
  pageKey,
}: {
  locale: Locale;
  content: HomeContent;
  children: React.ReactNode;
  pageType?: PageType;
  pageKey?: ServiceKey | LegalKey;
}) {
  const [navVariant, setNavVariant] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const sections = document.querySelectorAll("[data-nav-theme]");
    if (!sections.length) {
      setNavVariant("light");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0]?.target.getAttribute("data-nav-theme");
        if (top === "dark" || top === "light") setNavVariant(top);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-white focus:p-2"
      >
        {content.skip}
      </a>
      <CutitaruNav
        locale={locale}
        content={content}
        variant={navVariant}
        pageType={pageType}
        pageKey={pageKey}
      />
      <main id="main">{children}</main>
      <CutitaruFooter locale={locale} content={content} />
      <SpaceBackLink />
      <CookieBanner locale={locale} content={content} />
      <Suspense fallback={null}>
        <ContactToast content={content} />
      </Suspense>
    </>
  );
}
