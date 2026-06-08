export const PRESETS = {
  smaller: {
    quality: 72,
    maxWidth: 1200,
    label: "Smallest files",
    meta: "Strong compression · WebP ~72 · max width 1200px",
  },
  balanced: {
    quality: 85,
    maxWidth: 1800,
    label: "Balanced",
    meta: "Good quality & size · WebP ~85 · max width 1800px",
    recommended: true,
  },
  higher: {
    quality: 92,
    maxWidth: 2400,
    label: "Best quality",
    meta: "Larger files, sharper detail · WebP ~92 · max width 2400px",
  },
} as const;

export type PresetKey = keyof typeof PRESETS;
export const DEFAULT_PRESET: PresetKey = "balanced";

export function isPresetKey(value: string): value is PresetKey {
  return value in PRESETS;
}

export function getPresetParams(preset: PresetKey) {
  const { quality, maxWidth } = PRESETS[preset];
  return { quality, maxWidth };
}
