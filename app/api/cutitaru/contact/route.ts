import { NextResponse } from "next/server";
import { verifyCsrfToken } from "@/lib/cutitaru/csrf";
import { clientIp, validateContact } from "@/lib/cutitaru/contact";
import { appendSubmission, contactRateAllowed } from "@/lib/cutitaru/rate-limit";
import { telegramNotifyContact } from "@/lib/cutitaru/telegram";

export async function POST(request: Request) {
  const secret = process.env.CONTACT_CSRF_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Contact not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const honeypot = String(raw.website ?? "").trim();
  if (honeypot) {
    return NextResponse.json({ ok: true, redirect: String(raw.returnTo ?? "/cutitaru") + "?sent=1#contact" });
  }

  const csrfTs = Number(raw.csrfTs ?? 0);
  const csrfToken = String(raw.csrfToken ?? "");
  if (!verifyCsrfToken(secret, csrfTs, csrfToken)) {
    return NextResponse.json({ ok: false, error: "Invalid token." }, { status: 403 });
  }

  const ip = clientIp(request);
  if (!contactRateAllowed(ip)) {
    return NextResponse.json({ ok: false, error: "Rate limit." }, { status: 429 });
  }

  const validation = validateContact(body);
  if (!validation.ok || !validation.data) {
    return NextResponse.json({ ok: false, errors: validation.errors }, { status: 400 });
  }

  const entry = {
    ts: new Date().toISOString(),
    ...validation.data,
    city: validation.data.city ?? "",
    phone: validation.data.phone ?? "",
  };

  appendSubmission(entry as Record<string, string>);

  const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const tgChat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (tgToken && tgChat) {
    await telegramNotifyContact(tgToken, tgChat, entry);
  }

  const returnTo = String(raw.returnTo ?? "/cutitaru");
  const base = returnTo.split("#")[0] || "/cutitaru";
  return NextResponse.json({ ok: true, redirect: `${base}?sent=1#contact` });
}
