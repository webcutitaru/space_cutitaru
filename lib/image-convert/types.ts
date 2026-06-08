import type { PresetKey } from "./presets";

export type JobStatus = "pending" | "previewing" | "ready" | "exporting" | "error";

export type ConvertResult = {
  blob: Blob;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
};

export type ConvertJob = {
  id: string;
  file: File;
  status: JobStatus;
  error?: string;
  previewUrl?: string;
  preview?: ConvertResult;
  preset: PresetKey;
};

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
export const PRESET_STORAGE_KEY = "space_img_preset";
