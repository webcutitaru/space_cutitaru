import { THEME_GROUPS } from "@/components/onemarkk/theme-sections";

export function ThemeGuide() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">Secțiunile din temă</h2>
      {THEME_GROUPS.map((group) => (
        <section key={group.id} className="mt-8" aria-labelledby={`onemarkk-${group.id}`}>
          <h3 id={`onemarkk-${group.id}`} className="text-sm font-medium text-indigo-200">
            {group.title}
          </h3>
          <ul className="mt-2 divide-y divide-indigo-400/15">
            {group.sections.map((section) => (
              <li key={section.id} className="py-3">
                <p className="text-sm font-medium text-white">{section.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{section.use}</p>
                {section.note ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{section.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
