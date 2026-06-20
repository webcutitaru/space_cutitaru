import { fetchImageMeta } from "@/lib/link2pic/enrich-metadata";
import { NextResponse } from "next/server";

export const maxDuration = 30;

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

    const meta = await fetchImageMeta(rawUrl);
    return NextResponse.json(meta);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch image metadata.";

    const status = message.includes("not allowed") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
