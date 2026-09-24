"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SKIP_KEY = "space_skip_visit_ping";

export function VisitPing() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return;
    try {
      if (localStorage.getItem(SKIP_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const visitKey = `space_visit_ping:${pathname}`;
    try {
      if (sessionStorage.getItem(visitKey)) return;
      sessionStorage.setItem(visitKey, "1");
    } catch {
      return;
    }

    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      tz = "";
    }

    const screen =
      window.screen?.width && window.screen?.height
        ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}`
        : "";

    void fetch("/api/visit-ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname + window.location.search,
        referrer: document.referrer || "",
        lang: navigator.language || "",
        tz,
        screen,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
