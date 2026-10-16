import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  clip,
  downloadMessage,
  isAutomated,
  isPrivateIp,
  lookupPlace,
  sendTelegram,
  telegramConfigured,
} from "@/lib/telegram/visitor";

const HOUR = 60 * 60 * 1000;
const TOKEN_TTL = 30 * 60 * 1000;
const IP_CAP = 30;
const FILE_NAME = "onemarkk-pro-v1.5.0.zip";
const RATE_FILE = path.join(process.cwd(), "data", "onemarkk_leads.json");

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

type Rates = {
  emails: Record<string, number>;
  ips: Record<string, number[]>;
};

export type DownloadTicket = {
  email: string;
  referrer: string;
  lang: string;
  tz: string;
  screen: string;
  touch: number;
};

let rateQueue: Promise<unknown> = Promise.resolve();

export function zipPath(): string {
  return path.join(process.cwd(), "private", FILE_NAME);
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

function textField(value: unknown, max: number): string {
  return typeof value === "string" ? clip(value, max) : "";
}

export function signDownload(ticket: DownloadTicket, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("Telegram is not configured");
  const payload = Buffer.from(
    JSON.stringify({
      email: ticket.email,
      exp: now + TOKEN_TTL,
      referrer: clip(ticket.referrer, 500),
      lang: clip(ticket.lang, 40),
      tz: clip(ticket.tz, 80),
      screen: clip(ticket.screen, 40),
      touch: Number.isFinite(ticket.touch) ? Math.max(0, Math.min(20, Math.round(ticket.touch))) : 0,
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyDownload(token: string, now = Date.now()): DownloadTicket | null {
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
      referrer?: unknown;
      lang?: unknown;
      tz?: unknown;
      screen?: unknown;
      touch?: unknown;
    };
    if (typeof data.email !== "string" || typeof data.exp !== "number" || data.exp < now) return null;
    const touch = typeof data.touch === "number" && Number.isFinite(data.touch) ? data.touch : 0;
    return {
      email: data.email,
      referrer: textField(data.referrer, 500),
      lang: textField(data.lang, 40),
      tz: textField(data.tz, 80),
      screen: textField(data.screen, 40),
      touch,
    };
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

function withRates<T>(task: (rates: Rates, now: number) => Promise<T>): Promise<T> {
  const run = rateQueue.then(async () => {
    const now = Date.now();
    const rates = await readRates(now);
    return task(rates, now);
  });
  rateQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function reserveLead(ip: string): Promise<"ok" | "limited" | "unconfigured"> {
  if (!telegramConfigured()) return "unconfigured";
  const clean = ip.trim();
  if (!clean || isPrivateIp(clean)) return "ok";
  return withRates(async (rates, now) => {
    const stamps = rates.ips[clean] ?? [];
    if (stamps.length >= IP_CAP) return "limited";
    rates.ips[clean] = [...stamps, now];
    await writeRates(rates);
    return "ok";
  });
}

export async function notifyDownload(input: DownloadTicket & { ip: string; userAgent: string }): Promise<void> {
  if (!telegramConfigured()) return;
  if (isAutomated(input.userAgent)) return;
  const claimed = await withRates(async (rates, now) => {
    const previous = rates.emails[input.email];
    if (typeof previous === "number" && now - previous < HOUR) return 0;
    rates.emails[input.email] = now;
    await writeRates(rates);
    return now;
  });
  if (!claimed) return;

  const place = await lookupPlace(input.ip);
  const sent = await sendTelegram(
    downloadMessage({
      email: input.email,
      fileName: FILE_NAME,
      referrer: input.referrer,
      lang: input.lang,
      tz: input.tz,
      screen: input.screen,
      ip: input.ip,
      userAgent: input.userAgent,
      touch: input.touch,
      place,
      now: claimed,
    }),
  );
  if (sent) return;

  await withRates(async (rates) => {
    if (rates.emails[input.email] === claimed) delete rates.emails[input.email];
    await writeRates(rates);
  });
}
