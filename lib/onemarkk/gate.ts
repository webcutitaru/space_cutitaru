import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HOUR = 60 * 60 * 1000;
const TOKEN_TTL = 30 * 60 * 1000;
const IP_CAP = 30;
const RATE_FILE = path.join(process.cwd(), "data", "onemarkk_leads.json");

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

type Rates = {
  emails: Record<string, number>;
  ips: Record<string, number[]>;
};

export function zipPath(): string {
  return path.join(process.cwd(), "private", "onemarkk-pro-v1.5.0.zip");
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!EMAIL.test(email)) return null;
  return email;
}

function secret(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function signDownload(email: string, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("Telegram is not configured");
  const payload = Buffer.from(JSON.stringify({ email, exp: now + TOKEN_TTL })).toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyDownload(token: string, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown;
      exp?: unknown;
    };
    if (typeof data.email !== "string" || typeof data.exp !== "number" || data.exp < now) return null;
    return data.email;
  } catch {
    return null;
  }
}

async function readRates(now: number): Promise<Rates> {
  try {
    const raw = await readFile(RATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Rates>;
    const emails: Record<string, number> = {};
    for (const [key, at] of Object.entries(parsed.emails ?? {})) {
      if (typeof at === "number" && now - at < HOUR) emails[key] = at;
    }
    const ips: Record<string, number[]> = {};
    for (const [key, stamps] of Object.entries(parsed.ips ?? {})) {
      if (!Array.isArray(stamps)) continue;
      const fresh = stamps.filter((at) => typeof at === "number" && now - at < HOUR);
      if (fresh.length) ips[key] = fresh;
    }
    return { emails, ips };
  } catch {
    return { emails: {}, ips: {} };
  }
}

async function writeRates(state: Rates): Promise<void> {
  await mkdir(path.dirname(RATE_FILE), { recursive: true });
  await writeFile(RATE_FILE, JSON.stringify(state));
}

function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export async function notifyLead(input: {
  email: string;
  ip: string;
  referrer: string;
}): Promise<"sent" | "skipped" | "failed" | "unconfigured" | "limited"> {
  const token = secret();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!token || !chatId) return "unconfigured";

  const now = Date.now();
  const rates = await readRates(now);
  if (rates.emails[input.email] && now - rates.emails[input.email] < HOUR) return "skipped";

  const ip = input.ip.trim();
  if (ip) {
    const stamps = rates.ips[ip] ?? [];
    if (stamps.length >= IP_CAP) return "limited";
  }

  const text = [
    `OneMarkk lead — ${new Date(now).toISOString()}`,
    "",
    `Email: ${input.email}`,
    `IP: ${ip || "—"}`,
    `Referrer: ${clip(input.referrer, 500) || "—"}`,
  ].join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        chat_id: chatId,
        text: text.slice(0, 4090),
        disable_web_page_preview: "1",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "failed";
  } catch {
    return "failed";
  }

  rates.emails[input.email] = now;
  if (ip) rates.ips[ip] = [...(rates.ips[ip] ?? []), now];
  await writeRates(rates);
  return "sent";
}
