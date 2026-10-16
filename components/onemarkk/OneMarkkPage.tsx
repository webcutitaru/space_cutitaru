"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const FEATURES = [
  {
    name: "Bara de anunț",
    detail: "Countdown, ofertă și mesaj de livrare, legate de paleta magazinului.",
  },
  {
    name: "Pagina de produs",
    detail: "Puncte cu iconițe, pachet Bundle & Save cu cadou inclus și o dată estimată de livrare.",
  },
  {
    name: "Coșul",
    detail: "Numărătoare inversă în minute, bară până la transport gratuit și un produs sugerat.",
  },
  {
    name: "Slider și tab-uri",
    detail: "Imagini și video, plus tab-uri de conținut care se așază corect și pe telefon.",
  },
  {
    name: "Testimoniale",
    detail: "Postări în stil Instagram și Facebook, cu badge de verificat și stele.",
  },
  {
    name: "FAQ și icon bar",
    detail: "Întrebări, un rând de argumente și un separator animat între secțiuni.",
  },
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
    if (phase === "checking" || phase === "ready" || phase === "submitting") return;
    const next = email.trim().toLowerCase();
    if (!EMAIL.test(next) || next.length > 254) {
      setError("Introdu un email corect.");
      return;
    }

    setError("");
    setPhase("submitting");
    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      tz = "UTC";
    }
    const screen =
      window.screen?.width && window.screen?.height
        ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio || 1}`
        : "";
    try {
      const response = await fetch("/api/onemarkk/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: next,
          referrer: document.referrer || "",
          lang: navigator.language || "",
          tz,
          screen,
          touch: navigator.maxTouchPoints || 0,
        }),
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
      anchor.download = "onemarkk-pro-v1.6.3.zip";
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
  const locked = phase !== "idle";
  const buttonLabel =
    phase === "submitting"
      ? "Se pornește"
      : phase === "checking"
        ? `Se verifică · ${secondsLeft}`
        : phase === "ready"
          ? downloading
            ? "Se descarcă"
            : "Descarcă tema"
          : "Verifică emailul";

  return (
    <main lang="ro" className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <motion.div
          className="glow-orb absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20"
          animate={reduced ? undefined : { scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="w-fit rounded-full border border-indigo-400/30 bg-slate-950/70 px-4 py-2 text-sm text-indigo-100 backdrop-blur-md transition-colors hover:border-indigo-300/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
        >
          SPACE
        </Link>

        <header className="mt-14 text-center sm:mt-20">
          <p className="font-mono text-xs tracking-[0.35em] text-indigo-300/70">Pro 1.6.3</p>
          <h1 className="mt-4 bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-[clamp(3.2rem,12vw,6.5rem)] font-semibold leading-none tracking-tight text-transparent">
            OneMarkk
          </h1>
          <p className="mt-5 text-lg text-indigo-100 sm:text-xl">Exclusiv pentru Cursul ExperDropshipping.</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Tema Shopify a cursului, pregătită de instalat. Homepage-ul, pagina de produs și coșul vin deja aranjate, ca magazinul să arate gata din prima încărcare.
          </p>
        </header>

        <section className="mt-10" aria-live="polite">
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit(event);
            }}
          >
            <label htmlFor="onemarkk-email" className="mb-2 block text-sm text-indigo-100">
              Emailul tău
            </label>
            <div className="flex flex-col gap-2 rounded-[1.75rem] border border-indigo-400/30 bg-slate-950/75 p-2 backdrop-blur-md sm:flex-row sm:items-center sm:rounded-full">
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
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-500 disabled:text-slate-300"
              />
              <button
                type="button"
                onClick={() => {
                  if (phase === "ready") void download();
                  else void onSubmit();
                }}
                disabled={phase === "submitting" || phase === "checking" || downloading}
                className="relative shrink-0 overflow-hidden rounded-full bg-indigo-400 px-5 py-3 text-sm font-medium text-slate-950 transition-colors hover:bg-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300 disabled:cursor-default disabled:text-slate-950/80 sm:px-6"
              >
                {phase === "checking" ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-indigo-200"
                    style={{ width: `${progress * 100}%` }}
                  />
                ) : null}
                <span className="relative">{buttonLabel}</span>
              </button>
            </div>
            <p className="mt-3 text-center text-sm text-indigo-200/80 sm:text-left">
              {phase === "ready"
                ? "Adresa a fost confirmată. Apasă Descarcă tema."
                : phase === "checking"
                  ? statusFor(progress)
                  : "Emailul trebuie să fie unul corect. Butonul de descărcare se activează după verificare."}
            </p>
          </form>

          {error ? <p className="mt-3 text-center text-sm text-rose-300 sm:text-left">{error}</p> : null}

          {phase === "ready" ? (
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-center text-sm text-slate-400 sm:text-left">
                În Shopify: Online Store, Themes, Add theme, Upload zip.
              </p>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-indigo-200/70 underline decoration-indigo-300/30 underline-offset-4 hover:text-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
              >
                Altă adresă
              </button>
            </div>
          ) : null}
        </section>

        <ul className="mt-12 grid gap-2 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.name} className="rounded-2xl border border-indigo-400/20 bg-slate-950/40 px-4 py-3">
              <p className="text-sm font-medium text-indigo-100">{feature.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{feature.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
