import { parseDimensionsFromUrl, pixelArea } from "./parse-dimensions";

const MIN_DIMENSION = 200;
const MIN_AREA = MIN_DIMENSION * MIN_DIMENSION;

const NON_PRODUCT_PATH_RE =
  /(?:\/assets\/|\/cdn\/shop\/t\/|\/files\/.*(?:\/icon\/|\/logo\/|\/badge\/|\/payment\/))/i;

const SEGMENT_NOISE_RES: RegExp[] = [
  /(?:^|[/?#&_-])(?:icon|logo|avatar|sprite|badge|favicon)(?:[/?#&_.-]|$)/i,
  /(?:^|[/?#&_-])(?:placeholder|tracking|spacer|spinner|loading)(?:[/?#&_.-]|$)/i,
  /(?:^|[/?#&_-])(?:payment|paypal|visa|mastercard|klarna)(?:[/?#&_.-]|$)/i,
  /(?:^|[/?#&_-])(?:facebook|instagram|twitter|social)(?:[/?#&_.-]|$)/i,
  /(?:^|[/?#&_-])(?:newsletter|checkout|widget|promo)(?:[/?#&_.-]|$)/i,
  /(?:^|[/?#&_-])(?:shopify-assets)(?:[/?#&_.-]|$)/i,
  /\/review(?:s)?\//i,
  /\breviews?\b/i,
  /\/rating(?:s)?\//i,
  /\brating\b/i,
  /\/star(?:s)?\//i,
  /\bstars?\b/i,
  /\/banner(?:s)?\//i,
  /\bbanner\b/i,
  /\/cart(?:s)?\//i,
  /\bcart\b/i,
  /\/pixel(?:s)?\//i,
  /\bpixel\b/i,
  /\/arrow(?:s)?\//i,
  /\barrow\b/i,
  /\/chevron(?:s)?\//i,
  /\bchevron\b/i,
  /\/trust(?:s)?\//i,
  /\btrust\b/i,
  /\/secure(?:s)?\//i,
  /\bsecure\b/i,
  /\/shipping(?:s)?\//i,
  /\bshipping\b/i,
  /\.svg(?:$|[?#])/i,
  /\.gif(?:$|[?#])/i,
];

export function isSegmentNoiseUrl(url: string): boolean {
  const lower = url.toLowerCase();

  if (lower.endsWith(".svg") || lower.includes(".svg?")) return true;
  if (lower.endsWith(".gif") || lower.includes(".gif?")) return true;

  for (const pattern of SEGMENT_NOISE_RES) {
    if (pattern.test(url)) return true;
  }

  if (NON_PRODUCT_PATH_RE.test(lower)) return true;

  return false;
}

export function isTinyImageUrl(url: string, minDimension = MIN_DIMENSION): boolean {
  const { width, height } = parseDimensionsFromUrl(url);
  if (width && width < minDimension) return true;
  if (height && height < minDimension) return true;

  const area = pixelArea(width, height);
  if (area !== undefined && area < MIN_AREA) return true;

  return false;
}

export function isProductNoiseUrl(url: string): boolean {
  if (isSegmentNoiseUrl(url)) return true;
  if (isTinyImageUrl(url)) return true;
  return false;
}
