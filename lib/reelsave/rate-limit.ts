const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const buckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    throw new Error("Too many requests. Please wait a minute and try again.");
  }

  entry.count += 1;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
