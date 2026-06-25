import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type RateState = Record<string, number[]>;

const RATE_FILE = join(process.cwd(), "data", "contact-rate.json");
const MAX_PER_HOUR = 5;

function prune(state: RateState, now: number): RateState {
  const next: RateState = {};
  for (const [ip, times] of Object.entries(state)) {
    const filtered = times.filter((t) => now - t <= 3600);
    if (filtered.length) next[ip] = filtered;
  }
  return next;
}

export function contactRateAllowed(ip: string, now: number = Math.floor(Date.now() / 1000)): boolean {
  if (!ip) return true;

  let state: RateState = {};
  try {
    const raw = readFileSync(RATE_FILE, "utf-8");
    state = JSON.parse(raw) as RateState;
  } catch {
    state = {};
  }

  state = prune(state, now);
  const times = state[ip] ?? [];
  if (times.length >= MAX_PER_HOUR) return false;

  times.push(now);
  state[ip] = times;

  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(RATE_FILE, JSON.stringify(state), "utf-8");
  return true;
}

export function appendSubmission(entry: Record<string, string>): void {
  const file = join(process.cwd(), "data", "submissions.jsonl");
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(file, `${JSON.stringify(entry)}\n`, { flag: "a" });
}
