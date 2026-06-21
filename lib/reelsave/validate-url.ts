import type { Platform } from "@/lib/reelsave/types";

const PRIVATE_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

const TIKTOK_HOSTS = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

export function detectPlatformFromUrl(url: URL): Platform | null {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (INSTAGRAM_HOSTS.has(host) || host === "instagram.com") {
    return "instagram";
  }

  if (
    TIKTOK_HOSTS.has(host) ||
    host.endsWith(".tiktok.com") ||
    host === "tiktok.com"
  ) {
    return "tiktok";
  }

  return null;
}

export function validatePageUrl(raw: string): { url: URL; platform: Platform } {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Video URL is required.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid video URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Video URL must use http or https.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (PRIVATE_HOST_RE.test(host)) {
    throw new Error("Private network URLs are not allowed.");
  }

  const platform = detectPlatformFromUrl(url);
  if (!platform) {
    throw new Error(
      "Only Instagram and TikTok links are supported (posts, Reels, or TikTok videos).",
    );
  }

  return { url, platform };
}

export function validateThumbnailUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Thumbnail URL is required.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid thumbnail URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Thumbnail URL must use http or https.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (PRIVATE_HOST_RE.test(host)) {
    throw new Error("Private network URLs are not allowed.");
  }

  return url;
}
