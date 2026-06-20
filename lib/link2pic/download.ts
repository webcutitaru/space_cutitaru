const PRIVATE_HOST_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$/i;

export function validateProxyUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Image URL is required.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid image URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Image URL must use http or https.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (PRIVATE_HOST_RE.test(host)) {
    throw new Error("Private network URLs are not allowed.");
  }

  return url;
}

export function filenameFromUrl(url: URL, contentType?: string | null): string {
  const pathname = url.pathname.split("/").pop() ?? "image";
  const base = pathname.replace(/\.[^.]+$/, "") || "image";

  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) {
    return pathname;
  }

  const ext =
    contentType?.includes("png")
      ? "png"
      : contentType?.includes("webp")
        ? "webp"
        : contentType?.includes("gif")
          ? "gif"
          : "jpg";

  return `${base}.${ext}`;
}

export function slugFromPageUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1] ?? url.hostname.replace(/\./g, "-");
    return slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 40) || "images";
  } catch {
    return "images";
  }
}
