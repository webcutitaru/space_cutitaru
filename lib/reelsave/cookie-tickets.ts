import { randomUUID } from "node:crypto";

type Ticket = {
  cookies: string;
  expiresAt: number;
};

const TTL_MS = 5 * 60_000;
const tickets = new Map<string, Ticket>();

function prune() {
  const now = Date.now();
  for (const [id, ticket] of tickets) {
    if (ticket.expiresAt <= now) tickets.delete(id);
  }
}

/** Store Instagram cookies for a short window so GET download can use them. */
export function createCookieTicket(cookies: string): string {
  prune();
  const id = randomUUID();
  tickets.set(id, {
    cookies,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

/** Read cookies for a ticket without consuming (download may retry). */
export function peekCookieTicket(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  prune();
  const ticket = tickets.get(id.trim());
  if (!ticket) return null;
  if (ticket.expiresAt <= Date.now()) {
    tickets.delete(id.trim());
    return null;
  }
  return ticket.cookies;
}
