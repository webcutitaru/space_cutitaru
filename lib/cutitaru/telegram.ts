import type { ContactPayload } from "./contact";

export async function telegramNotifyContact(
  botToken: string,
  chatId: string,
  entry: ContactPayload & { ts: string },
): Promise<void> {
  let body = entry.message;
  if (body.length > 3500) body = `${body.slice(0, 3500)}\n…(truncated)`;

  const phoneLine = entry.phone?.trim() ? entry.phone.trim() : "—";
  let text =
    `New contact — ${entry.ts}\n\n` +
    `Name: ${entry.name}\n` +
    `Email: ${entry.email}\n` +
    `Phone: ${phoneLine}\n\n` +
    `Message:\n${body}`;

  if (text.length > 4096) text = `${text.slice(0, 4090)}\n…`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const params = new URLSearchParams({
    chat_id: chatId,
    text,
    disable_web_page_preview: "1",
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("telegram_notify: HTTP", res.status);
    }
  } catch (err) {
    console.error("telegram_notify:", err);
  }
}
