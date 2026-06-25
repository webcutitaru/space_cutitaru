import { NextResponse } from "next/server";
import { newCsrfPayload } from "@/lib/cutitaru/csrf";

export async function GET() {
  const secret = process.env.CONTACT_CSRF_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Contact not configured." }, { status: 503 });
  }

  const payload = newCsrfPayload(secret);
  return NextResponse.json(payload);
}
