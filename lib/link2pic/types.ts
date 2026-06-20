export type Platform = "shopify" | "alibaba" | "generic";

export type ImageSource = "json" | "html" | "meta" | "json-ld";

export type ExtractedImage = {
  id: string;
  url: string;
  filename: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  source: ImageSource;
  sortIndex?: number;
};

export type ExtractorOutput = {
  title?: string;
  images: ExtractedImage[];
  html?: string;
  warnings: string[];
};

export type ExtractResult = {
  pageUrl: string;
  platform: Platform;
  title?: string;
  productImages: ExtractedImage[];
  pageImages: ExtractedImage[];
  warnings?: string[];
  meta: {
    durationMs: number;
  };
};

export const MAX_IMAGES = 80;
export const MAX_PAGE_IMAGES = 40;

export const MAX_PROXY_BYTES = 15 * 1024 * 1024;

export const USER_AGENT = "SPACE-Link2Pic/1.0";
