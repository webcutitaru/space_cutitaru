export function parseDimensionsFromUrl(url: string): {
  width?: number;
  height?: number;
} {
  const lower = url.toLowerCase();

  const tps = lower.match(/-tps-(\d{1,5})-(\d{1,5})(?:\.|$)/);
  if (tps) {
    return {
      width: Number.parseInt(tps[1]!, 10),
      height: Number.parseInt(tps[2]!, 10),
    };
  }

  const wxh = lower.match(/[_\/.-](\d{2,5})x(\d{2,5})(?:[._/]|$)/);
  if (wxh) {
    return {
      width: Number.parseInt(wxh[1]!, 10),
      height: Number.parseInt(wxh[2]!, 10),
    };
  }

  try {
    const parsed = new URL(url);
    const width =
      parsed.searchParams.get("width") ??
      parsed.searchParams.get("w") ??
      parsed.searchParams.get("imageWidth");
    const height =
      parsed.searchParams.get("height") ??
      parsed.searchParams.get("h") ??
      parsed.searchParams.get("imageHeight");

    if (width || height) {
      return {
        width: width ? Number.parseInt(width, 10) : undefined,
        height: height ? Number.parseInt(height, 10) : undefined,
      };
    }
  } catch {
    /* ignore */
  }

  const singleDim = lower.match(/(?:[?&](?:w|width)=)(\d{2,5})/);
  if (singleDim) {
    const w = Number.parseInt(singleDim[1]!, 10);
    return { width: w, height: w };
  }

  return {};
}

export function pixelArea(
  width?: number,
  height?: number,
): number | undefined {
  if (!width || !height) return undefined;
  return width * height;
}
