import { validateThumbnailUrl } from "@/lib/reelsave/validate-url";
import { MAX_THUMBNAIL_BYTES, USER_AGENT } from "@/lib/reelsave/types";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Thumbnail URL is required." },
        { status: 400 },
      );
    }

    const thumbUrl = validateThumbnailUrl(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(thumbUrl.href, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch thumbnail: ${response.status}` },
          { status: 502 },
        );
      }

      const contentLength = response.headers.get("content-length");
      if (
        contentLength &&
        Number.parseInt(contentLength, 10) > MAX_THUMBNAIL_BYTES
      ) {
        return NextResponse.json(
          { error: "Thumbnail exceeds size limit (5 MB)." },
          { status: 413 },
        );
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_THUMBNAIL_BYTES) {
        return NextResponse.json(
          { error: "Thumbnail exceeds size limit (5 MB)." },
          { status: 413 },
        );
      }

      const contentType =
        response.headers.get("content-type") ?? "image/jpeg";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch thumbnail.";

    const status = message.includes("not allowed") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
