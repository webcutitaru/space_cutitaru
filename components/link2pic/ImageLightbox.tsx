"use client";

import { useEffect, useCallback } from "react";
import type { ExtractedImage } from "@/lib/link2pic/types";

type ImageLightboxProps = {
  image: ExtractedImage;
  index: number;
  total: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export function ImageLightbox({
  image,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: ImageLightboxProps) {
  const proxySrc = `/api/link2pic/proxy?url=${encodeURIComponent(image.url)}`;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && onPrev) onPrev();
      if (event.key === "ArrowRight" && onNext) onNext();
    },
    [onClose, onPrev, onNext],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Image preview ${index + 1} of ${total}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
        aria-label="Close"
      >
        ×
      </button>

      {onPrev && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-200 transition hover:bg-slate-800"
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      {onNext && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-200 transition hover:bg-slate-800"
          aria-label="Next image"
        >
          ›
        </button>
      )}

      <div
        className="flex max-h-[90vh] max-w-[95vw] flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxySrc}
          alt={image.filename}
          className="max-h-[80vh] max-w-full object-contain"
        />
        <div className="text-center text-sm text-slate-300">
          <span className="font-medium text-white">{image.filename}</span>
          <span className="mx-2 text-slate-500">·</span>
          <span>
            {index + 1} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}
