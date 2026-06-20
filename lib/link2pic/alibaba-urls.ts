import { parseDimensionsFromUrl, pixelArea } from "./parse-dimensions";
import { isAlibabaBannerUrl } from "./alibaba-baxia";

const ALIBABA_PRODUCT_RE =
  /(?:\/kf\/|\/ibank\/|\/imgextra\/|_!!|O1CN[A-Za-z0-9]+)/i;

const ALIBABA_NOISE_RES: RegExp[] = [
  /\.(?:js|css|json|woff2?|ttf)(?:\?|$)/i,
  /\/tps\/[^"'\s]*(?:-\d{1,3}-\d{1,3}|_\d{1,3}x\d{1,3})/i,
  /(?:favicon|sprite|\/icon\/|icon_\d)/i,
  /\/(?:logo|badge|payment|social|banner|promo|widget)\//i,
  /_(\d{1,2})x(\d{1,2})(?:[._q]|\.)/i,
];

export function isAlibabaProductUrl(url: string): boolean {
  return ALIBABA_PRODUCT_RE.test(url);
}

export function isAlibabaNoiseUrl(url: string): boolean {
  if (isAlibabaBannerUrl(url)) return true;

  for (const pattern of ALIBABA_NOISE_RES) {
    if (pattern.test(url)) return true;
  }
  return false;
}

export function alibabaDedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;

    path = path.replace(/_\d{1,4}x\d{1,4}(?:q\d+)?(?=\.[a-z]+$)/i, "");
    path = path.replace(/-tps-\d{1,4}-\d{1,4}(?=\.[a-z]+$)/i, "");
    path = path.replace(/-\d{1,4}-\d{1,4}(?=\.[a-z]+$)/i, "");

    const ocnMatch = path.match(/(O1CN[A-Za-z0-9]+)/i);
    if (ocnMatch) return ocnMatch[1]!.toLowerCase();

    return `${parsed.hostname}${path}`.toLowerCase();
  } catch {
    return url.split("?")[0]?.toLowerCase() ?? url.toLowerCase();
  }
}

export function alibabaUrlScore(url: string): number {
  let score = 0;

  if (isAlibabaProductUrl(url)) score += 100;
  if (/\/kf\//i.test(url)) score += 40;
  if (/\/ibank\//i.test(url)) score += 35;
  if (/\/imgextra\//i.test(url)) score += 30;
  if (/_!!/i.test(url)) score += 20;
  if (/O1CN/i.test(url)) score += 15;

  if (isAlibabaNoiseUrl(url)) score -= 200;
  if (/\/tps\//i.test(url)) score -= 80;

  const { width, height } = parseDimensionsFromUrl(url);
  const area = pixelArea(width, height);
  if (area) score += Math.min(area / 1000, 100);

  return score;
}

export function pickBestAlibabaVariant(
  current: string,
  candidate: string,
): string {
  const currentScore = alibabaUrlScore(current);
  const candidateScore = alibabaUrlScore(candidate);
  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  const currentArea =
    pixelArea(
      parseDimensionsFromUrl(current).width,
      parseDimensionsFromUrl(current).height,
    ) ?? 0;
  const candidateArea =
    pixelArea(
      parseDimensionsFromUrl(candidate).width,
      parseDimensionsFromUrl(candidate).height,
    ) ?? 0;

  return candidateArea >= currentArea ? candidate : current;
}
