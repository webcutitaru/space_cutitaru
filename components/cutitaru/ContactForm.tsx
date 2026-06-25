"use client";

import { useEffect, useState } from "react";
import type { HomeContent } from "@/lib/cutitaru/types";
import { homePath } from "@/lib/cutitaru/i18n";
import type { Locale } from "@/lib/cutitaru/types";

type Props = {
  locale: Locale;
  content: HomeContent;
};

export function ContactForm({ locale, content }: Props) {
  const [csrfTs, setCsrfTs] = useState(0);
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/cutitaru/contact-token")
      .then((r) => r.json())
      .then((d: { csrfTs: number; csrfToken: string }) => {
        setCsrfTs(d.csrfTs);
        setCsrfToken(d.csrfToken);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrors([]);

    const clientErrors: string[] = [];
    if (!name.trim()) clientErrors.push(content.val_name);
    if (!email.trim()) clientErrors.push(content.val_email);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) clientErrors.push(content.val_email_bad);
    if (!message.trim()) clientErrors.push(content.val_message);

    if (clientErrors.length) {
      setErrors(clientErrors);
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/cutitaru/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          city,
          message,
          csrfTs,
          csrfToken,
          returnTo: `${homePath(locale)}#contact`,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; redirect?: string };
      if (data.ok && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      setErrors([content.toast_err]);
      setStatus("error");
    } catch {
      setErrors([content.toast_err]);
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="letter-section bg-[var(--color-paper-white)]" data-nav-theme="light">
      <div className="letter-container max-w-xl">
        <p className="text-caption mb-4 uppercase tracking-widest text-[var(--color-fog-gray)]">
          {content.contact_eyebrow}
        </p>
        <h2 className="font-display text-heading mb-4">{content.contact_h2}</h2>
        <p className="text-body mb-8">{content.contact_lead}</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="text-caption mb-1 block">
              {content.form_name}
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper-white)] px-3 py-3 text-[var(--color-vault-ink)] outline-none focus:border-[var(--color-deep-teal)]"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-caption mb-1 block">
              {content.form_email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-paper-white)] px-3 py-3 outline-none focus:border-[var(--color-deep-teal)]"
              autoComplete="email"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="text-caption mb-1 block">
                {content.form_phone}
              </label>
              <input
                id="phone"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-3 py-3 outline-none focus:border-[var(--color-deep-teal)]"
                autoComplete="tel"
              />
            </div>
            <div>
              <label htmlFor="city" className="text-caption mb-1 block">
                {content.form_city}
              </label>
              <input
                id="city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-3 py-3 outline-none focus:border-[var(--color-deep-teal)]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="message" className="text-caption mb-1 block">
              {content.form_message}
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-hairline)] px-3 py-3 outline-none focus:border-[var(--color-deep-teal)]"
            />
          </div>

          {errors.length > 0 && (
            <ul className="text-caption text-red-700" role="alert">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-letter btn-teal disabled:opacity-50"
          >
            {content.form_send}
          </button>
        </form>
      </div>
    </section>
  );
}
