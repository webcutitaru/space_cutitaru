"use client";

import { SectionDemo } from "@/components/onemarkk/SectionDemos";
import { THEME_GROUPS } from "@/components/onemarkk/theme-sections";

export function ThemeGuide({ onGetTheme }: { onGetTheme: () => void }) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
      <header className="mx-auto max-w-2xl pt-4">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Secțiunile, pe înțelesul unui începător</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
          Fiecare piesă e deja în temă. Demonstrația arată cum se mișcă, iar textul spune la ce o folosești.
        </p>
      </header>

      {THEME_GROUPS.map((group) => (
        <section key={group.id} className="mt-14" aria-labelledby={`onemarkk-${group.id}`}>
          <h3 id={`onemarkk-${group.id}`} className="text-lg font-medium text-indigo-100">
            {group.title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">{group.lead}</p>
          <div className="mt-8 flex flex-col gap-10">
            {group.sections.map((section) => (
              <article key={section.id}>
                <div className="mb-3 max-w-2xl">
                  <h4 className="text-base font-medium text-white">{section.name}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{section.use}</p>
                  {section.note ? (
                    <p className="mt-2 text-sm leading-relaxed text-amber-100/90">De reținut: {section.note}</p>
                  ) : null}
                </div>
                <SectionDemo kind={section.kind} />
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-16 text-center">
        <button
          type="button"
          onClick={onGetTheme}
          className="rounded-full bg-indigo-400 px-6 py-3 text-sm font-medium text-slate-950 transition-colors hover:bg-indigo-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
        >
          Descarcă tema
        </button>
      </div>
    </div>
  );
}
