import { pickBestFormat } from "@/lib/reelsave/pick-format";
import type { ExtractResult } from "@/lib/reelsave/types";
import { validatePageUrl } from "@/lib/reelsave/validate-url";
import { fetchVideoInfo } from "@/lib/reelsave/ytdlp";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "video"
  );
}

function buildFilename(
  title: string | undefined,
  uploader: string | undefined,
  ext: string,
): string {
  const base = slugify(title ?? uploader ?? "video");
  return `${base}.${ext}`;
}

export async function extractVideo(pageUrl: string): Promise<ExtractResult> {
  const started = Date.now();
  const { url, platform } = validatePageUrl(pageUrl);
  const warnings: string[] = [];

  const info = await fetchVideoInfo(url.href);
  const picked = pickBestFormat(info);

  const title = info.title?.trim() || undefined;
  const uploader =
    info.uploader?.trim() ||
    (info.uploader_id ? `@${info.uploader_id}` : undefined);

  if (platform === "tiktok" && picked.height && picked.height < 720) {
    warnings.push("Only a lower-resolution version was available for this TikTok.");
  }

  return {
    pageUrl: url.href,
    platform,
    title,
    uploader,
    durationSec: info.duration,
    thumbnailUrl: info.thumbnail,
    formatId: picked.formatId,
    width: picked.width,
    height: picked.height,
    ext: picked.ext,
    filename: buildFilename(title, uploader, picked.ext),
    warnings: warnings.length > 0 ? warnings : undefined,
    meta: { durationMs: Date.now() - started },
  };
}
