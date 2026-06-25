"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeContent, Locale } from "@/lib/cutitaru/types";
import { legalPath } from "@/lib/cutitaru/i18n";

const STORAGE_KEY = "cutitaru_cookie_consent";

export function CookieBanner({ locale, content }: { locale: Locale; content: HomeContent }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    if (typeof window !== "undefined" && "clarity" in window) {
      // Clarity loaded via script when consented
    }
    const script = document.createElement("script");
    script.src = "/cutitaru/clarity.js";
    script.async = true;
    document.body.appendChild(script);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[65] border-t border-[var(--color-hairline)] bg-[var(--color-paper-white)] p-4 shadow-none">
      <div className="letter-container flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-caption font-medium">{content.cookie_label}</p>
          <p className="text-caption text-[var(--color-fog-gray)]">
            {content.cookie_text}{" "}
            <Link href={legalPath(locale, "cookies")} className="underline">
              {content.cookie_link}
            </Link>
            .
          </p>
        </div>
        <button type="button" className="btn-letter btn-dark-fill shrink-0" onClick={accept}>
          {content.cookie_accept}
        </button>
      </div>
    </div>
  );
}
