import { extractStoreReviews } from "@/lib/reviews/extract-reviews";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { storeUrl?: string };

    if (!body.storeUrl?.trim()) {
      return NextResponse.json(
        { error: "Store URL is required." },
        { status: 400 },
      );
    }

    const result = await extractStoreReviews(body.storeUrl);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract reviews.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
