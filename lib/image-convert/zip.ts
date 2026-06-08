import JSZip from "jszip";

export type ZipEntry = {
  name: string;
  blob: Blob;
};

export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  await Promise.all(
    entries.map(async (entry) => {
      const data = await entry.blob.arrayBuffer();
      zip.file(entry.name, data);
    }),
  );
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function webpFilename(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.webp`;
}
