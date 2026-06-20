import sharp from "sharp";
import { validateProxyUrl } from "./download";
import { parseDimensionsFromUrl } from "./parse-dimensions";
import type { ExtractedImage } from "./types";
import { USER_AGENT } from "./types";

export type ImageMeta = {
  sizeBytes?: number;
  width?: number;
  height?: number;
  contentType?: string;
};

const ENRICH_CONCURRENCY = 8;
const PROBE_BYTES = 64 * 1024;

export async function fetchImageMeta(url: string): Promise<ImageMeta> {
  const imageUrl = validateProxyUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const head = await fetch(imageUrl.href, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/*,*/*",
      },
    });

    const contentType = head.headers.get("content-type") ?? undefined;
    const contentLength = head.headers.get("content-length");
    const sizeBytes = contentLength
      ? Number.parseInt(contentLength, 10)
      : undefined;

    const fromUrl = parseDimensionsFromUrl(imageUrl.href);
    if (fromUrl.width && fromUrl.height) {
      return { sizeBytes, width: fromUrl.width, height: fromUrl.height, contentType };
    }

    if (head.ok) {
      const probe = await fetch(imageUrl.href, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*",
          Range: `bytes=0-${PROBE_BYTES - 1}`,
        },
      });

      if (probe.ok) {
        const buffer = Buffer.from(await probe.arrayBuffer());
        try {
          const metadata = await sharp(buffer).metadata();
          return {
            sizeBytes,
            width: metadata.width,
            height: metadata.height,
            contentType: contentType ?? metadata.format,
          };
        } catch {
          return { sizeBytes, contentType };
        }
      }
    }

    return { sizeBytes, contentType };
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichImageMetadata(
  images: ExtractedImage[],
): Promise<ExtractedImage[]> {
  const enriched: ExtractedImage[] = [];

  for (let i = 0; i < images.length; i += ENRICH_CONCURRENCY) {
    const batch = images.slice(i, i + ENRICH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (image) => {
        if (image.sizeBytes && image.width && image.height) return image;

        try {
          const meta = await fetchImageMeta(image.url);
          return {
            ...image,
            sizeBytes: image.sizeBytes ?? meta.sizeBytes,
            width: image.width ?? meta.width ?? parseDimensionsFromUrl(image.url).width,
            height:
              image.height ?? meta.height ?? parseDimensionsFromUrl(image.url).height,
          };
        } catch {
          const parsed = parseDimensionsFromUrl(image.url);
          return {
            ...image,
            width: image.width ?? parsed.width,
            height: image.height ?? parsed.height,
          };
        }
      }),
    );
    enriched.push(...results);
  }

  return enriched;
}
