import { extractVideo } from "@/lib/reelsave/extract-video";
import { checkRateLimit, clientIp } from "@/lib/reelsave/rate-limit";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    checkRateLimit(`extract:${clientIp(request)}`);

    const body = (await request.json()) as { pageUrl?: string };

    if (!body.pageUrl?.trim()) {
      return NextResponse.json(
        { error: "Video URL is required." },
        { status: 400 },
      );
    }

    const result = await extractVideo(body.pageUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract video.";

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
