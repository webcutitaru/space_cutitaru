import type { YtdlpFormat, YtdlpInfo } from "@/lib/reelsave/types";

function isWatermarked(format: YtdlpFormat): boolean {
  const note = (format.format_note ?? "").toLowerCase();
  const url = (format.url ?? "").toLowerCase();
  return (
    note.includes("watermark") ||
    url.includes("watermark") ||
    note.includes("logo")
  );
}

function isVideoFormat(format: YtdlpFormat): boolean {
  const vcodec = format.vcodec ?? "none";
  return vcodec !== "none" && vcodec !== undefined;
}

function formatScore(format: YtdlpFormat): number {
  const width = format.width ?? 0;
  const height = format.height ?? 0;
  const pixels = width * height;
  const hasAudio = (format.acodec ?? "none") !== "none";
  const size = format.filesize ?? format.filesize_approx ?? 0;
  const bitrate = format.tbr ?? 0;
  const extBonus = format.ext === "mp4" ? 1_000 : 0;

  return pixels + (hasAudio ? 50_000 : 0) + size / 10_000 + bitrate * 100 + extBonus;
}

export function pickBestFormat(info: YtdlpInfo): {
  formatId: string;
  width?: number;
  height?: number;
  ext: string;
} {
  const formats = info.formats ?? [];

  const candidates = formats.filter(
    (f) => f.format_id && isVideoFormat(f) && !isWatermarked(f),
  );

  if (candidates.length > 0) {
    const best = candidates.sort((a, b) => formatScore(b) - formatScore(a))[0];
    return {
      formatId: best.format_id!,
      width: best.width ?? info.width,
      height: best.height ?? info.height,
      ext: best.ext ?? info.ext ?? "mp4",
    };
  }

  if (info.format_id) {
    return {
      formatId: info.format_id,
      width: info.width,
      height: info.height,
      ext: info.ext ?? "mp4",
    };
  }

  throw new Error("No suitable video format found.");
}
