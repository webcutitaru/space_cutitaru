import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectName } from "@/lib/visit-ping/projects";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const RATE_FILE = path.join(process.cwd(), "data", "visit_notify_rate.json");

const BOT_NEEDLES = [
  "googlebot",
  "bingbot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "embedly",
  "applebot",
  "petalbot",
  "semrush",
  "ahrefs",
  "mj12bot",
  "dotbot",
  "headless",
];

export type VisitPing = {
  path: string;
  referrer: string;
  lang: string;
  tz: string;
  screen: string;
  ip: string;
  userAgent: string;
};

function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  return false;
}

function likelyBot(userAgent: string): boolean {
  const lower = userAgent.toLowerCase();
  return BOT_NEEDLES.some((needle) => lower.includes(needle));
}

function csv(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function readRates(now: number): Promise<Record<string, number>> {
  try {
    const raw = await readFile(RATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, number>;
    const fresh: Record<string, number> = {};
    for (const [key, at] of Object.entries(parsed)) {
      if (typeof at === "number" && now - at < DAY) fresh[key] = at;
    }
    return fresh;
  } catch {
    return {};
  }
}

async function writeRates(state: Record<string, number>): Promise<void> {
  await mkdir(path.dirname(RATE_FILE), { recursive: true });
  await writeFile(RATE_FILE, JSON.stringify(state));
}

async function locate(ip: string): Promise<string> {
  if (!ip || isPrivateIp(ip)) return "(unknown)";
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return "(unknown)";
    const data = (await response.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
    };
    if (!data.success) return "(unknown)";
    const parts = [data.city, data.region, data.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "(unknown)";
  } catch {
    return "(unknown)";
  }
}

export async function notifyVisit(visit: VisitPing): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!token || !chatId) return;
  if (likelyBot(visit.userAgent)) return;

  const ip = visit.ip.trim();
  if (ip && csv(process.env.VISIT_PING_IGNORE_IPS).includes(ip)) return;
  for (const fragment of csv(process.env.VISIT_PING_IGNORE_UA_SUBSTRINGS)) {
    if (fragment && visit.userAgent.toLowerCase().includes(fragment.toLowerCase())) return;
  }

  const page = clip(visit.path, 500) || "/";
  const now = Date.now();
  const rateKey = `${ip || "unknown"} ${page.split("?")[0]}`;
  const rates = await readRates(now);
  if (rates[rateKey] && now - rates[rateKey] < HOUR) return;

  const location = await locate(ip);
  const text = [
    `SPACE visit — ${new Date(now).toISOString()}`,
    "",
    `Project: ${projectName(page)}`,
    `Path: ${page}`,
    `Location: ${location}`,
    `Referrer: ${clip(visit.referrer, 500) || "—"}`,
    `Lang: ${clip(visit.lang, 40) || "—"}`,
    `TZ: ${clip(visit.tz, 80) || "—"}`,
    `Screen: ${clip(visit.screen, 40) || "—"}`,
    "",
    `User-Agent:`,
    clip(visit.userAgent, 500) || "—",
  ].join("\n");

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
  if (!response.ok) return;

  rates[rateKey] = now;
  await writeRates(rates);
}
