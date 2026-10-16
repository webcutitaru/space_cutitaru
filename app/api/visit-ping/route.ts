import { after, NextResponse } from "next/server";
import { notifyVisit } from "@/lib/visit-ping/notify";
import { clientIp, isPrefetch } from "@/lib/telegram/visitor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    path?: unknown;
    referrer?: unknown;
    lang?: unknown;
    tz?: unknown;
    screen?: unknown;
    touch?: unknown;
    webdriver?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const visit = {
    path: text(body.path),
    referrer: text(body.referrer),
    lang: text(body.lang),
    tz: text(body.tz),
    screen: text(body.screen),
    touch: typeof body.touch === "number" && Number.isFinite(body.touch) ? body.touch : 0,
    webdriver: body.webdriver === true,
    prefetch: isPrefetch(request),
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
  };

  after(() => notifyVisit(visit).catch(() => {}));

  return new NextResponse(null, { status: 204 });
}
