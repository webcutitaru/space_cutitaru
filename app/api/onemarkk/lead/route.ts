import { NextResponse } from "next/server";
import { normalizeEmail, notifyLead, signDownload } from "@/lib/onemarkk/gate";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "";
  return "";
}

export async function POST(request: Request) {
  let body: { email?: unknown; referrer?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
  if (!email) return NextResponse.json({ error: "email" }, { status: 400 });

  const referrer = typeof body.referrer === "string" ? body.referrer : "";
  const result = await notifyLead({ email, ip: clientIp(request), referrer });

  if (result === "limited") return NextResponse.json({ error: "limited" }, { status: 429 });
  if (result === "unconfigured" || result === "failed") {
    return NextResponse.json({ error: "notify" }, { status: 503 });
  }

  return NextResponse.json({ token: signDownload(email) });
}
