import sharp from "sharp";
import type { PresetKey } from "./presets";
import { getPresetParams } from "./presets";

export async function convertServer(
  buffer: Buffer,
  preset: PresetKey,
): Promise<Buffer> {
  const { quality, maxWidth } = getPresetParams(preset);

  return sharp(buffer)
    .rotate()
    .resize(maxWidth, null, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

export function webpFilename(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.webp`;
}
