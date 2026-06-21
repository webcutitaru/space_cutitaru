"use client";

import { downloadUrl, thumbnailProxyUrl } from "@/lib/reelsave/client-download";

type VideoPlayerProps = {
  pageUrl: string;
  formatId: string;
  filename: string;
  poster?: string;
};

export function VideoPlayer({
  pageUrl,
  formatId,
  filename,
  poster,
}: VideoPlayerProps) {
  const src = `${downloadUrl(pageUrl, formatId)}&filename=${encodeURIComponent(filename)}&preview=1`;

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-400/20 bg-black">
      <video
        key={src}
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="mx-auto max-h-[70vh] w-full"
      />
    </div>
  );
}
