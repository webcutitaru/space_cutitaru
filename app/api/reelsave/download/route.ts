import { Readable } from "node:stream";
import { peekCookieTicket } from "@/lib/reelsave/cookie-tickets";
import { resolveCookiesFile } from "@/lib/reelsave/cookies";
import { validatePageUrl } from "@/lib/reelsave/validate-url";
import { streamVideoDownload } from "@/lib/reelsave/ytdlp";
import { checkRateLimit, clientIp } from "@/lib/reelsave/rate-limit";
import { MAX_DOWNLOAD_BYTES } from "@/lib/reelsave/types";
import { NextResponse } from "next/server";

export const maxDuration = 120;

type DownloadParams = {
  pageUrl: string;
  formatId: string;
  filename?: string;
  preview?: boolean;
  cookies?: string | null;
  cookieTicket?: string | null;
};

function parseFormatId(formatId: string): string | null {
  if (!formatId.trim()) return null;
  if (!/^[a-zA-Z0-9_+.-]+$/.test(formatId)) return null;
  return formatId;
}

async function handleDownload(params: DownloadParams): Promise<Response> {
  const formatId = parseFormatId(params.formatId);
  if (!params.pageUrl.trim()) {
    return NextResponse.json(
      { error: "Video URL is required." },
      { status: 400 },
    );
  }
  if (!formatId) {
    return NextResponse.json(
      { error: params.formatId.trim() ? "Invalid format ID." : "Format ID is required." },
      { status: 400 },
    );
  }

  const { url, platform } = validatePageUrl(params.pageUrl);
  const ticketCookies =
    platform === "instagram" ? peekCookieTicket(params.cookieTicket) : null;
  const cookieHeader =
    platform === "instagram"
      ? params.cookies?.trim() || ticketCookies
      : null;
  const { path: cookiesPath, cleanup } = await resolveCookiesFile(cookieHeader);

  let killRef: (() => void) | null = null;

  try {
    const { stream, kill } = streamVideoDownload(
      url.href,
      formatId,
      cookiesPath,
    );
    killRef = kill;

    let bytesSent = 0;
    const nodeStream = stream as Readable;
    let cleaned = false;
    const runCleanup = () => {
      if (cleaned) return;
      cleaned = true;
      void cleanup();
    };

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => {
          bytesSent += chunk.length;
          if (bytesSent > MAX_DOWNLOAD_BYTES) {
            kill();
            runCleanup();
            controller.error(new Error("Video exceeds size limit (200 MB)."));
            return;
          }
          controller.enqueue(new Uint8Array(chunk));
        });

        nodeStream.on("end", () => {
          runCleanup();
          controller.close();
        });
        nodeStream.on("error", (err) => {
          kill();
          runCleanup();
          controller.error(err);
        });
      },
      cancel() {
        kill();
        runCleanup();
      },
    });

    const filename = params.filename ?? "video.mp4";
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const disposition = params.preview
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
    killRef?.();
    await cleanup();
    throw error;
  }
}

function errorResponse(error: unknown): NextResponse {
  const message =
    error instanceof Error ? error.message : "Failed to download video.";

  const status = message.includes("Too many requests")
    ? 429
    : message.includes("not supported") ||
        message.includes("required") ||
        message.includes("Invalid") ||
        message.includes("too large")
      ? 400
      : 500;

  return NextResponse.json({ error: message }, { status });
}

/** GET — no request-body cookies (uses YTDLP_COOKIES_FILE if set). */
export async function GET(request: Request) {
  try {
    checkRateLimit(`download:${clientIp(request)}`);
    const { searchParams } = new URL(request.url);
    return await handleDownload({
      pageUrl: searchParams.get("pageUrl") ?? "",
      formatId: searchParams.get("formatId") ?? "",
      filename: searchParams.get("filename") ?? undefined,
      preview: searchParams.get("preview") === "1",
      cookies: request.headers.get("x-reelsave-cookies"),
      cookieTicket: searchParams.get("cookieTicket"),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST — cookies in JSON body (extension / authenticated Instagram). */
export async function POST(request: Request) {
  try {
    checkRateLimit(`download:${clientIp(request)}`);
    const body = (await request.json()) as {
      pageUrl?: string;
      formatId?: string;
      filename?: string;
      preview?: boolean;
      cookies?: string;
      cookieTicket?: string;
    };
    return await handleDownload({
      pageUrl: body.pageUrl ?? "",
      formatId: body.formatId ?? "",
      filename: body.filename,
      preview: body.preview === true,
      cookies:
        typeof body.cookies === "string" && body.cookies.trim()
          ? body.cookies
          : request.headers.get("x-reelsave-cookies"),
      cookieTicket: body.cookieTicket,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
