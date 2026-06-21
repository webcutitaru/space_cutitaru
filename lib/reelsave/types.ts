export type Platform = "instagram" | "tiktok";

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
export const EXTRACT_TIMEOUT_MS = 30_000;
export const DOWNLOAD_TIMEOUT_MS = 120_000;

export type YtdlpFormat = {
  format_id?: string;
  ext?: string;
  width?: number;
  height?: number;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  url?: string;
};

export type YtdlpInfo = {
  id?: string;
  title?: string;
  uploader?: string;
  uploader_id?: string;
  duration?: number;
  thumbnail?: string;
  ext?: string;
  width?: number;
  height?: number;
  format_id?: string;
  formats?: YtdlpFormat[];
};

export type ExtractResult = {
  pageUrl: string;
  platform: Platform;
  title?: string;
  uploader?: string;
  durationSec?: number;
  thumbnailUrl?: string;
  formatId: string;
  width?: number;
  height?: number;
  ext: string;
  filename: string;
  warnings?: string[];
  meta: { durationMs: number };
};
