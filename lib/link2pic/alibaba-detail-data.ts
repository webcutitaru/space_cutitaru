import { extractJsonBlob } from "./alibaba-json-blob";

type MediaItem = {
  type?: string;
  imageUrl?: {
    big?: string;
    normal?: string;
    small?: string;
  };
};

type DetailData = {
  globalData?: {
    product?: {
      subject?: string;
      mediaItems?: MediaItem[];
    };
  };
};

export function parseDetailDataFromHtml(html: string): DetailData | undefined {
  const data = extractJsonBlob(html, /window\.detailData\s*=\s*(\{)/);
  if (!data || typeof data !== "object") return undefined;
  return data as DetailData;
}

export function extractGalleryFromDetailData(detailData: DetailData): {
  title?: string;
  images: string[];
} {
  const product = detailData.globalData?.product;
  const images: string[] = [];

  for (const item of product?.mediaItems ?? []) {
    if (item.type !== "image") continue;

    const url =
      item.imageUrl?.big ??
      item.imageUrl?.normal ??
      item.imageUrl?.small ??
      "";

    if (url && !images.includes(url)) images.push(url);
  }

  return {
    title: product?.subject,
    images,
  };
}

export function extractGalleryFromHtml(html: string): {
  title?: string;
  images: string[];
} {
  const detailData = parseDetailDataFromHtml(html);
  if (!detailData) return { images: [] };
  return extractGalleryFromDetailData(detailData);
}
