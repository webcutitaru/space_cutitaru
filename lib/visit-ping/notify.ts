import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectName } from "@/lib/visit-ping/projects";
import {
  lookupPlace,
  rejectVisit,
  sendTelegram,
  telegramConfigured,
  visitMessage,
} from "@/lib/telegram/visitor";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const RATE_FILE = path.join(process.cwd(), "data", "visit_notify_rate.json");

export type VisitPing = {
  path: string;
  referrer: string;
  lang: string;
  tz: string;
  screen: string;
  touch: number;
  webdriver: boolean;
  prefetch: boolean;
  ip: string;
  userAgent: string;
};

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

let rateQueue: Promise<unknown> = Promise.resolve();

function withRates<T>(task: (rates: Record<string, number>, now: number) => Promise<T>): Promise<T> {
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

export async function notifyVisit(visit: VisitPing): Promise<void> {
  if (!telegramConfigured()) return;
  if (rejectVisit(visit)) return;

  const ip = visit.ip.trim();
  if (csv(process.env.VISIT_PING_IGNORE_IPS).includes(ip)) return;
  for (const fragment of csv(process.env.VISIT_PING_IGNORE_UA_SUBSTRINGS)) {
    if (fragment && visit.userAgent.toLowerCase().includes(fragment.toLowerCase())) return;
  }

  const page = visit.path.trim() || "/";
  const rateKey = `${ip} ${page.split("?")[0]}`;
  const claimed = await withRates(async (rates, now) => {
    if (rates[rateKey] && now - rates[rateKey] < HOUR) return 0;
    rates[rateKey] = now;
    await writeRates(rates);
    return now;
  });
  if (!claimed) return;

  const place = await lookupPlace(ip);
  if (place.hosting) return;

  const sent = await sendTelegram(
    visitMessage({
      project: projectName(page),
      path: page,
      referrer: visit.referrer,
      lang: visit.lang,
      tz: visit.tz,
      screen: visit.screen,
      ip,
      userAgent: visit.userAgent,
      touch: visit.touch,
      place,
      now: claimed,
    }),
  );
  if (sent) return;

  await withRates(async (rates) => {
    if (rates[rateKey] === claimed) {
      delete rates[rateKey];
      await writeRates(rates);
    }
  });
}
