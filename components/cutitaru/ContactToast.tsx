"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { HomeContent } from "@/lib/cutitaru/types";

export function ContactToast({ content }: { content: HomeContent }) {
  const params = useSearchParams();
  const sent = params.get("sent");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sent === "1" || sent === "0") setOpen(true);
  }, [sent]);

  if (!open) return null;

  const ok = sent === "1";
  const message = ok ? content.toast_ok : content.toast_err;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={content.toast_close}
    >
      <div className="max-w-md bg-[var(--color-paper-white)] p-8 text-center">
        <p className="text-body mb-6 whitespace-pre-line">{message}</p>
        <button type="button" className="btn-letter btn-teal" onClick={() => setOpen(false)}>
          {content.toast_btn}
        </button>
      </div>
    </div>
  );
}
