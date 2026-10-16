"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import type { SectionKind } from "@/components/onemarkk/theme-sections";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

const ANNOUNCEMENTS = ["Livrare estimată: 24–48h", "Ofertă afișată: −20% azi", "Se închide în 02:14:08"];

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f4f1ea] text-slate-900 shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
      {children}
    </div>
  );
}

function Announcement({ reduced }: { reduced: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % ANNOUNCEMENTS.length), 3200);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <Shell>
      <div className="bg-slate-900 px-4 py-2.5 text-center text-sm text-white" aria-live="polite">
        {ANNOUNCEMENTS[index]}
      </div>
    </Shell>
  );
}

function Ticker({ reduced }: { reduced: boolean }) {
  const phrases = ["Livrare rapidă", "Retur 30 de zile", "Plată sigură", "Gata de expediat"];
  const track = [...phrases, ...phrases];
  return (
    <Shell>
      <div className="overflow-hidden bg-white py-3">
        <div
          className="flex w-max gap-10 px-4"
          style={reduced ? undefined : { animation: "omk-marquee 16s linear infinite" }}
        >
          {track.map((phrase, index) => (
            <span key={`${phrase}-${index}`} className="text-sm font-medium text-slate-800" aria-hidden={index >= phrases.length}>
              {phrase}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Icons({ reduced }: { reduced: boolean }) {
  const items = [
    ["Livrare", "M3 7h13l3 5v7h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3V7zm3 0V4h8v3"],
    ["Retur 30 zile", "M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"],
    ["Plată", "M3 7h18v10H3V7zm0 3h18"],
    ["Suport", "M12 18a6 6 0 1 0-6-6H4a8 8 0 1 1 2.3 5.7L4 20l4-1.2"],
  ] as const;
  const track = [...items, ...items];
  return (
    <Shell>
      <div className="overflow-hidden bg-white py-4">
        <div
          className="flex w-max gap-8 px-5"
          style={reduced ? undefined : { animation: "omk-marquee 14s linear infinite" }}
        >
          {track.map(([label, path], index) => (
            <span key={`${label}-${index}`} className="flex items-center gap-2 text-sm text-slate-800" aria-hidden={index >= items.length}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d={path} />
              </svg>
              {label}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Divider() {
  return (
    <Shell>
      <div className="bg-white px-5 py-6">
        <p className="text-sm text-slate-500">Secțiunea de deasupra</p>
        <svg viewBox="0 0 600 28" className="my-3 h-7 w-full text-indigo-500" aria-hidden>
          <path d="M0 14 H250 L270 4 L290 24 L310 4 L330 14 H600" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p className="text-sm text-slate-500">Footer</p>
      </div>
    </Shell>
  );
}

function Stars() {
  return (
    <Shell>
      <div className="bg-white px-5 py-4">
        <p className="text-lg font-medium">Ser de față</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
          <span className="tracking-wider text-amber-500" aria-hidden>
            ★★★★★
          </span>
          <span>4,8 · 128 recenzii</span>
        </p>
      </div>
    </Shell>
  );
}

function Bullets() {
  const points = ["Textură lejeră, fără film gras", "Se așază sub machiaj", "30 ml, ajunge cam o lună"];
  return (
    <Shell>
      <div className="bg-white px-5 py-4">
        <p className="text-sm text-slate-500">Sub titlul produsului</p>
        <ul className="mt-2 space-y-1.5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-slate-800">
              <span className="mt-0.5 text-indigo-600" aria-hidden>
                ✓
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}

function Slider({ reduced }: { reduced: boolean }) {
  const slides = [
    { id: "photo", label: "Poză", tone: "bg-stone-200" },
    { id: "video", label: "Video", tone: "bg-slate-800" },
  ] as const;
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  return (
    <Shell>
      <div className="bg-white p-4">
        <div className={`relative flex h-36 items-center justify-center rounded-xl ${slide.tone}`}>
          <span className={slide.id === "video" ? "text-white" : "text-slate-700"}>{slide.label}</span>
          {slide.id === "video" ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2 py-1 text-xs text-slate-900">
              {reduced ? "Video oprit" : "Pornește pe slide-ul ăsta"}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={`mt-3 rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white ${focus}`}
          onClick={() => setIndex((current) => (current + 1) % slides.length)}
        >
          Slide următor
        </button>
      </div>
    </Shell>
  );
}

const BUNDLES = [
  { qty: 1, label: "1 bucată", price: "29 €", off: "" },
  { qty: 2, label: "2 bucăți", price: "52 €", off: "−10%" },
  { qty: 3, label: "3 bucăți", price: "69 €", off: "−20%" },
];

function Bundle() {
  const [qty, setQty] = useState(2);
  return (
    <Shell>
      <fieldset className="bg-white px-4 py-4">
        <legend className="px-1 text-sm text-slate-500">Alege pachetul</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {BUNDLES.map((option) => {
            const selected = option.qty === qty;
            return (
              <label
                key={option.qty}
                className={`cursor-pointer rounded-xl border px-3 py-3 ${selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}
              >
                <input
                  type="radio"
                  name="onemarkk-bundle"
                  className="sr-only"
                  checked={selected}
                  onChange={() => setQty(option.qty)}
                />
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-1 block text-sm">
                  {option.price} {option.off}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-slate-700">Cantitate în formular: {qty}</p>
        {qty > 1 ? <p className="mt-1 text-sm text-slate-500">Cadou afișat: perie. Nu se adaugă singur în coș.</p> : null}
      </fieldset>
    </Shell>
  );
}

function formatDay(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" }).format(date);
}

function Delivery() {
  const [days, setDays] = useState<{ order: string; pack: string; from: string; to: string } | null>(null);
  useEffect(() => {
    setDays({ order: formatDay(0), pack: formatDay(1), from: formatDay(3), to: formatDay(5) });
  }, []);
  const steps = [
    ["Comandă", days?.order ?? "azi"],
    ["Procesare", days?.pack ?? "…"],
    ["Livrare", days ? `${days.from} – ${days.to}` : "…"],
  ];
  return (
    <Shell>
      <ol className="grid gap-3 bg-white px-4 py-4 sm:grid-cols-3">
        {steps.map(([label, when], index) => (
          <li key={label} className="rounded-xl bg-stone-100 px-3 py-3">
            <p className="text-xs text-slate-500">
              {index + 1}. {label}
            </p>
            <p className="mt-1 text-sm font-medium">{when}</p>
          </li>
        ))}
      </ol>
    </Shell>
  );
}

function Badges() {
  const names = ["Visa", "Mastercard", "PayPal", "Apple Pay"];
  return (
    <Shell>
      <div className="bg-white px-4 py-4">
        <div className="rounded-full bg-slate-900 px-4 py-2 text-center text-sm text-white">Adaugă în coș</div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {names.map((name) => (
            <li key={name} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}

function Upsell() {
  const [afterCart, setAfterCart] = useState(true);
  const [added, setAdded] = useState(false);
  return (
    <Shell>
      <div className="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center">
        <div className="h-16 w-16 shrink-0 rounded-xl bg-stone-200" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Cremă de noapte</p>
          <p className="text-sm text-slate-500">−15% afișat · prețul din checkout rămâne neschimbat</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={afterCart} onChange={(event) => setAfterCart(event.target.checked)} />
            După Add to cart
          </label>
          <button
            type="button"
            className={`rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white ${focus}`}
            onClick={() => setAdded(true)}
          >
            {added ? "Adăugat" : "Adaugă acum"}
          </button>
        </div>
      </div>
      <p className="border-t border-stone-200 bg-stone-50 px-4 py-2 text-sm text-slate-600">
        {afterCart ? "Intră în coș împreună cu produsul principal." : "Așteaptă butonul de pe rând."}
      </p>
    </Shell>
  );
}

const TAB_ITEMS = [
  { id: "ingredients", label: "Ingrediente", body: "Apă, glicerină, extract de aloe." },
  { id: "how", label: "Cum se folosește", body: "Aplici seara, pe tenul curat." },
  { id: "ship", label: "Livrare", body: "Pleacă în 24 de ore din depozit." },
];

function Tabs() {
  const [current, setCurrent] = useState(TAB_ITEMS[0].id);
  const active = TAB_ITEMS.find((item) => item.id === current) ?? TAB_ITEMS[0];
  return (
    <Shell>
      <div className="bg-white px-4 py-4">
        <div role="tablist" aria-label="Conținut produs" className="flex gap-2">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === current}
              className={`rounded-full px-3 py-1.5 text-sm ${item.id === current ? "bg-slate-900 text-white" : "bg-stone-100"} ${focus}`}
              onClick={() => setCurrent(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p role="tabpanel" className="mt-4 text-sm leading-relaxed text-slate-800">
          {active.body}
        </p>
      </div>
    </Shell>
  );
}

const QUESTIONS = [
  { q: "Pentru ce tip de ten e?", a: "Pentru ten normal și mixt. Pe tenul uscat îl poți pune peste o cremă." },
  { q: "În cât timp pleacă comanda?", a: "În 24 de ore lucrătoare, din depozitul din țară." },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <Shell>
      <div className="divide-y divide-stone-200 bg-white">
        {QUESTIONS.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.q} className="px-4 py-3">
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-4 text-left text-sm font-medium ${focus}`}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? -1 : index)}
              >
                {item.q}
                <span aria-hidden>{expanded ? "–" : "+"}</span>
              </button>
              {expanded ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p> : null}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function Testimonials() {
  return (
    <Shell>
      <figure className="bg-white px-4 py-4">
        <figcaption className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-stone-200 text-sm" aria-hidden>
            AM
          </span>
          <span>
            <span className="block text-sm font-medium">Ana M.</span>
            <span className="block text-xs text-slate-500">Postare scrisă de tine · Instagram</span>
          </span>
        </figcaption>
        <blockquote className="mt-3 text-sm leading-relaxed text-slate-800">
          „L-am folosit o săptămână. Tenul nu mai lucește la prânz.”
        </blockquote>
      </figure>
    </Shell>
  );
}

function formatClock(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Cart({ reduced }: { reduced: boolean }) {
  const [open, setOpen] = useState(true);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(14 * 60 + 52);
  const [inCart, setInCart] = useState(false);

  useEffect(() => {
    if (!open || started) return;
    setStarted(true);
  }, [open, started]);

  useEffect(() => {
    if (!started || reduced) return;
    const id = window.setInterval(() => setSeconds((current) => (current > 0 ? current - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [started, reduced]);

  return (
    <Shell>
      <div className="bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
          <p className="text-sm font-medium">Coș {open ? "deschis" : "închis"} · {formatClock(seconds)}</p>
          <button type="button" className={`text-sm underline decoration-slate-300 underline-offset-4 ${focus}`} onClick={() => setOpen((value) => !value)}>
            {open ? "Închide" : "Deschide din nou"}
          </button>
        </div>
        {open ? (
          <div className="space-y-4 px-4 py-4">
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full w-[70%] rounded-full bg-slate-900" />
              </div>
              <p className="mt-2 text-sm text-slate-700">Mai ai 18 € până la transport gratuit.</p>
            </div>
            {inCart ? (
              <p className="text-sm text-slate-500">Crema e deja în coș, deci sugestia stă ascunsă.</p>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-100 px-3 py-3">
                <p className="text-sm">Cremă de noapte</p>
                <button type="button" className={`rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white ${focus}`} onClick={() => setInCart(true)}>
                  Add
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-slate-600">Cronometrul a rămas la {formatClock(seconds)}. Nu a repornit.</p>
        )}
      </div>
    </Shell>
  );
}

export function SectionDemo({ kind }: { kind: SectionKind }) {
  const reduced = useReducedMotion() ?? false;
  if (kind === "announcement") return <Announcement reduced={reduced} />;
  if (kind === "ticker") return <Ticker reduced={reduced} />;
  if (kind === "icons") return <Icons reduced={reduced} />;
  if (kind === "divider") return <Divider />;
  if (kind === "stars") return <Stars />;
  if (kind === "bullets") return <Bullets />;
  if (kind === "slider") return <Slider reduced={reduced} />;
  if (kind === "bundle") return <Bundle />;
  if (kind === "delivery") return <Delivery />;
  if (kind === "badges") return <Badges />;
  if (kind === "upsell") return <Upsell />;
  if (kind === "tabs") return <Tabs />;
  if (kind === "faq") return <Faq />;
  if (kind === "testimonials") return <Testimonials />;
  return <Cart reduced={reduced} />;
}
