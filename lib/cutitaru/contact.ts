export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  message: string;
};

export type ContactValidation = {
  ok: boolean;
  errors: string[];
  data?: ContactPayload;
};

export function validateContact(body: unknown): ContactValidation {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Invalid request body."] };
  }

  const raw = body as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const phone = String(raw.phone ?? "").trim();
  const city = String(raw.city ?? "").trim();
  const message = String(raw.message ?? "").trim();

  const errors: string[] = [];
  if (!name) errors.push("Name is required.");
  if (!email) errors.push("Email is required.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email.");
  if (!message) errors.push("Message is required.");
  if (name.length > 200) errors.push("Name is too long.");
  if (message.length > 5000) errors.push("Message is too long.");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    data: {
      name,
      email,
      phone: phone || undefined,
      city: city || undefined,
      message,
    },
  };
}

export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "";
  return "";
}
