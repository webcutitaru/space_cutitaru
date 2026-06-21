export function downloadUrl(pageUrl: string, formatId: string): string {
  const params = new URLSearchParams({
    pageUrl,
    formatId,
  });
  return `/api/reelsave/download?${params.toString()}`;
}

export function thumbnailProxyUrl(thumbnailUrl: string): string {
  return `/api/reelsave/thumbnail?url=${encodeURIComponent(thumbnailUrl)}`;
}

export async function triggerDownload(
  pageUrl: string,
  formatId: string,
  filename: string,
): Promise<void> {
  const url = downloadUrl(pageUrl, formatId);
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Download failed.",
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
