import { readFile } from "node:fs/promises";
import { after, NextResponse } from "next/server";
import { notifyDownload, verifyDownload, zipPath } from "@/lib/onemarkk/gate";
import { clientIp } from "@/lib/telegram/visitor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ticket = verifyDownload(token);
  if (!ticket) return NextResponse.json({ error: "token" }, { status: 401 });

  const bytes = await readFile(zipPath()).catch(() => null);
  if (!bytes) return NextResponse.json({ error: "file" }, { status: 404 });

  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";
  after(() => notifyDownload({ ...ticket, ip, userAgent }).catch(() => {}));
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="onemarkk-pro-v1.5.0.zip"',
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
