"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const FEATURES = [
  { name: "Anunț", detail: "Countdown, ofertă și mesaj de livrare, în bara de sus." },
  { name: "Slider", detail: "Imagini și video, cu raport portrait, pătrat sau lat." },
  { name: "Icon bar", detail: "Argumentele magazinului, pe un rând sau una sub alta." },
  { name: "Tab-uri", detail: "Text și imagine, cu un tab deschis din start." },
  { name: "Testimoniale", detail: "Poză, stele, nume și badge de verificat." },
  { name: "Întrebări", detail: "Prima întrebare deschisă, una singură activă." },
  { name: "Ticker", detail: "Text care rulează, pe mobil, pe desktop sau pe ambele." },
  { name: "Coș", detail: "Countdown, livrare gratuită, upsell și bundle." },
] as const;

const CHECK_MS = 10_000;
const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

type Phase = "idle" | "submitting" | "checking" | "ready";

function statusFor(progress: number): string {
  if (progress < 0.34) return "Se verifică formatul";
  if (progress < 0.67) return "Se verifică domeniul";
  return "Se confirmă adresa";
}

export function OneMarkkPage() {
  const reduced = useReducedMotion() ?? false;
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (phase !== "checking") return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / CHECK_MS);
      setProgress(next);
      if (next >= 1) {
        setPhase("ready");
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  async function onSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const next = email.trim().toLowerCase();
    if (!EMAIL.test(next) || next.length > 254) {
      setError("Introdu un email corect.");
      return;
    }

    setError("");
    setPhase("submitting");
    try {
      const response = await fetch("/api/onemarkk/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next, referrer: document.referrer }),
      });
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) {
        setPhase("idle");
        setError(
          data.error === "limited"
            ? "Prea multe verificări de pe rețeaua asta. Încearcă mai târziu."
            : "Verificarea nu a pornit. Încearcă din nou.",
        );
        return;
      }
      setToken(data.token);
      setProgress(0);
      setPhase("checking");
    } catch {
      setPhase("idle");
      setError("Verificarea nu a pornit. Încearcă din nou.");
    }
  }

  async function download() {
    if (!token || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(`/api/onemarkk/file?token=${encodeURIComponent(token)}`);
      if (!response.ok) throw new Error("file");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "onemarkk-pro-v1.5.0.zip";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Descărcarea nu a pornit. Verifică emailul din nou.");
    } finally {
      setDownloading(false);
    }
  }

  function reset() {
    setPhase("idle");
    setProgress(0);
    setToken("");
    setError("");
    setEmail("");
  }

  const secondsLeft = Math.max(1, Math.ceil((1 - progress) * 10));
  const locked = phase === "submitting" || phase === "checking" || phase === "ready";

  return (
    <main lang="ro" className="min-h-dvh bg-[#0c1612] text-[#f4efe6]">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <Link
          href="/"
          className="w-fit text-sm text-[#f4efe6]/55 transition-colors hover:text-[#f4efe6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c6a27a]"
        >
          SPACE
        </Link>

        <header className="mt-16 sm:mt-24">
          <div className="flex items-end justify-between gap-6">
            <h1 className="font-[family-name:var(--font-mark)] text-[clamp(3.15rem,15.5vw,10.5rem)] font-medium leading-[0.8] tracking-[-0.045em]">
              OneMarkk
            </h1>
            <p className="hidden pb-2 font-[family-name:var(--font-mark)] text-2xl text-[#f4efe6]/80 lg:block">
              Pro 1.5.0
            </p>
          </div>
          <motion.span
            aria-hidden
            className="mt-7 block h-px origin-left bg-[#c6a27a]"
            initial={reduced ? { width: 72 } : { width: 0 }}
            animate={{ width: 72 }}
            transition={reduced ? { duration: 0 } : { duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          />
          <p className="mt-8 max-w-xl font-[family-name:var(--font-mark)] text-2xl italic leading-snug text-[#f4efe6] sm:text-3xl">
            Exclusiv pentru Cursul ExperDropshipping.
          </p>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#f4efe6]/72 sm:text-lg">
            O temă Shopify pentru magazinul tău de dropshipping. O încarci, o umpli cu produse și pagina arată deja ca un magazin finit.
          </p>
          <p className="mt-4 font-[family-name:var(--font-mark)] text-xl text-[#f4efe6]/80 lg:hidden">Pro 1.5.0</p>
        </header>

        <ul className="mt-16 grid sm:mt-20 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.name} className="border-t border-[#f4efe6]/14 py-5 sm:pr-10">
              <p className="font-[family-name:var(--font-mark)] text-[1.65rem] leading-none">{feature.name}</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#f4efe6]/62">{feature.detail}</p>
            </li>
          ))}
        </ul>

        <section className="mt-16 border-t border-[#f4efe6]/14 pt-10 sm:mt-20" aria-live="polite">
          <p className="font-[family-name:var(--font-mark)] text-3xl italic leading-tight sm:text-4xl">
            Emailul trebuie să fie unul corect.
          </p>

          {phase !== "ready" ? (
            <form
              className="mt-8"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit(event);
              }}
            >
              <label htmlFor="onemarkk-email" className="sr-only">
                Email
              </label>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <input
                  id="onemarkk-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  disabled={locked}
                  value={email}
                  placeholder="nume@email.com"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  className="w-full border-0 border-b border-[#f4efe6]/28 bg-transparent py-3 text-xl text-[#f4efe6] outline-none placeholder:text-[#f4efe6]/28 focus:border-[#c6a27a] disabled:text-[#f4efe6]/50"
                />
                {phase === "idle" || phase === "submitting" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void onSubmit();
                    }}
                    disabled={phase === "submitting"}
                    className="w-full shrink-0 bg-[#f4efe6] px-8 py-4 text-base text-[#0c1612] transition-colors hover:bg-[#c6a27a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c6a27a] disabled:cursor-default disabled:bg-[#f4efe6]/40 disabled:text-[#0c1612]/50 sm:w-auto"
                  >
                    {phase === "submitting" ? "Se pornește" : "Verifică"}
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {phase === "checking" ? (
            <div className="mt-10">
              <div className="flex items-end justify-between gap-6">
                <p className="font-[family-name:var(--font-mark)] text-2xl italic sm:text-3xl">{statusFor(progress)}</p>
                <p className="font-[family-name:var(--font-mark)] text-6xl leading-none tabular-nums sm:text-7xl">
                  {secondsLeft}
                </p>
              </div>
              <div className="mt-6 h-px w-full bg-[#f4efe6]/15">
                <div className="h-px bg-[#c6a27a]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          ) : null}

          {phase === "ready" ? (
            <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-[family-name:var(--font-mark)] text-3xl italic sm:text-4xl">Adresa a fost confirmată.</p>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#f4efe6]/62">
                  În Shopify: Online Store, Themes, Add theme, Upload zip.
                </p>
              </div>
              <button
                type="button"
                onClick={download}
                disabled={downloading}
                className="w-full shrink-0 bg-[#f4efe6] px-8 py-4 text-base text-[#0c1612] transition-colors hover:bg-[#c6a27a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c6a27a] disabled:cursor-default disabled:bg-[#f4efe6]/40 sm:w-auto"
              >
                {downloading ? "Se descarcă" : "Descarcă"}
              </button>
            </div>
          ) : null}

          {error ? <p className="mt-5 text-sm text-[#e7c2b4]">{error}</p> : null}

          {phase === "ready" ? (
            <button
              type="button"
              onClick={reset}
              className="mt-8 text-sm text-[#f4efe6]/50 underline decoration-[#f4efe6]/20 underline-offset-4 hover:text-[#f4efe6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c6a27a]"
            >
              Altă adresă
            </button>
          ) : null}
        </section>

        <footer className="mt-auto pt-20 text-sm text-[#f4efe6]/40">OneMarkk Pro 1.5.0</footer>
      </div>
    </main>
  );
}
