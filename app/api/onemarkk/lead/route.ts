import { NextResponse } from "next/server";
import { normalizeEmail, reserveLead, signDownload } from "@/lib/onemarkk/gate";
import { clientIp, hasHumanSignals, isAutomated } from "@/lib/telegram/visitor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    email?: unknown;
    referrer?: unknown;
    lang?: unknown;
    tz?: unknown;
    screen?: unknown;
    touch?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
  if (!email) return NextResponse.json({ error: "email" }, { status: 400 });

  const userAgent = request.headers.get("user-agent") ?? "";
  const lang = typeof body.lang === "string" ? body.lang : "";
  const tz = typeof body.tz === "string" ? body.tz : "";
  const screen = typeof body.screen === "string" ? body.screen : "";
  if (isAutomated(userAgent) || !hasHumanSignals({ lang, tz, screen })) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }

  const gate = await reserveLead(clientIp(request));
  if (gate === "limited") return NextResponse.json({ error: "limited" }, { status: 429 });
  if (gate === "unconfigured") return NextResponse.json({ error: "notify" }, { status: 503 });

  const touch = typeof body.touch === "number" && Number.isFinite(body.touch) ? body.touch : 0;
  return NextResponse.json({
    token: signDownload({
      email,
      referrer: typeof body.referrer === "string" ? body.referrer : "",
      lang,
      tz,
      screen,
      touch,
    }),
  });
}
