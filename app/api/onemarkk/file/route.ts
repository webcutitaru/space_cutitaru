import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { verifyDownload, zipPath } from "@/lib/onemarkk/gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!verifyDownload(token)) return NextResponse.json({ error: "token" }, { status: 401 });

  try {
    const bytes = await readFile(zipPath());
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="onemarkk-pro-v1.5.0.zip"',
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "file" }, { status: 404 });
  }
}
