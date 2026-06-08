import type { PresetKey } from "./presets";
import { getPresetParams } from "./presets";
import type { ConvertResult } from "./types";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "./types";

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return "Only JPEG and PNG images are supported.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File exceeds 20 MB limit.";
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("WebP conversion failed in browser."));
      },
      "image/webp",
      quality / 100,
    );
  });
}

function scaledDimensions(
  width: number,
  height: number,
  maxWidth: number,
): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.round(height * ratio),
  };
}

export async function convertClient(
  file: File,
  preset: PresetKey,
): Promise<ConvertResult> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const { quality, maxWidth } = getPresetParams(preset);
  const img = await loadImage(file);
  const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, maxWidth);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  ctx.drawImage(img, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, quality);

  return {
    blob,
    originalSize: file.size,
    optimizedSize: blob.size,
    width,
    height,
  };
}
