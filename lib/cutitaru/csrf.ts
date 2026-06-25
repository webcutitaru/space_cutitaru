import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function createCsrfToken(secret: string, timestamp: number): string {
  return createHmac("sha256", secret).update(String(timestamp)).digest("hex");
}

export function verifyCsrfToken(
  secret: string,
  timestamp: number,
  token: string,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !token || timestamp <= 0) return false;
  if (now - timestamp > 3600 || timestamp - now > 60) return false;

  const expected = createCsrfToken(secret, timestamp);
  if (expected.length !== token.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function newCsrfPayload(secret: string): { csrfTs: number; csrfToken: string } {
  const csrfTs = Math.floor(Date.now() / 1000);
  return { csrfTs, csrfToken: createCsrfToken(secret, csrfTs) };
}

export function randomHoneypotName(): string {
  return `website_${randomBytes(4).toString("hex")}`;
}
