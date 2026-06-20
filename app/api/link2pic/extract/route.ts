import { extractPageImages } from "@/lib/link2pic/extract-images";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pageUrl?: string };

    if (!body.pageUrl?.trim()) {
      return NextResponse.json(
        { error: "Page URL is required." },
        { status: 400 },
      );
    }

    const result = await extractPageImages(body.pageUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract images.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
