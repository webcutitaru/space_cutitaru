import { NextResponse } from "next/server";
import { notifyVisit } from "@/lib/visit-ping/notify";

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
  let body: {
    path?: unknown;
    referrer?: unknown;
    lang?: unknown;
    tz?: unknown;
    screen?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const text = (value: unknown) => (typeof value === "string" ? value : "");

  void notifyVisit({
    path: text(body.path),
    referrer: text(body.referrer),
    lang: text(body.lang),
    tz: text(body.tz),
    screen: text(body.screen),
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
  }).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
