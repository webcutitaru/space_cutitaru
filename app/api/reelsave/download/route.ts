import { Readable } from "node:stream";
import { validatePageUrl } from "@/lib/reelsave/validate-url";
import { streamVideoDownload } from "@/lib/reelsave/ytdlp";
import { checkRateLimit, clientIp } from "@/lib/reelsave/rate-limit";
import { MAX_DOWNLOAD_BYTES } from "@/lib/reelsave/types";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    checkRateLimit(`download:${clientIp(request)}`);

    const { searchParams } = new URL(request.url);
    const pageUrl = searchParams.get("pageUrl");
    const formatId = searchParams.get("formatId");

    if (!pageUrl?.trim()) {
      return NextResponse.json(
        { error: "Video URL is required." },
        { status: 400 },
      );
    }

    if (!formatId?.trim()) {
      return NextResponse.json(
        { error: "Format ID is required." },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_+.-]+$/.test(formatId)) {
      return NextResponse.json(
        { error: "Invalid format ID." },
        { status: 400 },
      );
    }

    const { url } = validatePageUrl(pageUrl);
    const { stream, kill } = streamVideoDownload(url.href, formatId);

    let bytesSent = 0;
    const nodeStream = stream as Readable;

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          bytesSent += chunk.length;
          if (bytesSent > MAX_DOWNLOAD_BYTES) {
            kill();
            controller.error(new Error("Video exceeds size limit (200 MB)."));
            return;
          }
          controller.enqueue(new Uint8Array(chunk));
        });

        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => {
          kill();
          controller.error(err);
        });
      },
      cancel() {
        kill();
      },
    });

    const filename = searchParams.get("filename") ?? "video.mp4";
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const isPreview = searchParams.get("preview") === "1";
    const disposition = isPreview
      ? "inline"
      : `attachment; filename="${safeFilename}"`;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
        "Accept-Ranges": "none",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download video.";

    const status = message.includes("Too many requests")
      ? 429
      : message.includes("not supported") ||
          message.includes("required") ||
          message.includes("Invalid")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
