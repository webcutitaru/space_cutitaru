import { parseDimensionsFromUrl } from "./parse-dimensions";

export function isAlibabaCaptchaPage(html: string): boolean {
  return (
    /punish-component/i.test(html) ||
    /window\._config_/i.test(html) ||
    /baxia-icbu-language/i.test(html) ||
    /_____tmd_____/i.test(html)
  );
}

export function extractBaxiaConfigImages(html: string): {
  productImages: string[];
  logoImages: string[];
} {
  const productImages: string[] = [];
  const logoImages: string[] = [];

  const customImage =
    html.match(/"customImage"\s*:\s*"([^"]+)"/i)?.[1] ??
    html.match(/"customImage"\s*:\s*'([^']+)'/i)?.[1];
  if (customImage) productImages.push(customImage);

  const logo =
    html.match(/"logo"\s*:\s*"([^"]+)"/i)?.[1] ??
    html.match(/"logo"\s*:\s*'([^']+)'/i)?.[1];
  if (logo) logoImages.push(logo);

  const imageListMatch = html.match(/"imageList"\s*:\s*(\[[\s\S]*?\])/i);
  if (imageListMatch) {
    try {
      const list = JSON.parse(imageListMatch[1]!) as unknown;
      collectUrlsFromJson(list, productImages);
    } catch {
      /* ignore */
    }
  }

  const galleryMatch = html.match(/"galleryImages"\s*:\s*(\[[\s\S]*?\])/i);
  if (galleryMatch) {
    try {
      const list = JSON.parse(galleryMatch[1]!) as unknown;
      collectUrlsFromJson(list, productImages);
    } catch {
      /* ignore */
    }
  }

  return { productImages, logoImages };
}

function collectUrlsFromJson(data: unknown, urls: string[]): void {
  if (!data) return;

  if (typeof data === "string") {
    if (/alicdn\.com/i.test(data)) urls.push(data);
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item) => collectUrlsFromJson(item, urls));
    return;
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["url", "src", "imageUrl", "original", "big", "normal"]) {
      const value = obj[key];
      if (typeof value === "string" && /alicdn\.com/i.test(value)) {
        urls.push(value);
      }
    }
    for (const value of Object.values(obj)) {
      collectUrlsFromJson(value, urls);
    }
  }
}

export function alibabaOfferIdFromUrl(pageUrl: URL): string | undefined {
  const match = pageUrl.pathname.match(/_(\d{6,})\.html/i);
  return match?.[1];
}

export function isAlibabaBannerUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\/logo(?:\/|\.|$)/i.test(lower)) return true;

  const { width, height } = parseDimensionsFromUrl(url);
  if (width && height) {
    if (height < 100) return true;
    if (width / height > 5) return true;
    if (height / width > 5) return true;
  }

  return false;
}
