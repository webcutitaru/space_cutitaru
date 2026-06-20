import {
  filenameFromUrl,
  validateProxyUrl,
} from "@/lib/link2pic/download";
import { MAX_PROXY_BYTES, USER_AGENT } from "@/lib/link2pic/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Image URL is required." },
        { status: 400 },
      );
    }

    const imageUrl = validateProxyUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(imageUrl.href, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image: ${response.status}` },
          { status: 502 },
        );
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && Number.parseInt(contentLength, 10) > MAX_PROXY_BYTES) {
        return NextResponse.json(
          { error: "Image exceeds size limit (15 MB)." },
          { status: 413 },
        );
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_PROXY_BYTES) {
        return NextResponse.json(
          { error: "Image exceeds size limit (15 MB)." },
          { status: 413 },
        );
      }

      const contentType =
        response.headers.get("content-type") ?? "application/octet-stream";
      const filename = filenameFromUrl(imageUrl, contentType);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to proxy image.";

    const status = message.includes("not allowed") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
